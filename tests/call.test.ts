import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Economy, SITE_LIBERATED, type StorageAdapter } from '../src/simulation/economy.ts';
import { freshAlignment, crossing, DEEDS, type DeedId } from '../src/simulation/alignment.ts';
import { dayAt } from '../src/simulation/occupation.ts';
import { CALL, CALL_PACE, handOfferLine, lensOn, lampsLit, relayHint, callHour } from '../src/simulation/resist.ts';
const memory = (raw: string | null = null): StorageAdapter => ({ read: () => raw, write: s => { raw = s; }, clear: () => { raw = null; } });
// The world modules paint canvases when loaded; a blank stand-in is enough to load them in node.
const blank: unknown = new Proxy(function () {}, { get: (_, k) => k === Symbol.toPrimitive ? () => 0 : blank, apply: () => blank, set: () => true });
(globalThis as { document?: unknown }).document ??= { createElement: () => blank };
const { WardCall } = await import('../src/world/ward-call.ts');
const { Consignment } = await import('../src/world/logistics.ts');
/** A world with the two sites settled (any mix) and the square held: the call is on offer. */
function world(settled = true) {
  const hand = new T.Group(); hand.position.set(-16.4, 0, 25); const officer = new T.Group(); officer.position.set(5.75, 0, -34.55);
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

const NOON = dayAt(12), NIGHT = dayAt(22);
/** The card carried to the relay and seated, the shutter open: one step short of sending. */
function seated(w: ReturnType<typeof world>, day = NIGHT) { w.e.state.day = day; assert.equal(w.call.card.take(), null); assert.equal(w.call.use('call.relay'), CALL.shutterOpen); assert.equal(w.call.use('call.relay'), CALL.seated); assert.equal(w.call.card.carrying, false); }
const commits = (e: InstanceType<typeof Economy>) => { const seen: string[] = []; const was = e.onChange; e.onChange = (k, id) => { if (k === 'alignment' && id === 'commit') seen.push(id); was(k, id); }; return seen; };
test('the relay walks OPEN THE SHUTTER, SET THE CARD or CLOSE THE SHUTTER, AFTER DUSK, SEND THE CALL; SEND is refused by day, with the shutter shut, or without the card seated', () => {
  const w = world(), { call, e } = w, seen = commits(e); e.state.day = NOON;
  assert.equal(relayHint(null, false, false, false, NOON), 'OPEN THE SHUTTER'); assert.equal(relayHint(null, true, false, true, NOON), 'SET THE CARD'); assert.equal(relayHint(null, true, false, false, NOON), 'CLOSE THE SHUTTER'); assert.equal(relayHint(null, true, true, false, NOON), 'AFTER DUSK'); assert.equal(relayHint(null, true, true, false, NIGHT), 'SEND THE CALL'); assert.equal(relayHint('resistance', true, true, false, NIGHT), 'LOOK CLOSER'); assert.equal(relayHint('ordinance', false, false, false, NIGHT), 'SEALED');
  e.state.day = NIGHT; assert.equal(call.use('call.relay'), CALL.shutterOpen); assert.equal(call.use('call.relay'), CALL.shutterClosed); assert.equal(call.use('call.relay'), CALL.shutterOpen); assert.equal(e.state.alignment.commit, null);
  assert.equal(call.use('call.relay'), CALL.shutterClosed); call.use('call.relay'); call.card.take(); assert.equal(call.use('call.relay'), CALL.seated); e.state.day = NOON; assert.equal(call.use('call.relay'), CALL.byDay); assert.equal(e.state.alignment.commit, null);
  assert.equal(call.use('call.frame'), CALL.lifted); assert.equal(call.card.carrying, true); assert.equal(call.use('call.frame'), null); call.card.drop(); assert.deepEqual(seen, []); assert.equal(e.state.resist.call, 0); w.done();
});
test('after dusk SEND commits the Embers exactly once; a second SEND, the other side, and the frame afterwards change nothing', () => {
  const w = world(), { call, e } = w, seen = commits(e); seated(w); const deeds = JSON.stringify(e.state.alignment.deeds), outcomes = JSON.stringify(e.state.alignment.outcomes);
  assert.equal(call.use('call.relay'), CALL.sent); assert.equal(e.state.alignment.commit?.side, 'resistance'); assert.equal(e.state.alignment.commit?.by, 'call.sent'); assert.equal(e.state.resist.call, 2); assert.deepEqual(seen, ['commit']); assert.equal(JSON.stringify(e.state.alignment.deeds), deeds); assert.equal(JSON.stringify(e.state.alignment.outcomes), outcomes);
  const at = e.state.alignment.commit!.at; assert.equal(call.use('call.relay'), CALL.relayAfter); assert.equal(call.use('call.frame'), null); assert.equal(e.commit('ordinance', 'call.reported'), false); assert.equal(e.commit('resistance', 'call.sent'), false); assert.deepEqual(seen, ['commit']); assert.equal(e.state.alignment.commit?.at, at); assert.equal(e.state.alignment.commit?.side, 'resistance'); assert.equal(call.card.take(), 'Nothing here needs carrying.'); w.done();
});
test('a 2-0 ordinance tilt can still send: the commit is crossed and the deeds are intact', () => {
  const w = world(), { call, e } = w; e.state.alignment = freshAlignment(); e.state.alignment.outcomes.greatMain = 'ordinance'; e.state.alignment.outcomes.finchRun = 'ordinance'; for (const d of ['rook.custody', 'finch.certified'] as DeedId[]) e.state.alignment.deeds[d] = 1; call.sync(); const deeds = JSON.stringify(e.state.alignment.deeds);
  seated(w); assert.equal(call.use('call.relay'), CALL.sent); assert.equal(crossing(e.state.alignment), 'crossed'); assert.equal(JSON.stringify(e.state.alignment.deeds), deeds); assert.ok(Object.keys(e.state.alignment.deeds).every(d => d in DEEDS)); w.done();
});
test('being caught before the lamp is turned up commits nothing and leaves the event finishable; taking the card back and walking away commits nothing', () => {
  const w = world(), { call, e } = w; e.onChange = k => { if (k === 'caught') { const c = Consignment.carried(); if (c?.contraband) c.drop(); } }; seated(w); e.caught('contraband', 'market'); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0);
  e.state.day = NIGHT; assert.equal(call.use('call.frame'), CALL.lifted); assert.equal(call.card.carrying, true); call.sync(); assert.equal(call.card.carrying, true); call.card.drop(); call.sync(); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0);
  assert.equal(call.card.take(), null); e.state.day = NIGHT; assert.equal(call.use('call.relay'), CALL.seated); assert.equal(call.use('call.relay'), CALL.sent); assert.equal((e.state.alignment as { commit: { side: string } | null }).commit?.side, 'resistance'); w.done();
});
test('the square liberated mid-event shuts the relay and resets the shutter and the seated card; nothing is committed and nothing can be sent', () => {
  const w = world(), { call, e, pres } = w; seated(w); e.state.sites.market = SITE_LIBERATED; call.sync(); call.update(.1, 0, new T.Vector3());
  assert.equal(call.use('call.relay'), null); assert.equal(call.use('call.frame'), null); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0); for (const t of pres.city.targets.filter(t => t.id.startsWith('call.'))) assert.equal(t.when!(), false, t.id);
  e.state.sites.market = 0; call.sync(); assert.equal(call.card.take(), null); assert.equal(call.use('call.relay'), CALL.shutterOpen); w.done();
});
test('the send-and-answer sequence is paced, takes no part in the commitment, and ends with both flags true; with nothing live (a reload) the lens is steady, every lamp is on and both flags are true', () => {
  assert.equal(lensOn(0.1), true); assert.equal(lensOn(1.5), false); assert.equal(lensOn(CALL_PACE.flash), true); assert.equal(lensOn(60), true); assert.deepEqual([4.9, 5, 9, 27, 99].map(lampsLit), [0, 1, 2, 7, 7]);
  const w = world(), { call, e } = w; seated(w); assert.equal(call.stirred, false); assert.equal(call.alerted, false); assert.equal(call.use('call.relay'), CALL.sent); assert.equal(call.seq, 0); assert.equal(call.stirred, false);
  const told: string[] = []; (e as unknown as { onChange: unknown }).onChange = () => {}; const city = (w.pres.city as unknown as { onEvent: (m: string) => void }); city.onEvent = m => told.push(m); const v = new T.Vector3(); const lit: number[] = [];
  for (let k = 0; k < 800; k++) { call.update(.05, 0, v); if (k % 20 === 19) lit.push(call.lamps.filter(l => l.visible).length); if (call.seq < 0) break; }
  assert.deepEqual(told, [CALL.answered]); assert.equal(call.stirred, true); assert.equal(call.alerted, true); assert.equal(call.seq, -1); assert.equal(call.lamps.length, 7); assert.ok(call.lamps.every(l => l.visible)); assert.equal(call.lens.visible, true); assert.ok(lit.length > 5 && lit[0] <= 1 && lit.every((n, i) => i === 0 || n >= lit[i - 1]));
  call.sync(); assert.ok(call.lamps.every(l => l.visible) && call.stirred && call.alerted); w.done();
  const fresh = world(false); assert.ok(fresh.call.lamps.every(l => !l.visible)); assert.equal(fresh.call.lens.visible, false); fresh.done();
});
test('keeping watch until dusk moves only the clock to 19:00: no crowns, earned, heat, playtime, signalAt, nor offline award changes; it is refused outside its conditions', () => {
  const w = world(), { call, e } = w; e.state.day = NOON; e.state.heat = 1.5; e.state.crowns = 500; e.state.earned = 900; e.state.playtime = 321; e.state.signalAt = 100; e.state.properties.scrap.level = 2;
  assert.equal(call.use('call.watch'), null); assert.equal(e.state.day, NOON); call.card.take(); const before = JSON.stringify({ ...e.state, day: 0, lastSave: 0 });
  assert.equal(call.use('call.watch'), CALL.watch); assert.equal(e.state.day, dayAt(19)); assert.equal(callHour(e.state.day), true); assert.equal(JSON.stringify({ ...e.state, day: 0, lastSave: 0 }), before); assert.equal(call.use('call.watch'), null);
  // The same save, with or without the watch, pays the same away award on the next load: the watch took none of the time away and gave none.
  const away = (watch: boolean) => { const x = world(); x.e.state.day = NOON; x.e.state.properties.scrap.level = 3; x.e.save(1000); if (watch) assert.equal(x.e.watchUntilDusk(1000), true); const r = x.e.storage.read(); x.done(); return new Economy(memory(r), 1000 + 7200e3); };
  const plain = away(false), watched = away(true); assert.ok(plain.offlineAward > 0); assert.equal(watched.offlineAward, plain.offlineAward); assert.equal(watched.state.crowns, plain.state.crowns); assert.equal(watched.state.earned, plain.state.earned); assert.equal(watched.state.heat, plain.state.heat); assert.equal(watched.state.playtime, plain.state.playtime);
  const n = world(); n.e.state.day = NOON; assert.equal(n.e.watchUntilDusk(), true); const g = world(); g.e.state.day = NOON; g.e.state.sites.market = SITE_LIBERATED; assert.equal(g.e.watchUntilDusk(), false); assert.equal(g.e.state.day, NOON);
  const u = world(false); u.e.state.day = NOON; assert.equal(u.e.watchUntilDusk(), false); const d = world(); d.e.state.day = dayAt(23); assert.equal(d.e.watchUntilDusk(), false); const c = world(); c.e.state.day = NOON; c.e.state.alignment.commit = { side: 'resistance', at: 1, by: 'call.sent' }; assert.equal(c.e.watchUntilDusk(), false);
  for (const x of [w, n, g, u, d, c]) x.done();
});

const lined = (call: { onLine: (l: { who: string; text: string }) => boolean }) => { const said: string[] = []; call.onLine = l => { said.push(l.text); return true; }; return said; };
/** The viewer stands at the sentry box's window, a few paces from the officer posted at the gate; the officer (worker 1) is in the world. */
const AT_BOX = new T.Vector3(10.4, 1.75, -30.9);
test('the gate: REPORT with empty hands is refused in the officer’s words and commits nothing; with the card it goes onto the sill, and a moment later he asks if you are certain', () => {
  const w = world(), { call, e } = w, said = lined(call), seen = commits(e); call.update(.1, 0, AT_BOX); assert.deepEqual(said, [CALL.officer.approach]); call.update(.1, 0, AT_BOX); assert.deepEqual(said, [CALL.officer.approach]);
  assert.equal(call.use('call.report'), null); assert.deepEqual(said.slice(1), [CALL.officer.empty]); assert.equal(e.state.alignment.commit, null); assert.equal(call.use('call.sill'), null); assert.equal(call.use('call.ledger'), null);
  assert.equal(call.card.take(), null); assert.equal(call.use('call.report'), null); assert.equal(call.card.carrying, false); assert.deepEqual(said.slice(2), [CALL.officer.offered]); for (let k = 0; k < 20; k++) call.update(.2, 0, AT_BOX);
  assert.deepEqual(said.slice(2), [CALL.officer.offered, CALL.officer.certain]); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0); assert.deepEqual(seen, []); assert.equal(call.card.take(), 'Nothing here needs carrying.'); w.done();
});
test('TAKE IT BACK puts the card in the hands again with the officer’s word, and walking away from the gate with it commits nothing', () => {
  const w = world(), { call, e } = w, said = lined(call), seen = commits(e); call.update(.1, 0, AT_BOX); call.card.take(); call.use('call.report'); assert.equal(call.use('call.sill'), null); assert.equal(call.card.carrying, true); assert.equal(said.at(-1), CALL.officer.back);
  for (let k = 0; k < 40; k++) call.update(.2, 0, new T.Vector3(0, 1.75, -10)); assert.equal(said.includes(CALL.officer.certain), false); assert.equal(e.state.alignment.commit, null); assert.deepEqual(seen, []); assert.equal(call.use('call.report'), null); assert.equal(call.card.carrying, false); call.card.drop();
  // Reported again, taken back again, and the hand's next act is still free: nothing was ever committed.
  call.card.take(); call.use('call.report'); call.use('call.sill'); call.card.drop(); call.sync(); assert.equal(e.state.alignment.commit, null); assert.equal(call.card.take(), null); w.done();
});
test('SIGN IT IN commits the Ordinance exactly once, with the officer’s word for how the deeds stand; afterwards SEND, a second SIGN and the sill change nothing, and the relay is sealed', () => {
  const w = world(), { call, e } = w, said = lined(call), seen = commits(e); call.update(.1, 0, AT_BOX); call.card.take(); call.use('call.report'); const deeds = JSON.stringify(e.state.alignment.deeds);
  assert.equal(call.use('call.ledger'), CALL.signedToast); assert.equal(e.state.alignment.commit?.side, 'ordinance'); assert.equal(e.state.alignment.commit?.by, 'call.reported'); assert.equal(e.state.resist.call, 2); assert.deepEqual(seen, ['commit']); assert.equal(said.at(-1), CALL.officer.signed.open); assert.equal(JSON.stringify(e.state.alignment.deeds), deeds);
  assert.equal(call.use('call.ledger'), null); assert.equal(call.use('call.report'), null); assert.equal(call.use('call.sill'), null); assert.equal(e.commit('ordinance', 'call.reported'), false); assert.equal(e.commit('resistance', 'call.sent'), false); e.state.day = NIGHT; assert.equal(call.use('call.relay'), CALL.sealed); assert.equal(call.use('call.frame'), null); assert.equal(call.card.take(), 'Nothing here needs carrying.');
  assert.deepEqual(seen, ['commit']); assert.equal(e.canSignal(), false); e.state.sites.market = 1; e.state.day = NIGHT; assert.equal(e.canSignal(), false); w.done();
});
test('a 2-0 resistance tilt can still sign (crossed, deeds intact), and a 2-0 ordinance tilt signs as kept', () => {
  for (const [side, how] of [['resistance', 'crossed'], ['ordinance', 'kept']] as const) {
    const w = world(), { call, e } = w; e.state.alignment = freshAlignment(); e.state.alignment.outcomes.greatMain = side; e.state.alignment.outcomes.finchRun = side; for (const d of (side === 'resistance' ? ['rook.diverted', 'finch.bypassed'] : ['rook.custody', 'finch.certified']) as DeedId[]) e.state.alignment.deeds[d] = 1; call.sync(); const said = lined(call), deeds = JSON.stringify(e.state.alignment.deeds);
    call.update(.1, 0, AT_BOX); call.card.take(); call.use('call.report'); assert.equal(call.use('call.ledger'), CALL.signedToast); assert.equal(crossing(e.state.alignment), how === 'crossed' ? 'crossed' : 'kept'); assert.equal(said.at(-1), CALL.officer.signed[how]); assert.equal(JSON.stringify(e.state.alignment.deeds), deeds); w.done();
  }
});
test('being caught before signing commits nothing and the card stays on the sill', () => {
  const w = world(), { call, e } = w; e.onChange = k => { if (k === 'caught') { const c = Consignment.carried(); if (c?.contraband) c.drop(); } }; call.update(.1, 0, AT_BOX); call.card.take(); call.use('call.report'); e.caught('contraband', 'market'); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0);
  assert.equal(call.use('call.sill'), null); assert.equal(call.card.carrying, true); call.card.drop(); w.done();
});
test('with the officer absent (not in the world, or the square liberated) no gate target is offered and nothing can be reported or signed', () => {
  const w = world(), { call, e, pres } = w, gate = () => pres.city.targets.filter(t => ['call.report', 'call.sill', 'call.ledger'].includes(t.id)), said = lined(call); assert.equal(gate().length, 3); assert.equal(gate().filter(t => t.when!()).length, 1);
  call.card.take(); call.use('call.report'); assert.equal(gate().filter(t => t.when!()).length, 2); pres.workers[1].person.group.visible = false; assert.equal(gate().filter(t => t.when!()).length, 0); assert.equal(call.use('call.ledger'), null); assert.equal(call.use('call.sill'), null); call.update(.1, 0, AT_BOX); assert.deepEqual(said, []); assert.equal(e.state.alignment.commit, null);
  pres.workers[1].person.group.visible = true; assert.equal(gate().filter(t => t.when!()).length, 2); e.state.sites.market = SITE_LIBERATED; call.sync(); call.update(.1, 0, AT_BOX); assert.equal(gate().filter(t => t.when!()).length, 0); assert.equal(call.use('call.ledger'), null); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0); w.done();
});
test('after a resistance commitment no gate interaction is offered', () => {
  const w = world(), { call, e, pres } = w; seated(w); call.use('call.relay'); assert.equal(e.state.alignment.commit?.side, 'resistance'); for (const t of pres.city.targets.filter(t => ['call.report', 'call.sill', 'call.ledger'].includes(t.id))) assert.equal(t.when!(), false, t.id); assert.equal(call.use('call.report'), null); w.done();
});
