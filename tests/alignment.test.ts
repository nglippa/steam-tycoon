import test from 'node:test';
import assert from 'node:assert/strict';
import type { Alignment } from '../src/simulation/alignment.ts';
import { freshAlignment, resolve, phase, leaning, commit, tilt, standing, crossing, callOffered, COMMITS, runOpen, DEEDS, catwalkRestored, crateHeld, strangerDue } from '../src/simulation/alignment.ts';
import { Economy, freshSave, decodeSave, type StorageAdapter } from '../src/simulation/economy.ts';
import { bookendDue, advanceFinch, advanceCall, callHour, CALL_DONE, finchOffered, canBypass, canCertify, FINCH_DONE } from '../src/simulation/resist.ts';
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
  const c = load({ alignment: { ...freshAlignment(), commit: { side: 'ordinance', at: 9, by: 'call.reported' } } }); assert.equal(phase(c.alignment), 'committed');
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
  assert.deepEqual(Object.keys(DEEDS).sort(), ['finch.bypassed', 'finch.certified', 'rook.custody', 'rook.diverted']);
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

test('Service Run 7 starts base; an older save without it loads base and stage 0', () => {
  assert.equal(freshAlignment().outcomes.finchRun, 'base'); assert.equal(freshSave().resist.finch, 0);
  const old = { ...freshSave(), resist: { rook: 4 }, alignment: { ...freshAlignment(), outcomes: { greatMain: 'resistance' } } } as unknown as Record<string, unknown>;
  const d = decodeSave(JSON.stringify(old))!; assert.equal(d.alignment.outcomes.finchRun, 'base'); assert.equal(d.resist.finch, 0); assert.equal(d.alignment.outcomes.greatMain, 'resistance');
});
test('each side resolves the run only from base, only with its own deed, and never twice', () => {
  const b = resolve(freshAlignment(), 'finchRun', 'resistance', 'finch.bypassed', 5)!, c = resolve(freshAlignment(), 'finchRun', 'ordinance', 'finch.certified', 5)!;
  assert.equal(b.outcomes.finchRun, 'resistance'); assert.equal(c.outcomes.finchRun, 'ordinance'); assert.equal(b.deeds['finch.bypassed'], 5);
  assert.equal(resolve(b, 'finchRun', 'ordinance', 'finch.certified', 6), null); assert.equal(resolve(c, 'finchRun', 'resistance', 'finch.bypassed', 6), null); assert.equal(resolve(b, 'finchRun', 'resistance', 'finch.bypassed', 6), null);
  assert.equal(resolve(freshAlignment(), 'finchRun', 'resistance', 'finch.certified', 1), null); assert.equal(resolve(freshAlignment(), 'finchRun', 'resistance', 'rook.diverted', 1), null); assert.equal(resolve(freshAlignment(), 'greatMain', 'resistance', 'finch.bypassed', 1), null);
  assert.deepEqual(['base', 'resistance', 'ordinance'].map(o => runOpen(o as never)), [false, true, true]);
});
test('the two sites settle independently', () => {
  const r = resolve(freshAlignment(), 'greatMain', 'resistance', 'rook.diverted', 1)!, f = resolve(r, 'finchRun', 'ordinance', 'finch.certified', 2)!;
  assert.equal(f.outcomes.greatMain, 'resistance'); assert.equal(f.outcomes.finchRun, 'ordinance'); assert.equal(resolve(freshAlignment(), 'finchRun', 'resistance', 'finch.bypassed', 1)!.outcomes.greatMain, 'base');
  const e = new Economy(memory()); assert.equal(e.resolve('finchRun', 'resistance', 'finch.bypassed'), true);
  assert.equal(e.state.resist.finch, 3); assert.equal(e.state.resist.rook, 0); assert.equal(e.state.alignment.outcomes.greatMain, 'base');
  assert.equal(e.resolve('finchRun', 'ordinance', 'finch.certified'), false); assert.equal(e.resolve('greatMain', 'ordinance', 'rook.custody'), true); assert.equal(e.state.resist.rook, 3); assert.equal(e.state.resist.finch, 3);
  e.reset(); assert.equal(e.state.resist.finch, 0); assert.equal(e.state.alignment.outcomes.finchRun, 'base');
});
test('one Rook deed is uncommitted; matching Rook and Finch deeds lean; mixed histories stay uncommitted; the lock and the break stay null', () => {
  const rd = resolve(freshAlignment(), 'greatMain', 'resistance', 'rook.diverted', 1)!, rc = resolve(freshAlignment(), 'greatMain', 'ordinance', 'rook.custody', 1)!;
  assert.equal(phase(rd), 'uncommitted'); assert.equal(leaning(rd), null);
  const rr = resolve(rd, 'finchRun', 'resistance', 'finch.bypassed', 2)!, oo = resolve(rc, 'finchRun', 'ordinance', 'finch.certified', 2)!, ro = resolve(rd, 'finchRun', 'ordinance', 'finch.certified', 2)!, or = resolve(rc, 'finchRun', 'resistance', 'finch.bypassed', 2)!;
  assert.equal(phase(rr), 'leaning'); assert.equal(leaning(rr), 'resistance'); assert.equal(leaning(oo), 'ordinance');
  for (const m of [ro, or]) { assert.equal(phase(m), 'uncommitted'); assert.equal(leaning(m), null); }
  for (const a of [rr, oo, ro, or]) { assert.equal(a.commit, null); assert.equal(a.broke, null); }
  assert.equal(leaning({ ...rr, commit: { side: 'resistance', at: 1, by: 'x' } }), null);
});
test('the Finch stage and the run outcome stay in step both ways, and clamp', () => {
  const lifted = load({ alignment: { ...freshAlignment(), outcomes: { greatMain: 'base', finchRun: 'ordinance' } }, resist: { rook: 0, finch: 0 } });
  assert.equal(lifted.resist.finch, 3); assert.equal(lifted.alignment.outcomes.finchRun, 'ordinance'); assert.equal(lifted.resist.rook, 0);
  assert.equal(load({ resist: { rook: 0, finch: 3 } }).resist.finch, 2); assert.equal(load({ resist: { rook: 0, finch: 9 } }).resist.finch, 2); assert.equal(load({ resist: { rook: 0, finch: -4 } }).resist.finch, 0); assert.equal(load({ resist: { rook: 0, finch: 1.7 } }).resist.finch, 1);
  for (const s of [freshSave(), load({ resist: { rook: 0, finch: 2 } }), lifted]) assert.equal(s.resist.finch === 3, s.alignment.outcomes.finchRun !== 'base');
});
test('the Finch stage only moves one step at a time, and never to settled by hand', () => {
  assert.equal(advanceFinch(0, 1), 1); assert.equal(advanceFinch(0, 2), 0); assert.equal(advanceFinch(1, 2), 2); assert.equal(advanceFinch(2, 3), 2); assert.equal(advanceFinch(1, 1), 1);
  const e = new Economy(memory()); assert.equal(e.advanceFinch(1), true); assert.equal(e.advanceFinch(3), false); assert.equal(e.advanceFinch(2), true); assert.equal(e.advanceFinch(3), false); assert.equal(e.state.resist.finch, 2); assert.equal(FINCH_DONE, 3);
});
test('the offers need the Great Main settled, Finch owned and the run still base; the bypass needs the pawl, the certification only the order', () => {
  for (const g of ['resistance', 'ordinance'] as const) assert.equal(finchOffered(g, 1, 'base'), true);
  assert.equal(finchOffered('base', 1, 'base'), false); assert.equal(finchOffered('resistance', 0, 'base'), false); assert.equal(finchOffered('resistance', 1, 'resistance'), false); assert.equal(finchOffered('ordinance', 3, 'ordinance'), false);
  assert.deepEqual([0, 1, 2].map(s => canBypass(s, 'ordinance', 1, 'base')), [false, false, true]); assert.deepEqual([0, 1, 2].map(s => canCertify(s, 'resistance', 1, 'base')), [false, true, true]);
  assert.equal(canBypass(2, 'base', 1, 'base'), false); assert.equal(canCertify(1, 'resistance', 0, 'base'), false); assert.equal(canCertify(2, 'resistance', 1, 'ordinance'), false);
});

const R = resolve(freshAlignment(), 'greatMain', 'resistance', 'rook.diverted', 1)!, RR = resolve(R, 'finchRun', 'resistance', 'finch.bypassed', 2)!, OO = resolve(resolve(freshAlignment(), 'greatMain', 'ordinance', 'rook.custody', 1)!, 'finchRun', 'ordinance', 'finch.certified', 2)!, RO = resolve(R, 'finchRun', 'ordinance', 'finch.certified', 2)!, OR = resolve(resolve(freshAlignment(), 'greatMain', 'ordinance', 'rook.custody', 1)!, 'finchRun', 'resistance', 'finch.bypassed', 2)!;
const settled = (a: Alignment, market = 0) => { const e = new Economy(memory()); e.state.alignment = a; e.state.resist.rook = 3; e.state.resist.finch = FINCH_DONE; e.state.sites.market = market; return e; };
test('commit is pure and once: it commits the side with the act, never twice, never for the wrong act, never after a break, and leaves deeds and outcomes alone', () => {
  const c = commit(RR, 'resistance', 'call.sent', 9)!; assert.deepEqual(c.commit, { side: 'resistance', at: 9, by: 'call.sent' }); assert.equal(RR.commit, null);
  assert.deepEqual(c.deeds, RR.deeds); assert.deepEqual(c.outcomes, RR.outcomes); assert.equal(phase(c), 'committed');
  assert.equal(commit(c, 'resistance', 'call.sent', 10), null); assert.equal(commit(c, 'ordinance', 'call.reported', 10), null);
  assert.equal(commit(RR, 'ordinance', 'call.sent', 9), null); assert.equal(commit(RR, 'resistance', 'call.reported', 9), null); assert.equal(commit(RR, 'resistance', 'nope', 9), null); assert.equal(commit(RR, 'ordinance', 'call.reported', 9)!.commit!.side, 'ordinance');
  assert.equal(commit({ ...RR, broke: { from: 'resistance', at: 1, by: 'x' } }, 'resistance', 'call.sent', 9), null); assert.deepEqual(COMMITS, { 'call.sent': 'resistance', 'call.reported': 'ordinance' });
});
test('standing follows the commitment over the deeds in both directions; tilt ignores it; crossing reads kept, crossed, open and null', () => {
  assert.equal(tilt(RR), 'resistance'); assert.equal(tilt(OO), 'ordinance'); assert.equal(tilt(RO), null); assert.equal(standing(RR), 'resistance'); assert.equal(standing(RO), null); assert.equal(standing(freshAlignment()), null);
  const sent = commit(OO, 'resistance', 'call.sent', 5)!, signed = commit(RR, 'ordinance', 'call.reported', 5)!;
  assert.equal(tilt(sent), 'ordinance'); assert.equal(standing(sent), 'resistance'); assert.equal(standing(signed), 'ordinance'); assert.equal(leaning(sent), null); assert.equal(phase(sent), 'committed');
  assert.equal(crossing(sent), 'crossed'); assert.equal(crossing(signed), 'crossed'); assert.equal(crossing(commit(RR, 'resistance', 'call.sent', 5)!), 'kept'); assert.equal(crossing(commit(OO, 'ordinance', 'call.reported', 5)!), 'kept');
  assert.equal(crossing(commit(RO, 'resistance', 'call.sent', 5)!), 'open'); assert.equal(crossing(commit(OR, 'ordinance', 'call.reported', 5)!), 'open'); assert.equal(crossing(RR), null); assert.equal(crossing(freshAlignment()), null);
});
test('the call is offered only with both sites settled in any mix, nothing committed or broken, and the square still held', () => {
  for (const a of [RR, OO, RO, OR]) assert.equal(callOffered(a, 0, 4), true);
  for (const a of [freshAlignment(), R]) assert.equal(callOffered(a, 0, 4), false);
  assert.equal(callOffered(RR, 3, 4), true); assert.equal(callOffered(RR, 4, 4), false); assert.equal(callOffered(RR, 5, 4), false);
  assert.equal(callOffered(commit(RR, 'resistance', 'call.sent', 1)!, 0, 4), false); assert.equal(callOffered({ ...RR, broke: { from: 'resistance', at: 1, by: 'x' } }, 0, 4), false);
});
test('an uncommitted pre-Signal save decodes uncommitted whatever its deeds, and a valid commitment round-trips', () => {
  for (const a of [freshAlignment(), RR, OO, RO, OR]) { const d = load({ resist: { rook: 3, finch: 3 }, alignment: a }); assert.equal(d.alignment.commit, null); assert.equal(d.resist.call, 0); }
  for (const [side, by] of [['resistance', 'call.sent'], ['ordinance', 'call.reported']] as const) { const d = load({ resist: { rook: 3, finch: 3 }, alignment: { ...RR, commit: { side, at: 12, by } } }); assert.deepEqual(d.alignment.commit, { side, at: 12, by }); assert.equal(d.resist.call, CALL_DONE); assert.deepEqual(decodeSave(JSON.stringify(d))!.alignment, d.alignment); }
});
test('an invalid side, a mismatched by or an unknown by decodes to no commitment', () => {
  for (const commitBad of [{ side: 'bad', at: 1, by: 'call.sent' }, { side: 'resistance', at: 1, by: 'call.reported' }, { side: 'ordinance', at: 1, by: 'call.sent' }, { side: 'ordinance', at: 1, by: 'x' }, { side: 'resistance', at: 1 }, { side: 'resistance', at: 1, by: 7 }]) { const d = load({ resist: { call: 2 }, alignment: { ...RR, commit: commitBad } }); assert.equal(d.alignment.commit, null); assert.equal(d.resist.call, 1); }
});
test('the call stage clamps 0 to 2, defaults to 0, settles with the commitment, and only steps forward one at a time up to heard', () => {
  assert.equal(freshSave().resist.call, 0); assert.equal(load({ resist: { rook: 0 } }).resist.call, 0); assert.equal(load({ resist: { call: 9 } }).resist.call, 1); assert.equal(load({ resist: { call: -3 } }).resist.call, 0); assert.equal(load({ resist: { call: 1 } }).resist.call, 1);
  assert.equal(advanceCall(0, 1), 1); assert.equal(advanceCall(0, 2), 0); assert.equal(advanceCall(1, 2), 1); assert.equal(advanceCall(1, 1), 1); assert.equal(advanceCall(1, 0), 1);
  const e = settled(RR); assert.equal(e.advanceCall(2), false); assert.equal(e.advanceCall(1), true); assert.equal(e.state.resist.call, 1); assert.equal(e.advanceCall(1), false);
});
test('Economy.commit is refused before both sites settle, with the square liberated, or twice; it succeeds once, persists, and reset clears it', () => {
  for (const e of [new Economy(memory()), settled(R), settled(RR, 4), settled(RR, 5)]) { const before = JSON.stringify(e.state); assert.equal(e.commit('resistance', 'call.sent'), false); assert.equal(JSON.stringify(e.state), before); }
  let raw: string | null = null; const store: StorageAdapter = { read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } }, e = new Economy(store); e.state.alignment = RR; e.state.resist.rook = 3; e.state.resist.finch = FINCH_DONE; e.state.playtime = 77;
  const events: string[] = []; e.onChange = (k, v) => events.push(`${k}:${v}`);
  assert.equal(e.commit('ordinance', 'call.sent'), false); assert.equal(e.commit('resistance', 'call.reported'), false); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0);
  assert.equal(e.commit('resistance', 'call.sent'), true); assert.deepEqual(e.state.alignment.commit, { side: 'resistance', at: 77, by: 'call.sent' }); assert.equal(e.state.resist.call, 2); assert.deepEqual(events, ['alignment:commit']);
  assert.equal(e.commit('resistance', 'call.sent'), false); assert.equal(e.commit('ordinance', 'call.reported'), false); assert.equal((e.state.alignment as Alignment).commit!.side, 'resistance');
  const again = new Economy(store); assert.deepEqual(again.state.alignment.commit, { side: 'resistance', at: 77, by: 'call.sent' }); assert.equal(again.state.resist.call, 2);
  again.reset(); assert.equal(again.state.alignment.commit, null); assert.equal(again.state.resist.call, 0); assert.deepEqual(again.state.alignment, freshAlignment());
});
test('a commit leaves the deeds and outcomes exactly as they were, and an ordinance commit seals the nightly lamp', () => {
  const e = settled(OR, 2), deeds = JSON.stringify(e.state.alignment.deeds), outcomes = JSON.stringify(e.state.alignment.outcomes), rook = e.state.resist.rook, finch = e.state.resist.finch;
  assert.equal(e.commit('ordinance', 'call.reported'), true); assert.equal(JSON.stringify(e.state.alignment.deeds), deeds); assert.equal(JSON.stringify(e.state.alignment.outcomes), outcomes); assert.equal(e.state.resist.rook, rook); assert.equal(e.state.resist.finch, finch);
  const lamp = (side: 'resistance' | 'ordinance', by: string) => { const x = settled(RR, 2); x.state.day = .95; x.state.playtime = 1e6; assert.equal(x.canSignal(), true); x.commit(side, by); return x.canSignal(); };
  assert.equal(lamp('ordinance', 'call.reported'), false); assert.equal(lamp('resistance', 'call.sent'), true);
});
test('after dusk is seven in the evening to five in the morning', () => { for (const [h, v] of [[4, true], [5, false], [12, false], [18, false], [19, true], [23, true], [0, true]] as const) assert.equal(callHour(h / 24 + .001), v, String(h)); });
