import * as T from 'three';
import { box, cyl, sphere, torus, beam, crate, mats } from './assets';
import { V, fabricOf } from './art-kit';
import { LayeredSite, when, type SiteModule, type SiteView } from './layers';
import { Patrol } from './patrol';
import { ancient, ancientMats, occupationMats, canvasTarp, lightCone, beamMat, boltCutters, stencilPlate as plate, regimeBanner, civicBanner, propaganda, sealPlaque, stencilPlate, emberChalk, emberPaint, medallion, grime, printedMat, decalMat, flowMaterial, flowClock, strip, signs } from './factions';
import type { Presentation } from './presentation';
import { SITE_LIBERATED, SITE_RESTORED } from '../simulation/economy';

/** Market Square in strata. Underneath it all: the Saelspring and the Sael Gate, pale
 * stone, turquoise and gold from the sky city Terra was before the Ordinance. Over it:
 * a checkpoint gallery bolted across the gate, banners, a caged and sealed spring,
 * iron plates over the water channels, a patrol. The Copper Finch cellar hides the
 * Embers. Liberation strips the occupation off the same stones; restoration wakes
 * the water and aether that run from the spring to the gate. */
const SX = 0, SZ = -31, GZ = -35.35, PX = 10.8, SPRING_Y = 8.2, CELLAR = { x: -12.75, z: -23.6 };
const up = V(0, 1, 0);
/** Gothic-leaning ellipse: pointed at the crown by k, springing vertically at the piers. */
const archY = (t: number, rise: number, k = .22) => rise * Math.sqrt(Math.max(0, 1 - t * t)) * (1 + k * (1 - Math.abs(t))) / (1 + k);
const archCurve = (half: number, rise: number, from: number, to: number, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const t = from + (to - from) * i / n; return new T.Vector2(t * half, SPRING_Y + archY(t, rise)); });

export class MarketSquare implements SiteModule {
  private spoke = 0;
  id = 'market' as const; targets: SiteModule['targets'] = []; anchor = { x: 0, z: -37, rotation: 0 };
  /** The posted officer at the Sael Gate (a worker index), whom the ward call's report is made to. */ readonly officer: number; site: LayeredSite; patrol: Patrol; view: SiteView = { control: 0, stage: 0, levels: {} as SiteView['levels'], sites: {} as SiteView['sites'] };
  wake = 0; night = 0; private shown = -1; private waking = false;
  private petals: T.Group[] = []; private core: T.Mesh; private halo: T.Group; private disc: T.Group; private discFace: T.Mesh;
  private yoke = new T.Group();
  springTarget!: T.Mesh; cellarTarget!: T.Mesh;
  constructor(public pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root); this.site = new LayeredSite(root);
    const base = this.site.layer(when.always), live = this.site.layer(when.always, false);
    // ANCIENT TERRA ------------------------------------------------------------------
    const I = ancientMats.ivory, G = ancientMats.gold, Q = ancientMats.turquoise;
    const med = new T.Mesh(new T.CircleGeometry(5.2, 64), printedMat(medallion)); med.rotation.x = -Math.PI / 2; med.position.set(SX, .112, SZ); base.add(med);
    const basin = new T.Mesh(new T.LatheGeometry([[1.55, .12], [1.55, .5], [1.63, .58], [1.98, .58], [2.03, .52], [1.94, .44], [1.96, .1], [2.06, 0]].map(([r, y]) => new T.Vector2(r, y)), 40), I); basin.position.set(SX, .05, SZ); base.add(basin);
    torus(base, SX, .64, SZ, 1.8, .035, G).rotation.x = Math.PI / 2;
    const floor = new T.Mesh(new T.CircleGeometry(1.56, 32), ancientMats.tile); floor.rotation.x = -Math.PI / 2; floor.position.set(SX, .17, SZ); const fuv = floor.geometry.attributes.uv; for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fuv.getX(i) * 3, fuv.getY(i) * 3); base.add(floor);
    cyl(base, SX, .38, SZ, .5, .44, I); cyl(base, SX, 1.36, SZ, .15, 1.6, I); for (const y of [.9, 1.8]) torus(base, SX, y, SZ, .19, .04, G).rotation.x = Math.PI / 2;
    const cup = new T.Mesh(new T.LatheGeometry([[0, 0], [.22, .02], [.42, .16], [.5, .3], [.46, .33]].map(([r, y]) => new T.Vector2(r, y)), 24), G); cup.position.set(SX, 2.08, SZ); base.add(cup);
    cyl(base, SX, 3.25, SZ, .025, .7, G); sphere(base, SX, 3.64, SZ, .06, G);
    city.collider(SX, SZ, 4.1, 4.1, .62);
    // The finial wakes: petals open, the core lights, a gold ring turns.
    for (let i = 0; i < 6; i++) { const pivot = new T.Group(); pivot.position.set(SX, 2.3, SZ); pivot.rotation.y = i * Math.PI / 3; live.add(pivot); const tilt = new T.Group(); tilt.position.z = .26; pivot.add(tilt); const petal = sphere(tilt, 0, .42, 0, 1, Q); petal.scale.set(.15, .46, .045); this.petals.push(tilt); }
    this.core = sphere(live, SX, 2.72, SZ, .2, ancientMats.dormant); this.halo = new T.Group(); this.halo.position.set(SX, 2.72, SZ); live.add(this.halo); torus(this.halo, 0, 0, 0, .44, .025, G);
    // Water channels: turquoise tile between ivory curbs, north up the market and south to the gate.
    const channel = (z0: number, z1: number) => { const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2; box(base, SX, .094, zc, .52, .01, len, ancientMats.tile); for (const dx of [-.32, .32]) box(base, SX + dx, .085, zc, .12, .09, len, I); };
    channel(-29.05, -14.5); channel(-32.95, GZ + .15); torus(base, SX, .1, -14.5, .34, .05, G).rotation.x = Math.PI / 2;
    box(base, SX, .1, GZ, 20.3, .08, .2, G);
    // The Sael Gate: slender ivory piers with turquoise panels and a pointed ring,
    // a gold keystone with swept fins, and a sun-disc hung in the opening.
    for (const s of [-1, 1]) { const x = s * PX; box(base, x, .3, GZ, 1.9, .6, 1.9, I); box(base, x, 4.4, GZ, 1.3, 7.6, 1.3, I); box(base, x, 8.07, GZ, 1.62, .26, 1.62, G); box(base, x, .66, GZ, 1.5, .12, 1.5, G);
      for (const f of [-1, 1]) { box(base, x, 4.3, GZ + f * .66, .62, 5.4, .04, Q); box(base, x, 7.05, GZ + f * .67, .74, .06, .04, G); box(base, x, 1.55, GZ + f * .67, .74, .06, .04, G); }
      city.collider(x, GZ, 1.9, 1.9, 9); }
    const ring = new T.Shape(archCurve(11.45, 6.2, -1, 1)); for (const p of archCurve(10.15, 5.2, 1, -1)) ring.lineTo(p.x, p.y); ring.closePath();
    const arch = new T.Mesh(new T.ExtrudeGeometry(ring, { depth: 1.1, bevelEnabled: false }), I); arch.position.z = GZ - .55; base.add(arch);
    for (const f of [-1, 1]) { const band = new T.Shape(archCurve(10.93, 5.8, -1, 1)); for (const p of archCurve(10.71, 5.62, 1, -1)) band.lineTo(p.x, p.y); band.closePath(); const inlay = new T.Mesh(new T.ExtrudeGeometry(band, { depth: .04, bevelEnabled: false }), Q); inlay.position.z = GZ + f * .56 - (f < 0 ? .04 : 0); base.add(inlay); }
    const crownY = SPRING_Y + 6.2; box(base, 0, crownY - .35, GZ, .78, 1.3, 1.24, G); cyl(base, 0, crownY + 1.05, GZ, .05, 1.6, G); sphere(base, 0, crownY + 1.9, GZ, .14, G);
    for (const s of [-1, 1]) for (const [reach, lift, r] of [[1.9, 1.2, .07], [1.2, .6, .05]]) base.add(new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(V(0, crownY + .2, GZ), V(s * reach * .45, crownY - .1, GZ), V(s * reach, crownY + lift, GZ)), 14, r, 5), G));
    cyl(base, 0, crownY - 1.5, GZ, .03, 1.1, G);
    this.disc = new T.Group(); this.disc.position.set(0, crownY - 3.05, GZ); live.add(this.disc); torus(this.disc, 0, 0, 0, .95, .07, G); this.discFace = new T.Mesh(new T.CircleGeometry(.78, 32), ancientMats.dormant); this.disc.add(this.discFace);
    // A sentry box the Ordinance planted at the gate. It outlives them.
    box(base, 10.85, 1.2, -32.9, 1.15, 2.3, 1.15, occupationMats.iron); const cap = new T.Mesh(new T.ConeGeometry(.95, .55, 4), occupationMats.green); cap.rotation.y = Math.PI / 4; cap.position.set(10.85, 2.62, -32.9); base.add(cap);
    box(base, 10.85, 1.75, -32.31, .7, .16, .03, mats.dark); box(base, 10.26, 1.05, -32.9, .03, 1.9, .7, mats.dark); city.collider(10.85, -32.9, 1.3, 1.3, 2.7);
    for (const x of [-6.75, 6.75]) { box(base, x, .6, GZ + .45, .3, 1.2, .3, occupationMats.iron); sphere(base, x, 1.25, GZ + .45, .12, occupationMats.iron); city.collider(x, GZ + .45, .4, .4, 1.3); }
    // The Copper Finch cellar: a sloped bulkhead at the corner that faces the square.
    box(base, CELLAR.x, .2, CELLAR.z, 1.34, .4, 1.56, mats.stone); city.collider(CELLAR.x, CELLAR.z, 1.4, 1.6, .75);
    const hatch = new T.Group(); hatch.position.set(CELLAR.x, .52, CELLAR.z); hatch.rotation.z = -.38; base.add(hatch); for (const dz of [-.36, .36]) box(hatch, 0, .045, dz, 1.3, .03, .06, mats.iron); box(hatch, 0, .05, 0, 1.3, .02, .03, mats.iron);
    this.cellarTarget = box(live, CELLAR.x, .52, CELLAR.z, 1.34, .06, 1.44, mats.wood); this.cellarTarget.rotation.z = -.38;
    // ECONOMIC CONDITION -------------------------------------------------------------
    // The merchants wash the square once trade returns; soot is a Lowworks problem, not a political one.
    const dirty = this.site.layer(when.business('market', l => l < 2));
    const soot = new T.Mesh(new T.CircleGeometry(5.6, 40), decalMat(grime, 1)); soot.rotation.x = -Math.PI / 2; soot.position.set(SX, .118, SZ); dirty.add(soot);
    for (const s of [-1, 1]) for (const f of [-1, 1]) box(dirty, s * PX, 6.2, GZ + f * .661, .9, 3.6, .01, pres.soot);
    // OCCUPATION ---------------------------------------------------------------------
    const occ = this.site.layer(when.occupied), occLive = this.site.layer(when.occupied, false), O = occupationMats;
    // The checkpoint gallery: a riveted iron box bolted across the ancient arch.
    box(occ, 0, 7.25, GZ, 20.3, 2.1, 1.7, O.iron); box(occ, 0, 8.38, GZ, 20.6, .16, 1.9, O.green); box(occ, 0, 6.14, GZ, 20.6, .12, 1.8, O.green);
    for (let x = -9.9; x <= 9.9; x += 2.475) box(occ, x, 7.25, GZ, .14, 2.12, 1.76, O.green);
    for (let x = -9.8; x <= 9.8; x += .7) for (const f of [-1, 1]) for (const y of [6.32, 8.18]) sphere(occ, x, y, GZ + f * .86, .045, O.rust);
    for (const s of [-1, 1]) for (const f of [-1, 1]) beam(occ, V(s * 9.4, 6.15, GZ + f * .6), V(s * 10.12, 4.5, GZ + f * .6), .07, O.iron);
    const board = new T.Mesh(new T.PlaneGeometry(14, 1.86), printedMat(propaganda.board)); board.position.set(0, 7.25, GZ + .861); occ.add(board);
    const back = new T.Mesh(signs.plate('ORDINANCE CHECKPOINT 07', 5, .62), signs.material); back.position.set(0, 7.3, GZ - .861); back.rotation.y = Math.PI; occ.add(back);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) box(occ, s * (5 + k * 1.1), 7.2, GZ - .86, .5, .14, .03, mats.dark);
    for (const s of [-1, 1]) { const b = new T.Mesh(new T.PlaneGeometry(1.15, 4.8), printedMat(regimeBanner, true)); b.position.set(s * PX, 5.25, GZ + .69); occ.add(b); box(occ, s * PX, 7.72, GZ + .72, 1.45, .07, .07, O.iron); for (const dx of [-.72, .72]) sphere(occ, s * PX + dx, 7.72, GZ + .72, .06, O.iron); }
    // The spring caged and sealed: plated below, barred above, a wax-red seal facing the market.
    for (const [dx, dz] of [[-.56, -.56], [.56, -.56], [-.56, .56], [.56, .56]]) cyl(occ, SX + dx, 2.02, SZ + dz, .05, 2.84, O.iron);
    for (const f of [-1, 1]) { box(occ, SX, 1.3, SZ + f * .57, 1.14, 1.3, .03, O.iron); box(occ, SX + f * .57, 1.3, SZ, .03, 1.3, 1.14, O.iron); }
    for (const y of [.66, 1.98, 3.42]) for (const f of [-1, 1]) { box(occ, SX, y, SZ + f * .57, 1.18, .1, .05, O.green); box(occ, SX + f * .57, y, SZ, .05, .1, 1.18, O.green); }
    for (let k = -2; k <= 2; k++) for (const f of [-1, 1]) { cyl(occ, SX + k * .21, 2.7, SZ + f * .57, .018, 1.44, O.iron); cyl(occ, SX + f * .57, 2.7, SZ + k * .21, .018, 1.44, O.iron); }
    box(occ, SX, 3.5, SZ, 1.24, .08, 1.24, O.iron); const roof = new T.Mesh(new T.ConeGeometry(.9, .4, 4), O.green); roof.rotation.y = Math.PI / 4; roof.position.set(SX, 3.74, SZ); occ.add(roof);
    const seal = new T.Mesh(new T.PlaneGeometry(.66, .66), printedMat(sealPlaque)); seal.position.set(SX, 1.34, SZ + .59); occ.add(seal);
    // Iron plates bolted over the water channels: the Ordinance paved over the old city.
    const plates = (z0: number, z1: number) => { for (let z = z0; z > z1 + .2; z -= .9) { const zc = z - .44; box(occ, SX, .135, zc, .98, .03, .86, O.iron); for (const dx of [-.4, .4]) for (const dz of [-.36, .36]) sphere(occ, SX + dx, .152, zc + dz, .025, O.rust); } };
    plates(-14.5, -29.05); plates(-32.95, GZ + .15);
    // The checkpoint boom, raised for carts, banded in occupation colours.
    for (const x of [-6.75, 6.75]) box(occ, x, .95, GZ + .45, .32, .14, .32, O.oxblood);
    { const pivot = V(6.75, 1.2, GZ + .2), dir = V(-Math.cos(1.25), Math.sin(1.25), 0); for (let k = 0; k < 6; k++) beam(occ, pivot.clone().addScaledVector(dir, k), pivot.clone().addScaledVector(dir, k + 1), .07, k % 2 ? O.bone : O.oxblood); box(occ, 7.1, 1.05, GZ + .2, .5, .35, .3, O.iron); }
    box(occ, 10.85, 1.55, -32.9, 1.18, .18, 1.18, O.oxblood); const s07 = new T.Mesh(signs.plate('07', .6, .3), signs.material); s07.position.set(10.85, 2.1, -32.31); occ.add(s07);
    // Searchlight on the gallery: at night it sweeps the square.
    this.yoke.position.set(5.2, 8.46, GZ); occLive.add(this.yoke); cyl(this.yoke, 0, .15, 0, .28, .3, O.iron);
    const aim = new T.Group(); aim.position.y = .55; aim.rotation.x = -.98; this.yoke.add(aim); cyl(aim, 0, 0, 0, .36, .6, O.iron); cyl(aim, 0, -.31, 0, .3, .03, mats.glow);
    lightCone(aim, 2.4, 18).position.y = -.32;
    // Two soldiers: one holds the boom, one walks the beat between the gate and the Finch.
    this.officer = pres.addWorker(5.75, GZ + .8, 0, 'guard', { role: 'ordinal', when: () => this.view.control < SITE_LIBERATED });
    const beat = pres.addWorker(-1.25, -13.8, Math.PI, 'walk', { role: 'ordinal', when: () => this.view.control < SITE_LIBERATED });
    this.patrol = new Patrol(city, pres.workers[beat], [[-1.25, -13.8], [-1.25, -26.9], [-3.45, -29.3], [-3.45, -32.9], [-1.6, -34.6]].map(([x, z]) => new T.Vector2(x, z)), pres.root);
    this.patrol.hot.push({ x: CELLAR.x, z: CELLAR.z, r: 3.4 });
    this.patrol.onConfront = () => { const actor = pres.workers[beat].person, o = city.incident('minor', actor.group.position.x, actor.group.position.z); actor.tone = { tone: o.tier >= 2 ? 'hostile' : 'authoritative', until: performance.now() / 1000 + 1e9 }; this.spoke = 5; };
    // THE EMBERS ----------------------------------------------------------------------
    // Invitation: once the Finch reopens, someone chalks an ember on its cellar door.
    const invite = this.site.layer(v => v.control >= 1 || v.levels.tavern >= 1);
    { const g = new T.Group(); g.position.set(CELLAR.x, .52, CELLAR.z); g.rotation.z = -.38; invite.add(g); const m = new T.Mesh(new T.PlaneGeometry(.95, .95), decalMat(emberChalk, 1)); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.position.y = .035; g.add(m); }
    const c1 = this.site.layer(when.covert(1)), c2 = this.site.layer(when.covert(2)), c3 = this.site.layer(when.covert(3));
    // 1: the cellar keeps a lamp with turquoise glass, the old colour, and a lookout.
    { const x = -13.05, y = 2.35, z = -24.4; beam(c1, V(-13.5, y + .32, z), V(x, y + .32, z), .025, mats.iron); cyl(c1, x, y + .24, z, .015, .16, mats.iron);
      box(c1, x, y, z, .2, .26, .2, new T.MeshStandardMaterial({ color: ancient.aether, emissive: ancient.turquoise, emissiveIntensity: 1.5 })); const hood = new T.Mesh(new T.ConeGeometry(.19, .14, 4), mats.iron); hood.rotation.y = Math.PI / 4; hood.position.set(x, y + .18, z); c1.add(hood); box(c1, x, y - .15, z, .24, .04, .24, mats.iron); }
    pres.addWorker(-11.7, -22.3, Math.PI / 2 + .4, 'read', { role: 'courier', tool: 'read', when: () => this.view.control >= 1 && this.view.control < SITE_LIBERATED });
    // 2: "WITHOUT US TERRA FALLS", in chalk on the hoarding; couriers cross the square.
    const chalk = new T.Mesh(new T.PlaneGeometry(14, 1.86), decalMat(propaganda.defaced, .92)); chalk.position.set(0, 7.25, GZ + .87); c2.add(chalk);
    crate(c2, 12, 0, -26.1, .8); { const m = new T.Mesh(new T.PlaneGeometry(.5, .5), decalMat(emberChalk, .9)); m.position.set(11.59, .42, -26.1); m.rotation.y = -Math.PI / 2; c2.add(m); } city.collider(12, -26.1, .9, .9, .9, undefined, () => !c2.visible);
    pres.addWorker(10.9, -19.6, -Math.PI / 2, 'carry', { role: 'courier', path: [-10.4, -19.6, .45], when: () => this.view.control >= 2 && this.view.control < SITE_LIBERATED });
    // 3: tools under a tarp beside the hatch, and turquoise ribbons on the lamps as a signal.
    box(c3, -12.95, .3, -25.9, .86, .6, 1.8, mats.wood); box(c3, -13.0, .78, -26.1, .7, .36, 1.3, mats.wood); for (const z of [-26.6, -25.2]) box(c3, -12.51, .3, z, .02, .62, .08, mats.brass);
    const tarp = box(c3, -12.97, .99, -26.25, .96, .05, 1.2, canvasTarp); tarp.rotation.set(.06, 0, .08); const flap = box(c3, -12.5, .66, -26.3, .03, .62, 1.1, canvasTarp); flap.rotation.x = .05; city.collider(-12.95, -25.9, 1.1, 2, 1.3, undefined, () => !c3.visible);
    for (const x of [-9.8, 9.8]) { const rib = fabricOf(Q); box(c3, x, 3.35, -19, .05, .55, .1, rib); box(c3, x + .03, 3.1, -19.04, .04, .4, .08, rib); torus(c3, x, 3.62, -19, .1, .025, rib).rotation.y = Math.PI / 2; }
    // LIBERATION ----------------------------------------------------------------------
    const lib = this.site.layer(when.liberated);
    for (const s of [-1, 1]) { const b = new T.Mesh(new T.PlaneGeometry(1.15, 4.8), printedMat(civicBanner, true)); b.position.set(s * PX, 5.25, GZ + .69); lib.add(b); box(lib, s * PX, 7.72, GZ + .72, 1.45, .07, .07, G); for (const dx of [-.72, .72]) sphere(lib, s * PX + dx, 7.72, GZ + .72, .07, G); }
    for (let k = 0; k < 5; k++) { const p = box(lib, 12.35 + k * .09, .5, GZ + 1.35, .98, .03, .86, O.iron); p.rotation.z = 1.25; }
    for (const x of [-6.75, 6.75]) { const rib = fabricOf(Q); box(lib, x, 1.05, GZ + .61, .34, .16, .02, rib); box(lib, x + .1, .75, GZ + .62, .08, .5, .02, rib); }
    { const m = new T.Mesh(new T.PlaneGeometry(.8, .8), decalMat(emberPaint, .95)); m.position.set(10.85, 1.5, -32.31); lib.add(m); const drape = box(lib, 10.85, 2.42, -32.9, 1.3, .1, 1.3, fabricOf(Q)); drape.rotation.y = .1; }
    const a = pres.addWorker(8.7, -36.9, -2.4, 'talk', { role: 'courier', when: () => this.view.control >= SITE_LIBERATED }); const b = pres.addWorker(7.9, -37.6, .7, 'talk', { role: 'worker', when: () => this.view.control >= SITE_LIBERATED }); pres.workers[a].partner = b; pres.workers[b].partner = a;
    pres.addWorker(-1.38, -29.62, -.78, 'sit', { y: .42, role: 'resident', when: () => this.view.control >= SITE_LIBERATED });
    // RESTORATION: the circuit ---------------------------------------------------------
    // Every strip carries its distance from the spring, so the wake travels in order:
    // basin and jets, the channels, the gate threshold, up the piers and around the arch.
    const flow = this.site.layer(when.restored), water = flowMaterial(ancient.water, 'water', .82), aether = flowMaterial(ancient.aether, 'aether', .95);
    { const pool = new T.Mesh(new T.CircleGeometry(1.56, 40), water); pool.rotation.x = -Math.PI / 2; pool.position.set(SX, .46, SZ); const pp = pool.geometry.attributes.position, pu = pool.geometry.attributes.uv; for (let i = 0; i < pu.count; i++) pu.setXY(i, Math.hypot(pp.getX(i), pp.getY(i)) * .8, .5); flow.add(pool); }
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a); const tube = new T.TubeGeometry(new T.QuadraticBezierCurve3(V(SX + c * .42, 2.6, SZ + s * .42), V(SX + c * 1.15, 3.05, SZ + s * 1.15), V(SX + c * 1.38, .47, SZ + s * 1.38)), 16, .032, 5); const tu = tube.attributes.uv; for (let k = 0; k < tu.count; k++) tu.setX(k, .15 + tu.getX(k) * 1.1); flow.add(new T.Mesh(tube, water)); }
    for (const [z0, z1] of [[-29.05, -14.5], [-32.95, GZ + .1]]) { flow.add(strip([V(SX, .118, z0), V(SX, .118, z1)], up, .44, 1.95, water).mesh); flow.add(strip([V(SX, .123, z0), V(SX, .123, z1)], up, .13, 1.95, aether).mesh); }
    for (const s of [-1, 1]) { let d = strip([V(0, .146, GZ), V(s * 10.12, .146, GZ)], up, .12, 4.35, aether); flow.add(d.mesh);
      d = strip([V(s * 10.13, .15, GZ), V(s * 10.13, SPRING_Y, GZ)], V(-s, 0, 0), .16, d.end, aether); flow.add(d.mesh);
      for (const f of [-1, 1]) flow.add(strip(archCurve(10.82, 5.71, s, 0, 24).map(p => V(p.x, p.y, GZ + f * .59)), V(0, 0, f), .36, d.end, aether).mesh); }
    // The network: once the Foundry's cutters have been carried down Cinder Row, the same crate
    // waits by the Finch cellar, and after the square rises they lie by the plates they took off the gate.
    const cutters = this.site.layer(when.all(when.fact('cuttersDelivered'), when.occupied));
    for (let k = 0; k < 3; k++) boltCutters(cutters, -13.28, .05, -24.95 + k * .16, Math.PI / 2, .22); crate(cutters, -12.2, 0, -24.85, .62);
    { const m = new T.Mesh(signs.plate('CINDER No. 3', .56, .2), signs.material); m.position.set(-11.88, .42, -24.85); m.rotation.y = Math.PI / 2; cutters.add(m); } city.collider(-12.2, -24.85, .7, .7, .7, undefined, () => !cutters.visible);
    for (let k = 0; k < 2; k++) boltCutters(lib, 12.1, .08, GZ + 2.1 + k * .35, 0, 1.5);
    this.springTarget = new T.Mesh(new T.CylinderGeometry(.8, .8, 3.2, 8), mats.dark); this.springTarget.position.set(SX, 1.9, SZ); this.springTarget.visible = false; live.add(this.springTarget);
    const restored = () => this.view.control >= SITE_RESTORED;
    pres.addWorker(-1.6, -33.6, .56, 'watch', { role: 'resident', scale: .72, when: restored }); pres.addWorker(-2.25, -34.15, .5, 'watch', { role: 'resident', when: restored });
    this.targets.push({ object: this.cellarTarget, spot: 'cell', label: 'Copper Finch cellar', hint: 'KNOCK' }, { object: this.springTarget, spot: 'spring', label: 'Ordinance seal', hint: 'EXAMINE' });
    this.site.seal();
  }
  sync(view: SiteView) {
    const was = this.shown; this.view = view; this.shown = view.control; this.site.sync(view);
    if (view.control >= SITE_RESTORED) { if (was === SITE_RESTORED - 1) { this.wake = 0; this.waking = true; this.pres.city.onEvent('The seal is off. Water rises in the old basin, and the light runs out along the stones to the gate. Terra is older than anyone was told.'); } else if (!this.waking) this.wake = 1; }
    else { this.wake = 0; this.waking = false; }
    if (view.control >= SITE_LIBERATED) this.patrol.hide();
    this.pres.city.relabel(this.springTarget, view.control >= SITE_RESTORED ? 'The Saelspring' : view.control >= SITE_LIBERATED ? 'Dormant spring' : 'Ordinance seal', view.control >= SITE_RESTORED ? 'LISTEN' : 'EXAMINE');
  }
  get watching() { return this.view.control < SITE_LIBERATED && this.patrol.watching; }
  /** Replays the restoration from a dry basin. Developer review only. */
  replayWake() { if (this.view.control >= SITE_RESTORED) { this.wake = 0; this.waking = true; } }
  setNight(v: number) { this.night = Math.max(0, Math.min(1, (v - .3) / .4)); }
  update(dt: number, time: number, viewer: T.Vector3, calm: boolean) {
    flowClock.time.value = calm ? time * .35 : time;
    if (this.waking) { this.wake = Math.min(1, this.wake + dt / 9); if (this.wake >= 1) this.waking = false; }
    flowClock.front.value = this.wake >= 1 ? 1e3 : this.wake * 40;
    const open = T.MathUtils.smoothstep(this.wake, 0, .22), lit = this.wake > .02;
    for (const p of this.petals) p.rotation.x = T.MathUtils.lerp(-.12, .78, open);
    this.core.material = lit ? ancientMats.awake : ancientMats.dormant; this.discFace.material = this.wake > .88 ? ancientMats.awake : ancientMats.dormant;
    if (lit) { this.halo.rotation.y += dt * (calm ? .2 : .7); this.halo.rotation.x = .35; this.disc.rotation.y = Math.sin(time * .3) * (calm ? .1 : .35); this.core.position.y = 2.72 + Math.sin(time * 1.3) * .04; }
    if (this.view.control < SITE_LIBERATED) { this.yoke.rotation.y = Math.sin(time * .21) * 1.05; beamMat.opacity = this.night * .2; { const here = this.patrol.city.social.get('market')!; this.patrol.risk = Math.max(.4, here.risk * (here.enforcement === 'none' ? 1 : 1.6)); } this.patrol.update(dt, time, viewer); if (this.spoke > 0) { this.spoke -= dt; if (this.spoke <= 0) this.patrol.actor.person.tone = undefined; } }
  }
}
