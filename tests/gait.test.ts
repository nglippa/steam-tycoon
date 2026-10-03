import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEEL, BALL, SOLE, HIP, L1, L2, STANCE, pose, walk, ik, kneeAt, pitchAt, legZ, type Params } from '../src/simulation/gait.ts';

const LEG = .84, mk = (speed: number, over: Partial<Params> = {}): Params & { S: number } => {
  const A = Math.min(.42, Math.max(.12, .16 + .3 * speed)), stance = over.stance ?? STANCE;
  return { stance, reach: LEG * A * stance / STANCE, clear: .07, knee: 1, heel: 1, pelvis: 1, S: 2 * LEG * A / STANCE, ...over };
};
/** Forward kinematics: for each leg, how far each rolling arc has travelled over the ground (its centre's world x less the arc length rolled; constant while the
 * arc is planted and not slipping) and its lowest height, the toe tip's height, and the pitch. The hip centre advances `S` per cycle. */
function feet(p: ReturnType<typeof mk>, u: number, o = pose()) {
  walk(p, u, o); const out = [];
  for (let k = 0; k < 2; k++) {
    const hx = (k ? -HIP : HIP) * Math.sin(o.yaw), hy = (k ? 1 : -1) * HIP * Math.sin(o.roll), t = o.thigh[k], f = o.knee[k], th = o.foot[k];
    const ax = p.S * u + hx + L1 * Math.sin(t) + L2 * Math.sin(t - f), ay = o.H + hy - L1 * Math.cos(t) - L2 * Math.cos(t - f), c = Math.cos(th), s = Math.sin(th);
    const arc = (a: { x: number; r: number }) => { const cx = a.x, cy = -SOLE + a.r;
      return { x: ax + cx * c + cy * s - a.r * th, low: ay + (-cx * s + cy * c) - a.r }; };
    const h = arc(HEEL), b = arc(BALL);
    out.push({ hx: h.x, hy: h.low, bx: b.x, by: b.low, tip: ay - .207 * s, th, u: (u + k * .5) % 1 });
  }
  return out;
}
const speeds = [.12, .3, .6, 1, 1.5, 2.9], steps = 400;

test('the planted foot does not slip: its heel arc, then its forefoot arc, roll without sliding', () => {
  for (const sp of speeds) for (const over of [{}, { stance: .58 }, { stance: .64, heel: .6 }]) {
    const p = mk(sp, over), o = pose(); let heel0 = NaN, ball0 = NaN, dh = 0, db = 0;
    for (let i = 0; i < steps; i++) { const u = i / steps * 1, f = feet(p, u, o)[0];
      if (f.th <= 0 && f.u < .3) { if (isNaN(heel0)) heel0 = f.hx; dh = Math.max(dh, Math.abs(f.hx - heel0)); }
      if (f.th >= 0 && f.u > .12 && f.u < p.stance) { if (isNaN(ball0)) ball0 = f.bx; db = Math.max(db, Math.abs(f.bx - ball0)); } }
    assert.ok(dh < .001 && db < .001, `speed ${sp} ${JSON.stringify(over)}: heel slip ${dh}, ball slip ${db}`);
  }
});
test('the stance sole stays on the ground and the swing toe clears it', () => {
  for (const sp of speeds) { const p = mk(sp), o = pose(); let low = 9, clear = 9, mid = 9;
    for (let i = 0; i < steps; i++) { const u = i / steps, f = feet(p, u, o)[0], lowest = Math.min(f.hy, f.by);
      if (f.u < p.stance) { assert.ok(Math.abs(lowest) < .006, `speed ${sp} u ${f.u}: sole ${lowest}`); low = Math.min(low, lowest); }
      else { clear = Math.min(clear, lowest); if (f.u > .74 && f.u < .88) mid = Math.min(mid, lowest); } }
    assert.ok(low > -.006 && mid > .03 && clear > -.004, `speed ${sp}: low ${low} clear ${clear} mid ${mid}`);
  }
});
test('the foot is never toe-down in mid-swing and the knee has bent', () => {
  for (let u = .76; u <= .9; u += .01) assert.ok(pitchAt(u) <= 2.5, `pitch ${pitchAt(u)} at ${u}`);
  const p = mk(.6), o = pose(); let knee = 0; for (let i = 0; i < steps; i++) { walk(p, i / steps, o); knee = Math.max(knee, o.knee[0]); }
  assert.ok(knee > .8 && knee < 1.4, `swing knee peak ${knee}`);
});
test('no NaN at rest, at the reach clamp or at the intro speed', () => {
  const o = pose(), cases: Params[] = [{ ...mk(0), reach: 0, heel: 0 }, mk(2.9), mk(3), { ...mk(1), reach: 1.4 }, { ...mk(1), reach: .6, knee: 0 }];
  for (const p of cases) for (let i = 0; i < steps; i++) { walk(p, i / steps, o); for (const v of [o.H, o.yaw, o.roll, o.sway, ...o.thigh, ...o.knee, ...o.ankle]) assert.ok(Number.isFinite(v)); }
  const t = new Float64Array(1); assert.ok(Number.isFinite(ik(5, 0, t, 0)) && Number.isFinite(t[0]) && Number.isFinite(ik(0, 0, t, 0)) && Number.isFinite(ik(0, -1, t, 0)));
});
test('the curves close on themselves and the pose is continuous across the cycle', () => {
  assert.ok(Math.abs(kneeAt(0) - kneeAt(.99999)) < .01 && Math.abs(pitchAt(0) - pitchAt(.99999)) < .01);
  const p = mk(.6), a = pose(), b = pose(); walk(p, 0, a); walk(p, .9999999, b);
  for (const k of [0, 1]) for (const f of ['thigh', 'knee', 'ankle'] as const) assert.ok(Math.abs(a[f][k] - b[f][k]) < .01, `${f}[${k}]`);
  assert.ok(Math.abs(a.H - b.H) < .001);
  // And no frame jumps: every joint moves by little between neighbouring samples.
  for (let i = 0; i < steps; i++) { walk(p, i / steps, a); walk(p, (i + 1) / steps, b); for (const k of [0, 1]) for (const f of ['thigh', 'knee', 'ankle'] as const) assert.ok(Math.abs(a[f][k] - b[f][k]) < .12, `${f} jumps at ${i}`); }
  assert.equal(legZ(0, STANCE), 1); assert.ok(Math.abs(legZ(.9999, STANCE) - 1) < .01);
});
