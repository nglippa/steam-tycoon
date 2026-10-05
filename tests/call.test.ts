import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Economy, SITE_LIBERATED, type StorageAdapter } from '../src/simulation/economy.ts';
import { freshAlignment } from '../src/simulation/alignment.ts';
import { CALL, handOfferLine } from '../src/simulation/resist.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });
// The world modules paint canvases when loaded; a blank stand-in is enough to load them in node.
const blank: unknown = new Proxy(function () {}, { get: (_, k) => k === Symbol.toPrimitive ? () => 0 : blank, apply: () => blank, set: () => true });
(globalThis as { document?: unknown }).document ??= { createElement: () => blank };
const { WardCall } = await import('../src/world/ward-call.ts');
const { Consignment } = await import('../src/world/logistics.ts');
/** A world with the two sites settled (any mix) and the square held: the call is on offer. */
function world(settled = true) {
  const hand = new T.Group(); hand.position.set(-16.4, 0, 25); const officer = new T.Group();
  const pres = { city: { economy: new Economy(memory()), deck() {}, collider() {}, targets: [] as { id: string; when?: () => boolean; hint?: string }[], ladders: [], onEvent() {} }, root: new T.Group(), workers: [{ person: { group: hand } }, { person: { group: officer } }], addWorker: () => 0, finchRun: { hand: 0 }, marketSquare: { officer: 1 } };
  const call = new WardCall(pres as never), e = pres.city.economy; if (settled) { e.state.alignment = freshAlignment(); e.state.alignment.outcomes.greatMain = 'resistance'; e.state.alignment.outcomes.finchRun = 'ordinance'; } call.sync();
  const done = () => { Consignment.all = Consignment.all.filter(c => c !== call.card); };
  return { call, e, pres, hand, done };
}
test('reading the order and hearing the hand only move the stage; the card and the alignment are untouched', () => {
  const { call, e, hand, done } = world(); const before = JSON.stringify(e.state.alignment); const lines: string[] = []; call.onLine = l => { lines.push(l.text); return true; };
  assert.equal(e.state.resist.call, 0); assert.equal(call.use('call.order'), CALL.orderToast); assert.equal(e.state.resist.call, 1); assert.equal(call.use('call.order'), CALL.orderToast); assert.equal(e.state.resist.call, 1); assert.equal(JSON.stringify(e.state.alignment), before);
  e.state.resist.call = 0; const viewer = new T.Vector3(hand.position.x, 1.7, hand.position.z - 2); for (let k = 0; k < 8; k++) call.update(.5, 0, viewer);
  assert.deepEqual(lines, [handOfferLine(null)]); assert.equal(e.state.resist.call, 1); assert.equal(JSON.stringify(e.state.alignment), before); assert.equal(e.state.alignment.commit, null); done();
});
test('taking, carrying, putting back and taking the card again changes neither the alignment nor the stage, and it is never contraband', () => {
  const { call, e, done } = world(); const before = JSON.stringify(e.state), card = call.card;
  assert.equal(card.take(), null); assert.equal(card.carrying, true); assert.equal(card.contraband, false); assert.equal(card.custody, false); assert.equal(card.covert, false); assert.equal(card.line, CALL.carrying); assert.equal(card.name, 'pattern card'); card.update();
  assert.equal(JSON.stringify(e.state), before); card.drop(); assert.equal(card.take(), null); card.drop(); assert.equal(JSON.stringify(e.state), before); assert.equal(e.state.resist.call, 0); assert.equal(e.state.alignment.commit, null); done();
});
test('with the square liberated first none of the event exists: no card, no notice, no target, no stage, no line', () => {
  const { call, e, pres, hand, done } = world(); e.state.sites.market = SITE_LIBERATED; call.sync(); const lines: string[] = []; call.onLine = l => { lines.push(l.text); return true; };
  assert.equal(call.card.take(), 'Nothing here needs carrying.'); assert.equal(call.use('call.order'), null); assert.equal(e.state.resist.call, 0);
  for (const t of pres.city.targets.filter(t => t.id.startsWith('call.'))) assert.equal(t.when!(), false, t.id);
  for (let k = 0; k < 20; k++) call.update(.5, 0, new T.Vector3(hand.position.x, 1.7, hand.position.z - 2)); assert.deepEqual(lines, []); assert.equal(e.state.resist.call, 0); assert.equal(e.state.alignment.commit, null); assert.equal(e.commit('resistance', 'call.sent'), false); done();
});
test('liberating the square mid-event withdraws it: the carried card is dropped on the next frame and nothing is committed', () => {
  const { call, e, pres, done } = world(); assert.equal(call.card.take(), null); assert.equal(call.card.carrying, true);
  e.state.sites.market = SITE_LIBERATED; call.update(.1, 0, new T.Vector3()); assert.equal(call.card.carrying, false); assert.equal(call.use('call.order'), null);
  for (const t of pres.city.targets.filter(t => t.id.startsWith('call.'))) assert.equal(t.when!(), false, t.id); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0); done();
});
test('the regime says citizen: "Steward" is in the three lines the hand speaks after a resistance commitment and in no others', () => {
  const found: string[] = []; const walk = (o: unknown, path: string) => { if (typeof o === 'string') { if (/Steward/.test(o)) found.push(path); } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`); };
  walk(CALL, 'CALL'); assert.deepEqual(found, ['CALL.hand.resistance.open', 'CALL.hand.resistance.kept', 'CALL.hand.resistance.crossed']);
  for (const l of [CALL.officer.approach, CALL.officer.empty, CALL.officer.offered, CALL.officer.certain, CALL.officer.back, CALL.officer.later, ...Object.values(CALL.officer.signed)]) assert.ok(!/Steward/.test(l), l);
});
