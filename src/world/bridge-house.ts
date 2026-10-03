import * as T from 'three';
import { box, sphere, bake, mats } from './assets';
import { emberChalk, decalMat } from './factions';
import { stair } from './routes';
import type { Presentation } from './presentation';

/** THE WAY DOWN from the rented room. Its west door opens on a corridor through the span's plaster body, over the west pier
 * to a landing, and one steep stair in a lean-to stair-house on the pier's west flank (it narrows the Finch Yard mouth to
 * 3.3 m) comes out at a vestibule and a street door facing west, with a two-step stoop. Nothing here is on a cart lane or a
 * civilian route, and the checkpoint crew cannot see it: the house's east wall stands in their way. */
const F = 8.45, V = .4, X0 = -15.5, X1 = -13.5, ZN = -4, ZS = 5.35, DZ0 = -3.3, DZ1 = -2, slope = .9875;
/** The lean-to roof: low over the street door, rising along the stair to meet Finch Mechanical's wall. */
const roof = (z: number) => 2.9 + (z - ZN - .1) * slope;
export function bridgeHouse(p: Presentation, root: T.Group, live: T.Group) {
  const city = p.city, g = new T.Group(), W = mats.warmStone, P = mats.cream; root.add(g);
  const solid = (x: number, z: number, w: number, d: number, top = 10.6) => city.collider(x, z, w, d, top, undefined, undefined, -1);
  // A wall of the stair-house: its top follows the roof, so it is cut as a profile in z/y and pushed along x.
  const wall = (x: number, z0: number, z1: number, y0 = 0) => { const s = new T.Shape([new T.Vector2(z0, y0), new T.Vector2(z1, y0), new T.Vector2(z1, roof(z1)), new T.Vector2(z0, roof(z0))]);
    const geo = new T.ExtrudeGeometry(s, { depth: .1, bevelEnabled: false }); geo.rotateY(-Math.PI / 2); geo.translate(x + .05, 0, 0); const m = new T.Mesh(geo, W); g.add(m); };
  // corridor: thin walls like the room's, a floor, a low ceiling
  box(g, -9.9, F - .05, 5, 6.7, .1, 1.5, mats.wood); box(g, -9.88, F + 1, 4.3, 7.26, 2, .1, P); box(g, -9.88, F + 1, 5.7, 7.26, 2, .1, P); box(g, -9.88, F + 2.05, 5, 7.26, .1, 1.5, P);
  for (const z of [4.3, 5.7]) solid(-9.88, z, 7.26, .1); city.deck(-12.8, -6.2, 4.4, 5.6, F);
  // landing over the pier, and the solid block under it
  box(g, -14.15, F - .05, 4.9, 2.7, .1, 1.05, mats.wood); box(g, -14.5, (F - .1) / 2, 4.9, 2, F - .1, .95, W); city.deck(-15.4, -12.7, 4.4, 5.3, F);
  // the stair, the shell round it, the vestibule
  stair(g, city, -15.4, -13.6, -1.9, 4.4, V, F, 'z', 'max', W);
  wall(X0, DZ1, ZS); wall(X0, ZN, DZ0); wall(X0, DZ0, DZ1, 2.1); wall(X1, ZN, 4.4);
  box(g, -14.5, roof(ZN) / 2, ZN + .05, 2.1, roof(ZN), .1, W);
  box(g, -14.5, (roof(ZN) + roof(ZS)) / 2 + .1, (ZN + ZS) / 2, 2.6, .14, Math.hypot(ZS - ZN + .4, (ZS - ZN) * slope), mats.wood).rotation.x = -Math.atan(slope);
  box(g, -14.5, V / 2, (ZN + -1.9) / 2, 2, V, -1.9 - ZN, W);
  solid(X0, (-2 + ZS) / 2, .1, ZS + 2); solid(X0, (ZN + DZ0) / 2, .1, DZ0 - ZN); solid(X1, (ZN + 4.4) / 2, .1, 4.4 - ZN); solid(-14.5, ZN, 2.2, .1);
  city.deck(-15.4, -13.6, ZN + .1, -1.9, V);
  // street door: no leaf in free play, jambs and a lintel, a lamp over it, the stoop's two steps
  for (const z of [DZ0, DZ1]) box(g, X0 - .02, 1.05, z, .16, 2.1, .1, mats.wood); box(g, X0 - .02, 2.14, (DZ0 + DZ1) / 2, .16, .1, DZ1 - DZ0 + .2, mats.wood);
  box(g, X0 - .35, 2.5, (DZ0 + DZ1) / 2, .5, .04, .04, mats.iron); sphere(g, X0 - .5, 2.35, (DZ0 + DZ1) / 2, .09, mats.glow);
  box(g, -16.7, .145, -2.75, .8, .29, 2.1, W); box(g, -15.95, .2, -2.7, .7, .4, 1.6, W); city.deck(-17.1, -16.3, ZN + .2, -1.7, .29); city.deck(-16.3, -15.4, -3.5, -1.9, V);
  p.interiors.push({ x: -9.5, y: F + 1.8, z: 5, color: '#ffd9a0', reach: 4, power: 18 }, { x: -14.5, y: 5, z: 1.5, color: '#ffd9a0', reach: 6, power: 22 }, { x: -14.5, y: 2.2, z: -2.6, color: '#ffd9a0', reach: 4, power: 20 });
  bake(g);
  const mark = new T.Mesh(new T.PlaneGeometry(.34, .34), decalMat(emberChalk, .92)); mark.position.set(X0 - .06, 1.5, -3.65); mark.rotation.y = -Math.PI / 2; mark.visible = p.city.economy.state.intro.played; live.add(mark);
  return mark;
}
