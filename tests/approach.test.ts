import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPROACH, approachState, stepApproach, type Approach, type ApproachEvent } from '../src/simulation/approach.ts';
import type { Scrutiny } from '../src/simulation/occupation.ts';

const SPAN: [number, number] = [-13, 13], DT = .05;
type Opts = { scrutiny?: Scrutiny; seen?: boolean | ((lz: number) => boolean); lx?: number; lx1?: number; hold?: number };
/** Walks the Steward from (lx, z0) to (lx1, z1) in a straight line at `speed` m/s (by default down the east opening),
 * one small step at a time, then optionally stands for `hold` s. Every event, with when and where it happened. */
function trace(a: Approach, clock: { t: number }, z0: number, z1: number, speed: number, o: Opts = {}) {
  const events: { e: ApproachEvent; t: number; z: number }[] = [], lx0 = o.lx ?? 4, lx1 = o.lx1 ?? lx0, steps = Math.max(1, Math.round(Math.hypot(z1 - z0, lx1 - lx0) / speed / DT));
  const step = (lx: number, lz: number) => { clock.t += DT; const e = stepApproach(a, { lx, lz, span: SPAN, seen: typeof o.seen === 'function' ? o.seen(lz) : o.seen ?? true, scrutiny: o.scrutiny ?? 'challenge', dt: DT, time: clock.t }); if (e) events.push({ e, t: clock.t, z: lz }); };
  for (let i = 1; i <= steps; i++) step(lx0 + (lx1 - lx0) * i / steps, z0 + (z1 - z0) * i / steps);
  for (let h = 0; h < (o.hold ?? 0); h += DT) step(lx1, z1);
  return events;
}
const walk = (...args: Parameters<typeof trace>) => trace(...args).map(x => x.e);
const fresh = () => ({ a: approachState(), clock: { t: 100 } });
const WALK = 4.5, SPRINT = 7.2; // src/player/controller.ts

test('a heated Steward is noticed and challenged in the approach, before the boom line', () => {
  const { a, clock } = fresh(); const ev = walk(a, clock, 15, 4, 1.4);
  assert.deepEqual(ev, ['notice', 'challenge']); assert.equal(a.stage, 'challenged'); assert.equal(a.side, 1);
  assert.ok(a.window > 0 && a.window <= APPROACH.window);
});
test('the response window runs for its length; walking on past it is refusal, not yet an incident', () => {
  const { a, clock } = fresh(); walk(a, clock, 15, 8.9, 1.4); assert.equal(a.stage, 'challenged');
  // Creeping forward slowly, never stopping long enough to count as standing still.
  const ev = walk(a, clock, 8.9, 3.4, .55); assert.ok(ev.includes('refuse')); assert.equal(a.stage, 'refused'); assert.ok(!ev.includes('incident'));
  const { a: b, clock: c2 } = fresh(); walk(b, c2, 15, 8.9, 1.4); const t0 = c2.t; walk(b, c2, 8.9, 5.5, .5);
  assert.equal(b.stage, 'refused'); assert.ok(c2.t - t0 >= APPROACH.window - .2, 'refused only when the window ran out');
});
test('turning away inside the window prevents the incident', () => {
  for (const answer of ['back', 'stop', 'side'] as const) {
    const { a, clock } = fresh(); walk(a, clock, 15, 5, 1.4); assert.equal(a.stage, 'challenged');
    // Back the way he came; standing where he is; or sideways along the line and off the end of it, a step at a time.
    const ev = answer === 'back' ? walk(a, clock, 5, 9, 1.4) : answer === 'stop' ? walk(a, clock, 5, 5, 1, { hold: 1.5 }) : walk(a, clock, 5, 5, 1.4, { lx1: 16 });
    if (answer === 'side') assert.equal(a.stage, 'idle', 'off the end of the line, the gate forgets him');
    assert.ok(ev.includes('turnedAway'), answer); assert.ok(!ev.includes('incident'), answer);
    // Standing there afterwards, or wandering off entirely, never becomes an incident.
    const later = walk(a, clock, answer === 'back' ? 9 : 5, 20, 1.4, { lx: answer === 'side' ? 16 : 4 });
    assert.ok(!later.includes('incident'), answer); assert.equal(a.stage, 'idle', answer);
  }
});
test('continuing through the boom while flagged causes exactly one incident', () => {
  const { a, clock } = fresh(); const ev = walk(a, clock, 15, -6, 1.4);
  assert.deepEqual(ev, ['notice', 'challenge', 'refuse', 'incident']); assert.equal(a.stage, 'incident');
  // Lingering on the far side, or stepping back and forth across, adds nothing.
  const more = [...walk(a, clock, -6, 2, 1.4), ...walk(a, clock, 2, -4, 1.4)]; assert.equal(more.filter(e => e === 'incident').length, 0);
});
test('turning away, then coming on again, renews the challenge and then it is an incident', () => {
  const { a, clock } = fresh(); walk(a, clock, 15, 5, 1.4); walk(a, clock, 5, 7, 1.4);
  assert.equal(a.stage, 'turnedAway'); const ev = walk(a, clock, 7, -3, 1.4);
  assert.deepEqual(ev, ['resume', 'refuse', 'incident']);
});
test('no challenge after the Steward has passed, and none from the far side walking away', () => {
  // Unseen until already through: nothing, then walking away on the far side stays quiet.
  const { a, clock } = fresh(); const ev = [...walk(a, clock, 15, -1, 1.4, { seen: false }), ...walk(a, clock, -1, -9, 1.4)];
  assert.deepEqual(ev, []);
  // Seen only once at the boom: too late to stop him, so he is let through without a word.
  const { a: b, clock: c2 } = fresh(); walk(b, c2, 15, 2.5, 1.4, { seen: false }); assert.deepEqual(walk(b, c2, 2.5, -8, 1.4), ['cleared']);
  // Standing on the far side, still, is not an approach.
  const { a: s, clock: c3 } = fresh(); assert.deepEqual(walk(s, c3, -5, -5, 1, { hold: 3 }), []);
});
test('a Steward the patrols do not know is watched, never turned into an incident', () => {
  const { a, clock } = fresh(); const ev = walk(a, clock, 15, -8, 1.4, { scrutiny: 'wave' });
  assert.deepEqual(ev, ['notice', 'cleared']);
  const { a: b, clock: c2 } = fresh(); const run = walk(b, c2, 15, -8, 4.5, { scrutiny: 'wave' }); assert.ok(!run.includes('incident') && !run.includes('challenge'));
});
test('a sealed gate never makes an incident out of an approach', () => {
  const { a, clock } = fresh(); const ev = walk(a, clock, 15, 1.5, 1.4, { scrutiny: 'refuse', hold: 10 }); assert.deepEqual(ev, []); assert.equal(a.stage, 'idle');
});
test('the incident cooldown holds across approaches', () => {
  const { a, clock } = fresh(); walk(a, clock, 15, -15, 2.2); walk(a, clock, -15, -20, 1.4); assert.equal(a.stage, 'idle');
  const ev = walk(a, clock, -15, 6, 1.4); assert.ok(ev.includes('challenge')); assert.ok(ev.includes('excused')); assert.ok(!ev.includes('incident'));
});
/** Seconds from the challenge to the incident, or NaN where there was no incident. */
const answerTime = (ev: ReturnType<typeof trace>) => (ev.find(x => x.e === 'incident')?.t ?? NaN) - (ev.find(x => x.e === 'challenge')?.t ?? NaN);
test('the challenge is timed by pace: walking or running straight in, there are seconds to answer it', () => {
  for (const speed of [1.4, WALK, SPRINT]) {
    const { a, clock } = fresh(); const ev = trace(a, clock, 30, -4, speed), c = ev.find(x => x.e === 'challenge')!;
    assert.deepEqual(ev.map(x => x.e), ['notice', 'challenge', 'refuse', 'incident'], `${speed}`);
    assert.ok(c.z / speed >= APPROACH.lateLead, `${speed} m/s: challenged ${c.z.toFixed(1)} m out`);
    assert.ok(answerTime(ev) >= APPROACH.lateLead, `${speed} m/s: ${answerTime(ev).toFixed(2)} s from challenge to incident`);
  }
});
test('a late sighting is no sighting: first seen seconds from the boom, the Steward passes unchallenged', () => {
  for (const [speed, sightedAt] of [[WALK, 3.2], [WALK, 8], [SPRINT, 12], [SPRINT, 3.2]]) {
    const { a, clock } = fresh(); const ev = walk(a, clock, 30, -8, speed, { seen: lz => Math.abs(lz) < sightedAt });
    assert.deepEqual(ev, ['cleared'], `${speed} m/s seen at ${sightedAt} m`); assert.equal(a.stage, 'cleared');
  }
});
test('a standing start close to the boom is never an incident', () => {
  // Standing 5 m out, unremarked, then walking on through: challenged or not, there was no time to answer.
  for (const speed of [WALK, SPRINT]) {
    // (Set down there from far off, by a ladder or a road home: arriving is not an approach.)
    const { a, clock } = fresh(); walk(a, clock, 20, 20, 1, { hold: .2 }); const ev = walk(a, clock, 5, 5, 1, { hold: 2 }); assert.deepEqual(ev, []); assert.equal(a.stage, 'idle');
    const on = walk(a, clock, 5, -5, speed); assert.ok(!on.includes('incident'), `${speed}`); assert.equal(a.stage, 'cleared');
  }
});
test('coming along the line and turning into the opening is never an incident', () => {
  // Along the barrier 4 m out, then in through the east opening: the boom is a second away when he turns.
  const { a, clock } = fresh(); const ev = [...walk(a, clock, 4, 4, WALK, { lx: 12.5, lx1: 4 }), ...walk(a, clock, 4, -6, WALK)];
  assert.deepEqual(ev, ['cleared']);
  // The same from further out: there is time, so he is asked, and going through is his answer.
  const { a: b, clock: c2 } = fresh(); const far = [...trace(b, c2, 12, 12, WALK, { lx: 12.5, lx1: 4 }), ...trace(b, c2, 12, -6, WALK)];
  assert.deepEqual(far.map(x => x.e), ['notice', 'challenge', 'refuse', 'incident']); assert.ok(answerTime(far) >= APPROACH.grace, `${answerTime(far).toFixed(2)} s`);
});
test('going through sooner than the grace after a challenge is excused, not punished', () => {
  // Challenged at a walk, then a dash for the boom: through it before anyone could have answered.
  const { a, clock } = fresh(); walk(a, clock, 15, 8.9, 1.4); assert.equal(a.stage, 'challenged');
  const ev = walk(a, clock, 8.9, -4, SPRINT); assert.ok(a.since < APPROACH.grace); assert.deepEqual(ev, ['refuse', 'excused']); assert.equal(a.stage, 'cleared');
});
test('going round the end of the line is the other way through, not an incident', () => {
  // Challenged, turned away, then out past the end of the barrier, across the line there and back in on the far side.
  const { a, clock } = fresh(); walk(a, clock, 15, 5, 1.4); assert.equal(a.stage, 'challenged');
  const ev = [...walk(a, clock, 5, 6.5, WALK), ...walk(a, clock, 6.5, 6.5, WALK, { lx1: 15.5 }), ...walk(a, clock, 6.5, -6.5, WALK, { lx: 15.5 }), ...walk(a, clock, -6.5, -6.5, WALK, { lx: 15.5, lx1: 4 }), ...walk(a, clock, -6.5, -20, WALK)];
  assert.deepEqual(ev, ['turnedAway']); assert.equal(a.stage, 'idle');
  // Still under challenge and advancing when he steps off the end: the challenge lapses with him.
  const { a: b, clock: c2 } = fresh(); walk(b, c2, 15, 5, 1.4, { lx: 13 }); assert.equal(b.stage, 'challenged');
  const round = [...walk(b, c2, 5, 3, WALK, { lx: 13, lx1: 15.5 }), ...walk(b, c2, 3, -6, WALK, { lx: 15.5 })];
  assert.deepEqual(round, ['turnedAway']); assert.equal(b.stage, 'idle');
});
test('a challenge is withdrawn if the patrols lose interest before it is answered', () => {
  const { a, clock } = fresh(); walk(a, clock, 15, 5, 1.4); assert.equal(a.stage, 'challenged');
  const ev = [...walk(a, clock, 5, 4, 1.4, { scrutiny: 'wave' }), ...walk(a, clock, 4, -6, 1.4, { scrutiny: 'wave' })];
  assert.deepEqual(ev, ['released', 'cleared']);
  // Refused or turned away, the same: nobody carries out a threat they no longer mean.
  for (const upTo of [1.5, 9]) { const { a: b, clock: c2 } = fresh(); walk(b, c2, 15, 5, 1.4); walk(b, c2, 5, upTo, 1.4); assert.ok(b.stage === 'refused' || b.stage === 'turnedAway');
    assert.deepEqual(walk(b, c2, upTo, upTo, 1, { hold: .1, scrutiny: 'wave' }).slice(0, 1), ['released']); assert.ok(!walk(b, c2, upTo, -6, 1.4, { scrutiny: 'wave' }).includes('incident')); }
});

test('the look comes before the word: the notice leads the challenge by a beat at every pace', () => {
  for (const speed of [1.4, 2.2, 3.2, WALK, SPRINT]) {
    const { a, clock } = fresh(); const ev = trace(a, clock, 40, 3, speed, { seen: lz => Math.abs(lz) <= APPROACH.reach }), n = ev.find(x => x.e === 'notice')!, c = ev.find(x => x.e === 'challenge')!;
    assert.ok(n && c, `${speed}`); assert.ok(c.t - n.t >= APPROACH.beat - 1e-9, `${speed} m/s: ${(c.t - n.t).toFixed(2)} s from notice to challenge`);
    assert.ok(c.z / speed >= APPROACH.lateLead, `${speed} m/s: still challenged in time, ${c.z.toFixed(1)} m out`);
  }
});
test('stopping, then walking on: no incident sooner than the warning that renews the challenge could be heard', () => {
  /** Challenged at a walk, stops `at` metres out, then goes on through at `speed`. */
  const stopGo = (at: number, speed: number) => { const { a, clock } = fresh(); walk(a, clock, 15, at, 1.4); walk(a, clock, at, at, 1, { hold: 1.5 }); assert.equal(a.stage, 'turnedAway'); return trace(a, clock, at, -3, speed); };
  // A step from the boom: the warning and the line are a moment apart. Excused, with a word.
  for (const speed of [1.4, WALK]) { const ev = stopGo(1.2, speed); assert.deepEqual(ev.map(x => x.e), ['resume', 'refuse', 'excused'], `${speed}`); assert.ok(ev[2].t - ev[0].t < APPROACH.warn); }
  // Further out there is time to hear it: walking on is the incident, and never sooner than the allowance.
  for (const [at, speed] of [[6, 1.4], [8, WALK], [4, 1.4]]) { const ev = stopGo(at, speed), r = ev.find(x => x.e === 'resume')!, i = ev.find(x => x.e === 'incident');
    assert.ok(i, `stopped ${at} m out, on at ${speed}`); assert.ok(i.t - r.t >= APPROACH.warn, `${(i.t - r.t).toFixed(2)} s after the warning`); }
});
test('stop-and-go is not a way through: the renewed warning buys its allowance once an approach', () => {
  const { a, clock } = fresh(); walk(a, clock, 15, 4, 1.4); walk(a, clock, 4, 4, 1, { hold: 1.5 }); assert.equal(a.stage, 'turnedAway');
  // On a metre, the challenge is renewed; he stops again; on again, renewed again, and straight through the boom.
  const first = trace(a, clock, 4, 2.9, 1.4); assert.deepEqual(first.map(x => x.e), ['resume']); walk(a, clock, 2.9, 2.9, 1, { hold: 1.5 }); assert.equal(a.stage, 'turnedAway');
  const ev = trace(a, clock, 2.9, -3, WALK), again = ev.find(x => x.e === 'resume')!, i = ev.find(x => x.e === 'incident');
  assert.ok(i, 'the second renewal does not excuse him'); assert.ok(i.t - again.t < APPROACH.warn); assert.ok(i.t - first[0].t >= APPROACH.warn); assert.equal(a.renewed, 2);
  // A fresh approach has its allowance back.
  const { a: b, clock: c2 } = fresh(); walk(b, c2, 15, 1.2, 1.4); walk(b, c2, 1.2, 1.2, 1, { hold: 1.5 }); assert.ok(walk(b, c2, 1.2, -3, WALK).includes('excused'));
});
