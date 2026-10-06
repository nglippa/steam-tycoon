import * as T from 'three';
import { loft, sweep, place, plate, offset, ringAt, surface, onFace, type Ring, type SweepPt } from './loft';
import { dimsOf, ribcage, pelvis as pelvisRings, neck as neckRings, upperArm, forearm, thigh as thighRings, shin as shinRings, ring, RIG, type Dims } from './body';
import { CASTS, paletteOf, type CastId, type Look } from './look';
import { skull, ear, facialOf, skullRings, CHIN_TO_PIVOT } from './head';
import { hairOf } from './hair';
import { hatOf } from './hat';
import { hand, foot, put0, strip, seam, around, steps, button, kerchiefBand, kerchiefTails } from './parts';
import { palette as P } from '../palette';
import { dress, headgear, WARDROBE, HEM_Y } from './wardrobe';

/** The people builder (Terra Character Book 5 and 8): a figure from a resolved Look, on the rig `animateLife` and `gait.ts` are solved against. A body reference (body.ts) that is mostly
 *  never drawn, garments as shells measured from it, the head built as a head (head.ts), hands and shoes (parts.ts). It returns the node set the old `citizen()` returns before its tail. */

/** What the builder needs from the world's material setup (supplied by `citizens.ts`, so this module imports no materials and no DOM). */
export interface Kit {
  /** a baked cloth material for a colour (and the colour it is in better times) */ cloth(color: string, late?: string): T.Material;
  /** a baked plain material (hair, metal, leather): no cloth map; `late` is its colour in better times */ plain(color: string, late?: string): T.Material;
  skin: T.Material[]; face(tone: number): T.Material; bake(g: T.Group): T.Group; contact: T.Mesh;
}
export interface FigureOpts { solo?: boolean; mask?: boolean; /** dev: no hair, hat or facial hair (the head-formula sheet) */ bare?: boolean }

/** TODO (next task): `labourer`, `rowCoat` and the ten wardrobe.ts casts are dressed; only `garrison` and `inspector` fall back. Every other cast is built as the nearest of these, in its own family, body, head, hands and hair, until its wardrobe is
 *  authored. This is the one place that says so. */
export const BUILT: readonly CastId[] = ['labourer', 'rowCoat', ...WARDROBE];
const NEAREST: Record<CastId, 'labourer' | 'rowCoat'> = { labourer: 'labourer', rowCoat: 'rowCoat', rowSkirt: 'rowCoat', elder: 'rowCoat', affluent: 'rowCoat', stallholder: 'rowCoat', shopMerchant: 'rowCoat', foundry: 'labourer', youngMechanic: 'rowCoat', olderMechanic: 'rowCoat', courier: 'rowCoat', garrison: 'rowCoat', inspector: 'rowCoat', child: 'rowCoat' };
export function dressedAs(look: Look): Look {
  const near = NEAREST[look.cast]; if (near === look.cast || (WARDROBE as readonly string[]).includes(look.cast)) return look;
  const cast = CASTS[near], outfit = cast.outfits[0], pal = Object.keys(outfit.palettes)[0], hat = cast.hats.includes(look.hat) ? look.hat : 'none';
  const asym = look.asymmetries.filter(a => cast.asymmetries.includes(a)); if (!asym.length) asym.push(cast.asymmetries[0]);
  return { ...look, cast: near, outfit: outfit.id, palette: pal, hat, asymmetries: asym.slice(0, 2) };
}

const LIFT = .01;

export function buildFigure(want: Look, opts: FigureOpts, kit: Kit) {
  const look = dressedAs(want), fresh = (WARDROBE as readonly string[]).includes(look.cast), d = dimsOf(look.family, look.frame), h = d.h, k = h / .285;
  const pal = paletteOf(look), sw = (n: keyof typeof P.cloth) => kit.cloth(P.cloth[n]), col = (hex: string) => kit.cloth(hex ?? '#777777');
  const skin = kit.skin[look.skin], brass = kit.plain(P.metal.agedBrass), hairHex = P.hair2[look.hairColour], asym = new Set(look.asymmetries);
  const hairMat = kit.plain(hairHex), hairShade = kit.plain('#' + new T.Color(hairHex).multiplyScalar(.7).getHexString());
  const group = new T.Group(), body = new T.Group(), pelvisG = new T.Group(); group.add(body); group.add(pelvisG);
  const contact = kit.contact; contact.rotation.x = -Math.PI / 2; contact.position.y = -.10; contact.scale.y = .7; group.add(contact);
  const lab = look.cast === 'labourer';

  // ---- the body reference, in sole heights; torso parts hang from `lifted` so that body-local y is the height above the sole plus .01
  const rib = ribcage(d), pel = pelvisRings(d), neckR = neckRings(d), dk = JSON.stringify(d);
  const lifted = new T.Group(); lifted.position.y = LIFT; body.add(lifted); const pelLift = new T.Group(); pelLift.position.y = LIFT; pelvisG.add(pelLift);
  // the drawn neck: the body reference's column, carried on up behind the jaw into the skull (Book 6). Its throat is set back under the jaw so the jaw has an underside plane, and its
  // back rises into the occiput, so no rim or step shows between the neck and the head in profile, even when the head nods. The reference (and so every collar) is unchanged.
  const headZ = .012 + d.headFwd, nt = neckR[neckR.length - 1], at = (dy: number, front: number, back: number, wf: number): Ring => ({ y: d.chin + dy * k, w: nt.w * wf, f: (front - back) / 2 * k, b: (front - back) / 2 * k, z: headZ + (front + back) / 2 * k, n: 2.1 });
  const neckDrawn = [...neckR.slice(0, -1), at(.03, .046, -.032, 1), at(.058, .03, -.06, 1.02), at(.09, 0, -.082, .98)];
  put0(lifted, loft(neckDrawn, { seg: 10, capStart: 'flat', capEnd: 'flat', key: `neck/${dk}` }), skin);

  // ---- what each cast wears
  const shirtM = col(lab ? pal.shirt : P.cloth.bone), trouM = col(pal.trousers), leather = sw('leather'), leatherDark = sw('leatherDark'), soot = sw('soot');
  const coatM = lab ? shirtM : col(pal.coat), vestM = col(lab ? pal.shirt : pal.waistcoat), capM = fresh ? kit.cloth(pal.cap ?? pal.hat ?? pal.kerchief ?? pal.scarf, undefined) : col(pal.cap), neckM = col(lab ? pal.kerchief : (pal.scarf ?? pal.kerchief ?? pal.shirt ?? pal.coat));
  const bootM = lab ? leatherDark : leather, soleM = lab ? soot : leatherDark;
  const shirtR = offset(rib, .007, (_, i) => ({ w: i >= 3 && i <= 5 ? .003 : 0, f: i >= 3 && i <= 5 ? .004 : 0 }));
  const g = { aL: .3, aR: .3 }; // the coat's front edges (radians either side of centre): the gap the waistcoat shows through
  if (asym.has('unevenFront')) { g.aL = .12; g.aR = .44; }
  const closed = look.outfit.endsWith('closed'), coatOff = .022, vested = look.outfit === 'labourer.vested';
  const coatR = offset(rib, coatOff, (_, i) => ({ w: i < 2 ? .004 : 0, f: i < 3 ? .006 : 0 }));
  const arc0 = closed ? { start: 0, arc: Math.PI * 2 } : { start: g.aL, arc: Math.PI * 2 - g.aL - g.aR };

  const arms: T.Group[] = [], elbows: T.Group[] = [], grips: T.Group[] = [], legs: T.Group[] = [], knees: T.Group[] = [], ankles: T.Group[] = [];
  const scarf = new T.Group(); scarf.position.set(-.035, 1.5 + LIFT, .075 + d.belly * .4); body.add(scarf);
  const tails = new T.Group(); tails.position.y = 1.08; pelvisG.add(tails);
  const skirt = { drop: 0, depth: 0 }, hem = new T.Group(); hem.position.y = HEM_Y;
  const worn = new T.Group(); body.add(worn); const finery = new T.Group(); body.add(finery); finery.visible = false;
  const X = { look, d, k, kit, asym, pal, rib, pel, neckR, dk, lifted, pelLift, body, group, pelvisG, tails, hem, skirt, scarf, worn, finery, skin, brass, neckM, out: { arms, elbows, grips, legs, knees, ankles } };
  if (fresh) { dress(X); kit.bake(lifted); kit.bake(pelLift); }
  else {
  // ================================================================ torso
  if (lab) {
    put0(lifted, loft(shirtR, { seg: 10, lipEnd: .003, key: `shirt/${dk}` }), shirtM);
    if (vested) { // a work waistcoat over the shirt in place of braces: the same shell as a gentleman's, in the 'braces' colour
      const vb = offset(rib, .022), vr = [1.125, 1.2, 1.3, 1.36, 1.41].map(y => ringAt(vb, y)); // narrowed above the chest: armholes, then straps toward the neck
      { const r = ringAt(vb, 1.41); vr.push({ ...r, y: 1.445, w: r.w * .86, f: r.f * .92, b: r.b * .92 }); }
      put0(lifted, loft(vr, { seg: 10, lipEnd: .004, lipStart: .004, key: `workvest/${dk}` }), col(pal.braces));
      for (const y of steps(1.13, 1.28, 2)) button(lifted, surface(vb, y, 0, .004), brass, .0065);
      put0(lifted, plate(vb, [[1.43, -.34, .34], [1.38, -.27, .27], [1.33, -.16, .16], [1.28, -.04, .04]], .0, .003, 6), shirtM);
    } else placket(lifted, shirtR, shirtM, brass);
    put0(lifted, around(shirtR, 1.405, Math.PI - .9, Math.PI + .9, .002, .008, .0035, 5), shirtM);
    put0(lifted, seam(shirtR, steps(1.4, 1.1, 5), () => Math.PI, .002, .007, .0035), shirtM);
    kerchiefBand(lifted, neckR, neckM);
  } else {
    // the shirt's turned collar, the waistcoat over it, the coat over both
    const cr = ringAt(neckR, 1.52), collar = [1.51, 1.535, 1.565].map((y, i) => ({ y, w: cr.w + [.01, .016, .018][i], f: cr.f + [.01, .016, .018][i], b: cr.b + [.009, .015, .017][i], z: (cr.z ?? 0) + .003, n: 2.1 }));
    put0(lifted, loft(collar, { seg: 12, lipEnd: .003, key: `shirtcollar/${dk}` }), shirtM);
    const vestBase = offset(rib, .013), vest = [1.125, 1.2, 1.3, 1.36, 1.43].map(y => ringAt(vestBase, y));
    put0(lifted, loft(vest, { seg: 10, lipEnd: .004, key: `vest/${dk}` }), vestM);
    for (const y of steps(1.13, 1.28, 2)) button(lifted, surface(vestBase, y, 0, .004), brass, .0065);
    put0(lifted, plate(vestBase, [[1.43, -.34, .34], [1.38, -.27, .27], [1.33, -.16, .16], [1.28, -.04, .04]], .0, .003, 6), shirtM);
    // the coat: a shell 22 mm off the ribcage, hugging the shoulder and hanging from the chest, open or overlapped in front
    put0(lifted, loft(coatR, { seg: 10, ...arc0, lipEnd: .003, key: `coat/${dk}/${arc0.start}/${arc0.arc}` }), coatM);
    const ys = steps(1.5, 1.045, 5);
    if (!closed) for (const a of [g.aL, -g.aR]) put0(lifted, seam(coatR, ys, () => a, .002, .018, .005), coatM);
    else {
      // overlapped and buttoned in front: the left flap lies over the right, a little off centre
      put0(lifted, plate(coatR, steps(1.47, 1.05, 8).map(y => [y, -.6, .17]), .0, .006, 8), coatM);
      for (const y of steps(1.42, 1.12, 3)) button(lifted, surface(coatR, y, .1, .0075), brass, .0085);
    }
    // collar (stood at the back, turned over at the front) and lapels that lie ON the chest and curve with it
    const nc = ringAt(neckR, 1.52), cc = [1.508, 1.536, 1.572].map((y, i) => ({ y, w: nc.w + [.021, .03, .038][i], f: nc.f + [.021, .03, .036][i], b: nc.b + [.02, .03, .038][i], z: (nc.z ?? 0) + .004, n: 2.1 }));
    put0(lifted, loft(cc, { seg: 14, ...(closed ? { start: 0, arc: Math.PI * 2 } : { start: .7, arc: Math.PI * 2 - 1.4 }), lipEnd: .007, lipStart: .004, key: `collar/${dk}/${closed}` }), coatM);
    if (!closed) for (const [s, e] of [[1, g.aL], [-1, -g.aR]] as const) put0(lifted, plate(coatR, [[1.488, .25], [1.43, .5], [1.36, .55], [1.28, .45], [1.2, .18]].map(([y, w]) => [y, e, e + s * w]), .0, .007, 3), coatM);
    // the back is designed too: a centre seam, a yoke seam across the shoulder blades, a waist strap with two buttons
    put0(lifted, seam(coatR, steps(1.5, 1.045, 8), () => Math.PI, .002, .006, .0035), coatM);
    put0(lifted, around(coatR, 1.41, Math.PI - .85, Math.PI + .85, .002, .006, .0035, 6), coatM);
    kerchiefBand(lifted, neckR, neckM, .004);
    if (!closed) for (const y of steps(1.36, 1.12, 2)) button(lifted, surface(coatR, y, g.aL, .009), brass, .0075);
  }

  // ================================================================ pelvis, trousers
  { const hips = offset(pel, .012), cut = hips.map((r, i) => i === 0 ? { ...r, y: 1.14, w: r.w + .004, f: r.f + .004, b: r.b + .004 } : r);
    put0(pelLift, loft(cut, { seg: 12, capEnd: 'flat', key: `trousers/${dk}` }), trouM);
    const band = [1.065, 1.1, 1.145].map(y => { const r = ringAt(rib, Math.min(y, 1.13)), p = ringAt(pel, y); return { y, w: Math.max(r.w, p.w) + .017, f: Math.max(r.f, p.f) + .016, b: Math.max(r.b, p.b) + .014, z: p.z, n: 2.2 }; });
    if (lab) put0(pelLift, loft(band, { seg: 12, lipEnd: .005, lipStart: .004 }), trouM);
    if (lab && !vested) braces(pelLift, d, rib, pel, col(pal.braces), brass, asym.has('braceDown'));
    if (vested) braces(pelLift, d, rib, pel, col(pal.braces), brass, false, true);
    if (lab) { put0(pelLift, seam(hips, steps(1.13, .93, 3), () => 0, .003, .005, .003), trouM); }
    // back pockets, on the seat
    if (lab) for (const s of [-1, 1]) put0(pelLift, plate(hips, [[1.0, s * 2.5, s * 3.0], [.92, s * 2.5, s * 3.0]], .0, .007, 2), trouM);
  }
  kit.bake(body); kit.bake(pelvisG);

  // ================================================================ arms
  for (const side of [-1, 1]) {
    const sh = new T.Group(); sh.position.set(side * d.shX, RIG.shoulder + LIFT, 0); body.add(sh); arms.push(sh);
    const up = upperArm(d), off = lab ? .006 : coatOff - .003, fore = forearm(d);
    put0(sh, loft(offset(up, off).filter((_, i) => i !== 2), { seg: 7, capStart: { round: d.rSh + off }, capEnd: { round: d.elbowR + off }, key: `sleeve/${off}/${dk}` }), coatM);
    kit.bake(sh);
    const el = new T.Group(); el.position.set(0, -RIG.upperArm, 0); sh.add(el); elbows.push(el);
    const rolled = lab || (asym.has('sleeveRolled') && side < 0), at = (y: number, e: number) => { const r = ringAt(fore, y); return { ...r, w: r.w + e, f: r.f + e, b: r.b + e }; };
    put0(el, loft(fore, { seg: 6, capStart: { round: d.elbowR }, key: `fore/${dk}` }), skin);
    if (rolled) {
      // a bare forearm under a rolled cuff: the roll is a thick band that belongs to the forearm and wears the same cap as the sleeve above it
      put0(el, loft([at(0, .007), at(-.012, .015), at(-.05, .018)], { seg: 6, capStart: { round: d.elbowR + .007 }, lipEnd: .011, key: `roll/${dk}` }), coatM);
    } else {
      // the coat's forearm to a turned cuff, the shirt's cuff showing a centimetre below it
      put0(el, loft([at(-.2, .009), at(-.243, .009)], { seg: 8, lipEnd: .004, key: `shirtcuff/${dk}` }), shirtM);
      put0(el, loft([at(0, off), at(-.1, off - .001), at(-.205, off - .004)], { seg: 8, capStart: { round: d.elbowR + off }, lipEnd: .007, key: `coatfore/${dk}` }), coatM);
      put0(el, loft([at(-.15, off + .006), at(-.205, off + .004)], { seg: 8, lipEnd: .008, lipStart: .004, key: `cuff/${dk}` }), coatM);
    }
    put0(el, hand(d, side), skin, [0, -RIG.forearm, 0]);
    kit.bake(el);
    const grip = new T.Group(); grip.position.set(-side * .028, -.312, .004); el.add(grip); grips.push(grip);
  }

  // ================================================================ legs
  for (const side of [-1, 1]) {
    const hip = new T.Group(); hip.position.set(side * d.hipX, RIG.hip + LIFT, 0); group.add(hip); legs.push(hip);
    const th = thighRings(d, side), inward = -side * .022, to = lab ? .008 : .006;
    put0(hip, loft(offset(th, to).filter((_, i) => i !== 3), { seg: 7, capStart: { round: d.hipR + to }, capEnd: { round: d.kneeR + to }, key: `thigh/${side}/${lab}/${dk}` }), trouM);
    kit.bake(hip);
    const knee = new T.Group(); knee.position.set(inward, -RIG.thigh, 0); hip.add(knee); knees.push(knee);
    const sn = shinRings(d), hem = -.452, shinCut = [...sn.filter(r => r.y > hem + .02), { ...ringAt(sn, hem), y: hem }];
    put0(knee, loft(offset(shinCut, to, (_, i) => i === shinCut.length - 1 ? { w: .008, f: .006, b: .006 } : {}), { seg: 7, capStart: { round: d.kneeR + to }, lipEnd: .007, key: `shin/${lab}/${dk}` }), trouM);
    if (lab || true) { // the knee breaks: a kneecap plane at the front, a crease behind, and a turned-up cuff with a thickness over the shoe
      const so2 = offset(shinCut, to); put0(knee, plate(so2, [[-.005, -.85, .85], [-.06, -.75, .75], [-.115, -.5, .5]], .0, .008, 3), trouM);
      const cuff = [-.4, -.452].map(y => { const r = ringAt(so2, y); return { ...r, w: r.w + .01, f: r.f + .01, b: r.b + .01 }; }); put0(knee, loft(cuff, { seg: 6, lipStart: .005, lipEnd: .006, key: `turnup/${lab}/${dk}` }), trouM); }
    // the boot's shaft belongs to the shin and runs on into the foot, a visible thickness at its top
    const top = lab ? -.42 : -.36, so = lab ? .006 : .002, shaft = [top, -.46, -.495].map(y => { const r = ringAt(sn, y); return { ...r, w: r.w + so, f: r.f + so, b: r.b + so }; });
    put0(knee, loft(shaft, { seg: 5, lipStart: .004, capEnd: 'flat', key: `shaft/${lab}/${dk}` }), bootM);
    kit.bake(knee);
    const ankle = new T.Group(); ankle.position.y = -RIG.shin; ankle.rotation.y = side * .06; knee.add(ankle); ankles.push(ankle);
    foot(ankle, d, bootM, soleM, !lab); kit.bake(ankle);
  }
  }

  // ================================================================ the head
  const head = new T.Group(), hg = new T.Group(), swing = new T.Group(), faceMat = kit.face(look.skin);
  const neckTop = neckR[neckR.length - 1], pivotZ = (neckTop.z ?? 0);
  head.position.set(0, d.chin - CHIN_TO_PIVOT + LIFT, pivotZ); hg.position.set(0, CHIN_TO_PIVOT, headZ - pivotZ); head.add(hg); body.add(head);
  put0(hg, skull(look, h), faceMat);
  for (const s of [-1, 1]) put0(hg, ear(s, h, look.headShape), skin);
  const hatted = look.hat !== 'none' && !opts.bare, hairs = hairOf(look, h, hatted); if (opts.bare) { hairs.hair.length = 0; hairs.under.length = 0; hairs.swing.length = 0; }
  for (const gg of hairs.hair) put0(hg, gg, hairMat); for (const gg of hairs.under) put0(hg, gg, hairShade);
  swing.position.set(0, CHIN_TO_PIVOT + .1 * k, headZ - pivotZ - .12 * k);
  for (const gg of hairs.swing) put0(swing, place(gg, [0, -.1 * k, .12 * k]), hairMat);
  for (const gg of opts.bare ? [] : facialOf(look, h)) put0(hg, gg, hairMat);
  const hat = opts.bare ? { cloth: [], trim: [], metal: [] } : hatOf(look, h); for (const gg of hat.cloth) put0(hg, gg, capM); for (const gg of hat.trim) put0(hg, gg, leatherDark); for (const gg of hat.metal) put0(hg, gg, brass);
  // the jaw's cel shadow: a crescent on the neck under the jaw, wide under the chin and narrowing to nothing under the ears. It hangs from the head, so it follows the jaw when the head
  // turns or nods, and its upper edge is tucked inside the jaw, so no pale band opens between the two
  { const L0 = new T.Vector3(0, LIFT, 0).sub(head.position), sk = skullRings(look.headShape, h), inHead = (p: T.Vector3) => { const y = p.y - (d.chin + LIFT), r = ringAt(sk, Math.max(0, y)), n = r.n ?? 2, z = p.z - headZ - (r.z ?? 0); return y >= 0 && Math.abs(p.x / r.w) ** n + Math.abs(z / (z >= 0 ? r.f : r.b)) ** n < 1; };
    const C = 14, Rw = 3, A0 = 1.45, pos: number[] = [], nrm: number[] = [], idx: number[] = []; // a darker skin with its normals turned down out of the light: always in shade, so always darker than the neck beside it, never a pale patch
    for (let i = 0; i <= C; i++) { const a = -A0 + 2 * A0 * i / C; let top = d.chin - .02; while (top < d.chin + .09 && !inHead(surface(neckDrawn, top, a, 0).p.add(new T.Vector3(0, LIFT, 0)))) top += .002;
      const depth = .036 * k * Math.cos(a / A0 * Math.PI / 2) ** .7; for (let j = 0; j <= Rw; j++) { const y = top + .006 - (depth + .006) * (1 - j / Rw), q = surface(neckDrawn, y, a, .002); q.p.add(L0); pos.push(q.p.x, q.p.y, q.p.z); const n = q.n.multiplyScalar(.25).add(new T.Vector3(0, -1, 0)).normalize(); nrm.push(n.x, n.y, n.z); } }
    for (let i = 0; i < C; i++) for (let j = 0; j < Rw; j++) { const p0 = i * (Rw + 1) + j, p1 = p0 + Rw + 1; idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3)); g.setIndex(idx);
    put0(head, g, kit.plain('#' + new T.Color(P.skin[look.skin]).multiply(new T.Color(.86, .8, .85)).getHexString())); }
  if (fresh && !opts.bare) headgear(X, hg, h);
  kit.bake(head);
  kit.bake(swing); head.add(swing);
  const face = head.children.find(o => o instanceof T.Mesh && o.material === faceMat) as T.Mesh;

  // ================================================================ the scarf, the cloth below the belt, mending and finery
  kerchiefTails(scarf, neckM, asym.has('scarfTail'));
  kit.bake(scarf);
  if (!lab && !fresh) coatSkirt(tails, skirt, d, pel, coatM, g, closed, asym, leather, brass);
  kit.bake(tails); if (hem.children.length) { kit.bake(hem); tails.add(hem); } // baking merges a group's children away, so the hinge joins its parent after it is baked
  put0(worn, plate(lab ? shirtR : coatR, [[1.27, -.9, -.62], [1.2, -.9, -.62]], .0, .004, 3), sw('umber'));
  kit.bake(worn); kit.bake(finery);
  // the old rig lowers everything the body carries by .14 (animateLife is solved against it)
  body.position.y -= .14; pelvisG.position.y -= .14; for (const l of legs) l.position.y -= .14;
  group.scale.setScalar(look.stature);
  group.traverse(o => { if (o instanceof T.Mesh) o.castShadow = false; });
  return { group, body, pelvis: pelvisG, legs, knees, ankles, arms, elbows, grips, head, tails, hem: hem.children.length ? hem : undefined, skirt, swing, scarf, worn, finery, face, faceMat };
}

/** The coat's skirts: a shell that hangs from the waist on the PELVIS, flares past the hips to a hem wider than they are and standing off the legs, with a lining so a seated figure is not
 *  hollow, a turned hem, edge facings, flap pockets and the same front opening as the coat above it. */
function coatSkirt(tails: T.Group, skirt: { drop: number; depth: number }, d: Dims, pel: Ring[], coatM: T.Material, g: { aL: number; aR: number }, closed: boolean, asym: Set<string>, leather: T.Material, brass: T.Material) {
  const Y = [1.12, 1.04, .96, .86, .73], base = 1.07, t = (y: number) => (1.12 - y) / (1.12 - .73);
  const Wtop = d.waistW + .052, Whem = 2 * (d.hipX + d.thighW / 2 + .04) + .05, Dtop = d.waistD + d.belly + .05, Dhem = d.hipD + .066 + d.belly * .6;
  const rings: Ring[] = Y.map(y => { const u = t(y), p = ringAt(pel, Math.min(1.13, Math.max(.86, y))), W = Math.max(Wtop + (Whem - Wtop) * Math.sqrt(u), p.w * 2 + .05); return ring(y - base, W, Math.max(Dtop + (Dhem - Dtop) * u, (p.f + p.b) + .062), (p.z ?? 0) + .006 * u, 2.2 + u * .1); });
  const arc = closed ? { start: 0, arc: Math.PI * 2 } : { start: g.aL, arc: Math.PI * 2 - g.aL - g.aR }, lip = .012, dk = JSON.stringify(d);
  put0(tails, loft(rings, { seg: 10, ...arc, lipEnd: lip, lipDepth: .0001, key: `skirt/${dk}/${arc.start}` }), coatM);
  put0(tails, loft(offset(rings, -lip).slice().reverse(), { seg: 8, ...arc, key: `lining/${dk}/${arc.start}` }), coatM);
  const ys = steps(rings[0].y, rings[4].y, 5);
  if (!closed) for (const a of [g.aL, -g.aR]) put0(tails, seam(rings, ys, () => a, .001, .02, .006), coatM);
  put0(tails, seam(rings, ys, () => Math.PI, .001, .008, .004), coatM);
  // the waist strap across the back, with its two buttons, where the skirt leaves the coat
  put0(tails, around(rings, .02, Math.PI - 1.15, Math.PI + 1.15, .003, .016, .004, 8), coatM);
  for (const s of [-1, 1]) button(tails, surface(rings, .02, Math.PI + s * .22, .008), brass, .0075);
  // flap pockets on the hips, and a leather pouch on one of them
  for (const s of [-1, 1]) put0(tails, plate(rings, [[-.065, s * .72, s * 1.18], [-.135, s * .72, s * 1.18]], .0, .007, 5), coatM);
  if (asym.has('pouchHip')) put0(tails, plate(rings, [[-.05, 1.45, 1.8], [-.17, 1.45, 1.8]], .0, .014, 4), leather);
  skirt.drop = .2; skirt.depth = .19;
}

/** A shirt placket: a strip down the front a little off centre, with its buttons. */
function placket(g: T.Group, rings: Ring[], m: T.Material, brass: T.Material) {
  put0(g, strip(rings, steps(1.4, 1.15, 5), () => .006, false, .0075, .016, .0035), m);
  for (const y of [1.34, 1.22]) button(g, surface(rings, y, .05, .0095), brass, .0065);
}

/** Braces: two straps that wrap the torso (they follow the shirt's surface, so they neither float nor cut across the chest), up from the waistband buttons, over the shoulder, and crossing
 *  on the back. One can hang loose at the hip. */
function braces(g: T.Group, d: Dims, rib: Ring[], pel: Ring[], m: T.Material, brass: T.Material, oneDown: boolean, vest = false) {
  const shirt = offset(rib, .007), hips = offset(pel, .01);
  for (const side of [-1, 1]) {
    const down = oneDown && side > 0 && !vest, pts: SweepPt[] = [], x0 = side * .075, topY = 1.535 - d.slope * .3 - .012, off = vest ? .02 : .0085, y0 = vest ? 1.38 : 1.1, half = vest ? .021 : .0125;
    const at = (rings: Ring[], y: number, x: number, back: boolean) => { const q = onFace(rings, y, x, back, off); pts.push({ p: [q.p.x, q.p.y, q.p.z], a: half, b: .0035, n: [q.n.x, q.n.y, q.n.z] }); };
    if (down) for (let t = 6; t >= 1; t--) at(hips, 1.1 - t * .035, x0 + side * (.045 + t * .016), false);
    for (const y of steps(y0, topY, 4)) at(shirt, y, x0 + side * (.01 + (y - 1.1) * .06), false);
    if (!down) for (const y of steps(topY, y0, 4)) { const u = vest ? 0 : (topY - y) / (topY - 1.1); at(shirt, y, (x0 + side * (.01 + (topY - 1.1) * .06)) * (1 - u) + (-side * .06) * u, true); }
    put0(g, sweep(pts, { seg: 4, capStart: true, capEnd: true }), m);
  }
}
