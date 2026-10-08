import * as T from 'three';
import { loft, sweep, place, plate, offset, ringAt, surface, onFace, shared, inward, type Ring, type SweepPt } from './loft';
import { upperArm, forearm, thigh as thighRings, shin as shinRings, ring, RIG, type Dims } from './body';
import type { Look } from './look';
import type { Kit } from './figure';
import { hand, foot, put0, strip, seam, around, steps, button, kerchiefBand, kerchiefTails, type Pt } from './parts';
import { palette as P } from '../palette';
import { landmarks } from './headform';
import { skullRings } from './head';
import { bands, type Garment } from '../drape';

/** The ten civilian wardrobes (Terra Character Book 8 and 9). Every garment is a shell measured from the body reference: turned edges, an opening, a thickness, a lining wherever the shell can be
 *  seen from inside. Cloth is the stitched cloth map; leather and metal are the PLAIN material (no map: smooth, so they do not read as stitched) with a darker swatch, a lighter edge binding
 *  that gives them a hard edge and a highlight band, and brass or steel in a light swatch. Every colour has a restored twin (`rest`) so `setCitizenProsperity` shows a change. */
const LIFT = .01;
export interface X {
  look: Look; d: Dims; k: number; kit: Kit; asym: Set<string>; pal: Record<string, string>; rib: Ring[]; pel: Ring[]; neckR: Ring[]; dk: string;
  lifted: T.Group; pelLift: T.Group; body: T.Group; group: T.Group; pelvisG: T.Group; tails: T.Group; hem: T.Group; skirt: { drop: number; depth: number }; /** the hinged garments, as the legs see them (drape.ts) */ cloth: Garment[]; scarf: T.Group; worn: T.Group; finery: T.Group;
  skin: T.Material; brass: T.Material; neckM: T.Material;
  out: { arms: T.Group[]; elbows: T.Group[]; grips: T.Group[]; legs: T.Group[]; knees: T.Group[]; ankles: T.Group[] };
}
/** The hinge of long cloth below the belt (Book 12): a child of `tails` pivoted at the knee, in tails-local y. The part of a long skirt, coat, apron or slab from the waist to the knee lies along the
 *  thigh when the figure sits; the part below hangs from the knees. `animateLife` counter-rotates `hem` against `tails`. */
export const HEM_Y = -.5;
/** The deepest the long cloth above the knee may be, front or back (People XIX: deep enough to hold a walking knee; seated, `animateLife` flattens it to a lap of .19). */
export const LAP = .3;
export const WARDROBE = ['garrison', 'inspector', 'rowSkirt', 'elder', 'affluent', 'stallholder', 'shopMerchant', 'foundry', 'youngMechanic', 'olderMechanic', 'courier', 'child'] as const;

/** The same garment in better times: cleaner, lighter and a little more colour. */
export const rest = (hex: string, l = 1.13, s = 1.18): string => { const c = new T.Color(hex), q = { h: 0, s: 0, l: 0 }; c.getHSL(q); c.setHSL(q.h, Math.min(1, q.s * s + .03), Math.min(.85, q.l * l + .025)); return '#' + c.getHexString(); };
const mix = (a: string, b: string, t: number) => '#' + new T.Color(a).lerp(new T.Color(b), t).getHexString();
const shade = (hex: string, f: number) => '#' + new T.Color(hex).multiplyScalar(f).getHexString();

export function dress(x: X) {
  const { look, d, k, kit, asym, pal, rib, pel, neckR, dk, lifted, pelLift, tails, hem, skirt, group } = x, id = look.cast;
  // the Ordinance never dresses up for prosperity: its colours have no restored twin
  const ord = id === 'garrison' || id === 'inspector', c = (hex: string) => kit.cloth(hex, ord ? undefined : rest(hex)), lea = (hex: string) => { const d = shade(hex, .86); return kit.plain(d, ord ? undefined : rest(d, 1.2, 1.05), 'leather'); }, met = (hex: string) => kit.plain(hex, undefined, 'metal');
  const brass = x.brass, steel = met('#8e98a2'), skin = x.skin;
  const LEATHER = P.cloth.leather, LEATHERD = P.cloth.leatherDark, leatherM = lea(LEATHER), leatherDM = lea(LEATHERD), edgeM = lea(mix(LEATHER, '#c9a27a', .35));
  const wool = (hex: string) => c(hex), white = c(P.cloth.cream);
  const key = (s: string) => `${id}/${s}/${dk}`;

  // ---------------------------------------------------------------- shared shells
  const shellBoth = (g: T.Group, rings: Ring[], o: Parameters<typeof loft>[1], m: T.Material, k2: string, lip = .008, hemmed = true, dome = 0) => {
    put0(g, loft(rings, { seg: 10, ...o, lipEnd: hemmed ? lip : 0, lipDepth: .0001, ...(dome ? { capEnd: { round: dome } } : {}), key: key(k2) }), m);
    put0(g, shared(key(k2 + '/in'), () => inward(loft(offset(rings, -lip), { seg: 10, ...o }))), m); // the lining faces in, so the inside of a skirt, a coat or an apron is drawn (seen from behind or below)
  };
  // ---- long cloth is hinged at the knee (HEM_Y): rings from the belt to a hem below the knee are cut in two, the upper half in `tails` (it overlaps the hinge by 3 cm), the lower in `hem`
  const down = (rings: Ring[]) => rings.map(r => ({ ...r, y: r.y - HEM_Y }));
  const hinged = (rings: Ring[]) => rings[rings.length - 1].y < HEM_Y - .06;
  /** the part above the knee is no deeper front to back than a thigh and its lap need (so a seated lap is a lap, not a table); the hem flares from the knee */
  const slimmer = (r: Ring): Ring => ({ ...r, f: Math.min(r.f, LAP), b: Math.min(r.b, LAP) });
  /** (the hem's top, inside the upper part, is cut narrower front to back, so when the hem flares in a stride (drape.ts opens it on its own) it still starts inside the upper part) */
  const splitAt = (rings: Ring[], panel = false) => { const knee = slimmer(ringAt(rings, HEM_Y)), tuck = (r: Ring, k: number): Ring => panel ? r : ({ ...r, f: r.f * k, b: r.b * k }); // (an apron's edge is seen in profile: it is not tucked)
    return { up: [...rings.filter(r => r.y > HEM_Y).map(slimmer), { ...knee, y: HEM_Y - .03 }], lo: down([tuck({ ...knee, y: HEM_Y + .03 }, .7), tuck({ ...knee, y: HEM_Y - .015 }, .9), { ...knee, y: HEM_Y - .03 }, ...rings.filter(r => r.y < HEM_Y - .03)]) }; };
  /** a shell of rings that may be long: whole in `tails` when it ends above the knee, otherwise hinged, with the hem's turned lip on the lower half */
  const longShell = (rings: Ring[], o: Parameters<typeof loft>[1], m: T.Material, k2: string, lip = .008) => {
    if (!hinged(rings)) { shellBoth(tails, rings, o, m, k2, lip); if (rings[rings.length - 1].y < -.15) x.cloth.push({ up: bands(rings, lip), lo: [], panel: (o?.arc ?? Math.PI * 2) < Math.PI }); return; } // one part, ending above the knee: it follows the thighs
    const s = splitAt(rings, (o?.arc ?? Math.PI * 2) < Math.PI); shellBoth(tails, s.up, o, m, k2 + '/up', lip, false, .07); shellBoth(hem, s.lo, o, m, k2 + '/lo', lip);
    // the cloth as the legs see it (to its lining): an apron or slab, less than half way round, has no back to clear
    x.cloth.push({ up: bands(s.up, lip), lo: bands(s.lo, lip), panel: (o?.arc ?? Math.PI * 2) < Math.PI });
  };
  /** a strip down a long shell at a fixed angle, from y0 to y1, continued across the hinge */
  const stripe = (rings: Ring[], y0: number, y1: number, ang: number, off: number, half: number, thick: number, m: T.Material, n = 5) => {
    if (!hinged(rings)) { put0(tails, seam(rings, steps(y0, y1, n), () => ang, off, half, thick), m); return; }
    const ys = steps(y0, y1, n), up = [...ys.filter(y => y > HEM_Y), HEM_Y], lo = [HEM_Y, ...ys.filter(y => y < HEM_Y)];
    if (up.length > 1) put0(tails, seam(rings, up, () => ang, off, half, thick), m); if (lo.length > 1) put0(hem, seam(down(rings), lo.map(y => y - HEM_Y), () => ang, off, half, thick), m);
  };
  /** the last rings of a long shell again, a little fuller, as a turned or contrasting hem */
  const hemLoft = (rings: Ring[], grow: number, lipEnd: number, k2: string, m: T.Material) => {
    const two = rings.slice(-2).map(r => ({ ...r, w: r.w + grow, f: r.f + grow, b: r.b + grow })); put0(hinged(rings) ? hem : tails, loft(hinged(rings) ? down(two) : two, { seg: 10, lipEnd, key: key(k2) }), m);
  };
  /** a band round a long shell at height y (always on the half it falls in) */
  const bandAt = (rings: Ring[], y: number, a0: number, a1: number, off: number, half: number, thick: number, m: T.Material, n = 8) => {
    if (y > HEM_Y || !hinged(rings)) put0(tails, around(rings, y, a0, a1, off, half, thick, n), m); else put0(hem, around(down(rings), y - HEM_Y, a0, a1, off, half, thick, n), m);
  };
  /** rings of a skirt, local to `tails` (y - 1.07), from the waist to hemY: the hem a given width and depth (full), the top fitted to the pelvis, a bell between. */
  const skirtRings = (hemY: number, hemW: number, hemD: number, curve = 1, n = 6): Ring[] => {
    const Wt = d.waistW + .052, Dt = d.waistD + d.belly + .05, top = 1.12;
    return Array.from({ length: n }, (_, i) => { const t = i / (n - 1), y = top + (hemY - top) * t, p = ringAt(pel, Math.min(1.13, Math.max(.86, y))), u = Math.pow(t, curve);
      const W = Math.max(Wt + (hemW - Wt) * u, p.w * 2 + .05), D = Math.max(Dt + (hemD - Dt) * u, p.f + p.b + .062);
      return ring(y - 1.07, W, D, (p.z ?? 0) + .006 * t, 2.2 + t * .15); });
  };
  const open = (aL: number, aR: number) => ({ start: aL, arc: Math.PI * 2 - aL - aR });

  // ---------------------------------------------------------------- the torso garments
  /** a shirt or blouse: the shell, its collar and a placket */
  const shirt = (m: T.Material, o: { off?: number; collar?: boolean; placket?: boolean; yoke?: boolean; front?: number } = {}) => {
    const sh = offset(rib, o.off ?? .007, (_, i) => ({ w: i >= 3 && i <= 5 ? .003 : 0, f: i >= 3 && i <= 5 ? .004 : 0 }));
    put0(lifted, loft(sh, { seg: o.front ? Math.max(3, Math.round(10 * o.front / Math.PI) + 1) : 10, lipEnd: .003, ...(o.front ? { start: -o.front, arc: 2 * o.front } : {}), key: key(`shirt/${o.off}/${o.front}`) }), m); // under a coat only the front the coat leaves open needs the shirt
    if (o.placket !== false) { put0(lifted, strip(sh, steps(1.4, 1.1, 5), () => .006, false, .0075, .016, .0035), m); for (const y of [1.34, 1.24, 1.14]) button(lifted, surface(sh, y, .05, .0095), brass, .006); }
    if (o.yoke !== false) { put0(lifted, around(sh, 1.405, Math.PI - .9, Math.PI + .9, .002, .008, .0035, 5), m); put0(lifted, seam(sh, steps(1.4, 1.1, 5), () => Math.PI, .002, .007, .0035), m); }
    if (o.collar !== false) { const cr = ringAt(neckR, 1.52), cl = [1.51, 1.535, 1.565].map((y, i) => ({ y, w: cr.w + [.01, .016, .018][i], f: cr.f + [.01, .016, .018][i], b: cr.b + [.009, .015, .017][i], z: (cr.z ?? 0) + .003, n: 2.1 })); put0(lifted, loft(cl, { seg: 12, lipEnd: .003, key: key('collar0') }), m); }
    return sh;
  };
  /** a jacket or coat shell hung from the chest, open or overlapped, with a collar, lapels, a yoke seam and a back seam; `hem` (a sole height) adds the skirts on the pelvis */
  const jacket = (m: T.Material, o: { off?: number; closed?: boolean; aL?: number; aR?: number; lapel?: boolean; stand?: boolean; buttons?: number; hem?: number; hemW?: number; hemD?: number; curve?: number; trimM?: T.Material; belt?: boolean; vent?: number; collar?: boolean; pocketFlaps?: boolean }) => {
    const off = o.off ?? .022, aL = o.aL ?? .3, aR = o.aR ?? .3, cR = offset(rib, off, (_, i) => ({ w: i < 2 ? .004 : 0, f: i < 3 ? .006 : 0 })), arc = o.closed ? { start: 0, arc: Math.PI * 2 } : open(aL, aR);
    put0(lifted, loft(cR, { seg: 10, ...arc, lipEnd: .003, key: key(`coat/${off}/${arc.start}/${arc.arc}`) }), m);
    if (!o.closed) for (const a of [aL, -aR]) put0(lifted, seam(cR, steps(1.5, 1.045, 5), () => a, .002, .018, .005), o.trimM ?? m);
    else { put0(lifted, plate(cR, steps(1.47, 1.05, 8).map(y => [y, -.6, .17]), .0, .006, 8), m); for (const y of steps(1.42, 1.12, o.buttons ?? 3)) button(lifted, surface(cR, y, .1, .0075), brass, .0085); }
    const nc = ringAt(neckR, 1.52), cc = [1.508, 1.536, 1.572].map((y, i) => ({ y, w: nc.w + [.021, .03, .038][i], f: nc.f + [.021, .03, .036][i], b: nc.b + [.02, .03, .038][i], z: (nc.z ?? 0) + .004, n: 2.1 }));
    if (o.collar !== false) put0(lifted, loft(cc, { seg: 14, ...(o.closed || o.stand ? { start: 0, arc: Math.PI * 2 } : { start: .7, arc: Math.PI * 2 - 1.4 }), lipEnd: .007, lipStart: .004, key: key(`collar/${o.closed || o.stand}`) }), m);
    if (!o.closed && o.lapel !== false) for (const [s, e] of [[1, aL], [-1, -aR]] as const) put0(lifted, plate(cR, [[1.488, .25], [1.43, .5], [1.36, .55], [1.28, .45], [1.2, .18]].map(([y, w]) => [y, e, e + s * w]), .0, .007, 3), o.trimM ?? m);
    put0(lifted, seam(cR, steps(1.5, 1.045, 8), () => Math.PI, .002, .006, .0035), m); put0(lifted, around(cR, 1.41, Math.PI - .85, Math.PI + .85, .002, .006, .0035, 6), m);
    if (!o.closed) for (const y of steps(1.36, 1.12, o.buttons ?? 2)) button(lifted, surface(cR, y, aL + .1, .009), brass, .0075); // on the cloth, not half off its edge
    if (o.hem !== undefined) {
      const rings = skirtRings(o.hem, o.hemW ?? 2 * (d.hipX + d.thighW / 2 + .04) + .05, o.hemD ?? d.hipD + .066 + d.belly * .6, o.curve ?? 1, o.hem < .9 ? 6 : 5), a2 = o.vent ? { start: 0, arc: Math.PI * 2 } /* the vent is its two edges, lapped: no slit to see through in profile */ : o.closed ? { start: 0, arc: Math.PI * 2 } : open(aL, aR);
      longShell(rings, a2, m, `skirt/${o.hem}/${a2.start}`, .012);
      const y0 = rings[0].y, y1 = rings[rings.length - 1].y;
      if (!o.closed) for (const a of [aL, -aR]) stripe(rings, y0, y1, a, .001, .02, .006, o.trimM ?? m);
      if (o.vent) for (const a of [Math.PI + o.vent, Math.PI - o.vent]) stripe(rings, y0, y1, a, .001, .012, .005, o.trimM ?? m); else stripe(rings, y0, y1, Math.PI, .001, .008, .004, m);
      bandAt(rings, .02, Math.PI - 1.15, Math.PI + 1.15, .003, .016, .004, m);
      skirt.drop = Math.max(skirt.drop, 1.07 - o.hem); skirt.depth = Math.max(skirt.depth, (rings[rings.length - 1].f + rings[rings.length - 1].b) * .5 + .02);
      return { cR, rings };
    }
    return { cR, rings: undefined };
  };
  const waistcoat = (m: T.Material, o: { top?: number; buttons?: number; edge?: T.Material } = {}) => {
    const vb = offset(rib, .015), vr = [1.125, 1.2, 1.3, 1.36, 1.43].map(y => ringAt(vb, y)), shirtM = white;
    put0(lifted, loft(vr, { seg: 10, lipEnd: .004, key: key('vest') }), m);
    for (const y of steps(1.13, 1.28, o.buttons ?? 3)) button(lifted, surface(vb, y, 0, .004), brass, .0065);
    put0(lifted, plate(vb, [[1.43, -.34, .34], [1.38, -.27, .27], [1.33, -.16, .16], [1.28, -.04, .04]], .0, .003, 6), shirtM);
    return vb;
  };
  /** the apron: a bib to the chest (optional) in the torso group, and a front slab over the skirt or thighs in the tails group, with a neck strap, a waist tie and edge binding */
  /** a bib apron's straps (Book 8: straps wrap the torso): from the bib's top corners over the shoulders, crossing on the back, to the waist on the far side, where they meet the band, lying on
   *  the shirt's own surface. From behind an apron reads by these and its ties, never as an empty frame. */
  const bibStraps = (top: (s: number) => T.Vector3, half: number, m: T.Material) => { const sh = offset(rib, .011);
    for (const s of [-1, 1]) { const back = [[1.5, s * 1.32], [1.44, s * 2.05], [1.36, s * 2.55], [1.27, s * 2.95], [1.19, s * 3.35], [1.12, s * 3.75]].map(([y, a]) => surface(sh, y, a, .003)), pts = [top(s), ...back.map(q => q.p)];
      put0(lifted, sweep(pts.map((p, i) => ({ p: p.toArray() as Pt, a: half, b: .004, n: (i ? back[i - 1].n : new T.Vector3(0, 1, 0)).toArray() as Pt })), { seg: 4, capStart: true, capEnd: true }), m); } };
  /** `over`: the skirt it is tied over (its rings): the apron is kept at least 1.4 cm outside it everywhere, so the skirt and its pleats never show through it, and only the skirt need hold the legs */
  const apron = (m: T.Material, o: { hemY: number; hemW?: number; aw?: number; bib?: boolean; strapM?: T.Material; leather?: boolean; hemD?: number; over?: Ring[] }) => {
    const aw = o.aw ?? 1.0, own = offset(skirtRings(o.hemY, o.hemW ?? 2 * (d.hipX + d.thighW / 2 + .045), o.hemD ?? d.hipD + .09, 1.2, o.hemY < .6 ? 6 : 5), .014), arc = { start: -aw, arc: aw * 2 };
    const rings = o.over ? own.map(r => { const u = ringAt(o.over!, r.y); return { ...r, w: Math.max(r.w, u.w + .014), f: Math.max(r.f, u.f + (u.z ?? 0) - (r.z ?? 0) + .014) }; }) : own;
    longShell(rings, arc, m, `apron/${o.hemY}/${o.leather}`, .008);
    const bind = o.leather ? edgeM : m, y0 = rings[0].y, y1 = rings[rings.length - 1].y;
    for (const a of [-aw, aw]) stripe(rings, y0, y1, a * .98, .001, .007, .004, bind);
    bandAt(rings, y1 - .004, -aw, aw, .002, .008, .004, bind);
    skirt.drop = Math.max(skirt.drop, Math.min(.5, 1.07 - o.hemY)); /* an apron is a front panel the legs push, not a bell: it opens less than its length says */ skirt.depth = Math.max(skirt.depth, (rings[rings.length - 1].f + rings[rings.length - 1].b) * .5 + .02);
    // the waist band, round to the back, tied in a bow with two tails (the asymmetry: the tails hang from one side)
    const wr = offset(rib, .016).filter(r => r.y < 1.15), band = [1.1, 1.14].map(y => ringAt(offset(rib, .028), y));
    put0(lifted, loft(band, { seg: 10, lipStart: .003, lipEnd: .003, key: key('apronband') }), o.leather ? leatherDM : m); void wr;
    const side = asym.has('apronTie') ? 1 : -1;
    for (const [dx, len] of [[.0, .2], [.035, .15]]) { const a = Math.PI + side * (.5 + dx * 4), seat = offset(pel, .03), pts: SweepPt[] = [0, .33, .66, 1].map(t => { const y = 1.12 - t * len, q = y > 1.1 ? surface(offset(rib, .028), y, a, .004) : surface(seat, y, a, .004), r = surface(offset(rib, .028), Math.max(1.04, y), a, .004); const p = q.p.length() > r.p.length() ? q : r; return { p: [p.p.x + side * t * .02, p.p.y, p.p.z] as Pt, a: .018 * (1 - t * .3), b: .004, n: p.n.toArray() as Pt }; }); put0(lifted, sweep(pts, { seg: 4, capStart: true, capEnd: true }), m); } // the tails lie on the seat, not off it (no sliver in profile)
    if (o.bib) {
      const bibR = offset(rib, .017), rows = [[1.42, -.3, .3], [1.36, -.42, .42], [1.26, -.56, .56], [1.16, -.62, .62], [1.1, -.64, .64]];
      put0(lifted, plate(bibR, rows, .0, .005, 6), m);
      bibStraps(s => surface(bibR, 1.42, s * .26, .008).p, .011, o.strapM ?? m);
    }
  };
  const shawl = (m: T.Material, fr: T.Material) => {
    const base = offset(rib, .02), g = [1.28, 1.34, 1.4, 1.46, 1.505, 1.54].map(y => ringAt(base, y));
    put0(lifted, loft(g.map((r, i) => ({ ...r, w: r.w + [.018, .016, .01, .004, 0, 0][i], f: r.f + [.012, .01, .006, .002, 0, 0][i], b: r.b + [.01, .008, .004, 0, 0, 0][i] })), { seg: 14, lipStart: .005, key: key('shawl') }), m);
    // two fronts cross over the chest: the left over the right, each a band from a shoulder down and across, with a thickness
    for (const s of [-1, 1]) put0(lifted, plate(base, [[1.5, s * .55, s * 1.25], [1.42, s * .3, s * 1.1], [1.3, -s * .2, s * .85], [1.2, -s * .9, s * .12 - s * .5], [1.15, -s * 1.1, -s * .5]].map(([y, a, b]) => [y, a, b]), s > 0 ? .0 : .008, .007, 5), m);
    // the back falls to a point
    put0(lifted, plate(base, [[1.4, Math.PI - 1.25, Math.PI + 1.25], [1.32, Math.PI - .95, Math.PI + .95], [1.24, Math.PI - .55, Math.PI + .55], [1.16, Math.PI - .12, Math.PI + .12]], .0, .008, 7), m);
    for (const y of steps(1.28, 1.16, 3)) for (const a of [Math.PI - .18, Math.PI + .18]) void a;
    put0(lifted, around(base, 1.5, Math.PI - 1.2, Math.PI + 1.2, .004, .006, .003, 6), fr);
  };

  // ---------------------------------------------------------------- arms and legs
  /** sleeves: an upper sleeve, a forearm (cloth, or bare skin rolled), a cuff, a hand (skin or glove), garters or gauntlets */
  const arms = (o: { upM: T.Material; foreM?: T.Material; cuffM?: T.Material; off?: number; rolled?: (side: number) => boolean; glove?: T.Material; gauntlet?: T.Material; garter?: T.Material; bell?: boolean; shirtCuff?: T.Material; guard?: T.Material; board?: (sh: T.Group, side: number) => void; armband?: { m: T.Material; side: number } }) => {
    for (const side of [-1, 1]) {
      const sh = new T.Group(); sh.position.set(side * d.shX, RIG.shoulder + LIFT, 0); x.body.add(sh); x.out.arms.push(sh);
      const up = upperArm(d), off = o.off ?? .019, fore = forearm(d), rolled = o.rolled?.(side) ?? false, at = (y: number, e: number) => { const r = ringAt(fore, y); return { ...r, w: r.w + e, f: r.f + e, b: r.b + e }; };
      put0(sh, loft(offset(up, off).filter((_, i) => i !== 2), { seg: 7, capStart: { round: d.rSh + off }, capEnd: { round: d.elbowR + off }, key: key(`sleeve/${off}`) }), o.upM);
      if (o.garter) put0(sh, loft([-.12, -.15].map(y => { const r = ringAt(offset(up, off + .004), y); return r; }), { seg: 7, lipStart: .003, lipEnd: .003, key: key('garter') }), o.garter);
      if (o.armband && o.armband.side === side) { const bandR = [-.075, -.145].map(y => ringAt(offset(up, off + .004), y)); put0(sh, loft(bandR, { seg: 8, lipStart: .004, lipEnd: .004, key: key('armband') }), o.armband.m); }
      o.board?.(sh, side);
      x.kit.bake(sh);
      const el = new T.Group(); el.position.set(0, -RIG.upperArm, 0); sh.add(el); x.out.elbows.push(el);
      if (rolled || o.gauntlet) put0(el, loft(fore, { seg: 6, capStart: { round: d.elbowR }, key: key('fore') }), skin); else put0(el, loft(fore.slice(3), { seg: 6, key: key('foreWrist') }), skin); // a sleeve hides the forearm: only the wrist below its cuff is skin
      const fm = o.foreM ?? o.upM;
      if (rolled) put0(el, loft([at(0, off + .003), at(-.012, off + .011), at(-.05, off + .014)], { seg: 6, capStart: { round: d.elbowR + off + .003 }, lipEnd: .011, key: key('roll') }), fm);
      else {
        put0(el, loft([at(0, off), at(-.1, off - .001), at(-.205, off - .004)], { seg: 8, capStart: { round: d.elbowR + off }, lipEnd: .007, key: key('forearm') }), fm);
        put0(el, loft([at(-.15, off + .006), at(-.205, off + .004)], { seg: 8, lipEnd: .008, lipStart: .004, key: key('cuff') }), o.cuffM ?? fm);
        if (o.shirtCuff) put0(el, loft([at(-.2, off + .002), at(-.243, off + .002)], { seg: 8, lipEnd: .004, key: key('shirtcuff') }), o.shirtCuff);
      }
      if (o.guard) put0(el, loft([at(-.035, off + .012), at(-.1, off + .013), at(-.17, off + .012)], { seg: 8, lipStart: .004, lipEnd: .004, key: key('guard') }), o.guard);
      if (o.gauntlet) put0(el, loft([at(-.13, .004), at(-.17, .02), at(-.215, .034), at(-.262, .042)], { seg: 8, lipStart: .004, lipEnd: .007, key: key('gauntlet') }), o.gauntlet);
      if (o.glove) { put0(el, loft([at(-.2, .004), at(-.243, .004)], { seg: 8, lipEnd: .004, key: key('glovecuff') }), o.glove); put0(el, place(hand(d, side), [0, -RIG.forearm, 0], [0, 0, 0], 1.07), o.glove); }
      else put0(el, hand(d, side), skin, [0, -RIG.forearm, 0]);
      x.kit.bake(el);
      const grip = new T.Group(); grip.position.set(-side * .028, -.312, .004); el.add(grip); x.out.grips.push(grip);
    }
  };
  /** legs: trousers (or stockings under a skirt), a boot of the given height and heaviness, a turned-up or plain hem */
  const legs = (o: { thighM: T.Material; shinM?: T.Material; boot: T.Material; sole: T.Material; top?: number; heavy?: boolean; turnup?: boolean; soft?: boolean; hem?: number; fit?: number; bootCuff?: T.Material }) => {
    const dd = o.heavy ? { ...d, shoe: d.shoe * 1.05, shoeW: d.shoeW * 1.12 } : d;
    for (const side of [-1, 1]) {
      const hip = new T.Group(); hip.position.set(side * d.hipX, RIG.hip + LIFT, 0); group.add(hip); x.out.legs.push(hip);
      const th = thighRings(d, side), inward = -side * .022, to = o.fit ?? .007;
      put0(hip, loft(offset(th, to).filter((_, i) => i !== 3), { seg: 7, capStart: { round: d.hipR + to }, capEnd: { round: d.kneeR + to }, key: key(`thigh/${side}/${to}`) }), o.thighM);
      kit.bake(hip);
      const knee = new T.Group(); knee.position.set(inward, -RIG.thigh, 0); hip.add(knee); x.out.knees.push(knee);
      const sn = shinRings(d), hem = o.hem ?? (o.turnup === false && !o.soft && (o.top ?? -.36) > -.3 ? Math.max(-.452, (o.top ?? -.36) - .03) : -.452), /* a tall boot hides the trouser leg below its top: the trouser ends tucked in, under the boot's lip */ shinCut = [...sn.filter(r => r.y > hem + .02), { ...ringAt(sn, hem), y: hem }], sm = o.shinM ?? o.thighM;
      put0(knee, loft(offset(shinCut, to, (_, i) => i === shinCut.length - 1 ? (hem > -.45 ? { w: -.006, f: -.006, b: -.006 } : { w: .008, f: .006, b: .006 }) : {}), { seg: 7, capStart: { round: d.kneeR + to }, lipEnd: .007, key: key(`shin/${to}/${hem}`) }), sm);
      const so2 = offset(shinCut, to);
      if (o.turnup !== false && !o.soft) { put0(knee, plate(so2, [[-.005, -.85, .85], [-.06, -.75, .75], [-.115, -.5, .5]], .0, .008, 3), sm); put0(knee, loft([-.4, -.452].map(y => { const r = ringAt(so2, y); return { ...r, w: r.w + .01, f: r.f + .01, b: r.b + .01 }; }), { seg: 6, lipStart: .005, lipEnd: .006, key: key(`turnup/${to}`) }), sm); }
      const top = o.top ?? -.36, so = .003 + (o.heavy ? .003 : 0), shaft = [top, top - (top + .46) * .25 - .02, -.46, -.495].map(y => { const r = ringAt(sn, y); return { ...r, w: r.w + so, f: r.f + so, b: r.b + so }; });
      put0(knee, loft(shaft, { seg: 6, lipStart: .004, capEnd: 'flat', key: key(`shaft/${top}/${so}`) }), o.boot);
      if (o.bootCuff) put0(knee, loft([shaft[0], { ...shaft[0], y: shaft[0].y - .03, w: shaft[0].w + .008, f: shaft[0].f + .008, b: shaft[0].b + .008 }], { seg: 6, lipStart: .005, lipEnd: .005, key: key(`bootcuff/${top}`) }), o.bootCuff);
      kit.bake(knee);
      const ankle = new T.Group(); ankle.position.y = -RIG.shin; ankle.rotation.y = side * .06; knee.add(ankle); x.out.ankles.push(ankle);
      foot(ankle, dd, o.boot, o.sole, o.soft ?? false); kit.bake(ankle);
    }
  };

  // ---------------------------------------------------------------- props
  /** marks what `f` adds to `g` as a carried prop (userData.prop), so a test can keep the hands and forearms out of it */
  const prop = (g: T.Object3D, f: () => void) => { const n0 = g.children.length; f(); for (const o of g.children.slice(n0)) o.userData.prop = true; };
  const pouch = (g: T.Group, rings: Ring[], y: number, a0: number, a1: number, m: T.Material) => prop(g, () => { put0(g, plate(rings, [[y, a0, a1], [y - .1, a0, a1]], .0, .014, 4), m); put0(g, plate(rings, [[y + .004, a0 - .02, a1 + .02], [y - .04, a0 - .02, a1 + .02]], .0, .02, 4), edgeM); });
  const belt = (m: T.Material, y: number, off = .03, hw = .02) => { const b = [y - hw + .002, y + hw - .002].map(yy => ringAt(offset(rib, off), Math.max(1.04, Math.min(1.1, yy)))); put0(lifted, loft([{ ...b[0], y: y - hw }, { ...b[1], y: y + hw }], { seg: 10, lipStart: .003, lipEnd: .003, key: key(`belt/${y}/${off}/${hw}`) }), m); const q = surface(offset(rib, off), y, 0, .004); put0(lifted, new T.Mesh(new T.BoxGeometry(hw > .025 ? .056 : .036, hw > .025 ? .05 : .03, .008), brass).geometry, brass, q.p.toArray() as Pt); };

  // ---------------------------------------------------------------- the casts
  const I = (n: string) => pal[n], bare = (side: number) => side < 0;
  // ---------------------------------------------------------------- the Ordinance (Book 4, 9, 10): squared, vertical, hard lines, one outfit that never dresses up and never weathers
  /** a flat shoulder board of the Ordinance, lying over the arm's cap and turning with it (the arm group is the one `animateLife` pushes wide and high every frame, so the board and the cap
   *  go with it: the cap is a dome that overlaps the torso's shoulder by 4 cm, so the push opens no gap at the armhole) */
  const board = (m: T.Material, edge: T.Material, len: number, inner: number, wide: number, bar: boolean) => (sh: T.Group, side: number) => {
    const slab = loft([{ y: -inner, w: .005, f: wide, b: wide, n: 5 }, { y: len, w: .005, f: wide, b: wide, n: 5 }], { seg: 8, capStart: 'flat', capEnd: 'flat', key: key(`board/${len}/${inner}/${wide}`) }), top = d.rSh + .008;
    const at = (geo: T.BufferGeometry, mat: T.Material, dy = 0, dx = 0) => put0(sh, place(geo, [side * dx, top - .004 + dy, 0], [0, 0, -side * (Math.PI / 2 + .28)]), mat);
    at(slab, m); at(loft([{ y: len - .012, w: .0075, f: wide + .003, b: wide + .003, n: 5 }, { y: len + .002, w: .0075, f: wide + .003, b: wide + .003, n: 5 }], { seg: 8, capStart: 'flat', capEnd: 'flat', key: key(`boardedge/${len}/${wide}`) }), edge, .001);
    if (bar) { at(loft([{ y: .0, w: .0065, f: wide * .92, b: wide * .92, n: 5 }, { y: .012, w: .0065, f: wide * .92, b: wide * .92, n: 5 }], { seg: 8, capStart: 'flat', capEnd: 'flat', key: key(`boardbar/${wide}`) }), brass, .002, side * .045); }
    button(sh, { p: new T.Vector3(side * -(inner - .008) * .995, top + .003 + inner * .1, 0), n: new T.Vector3(0, 1, 0) }, brass, .0085);
  };
  /** a book hung from the belt at the hip */
  const ledger = (g: T.Group, rings: Ring[], y: number, a: number, cover: T.Material) => prop(g, () => ledger0(g, rings, y, a, cover));
  const ledger0 = (g: T.Group, rings: Ring[], y: number, a: number, cover: T.Material) => {
    const q = surface(rings, y, a, .022), set = (geo: T.BufferGeometry, m: T.Material, dz = 0, dy = 0) => { const mm = put0(g, geo, m, [q.p.x + q.n.x * dz, q.p.y + dy, q.p.z + q.n.z * dz]); mm.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), q.n); return mm; };
    set(new T.BoxGeometry(.105, .15, .034), cover); set(new T.BoxGeometry(.094, .14, .026), c(P.cloth.bone), .004); set(new T.BoxGeometry(.016, .152, .036), cover, 0, 0).position.add(new T.Vector3(.0, 0, 0)); set(new T.BoxGeometry(.02, .02, .01), brass, .02, -.05);
    put0(g, sweep([[0, .06, .02], [.012, .09, .02]].map(([xx, yy, zz]) => ({ p: [q.p.x + xx, q.p.y + yy, q.p.z + q.n.z * .02] as Pt, a: .004, b: .004, n: [0, 0, 1] as Pt })), { seg: 4, capStart: true, capEnd: true }), brass);
  };
  /** a hanging baton (the Ordinance's truncheon) */
  const truncheon = (g: T.Group, rings: Ring[], y: number, a: number, m: T.Material) => prop(g, () => truncheon0(g, rings, y, a, m));
  const truncheon0 = (g: T.Group, rings: Ring[], y: number, a: number, m: T.Material) => { const q = surface(rings, y, a, .03), rod = loft([{ y: -.17, w: .013, f: .013, b: .013 }, { y: -.04, w: .017, f: .017, b: .017 }, { y: .1, w: .02, f: .02, b: .02 }, { y: .15, w: .014, f: .014, b: .014 }], { seg: 7, capStart: 'flat', capEnd: 'flat', key: key('baton') }); put0(g, rod, m, q.p.toArray() as Pt, [-.08, 0, Math.sign(a) * -.1]); put0(g, new T.Mesh(new T.CylinderGeometry(.0145, .0145, .012, 7)).geometry, brass, [q.p.x, q.p.y - .175, q.p.z + .01]); };
  /** a ring of keys on the belt */
  const keyRing = (g: T.Group, rings: Ring[], y: number, a: number) => prop(g, () => keyRing0(g, rings, y, a));
  const keyRing0 = (g: T.Group, rings: Ring[], y: number, a: number) => { const q = surface(rings, y, a, .02), ring = Array.from({ length: 11 }, (_, i) => { const t = i / 10 * Math.PI * 2; return { p: [q.p.x + Math.cos(t) * .026, q.p.y - .03 + Math.sin(t) * .026, q.p.z + q.n.z * .01] as Pt, a: .0033, b: .0033, n: [0, 0, 1] as Pt }; });
    put0(g, sweep(ring, { seg: 4, closed: true }), brass); for (const [dx, len] of [[-.02, .06], [.0, .075], [.02, .055]]) put0(g, new T.Mesh(new T.BoxGeometry(.012, len, .005)).geometry, brass, [q.p.x + dx, q.p.y - .06 - len / 2, q.p.z + q.n.z * .012]); };
  if (id === 'garrison') {
    const coat = c(I('greatcoat')), trou = c(I('trousers')), strap = lea(I('crossbelt')), black = lea(P.cloth.leatherDark), side = Math.round(look.stature * 1000) % 2 ? 1 : -1;
    const r = jacket(coat, { closed: true, off: .03, hem: .26, hemW: .58, hemD: .38, curve: 1.05, buttons: 6, stand: true, vent: .13, trimM: black });
    skirt.drop = Math.min(skirt.drop, .55); skirt.depth = Math.max(skirt.depth, .27); // a greatcoat opens a little in a stride and stays a column
    // the front is buttoned over to one side: a placket and buttons carried down the skirt
    stripe(r.rings!, r.rings![0].y, HEM_Y + .02, .17, .003, .014, .006, coat, 6);
    for (const y of steps(-.04, -.46, 4)) button(tails, surface(r.rings!, y, .12, .008), brass, .0085);
    // a half-belt across the back, buttoned at both ends
    put0(lifted, around(r.cR, 1.17, Math.PI - .95, Math.PI + .95, .004, .024, .007, 6), coat); for (const a of [Math.PI - .95, Math.PI + .95]) button(lifted, surface(r.cR, 1.17, a, .012), brass, .009);
    // the wide belt with a plate buckle, over the coat at the waist
    belt(black, 1.09, .05, .03);
    // the crossbelt wraps the torso: over one shoulder, across the chest, round the side to a pouch on the opposite hip, crossing on the back
    const sd = side, W = (pts: number[][]) => pts.map(([y, a]) => { const q = surface(r.cR, y, a, .009); return { p: q.p.toArray() as Pt, a: .027, b: .006, n: q.n.toArray() as Pt }; });
    if (asym.has('crossbelt')) {
    put0(lifted, sweep(W([[1.5, sd * 1.3], [1.44, sd * .9], [1.36, sd * .46], [1.27, -sd * .05], [1.18, -sd * .6], [1.11, -sd * 1.1], [1.07, -sd * 1.5]]), { seg: 4, capStart: true, capEnd: true }), strap);
    put0(lifted, sweep(W([[1.5, sd * 1.3], [1.44, sd * 1.9], [1.34, sd * 2.45], [1.22, sd * 2.95], [1.12, -sd * 2.75], [1.07, -sd * 2.3]]), { seg: 4, capStart: true, capEnd: true }), strap);
    { const q = surface(r.cR, 1.27, -sd * .05, .013); put0(lifted, new T.Mesh(new T.BoxGeometry(.04, .034, .008), brass).geometry, brass, q.p.toArray() as Pt); }
    pouch(tails, r.rings!, -.02, -sd * .62, -sd * 1.02, black); } // (props sit in front of the hip, clear of the hanging and swinging arm: Book 12)
    arms({ upM: coat, off: .027, cuffM: coat, glove: black, board: board(coat, black, .066, .04, .034, false) });
    legs({ thighM: trou, boot: black, sole: lea(shade(LEATHERD, .55)), top: -.1, heavy: true, turnup: false, fit: .004, bootCuff: black });
  }
  if (id === 'inspector') {
    const coat = c(I('coat')), trou = c(I('trousers')), oxb = c(I('collar')), black = lea(P.cloth.leatherDark), band = c(I('armband')), side = Math.round(look.stature * 1000) % 2 ? 1 : -1;
    const r = jacket(coat, { closed: true, off: .024, hem: .4, hemW: .42, hemD: .32, curve: 1.1, buttons: 7, stand: true, collar: false, trimM: black });
    skirt.drop = Math.min(skirt.drop, .55); skirt.depth = Math.max(skirt.depth, .27); // a greatcoat opens a little in a stride and stays a column
    // a high oxblood collar, stiff and closed at the throat, standing to just under the jaw
    { const nc = ringAt(neckR, 1.52), top = d.chin - .018, cc = [1.49, (1.49 + top) / 2, top].map((y, i) => { const q = ringAt(neckR, Math.min(y, 1.538)); return { y, w: q.w + [.036, .033, .031][i], f: q.f + [.036, .034, .032][i], b: q.b + [.034, .032, .03][i], z: (q.z ?? 0) + .004, n: 2.1 }; }); void nc;
      put0(lifted, loft(cc, { seg: 16, lipEnd: .005, lipStart: .004, key: key('inspcollar') }), oxb);
      put0(lifted, loft([cc[2], { ...cc[2], y: cc[2].y - .006, w: cc[2].w + .004, f: cc[2].f + .004, b: cc[2].b + .004 }], { seg: 16, lipStart: .002, lipEnd: .002, key: key('inspcollaredge') }), black);
      button(lifted, { p: new T.Vector3(0, top - .014, cc[2].f + (cc[2].z ?? 0) + .003), n: new T.Vector3(0, 0, 1) }, brass, .0065); }
    // fitted at the waist, a narrow black belt
    belt(black, 1.085, .036, .016);
    // the back is hard-lined: a centre seam and a plain vent
    stripe(r.rings!, r.rings![0].y, HEM_Y + .02, .17, .003, .012, .005, coat, 6);
    for (const y of steps(-.04, -.46, 4)) button(tails, surface(r.rings!, y, .12, .008), brass, .0085);
    // the back: a belt strap with its two buttons, and a pleat either side of the seam
    put0(lifted, around(r.cR, 1.15, Math.PI - .8, Math.PI + .8, .004, .02, .006, 6), coat); for (const a of [Math.PI - .8, Math.PI + .8]) button(lifted, surface(r.cR, 1.15, a, .011), brass, .008);
    for (const a of [Math.PI - .3, Math.PI + .3]) stripe(r.rings!, r.rings![0].y - .08, HEM_Y + .02, a, .002, .01, .005, coat, 6);
    if (asym.has('ledger')) ledger(tails, r.rings!, -.1, -side * .7, black);
    if (asym.has('truncheon')) truncheon(tails, r.rings!, -.1, side * .9, black);
    if (asym.has('keyRing')) keyRing(tails, r.rings!, -.08, side * .82);
    if (asym.has('whistle')) { const ch = [[1.43, .2], [1.37, .5], [1.31, .72], [1.27, .8]].map(([y, a]) => { const q = surface(r.cR, y, a * side, .008); return { p: q.p.toArray() as Pt, a: .0035, b: .0035, n: q.n.toArray() as Pt }; }); put0(lifted, sweep(ch, { seg: 4, capStart: true, capEnd: true }), brass); const q = surface(r.cR, 1.255, .82 * side, .012); put0(lifted, new T.Mesh(new T.CylinderGeometry(.007, .007, .03, 6)).geometry, brass, q.p.toArray() as Pt, [0, 0, 1.2]); }
    arms({ upM: coat, off: .023, cuffM: coat, glove: black, board: board(black, coat, .1, .05, .044, true), armband: { m: band, side }, guard: asym.has('sleeveGuards') ? c(P.cloth.soot) : undefined });
    legs({ thighM: trou, boot: black, sole: lea(shade(LEATHERD, .55)), top: -.08, turnup: false, fit: .004, bootCuff: black });
  }
  // the two casts whose bodies are built inline (figure.ts) take their trade items from here: the labourer's apron, hook, pouch and rag
  if (id === 'labourer') {
    if (asym.has('leatherApron')) apron(lea(P.cloth.leather), { hemY: .46, hemW: .5, hemD: .5, aw: .92, bib: true, strapM: leatherDM, leather: true });
    if (asym.has('hook')) prop(lifted, () => { // a scrap hook on a belt loop at the hip
      const q = surface(offset(rib, .04), 1.06, .95, .004), hk = [[0, 0, 0], [0, -.07, .004], [0, -.13, .02], [.02, -.17, .04], [.035, -.15, .045]].map(([a, b, c2], i) => ({ p: [q.p.x + a, q.p.y + b, q.p.z + c2] as Pt, a: .0065 - i * .0004, b: .0065 - i * .0004, n: [0, 0, 1] as Pt }));
      put0(lifted, sweep(hk, { seg: 5, capStart: true, capEnd: true }), steel); put0(lifted, plate(offset(rib, .04), [[1.1, .8, 1.1], [1.04, .8, 1.1]], .0, .008, 3), leatherDM); });
    if (asym.has('pouchHip')) pouch(lifted, offset(rib, .04), 1.07, -1.02, -.62, leatherM);
    if (asym.has('ragBelt')) { const q = surface(offset(rib, .04), 1.06, -1.0, .004); put0(lifted, sweep([0, .3, .6, 1].map(t => ({ p: [q.p.x - t * .012, q.p.y - t * .2, q.p.z + .004 + t * .02] as Pt, a: .024, b: .004, n: [0, 0, 1] as Pt })), { seg: 4, capStart: true, capEnd: true }), c(P.cloth.bone)); }
  }
  if (id === 'rowSkirt') {
    const blouse = c(I('bodice')), shawlM = wool(I('shawl')), skirtM = wool(I('skirt')), fringe = c(mix(I('shawl'), P.cloth.bone, .5));
    shirt(blouse, { off: .01, placket: false, collar: true });
    put0(lifted, loft([1.05, 1.1].map(y => ringAt(offset(rib, .02), y)), { seg: 10, lipStart: .003, lipEnd: .003, key: key('bodiceband') }), skirtM);
    shawl(shawlM, fringe);
    const rings = skirtRings(.2, .56, .66, 1.25, 7);
    longShell(rings, { start: 0, arc: Math.PI * 2 }, skirtM, 'longskirt', .014);
    hemLoft(rings, .006, .008, 'hemband', c(shade(I('skirt'), .8)));
    for (let i = 0; i < 7; i++) stripe(rings, rings[0].y, rings[rings.length - 1].y, (i / 7) * Math.PI * 2 + .4, .002, .012, .006, skirtM, 6);
    skirt.drop = .34; skirt.depth = .34;
    if (asym.has('pouchHip')) pouch(tails, rings, -.2, .62, 1.02, leatherM);
    if (asym.has('apronTie')) { const ap = c(P.cloth.bone); apron(ap, { hemY: .44, hemW: .5, hemD: .6, aw: .8, over: rings }); }
    arms({ upM: blouse, off: .017, cuffM: blouse, rolled: s => false });
    legs({ thighM: c(P.cloth.soot), boot: leatherDM, sole: lea(shade(LEATHERD, .7)), soft: true, turnup: false, top: -.3 });
  }
  if (id === 'elder') {
    const coat = wool(I('coat')), vest = wool(I('waistcoat')), trou = wool(I('trousers'));
    shirt(white, { placket: false, collar: true, yoke: false, front: .3 }); void vest; // under a closed coat: the shirt's collar and nothing else shows
    jacket(coat, { closed: true, off: .02, hem: .4, hemW: .5, hemD: .5, curve: 1.1, buttons: 5, stand: true });
    arms({ upM: coat, off: .018, shirtCuff: white });
    legs({ thighM: trou, boot: leatherDM, sole: lea(shade(LEATHERD, .7)), top: -.34, turnup: true });
    const g1 = x.out.grips[1];
    if (asym.has('stick')) { const pts: SweepPt[] = [[0, .09, .0], [0, .05, .0], [0, -.2, 0], [0, -.55, 0], [0, -.84, 0]].map(([a, b, cc], i) => ({ p: [a, b, cc] as Pt, a: i === 0 ? .014 : .0085, b: i === 0 ? .014 : .0085, n: [0, 0, 1] as Pt })); const hook: SweepPt[] = [[0, .09, 0], [0, .125, .03], [0, .115, .06]].map(([a, b, cc]) => ({ p: [a, b, cc] as Pt, a: .011, b: .011, n: [1, 0, 0] as Pt })); put0(g1, sweep(pts, { seg: 5, capStart: true, capEnd: true }), leatherM); put0(g1, sweep(hook, { seg: 5, capStart: true, capEnd: true }), leatherM); x.kit.bake(g1); }
    if (asym.has('basket')) { const bowl = loft([{ y: -.3, w: .09, f: .07, b: .07 }, { y: -.24, w: .125, f: .1, b: .1 }, { y: -.16, w: .14, f: .115, b: .115 }], { seg: 10, capStart: 'flat', lipEnd: .008, key: key('basket') }); put0(g1, bowl, lea(mix(LEATHER, '#b99a6a', .5))); put0(g1, sweep([[-.12, -.17, 0], [-.06, -.02, 0], [0, .0, 0], [.06, -.02, 0], [.12, -.17, 0]].map(([a, b, cc]) => ({ p: [a, b, cc] as Pt, a: .008, b: .008, n: [0, 0, 1] as Pt })), { seg: 4, capStart: true, capEnd: true }), leatherM); x.kit.bake(g1); }
  }
  if (id === 'affluent') {
    const frock = c(I('frock')), vest = c(I('waistcoat')), trou = c(I('trousers')), trim = c(I('trim')), glove = c(P.cloth.cream), lady = look.hat === 'bonnet';
    if (!lady) {
      shirt(white, { placket: false, collar: true }); const vb = waistcoat(vest, { buttons: 4 });
      jacket(frock, { closed: false, aL: asym.has('unevenFront') ? .12 : .26, aR: asym.has('unevenFront') ? .44 : .26, off: .018, hem: .52, hemW: .56, hemD: .46, curve: .9, trimM: trim, buttons: 3 });
      arms({ upM: frock, off: .016, shirtCuff: white, glove, gauntlet: undefined });
      legs({ thighM: trou, boot: leatherDM, sole: lea(shade(LEATHERD, .7)), top: -.3, turnup: false, fit: .005 });
      const cl = ringAt(neckR, 1.53); put0(lifted, loft([1.5, 1.545].map((y, i) => ({ y, w: cl.w + .027, f: cl.f + .027, b: cl.b + .026, z: (cl.z ?? 0) + .004 })), { seg: 12, lipStart: .003, lipEnd: .003, key: key('cravat') }), c(P.cloth.cream));
      if (asym.has('watchChain')) { const pts = [[.0, 1.255], [.02, 1.215], [-.02, 1.19], [-.065, 1.185], [-.085, 1.2]].map(([xx, y], i) => { const q = onFace(vb, y, xx, false, .006); return { p: q.p.toArray() as Pt, a: .0035, b: .0035, n: q.n.toArray() as Pt }; }); put0(x.finery, sweep(pts, { seg: 4, capStart: true, capEnd: true }), brass); const q = onFace(vb, 1.198, -.08, false, .008); put0(x.finery, new T.Mesh(new T.SphereGeometry(.012, 6, 5), brass).geometry, brass, q.p.toArray() as Pt); }
    } else {
      const jk = shirt(frock, { off: .014, placket: false, collar: true, yoke: true }); void jk;
      put0(lifted, loft([1.04, 1.1].map(y => ringAt(offset(rib, .026), y)), { seg: 10, lipStart: .003, lipEnd: .004, key: key('ladyband') }), trim);
      for (const y of steps(1.4, 1.14, 5)) button(lifted, surface(offset(rib, .014), y, 0, .004), brass, .006);
      const rings = skirtRings(.14, .66, .74, 1.3, 7), sk = c(shade(I('frock'), .9));
      longShell(rings, { start: 0, arc: Math.PI * 2 }, sk, 'ladyskirt', .014);
      hemLoft(rings, .008, .01, 'ladyhem', trim);
      skirt.drop = .34; skirt.depth = .4;
      arms({ upM: frock, off: .016, cuffM: trim, glove, rolled: () => false });
      legs({ thighM: c(P.cloth.soot), boot: leatherDM, sole: lea(shade(LEATHERD, .7)), soft: true, turnup: false, top: -.3 });
      if (asym.has('watchChain')) { const q = surface(offset(rib, .02), 1.33, .3, .006); put0(x.finery, sweep([0, .5, 1].map(t => ({ p: [q.p.x - .06 * t, q.p.y - .1 * t, q.p.z + .0] as Pt, a: .004, b: .004, n: [0, 0, 1] as Pt })), { seg: 4, capStart: true, capEnd: true }), brass); }
    }
  }
  if (id === 'stallholder') {
    const blouse = c(I('blouse')), skirtM = wool(I('skirt')), ap = c(I('apron')), tie = c(shade(I('apron'), .85));
    shirt(blouse, { off: .012, placket: false, collar: true });
    const rings = skirtRings(.2, .6, .66, 1.2, 7);
    longShell(rings, { start: 0, arc: Math.PI * 2 }, skirtM, 'stallskirt', .014);
    hemLoft(rings, .006, .008, 'stallhem', c(shade(I('skirt'), .8)));
    skirt.drop = .34; skirt.depth = .34;
    apron(ap, { hemY: .36, hemW: .5, hemD: .6, aw: .95, bib: true, strapM: tie, over: rings });
    if (asym.has('pouchHip')) pouch(lifted, offset(rib, .04), 1.06, -1.02, -.62, leatherM);
    arms({ upM: blouse, off: .017, rolled: () => true });
    legs({ thighM: c(P.cloth.soot), boot: leatherDM, sole: lea(shade(LEATHERD, .7)), heavy: true, turnup: false, top: -.3 });
  }
  if (id === 'shopMerchant') {
    const vest = c(I('waistcoat')), sh = c(I('shirt')), trou = wool(I('trousers')), ap = c(I('apron')), garter = lea(mix(P.cloth.burgundy, '#202020', .3));
    shirt(sh, { off: .008, placket: false, collar: true }); const vb = waistcoat(vest, { buttons: 4 });
    for (const sy of [1.36, 1.25]) put0(lifted, plate(offset(rib, .02), [[sy, -.9, -.45], [sy - .05, -.9, -.45]], .0, .005, 3), vest);
    apron(ap, { hemY: .38, hemW: .46, hemD: .5, aw: .9, bib: false });
    arms({ upM: sh, off: .014, shirtCuff: undefined, garter: asym.has('sleeveGarters') ? garter : undefined, rolled: s => s < 0 });
    legs({ thighM: trou, boot: leatherDM, sole: lea(shade(LEATHERD, .7)), top: -.34, turnup: true });
    if (asym.has('watchChain')) { const pts = [[.0, 1.255], [.02, 1.215], [-.02, 1.19], [-.065, 1.185], [-.085, 1.2]].map(([xx, y]) => { const q = onFace(vb, y, xx, false, .006); return { p: q.p.toArray() as Pt, a: .0035, b: .0035, n: q.n.toArray() as Pt }; }); put0(x.finery, sweep(pts, { seg: 4, capStart: true, capEnd: true }), brass); }
  }
  if (id === 'foundry') {
    const sh = c(I('shirt')), trou = wool(I('trousers')), apM = lea(I('apron')), strap = leatherDM, gaunt = lea(shade(LEATHER, .85));
    shirt(sh, { off: .008, placket: true, collar: true });
    const rings = offset(skirtRings(.3, .5, .52, 1.1, 7), .016), arc = { start: -.85, arc: 1.7 };
    longShell(rings, arc, apM, 'slab', .01);
    for (const a of [-.85, .85]) stripe(rings, rings[0].y, rings[rings.length - 1].y, a * .98, .001, .008, .004, edgeM);
    bandAt(rings, rings[rings.length - 1].y, -.85, .85, .002, .008, .004, edgeM); skirt.drop = .38; skirt.depth = .31;
    const bibR = offset(rib, .02); put0(lifted, plate(bibR, [[1.42, -.32, .32], [1.34, -.5, .5], [1.2, -.62, .62], [1.1, -.66, .66]], .0, .006, 6), apM);
    bibStraps(s => surface(bibR, 1.42, s * .28, .008).p, .012, edgeM); void strap; // in the binding's lighter leather, so they read across a dark shirt
    put0(lifted, loft([1.08, 1.13].map(y => ringAt(offset(rib, .028), Math.min(y, 1.1))), { seg: 10, lipStart: .003, lipEnd: .003, key: key('slabbelt') }), strap); for (const s of [-1, 1]) button(lifted, surface(offset(rib, .03), 1.11, s * .14, .004), steel, .008);
    if (asym.has('pouchHip')) pouch(lifted, offset(rib, .04), 1.07, .62, 1.02, leatherM);
    arms({ upM: sh, off: .015, rolled: () => true, gauntlet: gaunt, glove: gaunt });
    legs({ thighM: trou, boot: leatherDM, sole: lea(shade(LEATHERD, .6)), heavy: true, top: -.3, turnup: false, bootCuff: leatherM });
  }
  if (id === 'youngMechanic') {
    const jk = wool(I('jacket')), sh = c(I('shirt')), trou = wool(I('trousers')), glove = lea(I('roll'));
    shirt(sh, { placket: true, collar: true, yoke: false, front: 1.1 });
    const r = jacket(jk, { off: .02, aL: .45, aR: .45, hem: .86, hemW: .46, hemD: .34, buttons: 2, lapel: false, stand: false });
    belt(leatherM, 1.07, .05);
    const hipR = offset(rib, .05), side = asym.has('toolRoll') ? 1 : -1;
    pouch(lifted, hipR, 1.05, side * .6, side * 1.0, leatherM);
    if (asym.has('toolRoll')) prop(lifted, () => { const q = surface(hipR, .99, -.78, .028), roll = loft([{ y: -.075, w: .026, f: .026, b: .026 }, { y: 0, w: .031, f: .031, b: .031 }, { y: .075, w: .026, f: .026, b: .026 }], { seg: 7, capStart: 'flat', capEnd: 'flat', key: key('toolroll2') }); put0(lifted, roll, c(I('roll')), q.p.toArray() as Pt, [0, 0, -.12]); put0(lifted, around(hipR, 1.05, -.95, -.6, .02, .008, .004, 5), leatherDM); }); // a roll of tools hung upright from the belt in front of the hip, where the forearm never passes const m = put0(lifted, roll, c(I('roll')), q.p.toArray() as Pt, [0, 0, 1.4]); m.rotation.set(0, 0, Math.PI / 2); put0(lifted, around(hipR, 1.05, -1.42, -1.08, .02, .008, .004, 5), leatherDM); });
    if (asym.has('ragBelt')) put0(tails, sweep([0, .3, .6, 1].map(t => ({ p: [-.17 - t * .012, -.04 - t * .2, r.rings![0].f + .03] as Pt, a: .024, b: .004, n: [0, 0, 1] as Pt })), { seg: 4, capStart: true, capEnd: true }), c(P.cloth.bone));
    // Finch's winged valve, in brass on the right sleeve: a disc and a wing either side
    const valve = (sh: T.Group, side: number) => { if (side < 0 || !asym.has('valveSleeve')) return; const X0 = d.armW / 2 + .017 + .004;
      put0(sh, new T.Mesh(new T.CylinderGeometry(.015, .015, .004, 10)).geometry, brass, [X0, -.1, 0], [0, 0, Math.PI / 2]);
      for (const z of [-1, 1]) put0(sh, sweep([[0, 0], [.012, .014], [.02, .03]].map(([dz, dy], i) => ({ p: [X0 + .001, -.1 + dy * .5, z * (.016 + dz)] as Pt, a: .004 * (3 - i) / 2, b: .0015, n: [1, 0, 0] as Pt })), { seg: 4, capStart: true, capEnd: true }), brass); };
    arms({ upM: jk, off: .017, shirtCuff: sh, glove, board: valve });
    legs({ thighM: trou, boot: leatherM, sole: lea(shade(LEATHERD, .6)), top: -.08, turnup: false, heavy: false, bootCuff: leatherDM, fit: .005 });
  }
  if (id === 'olderMechanic') {
    const coat = c(I('shopCoat')), sh = c(I('shirt')), trou = wool(I('trousers'));
    shirt(sh, { placket: false, collar: true, yoke: false, front: .3 });
    const r = jacket(coat, { closed: true, off: .02, hem: .48, hemW: .54, hemD: .46, curve: 1, buttons: 5, stand: true });
    for (const s of [-1, 1]) put0(tails, plate(r.rings!, [[-.1, s * .6, s * 1.15], [-.24, s * .6, s * 1.15]], .0, .008, 4), coat);
    put0(lifted, plate(r.cR, [[1.3, -1.25, -.8], [1.22, -1.25, -.8]], .0, .007, 3), coat);
    if (asym.has('ragBelt')) put0(tails, sweep([0, .3, .6, 1].map(t => ({ p: [.15 + t * .01, -.04 - t * .22, r.rings![0].f + .03] as Pt, a: .025, b: .004, n: [0, 0, 1] as Pt })), { seg: 4, capStart: true, capEnd: true }), c(P.cloth.bone));
    arms({ upM: coat, off: .019, shirtCuff: sh });
    legs({ thighM: trou, boot: leatherDM, sole: lea(shade(LEATHERD, .7)), top: -.34, turnup: true });
  }
  if (id === 'courier') {
    const jk = wool(I('jacket')), sh = c(I('shirt')), trou = wool(I('trousers')), bag = lea(I('satchel')), strapSide = asym.has('satchelStrap') ? -1 : 1;
    shirt(sh, { placket: true, collar: true, yoke: false, front: .8 });
    const r = jacket(jk, { off: .02, aL: .2, aR: .2, hem: .88, hemW: .4, hemD: .32, buttons: 3, lapel: false });
    belt(leatherDM, 1.06, .045);
    // the satchel strap wraps the jacket's own surface: over the shoulder, across the chest, round the side to the bag on the opposite hip
    const sd = strapSide, pts: SweepPt[] = [[1.52, sd * 1.35], [1.46, sd * .85], [1.38, sd * .42], [1.28, -sd * .05], [1.18, -sd * .6], [1.08, -sd * 1.05], [1.0, -sd * 1.5]].map(([y, a]) => { const q = surface(r.cR, y, a, .008); return { p: q.p.toArray() as Pt, a: .02, b: .005, n: q.n.toArray() as Pt }; });
    const back: SweepPt[] = [[1.52, sd * 1.35], [1.46, sd * 1.95], [1.34, sd * 2.5], [1.22, sd * 2.95], [1.1, -sd * 2.7], [1.0, -sd * 2.0]].map(([y, a]) => { const q = surface(r.cR, y, a, .008); return { p: q.p.toArray() as Pt, a: .02, b: .005, n: q.n.toArray() as Pt }; });
    if (!asym.has('noSatchel')) {
    put0(lifted, sweep(pts, { seg: 4, capStart: true, capEnd: true }), bag); put0(lifted, sweep(back, { seg: 4, capStart: true, capEnd: true }), bag);
    if (asym.has('threadStrap')) put0(lifted, sweep(pts.map(p => ({ ...p, p: [p.p[0] + p.n![0] * .0035, p.p[1] + p.n![1] * .0035, p.p[2] + p.n![2] * .0035] as Pt, a: .004, b: .002 })), { seg: 4, capStart: true, capEnd: true }), kit.plain(P.cloth.turquoise));
    const q = surface(r.cR, .96, -sd * 1.5, .02), bg = new T.Group(); bg.position.copy(q.p); bg.rotation.set(0, -sd * 1.5 + Math.PI / 2 * 0, 0); lifted.add(bg); bg.rotation.y = Math.atan2(q.n.x, q.n.z);
    put0(bg, loft([{ y: -.1, w: .115, f: .045, b: .045, n: 2.6 }, { y: 0, w: .125, f: .052, b: .052, n: 2.6 }, { y: .1, w: .12, f: .048, b: .048, n: 2.6 }], { seg: 10, capStart: 'flat', capEnd: 'flat', key: key('bag') }), bag, [0, -.04, .05]);
    put0(bg, plate([{ y: .1, w: .125, f: .05, b: .05, z: .05, n: 2.6 }, { y: -.0, w: .13, f: .056, b: .056, z: .05, n: 2.6 }], [[.1, -1.1, 1.1], [.0, -1.15, 1.15], [-.04, -.7, .7]], .0, .008, 6), edgeM, [0, -.04, 0]);
    put0(bg, new T.Mesh(new T.BoxGeometry(.03, .026, .008), brass).geometry, brass, [0, -.07, .112]); }
    arms({ upM: jk, off: .017, shirtCuff: sh });
    legs({ thighM: trou, boot: leatherM, sole: lea(shade(LEATHERD, .55)), heavy: true, top: -.22, turnup: false, fit: .004, bootCuff: leatherDM });
  }
  if (id === 'child') {
    const coat = wool(I('coat')), sh = c(I('shirt')), trou = wool(I('trousers'));
    shirt(sh, { placket: false, collar: true });
    jacket(coat, { off: .018, closed: true, hem: .9, hemW: .38, hemD: .3, buttons: 3, stand: false });
    arms({ upM: coat, off: .015, shirtCuff: sh });
    legs({ thighM: trou, boot: leatherDM, sole: lea(shade(LEATHERD, .7)), top: -.3, turnup: false, soft: true, hem: -.38 });
  }
  void bare; void kerchiefBand; void kerchiefTails; void strip;
}

/** What a cast wears on the head and face besides its hat: goggles, spectacles, a pencil. Built in the head's own frame, from the skull, on the chin-origin frame of the head group. */
export function headgear(x: X, hg: T.Group, h: number) {
  const { look, asym, kit } = x, id = look.cast, k = h / .285, L = landmarks(h, look.headShape), rg = skullRings(look.headShape, h), faceZ = (y: number) => { const r = ringAt(rg, y); return (r.z ?? 0) + r.f; };
  const brass = x.brass, lens = kit.plain('#9fc4cc'), strap = kit.plain(P.cloth.leatherDark), rim = kit.plain(P.cloth.leather);
  const eyeX = .0422 * k;
  if (id === 'foundry' || id === 'youngMechanic') {
    const up = asym.has('gogglesUp'), g = new T.Group();
    const barrel = (s: number) => { const m = new T.Group(); put0(m, loft([{ y: 0, w: .03 * k, f: .027 * k, b: .027 * k }, { y: .018 * k, w: .031 * k, f: .028 * k, b: .028 * k }, { y: .026 * k, w: .026 * k, f: .023 * k, b: .023 * k }], { seg: 8, capStart: 'flat', capEnd: 'flat', key: `gog/${h}` }), rim); put0(m, loft([{ y: .026 * k, w: .022 * k, f: .019 * k, b: .019 * k }, { y: .029 * k, w: .02 * k, f: .017 * k, b: .017 * k }], { seg: 10, capEnd: 'flat', key: `gogl/${h}` }), lens); m.position.set(s * eyeX, 0, 0); return m; };
    if (up) {
      const y = (look.hat === 'none' ? .205 : .215) * k, z = faceZ(Math.min(y, .25 * k)) + .012 * k;
      put0(hg, loft([{ y: y - .014 * k, w: .122 * k, f: .134 * k, b: .134 * k, z: L.z0 }, { y: y + .014 * k, w: .122 * k, f: .134 * k, b: .134 * k, z: L.z0 }], { seg: 18, lipStart: .002, lipEnd: .002, key: `gogband/${h}` }), strap);
      for (const s of [-1, 1]) { const b = barrel(s); b.rotation.x = Math.PI / 2 - .35; b.position.set(s * eyeX, y, z); g.add(b); }
      put0(g, new T.Mesh(new T.BoxGeometry(.02 * k, .008 * k, .01 * k)).geometry, brass, [0, y, z + .028 * k]); hg.add(g);
    } else {
      // hanging round the neck
      const lg = new T.Group(); lg.position.set(0, -.06, .09); for (const s of [-1, 1]) { const b = barrel(s); b.rotation.x = Math.PI / 2; b.position.set(s * .03, 0, 0); lg.add(b); } hg.add(lg);
    }
  }
  if (asym.has('spectacles')) {
    const y = .435 * h + .002, z = faceZ(y) + .01 * k;
    for (const s of [-1, 1]) {
      const ringPts: SweepPt[] = Array.from({ length: 13 }, (_, i) => { const t = i / 12 * Math.PI * 2; return { p: [s * eyeX + Math.cos(t) * .02 * k, y + Math.sin(t) * .019 * k, z] as Pt, a: .0014 * k, b: .0014 * k, n: [0, 0, 1] as Pt }; });
      put0(hg, sweep(ringPts, { seg: 4, closed: true }), brass);
      const sx = s * (eyeX + .02 * k), tp: SweepPt[] = [0, .25, .5, .75, 1].map(t => { const a = .85 + t * .8, r = surfaceAt(rg, y, s > 0 ? a : -a); return { p: [r[0] * (1 + .02 * t), y + .004 * k, r[2] + .004 * k] as Pt, a: .0013 * k, b: .0013 * k, n: [0, 1, 0] as Pt }; }); void sx;
      put0(hg, sweep([{ p: [s * (eyeX + .018 * k), y + .004 * k, z] as Pt, a: .0013 * k, b: .0013 * k, n: [0, 1, 0] as Pt }, ...tp], { seg: 4, capStart: true, capEnd: true }), brass);
    }
    put0(hg, sweep([[-.021, 0, 0], [0, .006, .004], [.021, 0, 0]].map(([dx, dy, dz]) => ({ p: [dx * k, y + .006 * k + dy * k, z + dz * k] as Pt, a: .0013 * k, b: .0013 * k, n: [0, 0, 1] as Pt })), { seg: 4, capStart: true, capEnd: true }), brass);
  }
  if (asym.has('scarfUp')) { // the scarf drawn up over the chin and mouth
    const ys = [.002, .05, .11, .17, .215].map(f => f * h), cr = ys.map((y, i) => { const r = ringAt(rg, y); return { ...r, y, w: r.w + (.013 + i * .0005) * k, f: r.f + (.012 + i * .001) * k, b: r.b + .012 * k }; });
    put0(hg, loft(cr, { seg: 16, lipStart: .004, lipEnd: .006, key: `scarfup/${h}/${look.headShape}` }), kit.cloth(x.pal.scarf ?? P.cloth.slate)); }
  if (asym.has('pencilEar')) {
    const y = .43 * h, r = surfaceAt(rg, y + .07 * k, 1.7), p: SweepPt[] = [[0, 0], [1, 0]].map(([t]) => ({ p: [r[0] + .006 * k, y + .045 * k, r[2] - .01 * k + t * .035 * k] as Pt, a: .0032 * k, b: .0032 * k, n: [1, 0, 0] as Pt })); void p;
    put0(hg, sweep([{ p: [r[0] + .01 * k, y + .05 * k, r[2] - .03 * k], a: .0032 * k, b: .0032 * k, n: [1, 0, 0] }, { p: [r[0] + .012 * k, y + .045 * k, r[2] + .025 * k], a: .0032 * k, b: .0032 * k, n: [1, 0, 0] }], { seg: 4, capStart: true, capEnd: true }), kit.plain('#b8602f'));
  }
}
const surfaceAt = (rg: Ring[], y: number, a: number): [number, number, number] => { const s = surface(rg, y, a, .003); return [s.p.x, s.p.y, s.p.z]; };
