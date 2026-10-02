import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE, ROAD, CART, STOP, step, pose, passage, cartsCease, makeCarts, activate, ahead, offset, nextLine, occupied, parkPoints, type Cart, type Signal } from '../src/simulation/traffic.ts';
import type { Gate } from '../src/simulation/occupation.ts';

const L = ROUTE.length, north = ROUTE.crossings[0], line = north.s - STOP, cruise = 1.1;
const cart = (s: number, v = 0): Cart => ({ s, v, waited: 0, line: -1, parkAt: null, active: true });
const sig = (gate: Gate, extra: Partial<Signal> = {}): Signal => ({ gate, crackdown: false, curfew: false, ...extra });
/** Run at 60 Hz, calling `each` after every tick. */
function run(carts: Cart[], signal: Signal, seconds: number, each?: (t: number) => void) { const dt = 1 / 60; for (let t = 0; t < seconds; t += dt) { step(carts, signal, dt, cruise); each?.(t); } }

test('the loop turns short of the square and its soldier\'s beat, and both lanes cross the boom inside an opening', () => {
  assert.equal(ROUTE.crossings.length, 2); assert.ok(L > 150);
  // The Market Square soldier walks x -1.25 from z -13.8 north; a cart broadside at the top of the turn is .93 m deep.
  for (let s = 0; s < L; s += .5) { const p = pose(ROUTE, s); assert.ok(p.z - .93 > -13.8 + .8, `z ${p.z} reaches the soldier's beat`); }
  for (const c of ROUTE.crossings) { const p = pose(ROUTE, c.s); assert.ok(Math.abs(p.z - ROAD.gateZ) < 1e-6); assert.ok(Math.abs(p.x) - .93 > 2.18 && Math.abs(p.x) + .93 < 6.2, 'wheels clear the boom post and the far trestle'); }
  assert.ok(Math.abs(pose(ROUTE, 0).x - pose(ROUTE, L - 1e-9).x) < .01, 'closed loop: no teleport');
});

test('a cart approaching a sealed boom stops before the stop line', () => {
  const c = cart(line - 30, cruise); run([c], sig('sealed'), 60);
  assert.ok(c.s <= line + 1e-6, 'never past the line'); assert.ok(c.s > line - .01, 'drives right up to it'); assert.equal(c.v, 0);
  const p = pose(ROUTE, c.s); assert.ok(p.z - ROAD.gateZ >= CART.boom + CART.half, 'nose short of the boom');
});

test('a queue at a sealed boom keeps its spacing', () => {
  const carts = [cart(line - 20), cart(line - 26), cart(line - 33)]; run(carts, sig('sealed'), 90);
  assert.ok(Math.abs(carts[0].s - line) < .01);
  for (let i = 1; i < 3; i++) { const gap = carts[i - 1].s - carts[i].s; assert.ok(gap >= CART.spacing - 1e-6 && gap < CART.spacing + .05, `gap ${gap}`); }
});

test('the queue drains when the boom reopens', () => {
  const carts = [cart(line - 20), cart(line - 26), cart(line - 33)]; run(carts, sig('sealed'), 90);
  run(carts, sig('manned'), 60); for (const c of carts) assert.ok(c.s > north.s + 10, `stuck at ${c.s - north.s}`);
});

test('a cart already past the line when the gate seals hurries out from under the boom', () => {
  for (const curfew of [false, true]) { const c = cart(line + .05, cruise * .35); let under = 0, last = c.v;
    run([c], sig('sealed', { curfew }), 20, () => { if (c.s < north.s + CART.half + CART.boom) { under += 1 / 60; assert.ok(c.v >= last, 'never slows under the boom'); last = c.v; } });
    assert.ok(c.s > north.s + 5); assert.ok(under < 3.3, `under the boom ${under} s`); assert.ok(last > cruise); }
});

test('the crossing is occupied from the stop line until the tail clears the boom, by shown carts only', () => {
  const c = cart(line - 10, cruise), free = () => occupied([c], ROAD.gateZ, CART.boom) === false;
  run([c], sig('sealed'), 30); assert.ok(free(), 'waiting at the line is not crossing');
  let was = false; run([c], sig('manned'), 30, () => { const u = offset(c.s, north.s, L), now = occupied([c], ROAD.gateZ, CART.boom); assert.equal(now, u > -STOP + CART.eps && u < CART.boom + CART.half); was ||= now; });
  assert.ok(was && free());
  const over = cart(north.s); assert.ok(occupied([over], ROAD.gateZ, CART.boom)); assert.ok(!occupied([over], 34, CART.boom), 'the chain gate is not on the road');
  over.active = false; assert.ok(!occupied([over], ROAD.gateZ, CART.boom)); assert.ok(occupied([cart(ROUTE.crossings[1].s + 1)], ROAD.gateZ, CART.boom), 'the southbound lane too');
});

test('manned: a short stop for papers at the line, slow through, then on', () => {
  for (const crackdown of [false, true]) { const c = cart(line - 20, cruise); let stopped = 0, slowest = Infinity;
    run([c], sig('manned', { crackdown }), 60, () => { if (c.v === 0 && Math.abs(c.s - line) < 1e-3) stopped += 1 / 60; if (c.s > line + .5 && c.s < north.s + 2.5) slowest = Math.min(slowest, c.v); });
    const hold = passage('manned', crackdown).hold; assert.ok(stopped >= hold - .05 && stopped < hold + .2, `stopped ${stopped}`); assert.ok(slowest <= .35 * cruise + 1e-9); assert.ok(c.s > north.s + 10); }
});

test('light: a small slowdown, no stop', () => { const c = cart(line - 20, cruise); let slowest = Infinity;
  run([c], sig('light'), 40, () => { if (Math.abs(c.s - north.s) < 3.5) slowest = Math.min(slowest, c.v); });
  assert.ok(Math.abs(slowest - .7 * cruise) < .05, `slowest ${slowest}`); assert.ok(c.s > north.s + 10);
});

test('open and liberated: unrestricted', () => { for (const gate of ['open', 'gone'] as Gate[]) { const c = cart(line - 20, cruise); let slowest = Infinity;
  run([c], sig(gate), 40, () => { slowest = Math.min(slowest, c.v); }); assert.ok(slowest >= cruise - 1e-9); assert.ok(Math.abs(c.s - (line - 20 + 40 * cruise)) < .1); } });

test('an enforced curfew parks every cart clear of gates and turns; morning sends them on', () => {
  assert.equal(cartsCease('strict'), true); assert.equal(cartsCease('normal', 'none'), true); assert.equal(cartsCease('lax', 'none'), false); assert.equal(cartsCease('none'), false);
  const carts = makeCarts(3); run(carts, sig('manned'), 37); run(carts, sig('sealed', { curfew: true }), 120);
  const parked = carts.map(c => c.s);
  run(carts, sig('sealed', { curfew: true }), 30); carts.forEach((c, i) => { assert.equal(c.v, 0); assert.equal(c.s, parked[i]); });
  for (const c of carts) { for (const [a, b] of ROUTE.turns) assert.ok(ahead(a - CART.half, c.s, L) > b - a + 2 * CART.half); for (const x of ROUTE.crossings) { const u = offset(c.s, x.s, L); assert.ok(u <= -STOP + 1e-6 || u >= CART.keep - 1e-6, 'not standing in a gate'); } }
  run(carts, sig('manned'), 30); carts.forEach((c, i) => assert.ok(c.s > parked[i] + 5));
});

test('a curfew cart caught on a sealed approach waits at the boom, then parks beyond it', () => {
  const c = cart(line - 3, cruise); run([c], sig('sealed', { curfew: true }), 30); assert.ok(Math.abs(c.s - line) < .01);
  run([c], sig('manned', { curfew: true }), 30); const u = offset(c.s, north.s, L); assert.ok(u >= CART.keep - 1e-6 && u < CART.keep + .5, `parked ${u}`);
});

test('three carts in one gate zone when curfew starts all park clear of it, a queue space apart', () => {
  for (const gate of ['manned', 'sealed', 'open'] as Gate[]) { const carts = [cart(north.s + 1, cruise), cart(north.s - 2.2, cruise), cart(north.s - 5.4, cruise)];
    const park = parkPoints(ROUTE, carts); assert.ok(park[2] < park[1] && park[1] < park[0]);
    for (let i = 0; i < 3; i++) { assert.ok(offset(park[i], north.s, L) >= CART.keep - 1e-6, `park point ${offset(park[i], north.s, L)} is inside the gate`); if (i) assert.ok(park[i - 1] - park[i] >= CART.spacing - 1e-6); }
    run(carts, sig(gate, { curfew: true }), 120, () => { for (const c of carts) if (c.v === 0) { const u = offset(c.s, north.s, L); assert.ok(u <= -STOP + 1e-6 || u >= CART.keep - 1e-6, `stopped in the gate at ${u}`); } });
    for (const c of carts) assert.equal(c.v, 0);
    if (gate !== 'sealed') carts.forEach((c, i) => assert.ok(Math.abs(c.s - park[i]) < 1e-6));
    else { assert.ok(Math.abs(carts[0].s - park[0]) < 1e-6); assert.ok(Math.abs(carts[1].s - line) < .01); assert.ok(Math.abs(carts[1].s - carts[2].s - CART.spacing) < .05); } }
});

test('a hidden cart that ends on a shown one lets it go, then appears', () => {
  // The review's probe: both queue at a sealed boom overnight, the hidden one driving through to the line itself.
  const carts = [cart(line - 4, cruise), cart(line - 1, cruise)]; carts[1].active = false;
  run(carts, sig('sealed', { curfew: true }), 30); assert.ok(Math.abs(carts[0].s - carts[1].s) < CART.spacing);
  let shown = -1; run(carts, sig('manned'), 60, t => { activate(carts, 1, true); if (shown < 0 && carts[1].active) shown = t; if (carts[1].active) assert.ok(carts[0].s - carts[1].s >= CART.spacing - 1e-6); });
  assert.ok(shown >= 0 && shown < 15, `shown at ${shown}`); assert.ok(carts[1].s > north.s + 10);
  // And parked on top of each other for the night: the same in the morning.
  const pair = [cart(40), cart(40)]; pair[1].active = false; run(pair, sig('open'), 20, () => activate(pair, 1, true)); assert.ok(pair[1].active); assert.ok(pair[0].s - pair[1].s >= CART.spacing - 1e-6);
});

test('a cart switched on never appears inside another', () => { const carts = [cart(10), cart(11)]; carts[1].active = false;
  activate(carts, 1, true); assert.equal(carts[1].active, false); carts[0].s = 20; activate(carts, 1, true); assert.equal(carts[1].active, true); });

test('no deadlock, no overlap and no boom crossing under random gate and stage changes', () => {
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gates: Gate[] = ['gone', 'open', 'light', 'manned', 'sealed']; const carts = makeCarts(3); const dt = 1 / 30; let shown = 0, hid = 0;
  for (let k = 0; k < 600; k++) { const signal = sig(gates[Math.floor(rand() * 5)], { crackdown: rand() < .3, curfew: rand() < .2 }), seconds = 2 + rand() * 40, stage = Math.floor(rand() * 3);
    // The social state lags: half the time the change lands mid-approach, with carts already moving.
    const from = carts.map(c => c.s), since = carts.map(() => 0);
    for (let t = 0; t < seconds; t += dt) { const before = carts.map(c => c.s), was = carts.map(c => c.active);
      carts.forEach((_, i) => activate(carts, i, i <= stage)); step(carts, signal, dt, cruise);
      carts.forEach((c, i) => { assert.ok(c.s >= before[i]); if (c.active && !was[i]) { shown++; since[i] = t; } if (!c.active && was[i]) hid++;
        if (signal.gate === 'sealed') for (const x of ROUTE.crossings) { const d = ahead(before[i], x.s - STOP, L), near = d > L - 1e-6 ? 0 : d; assert.ok(!(near < c.s - before[i] - 1e-6), 'crossed a sealed line'); } });
      const order = carts.filter(c => c.active).sort((a, b) => (a.s % L) - (b.s % L)); if (order.length > 1) order.forEach((c, i) => { const next = order[(i + 1) % order.length], gap = ahead(c.s, next.s, L); assert.ok(gap >= CART.spacing - 1e-6, `overlap ${gap}`); }); }
    if (signal.gate !== 'sealed' && !signal.curfew && seconds > 25) carts.forEach((c, i) => { assert.ok(i > stage || c.active, `cart ${i} still hidden after ${seconds.toFixed(0)} s of ${signal.gate}`);
      if (c.active && since[i] < seconds - 25) assert.ok(c.s - from[i] > 5, `cart ${i} made ${c.s - from[i]} m in ${seconds.toFixed(0)} s of ${signal.gate}`); });
  }
  assert.ok(shown > 20 && hid > 20, `stage changes exercised: ${shown} shown, ${hid} hidden`);
  assert.ok(nextLine(ROUTE, line).d === 0);
});
