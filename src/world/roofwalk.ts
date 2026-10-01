import * as T from 'three';
import { box, cyl, sphere, torus, beam, bake, mats, crate } from './assets';
import { V, cable, artMats, labeledCrate, canopy } from './art-kit';
import { emberChalk, decalMat } from './factions';
import { ladder, parapet, examine } from './routes';
import type { Presentation } from './presentation';

/** THE LEADS. The roofs in the middle of the ward, joined up. A duckboard walk runs the
 * ridge of the Market Bridge-house, over the main street, onto Finch Mechanical's two
 * terraces and the block between them. Ladders at both ends of the Bridge-house and on the
 * workshop's south wall make it a way across the centre as well as a place to look from.
 *
 * It also carries what the Finch Institute's research changes in the street: governors
 * spinning on the Great Main's cabinets, and the Seven Provinces' colours on the walk. */
const LEADS = 14, LAND = 14.22, TERRACE = 14.45, BLOCK = 19.85, G = .18;
/** Finch Mechanical's roof, measured: terraces either side of a raised block; a tower fills the block's west half. */
const W = { x0: -24.7, x1: -13.3, z0: 5.3, zN: 10.6, zS: 17.4, z1: 22.6, tower: -18.49 };
const chalk = decalMat(emberChalk, .92);

export class Roofwalk {
  root = new T.Group(); private live = new T.Group(); private governors = new T.Group(); private pennants = new T.Group(); private chartered = false; private spin: T.Group[] = [];
  constructor(p: Presentation) { const city = p.city, s = new T.Group(), d = new T.Group(); p.root.add(this.root); this.root.add(s, d, this.live, this.governors, this.pennants);
    city.roofAt(-19, 14, LAND - .05); for (const x of [-12.6, 12.6]) city.roofAt(x, 5.6, LEADS - .1);
    // The duckboards: timber on iron saddles over the ridge, a rail each side, the chimneys alongside.
    box(s, .7, LEADS - .06, 4.2, 24.6, .12, 2, mats.wood); for (let x = -11; x <= 13; x += 3) { box(s, x, LEADS - .2, 4.2, .12, .16, 2.1, mats.iron); box(s, x, 13.2, 3.4, .1, 1.5, .1, mats.iron); }
    city.deck(-11.6, 13, 3.2, 5.2, LEADS); parapet(s, city, -13.3, 3.2, 13, 3.2, LEADS, mats.iron, false); parapet(s, city, -11.6, 5.2, 13, 5.2, LEADS, mats.iron, false); parapet(s, city, 13, 3.2, 13, 5.2, LEADS, mats.iron, false);
    // The landing where the walk meets the workshop: one step up, then one more onto the terrace.
    box(s, -12.45, LAND - .12, 5.1, 1.7, .24, 3.8, mats.wood); city.deck(-13.3, -11.6, 3.2, 7, LAND); parapet(s, city, -13.3, 7, -11.6, 7, LAND, mats.iron, false); parapet(s, city, -11.6, 5.2, -11.6, 7, LAND, mats.iron, false); parapet(s, city, -13.3, 3.2, -13.3, 5.3, LAND, mats.iron, false);
    ladder(s, this.live, city, 'ladder.leads.west', 'Bridge-house ladder', -12.4, 3.2, G, LAND, 0, -1); ladder(s, this.live, city, 'ladder.leads.east', 'Bridge-house ladder', 12.2, 3.2, G, LEADS, 0, -1);
    // Finch Mechanical's roof. The parapets are the building's own; the block and tower are solid.
    const P = mats.stone;
    city.deck(W.x0, W.x1, W.z0, W.zN, TERRACE); city.deck(W.x0, W.x1, W.zS, W.z1, TERRACE); city.deck(W.tower, W.x1, W.zN, W.zS, BLOCK);
    city.collider((W.x0 + W.x1) / 2, (W.zN + W.zS) / 2, W.x1 - W.x0, W.zS - W.zN, BLOCK - .1, undefined, undefined, 14); city.collider((W.x0 + W.tower) / 2, (W.zN + W.zS) / 2, W.tower - W.x0, W.zS - W.zN, 37, undefined, undefined, 14);
    parapet(s, city, W.x0, W.z0, W.x1, W.z0, TERRACE, P); parapet(s, city, W.x0, W.z0, W.x0, W.zN, TERRACE, P); parapet(s, city, W.x1, 7, W.x1, W.zN, TERRACE, P);
    parapet(s, city, W.x0, W.z1, W.x1, W.z1, TERRACE, P); parapet(s, city, W.x0, W.zS, W.x0, W.z1, TERRACE, P); parapet(s, city, W.x1, W.zS, W.x1, W.z1, TERRACE, P);
    parapet(s, city, W.tower, W.zN, W.x1, W.zN, BLOCK, P); parapet(s, city, W.tower, W.zS, W.x1, W.zS, BLOCK, P); parapet(s, city, W.x1, W.zN, W.x1, W.zS, BLOCK, P);
    ladder(s, this.live, city, 'ladder.finch.north', 'Roof ladder', -15.5, W.zN, TERRACE, BLOCK, 0, -1); ladder(s, this.live, city, 'ladder.finch.south', 'Roof ladder', -15.5, W.zS, TERRACE, BLOCK, 0, 1);
    ladder(s, this.live, city, 'ladder.finch.yard', 'Finch Mechanical ladder', -22, W.z1, G, TERRACE, 0, 1);
    // North terrace: Finch's pigeons, a telescope trained on the Weathervane, and somebody's washing.
    box(d, -22.6, 15.6, 6.6, 2, 1.5, 1.4, mats.wood); for (const dx of [-.9, .9]) for (const dz of [-.6, .6]) box(d, -22.6 + dx, 14.75, 6.6 + dz, .08, .6, .08, mats.wood); box(d, -22.6, 16.45, 6.6, 2.3, .1, 1.7, mats.rust).rotation.z = .12;
    for (const dx of [-.6, 0, .6]) box(d, -22.6 + dx, 15.7, 7.31, .3, .36, .03, mats.dark); for (const [dx, dy] of [[-.5, 16.6], [.3, 16.62], [.75, 15.05]]) sphere(d, -22.6 + dx, dy, 6.8, .1, mats.cream).scale.set(1.5, 1, 1);
    city.collider(-22.6, 6.6, 2, 1.4, 16.5, undefined, undefined, 14.2);
    for (const [x, z] of [[-20.1, 9.4], [-19.5, 9.4], [-19.8, 8.8]]) beam(d, V(x, 14.45, z), V(-19.8, 15.7, 9.2), .025, mats.brass); cyl(d, -20.05, 15.82, 9.2, .07, .9, mats.brass).rotation.z = 1.35;
    examine(this.live, city, 'studs', 'Finch’s telescope', -19.8, 15.3, 9.2, 1.1, 1.8, 1.1);
    { const a = V(-20.4, 16.2, 5.6), b = V(-14.2, 16.2, 9.9); for (const q of [a, b]) box(d, q.x, 15.3, q.z, .07, 1.8, .07, mats.wood); const line = cable(d, a, b, .25); [.2, .38, .6, .8].forEach((t, k) => { const q = line.getPoint(t); box(d, q.x, q.y - .34, q.z, .5, .62, .03, [mats.cream, mats.teal, artMats.wine, mats.cream][k]).rotation.y = -.96; }); }
    { const m = new T.Mesh(new T.PlaneGeometry(.6, .6), chalk); m.position.set(-19, 15.4, W.zN - .02); m.rotation.y = Math.PI; d.add(m); }
    // The block roof: the highest place in the centre that can be stood on. A bench and the works' flag.
    for (const y of [.45, .5]) box(d, -14.4, BLOCK + y, 14, .5, .06, 1.8, mats.wood); for (const dz of [-.7, .7]) box(d, -14.4, BLOCK + .22, 14 + dz, .45, .44, .08, mats.iron);
    cyl(d, -17.9, BLOCK + 2.4, 11.2, .05, 4.8, mats.brass); box(d, -17.2, BLOCK + 4.3, 11.2, 1.3, .8, .03, mats.teal); sphere(d, -17.9, BLOCK + 4.85, 11.2, .09, mats.brass);
    // South terrace: a water tank, spare stock and the way down to the yard.
    cyl(d, -15.6, 15.5, 20.6, 1.1, 1.7, mats.copper); cyl(d, -15.6, 16.4, 20.6, 1.15, .1, mats.iron); for (const a of [0, 1, 2]) box(d, -15.6 + Math.cos(a * 2.1) * .9, 14.85, 20.6 + Math.sin(a * 2.1) * .9, .12, .8, .12, mats.iron); city.collider(-15.6, 20.6, 2.2, 2.2, 16.5, undefined, undefined, 14.2);
    crate(d, -23.6, TERRACE, 18.6, .8); crate(d, -23.5, TERRACE, 19.6, .6);
    bake(s); bake(d);
    { const t = new T.Group(); t.position.set(-21.4, TERRACE, 8.2); t.rotation.y = Math.PI / 2; this.live.add(t); city.target(t, 'pigeons', 'discovery', 'Finch’s pigeon loft', 0, 1.45, 0); }
    // RESEARCH, where the street can see it.
    // Precision governors: flyball regulators turning on the Great Main's cabinets.
    for (const side of [-1, 1]) { const g = new T.Group(); g.position.set(side * 9.9, 2.12, 29); this.governors.add(g); cyl(g, 0, .5, 0, .04, 1, mats.brass); cyl(g, 0, .06, 0, .22, .12, mats.iron);
      const arms = new T.Group(); arms.position.y = .95; g.add(arms); for (const s2 of [-1, 1]) { beam(arms, V(0, 0, 0), V(s2 * .34, -.36, 0), .018, mats.brass); sphere(arms, s2 * .36, -.4, 0, .11, mats.brass); } torus(arms, 0, -.22, 0, .1, .02, mats.iron).rotation.x = Math.PI / 2; this.spin.push(arms); }
    // The Seven Provinces charter: their colours along the walk over the main street.
    [mats.red, mats.teal, artMats.ochre, mats.cream, artMats.wine, mats.copper, mats.leaf].forEach((m, k) => { const x = -9 + k * 3; cyl(this.pennants, x, LEADS + 1.9, 5.2, .025, 1.9, mats.brass); box(this.pennants, x + .42, LEADS + 2.45, 5.2, .8, .52, .02, m).rotation.y = .12 * (k % 2 ? 1 : -1); });
    // ...and their traders under it: three pitches on the pavements either side of the Bridge-house, with goods the ward has not seen in years.
    for (const [x, z, m, text, yaw] of [[9.4, 10.6, artMats.wine, 'ORISON/SALT', -Math.PI / 2], [-9.4, 11.2, artMats.ochre, 'AMBER/TEA', Math.PI / 2], [9.6, -2.4, mats.teal, 'VEYR/IRON', -Math.PI / 2]] as const) { const side = Math.sign(x);
      canopy(this.pennants, x + side * .7, 2.5, z, 1.9, 2.4, m); box(this.pennants, x + side * .7, .9, z, 1.1, .08, 2.2, mats.wood); for (const dz of [-1, 1]) box(this.pennants, x + side * .7, .47, z + dz, 1, .86, .08, mats.wood); labeledCrate(this.pennants, x + side * .2, G, z + 1.7, .7, text, .3); for (let k = 0; k < 3; k++) box(this.pennants, x + side * .6, 1.02, z - .6 + k * .6, .3, .18, .3, m);
      city.collider(x + side * .7, z, 1.2, 2.4, 1.1, undefined, () => !this.chartered); p.addWorker(x + side * 1.5, z, yaw, 'browse', { role: 'merchant', when: () => this.chartered }); }
    const c1 = p.addWorker(8.1, 9.6, Math.PI / 2 + .4, 'talk', { role: 'resident', when: () => this.chartered }), c2 = p.addWorker(8.3, 11.3, Math.PI / 2 - .5, 'talk', { role: 'courier', when: () => this.chartered }); p.workers[c1].partner = c2; p.workers[c2].partner = c1;
    bake(this.pennants);
    p.addWorker(4.6, 3.75, Math.PI, 'lean', { y: LEADS - G, role: 'resident' }); p.addWorker(-20.6, 7.4, Math.PI / 2, 'sweep', { y: TERRACE - G, role: 'worker' }); p.addWorker(-14.4, 13.4, -Math.PI / 2, 'sit', { y: BLOCK - G, role: 'courier', time: 'night' });
  }
  sync(research: readonly string[]) { this.governors.visible = research.includes('governors'); this.pennants.visible = this.chartered = research.includes('charter'); }
  update(time: number, calm: boolean) { if (this.governors.visible) for (const a of this.spin) a.rotation.y = time * (calm ? 1.2 : 5); }
}
