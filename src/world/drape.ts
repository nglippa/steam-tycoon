import * as T from 'three';

/** Long cloth that follows the legs (People XIX, Terra Character Book 12). A skirt, a long coat, an apron or the foundry slab is two rigid parts, hinged: `tails` from the waist to the knee
 *  and `hem` from the knee down. Each frame the legs' own joints are read in the cloth's frame, and the two parts are turned and opened just as far as it takes for every leg ring to stay inside
 *  the cloth (a lifted knee never pierces it, front or side), then given a little weight: the upper part follows the knees on a stiff spring and the hem trails it on a softer, underdamped one, so it
 *  lags, swings past and settles, and it bends at the knee rather than turning with the lap as one board. No simulation, no extra draw: two rotations and a scale. */

/** A section of the cloth as the legs see it, in the part's own frame: its height, half-width, front and back extents (to the lining, the inner face, as signed z) and squareness. */
export interface Band { y: number; w: number; f: number; b: number; z: number; n: number }
/** One hinged garment. `up` is in `tails`' frame (y from the waist pivot down to the hinge), `lo` in `hem`'s (y from the hinge down to the hem). `panel`: a front panel with no back (an apron). */
export interface Garment { up: Band[]; lo: Band[]; panel: boolean }
/** What the builder records for the cloth of one figure: its garments, the hinge height in `tails`' frame, and the leg's radii (thigh at the hip, knee, calf) with the cloth's clearance. */
export interface Drape { garments: Garment[]; hinge: number; thigh: number; knee: number; calf: number; /** the deepest the cloth is at the knee, front or back: seated, the lap is flattened to `LAP_SEATED` */ lap: number }
/** How thick a seated lap may be (front to back of the cloth above the knee, when that lies along the thighs). */
export const LAP_SEATED = .19;

/** The state a person carries for their cloth: the upper part's lead and the hem's angle, each with its velocity, and the hem's sideways bend. */
export interface DrapeState { lead: number; leadV: number; hem: number; hemV: number; bend: number; bendV: number; /** frames since the last solve (a far figure is solved every third frame) */ tick: number }
export const drapeState = (): DrapeState => ({ lead: 0, leadV: 0, hem: 0, hemV: 0, bend: 0, bendV: 0, tick: 0 });

/** The cloth's z at a given x on a band: its front (`front`) or its back, on the band's superellipse. */
const at = (r: Band, x: number, front: boolean) => { const u = Math.min(.98, Math.abs(x) / r.w), k = Math.pow(1 - Math.pow(u, r.n), 1 / r.n); return front ? r.z + r.f * k : r.b * k - r.z; };
export const bandAt = (rings: Band[], y: number): Band | null => {
  if (rings.length < 2) return null;
  const hi = rings[0].y, lo = rings[rings.length - 1].y; if (y > hi + 1e-6 || y < lo - 1e-6) return null;
  let j = 0; while (j < rings.length - 2 && y < rings[j + 1].y) j++;
  const a = rings[j], b = rings[j + 1], t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y || 1))), m = (p: number, q: number) => p + (q - p) * t;
  return { y, w: m(a.w, b.w), f: m(a.f, b.f), b: m(a.b, b.b), z: m(a.z, b.z), n: m(a.n, b.n) };
};

/** A leg as three points in the cloth's frame: the hip joint, the knee and the ankle. */
const leg = () => ({ h: new T.Vector3(), k: new T.Vector3(), a: new T.Vector3(), /** instep, toe and heel */ i: new T.Vector3(), t: new T.Vector3(), e: new T.Vector3() });
const INSTEP = new T.Vector3(0, .01, .07), TOE = new T.Vector3(0, -.025, .2), HEEL = new T.Vector3(0, -.03, -.07);
const L = [leg(), leg()], q = new T.Quaternion(), pin = new T.Quaternion(), v = new T.Vector3();
/** Where a leg is at height y (its axis and radius, in one reused object), or null if it does not reach that height. */
const AT = { x: 0, z: 0, r: 0 };
function legAt(p: typeof L[0], y: number, d: Drape) {
  if (y <= p.h.y && y >= p.k.y && p.h.y - p.k.y > .05) { const t = (p.h.y - y) / (p.h.y - p.k.y); AT.x = p.h.x + (p.k.x - p.h.x) * t; AT.z = p.h.z + (p.k.z - p.h.z) * t; AT.r = d.thigh + (d.knee - d.thigh) * t; return AT; }
  if (y <= p.k.y && y >= p.a.y && p.k.y - p.a.y > .05) { const t = (p.k.y - y) / (p.k.y - p.a.y); AT.x = p.k.x + (p.a.x - p.k.x) * t; AT.z = p.k.z + (p.a.z - p.k.z) * t; AT.r = d.knee + (d.calf - d.knee) * t; return AT; }
  return null;
}

/** A leg's x where the cloth must clear it: a little out from its axis toward its side, where a bell or a panel is already falling away. */
const wide = (x: number, r: number) => Math.abs(x) + .3 * r;
type Need = { y: number; f: number; b: number; zf: number; zb: number; panel: boolean };
/** The constraints, in pools reused frame to frame (`nu`, `nl` of each are live). */
const upNeeds: Need[] = [], loNeeds: Need[] = []; let nu = 0, nl = 0;
const put = (pool: Need[], i: number, y: number, f: number, b: number, zf: number, zb: number, panel: boolean) => { const n = pool[i] ??= { y: 0, f: 0, b: 0, zf: 0, zb: 0, panel: false }; n.y = y; n.f = f; n.b = b; n.zf = zf; n.zb = zb; n.panel = panel; };
/** The constraints at every band of every garment: for each leg that reaches the band's height, how far forward the cloth's front must be (`zf`) and how far back its back (`zb`), and where the
 *  cloth's own front and back are at that leg's x. */
function needs(d: Drape, sx: number) {
  nu = 0; nl = 0;
  for (const g of d.garments) {
    for (const r of g.up) { if (r.y > -.02) continue; for (const p of L) { const s = legAt(p, r.y, d); if (s) { const x = wide(s.x, s.r) / sx; put(upNeeds, nu++, r.y, at(r, x, true), at(r, x, false), s.z + s.r, s.z - s.r, g.panel); } } }
    // the knee itself (a ball), against the upper part: at its own height, or at the part's last band if it overlaps it (at the hinge the knee is in both parts)
    const upLo = g.up.length ? g.up[g.up.length - 1].y : 0;
    for (const p of L) if (g.up.length && p.k.y - d.knee < g.up[0].y && p.k.y + d.knee > upLo) { const r = bandAt(g.up, Math.max(upLo, Math.min(g.up[0].y, p.k.y)))!, kx = wide(p.k.x, d.knee) / sx; put(upNeeds, nu++, r.y, at(r, kx, true), at(r, kx, false), p.k.z + d.knee, p.k.z - d.knee, g.panel); }
    // the hem's bands, each with the cloth's front and back where each leg is; the legs are met at the height the band is actually carried to (miss), since turning the hem lowers its front
    for (const r of g.lo) for (let li = 0; li < 2; li++) { const p = L[li], s = legAt(p, d.hinge + r.y, d), x = (s ? wide(s.x, s.r) : wide(p.k.x, d.knee)) / sx; put(loNeeds, nl++, r.y, at(r, x, true), at(r, x, false), li, 0, g.panel); }
  }
}
/** The upper part, turned forward by asin(a) and opened to scale s: the least s that clears every leg ring (front: |y| a + f s cos >= zf; back: |y| a - b s cos <= zb). */
function scaleFor(a: number) {
  const c = Math.sqrt(1 - a * a); let s = 1;
  for (let i = 0; i < nu; i++) { const n = upNeeds[i], y = -n.y; s = Math.max(s, (n.zf - y * a) / (n.f * c)); if (!n.panel) s = Math.max(s, (y * a - n.zb) / (n.b * c)); }
  return s;
}
let D: Drape, W = 0;
/** How far the cloth's point at height y, depth z (front or back) leaves leg p uncovered, into `W`: its column, its knee (a ball), its ankle (a ball) and its foot (instep, toe and heel). */
function meet(y: number, z: number, p: typeof L[0], front: boolean) {
  const sg = front ? 1 : -1, c = legAt(p, y, D); if (c) W = Math.max(W, sg * (c.z - z) + c.r);
  const dy = y - p.k.y; if (dy < D.knee && dy > -D.knee) W = Math.max(W, sg * (p.k.z - z) + Math.sqrt(D.knee * D.knee - dy * dy));
  const da = y - p.a.y; if (da < D.calf && da > -D.calf) W = Math.max(W, sg * (p.a.z - z) + Math.sqrt(D.calf * D.calf - da * da));
  if (y > p.t.y - .03 && y < p.t.y + .06) W = Math.max(W, sg * (p.t.z - z) + .045);
  if (y > p.i.y - .03 && y < p.i.y + .06) W = Math.max(W, sg * (p.i.z - z) + .045);
  if (y > p.e.y - .03 && y < p.e.y + .06) W = Math.max(W, sg * (p.e.z - z) + .045);
}
/** How far the hem misses (0 when every leg is inside it), with the upper part at lead `a` and scale `s`, and the hem opened by `k` and turned by `th` about the knee: each band's front and back
 *  are carried through both parts' turns and the legs are met where they are carried to (turning the hem lowers its front). */
function miss(a: number, s: number, th: number, hinge: number, k: number) {
  const su = -a, cu = Math.sqrt(1 - a * a), sh = Math.sin(th), ch = Math.cos(th); W = 0;
  for (let i = 0; i < nl; i++) { const n = loNeeds[i];
    const p = L[n.zf], f = n.f * k, z1 = n.y * sh + f * ch, y1 = n.y * ch - f * sh, y3 = hinge + y1, z3 = s * z1; meet(y3 * cu - z3 * su, y3 * su + z3 * cu, p, true);
    if (!n.panel) { const b = n.b * k, zb = n.y * sh - b * ch, yb = n.y * ch + b * sh, y3b = hinge + yb, z3b = s * zb; meet(y3b * cu - z3b * su, y3b * su + z3b * cu, p, false); }
  }
  return W;
}
/** Reads the legs into the cloth's frame (`tails`' parent, about the tails pivot). `legs`, `knees`, `ankles` are the figure's own joint groups, already posed for this frame. */
export function readLegs(pelvis: T.Object3D, tails: T.Object3D, legs: T.Object3D[], knees: T.Object3D[], ankles: T.Object3D[]) {
  pin.copy(pelvis.quaternion).invert();
  for (let k = 0; k < 2; k++) { const p = L[k], lg = legs[k], kn = knees[k];
    const toCloth = (o: T.Vector3) => o.sub(pelvis.position).applyQuaternion(pin).sub(tails.position);
    p.h.copy(lg.position); p.k.copy(kn.position).applyQuaternion(lg.quaternion).add(lg.position);
    q.copy(lg.quaternion).multiply(kn.quaternion); p.a.copy(ankles[k].position).applyQuaternion(q).add(p.k);
    q.multiply(ankles[k].quaternion); p.i.copy(INSTEP).applyQuaternion(q).add(p.a); p.t.copy(TOE).applyQuaternion(q).add(p.a); p.e.copy(HEEL).applyQuaternion(q).add(p.a);
    toCloth(p.h); toCloth(p.k); toCloth(p.a); toCloth(p.i); toCloth(p.t); toCloth(p.e); }
}

/** The least of f on [lo, hi] (f roughly convex there): a golden-section search, `n` steps. */
const PHI = (Math.sqrt(5) - 1) / 2;
function least(f: (x: number) => number, lo: number, hi: number, n: number) {
  let x1 = hi - PHI * (hi - lo), x2 = lo + PHI * (hi - lo), f1 = f(x1), f2 = f(x2);
  for (let i = 0; i < n; i++) { if (f1 <= f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - PHI * (hi - lo); f1 = f(x1); } else { lo = x1; x1 = x2; f1 = f2; x2 = lo + PHI * (hi - lo); f2 = f(x2); } }
  return f1 <= f2 ? x1 : x2;
}
/** From `from` (where ok holds) toward `to`, the farthest x for which ok still holds: a bisection, `n` steps. */
function reach(ok: (x: number) => boolean, from: number, to: number, n: number) { if (ok(to)) return to; let a = from, b = to; for (let i = 0; i < n; i++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; } return a; }

/** Solves this frame's cloth and writes it to `tails` and `hem`. `g` is how much the person is walking (0..1), `sway` the upper part's sideways swing, `lively` false for a calm figure (no
 *  springs: the cloth is put where the legs need it), `drag` the cloth's backward trail from speed and acceleration. */
export function drape(d: Drape, st: DrapeState, tails: T.Object3D, hem: T.Object3D | undefined, dt: number, g: number, sway: number, drag: number, lively: boolean) {
  // the upper part: the lead that lets it open least (of those, the one nearest plumb: standing, that is plumb; an apron, with no back to clear, is pushed only as far as the knee asks),
  // then the spring's lead, kept where the cloth still opens no more than 6 % past its least
  D = d; needs(d, 1);
  let best = least(scaleFor, -.36, .6, 9), bestS = scaleFor(best);
  if (scaleFor(0) <= bestS + 1e-3) best = 0; else best = reach(x => scaleFor(x) <= bestS + 1e-3, best, 0, 4);
  let a = best + drag;
  if (lively) { st.leadV += ((a - st.lead) * 140 - st.leadV * 20) * dt; st.lead += st.leadV * dt; a = st.lead; } else { st.lead = a; st.leadV = 0; }
  const room = Math.max(1, bestS) * 1.06;
  if (scaleFor(a) > room) { a = reach(x => scaleFor(x) <= room, best, a, 5); st.lead = a; st.leadV *= .3; } // the spring has lagged too far: the lead comes back toward the best
  a = Math.max(-.6, Math.min(.6, a));
  let s = scaleFor(a); const sx = 1 - Math.min(.12, (s - 1) * .12);
  if (sx < 1) { needs(d, sx); s = scaleFor(a); }
  tails.rotation.set(-Math.asin(a), 0, sway); tails.scale.set(sx, 1, s);
  if (!hem) return; // a coat skirt that ends above the knee is one part
  // the hem: the turn about the knee that clears the legs best; if even that misses, the hem flares (its own opening, so the waist stays put: its top is cut narrow inside the upper part)
  // It hangs plumb from the knee when it may (its turn undoes the upper part's) and trails a little; most of a walk that already clears the legs, and nothing more is solved.
  let k = 1, t0 = NaN; const want = Math.asin(a) - drag * 1.6, clear = (t: number) => miss(a, s, t, d.hinge, k) <= 0;
  const settle = () => { for (let pass = 0; pass < 6; pass++) { t0 = least(t => miss(a, s, t, d.hinge, k), -1, 1, 9); const mm = miss(a, s, t0, d.hinge, k); if (mm <= 0) break; k *= 1 + Math.min(.25, mm * 3 + .02); } };
  // otherwise it is pushed only as far as the legs ask: from the turn that clears them best, toward plumb; the spring is kept inside what clears
  const aim = (x: number) => { if (clear(x)) return x; if (Number.isNaN(t0)) settle(); return reach(clear, t0, x, 4); };
  let th = aim(want);
  if (lively) { st.hemV += ((th - st.hem) * 46 - st.hemV * 5.5) * dt; st.hem += st.hemV * dt; th = st.hem; if (!clear(th)) { const c = aim(th); st.hemV = 0; st.hem = th = c; } } else { st.hem = th; st.hemV = 0; }
  // the hem's own sideways swing trails the upper part's, so the cloth bends at the knee
  if (lively) { st.bendV += ((-sway * .7 - st.bend) * 30 - st.bendV * 4.5) * dt; st.bend += st.bendV * dt; } else { st.bend = 0; st.bendV = 0; }
  hem.rotation.set(th, 0, st.bend * g); hem.scale.set(1, 1, k);
}
/** A figure standing still: the cloth eases back to plumb and closed (standing, the legs are inside it). */
export function rest(st: DrapeState, tails: T.Object3D, hem: T.Object3D | undefined, dt: number, sway: number) {
  const e = Math.min(1, dt * 6); st.lead -= st.lead * e; st.leadV = 0; st.hem -= st.hem * e; st.hemV = 0; st.bend -= st.bend * e; st.bendV = 0;
  tails.rotation.set(-Math.asin(st.lead), 0, sway); tails.scale.set(1, 1, 1 + (tails.scale.z - 1) * (1 - e));
  if (hem) { hem.rotation.set(st.hem, 0, 0); hem.scale.set(1, 1, 1 + (hem.scale.z - 1) * (1 - e)); }
}

/** The bands of a garment part at every 7 cm or less, from rings ordered top down (the builder's), so the legs are checked between the rings too. */
export function bands(rings: { y: number; w: number; f: number; b: number; z?: number; n?: number }[], lip: number): Band[] {
  const src = rings.map(r => ({ y: r.y, w: r.w - lip, f: r.f - lip, b: r.b - lip, z: r.z ?? 0, n: r.n ?? 2 })), out: Band[] = [], top = src[0].y, bot = src[src.length - 1].y, n = Math.max(1, Math.ceil((top - bot) / .07));
  for (let i = 0; i <= n; i++) out.push(bandAt(src, top + (bot - top) * i / n)!);
  return out;
}
