import * as T from 'three';
import { loft, sweep, place, merge, mirrorX, surface, ringAt, onFace, type Ring, type SweepPt } from './loft';
import type { Dims } from './body';

export type Pt = [number, number, number];
export const put0 = (g: T.Object3D, geo: T.BufferGeometry, mat: T.Material, p?: Pt, r?: Pt) => { const m = new T.Mesh(geo, mat); if (p) m.position.set(...p); if (r) m.rotation.set(...r); g.add(m); return m; };

/** A relaxed hand (Book 5): a palm wedge thick at the heel and broad at the knuckles, two finger masses (the index, and the other three) in a loose C, a two-segment thumb turned out of
 *  the palm's plane, a wrist narrower than the palm. As long as the face. Built with the medial side at +x and mirrored for the other arm; origin at the wrist, the arm along -y.
 *  The grip socket (-side * .028, -.312 from the elbow) sits inside the curl: held things keep their handle along z through it. */
export function hand(d: Dims, side: number): T.BufferGeometry {
  const s = d.hand / .19, w = d.wristW / .05;
  const palm = loft([
    { y: 0, w: .0125 * w, f: .0255 * w, b: .0255 * w, n: 2.3 }, { y: -.022 * s, w: .0155 * w, f: .031 * w, b: .028 * w, x: .002, n: 2.4 },
    { y: -.055 * s, w: .0135, f: .04 * w, b: .037 * w, x: .001, n: 2.6 }, { y: -.085 * s, w: .0105, f: .043 * w, b: .04 * w, n: 2.8 },
  ], { seg: 8, capEnd: 'flat' });
  // the curl, in the (x medial, y down) plane: knuckle, first, second and third joint, tip
  const C = [[.004, -.084], [.014, -.104], [.034, -.114], [.05, -.103], [.049, -.087]];
  const finger = (z: number, wide: number, th: number, open: number, len: number): T.BufferGeometry => sweep(C.map(([x, y], i) => ({ p: [x * s * (1 - open * (i / 4) * .18), (-.084 + (y + .084) * len) * s, z] as Pt, a: wide * (1 - i * .06) * (i === 4 ? .7 : 1), b: th * (1 - i * .06) * (i === 4 ? .65 : 1), n: [1, 0, 0] as Pt })), { seg: 4, capStart: true, capEnd: true });
  const thumb = sweep([[.004, -.045, .038], [.012, -.062, .052], [.024, -.082, .058], [.034, -.098, .06]].map(([x, y, z], i) => ({ p: [x, y * s, z] as Pt, a: .0105 - i * .0012, b: .0095 - i * .0013, n: [.7, 0, -.7] as Pt })), { seg: 4, capStart: true, capEnd: true });
  const g = merge([palm, finger(.0285 * w, .0145, .0105, 1, 1.04), finger(-.0125 * w, .0265, .0098, 0, .98), thumb]);
  return side > 0 ? mirrorX(g) : g;
}

/** The shoe: a wedge (narrow heel, high instep, wider toe box), a sole slab 18 mm thick and slightly larger than the upper so a sole line shows all round, and a heel block. The flat
 *  sole is `SOLE` (.052) under the ankle, the heel back at -.065 and the toe at +.215, so the planted foot sits flat and rolls on the arcs gait.ts expects. */
export function foot(g: T.Group, d: Dims, upperM: T.Material, soleM: T.Material, soft = false) {
  const L = d.shoe / .285, X = (a: number) => a * L, sw = d.shoeW / .094, toe = soft ? 2.5 : 3;
  const fr = (a: number, w: number, top: number, bottom: number, n = 2.4): Ring => ({ y: X(a), w: w * sw, f: (top - bottom) / 2, b: (top - bottom) / 2, z: -(top + bottom) / 2, n });
  const turn = (rings: Ring[], o: object, key: string) => place(loft(rings, { ...o, key: `${key}/${d.shoe}/${d.shoeW}/${soft}` }), [0, 0, 0], [Math.PI / 2, 0, 0]);
  put0(g, turn([fr(-.062, .028, .021, -.034), fr(-.044, .039, .03, -.034), fr(-.01, .044, .052, -.034), fr(.035, .046, .04, -.034), fr(.09, .047, .016, -.034), fr(.15, .046, -.002, -.034, toe), fr(.19, .037, -.008, -.034, toe), fr(.212, .018, -.016, -.034, toe)], { seg: 8, capStart: 'flat', capEnd: 'flat' }, 'foot'), upperM);
  put0(g, turn([fr(-.068, .026, -.034, -.052, 2.5), fr(-.05, .042, -.034, -.052, 2.5), fr(0, .0475, -.034, -.052, 2.5), fr(.09, .0535, -.034, -.052, 2.5), fr(.15, .052, -.034, -.052, 2.6), fr(.195, .043, -.034, -.052, 2.8), fr(.222, .02, -.034, -.052, 3)], { seg: 8, capStart: 'flat', capEnd: 'flat' }, 'sole'), soleM);
  put0(g, turn([fr(-.066, .03, -.03, -.052, 2.4), fr(-.045, .04, -.03, -.052, 2.4), fr(-.012, .042, -.03, -.052, 2.4)], { seg: 8, capStart: 'flat', capEnd: 'flat' }, 'heel'), soleM);
}

const sp = (p: T.Vector3, n: T.Vector3, a: number, b: number): SweepPt => ({ p: [p.x, p.y, p.z], a, b, n: [n.x, n.y, n.z] });
/** A strip that follows a part's surface from height y0 to y1; `at(y)` gives the sideways position x (front or back face). Lies flat on the surface. */
export function strip(rings: Ring[], ys: number[], at: (y: number) => number, back: boolean, off: number, half: number, thick: number, key?: string) {
  return sweep(ys.map(y => { const q = onFace(rings, y, at(y), back, off); return sp(q.p, q.n, half, thick); }), { seg: 4, capStart: true, capEnd: true, key });
}
/** A strip along a fixed angle of a part's rings (a coat's front edge, a seam). */
export function seam(rings: Ring[], ys: number[], angle: (y: number) => number, off: number, half: number, thick: number) {
  return sweep(ys.map(y => { const q = surface(rings, y, angle(y), off); return sp(q.p, q.n, half, thick); }), { seg: 4, capStart: true, capEnd: true });
}
export const steps = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
/** A button: a small domed disc standing on a surface point, its axis along the normal. */
export function button(g: T.Object3D, q: { p: T.Vector3; n: T.Vector3 }, m: T.Material, r = .0075) {
  const b = new T.Mesh(new T.CylinderGeometry(r, r * 1.05, .004, 5), m); b.position.copy(q.p).addScaledVector(q.n, .001); b.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), q.n); g.add(b); return b;
}

/** The neckerchief (and the scarf of the row coat): a band round the neck that is part of the torso, and a knot to one side of the throat with two tails that hang down the chest and
 *  swing with the walk (the scarf group). */
export function kerchiefBand(g: T.Group, neckR: Ring[], m: T.Material, lift = 0) {
  const r = ringAt(neckR, 1.51), z0 = (r.z ?? 0), up = lift, band = [1.482, 1.5, 1.52, 1.534].map((y, i) => ({ y: y + up * (i / 3), w: r.w + [.012, .02, .019, .012][i], f: r.f + [.011, .019, .018, .011][i], b: r.b + [.01, .018, .017, .01][i], z: z0 + .004, n: 2.1 }));
  put0(g, loft(band, { seg: 12, lipStart: .003, lipEnd: .004 }), m);
}
export function kerchiefTails(scarf: T.Group, m: T.Material, long: boolean, plain = false) {
  const knot = loft([{ y: -.018, w: .004, f: .004, b: .004 }, { y: -.006, w: .022, f: .016, b: .012 }, { y: .012, w: .02, f: .015, b: .012 }, { y: .02, w: .004, f: .004, b: .004 }], { seg: 6, capStart: { round: .004 }, capEnd: { round: .004 } });
  put0(scarf, place(knot, [0, 0, 0], [.25, 0, .3]), m);
  for (const [x, len, tilt] of [[-.012, .12, .1], [.016, long ? .18 : .13, -.14]] as const) {
    if (plain && x < 0) continue;
    const pts: SweepPt[] = [0, .25, .5, .75, 1].map(t => ({ p: [x + tilt * -t * .08, -.012 - t * len, .004 + t * .02 - t * t * .018] as Pt, a: .017 * (1 + .55 * t) * (t === 1 ? .6 : 1), b: .0045, n: [0, 0, 1] as Pt }));
    put0(scarf, sweep(pts, { seg: 4, capStart: true, capEnd: true }), m);
  }
}

/** A strip that runs round a part at one height, from angle a0 to a1 (a yoke seam across the shoulders, a waist strap at the back). */
export function around(rings: Ring[], y: number, a0: number, a1: number, off: number, half: number, thick: number, n = 10) {
  return sweep(steps(a0, a1, n).map(a => { const q = surface(rings, y, a, off); return sp(q.p, q.n, half, thick); }), { seg: 4, capStart: true, capEnd: true });
}
