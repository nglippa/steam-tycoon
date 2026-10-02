import { berth, type Enforcement, type Manner, type Trait } from './occupation';

/** THE CROWD UNDER THE ORDINANCE. How ordinary people use the street while it is held: who steps aside, who stops,
 * who crosses to the other kerb, when a conversation goes quiet and when it breaks up. Pure rules, no rendering:
 * the city asks these a few times a second per person and eases the body toward the answer. */

// ---------------------------------------------------------------- where the Ordinance is
export type ThreatKind = 'patrol' | 'sentry' | 'inspector' | 'checkpoint';
export interface Spot { x: number; y: number; z: number }
/** One of the Ordinance in the street. `at` and `facing` are live references, so a query reads where they are now,
 * not where they were when the grid was last built. */
export interface Threat { at: Spot; kind: ThreatKind; facing?: { y: number }; /** When the grid last saw this one out (the city's refresh time). */ stamp?: number }
export interface Near { threat: Threat; distance: number }

/** A coarse bucket grid of the Ordinance's people, rebuilt twice a second. Nobody loops over every guard:
 * a question about a point looks only at the few cells around it. */
export class ThreatGrid {
  private cells = new Map<number, Threat[]>(); private spare: Threat[][] = []; readonly all: Threat[] = [];
  constructor(readonly cell = 7) {}
  private key(i: number, j: number) { return (i + 4096) * 8192 + (j + 4096); }
  clear() { for (const list of this.cells.values()) { list.length = 0; this.spare.push(list); } this.cells.clear(); this.all.length = 0; }
  add(t: Threat) { const k = this.key(Math.floor(t.at.x / this.cell), Math.floor(t.at.z / this.cell)); let list = this.cells.get(k); if (!list) this.cells.set(k, list = this.spare.pop() ?? []); list.push(t); this.all.push(t); }
  /** The nearest of them within `radius` on the same level (a balcony is not the street), optionally passing over one. */
  nearest(x: number, z: number, y: number, radius: number, skip?: Threat): Near | undefined {
    // A walking man may have left his cell since the grid was built: look one metre wider than asked.
    const rings = Math.ceil((radius + 1) / this.cell), ci = Math.floor(x / this.cell), cj = Math.floor(z / this.cell), r2 = radius * radius; let best: Threat | undefined, bd = r2;
    for (let i = ci - rings; i <= ci + rings; i++) for (let j = cj - rings; j <= cj + rings; j++) { const list = this.cells.get(this.key(i, j)); if (!list) continue;
      for (const t of list) { if (t === skip || Math.abs(t.at.y - y) > 2) continue; const d2 = (t.at.x - x) ** 2 + (t.at.z - z) ** 2; if (d2 < bd) { bd = d2; best = t; } } }
    return best ? { threat: best, distance: Math.sqrt(bd) } : undefined;
  }
}
/** Is this walking man coming toward (x, z)? Standing posts never are. */
export function approaching(t: Threat, x: number, z: number) { if (t.kind !== 'patrol' || !t.facing) return false; return Math.sin(t.facing.y) * (x - t.at.x) + Math.cos(t.facing.y) * (z - t.at.z) > 0; }
/** Has a patrol gone by: the point is behind it and it is a few metres off, or it is simply far away now. */
export function passed(t: Threat, x: number, z: number) { const d = Math.hypot(t.at.x - x, t.at.z - z); return d > 12 || (d > 4 && !approaching(t, x, z)); }

// ---------------------------------------------------------------- how hard the street presses
/** 0 under civic control, rising to 1 in a heavy street, more under a crackdown or an enforced curfew. `occupation` is 0..1. */
export function intensity(occupation: number, crackdown = false, curfew: Enforcement = 'none') {
  if (curfew === 'strict' || curfew === 'normal') return 1.2 + (crackdown ? .2 : 0);
  if (occupation <= .2) return 0;
  return Math.min(1, (occupation - .2) / .55) + (crackdown ? .3 : 0);
}
const KIND: Record<ThreatKind, number> = { patrol: 1, sentry: 1.3, inspector: 1.2, checkpoint: 1.15 };
/** How far off a person starts to react, in metres. Posts are given a wider berth than a passing beat; a coming patrol is seen sooner. */
export function reachOf(trait: Trait, kind: ThreatKind, level: number, crackdown = false, coming = false) {
  return berth({ trait } as Manner) * KIND[kind] * (.7 + .3 * Math.min(1, level)) * (crackdown ? 1.25 : 1) * (coming ? 1.2 : 1);
}

// ---------------------------------------------------------------- what a person does
export type Reaction = 'none' | 'stepAside' | 'pause' | 'turnAway' | 'crossStreet' | 'reroute' | 'wait';
/** `route` keeps facing along the route, `away` turns the shoulder (or the face, to a wall), `toward` watches them by. */
export type Facing = 'route' | 'away' | 'toward';
export interface Situation { trait: Trait; kind: ThreatKind; distance: number; coming: boolean; walking: boolean; occupation: number; crackdown: boolean; curfew: Enforcement; seed: number; canCross?: boolean }
/** `delay` before it starts (s), `amplitude` of the sidestep (m), `hold` the least time it lasts (s), `rate` how fast the
 * route goes on meanwhile (0 stopped, 1 normal), `reach`/`exit` the radii it starts and ends at (exit is wider: no flicker). */
export interface Response { reaction: Reaction; delay: number; amplitude: number; hold: number; rate: number; face: Facing; reach: number; exit: number }
const NONE: Response = { reaction: 'none', delay: 0, amplitude: 0, hold: 0, rate: 1, face: 'route', reach: 0, exit: 0 };
/** A stable 0..1 for a person and a purpose: two people never draw the same delay. */
export const jitter = (seed: number, k = 0) => { const v = Math.sin(seed * 91.73 + k * 13.17 + 7.1) * 43758.5453; return v - Math.floor(v); };
const SIDE: Partial<Record<Trait, number>> = { nervous: 1.5, proud: .45, hurried: 1.3, reserved: 1, tired: .8, sociable: .9, curious: .85 };

/** The one decision: what this person does about this member of the Ordinance, here, now. */
export function respond(s: Situation): Response {
  const level = intensity(s.occupation, s.crackdown, s.curfew), side = SIDE[s.trait];
  if (level <= 0 || side === undefined) return NONE;
  // A loosened street: only the nervous still flinch.
  if (level < .3 && s.trait !== 'nervous') return NONE;
  const reach = reachOf(s.trait, s.kind, level, s.crackdown, s.coming);
  // Someone who means to cross sees the patrol coming from further off than someone who only steps aside.
  if (s.walking && s.kind === 'patrol' && s.coming && s.canCross && crosses(s.trait, s.crackdown, level) && s.distance < Math.max(reach, 9.5))
    return { reaction: 'crossStreet', delay: (.1 + jitter(s.seed, 3) * .4) * (s.crackdown ? .6 : 1), amplitude: 0, hold: 0, rate: 0, face: 'route', reach: 9.5, exit: 12 };
  if (s.distance >= reach) return NONE;
  // The proud give ground only when it is on top of them, and only as much as they must.
  if (s.trait === 'proud' && level < .6 && !s.crackdown && s.distance > reach * .6) return NONE;
  const post = s.kind === 'sentry' || s.kind === 'checkpoint', enforced = s.curfew === 'strict' || s.curfew === 'normal';
  const speed = s.crackdown ? .6 : 1, j = (k: number) => jitter(s.seed, k);
  const amplitude = Math.min(1.8, (.55 + .6 * Math.min(1, level)) * side * (post ? 1.2 : 1) * (s.crackdown ? 1.3 : 1) * (enforced ? 1.2 : 1) * (.85 + .3 * j(1)));
  const out = (reaction: Reaction, rate: number, hold: number, face: Facing, delay: number): Response => {
    // Curfew is transit: nobody stands about in it, even to let a patrol by.
    if (enforced && (reaction === 'pause' || reaction === 'wait' || reaction === 'turnAway')) { reaction = 'reroute'; rate = Math.max(rate, .9); hold = Math.min(hold, 1); }
    // Someone standing by a post only ever starts to react when the street itself changes (a crackdown, the curfew bell): spread those out.
    return { reaction, delay: delay * speed + (!s.walking && s.kind !== 'patrol' ? j(11) * 1.8 : 0), amplitude: reaction === 'reroute' ? Math.min(1.8, amplitude * 1.15) : amplitude, hold: hold * (s.crackdown ? .8 : 1), rate, face, reach, exit: reach * 1.3 };
  };
  if (!s.walking) {
    if (s.trait === 'nervous') return out('turnAway', 1, 2 + j(2) * 2, 'away', .1 + j(3) * .3);
    if (s.trait === 'proud') return out('stepAside', 1, 1, 'route', .6 + j(3) * .6);
    return out('stepAside', 1, 1.2 + j(2), s.trait === 'reserved' || s.trait === 'tired' ? 'away' : s.trait === 'curious' ? 'toward' : 'route', .2 + j(3) * .6);
  }
  // Posts: a wider berth and no lingering beside them. Nobody stops; the nervous swing well wide.
  if (post) return s.trait === 'nervous' ? out('reroute', 1.05, 1, 'away', .05 + j(3) * .25) : s.trait === 'proud' ? out('stepAside', 1, .6, 'route', .5 + j(3) * .5) : out(s.trait === 'hurried' ? 'reroute' : 'stepAside', 1.1, .8, 'route', .2 + j(3) * .4);
  // An inspector: wait before passing through what he is looking at, then go by restrained. The hurried go round instead.
  if (s.kind === 'inspector') return s.trait === 'hurried' ? out('reroute', 1, .8, 'route', .1 + j(3) * .3) : s.trait === 'proud' ? out('stepAside', .9, .8, 'route', .5 + j(3) * .5)
    : out('wait', 0, (s.trait === 'nervous' ? 2.6 : 1.5) + j(2) * 2, s.trait === 'nervous' ? 'away' : 'toward', .1 + j(3) * .5);
  // A patrol on the move.
  switch (s.trait) {
    case 'nervous': return out('turnAway', 0, 1.6 + j(2) * 1.4, 'away', .05 + j(3) * .3);
    case 'proud': return out('stepAside', 1, .6, 'route', .5 + j(3) * .6);
    case 'hurried': return out('reroute', 1.05, .6, 'route', .1 + j(3) * .25);
    case 'tired': return out('pause', 0, 1.8 + j(2) * 1.4, 'route', .3 + j(3) * .5);
    case 'reserved': return out('turnAway', .35, 1 + j(2), 'away', .2 + j(3) * .5);
    case 'curious': return out('pause', 0, 1.2 + j(2) * 1.2, 'toward', .2 + j(3) * .5);
    default: return out('pause', .2, 1 + j(2), 'toward', .2 + j(3) * .6);
  }
}

// ---------------------------------------------------------------- crossing the street
/** A stretch of street whose geometry is known to be clear kerb to kerb. Walkers on `x0..x1` may cross to `to` and wait there;
 * `lanes` are cart lanes on the way, which they cross only when no cart is close. The city samples each once and drops any it cannot trust. */
export interface Crossing { z0: number; z1: number; x0: number; x1: number; to: number; lanes: number[] }
export const CROSSINGS: Crossing[] = [
  // The Great Main between the pressure station and the bench: east walk to the west kerb, and back the other way.
  { z0: 34.5, z1: 44, x0: 4.5, x1: 5.7, to: -5.6, lanes: [2.8, -2.8] },
  { z0: 34.5, z1: 44, x0: -5.7, x1: -4.5, to: 5.6, lanes: [-2.8, 2.8] },
  // The housing lane along the patrol's beat and past the west sentry: from the housefronts over to the far side.
  { z0: 14, z1: 35, x0: -39.2, x1: -37.3, to: -31.5, lanes: [] },
];
export const crossingAt = (x: number, z: number) => CROSSINGS.find(c => x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1);
/** Points to test against the street's colliders before trusting a crossing: the whole box between the kerbs, a little longer
 * than the stretch itself because the walk back runs on along the route as it crosses. */
export function crossingSamples(c: Crossing, step = .5): [number, number][] {
  const out: [number, number][] = [], a = Math.min(c.x0, c.to), b = Math.max(c.x1, c.to), nx = Math.ceil((b - a) / step), z0 = c.z0 - 2, nz = Math.ceil((c.z1 + 2 - z0) / step);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) out.push([a + (b - a) * i / nx, z0 + (c.z1 + 2 - z0) * j / nz]);
  return out;
}
/** Who crosses rather than stepping aside: the nervous always; the reserved once the street is held hard; under a crackdown,
 * anyone who is not too proud or too hurried to. `level` is the street's intensity. */
export const crosses = (trait: Trait, crackdown = false, level = 0) => trait === 'nervous' || (trait === 'reserved' && level >= .9) || (crackdown && trait !== 'proud' && trait !== 'hurried');

// ---------------------------------------------------------------- conversations
export type GroupMode = 'talk' | 'hushed' | 'dispersed';
export interface Group { mode: GroupMode; timer: number; exposure: number; near: boolean }
export const newGroup = (): Group => ({ mode: 'talk', timer: 0, exposure: 0, near: false });
export interface GroupInput { kind: ThreatKind | null; distance: number; occupation: number; crackdown: boolean; curfew: Enforcement; seed: number }
/** How close the Ordinance comes before a conversation stops. */
export const hushRadius = (kind: ThreatKind, crackdown = false) => (kind === 'patrol' ? 6.5 : kind === 'inspector' ? 4.5 : 4) * (crackdown ? 1.3 : 1);
/** One step of a conversation under watch. Talk stops when the Ordinance comes near and starts again a little after it has gone;
 * in a hard street, a group that keeps being passed breaks up for a while, and none forms right under a post. */
export function stepGroup(g: Group, s: GroupInput, dt: number): Group {
  const level = intensity(s.occupation, s.crackdown, s.curfew), j = (k: number) => jitter(s.seed, k);
  g.exposure = Math.max(0, g.exposure - dt / 75);
  const was = g.near, r = s.kind && level >= .35 ? hushRadius(s.kind, s.crackdown) : 0;
  // Wider to leave than to enter, so a patrol on the edge does not switch a conversation on and off.
  g.near = r > 0 && s.distance < (was ? r * 1.3 : r);
  if (g.near && !was) { g.exposure += 1; if (g.mode === 'talk') g.mode = 'hushed'; }
  const harsh = s.crackdown || s.occupation >= .85 || s.curfew === 'strict', post = s.kind === 'sentry' || s.kind === 'checkpoint';
  if (g.mode !== 'dispersed' && g.near && ((harsh && g.exposure >= (s.crackdown ? 1.5 : 2)) || (post && s.distance < 3))) { g.mode = 'dispersed'; g.timer = (s.crackdown ? 60 : 40) + j(5) * 30; }
  else if (g.mode === 'hushed' && !g.near) { if (was) g.timer = (2 + j(6) * 3) * (s.crackdown ? 1.6 : 1); g.timer -= dt; if (g.timer <= 0) g.mode = 'talk'; }
  // Broken up: back together only once the street has been quiet a while, and quietly at first.
  else if (g.mode === 'dispersed' && !g.near) { g.timer -= dt; if (g.timer <= 0) { g.mode = 'hushed'; g.timer = 2 + j(7) * 3; } }
  return g;
}
/** What a conversation's state looks like: whether they speak, how far apart they stand (m), whether this one turns away, and whether they watch the patrol. */
export function groupPose(g: Group, seed: number) {
  return { speaks: g.mode === 'talk', separation: g.mode === 'dispersed' ? 1.3 + jitter(seed, 8) * .5 : g.mode === 'hushed' ? .22 + jitter(seed, 8) * .18 : 0, turnAway: g.mode === 'dispersed', watch: g.mode === 'hushed' && g.near && jitter(seed, 9) < .7 };
}

// ---------------------------------------------------------------- the street's routes by the hour
export type RouteKind = 'social' | 'walker' | 'merchant' | 'worker';
/** `shown` whether this kind of scene is out at all; `transit` walkers go one way (to a door or an exit) and do not idle;
 * `width` how much of the street walkers use (0 their kerb, 1 all of it); `spill` how far merchants come out into the street (m); `pace` route speed. */
export interface RouteState { shown: boolean; transit: boolean; linger: boolean; width: number; spill: number; pace: number }
export function routeState(enforcement: Enforcement, kind: RouteKind, occupation = 1): RouteState {
  if (enforcement === 'strict' || enforcement === 'normal') return { shown: kind === 'walker' || kind === 'worker', transit: kind === 'walker', linger: false, width: 0, spill: 0, pace: kind === 'walker' ? 1.15 : 1 };
  const free = occupation <= .2 ? 1 : occupation <= .4 ? .5 : 0;
  if (enforcement === 'lax') return { shown: true, transit: false, linger: kind !== 'walker', width: free * .5, spill: 0, pace: 1.05 };
  return { shown: true, transit: false, linger: true, width: free, spill: kind === 'merchant' ? free * .6 : 0, pace: 1 };
}
