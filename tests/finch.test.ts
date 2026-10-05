import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Economy, type StorageAdapter } from '../src/simulation/economy.ts';
import { freshAlignment, resolve, leaning } from '../src/simulation/alignment.ts';
import { benchOffer, acknowledgement, ACK, FINCH } from '../src/simulation/resist.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });
// The world modules paint canvases when loaded; a blank stand-in is enough to load them in node.
const blank: unknown = new Proxy(function () {}, { get: (_, k) => k === Symbol.toPrimitive ? () => 0 : blank, apply: () => blank, set: () => true });
(globalThis as { document?: unknown }).document ??= { createElement: () => blank };
const { FinchRun } = await import('../src/world/finch-run.ts');
const { Consignment } = await import('../src/world/logistics.ts');

test('the bench offers the release only once the pawl is understood, and the governor from the first word of the run', () => {
  assert.deepEqual([0, 1, 2].map(s => benchOffer(s, 'resistance', 1, 'base')), [{ release: 'wait', governor: false }, { release: 'wait', governor: true }, { release: 'ready', governor: true }]);
  for (const s of [0, 1, 2]) { assert.deepEqual(benchOffer(s, 'base', 1, 'base'), { release: null, governor: false }); assert.deepEqual(benchOffer(s, 'ordinance', 0, 'base'), { release: null, governor: false }); assert.deepEqual(benchOffer(s, 'ordinance', 1, 'resistance'), { release: null, governor: false }); }
});
test('the acknowledgement is for a leaning Steward only, one line each, and never says Steward', () => {
  assert.equal(acknowledgement(null), null); assert.equal(acknowledgement('resistance'), ACK.resistance); assert.equal(acknowledgement('ordinance'), ACK.ordinance);
  const a = resolve(resolve(freshAlignment(), 'greatMain', 'resistance', 'rook.diverted', 1)!, 'finchRun', 'ordinance', 'finch.certified', 2)!; assert.equal(acknowledgement(leaning(a)), null);
  for (const l of [...Object.values(ACK), FINCH.wait, FINCH.hand, FINCH.handCustody]) assert.ok(!/Steward/.test(l), l);
});
test('the part is one consignment: taken covertly it is contraband and the winch records the bypass; signed for it is lawful and the winch records the certification', () => {
  const pres = { city: { economy: new Economy(memory()), deck() {}, collider() {}, targets: [] as { id: string }[], ladders: [], onEvent() {} }, root: new T.Group(), workers: [{ person: { group: new T.Group() } }], addWorker: () => 0 };
  const run = new FinchRun(pres as never), e = pres.city.economy; e.state.properties.workshop.level = 1;
  const reset = (stage: number) => { e.state.alignment = freshAlignment(); e.state.alignment.outcomes.greatMain = 'ordinance'; e.state.resist.finch = stage; run.part.drop(); };
  reset(1); assert.equal(run.part.take(), FINCH.wait); assert.equal(run.part.carrying, false);
  reset(2); assert.equal(run.part.take(), null); assert.equal(run.part.contraband, true); assert.equal(run.part.custody, false); assert.equal(run.part.line, FINCH.releaseCarrying); assert.equal(run.part.dest, 'finch.winch');
  assert.equal(run.part.receive!(), true); assert.equal(e.state.alignment.outcomes.finchRun, 'resistance'); assert.ok(e.state.alignment.deeds['finch.bypassed'] !== undefined); assert.equal(e.state.resist.finch, 3);
  reset(1); assert.equal(run.use('finch.order'), FINCH.governor); assert.equal(run.part.custody, true); assert.equal(run.part.contraband, false); assert.equal(run.part.line, FINCH.governorCarrying);
  assert.equal(run.part.receive!(), true); assert.equal(e.state.alignment.outcomes.finchRun, 'ordinance'); assert.ok(e.state.alignment.deeds['finch.certified'] !== undefined);
  assert.equal(run.part.receive!(), false); run.part.drop(); assert.equal(run.use('finch.order'), 'Nothing here needs carrying.');
  reset(2); run.part.take(); assert.equal(run.use('finch.order'), 'You set the release back where it was.'); assert.equal(run.part.carrying, false); assert.equal(e.state.alignment.outcomes.finchRun, 'base');
  reset(0); e.state.properties.workshop.level = 0; assert.equal(run.part.take(true), 'Nothing here needs carrying.');
  Consignment.all = Consignment.all.filter(x => x !== run.part);
});
test('the certified run opens without a word: nobody is posted at the ladder foot, so nothing is said there', () => {
  const pres = { city: { economy: new Economy(memory()), deck() {}, collider() {}, targets: [] as { id: string }[], ladders: [], onEvent() {} }, root: new T.Group(), workers: [{ person: { group: new T.Group() } }], addWorker: () => 0 };
  const run = new FinchRun(pres as never), e = pres.city.economy, said: unknown[] = []; e.state.properties.workshop.level = 1;
  e.state.alignment = freshAlignment(); e.state.alignment.outcomes.greatMain = 'ordinance'; e.state.resist.finch = 1; run.use('finch.order'); assert.equal(run.part.receive!(), true); assert.equal(e.state.alignment.outcomes.finchRun, 'ordinance');
  run.sync(); run.onLine = l => { said.push(l); return true; }; for (let i = 0; i < 5; i++) run.update(.1, i * .1, new T.Vector3(-12.4, 1.75, 20.85));
  assert.equal(said.length, 0); Consignment.all = Consignment.all.filter(x => x !== run.part);
});
