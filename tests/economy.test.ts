import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Economy, freshSave, decodeSave, cityFacts, spacePhase, PHASE, PROPERTIES, SITES, SITE_LIBERATED, type StorageAdapter } from '../src/simulation/economy.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });
test('first repair affordable; purchase rejects insufficient funds without mutation', () => { const e = new Economy(memory()); assert.equal(e.upgrade('scrap'), true); assert.equal(e.state.crowns, 10); assert.equal(e.upgrade('foundry'), false); assert.equal(e.state.properties.foundry.level, 0); });
test('manual businesses pay passive dividends and reserve physical collection', () => { const e = new Economy(memory()); const start = e.state.crowns; for (let i = 0; i < 4; i++) e.tick(1); assert.ok(e.state.crowns > start); assert.ok(e.state.properties.scrap.stored > 0); const stored = e.state.properties.scrap.stored; assert.equal(e.collect('scrap'), stored); assert.equal(e.collect('scrap'), 0); });
test('automation deposits full production without double counting', () => { const e = new Economy(memory()); e.state.crowns = 1000; e.upgrade('scrap'); e.automate('scrap'); const before = e.state.crowns; const rate = e.rate; for (let n = 0; n < 8; n++) e.tick(1); assert.ok(Math.abs(e.state.crowns - before - rate * 8) < 1e-7); assert.equal(e.state.properties.scrap.stored, 0); });
test('time away pays a tenth of the rate, capped at 4h, and future timestamps award zero', () => { const s = freshSave(1e6); const e = new Economy(memory(JSON.stringify(s)), 1e6 + 24 * 3600e3); assert.equal(e.offlineAward, e.rate * 14400 * .1); const f = new Economy(memory(JSON.stringify(s)), 0); assert.equal(f.offlineAward, 0); });
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
  // A suspended tab is time away: it pays the away share, and is not counted as play.
  e.tick(86400); assert.ok(Math.abs(e.state.crowns - before - rate * 14400 * .1) < 1e-7); assert.equal(e.state.playtime, 0);
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
  assert.match(e.siteBlocker('foundry')!, /steam distribution level 2/); e.upgradeInfra('steam'); e.upgradeInfra('steam');
  assert.match(e.siteBlocker('foundry')!, /The Ration Line: open the old main/); e.state.sites.gauge = 3; assert.equal(e.advanceSite('foundry'), true);
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
  const e = new Economy(memory()); e.state.crowns = 1e8; e.state.sites = { market: 3, foundry: 2, row: 1, gauge: 0 };
  const before = e.state.crowns; assert.equal(e.advanceSite('row'), false); assert.equal(e.deliver('row'), false); assert.match(e.siteBlocker('row')!, /forge the cutters/);
  e.state.sites.foundry = 3; assert.equal(cityFacts(e.state.sites).cuttersWaiting, true);
  assert.equal(e.siteBlocker('row'), 'Carried by hand, not bought'); assert.equal(e.advanceSite('row'), false);
  assert.equal(e.deliver('row'), true); assert.equal(e.state.sites.row, 2); assert.equal(e.state.crowns, before);
  assert.equal(cityFacts(e.state.sites).cuttersWaiting, false); assert.equal(cityFacts(e.state.sites).cuttersDelivered, true); assert.equal(e.deliver('row'), false);
});
test('the Directorate responds to smuggling on the Row, and liberation takes the post down', () => {
  const f = (market: number, foundry: number, row: number) => cityFacts({ market, foundry, row, gauge: 0 });
  assert.equal(f(1, 1, 1).inspection, false, 'a courier alone is not noticed');
  assert.equal(f(1, 2, 0).inspection, false, 'false-bottom crates alone are not noticed');
  assert.equal(f(1, 2, 1).inspection, true, 'crates leaving light and a courier run: they notice');
  assert.equal(f(4, 4, 3).inspection, true, 'the post stays until the Row itself is taken');
  const e = new Economy(memory()); e.state.crowns = 1e8; e.state.sites = { market: 3, foundry: 3, row: 3, gauge: 0 };
  assert.match(e.siteBlocker('row')!, /Market Square: raise market square/); e.state.sites.market = 4;
  assert.match(e.siteBlocker('row')!, /Cinder No\. 3: down tools/); e.state.sites.foundry = 4;
  assert.equal(e.advanceSite('row'), true); assert.equal(cityFacts(e.state.sites).inspection, false); assert.equal(cityFacts(e.state.sites).rowFree, true);
  assert.equal(e.siteBlocker('row'), 'Complete');
});
test('the square only rises once the cutters have crossed the city', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; for (const p of PROPERTIES) { e.upgrade(p.id); e.upgrade(p.id); } e.upgradeInfra('lamps'); e.upgradeInfra('gardens'); e.state.sites = { market: 3, foundry: 3, row: 1, gauge: 0 };
  assert.match(e.siteBlocker('market')!, /Cinder Row: run the cutters to the finch/); e.deliver('row'); assert.equal(e.advanceSite('market'), true);
});
test('cross-location progress persists, and saves from before the Row load it as untouched', () => {
  const m = memory(); const e = new Economy(m, 1000); e.state.sites = { market: 2, foundry: 3, row: 2, gauge: 0 }; e.save(1000);
  const back = new Economy(m, 1000).state.sites; assert.deepEqual(back, { market: 2, foundry: 3, row: 2, gauge: 0 }); assert.equal(cityFacts(back).inspection, true);
  const old = freshSave() as unknown as Record<string, unknown>; old.sites = { market: 3, foundry: 3 };
  const d = decodeSave(JSON.stringify(old))!; assert.equal(d.sites.row, 0); assert.equal(cityFacts(d.sites).inspection, false);
});
// Phase 4: the Ration Line, a second route through the same pattern.
test('the Ration Line opens from the Boiler and the yard, and the Directorate posts a warden', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; e.upgrade('boiler');
  assert.match(e.siteBlocker('gauge')!, /Cinder No\. 3: answer the shift board/); e.state.sites.foundry = 1; assert.equal(e.advanceSite('gauge'), true);
  const f = (foundry: number, gauge: number) => cityFacts({ market: 1, foundry, row: 0, gauge });
  assert.equal(f(1, 1).pressureWatch, false, 'knocking alone is not noticed'); assert.equal(f(2, 1).pressureWatch, true, 'pressure bled to covert work is');
  assert.equal(f(4, 3).pressureWatch, true); assert.equal(f(4, 4).pressureWatch, false, 'breaking the ration ends the watch');
});
test('the pressure key is carried, never bought, and the old main is what wakes the Armillary', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; e.upgradeInfra('steam'); e.upgradeInfra('steam'); e.state.sites = { market: 4, foundry: 4, row: 4, gauge: 1 };
  assert.equal(e.deliver('gauge'), true); assert.equal(e.advanceSite('gauge'), true); assert.equal(cityFacts(e.state.sites).mainOpen, true);
  e.state.sites.gauge = 1; e.state.sites.foundry = 2; assert.equal(e.deliver('gauge'), false, 'no key before the yard forges one'); assert.equal(e.advanceSite('gauge'), false);
  e.state.sites.foundry = 3; assert.equal(cityFacts(e.state.sites).keyWaiting, true); assert.equal(e.deliver('gauge'), true); assert.equal(cityFacts(e.state.sites).keyDelivered, true);
});
test('breaking the ration needs the yard free and the Boiler strong; pre-Line saves load it untouched', () => {
  const e = new Economy(memory()); e.state.crowns = 1e8; e.state.sites = { market: 0, foundry: 3, row: 0, gauge: 3 }; e.upgrade('boiler');
  assert.match(e.siteBlocker('gauge')!, /Municipal Boiler restored to level 3/); e.upgrade('boiler'); e.upgrade('boiler');
  assert.match(e.siteBlocker('gauge')!, /Cinder No\. 3: down tools/); e.state.sites.foundry = 4; assert.equal(e.advanceSite('gauge'), true); assert.equal(cityFacts(e.state.sites).lineFree, true);
  const old = freshSave() as unknown as Record<string, unknown>; old.sites = { market: 2, foundry: 3, row: 2 }; assert.equal(decodeSave(JSON.stringify(old))!.sites.gauge, 0);
});
test('the masterwork is a commitment, not the cheapest income in the ledger', () => {
  // Under the old curve level 5 repaid faster than level 1. Each milestone must now take longer to repay than the last.
  for (const p of PROPERTIES) { const e = new Economy(memory()); e.state.crowns = 1e9; e.upgrade(p.id); e.automate(p.id); const payback: number[] = [];
    for (let level = 1; level < 5; level++) { const price = e.cost(p.id), before = e.output(p.id) / p.interval; e.upgrade(p.id); payback[level + 1] = price / (e.output(p.id) / p.interval - before); }
    assert.ok(payback[5] > payback[3] && payback[3] > payback[2] * .8, `${p.id}: ${payback.map(v => Math.round(v)).join(' ')}`);
    assert.ok(payback[5] > 120, `${p.id} masterwork should take minutes, not seconds, to repay`); }
});
test('nothing in the ledger costs less than it did, and the opening stays within reach', () => {
  const e = new Economy(memory()); assert.equal(e.cost('scrap'), 25); assert.equal(e.foremanCost('scrap'), 125);
  for (const site of SITES) for (const step of site.steps) assert.ok(step.carried ? step.cost === 0 : step.cost >= 400);
});
test('each trade discounts or enriches something different, so order of investment matters', () => {
  const fresh = () => { const e = new Economy(memory()); e.state.crowns = 1e9; return e; };
  const scrap = fresh(); const before = scrap.cost('boiler'); for (let i = 0; i < 5; i++) scrap.upgrade('scrap'); assert.equal(scrap.cost('boiler'), Math.ceil(before * .85));
  const boiler = fresh(); const lamps = boiler.infraCost('lamps'); boiler.upgrade('boiler'); assert.equal(boiler.infraCost('lamps'), Math.ceil(lamps * .96));
  const shop = fresh(); const canal = shop.charterCost('canal'); for (let i = 0; i < 5; i++) shop.upgrade('workshop'); assert.equal(shop.charterCost('canal'), Math.ceil(canal * .8)); assert.equal(shop.charterCost('governors'), Math.ceil(7200 * .8));
  const foundry = fresh(); foundry.upgrade('tavern'); const knock = foundry.siteCost('market'); foundry.upgrade('foundry'); foundry.upgrade('foundry'); assert.equal(foundry.siteCost('market'), Math.ceil(knock * .92));
  const paid = foundry.state.crowns; assert.equal(foundry.advanceSite('market'), true); assert.equal(paid - foundry.state.crowns, Math.ceil(knock * .92));
  const tavern = fresh(); assert.equal(tavern.awayShare, .1); for (let i = 0; i < 5; i++) tavern.upgrade('tavern'); assert.ok(Math.abs(tavern.awayShare - .2) < 1e-12);
  const market = fresh(); const m = market.multiplier; market.upgrade('market'); assert.ok(Math.abs(market.multiplier / m - 1.03) < 1e-12);
});
test('what the Steward has seen is kept, pays nothing, and survives a reload; old saves load with none', () => {
  const m = memory(); const e = new Economy(m, 1000); const crowns = e.state.crowns, rate = e.rate;
  assert.equal(e.learn('anchor'), true); assert.equal(e.learn('anchor'), false); assert.equal(e.learn('invented'), false);
  assert.equal(e.state.crowns, crowns); assert.equal(e.rate, rate); e.save(1000);
  assert.deepEqual(new Economy(m, 1000).state.knowledge, ['anchor']);
  const old = freshSave(); delete (old as Partial<typeof old>).knowledge; assert.deepEqual(decodeSave(JSON.stringify(old))!.knowledge, []);
  assert.deepEqual(decodeSave(JSON.stringify({ ...freshSave(), knowledge: ['anchor', 'anchor', 'nonsense', 7] }))!.knowledge, ['anchor']);
});
test('the Anchor survey needs the clasp and a case, not just money; the Ordinance sheet makes it cheaper', () => {
  const e = new Economy(memory()); e.state.crowns = 1e9; for (const p of PROPERTIES) { e.upgrade(p.id); e.upgrade(p.id); e.upgrade(p.id); } assert.ok(e.stage >= 2);
  assert.equal(e.research('anchors'), false); assert.match(e.researchBlocker('anchors')!, /rumour/);
  e.learn('studs'); e.learn('gate'); e.learn('collar'); assert.equal(e.research('anchors'), false, 'three traces without the clasp are not a case');
  e.learn('anchor'); assert.equal(e.researchBlocker('anchors'), null);
  const full = e.charterCost('anchors'); e.learn('survey'); assert.equal(e.charterCost('anchors'), Math.ceil(full * 2 / 3));
  const rate = e.rate; assert.equal(e.research('anchors'), true); assert.ok(Math.abs(e.rate / rate - 1.25) < 1e-9); assert.equal(e.research('anchors'), false);
  const again = new Economy(memory(JSON.stringify(e.state))); assert.ok(again.state.research.includes('anchors'));
});
test('precision governors halve every job, and milestone levels are bigger jobs', () => {
  const e = new Economy(memory()); e.state.crowns = 1e9; assert.deepEqual([e.buildSeconds(1), e.buildSeconds(3), e.buildSeconds(5), e.buildSeconds()], [6, 10, 14, 6]);
  for (const p of PROPERTIES) e.upgrade(p.id); e.upgradeInfra('lamps'); assert.equal(e.research('governors'), true); assert.deepEqual([e.buildSeconds(1), e.buildSeconds(5)], [3, 7]);
});
test('a trait is worth real Crowns on the work still undone, and less as that work gets done', () => {
  const e = new Economy(memory()); e.state.crowns = 1e9; assert.deepEqual(e.traitWorth('boiler').now, 0);
  const next = e.traitWorth('boiler').next; assert.ok(next > 10000, 'one Boiler level should be worth thousands on the civic works');
  e.upgrade('boiler'); assert.equal(e.traitWorth('boiler').now, next); assert.ok(e.traitWorth('boiler').now > e.cost('boiler'), 'raising the Boiler before the civic works pays for itself');
  for (let i = 0; i < 3; i++) e.upgradeInfra('housing'); assert.ok(e.traitWorth('boiler').next < next);
  assert.deepEqual(e.traitWorth('tavern'), { now: 0, next: 0 });
});
test('milestone levels are the big steps; routine levels are modest ones', () => {
  const e = new Economy(memory()); e.state.crowns = 1e9; const price: number[] = []; for (let l = 0; l < 5; l++) { price.push(e.cost('market')); e.upgrade('market'); }
  const step = price.slice(1).map((p, i) => p / price[i]); assert.ok(step[0] < 3 && step[2] < 3, 'levels 2 and 4'); assert.ok(step[1] > 5 && step[3] > 5, 'levels 3 and 5');
});
test('a place reads from who holds its site; the Ordinance only tightens once another site has fallen; prosperity is not an input', () => {
  const s = () => ({ market: 0, foundry: 0, row: 0, gauge: 0 });
  assert.equal(spacePhase(s(), 'row'), PHASE.occupied);
  assert.equal(spacePhase({ ...s(), row: 1 }, 'row'), PHASE.covert);
  assert.equal(spacePhase({ ...s(), row: 2 }, 'row'), PHASE.organized); assert.equal(spacePhase({ ...s(), row: 3 }, 'row'), PHASE.organized);
  assert.equal(spacePhase({ ...s(), row: 1, market: 4 }, 'row'), PHASE.covert, 'nothing to notice yet');
  assert.equal(spacePhase({ ...s(), row: 2, market: 4 }, 'row'), PHASE.contested);
  assert.equal(spacePhase({ ...s(), row: 4 }, 'row'), PHASE.liberated);
  assert.equal(spacePhase({ ...s(), row: 4, market: 4 }, 'row', 'market'), PHASE.liberated); assert.equal(spacePhase({ ...s(), row: 4, market: 5 }, 'row', 'market'), PHASE.restored);
  assert.equal(spacePhase({ ...s(), row: 0, market: 5 }, 'row', 'market'), PHASE.occupied, 'restoration elsewhere does not free a street');
  // Prosperity and control are separate axes: a rich city can be wholly occupied, a poor one free.
  const rich = new Economy(memory()); rich.state.crowns = 1e9; for (const p of PROPERTIES) for (let i = 0; i < 5; i++) rich.upgrade(p.id); assert.ok(rich.stage >= 4); assert.equal(spacePhase(rich.state.sites, 'market'), PHASE.occupied);
  const poor = new Economy(memory()); poor.state.sites.market = 4; assert.equal(poor.stage, 0); assert.equal(spacePhase(poor.state.sites, 'market'), PHASE.liberated);
});
