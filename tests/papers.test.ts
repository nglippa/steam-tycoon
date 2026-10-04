import test from 'node:test';
import assert from 'node:assert/strict';
import { clerkContact, custodyAllowed, HOLD } from '../src/simulation/resist.ts';
import * as T from 'three';
// The world modules paint canvases when loaded; a blank stand-in is enough to load them in node.
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
