/** The head's construction formula (Terra Character Book 6; skill figure-construction, chapter 7: Loomis ball-and-plane with a restrained anime shift). Pure numbers, no `three`.
 *  Everything is derived from H, the head height (chin to crown, no hair), and one of four parameter rows. Heights are metres above the chin, z is forward of the head's origin. */
export type Shape = 'oval' | 'square' | 'long' | 'heart';

/** The four head-shape families: the same ball, four jaw parameter sets. Fractions of H except the two ratios. */
export interface HeadParams {
  /** head width (ear to ear, at the eye line) */ width: number;
  /** jaw corner width / head width */ jaw: number;
  /** chin width / head width */ chin: number;
  /** chin to nose tip */ lower: number;
  /** height of the jaw corner above the chin */ jawY: number;
  /** how far forward the chin sits, as a fraction of the ball's radius from its centre */ chinFwd: number;
}
export const HEAD_SHAPES: Record<Shape, HeadParams> = {
  oval: { width: .72, jaw: .72, chin: .20, lower: .27, jawY: .17, chinFwd: .80 },
  square: { width: .75, jaw: .80, chin: .26, lower: .27, jawY: .14, chinFwd: .82 },
  long: { width: .69, jaw: .70, chin: .20, lower: .29, jawY: .18, chinFwd: .80 },
  heart: { width: .74, jaw: .64, chin: .15, lower: .25, jawY: .19, chinFwd: .76 },
};
/** The restrained-anime landmark heights (fractions of H) and the depth, the same for every shape. */
export const ANIME = { eye: .445, brow: .535, hairline: .857, depth: .86, earZ: -.095, earTop: .535 } as const;

export interface Landmarks {
  H: number; t: number; R: number; ballY: number; z0: number; zFront: number; zBack: number;
  width: number; depth: number; jawW: number; jawY: number; chinW: number; chinZ: number;
  eye: number; brow: number; noseTip: number; noseBase: number; lip: number; hairline: number; crown: number;
  /** the side plane: a circle of radius t centred on the brow line, (y, z) */ sideR: number;
  earTop: number; earBottom: number; earZ: number; faceFront: number;
}
/** Where the depth midline of the head is (the ball's centre), in the chin-origin frame: a fraction of H behind the origin. */
export const MID_Z = -.0175;

export function landmarks(H: number, shape: Shape): Landmarks {
  const p = HEAD_SHAPES[shape], t = H / 3.5, R = 1.5 * t, z0 = MID_Z * H, width = p.width * H;
  return { H, t, R, ballY: 2 * t, z0, zFront: z0 + R, zBack: z0 - R, width, depth: ANIME.depth * H, jawW: width * p.jaw, jawY: p.jawY * H, chinW: width * p.chin, chinZ: z0 + R * p.chinFwd,
    eye: ANIME.eye * H, brow: ANIME.brow * H, noseTip: p.lower * H, noseBase: p.lower * .78 * H, lip: p.lower * .5 * H, hairline: ANIME.hairline * H, crown: H, sideR: t,
    earTop: ANIME.earTop * H, earBottom: p.lower * .78 * H, earZ: z0 + ANIME.earZ * H, faceFront: z0 + R * .985 };
}

const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
/** Rows of the skull, [y, half width, front z, back z, squareness], derived from the landmarks. The cranium is the ball (its sides flattened to the side planes), the face a flatter plane
 *  hung off the front from brow to chin, the jaw a rounded run from under the ear to a rounded chin. */
export function skullTable(H: number, shape: Shape): number[][] {
  const L = landmarks(H, shape), a = L.width / 2, jaw = L.jawW / 2, chin = L.chinW / 2, R = L.R, yc = L.ballY, out: number[][] = [];
  const jy = HEAD_SHAPES[shape].jawY, ys = [0, .035, jy * .55, jy, jy + .07, jy + .15, .34, .45, .5714, .68, .78, .87, .94, .985, 1].sort((p, q) => p - q);
  const rho = (y: number) => Math.sqrt(Math.max(0, R * R - (y - yc) * (y - yc)));
  const zbAt = (y: number) => { // the back: the ball down to the jaw, then a steep run in to the chin
    const y1 = .25 * H, back1 = L.z0 - rho(y1);
    if (y >= y1) return L.z0 - rho(y);
    const u = y / y1, chinBack = L.chinZ - .045 * H; return chinBack + (back1 - chinBack) * Math.pow(u, .85);
  };
  for (const f of ys) {
    const y = f * H, sph = a * rho(y) / R;
    // half width: chin to jaw corner (rounded), jaw to cheekbone, then the ball
    let w: number;
    if (y <= L.jawY) { const u = y / L.jawY; w = chin * (.55 + .45 * Math.min(1, y / (.04 * H))) + (jaw - chin) * Math.pow(u, .92); }
    else w = jaw + (a - jaw) * smooth(L.jawY, ANIME.eye * H + .02 * H, y);
    w = y >= yc ? sph : Math.max(w, y > .3 * H ? sph : 0);
    const zf = y >= yc ? L.z0 + rho(y) : L.chinZ + (L.faceFront - L.chinZ) * Math.pow(y / yc, .8);
    const zb = zbAt(y), n = y < .06 * H ? 2 : y < L.jawY ? (shape === 'square' ? 2.7 : 2.3) : y > .9 * H ? 2.15 : 2.5;
    out.push([y, Math.max(w, .008 * H), zf, zb, n]);
  }
  return out;
}
