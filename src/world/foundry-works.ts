import * as T from 'three';
import { box, cyl, sphere, torus, beam, crate, mats, bake } from './assets';
import { V, pipe } from './art-kit';
import { LayeredSite, when, type SiteModule, type SiteView } from './layers';
import { ancient, ancientMats, occupationMats, canvasTarp, stencilPlate, quotaBoard, councilBoard, tallies, emberChalk, printedMat, decalMat, flowMaterial, lightCone, beamMat, boltCutters, strip, type FlowClock } from './factions';
import type { Presentation } from './presentation';
import type { Activity } from './citizen-life';
import { SITE_LIBERATED, SITE_RESTORED } from '../simulation/economy';

/** Cinder No. 3 in strata. The Ordinance runs it as a coal foundry: a furnace shoved
 * against the rear wall, its flue driven into a gold core, rings braced still, an
 * ivory fabrication table used as an anvil, an overseer's booth and a quota board.
 * Resistance grows out of the work: marks in the tallies, false-bottom crates, cutters
 * forged between quota runs. When the yard downs tools the workers run it themselves.
 * Restoration pulls the furnace out and the Armillary turns: silent rings, a waking core,
 * and the table lifting the parts it was built to make. */
const W = 24.5, CY = 6.3, CZ = 11.4, R = 4.25, TABLE = { x: 27.4, z: 11.4 }, BOARD = { x: 24.58, y: 2.35, z: 6.3 };
const BOARD_ZONE = V(25.8, 0, 7.6), CRATE_ZONE = V(31.6, 0, 20.4), OVERSEER = V(31.3, 0, 6.5);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const bearing = (from: T.Vector3, to: T.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);

export class FoundryWorks implements SiteModule {
  id = 'foundry' as const; site: LayeredSite; view: SiteView = { control: 0, stage: 0, levels: {} as SiteView['levels'], sites: {} as SiteView['sites'] };
  targets: SiteModule['targets'] = []; anchor = { x: 19.1, z: CZ, rotation: Math.PI / 2 };
  clock: FlowClock = { time: { value: 0 }, front: { value: 0 } };
  wake = 0; night = 0; private shown = -1; private waking = false;
  private rings: { spin: T.Group; speed: number }[] = []; private gimbal: T.Group[] = []; private core: T.Mesh; private parts: { mesh: T.Mesh; from: T.Vector3; fromRot: T.Euler; angle: number }[] = [];
  private assembly = new T.Group(); private lid = new T.Group(); private board: T.Mesh; private boards: T.Material[];
  private overseer: number; private pair: [number, number]; private packer: number;
  constructor(public pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root); this.site = new LayeredSite(root);
    const base = this.site.layer(when.always), live = this.site.layer(when.always, false), I = ancientMats.ivory, G = ancientMats.gold, Q = ancientMats.turquoise, O = occupationMats;
    // THE ARMILLARY -------------------------------------------------------------------
    // An ivory frame set into the rear wall, a turquoise inlay, three broken gold rings that
    // turn in the wall's plane, and a small gimballed sphere standing off it around the core.
    const plane = (x: number) => { const g = new T.Group(); g.position.set(x, CY, CZ); g.rotation.y = Math.PI / 2; return g; };
    { const f = plane(W + .22); base.add(f); const frame = new T.Mesh(new T.TorusGeometry(R, .42, 10, 64), I); frame.scale.z = .45; f.add(frame); torus(f, 0, 0, .2, R, .07, Q);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, tooth = box(f, Math.cos(a) * (R + .5), Math.sin(a) * (R + .5), 0, .3, .5, .3, G); tooth.rotation.z = a; } }
    for (const [x, r, tube, arcs, speed] of [[W + .42, 3.55, .11, 3, .16], [W + .55, 2.9, .09, 2, -.24], [W + .68, 2.25, .08, 4, .38]] as const) {
      const f = plane(x); live.add(f); const spin = new T.Group(); f.add(spin); const arc = Math.PI * 2 / arcs - .5;
      for (let k = 0; k < arcs; k++) { const m = new T.Mesh(new T.TorusGeometry(r, tube, 6, 40, arc), G); m.rotation.z = k * Math.PI * 2 / arcs; spin.add(m); }
      bake(spin); this.rings.push({ spin, speed }); } // one draw per ring: its arcs only ever turn together
    this.core = sphere(live, W + .85, CY, CZ, .42, ancientMats.dormant);
    { let parent: T.Object3D = live; for (const r of [.82, .68, .54]) { const g = new T.Group(); if (parent === live) g.position.set(W + 1.85, CY, CZ); parent.add(g); torus(g, 0, 0, 0, r, .035, G); this.gimbal.push(g); parent = g; } }
    city.collider(W + .5, CZ, 1.2, 9, 11);
    // The fabrication table: an ivory pedestal with a gold rim, and the parts it once made.
    cyl(base, TABLE.x, .08, TABLE.z, .72, .16, I); cyl(base, TABLE.x, .5, TABLE.z, .46, .8, I); torus(base, TABLE.x, .92, TABLE.z, .48, .05, G).rotation.x = Math.PI / 2; cyl(base, TABLE.x, 1.01, TABLE.z, .84, .12, I); torus(base, TABLE.x, 1.07, TABLE.z, .84, .04, G).rotation.x = Math.PI / 2;
    city.collider(TABLE.x, TABLE.z, 1.7, 1.7, 1.15);
    this.assembly.position.set(TABLE.x, 2.6, TABLE.z); this.assembly.rotation.y = Math.PI / 2; live.add(this.assembly); torus(this.assembly, 0, 0, 0, .2, .05, ancientMats.dormant);
    const rest = [[.46, 1.1, -.4, 1.2], [-.5, 1.1, .3, -.6], [.3, .06, .95, 2.3]];
    for (let k = 0; k < 3; k++) { const mesh = new T.Mesh(new T.TorusGeometry(.46, .07, 6, 24, 1.9), G); live.add(mesh); const [dx, y, dz, spin] = rest[k];
      const from = V(TABLE.x + dx, y + .05, TABLE.z + dz), fromRot = new T.Euler(Math.PI / 2, 0, spin); mesh.position.copy(from); mesh.rotation.copy(fromRot); this.parts.push({ mesh, from, fromRot, angle: k * Math.PI * 2 / 3 }); }
    // The quota board: the regime's number, and the one surface the workers write back on.
    box(base, BOARD.x - .03, BOARD.y, BOARD.z, .06, 1.24, 1.64, mats.wood);
    this.boards = [printedMat(quotaBoard('1,400 T')), printedMat(quotaBoard('3,200 T')), printedMat(councilBoard)];
    this.board = new T.Mesh(new T.PlaneGeometry(1.5, 1.12), this.boards[0]); this.board.position.set(BOARD.x + .01, BOARD.y, BOARD.z); this.board.rotation.y = Math.PI / 2; live.add(this.board);
    // The supply cage: tools and stock behind bars; its door is the only moving part.
    { const x0 = 24.8, x1 = 26.8, z0 = 18.2, z1 = 21.8; for (let z = z0; z <= z1 + .01; z += .3) for (const x of [x0, x1]) if (x === x0 || z < 19.2 || z > 20.4) cyl(base, x, 1.2, z, .025, 2.4, O.iron);
      for (let x = x0; x <= x1 + .01; x += .3) for (const z of [z0, z1]) cyl(base, x, 1.2, z, .025, 2.4, O.iron);
      for (const y of [.1, 2.4]) { box(base, (x0 + x1) / 2, y, z0, 2.05, .06, .06, O.iron); box(base, (x0 + x1) / 2, y, z1, 2.05, .06, .06, O.iron); box(base, x1, y, (z0 + z1) / 2, .06, .06, 3.65, O.iron); }
      crate(base, 25.5, 0, 19.1, .8); crate(base, 25.6, 0, 20.9, .75); crate(base, 25.55, .8, 19.1, .55); city.collider(25.8, 20, 2.2, 3.8, 2.6); }
    // THE ORDINANCE --------------------------------------------------------------------
    const occ = this.site.layer(when.occupied), occLive = this.site.layer(when.occupied, false), dormant = this.site.layer(when.dormant);
    // Plates bolted over the ivory frame: half come off with liberation, the rest with restoration.
    const plate = (g: T.Group, a: number) => { const y = CY + Math.sin(a) * R, z = CZ + Math.cos(a) * R; box(g, W + .5, y, z, .14, 1.7, 1.25, O.iron).rotation.x = -a; for (const t of [-.6, .6]) sphere(g, W + .58, y + Math.cos(a) * t, z - Math.sin(a) * t, .05, O.rust); };
    for (const a of [.35, 1.95, 3.55]) plate(occ, a); for (const a of [1.15, 2.75, 4.35, 5.4]) plate(dormant, a);
    // Braces weld the rings to the wall, a clamp bar holds them, and the furnace flue is driven into the core.
    for (const a of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) beam(occ, V(W + .5, CY + Math.sin(a) * 3.55, CZ + Math.cos(a) * 3.55), V(W + .12, CY + Math.sin(a) * 5.1, CZ + Math.cos(a) * 5.1), .09, O.iron);
    box(occ, W + .8, CY, CZ, .16, .34, 7.6, O.iron); for (const dz of [-3.4, 3.4]) box(occ, W + .45, CY, CZ + dz, .6, .5, .18, O.rust);
    pipe(dormant, [[29.2, 5.4, 13.8], [29.2, 7.6, 13.8], [26.4, 7.6, CZ], [W + .95, CY, CZ]], .3, O.iron); const collar = torus(dormant, W + 1.1, CY, CZ, .52, .13, O.rust); collar.rotation.y = Math.PI / 2;
    // The table as an anvil: iron strapped over ivory, a hammer crew on it all shift.
    box(dormant, TABLE.x, 1.33, TABLE.z, .78, .42, .44, O.iron); const horn = new T.Mesh(new T.ConeGeometry(.2, .6, 8), O.iron); horn.rotation.z = Math.PI / 2; horn.position.set(TABLE.x + .66, 1.42, TABLE.z); dormant.add(horn);
    for (const dz of [-.26, .26]) { box(dormant, TABLE.x, 1.07, TABLE.z + dz, 1.72, .06, .05, O.rust); for (const dx of [-.86, .86]) box(dormant, TABLE.x + dx, .58, TABLE.z + dz, .05, 1, .05, O.rust); }
    // Booth, turnstile and floodlight: every shift passes the overseer.
    box(occ, 31.9, 1.2, 5, 1.3, 2.4, 1.3, O.iron); box(occ, 31.9, 1.55, 5.66, 1, .18, .03, mats.dark); box(occ, 31.9, 2.02, 5, 1.36, .16, 1.36, O.oxblood); const bcap = new T.Mesh(new T.ConeGeometry(1.05, .5, 4), O.green); bcap.rotation.y = Math.PI / 4; bcap.position.set(31.9, 2.66, 5); occ.add(bcap);
    for (const x of [30.2, 31.1]) cyl(occ, x, .55, 5.1, .06, 1.1, O.iron); for (let k = 0; k < 3; k++) { const arm = box(occ, 30.65, .9, 5.1, .9, .05, .05, O.oxblood); arm.rotation.y = k * Math.PI / 3; }
    { const s = new T.Mesh(new T.PlaneGeometry(1.1, .3), printedMat(stencilPlate('INSPECTION', 1.1, .3))); s.position.set(31.9, 2.3, 5.67); occ.add(s); }
    city.collider(31.9, 5, 1.4, 1.4, 2.6, undefined, () => this.view.control >= SITE_LIBERATED);
    cyl(occ, 33.1, 3.3, 7.8, .09, 6.6, O.iron); const lamp = new T.Group(); lamp.position.set(33.1, 6.55, 7.8); occLive.add(lamp); lamp.lookAt(26, 3.4, CZ); box(lamp, 0, 0, 0, .5, .4, .55, O.iron); box(lamp, 0, 0, .29, .38, .28, .02, mats.glow); lightCone(lamp, 2.1, 11).rotation.x = -Math.PI / 2;
    city.collider(33.1, 7.8, .3, .3, 6, undefined, () => this.view.control >= SITE_LIBERATED);
    // On the main street: the business sign is overruled by a requisition plate.
    { const p = new T.Mesh(new T.PlaneGeometry(5.2, .66), printedMat(stencilPlate('REQUISITIONED · ORDINANCE WORKS No. 3', 5.2, .66))); p.position.set(13.0, 5.36, 14); p.rotation.y = -Math.PI / 2; occ.add(p); for (const dz of [-2.4, 2.4]) box(occ, 13.08, 5.36, 14 + dz, .1, .8, .08, O.iron); }
    // Closed cage door with a padlock (occupied) versus swung open (liberated).
    const door = (g: T.Group, open: boolean) => { const d = new T.Group(); d.position.set(26.8, 0, 19.2); d.rotation.y = open ? -1.9 : 0; g.add(d); for (let z = .15; z < 1.2; z += .3) cyl(d, 0, 1.2, z, .025, 2.3, O.iron); for (const y of [.3, 2.2]) box(d, 0, y, .6, .05, .05, 1.2, O.iron); if (!open) box(d, .05, 1.2, 1.1, .08, .16, .12, mats.brass); };
    door(occ, false);
    // Economic life under occupation: output stacks up, the quota climbs, nothing else changes.
    const stock = (min: number, spots: number[][]) => { const g = this.site.layer(when.business('foundry', l => l >= min)); for (const [x, y, z] of spots) crate(g, x, y, z, .8); };
    stock(1, [[31.5, 0, 19.7], [32.4, 0, 19.7]]); stock(2, [[31.5, 0, 20.6], [32.4, 0, 20.6]]); stock(3, [[31.5, .8, 19.7], [32.4, .8, 20.6]]);
    city.collider(32, 20.2, 2, 2.2, 1.7);
    // THE EMBERS ------------------------------------------------------------------------
    const c1 = this.site.layer(when.covert(1)), c2 = this.site.layer(when.covert(2)), c3 = this.site.layer(when.covert(3));
    // 1: a second count chalked under the quota, and stools behind the coal bunker.
    { const m = new T.Mesh(new T.PlaneGeometry(1, .5), decalMat(tallies, .9)); m.position.set(BOARD.x + .02, 1.25, BOARD.z); m.rotation.y = Math.PI / 2; c1.add(m); }
    for (const [x, z] of [[26.5, 17.5], [27.3, 16.8]]) crate(c1, x, 0, z, .45); { const m = new T.Mesh(new T.PlaneGeometry(.5, .5), decalMat(emberChalk, .9)); m.position.set(W + .03, 1.2, 17.1); m.rotation.y = Math.PI / 2; c1.add(m); }
    box(c1, W + .18, 2.1, 17.3, .2, .26, .2, new T.MeshStandardMaterial({ color: ancient.aether, emissive: ancient.turquoise, emissiveIntensity: 1.4 }));
    // 2: a false-bottom crate among the stock; its lid only lifts when the overseer looks away.
    this.lid.position.set(30.95, .8, 21.3); c2.add(this.lid); box(c2, 31.35, .4, 21.7, .8, .8, .8, mats.wood); box(c2, 31.35, .22, 21.7, .72, .04, .72, mats.brass);
    for (let k = 0; k < 3; k++) cyl(c2, 31.2 + k * .15, .45, 21.7 + (k % 2) * .15, .06, .36, k % 2 ? mats.brass : Q);
    box(this.lid, .4, .03, .4, .82, .06, .82, mats.wood); city.collider(31.35, 21.7, .9, .9, .9);
    // 3: cutters and pressure keys racked behind the furnace, half under a tarp.
    box(c3, 25, .9, 16.6, .12, 1.8, 1.2, mats.wood); for (let k = 0; k < 3; k++) boltCutters(c3, 25.2, .05, 16.15 + k * .4, Math.PI / 2, -.18);
    for (let k = 0; k < 3; k++) { const y = 1.55 - k * .3; box(c3, 25.18, y, 16.9, .05, .05, .6, mats.brass); box(c3, 25.18, y, 17.2, .05, .22, .05, mats.brass); }
    const tarp = box(c3, 25.35, 1.3, 16.9, .1, 1.1, .9, canvasTarp); tarp.rotation.x = .1;
    // LIBERATION -------------------------------------------------------------------------
    const lib = this.site.layer(when.liberated);
    door(lib, true); for (let k = 0; k < 3; k++) box(lib, 28.2 + k * .07, .06 + k * .05, 4.4, 1.2, .05, .8, O.iron);
    for (let k = 0; k < 3; k++) { const p = box(lib, 26.9 + k * .08, .5, 7.5, .14, 1.7, 1.25, O.iron); p.rotation.z = 1.2 + k * .05; }
    for (let k = 0; k < 2; k++) boltCutters(lib, 27.2, .1, 20.3 + k * .3, 0, 1.45);
    // RESTORATION ------------------------------------------------------------------------
    // Circuit distance starts at the core: round the frame both ways, along the wall base, then up.
    const flow = this.site.layer(when.restored), aether = flowMaterial(ancient.aether, 'aether', .95, this.clock), face = V(1, 0, 0);
    const ring = (from: number, to: number) => Array.from({ length: 33 }, (_, i) => { const a = from + (to - from) * i / 32; return V(W + .06, CY + Math.sin(a) * 4.72, CZ + Math.cos(a) * 4.72); });
    for (const to of [Math.PI / 2, -Math.PI * 1.5]) flow.add(strip(ring(-Math.PI / 2, to), face, .16, .5, aether).mesh);
    for (const z of [5.6, 22.3]) flow.add(strip([V(W + .06, 1.58, CZ), V(W + .06, 1.58, z)], face, .14, .5, aether).mesh);
    flow.add(strip([V(W + .06, CY + 4.72, CZ), V(W + .06, 12, CZ)], face, .16, 15.3, aether).mesh);
    // PEOPLE ------------------------------------------------------------------------------
    // The overseer turns between the quota board and the outgoing stock; the workers time
    // their real work to his back.
    this.overseer = pres.addWorker(OVERSEER.x, OVERSEER.z, -1.4, 'guard', { role: 'ordinal', tool: 'clipboard', when: () => this.view.control < SITE_LIBERATED });
    const a = pres.addWorker(25.8, 7.4, -2.26, 'clipboard', { role: 'worker' }), b = pres.addWorker(26.75, 8.7, -Math.PI / 2, 'gauge', { role: 'engineer' }); this.pair = [a, b];
    this.packer = pres.addWorker(30.35, 20.6, Math.PI / 2, 'hammer', { role: 'worker', when: () => this.view.levels.foundry >= 1 });
    pres.addWorker(28.55, 12.1, -2.07, 'hammer', { role: 'worker', when: () => this.view.control < SITE_RESTORED });
    pres.workers[pres.furnaceHammer].when = () => this.view.control < SITE_RESTORED;
    const g1 = pres.addWorker(30.3, 5.2, .6, 'talk', { role: 'worker', when: () => this.view.control >= SITE_LIBERATED }), g2 = pres.addWorker(31.2, 6, -2.5, 'talk', { role: 'courier', when: () => this.view.control >= SITE_LIBERATED }); pres.workers[g1].partner = g2; pres.workers[g2].partner = g1;
    pres.addWorker(27.5, 19.9, Math.PI / 2, 'carry', { role: 'worker', when: () => this.view.control >= SITE_LIBERATED });
    for (const [x, z] of [[29.1, 10.1], [28.4, 9.3], [29.3, 12.9]]) pres.addWorker(x, z, Math.atan2(TABLE.x - x, TABLE.z - z), 'watch', { role: 'worker', when: () => this.view.control >= SITE_RESTORED });
    const forge = new T.Mesh(new T.CylinderGeometry(.9, .9, 2.6, 8), mats.dark); forge.position.set(TABLE.x, 1.3, TABLE.z); forge.visible = false; live.add(forge);
    this.targets.push({ object: this.board, spot: 'board', label: 'Shift board', hint: 'READ' }, { object: forge, spot: 'forge', label: 'Anvil on an ivory table', hint: 'EXAMINE' });
    this.site.seal();
  }
  /** The overseer's gaze decides which corner of the yard can risk covert work. */
  private looking(zone: T.Vector3) { const o = this.pres.workers[this.overseer].person.group; return this.view.control < SITE_LIBERATED && Math.abs(wrap(o.rotation.y - bearing(o.position, zone))) < .6; }
  get watching() { return this.looking(BOARD_ZONE); }
  /** The overseer is facing the outgoing stock, where the cutters crate waits to be carried off. */
  get watchingStock() { return this.looking(CRATE_ZONE); }
  sync(view: SiteView) {
    const was = this.shown; this.view = view; this.shown = view.control; this.site.sync(view);
    this.board.material = this.boards[view.control >= SITE_LIBERATED ? 2 : view.levels.foundry >= 3 ? 1 : 0];
    if (view.control >= SITE_RESTORED) { if (was === SITE_RESTORED - 1) { this.wake = 0; this.waking = true; this.pres.city.onEvent('The furnace comes out of the old wall, and the rings behind it begin to turn without a sound. The table lifts what it was built to make. Cinder No. 3 was never a foundry.'); } else if (!this.waking) this.wake = 1; }
    else { this.wake = 0; this.waking = false; }
    if (this.pres.foundryFurnace) this.pres.foundryFurnace.visible = view.control < SITE_RESTORED; if (this.pres.foundryHoist) this.pres.foundryHoist.visible = view.control < SITE_RESTORED;
    this.pres.city.hearth?.color.set(view.control >= SITE_RESTORED ? ancient.aether : '#ff7428');
    this.pres.city.relabel(this.targets[1].object, view.control >= SITE_RESTORED ? 'The Armillary' : view.control >= SITE_LIBERATED ? 'Ivory fabrication table' : 'Anvil on an ivory table', view.control >= SITE_RESTORED ? 'LISTEN' : 'EXAMINE');
  }
  replayWake() { if (this.view.control >= SITE_RESTORED) { this.wake = 0; this.waking = true; } }
  setNight(v: number) { this.night = Math.max(0, Math.min(1, (v - .3) / .4)); }
  update(dt: number, time: number, _viewer: T.Vector3, calm: boolean) {
    const v = this.view, crew = this.pres.workers;
    // Overseer: six seconds on the board, six on the outgoing stock, turning between.
    if (v.control < SITE_LIBERATED) { const u = (time % 16) / 16, turn = T.MathUtils.smoothstep(u, .38, .5) - T.MathUtils.smoothstep(u, .88, 1);
      crew[this.overseer].person.group.rotation.y = T.MathUtils.lerp(bearing(OVERSEER, BOARD_ZONE), bearing(OVERSEER, CRATE_ZONE), turn); beamMat.opacity = this.night * .2; }
    const covert = v.control >= 1 && v.control < SITE_LIBERATED, open = v.control >= SITE_LIBERATED;
    const [a, b] = this.pair.map(i => crew[i]), talk = open || (covert && !this.looking(BOARD_ZONE));
    const turnTo = (w: typeof a, kind: Activity, yaw: number) => { w.kind = kind; w.person.group.rotation.y += wrap(yaw - w.person.group.rotation.y) * Math.min(1, dt * 6); };
    a.partner = talk ? this.pair[1] : undefined; b.partner = talk ? this.pair[0] : undefined;
    turnTo(a, talk ? 'talk' : 'clipboard', talk ? bearing(a.person.group.position, b.person.group.position) : -2.26);
    turnTo(b, talk ? 'talk' : 'gauge', talk ? bearing(b.person.group.position, a.person.group.position) : -Math.PI / 2);
    const packing = v.control >= 2 && v.control < SITE_LIBERATED && !this.looking(CRATE_ZONE);
    this.lid.rotation.z += ((packing ? -1.25 : 0) - this.lid.rotation.z) * Math.min(1, dt * 4); crew[this.packer].kind = packing ? 'repair' : 'hammer';
    // The Armillary: nothing moves until it wakes; then everything moves, quietly.
    this.clock.time.value = calm ? time * .35 : time;
    if (this.waking) { this.wake = Math.min(1, this.wake + dt / 10); if (this.wake >= 1) this.waking = false; }
    this.clock.front.value = this.wake >= 1 ? 1e3 : this.wake * 22;
    const run = T.MathUtils.smoothstep(this.wake, .05, .45) * (calm ? .35 : 1), lift = T.MathUtils.smoothstep(this.wake, .35, .8);
    this.core.material = this.wake > .02 ? ancientMats.awake : ancientMats.dormant;
    for (const r of this.rings) r.spin.rotation.z += dt * r.speed * run;
    this.gimbal.forEach((g, i) => { g.rotation[i === 0 ? 'y' : i === 1 ? 'x' : 'z'] += dt * (.5 + i * .35) * run; });
    this.assembly.position.y = 2.6 + Math.sin(time * 1.1) * .06 * lift; this.assembly.rotation.x = time * .4 * lift;
    for (const p of this.parts) { const to = this.assembly.localToWorld(V(0, 0, 0));
      p.mesh.position.lerpVectors(p.from, to, lift); p.mesh.rotation.set(T.MathUtils.lerp(p.fromRot.x, 0, lift), T.MathUtils.lerp(0, Math.PI / 2, lift), T.MathUtils.lerp(p.fromRot.z, p.angle + time * .4, lift)); }
    const core = this.assembly.children[0] as T.Mesh; core.material = this.wake > .8 ? ancientMats.awake : ancientMats.dormant; this.assembly.visible = this.wake > .8;
  }
}
