import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPT, PORCH_ANSWERS, DAWDLE, readTime } from '../src/simulation/intro.ts';
import { HOME_TIERS, homeTier, atHome } from '../src/simulation/home.ts';
import { Economy, freshSave, decodeSave, type StorageAdapter } from '../src/simulation/economy.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });

test('the opening script is well formed: every choice answers, ids are unique, the regime says citizen', () => {
  const ids = SCRIPT.flatMap(n => [n.id, ...n.choices.map(c => c.id)]); assert.equal(new Set(ids).size, ids.length);
  for (const n of SCRIPT) { assert.ok(n.lines.length > 0 && n.choices.length >= 2); for (const c of n.choices) { assert.ok(c.label && c.reply.length > 0); for (const l of c.reply) assert.ok(l.who && l.text); } }
  assert.equal(SCRIPT.find(n => n.id === 'porch')!.choices.length, 4); assert.deepEqual(PORCH_ANSWERS, ['point', 'who', 'quiet', 'act']);
  for (const l of [DAWDLE.line, ...SCRIPT.filter(n => n.id === 'guard').flatMap(n => [...n.lines, ...n.choices.flatMap(c => c.reply)])]) assert.ok(!/Steward/.test(l.text));
  assert.ok(readTime('x') >= 2 && readTime('x'.repeat(100)) > readTime('x'.repeat(10)));
});
test('home tiers are ordered, named once and cost more as they rise', () => {
  assert.equal(HOME_TIERS[0].cost, 0); assert.equal(new Set(HOME_TIERS.map(t => t.id)).size, HOME_TIERS.length);
  for (let i = 1; i < HOME_TIERS.length; i++) assert.ok(HOME_TIERS[i].cost > HOME_TIERS[i - 1].cost);
  assert.equal(homeTier(-3).id, 'room'); assert.equal(homeTier(99).id, 'townhouse');
});
test('home is the room, the corridor and the stair down to the street door, and no further', () => {
  assert.ok(atHome(-3.2, 10.2, 5.6)); assert.ok(atHome(-9, 10.2, 5)); assert.ok(atHome(-14.4, 8.5, 4.8)); assert.ok(atHome(-14.4, 3, 1)); assert.ok(atHome(-14.4, 2, -2.6));
  assert.ok(!atHome(-16.4, 1.9, -2.6)); assert.ok(!atHome(0, 1.9, 77)); assert.ok(!atHome(-3.2, 1.9, 5.6)); assert.ok(!atHome(-12.4, 14.45, 3.4)); assert.ok(!atHome(-14, 16.2, 6));
});
test('a new save plays the opening once; older saves, answers and homes migrate', () => {
  assert.equal(new Economy(memory()).state.intro.played, false); assert.equal(freshSave().home.level, 0);
  const old = freshSave() as unknown as Record<string, unknown>; delete old.intro; delete old.home; const d = decodeSave(JSON.stringify(old))!; assert.equal(d.intro.played, true); assert.equal(d.intro.answer, null); assert.equal(d.home.level, 0);
  assert.equal(decodeSave(JSON.stringify({ ...freshSave(), intro: { played: true, answer: 'nonsense' } }))!.intro.answer, null);
  assert.equal(decodeSave(JSON.stringify({ ...freshSave(), home: { level: 99 } }))!.home.level, HOME_TIERS.length - 1);
  const m = memory(), e = new Economy(m); e.finishIntro('who'); e.finishIntro(); const r = new Economy(m); assert.equal(r.state.intro.played, true); assert.equal(r.state.intro.answer, 'who');
});
