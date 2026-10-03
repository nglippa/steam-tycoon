// A walk built from the foot up. Each leg has a phase u in 0..1 (heel contact at 0, toe-off at `stance`). In stance the sole is pinned to the
// ground and rolls heel, flat, ball, so the ankle moves back at exactly the ground speed; in swing the ankle travels from toe-off to the next contact
// with real clearance. A planar two-bone IK turns the ankle path into hip and knee angles, the foot's ground-relative pitch becomes the ankle angle,
// and the pelvis rides at the height the stance legs allow. Positive angles: knee flexes backward, foot pitch is toe-down.
export const L1 = .43, L2 = .495, SOLE = .052, HIP = .09, STANCE = .62, REST = .97;
/** The boot's sole rolls on two arcs (radius `r`, centred over the flat sole at `x` ahead of the ankle): the heel's, small, and the forefoot's, wide enough to lie under the toe cap. */
export const HEEL = { x: -.015, r: .04 }, BALL = { x: .065, r: .33 };
const REACH = .9985 * (L1 + L2), DEG = Math.PI / 180, N = 512, TAU = Math.PI * 2;
/** What a person's walk is made of: `reach` is half the stance sweep (m), `heel` scales the foot roll, `pelvis` scales yaw, roll and sway, `knee` the stance flexion. */
export interface Params { stance: number; reach: number; clear: number; knee: number; heel: number; pelvis: number }
/** One frame of walk. Per-leg values are [left, right]; `ankle` is the joint angle, `foot` the ground-relative pitch. `x`, `y`: ankle relative to the hip centre line, and above ground. */
export interface Pose { H: number; yaw: number; roll: number; sway: number; thigh: Float64Array; knee: Float64Array; ankle: Float64Array; foot: Float64Array; x: Float64Array; y: Float64Array }
export const pose = (): Pose => ({ H: REST, yaw: 0, roll: 0, sway: 0, thigh: new Float64Array(2), knee: new Float64Array(2), ankle: new Float64Array(2), foot: new Float64Array(2), x: new Float64Array(2), y: new Float64Array(2) });
const KNEE = [[0, 4], [.06, 18], [.2, 7], [.35, 5], [.45, 14], [.55, 35], [.62, 42], [.72, 62], [.8, 45], [.88, 20], [.96, 6], [1, 4]];
const PITCH = [[0, -8], [.06, 0], [.12, 0], [.3, 0], [.4, 8], [.5, 16], [.62, 26], [.7, 8], [.76, 2], [.82, 0], [.9, -2], [.97, -6], [1, -8]];
/** A monotone cubic through the knots (no overshoot in the flat stretches), closed on itself, sampled once. */
function curve(k: number[][]) {
  const n = k.length, h: number[] = [], s: number[] = [], d: number[] = [], t = new Float32Array(N + 1);
  for (let i = 0; i < n - 1; i++) { h[i] = k[i + 1][0] - k[i][0]; s[i] = (k[i + 1][1] - k[i][1]) / h[i]; }
  const slope = (a: number, b: number, ha: number, hb: number) => a * b <= 0 ? 0 : 3 * (ha + hb) / ((2 * hb + ha) / a + (hb + 2 * ha) / b);
  for (let i = 1; i < n - 1; i++) d[i] = slope(s[i - 1], s[i], h[i - 1], h[i]);
  d[0] = d[n - 1] = slope(s[n - 2], s[0], h[n - 2], h[0]);
  for (let j = 0, i = 0; j <= N; j++) {
    const u = j / N; while (i < n - 2 && u > k[i + 1][0]) i++;
    const x = (u - k[i][0]) / h[i], x2 = x * x, x3 = x2 * x;
    t[j] = (2 * x3 - 3 * x2 + 1) * k[i][1] + (x3 - 2 * x2 + x) * h[i] * d[i] + (-2 * x3 + 3 * x2) * k[i + 1][1] + (x3 - x2) * h[i] * d[i + 1];
  }
  return t;
}
const KNEE_T = curve(KNEE), PITCH_T = curve(PITCH);
const at = (t: Float32Array, u: number) => { const x = (u - Math.floor(u)) * N, i = x | 0, f = x - i; return t[i] + (t[i + 1] - t[i]) * f; };
export const kneeAt = (u: number) => at(KNEE_T, u), pitchAt = (u: number) => at(PITCH_T, u);
const ramp = (x: number) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x), smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k / 4; };
/** Where the leg is in a stride, -1 (back) to 1 (forward), for the arms and forearms to follow. */
export function legZ(u: number, stance: number) { u -= Math.floor(u); return u < stance ? 1 - 2 * u / stance : -1 + 2 * ramp((u - stance) / (1 - stance)); }
/** Two-bone IK in the leg's plane: the ankle `x` ahead of and `h` below the hip. Writes thigh (forward) and knee flexion; the reach is clamped, never NaN. */
export function ik(x: number, h: number, o: Float64Array, i: number) {
  const D = Math.min(REACH, Math.max(.3, Math.hypot(x, h))), phi = Math.PI - Math.acos((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2));
  o[i] = Math.atan2(x, h) + Math.atan2(L2 * Math.sin(phi), L1 + L2 * Math.cos(phi)); return phi;
}
const foot0 = new Float64Array(3), foot1 = new Float64Array(3);
/** The ankle (x, y) and foot pitch during stance (u < stance). A flat foot's ankle rides back with the ground; pitched, the sole rolls on its heel or forefoot
 * arc without slipping (the arc's centre moves r*pitch along the ground), so the material in contact stays put. */
function planted(u: number, p: Params, o: Float64Array) {
  const th = at(PITCH_T, u) * DEG * p.heel, a = th <= 0 ? HEEL : BALL, back = p.reach * (1 - 2 * u / p.stance), c = Math.cos(th), s = Math.sin(th);
  o[0] = back + a.x + a.r * th - a.x * c - (a.r - SOLE) * s; o[1] = a.r + a.x * s + (SOLE - a.r) * c; o[2] = th;
}
/** The foot's place for one leg: planted in stance, a Hermite arc from toe-off to the next contact (carrying the ground's speed at both ends) in swing. */
function place(u: number, p: Params, o: Float64Array) {
  if (u < p.stance) return planted(u, p, o);
  planted(p.stance, p, foot0); planted(0, p, foot1);
  const t = (u - p.stance) / (1 - p.stance), t2 = t * t, t3 = t2 * t, m = -2 * p.reach / p.stance * (1 - p.stance);
  o[0] = (2 * t3 - 3 * t2 + 1) * foot0[0] + (t3 - 2 * t2 + t) * m + (-2 * t3 + 3 * t2) * foot1[0] + (t3 - t2) * m;
  o[1] = foot0[1] + (foot1[1] - foot0[1]) * t2 * (3 - 2 * t) + p.clear * Math.sin(Math.PI * t); o[2] = at(PITCH_T, u) * DEG * p.heel;
}
const spot = new Float64Array(3), hipUp = new Float64Array(2), gap = new Float64Array(2), YAW = .075, RHO = .0055, SWAY = .028;
/** One pose of the walk at cycle phase `u` (the left leg's; the right is half a cycle behind). */
export function walk(p: Params, u: number, o: Pose) {
  u -= Math.floor(u); const k = p.pelvis, yaw = YAW * k * Math.cos(TAU * u), sy = Math.sin(yaw);
  o.yaw = yaw; o.sway = -SWAY * k * Math.sin(TAU * u); hipUp[0] = RHO * k * Math.sin(TAU * u); hipUp[1] = -hipUp[0]; o.roll = Math.asin(hipUp[1] / HIP);
  for (let leg = 0; leg < 2; leg++) {
    const v = u + leg * .5 - Math.floor(u + leg * .5), hz = leg ? -HIP * sy : HIP * sy;
    place(v, p, spot); o.x[leg] = spot[0] - hz; o.y[leg] = spot[1]; o.foot[leg] = spot[2];
    // The stance legs set the pelvis: each, as flexed by its curve (the pre-swing bend comes out of the IK instead), can hold the hip this high; a foot that is leaving the ground (or has not yet come down) stops counting, smoothly.
    const phi = (v < .45 ? at(KNEE_T, v) : Math.min(at(KNEE_T, v), 14)) * DEG * p.knee, lift = .15 * (v < p.stance + .1 ? ramp((v - p.stance) / .1) : v < .76 ? 1 : 1 - ramp((v - .76) / .24));
    gap[leg] = spot[1] - hipUp[leg] + Math.sqrt(Math.max(L1 * L1 + L2 * L2 + 2 * L1 * L2 * Math.cos(phi) - o.x[leg] * o.x[leg], .01)) + lift;
  }
  o.H = smin(gap[0], gap[1], .06);
  for (let leg = 0; leg < 2; leg++) { const phi = ik(o.x[leg], o.H + hipUp[leg] - o.y[leg], o.thigh, leg); o.knee[leg] = phi; o.ankle[leg] = o.foot[leg] + o.thigh[leg] - phi; }
}
