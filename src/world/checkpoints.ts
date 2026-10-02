import * as T from 'three';
import { box, cyl, sphere, beam, sign, bake, mats } from './assets';
import { V, bench, bunting } from './art-kit';
import { occupationMats, canvasTarp, signs } from './factions';
import { inView } from './patrol';
import { gateCrew, scrutiny, type Gate, type DistrictId, type Scrutiny, type Tone } from '../simulation/occupation';
import { APPROACH, approachState, stepApproach, type Approach, type ApproachEvent } from '../simulation/approach';
import type { Presentation } from './presentation';

/** CHECKPOINTS. A district's band made into a barrier across an obvious route. The same spot tells the whole story:
 *
 *   manned   trestles wall to wall, a sentry box, two men, booms up: you walk through under their eyes
 *   sealed   the same at curfew, booms down, a second bar under them, a red lamp and a HALT plate: nobody walks through
 *   light    the outer trestles gone, one man
 *   open     abandoned: the box stripped to its frame under a tarp, the trestles shoved against the walls, the boom on the ground
 *   gone     reclaimed: a planter where the box stood, benches, a civic plate, bunting across the street
 *
 * Each one sits on a route that has another way round, so the barrier is a reason to use it. */
interface Site { id: string; district: DistrictId; x: number; z: number; quarter: boolean; span: [number, number]; openings: [number, number][]; hut: boolean; chartered?: string; around: string }
const SITES: Site[] = [
  // The Great Main under the Market Bridge-house. Around it: Finch Mechanical's yard ladder, over the roofs, down the Bridge-house's north ladders.
  { id: 'main', district: 'lowworks', x: 0, z: 10.4, quarter: false, span: [-13, 13], openings: [[2.1, 6.2], [-6.2, -2.1]], hut: true, around: 'the roofs' },
  // The west end of the Chain Bridge. Around it: the Canal Ward gate bridge further north.
  { id: 'chain', district: 'canal', x: 39.2, z: 34, quarter: true, span: [-2, 2], openings: [[-.9, .9]], hut: false, chartered: 'canal', around: 'the gate bridge' },
];
const O = occupationMats, HELD: Gate[] = ['light', 'manned', 'sealed'];
/** The sealed gate's lamp: red, lit, the one colour on the barrier that means stop. */
const stopLamp = new T.MeshStandardMaterial({ color: '#d0402e', emissive: '#e0442c', emissiveIntensity: 1.4, roughness: .45 });
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
type Alarm = 'challenge' | 'refuse' | 'incident';
type GateRecord = { site: Site; state: Gate; held: T.Group; full: T.Group; lit: T.Group; sealed: T.Group; abandoned: T.Group; civic: T.Group; booms: T.Group[]; root: T.Group; crew: number[]; yaw: number[];
  /** A cart is under the boom while the gate is sealed: the boom waits for it. */ cart: boolean; /** Until when each opening is taken up with someone being looked over. */ busy: number[]; waved: number; refused: number; approach: Approach; scan: number; seenBy: number; watcher: number; watchUntil: number };

export class Checkpoints {
  gates: GateRecord[] = [];
  /** A challenge, a refusal or an incident at a gate: for a whistle or a bell. Unset, the gate is heard only through its lines. */
  onAlarm?: (kind: Alarm) => void;
  constructor(private p: Presentation) { const city = p.city;
    for (const site of SITES) { const root = new T.Group(); root.position.set(site.x, 0, site.z); root.rotation.y = site.quarter ? Math.PI / 2 : 0; p.root.add(root);
      const world = (lx: number, lz: number): [number, number] => site.quarter ? [site.x + lz, site.z - lx] : [site.x + lx, site.z + lz];
      const held = new T.Group(), full = new T.Group(), lit = new T.Group(), sealed = new T.Group(), abandoned = new T.Group(), civic = new T.Group(); root.add(held, full, lit, sealed, abandoned, civic);
      const gate: GateRecord = { site, state: 'manned', held, full, lit, sealed, abandoned, civic, booms: [], root, crew: [], yaw: [], cart: false, busy: site.openings.map(() => -99), waved: -99, refused: -99, approach: approachState(), scan: 0, seenBy: -1, watcher: -1, watchUntil: -99 }; this.gates.push(gate);
      const available = () => !site.chartered || city.economy.state.districts.includes(site.chartered);
      // What is left lying about an abandoned gate is solid only while it lies there (and too low to hide anyone).
      const litter = (lx: number, lz: number, w: number, d: number, h: number) => { const [x, z] = world(lx, lz); city.collider(x, z, site.quarter ? d : w, site.quarter ? w : d, h, undefined, () => !available() || gate.state !== 'open'); };
      // The closed parts of the line: everything in the span that is not an opening.
      const cuts = [...site.openings].sort((a, b) => a[0] - b[0]), closed: [number, number][] = []; let at = site.span[0]; for (const [a, b] of cuts) { if (a > at) closed.push([at, a]); at = b; } if (at < site.span[1]) closed.push([at, site.span[1]]);
      const trestle = (g: T.Object3D, a: number, b: number) => { const len = b - a, mid = (a + b) / 2; box(g, mid, .95, 0, len, .13, .1, O.oxblood); box(g, mid, .5, 0, len, .07, .06, O.iron);
        for (let x = a + .35; x < b; x += .7) box(g, x, .95, .052, .28, .13, .01, O.bone); for (let x = a + .2; x <= b - .1; x += Math.max(1.2, len / Math.ceil(len / 1.9))) for (const s of [-1, 1]) beam(g, V(x, 1, 0), V(x, 0, s * .42), .035, O.iron); };
      for (const [a, b] of closed) { const centre = a < 0 && b > 0; trestle(centre ? held : full, a, b);
        const [cx, cz] = world((a + b) / 2, 0), w = b - a; city.collider(cx, cz, site.quarter ? .3 : w, site.quarter ? w : .3, 1.2, undefined, () => !available() || !(centre ? HELD.includes(gate.state) : gate.state === 'manned' || gate.state === 'sealed'));
        // Abandoned: the same trestle dragged against the wall and left.
        if (!centre) { const t = new T.Group(), end = Math.abs(a) > Math.abs(b) ? a : b, dir = Math.sign(end); t.position.set(end - dir * .7, 0, dir * .2); t.rotation.set(0, dir * 1.25, dir * .09); abandoned.add(t); const half = Math.min(2.2, w / 2); trestle(t, -half, half); if (w > 2) litter(end - dir * .7, dir * .2, half * .6 + .4, half * 1.9, 1.2); }
        // Abandoned: the centre trestle tipped onto its side by the box, a tarp thrown over half of it.
        else if (site.hut) { const t = new T.Group(); t.position.set(-.3, .42, 1.55); t.rotation.set(1.45, .18, 0); abandoned.add(t); trestle(t, -1.5, 1.5); const tarp = box(abandoned, -.9, .5, 1.62, 1.5, .9, .7, canvasTarp); tarp.rotation.set(.12, .18, .1); litter(-.3, 1.55, 3.1, .9, 1); } }
      if (site.hut) {
        // The sentry box: a place for one man out of the rain, a lamp, the order above the door.
        box(held, 0, 1.2, 0, 1.3, 2.4, 1.3, O.iron); box(held, 0, 2.46, 0, 1.6, .12, 1.6, O.green); for (const s of [-1, 1]) box(held, 0, 1.55, s * .66, .5, .28, .02, mats.dark);
        for (const s of [-1, 1]) { const b2 = sign(held, 'CHECKPOINT', 'PAPERS TO BE SHOWN ON DEMAND', 0, 3.05, s * .1, 3, .7, '#cbbf9f'); b2.rotation.y = s > 0 ? 0 : Math.PI; } box(held, 0, 2.7, 0, .1, .5, .1, O.iron);
        for (const s of [-1, 1]) { box(lit, s * .72, 2.05, 0, .14, .2, .2, O.iron); sphere(lit, s * .82, 2.02, 0, .09, mats.glow); }
        // Abandoned: the box stripped to its frame, walls gone, roof slid off against it, a tarp over one side; the board face down; a drum on its side.
        for (const [x, z] of [[-.62, -.62], [.62, -.62], [-.62, .62], [.62, .62]]) box(abandoned, x, 1.12, z, .09, 2.24, .09, O.iron);
        for (const s of [-1, 1]) box(abandoned, 0, 2.2, s * .62, 1.33, .08, .08, O.iron);
        box(abandoned, 0, .5, -.66, 1.3, 1, .03, O.iron).rotation.z = .04;
        box(abandoned, .58, 1.25, .05, .04, 2.3, 1.36, canvasTarp).rotation.z = -.06;
        box(abandoned, -1.05, .7, -.35, 1.6, .1, 1.6, O.green).rotation.set(.1, .3, 1.15);
        { const b2 = sign(abandoned, 'CHECKPOINT', 'PAPERS TO BE SHOWN ON DEMAND', 1.1, .2, -1.25, 3, .7, '#cbbf9f'); b2.rotation.set(-1.42, .5, 0); }
        { const drum = cyl(abandoned, 1.35, .3, 1.15, .3, .86, O.rust); drum.rotation.set(0, .7, Math.PI / 2); litter(1.35, 1.15, .8, .8, .6); litter(-1.15, -.35, .8, 1.7, 1.4); }
        box(abandoned, .9, .06, .9, 1.6, .05, .5, O.iron).rotation.y = .5;
        city.collider(...world(0, 0), 1.5, 1.5, 2.4, undefined, () => !available() || gate.state === 'gone');
        // Reclaimed: a planter where the box stood, its civic plate, benches facing the street, and bunting across it.
        box(civic, 0, .3, 0, 1.5, .6, 1.5, mats.wood); for (const [x, z] of [[-.4, -.35], [.35, -.3], [0, .4], [-.45, .45], [.45, .4]]) sphere(civic, x, .78, z, .32, mats.leaf); for (const [x, z] of [[-.3, .1], [.3, .2], [.05, -.4]]) sphere(civic, x, 1.02, z, .1, mats.red);
        for (const s of [-1, 1]) { const m = new T.Mesh(signs.plate('FREE PASSAGE', 1.3, .3, 'ivory'), signs.material); m.position.set(0, .32, s * .76); m.rotation.y = s > 0 ? 0 : Math.PI; civic.add(m); }
        for (const s of [-1, 1]) bench(civic, s * 1.55, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2);
        for (const s of [-1, 1]) { const x = s * 7.2; cyl(civic, x, 1.9, 0, .06, 3.8, mats.iron); box(civic, x, .25, 0, 1, .5, .7, mats.wood); sphere(civic, x, .7, 0, .38, mats.leaf); sphere(civic, x + .15, .95, .12, .1, mats.red);
          city.collider(...world(x, 0), 1.1, .8, .6, undefined, () => !available() || gate.state !== 'gone'); }
        bunting(civic, V(-7.2, 3.7, 0), V(7.2, 3.7, 0), 1, 26);
        city.collider(...world(0, 0), 1.5, 1.5, .7, undefined, () => !available() || gate.state !== 'gone'); }
      else { const sx = site.span[0] + .25; cyl(held, sx, 1.3, -.5, .05, 2.6, O.iron); const b2 = sign(held, 'CHECKPOINT', 'PAPERS', sx + .75, 2.3, -.5, 1.5, .5, '#cbbf9f'); b2.rotation.y = Math.PI; box(lit, sx, 2.7, -.5, .2, .2, .2, O.iron); sphere(lit, sx, 2.55, -.5, .09, mats.glow);
        // Abandoned: the post bent over, its board face down on the deck.
        { const post = cyl(abandoned, sx, .9, -.5, .05, 1.9, O.iron); post.rotation.z = -.5; const b3 = sign(abandoned, 'CHECKPOINT', 'PAPERS', sx + .9, .06, -.9, 1.5, .5, '#cbbf9f'); b3.rotation.set(-Math.PI / 2, 0, .4); }
        for (const s of [-1, 1]) { box(civic, s * (site.span[1] - .4), .25, 0, .7, .5, .7, mats.wood); sphere(civic, s * (site.span[1] - .4), .68, 0, .3, mats.leaf); sphere(civic, s * (site.span[1] - .4) + .12, .9, .1, .09, mats.red); }
        { const m = new T.Mesh(signs.plate('FREE PASSAGE', 1, .24, 'ivory'), signs.material); m.position.set(site.span[0] - .02, .9, 0); m.rotation.y = -Math.PI / 2; civic.add(m); } }
      // Booms: one across each opening, pivoting at the box side. Up, people walk under the Ordinance's eyes; down, nobody walks.
      for (const [a, b] of site.openings) { const pivot = Math.abs(a) < Math.abs(b) ? a : b, far = pivot === a ? b : a, len = Math.abs(far - pivot), dir = Math.sign(far - pivot), mid = (a + b) / 2;
        box(held, pivot, .6, 0, .16, 1.2, .16, O.iron); const boom = new T.Group(); boom.position.set(pivot, 1.08, 0); boom.userData.dir = dir; root.add(boom); box(boom, dir * len / 2, 0, 0, len, .09, .09, O.bone); for (let x = .4; x < len; x += .9) box(boom, dir * x, 0, 0, .35, .095, .095, O.oxblood); box(boom, -dir * .35, 0, 0, .5, .2, .2, O.iron); gate.booms.push(boom);
        // Sealed: a rest post at the far end, a second bar under the boom, a HALT plate hung on it, red lamps on both posts.
        box(sealed, far - dir * .05, .5, 0, .14, 1, .14, O.iron); box(sealed, mid, .45, 0, len, .11, .11, O.oxblood); for (let x = .3; x < len; x += .9) box(sealed, pivot + dir * x, .45, 0, .3, .115, .115, O.bone);
        box(sealed, mid, .78, 0, 1.4, .66, .05, O.oxblood); for (const s of [-1, 1]) { const m = new T.Mesh(signs.plate('HALT', 1.2, .5), signs.material); m.position.set(mid, .78, s * .03); m.rotation.y = s > 0 ? 0 : Math.PI; sealed.add(m); }
        for (const x of [pivot, far - dir * .05]) { box(sealed, x, 1.25, 0, .2, .1, .2, O.iron); sphere(sealed, x, 1.38, 0, .13, stopLamp); }
        // Abandoned: the boom unbolted and dropped out of the way beyond the opening, along the street; its post cut down to a stump.
        { const lying = new T.Group(); lying.position.set(far + dir * .55, .06, 1.3); lying.rotation.y = Math.PI / 2 + .14 * dir; abandoned.add(lying); box(lying, 0, 0, 0, len, .09, .09, O.bone); for (let x = -len / 2 + .4; x < len / 2; x += .9) box(lying, x, 0, 0, .35, .095, .095, O.oxblood); }
        box(abandoned, pivot, .2, 0, .16, .4, .16, O.iron);
        const [cx, cz] = world(mid, 0); city.collider(cx, cz, site.quarter ? .3 : len, site.quarter ? len : .3, 1.3, undefined, () => !available() || gate.state !== 'sealed' || gate.cart); }
      for (const g of [held, full, lit, sealed, abandoned, civic]) bake(g);
      // The crew: two men at the box, one watching each way. Posted by the gate's state, not by the ward's general rank.
      const stand: [number, number, number][] = site.hut ? [[1.55, .9, 0], [-1.55, -.9, Math.PI]] : [[1.45, -1.1, -Math.PI / 2], [-1.45, 1.1, Math.PI / 2]];
      stand.forEach(([lx, lz, yaw], k) => { const [x, z] = world(lx, lz), i = p.addWorker(x, z, yaw, 'guard', { role: 'guard', when: () => available() && gateCrew(gate.state) > k }); gate.crew.push(i); gate.yaw.push(p.workers[i].person.group.rotation.y); p.posts.push({ index: i, role: 'checkpoint', rank: 0, district: site.district }); p.garrisonPosts.push(i); });
    }
    this.sync(true);
  }
  private sync(force = false) { for (const g of this.gates) { const state = this.p.city.social.get(g.site.district)!.gate; if (!force && state === g.state) continue; g.state = state;
      const on = !g.site.chartered || this.p.city.economy.state.districts.includes(g.site.chartered); g.root.visible = on;
      g.held.visible = HELD.includes(state); g.full.visible = state === 'manned' || state === 'sealed'; g.lit.visible = HELD.includes(state); g.sealed.visible = state === 'sealed'; g.abandoned.visible = state === 'open'; g.civic.visible = state === 'gone'; for (const b of g.booms) b.visible = HELD.includes(state); } }
  private hit = { gate: undefined as unknown as GateRecord, lane: 0, d: 0 };
  /** The held gate someone at (x, z) walking along (hx, hz) is about to walk into through one of its openings: which gate, which
   * opening, and how far off the boom line is. For the street's civilians, a few times a second each; the answer is one reused object. */
  ahead(x: number, z: number, hx: number, hz: number) { for (const g of this.gates) { if (!g.root.visible || (g.state !== 'sealed' && g.state !== 'manned')) continue;
      const s = g.site, dx = x - s.x, dz = z - s.z, lx = s.quarter ? -dz : dx, lz = s.quarter ? dx : dz, d = Math.abs(lz); if (d > 6 || lz * (s.quarter ? hx : hz) > -.5 * d) continue;
      const lane = s.openings.findIndex(([a, b]) => lx > a - .3 && lx < b + .3); if (lane < 0) continue; this.hit.gate = g; this.hit.lane = lane; this.hit.d = d; return this.hit; }
    return undefined; }
  /** A line, and the body that goes with it, for one of the crew (or all of them). */
  private speak(g: GateRecord, who: number | 'all', tone: Tone, seconds: number, time: number) { for (const i of who === 'all' ? g.crew : [who]) { const w = this.p.workers[i]; if (w?.person.group.visible) w.person.tone = { tone, until: time + seconds }; } }
  /** What the gate does about what the approach just did. One concise line at most; the bodies say the rest. */
  private voice(g: GateRecord, ev: ApproachEvent, what: Scrutiny, time: number, viewer: T.Vector3) { const city = this.p.city, by = g.watcher >= 0 ? g.watcher : g.crew.find(i => this.p.workers[i].person.group.visible) ?? -1, others = g.crew.filter(i => i !== by);
    const watch = (seconds: number) => { g.watchUntil = time + seconds; };
    if (ev === 'notice') { g.watcher = g.seenBy; watch(4); this.speak(g, g.seenBy, what === 'challenge' ? 'suspicious' : 'neutral', 2.5, time); }
    else if (ev === 'resume' && g.approach.renewed > 1) { watch(5); this.speak(g, by, 'hostile', 2.5, time); } // told twice already: a look, no more words
    else if (ev === 'challenge' || ev === 'resume') { watch(APPROACH.window + 1); this.speak(g, by, 'authoritative', ev === 'challenge' ? APPROACH.window : APPROACH.again, time); for (const i of others) this.speak(g, i, 'suspicious', 3, time);
      city.onEvent(ev === 'challenge' ? '“Halt, Steward. Not through here today. Turn back.”' : '“I said turn back.”'); this.onAlarm?.('challenge'); }
    else if (ev === 'refuse') { watch(5); this.speak(g, 'all', 'hostile', 4, time); city.onEvent('“One more step and it is an incident.”'); this.onAlarm?.('refuse'); }
    else if (ev === 'turnedAway') { watch(3.5); this.speak(g, by, 'suspicious', 3.5, time); }
    else if (ev === 'incident') { watch(4); this.speak(g, 'all', 'hostile', 6, time); city.incident('minor', viewer.x, viewer.z); this.onAlarm?.('incident'); }
    else if (ev === 'excused') { watch(2); this.speak(g, by, 'hostile', 2.5, time); city.onEvent('“Next time you stop when you are told, Steward.”'); }
    else if (ev === 'released') { watch(2); this.speak(g, by, 'neutral', 3, time); city.onEvent('A word from the box. “…Never mind. Go on, Steward.”'); }
    else if (ev === 'cleared' && what === 'wave' && time - g.waved > 45) { g.waved = time; watch(2); this.speak(g, by, 'neutral', 3, time); city.onEvent('“Papers.” A look, a nod. “Go on, Steward.”'); }
  }
  /** One gate is ever near enough to matter. Walking up to an opening is what the checkpoint is for: a stranger is watched and
   * waved on, someone the patrols know is stopped short of the boom and given a moment to turn round (simulation/approach.ts),
   * and at curfew the boom simply stays down. Line of sight is asked four times a second, and only of this gate's crew. */
  update(dt: number, time: number, viewer: T.Vector3) { this.sync(); const city = this.p.city;
    for (const g of this.gates) { if (!g.root.visible) continue; const s = g.site, sealed = g.state === 'sealed';
      // Nothing comes down on a cart: while one is in the crossing the boom stays up and the second bar, the plate and the collider stay off.
      g.cart = sealed && city.traffic.occupying(s.z, .5); const down = sealed && !g.cart; g.sealed.visible = down;
      for (const b of g.booms) { const want = down ? 0 : b.userData.dir * 1.28; b.rotation.z += (want - b.rotation.z) * Math.min(1, dt * 2.2); }
      // The man watching the Steward turns to keep him in sight; the rest of the time each faces his own way.
      // (Long after, they are left alone: the curfew watch turns the same men.)
      const watching = time < g.watchUntil;
      if (time < g.watchUntil + 4) g.crew.forEach((i, k) => { const q = this.p.workers[i].person.group; if (!q.visible) return; const want = watching && i === g.watcher ? Math.atan2(viewer.x - q.position.x, viewer.z - q.position.z) : g.yaw[k]; q.rotation.y += wrap(want - q.rotation.y) * Math.min(1, dt * 3); });
      const dx = viewer.x - s.x, dz = viewer.z - s.z, lx = s.quarter ? -dz : dx, lz = s.quarter ? dx : dz;
      // Up on the roofs is the other way through, and nobody watches it: a challenge does not follow him up the ladder.
      const up = viewer.y > 4, far = Math.abs(lz) > APPROACH.reach + APPROACH.leave + 1 || lx < s.span[0] - APPROACH.leave - 2 || lx > s.span[1] + APPROACH.leave + 2;
      if (!HELD.includes(g.state) || up || (far && g.approach.stage === 'idle')) { if (g.approach.stage !== 'idle') g.approach = { ...approachState(), lastIncident: g.approach.lastIncident }; g.seenBy = -1; g.scan = 0; continue; }
      const what = scrutiny(g.state, city.economy.state.heat, city.social.get(s.district)!.crackdown);
      if (what === 'refuse') { stepApproach(g.approach, { lx, lz, span: s.span, seen: false, scrutiny: what, dt, time });
        if (Math.abs(lz) < 3.2 && lx > s.span[0] - 1 && lx < s.span[1] + 1 && time - g.refused > 20) { g.refused = time; this.speak(g, 'all', 'authoritative', 4, time); city.onEvent(`“Closed. Curfew. Turn around, Steward.” The boom is down; ${s.around} are not watched.`); }
        continue; }
      g.scan -= dt; if (g.scan <= 0) { g.scan = .25; g.seenBy = g.crew.find(i => { const q = this.p.workers[i].person.group; return q.visible && inView(city, q, viewer, APPROACH.reach, .95); }) ?? -1; if (g.seenBy >= 0 && g.approach.stage !== 'idle' && g.watcher < 0) g.watcher = g.seenBy; }
      const ev = stepApproach(g.approach, { lx, lz, span: s.span, seen: g.seenBy >= 0, scrutiny: what, dt, time });
      if (ev) this.voice(g, ev, what, time, viewer);
      if (g.approach.stage === 'idle' && !watching) g.watcher = -1; } }
}
