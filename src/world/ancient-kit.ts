import * as T from 'three';
import { box, torus, beam } from './assets';
import { V } from './art-kit';
import { ancientMats } from './factions';

/** OLD TERRA'S SHAPES. Colour alone does not say "ancient"; these four shapes do, and they are
 * used wherever the old city shows, so a fragment is enough to recognise it.
 *
 *   the tapered arch     wider at the foot than the shoulder, closing in a soft point
 *   the seven-part ring  a circle split into seven arcs with gaps between; one may be lit
 *   the hung ring        a ring held in the air by thin ribs that meet above it
 *   the inset channel    a turquoise runnel sunk between ivory kerbs
 *
 * The Ordinance builds in rectangles, plate and rivets. Nothing of theirs tapers or hangs. */
const I = ancientMats.ivory, GOLD = ancientMats.gold;

/** Facing +z. `w` is the width at the foot; the opening is `inset` narrower all round. */
export function taperedArch(g: T.Object3D, x: number, y: number, z: number, w: number, h: number, depth = .5, inset = .34) {
  const outline = (k: number, base: number) => { const s = new T.Shape(), a = w / 2 - k, top = h - k; s.moveTo(-a, base); s.lineTo(-a * .78, top * .62); s.quadraticCurveTo(-a * .62, top * .93, 0, top); s.quadraticCurveTo(a * .62, top * .93, a * .78, top * .62); s.lineTo(a, base); s.closePath(); return s; };
  const shape = outline(0, 0); shape.holes.push(outline(inset, -.01));
  const m = new T.Mesh(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }), I); m.position.set(x, y, z - depth / 2); g.add(m);
  box(g, x, y + h * .62, z + depth / 2 + .01, w * .5, .07, .03, GOLD); return m;
}
/** Seven arcs. `lit` picks one to glow (0-6), or none. Lies in the XY plane, facing +z. */
export function splitRing(g: T.Object3D, x: number, y: number, z: number, r: number, lit = -1, tube = r * .09) {
  const ring = new T.Group(); ring.position.set(x, y, z); g.add(ring); const arc = Math.PI * 2 / 7, gap = .16;
  for (let k = 0; k < 7; k++) { const m = new T.Mesh(new T.TorusGeometry(r, tube, 5, 8, arc - gap), k === lit ? ancientMats.awake : GOLD); m.rotation.z = Math.PI / 2 + k * arc + gap / 2; ring.add(m); }
  return ring;
}
/** A ring held up by three thin ribs meeting at a point above it. */
export function hungRing(g: T.Object3D, x: number, y: number, z: number, r: number, rise = r * 2.2) {
  torus(g, x, y, z, r, r * .08, GOLD).rotation.x = Math.PI / 2;
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + .4; beam(g, V(x + Math.cos(a) * r, y, z + Math.sin(a) * r), V(x, y + rise, z), r * .025, GOLD); }
}
/** A runnel between ivory kerbs, along x or z. `fill` is the water or tile laid in it. */
export function channel(g: T.Object3D, x: number, y: number, z: number, length: number, alongX: boolean, fill: T.Material = ancientMats.turquoise, width = .5) {
  const w = alongX ? length : width, d = alongX ? width : length; box(g, x, y, z, w, .06, d, fill);
  for (const s of [-1, 1]) box(g, x + (alongX ? 0 : s * (width / 2 + .07)), y + .03, z + (alongX ? s * (width / 2 + .07) : 0), alongX ? length : .14, .14, alongX ? .14 : length, I);
}
