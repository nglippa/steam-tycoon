import * as T from 'three';
import { box, holed, cyl, sphere, torus, beam, bake, sign, mats, crate, type Material } from './assets';
import { V, cable, artMats, labeledCrate, canopy, poster } from './art-kit';
import { emberChalk, decalMat, occupationMats, ancientMats, lightCone } from './factions';
import { Staged, shown, type Shown } from './layers';
import { hungRing, splitRing, channel } from './ancient-kit';
import { dado, ceilingBeam, desk, papers, shelves } from './interior-kit';
import { spacePhase } from '../simulation/economy';
import { ladder, parapet, examine } from './routes';
import { bridgeHouse } from './bridge-house';
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
const chalk = decalMat(emberChalk, .92), unseenMat = new T.MeshBasicMaterial({ visible: false });
/** Where the Steward lives: the room's floor, and where they stand when they wake or are walked home. */
export const HOME = { floor: 8.45, x: -3.2, z: 5.6, yaw: Math.PI };
/** The shaft from the room's ceiling trap up to the Leads: the ladder (rails on its north side, the climb line 0.4 m off them) runs down it, and it is cut through
 * everything between (the ceiling, the span's cornice and roof in presentation.ts, the duckboards), along the middle of its lining. */
export const HATCH = { x: -5.5, z: 4.75, cut: [-5.98, -5.02, 4.27, 5.23] } as const;

export class Roofwalk {
  /** The room's west door, hung only for the opening scene: shut while someone knocks, thrown open for the guards. */
  door = { leaf: new T.Group(), shut: false, awaiting: false };
  /** The Weathervane's sign on the street door's post, once a stranger has left it. */
  chalkMark!: T.Mesh;
  root = new T.Group(); private live = new T.Group(); private governors = new T.Group(); private pennants = new T.Group(); private chartered = false; private spin: T.Group[] = []; private roofs!: Staged; private search = new T.Group(); private city!: Presentation['city'];
  constructor(p: Presentation) { const city = this.city = p.city, s = new T.Group(), d = new T.Group(); p.root.add(this.root); this.root.add(s, d, this.live, this.governors, this.pennants);
    city.roofAt(-19, 14, LAND - .05); for (const x of [-12.6, 12.6]) city.roofAt(x, 5.6, LEADS - .1);
    // The duckboards: timber on iron saddles over the ridge, a rail each side, the chimneys alongside.
    holed(s, .7, LEADS - .06, 4.2, 24.6, .12, 2, HATCH.cut, mats.wood); for (let x = -11; x <= 13; x += 3) { holed(s, x, LEADS - .2, 4.2, .12, .16, 2.1, HATCH.cut, mats.iron); box(s, x, 13.2, 3.4, .1, 1.5, .1, mats.iron); }
    // The ladders come up through gaps in the north rail, as the Great Main catwalk's do.
    city.deck(-11.6, 13, 3.2, 5.2, LEADS); for (const [x0, x1] of [[-13.3, -12.95], [-11.85, 11.65], [12.75, 13]]) parapet(s, city, x0, 3.2, x1, 3.2, LEADS, mats.iron, false); parapet(s, city, -11.6, 5.2, 13, 5.2, LEADS, mats.iron, false); parapet(s, city, 13, 3.2, 13, 5.2, LEADS, mats.iron, false);
    // The landing where the walk meets the workshop: one step up, then one more onto the terrace.
    box(s, -12.45, LAND - .12, 5.1, 1.7, .24, 3.8, mats.wood); city.deck(-13.3, -11.6, 3.2, 7, LAND); parapet(s, city, -13.3, 7, -11.6, 7, LAND, mats.iron, false); parapet(s, city, -11.6, 5.2, -11.6, 7, LAND, mats.iron, false); parapet(s, city, -13.3, 3.2, -13.3, 5.3, LAND, mats.iron, false);
    ladder(s, this.live, city, 'ladder.leads.west', 'Bridge-house ladder', -12.4, 3.2, G, LAND, 0, -1); ladder(s, this.live, city, 'ladder.leads.east', 'Bridge-house ladder', 12.2, 3.2, G, LEADS, 0, -1);
    // Finch Mechanical's roof. The parapets are the building's own; the block and tower are solid.
    const P = mats.stone;
    city.deck(W.x0, W.x1, W.z0, W.zN, TERRACE); city.deck(W.x0, W.x1, W.zS, W.z1, TERRACE); city.deck(W.tower, W.x1, W.zN, W.zS, BLOCK);
    city.collider((W.x0 + W.x1) / 2, (W.zN + W.zS) / 2, W.x1 - W.x0, W.zS - W.zN, BLOCK - .1, undefined, undefined, 14); city.collider((W.x0 + W.tower) / 2, (W.zN + W.zS) / 2, W.tower - W.x0, W.zS - W.zN, 37, undefined, undefined, 14);
    parapet(s, city, W.x0, W.z0, W.x1, W.z0, TERRACE, P); parapet(s, city, W.x0, W.z0, W.x0, W.zN, TERRACE, P); parapet(s, city, W.x1, 7, W.x1, 7.9, TERRACE, P); parapet(s, city, W.x1, 9.5, W.x1, W.zN, TERRACE, P);
    parapet(s, city, W.x0, W.z1, W.x1, W.z1, TERRACE, P); parapet(s, city, W.x0, W.zS, W.x0, W.z1, TERRACE, P); parapet(s, city, W.x1, W.zS, W.x1, 18, TERRACE, P); parapet(s, city, W.x1, 19.6, W.x1, W.z1, TERRACE, P);
    parapet(s, city, W.tower, W.zN, W.x1, W.zN, BLOCK, P); parapet(s, city, W.tower, W.zS, W.x1, W.zS, BLOCK, P); parapet(s, city, W.x1, W.zN, W.x1, W.zS, BLOCK, P);
    ladder(s, this.live, city, 'ladder.finch.north', 'Roof ladder', -15.5, W.zN, TERRACE, BLOCK, 0, -1); ladder(s, this.live, city, 'ladder.finch.south', 'Roof ladder', -15.5, W.zS, TERRACE, BLOCK, 0, 1);
    ladder(s, this.live, city, 'ladder.finch.yard', 'Finch Mechanical ladder', -22, W.z1, G, TERRACE, 0, 1);
    // North terrace: Finch's pigeons, a telescope trained on the Weathervane, and somebody's washing.
    box(d, -22.6, 15.6, 6.6, 2, 1.5, 1.4, mats.wood); for (const dx of [-.9, .9]) for (const dz of [-.6, .6]) box(d, -22.6 + dx, 14.75, 6.6 + dz, .08, .6, .08, mats.wood); box(d, -22.6, 16.45, 6.6, 2.3, .1, 1.7, mats.rust).rotation.z = .12;
    for (const dx of [-.6, 0, .6]) box(d, -22.6 + dx, 15.7, 7.31, .3, .36, .03, mats.dark);
    city.collider(-22.6, 6.6, 2, 1.4, 16.5, undefined, undefined, 14.2);
    for (const [x, z] of [[-20.1, 9.4], [-19.5, 9.4], [-19.8, 8.8]]) beam(d, V(x, 14.45, z), V(-19.8, 15.7, 9.2), .025, mats.brass); cyl(d, -20.05, 15.82, 9.2, .07, .9, mats.brass).rotation.z = 1.35;
    examine(this.live, city, 'studs', 'Finch’s telescope', -19.8, 15.3, 9.2, 1.1, 1.8, 1.1);
    // The block roof: the highest place in the centre that can be stood on. A bench and the works' flag.
    for (const y of [.45, .5]) box(d, -14.4, BLOCK + y, 14, .5, .06, 1.8, mats.wood); for (const dz of [-.7, .7]) box(d, -14.4, BLOCK + .22, 14 + dz, .45, .44, .08, mats.iron);
    cyl(d, -17.9, BLOCK + 2.4, 11.2, .05, 4.8, mats.brass); sphere(d, -17.9, BLOCK + 4.85, 11.2, .09, mats.brass);
    // South terrace: a water tank, spare stock and the way down to the yard.
    cyl(d, -15.6, 15.5, 20.6, 1.1, 1.7, mats.copper); cyl(d, -15.6, 16.4, 20.6, 1.15, .1, mats.iron); for (const a of [0, 1, 2]) box(d, -15.6 + Math.cos(a * 2.1) * .9, 14.85, 20.6 + Math.sin(a * 2.1) * .9, .12, .8, .12, mats.iron); city.collider(-15.6, 20.6, 2.2, 2.2, 16.5, undefined, undefined, 14.2);
    crate(d, -23.6, TERRACE, 18.6, .8); crate(d, -23.5, TERRACE, 19.6, .6);
    bake(s); bake(d);
    // HOME. A rented room over the street in the Market Bridge-house, reached by a hatch in the Leads. Two windows:
    // north to the clock and the square, south down the Great Main. Nobody watches a Steward at home.
    { const h = new T.Group(); this.root.add(h); const F = HOME.floor, C = 11.4, X0 = -6.2, X1 = -.2, cx = (X0 + X1) / 2, P2 = mats.cream, mid = (F + C) / 2;
      box(h, cx, F - .05, 5.6, 6.2, .1, 3.1, mats.wood); holed(h, cx, C + .05, 5.6, 6.2, .1, 3.1, HATCH.cut, P2); box(h, X1 + .05, mid, 5.6, .1, C - F, 3.1, P2);
      // The west wall has the door: 1.3 m between jambs (the player needs a metre and a bit), z 4.35..5.65, 2.1 m high, and the corridor behind it.
      box(h, X0 - .05, mid, 4.2, .1, C - F, .3, P2); box(h, X0 - .05, mid, 6.4, .1, C - F, 1.5, P2); box(h, X0 - .05, (F + 2.1 + C) / 2, 5, .1, C - F - 2.1, 1.3, P2);
      for (const z of [4.35, 5.65]) box(h, X0 - .05, F + 1.05, z, .14, 2.1, .08, mats.wood); box(h, X0 - .05, F + 2.14, 5, .14, .08, 1.38, mats.wood);
      for (const [z, dz] of [[4.15, 1], [7.05, -1]] as const) { box(h, cx, (F + 8.85) / 2, z, 6.2, 8.85 - F, .1, P2); box(h, cx, (10.55 + C) / 2, z, 6.2, C - 10.55, .1, P2);
        for (const [a, b] of [[X0, -5.1], [-3.9, -2.1], [-.9, X1]]) box(h, (a + b) / 2, 9.7, z, b - a, 1.7, .1, P2); for (const x of [-4.5, -1.5]) box(h, x, 8.83, z + dz * .12, 1.3, .06, .3, mats.wood); }
      for (const z of [4.3, 6.9]) dado(h, cx, z, 6, true, mats.wood, F, .8); ceilingBeam(h, cx, C - .1, 5.6, 2.9, false); ceilingBeam(h, -4.9, C - .1, 5.6, 2.9, false);
      // a bed under the south window, a table and lamp under the north one, a trunk, a shelf, a coat on a hook, a map of the ward
      box(h, -1.35, F + .22, 6.4, 1.95, .28, .9, mats.wood); box(h, -1.35, F + .42, 6.4, 1.85, .14, .82, mats.cream); box(h, -1.7, F + .5, 6.4, 1.15, .06, .86, artMats.wine); box(h, -.62, F + .52, 6.4, .4, .1, .6, mats.cream); box(h, -.36, F + .5, 6.4, .06, .9, .9, mats.wood);
      city.collider(-1.35, 6.5, 1.95, .7, F + .6, undefined, undefined, F - .2);
      desk(h, -3, F, 4.72, 1.1, .56); papers(h, -3.25, F + .82, 4.72, 3); cyl(h, -2.62, F + .93, 4.6, .05, .22, mats.brass); sphere(h, -2.62, F + 1.1, 4.6, .09, mats.glow); box(h, -3, F + .24, 5.3, .4, .46, .4, mats.wood);
      box(h, -4.4, F + .22, 6.62, .9, .44, .5, mats.wood); for (const dx of [-.3, .3]) box(h, -4.4 + dx, F + .22, 6.36, .06, .46, .02, mats.iron);
      shelves(h, -5.95, F + .9, 6.2, 1.2, false, 2, .8); box(h, -.28, F + 1.75, 5.2, .04, .9, .5, artMats.fadedPaint); box(h, -.3, F + 2.2, 5.2, .08, .05, .05, mats.iron); poster(h, -.27, F + 1.7, 6.2, 0, -Math.PI / 2);
      box(h, -3.1, F + .01, 5.75, 2.2, .02, 1.2, artMats.wine);
      // THE HATCH. A proper roof scuttle: a timber coaming round an open well, the lid thrown back on its strap hinges and held by a stay,
      // the ladder's rails standing up out of it. Below, the same opening is a framed trap in the room's ceiling, and between them
      // a boarded shaft lines the cut through the span's roof, so the climb is down a clear 0.9 m well with nothing to pass through.
      { const hx = HATCH.x, hz = HATCH.z, W2 = .5;
        for (const [x, z, w, d] of [[hx, hz - W2, 1.1, .1], [hx, hz + W2, 1.1, .1], [hx - W2, hz, .1, 1.1], [hx + W2, hz, .1, 1.1]]) { box(h, x, LEADS + .15, z, w, .3, d, mats.wood); box(h, x, LEADS + .31, z, w + .04, .03, d + .04, mats.iron); }
        const lid = new T.Group(); lid.position.set(hx - W2 - .06, LEADS + .32, hz); lid.rotation.z = 1.82; h.add(lid); box(lid, .5, 0, 0, 1.02, .07, .86, mats.wood); for (const dz of [-.3, .3]) box(lid, .5, .04, dz, 1.04, .02, .09, mats.iron); box(lid, .92, .08, 0, .05, .06, .3, mats.iron);
        beam(h, V(hx - W2 - .3, LEADS + 1.02, hz - .45), V(hx - .1, LEADS + .32, hz - W2), .014, mats.iron); for (const dz of [-.3, .3]) box(h, hx - W2 - .05, LEADS + .32, hz + dz, .14, .06, .12, mats.iron);
        for (const [x, z, w, d] of [[hx, hz - .48, 1.02, .06], [hx, hz + .48, 1.02, .06], [hx - .48, hz, .06, .9], [hx + .48, hz, .06, .9]]) box(h, x, (C + LEADS) / 2, z, w, LEADS - C, d, mats.wood);
        for (const [x, z, w, d] of [[hx, hz - .49, 1.06, .08], [hx, hz + .49, 1.06, .08], [hx - .49, hz, .08, .9], [hx + .49, hz, .08, .9]]) box(h, x, C - .05, z, w, .1, d, mats.wood); }
      // Enough to say whose room it is: a mug and the ledger on the table, boots by the bed, a second blanket folded at its foot.
      cyl(h, -3.42, F + .88, 4.86, .045, .1, mats.copper); box(h, -2.95, F + .84, 4.8, .3, .05, .22, artMats.wine); for (const dx of [0, .16]) { box(h, -2.7 + dx, F + .1, 6.05, .11, .2, .26, mats.dark); box(h, -2.7 + dx, F + .26, 5.96, .11, .16, .1, mats.dark); }
      box(h, -2.05, F + .53, 6.4, .34, .08, .8, artMats.ochre); box(h, -.3, F + 1.5, 4.7, .03, .4, .3, mats.wood); box(h, -.31, F + 1.5, 4.7, .02, .3, .22, artMats.fadedPaint);
      bake(h); city.deck(X0 - .25, X1 + .25, 4, 7.2, F); this.chalkMark = bridgeHouse(p, this.root, this.live);
      for (const [x, z, w, d] of [[cx, 3.95, 6.6, .1], [cx, 7.25, 6.6, .1], [X0 - .3, 4.125, .1, .45], [X0 - .3, 6.475, .1, 1.65], [X1 + .3, 5.6, .1, 3.4]]) city.collider(x, z, w, d, C + .2, undefined, undefined, F - .25);
      city.collider(X0 - .3, 5, .1, 1.3, C + .2, undefined, () => !this.door.shut, F - .25); this.door.leaf.position.set(X0 - .05, F, 4.35); this.door.leaf.visible = false; box(this.door.leaf, 0, 1.03, .65, .07, 2.06, 1.28, mats.wood); box(this.door.leaf, -.05, 1.0, 1.1, .03, .1, .1, mats.brass); this.live.add(this.door.leaf);
      ladder(h, this.live, city, 'ladder.home', 'The hatch to your room', HATCH.x, HATCH.z - .43, F, LEADS, 0, 1, mats.iron, [0, -.6]);
      p.interiors.push({ x: -3.2, y: F + 2.2, z: 5.6, color: '#ffd9a0', reach: 4.4, power: 26 });
      const spot = (id: string, kind: 'home' | 'signal' | 'door', label: string, hint: string, x: number, y: number, z: number, w: number, hh: number, d: number, when?: () => boolean) => { const hit = new T.Mesh(new T.BoxGeometry(1, 1, 1), unseenMat); hit.position.set(x, y, z); hit.scale.set(w, hh, d); this.live.add(hit); hit.updateWorldMatrix(true, false); city.targets.push({ object: hit, id, kind, label, hint, position: hit.getWorldPosition(new T.Vector3()), when }); };
      // The door only answers during the opening, while somebody is knocking.
      spot('home.door', 'door', 'The door', 'ANSWER THE DOOR', X0, F + 1.05, 5, .6, 2.1, 1.3, () => this.door.awaiting);
      spot('home.bed', 'home', 'Your bed', 'SLEEP', -1.35, F + .5, 6.4, 1.9, .7, .9);
      // Curfew is when nobody is expected on the roofs: a lamp in the north window answers the Weathervane.
      spot('home.lamp', 'signal', 'The window lamp', 'ANSWER THE WEATHERVANE', -4.5, 9.6, 4.35, 1.1, 1.5, .4, () => city.economy.canSignal()); }
    // THE ROOFS, read six ways (economy.spacePhase, governed by Market Square). Occupied they are the Ordinance's
    // high ground: a watch post, wire on the parapets, the loft boarded, their colours on the works' own mast.
    { const st = this.roofs = new Staged(this.root), O = occupationMats, GOLD = ancientMats.gold, I = ancientMats.ivory;
      const wash = (g: T.Object3D, pal: Material[]) => { const a = V(-20.4, 16.2, 5.6), b = V(-14.2, 16.2, 9.9); for (const q of [a, b]) box(g, q.x, 15.3, q.z, .07, 1.8, .07, mats.wood); const line = cable(g, a, b, .25); [.2, .38, .6, .8].forEach((t, k) => { const q = line.getPoint(t); box(g, q.x, q.y - .34, q.z, .5, .62, .03, pal[k % pal.length]).rotation.y = -.96; }); };
      const planter = (g: T.Object3D, x: number, y: number, z: number, alongX: boolean, bloom?: Material) => { box(g, x, y + .2, z, alongX ? 1.4 : .5, .4, alongX ? .5 : 1.4, mats.wood); for (const o of [-.45, 0, .45]) sphere(g, x + (alongX ? o : 0), y + .52, z + (alongX ? 0 : o), .26, mats.leaf); if (bloom) for (const o of [-.3, .25]) sphere(g, x + (alongX ? o : .1), y + .74, z + (alongX ? .1 : o), .09, bloom); };
      const held = st.layer(shown.held);
      box(held, -17.2, BLOCK + 4.3, 11.2, 1.3, .8, .03, O.oxblood);
      // the watch post on the south terrace: a hooded box on legs with a slit toward the street
      box(held, -19.5, TERRACE + 1.5, 21.6, 1.5, 1.5, 1.5, O.iron); box(held, -19.5, TERRACE + 2.32, 21.6, 1.8, .12, 1.8, O.iron); for (const dx of [-.65, .65]) for (const dz of [-.65, .65]) box(held, -19.5 + dx, TERRACE + .38, 21.6 + dz, .1, .76, .1, O.iron); box(held, -18.74, TERRACE + 1.7, 21.6, .03, .22, 1.1, mats.dark); city.collider(-19.5, 21.6, 1.5, 1.5, TERRACE + 2.4, undefined, () => st.phase >= 4, TERRACE - .2);
      // wire along the street-side parapets, and the notice at the head of the yard ladder
      for (const [z0, z1] of [[7.2, 7.8], [9.6, 10.4], [19.8, 22.4]]) { for (let z = z0; z <= z1; z += .8) { box(held, W.x1 - .1, TERRACE + 1.32, z, .04, .44, .04, O.iron); beam(held, V(W.x1 - .1, TERRACE + 1.5, z), V(W.x1 + .12, TERRACE + 1.62, z + .4), .012, O.iron); } for (const y of [1.22, 1.4]) box(held, W.x1 - .1, TERRACE + y, (z0 + z1) / 2, .02, .02, z1 - z0, O.iron); }
      sign(held, 'ROOFS CLOSED', 'OBSERVATION POST • KEEP OFF', -17.5, TERRACE + 1.5, 21.9, 1.5, .6, '#cbbf9f').rotation.y = Math.PI; box(held, -17.5, TERRACE + .6, 21.95, .08, 1.2, .08, O.iron);
      box(held, -9, LEADS + 1.5, 3.25, .9, .5, .04, O.oxblood); box(held, 9, LEADS + 1.5, 3.25, .9, .5, .04, O.oxblood);
      // Until people organise, the loft is boarded and nothing hangs on the roof.
      const bare = st.layer(p => p < 2); for (const dy of [-.14, .12]) box(bare, -22.6, 15.7 + dy, 7.34, 1.7, .12, .04, mats.rust).rotation.z = dy * .5; box(bare, -22.6, 15.7, 7.36, .1, .7, .04, O.iron);
      // COVERT: the mark behind the block, one bird back in the loft, a shuttered lantern under the bench.
      const covert = st.layer(shown.covert); { const m = new T.Mesh(new T.PlaneGeometry(.6, .6), chalk); m.position.set(-19, 15.4, W.zN - .02); m.rotation.y = Math.PI; covert.add(m); } sphere(covert, -21.85, 15.05, 6.8, .1, mats.cream).scale.x *= 1.5;
      const secret = st.layer(shown.secret); box(secret, -14.4, BLOCK + .14, 14.5, .2, .26, .2, mats.iron); box(secret, -14.3, BLOCK + .14, 14.5, .02, .12, .1, mats.glow); box(secret, -16.4, TERRACE + .2, 18.4, .9, .4, .6, artMats.fadedPaint);
      // ORGANIZED: the boards come off, the birds fly, washing goes out in plain colours, a mirror on a tripod answers the Weathervane.
      const org = st.layer(p => p >= 2 && p < 4); wash(org, [mats.cream, artMats.fadedPaint, artMats.plaster, mats.cream]);
      const lived = st.layer(shown.organized); for (const [dx, dy] of [[-.5, 16.6], [.3, 16.62], [0, 16.6]]) sphere(lived, -22.6 + dx, dy, 6.8, .1, mats.cream).scale.x *= 1.5;
      planter(lived, -17.4, TERRACE, 5.85, true); planter(lived, -24.1, TERRACE, 20, false);
      for (const a of [0, 2.1, 4.2]) beam(lived, V(-14.2 + Math.cos(a) * .3, BLOCK, 16.6 + Math.sin(a) * .3), V(-14.2, BLOCK + 1.2, 16.6), .02, mats.wood); box(lived, -14.2, BLOCK + 1.34, 16.6, .34, .34, .03, mats.glow).rotation.set(-.3, .7, 0);
      // CONTESTED: a searchlight and a horn on the block, a second strand of wire, a man on the walk.
      const cont = st.layer(shown.contested); box(cont, -17.6, BLOCK + .7, 16.4, .16, 1.4, .16, O.iron); { const h = new T.Mesh(new T.ConeGeometry(.42, .9, 10, 1, true), O.iron); h.position.set(-16.6, BLOCK + 2.6, 11.2); h.rotation.z = -1.57; cont.add(h); } box(cont, -17.3, BLOCK + 2.6, 11.2, 1.2, .06, .06, O.iron);
      sign(cont, 'SIGNALLING FORBIDDEN', 'MIRRORS AND LAMPS WILL BE SEIZED', -15.5, BLOCK + .75, W.zS - .12, 1.5, .55, '#cbbf9f').rotation.y = Math.PI;
      { const L = this.search; L.position.set(-17.6, BLOCK + 1.6, 16.4); const aim = new T.Group(); aim.rotation.x = -1.2; L.add(aim); cyl(aim, 0, 0, 0, .3, .5, O.iron); cyl(aim, 0, -.26, 0, .25, .03, mats.glow); lightCone(aim, 2.2, 16).position.y = -.28; }
      // LIBERATED: the works' own flag, a garden in boxes, a table where the post stood, bunting from the loft to the block.
      const free = st.layer(shown.free); box(free, -17.2, BLOCK + 4.3, 11.2, 1.3, .8, .03, mats.teal); wash(free, [mats.cream, mats.teal, artMats.wine, artMats.ochre]);
      for (const [x, z, ax, m] of [[-21.4, 22.1, true, mats.red], [-18.6, 22.1, true, artMats.ochre], [-13.85, 8.7, false, mats.red], [-13.85, 19.2, false, artMats.ochre], [-20.6, 5.85, true, mats.red]] as const) planter(free, x, TERRACE, z, ax, m);
      box(free, -19.5, TERRACE + .78, 20.4, 1.6, .07, .9, mats.wood); for (const dx of [-.7, .7]) box(free, -19.5 + dx, TERRACE + .39, 20.4, .07, .78, .8, mats.wood); for (const dx of [-.5, .5]) cyl(free, -19.5 + dx, TERRACE + .24, 19.5, .2, .48, mats.wood); for (const dx of [-.3, .2]) cyl(free, -19.5 + dx, TERRACE + .88, 20.4, .05, .1, mats.copper); city.collider(-19.5, 20.4, 1.6, .9, TERRACE + .9, undefined, () => st.phase < 4, TERRACE - .2);
      { const line = cable(free, V(-22.6, 16.6, 7.2), V(-17.9, BLOCK + 3, 11.2), .5); for (let k = 1; k < 9; k++) { const q = line.getPoint(k / 9); box(free, q.x, q.y - .16, q.z, .26, .3, .02, [mats.red, mats.cream, mats.teal, artMats.ochre][k % 4]).rotation.y = .7; } }
      for (const x of [-9, -3, 3, 9]) { box(free, x, LEADS + .22, 3.5, 1.2, .36, .36, mats.wood); for (const o of [-.35, 0, .35]) sphere(free, x + o, LEADS + .5, 3.5, .2, mats.leaf); }
      // RESTORED: the old roof garden. Water in a channel along the terrace, a ring hung over the block, green over the parapet to the street.
      const res = st.layer(shown.restored); channel(res, -19, TERRACE + .03, 9.9, 9, true, ancientMats.awake, .3); channel(res, -19, TERRACE + .03, 18.1, 9, true, ancientMats.awake, .3);
      hungRing(res, -15.9, BLOCK + 2.2, 14, 1.3, 2.4); for (const a of [.4, 2.5, 4.6]) box(res, -15.9 + Math.cos(a) * 1.3, BLOCK + 1.1, 14 + Math.sin(a) * 1.3, .1, 2.2, .1, I); cyl(res, -15.9, BLOCK + .12, 14, .9, .24, I); sphere(res, -15.9, BLOCK + .5, 14, .34, ancientMats.awake);
      for (let z = 7.4; z < 22.4; z += 1.1) { if (z > 10.2 && z < 17.8) continue; for (const dy of [0, .34, .62]) sphere(res, W.x1 + .12, TERRACE + .9 - dy, z, .26 - dy * .18, mats.leaf); }
      { const ring = splitRing(res, W.x1 + .08, 17.4, 14, .9, 0); ring.rotation.y = Math.PI / 2; }
      // PROSPERITY, whoever holds the roof: a banded tank and an awning, or a patched one under a tarp.
      const rich = st.layer(shown.rich); for (const y of [15, 16]) cyl(rich, -15.6, y, 20.6, 1.13, .1, mats.brass); box(rich, -23.4, TERRACE + 2.1, 19.1, 1.9, .05, 2.6, artMats.wine).rotation.z = .16; for (const dz of [-1.2, 1.2]) box(rich, -22.6, TERRACE + 1, 19.1 + dz, .06, 2, .06, mats.brass);
      const poor = st.layer(shown.poor); box(poor, -15.1, 15.6, 19.7, .5, .6, .04, mats.rust).rotation.y = .5; box(poor, -23.55, TERRACE + .9, 19.1, 1.3, .04, 2.2, artMats.fadedPaint).rotation.z = -.12;
      st.seal(); cont.add(this.search);
      const on = (t: Shown) => () => st.is(t);
      p.addWorker(-18.2, 21.6, Math.PI / 2, 'guard', { y: TERRACE - G, role: 'guard', when: on(shown.held) }); p.addWorker(2, 4.2, Math.PI / 2, 'guard', { y: LEADS - G, path: [9, 4.2, .4], role: 'guard', when: on(shown.contested) });
      p.addWorker(-20.6, 7.4, Math.PI / 2, 'sweep', { y: TERRACE - G, role: 'worker', when: on(shown.organized) }); p.addWorker(4.6, 3.75, Math.PI, 'lean', { y: LEADS - G, role: 'resident', when: on(shown.organized) });
      p.addWorker(-19.5, 19.5, 0, 'sit', { y: TERRACE - G, role: 'resident', when: on(shown.free), tool: 'mug' }); p.addWorker(-21.8, 21.2, Math.PI, 'repair', { y: TERRACE - G, role: 'resident', when: on(shown.free) }); p.addWorker(-16.6, 8, -.6, 'watch', { y: TERRACE - G, role: 'resident', scale: .72, when: on(shown.free) }); }
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
    p.addWorker(-14.4, 13.4, -Math.PI / 2, 'sit', { y: BLOCK - G, role: 'courier', time: 'night' });
  }
  sync(research: readonly string[]) { const e = this.city.economy; this.roofs.sync(spacePhase(e.state.sites, 'market'), e.stage); this.governors.visible = research.includes('governors'); this.pennants.visible = this.chartered = research.includes('charter'); }
  update(time: number, calm: boolean) { this.search.rotation.y = 1.57 + Math.sin((calm ? time * .3 : time) * .19) * .8; if (this.governors.visible) for (const a of this.spin) a.rotation.y = time * (calm ? 1.2 : 5); }
}
