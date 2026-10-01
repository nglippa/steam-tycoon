import * as T from 'three';
import { box, cyl, sphere, torus, beam, sign, bake, mats, barrel, tree, crate } from './assets';
import { V, cable, bench, artMats, labeledCrate, gauge, canopy } from './art-kit';
import { ancientMats, occupationMats, regimeBanner, civicBanner, emberChalk, tallies, sealPlaque, printedMat, decalMat, lightCone, canvasTarp, flowMaterial, strip } from './factions';
import { ladder, stair, parapet, examine } from './routes';
import { SITE_LIBERATED } from '../simulation/economy';
import type { Presentation } from './presentation';
import type { City } from './city';

/** THE WEATHERSIDE. The strip behind the west housing row, between the back yards and the
 * ward wall, where Terra's edge is closest. Three small places share one back lane:
 *
 *   Tether Yard     (south)  freight pier past the rim, the great crane, a moored freighter
 *   Weatherside     (middle) the Ordinance registry, the old garden, the Weathervane tower
 *   Old Waterworks  (north)  the cistern, the sealed gate, the aqueduct that feeds them
 *
 * The aqueduct is the spine: its channel can be walked from the cistern roof, across the
 * old hall, over the garden and onto the registry's roof. Everything here is authored
 * once; who holds the city (Market Square's control) decides the dressing. */
const G = .18, ROOF = 6.1, LANE = -62, AQ = -66.5, BONE = '#cbbf9f';
const I = ancientMats.ivory, GOLD = ancientMats.gold, O = occupationMats;
const chalk = decalMat(emberChalk, .92), tally = decalMat(tallies, .9), regime = printedMat(regimeBanner, true), civic = printedMat(civicBanner, true), seal = printedMat(sealPlaque);
/** The Ordinance's survey of what it calls foundation stabilisers: seven marks on Terra's keel, three ringed. */
const surveySheet = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 384; const x = c.getContext('2d')!;
  x.fillStyle = '#d9cfb2'; x.fillRect(0, 0, 512, 384); x.strokeStyle = '#2b3336'; x.lineWidth = 3; x.strokeRect(14, 14, 484, 356);
  x.beginPath(); x.moveTo(60, 150); x.quadraticCurveTo(256, 60, 452, 150); x.lineTo(430, 190); x.quadraticCurveTo(256, 300, 82, 190); x.closePath(); x.stroke();
  x.font = '700 15px "Courier New",monospace'; x.fillStyle = '#2b3336'; x.fillText('SURVEY 14 · FOUNDATION STABILISERS', 30, 44); x.font = '700 12px "Courier New",monospace';
  for (let k = 0; k < 7; k++) { const t = k / 6, px = 96 + t * 320, py = 218 + Math.sin(t * Math.PI) * 44; x.beginPath(); x.arc(px, py, 5, 0, Math.PI * 2); x.fill(); x.fillText('FS-' + (k + 1), px - 14, py + 26); if (k === 0 || k === 2 || k === 5) { x.strokeStyle = '#5c2228'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 14, 0, Math.PI * 2); x.stroke(); } }
  x.save(); x.translate(376, 318); x.rotate(-.14); x.strokeStyle = '#5c2228'; x.fillStyle = '#5c2228'; x.lineWidth = 4; x.strokeRect(-92, -22, 184, 44); x.font = '900 24px "Courier New",monospace'; x.textAlign = 'center'; x.fillText('DO NOT LOAD', 0, 9); x.restore();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return printedMat(t); })();
const EAST = Math.PI / 2, WEST = -Math.PI / 2, UP = new T.Vector3(0, 1, 0);
const facing = (m: T.Object3D, yaw: number) => { m.rotation.y = yaw; return m; };
const decal = (g: T.Object3D, m: T.Material, w: number, h: number, x: number, y: number, z: number, yaw = 0) => { const q = new T.Mesh(new T.PlaneGeometry(w, h), m); q.position.set(x, y, z); q.rotation.y = yaw; g.add(q); return q; };

/** One length of the aqueduct's channel: the trough that is walked, and its low walls. */
function trough(s: T.Object3D, city: City, z0: number, z1: number) { const zc = (z0 + z1) / 2, len = z1 - z0;
  box(s, AQ, 5.75, zc, 2.2, .7, len, I); box(s, AQ, 5.32, zc, 1.5, .2, len, GOLD); for (const x of [AQ - 1.05, AQ + 1.05]) box(s, x, 6.35, zc, .2, .5, len, I); city.deck(AQ - 1.1, AQ + 1.1, z0, z1, ROOF); }
const channelWall = (city: City, x: number, z0: number, z1: number) => city.collider(x, (z0 + z1) / 2, .3, z1 - z0, ROOF + .65, undefined, undefined, ROOF - .2);
function pier(s: T.Object3D, city: City, z: number) { box(s, AQ, 2.7, z, 1.3, 5.4, 1.3, I); box(s, AQ, .5, z, 1.7, 1, 1.7, I); box(s, AQ, 4.9, z, 1.45, .3, 1.45, GOLD);
  for (const dz of [-1, 1]) box(s, AQ, 5.05, z + dz * 1.1, 1.2, .9, 1.4, I).rotation.x = dz * .5; city.collider(AQ, z, 1.4, 1.4, 5.4); }

export class Weatherside {
  root = new T.Group();
  /** Unbaked: interaction targets and anything that moves. */
  private live = new T.Group(); private occupied = new T.Group(); private freed = new T.Group();
  private details: { g: T.Group; x: number; z: number }[] = []; private ground: T.Group[] = [];
  /** All the ward's fixed massing behind the housing row: one group, one draw per material. */
  private shell = new T.Group();
  /** What 'Aether induction' wakes: the old works take the light back, and the Weathervane answers the eastern isle. */
  private aether = new T.Group(); private ray!: T.Mesh;
  /** What the Anchor survey lights: the third stud on the Weathervane. */
  private anchored = new T.Group();
  private freighter = new T.Group(); private searchlight = new T.Group(); private hook = new T.Group(); private vane = new T.Group();
  private city: City;
  /** True while the ward can be seen at all: from behind the row, from a roof, or from the arrival terrace. */
  private seen = true;
  constructor(private p: Presentation) {
    this.city = p.city; p.root.add(this.root); this.root.add(this.live, this.occupied, this.freed);
    this.root.add(this.shell); this.ground.push(this.shell);
    this.lane(); this.yard(); this.heights(); this.waterworks(); bake(this.shell);
    bake(this.occupied); bake(this.freed);
    // Added after the bake: these move.
    this.occupied.add(this.searchlight); this.root.add(this.freighter, this.hook, this.vane, this.aether, this.anchored);
    { const a = this.aether, lit = ancientMats.awake, lens = V(-71, 32.9, -28), isle = V(210, 118, -1);
      sphere(a, -73, 3, 0, .27, lit); cyl(a, -71, 32.9, -28, .74, .08, lit).rotation.z = Math.PI / 2; cyl(a, -69, 6.6, -66, 2.02, .05, lit); cyl(a, -74.42, 3.3, -52, .82, .06, lit).rotation.z = Math.PI / 2;
      // The channel carries the old light the length of the ward: a turquoise line along the aqueduct, seen from every roof.
      for (const [z0, z1] of [[-61.4, -45], [-41, 11]]) box(a, AQ, 6.14, (z0 + z1) / 2, .5, .05, z1 - z0, mats.aether); for (const z of [-55, -49, -37, -31, -6, 0, 6]) sphere(a, AQ, 5.05, z, .2, lit);
      const beamMat = new T.MeshBasicMaterial({ color: '#8af0ec', transparent: true, opacity: .3, blending: T.AdditiveBlending, depthWrite: false, fog: false });
      this.ray = new T.Mesh(new T.CylinderGeometry(1.6, .35, lens.distanceTo(isle), 8, 1, true), beamMat); this.ray.position.copy(lens).lerp(isle, .5); this.ray.quaternion.setFromUnitVectors(UP, isle.clone().sub(lens).normalize()); a.add(this.ray); }
  }
  /** `skyline` sections stand above the roofs and are always drawn; the rest only while the ward is in view. */
  private section(x: number, z: number, detail = false, skyline = false) { if (!detail && !skyline) return this.shell; const g = new T.Group(); this.root.add(g); if (detail) this.details.push({ g, x, z }); return g; }
  private get held() { return this.city.economy.state.sites.market < SITE_LIBERATED; }

  /** The back lane, and the paving that carries each vaulted passage out to it. */
  private lane() { const g = this.section(LANE, 0);
    box(g, LANE, .03, 8.5, 4, .06, 135, mats.road); for (const z of this.city.alleys) box(g, -56, .03, z, 8, .06, 3.6, mats.road);
    for (let z = -56; z < 76; z += 3) box(g, LANE + 2.1, .09, z, .16, .16, 2.9, mats.warmStone); }

  private yard() { const city = this.city, s = this.section(-67, 75), d = this.section(-65, 70, true), occ = this.occupied, p = this.p;
    box(s, -65.5, .05, 70.5, 19, .1, 25, mats.stone); for (const x of [-68.2, -66.8]) box(s, x, .13, 80, .1, .08, 38, mats.iron); city.deck(-75, -56, 78, 82, G);
    // The bonded warehouse: a blind brick shed whose roof is the first step up.
    // Solid on three sides of a bay that can be walked into through the north freight door.
    for (const [x, z, w, dd] of [[-74, 50, 2, 16], [-69.5, 44.25, 7, 4.5], [-69.5, 55.75, 7, 4.5], [-66.15, 47.35, .3, 1.7], [-66.15, 52.65, .3, 1.7]]) { box(s, x, 3.5, z, w, 7, dd, mats.darkBrick); if (w > 1) box(s, x, .6, z, w + .2, 1.2, dd + .2, mats.stone); city.collider(x, z, w, dd, 7); }
    box(s, -66.15, 5.6, 50, .3, 2.8, 3.6, mats.darkBrick); box(s, -70.5, 7, 50, 9.3, .2, 16.3, mats.stone); box(s, -69.5, .1, 50, 7, .08, 7, mats.wood);
    box(s, -65.86, 2.1, 53.4, .14, 4.2, 3.4, O.iron); box(s, -65.84, 4.35, 51.6, .1, .12, 7.2, mats.iron);
    for (const z of [55]) { box(s, -65.93, 2.1, z, .14, 4.2, 3.6, O.iron); box(s, -65.9, 4.35, z, .24, .3, 4, mats.stone); for (const dz of [-.9, .9]) box(s, -65.84, 2.1, z + dz, .06, 4, .08, mats.rust); }
    facing(sign(s, 'TETHER YARD', 'BONDED FREIGHT • WARD 07', -65.92, 5.6, 52.5, 7, 1.1), EAST);
    city.deck(-75, -66, 42, 58, 7.1);
    parapet(s, city, -75, 42, -66, 42, 7.1, mats.darkBrick); parapet(s, city, -66, 42, -66, 58, 7.1, mats.darkBrick); parapet(s, city, -75, 42, -75, 58, 7.1, mats.darkBrick); parapet(s, city, -72.4, 58, -66, 58, 7.1, mats.darkBrick);
    ladder(s, this.live, city, 'ladder.yard', 'Warehouse ladder', -66, 45, G, 7.1, 1, 0);
    // Roof: a lantern skylight, vents, and somebody's seat with a view of the customs post.
    box(s, -70.5, 7.7, 48, 3, 1.1, 5, mats.iron); for (const x of [-71.2, -69.8]) box(s, x, 8.45, 48, 1.5, .08, 5.1, mats.sheet).rotation.z = x < -70.5 ? .5 : -.5;
    for (const z of [44, 53.5]) { cyl(s, -73.5, 7.7, z, .35, 1.2, mats.rust); cyl(s, -73.5, 8.4, z, .5, .15, mats.rust); } city.collider(-70.5, 48, 3, 5, 9, undefined, undefined, 6.9);
    crate(d, -67.4, 7.1, 56.6, .5); box(d, -67.3, 7.5, 55.6, .5, .05, .5, mats.wood); beam(d, V(-67.1, 7.1, 57.1), V(-66.9, 8.2, 57.3), .02, mats.brass); cyl(d, -66.85, 8.25, 57.35, .05, .5, mats.brass).rotation.x = 1.2;
    decal(s, chalk, .5, .5, -73.14, 7.75, 53.5, EAST);
    // The gantry walk: from the roof, out over the yard and the void, to the crane.
    box(s, -73.4, 7, 73, 1.9, .14, 30, mats.wood); for (const x of [-74.3, -72.5]) box(s, x, 6.85, 73, .14, .3, 30, mats.rust);
    for (const z of [62, 68, 74, 80]) { for (const x of [-74.25, -72.55]) box(s, x, 3.4, z, .16, 6.8, .16, mats.rust); beam(s, V(-74.25, 3, z), V(-72.55, 6.6, z), .05, mats.rust); }
    for (const z of [85, 87.5]) beam(s, V(-71, -.3, z), V(-73.4, 6.8, z), .09, mats.rust);
    city.deck(-74.3, -72.5, 58, 88, 7.1); parapet(s, city, -74.3, 58, -74.3, 88, 7.1, mats.iron, false); parapet(s, city, -72.5, 58, -72.5, 88, 7.1, mats.iron, false);
    stair(s, city, -74.3, -72.5, 88, 93, 7.1, 9.1, 'z', 'max', mats.wood, false); for (const x of [-74.3, -72.5]) { beam(s, V(x, 8.1, 88), V(x, 10.1, 93), .03, mats.iron); city.collider(x, 90.5, .3, 5, 10.3, undefined, undefined, 6.9); }
    // The crane: a portal over the pier end, a cab, and a jib that reaches out past Terra.
    const R = mats.rust; box(s, -68.6, 9, 96.2, 11.6, .22, 6.6, O.iron); city.deck(-74.3, -62.9, 93, 99.4, 9.1);
    for (const x of [-71.4, -62.7]) { for (const z of [93.3, 99.1]) { box(s, x, 4, z, .5, 10, .5, R); city.collider(x, z, .5, .5, 9); } beam(s, V(x, 1, 93.3), V(x, 8.6, 99.1), .08, R); }
    parapet(s, city, -74.3, 99.4, -62.9, 99.4, 9.1, mats.iron, false); parapet(s, city, -74.3, 93, -74.3, 99.4, 9.1, mats.iron, false); parapet(s, city, -62.9, 93, -62.9, 99.4, 9.1, mats.iron, false); parapet(s, city, -72.5, 93, -62.9, 93, 9.1, mats.iron, false);
    ladder(s, this.live, city, 'ladder.crane', 'Crane ladder', -65, 93, G, 9.1, 0, -1);
    box(s, -70, 10.35, 97.4, 2.8, 2.5, 2.8, O.oxblood); box(s, -70, 11.7, 97.4, 3.1, .2, 3.1, O.iron); box(s, -70, 10.7, 95.98, 2, 1, .04, mats.sheet); box(s, -68.58, 10.7, 97.4, .04, 1, 2, mats.sheet); city.collider(-70, 97.4, 2.8, 2.8, 11.8, undefined, undefined, 8.9);
    box(s, -66, 19, 97.4, 1, 20, 1, R); city.collider(-66, 97.4, 1, 1, 29, undefined, undefined, 8.9); for (let y = 10; y < 28; y += 2.4) { box(s, -66, y, 97.4, 1.25, .14, 1.25, O.iron); beam(s, V(-66.5, y, 96.9), V(-65.5, y + 2.4, 96.9), .04, O.iron); }
    const tip = V(-66, 28.5, 124), heel = V(-66, 24.5, 97.4), low = V(-66, 23, 97.4), lowTip = V(-66, 27.6, 124), back = V(-66, 23.6, 87.5); beam(s, heel, tip, .3, R); beam(s, low, lowTip, .16, R);
    for (let k = 1; k < 9; k++) beam(s, heel.clone().lerp(tip, k / 9), low.clone().lerp(lowTip, (k - .5) / 9), .05, R);
    beam(s, heel, back, .26, R); box(s, -66, 22.9, 88.3, 1.8, 1.8, 2.4, O.iron); const apex = V(-66, 30.5, 97.4); box(s, -66, 29.6, 97.4, .5, 1.8, .5, R); cable(s, apex, tip, .5); cable(s, apex, back, .2); sphere(s, -66, 30.7, 97.4, .16, mats.glow);
    // The pier itself, and a way through the parapet onto it.
    box(s, -67, -.02, 91.5, 8, .4, 17, mats.wood); for (const x of [-70.6, -63.4]) { box(s, x, -.45, 91.5, .3, .5, 17, R); for (const z of [88, 96]) beam(s, V(x, -.5, z + 3), V(x, -7.5, 89.6), .12, R); }
    for (const z of [86, 92, 98]) box(s, -67, -.55, z, 7.5, .22, .3, R);
    city.deck(-71, -63, 78, 100, G); parapet(s, city, -71, 83.6, -71, 100, G, mats.iron, false); parapet(s, city, -63, 83.6, -63, 100, G, mats.iron, false); parapet(s, city, -71, 100, -63, 100, G, mats.iron, false);
    for (const x of [-70.3, -63.7]) { cyl(s, x, .5, 98.6, .2, .7, mats.iron); cyl(s, x, .9, 98.6, .28, .1, mats.iron); } for (const x of [-71.3, -62.7]) { box(s, x, 1.3, 83, .7, 2.6, 2.2, mats.stone); sphere(s, x, 2.85, 83, .22, mats.glow); }
    // A crate on the hook, swinging a little over nothing at all.
    { const h = this.hook; h.position.set(-66, 27.6, 116); cyl(h, 0, -7.5, 0, .025, 15, mats.iron); box(h, 0, -15.3, 0, .3, .5, .3, mats.iron); labeledCrate(h, 0, -17, 0, 1.4, 'VEYR/IRON'); bake(h); }
    // The freighter: an Ordinance hauler riding at the pier head, bigger than any roof in the ward.
    { const f = this.freighter; f.position.set(-55, 17.5, 127); sphere(f, 0, 0, 0, 1, mats.cream).scale.set(16, 5.2, 5.2);
      for (const x of [-9, -3, 3, 9]) { const r = torus(f, x, 0, 0, 5.2 * Math.sqrt(1 - (x / 16) ** 2) + .05, .09, x === 3 ? O.oxblood : mats.copper); r.rotation.y = Math.PI / 2; if (x === 3) r.scale.z = 9; }
      box(f, 13.6, 0, 0, 5, 7.5, .16, O.oxblood); box(f, 13.6, 0, 0, 5, .16, 7.5, O.oxblood); box(f, 15.8, 0, 0, .5, .5, .5, mats.iron);
      box(f, -1, -6.6, 0, 11, 2.2, 2.6, mats.wood); box(f, -1, -5.4, 0, 11.4, .2, 3, O.iron); for (const z of [-1.32, 1.32]) { box(f, -5, -6.3, z, 2.4, .9, .04, mats.sheet); box(f, 1.5, -6.3, z, 3.6, .9, .04, mats.sheet); }
      for (const x of [-5.5, -1, 3.5]) for (const z of [-1, 1]) beam(f, V(x, -5.4, z), V(x, -4.2, z * 2.4), .05, mats.iron); for (const z of [-1.9, 1.9]) { cyl(f, 5.6, -6.4, z, .5, 1.6, mats.copper).rotation.z = Math.PI / 2; torus(f, 6.5, -6.4, z, .62, .05, mats.iron).rotation.y = Math.PI / 2; }
      sphere(f, -6.6, -6.4, 0, .16, mats.glow); bake(f); }
    cable(d, V(-70.3, .95, 98.6), V(-69.5, 13, 126), 2.4); cable(d, V(-63.7, .95, 98.6), V(-58, 11.4, 126.2), 2);
    // Inside the bay: held freight behind bars, a hoist, and one crate the Embers have already been into.
    for (let z = 46.9; z < 53.2; z += .45) box(d, -71.6, 2.2, z, .05, 4.4, .05, O.iron); for (const y of [.3, 2.2, 4.3]) box(d, -71.6, y, 50, .08, .08, 6.6, O.iron); city.collider(-71.6, 50, .3, 7, 5);
    for (const [x, y, z, sz, text] of [[-72.4, G, 48, 1.1, 'HELD/BY ORDER'], [-72.4, G, 49.3, 1.2, 'HELD/BY ORDER'], [-72.3, 1.38, 48.6, .9, 'ORISON/SALT'], [-72.4, G, 52.4, 1.2, 'VEYR/IRON'], [-67.2, G, 47.3, 1, 'LOCKE/GRAIN'], [-68.4, G, 47.2, .9, 'VEYR/IRON']] as const) labeledCrate(d, x, y, z, sz, text);
    city.collider(-67.8, 47.2, 2.2, 1.1, 1.3); cyl(d, -69, 5.4, 50.6, .02, 3, mats.iron); box(d, -69, 3.8, 50.6, .22, .3, .22, mats.iron); box(d, -69, 6.85, 50.6, .2, .2, 6.4, mats.iron);
    box(d, -67, .5, 52.7, 1, .8, .9, mats.wood); box(d, -67.1, .98, 52.4, 1, .06, .9, mats.wood).rotation.set(.5, 0, .1); decal(d, chalk, .4, .4, -67, .5, 52.24); sphere(d, -66.75, 1.02, 52.75, .06, mats.aether); city.collider(-67, 52.7, 1, .9, 1.1);
    for (const z of [48.6, 51.4]) { sphere(d, -69.5, 6.2, z, .14, mats.glow); cyl(d, -69.5, 6.6, z, .012, .7, mats.iron); } p.interiors.push({ x: -69.3, y: 4.6, z: 50, color: '#ffcf90', reach: 8 });
    // Freight waiting on paper: every crate says where it came from.
    for (const [x, y, z, sz, text, yaw] of [[-58, G, 70, 1.2, 'ORISON/SALT', .2], [-58.2, G, 71.5, 1, 'LOCKE/GRAIN', -.1], [-57.9, 1.38, 70.4, .8, 'VEYR/IRON', .5], [-73.2, G, 62, 1.3, 'VEYR/IRON', 0], [-73, G, 63.6, 1.1, 'HELD/BY ORDER', .15], [-64.6, G, 55.8, 1, 'LOCKE/GRAIN', 0]] as const) labeledCrate(d, x, y, z, sz, text, yaw);
    for (const [x, z] of [[-57, 74], [-56.4, 75], [-72.8, 66]]) barrel(d, x, G, z); box(d, -57.6, .75, 77, 3.2, 1.4, 2, canvasTarp).rotation.y = .1;
    city.collider(-58, 70.7, 1.6, 2.8, 1.4); city.collider(-73.1, 62.8, 1.5, 2.9, 1.4); city.collider(-57.6, 77, 3.2, 2, 1.5);
    // A stack in the corner that hides a signal lamp and a tally of what was let through.
    for (const [x, z, y] of [[-72.2, 80.4, G], [-72.2, 79.2, G], [-72.2, 79.8, 1.38]] as const) crate(d, x, y, z, 1.2); city.collider(-72.2, 79.8, 1.2, 2.4, 2.6);
    sphere(d, -74.3, 1.1, 80.8, .09, mats.aether); box(d, -74.3, .55, 80.8, .22, .9, .22, mats.wood); decal(d, tally, .7, .35, -75.14, 1.5, 79.9, EAST); decal(d, chalk, .5, .5, -75.14, 1.35, 81, EAST);
    bake(d);
    // Customs: a booth, a bar across the lane and a banner. Liberation takes all three down.
    box(occ, -56.7, 1.3, 64, .2, 2.6, 3.8, O.iron); for (const z of [62.2, 65.8]) box(occ, -58, 1.3, z, 2.8, 2.6, .2, O.iron); box(occ, -58.1, 2.7, 64, 3.3, .16, 4.2, O.green); box(occ, -57.6, .95, 64, .8, .08, 2.2, mats.wood); box(occ, -57.6, .5, 64, .7, .9, 2, O.iron);
    facing(sign(occ, 'CUSTOMS', 'ALL FREIGHT INSPECTED • BY ORDER', -59.72, 3.15, 64, 3.6, .8, BONE), WEST); box(occ, -59.66, 3.15, 64, .08, .95, 3.8, O.iron);
    for (const x of [-64.3, -59.7]) box(occ, x, .7, 61, .3, 1.4, .3, O.oxblood); beam(occ, V(-64.3, 1.3, 61), V(-61.2, 4.2, 61), .07, O.bone);
    decal(occ, regime, 1.15, 4.4, -65.86, 4.3, 57.2, EAST); box(occ, -65.8, 6.6, 57.2, .08, .08, 1.5, O.iron);
    city.collider(-56.7, 64, .3, 3.8, 2.7, undefined, () => !this.held); for (const z of [62.2, 65.8]) city.collider(-58, z, 2.8, .3, 2.7, undefined, () => !this.held);
    // Once the square is free the dockers keep their own mark on the same wall.
    decal(this.freed, chalk, 1.4, 1.4, -65.86, 2.4, 57.2, EAST); decal(this.freed, civic, 1.15, 4.4, -65.86, 4.3, 47.4, EAST);
    p.addWorker(-60.4, 63.4, WEST, 'guard', { role: 'guard', when: () => this.seen && this.held }); p.addWorker(-61.2, 69.6, EAST, 'clipboard', { role: 'ordinal', when: () => this.seen && this.held });
    p.addWorker(-67.5, 66, 0, 'carry', { path: [-67.5, 96, .5], role: 'worker', when: () => this.seen }); p.addWorker(-63.7, 90.5, EAST, 'lean', { role: 'worker', when: () => this.seen }); p.addWorker(-64.6, 54.2, EAST, 'sit', { role: 'worker', tool: 'mug', when: () => this.seen });
    p.addWorker(-67.6, 56.8, 2.2, 'watch', { y: 7.1 - G, role: 'courier', when: () => this.seen });
  }

  private heights() { const city = this.city, s = this.section(-70, 0), d = this.section(-72, 0, true), occ = this.occupied, p = this.p;
    // THE REGISTRY. The Ordinance built its paper office against the aqueduct and cut the channel to do it.
    // Solid round a front office the public is let into: a counter, the files, and no chairs on this side.
    for (const [x, z, w, dd] of [[-72.5, 18, 5, 14], [-67.5, 13, 5, 4], [-67.5, 23, 5, 4], [-65.15, 16.05, .3, 2.1], [-65.15, 19.95, .3, 2.1]]) { box(s, x, 3, z, w, 6, dd, artMats.fadedPaint); box(s, x, .7, z, w + .2, 1.4, dd + .2, mats.darkBrick); box(s, x, 5.6, z, w + .15, .5, dd + .15, O.oxblood); city.collider(x, z, w, dd, 6); }
    box(s, -65.15, 4.6, 18, .3, 2.8, 1.8, artMats.fadedPaint); box(s, -70, 6, 18, 10.3, .2, 14.3, mats.stone); box(s, -67.5, .1, 18, 5, .08, 6, mats.wood);
    box(s, -67.6, .6, 18, .5, 1.2, 6, mats.wood); box(s, -67.6, 1.24, 18, .7, .08, 6, mats.wood); for (const z of [16.2, 19.8]) { box(s, -67.6, 2.1, z, .06, 1.7, .06, mats.brass); } box(s, -67.6, 2.95, 18, .08, .08, 6, mats.brass); city.collider(-67.6, 18, .6, 6, 1.4);
    for (const z of [15.5, 16.5, 17.5, 18.5, 19.5, 20.5]) { box(s, -69.6, 1.3, z, .7, 2.6, .9, O.iron); for (const y of [.5, 1.1, 1.7, 2.3]) box(s, -69.22, y, z, .04, .08, .3, mats.brass); }
    box(s, -69.18, 1.1, 19.5, .5, .46, .8, O.iron); box(s, -68.96, 1.34, 19.5, .1, .02, .5, ancientMats.turquoise);
    box(s, -66.55, 1.85, 15.14, 1.7, 1.4, .04, mats.wood); decal(s, surveySheet, 1.5, 1.12, -66.55, 1.87, 15.17); for (const dx of [-.7, .7]) sphere(s, -66.55 + dx, 2.38, 15.18, .025, mats.brass);
    examine(this.live, city, 'survey', 'A survey sheet', -66.55, 1.85, 15.35, 1.6, 1.3, .4); p.interiors.push({ x: -66.4, y: 3.4, z: 18, color: '#ffd9a0', reach: 7, power: 60 });
    for (const z of [16.6, 19.4]) { sphere(s, -66.6, 4.9, z, .14, mats.glow); cyl(s, -66.6, 5.4, z, .012, 1, mats.iron); } decal(s, regime, .9, 3.2, -66.3, 3.4, 20.84, Math.PI);
    for (const z of [13.5, 22.5]) for (const y of [2.6, 4.4]) { box(s, -64.96, y, z, .1, 1.1, .7, mats.dark); for (const dz of [-.2, 0, .2]) box(s, -64.9, y, z + dz, .04, 1.1, .04, O.iron); }
    box(s, -64.9, 3.15, 18, .3, .3, 2.2, O.oxblood); for (const dz of [-1, 1]) box(s, -64.9, 1.5, 18 + dz, .3, 3, .25, O.oxblood);
    facing(sign(s, 'WARD REGISTRY', 'PAPERS • PERMITS • NAMES', -64.93, 4.1, 18, 5.2, .9, BONE), EAST); decal(s, seal, .8, .8, -64.92, 5.3, 18, EAST);
    city.deck(-75, -65, 11, 25, ROOF);
    { const t = new T.Group(); t.position.set(-66.2, 0, 20.75); t.rotation.y = Math.PI; this.live.add(t); city.target(t, 'registry', 'discovery', 'The names ledger', 0, 1.5, 0); }
    parapet(s, city, -75, 11, AQ - 1.1, 11, ROOF); parapet(s, city, -65, 11, -65, 25, ROOF); parapet(s, city, -75, 25, -65, 25, ROOF); parapet(s, city, -75, 11, -75, 25, ROOF);
    ladder(s, this.live, city, 'ladder.registry', 'Registry ladder', -71, 25, G, ROOF, 0, 1);
    // The broadcast mast, and what the Embers have clipped onto it.
    box(s, -72.5, 11.6, 14, .4, 11, .4, O.iron); for (const y of [9, 12, 15]) box(s, -72.5, y, 14, 1.5, .1, .1, O.iron); city.collider(-72.5, 14, .6, .6, 17, undefined, undefined, 5.9);
    for (const [yaw, y] of [[EAST, 15.6], [0, 14.4], [Math.PI, 13.2]] as const) { const horn = new T.Mesh(new T.ConeGeometry(.5, 1.1, 10), O.bone), out = V(Math.sin(yaw), 0, Math.cos(yaw)); horn.position.set(-72.5 + out.x * .7, y, 14 + out.z * .7); horn.quaternion.setFromUnitVectors(UP, out.negate()); s.add(horn); }
    box(d, -72.5, 6.4, 14.5, .5, .5, .4, mats.wood); sphere(d, -72.5, 6.75, 14.6, .07, mats.aether); beam(d, V(-72.5, 6.5, 14.7), V(-74.6, 6.2, 12), .015, mats.copper); decal(d, chalk, .4, .4, -72.5, 6.42, 14.71);
    box(occ, -65.6, 6.7, 24.3, .14, 1.2, .14, O.iron); { const L = this.searchlight; L.position.set(-65.6, 7.4, 24.3); const aim = new T.Group(); aim.rotation.x = -1.05; L.add(aim); cyl(aim, 0, 0, 0, .3, .5, O.iron); cyl(aim, 0, -.26, 0, .25, .03, mats.glow); lightCone(aim, 2.2, 15).position.y = -.28; }
    for (const z of [13, 23]) { decal(occ, regime, 1.1, 4, -64.84, 3.5, z, EAST); decal(this.freed, civic, 1.1, 4, -64.84, 3.5, z, EAST); }
    // The lane checkpoint south of it: a sentry box and a bar that is, for now, raised.
    box(occ, -59, 1.3, 30, 1.6, 2.6, 1.6, O.green); box(occ, -59, 2.7, 30, 1.9, .14, 1.9, O.iron); box(occ, -59.82, 1.5, 30, .04, 1.6, .9, mats.dark); for (const x of [-64.3, -59.8]) box(occ, x, .7, 28.5, .3, 1.4, .3, O.oxblood); beam(occ, V(-59.8, 1.3, 28.5), V(-62.6, 4.4, 28.5), .07, O.bone);
    city.collider(-59, 30, 1.6, 1.6, 2.7, undefined, () => !this.held);
    // THE GARDEN. Old paving under the soot: ivory, turquoise edging, a fountain nobody has seen run.
    box(s, -73.75, .06, 0, 16.5, .12, 18, mats.warmStone); for (const z of [-8.7, 8.7]) box(s, -73.75, .13, z, 16.5, .02, .5, ancientMats.tile); for (const x of [-81.6, -65.9]) box(s, x, .13, 0, .5, .02, 17, ancientMats.tile); for (const z of [-4, 4]) box(s, -73.75, .128, z, 15, .012, .1, GOLD);
    cyl(s, -73, .34, 0, 2.4, .6, I); cyl(s, -73, .62, 0, 2.05, .08, ancientMats.tile); cyl(s, -73, 1.3, 0, .3, 1.8, I); cyl(s, -73, 2.2, 0, .95, .22, I); torus(s, -73, 3, 0, .6, .07, GOLD); sphere(s, -73, 3, 0, .22, ancientMats.dormant); city.collider(-73, 0, 4.6, 4.6, .9);
    // She is on no Ordinance map: a keeper of weather, holding the ring the storms passed through.
    box(s, -79.6, .7, 0, 1.5, 1.2, 1.5, I); box(s, -79.6, 1.36, 0, 1.7, .14, 1.7, GOLD); cyl(s, -79.6, 2.9, 0, .34, 1.5, ancientMats.ivoryDark); { const robe = new T.Mesh(new T.ConeGeometry(.66, 1.6, 10), ancientMats.ivoryDark); robe.position.set(-79.6, 2.2, 0); s.add(robe); }
    sphere(s, -79.6, 3.9, 0, .25, ancientMats.ivoryDark); beam(s, V(-79.4, 3.5, .25), V(-78.9, 4.5, .5), .08, ancientMats.ivoryDark); beam(s, V(-79.4, 3.5, -.25), V(-79.1, 3.0, -.6), .08, ancientMats.ivoryDark); torus(s, -78.8, 4.9, .55, .46, .05, GOLD).rotation.y = EAST; city.collider(-79.6, 0, 1.6, 1.6, 4);
    facing(sign(s, 'THE WEATHER KEEPER', 'She turned the storms from the low roofs', -78.83, .75, 0, 1.3, .5, '#ece2cb'), EAST);
    for (const [x, z, sc] of [[-69.6, 6.4, 1.05], [-77.4, -6, 1.2], [-78, 6.4, .9]] as const) { tree(s, x, z, sc); cyl(s, x, .2, z, 1, .3, I); city.collider(x, z, .7, .7, 3); }
    bench(d, -76, 4.6, Math.PI); bench(d, -70.4, -6.6, 0); for (const [x, z] of [[-81, -7.6], [-81, 7.6]]) { box(d, x, .45, z, 1.1, .8, 1.1, I); cyl(d, x, 1.05, z, .5, .5, mats.leaf); }
    // A tea stall tucked under the aqueduct, where the arch keeps the rain off.
    canopy(d, -68.4, 2.5, 3, 2.4, 2, artMats.ochre); box(d, -68.4, .95, 3, 1.8, .08, .8, mats.wood); for (const dx of [-.8, .8]) box(d, -68.4 + dx, .5, 3, .08, .9, .7, mats.wood); cyl(d, -68.8, 1.15, 3, .14, .3, mats.copper); for (const k of [0, 1, 2]) cyl(d, -68.2 + k * .22, 1.04, 3.15, .05, .1, mats.cream); city.collider(-68.4, 3, 1.8, .8, 1.1);
    bake(d);
    // THE AQUEDUCT over the garden: three piers, a trough, and the gap the registry made in it.
    trough(s, city, -11, 11); for (const z of [-6, 0, 6]) pier(s, city, z); channelWall(city, AQ - 1.1, -11, 11); channelWall(city, AQ + 1.1, -11, 11);
    // THE OLD HALL. Brick on the outside. One bay has fallen away, and behind it the wall is ivory.
    box(s, -73, 3, -18, 4, 6, 14, mats.brick); box(s, -68, 3, -23, 6, 6, 4, mats.brick); box(s, -68, 3, -13, 6, 6, 4, mats.brick); for (const z of [-20.1, -15.9]) box(s, -65.15, 3, z, .3, 6, 1.8, mats.brick); box(s, -65.15, 5, -18, .3, 2, 2.4, mats.brick); box(s, -70, 6, -18, 10.3, .2, 14.3, mats.stone);
    box(s, -70, .6, -18, 10.2, 1.2, 14.2, I); for (const z of [-19.25, -16.75]) box(s, -64.9, 2, z, .5, 4, .5, I); box(s, -64.9, 4.1, -18, .5, .4, 3, I); box(s, -64.86, 4.1, -18, .5, .5, .6, GOLD); box(s, -64.92, 4.55, -18, .3, .4, 3, ancientMats.tile);
    for (const [x, z, r] of [[-64.2, -20.4, .3], [-63.9, -19.9, .9], [-64.4, -15.4, 1.3], [-63.8, -15.9, .2]] as const) box(s, x, .3, z, .5, .25, .28, mats.brick).rotation.y = r;
    city.collider(-73, -18, 4, 14, 6); city.collider(-68, -23, 6, 4, 6); city.collider(-68, -13, 6, 4, 6); for (const z of [-20.1, -15.9]) city.collider(-65.15, z, .3, 1.8, 6);
    city.deck(-75, -65, -25, -11, ROOF); parapet(s, city, -73.2, -11, AQ - 1.1, -11, ROOF); parapet(s, city, -75, -25, -75, -11, ROOF); parapet(s, city, -65, -25, -65, -11, ROOF); parapet(s, city, -75, -25, -74, -25, ROOF);
    // Inside: the room the brick was hiding. Shelves of record cylinders and a map table gone dark.
    box(s, -68, .2, -18, 6, .06, 6, ancientMats.tile); torus(s, -68, .24, -18, 2.2, .04, GOLD).rotation.x = Math.PI / 2; box(s, -70.93, 3, -18, .12, 5.6, 6, I); for (const z of [-20.93, -15.07]) box(s, -68, 3, z, 6, 5.6, .12, I);
    for (const y of [1, 1.9, 2.8]) { box(s, -68, y, -20.6, 5, .08, .5, mats.wood); for (let k = 0; k < 9; k++) if ((k * 7 + Math.round(y * 10)) % 4) cyl(s, -70.2 + k * .55, y + .22, -20.6, .12, .36, k % 3 ? mats.copper : mats.brass); }
    cyl(s, -68.6, .65, -18, .95, 1, I); cyl(s, -68.6, 1.17, -18, .85, .04, ancientMats.dormant); torus(s, -68.6, 1.6, -18, .42, .025, GOLD).rotation.x = .9; torus(s, -68.6, 1.6, -18, .3, .02, GOLD).rotation.y = .7; city.collider(-68.6, -18, 1.7, 1.7, 1.2);
    for (const z of [-16.4, -19.6]) { sphere(s, -67, 4.4, z, .16, mats.glow); cyl(s, -67, 5.15, z, .012, 1.5, mats.iron); } box(s, -70.85, 1.1, -18, .04, .06, 5.6, mats.aether); box(s, -70.85, 4.9, -18, .04, .06, 5.6, mats.aether); torus(s, -68.6, 1.21, -18, .6, .03, mats.aether).rotation.x = Math.PI / 2;
    p.interiors.push({ x: -67.6, y: 3.6, z: -18, color: '#ffe2b0', reach: 7 });
    { const t = new T.Group(); t.position.set(-70.8, 0, -16.2); t.rotation.y = EAST; this.live.add(t); city.target(t, 'archive', 'discovery', 'The walled-up archive', 0, 1.55, 0); }
    // Up from the garden by the hall's old stair.
    stair(s, city, -73.6, -68.8, -10.9, -9.3, G, ROOF, 'x', 'min', mats.warmStone); box(s, -74.3, ROOF / 2, -10.1, 1.4, ROOF, 1.6, mats.warmStone); city.deck(-75, -73.6, -10.9, -9.3, ROOF); city.collider(-74.3, -10.1, 1.4, 1.6, ROOF - .7); city.collider(-71.8, -9.3, 6, .2, ROOF + 1.1); city.collider(-74.9, -10.1, .2, 1.8, ROOF + 1.1); beam(s, V(-68.8, 1.2, -9.3), V(-73.6, 7.1, -9.3), .04, mats.brass); beam(s, V(-73.6, 7.1, -9.3), V(-74.9, 7.1, -9.3), .04, mats.brass); for (let k = 0; k <= 6; k++) box(s, -68.8 - k * .8, G + k * (ROOF - G) / 6 + .5, -9.3, .07, 1, .07, mats.iron);
    // THE WEATHERVANE. Older than the ward and taller than its chimneys: the high place.
    const tw = this.section(-71, -28, false, true);
    const TX = -71, TZ = -28, GAL = 18.1, TOP = 31.1, H = TOP - .1; box(tw, TX, H / 2, TZ, 6, H, 6, I); box(tw, TX, .8, TZ, 6.7, 1.6, 6.7, ancientMats.ivoryDark); for (const y of [6.6, 12.4, 24.5, H - .5]) box(tw, TX, y, TZ, 6.25, .36, 6.25, GOLD);
    for (const y of [9.6, 14.6, 21.6, 27]) { box(tw, TX + 3.02, y, TZ, .08, 2.2, .55, mats.dark); box(tw, TX, y, TZ + 3.02, .55, 2.2, .08, mats.dark); box(tw, TX, y - 1.3, TZ + 3.05, 1, .14, .14, GOLD); box(tw, TX + 3.05, y - 1.3, TZ, .14, .14, 1, GOLD); }
    box(tw, TX + 3.03, 1.6, TZ, .12, 2.8, 1.9, mats.darkBrick); facing(sign(tw, 'SEALED', 'BY ORDER OF THE WARD', TX + 3.11, 2.2, TZ, 1.5, .5, BONE), EAST);
    city.collider(TX, TZ, 6, 6, H);
    // Halfway up, a gallery runs right round: the first ladder ends on its south side, the second starts on its north.
    box(tw, TX, GAL - .15, TZ, 10, .3, 10, I); box(tw, TX, GAL - .45, TZ, 8.4, .3, 8.4, GOLD); for (const dx of [-1, 1]) for (const dz of [-1, 1]) beam(tw, V(TX + dx * 3, GAL - 3.2, TZ + dz * 3), V(TX + dx * 4.7, GAL - .4, TZ + dz * 4.7), .22, I);
    city.deck(TX - 5, TX + 5, TZ - 5, TZ - 3, GAL); city.deck(TX - 5, TX + 5, TZ + 3, TZ + 5, GAL); city.deck(TX - 5, TX - 3, TZ - 5, TZ + 5, GAL); city.deck(TX + 3, TX + 5, TZ - 5, TZ + 5, GAL);
    parapet(tw, city, TX - 5, TZ - 5, TX + 5, TZ - 5, GAL, mats.brass, false); parapet(tw, city, TX - 5, TZ + 5, TX + 5, TZ + 5, GAL, mats.brass, false); parapet(tw, city, TX - 5, TZ - 5, TX - 5, TZ + 5, GAL, mats.brass, false); parapet(tw, city, TX + 5, TZ - 5, TX + 5, TZ + 5, GAL, mats.brass, false);
    ladder(tw, this.live, city, 'ladder.tower', 'Weathervane ladder', TX, TZ + 5, ROOF, GAL, 0, 1); ladder(tw, this.live, city, 'ladder.belfry', 'Belfry ladder', TX, TZ - 3, GAL, TOP, 0, -1);
    // The Embers' lookout: a blanket, a spyglass and a chalk mark where the ward's patrols can't see it.
    box(tw, TX + 4.2, GAL + .06, TZ - 4.2, 1, .08, 1.5, mats.red); beam(tw, V(TX + 4.6, GAL + .1, TZ - 3.4), V(TX + 4.75, GAL + 1.15, TZ - 3.2), .02, mats.brass); cyl(tw, TX + 4.8, GAL + 1.2, TZ - 3.15, .05, .5, mats.brass).rotation.z = 1.3; decal(tw, chalk, .7, .7, TX + 3.04, GAL + 1.3, TZ - 2, EAST);
    city.deck(TX - 3, TX + 3, TZ - 3, TZ + 3, TOP); box(tw, TX, H, TZ, 6.7, .2, 6.7, I);
    parapet(tw, city, TX - 3, TZ - 3, TX + 3, TZ - 3, TOP, I); parapet(tw, city, TX - 3, TZ + 3, TX + 3, TZ + 3, TOP, I); parapet(tw, city, TX - 3, TZ - 3, TX - 3, TZ + 3, TOP, I); parapet(tw, city, TX + 3, TZ - 3, TX + 3, TZ + 3, TOP, I);
    for (const dx of [-2.9, 2.9]) for (const dz of [-2.9, 2.9]) box(tw, TX + dx, TOP + 2, TZ + dz, .55, 4, .55, I); box(tw, TX, TOP + 4.2, TZ, 6.7, .5, 6.7, I); box(tw, TX, TOP + 4.5, TZ, 6.9, .14, 6.9, GOLD);
    // Seven studs round the cap, on the face the city sees. Finch's telescope is trained on them.
    for (let k = 0; k < 7; k++) sphere(tw, TX + 3.5, TOP + 4.5, TZ - 2.7 + k * .9, .32, k === 2 ? ancientMats.turquoise : GOLD); sphere(this.anchored, TX + 3.6, TOP + 4.5, TZ - .9, .38, ancientMats.awake);
    { const cap = new T.Mesh(new T.ConeGeometry(4.9, 4.4, 4), ancientMats.turquoise); cap.position.set(TX, TOP + 6.75, TZ); cap.rotation.y = Math.PI / 4; tw.add(cap); sphere(tw, TX, TOP + 9.1, TZ, .3, GOLD); cyl(tw, TX, TOP + 9.9, TZ, .05, 1.6, GOLD); }
    // The relay under the cap: a ring and a lens, dark, pointed at nothing the Ordinance knows of.
    cyl(tw, TX, TOP + .45, TZ, .55, .9, I); torus(tw, TX, TOP + 1.8, TZ, .85, .07, GOLD).rotation.y = EAST; cyl(tw, TX, TOP + 1.8, TZ, .72, .05, ancientMats.dormant).rotation.z = Math.PI / 2; city.collider(TX, TZ, 1.1, 1.1, TOP + 3, undefined, undefined, TOP - .2);
    sphere(tw, TX - 1.6, TOP + 3, TZ + 1.5, .55, mats.brass).scale.y = .7; cyl(tw, TX - 1.6, TOP + 3.8, TZ + 1.5, .03, .5, mats.iron);
    { const v = this.vane; v.position.set(TX, TOP + 10.5, TZ); box(v, 0, 0, 0, 2.6, .08, .08, GOLD); const head = new T.Mesh(new T.ConeGeometry(.22, .6, 4), GOLD); head.rotation.z = -Math.PI / 2; head.position.x = 1.5; v.add(head); box(v, -1.1, 0, 0, .6, .5, .04, GOLD); bake(v); }
    { const t = new T.Group(); t.position.set(TX + 1.9, TOP, TZ + 2.5); t.rotation.y = Math.PI; this.live.add(t); city.target(t, 'weathervane', 'discovery', 'The Weathervane relay', 0, 1.45, 0); }
    bake(tw);
    p.addWorker(-60.6, 27.4, WEST, 'guard', { role: 'guard', when: () => this.seen && this.held }); p.addWorker(-63.6, 19.6, WEST, 'read', { role: 'ordinal', when: () => this.seen && this.held, tool: 'read' }); p.addWorker(-68.6, 17.6, EAST, 'clipboard', { role: 'ordinal', when: () => this.seen && this.held });
    p.addWorker(-76, 4.5, Math.PI, 'sit', { role: 'resident', when: () => this.seen }); const a = p.addWorker(-69.6, -2.2, 2.3, 'talk', { role: 'resident', when: () => this.seen }), b = p.addWorker(-68.9, -3.2, -1.1, 'talk', { role: 'merchant', when: () => this.seen }); p.workers[a].partner = b; p.workers[b].partner = a;
    p.addWorker(-81.5, 3.2, WEST, 'watch', { role: 'resident', scale: .72, when: () => this.seen }); p.addWorker(-68.4, 4.1, Math.PI, 'browse', { role: 'merchant', when: () => this.seen }); p.addWorker(-74.2, 13.2, EAST + .5, 'watch', { y: ROOF - G, role: 'courier', time: 'night', when: () => this.seen });
  }

  private waterworks() { const city = this.city, s = this.section(-68, -50), d = this.section(-70, -55, true), p = this.p;
    // The run north from the hall, broken where a pier went. Somebody has laid planks across.
    trough(s, city, -41, -25); trough(s, city, -61.6, -45); for (const z of [-31, -37, -49, -55]) pier(s, city, z);
    channelWall(city, AQ - 1.1, -41, -25); channelWall(city, AQ + 1.1, -41, -25); channelWall(city, AQ - 1.1, -61.6, -45); channelWall(city, AQ + 1.1, -56.4, -45); channelWall(city, AQ + 1.1, -61.6, -58);
    for (const [dx, r] of [[-.72, .03], [0, -.02], [.72, .04]]) box(s, AQ + dx, 6.03, -43, .68, .09, 4.6, mats.wood).rotation.y = r; city.deck(AQ - 1.1, AQ + 1.1, -45, -41, ROOF);
    // Rope handlines on both sides: the crossing is as safe to walk as the channel, on a thumbstick too.
    for (const x of [AQ - 1.08, AQ + 1.08]) { for (const z of [-45, -41]) box(s, x, 6.6, z, .08, 1.1, .08, mats.wood); beam(s, V(x, 7.1, -45), V(x, 6.85, -43), .02, mats.cream); beam(s, V(x, 6.85, -43), V(x, 7.1, -41), .02, mats.cream); } channelWall(city, AQ - 1.1, -45, -41); channelWall(city, AQ + 1.1, -45, -41);
    for (const [x, z, w, r] of [[AQ - .3, -42.6, 1.5, .4], [AQ + .7, -43.6, 1.1, 1.1], [AQ - 1.2, -44, .8, 2.2], [AQ + .2, -41.9, .7, .2]] as const) box(s, x, G + w * .25, z, w, w * .55, w * .8, I).rotation.set(r * .3, r, r * .2);
    box(s, AQ, 1.6, -43, 1.3, 3.2, 1.3, I).rotation.z = .08; city.collider(AQ, -43, 2.6, 2.6, 3);
    // The stair up to the channel: ancient, worn hollow, and not on the Ordinance survey.
    stair(s, city, AQ + 1.1, AQ + 2.5, -58, -47, G, ROOF, 'z', 'min', I); city.collider(AQ + 2.5, -52.5, .2, 11, ROOF + 1.1); city.collider(AQ + 1.8, -58.1, 1.4, .2, ROOF + 1.1); beam(s, V(AQ + 2.5, 1.2, -47), V(AQ + 2.5, 7.1, -58), .04, GOLD);
    // THE CISTERN: a drum of ivory with a tiled walk on its roof and a sealed eye in the middle.
    cyl(s, -69, 3, -66, 6.5, 6, I); cyl(s, -69, .5, -66, 6.85, 1, ancientMats.ivoryDark); cyl(s, -69, 4.5, -66, 6.56, .8, ancientMats.tile); cyl(s, -69, 5.55, -66, 6.6, .3, GOLD); cyl(s, -69, 6, -66, 6.5, .2, I);
    for (const [w, dd] of [[13, 6.5], [6.5, 13], [10.4, 10.4]]) city.collider(-69, -66, w, dd, 6);
    city.deck(-73.6, -64.4, -70.6, -61.4, ROOF); parapet(s, city, -73.6, -70.6, -64.4, -70.6, ROOF, I); parapet(s, city, -73.6, -70.6, -73.6, -61.4, ROOF, I); parapet(s, city, -64.4, -70.6, -64.4, -61.4, ROOF, I); parapet(s, city, -73.6, -61.4, AQ - 1.1, -61.4, ROOF, I); parapet(s, city, AQ + 1.1, -61.4, -64.4, -61.4, ROOF, I);
    cyl(s, -69, 6.3, -66, 2.3, .5, I); cyl(s, -69, 6.57, -66, 2, .04, ancientMats.dormant); torus(s, -69, 6.58, -66, 2.05, .06, GOLD).rotation.x = Math.PI / 2; city.collider(-69, -66, 4.4, 4.4, 6.75, undefined, undefined, 5.9);
    for (const a of [0, 1, 2, 3]) box(s, -69 + Math.cos(a * Math.PI / 2 + .78) * 3.4, 6.115, -66 + Math.sin(a * Math.PI / 2 + .78) * 3.4, 1.4, .02, 1.4, ancientMats.tile).rotation.y = .78;
    cyl(s, -72.2, 6.6, -63, .22, 1, I); torus(s, -72.2, 7.2, -63, .5, .05, GOLD).rotation.x = Math.PI / 2; for (const r of [0, EAST]) box(s, -72.2, 7.2, -63, 1, .05, .05, GOLD).rotation.y = r; city.collider(-72.2, -63, .5, .5, 7.3, undefined, undefined, 5.9);
    // THE SEALED GATE in the ward wall. Whatever it opened onto, the Ordinance chained it shut.
    box(s, -74.9, 3.5, -52, .7, 7, 6.2, I); box(s, -74.62, 2.9, -52, .24, 5.8, 4.3, ancientMats.ivoryDark); for (const y of [1.2, 2.9, 4.6]) box(s, -74.48, y, -52, .1, .22, 4.3, GOLD); box(s, -74.46, 2.9, -52, .08, 5.8, .1, GOLD);
    torus(s, -74.42, 3.3, -52, .95, .08, GOLD).rotation.y = EAST; cyl(s, -74.44, 3.3, -52, .8, .05, ancientMats.dormant).rotation.z = Math.PI / 2; box(s, -73.8, .1, -52, 1.7, .06, 4.7, ancientMats.tile);
    beam(s, V(-74.36, 1, -54), V(-74.36, 5.4, -50), .05, mats.iron); beam(s, V(-74.36, 1, -50), V(-74.36, 5.4, -54), .05, mats.iron); box(s, -74.3, 2, -52, .08, .5, 1.4, O.iron); facing(sign(s, 'SEALED', 'ORDINANCE ENGINEERS', -74.24, 2, -52, 1.3, .44, BONE), EAST); city.collider(-74.8, -52, 1, 6.2);
    facing(sign(s, 'ANCHOR V', 'TEND FROM BELOW', -74.5, 6.25, -52, 2.4, .56, '#ece2cb'), EAST); examine(this.live, city, 'gate', 'The sealed gate', -74.1, 3.3, -52, .7, 5.4, 4);
    // The old main at the foot of the wall, and the pump the engineers bolted to it.
    cyl(s, -74.5, .6, -62.5, .42, 15, I).rotation.x = Math.PI / 2; for (let z = -69; z < -56; z += 3) torus(s, -74.5, .6, z, .46, .07, GOLD);
    box(d, -72.6, .8, -47.5, 1.5, 1.6, 1.2, O.iron); cyl(d, -72.6, 1.9, -47.5, .3, .6, mats.copper); beam(d, V(-73.3, 1.2, -47.5), V(-74.5, .9, -47.5), .1, mats.copper); beam(d, V(-74.5, .9, -47.5), V(-74.5, .9, -49), .1, mats.copper); gauge(d, -72.6, 1.2, -46.86, .32, '31');
    facing(sign(d, 'DO NOT OPERATE', 'ORDINANCE ENGINEERS ONLY', -71.82, 1.5, -47.5, 1.1, .5, BONE), EAST); city.collider(-72.6, -47.5, 1.5, 1.2, 2);
    // Between the cistern and the wall, out of sight of the lane: candles, and a name nobody says aloud.
    box(d, -74.7, 1, -59.2, .5, 1.6, 1.5, mats.stone); box(d, -74.4, .75, -59.2, .5, .08, 1.3, mats.stone); for (const [dz, h] of [[-.45, .22], [-.2, .34], [.05, .18], [.3, .28], [.5, .14]]) { cyl(d, -74.35, .79 + h / 2, -59.2 + dz, .04, h, mats.cream); sphere(d, -74.35, .83 + h, -59.2 + dz, .045, mats.glow); }
    decal(d, chalk, .6, .6, -74.43, 1.45, -59.2, EAST);
    { const t = new T.Group(); t.position.set(-74.4, 0, -57.4); t.rotation.y = EAST; this.live.add(t); city.target(t, 'hearth', 'discovery', 'A workers’ shrine', 0, 1.4, 0); }
    // The post the Ordinance gave up on: too far from anything worth watching.
    box(d, -61.4, 1.2, -65, 2.2, 2.4, 2, O.green); box(d, -61.4, 2.5, -65, 2.6, .12, 2.4, O.iron); box(d, -61.4, 1.3, -63.98, 1, 1.9, .04, mats.dark); box(d, -61, 2.62, -64.6, 2.2, .04, 1.6, canvasTarp).rotation.z = -.25; box(d, -63.2, .5, -63.6, .7, .7, .7, mats.wood).rotation.z = .5; barrel(d, -59.8, G, -64.2); city.collider(-61.4, -65, 2.2, 2, 2.6);
    bake(d);
    // When the Saelspring runs again the channel carries it: water in the trough, and a fall where it breaks.
    this.root.add(strip([V(AQ, 6.16, -61.4), V(AQ, 6.16, -45.1), V(AQ, 5.6, -44.6), V(AQ, .3, -44.2)], V(0, 1, 0), 1.6, 30, flowMaterial('#5fc6c9', 'water', .85)).mesh);
    p.addWorker(-71.3, -47.5, WEST, 'gauge', { role: 'engineer', when: () => this.seen && this.held }); p.addWorker(-73.2, -57.6, WEST + .3, 'warm', { role: 'worker', time: 'night', when: () => this.seen });
  }

  sync() { const held = this.held; this.occupied.visible = held && this.seen; this.freed.visible = !held && this.seen; this.aether.visible = this.city.economy.state.research.includes('aether'); this.anchored.visible = this.city.economy.state.research.includes('anchors'); }
  update(time: number, viewer: T.Vector3, calm: boolean) {
    // Props are only drawn near enough to be seen as props; the massing stays for the skyline.
    // Behind the housing row nothing here shows from the streets: only the Weathervane clears the roofs.
    const seen = viewer.x < -42 || viewer.y > 6 || viewer.z > 79; if (seen !== this.seen) { this.seen = seen; for (const g of this.ground) g.visible = seen; this.freighter.visible = this.hook.visible = this.live.visible = seen; this.sync(); }
    for (const d of this.details) d.g.visible = this.seen && Math.hypot(viewer.x - d.x, viewer.z - d.z) < 85;
    const t = calm ? time * .3 : time;
    this.freighter.position.y = 17.5 + Math.sin(t * .22) * .35; this.freighter.rotation.y = Math.sin(t * .07) * .03; this.freighter.rotation.x = Math.sin(t * .31) * .012;
    this.hook.rotation.x = Math.sin(t * .6) * .03; this.hook.rotation.z = Math.sin(t * .47 + 1) * .02;
    this.vane.rotation.y = .6 + Math.sin(t * .11) * .5 + Math.sin(t * 1.3) * .03;
    this.searchlight.rotation.y = 1.9 + Math.sin(t * .19) * .7;
    (this.ray.material as T.MeshBasicMaterial).opacity = .24 + .08 * Math.sin(t * .8);
  }
}
