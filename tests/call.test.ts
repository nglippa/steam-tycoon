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
type Collider = { x: number; z: number; w: number; d: number; h: number; open?: () => boolean }; type Person = { x: number; z: number; yaw: number; kind: string; when?: () => boolean };
/** A world with the two sites settled (any mix) and the square held: the call is on offer. */
function world(settled = true) {
  const colliders: Collider[] = [], people: Person[] = []; const hand = new T.Group(); hand.position.set(-16.4, 0, 25); const officer = new T.Group(); officer.position.set(5.75, 0, -34.55);
  const pres = { city: { economy: new Economy(memory()), deck() {}, collider: (x: number, z: number, w: number, d: number, h: number, _gate?: string, open?: () => boolean) => { colliders.push({ x, z, w, d, h, open }); }, targets: [] as { id: string; when?: () => boolean; hint?: string }[], ladders: [], onEvent() {} }, root: new T.Group(), workers: [{ person: { group: hand } }, { person: { group: officer } }], addWorker: (x: number, z: number, yaw: number, kind: string, o?: { when?: () => boolean }) => { people.push({ x, z, yaw, kind, when: o?.when }); return 0; }, finchRun: { hand: 0 }, marketSquare: { officer: 1 } };
  const call = new WardCall(pres as never), e = pres.city.economy; if (settled) { e.state.alignment = freshAlignment(); e.state.alignment.outcomes.greatMain = 'resistance'; e.state.alignment.outcomes.finchRun = 'ordinance'; } call.sync();
  const done = () => { Consignment.all = Consignment.all.filter(c => c !== call.card); };
  return { call, e, pres, hand, done, colliders, people };
}
test('reading the order and hearing the hand only move the stage; the card and the alignment are untouched', () => {
  const { call, e, hand, done } = world(); const before = JSON.stringify(e.state.alignment); const lines: string[] = []; call.onLine = l => { lines.push(l.text); return true; };
  assert.equal(e.state.resist.call, 0); assert.equal(call.use('call.order'), CALL.orderToast); assert.equal(e.state.resist.call, 1); assert.equal(call.use('call.order'), CALL.orderToast); assert.equal(e.state.resist.call, 1); assert.equal(JSON.stringify(e.state.alignment), before);
  e.state.resist.call = 0; const viewer = new T.Vector3(hand.position.x, 1.7, hand.position.z - 2); for (let k = 0; k < 8; k++) call.update(.5, 0, viewer);
  assert.deepEqual(lines, [handOfferLine(null)]); assert.equal(e.state.resist.call, 0); call.update(.1, 0, new T.Vector3(hand.position.x, 1.7, hand.position.z - 9)); assert.equal(e.state.resist.call, 1); assert.equal(JSON.stringify(e.state.alignment), before); assert.equal(e.state.alignment.commit, null); done();
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
  assert.equal(call.use('call.relay'), CALL.shutterClosed); call.use('call.relay'); call.card.take(); assert.equal(call.use('call.relay'), CALL.seated); e.state.day = NOON; assert.equal(call.use('call.lamp'), CALL.byDay); assert.equal(e.state.alignment.commit, null);
  assert.equal(call.use('call.frame'), CALL.lifted); assert.equal(call.card.carrying, true); assert.equal(call.use('call.frame'), null); call.card.drop(); assert.deepEqual(seen, []); assert.equal(e.state.resist.call, 0); w.done();
});
test('after dusk SEND commits the Embers exactly once; a second SEND, the other side, and the frame afterwards change nothing', () => {
  const w = world(), { call, e } = w, seen = commits(e); seated(w); const deeds = JSON.stringify(e.state.alignment.deeds), outcomes = JSON.stringify(e.state.alignment.outcomes);
  assert.equal(call.use('call.lamp'), CALL.sent); assert.equal(e.state.alignment.commit?.side, 'resistance'); assert.equal(e.state.alignment.commit?.by, 'call.sent'); assert.equal(e.state.resist.call, 2); assert.deepEqual(seen, ['commit']); assert.equal(JSON.stringify(e.state.alignment.deeds), deeds); assert.equal(JSON.stringify(e.state.alignment.outcomes), outcomes);
  const at = e.state.alignment.commit!.at; assert.equal(call.use('call.relay'), CALL.relayAfter); assert.equal(call.use('call.frame'), null); assert.equal(e.commit('ordinance', 'call.reported'), false); assert.equal(e.commit('resistance', 'call.sent'), false); assert.deepEqual(seen, ['commit']); assert.equal(e.state.alignment.commit?.at, at); assert.equal(e.state.alignment.commit?.side, 'resistance'); assert.equal(call.card.take(), 'Nothing here needs carrying.'); w.done();
});
test('a 2-0 ordinance tilt can still send: the commit is crossed and the deeds are intact', () => {
  const w = world(), { call, e } = w; e.state.alignment = freshAlignment(); e.state.alignment.outcomes.greatMain = 'ordinance'; e.state.alignment.outcomes.finchRun = 'ordinance'; for (const d of ['rook.custody', 'finch.certified'] as DeedId[]) e.state.alignment.deeds[d] = 1; call.sync(); const deeds = JSON.stringify(e.state.alignment.deeds);
  seated(w); assert.equal(call.use('call.lamp'), CALL.sent); assert.equal(crossing(e.state.alignment), 'crossed'); assert.equal(JSON.stringify(e.state.alignment.deeds), deeds); assert.ok(Object.keys(e.state.alignment.deeds).every(d => d in DEEDS)); w.done();
});
test('being caught before the lamp is turned up commits nothing and leaves the event finishable; taking the card back and walking away commits nothing', () => {
  const w = world(), { call, e } = w; e.onChange = k => { if (k === 'caught') { const c = Consignment.carried(); if (c?.contraband) c.drop(); } }; seated(w); e.caught('contraband', 'market'); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0);
  e.state.day = NIGHT; assert.equal(call.use('call.frame'), CALL.lifted); assert.equal(call.card.carrying, true); call.sync(); assert.equal(call.card.carrying, true); call.card.drop(); call.sync(); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0);
  assert.equal(call.card.take(), null); e.state.day = NIGHT; assert.equal(call.use('call.relay'), CALL.seated); assert.equal(call.use('call.lamp'), CALL.sent); assert.equal((e.state.alignment as { commit: { side: string } | null }).commit?.side, 'resistance'); w.done();
});
test('the square liberated mid-event shuts the relay and resets the shutter and the seated card; nothing is committed and nothing can be sent', () => {
  const w = world(), { call, e, pres } = w; seated(w); e.state.sites.market = SITE_LIBERATED; call.sync(); call.update(.1, 0, new T.Vector3());
  assert.equal(call.use('call.relay'), null); assert.equal(call.use('call.frame'), null); assert.equal(e.state.alignment.commit, null); assert.equal(e.state.resist.call, 0); for (const t of pres.city.targets.filter(t => t.id.startsWith('call.'))) assert.equal(t.when!(), false, t.id);
  e.state.sites.market = 0; call.sync(); assert.equal(call.card.take(), null); assert.equal(call.use('call.relay'), CALL.shutterOpen); w.done();
});
test('the send-and-answer sequence is paced, takes no part in the commitment, and ends with both flags true; with nothing live (a reload) the lens is steady, every lamp is on and both flags are true', () => {
  assert.equal(lensOn(0.1), true); assert.equal(lensOn(1.5), false); assert.equal(lensOn(CALL_PACE.flash), true); assert.equal(lensOn(60), true); assert.deepEqual([4.9, 5, 9, 27, 99].map(lampsLit), [0, 1, 2, 7, 7]);
  const w = world(), { call, e } = w; seated(w); assert.equal(call.stirred, false); assert.equal(call.alerted, false); assert.equal(call.use('call.lamp'), CALL.sent); assert.equal(call.seq, 0); assert.equal(call.stirred, false);
  const told: string[] = []; (e as unknown as { onChange: unknown }).onChange = () => {}; const city = (w.pres.city as unknown as { onEvent: (m: string) => void }); city.onEvent = m => told.push(m); const v = new T.Vector3(); const lit: number[] = [];
  for (let k = 0; k < 800; k++) { call.update(.05, 0, v); if (k % 20 === 19) lit.push(call.lamps.filter(l => l.visible).length); if (call.seq < 0) break; }
  assert.deepEqual(told, [CALL.answered]); assert.equal(call.stirred, true); assert.equal(call.alerted, true); assert.equal(call.seq, -1); assert.equal(call.lamps.length, 7); assert.ok(call.lamps.every(l => l.visible)); assert.equal(call.lens.visible, true); assert.ok(lit.length > 5 && lit[0] <= 1 && lit.every((n, i) => i === 0 || n >= lit[i - 1]));
  call.sync(); assert.ok(call.lamps.every(l => l.visible) && call.stirred && call.alerted); w.done();
  const fresh = world(false); assert.ok(fresh.call.lamps.every(l => !l.visible)); assert.equal(fresh.call.lens.visible, false); fresh.done();
});
test('keeping watch until dusk moves only the clock to 19:00: no crowns, earned, heat, playtime, signalAt, nor offline award changes; it is refused outside its conditions', () => {
  const w = world(), { call, e } = w; e.state.day = NOON; e.state.heat = 1.5; e.state.crowns = 500; e.state.earned = 900; e.state.playtime = 321; e.state.signalAt = 100; e.state.properties.scrap.level = 2;
  assert.equal(call.use('call.watch'), null); assert.equal(e.state.day, NOON); call.card.take(); const before = JSON.stringify({ ...e.state, day: 0, lastSave: 0, resist: { ...e.state.resist, watch: 0 } });
  assert.equal(call.use('call.watch'), CALL.watch); assert.equal(e.state.day, dayAt(19)); assert.equal(callHour(e.state.day), true); assert.equal(JSON.stringify({ ...e.state, day: 0, lastSave: 0, resist: { ...e.state.resist, watch: 0 } }), before); assert.equal(call.use('call.watch'), null); assert.equal(e.state.resist.watch, 1);
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
  const w = world(), { call, e, pres } = w; seated(w); call.use('call.lamp'); assert.equal(e.state.alignment.commit?.side, 'resistance'); for (const t of pres.city.targets.filter(t => ['call.report', 'call.sill', 'call.ledger'].includes(t.id))) assert.equal(t.when!(), false, t.id); assert.equal(call.use('call.report'), null); w.done();
});

const ids = (pres: { city: { targets: { id: string; when?: () => boolean; hint?: string; label?: string }[] } }) => (id: string) => pres.city.targets.find(t => t.id === id)!;
test('SEND is the lamp key and nothing else: with the card seated the relay is not offered, the key is, and only the key commits', () => {
  const w = world(), { call, e, pres } = w, t = ids(pres), seen = commits(e); e.state.day = NIGHT; assert.equal(t('call.lamp').when!(), false); assert.equal(call.use('call.lamp'), null); assert.equal(call.card.take(), null); assert.equal(call.use('call.relay'), CALL.shutterOpen); assert.equal(t('call.lamp').when!(), false);
  assert.equal(call.use('call.relay'), CALL.seated); assert.equal(t('call.relay').when!(), false); assert.equal(call.use('call.relay'), null); assert.equal(t('call.frame').when!(), true); assert.equal(t('call.lamp').when!(), true); assert.equal(t('call.lamp').hint, 'AFTER DUSK');
  call.update(.1, 0, new T.Vector3()); assert.equal(t('call.lamp').hint, 'SEND THE CALL'); assert.equal(t('call.lamp').label, 'The relay lamp'); e.state.day = NOON; call.update(.1, 0, new T.Vector3()); assert.equal(t('call.lamp').hint, 'AFTER DUSK'); assert.equal(call.use('call.lamp'), CALL.byDay); assert.deepEqual(seen, []); assert.equal(call.use('call.frame'), CALL.lifted);
  call.card.drop(); assert.equal(t('call.relay').when!(), true); assert.equal(call.use('call.relay'), CALL.shutterClosed); assert.deepEqual(seen, []); w.done();
  const x = world(), s = ids(x.pres); seated(x); assert.equal(x.call.use('call.lamp'), CALL.sent); assert.equal(s('call.lamp').when!(), false); assert.equal(s('call.frame').when!(), false); assert.equal(s('call.relay').when!(), true); x.call.update(.1, 0, new T.Vector3()); assert.equal(s('call.relay').hint, 'LOOK CLOSER'); assert.equal(x.call.use('call.relay'), CALL.relayAfter); assert.equal(x.call.use('call.lamp'), null); x.done();
});
test('the old Weathervane plaque is unavailable after an ordinance commitment and exactly as it was in every other state', () => {
  const lore = { id: 'weathervane', when: undefined as (() => boolean) | undefined, hint: undefined }; const w = world(); (w.pres.city.targets as unknown[]).push(lore);
  const again = new WardCall(w.pres as never); assert.equal(lore.when!(), true); w.e.state.alignment.commit = { side: 'resistance', at: 1, by: 'call.sent' }; assert.equal(lore.when!(), true); w.e.state.alignment.commit = { side: 'ordinance', at: 1, by: 'call.reported' }; assert.equal(lore.when!(), false);
  w.e.state.alignment.commit = null; assert.equal(lore.when!(), true); w.done(); Consignment.all = Consignment.all.filter(c => c !== again.card);
});
test('the dusk watch is kept once per save: the flag is persisted, a second watch is refused and not offered, and a new game clears it', () => {
  const w = world(), { call, e, pres } = w; e.state.day = NOON; assert.equal(e.state.resist.watch, 0); call.card.take(); const watch = ids(pres)('call.watch'); assert.equal(watch.when!(), true); assert.equal(call.use('call.watch'), CALL.watch); assert.equal(e.state.resist.watch, 1);
  e.state.day = NOON; assert.equal(watch.when!(), false); assert.equal(call.use('call.watch'), null); assert.equal(e.watchUntilDusk(), false); assert.equal(e.state.day, NOON);
  const again = new Economy(memory(e.storage.read())); assert.equal(again.state.resist.watch, 1); again.state.day = NOON; assert.equal(again.watchUntilDusk(), false);
  const bad = JSON.parse(e.storage.read()!); bad.resist.watch = 9; assert.equal(new Economy(memory(JSON.stringify(bad))).state.resist.watch, 1); bad.resist.watch = -3; assert.equal(new Economy(memory(JSON.stringify(bad))).state.resist.watch, 0); delete bad.resist.watch; assert.equal(new Economy(memory(JSON.stringify(bad))).state.resist.watch, 0);
  e.reset(); assert.equal(e.state.resist.watch, 0); assert.equal(new Economy(memory(e.storage.read())).state.resist.watch, 0); w.done();
});

type Inner = { risen: T.Group; mustered: T.Group; placed: T.Group; gallery: T.Group[]; yardScar: T.Group; winchScar: T.Group; peopleOn: boolean; turnedOut: boolean; stirred: boolean; alerted: boolean };
const inner = (c: unknown) => c as Inner;
const FAR = new T.Vector3(0, 1.75, 40), AT_HAND = new T.Vector3(-16.4, 1.75, 23);
/** A committed world: the call taken to its end through the real handlers (the lamp key or the ledger), nothing left live unless `live` is set. */
function committed(side: 'resistance' | 'ordinance', live = false, tilt?: 'resistance' | 'ordinance') {
  const w = world(); if (tilt) { w.e.state.alignment = freshAlignment(); w.e.state.alignment.outcomes.greatMain = tilt; w.e.state.alignment.outcomes.finchRun = tilt; for (const d of (tilt === 'resistance' ? ['rook.diverted', 'finch.bypassed'] : ['rook.custody', 'finch.certified']) as DeedId[]) w.e.state.alignment.deeds[d] = 1; w.call.sync(); }
  if (side === 'resistance') { seated(w); assert.equal(w.call.use('call.lamp'), CALL.sent); } else { w.call.update(.1, 0, AT_BOX); w.call.card.take(); w.call.use('call.report'); assert.equal(w.call.use('call.ledger'), CALL.signedToast); }
  if (!live) for (let k = 0; k < 800 && w.call.seq >= 0; k++) w.call.update(.05, 0, FAR); return w;
}
test('the square’s dressing: the Embers’ group shows only for a resistance commit once stirred and the square held; the Directorate’s lamps for an ordinance commit; neither while liberated', () => {
  const shows = (w: ReturnType<typeof world>) => { const i = inner(w.call); return [i.risen.visible, i.mustered.visible, i.placed.visible, i.peopleOn, i.turnedOut]; };
  const un = world(); assert.deepEqual(shows(un), [false, false, false, false, false]); un.done();
  const r = committed('resistance', true); assert.deepEqual(shows(r), [false, false, false, false, false]); const v = new T.Vector3(); for (let k = 0; k < 800 && inner(r.call).alerted === false; k++) { r.call.update(.05, 0, v); if (inner(r.call).stirred && !inner(r.call).alerted) assert.deepEqual(shows(r).slice(0, 4), [true, false, false, true]); } assert.deepEqual(shows(r), [true, false, false, true, true]);
  r.e.state.sites.market = SITE_LIBERATED; r.call.sync(); assert.deepEqual(shows(r), [false, false, false, false, false]); assert.equal(r.call.lens.visible, true); assert.ok(r.call.lamps.every(l => l.visible)); assert.equal(r.e.state.alignment.commit?.side, 'resistance'); r.e.state.sites.market = 0; r.call.sync(); assert.deepEqual(shows(r), [true, false, false, true, true]); r.done();
  const o = committed('ordinance', false); assert.deepEqual(shows(o), [false, true, true, false, true]); assert.ok(inner(o.call).gallery.every(g => g.visible)); o.e.state.sites.market = SITE_LIBERATED; o.call.sync(); assert.deepEqual(shows(o), [false, false, false, false, false]); assert.equal(o.e.state.alignment.commit?.side, 'ordinance'); o.done();
});
test('after signing the gallery lamps light one after another, the posts turn out last, and the placed things wait until the Steward has been 45 m from the square; a reload shows them at once', () => {
  const w = committed('ordinance', true), i = inner(w.call); assert.equal(i.placed.visible, false); assert.equal(i.mustered.visible, true); assert.deepEqual(i.gallery.map(g => g.visible), [false, false, false, false]); assert.equal(i.turnedOut, false);
  const seen: number[] = []; for (let k = 0; k < 400 && !i.alerted; k++) { w.call.update(.05, 0, AT_BOX); seen.push(i.gallery.filter(g => g.visible).length); } assert.ok(seen.every((n, k) => k === 0 || n >= seen[k - 1])); assert.equal(seen.at(-1), 4); assert.ok(seen.includes(1) && seen.includes(2) && seen.includes(3)); assert.equal(i.alerted, true); assert.equal(i.turnedOut, true); assert.equal(i.placed.visible, false);
  w.call.update(.1, 0, new T.Vector3(0, 1.75, -31 + 44)); assert.equal(i.placed.visible, false); w.call.sync(); assert.equal(i.placed.visible, false); w.call.update(.1, 0, new T.Vector3(0, 1.75, -31 + 46)); assert.equal(i.placed.visible, true); w.call.update(.1, 0, AT_BOX); assert.equal(i.placed.visible, true); w.call.sync(); assert.equal(i.placed.visible, true);
  const again = new WardCall(w.pres as never); assert.equal(inner(again).placed.visible, true); assert.equal(inner(again).turnedOut, true); assert.ok(inner(again).gallery.every(g => g.visible)); w.done(); Consignment.all = Consignment.all.filter(c => c !== again.card);
});
test('the turned-out garrison predicate is true only for a commitment of either side, with the Directorate alerted and the square held', () => {
  const w = world(); assert.equal(w.call.turnedOut, false); w.done(); for (const side of ['resistance', 'ordinance'] as const) { const c = committed(side, true); assert.equal(c.call.turnedOut, false); for (let k = 0; k < 800 && !inner(c.call).alerted; k++) c.call.update(.05, 0, FAR); assert.equal(c.call.turnedOut, true); c.e.state.sites.market = SITE_LIBERATED; assert.equal(c.call.turnedOut, false); c.done(); }
});
test('after a commitment the hand and the officer speak by how the deeds stood, once per approach and only while present; the hand never says two lines', () => {
  for (const [side, tilt, how] of [['resistance', undefined, 'open'], ['resistance', 'resistance', 'kept'], ['resistance', 'ordinance', 'crossed'], ['ordinance', undefined, 'open'], ['ordinance', 'ordinance', 'kept'], ['ordinance', 'resistance', 'crossed']] as const) {
    const w = committed(side, false, tilt), said = lined(w.call); assert.equal(crossing(w.e.state.alignment), how);
    for (let k = 0; k < 10; k++) w.call.update(.5, 0, AT_HAND); assert.deepEqual(said, [CALL.hand[side][how]], `${side}/${how}`);
    for (let k = 0; k < 10; k++) w.call.update(.5, 0, new T.Vector3(-16.4, 1.75, 45)); for (let k = 0; k < 4; k++) w.call.update(.5, 0, AT_HAND); assert.equal(said.length, 2); assert.equal(said[1], said[0]);
    w.pres.workers[0].person.group.visible = false; for (let k = 0; k < 10; k++) w.call.update(.5, 0, new T.Vector3(-16.4, 1.75, 45)); for (let k = 0; k < 4; k++) w.call.update(.5, 0, AT_HAND); assert.equal(said.length, 2, 'no hand, no line');
    const off = lined(w.call); for (let k = 0; k < 10; k++) w.call.update(.5, 0, AT_BOX); assert.deepEqual(off, side === 'resistance' && how === 'crossed' ? [CALL.officer.later] : [], `officer ${side}/${how}`); w.done();
  }
  const w = committed('resistance', false, 'ordinance'), said = lined(w.call); w.pres.workers[1].person.group.visible = false; for (let k = 0; k < 10; k++) w.call.update(.5, 0, AT_BOX); assert.deepEqual(said, [], 'no officer, no line'); w.done();
});
test('the history scars show only for a crossed commitment of the matching side (the winch’s only while the Ember there is showing) and change no state', () => {
  const scars = (w: ReturnType<typeof world>) => [inner(w.call).yardScar.visible, inner(w.call).winchScar.visible];
  const a = committed('resistance', false, 'ordinance'); assert.deepEqual(scars(a), [true, false]); a.done(); const b = committed('ordinance', false, 'resistance'); assert.deepEqual(scars(b), [false, true]); b.e.state.alignment.outcomes.finchRun = 'ordinance'; b.call.sync(); assert.deepEqual(scars(b), [false, false]); b.e.state.alignment.outcomes.finchRun = 'resistance'; b.call.sync(); assert.deepEqual(scars(b), [false, true]); const keep = JSON.stringify(b.e.state.alignment); b.call.sync(); assert.equal(JSON.stringify(b.e.state.alignment), keep); b.done();
  for (const [side, tilt] of [['resistance', undefined], ['resistance', 'resistance'], ['ordinance', undefined], ['ordinance', 'ordinance']] as const) { const c = committed(side, false, tilt); assert.deepEqual(scars(c), [false, false]); c.done(); } const u = world(); assert.deepEqual(scars(u), [false, false]); u.done();
});
test('only SEND (call.lamp) and SIGN (call.ledger) ever reach Economy.commit, through every other use() and across the whole send and answer sequence', () => {
  const w = world(), { call, e } = w, by: string[] = [], push = (id: string) => { by.push(id); }; const was = e.commit.bind(e); e.commit = (side, id) => { push(id); return was(side, id); };
  e.state.day = NIGHT; for (const id of ['call.order', 'call.card', 'call.relay', 'call.frame', 'call.watch', 'call.report', 'call.sill', 'call.relay', 'call.relay', 'call.frame', 'call.report', 'call.sill', 'nonsense']) { call.use(id); call.update(.1, 0, AT_BOX); } assert.deepEqual(by, []); assert.equal(e.state.alignment.commit, null);
  w.done(); const x = world(), { call: c2, e: e2 } = x; const was3 = e2.commit.bind(e2); e2.commit = (side, id) => { push(id); return was3(side, id); }; seated(x); for (let k = 0; k < 40; k++) c2.update(.1, 0, FAR); assert.deepEqual(by, []); assert.equal(c2.use('call.lamp'), CALL.sent); assert.deepEqual(by, ['call.sent']);
  for (let k = 0; k < 800; k++) c2.update(.05, 0, FAR); for (const id of ['call.order', 'call.relay', 'call.frame', 'call.watch', 'call.report', 'call.sill', 'call.lamp']) c2.use(id); assert.deepEqual(by, ['call.sent']); x.done();
  const o = world(), by2: string[] = []; const was2 = o.e.commit.bind(o.e); o.e.commit = (side, id) => { by2.push(id); return was2(side, id); }; o.call.update(.1, 0, AT_BOX); o.call.card.take(); o.call.use('call.report'); for (let k = 0; k < 60; k++) o.call.update(.1, 0, AT_BOX); o.call.use('call.sill'); o.call.use('call.lamp'); assert.deepEqual(by2, []);
  o.call.use('call.report'); o.call.use('call.ledger'); for (let k = 0; k < 400; k++) o.call.update(.05, 0, FAR); for (const id of ['call.order', 'call.relay', 'call.frame', 'call.report', 'call.sill', 'call.lamp']) o.call.use(id); assert.deepEqual(by2, ['call.reported']); o.done();
});
type Square = Inner & { lanternHalos: T.Mesh[] };
/** The Steward's own ground: is a point on the street blocked by one of the call's colliders (the same test as City.blocked, with its .32 margin)? */
const walled = (cs: Collider[], x: number, z: number) => cs.some(c => !c.open?.() && x > c.x - c.w / 2 - .32 && x < c.x + c.w / 2 + .32 && z > c.z - c.d / 2 - .32 && z < c.z + c.d / 2 + .32);
test('the Directorate’s cordon and Order 12’s stand wait behind the latch, are passable while hidden, never close the 4 m gap across the south approach, and nothing of the answer is on the banner', () => {
  const w = committed('ordinance', true), i = inner(w.call), cs = w.colliders.filter(c => c.open), line: [number, number][] = []; for (let z = -18; z >= -29; z -= .25) line.push([0, z]);
  assert.ok(cs.some(c => c.z === -24.5 && c.x === -4 && c.w === 4) && cs.some(c => c.z === -24.5 && c.x === 4 && c.w === 4)); assert.equal(i.placed.visible, false); assert.ok(cs.every(c => c.open!())); for (let x = -7; x <= 7; x += .25) assert.equal(walled(cs, x, -24.5), false); assert.ok(line.every(([x, z]) => !walled(cs, x, z)));
  while (w.call.seq >= 0) w.call.update(.05, 0, AT_BOX); w.call.update(.1, 0, new T.Vector3(0, 1.75, -31 + 46)); assert.equal(i.placed.visible, true); assert.ok(cs.every(c => !c.open!()));
  assert.equal(walled(cs, -4, -24.5), true); assert.equal(walled(cs, 4, -24.5), true); assert.equal(walled(cs, 2.6, -26.2), true); for (let x = -1.6; x <= 1.6; x += .1) assert.equal(walled(cs, x, -24.5), false, `gap at ${x.toFixed(1)}`); assert.ok(line.every(([x, z]) => !walled(cs, x, z)));
  assert.ok(new T.Box3().setFromObject(i.placed).max.y < 2.5, 'nothing of the placed answer stands on the gallery banner (y 6.3-8.2)'); i.placed.visible = false; assert.ok(cs.every(c => c.open!())); w.done();
});
test('the Embers’ watchers stand in the open square facing the gate, off the central line, and are the people of a stirred resistance commit; the lanterns are the risen group’s own, three, with halos put away close up', () => {
  const w = committed('resistance', true), sq = w.call as unknown as Square, watchers = w.people.filter(p => p.kind === 'watch');
  assert.deepEqual(watchers.map(p => [p.x, p.z]), [[-5.2, -25.6], [-4.4, -26.3], [5, -26], [4.3, -26.8]]); assert.ok(watchers.every(p => Math.abs(p.x) > 1.5 && Math.abs(p.yaw - Math.PI) < 1e-9)); assert.ok(watchers.every(p => !p.when!())); const v = new T.Vector3(); for (let k = 0; k < 800 && !sq.alerted; k++) w.call.update(.05, 0, v);
  assert.ok(watchers.every(p => p.when!())); assert.equal(sq.lanternHalos.length, 3); assert.ok(sq.lanternHalos.every(h => sq.risen.children.includes(h.parent!) && h.parent!.parent === sq.risen));
  const lamp = sq.lanternHalos[0].parent!.position; w.call.update(1.1, 0, new T.Vector3(lamp.x - 1.5, 1.75, lamp.z)); assert.equal(sq.lanternHalos[0].visible, false); assert.equal(sq.lanternHalos[1].visible, true); w.call.update(1.1, 0, new T.Vector3(0, 1.75, -18)); assert.ok(sq.lanternHalos.every(h => h.visible));
  sq.risen.visible = false; assert.ok(sq.lanternHalos.every(h => { let o: T.Object3D | null = h; while (o && o !== sq.risen) o = o.parent; return o === sq.risen; })); w.done();
});
test('liberating the square while the send sequence is live ends it at once: the lit lens and every answering lamp stand, they are not square dressing', () => {
  const w = committed('resistance', true), { call, e } = w, i = inner(call); assert.ok(call.seq >= 0); assert.ok(call.lamps.every(l => !l.visible));
  call.update(2, 0, new T.Vector3()); assert.ok(call.lamps.some(l => !l.visible)); assert.ok(call.seq >= 0); e.state.sites.market = SITE_LIBERATED; call.update(.05, 0, new T.Vector3()); assert.equal(call.seq, -1); assert.equal(call.lens.visible, true); assert.ok(call.lamps.every(l => l.visible)); assert.deepEqual([i.risen.visible, i.peopleOn], [false, false]); assert.equal(e.state.alignment.commit?.side, 'resistance'); w.done();
  const s = committed('resistance', true); s.call.update(.5, 0, new T.Vector3()); s.e.state.sites.market = SITE_LIBERATED; s.call.sync(); assert.equal(s.call.seq, -1); assert.equal(s.call.lens.visible, true); assert.ok(s.call.lamps.every(l => l.visible)); s.done();
});
