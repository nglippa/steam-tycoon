import * as T from 'three';
import { box, cyl, sphere, bake, mats } from './assets';
import { occupationMats as O, signs, decalMat, emberChalk, printedMat, regimeBanner, civicBanner } from './factions';
import { dressOf, borderLamp, type Dress, type DistrictId } from '../simulation/occupation';
import type { Presentation } from './presentation';

/** DISTRICT BORDERS. Three places where the Great Main opens into a ward that answers to other sites: Market Square, Cinder Row and
 * the Ration Line. An iron post on each corner says whose street it is, and each side of it is dressed by its own district's band:
 *
 *   held   the Ordinance's notice twice on the wall, an inspection plate on the blade, the order banner
 *   low    one notice left and chalked over, the blade's lower plate gone, the banner arm empty, a pot on the step
 *   free   no occupation signage: the street's own name on the blade, the civic banner, a planter
 *
 * The banner is the ward's being entered; the lamp is the stricter side's (borderLamp): caged under a searchlight, plain, or warm.
 * Every pairing of the two sides is baked once; a change of band swaps which one is shown, and nothing else runs. */
// A corner: where the post meets the wall, the yaw that turns local +x into the ward and local +z out of the wall (s = -1 mirrors z).
type Corner = [x: number, z: number, yaw: number, s: number];
const BORDERS: { district: DistrictId; name: string; corners: Corner[] }[] = [
  { district: 'market', name: 'MARKET SQUARE', corners: [[-13.35, -11, Math.PI / 2, 1], [13.35, -11, Math.PI / 2, -1]] },
  { district: 'row', name: 'CINDER ROW', corners: [[14.4, -7.35, 0, 1], [14.4, 5.35, 0, -1]] },
  { district: 'gauge', name: 'THE RATION LINE', corners: [[14.4, 22.65, 0, 1], [14.4, 31.35, 0, -1]] },
];
const DRESSES: Dress[] = ['held', 'low', 'free'];

export class Borders {
  private shown: { main: Dress; ward: Dress; groups: Map<string, T.Group> }[] = [];
  constructor(private p: Presentation) {
    const city = p.city, chalk = decalMat(emberChalk, .9), regime = printedMat(regimeBanner, true), civic = printedMat(civicBanner, true);
    const plate = new Map<string, T.BufferGeometry>(), sign = (text: string, w: number, h: number, style: 'stencil' | 'ivory' = 'stencil') => { const k = `${text}|${w}|${h}|${style}`; let g = plate.get(k); if (!g) plate.set(k, g = signs.plate(text, w, h, style)); return g; };
    const mesh = (g: T.Object3D, geo: T.BufferGeometry, m: T.Material, x: number, y: number, z: number, yaw: number) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = yaw; g.add(o); return o; };
    const chalkGeo = new T.PlaneGeometry(.34, .34);
    for (const b of BORDERS) {
      const record = { main: 'held' as Dress, ward: 'held' as Dress, groups: new Map<string, T.Group>() }; this.shown.push(record);
      const ward = () => record.ward, main = () => record.main;
      for (const [cx, cz, yaw, s] of b.corners) {
        // The world position of a point in the corner's frame, for colliders.
        const at = (lx: number, lz: number): [number, number] => [cx + Math.cos(yaw) * lx + Math.sin(yaw) * lz * s, cz - Math.sin(yaw) * lx + Math.cos(yaw) * lz * s];
        const turned = Math.abs(Math.sin(yaw)) > .5, foot = (lx: number, w: number, d: number, show: () => boolean) => { const [x, z] = at(lx, .3); city.collider(x, z, turned ? d : w, turned ? w : d, .7, undefined, () => !show()); };
        city.collider(...at(0, .14), .24, .24, 5);
        // Planters stand on the street only while their side is free.
        foot(-.8, .8, .42, () => main() === 'free'); foot(.8, .8, .42, () => ward() === 'free');
      }
      for (const main of DRESSES) for (const ward of DRESSES) {
        const g = new T.Group(); g.visible = false; p.root.add(g); record.groups.set(main + ward, g);
        for (const [cx, cz, yaw, s] of b.corners) {
          const c = new T.Group(); c.position.set(cx, 0, cz); c.rotation.y = yaw; g.add(c); const out = s > 0 ? 0 : Math.PI;
          // The post, its blade sign out over the pavement, the banner arm above it and the lamp on top.
          cyl(c, 0, 2.5, .14 * s, .06, 5, O.iron); box(c, 0, .15, .14 * s, .22, .3, .22, O.iron); box(c, 0, 2.78, .72 * s, .04, .04, 1.16, O.iron); box(c, 0, 2.42, .74 * s, .02, .62, .96, O.iron);
          box(c, 0, 4.75, .8 * s, .05, .05, 1.3, O.iron);
          // Each face of the blade and each half of the wall belongs to its own side: -x looks back up the Great Main, +x into the ward.
          for (const [k, dress] of [[-1, main], [1, ward]] as [number, Dress][]) { const face = k * .012, turn = k * Math.PI / 2, wall = (x: number) => [k * x, 1.75, .05 * s] as const;
            if (dress === 'held') { mesh(c, sign('INSPECTION ZONE', .9, .28), signs.material, face, 2.56, .74 * s, turn); mesh(c, sign('PAPERS ON DEMAND', .9, .2), signs.material, face, 2.28, .74 * s, turn);
              for (const x of [.75, 1.45]) mesh(c, sign('ORDINANCE NOTICE 14', .62, .42), signs.material, ...wall(x), out); }
            else if (dress === 'low') { mesh(c, sign('INSPECTION ZONE', .9, .28), signs.material, face, 2.56, .74 * s, turn); mesh(c, chalkGeo, chalk, face * 1.6, 2.5, .62 * s, turn);
              mesh(c, sign('ORDINANCE NOTICE 14', .62, .42), signs.material, ...wall(.75), out); mesh(c, chalkGeo, chalk, k * .78, 1.72, .07 * s, out);
              if (k > 0) { cyl(c, .8, .15, .3 * s, .16, .3, O.rust); sphere(c, .8, .45, .3 * s, .22, mats.leaf); } }
            else { mesh(c, sign(k > 0 ? b.name : 'THE GREAT MAIN', .9, .3, 'ivory'), signs.material, face, 2.42, .74 * s, turn);
              box(c, k * .8, .25, .3 * s, .8, .5, .42, mats.wood); for (const dx of [-.25, .05, .28]) sphere(c, k * .8 + dx, .62, .3 * s, .2, mats.leaf); for (const dx of [-.15, .2]) sphere(c, k * .8 + dx, .8, .32 * s, .07, mats.red); } }
          // The ward's banner: the order, nothing (a banner taken down leaves its arm), or the civic one.
          if (ward !== 'low') { const banner = new T.Mesh(new T.PlaneGeometry(.7, 1.8), ward === 'held' ? regime : civic); banner.position.set(0, 3.82, 1.1 * s); banner.rotation.y = Math.PI / 2; c.add(banner); }
          const lamp = borderLamp(main, ward); box(c, 0, 5.02, .38 * s, .05, .05, .6, O.iron); box(c, 0, 4.82, .66 * s, .2, .3, .2, lamp === 'low' ? mats.cream : mats.glow);
          const cap = new T.Mesh(new T.ConeGeometry(.18, .16, 4), lamp === 'free' ? mats.brass : O.iron); cap.position.set(0, 5.04, .66 * s); cap.rotation.y = Math.PI / 4; c.add(cap);
          if (lamp === 'held') { for (const [dx, dz] of [[-.13, -.13], [.13, -.13], [-.13, .13], [.13, .13]]) box(c, dx, 4.82, .66 * s + dz, .02, .36, .02, O.iron);
            // The searchlight: bolted to the post, looking down the border.
            const aim = new T.Group(); aim.position.set(0, 5.3, .3 * s); aim.rotation.x = -s; c.add(aim); cyl(aim, 0, 0, 0, .19, .34, O.iron); cyl(aim, 0, -.18, 0, .16, .03, mats.glow); }
          else if (lamp === 'free') sphere(c, 0, 4.82, .34 * s, .13, mats.leaf); // a basket of something green hung off the bracket
        }
        bake(g);
      }
    }
    this.sync();
  }
  /** Shows the pairing the two wards are in now. Cheap: a few lookups a frame, and a swap only when a band changes. */
  sync() { const social = this.p.city.social, main = dressOf(social.get('lowworks')!.band);
    BORDERS.forEach((b, i) => { const r = this.shown[i], ward = dressOf(social.get(b.district)!.band); if (r.groups.get(r.main + r.ward)!.visible && r.main === main && r.ward === ward) return;
      r.groups.get(r.main + r.ward)!.visible = false; r.main = main; r.ward = ward; r.groups.get(main + ward)!.visible = true; }); }
}
