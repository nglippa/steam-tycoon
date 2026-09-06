import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Economy, freshSave, decodeSave, PROPERTIES, type StorageAdapter } from '../src/simulation/economy.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });
test('first repair affordable; purchase rejects insufficient funds without mutation', () => { const e = new Economy(memory()); assert.equal(e.upgrade('scrap'), true); assert.equal(e.state.crowns, 10); assert.equal(e.upgrade('foundry'), false); assert.equal(e.state.properties.foundry.level, 0); });
test('manual businesses pay passive dividends and reserve physical collection', () => { const e = new Economy(memory()); const start = e.state.crowns; for (let i = 0; i < 4; i++) e.tick(1); assert.ok(e.state.crowns > start); assert.ok(e.state.properties.scrap.stored > 0); const stored = e.state.properties.scrap.stored; assert.equal(e.collect('scrap'), stored); assert.equal(e.collect('scrap'), 0); });
test('automation deposits full production without double counting', () => { const e = new Economy(memory()); e.state.crowns = 1000; e.upgrade('scrap'); e.automate('scrap'); const before = e.state.crowns; const rate = e.rate; for (let n = 0; n < 8; n++) e.tick(1); assert.ok(Math.abs(e.state.crowns - before - rate * 8) < 1e-7); assert.equal(e.state.properties.scrap.stored, 0); });
test('offline dividends capped at 4h and future timestamps award zero', () => { const s = freshSave(1e6); const e = new Economy(memory(JSON.stringify(s)), 1e6 + 24 * 3600e3); assert.equal(e.offlineAward, e.rate * 14400); const f = new Economy(memory(JSON.stringify(s)), 0); assert.equal(f.offlineAward, 0); });
test('roundtrip, v1 migration, corrupted and invalid save recovery', () => { const m = memory(); const e = new Economy(m, 1000); e.upgrade('scrap'); e.save(1000); assert.equal(new Economy(m, 1000).state.properties.scrap.level, 1); assert.equal(decodeSave('{oops'), null); const s = freshSave(); assert.equal(decodeSave(JSON.stringify({ ...s, version: 1 }))?.version, 2); assert.equal(decodeSave(JSON.stringify({ ...s, crowns: -500 }))?.crowns, 0); });
test('milestones, infrastructure and research change real income and gates', () => { const e = new Economy(memory()); e.state.crowns = 1e8; const base = e.rate; for (const p of PROPERTIES) e.upgrade(p.id); e.upgradeInfra('lamps'); assert.equal(e.stage, 1); assert.ok(e.rate > base * 3); assert.equal(e.unlock('canal'), true); assert.equal(e.unlock('heights'), false); assert.equal(e.research('governors'), true); assert.equal(e.research('governors'), false); });
test('levels capped and reset restores coherent new game', () => { const e = new Economy(memory()); e.state.crowns = 1e8; for (let i = 0; i < 5; i++) assert.equal(e.upgrade('scrap'), true); assert.equal(e.upgrade('scrap'), false); e.reset(); assert.equal(e.state.crowns, 35); assert.equal(e.state.properties.scrap.level, 0); });
test('background catch-up matches continuous production without dropping elapsed time', () => {
  const e = new Economy(memory(), 1000); const continuous = new Economy(memory(), 1000);
  e.tick(93.5); for (let i = 0; i < 187; i++) continuous.tick(.5);
  assert.ok(Math.abs(e.state.crowns - continuous.state.crowns) < 1e-8);
  for (const p of PROPERTIES) { assert.ok(Math.abs(e.state.properties[p.id].stored - continuous.state.properties[p.id].stored) < 1e-8); assert.equal(e.state.properties[p.id].progress, continuous.state.properties[p.id].progress); }
  assert.equal(e.state.playtime, 93.5);
});
test('long suspension caps accrual and invalid elapsed values cannot corrupt treasury', () => {
  const e = new Economy(memory(), 1000); const before = e.state.crowns; const rate = e.rate;
  e.tick(86400); assert.ok(Math.abs(e.state.crowns - before - rate * 14400) < 1e-7);
  const value = e.state.crowns; e.tick(NaN); e.tick(Infinity); e.tick(-20); assert.equal(e.state.crowns, value);
});
test('duplicate or unknown save bonuses cannot inflate city output', () => {
  const s = freshSave(); const decoded = decodeSave(JSON.stringify({ ...s, districts: ['canal', 'canal'], research: ['aether', 'aether'], discoveries: ['map', 'map', 'invented'] }))!;
  assert.deepEqual(decoded.districts, ['canal']); assert.deepEqual(decoded.research, ['aether']); assert.deepEqual(decoded.discoveries, ['map']);
});
test('invalid spending and discoveries cannot create money', () => {
  const e = new Economy(memory()); for (const n of [-10, NaN, Infinity]) assert.equal(e.spend(n), false);
  assert.equal(e.discover('invented'), false); assert.equal(e.state.crowns, 35);
});
