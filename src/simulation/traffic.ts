import type { Enforcement, Gate } from './occupation';

/** CARTS ON THE GREAT MAIN. Route gating, not freight: a closed loop up the east lane, round in front of Market
 * Square, down the west lane and round again above the arrival terrace. Both lanes pass the Lowworks checkpoint
 * through its openings, so the gate's state decides how a cart moves there:
 *
 *   gone, open   full speed, nothing to stop for
 *   light        a small slowdown past the box
 *   manned       stop at the line for papers, then walk through slowly
 *   sealed       stop at the line and wait; a cart already over it finishes crossing
 *
 * An enforced curfew parks every cart for the night (never inside a gate's approach or a turn), and morning sends them on.
 * Pure rules, no rendering: each cart is an accumulated distance `s` along the loop, so stopping never teleports. */

// ---------------------------------------------------------------- the loop
/** Lanes at x = ±lane, eased out to ±gateLane at the checkpoint so the wheels clear the boom posts (2.1 m off centre).
 * The north turn stays in front of the square's centre fountain and the clock terrace; the south turn is open street. */
export const ROAD = { lane: 2.8, gateLane: 3.5, north: -18, south: 62, gateZ: 10.4 };
/** Cart half-length, nose-to-tail spacing in a queue (centres), the boom's depth plus a buffer for the stop line,
 * the clear zone either side of a boom where nobody parks, and the motion limits. */
export const CART = { half: 1, spacing: 3.2, boom: .47, buffer: .5, keep: 6, accel: .9, brake: 1.6, eps: 1e-6 };
export const STOP = CART.boom + CART.half + CART.buffer;

const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
/** Lateral offset of a lane at depth z: wider within 3 m of the boom, back to the street lane by 7 m. */
export const laneX = (z: number) => ROAD.lane + (ROAD.gateLane - ROAD.lane) * smooth((7 - Math.abs(z - ROAD.gateZ)) / 4);

export interface Route { x: Float64Array; z: Float64Array; at: Float64Array; length: number;
  /** Arc length at which each lane crosses the boom; the direction of travel there (-1 north, +1 south). */
  crossings: { s: number; dir: number }[];
  /** Arc-length spans of the two turns. */
  turns: [number, number][] }

export function buildRoute(step = .25): Route {
  const pts: [number, number][] = [], r = ROAD.lane;
  for (let z = ROAD.south; z > ROAD.north; z -= step) pts.push([laneX(z), z]);
  const arc = (from: number, cz: number) => { const n = Math.ceil(Math.PI * r / step); for (let k = 0; k < n; k++) { const a = from + Math.PI * k / n; pts.push([r * Math.cos(a), cz - r * Math.sin(a)]); } };
  const t0 = pts.length; arc(0, ROAD.north); const t1 = pts.length;
  for (let z = ROAD.north; z < ROAD.south; z += step) pts.push([-laneX(z), z]);
  const t2 = pts.length; arc(Math.PI, ROAD.south); const t3 = pts.length;
  pts.push(pts[0]);
  const n = pts.length, x = new Float64Array(n), z = new Float64Array(n), at = new Float64Array(n);
  for (let i = 0; i < n; i++) { x[i] = pts[i][0]; z[i] = pts[i][1]; if (i) at[i] = at[i - 1] + Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]); }
  const length = at[n - 1];
  const crossAt = (from: number, to: number) => { for (let i = from; i < to; i++) if ((z[i] - ROAD.gateZ) * (z[i + 1] - ROAD.gateZ) <= 0 && z[i] !== z[i + 1]) return at[i] + (at[i + 1] - at[i]) * (z[i] - ROAD.gateZ) / (z[i] - z[i + 1]); return NaN; };
  return { x, z, at, length, crossings: [{ s: crossAt(0, t0), dir: -1 }, { s: crossAt(t1, t2), dir: 1 }], turns: [[at[t0 - 1], at[t1]], [at[t2 - 1], at[t3]]] };
}
export const ROUTE = buildRoute();

/** Position and heading at distance s around the loop. `yaw` turns a model whose length lies along +z. */
export function pose(route: Route, s: number) { const p = wrap(s, route.length), at = route.at;
  let lo = 0, hi = at.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (at[mid] <= p) lo = mid; else hi = mid; }
  const f = (p - at[lo]) / Math.max(1e-9, at[hi] - at[lo]), dx = route.x[hi] - route.x[lo], dz = route.z[hi] - route.z[lo];
  return { x: route.x[lo] + dx * f, z: route.z[lo] + dz * f, yaw: Math.atan2(dx, dz) }; }

export const wrap = (s: number, l: number) => ((s % l) + l) % l;
/** Distance ahead from a to b along the loop, in [0, length). */
export const ahead = (a: number, b: number, l: number) => wrap(b - a, l);
/** Signed distance of a from b, in [-length/2, length/2). */
export const offset = (a: number, b: number, l: number) => wrap(a - b + l / 2, l) - l / 2;

// ---------------------------------------------------------------- what the gate asks
export interface Passage { sealed: boolean; factor: number; zone: number; hold: number }
/** How a cart passes a gate. `factor` applies within `zone` metres of the boom; `hold` is the stop at the line for papers.
 * A crackdown keeps every cart longer at the line, and stops even the light gate's. */
export function passage(gate: Gate, crackdown = false): Passage {
  if (gate === 'sealed') return { sealed: true, factor: .5, zone: 3, hold: 0 };
  if (gate === 'manned') return { sealed: false, factor: .35, zone: 3, hold: crackdown ? 4 : 1.5 };
  if (gate === 'light') return { sealed: false, factor: .7, zone: 4, hold: crackdown ? 2.5 : 0 };
  return { sealed: false, factor: 1, zone: 0, hold: 0 };
}
/** An enforced curfew (not a lax one) takes ordinary carts off the street. */
export const cartsCease = (...enforcement: Enforcement[]) => enforcement.some(e => e === 'normal' || e === 'strict');

// ---------------------------------------------------------------- carts
export interface Cart {
  /** Distance travelled, unwrapped; position on the loop is s mod length. */
  s: number; v: number;
  /** Seconds waited at the current stop line, and which line that was. */
  waited: number; line: number;
  /** Where a curfew parks it (unwrapped distance), or null when it runs. */
  parkAt: number | null;
  /** Shown in the street: only shown carts keep their distance from each other. */
  active: boolean;
}
export interface Signal { gate: Gate; crackdown: boolean; curfew: boolean }
export const makeCarts = (count: number, route = ROUTE): Cart[] => Array.from({ length: count }, (_, i) => ({ s: route.length * i / count + 7, v: 0, waited: 0, line: -1, parkAt: null, active: true }));

/** The next stop line ahead of s, and how far. A cart standing exactly on a line is at distance 0, not a lap away. */
export function nextLine(route: Route, s: number) { let best = Infinity, index = -1;
  route.crossings.forEach((c, i) => { let d = ahead(s, c.s - STOP, route.length); if (d > route.length - CART.eps) d = 0; if (d < best) { best = d; index = i; } });
  return { index, d: best }; }

/** Where a cart told to stop for the night comes to rest: after braking, then pushed on past any turn or gate zone
 * it would otherwise stand in (a gate's approach and the clear ground beyond the boom). If the gate is sealed the
 * stop line still holds it first, so a cart caught on the approach waits at the boom until it opens. */
export function parkPoint(route: Route, cart: Cart) { const l = route.length; let s = cart.s + cart.v * cart.v / (2 * CART.brake);
  const spans: [number, number][] = [...route.turns.map(([a, b]): [number, number] => [a - CART.half - 1, b + CART.half + .5]), ...route.crossings.map((c): [number, number] => [c.s - STOP - CART.keep, c.s + CART.keep])];
  for (let pass = 0; pass < spans.length; pass++) for (const [a, b] of spans) { const u = ahead(a, s, l); if (u < b - a) s += b - a - u; }
  return s; }

/** The speed limit of the gate zone a cart is in (1 outside every zone). */
export function zoneFactor(route: Route, s: number, p: Passage) { if (!p.zone) return 1; for (const c of route.crossings) if (Math.abs(offset(s, c.s, route.length)) < p.zone) return p.factor; return 1; }

/** One tick. Each cart may go as far as its nearest constraint: the stop line while the gate holds it, the cart in front
 * less the queue spacing, or its curfew parking place. Constraints use positions at the start of the tick, so the order
 * carts are moved in never matters and nobody runs into anyone. */
export function step(carts: Cart[], signal: Signal, dt: number, cruise: number, route = ROUTE) {
  if (!(dt > 0)) return; dt = Math.min(dt, .25);
  const l = route.length, gate = passage(signal.gate, signal.crackdown), at = carts.map(c => c.s);
  for (const cart of carts) { if (!signal.curfew) cart.parkAt = null; else if (cart.parkAt === null) cart.parkAt = parkPoint(route, cart); }
  carts.forEach((cart, i) => {
    let room = Infinity;
    const line = nextLine(route, cart.s); if (line.index !== cart.line) { cart.line = line.index; cart.waited = 0; }
    if (gate.sealed) cart.waited = 0;
    if (gate.sealed || cart.waited < gate.hold) { room = line.d; if (line.d <= CART.eps && !gate.sealed) cart.waited += dt; }
    if (cart.active) carts.forEach((other, j) => { if (j === i || !other.active) return; const gap = ahead(cart.s, at[j], l); if (gap > CART.eps || (gap <= CART.eps && j < i)) room = Math.min(room, gap - CART.spacing); });
    if (cart.parkAt !== null) room = Math.min(room, cart.parkAt - cart.s);
    room = Math.max(0, room);
    const want = Math.min(cruise * zoneFactor(route, cart.s, gate), Math.sqrt(2 * CART.brake * room));
    cart.v = want > cart.v ? Math.min(want, cart.v + CART.accel * dt) : Math.max(want, cart.v - 4 * CART.brake * dt);
    const move = Math.min(cart.v * dt, room); if (move < cart.v * dt) cart.v = move / dt;
    cart.s += move;
  });
}

/** Turning a cart back on: it appears only where it has room, never inside another cart. */
export function activate(carts: Cart[], index: number, want: boolean, route = ROUTE) { const cart = carts[index]; if (!want) { cart.active = false; return; } if (cart.active) return;
  cart.active = carts.every((o, j) => j === index || !o.active || Math.abs(offset(o.s, cart.s, route.length)) >= CART.spacing); }
