import * as T from 'three';
import { box, cyl, sphere, torus, bake, mats } from './assets';
import { V, artMats, labeledCrate } from './art-kit';
import { unseen, ladder } from './routes';
import { Consignment } from './logistics';
import { inView, Attention } from './patrol';
import { ancient, ancientMats, decalMat, emberChalk } from './factions';
import { atHome } from '../simulation/home';
import { bookendDue, bookendLine, canDivert, canNotice, HOLD } from '../simulation/resist';
import type { Line } from '../simulation/intro';
import type { Presentation } from './presentation';

/** Rook & Son's part in the first resistance loop (simulation/resist.ts): the manifest on the pavement bench, the chalk that
 * appears on it and on the stock at the yard lane, the hand who says one thing about it, and the crate of held governors
 * waiting in the yard under a collection clerk's eye. Everything shows from what the save says; nothing here is a menu. */
const BENCH = { x: -10.7, z: 32.4 }, HAND = { x: -12.4, z: 33.9 }, STOCK = { x: -10.3, z: 47.9 }, CRATE = { x: -26.4, z: 45.9 }, CLERK = { x: -29, z: 47.6 }, CACHE = { x: -17.2, y: 14.45, z: 7.4 }, STRANGER = { x: 2.6, y: 14.3, z: 30.55 };
/** Restored Terra's lights and metals, self-lit so they read at dawn and dusk and against the sky. */
const aether = new T.MeshBasicMaterial({ color: ancient.aether }), gleam = new T.MeshBasicMaterial({ color: '#d2a84e' });
/** The clerk counts the held stock, then bends to his sheet. The sheet is the window. */
const WATCH: [yaw: number, seconds: number][] = [[2.15, 5], [Math.PI, 4.5]];
const chalk = decalMat(emberChalk, .92);
const tick = (g: T.Object3D, x: number, y: number, z: number, size: number, yaw: number, flat = false) => { const m = new T.Mesh(new T.PlaneGeometry(size, size), chalk); if (flat) m.rotation.x = -Math.PI / 2; else m.rotation.y = yaw; m.position.set(x, y, z); g.add(m); };

export class RookYard {
  /** The crate of held governors, carried by hand from the yard. */
  crate: Consignment; attention = new Attention(WATCH);
  /** Say a line to the player now; false if this is not the moment (the ledger is open, the opening is playing). */
  onLine: (line: Line) => boolean = () => false;
  /** Is this point on the screen, in front of a player who is in the world? */
  onSee: (point: T.Vector3) => boolean = () => false;
  /** Is the player in the world (not in a menu or the opening)? The stranger's line and his leaving wait for it. */
  inWorld: () => boolean = () => true; private spot = new T.Vector3(STRANGER.x, STRANGER.y, STRANGER.z);
  private ticks = new T.Group(); private waiting = new T.Group(); private under = new T.Group(); private restored = new T.Group(); private steam = V(-10.3, 13.2, 29); private standing = false; private said = false; private leave = 0; private clerk: number; private hand: number; private hear = 0; private viewer = new T.Vector3(0, -99, 0);
  constructor(private pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root), root.add(this.ticks);
    // The manifest, always: pinned to the back board of the bench where the street can read it, three lines in a clerk's hand.
    // The chalk beside it comes with the report.
    const sheet = new T.Group(), SX = BENCH.x + .46, SZ = BENCH.z - .2; sheet.position.set(SX, 1.5, SZ); sheet.rotation.y = Math.PI / 2; root.add(sheet);
    box(sheet, 0, 0, 0, .3, .4, .012, artMats.paper); for (const dy of [.1, 0, -.1]) box(sheet, 0, dy, .008, .22, .012, .004, mats.dark); bake(sheet);
    tick(this.ticks, SX, 1.5, SZ - .3, .2, Math.PI / 2);
    // The same chalk on the stock at the mouth of the yard lane: the east face of the iron crate.
    tick(this.ticks, STOCK.x - .1 + .405, .35, STOCK.z - .082, .24, Math.PI / 2 + .2); bake(this.ticks);
    // The bench is the one legitimate thing to do here, once.
    const hit = new T.Mesh(new T.BoxGeometry(1.1, 1.6, 2.2), unseen); hit.position.set(BENCH.x, 1.2, BENCH.z); root.add(hit); hit.updateWorldMatrix(true, false);
    city.targets.push({ object: hit, id: 'rook.bench', kind: 'resist', label: 'Workbench', hint: 'CHECK THE MANIFEST', position: hit.getWorldPosition(new T.Vector3()), when: () => this.rook === 0 });
    // The hand at the bench, and the clerk who has come to collect what is held.
    this.hand = pres.addWorker(HAND.x, HAND.z, .85, 'repair', { role: 'worker', essential: true });
    this.clerk = pres.addWorker(CLERK.x, CLERK.z, WATCH[0][0], 'guard', { role: 'ordinal', tool: 'clipboard', essential: true, when: () => this.held && this.onDuty });
    // The held crate: the Directorate's grey, stencilled on every face, and the Embers' chalk on the lane side.
    this.crate = new Consignment('rook.crate', null, 'rook.loft', root, CRATE, g => { labeledCrate(g, 0, 0, 0, .7, HOLD.scrap!.plate, 0, '#9a9486'); tick(g, -.358, .16, .2, .2, -Math.PI / 2); bake(g); },
      () => this.held, HOLD.scrap!.taken, () => !canDivert(this.rook) ? HOLD.scrap!.held : this.watching ? HOLD.scrap!.watched : null, () => this.receive());
    this.crate.contraband = true;
    this.cache(root); this.restore(root);
    pres.addWorker(STRANGER.x, STRANGER.z, 0, 'watch', { role: 'courier', mask: true, essential: true, y: 12.59, when: () => this.standing });
    city.collider(CRATE.x, CRATE.z, .8, .8, .75, undefined, () => !(this.held && !this.crate.carrying));
    this.crate.target.updateWorldMatrix(true, false);
    city.targets.push({ object: this.crate.target, id: 'rook.crate', kind: 'site', label: 'Held crate', hint: 'CARRY', position: this.crate.target.getWorldPosition(new T.Vector3()) });
    // Carrying it, the spot it came from takes it back, no questions: a player who lifted it to see can free their hands.
    const back = new T.Mesh(new T.BoxGeometry(.9, 1, .9), unseen); back.position.set(CRATE.x, .5, CRATE.z); root.add(back); back.updateWorldMatrix(true, false);
    city.targets.push({ object: back, id: 'rook.crate', kind: 'site', label: 'Held crate', hint: 'PUT IT BACK', position: back.getWorldPosition(new T.Vector3()), when: () => this.crate.carrying });
  }
  /** Behind Finch's pigeon loft: a pallet under a lamp, a tarp folded beside it and a chalked ember. Delivered, the crate is under the tarp. */
  private cache(root: T.Group) {
    const { x, y, z } = CACHE, always = new T.Group(), before = this.waiting, after = this.under; root.add(always, before, after);
    box(always, x, y + .07, z, 1, .14, .8, mats.wood); cyl(always, x + .9, y + .9, z - .5, .03, 1.8, mats.iron); cyl(always, x + .9, y + 1.85, z - .5, .09, .16, mats.iron); bake(always);
    box(before, x - 1.15, y + .1, z + .2, .7, .2, .5, ancientMats.ivory); sphere(before, x + .9, y + 1.7, z - .5, .1, mats.glow); tick(before, x - .1, y + .09, z + .401, .2, 0); bake(before);
    labeledCrate(after, x, y + .14, z, .7, HOLD.scrap!.plate, 0, '#9a9486'); box(after, x, y + .88, z, .95, .05, .85, ancientMats.ivory); sphere(after, x + .9, y + 1.7, z - .5, .14, aether); for (const d of [-1, 1]) { const f = box(after, x + d * .5, y + .6, z, .05, .6, .85, ancientMats.ivory); f.rotation.z = d * .35; } tick(after, x, y + .5, z + .43, .2, 0); bake(after);
    const hit = new T.Mesh(new T.BoxGeometry(1.5, 1.4, 1.3), unseen); hit.position.set(x, y + .7, z); root.add(hit); hit.updateWorldMatrix(true, false);
    this.pres.city.targets.push({ object: hit, id: 'rook.loft', kind: 'site', label: 'Finch’s cache', hint: 'LEAVE THE CRATE', position: hit.getWorldPosition(new T.Vector3()), when: () => this.crate.carrying });
  }
  /** The Great Main's regulator, put back to work once the governors are delivered: the maintenance catwalk becomes a way across (decks and
   * colliders that exist only then, a ladder at each end), the cabinets' gauges burn aether-blue, the pipe is banded in clean brass, steam
   * leaves the valve, and the Embers have marked the west ladder's foot. All of it is built once and shown, never rebuilt. */
  private restore(root: T.Group) {
    const g = this.restored, live = new T.Group(), city = this.pres.city, on = () => this.rook >= 3, off = () => this.rook < 3, Z = 29; root.add(g, live);
    city.decks.push({ minX: -10.1, maxX: 10.1, minZ: 29.9, maxZ: 31.2, y: 12.77, when: on });
    for (const [x, z, w, d] of [[0, 29.86, 20.2, .1], [-9.65, 31.15, .9, .1], [0, 31.15, 15.6, .1], [9.65, 31.15, .9, .1], [-10.2, 30.55, .1, 1.3], [10.2, 30.55, .1, 1.3]]) city.collider(x, z, w, d, 13.87, undefined, off, 12.57);
    ladder(g, live, city, 'ladder.main.west', 'Regulator ladder', -8.5, 31.3, .18, 12.77, 0, 1, gleam, [0, -.75], on); ladder(g, live, city, 'ladder.main.east', 'Regulator ladder', 8.5, 31.3, .18, 12.77, 0, 1, gleam, [0, -.75], on);
    // The walk itself: ivory boards on a deep ivory fascia the street can read, a bright brass handrail with the ladders' gaps, and aether lamps under it.
    box(g, 0, 12.78, 30.55, 20.2, .02, 1.3, ancientMats.ivory); box(g, 0, 12.7, 31.2, 20.2, .16, .08, ancientMats.ivory); for (let x = -9.5; x < 10; x += 1) box(g, x, 12.792, 30.55, .02, .004, 1.3, ancientMats.ivoryDark);
    for (const [x, w] of [[-10.1, 1.8], [0, 15.6], [10.1, 1.8]]) box(g, x, 13.83, 31.15, w, .12, .12, gleam);
    for (const x of [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]) { cyl(g, x, 12.58, 30.9, .02, .2, gleam); sphere(g, x, 12.42, 30.9, .17, aether); }
    for (const x of [-3, 3]) torus(g, x, 14, Z, .92, .07, gleam).rotation.y = Math.PI / 2;
    // The piers: a large teal gauge disc with an aether face and a brass rim, turned to the street on each tower, and a ring round the cabinets' own dials.
    for (const side of [-1, 1]) { const x = side * 11.9, d = cyl(g, x, 5.3, 30.86, .8, .08, mats.teal); d.rotation.x = Math.PI / 2; const f = cyl(g, x, 5.3, 30.9, .5, .08, aether); f.rotation.x = Math.PI / 2; torus(g, x, 5.3, 30.9, .8, .06, gleam);
      torus(g, side * 9.3, 1.35, Z, .4, .03, aether).rotation.y = Math.PI / 2; sphere(g, side * 9.9, 2.25, Z, .08, aether); }
    // The Embers have been: chalk on the cabinet and on the pavement at the west ladder's foot, and a lamp.
    tick(g, -9.9, 1.1, 29.56, .26, 0); tick(g, -8.5, .2, 32.55, .5, 0, true); cyl(g, -7.3, .95, 32.4, .03, 1.8, mats.iron); sphere(g, -7.3, 1.9, 32.4, .09, aether); bake(g);
  }
  /** The crate is left under the tarp: the third step, and the toast that says what it was for. */
  private receive() { if (!this.pres.city.economy.advanceResist(3)) return false; this.pres.city.onEvent(HOLD.scrap!.delivered); return true; }
  private get rook() { return this.pres.city.economy.state.resist.rook; }
  /** The crate waits in the yard from the report until it is delivered. */
  private get held() { return this.rook >= 1 && this.rook < 3; }
  /** The clerk is a day clerk: at an enforced curfew he has gone home, and the curfew watch is the only watch there is. */
  private get onDuty() { return this.pres.city.here(CLERK.x, CLERK.z).enforcement === 'none'; }
  private get eyes() { return this.pres.workers[this.clerk].person.group; }
  /** The clerk is facing the held stock and could see the Steward at it. */
  get watching() { return this.held && this.onDuty && inView(this.pres.city, this.eyes, this.viewer, 10, .75); }
  sync() { const r = this.rook, o = this.pres.steamOrigins, i = o.indexOf(this.steam); this.ticks.visible = r >= 1; this.waiting.visible = r < 3; this.under.visible = this.restored.visible = r >= 3;
    if (r >= 3 && i < 0) o.push(this.steam); else if (r < 3 && i >= 0) o.splice(i, 1); }
  /** Outdoors in the Great Main's street, or up on its roofs' level below the leads: not in a room, not behind a building. */
  private seen(v: T.Vector3) { return Math.abs(v.x) < 14 && v.y < 14.5 && !atHome(v.x, v.y, v.z); }
  update(dt: number, time: number, viewer: T.Vector3) {
    this.viewer.copy(viewer); this.crate.update();
    if (this.held && this.onDuty) { this.attention.update(dt, time, this.eyes); this.pres.workers[this.clerk].kind = this.attention.facing(WATCH[0][0], .5) ? 'guard' : 'clipboard'; }
    // The stranger of the porch stands on the restored catwalk the first time it is in view, says one line, and is gone.
    if (bookendDue(this.rook)) { const d = Math.hypot(viewer.x - STRANGER.x, viewer.z - STRANGER.z);
      if (!this.standing && !this.said && d < 40) this.standing = true; else if (this.standing && !this.said && d > 46) this.standing = false;
      if (this.standing && !this.said && d < 30 && this.seen(viewer) && this.inWorld() && this.onSee(this.spot) && this.onLine({ who: 'Stranger', text: bookendLine(this.pres.city.economy.state.intro.answer) })) { this.said = true; this.leave = 6; }
      if (this.said && this.inWorld() && (this.leave -= dt) <= 0) { this.standing = false; this.pres.city.economy.advanceResist(4); } }
    else { this.standing = this.said = false; }
    // The hand says it once, to someone standing by the bench who is not in a menu.
    if (canNotice(this.rook)) { const g = this.pres.workers[this.hand].person.group.position; this.hear = Math.hypot(viewer.x - g.x, viewer.z - g.z) < 5.5 ? this.hear + dt : 0;
      if (this.hear > 1.2 && this.onLine({ who: 'Rook’s hand', text: HOLD.scrap!.hand })) { this.hear = 0; this.pres.city.economy.advanceResist(2); } }
  }
}
