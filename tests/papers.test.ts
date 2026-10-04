import test from 'node:test';
import assert from 'node:assert/strict';
import { clerkContact, custodyAllowed, HOLD } from '../src/simulation/resist.ts';
import { laneClear, scrutiny, freightLane, transitSet, transitHolds, TRANSIT, type Gate } from '../src/simulation/occupation.ts';
import { Economy, type StorageAdapter } from '../src/simulation/economy.ts';
import { catwalkRestored, crateHeld, strangerDue } from '../src/simulation/alignment.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });
const GATES: Gate[] = ['open', 'gone', 'light', 'manned', 'sealed'];
import * as T from 'three';
// The world modules paint canvases when loaded; a blank stand-in is enough to load them in node. (node:test runs each file in its own process, so this does not leak.)
const blank: unknown = new Proxy(function () {}, { get: (_, k) => k === Symbol.toPrimitive ? () => 0 : blank, apply: () => blank, set: () => true });
(globalThis as { document?: unknown }).document ??= { createElement: () => blank };
const { Consignment } = await import('../src/world/logistics.ts');

test('the clerk is there for everyone while the stock is held: the keeper is offered custody, a stranger is refused standing', () => {
  for (const stage of [1, 2]) { assert.equal(clerkContact(0, 'base', stage), 'refused'); assert.equal(clerkContact(1, 'base', stage), 'offer'); assert.equal(clerkContact(5, 'base', stage), 'offer'); }
  assert.equal(custodyAllowed(0, 'base', 2), false); assert.equal(custodyAllowed(1, 'base', 1), true); assert.equal(custodyAllowed(3, 'base', 2), true);
});
test('there is nothing to sign before the report, after the delivery, or on a site already resolved', () => {
  for (const level of [0, 1]) { assert.equal(clerkContact(level, 'base', 0), 'none'); for (const stage of [3, 4]) assert.equal(clerkContact(level, 'base', stage), 'none');
    for (const outcome of ['resistance', 'ordinance'] as const) for (const stage of [0, 1, 2, 3, 4]) { assert.equal(clerkContact(level, outcome, stage), 'none'); assert.equal(custodyAllowed(level, outcome, stage), false); } }
});
test('the clerk speaks as a bureaucrat, never says Steward, and the refusal and the offer differ', () => {
  const h = HOLD.scrap!; for (const l of [h.standing, h.offer, h.custodyTaken, h.custodyCarrying]) { assert.ok(l); assert.ok(!/Steward/.test(l), l); }
  assert.match(h.standing, /citizen/); assert.notEqual(h.standing, h.offer); assert.match(h.custodyCarrying, /Great Main/);
});
test('a covert take is contraband, a take under signature is lawful and ignores the clerk’s eye, and putting it back clears both', () => {
  let watched = true; const c = new Consignment('test.crate', null, 'test.dock', new T.Group(), { x: 0, z: 0 }, () => {}, () => true, 'taken', () => watched ? 'watched' : null);
  c.covert = true; c.carryLine = 'sneak'; c.custodyLine = 'lawful';
  assert.equal(c.take(), 'watched'); assert.equal(c.carrying, false);
  assert.equal(c.take(true), null); assert.equal(c.carrying, true); assert.equal(c.custody, true); assert.equal(c.contraband, false); assert.equal(c.line, 'lawful');
  c.drop(); assert.equal(c.carrying, false); assert.equal(c.custody, false); assert.equal(c.line, '');
  watched = false; assert.equal(c.take(), null); assert.equal(c.contraband, true); assert.equal(c.custody, false); assert.equal(c.line, 'sneak');
  c.drop(); assert.equal(c.contraband, false); assert.equal(c.take(true), null); assert.equal(c.contraband, false);
  assert.equal(c.take(true), 'Nothing here needs carrying.');
  Consignment.all = Consignment.all.filter(x => x !== c);
});
test('a consignment with no covert flag is never contraband, signed for or not', () => {
  const c = new Consignment('test.plain', null, 'test.dock', new T.Group(), { x: 0, z: 0 }, () => {}, () => true, 'taken'); assert.equal(c.take(), null); assert.equal(c.contraband, false); assert.equal(c.line, '');
  Consignment.all = Consignment.all.filter(x => x !== c);
});
test('the lane is clear only once the freight is signed in, at a gate that still stands, with no crackdown and no contraband', () => {
  for (const g of GATES) for (const crack of [false, true]) for (const contra of [false, true]) {
    for (const o of ['base', 'resistance']) assert.equal(laneClear(o, g, crack, contra), false, `${o} ${g}`);
    assert.equal(laneClear('ordinance', g, crack, contra), ['light', 'manned', 'sealed'].includes(g) && !crack && !contra, `ordinance ${g} ${crack} ${contra}`);
  }
});
test('a clear lane waves the Steward through at any heat and through a sealed curfew; everything else about the gate is as it was', () => {
  for (const h of [0, 1, 3, 5]) { for (const g of ['light', 'manned', 'sealed'] as const) assert.equal(scrutiny(g, h, false, false, false, true), 'wave', `${g} ${h}`); }
  // Not clear: the old answers, sealed included.
  for (const g of GATES) for (const h of [0, 2]) for (const c of [false, true]) assert.equal(scrutiny(g, h, c, false, false, false), scrutiny(g, h, c));
  assert.equal(scrutiny('sealed', 0), 'refuse'); assert.equal(scrutiny('open', 3, false, false, false, true), 'none'); assert.equal(scrutiny('gone', 3, false, false, false, true), 'none');
  // The lane is the east opening of the Great Main only; the west opening and the chain gate have none to clear.
  assert.equal(freightLane('main', 4), true); assert.equal(freightLane('main', -4), false); assert.equal(freightLane('chain', 0), false);
});
test('signing in at the desk settles the Great Main, persists, closes the other path, and a new game puts the clerk, crate and ticks back', () => {
  const m = memory(), e = new Economy(m); e.advanceResist(1);
  assert.equal(crateHeld(e.state.resist.rook, e.state.alignment.outcomes.greatMain), true); assert.equal(clerkContact(1, e.state.alignment.outcomes.greatMain, e.state.resist.rook), 'offer');
  assert.equal(e.resolve('greatMain', 'ordinance', 'rook.custody'), true);
  const o = e.state.alignment.outcomes.greatMain, r = e.state.resist.rook;
  assert.equal(o, 'ordinance'); assert.equal(r, 3); assert.equal(clerkContact(1, o, r), 'none'); assert.equal(crateHeld(r, o), false); assert.equal(catwalkRestored(o), false); assert.equal(strangerDue(r, o), false);
  assert.equal(e.resolve('greatMain', 'resistance', 'rook.diverted'), false); assert.equal(e.state.alignment.outcomes.greatMain, 'ordinance');
  const again = new Economy(m); assert.equal(again.state.alignment.outcomes.greatMain, 'ordinance'); assert.equal(laneClear(again.state.alignment.outcomes.greatMain, 'sealed', false, false), true);
  again.reset(); const f = again.state; assert.deepEqual(f.alignment.deeds, {}); assert.equal(f.alignment.outcomes.greatMain, 'base'); assert.equal(f.resist.rook, 0);
  again.advanceResist(1); assert.equal(clerkContact(1, f.alignment.outcomes.greatMain, f.resist.rook), 'offer'); assert.equal(laneClear(f.alignment.outcomes.greatMain, 'sealed', false, false), false);
  // And the other way round: the Embers' win shuts the desk.
  const r2 = new Economy(memory()); r2.advanceResist(1); r2.advanceResist(2); assert.equal(r2.resolve('greatMain', 'resistance', 'rook.diverted'), true);
  assert.equal(r2.resolve('greatMain', 'ordinance', 'rook.custody'), false); assert.equal(laneClear(r2.state.alignment.outcomes.greatMain, 'sealed', false, false), false);
});
test('the curfew watch stands down only for a transit set at the clear lane, and never under a crackdown or with contraband', () => {
  const near = TRANSIT.reach - 1, far = TRANSIT.reach + 14;
  for (const g of GATES) for (const o of ['base', 'resistance', 'ordinance']) for (const contra of [false, true]) for (const crack of [false, true]) for (const lane of [false, true]) for (const along of [near, far]) {
    const pass = laneClear(o, g, crack, contra), set = transitSet(pass, lane, along);
    assert.equal(set, o === 'ordinance' && ['light', 'manned', 'sealed'].includes(g) && !crack && !contra && lane && along === near, `${o} ${g} ${crack} ${contra} ${lane} ${along}`);
  }
  assert.equal(transitHolds(10, 25, false, false), true); assert.equal(transitHolds(25, 25, false, false), false); assert.equal(transitHolds(10, -99, false, false), false);
  assert.equal(transitHolds(10, 25, true, false), false); assert.equal(transitHolds(10, 25, false, true), false);
});
test('the clerk’s lines are short enough to be gone by the time the gate is reached, and the offer says no more than the sign-in', () => {
  const h = HOLD.scrap!; assert.ok(h.offer.length <= 85, String(h.offer.length)); assert.ok(h.standing.length <= 100, String(h.standing.length)); assert.match(h.offer, /citizen/); assert.ok(!/Steward/.test(h.offer));
});
