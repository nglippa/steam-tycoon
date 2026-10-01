import * as T from 'three';
import { box, cyl, sphere, beam, sign, bake, mats } from './assets';
import { V, bench } from './art-kit';
import { occupationMats } from './factions';
import { gateCrew, scrutiny, type Gate, type DistrictId } from '../simulation/occupation';
import type { Presentation } from './presentation';

/** CHECKPOINTS. A district's band made into a barrier across an obvious route. The same spot tells the whole story:
 *
 *   manned   trestles wall to wall, a sentry box, two men, booms up: you walk through under their eyes
 *   sealed   the same at curfew, booms down: nobody walks through
 *   light    the outer trestles gone, one man
 *   open     abandoned: the trestles shoved against the walls, the boom on the ground, the box dark
 *   gone     planters and a bench where the box stood
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

export class Checkpoints {
  gates: { site: Site; state: Gate; held: T.Group; full: T.Group; lit: T.Group; abandoned: T.Group; civic: T.Group; booms: T.Group[]; root: T.Group; crew: number[]; waved: number; stopped: number; refused: number; inside: boolean }[] = [];
  constructor(private p: Presentation) { const city = p.city;
    for (const site of SITES) { const root = new T.Group(); root.position.set(site.x, 0, site.z); root.rotation.y = site.quarter ? Math.PI / 2 : 0; p.root.add(root);
      const world = (lx: number, lz: number): [number, number] => site.quarter ? [site.x + lz, site.z - lx] : [site.x + lx, site.z + lz];
      const held = new T.Group(), full = new T.Group(), lit = new T.Group(), abandoned = new T.Group(), civic = new T.Group(); root.add(held, full, lit, abandoned, civic);
      const gate = { site, state: 'manned' as Gate, held, full, lit, abandoned, civic, booms: [] as T.Group[], root, crew: [] as number[], waved: -99, stopped: -99, refused: -99, inside: false }; this.gates.push(gate);
      const available = () => !site.chartered || city.economy.state.districts.includes(site.chartered);
      // The closed parts of the line: everything in the span that is not an opening.
      const cuts = [...site.openings].sort((a, b) => a[0] - b[0]), closed: [number, number][] = []; let at = site.span[0]; for (const [a, b] of cuts) { if (a > at) closed.push([at, a]); at = b; } if (at < site.span[1]) closed.push([at, site.span[1]]);
      const trestle = (g: T.Object3D, a: number, b: number) => { const len = b - a, mid = (a + b) / 2; box(g, mid, .95, 0, len, .13, .1, O.oxblood); box(g, mid, .5, 0, len, .07, .06, O.iron);
        for (let x = a + .35; x < b; x += .7) box(g, x, .95, .052, .28, .13, .01, O.bone); for (let x = a + .2; x <= b - .1; x += Math.max(1.2, len / Math.ceil(len / 1.9))) for (const s of [-1, 1]) beam(g, V(x, 1, 0), V(x, 0, s * .42), .035, O.iron); };
      for (const [a, b] of closed) { const centre = a < 0 && b > 0; trestle(centre ? held : full, a, b);
        const [cx, cz] = world((a + b) / 2, 0), w = b - a; city.collider(cx, cz, site.quarter ? .3 : w, site.quarter ? w : .3, 1.2, undefined, () => !available() || !(centre ? HELD.includes(gate.state) : gate.state === 'manned' || gate.state === 'sealed'));
        // Abandoned: the same trestle dragged against the wall and left.
        if (!centre) { const t = new T.Group(), end = Math.abs(a) > Math.abs(b) ? a : b, dir = Math.sign(end); t.position.set(end - dir * .7, 0, dir * .2); t.rotation.set(0, dir * 1.25, dir * .09); abandoned.add(t); trestle(t, -Math.min(2.2, w / 2), Math.min(2.2, w / 2)); } }
      // The sentry box: a place for one man out of the rain, a lamp, the order above the door. Its footprint outlives it as planters.
      if (site.hut) { for (const g of [held, abandoned]) { box(g, 0, 1.2, 0, 1.3, 2.4, 1.3, O.iron); box(g, 0, 2.46, 0, 1.6, .12, 1.6, O.green); for (const s of [-1, 1]) box(g, 0, 1.55, s * .66, .5, .28, .02, mats.dark); }
        for (const s of [-1, 1]) { const b2 = sign(held, 'CHECKPOINT', 'PAPERS TO BE SHOWN ON DEMAND', 0, 3.05, s * .1, 3, .7, '#cbbf9f'); b2.rotation.y = s > 0 ? 0 : Math.PI; } box(held, 0, 2.7, 0, .1, .5, .1, O.iron);
        for (const s of [-1, 1]) { box(lit, s * .72, 2.05, 0, .14, .2, .2, O.iron); sphere(lit, s * .82, 2.02, 0, .09, mats.glow); }
        box(abandoned, .9, .06, .9, 1.6, .05, .5, O.iron).rotation.y = .5;
        box(civic, 0, .3, 0, 1.5, .6, 1.5, mats.wood); for (const [x, z] of [[-.4, -.35], [.35, -.3], [0, .4], [-.45, .45], [.45, .4]]) sphere(civic, x, .78, z, .32, mats.leaf); for (const [x, z] of [[-.3, .1], [.3, .2], [.05, -.4]]) sphere(civic, x, 1.02, z, .1, mats.red);
        for (const s of [-1, 1]) bench(civic, s * 1.55, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2);
        const [hx, hz] = world(0, 0); city.collider(hx, hz, 1.5, 1.5, 2.4, undefined, () => !available()); }
      else { const sx = site.span[0] + .25; cyl(held, sx, 1.3, -.5, .05, 2.6, O.iron); const b2 = sign(held, 'CHECKPOINT', 'PAPERS', sx + .75, 2.3, -.5, 1.5, .5, '#cbbf9f'); b2.rotation.y = Math.PI; box(lit, sx, 2.7, -.5, .2, .2, .2, O.iron); sphere(lit, sx, 2.55, -.5, .09, mats.glow);
        for (const s of [-1, 1]) { box(civic, s * (site.span[1] - .4), .25, 0, .7, .5, .7, mats.wood); sphere(civic, s * (site.span[1] - .4), .68, 0, .3, mats.leaf); sphere(civic, s * (site.span[1] - .4) + .12, .9, .1, .09, mats.red); } }
      // Booms: one across each opening, pivoting at the box side. Up, people walk under the Ordinance's eyes; down, nobody walks.
      for (const [a, b] of site.openings) { const pivot = Math.abs(a) < Math.abs(b) ? a : b, far = pivot === a ? b : a, len = Math.abs(far - pivot), dir = Math.sign(far - pivot);
        box(held, pivot, .6, 0, .16, 1.2, .16, O.iron); const boom = new T.Group(); boom.position.set(pivot, 1.08, 0); boom.userData.dir = dir; root.add(boom); box(boom, dir * len / 2, 0, 0, len, .09, .09, O.bone); for (let x = .4; x < len; x += .9) box(boom, dir * x, 0, 0, .35, .095, .095, O.oxblood); box(boom, -dir * .35, 0, 0, .5, .2, .2, O.iron); gate.booms.push(boom);
        box(abandoned, (a + b) / 2, .07, .5, len, .09, .09, O.bone).rotation.y = .35;
        const [cx, cz] = world((a + b) / 2, 0); city.collider(cx, cz, site.quarter ? .3 : len, site.quarter ? len : .3, 1.3, undefined, () => !available() || gate.state !== 'sealed'); }
      for (const g of [held, full, lit, abandoned, civic]) bake(g);
      // The crew: two men at the box, one watching each way. Posted by the gate's state, not by the ward's general rank.
      const stand: [number, number, number][] = site.hut ? [[1.55, .9, 0], [-1.55, -.9, Math.PI]] : [[1.45, -1.1, -Math.PI / 2], [-1.45, 1.1, Math.PI / 2]];
      stand.forEach(([lx, lz, yaw], k) => { const [x, z] = world(lx, lz), i = p.addWorker(x, z, yaw, 'guard', { role: 'guard', when: () => available() && gateCrew(gate.state) > k }); gate.crew.push(i); p.posts.push({ index: i, role: 'checkpoint', rank: 0, district: site.district }); p.garrisonPosts.push(i); });
    }
    this.sync(true);
  }
  private sync(force = false) { for (const g of this.gates) { const state = this.p.city.social.get(g.site.district)!.gate; if (!force && state === g.state) continue; g.state = state;
      const on = !g.site.chartered || this.p.city.economy.state.districts.includes(g.site.chartered); g.root.visible = on;
      g.held.visible = HELD.includes(state); g.full.visible = state === 'manned' || state === 'sealed'; g.lit.visible = HELD.includes(state); g.abandoned.visible = state === 'open'; g.civic.visible = state === 'gone'; for (const b of g.booms) b.visible = HELD.includes(state); } }
  /** One gate is ever near enough to matter. Walking through an opening is what the checkpoint is for: a stranger is waved on,
   * someone the patrols know has their papers turned into an incident, and at curfew the boom simply stays down. */
  update(dt: number, time: number, viewer: T.Vector3) { this.sync(); const city = this.p.city;
    for (const g of this.gates) { if (!g.root.visible) continue; const s = g.site, sealed = g.state === 'sealed';
      for (const b of g.booms) { const want = sealed ? 0 : b.userData.dir * 1.28; b.rotation.z += (want - b.rotation.z) * Math.min(1, dt * 2.2); }
      if (!HELD.includes(g.state) || viewer.y > 4) { g.inside = false; continue; }
      const dx = viewer.x - s.x, dz = viewer.z - s.z, lx = s.quarter ? -dz : dx, lz = s.quarter ? dx : dz;
      if (Math.abs(lz) > 5 || lx < s.span[0] - 1 || lx > s.span[1] + 1) { g.inside = false; continue; }
      const social = city.social.get(s.district)!, heat = city.economy.state.heat, what = scrutiny(g.state, heat, social.crackdown), inOpening = Math.abs(lz) < 1.4 && s.openings.some(([a, b]) => lx > a && lx < b);
      const speak = (tone: 'authoritative' | 'hostile' | 'suspicious', seconds: number) => { for (const i of g.crew) { const w = this.p.workers[i], now = w.person.tone; if (!w.person.group.visible || (tone === 'suspicious' && now && now.until > time && now.tone !== 'suspicious')) continue; w.person.tone = { tone, until: time + seconds }; } };
      if (what === 'refuse') { if (Math.abs(lz) < 3.2 && time - g.refused > 20) { g.refused = time; speak('authoritative', 4); city.onEvent(`“Closed. Curfew. Turn around, Steward.” The boom is down; ${s.around} are not watched.`); } }
      else if (inOpening && !g.inside) {
        if (what === 'challenge' && time - g.stopped > 40) { g.stopped = time; speak('hostile', 6); city.incident('minor', viewer.x, viewer.z); }
        else if (what === 'wave' && time - g.waved > 45) { g.waved = time; speak('authoritative', 3); city.onEvent('“Papers.” A look, a nod. “Go on, Steward.”'); }
        else if (what === 'challenge') speak('suspicious', 3); }
      else if (!inOpening && Math.abs(lz) < 4.5 && heat >= .5 && what === 'challenge') speak('suspicious', .6);
      g.inside = inOpening; } }
}
