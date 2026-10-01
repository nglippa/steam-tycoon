import * as T from 'three';
import { box, cyl, sphere, torus, beam, sign, bake, mats, crate } from './assets';
import { V, gauge, artMats } from './art-kit';
import { ancientMats, occupationMats, emberChalk, tallies, decalMat, canvasTarp } from './factions';
import { ladder, stair, parapet } from './routes';
import { CHASM } from './geography';
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
  root = new T.Group(); private live = new T.Group(); private water = new T.MeshBasicMaterial({ color: '#dff5f2', transparent: true, opacity: .5, depthWrite: false, side: T.DoubleSide }); private waterBase = new T.Color('#dff5f2');
  constructor(p: Presentation) { const city = p.city, s = new T.Group(), xm = (X0 + X1) / 2; p.root.add(this.root); this.root.add(s, this.live);
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
    box(s, X0 + .1, YB + 2.3, -20, .5, 4.6, 3.6, I); box(s, X0 + .3, YB + 2, -20, .2, 4, 2.6, ancientMats.ivoryDark); for (const y of [.9, 2, 3.1]) box(s, X0 + .42, YB + y, -20, .08, .16, 2.6, GOLD);
    torus(s, X0 + .46, YB + 2.2, -20, .6, .06, GOLD).rotation.y = EAST; cyl(s, X0 + .44, YB + 2.2, -20, .5, .04, ancientMats.dormant).rotation.z = Math.PI / 2; box(s, X0 + .7, YB + .02, -20, 1.2, .04, 2.8, ancientMats.tile); prop(X0 + .2, -20, .5, 3.6, YB, 4.6);
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
    // At the north end the cleft opens to sky. A bench, for whoever walked this far.
    for (const y of [.45, .5]) box(s, X0 + .4, YA + y, -56.8, .5, .06, 1.6, mats.wood); for (const dz of [-.6, .6]) box(s, X0 + .4, YA + .22, -56.8 + dz, .45, .44, .08, mats.iron);
    bake(s);
    const seen = () => this.root.visible;
    p.addWorker(X0 + 1.1, 12, -EAST, 'valve', { y: YA - .18, role: 'engineer', when: seen }); p.addWorker(X0 + 1.2, -32.4, -EAST, 'warm', { y: YB - .18, role: 'worker', when: seen }); p.addWorker(X0 + 1.3, -52, EAST, 'lean', { y: YA - .18, role: 'worker', time: 'day', when: seen });
  }
  update(viewer: T.Vector3) { this.root.visible = Math.abs(viewer.x - (CHASM.x0 + CHASM.x1) / 2) < 24; this.water.color.copy(this.waterBase).multiply(tone.lit.value); }
}
