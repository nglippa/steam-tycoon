import * as T from 'three';
import { box, cyl, sphere, beam, crate, mats } from './assets';
import { V, fabricOf } from './art-kit';
import { LayeredSite, when, type SiteModule, type SiteView, type When } from './layers';
import { inView, Attention } from './patrol';
import { Consignment } from './logistics';
import { ancient, ancientMats, occupationMats, decalMat, emberChalk, lightCone, beamMat, flowMaterial, strip, canvasTarp, signs, type FlowClock } from './factions';
import type { Presentation } from './presentation';
import { cityFacts, type CityFacts } from '../simulation/economy';

/** Cinder Row: the street between Cinder No. 3 and Market Square, where the city's
 * districts meet. Its story is everyone else's consequences: once the Finch vouches and
 * the yard answers, a courier runs it; once crates leave the yard light, the Directorate
 * notices and puts an inspection post on it; the Foundry's cutters have to be carried
 * past that post by hand; cutting the post's searchlight shows it was bolted into an
 * ancient aether conduit; when the square and the yard are both free, the Row is too. */
const POST = { x: 16, z: -2.7 }, TABLE = { x: 16, z: -3.7 }, MAST = { x: 23.6, z: -6.6 }, WAYMARK = { x: 9.3, z: 4.86 }, TRENCH_Z = -6.5, PICKUP = { x: 27.8, z: 19.3 };
const CHALKER = { x: 9.3, z: 4.15 }, LOOKOUT = { x: 5.2, z: -6.2 };
/** Yard gate → the Row → the main street → the Copper Finch cellar. */
const ROUTE = [[27.5, 8.5], [27.5, 3], [22, -1], [10, -1], [3.5, -3], [-4, -12], [-9.5, -20], [-11.3, -22.2]].map(([x, z]) => new T.Vector2(x, z));
/** The inspector's attention: up the Row toward the yard, down at his table, down the Row
 * toward the square, back to the table. The table is the window. */
const GAZE: [yaw: number, seconds: number][] = [[Math.PI / 2, 5], [Math.PI, 4], [-Math.PI / 2, 4.5], [Math.PI, 3]];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));


export class CinderRow implements SiteModule {
  id = 'row' as const; site: LayeredSite; targets: SiteModule['targets'] = []; anchor = { x: 20, z: -1, rotation: 0 };
  view: SiteView = { control: 0, stage: 0, levels: {} as SiteView['levels'], sites: { market: 0, foundry: 0, row: 0, gauge: 0 } };
  facts: CityFacts = cityFacts({ market: 0, foundry: 0, row: 0, gauge: 0 });
  /** The Foundry's cutters, carried by hand from the yard to the Finch cellar. */
  cutters!: Consignment; attention = new Attention(GAZE);
  onAlarm: (message: string) => void;
  night = 0; clock: FlowClock = { time: { value: 0 }, front: { value: 1e3 } };
  private inspector: number; private courier: number; private chalker: number; private lookout: number;
  private s = 0; private dir = 1; private pause = 2; private caught = -99; private shownInspection = false; private synced = false;
  private lengths: number[] = []; private total = 0; private viewer = new T.Vector3(0, -99, 0);
  private lamp = new T.Group(); private waymark: T.Mesh; private junction: T.Mesh; private table: T.Mesh;
  constructor(public pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root); this.site = new LayeredSite(root);
    this.onAlarm = message => city.onEvent(message);
    const I = ancientMats.ivory, G = ancientMats.gold, Q = ancientMats.turquoise, O = occupationMats;
    const not = (w: When): When => v => !w(v), is = (k: keyof CityFacts) => when.fact(k);
    const inspection = () => this.facts.inspection;
    for (let i = 1; i < ROUTE.length; i++) { this.lengths.push(ROUTE[i].distanceTo(ROUTE[i - 1])); this.total += this.lengths[i - 1]; }
    // ANCIENT TERRA -------------------------------------------------------------------
    // An ivory waymark at the foot of the Foundry wall, its turquoise arrow pointing to the
    // square; and a tiled conduit under the north kerb that the Directorate paved over.
    const base = this.site.layer(when.always), live = this.site.layer(when.always, false);
    box(base, WAYMARK.x, .5, WAYMARK.z, .34, 1, .26, I); box(base, WAYMARK.x, 1.03, WAYMARK.z, .42, .08, .32, G); box(base, WAYMARK.x, .08, WAYMARK.z, .44, .16, .34, I);
    { const arrow = new T.Shape(); arrow.moveTo(-.09, -.12); arrow.lineTo(.02, -.12); arrow.lineTo(.02, -.2); arrow.lineTo(.12, 0); arrow.lineTo(.02, .2); arrow.lineTo(.02, .12); arrow.lineTo(-.09, .12); arrow.closePath();
      const m = new T.Mesh(new T.ShapeGeometry(arrow), Q); m.position.set(WAYMARK.x, .66, WAYMARK.z - .135); m.rotation.set(0, Math.PI, Math.PI / 2); base.add(m); }
    city.collider(WAYMARK.x, WAYMARK.z, .5, .4, 1.1);
    box(base, 15.25, .085, TRENCH_Z, .5, .012, 17.5, ancientMats.tile).rotation.y = Math.PI / 2; for (const dz of [-.31, .31]) box(base, 15.25, .07, TRENCH_Z + dz, 17.5, .08, .1, I);
    this.waymark = box(live, WAYMARK.x, .6, WAYMARK.z, .5, 1.2, .5, mats.dark); this.waymark.visible = false;
    // OCCUPATION: the Row as the Directorate runs it -----------------------------------
    // Iron plates over the conduit (the east run comes up when the searchlight feed is cut),
    // a clamp on the waymark, and the Row's Directorate name plate.
    const plates = (layer: T.Group, x0: number, x1: number) => { for (let x = x0; x < x1 - .2; x += .92) { const xc = x + .45; box(layer, xc, .115, TRENCH_Z, .88, .03, .72, O.iron); for (const dx of [-.36, .36]) for (const dz of [-.28, .28]) sphere(layer, xc + dx, .132, TRENCH_Z + dz, .022, O.rust); } };
    const held = this.site.layer(not(is('rowFree'))); plates(held, 6.5, 19.6); plates(this.site.layer(not(is('searchlightCut'))), 19.6, 24);
    box(held, WAYMARK.x, .74, WAYMARK.z, .4, .1, .32, O.iron); box(held, WAYMARK.x, .74, WAYMARK.z - .165, .16, .12, .02, O.oxblood);
    { const p = new T.Mesh(signs.plate('CINDER ROW · WORK PAPERS SHOWN ON DEMAND', 3.4, .5), signs.material); p.position.set(19, 2.7, 5.03); p.rotation.y = Math.PI; held.add(p); }
    // Occupied labour before the Directorate reacts: a hauler keeps his head down on the Row.
    pres.addWorker(26, -5.4, -Math.PI / 2, 'carry', { role: 'worker', path: [6, -5.4, .42], when: () => !this.facts.inspection && !this.facts.rowFree });
    // THE EMBERS ----------------------------------------------------------------------
    // An ember chalked on the waymark and at the main-street corner; a chalker who stops when
    // the inspector's eyes come round; a lookout at the corner.
    const marked = this.site.layer(when.covert(1));
    { const m = new T.Mesh(new T.PlaneGeometry(.3, .3), decalMat(emberChalk, .95)); m.position.set(WAYMARK.x, .42, WAYMARK.z - .14); m.rotation.y = Math.PI; marked.add(m);
      const c = new T.Mesh(new T.PlaneGeometry(.46, .46), decalMat(emberChalk, .85)); c.position.set(10.4, 1.25, -7.02); marked.add(c); }
    this.chalker = pres.addWorker(CHALKER.x, CHALKER.z, 0, 'repair', { role: 'resident', when: () => this.view.control >= 1 && !this.facts.rowFree });
    this.lookout = pres.addWorker(LOOKOUT.x, LOOKOUT.z, Math.PI / 2, 'lean', { role: 'courier', when: () => this.view.control >= 1 && !this.facts.rowFree });
    // The courier: the network made visible. A worker with the yard's satchel walking the
    // Row to the Finch and back, from the first chalk mark to the end.
    this.courier = pres.addWorker(ROUTE[0].x, ROUTE[0].y, Math.PI, 'carry', { role: 'courier', tool: 'carry', when: () => this.facts.courierRun });
    // THE DIRECTORATE NOTICES ------------------------------------------------------------
    // Crates leave the yard light and couriers use the Row: an inspection post appears mid-Row,
    // a notice goes up, the shortcut north is closed, and a searchlight watches at night.
    const post = this.site.layer(is('inspection'));
    const sawhorses = (g: T.Group, x: number, z0: number, z1: number, along: 'x' | 'z' = 'z') => {
      const holder = new T.Group(); if (along === 'x') { holder.position.set((z0 + z1) / 2, 0, x); holder.rotation.y = Math.PI / 2; } else holder.position.set(x, 0, (z0 + z1) / 2); g.add(holder);
      const len = Math.abs(z1 - z0), n = Math.max(3, Math.round(len / .5));
      for (const z of [-len / 2 + .22, len / 2 - .22]) for (const dx of [-.24, .24]) beam(holder, V(dx, 0, z), V(dx * .3, .98, z), .035, O.iron);
      for (let k = 0; k < n; k++) box(holder, 0, 1.02, -len / 2 + (k + .5) * len / n, .1, .15, len / n, k % 2 ? O.bone : O.oxblood);
      box(holder, 0, .56, 0, .07, .08, len - .3, O.iron); };
    sawhorses(post, POST.x, -6.95, -4.35); sawhorses(post, POST.x, 1.55, 5.0);
    const open = () => !this.facts.inspection;
    city.collider(POST.x, -5.65, .5, 2.6, 1.2, undefined, open); city.collider(POST.x, 3.28, .5, 3.45, 1.2, undefined, open);
    // The table, with a worker's crate opened on it.
    box(post, TABLE.x, .8, TABLE.z, 1.6, .07, .8, mats.wood); for (const dx of [-.7, .7]) for (const dz of [-.32, .32]) box(post, TABLE.x + dx, .4, TABLE.z + dz, .06, .8, .06, O.iron);
    crate(post, TABLE.x - .3, .84, TABLE.z, .46); { const lid = box(post, TABLE.x - .3, 1.33, TABLE.z + .3, .46, .04, .46, mats.wood); lid.rotation.x = -1.1; } box(post, TABLE.x + .42, .86, TABLE.z, .34, .03, .26, mats.cream);
    { const frame = new T.Group(); frame.position.set(TABLE.x + .72, 0, TABLE.z - .2); post.add(frame); cyl(frame, 0, 1.2, 0, .04, 2.4, O.iron);
      const sign = signs.plate('DIRECTORATE OF LABOUR · INSPECTION · ALL GOODS DECLARED', 3, .42);
      for (const yaw of [Math.PI / 2, -Math.PI / 2]) { const p = new T.Mesh(sign, signs.material); p.position.set(yaw > 0 ? .03 : -.03, 2.25, 0); p.rotation.y = yaw; frame.add(p); } box(frame, 0, 2.25, 0, .05, .5, 3.08, O.green); }
    this.table = box(live, TABLE.x, .7, TABLE.z, 1.7, 1.4, .9, mats.dark); this.table.visible = false;
    city.collider(TABLE.x, TABLE.z, 1.7, .9, 1.0, undefined, () => !this.facts.inspection && !this.facts.rowFree);
    // The notice: "they noticed", in the regime's own words.
    { const p = new T.Mesh(signs.plate('MATERIALS ARE MISSING · INFORMANTS WILL BE REWARDED', 2.6, .9), signs.material); p.position.set(20.6, 2.5, -7.02); post.add(p); for (const dx of [-1.25, 1.25]) sphere(post, 20.6 + dx, 2.9, -6.99, .03, O.rust); }
    // The shortcut north up the foundry lane is closed: the Row is the only direct way now.
    sawhorses(post, -12.3, 25.1, 40.1, 'x'); city.collider(32.6, -12.3, 15.1, .5, 1.3, undefined, open);
    { const p = new T.Mesh(signs.plate('CLOSED BY ORDER OF THE DIRECTORATE', 2.4, .42), signs.material); p.position.set(32.6, 1.42, -12.02); post.add(p); }
    // The searchlight mast and its junction box, cabled down into the old conduit.
    cyl(post, MAST.x, 3.3, MAST.z, .09, 6.6, O.iron); box(post, MAST.x, .95, MAST.z + .13, .5, .7, .3, O.green); box(post, MAST.x, 1.33, MAST.z + .13, .56, .06, .36, O.iron);
    { const p = new T.Mesh(signs.plate('D.L. 07', .36, .14), signs.material); p.position.set(MAST.x, 1.05, MAST.z + .285); post.add(p); }
    city.collider(MAST.x, MAST.z, .6, .6, 6.6, undefined, open);
    const feed = this.site.layer(when.all(is('inspection'), not(is('searchlightCut'))));
    beam(feed, V(MAST.x, .62, MAST.z + .2), V(MAST.x - .35, .1, TRENCH_Z + .05), .04, mats.dark); beam(feed, V(MAST.x - .35, .1, TRENCH_Z + .05), V(MAST.x - 3, .1, TRENCH_Z + .05), .035, mats.dark);
    this.junction = box(live, MAST.x, .95, MAST.z + .25, .7, 1, .5, mats.dark); this.junction.visible = false;
    const lit = this.site.layer(when.all(is('inspection'), not(is('searchlightCut'))), false);
    this.lamp.position.set(MAST.x, 6.72, MAST.z); lit.add(this.lamp); cyl(this.lamp, 0, .12, 0, .22, .24, O.iron);
    { const aim = new T.Group(); aim.position.y = .42; aim.rotation.x = -.92; this.lamp.add(aim); cyl(aim, 0, 0, 0, .32, .52, O.iron); cyl(aim, 0, -.27, 0, .27, .03, mats.glow); lightCone(aim, 2.2, 15).position.y = -.28; }
    // The people the post acts on: one worker searched at the table, one waiting his turn.
    this.inspector = pres.addWorker(POST.x, POST.z, Math.PI, 'clipboard', { role: 'ordinal', when: inspection });
    pres.addWorker(TABLE.x - .6, TABLE.z - .85, 0, 'guard', { role: 'worker', when: inspection });
    pres.addWorker(18.2, -5.4, -.5, 'lean', { role: 'worker', when: inspection });
    // THE CUTTERS: forged at the yard, carried by hand ------------------------------------
    this.cutters = new Consignment('row.crate', 'row', 'market.cell', live, PICKUP, g => { crate(g, 0, 0, 0, .56); const m = new T.Mesh(signs.plate('CINDER No. 3', .5, .18), signs.material); m.position.set(0, .36, -.285); m.rotation.y = Math.PI; g.add(m); },
      () => this.facts.cuttersWaiting, 'You shoulder the crate. It is heavier than cutters should be. Get it to the Copper Finch cellar, out of the inspector’s sight.',
      () => this.pres.foundryWorks.watchingStock ? 'The overseer is watching the outgoing stock. Wait until he turns to his board.' : null);
    city.collider(PICKUP.x, PICKUP.z, .7, .7, .7, undefined, () => !(this.facts.cuttersWaiting && !this.cutters.carrying));
    // TERRA UNDER THE LAMP ----------------------------------------------------------------
    // Cutting the feed lifts the east plates: the trench is ancient conduit, still faintly alight.
    const aether = flowMaterial(ancient.aether, 'aether', .9, this.clock), up = V(0, 1, 0);
    const opened = this.site.layer(is('searchlightCut'));
    opened.add(strip([V(24, .1, TRENCH_Z), V(19.6, .1, TRENCH_Z)], up, .2, 0, aether).mesh);
    const cut = this.site.layer(when.all(is('searchlightCut'), not(is('rowFree'))));
    beam(cut, V(MAST.x, .62, MAST.z + .2), V(MAST.x - .12, .2, MAST.z + .42), .04, mats.dark); for (let k = 0; k < 4; k++) box(cut, 20.2 + k * .07, .2 + k * .045, TRENCH_Z + .75, .86, .03, .7, O.iron);
    // LIBERATION: the Row belongs to the people who were searched on it -----------------------
    const free = this.site.layer(is('rowFree'));
    free.add(strip([V(19.6, .1, TRENCH_Z), V(6.5, .1, TRENCH_Z)], up, .2, 4.4, aether).mesh);
    // The inspection table is a stall: canvas over it, produce on it, the sawhorses a bench.
    box(free, TABLE.x, .8, TABLE.z, 1.6, .07, .8, mats.wood); for (const dx of [-.7, .7]) for (const dz of [-.32, .32]) box(free, TABLE.x + dx, .4, TABLE.z + dz, .06, .8, .06, mats.wood);
    for (const dx of [-.74, .74]) cyl(free, TABLE.x + dx, 1.25, TABLE.z - .36, .03, 2.5, mats.wood); { const awning = box(free, TABLE.x, 2.46, TABLE.z - .1, 1.8, .03, 1.1, canvasTarp); awning.rotation.x = .18; }
    for (let k = 0; k < 3; k++) crate(free, TABLE.x - .5 + k * .5, .84, TABLE.z, .3);
    box(free, 20.5, .45, 4.45, 2.6, .07, .42, mats.wood); for (const dx of [-1.1, 1.1]) box(free, 20.5 + dx, .22, 4.45, .08, .44, .36, mats.wood); city.collider(20.5, 4.45, 2.7, .5, .5, undefined, () => !this.facts.rowFree);
    // Bunting across the Row in Terra's own colours, quiet rather than triumphant.
    for (const x of [12, 20.5]) { beam(free, V(x, 4.3, -7), V(x, 4.1, 5), .012, mats.dark); for (let k = 0; k < 9; k++) { const z = -6.4 + k * 1.3, flag = box(free, x, 3.98, z, .02, .3, .26, k % 2 ? I : fabricOf(Q)); flag.rotation.x = .1; } }
    { const p = new T.Mesh(signs.plate('THE LANTERN WAY', 2.2, .5, 'ivory'), signs.material); p.position.set(19, 2.7, 5.03); p.rotation.y = Math.PI; free.add(p); }
    const rowFree = () => this.facts.rowFree;
    const seller = pres.addWorker(TABLE.x, TABLE.z - .85, 0, 'browse', { role: 'merchant', when: rowFree }), buyer = pres.addWorker(TABLE.x + .2, TABLE.z + 1.05, Math.PI, 'talk', { role: 'worker', when: rowFree });
    pres.workers[seller].partner = buyer; pres.workers[buyer].partner = seller;
    for (const x of [19.7, 21.3]) pres.addWorker(x, 4.08, Math.PI, 'sit', { y: .3, role: 'resident', when: rowFree });
    const a = pres.addWorker(11.4, -1.9, 1.1, 'talk', { role: 'resident', when: rowFree }), b = pres.addWorker(12.5, -1.3, -2.2, 'talk', { role: 'engineer', when: rowFree }); pres.workers[a].partner = b; pres.workers[b].partner = a;
    this.targets.push({ object: this.waymark, spot: 'waymark', label: 'Old waymark', hint: 'EXAMINE' }, { object: this.junction, spot: 'junction', label: 'Directorate junction box', hint: 'EXAMINE' },
      { object: this.table, spot: 'post', label: 'Inspection table', hint: 'EXAMINE' }, { object: this.cutters.target, spot: 'crate', label: 'Crate of cutters', hint: 'CARRY' });
    this.site.seal();
  }
  /** The inspector's reach: a searchlit night carries far, a cut feed leaves him half blind. */
  get range() { return this.night > .5 ? (this.facts.searchlightCut ? 6 : 14) : 10; }
  private get eyes() { return this.pres.workers[this.inspector].person.group; }
  get watching() { return this.facts.inspection && inView(this.pres.city, this.eyes, this.viewer, this.range, .75); }
  sync(view: SiteView) {
    this.view = view; this.facts = cityFacts(view.sites); this.site.sync(view);
    if (this.synced && this.facts.inspection && !this.shownInspection) this.onAlarm('The Directorate has noticed crates leaving Cinder No. 3 light. By morning there is an inspection post on Cinder Row, and the lane north is closed.');
    this.shownInspection = this.facts.inspection; this.synced = true;
    const c = view.sites.row;
    this.pres.city.relabel(this.waymark, 'Old waymark', c === 0 ? 'CHALK' : 'EXAMINE');
    this.pres.city.relabel(this.junction, c > 2 ? 'Cut cable' : 'Directorate junction box', c === 2 ? 'CUT' : 'EXAMINE');
    this.pres.city.relabel(this.table, this.facts.rowFree ? 'Market stall' : 'Inspection table', c === 3 && view.sites.market >= 4 && view.sites.foundry >= 4 ? 'TAKE IT DOWN' : 'EXAMINE');
  }
  setNight(v: number) { this.night = Math.max(0, Math.min(1, (v - .3) / .4)); }
  update(dt: number, time: number, viewer: T.Vector3, calm: boolean) {
    const f = this.facts, crew = this.pres.workers, city = this.pres.city; this.viewer.copy(viewer);
    this.clock.time.value = calm ? time * .35 : time;
    this.cutters.update();
    for (const [target, on] of [[this.junction, f.inspection || f.searchlightCut], [this.table, f.inspection || f.rowFree]] as const) target.layers.set(on ? 0 : 1);
    // The inspector turns between the Row and his table; at night the searchlight sweeps it.
    if (f.inspection) { this.attention.update(dt, time, this.eyes);
      crew[this.inspector].kind = this.attention.facing(Math.PI) ? 'clipboard' : 'guard';
      if (!f.searchlightCut) { this.lamp.rotation.y = -.93 + Math.sin(time * .23) * .38; beamMat.opacity = this.night * .2; }
      // They notice the crate: a whistle, and it goes back to the yard.
      if (this.cutters.carrying && time - this.caught > 3 && inView(city, this.eyes, viewer, this.range, .75)) { this.caught = time; this.cutters.drop();
        this.onAlarm('Inspector: “You. That crate. Open it.” You set it down and walk on. By nightfall a packer has it back at Cinder No. 3.'); } }
    // The courier walks the run, and waits out the inspector's eyes before crossing his post.
    if (f.courierRun) { const c = crew[this.courier], g = c.person.group;
      if (this.pause > 0) { this.pause -= dt; c.kind = 'watch'; }
      else { const step = this.dir * 1.15 * dt, next = this.along(this.s + step), crossing = Math.abs(g.position.x - POST.x) < 2.4 && Math.abs(g.position.z - POST.z) < 5;
        const held = f.inspection && !crossing && Math.abs(next.x - POST.x) < 12 && next.y > -8 && inView(city, this.eyes, { x: next.x, y: g.position.y, z: next.y }, 12, .8);
        if (held) { c.kind = 'watch'; g.rotation.y += wrap(Math.atan2(POST.x - g.position.x, POST.z - g.position.z) - g.rotation.y) * Math.min(1, dt * 4); }
        else { this.s += step; if (this.s <= 0 || this.s >= this.total) { this.s = Math.max(0, Math.min(this.total, this.s)); this.dir *= -1; this.pause = 4; }
          const p = this.along(this.s); g.rotation.y = Math.atan2(p.x - g.position.x, p.y - g.position.z) || g.rotation.y; g.position.set(p.x, city.groundHeight(p.x, p.y), p.y); c.kind = 'carry'; } } }
    // Citizens under observation: the chalker stops and turns to the street while the
    // inspector could see him; the lookout straightens when the inspector looks his way.
    if (this.view.control >= 1 && !f.rowFree) { const ch = crew[this.chalker], seen = f.inspection && inView(city, this.eyes, ch.person.group.position, 11, 1.0);
      ch.kind = seen ? 'lean' : 'repair'; const yaw = seen ? Math.PI : 0; ch.person.group.rotation.y += wrap(yaw - ch.person.group.rotation.y) * Math.min(1, dt * 5);
      crew[this.lookout].kind = f.inspection && this.attention.facing(-Math.PI / 2, .5) ? 'watch' : 'lean'; }
  }
  private along(s: number) { let d = Math.max(0, Math.min(this.total, s)); for (let i = 0; i < this.lengths.length; i++) { if (d <= this.lengths[i] || i === this.lengths.length - 1) return new T.Vector2().lerpVectors(ROUTE[i], ROUTE[i + 1], Math.min(1, d / this.lengths[i])); d -= this.lengths[i]; } return ROUTE[0].clone(); }
}
