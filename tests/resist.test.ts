import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, canNotice, canDivert, bookendDue, bookendLine, HOLD, RESIST_DONE } from '../src/simulation/resist.ts';
import { PORCH_ANSWERS } from '../src/simulation/intro.ts';
import { scrutiny, CONTRABAND_HEAT } from '../src/simulation/occupation.ts';
import { Economy, freshSave, decodeSave, type StorageAdapter } from '../src/simulation/economy.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });

test('the loop moves one step at a time, never back, and never replays after the end', () => {
  let s = 0; for (const to of [1, 2, 3, 4]) { assert.equal(advance(s, to), to); s = to; }
  assert.equal(advance(0, 2), 0); assert.equal(advance(0, 4), 0); assert.equal(advance(2, 1), 2); assert.equal(advance(2, 2), 2);
  assert.equal(advance(RESIST_DONE, 4), RESIST_DONE); assert.equal(advance(RESIST_DONE, 5), RESIST_DONE); assert.equal(advance(RESIST_DONE, 1), RESIST_DONE);
});
test('what is on offer at each stage', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(canNotice), [false, true, false, false, false]);
  assert.deepEqual([0, 1, 2, 3, 4].map(canDivert), [false, false, true, false, false]);
  assert.deepEqual([0, 1, 2, 3, 4].map(bookendDue), [false, false, false, true, false]);
});
test('the bookend answers the porch, and falls back to the promise', () => {
  const lines = PORCH_ANSWERS.map(bookendLine); assert.equal(new Set(lines).size, PORCH_ANSWERS.length);
  for (const l of lines) assert.match(l, /point|who|something/);
  assert.equal(bookendLine(null), 'Now you see the point.'); assert.equal(bookendLine('nonsense'), 'Now you see the point.'); assert.equal(bookendLine('point'), 'Now you see the point.');
});
test('what the trade holds is worded, and none of it says Steward in the Ordinance’s voice', () => {
  for (const h of Object.values(HOLD)) { for (const l of Object.values(h)) { assert.ok(l); assert.ok(!/Steward/.test(l), l); } assert.ok(!/citizen/.test(h.hand)); }
  assert.ok(HOLD.scrap);
  // The delivery names the part and where to look; the stranger, not the toast, closes the loop.
  assert.match(HOLD.scrap.delivered, /governors/); assert.match(HOLD.scrap.delivered, /regulator/); assert.ok(!/Now you see the point/.test(HOLD.scrap.delivered));
});
test('a new save starts the loop at 0; an older save without it loads with the default and keeps its opening', () => {
  assert.equal(freshSave().resist.rook, 0); assert.equal(new Economy(memory()).state.resist.rook, 0);
  const old = { ...freshSave(), intro: { played: true, answer: 'act' } } as unknown as Record<string, unknown>; delete old.resist;
  const d = decodeSave(JSON.stringify(old))!; assert.equal(d.resist.rook, 0); assert.equal(d.intro.played, true); assert.equal(d.intro.answer, 'act');
});
test('bad stage values clamp', () => {
  const at = (rook: unknown) => decodeSave(JSON.stringify({ ...freshSave(), resist: { rook } }))!.resist.rook;
  assert.equal(at(99), RESIST_DONE); assert.equal(at(-3), 0); assert.equal(at(2.9), 2); assert.equal(at('2'), 0); assert.equal(at(null), 0); assert.equal(at(NaN), 0);
  assert.equal(decodeSave(JSON.stringify({ ...freshSave(), resist: 'x' }))!.resist.rook, 0);
});
test('the economy walks the loop, keeps it across a reload, announces each step and resets with a new game', () => {
  const m = memory(), e = new Economy(m), seen: string[] = []; e.onChange = (k, id) => seen.push(k + id);
  assert.equal(e.advanceResist(2), false); assert.equal(e.advanceResist(1), true); assert.equal(e.advanceResist(1), false); assert.equal(e.advanceResist(2), true);
  assert.deepEqual(seen, ['resist', 'resist']); assert.equal(new Economy(m).state.resist.rook, 2);
  e.advanceResist(3); e.advanceResist(4); assert.equal(e.advanceResist(4), false); assert.equal(e.advanceResist(1), false); assert.equal(e.state.resist.rook, 4);
  e.reset(); assert.equal(e.state.resist.rook, 0); assert.equal(new Economy(m).state.resist.rook, 0);
});
test('reporting at the ledger and at the bench are the same report', () => {
  const e = new Economy(memory()); e.inspect('market'); assert.equal(e.state.objective, 0); assert.equal(e.state.resist.rook, 0);
  e.inspect('scrap'); assert.equal(e.state.objective, 1); assert.equal(e.state.resist.rook, 1); e.inspect('scrap'); assert.equal(e.state.resist.rook, 1);
  const later = new Economy(memory()); later.state.objective = 3; later.inspect('scrap'); assert.equal(later.state.objective, 3); assert.equal(later.state.resist.rook, 1);
});
test('carrying contraband reads as heat at a held gate, and changes nothing at an open or sealed one', () => {
  assert.equal(scrutiny('manned', 0), 'wave'); assert.equal(scrutiny('manned', 0, false, true), 'challenge'); assert.equal(scrutiny('light', 0), 'wave'); assert.equal(scrutiny('light', 0, false, true), 'challenge');
  assert.ok(CONTRABAND_HEAT > 1.75); assert.equal(scrutiny('sealed', 0, false, true), 'refuse'); assert.equal(scrutiny('open', 0, false, true), 'none'); assert.equal(scrutiny('gone', 5, true, true), 'none');
  for (const g of ['manned', 'light'] as const) for (const h of [0, 1, 2, 3]) assert.equal(scrutiny(g, h, false, false), scrutiny(g, h));
});
