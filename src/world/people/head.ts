import * as T from 'three';
import { loft, surface, sweep, merge, place, shared, type Ring, type SweepPt } from './loft';
import type { Look, HairStyle, HeadShape } from './look';
import { HAIR_FALLBACK } from './look';

/** The head (Terra Character Book 6 and 7). Built in chin-origin coordinates, y up from the chin, z forward, then hung from the head group (whose pivot is the top of the neck).
 *  A cranium and a separate lower face, a flatter front plane, jaw planes rising to the ear, a small chin carried forward, a nose wedge in the geometry, flat shaped ears on the
 *  eye line behind the midline. Then the normals are replaced from a proxy ellipsoid (blended back to the true normals at the jaw and neck) so a cel threshold paints a clean face
 *  while the outline keeps the constructed profile. */
export const CHIN_TO_PIVOT = .035; // the head group's pivot is this far below the chin, at the top of the neck

/** Rows of the skull by head shape (standard head, h = .285): y, half width, front z, back z, squareness. Scaled uniformly by h / .285. */
const R = (y: number, w: number, zf: number, zb: number, n = 2.2): Ring => ({ y, w, f: (zf - zb) / 2, b: (zf - zb) / 2, z: (zf + zb) / 2, n });
const OVAL: number[][] = [[0, .012, .080, .062, 2], [.012, .036, .092, .020, 2.2], [.030, .058, .098, -.040, 2.2], [.060, .080, .100, -.078, 2.3], [.095, .0975, .1015, -.098, 2.4], [.130, .1025, .104, -.108, 2.5], [.165, .1025, .103, -.113, 2.5], [.205, .098, .095, -.116, 2.4], [.240, .084, .078, -.108, 2.3], [.268, .058, .048, -.082, 2.15], [.285, .012, .012, -.030, 2]];
const SHAPE: Record<HeadShape, (r: number[], i: number) => number[]> = {
  oval: r => r,
  // wide jaw, flat chin
  square: ([y, w, zf, zb, n], i) => [y, w * [1, 1.36, 1.38, 1.24, 1.1, 1.02][i] || w, i === 1 ? .1 : zf, zb, i < 4 ? 3 : n],
  // tall, narrow jaw
  long: ([y, w, zf, zb, n], i) => [y, w * (i < 5 ? [1, .8, .84, .88, .92][i] : .94), zf, zb - .004, n],
  // wide cheekbones, small chin carried forward
  heart: ([y, w, zf, zb, n], i) => [y, w * (i < 4 ? [1, .7, .72, .84][i] : i === 4 || i === 5 ? 1.05 : i === 6 ? 1.0 : 1.02), i === 1 ? .096 : zf, zb, n],
};
export function skullRings(shape: HeadShape, h: number): Ring[] { const k = h / .285; return OVAL.map(SHAPE[shape]).map(([y, w, zf, zb, n]) => R(y * k, w * k, zf * k, zb * k, n)); }

/** A point on the head's surface, pushed out by `off`. */
export const headAt = (rings: Ring[], y: number, a: number, off = 0) => surface(rings, y, a, off);

/** Where the painted features land on the atlas tile. The atlas is painted for the old head; these maps put its eye line on the Book's eye line (a little under the middle), its mouth an
 *  eighth of a head above the chin and its brows above the eyes. Within a band the scale is the same up and across; the stretch is taken up in the plain skin between the bands. */
export function faceUV(x: number, y: number, z: number, faceType: number, h: number, out: number[] = [0, 0]) {
  const k = h / .285, a = Math.atan2(x / (.105 * k), (z + .012 * k) / (.11 * k)), u = .5 + .346 * Math.max(-2, Math.min(2, a));
  // y above the chin -> a row of the 512 px tile: eyes at 300 (the eye line, .130 h up), the plain skin between the bands stretched, the mouth at 389 (.0356 up)
  const kv = .0006 * k, km = .00068 * k, eye = .130 * k, gapTop = eye - 44 * kv, gapBot = .0527 * k;
  const px = y >= gapTop ? 300 - (y - eye) / kv : y >= gapBot ? 344 + (gapTop - y) / (gapTop - gapBot) * 20 : 364 + (gapBot - y) / km;
  out[0] = u / 16; out[1] = (faceType + Math.max(10, Math.min(502, px)) / 512) / 8; return out;
}

/** Normals from a proxy ellipsoid, blended to the true normals toward the jaw and neck. */
function proxyNormals(g: T.BufferGeometry, h: number, nose = false) {
  const k = h / .285, p = g.attributes.position as T.BufferAttribute, n = g.attributes.normal as T.BufferAttribute, v = new T.Vector3(), t = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / k; v.set(p.getX(i) / (.108 * k), (p.getY(i) - .135 * k) / (.15 * k), (p.getZ(i) + .012 * k) / (.118 * k)).normalize();
    const w = nose ? 1 : T.MathUtils.smoothstep(y, .02, .08); t.set(n.getX(i), n.getY(i), n.getZ(i)).lerp(v, w).normalize(); n.setXYZ(i, t.x, t.y, t.z);
  }
}

/** The nose: a wedge, a quarter of a head above the chin at its tip. From the front it is a mark, from the side it is a nose. Built on the face plane, hidden joints at its edges. */
function noseWedge(h: number, shape: HeadShape): T.BufferGeometry {
  const k = h / .285, fz = shape === 'long' ? .105 : .1035, P = (x: number, y: number, z: number): [number, number, number] => [x * k, y * k, z * k];
  const wid = shape === 'square' ? 1.12 : shape === 'heart' ? .9 : 1, prom = shape === 'long' ? 1.12 : 1;
  const B = P(0, .148, fz - .002), T_ = P(0, .074, fz + .027 * prom), Nb = P(0, .056, fz + .006), Lt = P(-.016 * wid, .104, fz - .001), Rt = P(.016 * wid, .104, fz - .001);
  const Al = P(-.0165 * wid, .066, fz + .0105), Ar = P(.0165 * wid, .066, fz + .0105), Sl = P(-.0135 * wid, .052, fz - .0015), Sr = P(.0135 * wid, .052, fz - .0015), Ul = P(-.007 * wid, .0575, fz + .0085), Ur = P(.007 * wid, .0575, fz + .0085);
  const pts = [B, T_, Nb, Lt, Rt, Al, Ar, Sl, Sr, Ul, Ur], ix = Object.fromEntries(['B', 'T', 'N', 'Lt', 'Rt', 'Al', 'Ar', 'Sl', 'Sr', 'Ul', 'Ur'].map((n, i) => [n, i]));
  const inner = new T.Vector3(0, .09 * k, .02 * k), tris: number[] = [];
  const tri = (a: string, b: string, c: string) => { const A = new T.Vector3(...pts[ix[a]]), Bp = new T.Vector3(...pts[ix[b]]), C = new T.Vector3(...pts[ix[c]]); const nrm = Bp.clone().sub(A).cross(C.clone().sub(A)), mid = A.clone().add(Bp).add(C).divideScalar(3).sub(inner); if (nrm.dot(mid) >= 0) tris.push(ix[a], ix[b], ix[c]); else tris.push(ix[a], ix[c], ix[b]); };
  tri('B', 'Lt', 'Al'); tri('B', 'Al', 'T'); tri('B', 'T', 'Ar'); tri('B', 'Ar', 'Rt'); tri('Lt', 'Sl', 'Al'); tri('Rt', 'Ar', 'Sr');
  tri('Al', 'Sl', 'Ul'); tri('Al', 'Ul', 'T'); tri('Ar', 'Ur', 'Sr'); tri('Ar', 'T', 'Ur'); tri('Ul', 'Sl', 'N'); tri('Ur', 'N', 'Sr'); tri('T', 'Ul', 'N'); tri('T', 'N', 'Ur');
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts.flat(), 3)); g.setIndex(tris); const g2 = g.toNonIndexed(); g2.computeVertexNormals(); return g2;
}

/** The skull with its nose, UVs onto the face atlas and replaced normals. */
export function skull(look: Look, h: number): T.BufferGeometry {
  return shared(`skull/${look.headShape}/${look.faceType}/${h}`, () => {
    const rings = skullRings(look.headShape, h), body = loft(rings, { seg: 20, capEnd: 'flat' }), nose = noseWedge(h, look.headShape);
    const g = merge([body.index ? body.toNonIndexed() : body, nose]);
    const p = g.attributes.position as T.BufferAttribute, uv = g.attributes.uv as T.BufferAttribute, o = [0, 0];
    for (let i = 0; i < p.count; i++) { faceUV(p.getX(i), p.getY(i), p.getZ(i), look.faceType, h, o); uv.setXY(i, o[0], o[1]); }
    proxyNormals(g, h); return g;
  });
}

/** Ears: flat shaped plates on the eye line, behind the midline, turned a little out. */
export function ear(side: number, h: number): T.BufferGeometry {
  return shared(`ear/${side}/${h}`, () => {
    const k = h / .285, s = new T.Shape(), pts: [number, number][] = [[-.03, .112], [-.014, .13], [.004, .126], [.012, .108], [.008, .088], [-.004, .068], [-.018, .066], [-.03, .08], [-.04, .098]];
    pts.forEach(([z, y], i) => { const x = -z * side; i ? s.lineTo(x * k, y * k) : s.moveTo(x * k, y * k); }); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: .009 * k, bevelEnabled: true, bevelThickness: .003 * k, bevelSize: .003 * k, bevelSegments: 1, curveSegments: 3 });
    g.rotateY(side * Math.PI / 2); g.translate(side * (.1 * k), 0, 0); if (side < 0) g.translate(-.009 * k, 0, 0); g.rotateY(side * -.2); return g;
  });
}

// ------------------------------------------------------------------ hair
/** A patch of surface over the head, from a lower boundary that varies with the angle up to the crown (or `top`), lifted off the scalp by `off`. */
interface Patch { a0: number; a1: number; cols?: number; rows?: number; low: (a: number) => number; top?: (a: number) => number; off: (s: number, a: number) => number; lift?: (s: number, a: number) => number; fwd?: (s: number, a: number) => number; lid?: boolean }
function patch(rings: Ring[], o: Patch): T.BufferGeometry {
  const C = o.cols ?? 22, Rw = o.rows ?? 6, pos: number[] = [], uv: number[] = [], idx: number[] = [], crown = rings[rings.length - 1].y - .003;
  for (let j = 0; j <= Rw; j++) for (let i = 0; i <= C; i++) {
    const a = o.a0 + (o.a1 - o.a0) * i / C, lo = o.low(a), hi = o.top ? o.top(a) : crown, s = j / Rw, y = lo + (hi - lo) * s + (o.lift ? o.lift(s, a) : 0), q = headAt(rings, Math.min(y, crown), a, o.off(s, a));
    const fw = o.fwd ? o.fwd(s, a) : 0; pos.push(q.p.x + Math.sin(a) * fw * .5, q.p.y + (y > crown ? y - crown : 0), q.p.z + Math.cos(a) * fw); uv.push(i / C, s);
  }
  for (let j = 0; j < Rw; j++) for (let i = 0; i < C; i++) { const a = j * (C + 1) + i, b = a + C + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  if (o.lid) { const c = pos.length / 3, row = Rw * (C + 1); let cx = 0, cy = 0, cz = 0; for (let i = 0; i < C; i++) { cx += pos[(row + i) * 3]; cy += pos[(row + i) * 3 + 1]; cz += pos[(row + i) * 3 + 2]; } pos.push(cx / C, cy / C + .004, cz / C); uv.push(.5, 1); for (let i = 0; i < C; i++) idx.push(c, row + i, row + i + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** A tapered, curved wedge of hair lying along the scalp, following one flow: points are [angle, height, lift off the scalp, half width]. */
function strand(rings: Ring[], pts: number[][], thick = .011, seg = 6): T.BufferGeometry {
  const sp: SweepPt[] = pts.map(([a, y, off, w], i) => { const q = headAt(rings, y, a, off), taper = i === pts.length - 1 ? .12 : 1; return { p: [q.p.x, q.p.y, q.p.z], a: w * taper, b: thick * (i === pts.length - 1 ? .2 : 1), n: [q.n.x, q.n.y, q.n.z] }; });
  return sweep(sp, { seg: Math.min(seg, 5), capStart: true, capEnd: true });
}
const sm = (a: number, lo: number, hi: number) => T.MathUtils.smoothstep(a, lo, hi);

export interface HairOut { hair: T.BufferGeometry[]; under: T.BufferGeometry[]; swing: T.BufferGeometry[] }
/** Four styles are built (shortCrop, sidePart, sweptBack, lowBun); the others fall back to the nearest of these (HAIR_FALLBACK, TODO next task).
 *  Each has a fringe, sides and a back and top mass, a parting or sweep, and a variant under a hat: what shows below the band at the temples and the nape. */
export function hairOf(look: Look, h: number, hatted: boolean): HairOut {
  const k = h / .285, rings = skullRings(look.headShape, h), style: HairStyle = HAIR_FALLBACK[look.hairStyle], hair: T.BufferGeometry[] = [], under: T.BufferGeometry[] = [], swing: T.BufferGeometry[] = [];
  const A = Math.PI, front = (a: number) => 1 - sm(Math.abs(a), .5, 1.25);   // 1 at the forehead, 0 at the temples and round the back
  const nape = (a: number) => sm(Math.abs(a), 1.9, 2.7);
  // where the hair begins: the hairline across the brow, the temple, above the ear, the nape
  const lowOf = (hl: number, side: number, back: number) => (a: number) => (hl * front(a) + side * (1 - front(a)) * (1 - nape(a)) + back * nape(a)) * k;
  if (hatted) {
    // under a hat: a band of hair at the temples and the nape, below the sweatband
    const band = (a: number) => (.172 - .045 * sm(Math.abs(a), .3, 1.4)) * k;
    hair.push(patch(rings, { a0: -A, a1: A, cols: 20, rows: 2, low: lowOf(.19, .12, .06), top: a => band(a) + .004 * k, off: s => (.012 + .004 * s) * k }));
    if (style !== 'lowBun') return { hair, under, swing };
    const bun = loft([{ y: -.045, w: .02, f: .02, b: .02 }, { y: -.02, w: .042, f: .042, b: .042 }, { y: .02, w: .044, f: .044, b: .044 }, { y: .045, w: .02, f: .02, b: .02 }], { seg: 8, capStart: { round: .02 }, capEnd: { round: .02 }, key: `bun/${h}` });
    swing.push(place(bun, [0, .07 * k, -.138 * k], [.3, 0, 0], k)); return { hair, under, swing };
  }
  const hl = style === 'sweptBack' ? .236 : style === 'lowBun' ? .222 : .214, sideLow = style === 'shortCrop' ? .118 : style === 'sweptBack' ? .15 : .128;
  const back = style === 'shortCrop' ? .088 : style === 'lowBun' ? .1 : .052;
  const vol = style === 'sweptBack' ? .03 : style === 'sidePart' ? .028 : style === 'lowBun' ? .016 : .022;
  hair.push(patch(rings, { a0: -A, a1: A, cols: 20, rows: 5, low: lowOf(hl, sideLow, back),
    off: (s, a) => (.011 + vol * Math.sin(Math.min(1, s * 1.15) * Math.PI * .55) * (.55 + .45 * Math.cos(a * 1.0)) + (style === 'sweptBack' ? .02 * (1 - front(a)) * s : 0)) * k }));
  // the part / sweep: a darker line in the scalp mass, a little proud of it
  if (style === 'sidePart') under.push(strand(rings, [[.28, .262, .023, .004], [.26, .24, .029, .0045], [.25, .218, .032, .0045]], .004, 4));
  if (style === 'lowBun') under.push(strand(rings, [[0, .268, .023, .004], [0, .24, .029, .0045], [0, .218, .032, .0045]], .004, 4));
  if (style === 'shortCrop') {
    // short, forward-combed fringe wedges of different lengths
    [[.9, .206, 0], [.45, .212, .01], [0, .205, 0], [-.5, .21, .006], [-1.0, .198, 0]].forEach(([a, y0, d], i) => hair.push(strand(rings, [[a * .9, .262, .026, .026], [a, .238, .034, .026], [a, y0 - d, .036 + (i % 2) * .004, .022], [a * 1.06, y0 - .022 - (i % 2) * .012, .032, .012]], .012)));
    for (const s of [-1, 1]) hair.push(strand(rings, [[s * 1.55, .19, .02, .02], [s * 1.8, .16, .024, .02], [s * 2.2, .12, .028, .018], [s * 2.5, .095, .026, .01]], .012));
  } else if (style === 'sidePart') {
    // a heavy fringe swept across the brow from the parting, with a lighter wedge beneath it, and the side tucked behind the ear
    hair.push(strand(rings, [[.34, .276, .022, .034], [.26, .252, .034, .04], [.06, .226, .044, .044], [-.4, .202, .046, .04], [-.85, .176, .04, .03], [-1.25, .15, .03, .018], [-1.45, .13, .022, .008]], .016));
    hair.push(strand(rings, [[.5, .262, .026, .026], [.42, .238, .036, .032], [.25, .21, .042, .028], [-.1, .192, .042, .024], [-.45, .178, .036, .014]], .012));
    hair.push(strand(rings, [[-.6, .26, .028, .03], [-.9, .232, .036, .03], [-1.3, .2, .04, .026], [-1.6, .17, .036, .02], [-1.9, .14, .03, .01]], .014));
    for (const s of [1]) hair.push(strand(rings, [[s * 1.5, .2, .022, .024], [s * 1.8, .17, .026, .022], [s * 2.2, .13, .03, .018], [s * 2.6, .09, .028, .01]], .012));
  } else if (style === 'sweptBack') {
    // combed back from a high hairline, the tips standing a little off the nape: five strands from the front, fanned, each ending on the back of the skull
    ([[-1.2, -2.6, .13], [-.6, -2.9, .11], [0, 3.14, .12], [.6, 2.9, .11], [1.2, 2.6, .13]] as const).forEach(([a0, aEnd, yEnd]) => hair.push(strand(rings, [[a0 * .8, .252, .03, .03], [a0, .272, .036, .028], [(a0 + aEnd) * .5, .25, .044, .03], [aEnd * .85, .2, .054, .028], [aEnd, yEnd, .064, .016]], .014)));
    for (const s of [-1, 1]) hair.push(strand(rings, [[s * 1.5, .21, .02, .022], [s * 1.9, .17, .028, .022], [s * 2.4, .11, .034, .018], [s * 2.7, .06, .03, .01]], .012));
  } else { // lowBun: smooth, a middle part, pulled back over the ears to a bun at the nape
    const bun = loft([{ y: -.048, w: .02, f: .02, b: .02 }, { y: -.022, w: .044, f: .044, b: .044 }, { y: .022, w: .046, f: .046, b: .046 }, { y: .048, w: .02, f: .02, b: .02 }], { seg: 8, capStart: { round: .02 }, capEnd: { round: .02 }, key: `bun/${h}` });
    swing.push(place(bun, [0, .068 * k, -.142 * k], [.35, 0, 0], k));
    for (const s of [-1, 1]) hair.push(strand(rings, [[s * .32, .256, .026, .03], [s * .55, .222, .034, .034], [s * 1.0, .182, .03, .03], [s * 1.5, .15, .028, .026], [s * 2.2, .108, .034, .02]], .013));
  }
  return { hair, under, swing };
}

/** Headwear built over the same skull rings: a flat cap, a soft cap. Others are TODO (next task). */
export function hatOf(look: Look, h: number): { cloth: T.BufferGeometry[]; trim: T.BufferGeometry[] } {
  const k = h / .285, rings = skullRings(look.headShape, h), cloth: T.BufferGeometry[] = [], trim: T.BufferGeometry[] = [], A = Math.PI;
  if (look.hat === 'flatCap' || look.hat === 'softCap') {
    const soft = look.hat === 'softCap', rim = (a: number) => (.185 - .062 * sm(Math.abs(a), .25, 1.6) - .01 * sm(Math.abs(a), 2.4, 3.1)) * k;
    // the crown: a soft dome, fuller at the front, pulled down at the back, the rim tilted forward over the brow
    cloth.push(patch(rings, { a0: -A, a1: A, cols: 20, rows: 4, lid: true, low: rim, top: (a) => (soft ? .268 : .258) * k,
      off: (s, a) => (.010 + (soft ? .028 : .04) * Math.sin(Math.min(1, s * 1.3) * Math.PI * .5) * (.78 + .22 * Math.cos(a))) * k, fwd: (s, a) => (soft ? .006 : .016) * s * s * Math.max(0, Math.cos(a)) * k }));
    // the visor: a stiff curved peak that leaves the rim over the brow
    const root = [{ y: .19 * k, w: .104 * k, f: .108 * k, b: .1 * k, z: -.006 * k }, { y: .183 * k, w: .118 * k, f: .14 * k, b: .1 * k, z: -.006 * k, n: 2.2 }, { y: .168 * k, w: .124 * k, f: .176 * k, b: .1 * k, z: -.006 * k, n: 2.4 }];
    cloth.push(loft(root, { seg: 10, start: -.95, arc: 1.9, lipEnd: .004 * k, key: `visor/${h}` }));
    trim.push(loft([{ y: .184 * k, w: .1055 * k, f: .106 * k, b: .098 * k, z: -.006 * k }, { y: .176 * k, w: .1065 * k, f: .108 * k, b: .1 * k, z: -.006 * k }], { seg: 18, start: -A, arc: Math.PI * 2 }));
  }
  return { cloth, trim };
}

/** Facial hair, from the same rings. */
export function facialOf(look: Look, h: number): T.BufferGeometry[] {
  const k = h / .285, rings = skullRings(look.headShape, h), out: T.BufferGeometry[] = [];
  if (look.facial === 'moustache') out.push(strand(rings, [[-.38, .052, .006, .009], [-.18, .056, .012, .011], [0, .0575, .0125, .012], [.18, .056, .012, .011], [.38, .052, .006, .009]], .008, 6));
  if (look.facial === 'sideburns') for (const s of [-1, 1]) out.push(strand(rings, [[s * 1.42, .15, .006, .016], [s * 1.38, .115, .008, .017], [s * 1.34, .075, .006, .014]], .007));
  if (look.facial === 'beard') out.push(patch(rings, { a0: -1.55, a1: 1.55, cols: 20, rows: 4, low: () => .0, top: a => (.062 + .03 * sm(Math.abs(a), .9, 1.5)) * k, off: (s, a) => (.007 + .004 * Math.cos(a)) * k }));
  return out;
}
