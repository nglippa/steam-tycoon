import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moodFor, moodOfTone, stepMood, newMood, nearBand, faceAllowed, type MoodIn, type Mood, type Trait } from '../src/simulation/occupation.ts';

const base = (o: Partial<MoodIn> = {}): MoodIn => ({ archetype: 'resident', trait: 'reserved', pick: .5, pressure: 0, watched: false, startled: false, worried: false, activity: 'walk', weariness: 0, near: 0, ...o });
const CIVIL: Trait[] = ['sociable', 'reserved', 'hurried', 'tired', 'nervous', 'curious', 'proud'], ORD: Trait[] = ['rigid', 'watchful', 'bored', 'weary'];
const picks = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, .99];

test('a civilian under pressure or watched is guarded, worried or stern, never warm', () => {
  for (const trait of CIVIL) for (const pick of picks) for (const o of [{ pressure: .8 }, { watched: true }, { pressure: .65, watched: true }]) {
    const m = moodFor(base({ trait, pick, ...o })); assert.ok(['guarded', 'worried', 'stern'].includes(m), `${trait} ${pick} ${JSON.stringify(o)} -> ${m}`); }
});
test('low occupation is warm; a free, rested street has smiles and hope', () => {
  const warm: Mood[] = ['smiling', 'relaxed', 'hopeful', 'curious', 'neutral'], seen = new Set<Mood>();
  for (const trait of CIVIL) for (const pick of picks) { const m = moodFor(base({ trait, pick })); assert.ok(warm.includes(m), `${trait} -> ${m}`); seen.add(m); }
  assert.ok(seen.has('smiling') && seen.has('hopeful'));
  assert.equal(moodFor(base({ trait: 'sociable', pick: .1 })), 'smiling');
});
test('a fright is startled, then worried; a tone overrides the mood', () => {
  assert.equal(moodFor(base({ startled: true })), 'startled'); assert.equal(moodFor(base({ worried: true })), 'worried');
  assert.equal(moodFor(base({ startled: true, tone: 'friendly' })), 'smiling');
  assert.equal(moodFor(base({ archetype: 'guard', trait: 'bored', tone: 'authoritative' })), 'challenge');
  assert.equal(moodFor(base({ archetype: 'ordinal', trait: 'rigid', tone: 'hostile' })), 'barking');
  assert.equal(moodFor(base({ archetype: 'guard', trait: 'rigid', tone: 'friendly' })), 'cold', 'no friendly register');
  assert.equal(moodOfTone('courier', 'fearful'), 'startled');
});
test('the Ordinance draws only from its own vocabulary, with weary and bored a minority', () => {
  const ord = new Set<Mood>(['cold', 'scrutiny', 'sideeye', 'impatient', 'contempt', 'challenge', 'scan', 'barking', 'bored', 'weary']);
  let weak = 0, total = 0;
  for (const a of ['guard', 'ordinal']) for (const trait of ORD) for (const near of [0, 1, 2] as const) for (let k = 0; k < 100; k++) {
    const m = moodFor(base({ archetype: a, trait, near, pick: k / 100, pressure: k / 100, watched: k % 2 === 0, activity: k % 3 ? 'guard' : 'walk' }));
    assert.ok(ord.has(m), `${a} ${trait} -> ${m}`); assert.equal(faceAllowed(a, m), true); total++; if (m === 'bored' || m === 'weary') weak++; }
  assert.ok(weak / total < .25 && weak > 0, `bored/weary share ${weak / total}`);
  for (const f of ['happy', 'surprised', 'smiling', 'startled', 'worried', 'hopeful'] as const) assert.equal(faceAllowed('guard', f), false);
  const hard = new Set<Mood>(['scrutiny', 'challenge', 'contempt', 'impatient', 'sideeye', 'cold']);
  for (let k = 0; k < 100; k++) assert.ok(hard.has(moodFor(base({ archetype: 'guard', trait: 'weary', near: 2, pick: k / 100 }))), 'close to the Steward even a weary guard is hard');
});
test('moods hold for seconds: no cycling, and a change only on a threshold or when the hold runs out', () => {
  for (const trait of [...CIVIL, ...ORD]) { const ord = ORD.includes(trait), s = newMood(); let changes = 0, prev = s.mood;
    for (let t = 0; t < 120; t += .5) { const m = stepMood(s, { ...base({ trait, archetype: ord ? 'guard' : 'resident', pick: .37 }), react: 0 }, t); if (m !== prev) { changes++; prev = m; } }
    assert.ok(changes <= 120 / 2.5 + 1, `${trait} changed ${changes} times`); }
  const s = newMood(); stepMood(s, { ...base(), react: 0 }, 0); const first = s.until;
  assert.ok(first >= 2.5 && first <= 6.5);
});
test('a reaction starts startled, decays to worried, and the street relaxes after', () => {
  const s = newMood(), at = (t: number, react: number, o: Partial<MoodIn> = {}) => stepMood(s, { ...base({ trait: 'sociable', pick: .1, ...o }), react }, t);
  at(0, 0); assert.ok(['smiling', 'relaxed', 'hopeful'].includes(at(.5, 0)));
  assert.equal(at(1, 2), 'startled'); assert.equal(at(1.5, 2), 'startled');
  assert.equal(at(4, 2), 'worried'); assert.equal(at(6, 1), 'worried');
  assert.equal(at(9, 0), 'worried'); assert.notEqual(at(20, 0), 'worried');
  const t = newMood(); assert.equal(stepMood(t, { ...base({ trait: 'reserved' }), react: 1 }, 0), 'startled');
  assert.equal(stepMood(t, { ...base({ trait: 'reserved' }), react: 1 }, 1.2), 'worried');
});
test('a heavy street at the weariest end keeps the tired minority, not a third of everyone', () => {
  let tired = 0; for (let k = 0; k < 100; k++) if (moodFor(base({ weariness: 1, trait: 'reserved', pick: k / 100 })) === 'tired') tired++;
  assert.ok(tired <= 36 && tired > 0, `tired ${tired}`);
});
test('someone hovering at a distance edge does not flicker: the band has a margin and a mood is held 2.5 s', () => {
  let band: 0 | 1 | 2 = 0, flips = 0;
  for (let k = 0; k < 400; k++) { const d = 4.5 + Math.sin(k * .9) * .45, b = nearBand(band, d); if (b !== band) flips++; band = b; }
  assert.ok(flips <= 1, `crossed ${flips} times`);
  band = 0; flips = 0; for (let k = 0; k < 400; k++) { const d = 9.75 + Math.sin(k * .9) * .7, b = nearBand(band, d); if (b !== band) flips++; band = b; }
  assert.ok(flips <= 1, `outer edge crossed ${flips} times`);
  assert.equal(nearBand(0, 3.9), 2); assert.equal(nearBand(2, 4.9), 2); assert.equal(nearBand(2, 5.1), 1); assert.equal(nearBand(1, 10.4), 1); assert.equal(nearBand(1, 10.6), 0);
  // The Ordinance's mood changes with the band; at an edge, with a swing of dice-free input, it still holds for 2.5 s.
  const s = newMood(); let b: 0 | 1 | 2 = 0, last = -9, gaps = 99;
  for (let t = 0; t < 60; t += .5) { b = nearBand(b, 4.5 + Math.sin(t * 7) * .6); const m0 = s.mood, n0 = s.n; stepMood(s, { ...base({ archetype: 'guard', trait: 'watchful', pick: .4 }), near: b, react: 0 }, t); if (s.n !== n0) { gaps = Math.min(gaps, t - last); last = t; } void m0; }
  assert.ok(gaps >= 2.5, `a mood was re-rolled after ${gaps}s`);
});
