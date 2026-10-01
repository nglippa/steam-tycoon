import * as T from 'three';
import { box, cyl, sphere, torus, beam, sign, bake, mats, barrel } from './assets';
import { V, cable, bench, artMats, labeledCrate, canopy } from './art-kit';
import { lightCone, emberChalk, decalMat } from './factions';
import { ladder, parapet } from './routes';
import { CHASM } from './geography';
import type { Presentation } from './presentation';

/** THE EAST BANK. Two things the far side of the cleft was missing: a second way across,
 * and a reason to want the charter.
 *
 *   The Chain Bridge   a footbridge hung on chains by the Boiler yard. With Cinder Row's
 *                      bridge it makes a loop over the cleft, and it is the best place to
 *                      watch the carriers pass underneath.
 *   Salt Row           the Canal Ward's market arcade, seen through the gate bars until the
 *                      charter is bought: stalls, salt from Orison, traders who were never
 *                      allowed across.
 *   The Packet Light   the signal tower that called the packets in. Two ladders up; from
 *                      the lamp room the whole cleft, the Foundry and the Weathervane. */
const G = .18, BZ = 34, MID = 12.1, TOP = 24.1, TX = 57.5, TZ = -44, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const chalk = decalMat(emberChalk, .92);

export class CanalWard {
  root = new T.Group(); private live = new T.Group(); private detail = new T.Group(); private lamp = new T.Group(); private traders = new T.Group();
  private open: () => boolean;
  constructor(p: Presentation) { const city = p.city, s = new T.Group(), d = this.detail; p.root.add(this.root); this.root.add(s, d, this.live, this.traders);
    this.open = () => city.economy.state.districts.includes('canal');
    // THE CHAIN BRIDGE. Timber on iron, hung from two pairs of posts; the street rail is left open for it.
    const x0 = CHASM.x0 - 1, x1 = CHASM.x1 + 1, xm = (x0 + x1) / 2, len = x1 - x0;
    box(s, xm, .3, BZ, len, .3, 3.6, mats.wood); for (const z of [BZ - 1.8, BZ + 1.8]) box(s, xm, .14, z, len, .34, .16, mats.rust); for (let x = x0 + 1; x < x1; x += 1.5) box(s, x, .08, BZ, .12, .14, 3.6, mats.rust);
    for (const x of [x0 + .4, x1 - .4]) for (const z of [BZ - 1.9, BZ + 1.9]) { box(s, x, 2.6, z, .34, 5.2, .34, mats.iron); sphere(s, x, 5.35, z, .2, mats.brass); city.collider(x, z, .34, .34, 5); }
    for (const z of [BZ - 1.9, BZ + 1.9]) { const chain = cable(s, V(x0 + .4, 5.1, z), V(x1 - .4, 5.1, z), 3.3); for (let k = 1; k < 8; k++) { const q = chain.getPoint(k / 8); cyl(s, q.x, (q.y + 1.2) / 2, z, .018, q.y - 1.2, mats.iron); } beam(s, V(x0 + .4, 5.1, z), V(x0 - 2.2, .3, z), .03, mats.iron); beam(s, V(x1 - .4, 5.1, z), V(x1 + 2.2, .3, z), .03, mats.iron); }
    city.deck(x0, x1, BZ - 1.8, BZ + 1.8, G); parapet(s, city, x0 + .6, BZ - 1.8, x1 - .6, BZ - 1.8, G, mats.iron, false); parapet(s, city, x0 + .6, BZ + 1.8, x1 - .6, BZ + 1.8, G, mats.iron, false);
    sign(s, 'CHAIN BRIDGE', 'FOOT ONLY • NO BARROWS', x0 + .1, 3.6, BZ, 2.6, .5).rotation.y = WEST;
    // The east landing: a lamp, a bench facing the cleft, and the charter notice.
    bench(d, 51.6, BZ + 3.2, WEST); for (const z of [BZ - 4, BZ + 6.5]) { cyl(d, 51.9, 1.6, z, .06, 3.2, mats.iron); sphere(d, 51.9, 3.3, z, .16, mats.glow); }
    sign(d, 'CANAL WARD', 'CHARTERED TRADERS BEYOND THIS LINE', 52.9, 2.2, BZ - 6, 3, .7).rotation.y = WEST; box(d, 52.95, 1.4, BZ - 6, .1, 2.8, .14, mats.iron);
    // SALT ROW. An iron arcade along the house fronts, and under it what the ward trades in.
    box(s, 58, .06, 26, 9.6, .1, 38, mats.stone); box(s, 60.9, 4.3, 26, 3.6, .12, 37, mats.teal); box(s, 59.1, 4.14, 26, .12, .3, 37, mats.iron);
    for (let z = 8; z <= 44; z += 6) { cyl(s, 59.1, 2.1, z, .09, 4.2, mats.iron); torus(s, 59.1, 3.7, z, .32, .03, mats.brass).rotation.y = EAST; beam(s, V(59.1, 3.5, z), V(60.3, 4.2, z), .035, mats.iron); city.collider(59.1, z, .3, .3, 4.2); }
    for (const [z, m, text] of [[11, artMats.wine, 'ORISON/SALT'], [17, artMats.ochre, 'AMBER/TEA'], [23, mats.teal, 'VEYR/IRON'], [29, mats.cream, 'ORISON/SALT'], [35, artMats.wine, 'LOCKE/GRAIN'], [41, artMats.ochre, 'AMBER/TEA']] as const) {
      canopy(d, 60.9, 2.7, z, 2.4, 2.6, m); box(d, 60.9, .95, z, 1.4, .08, 2.6, mats.wood); for (const dz of [-1.2, 1.2]) box(d, 60.9, .5, z + dz, 1.3, .9, .08, mats.wood); labeledCrate(d, 60.2, G, z + 2.1, .8, text, .2);
      for (let k = 0; k < 4; k++) k % 2 ? cyl(d, 60.7, 1.1, z - .9 + k * .6, .14, .22, mats.cream) : box(d, 60.7, 1.08, z - .9 + k * .6, .34, .18, .3, m); city.collider(60.9, z, 1.5, 2.8, 1.2); }
    for (const [x, z] of [[58.6, 14.3], [58.7, 20.2], [58.5, 32.4]]) barrel(d, x, G, z); for (const z of [14, 26, 38]) { sphere(d, 60.9, 3.9, z, .15, mats.glow); cyl(d, 60.9, 4.1, z, .012, .3, mats.iron); }
    box(d, 55.6, .62, 24, 2.2, .14, 3, mats.iron); box(d, 55.6, .3, 24, 1.8, .5, 2.6, mats.wood); box(d, 54.4, 1.2, 24, .16, 2.2, .16, mats.iron); beam(d, V(54.4, 2.2, 22.8), V(54.4, 2.2, 25.2), .03, mats.brass); for (const dz of [-1.2, 1.2]) cyl(d, 54.4, 1.75, 24 + dz, .22, .04, mats.brass); city.collider(55.6, 24, 2.2, 3, .8);
    // THE PACKET LIGHT. A lattice tower with a lamp room; it called the packets in when there were packets.
    for (const dx of [-1.4, 1.4]) for (const dz of [-1.4, 1.4]) box(s, TX + dx, TOP / 2, TZ + dz, .26, TOP, .26, mats.iron); for (let y = 2; y < TOP; y += 3.4) { for (const q of [-1.4, 1.4]) { box(s, TX, y, TZ + q, 3, .12, .12, mats.iron); box(s, TX + q, y, TZ, .12, .12, 3, mats.iron); beam(s, V(TX - 1.4, y, TZ + q), V(TX + 1.4, y + 3.4, TZ + q), .04, mats.rust); beam(s, V(TX + q, y, TZ - 1.4), V(TX + q, y + 3.4, TZ + 1.4), .04, mats.rust); } }
    box(s, TX, .5, TZ, 3.8, 1, 3.8, mats.stone); city.collider(TX, TZ, 3.2, 3.2, TOP - .2);
    // Two platforms: a ring round the tower at half height, and the tower head.
    for (const y of [MID, TOP]) { box(s, TX, y - .12, TZ, 6.8, .16, 6.8, mats.wood); for (const q of [-3.3, 3.3]) { box(s, TX, y - .3, TZ + q, 6.8, .2, .14, mats.iron); box(s, TX + q, y - .3, TZ, .14, .2, 6.8, mats.iron); } for (const dx of [-1, 1]) for (const dz of [-1, 1]) beam(s, V(TX + dx * 1.4, y - 2.2, TZ + dz * 1.4), V(TX + dx * 3.3, y - .3, TZ + dz * 3.3), .05, mats.iron);
      city.deck(TX - 3.4, TX + 3.4, TZ - 3.4, TZ + 3.4, y); parapet(s, city, TX - 3.4, TZ - 3.4, TX + 3.4, TZ - 3.4, y, mats.iron, false); parapet(s, city, TX - 3.4, TZ + 3.4, TX + 3.4, TZ + 3.4, y, mats.iron, false); parapet(s, city, TX - 3.4, TZ - 3.4, TX - 3.4, TZ + 3.4, y, mats.iron, false); parapet(s, city, TX + 3.4, TZ - 3.4, TX + 3.4, TZ + 3.4, y, mats.iron, false); }
    ladder(s, this.live, city, 'ladder.light.low', 'Packet Light ladder', TX, TZ + 3.4, G, MID, 0, 1); ladder(s, this.live, city, 'ladder.light.high', 'Lamp room ladder', TX, TZ - 1.6, MID, TOP, 0, -1, mats.iron, [1.5, -.6]);
    city.collider(TX, TZ, .9, .9, TOP + 2.6, undefined, undefined, TOP - .2);
    // The lamp room: a brass cage on the tower head, and a lamp that still turns.
    box(s, TX, TOP + 2.6, TZ, 3.4, .16, 3.4, mats.copper); { const cap = new T.Mesh(new T.ConeGeometry(2.5, 1.6, 8), mats.copper); cap.position.set(TX, TOP + 3.5, TZ); s.add(cap); sphere(s, TX, TOP + 4.4, TZ, .18, mats.brass); } for (const dx of [-1.5, 1.5]) for (const dz of [-1.5, 1.5]) cyl(s, TX + dx, TOP + 1.3, TZ + dz, .05, 2.6, mats.brass);
    { const L = this.lamp; L.position.set(TX, TOP + 1.5, TZ); this.root.add(L); cyl(L, 0, 0, 0, .45, .9, mats.glow); const aim = new T.Group(); aim.rotation.z = Math.PI / 2 - .12; L.add(aim); lightCone(aim, 2.6, 26).position.y = -.4; }
    { const m = new T.Mesh(new T.PlaneGeometry(.5, .5), chalk); m.position.set(TX + 1.27, MID + 1.3, TZ + 1.2); m.rotation.y = EAST; s.add(m); }
    sign(s, 'THE PACKET LIGHT', 'CANAL WARD SIGNAL STATION', TX, 2.3, TZ + 1.95, 2.8, .6);
    bake(s); bake(d);
    { const t = new T.Group(); t.position.set(TX - 2.3, TOP, TZ + 2.3); t.rotation.y = EAST; this.live.add(t); city.target(t, 'packetlight', 'discovery', 'The signal book', 0, 1.45, 0); }
    // The ward's own people only come out once the charter lets them trade.
    const here = () => this.open() && this.detail.visible;
    for (const [z, yaw] of [[11, WEST], [23, WEST], [35, WEST]] as const) p.addWorker(61.6, z, yaw, 'browse', { role: 'merchant', when: here });
    const a = p.addWorker(59.6, 17.3, EAST - .3, 'talk', { role: 'resident', when: here }), b = p.addWorker(58.6, 16.6, WEST + 2.6, 'talk', { role: 'merchant', when: here }); p.workers[a].partner = b; p.workers[b].partner = a;
    p.addWorker(57.2, 26, 0, 'carry', { path: [57.2, 40, .5], role: 'courier', when: here }); p.addWorker(51.3, BZ - 1, WEST, 'lean', { role: 'resident', when: () => this.detail.visible });
  }
  update(time: number, viewer: T.Vector3, calm: boolean) { this.detail.visible = viewer.x > 24; this.lamp.rotation.y = (calm ? time * .12 : time * .35); }
}
