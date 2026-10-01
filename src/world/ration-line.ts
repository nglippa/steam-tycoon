import * as T from 'three';
import { box, cyl, sphere, torus, mats } from './assets';
import { V } from './art-kit';
import { LayeredSite, when, type SiteModule, type SiteView, type When } from './layers';
import { inView, Attention } from './patrol';
import { Consignment } from './logistics';
import { ancient, ancientMats, occupationMats, decalMat, emberChalk, tallies, flowMaterial, signs, type FlowClock } from './factions';
import type { Presentation } from './presentation';
import { cityFacts, type CityFacts } from '../simulation/economy';

/** The Ration Line: the stretch of street between the Boiler yard and Cinder No. 3, where
 * the Directorate meters the Boiler's pressure into the Foundry through a caged valve fixed
 * at forty per cent. Under its plates runs an older copper main. The stokers learn to talk
 * to the yard by knocking on the pipe; once pressure starts going missing, a warden signs
 * for every hour; a forged pressure key has to be walked past him to a socket the Directorate
 * never used; the old main then feeds the yard what the Armillary needs. */
const VALVE = { x: 31.6, z: 27.2 }, WARDEN = { x: 30.3, z: 25.9 }, DESK = { x: 28.6, z: 26.0 }, STOKER = { x: 30.8, z: 28.3 }, KEY = { x: 28.4, z: 21.2 };
const MAIN_X = 29.2, MAIN_Z0 = 22.9, MAIN_Z1 = 33.2, PIPE_X = 31.6, PIPE_Y = 3.3;
/** The warden's hour: the gauge, the street toward the yard, his logbook, the Boiler yard. */
const WATCH: [yaw: number, seconds: number][] = [[.79, 4], [-2.83, 4.5], [-1.51, 3.5], [0, 4]];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class RationLine implements SiteModule {
  id = 'gauge' as const; site: LayeredSite; targets: SiteModule['targets'] = []; anchor = { x: 29, z: 29.5, rotation: 0 };
  view: SiteView = { control: 0, stage: 0, levels: {} as SiteView['levels'], sites: { market: 0, foundry: 0, row: 0, gauge: 0 } };
  facts: CityFacts = cityFacts({ market: 0, foundry: 0, row: 0, gauge: 0 });
  /** A forged pressure key, carried by hand from the yard to the ration valve. */
  key!: Consignment; attention = new Attention(WATCH);
  onAlarm: (message: string) => void;
  night = 0; clock: FlowClock = { time: { value: 0 }, front: { value: 1e3 } };
  private warden: number; private stoker: number; private caught = -99; private shownWatch = false; private synced = false; private viewer = new T.Vector3(0, -99, 0);
  private hatch: T.Mesh; private valve: T.Mesh; private desk: T.Mesh;
  constructor(public pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root); this.site = new LayeredSite(root);
    this.onAlarm = message => city.onEvent(message);
    const I = ancientMats.ivory, G = ancientMats.gold, O = occupationMats, is = (k: keyof CityFacts) => when.fact(k), not = (w: When): When => v => !w(v);
    const base = this.site.layer(when.always), live = this.site.layer(when.always, false);
    // ANCIENT TERRA: a copper main in an ivory channel, banded in gold, under the street.
    box(base, MAIN_X, .05, (MAIN_Z0 + MAIN_Z1) / 2, .72, .06, MAIN_Z1 - MAIN_Z0, mats.stone); for (const dx of [-.4, .4]) box(base, MAIN_X + dx, .08, (MAIN_Z0 + MAIN_Z1) / 2, .1, .12, MAIN_Z1 - MAIN_Z0, I);
    { const pipe = cyl(base, MAIN_X, .02, (MAIN_Z0 + MAIN_Z1) / 2, .15, MAIN_Z1 - MAIN_Z0, mats.copper); pipe.rotation.x = Math.PI / 2; }
    for (let z = MAIN_Z0 + .6; z < MAIN_Z1; z += 1.6) torus(base, MAIN_X, .01, z, .16, .03, G);
    // THE DIRECTORATE'S PIPE: the Boiler manifold to the yard, overhead, metered by one valve.
    { const run = cyl(base, PIPE_X, PIPE_Y, 30.4, .2, 15.6, O.iron); run.rotation.x = Math.PI / 2; for (const z of [24, 33]) { cyl(base, PIPE_X + .5, PIPE_Y / 2, z, .07, PIPE_Y, O.iron); box(base, PIPE_X + .25, PIPE_Y - .12, z, .6, .1, .12, O.iron); }
      for (const z of [22.6, 38.2]) { cyl(base, PIPE_X, PIPE_Y - .9, z, .2, 1.8, O.iron); torus(base, PIPE_X, PIPE_Y, z, .24, .05, O.rust).rotation.x = Math.PI / 2; } }
    cyl(base, VALVE.x, PIPE_Y / 2, VALVE.z, .22, PIPE_Y, O.iron); for (const y of [.3, 2.5, 3.0]) cyl(base, VALVE.x, y, VALVE.z, .3, .08, O.iron);
    { const wheel = new T.Group(); wheel.position.set(VALVE.x - .3, 1.3, VALVE.z); wheel.rotation.y = Math.PI / 2; base.add(wheel); torus(wheel, 0, 0, 0, .42, .04, O.iron); for (let k = 0; k < 3; k++) box(wheel, 0, 0, 0, .84, .04, .04, O.iron).rotation.z = k * Math.PI / 3; cyl(wheel, 0, 0, -.1, .07, .22, O.iron).rotation.x = Math.PI / 2; }
    { const dial = cyl(base, VALVE.x - .26, 2.02, VALVE.z, .2, .05, mats.cream); dial.rotation.z = Math.PI / 2; torus(base, VALVE.x - .29, 2.02, VALVE.z, .2, .025, O.iron).rotation.y = Math.PI / 2; box(base, VALVE.x - .3, 2.02, VALVE.z, .01, .02, .15, mats.dark).rotation.x = -.5; }
    torus(base, VALVE.x - .24, .55, VALVE.z, .09, .025, G).rotation.y = Math.PI / 2; // the older socket under the wheel
    city.collider(VALVE.x, VALVE.z, .8, .8, PIPE_Y);
    this.hatch = box(live, MAIN_X, .3, 28.2, .9, .6, 1.4, mats.dark); this.hatch.visible = false;
    this.valve = box(live, VALVE.x - .3, 1.2, VALVE.z, .9, 2.4, 1.2, mats.dark); this.valve.visible = false;
    // THE RATION: cage, chain and padlock on the wheel; plates over the old main; a name plate.
    const held = this.site.layer(not(is('lineFree')));
    for (const [dx, dz] of [[-.75, -.75], [-.75, .75], [.75, -.75], [.75, .75]]) cyl(held, VALVE.x + dx, 1.25, VALVE.z + dz, .035, 2.5, O.iron);
    for (const y of [.15, 2.45]) { box(held, VALVE.x, y, VALVE.z - .75, 1.55, .06, .06, O.iron); box(held, VALVE.x, y, VALVE.z + .75, 1.55, .06, .06, O.iron); box(held, VALVE.x - .75, y, VALVE.z, .06, .06, 1.55, O.iron); }
    for (let dz = -.6; dz <= .61; dz += .3) cyl(held, VALVE.x - .75, 1.3, VALVE.z + dz, .018, 2.3, O.iron);
    for (let k = 0; k < 6; k++) torus(held, VALVE.x - .36, .9 + k * .12, VALVE.z - .2 + k * .08, .05, .014, O.iron).rotation.x = k % 2 ? Math.PI / 2 : 0;
    box(held, VALVE.x - .82, 1.45, VALVE.z + .2, .08, .14, .12, mats.brass);
    { const plate = new T.Mesh(signs.plate('RATION 40 %', .56, .18), signs.material); plate.position.set(VALVE.x - .8, 2.02, VALVE.z + .48); plate.rotation.y = -Math.PI / 2; held.add(plate);
      const name = new T.Mesh(signs.plate('RATION LINE 07 · DIRECTORATE OF LABOUR', 2.4, .36), signs.material); name.position.set(VALVE.x - .78, 2.72, VALVE.z); name.rotation.y = -Math.PI / 2; held.add(name); }
    city.collider(VALVE.x, VALVE.z, 1.6, 1.6, 2.5, undefined, () => this.facts.lineFree);
    const plates = this.site.layer(not(is('mainOpen')));
    for (let z = MAIN_Z0; z < MAIN_Z1 - .3; z += .92) { box(plates, MAIN_X, .215, z + .45, .8, .03, .86, O.iron); for (const dz of [-.34, .34]) sphere(plates, MAIN_X, .235, z + .45 + dz, .025, O.rust); }
    // THE STOKERS: chalk under the gauge and on the plates, and a stoker who knocks on the main.
    const covert = this.site.layer(when.covert(1));
    { const t = new T.Mesh(new T.PlaneGeometry(.5, .25), decalMat(tallies, .9)); t.position.set(VALVE.x - .81, 1.72, VALVE.z - .3); t.rotation.y = -Math.PI / 2; covert.add(t);
      const e = new T.Mesh(new T.PlaneGeometry(.42, .42), decalMat(emberChalk, .9)); e.rotation.x = -Math.PI / 2; e.position.set(MAIN_X, .24, 28.2); covert.add(e); }
    this.stoker = pres.addWorker(STOKER.x, STOKER.z, 2.51, 'gauge', { role: 'worker', tool: 'repair', when: () => !this.facts.lineFree });
    // THE DIRECTORATE NOTICES: pressure goes missing, so a warden signs for every hour.
    const watch = this.site.layer(is('pressureWatch'));
    box(watch, DESK.x, .95, DESK.z, .5, .06, .4, mats.wood); cyl(watch, DESK.x, .47, DESK.z, .05, .94, O.iron); box(watch, DESK.x, 1.0, DESK.z, .34, .04, .26, mats.cream);
    { const n = new T.Mesh(signs.plate('PRESSURE THEFT IS SABOTAGE', 2.2, .42), signs.material); n.position.set(PIPE_X + .5, 2.35, 24.07); watch.add(n); box(watch, PIPE_X + .5, 2.35, 24.02, 2.28, .5, .04, O.green); }
    box(watch, VALVE.x - .8, 1.25, VALVE.z + .05, .03, .22, .16, O.oxblood); // the second seal
    this.desk = box(live, DESK.x, .7, DESK.z, .8, 1.4, .8, mats.dark); this.desk.visible = false;
    this.warden = pres.addWorker(WARDEN.x, WARDEN.z, Math.PI, 'guard', { role: 'ordinal', when: () => this.facts.pressureWatch });
    // THE KEY: forged at the yard with the cutters, carried by hand to the socket.
    this.key = new Consignment('gauge.key', 'gauge', 'gauge.valve', live, KEY, g => { box(g, 0, .38, 0, .8, .06, .36, mats.wood); for (const dx of [-.32, .32]) box(g, dx, .18, 0, .06, .36, .3, mats.wood);
        const shaft = cyl(g, 0, .47, 0, .035, .95, mats.brass); shaft.rotation.z = Math.PI / 2; box(g, -.48, .47, 0, .05, .3, .05, mats.brass); box(g, .46, .47, .05, .1, .05, .12, mats.brass); },
      () => this.facts.keyWaiting, 'A pressure key, a metre of brass. Get it to the ration valve without the warden seeing it.',
      () => this.pres.foundryWorks.watchingStock ? 'The overseer is watching the outgoing stock. Wait until he turns to his board.' : null);
    city.collider(KEY.x, KEY.z, .8, .4, .5, undefined, () => !(this.facts.keyWaiting && !this.key.carrying));
    const seated = this.site.layer(when.all(is('keyDelivered'), not(is('lineFree'))));
    { const k = cyl(seated, VALVE.x - .55, .55, VALVE.z, .035, .6, mats.brass); k.rotation.z = Math.PI / 2; box(seated, VALVE.x - .86, .55, VALVE.z, .05, .3, .05, mats.brass); }
    // THE OLD MAIN OPEN: the Boiler's pressure runs to the yard through ancient Terra.
    const open = this.site.layer(is('mainOpen')), len = MAIN_Z1 - MAIN_Z0;
    { const tube = new T.TubeGeometry(new T.LineCurve3(V(MAIN_X, .03, MAIN_Z1), V(MAIN_X, .03, MAIN_Z0)), 24, .175, 10, false), uv = tube.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len);
      open.add(new T.Mesh(tube, flowMaterial(ancient.aether, 'aether', .85, this.clock))); torus(open, MAIN_X, .03, MAIN_Z0, .21, .045, G); }
    // LIBERATION: the stokers' station, chained open, a brazier for both yards.
    const free = this.site.layer(is('lineFree'));
    for (const [dx, dz] of [[-.75, .75], [.75, .75], [.75, -.75]]) cyl(free, VALVE.x + dx, 1.25, VALVE.z + dz, .035, 2.5, O.iron);
    { const door = new T.Group(); door.position.set(VALVE.x - .75, 0, VALVE.z - .75); door.rotation.y = -1.9; free.add(door); for (let dz = .15; dz < 1.5; dz += .3) cyl(door, 0, 1.3, dz, .018, 2.3, O.iron); }
    for (let k = 0; k < 5; k++) torus(free, VALVE.x - 1.1 + k * .1, .03, VALVE.z - .4 + k * .05, .05, .014, O.iron).rotation.x = Math.PI / 2;
    { const name = new T.Mesh(signs.plate('THE BREATHING MAIN', 2, .42, 'ivory'), signs.material); name.position.set(VALVE.x - .78, 2.72, VALVE.z); name.rotation.y = -Math.PI / 2; free.add(name); }
    cyl(free, 27.6, .35, 29.8, .32, .7, O.iron); sphere(free, 27.6, .78, 29.8, .24, mats.glow); city.collider(27.6, 29.8, .8, .8, .9, undefined, () => !this.facts.lineFree);
    const lineFree = () => this.facts.lineFree;
    for (const [x, z, yaw, role] of [[26.8, 29.2, 2.2, 'worker'], [28.4, 29.1, -2.3, 'engineer'], [27.7, 30.8, Math.PI, 'courier']] as const) pres.addWorker(x, z, yaw, 'warm', { role, when: lineFree });
    this.targets.push({ object: this.hatch, spot: 'main', label: 'Plated pressure main', hint: 'KNOCK' }, { object: this.valve, spot: 'valve', label: 'Ration valve', hint: 'EXAMINE' },
      { object: this.desk, spot: 'station', label: 'Warden’s logbook', hint: 'EXAMINE' }, { object: this.key.target, spot: 'key', label: 'Pressure key', hint: 'CARRY' });
    this.site.seal();
  }
  /** The warden's reach: the yard is lamplit by day, murky by night. */
  get range() { return this.night > .5 ? 7 : 9; }
  private get eyes() { return this.pres.workers[this.warden].person.group; }
  get watching() { return this.facts.pressureWatch && inView(this.pres.city, this.eyes, this.viewer, this.range, .75); }
  sync(view: SiteView) {
    this.view = view; this.facts = cityFacts(view.sites); this.site.sync(view);
    if (this.synced && this.facts.pressureWatch && !this.shownWatch) this.onAlarm('The Directorate has noticed pressure going missing from the Ration Line. A valve warden now signs for every hour, and the valve carries a second seal.');
    this.shownWatch = this.facts.pressureWatch; this.synced = true;
    const c = view.sites.gauge;
    this.pres.city.relabel(this.hatch, 'Plated pressure main', c === 0 ? 'KNOCK' : 'EXAMINE');
    this.pres.city.relabel(this.valve, this.facts.lineFree ? 'Stokers’ valve' : 'Ration valve', c === 1 ? 'SEAT THE KEY' : c === 2 ? 'TURN THE KEY' : 'EXAMINE');
    this.pres.city.relabel(this.desk, 'Warden’s logbook', c === 3 && view.sites.foundry >= 4 ? 'BREAK THE RATION' : 'EXAMINE');
  }
  setNight(v: number) { this.night = Math.max(0, Math.min(1, (v - .3) / .4)); }
  update(dt: number, time: number, viewer: T.Vector3, calm: boolean) {
    const f = this.facts, crew = this.pres.workers, city = this.pres.city; this.viewer.copy(viewer);
    this.clock.time.value = calm ? time * .35 : time; this.key.update();
    this.desk.layers.set(f.pressureWatch ? 0 : 1);
    if (f.pressureWatch) { this.attention.update(dt, time, this.eyes);
      crew[this.warden].kind = this.attention.facing(-1.51) ? 'clipboard' : this.attention.facing(.79) ? 'gauge' : 'guard';
      if (this.key.carrying && time - this.caught > 3 && inView(city, this.eyes, viewer, this.range, .75)) { this.caught = time; this.key.drop(); city.incident('contraband', viewer.x, viewer.z);
        this.onAlarm('Valve warden: “That is a pressure key. Where did you get it?” You leave it on the kerb and keep walking. A packer takes it back to the yard.'); } }
    // The stoker reads the gauge under the ration; once the knock is learned he taps the main,
    // and stops, turned away, while the warden could see him.
    if (!f.lineFree) { const st = crew[this.stoker], g = st.person.group, seen = f.pressureWatch && inView(city, this.eyes, g.position, 9, 1.0);
      st.kind = this.view.control === 0 ? 'gauge' : seen ? 'lean' : 'hammer'; const yaw = seen ? -.6 : 2.51; g.rotation.y += wrap(yaw - g.rotation.y) * Math.min(1, dt * 5); }
  }
}
