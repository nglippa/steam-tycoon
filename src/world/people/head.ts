import * as T from 'three';
import { loft, surface, ringAt, ringPoint, sweep, merge, place, shared, type Ring, type SweepPt } from './loft';
import type { Look, HairStyle, HeadShape } from './look';
import { skullTable, landmarks } from './headform';

/** The head (Terra Character Book 6 and 7). Built in chin-origin coordinates, y up from the chin, z forward, then hung from the head group (whose pivot is the top of the neck).
 *  A cranium and a separate lower face, a flatter front plane, jaw planes rising to the ear, a small chin carried forward, a nose wedge in the geometry, flat shaped ears on the
 *  eye line behind the midline. Then the normals are replaced from a proxy ellipsoid (blended back to the true normals at the jaw and neck) so a cel threshold paints a clean face
 *  while the outline keeps the constructed profile. */
export const CHIN_TO_PIVOT = .035; // the head group's pivot is this far below the chin, at the top of the neck

/** The skull is derived from the head formula (headform.ts: Loomis ball and plane, restrained anime; Book 6): rows of y, half width, front z, back z, squareness for a head of height h. */
const R = (y: number, w: number, zf: number, zb: number, n = 2.2): Ring => ({ y, w, f: (zf - zb) / 2, b: (zf - zb) / 2, z: (zf + zb) / 2, n });
export function skullRings(shape: HeadShape, h: number): Ring[] { return skullTable(h, shape).map(([y, w, zf, zb, n]) => R(y, w, zf, zb, n)); }

/** A point on the head's surface, pushed out by `off`. */
export const headAt = (rings: Ring[], y: number, a: number, off = 0) => surface(rings, y, a, off);

/** Where the painted features land on the atlas tile. The atlas is painted for the old head; these maps put its eye line on the Book's eye line (a little under the middle), its mouth an
 *  eighth of a head above the chin and its brows above the eyes. Within a band the scale is the same up and across; the stretch is taken up in the plain skin between the bands. */
export function faceUV(x: number, y: number, z: number, faceType: number, h: number, out: number[] = [0, 0]) {
  const k = h / .285, u = .5 + x / (.318 * k); void z;
  // y above the chin -> a row of the 512 px tile. The eye line (tile row 300) is .435 H, the mouth (row 389) .13 H; the eye band is squeezed to .78 and the brow band to .5 of the
  // base scale so the brows land at about .555 H (Book 6); the plain skin between the bands takes up the stretch.
  const kv = .00062 * k, kE = kv * .78, kB = kv * .5, km = kv, yEye = .435 * h, eyeTop = yEye + 62 * kE, eyeBot = yEye - 44 * kE, mouthTop = .13 * h + 25 * km;
  const px = y >= eyeTop ? 238 - (y - eyeTop) / kB : y >= eyeBot ? 300 - (y - yEye) / kE : y >= mouthTop ? 344 + (eyeBot - y) / (eyeBot - mouthTop) * 20 : 364 + (mouthTop - y) / km;
  out[0] = u / 16; out[1] = (faceType + Math.max(10, Math.min(502, px)) / 512) / 8; return out;
}

/** Normals from a proxy ellipsoid, blended to the true normals toward the jaw and neck. */
function proxyNormals(g: T.BufferGeometry, h: number, shape: HeadShape, nose = false) {
  const L = landmarks(h, shape), k = h / .285, p = g.attributes.position as T.BufferAttribute, n = g.attributes.normal as T.BufferAttribute, v = new T.Vector3(), t = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / k; v.set(p.getX(i) / (L.width * .52), (p.getY(i) - .47 * h) / (.53 * h), (p.getZ(i) - L.z0 + .01 * h) / (L.R * 1.02)).normalize();
    const w = nose ? 1 : T.MathUtils.smoothstep(y, .02, .08); t.set(n.getX(i), n.getY(i), n.getZ(i)).lerp(v, w).normalize(); n.setXYZ(i, t.x, t.y, t.z);
  }
}

/** The nose: a wedge, a quarter of a head above the chin at its tip. From the front it is a mark, from the side it is a nose. Built on the face plane, hidden joints at its edges. */
export function noseWedge(h: number, shape: HeadShape): T.BufferGeometry {
  const k = h / .285, rg = skullRings(shape, h), face = (y: number) => { const r = ringAt(rg, y); return (r.z ?? 0) + r.f; }, fz = shape === 'long' ? .105 : .1035, P = (x: number, y: number, z: number): [number, number, number] => [x * k, y * k, face(y * k) / k + (z - .1035)];
  const wid = shape === 'square' ? 1.12 : shape === 'heart' ? .9 : 1, prom = shape === 'long' ? 1.12 : 1;
  const B = P(0, .148, fz - .002), T_ = P(0, .074, fz + .031 * prom), Nb = P(0, .056, fz + .006), Lt = P(-.016 * wid, .104, fz - .001), Rt = P(.016 * wid, .104, fz - .001);
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
    const rings = skullRings(look.headShape, h), body = loft(rings, { seg: 26, capEnd: 'flat' }), nose = noseWedge(h, look.headShape);
    const g = merge([body.index ? body.toNonIndexed() : body, nose]);
    const p = g.attributes.position as T.BufferAttribute, uv = g.attributes.uv as T.BufferAttribute, o = [0, 0];
    for (let i = 0; i < p.count; i++) { faceUV(p.getX(i), p.getY(i), p.getZ(i), look.faceType, h, o); uv.setXY(i, o[0], o[1]); }
    proxyNormals(g, h, look.headShape);
    // the painted face is a front plane: it fades out toward the ears, so nothing smears along the side of the head or lands on the back
    const mask = new Float32Array(p.count), L = landmarks(h, look.headShape); for (let i = 0; i < p.count; i++) { const a = Math.abs(Math.atan2(p.getX(i) / (L.width * .5), (p.getZ(i) - L.z0 + .01 * h) / L.R)); mask[i] = 1 - T.MathUtils.smoothstep(a, .9, 1.3); }
    g.setAttribute('faceMask', new T.BufferAttribute(mask, 1)); return g;
  });
}

/** Ears (Book 6): flat shaped plates on the side plane, in its back lower quarter, behind the depth midline and tilted back; the top near the brow line, the bottom near the nose base. */
export function ear(side: number, h: number, shape: HeadShape = 'oval'): T.BufferGeometry {
  return shared(`ear/${side}/${h}/${shape}`, () => {
    const L = landmarks(h, shape), top = .5 * h, bot = .245 * h, cy = (top + bot) / 2, ry = (top - bot) / 2, rx = .0125 * h / .285 * 1.05, cz = L.earZ, rg = skullRings(shape, h), s = new T.Shape(), rc = ringAt(rg, cy); let x0 = rc.w; { let lo = Math.PI / 2, hi = Math.PI; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, q = ringPoint(rc, m); if (q[2] > cz) lo = m; else hi = m; } x0 = ringPoint(rc, lo)[0]; }
    const pts: [number, number][] = Array.from({ length: 12 }, (_, i) => { const t = i / 12 * Math.PI * 2; return [cz + Math.cos(t) * rx - Math.sin(t) * ry * .12, cy + Math.sin(t) * ry + (Math.sin(t) < 0 ? .003 : 0)]; });
    pts.forEach(([z, y], i) => { const x = -z * side; i ? s.lineTo(x, y) : s.moveTo(x, y); }); s.closePath();
    const g = new T.ExtrudeGeometry(s, { depth: .005 * h / .285, bevelEnabled: true, bevelThickness: .0025 * h / .285, bevelSize: .0025 * h / .285, bevelSegments: 1, curveSegments: 3 });
    g.rotateY(side * Math.PI / 2); g.translate(side * (x0 - .004 * h / .285), 0, 0); if (side < 0) g.translate(-.005 * h / .285, 0, 0); g.rotateY(side * -.12); return g;
  });
}

// ------------------------------------------------------------------ hair
/** A patch of surface over the head, from a lower boundary that varies with the angle up to the crown (or `top`), lifted off the scalp by `off`. */
interface Patch { a0: number; a1: number; cols?: number; rows?: number; low: (a: number) => number; top?: (a: number) => number; off: (s: number, a: number) => number; lift?: (s: number, a: number) => number; fwd?: (s: number, a: number) => number; lid?: boolean; lidLift?: number }
function patch(rings: Ring[], o: Patch): T.BufferGeometry {
  const C = o.cols ?? 22, Rw = o.rows ?? 6, pos: number[] = [], uv: number[] = [], idx: number[] = [], crown = rings[rings.length - 1].y - .003;
  for (let j = 0; j <= Rw; j++) for (let i = 0; i <= C; i++) {
    const a = o.a0 + (o.a1 - o.a0) * i / C, lo = o.low(a), hi = o.top ? o.top(a) : crown, s = j / Rw, y = lo + (hi - lo) * s + (o.lift ? o.lift(s, a) : 0), q = headAt(rings, Math.min(y, crown), a, o.off(s, a));
    const fw = o.fwd ? o.fwd(s, a) : 0; pos.push(q.p.x + Math.sin(a) * fw * .5, q.p.y + (y > crown ? y - crown : 0), q.p.z + Math.cos(a) * fw); uv.push(i / C, s);
  }
  for (let j = 0; j < Rw; j++) for (let i = 0; i < C; i++) { const a = j * (C + 1) + i, b = a + C + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  if (o.lid) { // a closed crown: three more rings run in to the middle, rising in a dome whose height is `lidLift`, wound the same way as the rest of the patch (the old fan faced inward: the pale ring)
    const row = Rw * (C + 1); let cx = 0, cy = 0, cz = 0; for (let i = 0; i < C; i++) { cx += pos[(row + i) * 3]; cy += pos[(row + i) * 3 + 1]; cz += pos[(row + i) * 3 + 2]; } cx /= C; cy /= C; cz /= C;
    const LR = 3; let prev = row;
    for (let r = 1; r <= LR; r++) { const t = r / (LR + 1), at = pos.length / 3, e = 1 - Math.cos(t * Math.PI / 2), rise = Math.sin(t * Math.PI / 2);
      for (let i = 0; i <= C; i++) { const x = pos[(row + i) * 3], y = pos[(row + i) * 3 + 1], z = pos[(row + i) * 3 + 2]; pos.push(x + (cx - x) * e, y + (cy - y) * e + (o.lidLift ?? .004) * rise, z + (cz - z) * e); uv.push(i / C, 1); }
      for (let i = 0; i < C; i++) { const a2 = prev + i, b2 = at + i; idx.push(a2, a2 + 1, b2, a2 + 1, b2 + 1, b2); } prev = at; }
    const c = pos.length / 3; pos.push(cx, cy + (o.lidLift ?? .004), cz); uv.push(.5, 1); for (let i = 0; i < C; i++) idx.push(prev + i, prev + i + 1, c);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  if (Math.abs(o.a1 - o.a0 - Math.PI * 2) < 1e-6) { const nr = g.attributes.normal as T.BufferAttribute; for (let j = 0; j <= Rw; j++) { const i0 = j * (C + 1), i1 = i0 + C, x = nr.getX(i0) + nr.getX(i1), y = nr.getY(i0) + nr.getY(i1), z = nr.getZ(i0) + nr.getZ(i1), l = Math.hypot(x, y, z) || 1; nr.setXYZ(i0, x / l, y / l, z / l); nr.setXYZ(i1, x / l, y / l, z / l); } }
  return g;
}
/** A tapered, curved wedge of hair lying along the scalp, following one flow: points are [angle, height, lift off the scalp, half width]. */
function strand(rings: Ring[], pts: number[][], thick = .011, seg = 5): T.BufferGeometry {
  const Q = pts.map(([a, y, off]) => headAt(rings, y, a, off)), curve = new T.CatmullRomCurve3(Q.map(q => q.p.clone())), N = Math.max(5, Math.round(pts.length * 1.6)), sp: SweepPt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, f = t * (pts.length - 1), i0 = Math.min(pts.length - 2, Math.floor(f)), u = f - i0, w = pts[i0][3] + (pts[i0 + 1][3] - pts[i0][3]) * u;
    const n = Q[i0].n.clone().lerp(Q[i0 + 1].n, u).normalize(), tip = Math.max(.04, Math.sqrt(Math.max(0, 1 - Math.pow(t, 3.2)))), c = curve.getPoint(t);
    sp.push({ p: [c.x, c.y, c.z], a: w * 1.3 * tip, b: thick * 1.15 * (.4 + .6 * tip), n: [n.x, n.y, n.z] });
  }
  return sweep(sp, { seg, capStart: true, capEnd: true });
}
const sm = (a: number, lo: number, hi: number) => T.MathUtils.smoothstep(a, lo, hi);

export interface HairOut { hair: T.BufferGeometry[]; under: T.BufferGeometry[]; swing: T.BufferGeometry[] }
export interface HS { hl: number; side: number; back: number; vol: number }
/** Where each style begins (the hairline over the brow, above the ear, at the nape) and how much volume it carries (the cap stands 2 to 4 cm off the scalp). */
export const HS: Record<HairStyle, HS> = {
  shortCrop: { hl: .212, side: .125, back: .09, vol: .016 }, sidePart: { hl: .212, side: .13, back: .07, vol: .02 }, sweptBack: { hl: .238, side: .15, back: .05, vol: .024 },
  tousled: { hl: .212, side: .12, back: .07, vol: .026 }, bob: { hl: .2, side: .04, back: .03, vol: .016 }, lowBun: { hl: .222, side: .14, back: .1, vol: .012 },
  highKnot: { hl: .226, side: .15, back: .11, vol: .01 }, ponytail: { hl: .222, side: .15, back: .11, vol: .01 }, longTied: { hl: .222, side: .15, back: .1, vol: .012 }, balding: { hl: .2, side: .13, back: .1, vol: .01 },
};
const ball = (r: number, key: string) => loft([{ y: -r, w: r * .3, f: r * .3, b: r * .3 }, { y: -r * .5, w: r * .9, f: r * .9, b: r * .9 }, { y: r * .5, w: r * .9, f: r * .9, b: r * .9 }, { y: r, w: r * .3, f: r * .3, b: r * .3 }], { seg: 8, capStart: 'flat', capEnd: 'flat', key });

/** Ten styles (Book 7), each a fringe over the forehead in two or three overlapping tapered clumps, sides in front of the ear, a back mass with a nape, a parting or sweep that favours one side;
 *  under a hat, the hair that shows below the band at the temples and nape. Strands are curved wedges that follow the scalp and leave it at the tips. */
export function hairOf(look: Look, h: number, hatted: boolean): HairOut {
  const k = h / .285, rings = skullRings(look.headShape, h), style: HairStyle = look.hairStyle, c = HS[style], hair: T.BufferGeometry[] = [], under: T.BufferGeometry[] = [], swing: T.BufferGeometry[] = [];
  const A = Math.PI, sg = (look.faceType + look.hairColour.length) % 2 ? 1 : -1, front = (a: number) => 1 - sm(Math.abs(a), .5, 1.25), nape = (a: number) => sm(Math.abs(a), 1.9, 2.7);
  const low = (a: number) => (c.hl * front(a) + c.side * (1 - front(a)) * (1 - nape(a)) + (c.back - .022 * sm(Math.abs(a), 2.7, 3.1)) * nape(a)) * k;
  const S = (pts: number[][], th = .012) => hair.push(strand(rings, pts, th, 5));
  const cap = (top: ((a: number) => number) | undefined, a0 = -A, a1 = A) => hair.push(patch(rings, { a0, a1, cols: 30, rows: 5, low, top, off: (s, a) => ((style === 'balding' ? .007 : .008 + .016 * sm(s, 0, .4)) + c.vol * 1.3 * Math.sin(Math.min(1, s * 1.15) * Math.PI * .55) * (.55 + .45 * Math.cos(a)) + (style === 'sweptBack' ? .02 * (1 - front(a)) * s : 0)) * k }));
  if (hatted) {
    cap(a => (.172 - .045 * sm(Math.abs(a), .3, 1.4)) * k + .004 * k);
    // under the hat: a thin shaded layer of hair on the sides and back up into the crown, so no bare skull shows between the hair and a hat that sits higher
    under.push(patch(rings, { a0: 1.4, a1: 2 * A - 1.4, cols: 60, rows: 3, low: a => { const aa = Math.abs(a > A ? 2 * A - a : a), base = c.back + (c.side - c.back) * (1 - sm(aa, 1.8, 2.6)); return (.2 + (base - .2) * sm(aa, 1.5, 2.2)) * k; }, top: () => .2 * k, off: () => .005 * k }));
    // the nape under a hat: clumps that leave the hat's back rim and taper down the skull in a shaped, uneven edge (never a flat cut)
    if (['shortCrop', 'sidePart', 'tousled', 'balding', 'elderHat'].includes(style) || style === 'bob') [A - .62, A - .2, A + .22, A + .6].forEach((a, i) => S([[a, .14, .03, .03], [a, .1, .036, .028], [a, c.back - [.02, .0, .028, .01][i] + (style === 'bob' ? -.02 : 0), style === 'bob' ? .05 : .04, .012]]));
    if (style === 'bob') for (const a of [A - .5, A, A + .5]) S([[a, .13, .03, .03], [a, .07, .042, .03], [a, .03, .056, .012]]);
  } else if (style === 'balding') {
    cap(a => (.168 - .04 * sm(Math.abs(a), 2.3, 3.0)) * k, .85, 2 * A - .85);
    for (const s of [-1, 1]) S([[s * 1.3, .17, .02, .02], [s * 1.35, .12, .026, .022], [s * 1.4, .08, .028, .01]]);
  } else {
    cap(undefined);
    // the fringe: overlapping clumps down over the forehead, longest on the side of the parting
    if (style === 'shortCrop') ([[.75, .188], [.15, .2], [-.6, .192]] as const).forEach(([a, y]) => S([[a * sg * .7, .268, .03, .03], [a * sg, .236, .04, .032], [a * sg * 1.04, .205, .046, .026], [a * sg * 1.08, y, .042, .01]]));
    if (style === 'sidePart') {
      S([[.34 * sg, .276, .022, .034], [.1 * sg, .236, .04, .042], [-.4 * sg, .2, .046, .04], [-.95 * sg, .17, .036, .026], [-1.3 * sg, .14, .026, .01]], .015);
      S([[.5 * sg, .262, .026, .026], [.3 * sg, .226, .04, .03], [-.1 * sg, .192, .044, .024], [-.5 * sg, .176, .038, .01]]);
      S([[.7 * sg, .25, .03, .026], [.62 * sg, .21, .04, .022], [.5 * sg, .182, .038, .01]]);
      under.push(strand(rings, [[.28 * sg, .262, .023, .004], [.26 * sg, .24, .029, .0045], [.25 * sg, .218, .032, .0045]], .004));
    }
    if (style === 'tousled') {
      ([[.9, .2], [.45, .17], [-.05, .195], [-.55, .18], [-1.0, .21]] as const).forEach(([a, y], i) => S([[a * sg * .7, .268, .03, .03], [a * sg, .232, .044 + (i % 2) * .01, .03], [a * sg * 1.05, y + .02, .058 + (i % 2) * .012, .024], [a * sg * 1.1, y, .062, .01]]));
      S([[.3 * sg, .27, .03, .03], [.34 * sg, .29, .058, .026], [.4 * sg, .31, .082, .01]]);
    }
    if (style === 'bob') ([.8, .2, -.4, -.9] as const).forEach(a => S([[a * sg * .8, .262, .03, .034], [a * sg, .23, .04, .034], [a * sg, .19, .042, .03], [a * sg, .178, .04, .012]]));
    if (style === 'lowBun' || style === 'highKnot' || style === 'ponytail' || style === 'longTied') for (const s of [-1, 1]) {
      S([[s * .1, .27, .03, .03], [s * .5, .236, .04, .034], [s * 1.0, .192, .036, .03], [s * 1.4, .15, .03, .012]]);
      under.push(strand(rings, [[0, .268, .023, .0035], [0, .24, .029, .0045], [0, .216, .032, .0045]], .004));
    }
    if (style === 'sweptBack') {
      ([[-1.2, -2.6, .13], [-.6, -2.9, .11], [0, 3.14, .12], [.6, 2.9, .11], [1.2, 2.6, .13]] as const).forEach(([a0, aEnd, yEnd]) => S([[a0 * .8, .252, .03, .03], [a0, .272, .036, .028], [(a0 + aEnd) * .5, .25, .044, .03], [aEnd * .85, .2, .054, .028], [aEnd, yEnd, .064, .016]], .014));
    }
    // sides in front of the ear
    if (style !== 'sweptBack') for (const s of [-1, 1]) S(style === 'bob' ? [[s * 1.2, .2, .026, .03], [s * 1.3, .12, .036, .036], [s * 1.4, .05, .04, .03], [s * 1.45, .025, .034, .012]] : [[s * 1.28, .2, .024, .022], [s * 1.33, .15, .03, .022], [s * 1.38, .105, .032, .01]]);
    else for (const s of [-1, 1]) S([[s * 1.5, .21, .02, .022], [s * 1.9, .17, .028, .022], [s * 2.4, .11, .034, .018], [s * 2.7, .06, .03, .01]]);
    // the back mass ends in clumps below the cap, the nape shaped
    if (['shortCrop', 'sidePart', 'tousled', 'bob'].includes(style)) [A - .55, A, A + .55].forEach((a, i) => S([[a, .17, .03, .03], [a, .1, .04, .03], [a, c.back - (i === 1 ? .03 : .008), style === 'bob' ? .056 : .046, .012]]));
  }
  // what hangs or is tied at the back
  const tie = (y: number, z: number) => place(ball(.036 * k, `knot/${h}`), [0, y * k, (z - .021) * k]);
  if (style === 'lowBun') swing.push(place(ball(.044 * k, `bun/${h}`), [0, .07 * k, -.162 * k], [.35, 0, 0]));
  if (style === 'highKnot') swing.push(tie(.262, -.07));
  if (style === 'ponytail' || style === 'longTied') {
    const wide = style === 'longTied' ? .05 : .026, len = style === 'longTied' ? -.13 : -.17;
    swing.push(sweep([[0, .2, -.129], [0, .17, -.161], [0, .09, -.183], [0, len * .5, -.181], [0, len, -.161]].map(([x, y, z], i, arr) => ({ p: [x * k, y * k, z * k] as [number, number, number], a: wide * k * (i === arr.length - 1 ? .45 : 1), b: .02 * k * (i === arr.length - 1 ? .5 : 1), n: [1, 0, 0] as [number, number, number] })), { seg: 5, capStart: true, capEnd: true }));
    swing.push(place(loft([{ y: -.012, w: .03, f: .03, b: .03 }, { y: .012, w: .03, f: .03, b: .03 }], { seg: 8, key: `tieband/${h}` }), [0, .18 * k, -.146 * k], [.35, 0, 0], k));
  }
  return { hair, under, swing };
}

/** Headwear, authored on the same skull rings and sized to this head. */
export function hatOf(look: Look, h: number): { cloth: T.BufferGeometry[]; trim: T.BufferGeometry[]; metal: T.BufferGeometry[] } {
  const k = h / .285, rings = skullRings(look.headShape, h), cloth: T.BufferGeometry[] = [], trim: T.BufferGeometry[] = [], metal: T.BufferGeometry[] = [], A = Math.PI;
  const rr = (y: number, r: number, z = -.005): Ring => ({ y: y * k, w: r * k, f: r * 1.2 * k, b: r * 1.2 * k, z: z * k, n: 2.15 });
  const dome = (prof: number[][], key: string, o: object = {}) => loft(prof.map(([y, r]) => rr(y, r)), { seg: 24, capEnd: 'flat', key: `${key}/${h}/${look.headShape}`, ...o });
  const brim = (y0: number, r0: number, y1: number, r1: number, key: string, o: object = {}) => loft([{ ...rr(y0, r0) }, { ...rr(y1, r1), f: r1 * 1.25 * k }], { seg: 18, lipEnd: .005 * k, lipStart: .004 * k, key: `${key}/${h}/${look.headShape}`, ...o });
  const rim = (a: number) => (.185 - .062 * sm(Math.abs(a), .25, 1.6) - .01 * sm(Math.abs(a), 2.4, 3.1)) * k;
  const hat = look.hat;
  if (hat === 'flatCap' || hat === 'softCap') {
    // eight soft panels pulled forward over a short stiff peak: wider than the head, low, flat on top, a button at the middle
    const flat = hat === 'flatCap', top = (flat ? .262 : .272) * k, off = (s: number, a: number) => (.012 + (flat ? .05 : .034) * Math.sin(Math.min(1, s * 1.5) * Math.PI * .5) * (.8 + .2 * Math.cos(a)) - (flat ? .006 : .002) * s) * k;
    cloth.push(patch(rings, { a0: -A, a1: A, cols: 28, rows: 4, lid: true, lidLift: (flat ? .012 : .022) * k, low: rim, top: () => top, off, fwd: (s, a) => (flat ? .026 : .01) * s * s * Math.max(0, Math.cos(a)) * k }));
    metal.push(place(ball(.01 * k, `button/${h}`), [0, top + .008 * k, -.004 * k]));
    cloth.push(loft([rr(.188, .106), { ...rr(.18, .118), f: .15 * k }, { ...rr(.168, .124), f: .165 * k }], { seg: 16, start: -.8, arc: 1.6, lipEnd: .004 * k, key: `peak/${h}` }));
    trim.push(loft([rr(.19, .1085, -.006), rr(.176, .1095, -.006)], { seg: 18, key: `band/${h}/${look.headShape}` }));
  }
  if (hat === 'bowler') {
    cloth.push(dome([[.158, .112], [.2, .119], [.25, .11], [.285, .088], [.305, .04]], 'bowler')); cloth.push(brim(.165, .118, .172, .16, 'bowlerbrim'));
    trim.push(loft([rr(.165, .1195), rr(.19, .1215)], { seg: 18, key: `bowlerband/${h}/${look.headShape}` }));
  }
  if (hat === 'topHat') {
    cloth.push(dome([[.165, .108], [.25, .106], [.34, .112], [.41, .114]], 'topcrown')); cloth.push(brim(.17, .12, .176, .168, 'topbrim'));
    trim.push(loft([rr(.168, .113), rr(.2, .1125)], { seg: 18, key: `topband/${h}/${look.headShape}` }));
  }
  if (hat === 'kepi') {
    cloth.push(dome([[.15, .112], [.2, .115], [.255, .131], [.268, .129]], 'kepi'));
    cloth.push(loft([rr(.19, .108), { ...rr(.176, .116), f: .15 * k }, { ...rr(.16, .12), f: .16 * k }], { seg: 12, start: -.8, arc: 1.6, lipEnd: .004 * k, key: `kepipeak/${h}` }));
    trim.push(loft([rr(.15, .1165), rr(.18, .1185)], { seg: 18, key: `kepiband/${h}/${look.headShape}` })); metal.push(place(ball(.012 * k, `pin/${h}`), [0, .205 * k, .124 * k]));
  }
  if (hat === 'helm') {
    cloth.push(dome([[.14, .116], [.2, .123], [.26, .11], [.31, .07], [.326, .02]], 'helm'));
    cloth.push(loft([rr(.15, .118), { ...rr(.108, .152), f: .14 * k }], { seg: 12, start: A - 1.35, arc: 2.7, lipEnd: .005 * k, key: `helmguard/${h}` }));
    cloth.push(loft([rr(.19, .114), { ...rr(.178, .12), f: .14 * k }], { seg: 12, start: -.9, arc: 1.8, lipEnd: .004 * k, key: `helmbrow/${h}` }));
    trim.push(sweep([[0, .318, .085], [0, .338, .0], [0, .318, -.1]].map(([x, y, z]) => ({ p: [x * k, y * k, z * k] as [number, number, number], a: .005 * k, b: .02 * k, n: [1, 0, 0] as [number, number, number] })), { seg: 4, capStart: true, capEnd: true }));
  }
  if (hat === 'headscarf' || hat === 'kerchief') {
    cloth.push(patch(rings, { a0: -A, a1: A, cols: 22, rows: 4, lid: true, lidLift: .02 * k, low: a => (.19 - .1 * sm(Math.abs(a), .5, 2.2)) * k, off: (s, a) => (.02 + .02 * Math.sin(Math.min(1, s * 1.3) * Math.PI * .5) + .006 * Math.cos(a)) * k }));
    cloth.push(place(ball(.026 * k, `scarfknot/${h}`), [0, .1 * k, -.166 * k]));
    for (const x of [-.02, .02]) cloth.push(sweep([[x, .1, -.171], [x * 2, .06, -.181], [x * 2.6, .02, -.179]].map(([xx, y, z], i) => ({ p: [xx * k, y * k, z * k] as [number, number, number], a: .014 * k * (1 - i * .25), b: .006 * k, n: [0, 0, 1] as [number, number, number] })), { seg: 4, capStart: true, capEnd: true }));
  }
  if (hat === 'bonnet') {
    cloth.push(patch(rings, { a0: -A, a1: A, cols: 22, rows: 4, lid: true, lidLift: .024 * k, low: a => (.2 - .1 * sm(Math.abs(a), .6, 2.2)) * k, off: (s, a) => (.022 + .03 * Math.sin(Math.min(1, s * 1.3) * Math.PI * .5) + .01 * Math.cos(a)) * k }));
    cloth.push(loft([rr(.2, .112), { ...rr(.17, .14), f: .17 * k }], { seg: 12, start: -1.5, arc: 3, lipEnd: .004 * k, key: `bonnetbrim/${h}` }));
    trim.push(loft([rr(.19, .1175), rr(.2, .119)], { seg: 18, key: `bonnetband/${h}/${look.headShape}` }));
  }
  if (hat === 'elderHat') { cloth.push(dome([[.156, .113], [.22, .12], [.262, .092], [.278, .035]], 'elder')); cloth.push(brim(.162, .122, .152, .2, 'elderbrim')); }
  return { cloth, trim, metal };
}

/** Facial hair: attached to the lip and jaw, never painted. */
export function facialOf(look: Look, h: number): T.BufferGeometry[] {
  const k = h / .285, rings = skullRings(look.headShape, h), out: T.BufferGeometry[] = [];
  if (look.facial === 'moustache') out.push(strand(rings, [[-.2, .0525, .004, .004], [-.1, .0555, .0075, .0048], [0, .0565, .0085, .0052], [.1, .0555, .0075, .0048], [.2, .0525, .004, .004]], .005, 5));
  if (look.facial === 'sideburns') for (const s of [-1, 1]) out.push(strand(rings, [[s * 1.42, .15, .006, .016], [s * 1.38, .115, .008, .017], [s * 1.34, .075, .006, .014]], .007));
  if (look.facial === 'beard') out.push(patch(rings, { a0: -1.55, a1: 1.55, cols: 16, rows: 3, low: () => .0, top: a => (.058 + .03 * sm(Math.abs(a), .9, 1.5)) * k, off: (s, a) => (.007 + .004 * Math.cos(a)) * k }));
  return out;
}

/** A soft cel shadow on the forehead under the fringe (or the cap's band): a thin band of the skin, darkened, lying on the skull. */
export function foreheadShade(look: Look, h: number): T.BufferGeometry {
  const k = h / .285, rings = skullRings(look.headShape, h);
  return patch(rings, { a0: -1.0, a1: 1.0, cols: 12, rows: 1, low: a => (.172 - .02 * sm(Math.abs(a), .3, 1.0)) * k, top: a => (.214 - .03 * sm(Math.abs(a), .3, 1.0)) * k, off: () => .0015 * k });
}
