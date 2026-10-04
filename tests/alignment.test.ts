import test from 'node:test';
import assert from 'node:assert/strict';
import { freshAlignment, resolve, phase, DEEDS, catwalkRestored, crateHeld, strangerDue } from '../src/simulation/alignment.ts';
import { Economy, freshSave, decodeSave, type StorageAdapter } from '../src/simulation/economy.ts';
import { bookendDue } from '../src/simulation/resist.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });
const load = (patch: Record<string, unknown>) => decodeSave(JSON.stringify({ ...freshSave(), ...patch }))!;

test('a fresh save and an older save without alignment start at base with no deeds and no lock', () => {
  assert.deepEqual(freshSave().alignment, freshAlignment()); assert.equal(freshSave().version, 3);
  const old = { ...freshSave() } as unknown as Record<string, unknown>; delete old.alignment;
  const d = decodeSave(JSON.stringify(old))!; assert.deepEqual(d.alignment, freshAlignment());
  assert.deepEqual(new Economy(memory()).state.alignment, freshAlignment());
});
test('an old finished Resistance save becomes a resistance outcome with one early deed, and is not committed', () => {
  for (const rook of [3, 4]) {
    const old = { ...freshSave(), resist: { rook } } as unknown as Record<string, unknown>; delete old.alignment;
    const d = decodeSave(JSON.stringify(old))!;
    assert.equal(d.alignment.outcomes.greatMain, 'resistance'); assert.equal(d.alignment.deeds['rook.diverted'], 0); assert.equal(d.resist.rook, rook);
    assert.equal(d.alignment.commit, null); assert.equal(d.alignment.broke, null); assert.equal(phase(d.alignment), 'uncommitted');
  }
  const mid = { ...freshSave(), resist: { rook: 2 } } as unknown as Record<string, unknown>; delete mid.alignment;
  assert.deepEqual(decodeSave(JSON.stringify(mid))!.alignment, freshAlignment());
});
test('the stage and the outcome stay in step both ways', () => {
  const lifted = load({ resist: { rook: 1 }, alignment: { ...freshAlignment(), outcomes: { greatMain: 'ordinance' } } });
  assert.equal(lifted.resist.rook, 3); assert.equal(lifted.alignment.outcomes.greatMain, 'ordinance'); assert.deepEqual(lifted.alignment.deeds, {});
  for (const s of [freshSave(), load({ resist: { rook: 2 } }), load({ resist: { rook: 4 } }), lifted]) assert.equal(s.resist.rook >= 3, s.alignment.outcomes.greatMain !== 'base');
});
test('bad alignment values clamp: unknown outcomes and deeds drop, commit and broke default to null', () => {
  const d = load({ alignment: { deeds: { 'rook.custody': 5, 'nope': 1, 'rook.diverted': 'x' }, outcomes: { greatMain: 'wat' }, commit: { side: 'bad' }, broke: 7 } });
  assert.deepEqual(d.alignment, { ...freshAlignment(), deeds: { 'rook.custody': 5 } });
  assert.deepEqual(load({ alignment: 'x' }).alignment, freshAlignment()); assert.deepEqual(load({ alignment: null }).alignment, freshAlignment());
  const c = load({ alignment: { ...freshAlignment(), commit: { side: 'ordinance', at: 9, by: 'x' } } }); assert.equal(phase(c.alignment), 'committed');
});
test('one deed on either side leaves the Steward uncommitted; two net deeds on one side lean; a lock commits', () => {
  const r = resolve(freshAlignment(), 'greatMain', 'resistance', 'rook.diverted', 7)!, o = resolve(freshAlignment(), 'greatMain', 'ordinance', 'rook.custody', 7)!;
  assert.equal(phase(freshAlignment()), 'uncommitted'); assert.equal(phase(r), 'uncommitted'); assert.equal(phase(o), 'uncommitted');
  assert.equal(phase({ ...r, deeds: { ...r.deeds, 'rook.custody': 1 } }), 'uncommitted');
  assert.equal(phase({ ...r, deeds: { ...r.deeds, 'rook.diverted': 1, 'extra.one': 1, 'extra.two': 2 } as never }), 'uncommitted');
  assert.equal(phase({ ...r, commit: { side: 'resistance', at: 1, by: 'x' } }), 'committed');
});
test('a base site resolves once, purely, and records the deed', () => {
  const a = freshAlignment(), r = resolve(a, 'greatMain', 'resistance', 'rook.diverted', 12)!;
  assert.equal(r.outcomes.greatMain, 'resistance'); assert.equal(r.deeds['rook.diverted'], 12); assert.equal(a.outcomes.greatMain, 'base'); assert.deepEqual(a.deeds, {});
  assert.equal(resolve(a, 'greatMain', 'ordinance', 'rook.custody', 3)!.outcomes.greatMain, 'ordinance');
});
test('a second, contradictory (or repeated) resolve is rejected in both orders, and a mismatched deed, side or site is rejected', () => {
  const r = resolve(freshAlignment(), 'greatMain', 'resistance', 'rook.diverted', 1)!, o = resolve(freshAlignment(), 'greatMain', 'ordinance', 'rook.custody', 1)!;
  assert.equal(resolve(r, 'greatMain', 'ordinance', 'rook.custody', 2), null); assert.equal(resolve(o, 'greatMain', 'resistance', 'rook.diverted', 2), null);
  assert.equal(resolve(r, 'greatMain', 'resistance', 'rook.diverted', 2), null);
  assert.equal(resolve(freshAlignment(), 'greatMain', 'ordinance', 'rook.diverted', 1), null); assert.equal(resolve(freshAlignment(), 'greatMain', 'resistance', 'rook.custody', 1), null);
  assert.equal(resolve(freshAlignment(), 'chain' as never, 'resistance', 'rook.diverted', 1), null); assert.equal(resolve(freshAlignment(), 'greatMain', 'resistance', 'nope' as never, 1), null);
  assert.deepEqual(Object.keys(DEEDS).sort(), ['rook.custody', 'rook.diverted']);
});
test('the economy is the one writer: it lifts the stage, announces, persists, refuses the contradiction, and resets', () => {
  const m = memory(), e = new Economy(m), seen: string[] = []; e.onChange = (k, id) => seen.push(k + id);
  assert.equal(e.resolve('greatMain', 'ordinance', 'rook.custody'), true);
  assert.equal(e.state.resist.rook, 3); assert.equal(e.state.alignment.outcomes.greatMain, 'ordinance'); assert.deepEqual(seen, ['alignmentgreatMain']);
  assert.equal(e.resolve('greatMain', 'resistance', 'rook.diverted'), false); assert.equal(e.resolve('greatMain', 'ordinance', 'rook.custody'), false);
  assert.equal(e.state.alignment.outcomes.greatMain, 'ordinance'); assert.equal(e.state.alignment.deeds['rook.diverted'], undefined); assert.equal(seen.length, 1);
  const again = new Economy(m); assert.equal(again.state.alignment.outcomes.greatMain, 'ordinance'); assert.equal(again.state.resist.rook, 3);
  again.reset(); assert.deepEqual(again.state.alignment, freshAlignment()); assert.equal(again.state.resist.rook, 0); assert.deepEqual(new Economy(m).state.alignment, freshAlignment());
  const r = new Economy(memory()); r.advanceResist(1); r.advanceResist(2); assert.equal(r.resolve('greatMain', 'resistance', 'rook.diverted'), true); assert.equal(r.state.resist.rook, 3);
  assert.equal(r.resolve('greatMain', 'ordinance', 'rook.custody'), false); assert.equal(r.advanceResist(4), true); assert.equal(r.state.alignment.outcomes.greatMain, 'resistance');
});
test('the outcome, not the stage, drives the physical world', () => {
  const stages = [0, 1, 2, 3, 4];
  assert.deepEqual(['base', 'resistance', 'ordinance'].map(o => catwalkRestored(o as never)), [false, true, false]);
  assert.deepEqual(stages.map(s => crateHeld(s, 'base')), [false, true, true, false, false]);
  for (const s of stages) { assert.equal(crateHeld(s, 'ordinance'), false); assert.equal(crateHeld(s, 'resistance'), false); }
  assert.deepEqual(stages.map(s => strangerDue(s, 'resistance')), [false, false, false, true, false]);
  for (const s of stages) { assert.equal(strangerDue(s, 'ordinance'), false); assert.equal(strangerDue(s, 'base'), false); assert.equal(bookendDue(s, 'ordinance'), false); }
  // Rook 3 with an Ordinance outcome: no catwalk, no stranger, no held crate.
  const e = new Economy(memory()); e.resolve('greatMain', 'ordinance', 'rook.custody'); const o = e.state.alignment.outcomes.greatMain, r = e.state.resist.rook;
  assert.equal(r, 3); assert.equal(catwalkRestored(o), false); assert.equal(strangerDue(r, o), false); assert.equal(crateHeld(r, o), false);
});
