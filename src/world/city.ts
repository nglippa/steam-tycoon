import * as T from 'three';
import { reducedMotion } from '../motion';
import { CrowdBatch } from './crowd-batch';
import { Presentation } from './presentation';
import { facadeDetail, businessCrown, businessBody, businessHeights, businessLift, buildSkyline, buildOuterCity, shopfront, shopWindows, setDisplayGlass } from './architecture';
import { box, cyl, sphere, torus, beam, gear, barrel, crate, tree, sign, windowUnit, windowGlass, displayGlass, arch, bake, mats, random, applyWorldPalette, illustrated, asProp } from './assets';
setDisplayGlass(displayGlass);
import { roof, pipe, crest, railing, canopy, bunting, fabricOf, shopDisplay, grimeSkirt, sootStreak, paintedWear, rustStreak, pressureRing, bench, pressureStation, mailPost, wingedValve, aetherDiamond, gauge, refreshCanopyColors, refreshFacades, facadePaints, artMats } from './art-kit';
import { citizen, setCitizenProsperity } from './citizens';
import { palette as P } from './palette';
import { housingPaint, setHousingCondition, residentialWindows, type Home } from './housing';
import { animateLife, sceneFor, stageCitizen, setLifeConditions, setSocialField, turnTaking, routeLeg } from './citizen-life';
import { ThreatGrid, respond, approaching, passed, crossingAt, CROSSINGS, crossingSamples, newGroup, stepGroup, groupPose, routeState, jitter, intensity, type Threat, type ThreatKind, type Reaction, type Facing, type Crossing, type Group, type RouteKind, type Spot } from '../simulation/crowd';
import { DISTRICTS, BANDS, bandOf, population, admits, districtAt, isOccupier, standingOf, seedOf, gateState, type DistrictId, type Band, type Enforcement, type Standing, type Incident, type Importance, type Gate, type Manner, type Tone, type PostRole } from '../simulation/occupation';
import { TerraEdge, TERRACE as EDGE_TERRACE, CHASM, GALLERY, WEST_EDGE } from './terra-edge';
import { Economy, PROPERTIES, SITE_LIBERATED, SITE_RESTORED, type PropertyId, type SiteId } from '../simulation/economy';
import { Traffic } from './traffic';
import { ROAD, laneX } from '../simulation/traffic';
export interface Collider { minX: number; maxX: number; minZ: number; maxZ: number; height: number; base?: number; gate?: string; open?: () => boolean }
/** A walkable surface above or below the street: a roof, a catwalk, a pier past the rim.
 * `y1` makes it a stair or ramp, rising from `y` at the low end of `axis` to `y1` at the high end. */
export interface Deck { minX: number; maxX: number; minZ: number; maxZ: number; y: number; y1?: number; axis?: 'x' | 'z' }
/** An authored ladder: where the Steward stands at each end, and the line the rungs follow. */
export interface Ladder { id: string; x: number; z: number; bottom: T.Vector3; top: T.Vector3 }
const deckHeight = (d: Deck, x: number, z: number) => d.y1 === undefined ? d.y : d.y + (d.y1 - d.y) * T.MathUtils.clamp(d.axis === 'x' ? (x - d.minX) / (d.maxX - d.minX) : (z - d.minZ) / (d.maxZ - d.minZ), 0, 1);
export interface Target { object: T.Object3D; id: string; kind: 'property' | 'ledger' | 'discovery' | 'district' | 'site' | 'lift' | 'ladder' | 'home' | 'signal'; label: string; position: T.Vector3; hint?: string; /** Not offered while this is false (a thing behind a door that is still shut). */ when?: () => boolean }
interface PropertyVisual { root: T.Group; additions: T.Group; machine: T.Group; gear: T.Group; piston: T.Mesh; level: number; building: T.Group; sign: T.Mesh }
/** Clock terrace: concentric 0.2 m steps rising 1.2 m toward the tower. */
export const TERRACE = { x: 0, z: -49.5, outer: 13.5, inner: 9, rise: 1.2, steps: 6 };
export function terraceRise(x: number, z: number) { const r = Math.hypot(x - TERRACE.x, z - TERRACE.z); if (r >= TERRACE.outer) return 0; const t = Math.min(1, (TERRACE.outer - r) / (TERRACE.outer - TERRACE.inner)); return Math.ceil(t * TERRACE.steps - 1e-6) / TERRACE.steps * TERRACE.rise; }
const pitchOf = (width: number, type: number) => width * (.36 + (type % 3) * .06);
/** Anyone who can be asked to make room: their body, who they are, how they carry themselves, and their seed phase. */
type Person = { group: T.Group; archetype: string; manner: Manner; phase: number };
/** What the caller knows about the person this frame: a conversation partner (or an official they are dealing with, who is not
 * a threat to them), whether they walk a route and are moving on it now, whether the caller re-poses them every frame, whether they trade. */
interface Room { partner?: T.Vector3; with?: T.Group; walking?: boolean; moving?: boolean; staged?: boolean; merchant?: boolean }
/** One civilian's current answer to the Ordinance. o* is the eased offset from their scene position, t* its target, v* its velocity;
 * `turn` is how far they have turned from their scene's facing; `clock`/`rate` drive their route. */
interface Mind { ox: number; oz: number; vx: number; vz: number; tx: number; tz: number; turn: number; turnTo: number; clock: number; rate: number; rateTo: number; pace: number; next: number; last: number; seed: number;
  act: Reaction; threat?: Threat; start: number; hold: number; exit: number; amp: number; side: number; lx: number; lz: number; facing: Facing; reactRate: number;
  cross?: { c: Crossing; phase: 'go' | 'wait' | 'back'; at: number; threat: Threat; /** Since when a cart has kept them out of the next lane. */ held?: number }; /** No crossing is tried again before this. */ shy: number; group: Group; watch?: Spot; indoors: boolean }
const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** A body turns a shoulder, not its back: at most ~95 degrees. Something straight behind keeps the side already chosen, so it never flips. */
const clampTurn = (a: number, prev = 0) => { if (Math.abs(a) > 2.7 && prev) a = Math.sign(prev) * Math.abs(a); return Math.max(-1.65, Math.min(1.65, a)); };
/** What kind of street scene an authored NPC is, for the hour's route state. */
const routeKind = (sc: ReturnType<typeof sceneFor>): RouteKind => isOccupier(sc.role) || sc.activity === 'carry' ? 'worker' : sc.route ? 'walker' : sc.role === 'merchant' ? 'merchant' : 'social';
export class City {
  houseVariant = 0;
  /** Where the vaulted passages cut through the west housing row (z of each). */
  alleys: number[] = [];
  /** The same on the east row: passages from Salt Row through to the Backwater behind the houses. */
  eastAlleys: number[] = [];
  housingFrontages:Home[]=[]; viewer=new T.Vector3(); lifeTarget=new T.Vector3();
  crowd!: CrowdBatch;
  presentation!: Presentation;
  root = new T.Group(); colliders: Collider[] = []; decks: Deck[] = []; ladders: Ladder[] = []; targets: Target[] = []; properties = new Map<PropertyId, PropertyVisual>();
  infrastructure = new T.Group(); prosperity = new T.Group(); gears: T.Group[] = []; smokeOrigins: T.Vector3[] = []; lamps: T.PointLight[] = [];
  npcs: ReturnType<typeof citizen>[] = []; constructions: { group: T.Group; time: number; duration: number; finish: () => void; workers: ReturnType<typeof citizen>[]; site?: string }[] = [];
  /** World-originated messages (a patrol's warning, an ancient machine waking) for the UI to voice. */
  onEvent: (message: string) => void = () => {};
  /** The street's condition by district, refreshed twice a second from the economy: who is admitted, how hard the curfew bites,
   * and where the Ordinance's people are standing (so civilians near them can keep their voices down). */
  social = new Map<DistrictId, { percent: number; band: Band; enforcement: Enforcement; pressure: number; occupier: number; risk: number; crackdown: boolean; gate: Gate }>(); occupiers: T.Vector3[] = []; private socialClock = -9; now = 0;
  /** The Ordinance's people who are out, and whether each is walking a beat: civilians make room for these. */
  presence: { group: T.Group; moving: boolean }[] = [];
  refreshSocial(time: number) { this.now = time; if (Math.abs(time - this.socialClock) < .5) return; this.socialClock = time; const c = this.economy.state.crackdown, hard = c && c.until > this.economy.state.playtime ? c.district : null;
    for (const d of DISTRICTS) { const percent = this.economy.occupationOf(d.id), band = bandOf(percent), enforcement = this.economy.curfew(d.id), crackdown = hard === d.id && band !== 'liberated';
      this.social.set(d.id, { percent, band, enforcement, pressure: enforcement === 'none' ? Math.min(1, percent / 100 + (crackdown ? .15 : 0)) : 1, occupier: population(band, enforcement, crackdown).occupier, risk: BANDS[band].risk, crackdown, gate: gateState(band, enforcement) }); }
    // One shared picture of where the Ordinance stands and what each of them is doing there: every civilian question reads this, not the whole garrison.
    this.occupiers.length = this.presence.length = 0; this.threats.clear();
    const note = (c: { group: T.Group; archetype: string }, moving: boolean, kind: ThreatKind) => { if (!c.group.visible || !isOccupier(c.archetype)) return; this.occupiers.push(c.group.position); this.presence.push({ group: c.group, moving });
      let t = this.threatOf.get(c.group); if (!t) this.threatOf.set(c.group, t = { at: c.group.position, kind, facing: c.group.rotation }); t.kind = kind; t.stamp = time; this.threats.add(t); };
    this.npcs.forEach((n, i) => { const moving = !!sceneFor(i).route; note(n, moving, moving ? 'patrol' : 'sentry'); });
    const pres = this.presentation; if (pres) { const roles = this.roles ??= new Map(pres.posts.map(q => [q.index, q.role]));
      pres.workers.forEach((w, i) => { const moving = !!w.path || w.kind === 'walk', role = roles.get(i); note(w.person, moving, role === 'inspector' ? 'inspector' : role === 'checkpoint' ? 'checkpoint' : moving ? 'patrol' : 'sentry'); }); } }
  here(x: number, z: number) { return this.social.get(districtAt(x, z))!; }
  /** Is this person out today? High occupation means fewer civilians and more of the Ordinance, never more of everyone. */
  admits(standing: Standing, seed: number, d: DistrictId) { const s = this.social.get(d)!; return admits(standing, seed, s.band, s.enforcement, s.crackdown); }
  present(importance: Importance, standing: Standing, seed: number, d: DistrictId) { return importance === 'essential' || this.admits(standing, seed, d); }
  /** Where the Ordinance's people are, in a coarse grid rebuilt twice a second, and what each of them is doing (walking a beat, posted, inspecting, crewing a gate). */
  threats = new ThreatGrid(7); private threatOf = new WeakMap<object, Threat>(); private roles?: Map<number, PostRole>;
  /** Each civilian's answer to the Ordinance: a sidestep, a pause, a crossing, a conversation gone quiet. Written only by giveRoom. */
  private minds = new WeakMap<object, Mind>();
  private crossOk?: boolean[];
  private mind(c: { phase: number }) { let m = this.minds.get(c); if (!m) this.minds.set(c, m = { ox: 0, oz: 0, vx: 0, vz: 0, tx: 0, tz: 0, turn: 0, turnTo: 0, clock: NaN, rate: 1, rateTo: 1, pace: 1, next: this.now + (c.phase * 7.13 % 1) * .3, last: this.now, seed: (c.phase * 3.71) % 1, act: 'none', start: 0, hold: 0, exit: 0, amp: 0, side: 0, lx: 0, lz: 0, facing: 'route', reactRate: 1, shy: 0, group: newGroup(), indoors: false }); return m; }
  /** A walker's own route clock: it runs at their pace and stops when they stop, so a pause or a crossing never jumps. */
  routeClock(c: { phase: number }, time: number, dt: number) { const m = this.mind(c); if (Number.isNaN(m.clock)) m.clock = time; m.rate += (m.rateTo - m.rate) * Math.min(1, dt * 2.4); m.clock += dt * m.rate; return m.clock; }
  /** May this person's conversation go on? */
  speaks(c: object) { const m = this.minds.get(c); return !m || m.group.mode === 'talk'; }
  /** Under an enforced curfew a walker goes one way, to a door: on the way back they are indoors. The change is made only out of the Steward's sight. */
  private indoors(c: { phase: number; group: T.Group }, index: number, transit: boolean, time: number) { const m = this.mind(c), want = transit && routeLeg(index, Number.isNaN(m.clock) ? time : m.clock) === 'back';
    if (want !== m.indoors && (c.group.position.x - this.viewer.x) ** 2 + (c.group.position.z - this.viewer.z) ** 2 > 24 * 24) m.indoors = want; return m.indoors; }
  /** Someone who has left the street drops whatever they were doing about the Ordinance. */
  private forget(c: object) { const m = this.minds.get(c); if (!m) return; m.cross = undefined; m.act = 'none'; m.threat = undefined; m.ox = m.oz = m.vx = m.vz = m.tx = m.tz = m.turn = m.turnTo = 0; m.rate = m.rateTo = 1; }
  /** People make room for the Ordinance: a step to the side of a walking patrol's line, a wide margin round a post, a wait before an inspector,
   * a crossing to the other kerb, a conversation that stops. Call it after the person has been put where their scene says.
   * Decisions are made three times a second, each person on their own beat; between them the body only eases toward the last answer,
   * so this is the one place a civilian's position is nudged, and it never snaps or flickers. */
  giveRoom(c: Person, dt: number, o: Room = {}) { const p = c.group.position, m = this.mind(c);
    if (!o.staged) c.group.rotation.y -= m.turn; // a static figure is not re-posed each frame: take back last frame's turn first
    if (this.now >= m.next || this.now < m.last) this.decide(c, m, o);
    // Walking pace and a soft start: the offset has a velocity, capped and accelerated, never a jump.
    const cap = m.cross ? 1.25 : 1.4, acc = 3 * dt; let wx = (m.tx - m.ox) * 2.6, wz = (m.tz - m.oz) * 2.6; const l = Math.hypot(wx, wz); if (l > cap) { wx *= cap / l; wz *= cap / l; }
    const ax = wx - m.vx, az = wz - m.vz, al = Math.hypot(ax, az), f = al > acc ? acc / al : 1; m.vx += ax * f; m.vz += az * f; m.ox += m.vx * dt; m.oz += m.vz * dt; p.x += m.ox; p.z += m.oz;
    m.turn += (m.turnTo - m.turn) * Math.min(1, dt * 2.5); c.group.rotation.y += m.turn; }
  private decide(c: Person, m: Mind, o: Room) { const now = this.now, step = Math.min(1, Math.max(0, now - m.last)); m.last = now; m.next = now + .27 + jitter(m.seed, 1) * .12;
    const p = c.group.position, yaw = c.group.rotation.y, s = this.here(p.x, p.z), occupation = s.percent / 100, level = intensity(occupation, s.crackdown, s.enforcement);
    const rs = routeState(s.enforcement, o.walking ? 'walker' : o.merchant ? 'merchant' : o.partner ? 'social' : 'worker', occupation); m.pace = rs.pace;
    const skip = o.with ? this.threatOf.get(o.with) : undefined, near = level > 0 ? this.threats.nearest(p.x, p.z, p.y, 10, skip) : undefined;
    let tx = 0, tz = 0, turn = 0, rate = 1; m.watch = undefined;
    // A conversation under watch: quiet, a little apart, eyes on the patrol; broken up for a while if it keeps being passed.
    if (o.partner) { const pose = groupPose(stepGroup(m.group, { kind: near?.threat.kind ?? null, distance: near?.distance ?? 99, occupation, crackdown: s.crackdown, curfew: s.enforcement, seed: m.seed }, step), m.seed);
      if (pose.separation) { const ax = p.x - o.partner.x, az = p.z - o.partner.z, l = Math.hypot(ax, az) || 1; tx += ax / l * pose.separation; tz += az / l * pose.separation; if (pose.turnAway) turn = clampTurn(angle(Math.atan2(ax, az) - yaw), m.turnTo) * .8; }
      if (pose.watch && near) m.watch = near.threat.at; }
    else if (m.group.mode !== 'talk') Object.assign(m.group, newGroup()); // a companion gone home leaves nothing to resume
    // Crossing the street: over to the far kerb, wait there while the patrol goes by, then back and on. Carts are let past first.
    if (m.cross && this.crossing(m, p, yaw)) return;
    // Hysteresis: a reaction ends only once its man is past the wider exit radius (or gone) and it has lasted its least time.
    if (m.act !== 'none') { const t = m.threat!, gone = t.stamp !== this.socialClock, d = Math.hypot(t.at.x - p.x, t.at.z - p.z); if ((gone || d > m.exit) && now >= m.start + m.hold) { m.act = 'none'; m.threat = undefined; } }
    if (m.act === 'none' && near) { const t = near.threat, coming = approaching(t, p.x, p.z), cross = !!o.walking && !!o.moving && coming && Math.abs(t.at.x - p.x) < 2.5 && now >= m.shy && this.canCross(p.x, p.z, t);
      const r = respond({ trait: c.manner.trait, kind: t.kind, distance: near.distance, coming, walking: !!o.walking && !!o.moving, occupation, crackdown: s.crackdown, curfew: s.enforcement, seed: m.seed, canCross: cross });
      if (r.reaction === 'crossStreet') { m.cross = { c: crossingAt(p.x, p.z)!, phase: 'go', at: now + r.delay, threat: t }; m.act = 'none'; if (this.crossing(m, p, yaw)) return; }
      else if (r.reaction !== 'none') Object.assign(m, { act: r.reaction, threat: t, start: now + r.delay, hold: r.hold, exit: r.exit, amp: r.amplitude, facing: r.face, reactRate: r.rate, side: 0 }); }
    if (m.act !== 'none' && now >= m.start) { const t = m.threat!, dx = p.x - t.at.x, dz = p.z - t.at.z, d = Math.hypot(dx, dz) || .01, prox = Math.max(.45, Math.min(1, 1.6 * (1 - d / m.exit))), holding = now < m.start + m.hold;
      // A walking beat is passed to one side of its line. The side is chosen once, in the street's terms, so it holds when the patrol turns round.
      if (t.kind === 'patrol' && t.facing) { const px = Math.cos(t.facing.y), pz = -Math.sin(t.facing.y); if (!m.side) { const off = dx * px + dz * pz; m.side = Math.sign(off) || (jitter(m.seed, 4) < .5 ? -1 : 1);
          // Someone all but on the patrol's line may go either way: to the wall, if the road side is a cart lane or no place to stand.
          if (Math.abs(off) < .7 && this.unfit(p.x + px * m.side * m.amp, p.z + pz * m.side * m.amp, p.y) && !this.unfit(p.x - px * m.side * m.amp, p.z - pz * m.side * m.amp, p.y)) m.side = -m.side;
          m.lx = px * m.side; m.lz = pz * m.side; }
        const side = Math.sign(px * m.lx + pz * m.lz) || 1; tx += px * side * m.amp * prox; tz += pz * side * m.amp * prox; }
      else { tx += dx / d * m.amp * prox; tz += dz / d * m.amp * prox; }
      rate = holding ? m.reactRate : Math.max(m.reactRate, .75);
      if (m.facing !== 'route' && (holding || !o.walking)) { const away = m.facing === 'away'; turn = clampTurn(angle(Math.atan2(away ? dx : -dx, away ? dz : -dz) - yaw), m.turnTo) * (away ? .8 : .5); }
      if (m.facing === 'toward') m.watch ??= t.at; }
    else if (o.walking && o.moving && rs.width > 0) { // A free street is used kerb to kerb: walkers drift out toward the middle and back.
      const centre = Math.abs(p.x) < 20 ? 0 : p.x < 0 ? -34 : 34, dir = Math.sign(centre - p.x); tx += dir * rs.width * 1.1 * (.5 + .5 * Math.sin(m.clock * .05 + m.seed * 6)); }
    else if (!o.walking && o.merchant && rs.spill > 0) { tx += Math.sin(yaw) * rs.spill; tz += Math.cos(yaw) * rs.spill; } // and trade comes out of the doorway
    // Only a target that is somewhere a body can stand: try it, then half, then a quarter of it, else stay put
    // (never the other way: that would be toward the patrol's line).
    // A walker is tested a metre on as well: that is where they will be by the time a step taken now has been taken back.
    const on = o.walking && o.moving ? 1 : 0, hx = Math.sin(yaw) * on, hz = Math.cos(yaw) * on, bad = () => this.unfit(p.x + tx, p.z + tz, p.y) || (on > 0 && this.unfit(p.x + tx + hx, p.z + tz + hz, p.y));
    for (let k = 0; k < 3 && (tx || tz) && bad(); k++) { tx /= 2; tz /= 2; if (k === 2 && bad()) tx = tz = 0; }
    m.tx = tx; m.tz = tz; m.turnTo = turn; m.rateTo = rate * m.pace; }
  /** No place to step aside into: a wall or a prop, or one of the Great Main's two cart lanes (which swing out at the checkpoint: the carts' own line is asked). */
  private unfit(x: number, z: number, y: number) { return (z > ROAD.north - 4 && z < ROAD.south + 4 && y < 1 && Math.abs(Math.abs(x) - laneX(z)) < 1.3) || this.blocked(x, z, y - .16); }
  /** Is there a trusted crossing here, and is the far kerb free of the Ordinance? Each crossing's ground is sampled once, the first time it is asked about. */
  private canCross(x: number, z: number, from: Threat) { const c = crossingAt(x, z); if (!c) return false;
    this.crossOk ??= CROSSINGS.map(k => crossingSamples(k).every(([sx, sz]) => !this.blocked(sx, sz, .18)));
    if (!this.crossOk[CROSSINGS.indexOf(c)]) return false; const other = this.threats.nearest(c.to, z, .18, 4, from); return !other; }
  /** Holds short of a cart lane while a cart is coming down it (a lane already stepped into is finished). */
  private cartIn(from: number, to: number, z: number, lanes: number[]) { const dir = Math.sign(to - from); for (const lane of lanes) { const ahead = (lane - from) * dir; if (ahead < 1.5 || ahead > 3.2 || (lane - to) * dir > 0) continue; if (!this.laneClear(lane, z)) return true; } return false; }
  /** Is the cart lane at `x` clear for someone to step across at `z`? A cart on the move is given eight metres either way;
   * one standing (held at the boom, parked for the night) only its own length, so it never keeps anyone at the kerb till morning. */
  laneClear(x: number, z: number) { const t = this.traffic; return !t.carts.some((cart, i) => cart.visible && Math.abs(cart.position.x - x) < 1.5 && Math.abs(cart.position.z - z) < (t.state[i].v > .05 ? 8 : 2)); }
  /** One decision of a crossing in progress. Returns false once it is over and the walker is back on their route.
   * Still on their own kerb, they give it up if the patrol has gone by or a cart has kept them there four seconds. Once in the road
   * they only go forward: to the far kerb, or along the strip between the lanes until the lane ahead is clear. Nobody stands in a lane. */
  private crossing(m: Mind, p: T.Vector3, yaw: number) { const x = m.cross!, t = x.threat, c = x.c, now = this.now, at = p.x + m.ox; let goal = x.phase === 'back' ? 0 : c.to - p.x, turn = 0;
    const gone = t.stamp !== this.socialClock || passed(t, at, p.z + m.oz), kerb = !c.lanes.length || (c.lanes[0] - at) * Math.sign(c.to - p.x) >= 1.5, stuck = x.held !== undefined && now - x.held > 4;
    if (x.phase === 'go') { if (kerb && (gone || stuck)) { x.phase = 'back'; if (stuck) m.shy = now + 20; } else if (now < x.at) goal = 0; else if (Math.abs(goal - m.ox) < .2) { x.phase = 'wait'; x.at = Infinity; } }
    if (x.phase === 'wait') { if (x.at === Infinity && gone) x.at = now + 1 + jitter(m.seed, 10) * 2.5; if (now >= x.at) x.phase = 'back'; else { m.watch = t.at; turn = clampTurn(angle(Math.atan2(t.at.x - at, t.at.z - p.z) - yaw), m.turnTo) * .5; } }
    if (x.phase === 'back') { goal = 0; if (Math.abs(m.ox) < .25) { m.cross = undefined; m.watch = undefined; return false; } }
    if (goal !== m.ox && this.cartIn(at, p.x + goal, p.z, c.lanes)) { goal = m.ox + m.vx * .2; x.held ??= now; } else x.held = undefined; // wait at the lane's edge for the cart: pull up in a stride, not back onto a mark
    if (x.phase !== 'wait' && Math.abs(goal - m.ox) > .2) turn = clampTurn(angle(Math.atan2(Math.sign(goal - m.ox), 0) - yaw), m.turnTo) * .9;
    m.tx = goal; m.tz = 0; m.turnTo = turn; m.rateTo = (x.phase === 'back' ? .3 : stuck && !kerb ? .5 : 0) * m.pace; return true; }
  /** The Ordinance has caught the Steward at something. One place decides what that costs. */
  incident(kind: Incident, x: number, z: number) { const o = this.economy.caught(kind, districtAt(x, z)); this.socialClock = -9; this.onEvent(o.message);
    // Everyone near enough to see it draws back for a moment. Nobody helps.
    const flinch = (c: { group: T.Group; archetype: string; tone?: { tone: Tone; until: number } }) => { const q = c.group.position; if (c.group.visible && !isOccupier(c.archetype) && (q.x - x) ** 2 + (q.z - z) ** 2 < 90) c.tone = { tone: 'fearful', until: this.now + 3.5 }; };
    for (const n of this.npcs) flinch(n); for (const w of this.presentation.workers) flinch(w.person); return o; }
  hearth?: T.PointLight; edge!: TerraEdge;
  gateMeshes = new Map<string, T.Group>(); flags: T.Mesh[] = []; airship = new T.Group(); tram = new T.Group();
  clockMechanism?: T.Group; lantern = new T.MeshStandardMaterial({ color: P.warm.lamp, emissive: P.warm.lamp, emissiveIntensity: .9 }); clockHands: T.Mesh[] = []; stage = -1; raining = false; finchLift?: T.Group;
  constructor(public scene: T.Scene, public economy: Economy) { scene.add(this.root); this.root.add(this.infrastructure, this.prosperity); this.buildGround(); this.buildBlocks(); this.buildLandmarks(); this.buildSignatureMachinery(); this.buildDetails(); this.buildBackground(); this.edge = new TerraEdge(this); this.createPopulation(); this.refreshSocial(0); this.presentation = new Presentation(this);
    setSocialField((x, z, self) => { const s = this.here(x, z), m = this.minds.get(self), near = !isOccupier(self.archetype) && !!this.threats.nearest(x, z, self.group.position.y, 7); return { pressure: s.pressure, watched: near || (!!m && m.group.mode !== 'talk'), threat: m?.watch }; }); this.siteTargets(); for(const x of [-7.9,7.9]) for(const z of (x>0?[-22,-28,-34]:[-26,-32,-38])) this.collider(x,z,2.3,3.6,3.5); this.sync(true); this.crowd = new CrowdBatch([...this.npcs.map(n=>n.group),...this.presentation.workers.map(w=>w.person.group)],this.root); }
  /** Collider from a footprint in a (possibly rotated) building group's local frame. */
  localCollider(g: T.Object3D, x: number, z: number, w: number, d: number, height = 30) { g.updateWorldMatrix(true, false); const p = g.localToWorld(new T.Vector3(x, 0, z)); const turned = Math.abs(Math.sin(g.getWorldQuaternion(new T.Quaternion()).angleTo(new T.Quaternion()))) > .5; this.collider(p.x, p.z, turned ? d : w, turned ? w : d, height); }
  /** `open` lets state-driven props (an Ordinance booth, a furnace) stop blocking once they are gone. */
  collider(x: number, z: number, w: number, d: number, height = 30, gate?: string, open?: () => boolean, base?: number) { this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height, base, gate, open }); }
  /** A building whose roof can be stood on stops blocking at its roof: lower the full-height collider over this point. */
  roofAt(x: number, z: number, height: number) { for (const c of this.colliders) if (c.height >= 30 && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) c.height = height; }
  deck(minX: number, maxX: number, minZ: number, maxZ: number, y: number, y1?: number, axis?: 'x' | 'z') { this.decks.push({ minX, maxX, minZ, maxZ, y, y1, axis }); }
  /** The deck under these feet, if any: the highest one they could be standing on. */
  private deckAt(x: number, z: number, feet: number) { let best = -Infinity; for (const d of this.decks) if (x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ) { const h = deckHeight(d, x, z); if (h <= feet + .4 && h > best) best = h; } return best; }
  target(g: T.Group, id: string, kind: Target['kind'], label: string, x: number, y: number, z: number) { const board = box(g, x, y, z, 1.05, .8, .18, mats.brass); const panel = sign(g, kind === 'property' ? 'LEDGER' : label, kind === 'property' ? 'Accounts & improvements' : 'Terra • Locke', x, y, z + .101, .96, .62); box(g, x, y - .85, z, .12, 1.1, .12, mats.iron); board.updateWorldMatrix(true, false); const pos = board.getWorldPosition(new T.Vector3()); this.targets.push({ object: board, id, kind, label, position: pos }); panel.userData.interaction = id; }
  buildGround() { const g = new T.Group(); this.root.add(g); // The ground stops at the cleft: the Lowworks canal is a chasm open to the sky beneath.
    box(g, (-79 + CHASM.x0) / 2, -.5, -5.5, 79 + CHASM.x0, 1, 179, mats.dirt); box(g, (CHASM.x1 + 79) / 2, -.5, -5.5, 79 - CHASM.x1, 1, 179, mats.dirt); box(g, (CHASM.x0 + CHASM.x1) / 2, -.5, (CHASM.z1 + 84) / 2, CHASM.x1 - CHASM.x0, 1, 84 - CHASM.z1, mats.dirt); box(g, 0, .018, 9, 12.6, .06, 139, mats.road);
    for (const x of [-9.2, 9.2]) { box(g, x, .065, 10, 5.6, .13, 139, mats.stone); for (let z = -59; z < 74; z += 3) box(g, x + (x < 0 ? 2.85 : -2.85), .1, z, .17, .2, 2.94, mats.warmStone); }
    for (const z of [27, 1, -31, -57]) box(g, 0, .025, z, 78, .06, 7, mats.road);
    for (const x of [-34, 34]) box(g, x, .02, 6, 7, .06, 125, mats.road);
    box(g, 0, .04, -44, 28, .1, 23, mats.road);
    // The cleft's kerb and rail. The rail is left open at z 32..36 for the Chain Bridge.
    for (const x of [40, 49]) { box(g, x, .25, -15.5, 1, .5, 159, mats.stone); for (let z = -92; z < 64; z += 4) { cyl(g, x, 1, z, .06, 1.4); if ((z < -12 || z > 0) && z !== 32) box(g, x, 1.5, z + 2, .06, .08, 4); } }
    box(g, 44.5, .25, CHASM.z1, 8, .5, 1, mats.stone);
    box(g, 44.5, .22, -6, 11, .45, 8, mats.stone); for (const z of [-9.2, -2.8]) { box(g, 44.5, -.3, z, 9, .5, .3, mats.iron); for (const s of [-1, 1]) beam(g, new T.Vector3(44.5 + s * 4.2, -2.2, z), new T.Vector3(44.5 + s * 1, -.5, z), .14, mats.iron); } box(g, 44.5, -.62, -6, 2.4, .24, 6.6, mats.iron); for (const z of [-10, -2]) { for (let x = 39; x < 51; x += 1.5) box(g, x, .9, z, .12, 1.4, .12, mats.brass); box(g, 44.5, 1.5, z, 11, .12, .12, mats.brass); }
    // Side alley and physically traversable industrial ramp up to a high overlook.
    const ramp = box(g, -34, 3.2, -40, 4.6, .3, 23, mats.wood); ramp.rotation.x = Math.atan(6 / 22); box(g, -34, 6.2, -56, 7, .4, 11, mats.wood);
    for (const x of [-36.2, -31.8]) { beam(g, new T.Vector3(x, 1.3, -29), new T.Vector3(x, 7.3, -51), .065, mats.brass); box(g, x, 7.2, -56, .08, .08, 10, mats.iron); for (let z = -30; z > -61; z -= 4) { const h = z < -51 ? 6.2 : (-z - 29) / 22 * 6 + .2; box(g, x, h + .65, z, .1, 1.3, .1); } }
    const puddleMaterial=new T.MeshStandardMaterial({color:'#6b8e8e',metalness:.2,roughness:.55,transparent:true,opacity:.24});
    for(const [x,z,s] of [[-4.8,53,1.1],[4.3,34,.8],[-3.8,8,1.4],[4.7,-10,.9],[-4.1,-26,.8]]){const puddle=new T.Mesh(new T.CircleGeometry(s,10),puddleMaterial);puddle.rotation.x=-Math.PI/2;puddle.scale.x=1.9;puddle.position.set(x,.065,z);g.add(puddle);}
    for(const x of [-2.15,2.15]){box(g,x,.075,9,.24,.035,139,mats.dark);box(g,x,.099,9,.07,.014,139,mats.rust);}
    bake(g);
  }
  facade(g: T.Group, width: number, height: number, depth: number, type: number, clean = false, business = false) { const composed = business && type !== 4;
    if (composed) businessBody(g, type); else box(g, 0, height / 2, 0, width, height, depth, clean ? mats.warmStone : type>=6 ? housingPaint[type%3] : business ? facadePaints[type] : type % 2 ? mats.darkBrick : mats.brick); box(g, 0, .4, 0, width + .4, .8, depth + .4, mats.stone);
    if (!composed) { for (let y = 3.8; y < height; y += 3.5) box(g, 0, y, depth / 2 + .1, width + .25, .18, .3, mats.stone);
    for (const x of [-width / 2 + .25, width / 2 - .25]) { box(g, x, height / 2, depth / 2 + .15, .45, height, .4, mats.stone);  } }
    // Facade-level window rhythm: one family per building, lit rooms follow a pattern.
    const family = clean ? 'arch' : (['grid', 'civic', 'grid', 'grid', 'rect', 'civic'] as const)[type] ?? 'arch';
    if((type<6||clean)&&!composed) { let col = 0; for (let x = -width / 2 + 2; x < width / 2 - 1; x += 3, col++) { let row = 0; for (let y = 4.5; y < height - 1.7; y += 3.5, row++) windowUnit(g, x, y, depth / 2 + .03, (col * 2 + row + type) % 5 !== 0, family === 'grid' ? 1.5 : 1.35, family === 'grid' ? 2.4 : 2.3, family); } }
    // Doorway: stepped threshold, projecting jambs and a capped frame.
    arch(g, 0, .5, depth / 2 + .06, 2.5, 3.2, mats.stone); arch(g, 0, .5, depth / 2 + .08, 2.15, 3, mats.dark); box(g, 0, 1.7, depth / 2 + .1, 1.65, 2.3, .08, mats.wood); sphere(g, .55, 1.7, depth / 2 + .22, .07);
    for (const dx of [-1.45, 1.45]) { box(g, dx, 1.55, depth / 2 + .2, .34, 2.9, .42, mats.stone); box(g, dx, 3.05, depth / 2 + .24, .46, .16, .5, mats.stone); }
    box(g, 0, .08, depth / 2 + .38, 2.9, .16, .66, mats.stone);
    if (business && !clean) shopfront(g, type);
    else if(type<6||clean) for (const x of [-width / 2 + 2.7, width / 2 - 2.7]) windowUnit(g, x, .9, depth / 2 + .05, true, 2.1, 2.6);
    // Cornice brackets: the roofline catches a row of small shadows.
    if (!composed) { for (let x = -width / 2 + .9; x < width / 2 - .5; x += 1.55) box(g, x, height - .32, depth / 2 + .22, .2, .42, .44, mats.stone);
    box(g,0,height,0,width+.5,.25,depth+.5,mats.stone); }
    // Steep gables, tall chimneys and a corner turret give the old town its skyline.
    if(!business){const pitch=pitchOf(width,type),mat=[mats.roof,mats.rust,mats.teal][type%3];roof(g,0,height+.1,0,width+.9,pitch,depth+.6,mat);
      box(g,width*.3,height+pitch*.7,-depth*.2,1.1,pitch*1.1,1.1,mats.brick);box(g,width*.3,height+pitch*1.28,-depth*.2,1.35,.3,1.35,mats.stone);
      if(type%2===0){const tx=-width/2+.9,tz=depth/2-.9;cyl(g,tx,height+.4,tz,1.5,3,mats.warmStone);const cone=new T.Mesh(new T.ConeGeometry(1.9,4.2,8),mat);cone.position.set(tx,height+4,tz);g.add(cone);sphere(g,tx,height+6.2,tz,.22,mats.brass);}}
    if (type >= 6 && !clean) this.house(g, width, height, depth, type, pitchOf(width, type));
    // Soot gathers at the foot of every front and runs from the cornice; prosperity washes some of it away.
    grimeSkirt(g, 0, depth / 2 + .03, width, 1.9, type * 7.3 + width); paintedWear(g, 0, depth / 2 + .02, width, composed ? 8 : height, type * 3.1 + width * 1.7); if (!composed) rustStreak(g, width / 2 - .65, height * .62, depth / 2 + .5, 2.2); if (!business) { sootStreak(g, -width * .28, height - .3, depth / 2 + .04, 1.2, 3.4); sootStreak(g, width * .36, height - .3, depth / 2 + .04, .8, 2.2); }
    if (composed) return;
    facadeDetail(g, width, height, depth, type);
    const pipe = cyl(g, width / 2 - .65, height / 2, depth / 2 + .4, .1, height, mats.copper); for (let y = 1; y < height; y += 2) { const ring = torus(g, pipe.position.x, y, pipe.position.z, .14, .035, mats.iron); ring.rotation.x = Math.PI / 2; }
  }
  /** One authored idea per house: an oriel, a jettied timber top, an iron stair or a
   * rooftop cistern. Every door gets a stoop people can sit on. */
  /** Residential families change the primary mass, not just the trim:
   * 0 tenement (taller narrow unit with an overhanging attic and a rear shop),
   * 1 rowhouse (jetty, side dormers, chimney stack), 2 merchant house (corbelled
   * corner turret, outside stair), 3 workshop house (sawtooth rear shed, cistern).
   * All share an older stone ground storey: Terra was built in layers. */
  house(g: T.Group, w: number, h: number, d: number, type: number, pitch: number) {
    const v = this.houseVariant++ % 4, f = d / 2, paint = housingPaint[type % 3], alt = housingPaint[(type + 1) % 3], roofMat = [mats.roof, mats.rust, mats.teal][(type + 1) % 3];
    this.localCollider(g, 0, f + .65, 2.8, 1.3, .45);
    if (v === 2) this.localCollider(g, w * .25, f + .6, w * .4, 1.2, 5);
    box(g, 0, 1.85, 0, w + .08, 3.7, d + .08, mats.stone); box(g, 0, 3.76, 0, w + .3, .16, d + .3, mats.warmStone);
    box(g, 0, .225, f + .45, 2.8, .45, .9, mats.stone); box(g, 0, .11, f + 1.05, 2.8, .22, .5, mats.stone);
    if (v === 0) {
      // Oriel on the left, a taller narrow unit on the right whose attic overhangs the street.
      const x = -w * .3, top = h - 1.2; box(g, x, (4 + top) / 2, f + .45, 2.5, top - 4, .9, paint); box(g, x, top + .12, f + .5, 2.8, .24, 1.1, mats.stone);
      const corbel = new T.Mesh(new T.ConeGeometry(1.3, 1.1, 4), mats.stone); corbel.rotation.set(Math.PI, Math.PI / 4, 0); corbel.scale.set(1, 1, .45); corbel.position.set(x, 3.45, f + .45); g.add(corbel);
      for (let y = 4.6; y < top - 2; y += 3.5) windowUnit(g, x, y, f + .9, true, 1.5, 2.1, 'rect');
      const ux = w / 2 - 2.4, uw = 4.8; box(g, ux, h + 2.1, 0, uw, 4.2, d, alt); windowUnit(g, ux, h + .7, f + .02, true, 1.2, 1.9, 'rect');
      box(g, ux, h + 5.5, 0, uw + .8, 2.7, d + 1.2, mats.wood); for (const dx of [-1.2, 1.2]) windowUnit(g, ux + dx, h + 4.6, f + .62, true, .9, 1.5, 'rect');
      for (const dx of [-2.4, 0, 2.4]) { const k = box(g, ux + dx, h + 3.9, f + .35, .2, .6, .6, mats.wood); k.rotation.x = .5; }
      roof(g, ux, h + 6.85, 0, uw + 1.4, 3.6, d + 1.6, roofMat);
      this.localCollider(g, -w * .12, -f - 2.2, w * .5, 4.4, 4);
      box(g, -w * .12, 2, -f - 2.2, w * .5, 4, 4.4, mats.darkBrick); const lean = box(g, -w * .12, 4.3, -f - 2.2, w * .5 + .4, .2, 4.9, mats.rust); lean.rotation.x = -.35; box(g, -w * .32, 5.5, -f - 3.6, .8, 3.5, .8, mats.brick);
    }
    if (v === 1) {
      const y0 = h - 3.4; box(g, 0, y0 + 1.7, f + .38, w + .3, 3.4, .76, mats.wood); box(g, 0, y0 + .05, f + .4, w + .5, .14, .9, mats.stone);
      for (let x = -w / 2 + .6; x < w / 2; x += 1.8) box(g, x, y0 - .3, f + .25, .18, .55, .5, mats.wood);
      for (const x of [-w * .29, 0, w * .29]) windowUnit(g, x, y0 + .6, f + .77, true, 1.3, 1.9, 'rect');
      // Side dormers ride the slopes; a stack of three flues crowns the ridge.
      for (const side of [-1, 1]) for (const z of [-2.2, 1.6]) { const x = side * w * .24, y = h + pitch * .5; box(g, x, y, z, 1.9, 1.8, 1.6, paint); const cap = new T.Mesh(new T.ConeGeometry(1.45, 1.1, 4), roofMat); cap.position.set(x, y + 1.45, z); cap.rotation.y = Math.PI / 4; g.add(cap);
        const pane = new T.Mesh(new T.PlaneGeometry(.8, 1), windowGlass[(z > 0 ? 0 : 1)]); pane.position.set(x + side * .96, y, z); pane.rotation.y = side * Math.PI / 2; g.add(pane); }
      for (const dz of [-.7, 0, .7]) box(g, 0, h + pitch + .6, -f + 1.5 + dz, .6, 2.2 + Math.abs(dz), .6, mats.brick);
    }
    if (v === 2) {
      const x1 = w * .42; for (let i = 0; i < 12; i++) box(g, 1.7 + i * (x1 - 2.5) / 12, .17 + i * .32, f + .6, .42, .08, 1, mats.iron);
      box(g, x1 - .2, 3.95, f + .6, 1.5, .12, 1.2, mats.iron); railing(g, x1 - .2, 3.95, f + 1.18, 1.4);
      beam(g, new T.Vector3(1.5, 0, f + 1.1), new T.Vector3(x1 - .9, 3.95, f + 1.1), .05, mats.iron); beam(g, new T.Vector3(1.5, 1, f + 1.1), new T.Vector3(x1 - .9, 4.95, f + 1.1), .03, mats.brass);
      box(g, x1 - .2, 5.05, f + .06, 1.05, 2.1, .1, mats.wood); box(g, x1 - .2, 6.2, f + .1, 1.3, .16, .2, mats.stone);
      // A corbelled corner turret, cantilevered from the second storey.
      const tx = -w / 2 + 1, tz = f - .7, top = h + 2.4; cyl(g, tx, (4.4 + top) / 2, tz, 1.55, top - 4.4, alt); const c = new T.Mesh(new T.ConeGeometry(1.55, 1.6, 12), mats.stone); c.rotation.x = Math.PI; c.position.set(tx, 3.6, tz); g.add(c);
      for (const y of [4.5, top]) cyl(g, tx, y, tz, 1.62, .2, mats.stone); for (let y = 5.2; y < top - 1.6; y += 3.2) windowUnit(g, tx, y, tz + 1.5, true, .8, 1.6, 'rect');
      const cone = new T.Mesh(new T.ConeGeometry(1.95, 4.4, 12), roofMat); cone.position.set(tx, top + 2.2, tz); g.add(cone); sphere(g, tx, top + 4.6, tz, .18, mats.brass);
    }
    if (v === 3) {
      const x = -w * .22, y = h + pitch * .5; for (const dx of [-.9, .9]) for (const dz of [-.9, .9]) box(g, x + dx, y - 1, -1.5 + dz, .14, 2.2, .14, mats.iron);
      cyl(g, x, y + 1.3, -1.5, 1.35, 2.4, mats.copper); for (const yy of [.4, 2.2]) cyl(g, x, y + yy, -1.5, 1.4, .12, mats.iron); const lid = new T.Mesh(new T.ConeGeometry(1.45, .7, 10), mats.teal); lid.position.set(x, y + 2.85, -1.5); g.add(lid);
      beam(g, new T.Vector3(x + 1.35, y + .5, -1.5), new T.Vector3(w / 2 + .15, y - 1, -1.5), .07, mats.copper); beam(g, new T.Vector3(w / 2 + .15, y - 1, -1.5), new T.Vector3(w / 2 + .15, 1, -1.5), .07, mats.copper);
      // Sawtooth workshop behind the house; its glazed north faces light the benches.
      const sw = w * .8, z0 = -f - 3.2; box(g, 0, 2.2, z0, sw, 4.4, 6.4, mats.darkBrick); this.localCollider(g, 0, z0, sw, 6.4, 5);
      const tooth = new T.Shape(); tooth.moveTo(0, 0); tooth.lineTo(2.1, 0); tooth.lineTo(0, 1.8); tooth.closePath(); const tg = new T.ExtrudeGeometry(tooth, { depth: sw, bevelEnabled: false });
      for (let i = 0; i < 3; i++) { const t = new T.Mesh(tg, mats.rust); t.rotation.y = -Math.PI / 2; t.position.set(sw / 2, 4.4, z0 - 3.2 + i * 2.13); g.add(t); const glass = new T.Mesh(new T.PlaneGeometry(sw - .2, 1.6), windowGlass[2]); glass.position.set(0, 5.2, z0 - 3.19 + i * 2.13); glass.rotation.y = Math.PI; g.add(glass); }
      box(g, sw / 2 - .6, (h + pitch) / 2 + 2, z0 - 2.5, 1, h + pitch + 4, 1, mats.brick); box(g, sw / 2 - .6, h + pitch + 4.1, z0 - 2.5, 1.3, .3, 1.3, mats.stone);
    }
  }
  buildBlocks() {
    for (const [index, p] of PROPERTIES.entries()) { const root = new T.Group(); root.position.set(p.x, .18, p.z); root.rotation.y = p.rotation; this.root.add(root); const building = new T.Group(); root.add(building); const height = businessHeights[index]; this.facade(building, 17, height, 11, index, false, true); if (index === 4) businessCrown(building,index,height);if(index===3)building.traverse(o=>{if(o instanceof T.Mesh){if(o.material===mats.stone||o.material===mats.warmStone)o.material=artMats.fadedPaint;}}); const [bx, by, bw, bh] = ([[-2, 4.1, 9.5, 1.3], [0, 4.05, 7.5, 1.1], [0, 4.5, 11, 1.1], [0, 4.1, 11, 1.3], [0, 4.1, 13, 1.45], [0, 3.6, 10, 1]] as const)[index]; const board = sign(building, p.name, p.kind + ' • EST. 1841', bx, by, 5.9, bw, bh);
      // Awnings differ by trade: patched salvage tin, none on the civic works, a slim Finch glass canopy, the tavern's wine canopy.
      if(index===4||index===5) canopy(building,0,3.05,6.6,13,2.2,index===4?artMats.wine:mats.teal);
      else if(index===0){const awning=box(building,-2.2,3.2,6.6,8.6,.10,2.2,mats.rust);awning.rotation.x=.18;box(building,-2.2,2.96,7.6,8.6,.22,.06,mats.rust);for(const x of [-6.4,1.9])cyl(building,x,1.6,7.4,.045,3.2);}
      else if(index===2){box(building,0,3.95,6.4,14.4,.06,1.8,mats.teal);for(const x of [-7,-3.5,0,3.5,7])beam(building,new T.Vector3(x,3.95,7.25),new T.Vector3(x,4.9,5.6),.035,mats.brass);}
      if(index===0)crate(building,-6.2,0,6.5);if(index===4)barrel(building,5.7,0,6.5);
      const flue = [[7, 14.6, -3.2], [5.5, 21.4, -3.4], null, [5, 26.6, -3], null, null][index]; if (flue) { root.updateWorldMatrix(true, true); this.smokeOrigins.push(root.localToWorld(new T.Vector3(flue[0], flue[1], flue[2]))); }
      bake(building); this.collider(p.x, p.z, 11.3, 17.3);
      if (index === 2) { const lift = new T.Group(); lift.position.set(0, 14.4, -.62); root.add(lift); box(lift, 0, .7, 0, 1.2, .08, .8, mats.iron); box(lift, 0, 1.55, 0, 1.25, .12, .85, mats.brass); for (const x of [-.58, .58]) box(lift, x, 1.1, 0, .06, 1.4, .8, mats.iron); box(lift, 0, 1.1, -.38, 1.1, 1.3, .04, mats.teal); sphere(lift, 0, 1.4, 0, .1, mats.glow); bake(lift); this.finchLift = lift; }
      const machine = new T.Group(); machine.position.set(-4.5, 0, 7); root.add(machine); box(machine, 0, .22, 0, 2.5, .4, 1.4, mats.stone); cyl(machine, -.5, 1, 0, .53, 1.45, mats.copper); sphere(machine, -.5, 1.73, 0, .53, mats.copper).scale.y = .4; const gearObj = gear(machine, .5, 1.2, .58, .62); this.gears.push(gearObj); const piston = box(machine, .7, 1, -.3, .25, .8, .25, mats.brass); cyl(machine, .7, .65, -.3, .27, .7, mats.iron); torus(machine, -.5, 1.4, .51, .19, .04); sign(machine, 'PSI', '12', -.5, 1.4, .56, .3, .27);
      const additions = new T.Group(); root.add(additions); this.target(root, p.id, 'property', p.name, 3, 1.65, 7.5); if(index>=3) machine.visible=false; this.properties.set(p.id, { root, building, additions, machine, gear: gearObj, piston, level: -1, sign: board });
    }
    const g = new T.Group(); this.root.add(g);
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) { const b = new T.Group(); b.position.set(side * 48, 0, 50 - i * 23); b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; if (side > 0) b.position.x = 68; const width=14+random()*3,height=16+random()*8;this.facade(b,width,height,10,i+6);this.housingFrontages.push({x:side<0?-42.95:62.95,z:b.position.z,width,height,family:(i+6)%3,yaw:b.rotation.y}); g.add(b); this.collider(b.position.x, b.position.z, 10, 17); }
    // Infill: narrow set-back houses close every gap, each with a vaulted passage into
    // a shallow service court. The lanes become continuous urban fabric.
    for (const side of [-1, 1]) { const row = this.housingFrontages.filter(h => (side < 0 ? h.x < -40 : h.x > 60)).sort((a, b) => b.z - a.z);
      for (let i = 0; i < row.length - 1; i++) { const a = row[i], b = row[i + 1], z1 = a.z - a.width / 2, z2 = b.z + b.width / 2, gap = z1 - z2; if (gap < 3) continue;
        const fill = new T.Group(); fill.position.set(side < 0 ? -47.5 : 67.5, 0, (z1 + z2) / 2); fill.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(fill);
        const w = gap + .1, h = 9 + (i % 3) * 2.2, d = 9, f = d / 2, paint = housingPaint[(i + 2) % 3];
        // Every other passage runs right through, under the house: to the Weatherside in the west, to the Backwater in the east.
        const through = side < 0 ? i % 2 === 0 : i % 2 === 1; if (through) (side < 0 ? this.alleys : this.eastAlleys).push((z1 + z2) / 2);
        box(fill, 0, (4.2 + h) / 2, 0, w, h - 4.2, d, paint); for (const x of [-w / 2 + .5, w / 2 - .5]) box(fill, x, 2.1, 0, 1, 4.2, d, mats.stone);
        box(fill, 0, 4.1, 0, w + .1, .3, d + .1, mats.warmStone);
        const face = new T.Shape(); face.moveTo(-w / 2 + 1, 0); face.lineTo(w / 2 - 1, 0); face.lineTo(w / 2 - 1, 4.2); face.lineTo(-w / 2 + 1, 4.2); face.closePath();
        const open = new T.Path(); open.moveTo(-w / 2 + 1.05, 0); open.lineTo(-w / 2 + 1.05, 2.7); open.quadraticCurveTo(0, 4.5, w / 2 - 1.05, 2.7); open.lineTo(w / 2 - 1.05, 0); open.closePath(); face.holes.push(open);
        const spandrel = new T.Mesh(new T.ExtrudeGeometry(face, { depth: 2.6, bevelEnabled: false, curveSegments: 8 }), mats.stone); spandrel.position.z = f - 2.6; fill.add(spandrel);
        if (through) { box(fill, 0, 3.75, -f + .2, w - 2, .9, .4, mats.stone); box(fill, 0, .03, 0, w - 2, .06, d + 3, mats.road); for (const z of [-2.4, 1.2]) box(fill, 0, 4.05, z, w - 2, .3, .5, mats.wood); sphere(fill, 0, 3.7, -.6, .13, mats.glow); }
        else { box(fill, 0, 2.1, -1.6, w - 2, 4.2, .2, mats.warmStone); box(fill, 0, 1.1, -1.45, 1.1, 2.2, .1, mats.wood); sphere(fill, 0, 2.7, -1.3, .12, mats.glow); }
        box(fill, 0, h + .5, 0, w + .2, 1, d + .2, mats.stone); for (let y = 5; y < h - 1.5; y += 3.2) for (const x of w > 6 ? [-w * .22, w * .22] : [0]) windowUnit(fill, x, y, f + .02, (i + y) % 3 !== 0, 1.1, 2, 'rect');
        if (i % 2 === 0) { box(fill, -w * .15, h + 2, -1, w * .5, 2.4, 3.5, mats.wood); roof(fill, -w * .15, h + 3.2, -1, w * .5 + .4, 1.6, 3.9, mats.rust); }
        if (through) { for (const x of [-w / 2 + .5, w / 2 - .5]) this.localCollider(fill, x, 0, 1, d); continue; }
        barrel(fill, w * .2, 0, -.8); this.localCollider(fill, 0, -1.3, w, d - 2.4); this.localCollider(fill, -w / 2 + .5, f - 1.2, 1, 2.4); this.localCollider(fill, w / 2 - .5, f - 1.2, 1, 2.4); } }
    // Gate rows: two short terraces on skewed plots. The west row recedes and the east
    // row steps forward, so the street jogs ~3 m between the gate and the first works.
    for (const [ax, az, bx, bz, types] of [[-12, 50.8, -9, 63.4, [7, 8]], [9.6, 51, 12.6, 63.4, [6, 7]]] as const) {
      const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len; let nx = -uz, nz = ux; if (nx * -ax < 0) { nx = -nx; nz = -nz; }
      const yaw = Math.atan2(nx, nz), widths = [len * .53, len * .47], heights = [17, 21]; let t = 0;
      widths.forEach((w, k) => { const mid = t + w / 2; t += w; const fx = ax + ux * mid, fz = az + uz * mid, depth = 9;
        const b = new T.Group(); b.position.set(fx - nx * depth / 2, 0, fz - nz * depth / 2); b.rotation.y = yaw; g.add(b); this.facade(b, w + .05, heights[k], depth, types[k]);
        this.housingFrontages.push({ x: fx, z: fz, width: w, height: heights[k], family: types[k] % 3, yaw });
        // Axis-aligned collision: slices following the skewed footprint.
        for (let q = 0; q < 4; q++) { const sx = fx + ux * (-w / 2 + (q + .5) * w / 4) - nx * depth / 2, sz = fz + uz * (-w / 2 + (q + .5) * w / 4) - nz * depth / 2; this.collider(sx, sz, Math.abs(ux) * w / 4 + Math.abs(nx) * depth, Math.abs(uz) * w / 4 + Math.abs(nz) * depth); } }); }
    for (const x of [-22, 22]) { const b = new T.Group(); b.position.set(x, 0, -56); this.facade(b, 15, 12, 9, 8);this.housingFrontages.push({x,z:-51.45,width:15,height:12,family:2,yaw:0}); g.add(b); this.collider(x, -56, 15, 9); }
    bake(g);
  }
  buildLandmarks() { const g = new T.Group(); this.root.add(g);
    // The arrival arch, with lamps and weathered brass city lettering.
    for (const x of [-8.8, 8.8]) { box(g, x, 4, 66, 2.3, 8, 2.8, mats.darkBrick); box(g, x, .7, 66, 3, 1.4, 3.4, mats.stone); box(g, x, 7.8, 66, 3, .6, 3.5, mats.stone); box(g, x, 9.4, 66, 2.1, 2.6, 2.6, mats.darkBrick); box(g, x, 10.8, 66, 2.7, .3, 3.1, mats.brass); const spire = new T.Mesh(new T.ConeGeometry(1.7, 5.5, 8), mats.teal); spire.position.set(x, 13.7, 66); spire.rotation.y = Math.PI / 8; g.add(spire); sphere(g, x, 16.6, 66, .3, mats.brass); this.collider(x, 66, 2.3, 2.8); }
    box(g, 0, 8.3, 66, 18, 1.2, 1.6, mats.iron); const back = sign(g, 'T E R R A', 'May the engines never sleep', 0, 8.35, 65, 13, 1.8); back.rotation.y = Math.PI;
    // Clock of Terra: ivory shaft, navy clock stage, an open pressure lantern and a
    // verdigris bell roof. It is the one silhouette visible from every street.
    const tower=new T.Group();tower.position.set(0,0,-46);g.add(tower);
    box(tower,0,.6,0,8.4,1.2,8.4,mats.stone);box(tower,0,10.5,0,5.4,19,5.4,mats.warmStone);
    for(const x of [-2.75,2.75])for(const z of [-2.75,2.75])box(tower,x,10,z,.9,20,.9,mats.stone);
    for(let side=0;side<4;side++){const face=new T.Group();face.rotation.y=side*Math.PI/2;tower.add(face);
      box(face,0,10.5,2.62,2.6,15,.3,mats.teal);arch(face,0,13.2,2.8,1.4,4.2,mats.iron);for(const y of [4.5,8])box(face,0,y,2.8,1.1,1.5,.05,mats.dark);}
    arch(tower,0,1.2,2.8,2.2,5.2,mats.iron);crest(tower,0,6.8,2.95,1.1);
    for(const y of [1.3,19.6])box(tower,0,y,0,6.6,.45,6.6,mats.brass);
    box(tower,0,23.4,0,7.2,7.2,7.2,mats.iron);box(tower,0,27.1,0,7.8,.5,7.8,mats.brass);
    for(const x of [-3.7,3.7])for(const z of [-3.7,3.7])cyl(tower,x,23.4,z,.42,7.6,mats.copper);
    const clockGlow=new T.MeshStandardMaterial({color:P.neutral.paper,emissive:P.warm.lamp,emissiveIntensity:.6,roughness:1});
    for(let side=0;side<4;side++){
      const dial=new T.Group();dial.rotation.y=side*Math.PI/2;tower.add(dial);
      const face=cyl(dial,0,23.4,3.62,2.75,.12,clockGlow);face.rotation.x=Math.PI/2;torus(dial,0,23.4,3.7,2.8,.16,mats.brass);
      for(let i=0;i<12;i++){const a=i*Math.PI/6;const tick=box(dial,Math.sin(a)*2.35,23.4+Math.cos(a)*2.35,3.78,i%3===0?.16:.09,i%3===0?.5:.28,.03,mats.iron);tick.rotation.z=-a;}
      const handRoot=new T.Group();handRoot.position.set(Math.sin(side*Math.PI/2)*3.83,23.4,-46+Math.cos(side*Math.PI/2)*3.83);handRoot.rotation.y=side*Math.PI/2;this.root.add(handRoot);
      const hand=box(handRoot,0,.85,0,.14,2.1,.05,mats.iron);this.clockHands.push(hand);box(dial,-.55,23.6,3.82,1.35,.17,.04,mats.iron).rotation.z=-.4;
      sphere(dial,0,23.4,3.86,.18,mats.brass);
    }
    // Open lantern stage: the pressure core glows through four arches.
    for(const x of [-2.9,2.9])for(const z of [-2.9,2.9])box(tower,x,30.2,z,.7,6,.7,mats.warmStone);
    cyl(tower,0,30,0,1.5,4.8,this.lantern);cyl(tower,0,32.9,0,2.2,.3,mats.brass);cyl(tower,0,27.7,0,2.2,.3,mats.brass);
    box(tower,0,33.5,0,7,.7,7,mats.stone);
    const cap=new T.Mesh(new T.LatheGeometry([new T.Vector2(4.2,33.8),new T.Vector2(4.4,34.6),new T.Vector2(3.6,36.6),new T.Vector2(2.2,38.8),new T.Vector2(1.5,40.4),new T.Vector2(1.1,41.4),new T.Vector2(.25,43.6)],8),mats.teal);cap.rotation.y=Math.PI/8;tower.add(cap);
    cyl(tower,0,45.6,0,.14,4.4,mats.brass);const ring=torus(tower,0,44.4,0,1.05,.07,mats.brass);ring.rotation.x=Math.PI/2;torus(tower,0,44.4,0,1.05,.06,mats.brass).rotation.y=.9;sphere(tower,0,47.9,0,.34,mats.brass);
    sign(tower,'TERRA','EVERY HOUR • EVERY HAND',0,16.8,2.9,2.4,.6);this.collider(0,-46,8.4,8.4);
    // Elevated rail line forms a second visual horizon.
    for (let x = -64; x <= 64; x += 16) { box(g, x, 7, -63, .65, 14, .65, mats.iron); beam(g, new T.Vector3(x, 8, -63), new T.Vector3(x + 7, 13, -63), .14); }
    for (const z of [-61.8, -64.2]) box(g, 0, 13.4, z, 145, .25, .16, mats.iron); box(g, 0, 13, -63, 145, .5, 3, mats.darkBrick);
    for (let i = 0; i < 3; i++) { box(this.tram, i * 4.6, 1.15, 0, 4.2, 2, 1.9, mats.teal); box(this.tram, i * 4.6, 2.25, 0, 4.4, .25, 2.2, mats.roof); for (let w = 0; w < 3; w++) box(this.tram, i * 4.6 - 1.3 + w * 1.2, 1.5, 1, .8, .85, .04, mats.glow); for (const x of [-1.4, 1.4]) { const wh = cyl(this.tram, i * 4.6 + x, .2, 0, .35, 2.1); wh.rotation.x = Math.PI / 2; } } this.tram.position.set(-65, 13.5, -63); this.root.add(this.tram);
    for (const [id, x, z, angle, name] of [['canal', 54, -6, Math.PI / 2, 'CANAL WARD'], ['heights', 0, -70, 0, 'AETHER HEIGHTS']] as const) { const gate = new T.Group(); gate.position.set(x, 0, z); gate.rotation.y = angle; this.root.add(gate); for (const xx of [-5, 5]) { box(gate, xx, 4.5, 0, 1.3, 9, 1.5, mats.stone); sphere(gate, xx, 9.2, 0, .4, mats.brass); } box(gate, 0, 8.3, 0, 11, .4, .7, mats.iron); sign(gate, name, 'Expansion charter required', 0, 7.1, .5, 8.4, 1.2); const bars = new T.Group(); gate.add(bars); for (let xx = -4.5; xx <= 4.5; xx += .5) { cyl(bars, xx, 3, 0, .065, 6, mats.iron); sphere(bars, xx, 6.1, 0, .1); } this.gateMeshes.set(id, bars); this.target(gate, id, 'district', name, 3.7, 1.65, 1); this.collider(x, z, angle ? 1 : 10, angle ? 10 : 1, 9, id); }
    this.target(this.root, 'city', 'ledger', 'City ledger', 5.5, 1.65, 56); this.target(this.root, 'map', 'discovery', 'Rail map of Locke', -34, 7.7, -59); this.target(this.root, 'automaton', 'discovery', 'Forgotten automaton', -33, 1.65, 4); this.target(this.root, 'shrine', 'discovery', 'The First Flame', 34, 1.65, -48);
    sphere(g, -32, .55, 3, .45, mats.rust); gear(g, -32, .5, 3.42, .29); crate(g, -33, 0, 2); sign(g, 'VEY R • ORISON', 'Railway of the seven provinces', -34, 8.9, -60.5, 5, .8);
    cyl(g, 34, .4, -49, 1, .8, mats.stone); cyl(g, 34, 1.1, -49, .3, .7, mats.brass); sphere(g, 34, 1.75, -49, .28, mats.aether);
    bake(g);
  }
  buildSignatureMachinery() {
    const g = new T.Group(); this.root.add(g);
    // Salvage yard: lattice crane, a suspended grab, sorted scrap and old flywheels.
    const scrap = new T.Group(); scrap.position.set(-28.7, 0, 40); g.add(scrap);
    for (const x of [-1.3, 1.3]) { box(scrap, x, 4.5, -4, .18, 9, .18, mats.iron); beam(scrap, new T.Vector3(x, 0, -4), new T.Vector3(-x, 4, -4), .075, mats.rust); beam(scrap, new T.Vector3(x, 4, -4), new T.Vector3(-x, 8, -4), .075, mats.rust); }
    box(scrap, 1, 8.8, -4, 7, .35, .45, mats.rust); beam(scrap, new T.Vector3(-1.3, 10, -4), new T.Vector3(4.5, 8.8, -4), .045, mats.iron); cyl(scrap, 4, 6.7, -4, .035, 4, mats.iron); torus(scrap, 4, 4.6, -4, .5, .09, mats.rust);
    for (let i = 0; i < 18; i++) { const a = random() * Math.PI * 2; const wheel = torus(scrap, Math.cos(a) * 1.5, .3 + random() * 1.4, 1 + Math.sin(a) * 2, .3 + random() * .4, .09, mats.rust); wheel.rotation.set(random() * 3, random() * 3, random() * 3); }
    // Riveted municipal pressure reservoir, exterior furnace and working fan.
    const boiler = new T.Group(); boiler.position.set(29.5, 0, 40); g.add(boiler);
    cyl(boiler, 0, 5.6, 0, 2.1, 10.7, mats.teal); sphere(boiler, 0, 11, 0, 2.1, mats.copper).scale.y *= .45;
    for (const y of [.7, 4.4, 7.6, 10.8]) { cyl(boiler, 0, y, 0, 2.17, .13, mats.iron); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; sphere(boiler, Math.cos(a) * 2.18, y, Math.sin(a) * 2.18, .065, mats.brass); } }
    const exhaust = cyl(boiler, 0, 12.7, 0, .48, 3, mats.rust); exhaust.rotation.z = .15; torus(boiler, -2.14, 3.4, 0, .45, .08, mats.brass).rotation.y = Math.PI / 2;
    const hearthLight = new T.PointLight('#ff7428', 18, 10, 2); hearthLight.position.set(32, 1.5, 14); this.root.add(hearthLight); this.hearth = hearthLight;
    const workshop = new T.Group(); workshop.position.set(-29, 0, 14); g.add(workshop); box(workshop,0,1.1,0,2.5,.18,4,mats.wood); for (const z of [-1.6,1.6]) box(workshop,0,.55,z,2.1,1.1,.14,mats.iron); gear(workshop,0,1.9,.7,.7); gear(workshop,.9,1.65,.7,.4);
    for (const z of [-11,-20]) { const table = new T.Group(); table.position.set(-29,0,z); cyl(table,0,.6,0,.08,1.2,mats.iron); cyl(table,0,1.2,0,.9,.13,mats.wood); for (const x of [-1.3,1.3]) { box(table,x,.55,0,.7,.12,.7,mats.wood); for(const dz of [-.25,.25]) box(table,x,.28,dz,.07,.55,.07,mats.iron); box(table,x + (x<0?-.3:.3),.95,0,.08,.9,.7,mats.wood); } g.add(table); }
    bake(g);
  }
  lamp(g: T.Group, x: number, z: number, enhanced = false) { const m = enhanced ? mats.brass : mats.iron; const face = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    // Terra lamp: fluted post, a brass pressure housing, the split ring and a verdigris cap.
    cyl(g, x, .2, z, .34, .4, mats.stone); cyl(g, x, 2.4, z, .085, 4.4, m); cyl(g, x, .9, z, .16, .9, m); cyl(g, x, 1.6, z, .2, .5, mats.brass); cyl(g, x, 1.9, z, .23, .08, m);
    pressureRing(g, x, 3.4, z, .34, m, face);
    const lit = enhanced && this.economy.state.infrastructure.lamps === 3 ? mats.aether : mats.glow;
    cyl(g, x, 4.55, z, .07, .2, m); box(g, x, 4.95, z, .42, .62, .42, lit); for (const dx of [-.21, .21]) for (const dz of [-.21, .21]) box(g, x + dx, 4.95, z + dz, .05, .68, .05, m);
    const cap = new T.Mesh(new T.ConeGeometry(.38, .6, 6), mats.teal); cap.position.set(x, 5.55, z); g.add(cap); sphere(g, x, 5.9, z, .07, mats.brass); }
  buildDetails() { const g = new T.Group(); this.root.add(g);
    for (const x of [-9.8, 9.8]) for (let z = 57; z >= -56; z -= 19) this.lamp(g, x, z);
    for (const [x,z] of [[-9.3,48],[9.3,21],[-9.3,-6],[9.3,-33]]) { const light = new T.PointLight('#ffc273', 7, 24, 2); light.position.set(x, 4, z); this.lamps.push(light); this.root.add(light); }
    // The Great Main: Terra's pressure artery leaves the municipal boiler and crosses
    // the whole ward overhead. Its regulator dome hangs above the street like a moon.
    { const z = 29, y = 14;
      // Regulator towers: masonry shafts whose top rooms wrap the Main itself.
      for (const x of [-11.9, 11.9]) { box(g, x, 6.2, z, 2.4, 12.4, 2.4, mats.darkBrick); box(g, x, .5, z, 3, 1, 3, mats.stone); for (const yy of [4, 8]) box(g, x, yy, z, 2.6, .22, 2.6, mats.stone);
        box(g, x, 14, z, 3.6, 3.4, 3.6, mats.teal); box(g, x, 12.2, z, 4, .3, 4, mats.stone); box(g, x, 15.8, z, 4, .3, 4, mats.brass);
        for (const dz of [-1.81, 1.81]) { const w = new T.Mesh(new T.PlaneGeometry(1.6, 1.3), windowGlass[0]); w.position.set(x, 14.3, z + dz); w.rotation.y = dz > 0 ? 0 : Math.PI; g.add(w); }
        const cap = new T.Mesh(new T.ConeGeometry(3, 2.8, 4), mats.roof); cap.rotation.y = Math.PI / 4; cap.position.set(x, 17.4, z); g.add(cap); cyl(g, x, 19.3, z, .12, 1.2, mats.brass); sphere(g, x, 20, z, .2, mats.brass);
        this.collider(x, z, 3, 3); }
      pipe(g, [[-30, 0, z], [-30, y, z], [30, y, z], [30, y, 36], [30, 11.4, 38.5]], .85, mats.copper);
      for (let x = -26; x <= 26; x += 4) { const flange = torus(g, x, y, z, .92, .13, mats.iron); flange.rotation.y = Math.PI / 2; }
      const dome = sphere(g, 0, y + .6, z, 2.3, mats.brass); dome.scale.y *= .82; cyl(g, 0, y - .9, z, 1.5, 1, mats.iron); cyl(g, 0, y + 2.6, z, .32, 1.4, mats.iron); sphere(g, 0, y + 3.3, z, .45, mats.copper);
      const wheel = gear(g, 11.9, 5.5, z + 1.1, .85); this.gears.push(wheel);
      this.collider(-30, z, 2, 2); sign(g, 'THE GREAT MAIN', 'MUNICIPAL PRESSURE • WARD 07', 0, y - 2.1, z + .9, 5.2, .75); }
    for (let i = 0; i < 10; i++) { const side = i % 2 ? -1 : 1; const x = side * (28 + random() * 2); const z = 55 - random() * 106; if (i % 2) barrel(g, x, 0, z); else crate(g, x, 0, z, .8 + random() * .5); }
    // Merchant stalls, hanging laundry, crates, roof ducts and cobbled stoops.
    for (const z of [25, -1]) { beam(g, new T.Vector3(-29, 8, z), new T.Vector3(-43, 7.3, z), .025); for (let n = 0; n < 5; n++) { this.cloth(-31 - n * 2, 7.6, z, 1.3, 1.5, n % 2 ? mats.cream : mats.teal); } }
    for (let z = 38; z > -35; z -= 20) { this.cloth(-10, 6.7, z, 1, 2, mats.teal); box(g, -10, 6.75, z, 1.4, .08, .08, mats.brass); }
    for (const x of [-6, 6]) { box(g, x, .65, -39, 2.7, .16, .75, mats.wood); for (const dx of [-1, 1]) { box(g, x + dx, .3, -39, .1, .6, .7); box(g, x + dx, 1, -39.35, .1, 1.2, .1); } box(g, x, 1.1, -39.35, 2.7, .4, .1, mats.wood); }
    // Clock Square's spring and the Sael Gate belong to the layered Market Square (market-square.ts).
    sign(g,'CLOCK SQUARE ↑','CANAL WARD →',-8.8,3.1,54,2.7,.8);
    bake(g);
  }
  cloth(x: number, y: number, z: number, width: number, height: number, material: T.MeshStandardMaterial) {
    const geometry = new T.PlaneGeometry(width, height, 6, 10);
    geometry.translate(0, -height / 2, 0);
    const fabric = illustrated(material.clone()); fabric.side = T.DoubleSide;
    const mesh = new T.Mesh(geometry, fabric); mesh.position.set(x, y, z);
    mesh.userData.height = height; mesh.userData.rest = geometry.attributes.position.array.slice();
    this.flags.push(mesh); this.root.add(mesh);
  }
  buildBackground() { const g = new T.Group(); this.root.add(g);
    // Outer ward: tenements close the south ends of the lanes instead of a bare wall.
    for (const [x, type] of [[-48, 7], [-31, 6], [31, 8], [48, 6]]) { const b = new T.Group(); b.position.set(x, 0, 77); b.rotation.y = Math.PI; this.facade(b, 15, 13 + (type % 3) * 2, 9, type); this.housingFrontages.push({ x, z: 72.45, width: 15, height: 13 + (type % 3) * 2, family: type % 3, yaw: Math.PI }); g.add(b); this.collider(x, 77, 15, 9); }
    buildSkyline(this.root); buildOuterCity(this.root, [housingPaint[0], housingPaint[1], housingPaint[2], mats.brick, mats.cream]);
    // Low ward parapets: the boundary holds the player, not the view of the city beyond.
    // The south parapet stops at the arrival terrace, which runs on past the cliff edge.
    box(g, 83, .7, -3, 2, 1.4, 174, mats.stone);
    // On the west edge the parapet opens into a balustrade, so the lane looks down onto the clouds.
    box(g, -83, .7, (-90 + WEST_EDGE.z0) / 2, 2, 1.4, WEST_EDGE.z0 + 90, mats.stone); box(g, -83, .7, (WEST_EDGE.z1 + 84) / 2, 2, 1.4, 84 - WEST_EDGE.z1, mats.stone);
    box(g, -83, 1.08, (WEST_EDGE.z0 + WEST_EDGE.z1) / 2, .16, .1, WEST_EDGE.z1 - WEST_EDGE.z0, mats.brass); box(g, -83, .08, (WEST_EDGE.z0 + WEST_EDGE.z1) / 2, .5, .16, WEST_EDGE.z1 - WEST_EDGE.z0, mats.stone);
    for (let z = WEST_EDGE.z0 + .5; z < WEST_EDGE.z1; z += 1.1) box(g, -83, .58, z, .12, 1, .12, mats.stone); box(g, 54.1, .7, 83, 59.8, 1.4, 2, mats.stone);
    // The south-west parapet opens for the Tether Yard pier.
    box(g, -43.6, .7, 83, 38.8, 1.4, 2, mats.stone); box(g, -77.5, .7, 83, 13, 1.4, 2, mats.stone);
    const balloon = sphere(this.airship, 0, 0, 0, 1, mats.cream); balloon.scale.set(10, 3, 3); for (const xx of [-5, 0, 5]) { const ring = torus(this.airship, xx, 0, 0, 2.95, .075, mats.copper); ring.rotation.y = Math.PI / 2; } box(this.airship, 0, -4.1, 0, 7, 1.5, 2.1, mats.wood); for (const xx of [-3, 3]) for (const z of [-.8, .8]) beam(this.airship, new T.Vector3(xx, -2.2, z * 2), new T.Vector3(xx, -3.8, z), .035); box(this.airship, -9, 0, 0, 3, 5, .13, mats.teal); this.root.add(this.airship); bake(this.airship); bake(g);
  }
  createPopulation() { for(let i=0;i<42;i++){
      const profile=sceneFor(i),npc=citizen(mats.rust,i,profile.role);
      if(profile.activity==='carry'){const cargo=new T.Group();cargo.position.set(0,1.05,.31);npc.body.add(cargo);box(cargo,0,0,0,.43,.32,.33,mats.wood);for(const y of [-.11,.11])box(cargo,0,y,.175,.45,.035,.02,mats.cream);asProp(cargo);bake(cargo);}
      if(profile.activity==='walk'&&i%3!==1){const umbrella=new T.Group();umbrella.position.set(.2,0,.12);npc.body.add(umbrella);cyl(umbrella,0,1.75,0,.012,1.1,mats.iron);
        const shade=new T.Mesh(new T.ConeGeometry(.62,.3,8,1,true),fabricOf([mats.teal,mats.red,artMats.ochre,mats.cream][i%4]));shade.position.y=2.3;umbrella.add(shade);sphere(umbrella,0,2.46,0,.03,mats.brass);asProp(umbrella);bake(umbrella);umbrella.visible=false;npc.group.userData.umbrella=umbrella;}
      if(profile.activity==='read'){const ledger=new T.Group();ledger.position.set(0,1.2,.29);ledger.rotation.x=-.55;npc.body.add(ledger);box(ledger,0,0,0,.27,.035,.32,mats.cream);asProp(ledger);bake(ledger);}
      this.root.add(npc.group);this.npcs.push(npc);
    }
    this.traffic = new Traffic(this);
  }
  /** The Great Main's carts, which stop where the checkpoint says (src/world/traffic.ts). */
  traffic!: Traffic;
  propertyUpgrade(id: PropertyId) { const v = this.properties.get(id)!; const level = this.economy.state.properties[id].level; v.level = level; this.disposeGroup(v.additions); const g = v.additions;
    // Shop windows: boarded while derelict, then stocked with the trade's own goods.
    const index = PROPERTIES.findIndex(p => p.id === id);
    for (const x of shopWindows[index]) {
      if (level === 0 && index % 3 === 0) for (const a of [-.2, .3]) box(g, x, 1.8 + a, 6.16, 2.6, .23, .08, mats.wood).rotation.z = a;
      if (level === 0) continue;
      for (const [shelf, count] of [[1.54, 5], [2.29, level >= 3 ? 5 : 2]] as const) for (let k = 0; k < count; k++) { const gx = x - .9 + k * .45, gz = 5.78;
        if (index === 0) { const w = torus(g, gx, shelf + .16, gz, .13, .04, k % 2 ? mats.rust : mats.iron); w.rotation.y = .4; }
        if (index === 1) { const d = cyl(g, gx, shelf + .15, gz, .13, .05, mats.cream); d.rotation.x = Math.PI / 2; torus(g, gx, shelf + .15, gz + .03, .13, .02, mats.brass); }
        if (index === 2) { cyl(g, gx, shelf + .12, gz, .12, .2, k % 2 ? mats.brass : mats.copper); sphere(g, gx, shelf + .26, gz, .06, mats.brass); }
        if (index === 3) box(g, gx, shelf + .07, gz, .34, .12, .18, k % 2 ? artMats.ember : mats.iron);
        if (index === 4) { cyl(g, gx, shelf + .15, gz, .055, .3, [mats.teal, artMats.wine, mats.copper][k % 3]); }
        if (index === 5) { const bolt = cyl(g, gx, shelf + .1, gz, .09, .38, [mats.red, artMats.ochre, mats.teal, artMats.wine, mats.cream][k % 5]); bolt.rotation.x = Math.PI / 2; }
      } }
    if (level > 0) { box(g, 0, 3.75, 5.85, 15, .1, .1, mats.brass); box(g, 0, .08, 7.8, 15, .15, 3, mats.stone); for (const x of [-6.5, 6.5]) { cyl(g, x, 3, 6, .065, 2, mats.brass); sphere(g, x, 4, 6, .22, mats.glow); } }
    const L = businessLift[index], front = L ? 6.7 : 5.76;
    if (level >= 2) { if (id === 'tavern') for (const x of [-7.5, 7.5]) box(g, x, 6, 5.7, .25, 11, .15, mats.brass); sign(g, 'GUILD CERTIFIED', 'Quality in every turning', 0, L ? 4.45 + L - .45 : 6.5, front, 3, .55); }
    if(level>=3){
      if(id==='scrap'){box(g,-5,10.95+L,1.9,6,2.5,5.2,mats.iron);roof(g,-5,12.2+L,1.9,6.5,2.2,5.6,mats.rust);for(const x of [-6.6,-3.4])windowUnit(g,x,10.1+L,4.52,true,1.1,1.4,'grid');}
      if(id==='workshop'){for(const x of [-6,6]){cyl(g,x,11+L,-1,.08,4.4,mats.brass);torus(g,x,12.6+L,-1,.35,.04,mats.brass);sphere(g,x,13.3+L,-1,.2,mats.copper);}}
      if(id==='boiler'){pipe(g,[[-5,11+L,-1.6],[-5,12.8+L,-1.6],[4.4,12.8+L,-1.6],[4.4,11+L,-1.6]],.2,mats.brass);}
      if(id==='foundry'){box(g,-3.25,12.9+L,-3.75,8,1.3,2.6,mats.iron);for(const x of [-6,-3.25,-.5])box(g,x,12.9+L,-2.44,2,.7,.06,mats.glow);roof(g,-3.25,13.55+L,-3.75,8.6,1.4,3.1,mats.iron);}
      if(id==='tavern'){box(g,0,12.8,5.9,12,.22,3,mats.cream);railing(g,0,13,7.4,12);for(const x of [-5,5])box(g,x,14.3,6.1,.13,3,.13,mats.brass);roof(g,0,15.9,6.1,12.8,1.3,3.3,mats.teal);}
      if(id==='market'){
        box(g,0,5.2+L,6.6,14.8,.18,2.6,mats.teal);railing(g,0,5.3+L,7.9,14.2);
        for(const x of [-7,-3.5,0,3.5,7])box(g,x,7.1+L,7.9,.11,3.8,.11,mats.brass);
        for(const x of [-5.25,-1.75,1.75,5.25]){const vault=new T.Mesh(new T.TorusGeometry(1.69,.065,5,16,Math.PI),mats.brass);vault.position.set(x,7.15+L,7.9);g.add(vault);}
        roof(g,0,9+L,6.6,15.3,1.5,3.2,mats.copper);
      }
    }
    if(level>=4){for(const x of [-6.5,6.5]){box(g,x,8.1+L,front+.06,.85,2.4,.02,id==='foundry'?mats.rust:mats.teal);box(g,x,9.4+L,front+.07,1.1,.08,.04,mats.brass);}if(id==='market'||id==='tavern')for(const x of [-6,6])tree(g,x,7,.55);}
    // Masterwork: every trade earns the aether crown the ledger promises. A lit mast over the roof,
    // aether lamps at the door and a brass plate, so the best house on the street looks like it.
    if(level>=5){const [x,y,z]=id==='workshop'?[0,32.6+L,-2.4]:id==='boiler'?[-7.6,21.4+L,3.9]:[0,businessHeights[index]+L+3.4,-1];cyl(g,x,y-1.6,z,.1,3.2,mats.brass);sphere(g,x,y,z,.42,mats.aether);for(const r of [.75,1.05]){const ring=torus(g,x,y,z,r,.035,mats.brass);ring.rotation.x=Math.PI/2+(r>1?.5:-.35);}
      for(const dx of [-6.5,6.5])sphere(g,dx,4,6,.27,mats.aether);sign(g,'MASTERWORK',PROPERTIES[index].kind+' • FIRST IN TERRA',0,L?4.45+L+.2:7.15,front,3.4,.6,'#d8aa48');}
    // A foreman keeps a desk by the ledger: a lamp, a bell and his name on the post.
    if(this.economy.state.properties[id].automated){box(g,5.2,.62,7.5,.62,1.05,.46,mats.wood);box(g,5.2,1.2,7.5,.76,.07,.6,mats.wood).rotation.x=.18;cyl(g,5.52,1.9,7.3,.03,2.6,mats.iron);sphere(g,5.52,3.25,7.3,.16,mats.glow);sphere(g,4.98,1.34,7.5,.07,mats.brass);sign(g,'FOREMAN','ON DUTY',5.2,.72,7.74,.56,.3);}
    bake(g);
  }
  disposeGroup(g: T.Group) { g.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); }); g.clear(); }
  buildInfrastructure() { this.disposeGroup(this.infrastructure); const g = this.infrastructure; const s = this.economy.state.infrastructure;setHousingCondition(s.housing);

    if (s.roads > 0) { box(g, 0, .07, 10, 12.6, .025, 130, mats.road); for (const x of [-7.8, 7.8]) box(g, x, .089, 10, .14, .02, 130, mats.brass); if (s.roads > 1) for (const x of [-2, 2]) box(g, x, .1, 10, .1, .05, 130, mats.iron); }
    if (s.steam > 0) for (let x = -24; x <= 24; x += 8) { const band = torus(g, x + 2, 14, 29, .9, .08 + s.steam * .02, s.steam === 3 ? mats.aether : mats.brass); band.rotation.y = Math.PI / 2; }
    if (s.gardens > 0) { for (const x of [-7, 7]) for (const z of [-36, -51, 52]) { const lift = terraceRise(x, z); box(g, x, .3 + lift, z, 2.4, .6, 2.4, mats.stone); tree(g, x, z, .8 + s.gardens * .12).position.y = lift; } }
    for(const home of this.housingFrontages){const windows=new T.Group();windows.position.set(home.x,0,home.z);windows.rotation.y=home.yaw;residentialWindows(windows,home,s.housing);g.add(windows);}
    bake(g);
  }
  buildProsperity() { this.disposeGroup(this.prosperity); const g = this.prosperity; const stage = this.economy.stage; this.stage = stage;applyWorldPalette(stage);refreshFacades(stage);refreshCanopyColors();setCitizenProsperity(stage);
    // Recovery is visible from the gate: pennants multiply along the spine.
    if (stage >= 4) for (const z of stage >= 5 ? [36, -9] : [18]) bunting(g, new T.Vector3(-11.6, 8.3, z), new T.Vector3(11.6, 8.3, z + 1.5), 1.1, 16);
    if (stage >= 4) for (const x of [-11, 11]) bunting(g, new T.Vector3(x, 7.5, -38), new T.Vector3(x * .12, 19, -43), .7, 9);
    this.lantern.color.set(stage >= 5 ? P.aether.cyan : P.warm.lamp); this.lantern.emissive.set(stage >= 5 ? P.aether.glow : P.warm.lamp);
    this.lantern.emissiveIntensity = [.18, .45, .7, .9, 1.1, 1.3][stage] + this.economy.state.infrastructure.steam * .15;
    if (stage >= 2) for (const x of [-6, 6]) { const flag = box(g, x, 6, -45, 1.1, 3, .05, mats.teal); cyl(g, x, 4, -45, .06, 8, mats.brass); sphere(g, x, 8.1, -45, .16, mats.brass); flag.rotation.y = .12; }
    if (stage >= 3) for (const x of [-22, 22]) { const b = new T.Group(); b.position.set(x, 12, -56); this.facade(b, 10, 4, 7, 6, true); g.add(b); }
    if (stage >= 4) { for (const x of [-23, 23]) { cyl(g, x, 23, -57, .12, 4, mats.brass); sphere(g, x, 25, -57, .35, mats.aether); const t = torus(g, x, 25, -57, .7, .05); t.rotation.y = Math.PI / 3; } }
    if (stage >= 5) { const dome = sphere(g, 0, 23, -85, 8, mats.copper); dome.scale.y *= 1.4; cyl(g, 0, 12, -85, 10, 20, mats.warmStone); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; cyl(g, Math.sin(a) * 10, 12, -85 + Math.cos(a) * 10, .25, 20, mats.brass); } sphere(g, 0, 34, -85, .65, mats.aether); }
    if (this.economy.state.districts.includes('canal')) { for (let i = 0; i < 3; i++) { const frontage = new T.Group(); frontage.position.set(62.9, 0, 27 - i * 23); frontage.rotation.y = -Math.PI / 2; sign(frontage, ['ORISON PACKETS', 'LOCKE CUSTOMS', 'SALT & SAIL'][i], 'Canal Ward • Guild of merchants', 0, 3.8, .12, 11, 1.1); g.add(frontage); } for (const z of [-19, 7]) tree(g, 56, z); sign(g, 'THE CANAL WARD', 'Orison packets • Locke customs', 60, 3, -17, 6, 1); }
    if (this.economy.state.districts.includes('heights')) { box(g, 0, .12, -78, 20, .25, 15, mats.warmStone); for (const x of [-7, 7]) tree(g, x, -78, 1.2); sign(g, 'THE AETHER INSTITUTE', 'Tomorrow is a civic undertaking', 0, 4, -84, 10, 1.3); }
    bake(g);
  }
  /** Covert and liberation steps land at once, unannounced; only restoring the ancient works brings the civic engineers. */
  construct(kind: string, id: string) { if (kind === 'automation') { this.propertyUpgrade(id as PropertyId); return; } if (kind === 'site' && this.economy.state.sites[id as SiteId] < SITE_RESTORED) { this.sync(); return; } if (!['property', 'infrastructure', 'district', 'research', 'site'].includes(kind)) return; const g = new T.Group(); this.root.add(g); const p = kind === 'site' ? undefined : PROPERTIES.find(p => p.id === id); const anchor = kind === 'site' ? this.presentation.sites.find(s => s.id === id)!.anchor : undefined; const x = p ? p.x : anchor ? anchor.x : kind === 'district' && id === 'canal' ? 54 : 0; const z = p ? p.z : anchor ? anchor.z : -40; g.position.set(x, 0, z); if (p) g.rotation.y = p.rotation; if (anchor) g.rotation.y = anchor.rotation;
    for (const xx of [-8, 8]) for (const zz of [5.9, 8.2]) { cyl(g, xx, 5, zz, .055, 10, mats.brass); for (const y of [2.7, 5.7, 8.7]) beam(g, new T.Vector3(-8, y, zz), new T.Vector3(8, y, zz), .055, mats.brass); } for (const y of [2.7, 5.7, 8.7]) box(g, 0, y, 7.1, 16, .09, 2.3, mats.wood); for (let xx = -8; xx < 8; xx += 4) beam(g, new T.Vector3(xx, 0, 8.2), new T.Vector3(xx + 4, 5.7, 8.2), .05, mats.iron);
    const workers = [citizen(mats.cream), citizen(mats.rust)]; workers.forEach((w, i) => { w.group.position.set(i ? 7 : -6.5, 0, 9.2); w.group.rotation.y = Math.PI; g.add(w.group); }); sign(g, 'TERRA IS REBUILDING', 'Guild of civic engineers', 0, 1.7, 9.2, 5, .8);
    this.constructions.push({ group: g, time: 0, duration: this.economy.buildSeconds(p ? this.economy.state.properties[p.id].level : undefined), workers, site: kind === 'site' ? id : undefined, finish: () => { if (p) this.propertyUpgrade(p.id); this.sync(); } });
  }
  /** Every layered district's physical spots become ordinary interaction targets. */
  siteTargets() { for (const site of this.presentation.sites) for (const t of site.targets) { t.object.updateWorldMatrix(true, false); this.targets.push({ object: t.object, id: `${site.id}.${t.spot}`, kind: 'site', label: t.label, hint: t.hint, position: t.object.getWorldPosition(new T.Vector3()) }); } }
  relabel(object: T.Object3D, label: string, hint: string) { const t = this.targets.find(t => t.object === object); if (t) { t.label = label; t.hint = hint; } }
  /** True while occupation eyes (a patrol, an overseer) are on the Steward at this site. */
  watched(id: SiteId) { return this.presentation.sites.find(s => s.id === id)!.watching; }
  sync(initial = false) { if (initial) for (const p of PROPERTIES) this.propertyUpgrade(p.id); this.buildInfrastructure(); this.buildProsperity(); for (const [id, bars] of this.gateMeshes) bars.visible = !this.economy.state.districts.includes(id); this.presentation?.sync(); }
  /** With `feet`, the surface those feet would land on (roofs, catwalks, the hangway under the
   * street); without, the street itself, which is all the townsfolk ever walk. */
  groundHeight(x: number, z: number, feet?: number): number { if (feet !== undefined && feet > GALLERY.floor + 40) { const deck = this.deckAt(x, z, feet); if (feet < -1) return deck; return Math.max(deck, this.groundHeight(x, z)); }
    if (z > GALLERY.z0 - .4 && z < GALLERY.z1 && x > GALLERY.x0 && x < GALLERY.x1) return GALLERY.floor; const tr = terraceRise(x, z); if (tr > 0) return .18 + tr; if (x > -36.3 && x < -31.7 && z <= -29 && z >= -51) return .2 + (-z - 29) / 22 * 6; if (x > -37.5 && x < -30.5 && z < -51 && z >= -61.5) return 6.4; return .18; }
  blocked(x: number, z: number, feet: number) { if (feet < -50) return !(x > GALLERY.x0 + .4 && x < GALLERY.x1 - .4 && z > GALLERY.z0 + .4 && z < GALLERY.z1 - .4); // Below the street there is only what was built to stand on; a deck also carries the
    // Steward past the ward's edges (a pier over the rim, a stair down into the cleft).
    const deck = this.deckAt(x, z, feet), onDeck = deck > feet - 1.2; if (feet < -1 && !onDeck) return true;
    if (!onDeck) { if (x > 40.2 && x < 48.8 && (z < -9.5 || z > -2.5)) return true; if ((x < -75 && !(x > -82.2 && z > WEST_EDGE.z0 + .5 && z < WEST_EDGE.z1 - .5)) || x > 76 || (z > 78 && !(Math.abs(x) < EDGE_TERRACE.half - .6 && z < EDGE_TERRACE.z)) || z < -83) return true; if (x > 53 && !this.economy.state.districts.includes('canal')) return true; if (z < -69 && !this.economy.state.districts.includes('heights')) return true; }
    return this.colliders.some(c => !(c.gate && this.economy.state.districts.includes(c.gate)) && !c.open?.() && feet < c.height && feet + 1.7 > (c.base ?? -1) && x > c.minX - .32 && x < c.maxX + .32 && z > c.minZ - .32 && z < c.maxZ + .32); }
  update(dt: number, time: number, viewer?:T.Vector3) { if(viewer)this.viewer.copy(viewer);this.refreshSocial(time);setLifeConditions(this.economy.stage,this.raining);this.presentation.update(dt,time,this.viewer); if(this.clockMechanism)this.clockMechanism.rotation.z=this.economy.state.infrastructure.steam>0?-time*.1:0; for (const p of PROPERTIES) { const v = this.properties.get(p.id)!; const level = this.economy.state.properties[p.id].level; v.gear.rotation.z -= dt * (.35 + level * .6) * (this.economy.state.research.includes('governors') ? 1.8 : 1); v.piston.position.y = .95 + Math.sin(time * (1 + level)) * .22; v.machine.rotation.z = 0; }
    for (const flag of this.flags) {
      const pos = flag.geometry.attributes.position; const rest = flag.userData.rest as Float32Array;
      for (let j = 0; j < pos.count; j++) { const drop = -rest[j * 3 + 1] / flag.userData.height;
        pos.setZ(j, Math.sin(time * 2.4 + rest[j * 3] * 2.8 + drop * 4 + flag.position.z) * .13 * drop);
      }
      pos.needsUpdate = true; flag.geometry.computeVertexNormals();
    }
    const calm=reducedMotion(this.economy.state.settings.reducedMotion); this.edge.update(time, calm);
    this.npcs.forEach((npc,i)=>{npc.worn.visible=this.economy.stage<3;npc.finery.visible=this.economy.stage>=3;const sc=sceneFor(i),d=districtAt(sc.x,sc.z),s=this.social.get(d)!,rs=routeState(s.enforcement,routeKind(sc),s.percent/100);
      let on=i<14+this.economy.stage*5&&this.admits(standingOf(sc.role),seedOf(i),d)&&rs.shown;if(on&&sc.route)on=!this.indoors(npc,i,rs.transit,time);npc.group.visible=on;if(!on)this.forget(npc);});
    for(const [i,npc] of this.npcs.entries()){
      if(!npc.group.visible)continue;
      const sc=sceneFor(i),{scene,moving}=stageCitizen(npc,i,sc.route?this.routeClock(npc,time,dt):time);
      // Someone whose companion has been kept off the street stands alone: no conversation with the air.
      const pair=scene.partner===undefined?undefined:this.npcs[scene.partner],partner=pair?.group.visible?pair:undefined,alone=scene.partner!==undefined&&!partner;
      if(scene.activity!=='sit'&&scene.activity!=='eat'&&!isOccupier(npc.archetype)){const official=!!partner&&isOccupier(partner.archetype);this.giveRoom(npc,dt,{partner:official?undefined:partner?.group.position,with:official?partner!.group:undefined,walking:!!scene.route,moving,staged:true,merchant:scene.role==='merchant'});}
      npc.group.position.y=this.groundHeight(npc.group.position.x,npc.group.position.z);
      const target=partner?.group.position??(scene.target?this.lifeTarget.set(scene.target[0],1.7,scene.target[1]):undefined);
      const speaking=alone?false:scene.partner!==undefined?turnTaking(time,i,scene.partner)&&this.speaks(npc)&&this.speaks(partner!):(time+npc.phase)%8<3;
      animateLife(npc,alone?(isOccupier(npc.archetype)?'guard':'walk'):scene.activity,dt,time,calm,this.viewer,target,speaking,moving);
    }
    this.crowd.update();
    this.traffic.update(dt);
    this.airship.position.set(Math.sin(time * .007) * 85, 46 + Math.sin(time * .04), -95 + Math.cos(time * .007) * 15); this.airship.rotation.y = -.1; this.tram.position.x = (time * (this.economy.stage>=3?4.5:2.5)) % 240 - 120;
    for (const hand of this.clockHands) hand.parent!.rotation.z = this.economy.state.infrastructure.steam > 0 ? -this.economy.state.day * Math.PI * 48 : -.4;
    if (this.finchLift) { const u = (time * .06) % 2, pp = u < 1 ? u : 2 - u; this.finchLift.position.y = 14.4 + 9 * pp * pp * (3 - 2 * pp); }

    for (let i = this.constructions.length - 1; i >= 0; i--) { const c = this.constructions[i]; c.time += dt; for (const w of c.workers) w.arms[0].rotation.x = -1 + Math.sin(time * 14) * .7; if (c.time >= c.duration) { c.finish(); this.root.remove(c.group); this.constructions.splice(i, 1); } }
  }
}
