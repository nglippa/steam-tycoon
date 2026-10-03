import * as T from 'three';
import { box, bake, crate, mats } from './assets';
import { artMats } from './art-kit';
import { unseen } from './routes';
import { Consignment } from './logistics';
import { inView, Attention } from './patrol';
import { decalMat, emberChalk, signs } from './factions';
import { canDivert, canNotice, HOLD } from '../simulation/resist';
import type { Line } from '../simulation/intro';
import type { Presentation } from './presentation';

/** Rook & Son's part in the first resistance loop (simulation/resist.ts): the manifest on the pavement bench, the chalk that
 * appears on it and on the stock at the yard lane, the hand who says one thing about it, and the crate of held governors
 * waiting in the yard under a collection clerk's eye. Everything shows from what the save says; nothing here is a menu. */
const BENCH = { x: -10.7, z: 32.4 }, HAND = { x: -12.4, z: 33.9 }, STOCK = { x: -10.3, z: 47.9 }, CRATE = { x: -26.4, z: 45.9 }, CLERK = { x: -29, z: 47.6 };
/** The clerk counts the held stock, then bends to his sheet. The sheet is the window. */
const WATCH: [yaw: number, seconds: number][] = [[2.15, 5], [Math.PI, 4.5]];
const chalk = decalMat(emberChalk, .92);
const tick = (g: T.Object3D, x: number, y: number, z: number, size: number, yaw: number) => { const m = new T.Mesh(new T.PlaneGeometry(size, size), chalk); m.rotation.y = yaw; m.position.set(x, y, z); g.add(m); };

export class RookYard {
  /** The crate of held governors, carried by hand from the yard. */
  crate: Consignment; attention = new Attention(WATCH);
  /** Say a line to the player now; false if this is not the moment (the ledger is open, the opening is playing). */
  onLine: (line: Line) => boolean = () => false;
  private ticks = new T.Group(); private clerk: number; private hand: number; private hear = 0; private viewer = new T.Vector3(0, -99, 0);
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
    this.clerk = pres.addWorker(CLERK.x, CLERK.z, WATCH[0][0], 'guard', { role: 'ordinal', tool: 'clipboard', essential: true, when: () => this.held });
    // The held crate: plate and chalk on the lane face, the braced face to the wall.
    this.crate = new Consignment('rook.crate', null, 'rook.loft', root, CRATE, g => { const c = new T.Group(); c.rotation.y = Math.PI / 2; g.add(c); crate(c, 0, 0, 0, .7);
        const plate = new T.Mesh(signs.plate(HOLD.scrap!.plate, .62, .22), signs.material); plate.position.set(-.356, .48, 0); plate.rotation.y = -Math.PI / 2; g.add(plate); tick(g, -.358, .17, 0, .22, -Math.PI / 2); bake(g); },
      () => this.held, HOLD.scrap!.taken, () => !canDivert(this.rook) ? HOLD.scrap!.held : this.watching ? HOLD.scrap!.watched : null);
    city.collider(CRATE.x, CRATE.z, .8, .8, .75, undefined, () => !(this.held && !this.crate.carrying));
    this.crate.target.updateWorldMatrix(true, false);
    city.targets.push({ object: this.crate.target, id: 'rook.crate', kind: 'site', label: 'Held crate', hint: 'CARRY', position: this.crate.target.getWorldPosition(new T.Vector3()) });
  }
  private get rook() { return this.pres.city.economy.state.resist.rook; }
  /** The crate waits in the yard from the report until it is delivered. */
  private get held() { return this.rook >= 1 && this.rook < 3; }
  private get eyes() { return this.pres.workers[this.clerk].person.group; }
  /** The clerk is facing the held stock and could see the Steward at it. */
  get watching() { return this.held && inView(this.pres.city, this.eyes, this.viewer, 10, .75); }
  sync() { this.ticks.visible = this.rook >= 1; }
  update(dt: number, time: number, viewer: T.Vector3) {
    this.viewer.copy(viewer); this.crate.update();
    if (this.held) { this.attention.update(dt, time, this.eyes); this.pres.workers[this.clerk].kind = this.attention.facing(WATCH[0][0], .5) ? 'guard' : 'clipboard'; }
    // The hand says it once, to someone standing by the bench who is not in a menu.
    if (canNotice(this.rook)) { const g = this.pres.workers[this.hand].person.group.position; this.hear = Math.hypot(viewer.x - g.x, viewer.z - g.z) < 5.5 ? this.hear + dt : 0;
      if (this.hear > 1.2 && this.onLine({ who: 'Rook’s hand', text: HOLD.scrap!.hand })) { this.hear = 0; this.pres.city.economy.advanceResist(2); } }
  }
}
