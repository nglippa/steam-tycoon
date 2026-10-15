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
export interface Drape { garments: Garment[]; hinge: number; thigh: number; knee: number; calf: number; /** the deepest the cloth is at the knee, front or back: seated, the lap is flattened to `LAP_SEATED` */ lap: number;
  /** a coat skirt cut at its side seams into a front and a back that lap over each other at the sides (People XXI): the front is led and opened by the fronts of the legs alone, as an apron
   *  is, and the back by their backs alone, so the front goes out over the forward knee and the back trails the trailing one, where in one piece the coat had to open front and back together
   *  and ballooned. Both are children of `tails`, on its pivot, inside its lead and sway. */
  split?: { garments: Garment[]; front: Part; back: Part; /** (the drape the two sides are solved on, made once) */ one?: Drape };
  /** a front panel's own part (People XXIV): an apron or the foundry slab, built apart from a skirt under it so that seated it lies on the thighs and falls from the knees (`seatPanel`) */
  panel?: Panel }
/** A front panel's part above the knee (a child of `tails`, on its pivot), its hinge below (a child of that), and its garments as the legs see them. */
export interface Panel { tails: T.Object3D; hem?: T.Object3D; garments: Garment[]; /** (made on first use: `shapePanel`) */ skin?: Skin }
/** A front panel's skin (People XXV): the panel's own copy of its vertices, kept as built (`rest`), and how far each height of it is pushed forward (`dz`, on a grid `ys` of the part's frame, with
 *  `front`, where the cloth's front is at rest at each). An apron hangs on the belly and thighs a centimetre off; in a stride the thigh that goes forward pushes the cloth ahead of it at its own
 *  heights and the rest hangs where it was, so the cloth is a soft fold over the leading thigh and not a board turned about the waist. */
export interface Skin { parts: { pa: T.BufferAttribute; rest: Float32Array; /** (the part's y in the tails' frame less its own: 0, or the hinge's for the hem's meshes) */ off: number }[]; ys: number[]; front: number[]; dz: number[]; shown: number[]; /** (the pushed hinge) */ hinge: number }
/** One side of a split coat skirt: its part above the knee, its hem, and its own lead and swing. */
export interface Part { tails: T.Object3D; hem?: T.Object3D; st: DrapeState }
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
const L = [leg(), leg()], q = new T.Quaternion(), pin = new T.Quaternion(), v = new T.Vector3(), UP = new T.Vector3(0, 1, 0);
/** The line of walk (the figure's own forward) in the cloth's frame, level: the pelvis turns about it with the stride. */
const AHEAD = new T.Vector3(0, 0, 1);
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
/** Which faces of the cloth are solved: 0 both; 1 the front alone, -1 the back alone (the two sides of a split coat skirt). */
let SIDE = 0;
/** The upper part, turned forward by asin(a) and opened to scale s: the least s that clears every leg ring (front: |y| a + f s cos >= zf; back: |y| a - b s cos <= zb). */
function scaleFor(a: number) {
  const c = Math.sqrt(1 - a * a); let s = 1;
  for (let i = 0; i < nu; i++) { const n = upNeeds[i], y = -n.y; if (SIDE >= 0) s = Math.max(s, (n.zf - y * a) / (n.f * c)); if (SIDE <= 0 && !n.panel) s = Math.max(s, (y * a - n.zb) / (n.b * c)); }
  return s;
}
let D: Drape, W = 0, HZ = 0; // (HZ: how far a shaped panel has pushed its hinge forward)
/** The shaped panel's skin while its hem is solved (undefined for cloth that is not one): the hem's meshes carry the push of their own height less the hinge's (`skinApply`), which `miss` counts. */
let PK: Skin | undefined;
/** How far the panel's skin is pushed forward at height y of the part's frame (the hinge at -.5). */
function pushAt(k: Skin, y: number) { const n = k.ys.length, u = Math.min(n - 1, Math.max(0, (k.ys[0] - y) / (k.ys[0] - k.ys[n - 1]) * (n - 1))), i = Math.min(n - 2, Math.floor(u)); return k.dz[i] + (k.dz[i + 1] - k.dz[i]) * (u - i); }
/** How far the cloth's point at height y, depth z (front or back) leaves leg p uncovered, into `W`: its column, its knee (a ball), its ankle (a ball) and its foot (instep, toe and heel). */
function meet(y: number, z: number, p: typeof L[0], front: boolean) {
  const sg = front ? 1 : -1, c = legAt(p, y, D); if (c) W = Math.max(W, sg * (c.z - z) + c.r);
  const dy = y - p.k.y; if (dy < D.knee && dy > -D.knee) W = Math.max(W, sg * (p.k.z - z) + Math.sqrt(D.knee * D.knee - dy * dy));
  const da = y - p.a.y; if (da < D.calf && da > -D.calf) W = Math.max(W, sg * (p.a.z - z) + Math.sqrt(D.calf * D.calf - da * da));
  if (y > p.t.y - .03 && y < p.t.y + .06) W = Math.max(W, sg * (p.t.z - z) + .045);
  if (y > p.i.y - .03 && y < p.i.y + .06) W = Math.max(W, sg * (p.i.z - z) + .045);
  if (y > p.e.y - .03 && y < p.e.y + .06) W = Math.max(W, sg * (p.e.z - z) + .045);
}
/** How far the upper part laps over the hem below the hinge (wardrobe.ts cuts it 3 cm past the knee): what of the hem is carried above that is inside the upper part, and the legs there are the
 *  upper part's to clear. (People XXI: the hem's top is cut narrow, so asking it to hold the knee too opened the whole hem by up to 38 %, and its hem with it: the bell.) */
const LAPPED = .03;
/** How far the hem misses (0 when every leg is inside it), with the upper part at lead `a` and scale `s`, and the hem opened by `k` and turned by `th` about the knee: each band's front and back
 *  are carried through both parts' turns and the legs are met where they are carried to (turning the hem lowers its front). */
function miss(a: number, s: number, th: number, hinge: number, k: number) {
  const su = -a, cu = Math.sqrt(1 - a * a), sh = Math.sin(th), ch = Math.cos(th); W = 0;
  for (let i = 0; i < nl; i++) { const n = loNeeds[i];
    const p = L[n.zf], push = PK ? pushAt(PK, HINGE + n.y) - HZ : 0, f = n.f * k + push, z1 = n.y * sh + f * ch, y1 = n.y * ch - f * sh, y3 = hinge + y1, z3 = s * z1 + HZ; if (SIDE >= 0 && y1 < -LAPPED) meet(y3 * cu - z3 * su, y3 * su + z3 * cu, p, true);
    if (SIDE <= 0 && !n.panel) { const b = n.b * k, zb = n.y * sh - b * ch, yb = n.y * ch + b * sh, y3b = hinge + yb, z3b = s * zb + HZ; if (yb < -LAPPED) meet(y3b * cu - z3b * su, y3b * su + z3b * cu, p, false); }
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
  AHEAD.set(0, 0, 1).applyQuaternion(pin); AHEAD.y = 0; AHEAD.normalize();
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
  // a front panel alone (an apron, the foundry slab, with nothing round the legs under it) hangs square to the line of walk, not turned with the pelvis's stride yaw (People XXII): turned, the
  // edge on the side of the trailing hip went back 2-3 cm, behind the forward leg's front, and seen from the side that leg was drawn over the apron (up to 160 cm² of it), which read as
  // hanging behind the leg, a tail. The legs are read square to the walk too, so the solve is unchanged.
  D = d; let yaw = 0;
  if (d.garments.length && d.garments.every(g => g.panel)) { yaw = Math.atan2(AHEAD.x, AHEAD.z); q.setFromAxisAngle(UP, -yaw); for (const p of L) for (const o of [p.h, p.k, p.a, p.i, p.t, p.e]) o.applyQuaternion(q); }
  needs(d, 1);
  // a front panel alone is not turned and opened as a board: it hangs plumb from the waist and is shaped on the legs (`shapePanel`)
  const alone = !!d.panel && d.garments.length > 0 && d.garments.every(g => g.panel);
  let a = 0, s = 1, sx = 1;
  if (alone) st.lead = st.leadV = 0; else {
  let best = least(scaleFor, -.36, .6, 9), bestS = scaleFor(best);
  if (scaleFor(0) <= bestS + 1e-3) best = 0; else best = reach(x => scaleFor(x) <= bestS + 1e-3, best, 0, 4);
  a = best + drag;
  if (lively) { st.leadV += ((a - st.lead) * 140 - st.leadV * 20) * dt; st.lead += st.leadV * dt; a = st.lead; } else { st.lead = a; st.leadV = 0; }
  const room = Math.max(1, bestS) * 1.06;
  if (scaleFor(a) > room) { a = reach(x => scaleFor(x) <= room, best, a, 5); st.lead = a; st.leadV *= .3; } // the spring has lagged too far: the lead comes back toward the best
  a = Math.max(-.6, Math.min(.6, a));
  s = scaleFor(a); sx = 1 - Math.min(.12, (s - 1) * .12);
  if (sx < 1) { needs(d, sx); s = scaleFor(a); } }
  tails.rotation.order = 'YXZ'; tails.rotation.set(-Math.asin(a), yaw, sway); tails.scale.set(sx, 1, s); // (the yaw outermost, about the waist)
  HZ = 0; PK = undefined; if (alone) { shapePanel(d.panel!, d, dt, lively); HZ = d.panel!.skin?.hinge ?? 0; PK = d.panel!.skin; }
  if (!hem) return; // a coat skirt that ends above the knee is one part
  // the hem: the turn about the knee that clears the legs best; if even that misses, the hem flares (its own opening, so the waist stays put: its top is cut narrow inside the upper part)
  // It hangs plumb from the knee when it may (its turn undoes the upper part's) and trails a little; most of a walk that already clears the legs, and nothing more is solved.
  let k = 1, t0 = NaN; const want = alone ? 0 : Math.asin(a) - drag * 1.6, /* (a panel hangs plumb from its hinge and is turned only as far as the shins ask: it does not trail like a skirt) */ clear = (t: number) => miss(a, s, t, d.hinge, k) <= 0;
  const settle = () => { for (let pass = 0; pass < 6; pass++) { t0 = least(t => miss(a, s, t, d.hinge, k), -1, 1, 9); const mm = miss(a, s, t0, d.hinge, k); if (mm <= 0) break; k *= 1 + Math.min(.25, mm * 3 + .02); } };
  // otherwise it is pushed only as far as the legs ask: from the turn that clears them best, toward plumb; the spring is kept inside what clears
  const aim = (x: number) => { if (clear(x)) return x; if (Number.isNaN(t0)) settle(); return reach(clear, t0, x, 4); };
  let th = alone ? 0 : aim(want);
  if (lively) { st.hemV += ((th - st.hem) * 90 - st.hemV * 8) * dt; st.hem += st.hemV * dt; th = st.hem; if (!alone && !clear(th)) { const c = aim(th); st.hemV = 0; st.hem = th = c; } } else { st.hem = th; st.hemV = 0; }
  // the hem's own sideways swing trails the upper part's, so the cloth bends at the knee
  if (lively) { st.bendV += ((-sway * .7 - st.bend) * 30 - st.bendV * 4.5) * dt; st.bend += st.bendV * dt; } else { st.bend = 0; st.bendV = 0; }
  hem.rotation.set(th, 0, st.bend * g); hem.scale.set(1, 1, k);
}
/** A split coat skirt's two sides, after `drape` has placed `tails`: the legs are taken into `tails`' own frame, and the front is solved on the fronts of the legs alone and the back on their
 *  backs alone, each with its own lead, opening, hem and springs (no drag of their own: `tails` trails them both). */
export function drapeSplit(d: Drape, tails: T.Object3D, dt: number, g: number, lively: boolean) {
  const sp = d.split; if (!sp) return;
  q.setFromEuler(tails.rotation).invert();
  for (const p of L) for (const o of [p.h, p.k, p.a, p.i, p.t, p.e]) { o.applyQuaternion(q); o.x /= tails.scale.x; o.z /= tails.scale.z; }
  const one = sp.one ??= { ...d, garments: sp.garments, split: undefined };
  for (const [part, side] of [[sp.front, 1], [sp.back, -1]] as const) { SIDE = side; drape(one, part.st, part.tails, part.hem, dt, g, 0, 0, lively); }
  SIDE = 0;
}
/** The two sides standing still (eased back to plumb), or held closed and plumb under `tails` (seated, or not followed) with the hem's turn and opening `hemX`, `hemZ`. */
export function restSplit(d: Drape, dt: number) { const sp = d.split; if (sp) for (const p of [sp.front, sp.back]) rest(p.st, p.tails, p.hem, dt, 0); }
export function holdSplit(d: Drape, hemX: number, hemZ: number) { const sp = d.split; if (sp) for (const p of [sp.front, sp.back]) { p.tails.rotation.set(0, 0, 0); p.tails.scale.set(1, 1, 1); if (p.hem) { p.hem.rotation.set(hemX, 0, 0); p.hem.scale.set(1, 1, hemZ); } } }
/** A figure standing still: the cloth eases back to plumb and closed (standing, the legs are inside it). */
export function rest(st: DrapeState, tails: T.Object3D, hem: T.Object3D | undefined, dt: number, sway: number) {
  const e = Math.min(1, dt * 6); st.lead -= st.lead * e; st.leadV = 0; st.hem -= st.hem * e; st.hemV = 0; st.bend -= st.bend * e; st.bendV = 0;
  tails.rotation.set(-Math.asin(st.lead), 0, sway); tails.scale.set(1, 1, 1 + (tails.scale.z - 1) * (1 - e));
  if (hem) { hem.rotation.set(st.hem, 0, 0); hem.scale.set(1, 1, 1 + (hem.scale.z - 1) * (1 - e)); }
}

/** The bands of a garment part at every 7 cm or less and at each of its rings, from rings ordered top down (the builder's), so the legs are checked between the rings too. */
export function bands(rings: { y: number; w: number; f: number; b: number; z?: number; n?: number }[], lip: number): Band[] {
  const src = rings.map(r => ({ y: r.y, w: r.w - lip, f: r.f - lip, b: r.b - lip, z: r.z ?? 0, n: r.n ?? 2 })), out: Band[] = [], top = src[0].y, bot = src[src.length - 1].y, n = Math.max(1, Math.ceil((top - bot) / .07));
  // every 7 cm, and at every ring of the garment itself (a hem's top is cut narrower in two steps; between samples it would be met as if it were not)
  const ys = [...Array.from({ length: n + 1 }, (_, i) => top + (bot - top) * i / n), ...src.map(r => r.y)].sort((p, q) => q - p).filter((y, i, a) => !i || a[i - 1] - y > .005);
  for (const y of ys) out.push(bandAt(src, y)!);
  return out;
}

/** How far past the legs' own allowance (drape's thigh, knee and calf radii hold a centimetre or two of clearance) a pushed apron stands. */
const HUG = .009;
const SKIN_STEP = .02;
function skinOf(p: Panel): Skin | undefined {
  if (p.skin) return p.skin;
  const parts: Skin['parts'] = []; let hi = -9, lo = 9;
  // (the hem's meshes are in the hem's frame, whose origin is the hinge in the tails': People XXV-b, they were pushed by the belly's and thigh's rows at their own y, 50 cm too high)
  const inHem = new Set<T.Object3D>(); p.hem?.traverse(o => inHem.add(o));
  p.tails.traverse(o => { if (!(o instanceof T.Mesh) || !o.geometry.attributes.position) return; o.geometry = o.geometry.clone(); const pa = o.geometry.attributes.position as T.BufferAttribute, off = inHem.has(o) ? HINGE : 0; parts.push({ pa, rest: Float32Array.from(pa.array as Float32Array), off });
    for (let j = 0; j < pa.count; j++) { hi = Math.max(hi, pa.getY(j) + off); lo = Math.min(lo, pa.getY(j) + off); } });
  if (!parts.length) return undefined;
  const n = Math.max(2, Math.ceil((hi - lo) / SKIN_STEP) + 1), ys = Array.from({ length: n }, (_, i) => hi - (hi - lo) * i / (n - 1)), front = ys.map(() => -9);
  // where the front is at each ring (the greatest z of the vertices at that height), and between rings along the line from one to the next
  const lv = new Map<number, number>(); for (const { rest, off } of parts) for (let j = 0; j < rest.length; j += 3) { const k = Math.round((rest[j + 1] + off) * 1000); lv.set(k, Math.max(lv.get(k) ?? -9, rest[j + 2])); }
  const rows = [...lv.entries()].sort((u, w) => w[0] - u[0]);
  for (let i = 0; i < n; i++) { const y = ys[i] * 1000; let r = 0; while (r < rows.length - 2 && y < rows[r + 1][0]) r++;
    const [y0, z0] = rows[r], [y1, z1] = rows[Math.min(rows.length - 1, r + 1)], t = y1 === y0 ? 0 : Math.min(1, Math.max(0, (y - y0) / (y1 - y0))); front[i] = z0 + (z1 - z0) * t; }
  return p.skin = { parts, ys, front, dz: ys.map(() => 0), shown: ys.map(() => 0), hinge: 0 };
}
/** Writes the skin's pushes into the panel's vertices (only where a push has changed). */
function skinApply(s: Skin) {
  let moved = false; for (let i = 0; i < s.dz.length; i++) if (Math.abs(s.dz[i] - s.shown[i]) > 2e-4) { moved = true; break; } if (!moved) return;
  const hi = s.ys[0], lo = s.ys[s.ys.length - 1], n = s.ys.length, hinge = hingeOf(s);
  for (const { pa, rest, off } of s.parts) { const a = pa.array as Float32Array;
    // (the hem's meshes take the push at their own height in the tails' frame, less the hinge's, which `carryPanel` has already moved the hem's origin by)
    for (let j = 0; j < rest.length; j += 3) { const u = (hi - rest[j + 1] - off) / (hi - lo) * (n - 1), i = Math.min(n - 2, Math.max(0, Math.floor(u))), f = Math.min(1, Math.max(0, u - i)); a[j + 2] = rest[j + 2] + s.dz[i] + (s.dz[i + 1] - s.dz[i]) * f - (off ? hinge : 0); }
    pa.needsUpdate = true; }
  for (let i = 0; i < n; i++) s.shown[i] = s.dz[i];
}
/** The push at the panel's hinge (the knee). */
function hingeOf(s: Skin) {
  const hy = HINGE, k = (s.ys[0] - hy) / (s.ys[0] - s.ys[s.ys.length - 1]) * (s.ys.length - 1), j = Math.min(s.ys.length - 2, Math.max(0, Math.floor(k)));
  return hy < s.ys[s.ys.length - 1] ? s.dz[s.ys.length - 1] : s.dz[j] + (s.dz[j + 1] - s.dz[j]) * Math.min(1, Math.max(0, k - j));
}
/** A front panel alone on the figure (an apron, the foundry slab) is shaped on the legs this frame (called by `drape`, the legs read into the cloth's frame): at each height the thigh or shin that
 *  reaches it, in front, takes the cloth's front forward to a centimetre ahead of it; where nothing pushes, the cloth hangs as built. The push is a spring of its own when `lively`. */
function shapePanel(p: Panel, d: Drape, dt: number, lively: boolean) {
  const s = skinOf(p); if (!s) return;
  const e = lively ? 1 - Math.exp(-dt * 28) : 1;
  for (let i = 0; i < s.ys.length; i++) { const y = s.ys[i]; let need = -9; for (const l of L) { const c = legAt(l, y, d); if (c) { const up = y <= l.h.y && y >= l.k.y, a = up ? l.h : l.k, b = up ? l.k : l.a, tilt = Math.hypot(a.z - b.z, a.y - b.y) / Math.max(.05, Math.abs(a.y - b.y)); need = Math.max(need, c.z + c.r * tilt); } const dk = y - l.k.y; if (dk < d.knee && dk > -d.knee) need = Math.max(need, l.k.z + Math.sqrt(d.knee * d.knee - dk * dk)); } // (the knee a ball; a leg turned forward is wider across a level cut by 1 / cos of its lean)
    const t = need > -9 ? Math.min(.6, Math.max(0, need + HUG - s.front[i])) : 0; s.dz[i] = t > s.dz[i] ? t : s.dz[i] + (t - s.dz[i]) * e; } // (a leg pushes at once; the cloth settles back on a spring)
  skinApply(s); s.hinge = hingeOf(s);
}
/** Where the panel's hinge is in the part's frame (the knee: wardrobe.ts HEM_Y). */
const HINGE = -.5;
/** A panel alone on a figure that is standing still: it is shaped on the legs as they stand (one may be a step ahead of the other), the cloth settling on a spring. */
export function restPanel(d: Drape, pelvis: T.Object3D, tails: T.Object3D, legs: T.Object3D[], knees: T.Object3D[], ankles: T.Object3D[], dt: number) {
  const p = d.panel; if (!p || !d.garments.length || !d.garments.every(g => g.panel)) return;
  readLegs(pelvis, tails, legs, knees, ankles); D = d; shapePanel(p, d, dt, true);
}
/** The skin put back as built (a seated panel lies by its own rule). */
function skinFlat(p: Panel) { const s = p.skin; if (!s) return; s.dz.fill(0); skinApply(s); s.hinge = 0; }

/** Standing and walking, a front panel is carried exactly as the rest of the long cloth: its part lies square on `tails` and its hinge copies `hem`'s. */
export function carryPanel(p: Panel, hem: T.Object3D | undefined) {
  p.tails.matrixAutoUpdate = true; p.tails.position.set(0, 0, 0); p.tails.rotation.set(0, 0, 0); p.tails.scale.set(1, 1, 1);
  if (p.hem && hem) { p.hem.matrixAutoUpdate = hem.matrixAutoUpdate; p.hem.position.copy(hem.position); p.hem.position.z += p.skin?.hinge ?? 0; p.hem.rotation.copy(hem.rotation); p.hem.scale.copy(hem.scale); if (!hem.matrixAutoUpdate) { p.hem.matrix.copy(hem.matrix); p.hem.matrixWorldNeedsUpdate = true; } } // (seated, the hem's matrix is set: seatLong)
}

/** How close a seated panel lies to what it rests on (the thigh's top, the knee, the shin's front). */
const REST = .004;
/** How far over the knee's middle the fold is (radians round the knee from its front). */
const FOLD = .35;
/** How far past the knee's middle the lap's rounded end reaches, as a part of the knee's radius (it ends on the knee's upper front, where the fold takes it). */
const LAP_END = .6;
/** How much of the knee's radius is the allowance for long cloth swinging past it (drape's `knee` holds 2 cm): a lap lying still on the knee comes this much closer. */
const KNEE_IN = .016;
/** How far the rounded end of a panel's part above the knee reaches past its last band (wardrobe.ts `longShell`: a dome of .07, its last ring at sin(1.3) of that). */
const DOME = .067;
/** A seated panel's hem is flattened a little more than its lap: it hangs as a sheet down the shins, its sides barely turned back. */
const HEM_K = .6;
const PQ = new T.Quaternion(), DN = new T.Vector3(), FW = new T.Vector3(), M1 = new T.Matrix4(), M2 = new T.Matrix4(), PV = new T.Vector3(), PU = new T.Quaternion(), XA = new T.Vector3(1, 0, 0), KS = new T.Vector3();
/** Obstacles for the hem, in the cloth's frame (the sagittal plane, with the leg's x): a point, its radius and the clearance it asks. Reused. */
const obs: { x: number; y: number; z: number; r: number; c: number }[] = []; let no = 0;
const ob = (x: number, y: number, z: number, r: number, c: number) => { const o = obs[no++] ??= { x: 0, y: 0, z: 0, r: 0, c: 0 }; o.x = x; o.y = y; o.z = z; o.r = r; o.c = c; };
/** The thigh's axis and radius at height y of the cloth's frame (seated, the thigh lies along the lap, from the hip at the top to the knee), or null past it. */
function thighAt(p: typeof L[0], y: number, d: Drape) {
  if (y > p.h.y || y < p.k.y || p.h.y - p.k.y < .05) return null;
  const t = (p.h.y - y) / (p.h.y - p.k.y); AT.x = p.h.x + (p.k.x - p.h.x) * t; AT.z = p.h.z + (p.k.z - p.h.z) * t; AT.r = d.thigh + (d.knee - d.thigh) * t; return AT;
}
/** Seated, a front panel is cloth (People XXIV). It was carried as the lap and the hem of the long cloth are: the lap's depth flattened by `tails`' scale, and the hem turned inside that
 *  scale, which sheared it (the hinge's depth unscaled, its length cut to the lap's scale), so an apron was a board 7-13 cm over the thighs that ran on past the knees and dropped a short slab
 *  from there, its hollow inside seen from the side. Now its part above the knee is laid along the thighs' tops (turned from their axis by their taper to the knee) and flattened only until
 *  it rests on them and on the knees, and ends on the knee's upper front; the hinge is placed by its own matrix (the parent's scale undone, so nothing shears) at the front of that lap at the knee, and hangs plumb from there, turned forward of
 *  plumb only as far as the knees and the shins ask: the cloth breaks over the knee and lies down the shins. An apron over a skirt is cut on the skirt's rings and is carried with it. Read in `tails`' own frame (the lap's axis along -y). */
export function seatPanel(d: Drape, pelvis: T.Object3D, tails: T.Object3D, hem: T.Object3D | undefined, legs: T.Object3D[], knees: T.Object3D[], ankles: T.Object3D[]) {
  const pn = d.panel; if (!pn) return; skinFlat(pn);
  // over a skirt the panel is cut on the skirt's own rings (wardrobe.ts `apron`'s `over`): it lies on the skirt's lap and hangs on its hem, carried as they are
  if (d.garments.some(g => !g.panel)) { carryPanel(pn, hem); return; }
  readLegs(pelvis, tails, legs, knees, ankles); PQ.copy(tails.quaternion).invert();
  for (const p of L) for (const o of [p.h, p.k, p.a]) o.applyQuaternion(PQ);
  // the world's down and the figure's forward, in the cloth's frame
  pelvis.getWorldQuaternion(PU); DN.set(0, -1, 0).applyQuaternion(PU.invert()).applyQuaternion(PQ); FW.set(0, 0, 1).applyQuaternion(PQ);
  const sx = tails.scale.x, sz = tails.scale.z;
  // the fold: on the front of the knees, a little over their middle (the cloth comes over the knee's top and is pinned there by its own weight), in the plane of the lap's axis
  const dl0 = Math.hypot(DN.y, DN.z) || 1, dy = DN.y / dl0, dz = DN.z / dl0, fl = FW.y * dy + FW.z * dz, fy0 = FW.y - fl * dy, fz0 = FW.z - fl * dz, fn = Math.hypot(fy0, fz0) || 1, fwy = fy0 / fn, fwz = fz0 / fn;
  const kr = d.knee + REST, ky = (L[0].k.y + L[1].k.y) / 2, kz = (L[0].k.z + L[1].k.z) / 2, pinY = ky + (fwy * Math.cos(FOLD) - dy * Math.sin(FOLD)) * kr, pinZ = kz + (fwz * Math.cos(FOLD) - dz * Math.sin(FOLD)) * kr;
  // the lap lies along the thighs: its axis turned about the waist from the knees' line (where `tails` points it) to the line of the thighs' tops (their slope, and their taper from the
  // hip to the knee), so it rests on them from the hip to the knee rather than bridging from the waist
  const ty = L[0].k.y + L[1].k.y - L[0].h.y - L[1].h.y, tz = L[0].k.z + L[1].k.z - L[0].h.z - L[1].h.z, al = T.MathUtils.clamp(Math.atan2(-tz, -ty) + Math.atan2(d.thigh - d.knee + KNEE_IN, Math.hypot(ty, tz) / 2), -.35, .35);
  const ca = Math.cos(al), sa = Math.sin(al), turn = (o: T.Vector3, sg: number) => { const y = o.y * ca + sg * o.z * sa, z = o.z * ca - sg * o.y * sa; o.y = y; o.z = z; };
  for (const p of L) for (const o of [p.h, p.k, p.a]) turn(o, 1); // (into the lap's frame: R_x(-al))
  // the lap ends over the knee: the rounded end of its part (wardrobe.ts cuts it 3 cm past the hinge and closes it with a dome 6.7 cm deep, which comes down from the lap's front toward
  // its axis, through the knee) reaches the knee's upper front, where the fold takes the cloth down
  const fwl = fwy * ca + fwz * sa, kyl = ky * ca + kz * sa, ly = T.MathUtils.clamp((kyl + fwl * kr * LAP_END) / (d.hinge - .03 - DOME), .75, 1.25);
  // the least depth that rests the lap on the thighs and knees (4 mm more over the thighs: their flesh rises a little over the line drawn through their radii)
  let e = .045;
  for (const g of pn.garments) for (const r of g.up) { const y = r.y * ly; if (r.y > -.08) continue;
    for (const p of L) { const s = thighAt(p, y, d), x = wide(s ? s.x : p.k.x, s ? s.r : d.knee) / sx, fa = at(r, x, true); if (fa <= .01) continue;
      if (s) e = Math.max(e, (s.z + s.r + REST + .004) / fa);
      const dk = y - p.k.y, kn = d.knee - KNEE_IN; if (Math.abs(dk) < kn) e = Math.max(e, (p.k.z + Math.sqrt(kn * kn - dk * dk) + REST) / fa);
    } }
  for (const p of L) for (const o of [p.h, p.k, p.a]) turn(o, -1);
  // its matrix: `tails`' scale undone (so nothing shears), then the turn, the lap's length and its depth
  M2.makeRotationX(al).multiply(M1.makeScale(sx, ly, e)); pn.tails.matrixAutoUpdate = false; pn.tails.matrix.makeScale(1 / sx, 1, 1 / sz).multiply(M2); pn.tails.matrixWorldNeedsUpdate = true;
  if (!pn.hem) return;
  const g = pn.garments.find(q => q.lo.length); if (!g) return;
  // the hinge: its front, on the panel's middle, at the fold
  const lo0 = bandAt(g.lo, 0); if (!lo0) return;
  const ey = pinY, ez = pinZ, f0 = at(lo0, 0, true), low = g.lo[g.lo.length - 1].y;
  // what the hem must clear: each shin (sampled) and the knee
  no = 0;
  for (const p of L) { for (let i = 0; i <= 8; i++) { const t = i / 8; ob(p.k.x + (p.a.x - p.k.x) * t, p.k.y + (p.a.y - p.k.y) * t, p.k.z + (p.a.z - p.k.z) * t, d.knee + (d.calf - d.knee) * t, 0); } } // (the radii already hold a centimetre of trouser and boot)
  // the hem's axis turned δ from plumb toward the front; its depth k (flattened as the lap is); how far it misses
  const uy0 = DN.y, uz0 = DN.z, ul = Math.hypot(uy0, uz0) || 1; let k = Math.min(1, e) * HEM_K, uy = 0, uz = 0, ny = 0, nz = 0, qy = 0, qz = 0;
  const axis = (dl: number) => { const c = Math.cos(dl), s = Math.sin(dl), by = uy0 / ul, bz = uz0 / ul, fy = bz, fz = -by; // (the front of a hem turned by R_x is (u.z, -u.y))
    uy = by * c + fy * s; uz = bz * c + fz * s; ny = uz; nz = -uy; qy = ey - ny * k * f0; qz = ez - nz * k * f0; };
  const miss = (dl: number) => { axis(dl); let w = -1;
    for (let i = 0; i < no; i++) { const o = obs[i], s = (o.y - qy) * uy + (o.z - qz) * uz, hy = -s; if (hy > -.03 || hy < low) continue;
      const b = bandAt(g.lo, hy); if (!b) continue; w = Math.max(w, (o.y - qy) * ny + (o.z - qz) * nz + o.r + o.c - k * at(b, wide(o.x, o.r), true)); }
    return w; };
  // plumb if it clears, otherwise the least turn toward the front that does; if none does, the hem is let out a little
  let dl = 0;
  for (let pass = 0; pass < 6; pass++) { if (miss(0) <= 0) { dl = 0; break; } dl = reach(x => miss(x) > 0, 0, 1.2, 12); if (miss(dl) > 0) dl = Math.min(1.2, dl + 1 / 4096); if (miss(dl) <= 0) break; k *= 1.2; }
  axis(dl);
  // its matrix: the parent's scale undone, then the hinge at q, turned so its length runs down u, its depth k
  const phi = Math.atan2(-uz, -uy);
  M1.copy(M2).invert().multiply(M2.compose(PV.set(0, qy, qz), PU.setFromAxisAngle(XA, phi), KS.set(1, 1, k)));
  pn.hem.matrixAutoUpdate = false; pn.hem.matrix.copy(M1); pn.hem.matrixWorldNeedsUpdate = true;
}

/** The seat a figure sits on (People XXV), in metres from the figure's origin (its feet's pavement is .13 under it): the top .42 over the pavement for every stature (People XIX), the front edge
 *  .305 ahead and the back .185 behind (the game's benches, art-kit.ts `bench`, with the sitter at the bench's origin; the cast sheet's is the same). */
export const SEAT = { top: .42, front: .305, back: -.185, pave: .13 };
/** How far the lining of long cloth is inside its outer face, and how far ahead of the seat's edge a hem falling from the knees keeps its back (so the fold over the edge is seen). */
const LIP = .026, CLEAR = .045;
const SK = [new T.Vector3(), new T.Vector3()], SA = [new T.Vector3(), new T.Vector3()], MP = new T.Matrix4(), MQ = new T.Matrix4(), MC = new T.Matrix4(), MR = new T.Matrix4(), SV = new T.Vector3(), SD = new T.Vector3();
/** Where each part's position was built (a seated part is moved; `unseatLong` puts it back). */
const home = (o: T.Object3D) => (o.userData.home as T.Vector3 | undefined) ?? (o.userData.home = o.position.clone());
/** Squeezes a part's depth to `s` (from `s0`) about its front: its back comes forward by (s0 - s)(f + b) while its front at the reference depth `f` stays where it is. */
function squeeze(o: T.Object3D, s0: number, s: number, f: number) { o.scale.z = s; SD.set(0, 0, (s0 - s) * f).applyEuler(o.rotation); o.position.copy(home(o)).add(SD); o.updateMatrix(); }
/** The largest depth in [lo, s0] for which `ok` holds (ok(lo) is taken to hold): a bisection. */
function deepest(ok: (s: number) => boolean, lo: number, s0: number) { if (ok(s0)) return s0; let a = lo, b = s0; for (let i = 0; i < 10; i++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; } return a; }
/** Seated, long cloth stays out of the seat (People XXV). The lap lies along the thighs (`seatCloth`) and its underside, flattened as a whole to a lap, still dipped 2-3 cm into the plank under
 *  the thighs where the cloth is deep (a short jacket's skirt, an elder's coat); and the cloth below the knee, hung along the shins at .8 of its depth, kept its back as far behind the shins as a
 *  bell is, so a full skirt's and a greatcoat's hem came down through the seat's front edge and on below it (up to 4.4 cm into the plank). Now the underside of the lap rests on the seat
 *  wherever it is over it, and each hem's back hangs a little ahead of the seat's edge, the cloth folding over the edge: each part's depth is taken in about its front (a scale and a shift along
 *  its depth, so its front stays on the thighs and before the shins) just as far as that asks, and no further. Read in the figure's own frame, where the seat is. */
export function seatLong(d: Drape, group: T.Object3D, pelvis: T.Object3D, tails: T.Object3D, hem: T.Object3D | undefined, legs: T.Object3D[], knees: T.Object3D[], ankles: T.Object3D[]) {
  const gs = [...d.garments, ...(d.split?.garments ?? [])].filter(g => !g.panel); if (!gs.length) return;
  const k = group.scale.y || 1, top = (SEAT.top - SEAT.pave) / k, front = SEAT.front / k, back = SEAT.back / k;
  pelvis.updateMatrix(); home(tails);
  // the shins, in the figure's frame: each knee and ankle, and a shin's axis and radius at a point's height (the leg itself: the knee and calf radii without the allowance a walking leg
  // asks of long cloth), or -1 where it does not reach
  for (let i = 0; i < 2; i++) { legs[i].updateMatrix(); knees[i].updateMatrix(); ankles[i].updateMatrix(); MQ.multiplyMatrices(legs[i].matrix, knees[i].matrix);
    SK[i].setFromMatrixPosition(MQ); SA[i].setFromMatrixPosition(MQ.multiply(ankles[i].matrix)); }
  const shin = (p: T.Vector3, i: number) => { const K = SK[i], A = SA[i]; if (p.y > K.y || p.y < A.y || K.y - A.y < .05) return -1; const t = (K.y - p.y) / (K.y - A.y);
    return { z: K.z + (A.z - K.z) * t, r: d.knee - .02 + (d.calf - d.knee + .008) * t }; };
  // the lap: its underside (each band's back, to its outer face) is over the seat nowhere lower than its top. It is taken in about its own axis (its front comes down as far as its back
  // comes up: seated, the lap is far deeper than the thighs it lies on), but where its end, past the knee, comes down over the front of a shin it is not drawn up off it (a short coat's
  // lap is what covers the shin's front under the knee, and drawn up it bared a strip of the shin over a heel lifted in the eat)
  const s0 = tails.scale.z, lapAt = (s: number, f: (p: T.Vector3) => boolean) => { squeeze(tails, s0, s, 0); MP.multiplyMatrices(pelvis.matrix, tails.matrix);
    for (const g of gs) for (const r of g.up) { if (!f(SV.set(0, r.y, r.z - r.b - LIP).applyMatrix4(MP))) return false; } return true; };
  const before = (p: T.Vector3) => { for (let i = 0; i < 2; i++) { const c = shin(p, i); if (c !== -1 && p.z > c.z && p.z < c.z + c.r + .005) return true; } return false; };
  // (the lowest a hem's front comes: under that, a shin's front is the lap's to cover)
  let low = Infinity; MP.multiplyMatrices(pelvis.matrix, tails.matrix);
  const hems: [T.Object3D | undefined, T.Object3D | undefined, Garment[]][] = [[undefined, hem, d.garments], ...(d.split ? [d.split.front, d.split.back].map(q => [q.tails, q.hem, d.split!.garments] as [T.Object3D, T.Object3D | undefined, Garment[]]) : [])];
  for (const [pt, h, lo] of hems) if (h) { h.updateMatrix(); MQ.copy(MP); if (pt) { pt.updateMatrix(); MQ.multiply(pt.matrix); } MQ.multiply(h.matrix);
    for (const g of lo) if (!g.panel && g.lo.length) { const r = g.lo[g.lo.length - 1]; low = Math.min(low, SV.set(0, r.y, r.z + r.f).applyMatrix4(MQ).y); } }
  /** the lowest the lap's end comes over the front of a shin */
  const end = (s: number) => { let y = Infinity; lapAt(s, p => { if (before(p)) y = Math.min(y, p.y); return true; }); return y; };
  const seat = (s: number) => lapAt(s, p => !(p.z > back && p.z < front && p.y < top + .002));
  // nor is it taken in past the thighs: with the seated knees parted (People XXVI), a thigh's outer side runs out toward the lap's side, where a lap taken in about its axis is
  // narrower at the thigh's height, and the thigh came through it. So it is taken in no further than keeps the leg itself (from 15 cm past the hip to the knee) from passing out through
  // its lining: no point round a thigh's top and outer side is outside the lap where the line from it in to the thigh's axis is inside
  const TH: [T.Vector3, T.Vector3][] = []; for (let i = 0; i < 2; i++) { const H = legs[i].position, K = SK[i], sx = Math.sign(H.x) || (i ? -1 : 1);
    for (const t of [.35, .5, .65, .8, .95]) { const r = (d.thigh - .014) * (1 - t) + (d.knee - .02) * t, A = new T.Vector3().lerpVectors(H, K, t);
      for (const a of [0, .5, 1, Math.PI / 2, 2.1]) TH.push([A.clone().add(SV.set(sx * Math.cos(a) * r, Math.sin(a) * r, 0)), A]); } }
  const inLap = (p: T.Vector3) => { SV.copy(p).applyMatrix4(MR); for (const g of gs) { const r = bandAt(g.up, SV.y); if (r && Math.abs(SV.x) < r.w && SV.z < at(r, SV.x, true) && SV.z > -at(r, SV.x, false)) return true; } return false; };
  const covered = (s: number) => { squeeze(tails, s0, s, 0); MR.multiplyMatrices(pelvis.matrix, tails.matrix).invert();
    for (const [P, A] of TH) if (!inLap(P) && [.25, .5, .75, 1].some(u => inLap(SD.copy(P).lerp(A, u)))) return false; return true; };
  let sl = deepest(seat, s0 * .35, s0);
  if (sl < s0 && !covered(sl)) { if (!covered(s0)) sl = s0; else { let a = sl, b = s0; for (let i = 0; i < 10; i++) { const m = (a + b) / 2; if (covered(m)) b = m; else a = m; } sl = b; } }
  const e0 = end(s0), e1 = end(sl);
  // drawn up, the lap's end may stop over a shin's front above where it hung and under the hem's lowest (a short coat's: its lap's end is what came down over the shin under the knee):
  // there the hems are let down to it, or a strip of the shin would show under the lap
  const down = sl < s0 && e0 < low && e1 > e0 + .001 && e1 < low ? low - e1 + .01 : 0;
  squeeze(tails, s0, sl, 0);
  MP.multiplyMatrices(pelvis.matrix, tails.matrix);
  // what hangs from the lap is not taken in with it: its matrix is taken back through the change (MC, in the lap's own frame), so the cloth below the knee stays as it was
  MC.compose(tails.position, tails.quaternion, KS.set(tails.scale.x, tails.scale.y, s0)).premultiply(MR.copy(tails.matrix).invert());
  // the hems: below the seat's top, the back is ahead of its edge; but it still closes behind the calves (where a calf is behind the seat's edge, the calf wins: the cloth is on the edge)
  const hang = (h: T.Object3D, parent: T.Matrix4, lo: Garment[]) => { const k0 = h.scale.z, fh = Math.max(...lo.flatMap(g => g.lo.map(r => r.z + r.f))); home(h);
    if (down) { const len = -Math.min(...lo.flatMap(g => g.lo.map(r => r.y))); h.scale.y = (len + down) / len; } // (about its fullest front, so no front of it comes back toward the shins)
    let j = 0; const was: number[] = [], each = (s: number, f: (p: T.Vector3) => boolean) => { squeeze(h, k0, s, fh); MQ.multiplyMatrices(parent, MC).multiply(h.matrix); j = 0;
      for (const g of lo) for (const r of g.lo) { if (!f(SV.set(0, r.y, r.z - r.b - LIP).applyMatrix4(MQ))) return false; } return true; };
    each(k0, p => { was[j] = p.z; return true; });
    const seat = (s: number) => each(s, p => p.y >= top + .005 || p.z >= front + CLEAR);
    // (a back already ahead of a calf is not taken in further there)
    const calves = (s: number) => each(s, p => { for (let i = 0; i < 2; i++) { const c = shin(p, i); if (c !== -1 && p.z > Math.max(was[j] + 1e-4, c.z - c.r - LIP)) return false; } return true; });
    const least = calves(k0 * .3) ? k0 * .3 : k0 - deepest(s => calves(k0 - s), 0, k0 * .7); // (the most the calves allow it to be taken in)
      squeeze(h, k0, Math.max(least, deepest(seat, k0 * .3, k0)), fh); h.matrix.premultiply(MC); h.matrixAutoUpdate = false; h.matrixWorldNeedsUpdate = true; };
  if (hem && d.garments.some(g => !g.panel && g.lo.length)) hang(hem, MP, d.garments.filter(g => !g.panel && g.lo.length));
  const sp = d.split; if (sp) for (const p of [sp.front, sp.back]) if (p.hem) { p.tails.updateMatrix(); hang(p.hem, new T.Matrix4().multiplyMatrices(MP, p.tails.matrix), sp.garments); }
}
/** How far ahead of a shin's front a seated hem may stand (an apron over a skirt, on the skirt's own: `extra`). */
const FALL = .03;
/** A hem's meshes with their vertices as built, kept so the seated fall can be written from them each frame (`seatFall`), and whether it is applied now. */
interface Fall { rest: Float32Array; on: boolean }
const FW1 = new T.Matrix4(), FW2 = new T.Matrix4(), FV = new T.Vector3(), FK = [new T.Vector3(), new T.Vector3()], FA = [new T.Vector3(), new T.Vector3()], fallRows = new Map<number, number>();
const fallOf = (m: T.Mesh) => (m.userData.fall ??= (() => { m.geometry = m.geometry.clone(); return { rest: Float32Array.from(m.geometry.attributes.position.array as Float32Array), on: false } as Fall; })()) as Fall;
/** Seated, the hem below the knee falls on the shins (People XXIX). A hem is built as a bell, 40-50 cm deep, and the calves ask it to keep its back round them, so with its front kept where it was built
 *  it stood 14-25 cm ahead of the shins, a flat plank down from the knees. Each frame, in the figure's frame, the part of every hem vertex ahead of the shin's axis is taken in by one ratio for its
 *  height (the front row of the hem at that height comes to a shin's front plus `FALL`, the rest in proportion, so a lining keeps its thickness), and what is behind the axis is left where the
 *  calves and the seat want it. Standing, the hems are put back as built. `parts` are the hems' roots, each with how much further ahead of the shin it stands (an apron's over a skirt's). */
export function seatFall(d: Drape, group: T.Object3D, parts: [T.Object3D | undefined, number, T.Object3D[]?][], legs: T.Object3D[], knees: T.Object3D[], ankles: T.Object3D[], seated: boolean) {
  const meshes: [T.Mesh, number, boolean][] = []; for (const [root, extra, skip] of parts) { const out = new Set<T.Object3D>(); for (const k of skip ?? []) k.traverse(o => out.add(o)); root?.traverse(o => { if (o instanceof T.Mesh && o.geometry.attributes.position && !out.has(o)) meshes.push([o, extra, !!skip]); }); }
  if (!meshes.length) return;
  if (!seated) { for (const [m] of meshes) { const f = m.userData.fall as Fall | undefined; if (f?.on) { (m.geometry.attributes.position.array as Float32Array).set(f.rest); m.geometry.attributes.position.needsUpdate = true; f.on = false; } } return; }
  group.updateMatrixWorld(true); FW1.copy(group.matrixWorld).invert();
  for (let i = 0; i < 2; i++) { legs[i].updateMatrix(); knees[i].updateMatrix(); ankles[i].updateMatrix(); MQ.multiplyMatrices(legs[i].matrix, knees[i].matrix); FK[i].setFromMatrixPosition(MQ); FA[i].setFromMatrixPosition(MQ.multiply(ankles[i].matrix)); }
  // the shin nearest a point sideways: its axis' depth and radius (the leg itself, as in `seatLong`) at the point's height, clamped to the knee and the ankle
  const axis = (x: number, y: number, extra: number) => { const i = Math.abs(FK[0].x - x) < Math.abs(FK[1].x - x) ? 0 : 1, K = FK[i], A = FA[i], t = Math.min(1, Math.max(0, (K.y - y) / Math.max(.05, K.y - A.y)));
    AXZ = K.z + (A.z - K.z) * t; AXR = d.knee - .02 + (d.calf - d.knee + .008) * t + FALL + extra; };
  for (const [m, extra, lap] of meshes) { const f = fallOf(m), pa = m.geometry.attributes.position as T.BufferAttribute, a = pa.array as Float32Array, n = pa.count;
    FW2.multiplyMatrices(FW1, m.matrixWorld); const inv = new T.Matrix4().copy(FW2).invert(), P = new Float32Array(n * 3);
    fallRows.clear();
    for (let j = 0; j < n; j++) { FV.set(f.rest[j * 3], f.rest[j * 3 + 1], f.rest[j * 3 + 2]).applyMatrix4(FW2); P[j * 3] = FV.x; P[j * 3 + 1] = FV.y; P[j * 3 + 2] = FV.z;
      if (lap || FV.y > Math.max(FK[0].y, FK[1].y) + .12) continue; axis(FV.x, FV.y, extra); const dz = FV.z - AXZ, r = Math.round(FV.y * 200); if (dz > (fallRows.get(r) ?? 0)) fallRows.set(r, dz); }
    for (let j = 0; j < n; j++) { FV.set(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]);
      if (lap) { const lim = Math.max(FK[0].z, FK[1].z) + d.knee - .02 + FALL + extra; if (FV.y <= Math.max(FK[0].y, FK[1].y) + .2 && FV.z > lim) FV.z = lim; } // (the lap ends on the knee's front, where the hem takes the cloth down)
      else if (FV.y <= Math.max(FK[0].y, FK[1].y) + .12) { axis(FV.x, FV.y, extra); const dz = FV.z - AXZ, top = fallRows.get(Math.round(FV.y * 200)) ?? 0; if (dz > 0 && top > AXR) FV.z = AXZ + dz * AXR / top; }
      FV.applyMatrix4(inv); a[j * 3] = FV.x; a[j * 3 + 1] = FV.y; a[j * 3 + 2] = FV.z; }
    pa.needsUpdate = true; f.on = true; }
}
let AXZ = 0, AXR = 0;

/** Every part seated cloth moved, back where it was built (each frame before the seated cloth is placed, and standing again). */
export function unseatLong(d: Drape, tails: T.Object3D, hem: T.Object3D | undefined) {
  for (const o of [tails, hem, d.split?.front.hem, d.split?.back.hem]) if (o?.userData.home) { o.position.copy(o.userData.home as T.Vector3); o.scale.y = 1; o.matrixAutoUpdate = true; }
}
