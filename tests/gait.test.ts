import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN, footing, settle, HEEL_X, TOE_X, SOLE, HIP, L1, L2, STANCE, pose, walk, advance, ik, kneeAt, pitchAt, legZ, type Params, type Pose } from '../src/simulation/gait.ts';

const LEG = .84, stride = (speed: number) => Math.min(.6, Math.min(.42, Math.max(.12, .16 + .3 * speed)) + Math.max(0, speed - 1.2) * .1);
/** Steady-walk parameters at a speed; `reach` can be forced. `S` is the distance of a cycle, `at` makes the footing steady at phase `u`. */
const mk = (speed: number, over: { stance?: number; reach?: number; knee?: number; boot?: readonly [number, number] } = {}) => {
  const stance = over.stance ?? STANCE, X = over.reach ?? LEG * stride(speed) * stance / STANCE, st = footing();
  return { p: { stance, want: X, clear: .07, knee: over.knee ?? 1, pelvis: 1, heel: over.boot?.[0], toe: over.boot?.[1] } as Params, S: 2 * X / stance, at: (u: number) => (settle(st, X, stance, u), st) };
};
/** Forward kinematics: for each leg, where the sole's back and front edges are over the ground (`hx`, `bx`: constant while that edge is planted and not slipping) and how high
 * (`hy`, `by`), the toe tip's height with the sole's thickness under it (`tip`), and the pitch. `px` is the hip centre's world x. The sole is flat between its edges, so its lowest point
 * is always one of them. */
function feet(p: Params, st: Float64Array, u: number, px: number, o: Pose) {
  walk(p, st, u, o); const out = [];
  for (let k = 0; k < 2; k++) {
    const hx = (k ? -HIP : HIP) * Math.sin(o.yaw), hy = (k ? 1 : -1) * HIP * Math.sin(o.roll), t = o.thigh[k], f = o.knee[k], th = o.foot[k];
    const ax = px + hx + L1 * Math.sin(t) + L2 * Math.sin(t - f), ay = o.H + hy - L1 * Math.cos(t) - L2 * Math.cos(t - f), c = Math.cos(th), s = Math.sin(th);
    const edge = (x: number) => ({ x: ax + x * c - SOLE * s, y: ay - x * s - SOLE * c }), h = edge(p.heel ?? HEEL_X), b = edge(p.toe ?? TOE_X);
    out.push({ hx: h.x, hy: h.y, bx: b.x, by: b.y, tip: b.y, th, u: (u + k * .5) % 1 });
  }
  return out;
}
const speeds = [.12, .3, .6, 1, 1.5, 2.9], steps = 400;
/** the sole's back and front edges of the smallest, the standard and the largest boot the casts wear (people/parts.ts `foot`, scaled with the shoe) */
const BOOTS = [[-.064, .213], [HEEL_X, TOE_X], [-.075, .249]] as const;

test('the planted foot does not slip: it rolls on the back edge of its heel, then on the tip of its toe, without sliding', () => {
  for (const sp of speeds) for (const boot of BOOTS) for (const over of [{ boot }, { stance: .58, boot }, { stance: .64, heel: .6, boot }]) {
    const m = mk(sp, over), p = m.p, o = pose(); let heel0 = NaN, ball0 = NaN, dh = 0, db = 0;
    for (let i = 0; i < steps; i++) { const u = i / steps, f = feet(p, m.at(u), u, m.S * u, o)[0];
      if (f.th <= 0 && f.u < .3) { if (isNaN(heel0)) heel0 = f.hx; dh = Math.max(dh, Math.abs(f.hx - heel0)); }
      if (f.th >= 0 && f.u > .12 && f.u < p.stance) { if (isNaN(ball0)) ball0 = f.bx; db = Math.max(db, Math.abs(f.bx - ball0)); } }
    assert.ok(dh < .001 && db < .001, `speed ${sp} ${JSON.stringify(over)}: heel slip ${dh}, ball slip ${db}`);
  }
});
test('no point of the sole goes below the ground in stance (the toe tip counted with the sole under it), and the swing toe clears it', () => {
  // People XXI: the tip was checked as the ankle less .207 x the pitch's sine, leaving out the sole under it; with the sole, the old forefoot arc put the toe 3.4-4.7 cm into the pavement at heel-off
  for (const sp of speeds) for (const boot of BOOTS) { const m = mk(sp, { boot }), p = m.p, o = pose(); let low = 9, clear = 9, mid = 9;
    for (let i = 0; i < steps; i++) { const u = i / steps, f = feet(p, m.at(u), u, m.S * u, o)[0], lowest = Math.min(f.hy, f.by, f.tip);
      if (f.u < p.stance) { assert.ok(Math.abs(lowest) < .006, `speed ${sp} boot ${boot} u ${f.u}: sole ${lowest}`); low = Math.min(low, lowest); }
      else { clear = Math.min(clear, lowest); if (f.u > .74 && f.u < .88) mid = Math.min(mid, lowest); } }
    assert.ok(low > -.001 && mid > .03 && clear > -.004, `speed ${sp} boot ${boot}: low ${low} clear ${clear} mid ${mid}`);
  }
});
test('the foot is never toe-down in mid-swing and the knee has bent', () => {
  for (let u = .76; u <= .9; u += .01) assert.ok(pitchAt(u) <= 2.5, `pitch ${pitchAt(u)} at ${u}`);
  const m = mk(.6), o = pose(); let knee = 0; for (let i = 0; i < steps; i++) { walk(m.p, m.at(i / steps), i / steps, o); knee = Math.max(knee, o.knee[0]); }
  assert.ok(knee > .8 && knee < 1.4, `swing knee peak ${knee}`);
});
test('no NaN at rest, at the reach clamp or at the intro speed', () => {
  const o = pose(), cases = [mk(0, { reach: 0 }), mk(2.9), mk(3), mk(1, { reach: 1.4 }), mk(1, { reach: .6, knee: 0 })];
  for (const m of cases) for (let i = 0; i < steps; i++) { walk(m.p, m.at(i / steps), i / steps, o); for (const v of [o.H, o.yaw, o.roll, o.sway, ...o.thigh, ...o.knee, ...o.ankle]) assert.ok(Number.isFinite(v)); }
  const t = new Float64Array(1); assert.ok(Number.isFinite(ik(5, 0, t, 0)) && Number.isFinite(t[0]) && Number.isFinite(ik(0, 0, t, 0)) && Number.isFinite(ik(0, -1, t, 0)));
});
test('the curves close on themselves and the pose is continuous across the cycle', () => {
  assert.ok(Math.abs(kneeAt(0) - kneeAt(.99999)) < .01 && Math.abs(pitchAt(0) - pitchAt(.99999)) < .01);
  const m = mk(.6), a = pose(), b = pose(); walk(m.p, m.at(0), 0, a); walk(m.p, m.at(.9999999), .9999999, b);
  for (const k of [0, 1]) for (const f of ['thigh', 'knee', 'ankle'] as const) assert.ok(Math.abs(a[f][k] - b[f][k]) < .01, `${f}[${k}]`);
  assert.ok(Math.abs(a.H - b.H) < .001);
  for (let i = 0; i < steps; i++) { walk(m.p, m.at(i / steps), i / steps, a); walk(m.p, m.at((i + 1) / steps), (i + 1) / steps, b); for (const k of [0, 1]) for (const f of ['thigh', 'knee', 'ankle'] as const) assert.ok(Math.abs(a[f][k] - b[f][k]) < .12, `${f} jumps at ${i}`); }
  assert.equal(legZ(0, STANCE), 1); assert.ok(Math.abs(legZ(.9999, STANCE) - 1) < .01);
});
/** Drives the clock as animateLife does: a route that eases out and in (1.1 m/s²), a stand-start after turning in place, and a stop. Returns the worst slip of any stance. */
function ramp(top: number, turnFirst: number) {
  const dt = 1 / 60, o = pose(), st = footing(), p: Params = { stance: STANCE, want: 0, clear: .07, knee: 1, pelvis: 1 };
  let u = .3, px = 0, v = 0, ms = 0, worst = 0, cruise = 0, sole = 0; const track: { u: number; hx: number; bx: number }[][] = [[], []], phase = [Math.floor(u), Math.floor(u + .5)];
  const total = turnFirst + 2 * top / 1.1 + 5, brake = top * top / (2 * 1.1), span = (a: number[]) => a.length > 2 ? Math.max(...a) - Math.min(...a) : 0;
  for (let t = 0; t < total; t += dt) {
    const turning = t < turnFirst, goal = turning ? 0 : cruise < 6 - brake ? top : 0;
    v = goal > v ? Math.min(goal, v + 1.1 * dt) : Math.max(goal, v - 1.1 * dt); if (!turning) cruise += v * dt;
    ms += (v - ms) * Math.min(1, dt * 8); p.want = turning ? MIN : LEG * stride(ms);
    u = advance(st, u, v * dt, dt, p.want, STANCE, turning ? 2.4 / (Math.PI * 2) : 0); px += v * dt;
    const f = feet(p, st, u, px, o);
    for (let k = 0; k < 2; k++) { const fl = Math.floor(u + .5 * k);
      if (fl !== phase[k]) { phase[k] = fl; const seg = track[k];
        if (seg.length > 20) worst = Math.max(worst, span(seg.filter(s => s.u < .3).map(s => s.hx)), span(seg.filter(s => s.u > .12 && s.u < .55).map(s => s.bx))); track[k] = []; }
      if (!turning && f[k].u < STANCE && f[k].u > .02) sole = Math.max(sole, Math.abs(Math.min(f[k].hy, f[k].by)));
      if (!turning && f[k].u < STANCE) track[k].push({ u: f[k].u, hx: f[k].hx, bx: f[k].bx }); }
  }
  return Math.max(worst, sole > .012 ? sole : 0);
}
test('a planted foot stays planted, and on the ground, through starts, stops, ramps and a turn-in-place', () => {
  for (const top of [.3, .6, 1.2]) for (const turn of [0, 2]) { const slip = ramp(top, turn); assert.ok(slip < .002, `top ${top} turn ${turn}: slip ${slip}`); }
});
