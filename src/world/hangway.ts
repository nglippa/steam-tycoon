import * as T from 'three';
import { box, cyl, sphere, torus, beam, sign, bake, mats, crate } from './assets';
import { V, gauge, artMats } from './art-kit';
import { ancientMats, occupationMats, emberChalk, tallies, decalMat, canvasTarp } from './factions';
import { ladder, stair, parapet, examine } from './routes';
import { CHASM, TENDING } from './geography';
import { rock } from './terra-edge';
import { tone } from './tone';
import type { Presentation } from './presentation';

/** THE HANGWAY. A maintenance walk slung from the west wall of the cleft, under the street.
 * Crews use it to reach the mains; the Embers use it because it passes under Cinder Row,
 * where nobody checks papers. It runs in three lengths: the mains walk, a lower length two
 * metres down where the old door and the night crew's camp are, and the north walk out to
 * open sky. From the lower length a ladder drops through a hatch to the Keel, a landing on
 * one of the old city's ribs, with nothing under it but weather. */
const YA = -5.5, YB = -7.5, KEEL = -27, X0 = CHASM.x0 + .1, X1 = X0 + 2, EAST = Math.PI / 2;
/** [z0, z1, deck height] from north to south. Stairs join them at z -42..-38 and -16..-12. */
const RUNS: [number, number, number][] = [[-58, -42, YA], [-38, -16, YB], [-12, 44, YA]];
const I = ancientMats.ivory, GOLD = ancientMats.gold;
const chalk = decalMat(emberChalk, .92), tally = decalMat(tallies, .9);

export class Hangway {
  /** The door in the rock while it is shut, and what lies behind it once the Anchor survey opens it. */
  private sealed = new T.Group(); private room = new T.Group(); private woken = new T.Group(); private surveyed = false;
  root = new T.Group(); private live = new T.Group(); private water = new T.MeshBasicMaterial({ color: '#dff5f2', transparent: true, opacity: .5, depthWrite: false, side: T.DoubleSide }); private waterBase = new T.Color('#dff5f2');
  constructor(p: Presentation) { const city = p.city, s = new T.Group(), xm = (X0 + X1) / 2; p.root.add(this.root); this.root.add(s, this.live, this.sealed, this.room, this.woken);
    const prop = (x: number, z: number, w: number, d: number, y: number, h: number) => city.collider(x, z, w, d, y + h, undefined, undefined, y - .2);
    const decal = (m: T.Material, w: number, h: number, y: number, z: number) => { const q = new T.Mesh(new T.PlaneGeometry(w, h), m); q.position.set(X0 + .01, y, z); q.rotation.y = EAST; s.add(q); };
    // Each length: planks on an iron frame hung from brackets in the wall, a rail on the open side, and
    // the crews' limewash on the wall so a dropped tool can be found. The pale band is what you follow.
    for (const [z0, z1, y] of RUNS) { const zm = (z0 + z1) / 2, len = z1 - z0;
      box(s, xm, y - .07, zm, 2, .14, len, mats.wood); for (const x of [X0 + .05, X1 - .05]) box(s, x, y - .22, zm, .12, .22, len, mats.rust); for (let z = z0 + 1; z < z1; z += 3) box(s, xm, y - .2, z, 2, .1, .1, mats.rust);
      for (let z = z0 + 2; z < z1; z += 6) { beam(s, V(X1 - .05, y, z), V(X0, -.9, z), .04, mats.iron); box(s, X0 + .05, -.9, z, .3, .3, .3, mats.iron); }
      box(s, X1, y + 1, zm, .06, .06, len, mats.iron); box(s, X1, y + .5, zm, .04, .04, len, mats.iron); for (let z = z0; z <= z1; z += 2) box(s, X1, y + .5, z, .06, 1, .06, mats.iron);
      box(s, X0 - .04, y + .95, zm, .06, 1.9, len, artMats.plaster); box(s, X0 - .03, y + 1.95, zm, .08, .1, len, mats.rust);
      for (let z = z0 + 3; z < z1; z += 7) { box(s, X0 + .12, y + 2.5, z, .24, .08, .08, mats.iron); box(s, X0 + .26, y + 2.36, z, .16, .2, .16, mats.glow); box(s, X0 + .26, y + 2.5, z, .22, .06, .22, mats.iron); }
      city.deck(X0, X1, z0, z1, y); }
    for (const z of [-58, 44]) { box(s, xm, YA + 1, z, 2, .06, .06, mats.iron); box(s, xm, YA + .5, z, 2, .04, .04, mats.iron); }
    // Two flights of open treads take the walk down to the lower length and back up.
    stair(s, city, X0, X1, -42, -38, YB, YA, 'z', 'min', mats.wood, false); stair(s, city, X0, X1, -16, -12, YB, YA, 'z', 'max', mats.wood, false);
    for (const [za, zb] of [[-42, -38], [-16, -12]]) { const hi = za === -42 ? za : zb, lo = za === -42 ? zb : za; beam(s, V(X1, YA + 1, hi), V(X1, YB + 1, lo), .03, mats.iron); beam(s, V(X1, YA, hi), V(X1, YB, lo), .05, mats.rust); beam(s, V(X0 + .05, YA, hi), V(X0 + .05, YB, lo), .05, mats.rust); }
    // Two ways down from the street, each through a gap in the rail.
    for (const [z, id] of [[30, 'ladder.hangway.south'], [-48, 'ladder.hangway.north']] as const) { ladder(s, this.live, city, id, 'Hangway ladder', CHASM.x0, z, YA, .18, 1, 0);
      for (const dz of [-.6, .6]) { box(s, CHASM.x0 - .5, 1.1, z + dz, .12, 1.9, .12, mats.iron); sphere(s, CHASM.x0 - .5, 2.12, z + dz, .07, mats.glow); } box(s, CHASM.x0 - .5, 2, z, .08, .08, 1.2, mats.iron); }
    sign(s, 'LOWWORKS HANGWAY', 'MAINS CREWS ONLY • NO LOITERING', X0 + .02, YA + 2, 26.4, 2.6, .6, '#cbbf9f').rotation.y = EAST;
    for (const z of [25, 24.3]) box(s, X0 + .18, YA + .9, z, .36, 1.8, .6, occupationMats.iron); prop(X0 + .18, 24.65, .36, 1.4, YA, 1.8);
    // A drain that has run since before the Ordinance: it spills from under the walk into nothing.
    cyl(s, X0 + 1.4, YA - .9, 20, .34, 3.2, I).rotation.z = Math.PI / 2; torus(s, X1 + .45, YA - .9, 20, .38, .06, GOLD).rotation.y = EAST;
    { const fall = new T.Mesh(new T.PlaneGeometry(.55, 60), this.water); fall.position.set(X1 + .7, YA - 31, 20); fall.rotation.y = EAST; this.root.add(fall); }
    // The mains junction: one wheel that matters and a gauge the crews actually read.
    torus(s, X0 + .3, YA + 1.3, 12, .55, .06, mats.brass).rotation.y = EAST; for (const r of [0, Math.PI / 2]) box(s, X0 + .3, YA + 1.3, 12, .05, 1.05, .05, mats.brass).rotation.x = r; cyl(s, X0 + .15, YA + 1.3, 12, .09, .3, mats.iron).rotation.z = Math.PI / 2;
    for (const z of [11, 13]) cyl(s, X0 + .2, YA + 1.6, z, .16, 3.2, mats.copper); { const g = new T.Group(); g.position.set(X0 + .1, YA + 2.1, 13.8); g.rotation.y = EAST; s.add(g); gauge(g, 0, 0, 0, .28, '07'); }
    // Under Cinder Row: a dead drop. A lamp that only shows from below, and the count of who got through.
    crate(s, X0 + .3, YA, -5, .5); box(s, X0 + .45, YA + .12, -7, .7, .16, 1.8, canvasTarp); sphere(s, X0 + .25, YA + 1.7, -6, .08, mats.aether); box(s, X0 + .14, YA + 1.7, -6, .28, .06, .06, mats.iron);
    decal(chalk, .8, .8, YA + 1.5, -4.2); decal(tally, .9, .45, YA + 1.2, -7.4); prop(X0 + .3, -5, .5, .5, YA, .6);
    // THE LOWER LENGTH. Set in the rock, older than the cleft's ironwork: a door with no handle on this side.
    for (const z of [-21.55, -18.45]) { box(s, X0 + .1, YB + 2.3, z, .5, 4.6, .5, I); prop(X0 + .1, z, .5, .5, YB, 4.6); } box(s, X0 + .1, YB + 4.3, -20, .5, .6, 3.6, I); box(s, X0 + .36, YB + 4.3, -20, .06, .3, 2.6, GOLD); box(s, X0 + .7, YB + .02, -20, 1.2, .04, 2.8, ancientMats.tile);
    { const d = this.sealed; box(d, X0 + .3, YB + 2, -20, .2, 4, 2.6, ancientMats.ivoryDark); for (const y of [.9, 2, 3.1]) box(d, X0 + .42, YB + y, -20, .08, .16, 2.6, GOLD); torus(d, X0 + .46, YB + 2.2, -20, .6, .06, GOLD).rotation.y = EAST; cyl(d, X0 + .44, YB + 2.2, -20, .5, .04, ancientMats.dormant).rotation.z = Math.PI / 2; bake(d); }
    city.collider(X0 + .2, -20, .5, 2.6, YB + 4.6, undefined, () => this.surveyed, YB - .2);
    // The plate is notched behind the door. Rock closes the notch above and below the room, in the wall's own grain.
    { const face = (y0: number, y1: number, z0: number, z1: number) => { const g = new T.PlaneGeometry(z1 - z0, y1 - y0), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (z0 + uv.getX(i) * (z1 - z0)) * .08, (y0 + uv.getY(i) * (y1 - y0)) * .08); const m = new T.Mesh(g, rock); m.rotation.y = EAST; m.position.set(CHASM.x0 - .01, (y0 + y1) / 2, (z0 + z1) / 2); this.root.add(m); };
      face(YB + 4.6, -.02, TENDING.z0, TENDING.z1); face(-90, YB - .3, TENDING.z0, TENDING.z1); for (const [z0, z1] of [[TENDING.z0, -21.8], [-18.2, TENDING.z1]]) box(s, X0 - .05, YB + 2.15, (z0 + z1) / 2, .3, 4.9, z1 - z0, I); }
    // THE TENDING ROOM. Ivory, tile and gold, kept as it was left: a ring of seven lenses, and water still running in the wall.
    { const r = this.room, xa = TENDING.x0, xm = (xa + CHASM.x0) / 2, w = CHASM.x0 - xa, zm = (TENDING.z0 + TENDING.z1) / 2, dd = TENDING.z1 - TENDING.z0, DX = 37.5;
      box(r, xm, YB - .15, zm, w, .3, dd, ancientMats.tile); box(r, xm, YB + 4.45, zm, w, .3, dd, I); box(r, xa + .06, YB + 2.15, zm, .12, 4.3, dd, I); for (const z of [TENDING.z0 + .06, TENDING.z1 - .06]) box(r, xm, YB + 2.15, z, w, 4.3, .12, I);
      for (const y of [.5, 3.6]) { box(r, xa + .14, YB + y, zm, .06, .1, dd, GOLD); for (const z of [TENDING.z0 + .14, TENDING.z1 - .14]) box(r, xm, YB + y, z, w, .1, .06, GOLD); }
      torus(r, DX, YB + .03, zm, 2.1, .04, GOLD).rotation.x = Math.PI / 2; cyl(r, DX, YB + .45, zm, 1.5, .9, I); cyl(r, DX, YB + .93, zm, 1.42, .06, GOLD); cyl(r, DX, YB + .98, zm, .5, .08, ancientMats.ivoryDark);
      // Seven lenses. The third is lit; the fifth is trying.
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 - Math.PI / 2, lx = DX + Math.cos(a) * 1.02, lz = zm + Math.sin(a) * 1.02; torus(r, lx, YB + 1, lz, .19, .03, GOLD).rotation.x = Math.PI / 2; cyl(r, lx, YB + 1, lz, .17, .05, k === 2 ? ancientMats.awake : ancientMats.dormant); if (k === 4) sphere(r, lx, YB + 1.03, lz, .05, ancientMats.awake); }
      // Water in a tiled runnel at the back wall, and the old light coming down onto the table.
      box(r, xa + .5, YB + .12, zm, .5, .12, dd - .6, ancientMats.turquoise); box(r, xa + .5, YB + .2, zm, .34, .03, dd - .7, mats.aether); cyl(r, DX, YB + 4.28, zm, .7, .06, ancientMats.awake);
      bake(r); const shaft = new T.Mesh(new T.ConeGeometry(1.5, 3.3, 20, 1, true), new T.MeshBasicMaterial({ color: '#8af0ec', transparent: true, opacity: .16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); shaft.position.set(DX, YB + 2.6, zm); r.add(shaft);
      city.deck(xa, X0, TENDING.z0, TENDING.z1, YB); city.collider(DX, zm, 3, 3, YB + 1.1, undefined, undefined, YB - .2); examine(this.live, city, 'chart', 'The seven lenses', DX, YB + 1.2, zm, 3.1, 1.2, 3.1, () => this.surveyed);
      p.interiors.push({ x: DX, y: YB + 3.2, z: zm, color: '#9aeee6', reach: 9 }); }
    { const t = new T.Group(); t.position.set(X0 + .5, YB - .18, -22.4); t.rotation.y = EAST; this.live.add(t); city.target(t, 'undergate', 'discovery', 'The door in the rock', 0, 1.45, 0); }
    // Where the night crew sleeps: a tarp, a brazier and two hammocks, a long way from any inspector.
    { const low = new T.Group(); low.position.y = YB; s.add(low); cyl(low, X0 + .32, .35, -31.2, .26, .7, mats.iron); cyl(low, X0 + .32, .72, -31.2, .3, .06, mats.iron); cyl(low, X0 + .32, .77, -31.2, .2, .05, mats.glow); cyl(low, X0 + .32, 1.9, -31.2, .06, 2.2, mats.iron);
      box(low, X0 + .9, 2.5, -33.5, 1.9, .05, 6, canvasTarp).rotation.z = -.22; for (const z of [-36.3, -30.7]) beam(low, V(X0 + 1.8, 0, z), V(X0 + 1.8, 2.3, z), .04, mats.iron);
      for (const y of [1.1, 1.9]) { box(low, X0 + .45, y, -34.6, .7, .06, 2.2, mats.cream); box(low, X0 + .45, y + .08, -34.6, .5, .1, 1.2, mats.red); }
      crate(low, X0 + .4, 0, -36.6, .6); prop(X0 + .3, -31.2, .5, .6, YB, 1.1); prop(X0 + .3, -34.6, .5, 2.3, YB, 2.1); }
    // THE KEEL. A hatch in the lower length, and a ladder down the rock to a landing on the old rib.
    box(s, X0 + .45, YB + .02, -24, 1, .05, 1.5, mats.iron); box(s, X0 + .45, YB + .7, -24.78, 1, 1.4, .05, mats.iron).rotation.x = -.25; for (const dz of [-.75, .75]) box(s, X0 + .95, YB + .5, -24 + dz, .05, 1, .05, mats.iron);
    ladder(s, this.live, city, 'ladder.keel', 'Ladder to the Keel', CHASM.x0, -24, KEEL, YB, 1, 0, mats.iron, [1.5, 1.6]);
    // The landing: ivory, as the rib is. It was built for whoever tended the anchor, and nobody has since.
    const kx0 = X0, kx1 = X0 + 3.6, kz0 = -25.3, kz1 = -20.4, kxm = (kx0 + kx1) / 2, kzm = (kz0 + kz1) / 2;
    box(s, kxm, KEEL - .15, kzm, kx1 - kx0, .3, kz1 - kz0, I); box(s, kxm, KEEL - .38, kzm, kx1 - kx0 - .5, .16, kz1 - kz0 - .5, GOLD); for (const z of [kz0 + .6, kz1 - .6]) beam(s, V(kx1 - .2, KEEL - .3, z), V(X0, KEEL - 3.4, z), .16, I);
    city.deck(kx0, kx1, kz0, kz1, KEEL); parapet(s, city, kx1, kz0, kx1, kz1, KEEL, I); parapet(s, city, kx0, kz1, kx1, kz1, KEEL, I); parapet(s, city, kx0, kz0, kx1, kz0, KEEL, I);
    for (const z of [kz0 + .3, kz1 - .3]) { box(s, kx1 - .1, KEEL + 1.5, z, .2, 1.2, .2, I); sphere(s, kx1 - .1, KEEL + 2.3, z, .16, ancientMats.dormant); }
    // The anchor: a gold clasp round the rib just north of the landing, taller than a man, with a dark core.
    { const a = new T.Group(); a.position.set(42.73, -28.1, -26); a.quaternion.setFromUnitVectors(V(0, 0, 1), V(1, -1, 0).normalize()); s.add(a); torus(a, 0, 0, 0, 1.25, .2, GOLD); torus(a, 0, 0, .45, 1.05, .1, GOLD); torus(a, 0, 0, -.45, 1.05, .1, GOLD);
      for (let k = 0; k < 6; k++) { const q = k * Math.PI / 3; box(a, Math.cos(q) * 1.25, Math.sin(q) * 1.25, 0, .36, .36, .6, I).rotation.z = q; } torus(a, 0, 0, 0, .7, .14, ancientMats.dormant); }
    { const t = new T.Group(); t.position.set(kx0 + 1.9, KEEL, kz0 + .5); this.live.add(t); city.target(t, 'anchor', 'discovery', 'The anchor', 0, 1.45, 0); }
    // What the survey wakes on the Keel: the clasp's core, and the lanterns that were waiting for it.
    { const a = new T.Group(); a.position.set(42.73, -28.1, -26); a.quaternion.setFromUnitVectors(V(0, 0, 1), V(1, -1, 0).normalize()); this.woken.add(a); torus(a, 0, 0, 0, .7, .16, ancientMats.awake); torus(a, 0, 0, 0, 1.25, .05, ancientMats.awake); for (const z of [kz0 + .3, kz1 - .3]) sphere(this.woken, kx1 - .1, KEEL + 2.3, z, .18, ancientMats.awake); }
    // Up on the street by the yard: the Ordinance has the Foundry casting copies of something, and they keep cracking.
    { const g = new T.Group(); g.position.set(38.9, 0, 20.6); g.rotation.y = .12; s.add(g); const ring = torus(g, 0, 1.55, 0, 1.25, .13, mats.wood); ring.rotation.y = EAST; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; box(g, 0, 1.55 + Math.cos(a) * 1.25, Math.sin(a) * 1.25, .3, .34, .34, mats.wood).rotation.x = -a; }
      for (const z of [-1, 1]) { box(g, .25, .9, z, .1, 1.8, .1, mats.wood).rotation.z = -.14; } box(g, .2, 1.5, 0, .04, .34, .26, mats.cream);
      for (const [x, z, r] of [[-1.3, 1.6, .4], [-1.5, -1.2, 1.9]]) { const half = new T.Mesh(new T.TorusGeometry(1.2, .12, 6, 12, Math.PI * .8), mats.rust); half.rotation.set(Math.PI / 2, 0, r); half.position.set(x, .3, z); g.add(half); } }
    city.collider(39, 20.6, .7, 2.9, 3); examine(this.live, city, 'collar', 'A casting pattern', 38.8, 1.5, 20.6, .9, 2.9, 2.9);
    // At the north end the cleft opens to sky. A bench, for whoever walked this far.
    for (const y of [.45, .5]) box(s, X0 + .4, YA + y, -56.8, .5, .06, 1.6, mats.wood); for (const dz of [-.6, .6]) box(s, X0 + .4, YA + .22, -56.8 + dz, .45, .44, .08, mats.iron);
    bake(s);
    const seen = () => this.root.visible;
    p.addWorker(X0 + 1.1, 12, -EAST, 'valve', { y: YA - .18, role: 'engineer', when: seen }); p.addWorker(X0 + 1.2, -32.4, -EAST, 'warm', { y: YB - .18, role: 'worker', when: seen }); p.addWorker(X0 + 1.3, -52, EAST, 'lean', { y: YA - .18, role: 'worker', time: 'day', when: seen });
  }
  sync(research: readonly string[]) { this.surveyed = research.includes('anchors'); this.sealed.visible = !this.surveyed; this.room.visible = this.woken.visible = this.surveyed; }
  update(viewer: T.Vector3) { this.root.visible = Math.abs(viewer.x - (CHASM.x0 + CHASM.x1) / 2) < 24; this.water.color.copy(this.waterBase).multiply(tone.lit.value); }
}
