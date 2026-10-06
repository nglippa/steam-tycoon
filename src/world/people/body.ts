import type { Ring } from './loft';
import type { Family, Frame } from './look';

/** The body reference (Terra Character Book 3 and 5). Most of it is never drawn: garments are shells derived from these rings by an offset.
 *  Families are authored records, not a width multiplier: each has its own neck, slope of shoulder, belly and limb profile, and a frame (broad or narrow) overrides what differs.
 *  Heights are above the sole (the figure adds .01 for body-local y); limb rings are local to their pivot, y running down. All widths are full widths unless named `*R` (radius). */
export interface Dims {
  /** head height (crown to chin), and the height of the chin above the sole: a slim head sits a little lower, a sturdy one a little higher, so each family stands 6.5 to 6.8 heads */ h: number; chin: number;
  /** half spacing of the shoulder joints and the deltoid radius */ shX: number; rSh: number;
  chestW: number; waistW: number; hipW: number; chestD: number; waistD: number; hipD: number;
  /** extra depth forward of the waist (a belly carries forward of the chest line) */ belly: number;
  /** how far the shoulder line drops from the base of the neck to the point of the shoulder */ slope: number;
  neckW: number; neckD: number; neckLean: number; /** how far forward the head is set */ headFwd: number;
  armW: number; elbowR: number; foreW: number; wristW: number;
  hipX: number; hipR: number; thighW: number; kneeR: number; calfW: number; calfBack: number; ankleW: number;
  hand: number; shoe: number; shoeW: number;
}

const slim: Dims = { h: .275, chin: 1.585, shX: .203, rSh: .047, chestW: .30, waistW: .26, hipW: .32, chestD: .20, waistD: .165, hipD: .18, belly: 0, slope: .06, neckW: .106, neckD: .09, neckLean: .27, headFwd: .012,
  armW: .075, elbowR: .034, foreW: .068, wristW: .045, hipX: .084, hipR: .064, thighW: .125, kneeR: .048, calfW: .095, calfBack: .014, ankleW: .06, hand: .185, shoe: .27, shoeW: .088 };
const standard: Dims = { h: .285, chin: 1.61, shX: .233, rSh: .052, chestW: .335, waistW: .30, hipW: .36, chestD: .23, waistD: .19, hipD: .2, belly: 0, slope: .05, neckW: .12, neckD: .1, neckLean: .22, headFwd: .004,
  armW: .09, elbowR: .038, foreW: .08, wristW: .05, hipX: .09, hipR: .07, thighW: .145, kneeR: .054, calfW: .108, calfBack: .016, ankleW: .066, hand: .19, shoe: .285, shoeW: .094 };
const sturdy: Dims = { h: .295, chin: 1.62, shX: .258, rSh: .062, chestW: .38, waistW: .37, hipW: .40, chestD: .27, waistD: .245, hipD: .235, belly: .035, slope: .037, neckW: .142, neckD: .118, neckLean: .13, headFwd: -.004,
  armW: .11, elbowR: .045, foreW: .098, wristW: .058, hipX: .096, hipR: .082, thighW: .17, kneeR: .062, calfW: .125, calfBack: .02, ankleW: .075, hand: .2, shoe: .3, shoeW: .1 };

/** The narrow frame: shoulders and hips about equal, a higher and smaller waist, a slimmer neck and wrist. Only what differs from the broad record. */
const NARROW: Record<Family, Partial<Dims>> = {
  slim: { shX: .178, chestW: .27, waistW: .23, hipW: .34, chestD: .19, neckW: .09, wristW: .042, hipD: .2 },
  standard: { shX: .198, chestW: .30, waistW: .27, hipW: .38, chestD: .22, neckW: .098, wristW: .046, hipD: .225 },
  sturdy: { shX: .218, chestW: .34, waistW: .33, hipW: .43, chestD: .255, neckW: .115, wristW: .054, hipD: .265 },
};
export const dimsOf = (family: Family, frame: Frame): Dims => ({ ...{ slim, standard, sturdy }[family], ...(frame === 'narrow' ? NARROW[family] : {}) });

/** The rig, in sole heights (Book section 2). */
export const RIG = { hip: .97, knee: .54, ankle: .045, shoulder: 1.43, elbow: 1.18, wrist: .94, crotch: .845, waist: 1.1, thigh: .43, shin: .495, upperArm: .25, forearm: .24, chin: 1.61 } as const;

export const ring = (y: number, W: number, D: number, zc = 0, n = 2.2, x = 0): Ring => ({ y, w: W / 2, f: D / 2, b: D / 2, z: zc, x, n });

/** Ribcage and shoulder girdle, from the waist overlap to the base of the neck. Egg-shaped, widest at the chest line, tilted back; the girdle above it is thin front to back. */
export function ribcage(d: Dims): Ring[] { return [
  ring(1.04, d.waistW + .004, d.waistD + d.belly * .8, -.004 + d.belly * .35, 2.2),
  ring(1.10, d.waistW, d.waistD + d.belly, -.002 + d.belly * .4, 2.2),
  ring(1.20, (d.waistW + d.chestW) / 2 + .004, (d.waistD + d.chestD) / 2 + d.belly * .35, .004 + d.belly * .15, 2.3),
  ring(1.30, d.chestW - .004, d.chestD - .006, .01, 2.45),
  ring(1.36, d.chestW, d.chestD, .012, 2.5),
  ring(1.42, d.chestW - .004, d.chestD - .02, .006, 2.4),
  // the shoulder girdle: the trapezius runs from the neck out to the point of the shoulder, thin in depth
  ring(1.535 - d.slope, (d.shX - .008) * 2, d.chestD * .5, -.002, 2.1),
  ring(1.535 - d.slope * .5, d.shX * 1.2, d.chestD * .47, -.004, 2.1),
  ring(1.535 - d.slope * .18, d.neckW * 1.7, d.neckD * 1.0, -.004, 2.1),
  ring(1.538, d.neckW * 1.15, d.neckD * .92, -.002, 2.1),
]; }

/** The pelvis: a bucket, tilted forward, widest at the hip joints, set back into a seat, closing under into the crotch. */
export function pelvis(d: Dims): Ring[] { return [
  ring(1.13, d.waistW + .006, d.waistD + d.belly * .9, -.002 + d.belly * .4, 2.2),
  ring(1.06, Math.max((d.waistW + d.hipW) / 2, d.waistW + .006), Math.max((d.waistD + d.hipD) / 2 + d.belly * .6, d.waistD + d.belly * .85 + .006), -.004 + d.belly * .35, 2.2),
  ring(.99, d.hipW, d.hipD + d.belly * .35, -.01, 2.25),
  ring(.93, d.hipW - .004, d.hipD + .004, -.011, 2.25),
  ring(.88, d.hipW * .86, d.hipD * .94, -.008, 2.2),
  ring(.85, d.hipW * .56, d.hipD * .72, -.008, 2.2),
]; }

/** The neck: an oval column that leans forward into the skull and enters behind the jaw. Rings are sole heights; the lean moves the centre forward with height. */
export function neck(d: Dims): Ring[] { const lean = Math.tan(d.neckLean); return [1.47, 1.52, d.chin - .035, d.chin + .03].map((y, i) => ring(y, d.neckW * (1 - i * .03), d.neckD * (1 - i * .02), -.012 + (y - 1.47) * lean + d.headFwd * (i / 3), 2.15)); }

/** Upper arm: local to the shoulder pivot. The cap (the deltoid) is the first ring; fullest a third of the way down, front and back unequal; a point at the back of the elbow. */
export function upperArm(d: Dims): Ring[] { const a = d.armW / 2; return [
  { y: 0, w: d.rSh, f: d.rSh, b: d.rSh, n: 2 },
  { y: -.07, w: a, f: a * 1.08, b: a * .98, z: .004, n: 2.1 },
  { y: -.14, w: a * .94, f: a * 1.0, b: a * .93, z: .002, n: 2.1 },
  { y: -.21, w: (a + d.elbowR) / 2, f: (a + d.elbowR) / 2, b: (a + d.elbowR) / 2 + .003, n: 2.05 },
  { y: -.25, w: d.elbowR, f: d.elbowR, b: d.elbowR + .004, z: -.003, n: 2 },
]; }
/** Forearm: local to the elbow. Widest a third below the elbow, tapering to a wrist twice as wide as it is deep: the wide axis turns from sideways to front-to-back, because the palm faces the thigh. */
export function forearm(d: Dims): Ring[] { const a = d.foreW / 2, w = d.wristW / 2; return [
  { y: 0, w: d.elbowR, f: d.elbowR, b: d.elbowR, n: 2 },
  { y: -.07, w: a, f: a * .98, b: a * .98, z: .002, n: 2.05 },
  { y: -.11, w: a * .93, f: a * .97, b: a * .96, n: 2.05 },
  { y: -.18, w: w * 1.0, f: w * 1.18, b: w * 1.14, n: 2.1 },
  { y: -.24, w: w * .52, f: w, b: w, n: 2.3 },
]; }

/** Thigh: local to the hip. Fullest in the upper middle, bowed forward in side view, narrowing to the knee; the knee ring is a circle (the shared-centre cap). `inward` runs the leg in toward the knee. */
export function thigh(d: Dims, side: number): Ring[] { const a = d.thighW / 2, inward = -side * .022, at = (y: number) => inward * (-y / .43); return [
  { y: 0, w: d.hipR, f: d.hipR, b: d.hipR, x: 0, n: 2 },
  { y: -.1, w: a, f: a * 1.1, b: a * 1.04, z: .006, x: at(-.1), n: 2.1 },
  { y: -.2, w: a * .93, f: a * 1.05, b: a * 1.0, z: .006, x: at(-.2), n: 2.1 },
  { y: -.32, w: a * .8, f: a * .84, b: a * .8, z: .004, x: at(-.32), n: 2.05 },
  { y: -.4, w: d.kneeR * 1.04, f: d.kneeR * 1.04, b: d.kneeR * 1.0, z: .002, x: at(-.4), n: 2.05 },
  { y: -.43, w: d.kneeR, f: d.kneeR * 1.05, b: d.kneeR, x: inward, n: 2 },
]; }
/** Shin: local to the knee. The calf swells behind a straight shin: the front line barely moves while the back belies a third of the way down, then a long taper to the ankle. */
export function shin(d: Dims): Ring[] { const k = d.kneeR, c = d.calfW / 2, an = d.ankleW / 2; return [
  { y: 0, w: k, f: k, b: k, n: 2 },
  { y: -.05, w: k * 1.04, f: k * .98, b: k * 1.08, n: 2.05 },
  { y: -.15, w: c, f: k * .9, b: c + d.calfBack, n: 2.1 },
  { y: -.27, w: c * .82, f: k * .8, b: c * .9, n: 2.1 },
  { y: -.4, w: an * 1.12, f: k * .7, b: an * 1.18, n: 2.1 },
  { y: -.495, w: an, f: an * 1.05, b: an * .95, n: 2.1 },
]; }
