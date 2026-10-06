import * as T from 'three';
import { loft, sweep, place, type Ring, type SweepPt } from './loft';
import { skullRings, headAt } from './head';
import { seam } from './parts';
import type { Hat, Look } from './look';

/** Headwear (Terra Character Book 7, "Hats"), refitted to the skull of headform.ts (.85 H deep). Every hat has a defined crown, a band, and a brim or peak with a thickness where it has
 *  one, and sits on the head at its own SEAT: the line round the head where its lower edge rests, given as heights (standard units, H = .285) at the front, the side and the back.
 *  A rigid hat is built level in its own frame, on a base ring fitted to the skull along that seat line (plus room for the hair under it), then tilted onto the head; a cloth hat (a
 *  scarf, a bonnet) is a surface over the scalp down to its seat. The hair under a hat is cut at the same seat (hair.ts), so it shows below the band and never through the crown. */

const A = Math.PI;
export interface Seat { front: number; side: number; back: number }
/** Where each hat's lower edge sits. A flat cap is pulled low and forward onto the brow; a kepi, a helm and a top hat sit level; a bowler rides high; the cloth hats come down behind
 *  the ears to the nape. */
export const SEAT: Record<Exclude<Hat, 'none'>, Seat> = {
  flatCap: { front: .188, side: .186, back: .184 }, softCap: { front: .196, side: .192, back: .187 },
  bowler: { front: .232, side: .226, back: .222 }, topHat: { front: .224, side: .218, back: .214 },
  kepi: { front: .208, side: .206, back: .206 }, helm: { front: .196, side: .192, back: .192 },
  elderHat: { front: .206, side: .2, back: .194 },
  bonnet: { front: .246, side: .155, back: .07 }, headscarf: { front: .236, side: .165, back: .058 }, kerchief: { front: .224, side: .182, back: .138 },
};
/** The seat line as a height for an angle round the head (0 the centre front). */
export function seatOf(hat: Exclude<Hat, 'none'>): (a: number) => number {
  const s = SEAT[hat]; return (a: number) => { const c = Math.cos(a), c2 = c * c; return c >= 0 ? s.side + (s.front - s.side) * c2 : s.side + (s.back - s.side) * c2; };
}

/** A hat's level frame (its rings are true ellipses: a squarer section kinks where the front and back halves meet at the sides, which the ink draws as a seam down the crown): its origin on the seat line's centre, tilted by `rx` about x (positive tips the front down), and the base ring fitted round the skull there (pushed out by `room`). */
interface Frame { O: T.Vector3; rx: number; base: Ring; k: number }
function frameOf(rings: Ring[], k: number, seat: (a: number) => number, room: number): Frame {
  const N = 48, P = Array.from({ length: N }, (_, i) => { const a = i / N * 2 * A - A; return headAt(rings, seat(a) * k, a, room * k).p; });
  const front = P[N / 2], back = P[0], rx = Math.atan2(back.y - front.y, front.z - back.z), O = new T.Vector3(0, (front.y + back.y) / 2, (front.z + back.z) / 2);
  const inv = new T.Matrix4().makeRotationX(-rx), Q = P.map(p => p.clone().sub(O).applyMatrix4(inv));
  const zf = Math.max(...Q.map(q => q.z)), zb = Math.min(...Q.map(q => q.z)), w = Math.max(...Q.map(q => Math.abs(q.x)));
  return { O, rx, k, base: { y: 0, w, f: (zf - zb) / 2, b: (zf - zb) / 2, z: (zf + zb) / 2, n: 2 } };
}
/** A ring of the hat in its frame: the base grown by `g` all round (standard units), at height y, with extra front / back depth and a shift. */
const ringOf = (F: Frame, y: number, g: number, o: { f?: number; b?: number; z?: number; w?: number; n?: number } = {}): Ring =>
  ({ y: y * F.k, w: F.base.w + (g + (o.w ?? 0)) * F.k, f: F.base.f + (g + (o.f ?? 0)) * F.k, b: F.base.b + (g + (o.b ?? 0)) * F.k, z: (F.base.z ?? 0) + (o.z ?? 0) * F.k, n: o.n ?? F.base.n });
const onHead = (F: Frame, g: T.BufferGeometry) => place(g, [0, F.O.y, F.O.z], [F.rx, 0, 0]);
/** Moves every vertex of a geometry (in place) and recomputes its normals. */
function bend(g: T.BufferGeometry, f: (v: T.Vector3) => void): T.BufferGeometry {
  const p = g.attributes.position as T.BufferAttribute, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); f(v); p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g;
}
/** A brim: a flat band from the crown's foot outward, `out` wider at the front, side and back (standard units), closed in section (a top, a rounded outer edge `th` thick and an
 *  underside), so it reads from above and below; `lift(u, w, t)` bends it (u, w: where on the brim, -1..1 across and front to back; t: 0 at the crown, 1 at the edge). */
function brim(F: Frame, y: number, g0: number, out: { f: number; s: number; b: number }, lift: (u: number, w: number, t: number) => number, start = 0, arc = 2 * A, seg = 20, th = .006): T.BufferGeometry {
  const o = { w: out.s, f: out.f, b: out.b }, e = { w: out.s + th * .4, f: out.f + th * .4, b: out.b + th * .4 };
  const g = loft([ringOf(F, y + th, g0), ringOf(F, y + th * .8, g0, o), ringOf(F, y + th * .4, g0, e), ringOf(F, y, g0, o), ringOf(F, y, g0)], { seg, start, arc });
  const inner = ringOf(F, y, g0), outer = ringOf(F, y, g0, e), W = outer.w, z0 = outer.z ?? 0;
  return bend(g, v => { const zz = v.z - z0, u = v.x / W, w = zz / (zz >= 0 ? outer.f : outer.b), p = Math.hypot(u, w), q = Math.hypot(v.x / inner.w, zz / (zz >= 0 ? inner.f : inner.b)), t = q - p > 1e-6 ? Math.max(0, Math.min(1, p * (q - 1) / (q - p))) : 1;
    v.y += lift(u, w, t) * F.k; });
}

export interface HatOut { cloth: T.BufferGeometry[]; trim: T.BufferGeometry[]; metal: T.BufferGeometry[] }
const built = new Map<string, HatOut>();
export function hatOf(look: Look, h: number): HatOut {
  const hat = look.hat; if (hat === 'none') return { cloth: [], trim: [], metal: [] };
  const key = `${hat}/${look.headShape}/${h}`, hit = built.get(key); if (hit) return hit;
  const k = h / .285, rings = skullRings(look.headShape, h), out: HatOut = { cloth: [], trim: [], metal: [] }, seat = seatOf(hat);
  const F = (room: number) => frameOf(rings, k, seat, room);
  const crownOf = (Fr: Frame, rows: [number, number, object?][], cap: 'flat' | number, seg = 20) => loft(rows.map(([y, g, o]) => ringOf(Fr, y, g, o as never)), { seg, capEnd: cap === 'flat' ? 'flat' : { round: cap * k }, lipStart: .003 * k });
  const ball = (r: number, p: T.Vector3) => place(loft([{ y: -r, w: r * .2, f: r * .2, b: r * .2 }, { y: -r * .4, w: r, f: r, b: r }, { y: r * .4, w: r, f: r, b: r }, { y: r, w: r * .2, f: r * .2, b: r * .2 }], { seg: 6, capStart: 'flat', capEnd: 'flat' }), [p.x, p.y, p.z]);

  if (hat === 'flatCap' || hat === 'softCap') {
    // a band round the head, a crown that swells out over it and is pulled forward over a short stiff peak; the flat cap low and flat with its top sloping down to the front,
    // the soft cap fuller, rounder and higher, in six panels that meet at a button
    const flat = hat === 'flatCap', Fr = F(.009), sh = flat ? .3 : .14, topY = flat ? .1 : .112;
    // rounded shoulders that turn in to the top, so from the front a cap is a low dome over its band and not a box; the flat cap's crown comes forward from the band down onto the
    // peak (it is snapped to it), so the peak and the crown are one front and not a bill under a brow
    const rows: [number, number, object][] = flat
      ? [[0, .002, {}], [.012, .004, { f: .02, z: .004 }], [.03, .01, { f: .03, z: .008 }], [.056, .012, { f: .034, z: .012 }], [.075, .004, { f: .034, z: .015 }], [.089, -.014, { f: .026, z: .016 }], [topY, -.036, { f: .012, z: .016 }]]
      : [[0, .002, {}], [.014, .004, {}], [.04, .017, { f: .008, z: .004 }], [.07, .022, { f: .016, z: .01 }], [.094, .008, { f: .014, z: .01 }], [.106, -.016, { f: .008, z: .009 }], [topY, -.04, { f: .002, z: .008 }]];
    const crownRings = rows.map(([y, g, o]) => ringOf(Fr, y, g, o as never)), slope = (v: T.Vector3) => { const z = v.z - (Fr.base.z ?? 0), e = .02 * k; v.y -= sh * .5 * (z + Math.sqrt(z * z + e * e)) * T.MathUtils.smoothstep(v.y, .03 * k, topY * k); }; // a smooth ramp (a hard max folds the top along a line)
    out.cloth.push(onHead(Fr, bend(loft(crownRings, { seg: 18, capEnd: { round: (flat ? .006 : .01) * k }, lipStart: .003 * k }), slope)));
    out.cloth.push(onHead(Fr, loft([ringOf(Fr, .001, .006), ringOf(Fr, .016, .008)], { seg: 18, lipStart: .002 * k, lipEnd: .002 * k })));
    out.cloth.push(onHead(Fr, brim(Fr, .006, .004, { f: flat ? .05 : .046, s: .006, b: 0 }, (u, w, t) => (-.016 * Math.max(0, w) ** 1.5 - .004 * u * u) * t, -1.05, 2.1, 14)));
    if (!flat) for (let i = 0; i < 6; i++) { const a = i / 6 * 2 * A + A / 6; out.cloth.push(onHead(Fr, bend(seam(crownRings, Array.from({ length: 4 }, (_, j) => (.016 + (topY - .02) * j / 3) * k), () => a, .0015 * k, .0025 * k, .0018 * k), slope))); }
    const top = new T.Vector3(0, (topY + (flat ? .006 : .014)) * k, (Fr.base.z ?? 0) + (flat ? .02 : .01) * k); slope(top);
    if (!flat) out.metal.push(onHead(Fr, ball(.0085 * k, top)));
  }
  if (hat === 'bowler') { // a hard round crown riding high, a narrow brim curled up at the sides, a ribbon band
    const Fr = F(.011);
    out.cloth.push(onHead(Fr, crownOf(Fr, [[0, .004], [.03, .009], [.062, .006], [.086, -.008], [.1, -.03]], .03)));
    out.cloth.push(onHead(Fr, brim(Fr, .002, .004, { f: .036, s: .03, b: .034 }, (u, w, t) => (.024 * u ** 4 - .004 * w * w) * t * t)));
    out.trim.push(onHead(Fr, loft([ringOf(Fr, .004, .0075), ringOf(Fr, .022, .0085)], { seg: 20, lipEnd: .0015 * k })));
  }
  if (hat === 'topHat') { // a tall crown, a little waisted and flaring to a flat top with a lip, a brim curled at the sides, a deep ribbon band
    const Fr = F(.011);
    out.cloth.push(onHead(Fr, crownOf(Fr, [[0, .004], [.06, .0025], [.13, .005], [.19, .01], [.2, .009]], 'flat')));
    out.cloth.push(onHead(Fr, brim(Fr, .002, .004, { f: .04, s: .034, b: .036 }, (u, w, t) => (.028 * u ** 4 - .005 * w * w) * t * t)));
    out.trim.push(onHead(Fr, loft([ringOf(Fr, .004, .0065), ringOf(Fr, .036, .0055)], { seg: 20, lipEnd: .0015 * k })));
  }
  if (hat === 'kepi') { // level and stiff: a band, a crown narrowing a little to a flat top that slopes down to the front, a flat visor
    const Fr = F(.009), slope = (v: T.Vector3) => { v.y -= .12 * (v.z - (Fr.base.z ?? 0)) * T.MathUtils.smoothstep(v.y, .02 * k, .1 * k); };
    out.cloth.push(onHead(Fr, bend(crownOf(Fr, [[0, .004], [.03, .006], [.07, .002, { w: -.002 }], [.1, -.002, { w: -.006 }], [.104, -.012, { w: -.012 }]], 'flat'), slope)));
    out.cloth.push(onHead(Fr, brim(Fr, .003, .005, { f: .058, s: .008, b: 0 }, (u, w, t) => -.012 * Math.max(0, w) ** 2 * t, -1.0, 2.0, 14)));
    out.trim.push(onHead(Fr, loft([ringOf(Fr, .002, .008), ringOf(Fr, .03, .0085)], { seg: 20, lipEnd: .0015 * k })));
    out.metal.push(onHead(Fr, ball(.009 * k, new T.Vector3(0, .042 * k, (Fr.base.z ?? 0) + Fr.base.f + .009 * k))));
  }
  if (hat === 'helm') { // the Ordinance helm: a tall rounded shell sitting level, a comb from brow to nape, a short peak pitched down over the brow, a deep guard sweeping down over
    // the nape, a leather band and a brass badge
    const Fr = F(.011), shell = [[0, .007], [.04, .013], [.085, .009], [.12, -.006], [.142, -.03]] as [number, number][];
    out.cloth.push(onHead(Fr, crownOf(Fr, shell, .03)));
    out.cloth.push(onHead(Fr, brim(Fr, .002, .007, { f: .034, s: .008, b: 0 }, (u, w, t) => -.016 * Math.max(0, w) ** 1.5 * t, -1.05, 2.1, 12)));
    out.cloth.push(onHead(Fr, brim(Fr, .0, .007, { f: 0, s: .02, b: .042 }, (u, w, t) => -.05 * Math.max(0, -w) ** 1.4 * t - .012 * t, A - 1.75, 3.5, 16)));
    out.trim.push(onHead(Fr, loft([ringOf(Fr, .006, .009), ringOf(Fr, .024, .0105)], { seg: 20, lipEnd: .0015 * k })));
    const R2 = shell.map(([y, g]) => ringOf(Fr, y, g)), zc = Fr.base.z ?? 0, topAt = (z: number) => { let y = 0; for (const r of R2) { const zz = z - (r.z ?? 0), d = zz >= 0 ? r.f : r.b; if (Math.abs(zz) <= d) y = r.y + (r === R2[R2.length - 1] ? .03 * k * Math.sqrt(Math.max(0, 1 - (zz / d) ** 2)) : 0); } return y; };
    const comb: SweepPt[] = [-.8, -.5, -.2, .15, .45, .7].map(t => { const z = zc + t * (Fr.base.f + .012 * k); return { p: [0, topAt(z) + .002 * k, z] as [number, number, number], a: .0045 * k, b: .012 * k * (1 - Math.abs(t) * .45), n: [1, 0, 0] as [number, number, number] }; });
    out.trim.push(onHead(Fr, sweep(comb, { seg: 4, capStart: true, capEnd: true })));
    out.metal.push(onHead(Fr, ball(.011 * k, new T.Vector3(0, .052 * k, zc + Fr.base.f + .012 * k))));
  }
  if (hat === 'elderHat') { // a soft felt hat: a low crown dented along the top, a wide brim that droops at the front and back, a ribbon band
    const Fr = F(.011);
    const crown = crownOf(Fr, [[0, .004], [.04, .012], [.074, .008], [.09, -.004], [.098, -.02]], .02);
    out.cloth.push(onHead(Fr, bend(crown, v => { const u = v.x / (Fr.base.w + .01 * k); v.y -= .016 * k * Math.exp(-u * u / .08) * T.MathUtils.smoothstep(v.y, .06 * k, .1 * k); })));
    out.cloth.push(onHead(Fr, brim(Fr, .002, .004, { f: .06, s: .052, b: .056 }, (u, w, t) => (-.02 * w * w + .008 * u * u) * t)));
    out.trim.push(onHead(Fr, loft([ringOf(Fr, .004, .007), ringOf(Fr, .022, .008)], { seg: 20, lipEnd: .0015 * k })));
  }
  if (hat === 'headscarf' || hat === 'kerchief' || hat === 'bonnet') {
    // cloth over the scalp down to the seat, standing off it over the hair (fuller over a bun at the back), its front edge turned back in a roll, tied at the nape
    const scarf = hat === 'headscarf', bon = hat === 'bonnet', low = (a: number) => seat(a) * k, C = 32, Rw = 5, crown = rings[rings.length - 1].y;
    const off = (s: number, a: number) => { const y = low(a) / k + (crown / k - low(a) / k) * s, bunAt = Math.exp(-((y - .1) ** 2) / (2 * .035 * .035)) * Math.max(0, -Math.cos(a)) ** 3; // the swell over a gathered bun
      return ((bon ? .02 : scarf ? .016 : .011) + (bon ? .02 : scarf ? .014 : .004) * Math.max(0, -Math.cos(a)) * Math.sin(Math.min(1, s * 1.6) * A * .5) * (1 - s * .5) + (bon || scarf ? .026 : 0) * bunAt + .006 * Math.sin(s * A)) * k; };
    const pos: number[] = [], idx: number[] = [];
    // below the ear the cloth falls straight over the hair (as the hair does), instead of following the nape in under it
    const hang = .12 * k, at = (y: number, a: number, o: number) => { const q = headAt(rings, Math.max(y, hang), a, o); q.p.y += Math.min(0, y - hang); return q; };
    for (let j = 0; j <= Rw; j++) for (let i = 0; i <= C; i++) { const a = -A + 2 * A * i / C, s = j / Rw, y = low(a) + (crown - .002 - low(a)) * s, q = at(y, a, off(s, a)); pos.push(q.p.x, q.p.y, q.p.z); }
    for (let j = 0; j < Rw; j++) for (let i = 0; i < C; i++) { const p = j * (C + 1) + i, q = p + C + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.setIndex(idx); g.computeVertexNormals();
    { const nr = g.attributes.normal as T.BufferAttribute; for (let j = 0; j <= Rw; j++) { const i0 = j * (C + 1), i1 = i0 + C, x = nr.getX(i0) + nr.getX(i1), y = nr.getY(i0) + nr.getY(i1), z = nr.getZ(i0) + nr.getZ(i1), l = Math.hypot(x, y, z) || 1; nr.setXYZ(i0, x / l, y / l, z / l); nr.setXYZ(i1, x / l, y / l, z / l); } }
    out.cloth.push(g);
    // the turned edge: a roll along the seat line, all round
    const roll: SweepPt[] = Array.from({ length: 24 }, (_, i) => { const a = -A + 2 * A * i / 24, q = at(low(a) + .004 * k, a, off(0, a) + .002 * k); return { p: [q.p.x, q.p.y, q.p.z] as [number, number, number], a: .0075 * k, b: .0045 * k, n: [q.n.x, q.n.y, q.n.z] as [number, number, number] }; });
    out.cloth.push(sweep(roll, { seg: 4, closed: true }));
    if (bon) { // the bonnet's brim stands round the face from ear to ear over the top, a ribbon tie under each ear
      const P = (a: number) => at(low(a) + .004 * k, a, off(0, a)), pts: SweepPt[] = Array.from({ length: 12 }, (_, i) => { const a = -1.75 + 3.5 * i / 11, q = P(a), t = P(a + .01).p.sub(P(a - .01).p).normalize(), o = q.n.clone().multiplyScalar(.7).add(new T.Vector3(0, 0, .55)).normalize(), n = new T.Vector3().crossVectors(t, o).normalize(), wd = .03 * k * (1 - .35 * (Math.abs(a) / 1.75) ** 2), c = q.p.clone().addScaledVector(o, wd); return { p: [c.x, c.y, c.z] as [number, number, number], a: wd, b: .005 * k, n: [n.x, n.y, n.z] as [number, number, number] }; });
      out.cloth.push(sweep(pts, { seg: 6, capStart: true, capEnd: true }));
      for (const s of [-1, 1]) { const q = P(s * 1.72); out.trim.push(sweep([[0, 0, 0], [.004, -.03, .012], [.006, -.06, .02]].map(([x, y, z]) => ({ p: [q.p.x + s * x * k, q.p.y + y * k, q.p.z + z * k] as [number, number, number], a: .007 * k, b: .002 * k, n: [s, 0, 0] as [number, number, number] })), { seg: 4, capStart: true, capEnd: true })); }
    } else { // the knot at the nape and its two tails
      const q = at((seat(A) + .02) * k, A, off(0, A) + .006 * k);
      out.cloth.push(place(loft([{ y: -.018, w: .006, f: .006, b: .006 }, { y: -.008, w: .024, f: .018, b: .014 }, { y: .01, w: .022, f: .016, b: .013 }, { y: .018, w: .006, f: .006, b: .006 }].map(r => ({ ...r, y: r.y * k, w: r.w * k, f: r.f * k, b: r.b * k })), { seg: 7, capStart: 'flat', capEnd: 'flat' }), [q.p.x, q.p.y, q.p.z], [.3, 0, 0]));
      for (const x of [-.016, .02]) out.cloth.push(sweep([[x, -.004, -.006], [x * 1.8, -.04, -.014], [x * 2.3, (scarf ? -.085 : -.06), -.012]].map(([xx, y, z], i) => ({ p: [q.p.x + xx * k, q.p.y + y * k, q.p.z + z * k] as [number, number, number], a: .013 * k * (1 - i * .3), b: .0035 * k, n: [0, 0, 1] as [number, number, number] })), { seg: 4, capStart: true, capEnd: true }));
    }
  }
  // the cloth map paints a garment's side seams at u = .25 and .75: a hat has none, so its u is kept in the plain band between them (the soft cap's panel lines are built)
  for (const g of [...out.cloth, ...out.trim]) { const uv = g.attributes.uv as T.BufferAttribute | undefined; if (uv) for (let i = 0; i < uv.count; i++) uv.setX(i, .32 + .36 * (((uv.getX(i) % 1) + 1) % 1)); }
  built.set(key, out); return out;
}
