import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPROACH, approachState, stepApproach, type Approach, type ApproachEvent } from '../src/simulation/approach.ts';
import type { Scrutiny } from '../src/simulation/occupation.ts';

const SPAN: [number, number] = [-13, 13], DT = .05;
/** Walks the Steward from z0 to z1 at `speed` m/s (lx fixed in the east opening), then optionally stands for `hold` s. */
function walk(a: Approach, clock: { t: number }, z0: number, z1: number, speed: number, o: { scrutiny?: Scrutiny; seen?: boolean; lx?: number; lx1?: number; hold?: number } = {}) {
  const events: { e: ApproachEvent; t: number; z: number }[] = [], steps = Math.max(1, Math.round(Math.abs(z1 - z0) / speed / DT)), lx0 = o.lx ?? 4;
  const step = (lx: number, lz: number) => { clock.t += DT; const e = stepApproach(a, { lx, lz, span: SPAN, seen: o.seen ?? true, scrutiny: o.scrutiny ?? 'challenge', dt: DT, time: clock.t }); if (e) events.push({ e, t: clock.t, z: lz }); };
  for (let i = 1; i <= steps; i++) step(lx0 + ((o.lx1 ?? lx0) - lx0) * i / steps, z0 + (z1 - z0) * i / steps);
  for (let h = 0; h < (o.hold ?? 0); h += DT) step(o.lx1 ?? lx0, z1);
  return events.map(x => x.e);
}
const fresh = () => ({ a: approachState(), clock: { t: 100 } });

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
    const ev = answer === 'back' ? walk(a, clock, 5, 9, 1.4) : answer === 'stop' ? walk(a, clock, 5, 5, 1, { hold: 1.5 }) : walk(a, clock, 5, 5, 1.4, { lx1: 16 });
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
  const { a, clock } = fresh(); const ev = [...walk(a, clock, 15, 1, 1.4, { seen: false }), ...walk(a, clock, 1, -9, 1.4)];
  assert.deepEqual(ev, []);
  // Seen only once at the boom: too late to notice.
  const { a: b, clock: c2 } = fresh(); walk(b, c2, 15, 2.5, 1.4, { seen: false }); assert.deepEqual(walk(b, c2, 2.5, -8, 1.4), []);
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
test('at a walking pace the challenge comes early enough to answer it', () => {
  const { a, clock } = fresh(); let challengedAt = NaN; const speed = 4.5;
  for (let z = 15; z > -2; z -= speed * DT) { clock.t += DT; const e = stepApproach(a, { lx: 4, lz: z, span: SPAN, seen: true, scrutiny: 'challenge', dt: DT, time: clock.t }); if (e === 'challenge') challengedAt = z; }
  assert.ok(challengedAt / speed >= 1.8, `challenged ${challengedAt} m out`);
});
