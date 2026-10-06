import * as T from 'three';
import { loft, sweep, place, type SweepPt } from './loft';
import { skullRings, headAt } from './head';
import { landmarks, type Landmarks } from './headform';
import { seatOf } from './hat';
import type { Look, HairStyle, Hat } from './look';
import type { Ring } from './loft';

/** Hair (Terra Character Book 7): a few designed masses, fitted to the skull of headform.ts and standing off it, never a cap that follows it.
 *  Every style is authored as data in the units of the standard head (H = .285; scaled to the figure's head), in four parts:
 *  - a HAIRLINE, the lower edge of the hair as a contour round the head (angle 0 is the centre front, positive turns to +x): where the forehead, the temples, the sideburn, the ear
 *    and the nape show;
 *  - an OFFSET FIELD over the scalp: how far the outer surface of the hair stands off the skull in each direction (lobes of volume, a groove at the parting, tight back and sides),
 *    which is what makes the outline the style's and not the skull's. The lower edge turns back to the scalp in a wall, so every edge has a thickness;
 *  - LOCKS: tapered, curved wedges that leave the main mass along one flow: the fringe, the pieces at the sides and at the nape;
 *  - TIED MASSES: a bun, a knot, a tail (they swing with the walk).
 *  Under a hat the same style is cut at the hat's seat (hat.ts): what shows below the band at the temples and the nape, nothing above it. */

const A = Math.PI, TAU = Math.PI * 2;
const sm = (x: number, a: number, b: number) => T.MathUtils.smoothstep(x, a, b);
const ease = (u: number) => u * u * (3 - 2 * u);

/** A closed contour round the head: control points [angle, value, sharp?] over -pi..pi, eased between neighbours (no overshoot); a segment that touches a sharp point is straight, so
 *  the tip of a lock or the notch between two is a point and not a scallop. */
type CP = readonly [number, number, number?];
export type Contour = ((a: number) => number) & { keys: number[] };
export function contour(pts: readonly CP[]): Contour {
  const P = [...pts].sort((p, q) => p[0] - q[0]), keys = P.map(p => p[0]);
  if (P[0][0] > -A + 1e-6) P.unshift([P[P.length - 1][0] - TAU, P[P.length - 1][1], P[P.length - 1][2]]);
  if (P[P.length - 1][0] < A - 1e-6) P.push([P[1][0] + TAU, P[1][1], P[1][2]]);
  return Object.assign((a: number) => {
    a = ((a + A) % TAU + TAU) % TAU - A;
    for (let i = 0; i < P.length - 1; i++) if (a <= P[i + 1][0]) { const u = Math.max(0, Math.min(1, (a - P[i][0]) / (P[i + 1][0] - P[i][0] || 1))); return P[i][1] + (P[i + 1][1] - P[i][1]) * (P[i][2] || P[i + 1][2] ? u : ease(u)); }
    return P[P.length - 1][1];
  }, { keys });
}
/** The same contour on both sides: points for angles 0..pi, mirrored. */
const sym = (pts: CP[]) => contour([...pts, ...pts.filter(p => p[0] > 0 && p[0] < A).map(([a, y, k]) => [-a, y, k] as CP)]);
/** A fringe of a few authored locks between angles a0 and a1 (a1 > a0), each [width (radians), length], all flowing one way (`flow` +1 toward +a, -1 toward -a): a lock runs
 *  from its root along a long curved flank to a tip that sits toward the flow, then turns back up a short flank under the next lock, so the edge reads as locks with curved,
 *  hooked tips and not as a row of even triangles. */
const fringeLocks = (a0: number, a1: number, notch: number, locks: [number, number][], flow: number): CP[] => {
  // a lock's edge, root to tip, as [across, down]: the locks overlap, so the notch between two is a short narrow V at .55 of a lock's length; the flank is a convex arc
  const up: [number, number, number][] = [.12, .26, .4, .54, .67].map(t => [t, .55 + .45 * Math.sin(t / .82 * Math.PI / 2), 0] as [number, number, number]);
  const prof: [number, number, number][] = [...up, [.82, 1, 1]], tot = locks.reduce((p, q) => p + q[0], 0), out: CP[] = [];
  let x = a0; out.push([a0, notch, 1]);
  locks.forEach(([w0, len], i) => { const w = (a1 - a0) * w0 / tot; for (const [t, f, k] of prof) out.push([x + (flow > 0 ? t : 1 - t) * w, notch - len * f, k]); x += w; out.push([x, i === locks.length - 1 ? notch : notch - len * .55, 1]); });
  return out; // (contour() sorts the points by angle)
};
/** The mirror image of a contour's points (for a parting on the other side). */
const flip = (pts: CP[], sg: number): CP[] => sg > 0 ? pts : pts.map(([a, y, k]) => [Math.abs(Math.abs(a) - A) < 1e-9 ? a : -a, y, k] as CP);
/** A lobe of volume round a direction on the head (x to the +x side, y up, z forward, from the ball's centre): its amplitude falls off with the angle from that direction. */
const lobe = (x: number, y: number, z: number, amp: number, w: number) => { const c = new T.Vector3(x, y, z).normalize(); return (d: T.Vector3) => amp * Math.exp(-(Math.acos(Math.max(-1, Math.min(1, d.dot(c)))) ** 2) / (2 * w * w)); };

interface Ctx { rings: Ring[]; L: Landmarks; k: number; crown: number }
/** The direction of a point from the ball's centre, in the ball's own proportions. */
const dirOf = (c: Ctx, p: T.Vector3) => new T.Vector3(p.x / (c.L.width / 2), (p.y - c.L.ballY) / c.L.R, (p.z - c.L.z0) / c.L.R).normalize();
/** A point on (and its normal off) the scalp at height y and angle a, pushed out by `off` (standard units). Below `hang` the hair falls straight: the point keeps the ring of `hang`. */
function at(c: Ctx, a: number, y: number, off: number, hang = -1) {
  const yy = Math.min(y * c.k, c.crown - .0005), hy = hang >= 0 && y < hang ? hang * c.k : yy, q = headAt(c.rings, hy, a, off * c.k);
  q.p.y += yy - hy; return q;
}

/** An edge round the head; a contour also carries the angles of its authored points, where the shell puts a column so a point stays a point. */
type Edge = ((a: number) => number) & { keys?: number[] };
interface ShellOpts {
  /** the hairline */ low: Edge; /** the upper edge (default: the crown) */ top?: Edge;
  /** offset off the scalp (standard units) for a direction, the fraction of the way up from the edge, and the angle */ off: (d: T.Vector3, s: number, a: number, y: number) => number;
  a0?: number; a1?: number; cols?: number; rows?: number; hang?: number; /** the wall at the upper edge too (an open band, such as a balding fringe) */ wallTop?: boolean;
}
/** The main mass: a surface over the scalp from the hairline up, at the style's offset field, with a wall back to the scalp along its edges so they have thickness. */
function shell(c: Ctx, o: ShellOpts): { outer: T.BufferGeometry; wall: T.BufferGeometry } {
  const a0 = o.a0 ?? -A, a1 = o.a1 ?? A, Rw = o.rows ?? 5, crown = c.crown / c.k, pos: number[] = [], uv: number[] = [], idx: number[] = [], wp: number[] = [], wi: number[] = [];
  // columns: an even spread, plus every authored point of the edges (a tip, a notch, a sideburn), so the outline keeps its points with few columns
  const n0 = o.cols ?? 20, wrap = (a: number) => { while (a < a0 - 1e-9) a += TAU; while (a > a1 + 1e-9) a -= TAU; return a; };
  const cand = [...Array.from({ length: n0 + 1 }, (_, i) => a0 + (a1 - a0) * i / n0), ...[...(o.low.keys ?? []), ...(o.top?.keys ?? [])].map(wrap).filter(a => a > a0 + 1e-6 && a < a1 - 1e-6)].sort((p, q) => p - q);
  const keyed = new Set([...(o.low.keys ?? []), ...(o.top?.keys ?? [])].map(wrap).map(a => a.toFixed(6))), cols: number[] = [];
  for (const a of cand) { const last = cols[cols.length - 1]; if (last === undefined || a - last > .03) cols.push(a); else if (keyed.has(a.toFixed(6)) && Math.abs(last - a0) > 1e-9) cols[cols.length - 1] = a; }
  if (Math.abs(cols[cols.length - 1] - a1) > 1e-9) { if (a1 - cols[cols.length - 1] < .03) cols[cols.length - 1] = a1; else cols.push(a1); }
  const C = cols.length - 1;
  const top = o.top ?? (() => crown - .0015), closed = Math.abs(a1 - a0 - TAU) < 1e-6;
  const vert = (a: number, s: number, onScalp = false) => {
    const lo = o.low(a), hi = Math.max(lo + .002, top(a)), y = lo + (hi - lo) * (s < .5 ? s * s * 2 : 1 - (1 - s) * (1 - s) * 2) * .25 + (hi - lo) * s * .75;
    const base = at(c, a, y, 0, o.hang), d = dirOf(c, base.p), off = onScalp ? .0015 : Math.max(.002, o.off(d, s, a, y));
    return at(c, a, y, off, onScalp ? -1 : o.hang).p;
  };
  // tone, baked into the colour the crowd batch already carries (citizens.ts bakeCharacter reads `tint`): a broken angel ring of sheen in a lighter value of the hair colour round the
  // upper head, and the underside of the mass darkening toward its edges and the nape, so the parting, the fringe and the crown read as volume and not as a cut-out
  const tint: number[] = [];
  for (let j = 0; j <= Rw; j++) for (let i = 0; i <= C; i++) { const a = cols[i], p = vert(a, j / Rw); pos.push(p.x, p.y, p.z); uv.push(i / C, j / Rw);
    const d = dirOf(c, p), ring = sm(d.y, .5, .6) * (1 - sm(d.y, .7, .8)) * sm(Math.cos(a), -.35, .25) * sm(Math.cos(a * 7 + .6), -.15, .45), under = (1 - sm(j / Rw, 0, .5)) * .7 + .35 * sm(-d.z, .3, 1) * (1 - sm(d.y, 0, .5));
    tint.push(ring > .04 ? ring : -Math.min(1, under)); }
  for (let j = 0; j < Rw; j++) for (let i = 0; i < C; i++) { const p = j * (C + 1) + i, q = p + C + 1; idx.push(p, p + 1, q, p + 1, q + 1, q); }
  // walls: the outer edge row joined back to the scalp
  const wall = (s: number, flip: boolean) => {
    const b = wp.length / 3;
    for (let i = 0; i <= C; i++) { const a = cols[i], p = vert(a, s), q = vert(a, s, true), d = p.distanceTo(q), lim = .014 * c.k; if (d > lim) q.lerpVectors(p, q, lim / d); wp.push(p.x, p.y, p.z, q.x, q.y, q.z); }
    for (let i = 0; i < C; i++) { const p = b + i * 2, q = p + 2; if (flip) wi.push(p, p + 1, q, q, p + 1, q + 1); else wi.push(p, q, p + 1, q, q + 1, p + 1); }
  };
  wall(0, false); if (o.wallTop) wall(1, true);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('tint', new T.Float32BufferAttribute(tint, 1)); g.setIndex(idx); g.computeVertexNormals();
  if (closed) { const nr = g.attributes.normal as T.BufferAttribute; for (let j = 0; j <= Rw; j++) { const i0 = j * (C + 1), i1 = i0 + C, x = nr.getX(i0) + nr.getX(i1), y = nr.getY(i0) + nr.getY(i1), z = nr.getZ(i0) + nr.getZ(i1), l = Math.hypot(x, y, z) || 1; nr.setXYZ(i0, x / l, y / l, z / l); nr.setXYZ(i1, x / l, y / l, z / l); } }
  const w = new T.BufferGeometry(); w.setAttribute('position', new T.Float32BufferAttribute(wp, 3)); w.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(wp.length / 3 * 2), 2)); w.setIndex(wi); w.computeVertexNormals();
  return { outer: g, wall: w };
}

/** A lock: a tapered, curved wedge lying along the head and leaving it at the tip. Points are [angle, height, offset off the scalp, half width, half thickness] in standard units;
 *  `hang` lets the lower points fall straight instead of following the jaw in. The root is blunt (it starts inside the mass), the tip a point. */
type LP = readonly [number, number, number, number, number?];
function lock(c: Ctx, pts: readonly LP[], hang = -1, seg = 4): T.BufferGeometry {
  const Q = pts.map(([a, y, off]) => at(c, a, y, off, hang)), curve = new T.CatmullRomCurve3(Q.map(q => q.p.clone()), false, 'centripetal'), N = Math.max(5, Math.round(pts.length * 1.75)), sp: SweepPt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, f = t * (pts.length - 1), i0 = Math.min(pts.length - 2, Math.floor(f)), u = f - i0, P0 = pts[i0], P1 = pts[i0 + 1];
    const w = (P0[3] + (P1[3] - P0[3]) * u) * c.k, th = ((P0[4] ?? .006) + ((P1[4] ?? .006) - (P0[4] ?? .006)) * u) * c.k, tip = Math.max(.03, Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.6))));
    const n = Q[i0].n.clone().lerp(Q[i0 + 1].n, u).normalize(), p = curve.getPoint(t);
    sp.push({ p: [p.x, p.y, p.z], a: w * tip, b: th * (.45 + .55 * tip), n: [n.x, n.y, n.z] });
  }
  return sweep(sp, { seg, capStart: true, capEnd: true });
}

/** One authored style. Everything is a function of the parting side `sg` (+1 or -1), so a style and its mirror image are the same design. */
interface Style {
  low: Edge; off: (d: T.Vector3, s: number, a: number, y: number) => number; hang?: number; cols?: number; rows?: number;
  a0?: number; a1?: number; top?: Edge; wallTop?: boolean; /** false: the hair over the cheek in front of the ear is not trimmed to a slim sideburn */ burns?: boolean;
  /** how much the lower edge at an angle is a hairline the hair grows out of (1: it starts thin and thickens behind it) rather than the cut end of the hair (0: a thick edge) */ roots?: (a: number) => number;
  /** the fringe and the other locks that lie over the top of the head: hidden by any hat */ fringe?: LP[][];
  /** locks at the edge (sides, nape) that still show under a hat that sits above them */ edge?: LP[][];
  /** what is tied or hangs: built in the figure's head frame, standard units */ tied?: (hatted: Hat) => T.BufferGeometry[];
}
type Mk = (sg: number, c: Ctx) => Style;

/** The sides and back, the same on both sides: points for angles from the temple round to the centre back. */
const sides = (pts: CP[]): CP[] => [...pts, ...pts.filter(p => p[0] < A - 1e-9).map(([a, y, k]) => [-a, y, k] as CP)];
/** A parting: 1 on the line (an x across the top of the head, in the ball's proportions), falling to 0 a few centimetres either side and toward the crown and the brow. */
const parting = (d: T.Vector3, x: number, w = .045) => Math.exp(-((d.x - x) ** 2) / (2 * w * w)) * sm(d.y, .25, .55) * sm(d.z, -.55, -.1);
/** The fringe stands off the forehead: extra offset at the front of the head, below the top. */
const front = (d: T.Vector3, amt: number) => amt * sm(d.z, .55, .88) * (1 - sm(d.y, .62, .9));

const S: Record<HairStyle, Mk> = {
  /** Short back and sides, a little length on top pushed forward into a short broken fringe: a flat, squared top over tight sides, the ears and temples clear, four clumps at the
   *  nape. */
  shortCrop: sg => ({
    // four short locks of uneven width pushed forward and swept away from the parting; behind the ear the hairline stays up, so skin shows round the ear
    low: contour([...fringeLocks(-1.0, 1.0, .24, ([[.62, .024], [.48, .03], [.52, .026], [.38, .018]] as [number, number][])[sg > 0 ? 'slice' : 'reverse'](), -sg),
      ...sides([[1.1, .234], [1.22, .19], [1.32, .168], [1.39, .14, 1], [1.46, .165], [1.8, .17], [2.05, .162], [2.3, .13], [2.5, .098], [2.62, .07, 1], [2.78, .088, 1], [2.96, .06, 1], [A, .074]])]),
    off: d => .005 + .024 * sm(d.y, .32, .66) + front(d, .008) + .002 * sm(-d.z, .2, .8) * (1 - sm(d.y, 0, .4)),
  }),
  /** A side parting: the hair is combed from the parting over the top into a rounded rise above the far temple and a long swoop of fringe across the forehead, in two points; the
   *  parting side lies flat and shows the temple. Tidy above the ears, a rounded back of the head over a tapered nape. */
  sidePart: sg => ({
    low: contour(flip([[.18, .23], [.3, .25, 1], [.4, .236, 1], [.8, .24], [1.05, .232], [1.2, .2], [1.32, .168], [1.4, .142, 1], [1.47, .165], [1.8, .17], [2.05, .162], [2.3, .13], [2.5, .1], [2.62, .078, 1], [2.8, .092, 1], [2.98, .072, 1], [A, .084],
      [0, .222], [-.16, .206, 1], [-.26, .216, 1], [-.5, .2], [-.72, .184], [-.86, .176, 1], [-.95, .196, 1], [-1.08, .206], [-1.22, .18], [-1.33, .166], [-1.41, .142, 1], [-1.48, .164], [-1.8, .168], [-2.05, .16], [-2.3, .13], [-2.5, .1], [-2.62, .078, 1], [-2.8, .092, 1], [-2.98, .072, 1]], sg)),
    roots: a => sm(a * sg, -.05, .2) * (1 - sm(Math.abs(a), 1.2, 1.4)),
    off: d => .01 + lobe(-.75 * sg, .55, .35, .028, .5)(d) + lobe(-.2 * sg, .95, .15, .012, .65)(d) + lobe(0, .15, -1, .022, .7)(d) - .009 * parting(d, .36 * sg) - .004 * Math.max(0, d.x * sg - .4) * sm(d.y, .2, .6) + front(d, .007) - .006 * sm(-d.x * sg, .55, .8) * (1 - sm(d.y, .25, .45)),
  }),
  /** Combed straight back from a bare forehead with a small peak: a lift behind the hairline, the hair running back over the crown and over the tops of the ears to the collar, where
   *  it turns out in a few pieces. No fringe. */
  sweptBack: () => ({
    low: sym([[0, .229, 1], [.16, .236], [.5, .236], [.82, .242], [1.02, .232], [1.18, .19], [1.32, .168], [1.39, .148, 1], [1.46, .168], [1.8, .17], [2.1, .13], [2.38, .09], [2.56, .066], [2.7, .042, 1], [2.86, .062, 1], [3.0, .036, 1], [A, .05]]),
    hang: .1,
    off: d => .012 + lobe(0, .62, .78, .04, .42)(d) + lobe(0, .95, .2, .012, .7)(d) + lobe(0, -.25, -1, .026, .6)(d) + lobe(1, .45, .05, .006, .4)(d) + lobe(-1, .45, .05, .006, .4)(d) + .004 * sm(d.y, -.2, .3) * sm(-d.z, .2, .8),
    roots: a => 1 - sm(Math.abs(a), 1.25, 1.5),
  }),
  /** Untidy: a full top that rises off the crown, a broken fringe of uneven points falling to the brows, points that stick out over the ears and at the nape. */
  tousled: sg => ({
    // five looser locks of uneven width and length, all falling one way
    low: contour([...fringeLocks(-1.05, 1.05, .232, ([[.36, .034], [.5, .054], [.4, .04], [.46, .06], [.38, .03]] as [number, number][])[sg > 0 ? 'slice' : 'reverse'](), -sg),
      ...sides([[1.12, .215], [1.24, .174, 1], [1.33, .2, 1], [1.42, .156, 1], [1.56, .172], [1.74, .136, 1], [1.9, .16], [2.06, .13, 1], [2.2, .142], [2.4, .1], [2.58, .066, 1], [2.72, .088, 1], [2.88, .05, 1], [3.02, .078, 1], [A, .06, 1]])]),
    off: d => .016 + lobe(.25 * sg, .9, .25, .03, .5)(d) + lobe(-.45 * sg, .62, -.45, .022, .45)(d) + lobe(1, .35, 0, .01, .4)(d) + lobe(-1, .35, 0, .01, .4)(d) + lobe(0, -.05, -1, .014, .6)(d) + front(d, .006),
    fringe: [[[.2 * sg, .282, .024, .02], [-.2 * sg, .292, .05, .018, .008], [-.5 * sg, .286, .068, .006, .004]], [[A - .5 * sg, .276, .026, .022], [A - .38 * sg, .268, .052, .02, .008], [A - .28 * sg, .25, .066, .006, .004]]],
  }),
  /** A chin-length bob: a blunt fringe cut straight across above the brows, sides falling straight past the cheeks to the jaw and turning under, a bell that is widest at the
   *  bottom, a slight parting off the centre. */
  bob: sg => ({
    low: sym([[0, .186], [.45, .188], [.84, .194, 1], [.92, .17], [1.0, .1], [1.08, .036, 1], [1.5, .04], [2.2, .056], [2.7, .066], [A, .07]]),
    hang: .125, cols: 28, rows: 6,
    off: (d, s, a, y) => .014 + .008 * sm(d.y, .5, 1) + .02 * (1 - sm(y, .06, .17)) * (1 - .55 * Math.max(0, Math.cos(a)) ** 4) - .007 * (1 - sm(s, 0, .1)) * (1 - Math.max(0, Math.cos(a)) ** 6) - .006 * parting(d, .16 * sg, .04) + front(d, .006),
  }),
  /** Drawn back from a centre parting, smooth and close over the top, swept over the upper ear into soft wings at the sides and gathered into a bun low at the back. */
  lowBun: () => ({
    low: sym([[0, .234], [.5, .236], [.9, .238], [1.12, .205], [1.26, .165], [1.42, .132], [1.65, .118], [1.95, .112], [2.3, .096], [2.7, .082], [A, .078]]),
    off: d => .008 + lobe(1, .12, -.15, .028, .34)(d) + lobe(-1, .12, -.15, .028, .34)(d) + lobe(0, .9, .35, .006, .5)(d) - .005 * parting(d, 0, .035),
    roots: a => 1 - sm(Math.abs(a), 1.15, 1.35),
    tied: hat => hat === 'bonnet' || hat === 'headscarf' ? [] : [bun(.045, [0, .088, -.158], [.5, 0, 0])], // under cloth the bun is gathered in it, and the cloth swells over it
  }),
  /** Everything drawn up from a bare forehead and nape into a knot high on the back of the crown; one loose piece falls in front of the ear on one side. */
  highKnot: sg => ({
    low: sym([[0, .234], [.5, .236], [.85, .242], [1.1, .225], [1.28, .17], [1.4, .148, 1], [1.52, .166], [1.85, .166], [2.2, .14], [2.6, .102], [2.9, .088], [A, .084]]),
    off: d => .008 + lobe(0, .8, -.6, .012, .45)(d),
    roots: () => 1,
    edge: [[[sg * 1.22, .222, .012, .012], [sg * 1.3, .17, .016, .012, .005], [sg * 1.32, .12, .018, .01, .005], [sg * 1.28, .075, .016, .004, .003]]],
    fringe: [[[0, .25, .008, .028], [0, .278, .016, .024, .008], [A - .2, .278, .018, .02, .007]]],
    tied: hat => hat === 'none' ? [bun(.04, [0, .29, -.078], [-.6, 0, 0]), bun(.026, [sg * .022, .312, -.068], [-.3, 0, sg * .5], 'knot2')] : [],
  }),
  /** Drawn back to a tie at the back of the crown, the tail falling to the shoulder blades; one long point of fringe swept across. */
  ponytail: sg => ({
    low: contour(flip([[.35, .236], [.85, .242], [1.1, .226], [1.28, .17], [1.4, .15, 1], [1.52, .166], [1.85, .164], [2.2, .132], [2.6, .102], [2.9, .096], [A, .094],
      [0, .228], [-.3, .214], [-.55, .194, 1], [-.68, .216, 1], [-.85, .222], [-1.1, .212], [-1.28, .17], [-1.4, .15, 1], [-1.52, .166], [-1.85, .164], [-2.2, .132], [-2.6, .102], [-2.9, .096]], sg)),
    off: d => .007 + lobe(-.4 * sg, .6, .7, .036, .34)(d) + lobe(.2 * sg, .85, .3, .006, .5)(d) + lobe(0, .55, -.8, .016, .45)(d) + front(d, .006),
    roots: a => Math.max(sm(a * sg, -.15, .1), sm(Math.abs(a), .9, 1.1)) * (1 - sm(Math.abs(a), 1.25, 1.45)),
    tied: hat => { const y = hat === 'none' ? .2 : .16; return [tieBand([0, y, -.128]), tail([[0, y + .006, -.138, .022, .02], [0, y - .016, -.172, .03, .028], [0, y - .06, -.198, .032, .028], [0, y - .13, -.206, .028, .024], [sg * .008, y - .2, -.196, .021, .018], [sg * .016, y - .26, -.18, .012, .011], [sg * .012, y - .3, -.17, .003, .004]])]; },
  }),
  /** Long hair, loosely tied low at the nape: full at the sides over the ears, points framing the face in front of the ears, a broad tail down the back. */
  longTied: sg => ({
    low: sym([[0, .234], [.5, .236], [.82, .228], [.95, .2], [1.02, .15, 1], [1.08, .17, 1], [1.14, .1, 1], [1.2, .125, 1], [1.27, .04, 1], [1.36, .07], [1.6, .1], [1.95, .104], [2.3, .086], [2.7, .066], [A, .056]]),
    roots: a => 1 - sm(Math.abs(a), .75, .95),
    hang: .115,
    off: (d, s, a, y) => .012 + .003 * sm(d.y, .5, 1) + lobe(1, 0, -.05, .02, .55)(d) + lobe(-1, 0, -.05, .02, .55)(d) + .01 * (1 - sm(y, .05, .14)) * Math.abs(Math.sin(a)) - .008 * (1 - sm(y, .06, .16)) * Math.max(0, -Math.cos(a)) - .005 * parting(d, .1 * sg, .035),
    tied: () => [tieBand([0, .066, -.13], .034), tail([[0, .07, -.142, .05, .016], [0, .03, -.158, .05, .016], [0, -.06, -.162, .046, .015], [0, -.15, -.15, .03, .012], [0, -.21, -.138, .006, .006]])],
  }),
  /** A bare crown with a horseshoe of hair round the back and sides, standing out above the ears in two soft tufts. */
  balding: () => ({
    a0: 1.05, a1: TAU - 1.05, cols: 20, rows: 3, wallTop: true, burns: false,
    low: sym([[1.05, .186], [1.15, .168], [1.26, .14, 1], [1.38, .155], [1.5, .15], [1.8, .158], [2.15, .125], [2.45, .098], [2.62, .07, 1], [2.78, .088, 1], [2.96, .066, 1], [A, .08]]),
    top: sym([[1.05, .188], [1.25, .194], [1.5, .2], [1.8, .21], [2.0, .222, 1], [2.12, .214, 1], [2.4, .232], [2.7, .238], [A, .242]]),
    off: (d, s) => (.006 + lobe(1, .3, -.3, .028, .42)(d) + lobe(-1, .3, -.3, .028, .42)(d)) * (1 - .85 * sm(s, .3, 1)),
  }),
};

/** A bun or knot: a squashed ball with a wrap round it (standard units: radius, centre, rotation). */
function bun(r: number, p: [number, number, number], rot: [number, number, number], key = 'bun'): T.BufferGeometry {
  const g = loft([{ y: -r, w: r * .35, f: r * .3, b: r * .3 }, { y: -r * .55, w: r * .95, f: r * .8, b: r * .8 }, { y: r * .3, w: r, f: r * .82, b: r * .82 }, { y: r * .85, w: r * .55, f: r * .45, b: r * .45 }], { seg: 8, capStart: { round: r * .25 }, capEnd: { round: r * .3 }, key: `${key}/${r}` });
  return place(g, p, rot);
}
const tieBand = (p: [number, number, number], r = .02) => place(loft([{ y: -.008, w: r, f: r * .9, b: r * .9 }, { y: .008, w: r, f: r * .9, b: r * .9 }], { seg: 8, lipStart: .002, lipEnd: .002, key: `tieband/${r}` }), p, [1.2, 0, 0]);
/** A tail: a broad, flat sweep through [x, y, z, half width, half thickness] points. */
const tail = (pts: number[][]) => sweep(pts.map(([x, y, z, a, b]) => ({ p: [x, y, z] as [number, number, number], a, b, n: [0, 0, -1] as [number, number, number] })), { seg: 7, capStart: true, capEnd: true });

export interface HairOut { hair: T.BufferGeometry[]; under: T.BufferGeometry[]; swing: T.BufferGeometry[] }
const built = new Map<string, HairOut>();
/** The hair for a look on a head of height h. `hatted`: the style is cut at the hat's seat, so it shows only below the band. Shared per style, side, head shape, size and hat. */
export function hairOf(look: Look, h: number, hatted: boolean): HairOut {
  const sg = (look.faceType + look.hairColour.length) % 2 ? 1 : -1, hat: Hat = hatted ? look.hat : 'none', key = `${look.hairStyle}/${sg}/${look.headShape}/${h}/${hat}`;
  const hit = built.get(key); if (hit) return hit;
  const rings = skullRings(look.headShape, h), c: Ctx = { rings, L: landmarks(h, look.headShape), k: h / .285, crown: rings[rings.length - 1].y }, st = S[look.hairStyle](sg, c);
  const out: HairOut = { hair: [], under: [], swing: [] }, seat = hat === 'none' ? undefined : seatOf(hat);
  let low = st.low, top = st.top, off = st.off;
  if (st.roots) { const o0 = off, r = st.roots; off = (d, s, a, y) => { const v = o0(d, s, a, y), m = r(a); return v * (1 - m) + (.0025 + (v - .0025) * sm(s, 0, .32)) * m; }; }
  if (st.burns !== false && st.hang === undefined) { // the sideburn in front of the ear lies close: a slim point, not a block
    const o0 = off; off = (d, s, a, y) => { const v = o0(d, s, a, y), m = sm(Math.abs(a), 1.1, 1.24) * (1 - sm(Math.abs(a), 1.52, 1.66)) * (1 - sm(y, .17, .21)); return v * (1 - m) + Math.min(v, .0045) * m; }; }
  if (seat) { // under a hat: nothing above the band but a thin layer tucked under it; below the band the style as it is
    const cut = (a: number) => seat(a) + .006;
    // (the points of the hairline that the hat covers are dropped: the shell under a hat is a narrow band and needs few columns)
    top = Object.assign((a: number) => Math.min(st.top ? st.top(a) : 1, cut(a)), { keys: st.top?.keys?.filter(a => st.top!(a) < seat(a)) }); low = Object.assign((a: number) => Math.min(st.low(a), cut(a) - .004), { keys: st.low.keys?.filter(a => st.low(a) < seat(a) - .004) });
    // what shows under the hat is soft: the sawtooth of the style's temples is blurred away into one rounded edge that follows the head
    const raw = low, blur = (a: number) => { let t = 0; for (let i = -4; i <= 4; i++) t += raw(a + i * .07); return t / 9; };
    low = Object.assign((a: number) => Math.min(raw(a), blur(a) + .008, cut(a) - .004), { keys: [] as number[] });
    const o1 = off; off = (d, s, a, y) => { const f = sm(y, seat(a) - .03, seat(a) - .004), v = o1(d, s, a, y); return v * (1 - f) + Math.min(v, .006) * f; };
  }
  const sh = shell(c, { low, top, off, hang: st.hang, cols: seat ? 16 : st.cols, rows: seat ? 3 : st.rows, a0: st.a0, a1: st.a1, wallTop: st.wallTop || !!seat });
  out.hair.push(sh.outer); out.under.push(sh.wall);
  const fits = (l: LP[]) => !seat || l.every(([a, y]) => y < seat(a) - .006);
  for (const l of st.fringe ?? []) if (!seat) out.hair.push(lock(c, l, st.hang));
  for (const l of st.edge ?? []) if (fits(l)) out.hair.push(lock(c, l, st.hang));
  for (const g of st.tied?.(hat) ?? []) out.swing.push(g.applyMatrix4(new T.Matrix4().makeScale(c.k, c.k, c.k)));
  built.set(key, out); return out;
}
