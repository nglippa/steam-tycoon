import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE, ROAD, CART, STOP, step, pose, passage, cartsCease, makeCarts, activate, ahead, offset, nextLine, type Cart, type Signal } from '../src/simulation/traffic.ts';
import type { Gate } from '../src/simulation/occupation.ts';

const L = ROUTE.length, north = ROUTE.crossings[0], line = north.s - STOP, cruise = 1.1;
const cart = (s: number, v = 0): Cart => ({ s, v, waited: 0, line: -1, parkAt: null, active: true });
const sig = (gate: Gate, extra: Partial<Signal> = {}): Signal => ({ gate, crackdown: false, curfew: false, ...extra });
/** Run at 60 Hz, calling `each` after every tick. */
function run(carts: Cart[], signal: Signal, seconds: number, each?: (t: number) => void) { const dt = 1 / 60; for (let t = 0; t < seconds; t += dt) { step(carts, signal, dt, cruise); each?.(t); } }

test('the loop clears the clock terrace and the square, and both lanes cross the boom inside an opening', () => {
  assert.equal(ROUTE.crossings.length, 2); assert.ok(L > 150);
  for (let s = 0; s < L; s += .5) { const p = pose(ROUTE, s); assert.ok(p.z > -21.5, `z ${p.z} reaches the square`); assert.ok(Math.hypot(p.x, p.z + 49.5) > 13.5 + CART.half); }
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

test('a cart already past the line when the gate seals finishes crossing', () => {
  const c = cart(line + .2, cruise * .35); run([c], sig('sealed'), 20); assert.ok(c.s > north.s + 5);
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

test('a cart switched on never appears inside another', () => { const carts = [cart(10), cart(11)]; carts[1].active = false;
  activate(carts, 1, true); assert.equal(carts[1].active, false); carts[0].s = 20; activate(carts, 1, true); assert.equal(carts[1].active, true); });

test('no deadlock and no boom crossing under random gate changes', () => {
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gates: Gate[] = ['gone', 'open', 'light', 'manned', 'sealed']; const carts = makeCarts(3); const dt = 1 / 30;
  for (let k = 0; k < 400; k++) { const signal = sig(gates[Math.floor(rand() * 5)], { crackdown: rand() < .3, curfew: rand() < .2 }), seconds = 2 + rand() * 40;
    // The social state lags: half the time the change lands mid-approach, with carts already moving.
    const from = carts.map(c => c.s);
    for (let t = 0; t < seconds; t += dt) { const before = carts.map(c => c.s); step(carts, signal, dt, cruise);
      carts.forEach((c, i) => { assert.ok(c.s >= before[i]);
        if (signal.gate === 'sealed') for (const x of ROUTE.crossings) { const d = ahead(before[i], x.s - STOP, L), near = d > L - 1e-6 ? 0 : d; assert.ok(!(near < c.s - before[i] - 1e-6), 'crossed a sealed line'); } });
      const order = [...carts].sort((a, b) => (a.s % L) - (b.s % L)); order.forEach((c, i) => { const next = order[(i + 1) % 3], gap = ahead(c.s, next.s, L); assert.ok(gap >= CART.spacing - 1e-6, `overlap ${gap}`); }); }
    if (signal.gate !== 'sealed' && !signal.curfew && seconds > 25) carts.forEach((c, i) => assert.ok(c.s - from[i] > 5, `cart ${i} made ${c.s - from[i]} m in ${seconds.toFixed(0)} s of ${signal.gate}`));
  }
  assert.ok(nextLine(ROUTE, line).d === 0);
});
