import * as T from 'three';
import { box, cyl, sphere, torus, beam, sign, bake, mats, crate } from './assets';
import { V, gauge, artMats } from './art-kit';
import { ancientMats, occupationMats, emberChalk, tallies, decalMat, canvasTarp } from './factions';
import { ladder } from './routes';
import { CHASM } from './geography';
import { tone } from './tone';
import type { Presentation } from './presentation';

/** THE HANGWAY. A maintenance walk slung from the west wall of the cleft, five and a half
 * metres under the street. Crews use it to reach the mains; the Embers use it because it
 * passes under Cinder Row, where nobody checks papers. From its rail the view is straight
 * down: carriers at eye level, the old ribs below them, and then only weather. */
const Y = -5.5, X0 = CHASM.x0 + .1, X1 = X0 + 2, Z0 = -58, Z1 = 44, EAST = Math.PI / 2, BASE = Y - .2;
const I = ancientMats.ivory, GOLD = ancientMats.gold;
const chalk = decalMat(emberChalk, .92), tally = decalMat(tallies, .9);

export class Hangway {
  root = new T.Group(); private live = new T.Group(); private water = new T.MeshBasicMaterial({ color: '#dff5f2', transparent: true, opacity: .5, depthWrite: false, side: T.DoubleSide }); private waterBase = new T.Color('#dff5f2');
  constructor(p: Presentation) { const city = p.city, s = new T.Group(), xm = (X0 + X1) / 2, zm = (Z0 + Z1) / 2, len = Z1 - Z0; p.root.add(this.root); this.root.add(s, this.live);
    const prop = (x: number, z: number, w: number, d: number, h: number) => city.collider(x, z, w, d, Y + h, undefined, undefined, BASE);
    const decal = (m: T.Material, w: number, h: number, y: number, z: number) => { const q = new T.Mesh(new T.PlaneGeometry(w, h), m); q.position.set(X0 + .01, y, z); q.rotation.y = EAST; s.add(q); };
    // The walk: planks on an iron frame, hung from brackets in the cleft wall.
    box(s, xm, Y - .07, zm, 2, .14, len, mats.wood); for (const x of [X0 + .05, X1 - .05]) box(s, x, Y - .22, zm, .12, .22, len, mats.rust); for (let z = Z0 + 1; z < Z1; z += 3) box(s, xm, Y - .2, z, 2, .1, .1, mats.rust);
    for (let z = Z0 + 2; z < Z1; z += 6) { beam(s, V(X1 - .05, Y, z), V(X0, -.9, z), .04, mats.iron); box(s, X0 + .05, -.9, z, .3, .3, .3, mats.iron); }
    box(s, X1, Y + 1, zm, .06, .06, len, mats.iron); box(s, X1, Y + .5, zm, .04, .04, len, mats.iron); for (let z = Z0; z <= Z1; z += 2) box(s, X1, Y + .5, z, .06, 1, .06, mats.iron);
    for (const z of [Z0, Z1]) { box(s, xm, Y + 1, z, 2, .06, .06, mats.iron); box(s, xm, Y + .5, z, 2, .04, .04, mats.iron); }
    city.deck(X0, X1, Z0, Z1, Y);
    // Crews limewash the wall beside the walk so a dropped tool can be found: the pale band is what you follow.
    box(s, X0 - .04, Y + .95, zm, .06, 1.9, len, artMats.plaster); box(s, X0 - .03, Y + 1.95, zm, .08, .1, len, mats.rust);
    for (let z = Z0 + 3; z < Z1; z += 7) { box(s, X0 + .12, Y + 2.5, z, .24, .08, .08, mats.iron); box(s, X0 + .26, Y + 2.36, z, .16, .2, .16, mats.glow); box(s, X0 + .26, Y + 2.5, z, .22, .06, .22, mats.iron); }
    // Two ways down, each through a gap in the street rail.
    for (const [z, id] of [[30, 'ladder.hangway.south'], [-40, 'ladder.hangway.north']] as const) { ladder(s, this.live, city, id, 'Hangway ladder', CHASM.x0, z, Y, .18, 1, 0);
      for (const dz of [-.6, .6]) { box(s, CHASM.x0 - .5, 1.1, z + dz, .12, 1.9, .12, mats.iron); sphere(s, CHASM.x0 - .5, 2.12, z + dz, .07, mats.glow); } box(s, CHASM.x0 - .5, 2, z, .08, .08, 1.2, mats.iron); }
    sign(s, 'LOWWORKS HANGWAY', 'MAINS CREWS ONLY • NO LOITERING', X0 - .04, Y + 2, 26.4, 2.6, .6, '#cbbf9f').rotation.y = EAST;
    for (const z of [25, 24.3]) box(s, X0 + .18, Y + .9, z, .36, 1.8, .6, occupationMats.iron); prop(X0 + .18, 24.65, .36, 1.4, 1.8);
    // A drain that has run since before the Ordinance: it spills from under the walk into nothing.
    cyl(s, X0 + 1.4, Y - .9, 20, .34, 3.2, I).rotation.z = Math.PI / 2; torus(s, X1 + .45, Y - .9, 20, .38, .06, GOLD).rotation.y = EAST;
    { const fall = new T.Mesh(new T.PlaneGeometry(.55, 60), this.water); fall.position.set(X1 + .7, Y - 31, 20); fall.rotation.y = EAST; this.root.add(fall); }
    // The mains junction: one wheel that matters and a gauge the crews actually read.
    torus(s, X0 + .3, Y + 1.3, 12, .55, .06, mats.brass).rotation.y = EAST; for (const r of [0, Math.PI / 2]) box(s, X0 + .3, Y + 1.3, 12, .05, 1.05, .05, mats.brass).rotation.x = r; cyl(s, X0 + .15, Y + 1.3, 12, .09, .3, mats.iron).rotation.z = Math.PI / 2;
    for (const z of [11, 13]) cyl(s, X0 + .2, Y + 1.6, z, .16, 3.2, mats.copper); { const g = new T.Group(); g.position.set(X0 + .1, Y + 2.1, 13.8); g.rotation.y = EAST; s.add(g); gauge(g, 0, 0, 0, .28, '07'); }
    // Under Cinder Row: a dead drop. A lamp that only shows from below, and the count of who got through.
    crate(s, X0 + .3, Y, -5, .5); box(s, X0 + .45, Y + .12, -7, .7, .16, 1.8, canvasTarp); sphere(s, X0 + .25, Y + 1.7, -6, .08, mats.aether); box(s, X0 + .14, Y + 1.7, -6, .28, .06, .06, mats.iron);
    decal(chalk, .8, .8, Y + 1.5, -4.2); decal(tally, .9, .45, Y + 1.2, -7.4); prop(X0 + .3, -5, .5, .5, .6);
    // Set in the rock, older than the cleft's ironwork: a door with no handle on this side.
    box(s, X0 + .1, Y + 2.3, -22, .5, 4.6, 3.6, I); box(s, X0 + .3, Y + 2, -22, .2, 4, 2.6, ancientMats.ivoryDark); for (const y of [.9, 2, 3.1]) box(s, X0 + .42, Y + y, -22, .08, .16, 2.6, GOLD);
    torus(s, X0 + .46, Y + 2.2, -22, .6, .06, GOLD).rotation.y = EAST; cyl(s, X0 + .44, Y + 2.2, -22, .5, .04, ancientMats.dormant).rotation.z = Math.PI / 2; box(s, X0 + .7, Y + .02, -22, 1.2, .04, 2.8, ancientMats.tile); prop(X0 + .2, -22, .5, 3.6, 4.6);
    { const t = new T.Group(); t.position.set(X0 + .5, Y - .18, -24.6); t.rotation.y = EAST; this.live.add(t); city.target(t, 'undergate', 'discovery', 'The door in the rock', 0, 1.45, 0); }
    // Where the night crew sleeps: a tarp, a stove and two hammocks, a long way from any inspector.
    { const low = new T.Group(); low.position.y = Y; s.add(low); cyl(low, X0 + .32, .35, -31.2, .26, .7, mats.iron); cyl(low, X0 + .32, .72, -31.2, .3, .06, mats.iron); cyl(low, X0 + .32, .77, -31.2, .2, .05, mats.glow); cyl(low, X0 + .32, 1.9, -31.2, .06, 2.2, mats.iron); box(low, X0 + .9, 2.5, -33.5, 1.9, .05, 6, canvasTarp).rotation.z = -.22;
      for (const z of [-36.3, -30.7]) beam(low, V(X0 + 1.8, 0, z), V(X0 + 1.8, 2.3, z), .04, mats.iron); for (const y of [1.1, 1.9]) { box(low, X0 + .45, y, -34.6, .7, .06, 2.2, mats.cream); box(low, X0 + .45, y + .08, -34.6, .5, .1, 1.2, mats.red); }
      crate(low, X0 + .4, 0, -36.6, .6); prop(X0 + .3, -31.2, .5, .6, 1.1); prop(X0 + .3, -34.6, .5, 2.3, 2.1); }
    // At the north end the cleft opens to sky. A bench, for whoever walked this far.
    for (const y of [.45, .5]) box(s, X0 + .4, Y + y, Z0 + 1.2, .5, .06, 1.6, mats.wood); for (const dz of [-.6, .6]) box(s, X0 + .4, Y + .22, Z0 + 1.2 + dz, .45, .44, .08, mats.iron);
    bake(s);
    p.addWorker(X0 + 1.1, 12, -EAST, 'valve', { y: Y - .18, role: 'engineer', when: () => this.root.visible }); p.addWorker(X0 + 1.2, -32.4, -EAST, 'warm', { y: Y - .18, role: 'worker', when: () => this.root.visible }); p.addWorker(X0 + 1.3, -52, EAST, 'lean', { y: Y - .18, role: 'worker', time: 'day', when: () => this.root.visible });
  }
  update(viewer: T.Vector3) { this.root.visible = Math.abs(viewer.x - (CHASM.x0 + CHASM.x1) / 2) < 24; this.water.color.copy(this.waterBase).multiply(tone.lit.value); }
}
