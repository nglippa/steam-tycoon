import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Economy, freshSave, decodeSave, cityFacts, PROPERTIES, SITES, SITE_LIBERATED, type StorageAdapter } from '../src/simulation/economy.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });
test('first repair affordable; purchase rejects insufficient funds without mutation', () => { const e = new Economy(memory()); assert.equal(e.upgrade('scrap'), true); assert.equal(e.state.crowns, 10); assert.equal(e.upgrade('foundry'), false); assert.equal(e.state.properties.foundry.level, 0); });
test('manual businesses pay passive dividends and reserve physical collection', () => { const e = new Economy(memory()); const start = e.state.crowns; for (let i = 0; i < 4; i++) e.tick(1); assert.ok(e.state.crowns > start); assert.ok(e.state.properties.scrap.stored > 0); const stored = e.state.properties.scrap.stored; assert.equal(e.collect('scrap'), stored); assert.equal(e.collect('scrap'), 0); });
test('automation deposits full production without double counting', () => { const e = new Economy(memory()); e.state.crowns = 1000; e.upgrade('scrap'); e.automate('scrap'); const before = e.state.crowns; const rate = e.rate; for (let n = 0; n < 8; n++) e.tick(1); assert.ok(Math.abs(e.state.crowns - before - rate * 8) < 1e-7); assert.equal(e.state.properties.scrap.stored, 0); });
test('offline dividends capped at 4h and future timestamps award zero', () => { const s = freshSave(1e6); const e = new Economy(memory(JSON.stringify(s)), 1e6 + 24 * 3600e3); assert.equal(e.offlineAward, e.rate * 14400); const f = new Economy(memory(JSON.stringify(s)), 0); assert.equal(f.offlineAward, 0); });
test('roundtrip, v1 migration, corrupted and invalid save recovery', () => { const m = memory(); const e = new Economy(m, 1000); e.upgrade('scrap'); e.save(1000); assert.equal(new Economy(m, 1000).state.properties.scrap.level, 1); assert.equal(decodeSave('{oops'), null); const s = freshSave(); assert.equal(decodeSave(JSON.stringify({ ...s, version: 1 }))?.version, 3); assert.equal(decodeSave(JSON.stringify({ ...s, crowns: -500 }))?.crowns, 0); });
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
test('site steps are gated by the economy and never advance on a blocked or unaffordable step', () => {
  const e = new Economy(memory()); e.state.crowns = 1e6;
  assert.match(e.siteBlocker('market')!, /Copper Finch/); assert.equal(e.advanceSite('market'), false); assert.equal(e.state.sites.market, 0);
  e.upgrade('tavern'); assert.equal(e.siteBlocker('market'), null); assert.equal(e.advanceSite('market'), true); assert.equal(e.state.sites.market, 1);
  e.state.crowns = 10; e.upgrade('market'); e.state.crowns = 10; assert.equal(e.advanceSite('market'), false); assert.equal(e.state.sites.market, 1); assert.equal(e.state.crowns, 10);
});
test('liberation raises income without changing prosperity stage; restoration adds more', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; for (const p of PROPERTIES) { e.upgrade(p.id); e.upgrade(p.id); } e.upgradeInfra('lamps'); e.upgradeInfra('gardens');
  for (let i = 0; i < 3; i++) assert.equal(e.advanceSite('market'), true); e.state.sites.row = 2;
  const stage = e.stage, occupied = e.rate; assert.equal(e.advanceSite('market'), true); assert.equal(e.state.sites.market, SITE_LIBERATED);
  assert.equal(e.stage, stage); assert.ok(Math.abs(e.rate / occupied - 1.15) < 1e-9);
  assert.equal(e.advanceSite('market'), true); assert.ok(Math.abs(e.rate / occupied - 1.25) < 1e-9);
  assert.equal(e.advanceSite('market'), false); assert.equal(e.state.sites.market, SITES[0].steps.length);
});
test('liberation waits for prosperity and restoration waits for clean water', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; e.upgrade('tavern'); e.upgrade('tavern'); e.upgrade('market'); for (let i = 0; i < 3; i++) e.advanceSite('market');
  assert.match(e.siteBlocker('market')!, /Industry/); for (const p of PROPERTIES) { e.upgrade(p.id); e.upgrade(p.id); } assert.equal(e.stage, 2);
  assert.match(e.siteBlocker('market')!, /Cinder Row: run the cutters to the finch/); e.state.sites.row = 2;
  assert.equal(e.advanceSite('market'), true); assert.match(e.siteBlocker('market')!, /gardens/); e.upgradeInfra('gardens'); assert.equal(e.advanceSite('market'), true);
});
test('site progress survives save roundtrip, v2 saves migrate as occupied and invalid values clamp', () => {
  const m = memory(); const e = new Economy(m, 1000); e.state.sites.market = 3; e.save(1000); assert.equal(new Economy(m, 1000).state.sites.market, 3);
  const v2 = { ...freshSave(), version: 2 } as Record<string, unknown>; delete v2.sites; assert.equal(decodeSave(JSON.stringify(v2))?.sites.market, 0);
  assert.equal(decodeSave(JSON.stringify({ ...freshSave(), sites: { market: 99 } }))?.sites.market, 5);
  assert.equal(decodeSave(JSON.stringify({ ...freshSave(), sites: { market: 'x' } }))?.sites.market, 0);
});
test('the resistance is a network: the Finch vouches for the foundry, the foundry arms the square', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; e.upgrade('foundry');
  assert.match(e.siteBlocker('foundry')!, /Market Square: knock at the copper finch cellar/); assert.equal(e.advanceSite('foundry'), false);
  e.upgrade('tavern'); e.advanceSite('market'); assert.equal(e.advanceSite('foundry'), true);
  assert.match(e.siteBlocker('foundry')!, /Cinder & Iron restored to level 2/); e.upgrade('foundry'); assert.equal(e.advanceSite('foundry'), true);
  e.upgrade('foundry'); assert.equal(e.advanceSite('foundry'), true); assert.equal(e.state.sites.foundry, 3);
});
test('a profitable foundry stays occupied until its own workers down tools', () => {
  const e = new Economy(memory()); e.state.crowns = 1e9; for (let i = 0; i < 5; i++) for (const p of PROPERTIES) e.upgrade(p.id);
  assert.equal(e.state.properties.foundry.level, 5); assert.equal(e.state.sites.foundry, 0);
  e.state.sites.market = 1; for (let i = 0; i < 3; i++) assert.equal(e.advanceSite('foundry'), true);
  const before = e.rate; assert.equal(e.advanceSite('foundry'), true); assert.equal(e.state.sites.foundry, SITE_LIBERATED); assert.ok(Math.abs(e.rate / before - 1.15) < 1e-9);
  assert.match(e.siteBlocker('foundry')!, /steam distribution level 2/); e.upgradeInfra('steam'); e.upgradeInfra('steam'); assert.equal(e.advanceSite('foundry'), true);
  assert.equal(e.state.sites.market, 1);
});
test('v3 saves written before the foundry site load it as occupied', () => {
  const s = freshSave() as unknown as Record<string, unknown>; s.sites = { market: 4 };
  const d = decodeSave(JSON.stringify(s))!; assert.equal(d.sites.market, 4); assert.equal(d.sites.foundry, 0);
});
// Phase 3: the city responds. Cinder Row joins the square and the yard into one sequence.
test('Cinder Row needs both ends of the network before a courier can run it', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; e.upgrade('tavern'); e.upgrade('foundry');
  assert.match(e.siteBlocker('row')!, /Market Square: knock at the copper finch cellar/);
  e.advanceSite('market'); assert.match(e.siteBlocker('row')!, /Cinder No\. 3: answer the shift board/); assert.equal(e.advanceSite('row'), false);
  e.advanceSite('foundry'); assert.equal(e.advanceSite('row'), true); assert.equal(cityFacts(e.state.sites).courierRun, true);
});
test('the cutters must be carried: the step cannot be bought, only delivered once forged', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; e.state.sites = { market: 3, foundry: 2, row: 1 };
  const before = e.state.crowns; assert.equal(e.advanceSite('row'), false); assert.equal(e.deliver('row'), false); assert.match(e.siteBlocker('row')!, /forge the cutters/);
  e.state.sites.foundry = 3; assert.equal(cityFacts(e.state.sites).cuttersWaiting, true);
  assert.equal(e.siteBlocker('row'), 'Carried by hand, not bought'); assert.equal(e.advanceSite('row'), false);
  assert.equal(e.deliver('row'), true); assert.equal(e.state.sites.row, 2); assert.equal(e.state.crowns, before);
  assert.equal(cityFacts(e.state.sites).cuttersWaiting, false); assert.equal(cityFacts(e.state.sites).cuttersDelivered, true); assert.equal(e.deliver('row'), false);
});
test('the Directorate responds to smuggling on the Row, and liberation takes the post down', () => {
  const f = (market: number, foundry: number, row: number) => cityFacts({ market, foundry, row });
  assert.equal(f(1, 1, 1).inspection, false, 'a courier alone is not noticed');
  assert.equal(f(1, 2, 0).inspection, false, 'false-bottom crates alone are not noticed');
  assert.equal(f(1, 2, 1).inspection, true, 'crates leaving light and a courier run: they notice');
  assert.equal(f(4, 4, 3).inspection, true, 'the post stays until the Row itself is taken');
  const e = new Economy(memory()); e.state.crowns = 1e8; e.state.sites = { market: 3, foundry: 3, row: 3 };
  assert.match(e.siteBlocker('row')!, /Market Square: raise market square/); e.state.sites.market = 4;
  assert.match(e.siteBlocker('row')!, /Cinder No\. 3: down tools/); e.state.sites.foundry = 4;
  assert.equal(e.advanceSite('row'), true); assert.equal(cityFacts(e.state.sites).inspection, false); assert.equal(cityFacts(e.state.sites).rowFree, true);
  assert.equal(e.siteBlocker('row'), 'Complete');
});
test('the square only rises once the cutters have crossed the city', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; for (const p of PROPERTIES) { e.upgrade(p.id); e.upgrade(p.id); } e.upgradeInfra('lamps'); e.upgradeInfra('gardens'); e.state.sites = { market: 3, foundry: 3, row: 1 };
  assert.match(e.siteBlocker('market')!, /Cinder Row: run the cutters to the finch/); e.deliver('row'); assert.equal(e.advanceSite('market'), true);
});
test('cross-location progress persists, and saves from before the Row load it as untouched', () => {
  const m = memory(); const e = new Economy(m, 1000); e.state.sites = { market: 2, foundry: 3, row: 2 }; e.save(1000);
  const back = new Economy(m, 1000).state.sites; assert.deepEqual(back, { market: 2, foundry: 3, row: 2 }); assert.equal(cityFacts(back).inspection, true);
  const old = freshSave() as unknown as Record<string, unknown>; old.sites = { market: 3, foundry: 3 };
  const d = decodeSave(JSON.stringify(old))!; assert.equal(d.sites.row, 0); assert.equal(cityFacts(d.sites).inspection, false);
});
