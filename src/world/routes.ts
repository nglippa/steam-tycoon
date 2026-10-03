import * as T from 'three';
import { box, cyl, torus, mats, type Material } from './assets';
import type { City } from './city';

/** Authored vertical routes: ladders, stairs and the parapets that keep a roof honest.
 * Each helper builds what is seen and registers what is walked (City.deck / City.collider),
 * so a route cannot look climbable without being climbable. */
export const unseen = new T.MeshBasicMaterial({ visible: false });
const UP = new T.Vector3(0, 1, 0);

/** A fixed ladder on a wall. `(nx, nz)` points away from the wall, toward whoever stands at
 * the foot; the top lets them off on the far side, 1.2 m in from the edge (or at `top`, an
 * offset from the ladder, when it comes up through a hatch in a deck instead). The interaction
 * target is one generous unseen box, and the controller also offers it by proximity. */
export function ladder(g: T.Object3D, live: T.Object3D, city: City, id: string, label: string, x: number, z: number, y0: number, y1: number, nx: number, nz: number, m: Material = mats.iron, top?: [number, number]) {
  const tx = -nz, tz = nx, head = y1 + 1.15, lx = x + nx * .1, lz = z + nz * .1, across = new T.Vector3(tx, 0, tz);
  for (const s of [-.27, .27]) cyl(g, lx + tx * s, (y0 + head) / 2, lz + tz * s, .035, head - y0, m);
  for (let y = y0 + .3; y < head - .1; y += .32) cyl(g, lx, y, lz, .022, .54, m).quaternion.setFromUnitVectors(UP, across);
  // Stand-offs to the wall, and safety hoops on a long climb.
  for (let y = y0 + 1.2; y < y1; y += 2.4) for (const s of [-.27, .27]) box(g, lx + tx * s - nx * .06, y, lz + tz * s - nz * .06, .05 + Math.abs(nx) * .12, .05, .05 + Math.abs(nz) * .12, m);
  if (y1 - y0 > 6) for (let y = y0 + 2.6; y < y1 + .6; y += 1.5) torus(g, lx + nx * .34, y, lz + nz * .34, .36, .018, m).rotation.x = Math.PI / 2;
  const hit = new T.Mesh(new T.BoxGeometry(1, 1, 1), unseen); hit.position.set(lx + nx * .15, (y0 + head) / 2, lz + nz * .15); hit.scale.set(.9 + Math.abs(nx) * .2, head - y0, .9 + Math.abs(nz) * .2); live.add(hit); hit.updateWorldMatrix(true, false);
  city.targets.push({ object: hit, id, kind: 'ladder', label, hint: 'CLIMB', position: hit.getWorldPosition(new T.Vector3()) });
  city.ladders.push({ id, x: x + nx * .5, z: z + nz * .5, bottom: new T.Vector3(x + nx * .95, y0, z + nz * .95), top: top ? new T.Vector3(x + top[0], y1, z + top[1]) : new T.Vector3(x - nx * 1.2, y1, z - nz * 1.2) });
}

/** Make a thing examinable as itself, with no plaque: an unseen box round it is the target.
 * Used for what the Steward should notice by looking, not by reading a sign. */
export function examine(live: T.Object3D, city: City, id: string, label: string, x: number, y: number, z: number, w: number, h: number, d: number, when?: () => boolean) {
  const hit = new T.Mesh(new T.BoxGeometry(1, 1, 1), unseen); hit.position.set(x, y, z); hit.scale.set(w, h, d); live.add(hit); hit.updateWorldMatrix(true, false);
  city.targets.push({ object: hit, id, kind: 'discovery', label, hint: 'LOOK CLOSER', position: hit.getWorldPosition(new T.Vector3()), when });
}

/** A straight stair. It rises along `axis` toward the `high` end, is solid underneath, and
 * cannot be walked into from the side: the body below each run of treads is a collider. */
export function stair(g: T.Object3D, city: City, x0: number, x1: number, z0: number, z1: number, yLow: number, yHigh: number, axis: 'x' | 'z', high: 'min' | 'max', m: Material = mats.stone, solid = true) {
  const len = axis === 'x' ? x1 - x0 : z1 - z0, n = Math.max(2, Math.ceil((yHigh - yLow) / .24)), run = len / n;
  for (let k = 0; k < n; k++) { const t = (k + .5) / n, u = high === 'max' ? t : 1 - t, h = yLow + (yHigh - yLow) * (Math.floor(u * n) + 1) / n, c = (axis === 'x' ? x0 : z0) + t * len, base = solid ? Math.min(yLow, 0) : h - .12;
    if (axis === 'x') box(g, c, (h + base) / 2, (z0 + z1) / 2, run + .01, h - base, z1 - z0, m); else box(g, (x0 + x1) / 2, (h + base) / 2, c, x1 - x0, h - base, run + .01, m); }
  city.deck(x0, x1, z0, z1, high === 'max' ? yLow : yHigh, high === 'max' ? yHigh : yLow, axis);
  if (!solid) return;
  // Colliders reach 0.32 m past their footprint, so each block stops short of the treads by that much rise.
  for (let k = 0; k < 6; k++) { const a = k / 6, b = (k + 1) / 6, top = yLow + (yHigh - yLow) * (high === 'max' ? a : 1 - b) - .05 - .34 * (yHigh - yLow) / len; if (top - yLow < .45) continue;
    if (axis === 'x') city.collider(x0 + (a + b) / 2 * len, (z0 + z1) / 2, len / 6, z1 - z0, top); else city.collider((x0 + x1) / 2, z0 + (a + b) / 2 * len, x1 - x0, len / 6, top); }
}

/** A parapet or handrail along one axis-aligned edge of a deck at height `y`. It stops a
 * walk, not a deliberate jump. `solid` draws a masonry upstand; otherwise an iron rail. */
export function parapet(g: T.Object3D, city: City, ax: number, az: number, bx: number, bz: number, y: number, m: Material = mats.stone, solid = true) {
  const len = Math.hypot(bx - ax, bz - az), alongX = Math.abs(bx - ax) > Math.abs(bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
  if (solid) { box(g, cx, y + .42, cz, alongX ? len : .3, .84, alongX ? .3 : len, m); box(g, cx, y + .88, cz, alongX ? len + .1 : .42, .1, alongX ? .42 : len + .1, m); }
  else { box(g, cx, y + 1, cz, alongX ? len : .06, .06, alongX ? .06 : len, m); box(g, cx, y + .5, cz, alongX ? len : .04, .04, alongX ? .04 : len, m);
    const n = Math.max(1, Math.round(len / 1.6)); for (let k = 0; k <= n; k++) box(g, ax + (bx - ax) * k / n, y + .5, az + (bz - az) * k / n, .06, 1, .06, m); }
  city.collider(cx, cz, alongX ? len : .3, alongX ? .3 : len, y + 1.1, undefined, undefined, y - .2);
}
