import * as T from 'three';
import { loft, surface, ringAt, ringPoint, mirrorX, sweep, merge, shared, type Ring, type SweepPt } from './loft';
import type { Look, HeadShape } from './look';
import { skullTable, landmarks } from './headform';

/** The head (Terra Character Book 6 and 7). Built in chin-origin coordinates, y up from the chin, z forward, then hung from the head group (whose pivot is the top of the neck).
 *  A cranium and a separate lower face, a flatter front plane, jaw planes rising to the ear, a small chin carried forward, a nose wedge in the geometry, flat shaped ears on the
 *  eye line behind the midline. Then the normals are replaced from a proxy ellipsoid (blended back to the true normals at the jaw and neck) so a cel threshold paints a clean face
 *  while the outline keeps the constructed profile. */
export const CHIN_TO_PIVOT = .035; // the head group's pivot is this far below the chin, at the top of the neck

/** The skull is derived from the head formula (headform.ts: Loomis ball and plane, restrained anime; Book 6): rows of y, half width, front z, back z, squareness for a head of height h. */
const R = (y: number, w: number, zf: number, zb: number, n = 2.2): Ring => ({ y, w, f: (zf - zb) / 2, b: (zf - zb) / 2, z: (zf + zb) / 2, n });
export function skullRings(shape: HeadShape, h: number): Ring[] { return skullTable(h, shape).map(([y, w, zf, zb, n]) => R(y, w, zf, zb, n)); }

/** A point on the head's surface, pushed out by `off`. */
export const headAt = (rings: Ring[], y: number, a: number, off = 0) => surface(rings, y, a, off);

/** Where the painted features land on the atlas tile. The atlas is painted for the old head; these maps put its eye line on the Book's eye line (a little under the middle), its mouth an
 *  eighth of a head above the chin and its brows above the eyes. Within a band the scale is the same up and across; the stretch is taken up in the plain skin between the bands. */
export function faceUV(x: number, y: number, z: number, faceType: number, h: number, out: number[] = [0, 0]) {
  const k = h / .285, u = .5 + x / (.318 * k); void z;
  // y above the chin -> a row of the 512 px tile. The eye line (tile row 300) is .435 H, the mouth (row 389) .13 H; the eye band is squeezed to .78 and the brow band to .5 of the
  // base scale so the brows land at about .555 H (Book 6); the plain skin between the bands takes up the stretch.
  const kv = .00062 * k, kE = kv * .78, kB = kv * .5, km = kv, yEye = .435 * h, eyeTop = yEye + 62 * kE, eyeBot = yEye - 44 * kE, mouthTop = .13 * h + 25 * km;
  const px = y >= eyeTop ? 238 - (y - eyeTop) / kB : y >= eyeBot ? 300 - (y - yEye) / kE : y >= mouthTop ? 344 + (eyeBot - y) / (eyeBot - mouthTop) * 20 : 364 + (mouthTop - y) / km;
  out[0] = u / 16; out[1] = (faceType + Math.max(10, Math.min(502, px)) / 512) / 8; return out;
}

/** The face's value pattern per skin tone (Book 6, "Value per skin tone"). One atlas serves all three skins, and at the distance the game is played at (a face 4 to 8 px wide) the painted
 *  features are averaged away: an eye of white, iris and lash comes out about the value of a mid skin, so a mid or dark face went blank. So the skin itself carries the face's big value
 *  shapes, scaled to its tone: a shadowed band over the brows and eyes, a lighter plane on the forehead, the cheekbones, the bridge of the nose and the lower lip, a shade under the nose.
 *  Multipliers on the lit skin, per tone [eye band, lighter planes, under the nose], as they are seen close: barely there on the light skin, which already reads by its dark features,
 *  and strongest on the dark skin, where the features are lighter than the skin and need a dark band to sit in and a lighter rim round it. */
export const FACE_VALUE: readonly (readonly [number, number, number])[] = [[.93, 1.02, .95], [.8, 1.12, .86], [.76, 1.3, .8]];
/** The same shapes in GLSL, in the tile's own 512-unit coordinates (the layout `faceUV` maps: eye line row 300, mouth 389, eyes 68 either side of the midline), faded with the face mask.
 *  They are drawn for the distance they are seen at: no shape is narrower than about a pixel (`w` is the tile units one pixel covers), so a face a few pixels wide still lands its eye band
 *  on a row of pixels, and as the face shrinks below the size where its painted features can be told apart, each shape doubles its depth. `FACE_PAINT_HEAD` goes at the top of the
 *  fragment shader; `FACE_PAINT` after the atlas sample (`ft` and `vMask` are in scope), before the features are laid over the skin. */
/** How much the painted features are inked up per skin tone once they are too small to be drawn crisply (People XXVI). One atlas serves every skin, so its lash, brow and iris
 *  lines (absolute colours) lose about half their contrast against the darkest skin at seed-row scale (a dark feature delta of 11-13 L* against 28-32 on the lightest): averaged
 *  into a pixel with the skin around them they come out near its value. As a pixel comes to cover 3 to 14 tile units, the features of the mid and dark skins are laid on more
 *  opaquely (up to x3) and their averaged colour darkened (raised to up to the 2.6th power), so the eye row, brows and mouth keep a comparable step from the skin whatever its tone; close up nothing changes. */
export const FACE_INK: readonly number[] = [0, .5, 1];
export const FACE_PAINT_HEAD = 'uniform vec3 uPaint;uniform float uInk;float fpG(float dx,float dy,float sx,float sy,float w){sx=max(sx,w*.45);sy=max(sy,w*.4);return exp(-(dx*dx/(2.*sx*sx)+dy*dy/(2.*sy*sy)));}\n';
export const FACE_PAINT = `{float fu=fract(vMapUv.x*16.)*512.,fv=(1.-ft)*512.,ex=abs(fu-256.),w=fwidth(fv)+fwidth(fu),far=smoothstep(16.,70.,w);
float g_eye=fpG(ex-66.,fv-284.,40.,25.,w);
float g_lit=max(max(fpG(ex,fv-176.,67.,16.,w),fpG(ex-80.,fv-354.-50.*far,25.,12.,w)),max(fpG(fu-262.,fv-326.,7.,21.,w),fpG(ex,fv-400.,16.,5.,w)));
float g_nose=fpG(ex,fv-367.,14.,5.5,w);vec3 k=1.+(uPaint-1.)*(1.+1.4*far);
diffuseColor.rgb*=mix(1.,k.x,g_eye*vMask)*mix(1.,k.y,g_lit*vMask)*mix(1.,k.z,g_nose*vMask);
float ink=smoothstep(3.,14.,w)*uInk;fs.a=min(1.,fs.a*(1.+2.*ink));fs.rgb=pow(fs.rgb,vec3(1.+1.6*ink));}
`;

/** Normals from a proxy ellipsoid, blended to the true normals toward the jaw and neck. */
function proxyNormals(g: T.BufferGeometry, h: number, shape: HeadShape, nose = false) {
  const L = landmarks(h, shape), k = h / .285, p = g.attributes.position as T.BufferAttribute, n = g.attributes.normal as T.BufferAttribute, v = new T.Vector3(), t = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / k; v.set(p.getX(i) / (L.width * .52), (p.getY(i) - .47 * h) / (.53 * h), (p.getZ(i) - L.z0 + .01 * h) / (L.R * 1.02)).normalize();
    const w = nose ? 1 : T.MathUtils.smoothstep(y, .02, .08); t.set(n.getX(i), n.getY(i), n.getZ(i)).lerp(v, w).normalize(); n.setXYZ(i, t.x, t.y, t.z);
  }
}

/** The nose: a wedge, a quarter of a head above the chin at its tip. From the front it is a mark, from the side it is a nose. Built on the face plane, hidden joints at its edges. */
export function noseWedge(h: number, shape: HeadShape): T.BufferGeometry {
  const k = h / .285, rg = skullRings(shape, h), face = (y: number) => { const r = ringAt(rg, y); return (r.z ?? 0) + r.f; }, fz = shape === 'long' ? .105 : .1035, P = (x: number, y: number, z: number): [number, number, number] => [x * k, y * k, face(y * k) / k + (z - .1035)];
  const wid = shape === 'square' ? 1.12 : shape === 'heart' ? .9 : 1, prom = shape === 'long' ? 1.12 : 1;
  const B = P(0, .148, fz - .002), T_ = P(0, .074, fz + .031 * prom), Nb = P(0, .056, fz + .006), Lt = P(-.016 * wid, .104, fz - .001), Rt = P(.016 * wid, .104, fz - .001);
  const Al = P(-.0165 * wid, .066, fz + .0105), Ar = P(.0165 * wid, .066, fz + .0105), Sl = P(-.0135 * wid, .052, fz - .0015), Sr = P(.0135 * wid, .052, fz - .0015), Ul = P(-.007 * wid, .0575, fz + .0085), Ur = P(.007 * wid, .0575, fz + .0085);
  const pts = [B, T_, Nb, Lt, Rt, Al, Ar, Sl, Sr, Ul, Ur], ix = Object.fromEntries(['B', 'T', 'N', 'Lt', 'Rt', 'Al', 'Ar', 'Sl', 'Sr', 'Ul', 'Ur'].map((n, i) => [n, i]));
  const inner = new T.Vector3(0, .09 * k, .02 * k), tris: number[] = [];
  const tri = (a: string, b: string, c: string) => { const A = new T.Vector3(...pts[ix[a]]), Bp = new T.Vector3(...pts[ix[b]]), C = new T.Vector3(...pts[ix[c]]); const nrm = Bp.clone().sub(A).cross(C.clone().sub(A)), mid = A.clone().add(Bp).add(C).divideScalar(3).sub(inner); if (nrm.dot(mid) >= 0) tris.push(ix[a], ix[b], ix[c]); else tris.push(ix[a], ix[c], ix[b]); };
  tri('B', 'Lt', 'Al'); tri('B', 'Al', 'T'); tri('B', 'T', 'Ar'); tri('B', 'Ar', 'Rt'); tri('Lt', 'Sl', 'Al'); tri('Rt', 'Ar', 'Sr');
  tri('Al', 'Sl', 'Ul'); tri('Al', 'Ul', 'T'); tri('Ar', 'Ur', 'Sr'); tri('Ar', 'T', 'Ur'); tri('Ul', 'Sl', 'N'); tri('Ur', 'N', 'Sr'); tri('T', 'Ul', 'N'); tri('T', 'N', 'Ur');
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts.flat(), 3)); g.setIndex(tris); const g2 = g.toNonIndexed(); g2.computeVertexNormals(); return g2;
}

/** The skull with its nose, UVs onto the face atlas and replaced normals. */
export function skull(look: Look, h: number): T.BufferGeometry {
  return shared(`skull/${look.headShape}/${look.faceType}/${h}`, () => {
    const rings = skullRings(look.headShape, h), body = loft(rings, { seg: 26, capEnd: 'flat' }), nose = noseWedge(h, look.headShape);
    const g = merge([body.index ? body.toNonIndexed() : body, nose]);
    const p = g.attributes.position as T.BufferAttribute, uv = g.attributes.uv as T.BufferAttribute, o = [0, 0];
    for (let i = 0; i < p.count; i++) { faceUV(p.getX(i), p.getY(i), p.getZ(i), look.faceType, h, o); uv.setXY(i, o[0], o[1]); }
    proxyNormals(g, h, look.headShape);
    // the painted face is a front plane: it fades out toward the ears, so nothing smears along the side of the head or lands on the back
    const mask = new Float32Array(p.count), L = landmarks(h, look.headShape); for (let i = 0; i < p.count; i++) { const a = Math.abs(Math.atan2(p.getX(i) / (L.width * .5), (p.getZ(i) - L.z0 + .01 * h) / L.R)); mask[i] = 1 - T.MathUtils.smoothstep(a, .9, 1.3); }
    g.setAttribute('faceMask', new T.BufferAttribute(mask, 1)); return g;
  });
}

/** Ears (Book 6): in the back lower quarter of the side plane, behind the depth midline, from just under the brow line to about the nose base. Each is an authored outline (a helix
 *  wider at the top, narrowing down the back to a soft lobe, a notch for the tragus in front) with a thickness, hinged at its front edge on the side of the skull and flared out about
 *  twenty degrees, so from the front an ear is a small tapering shape whose lobe tucks back into the jaw line, not a tab or a notch in the outline. */
const EAR: [number, number][] = [[.08, .12], [.0, .36], [.03, .55], [.1, .82], [.3, .98], [.55, 1], [.8, .9], [.95, .7], [.92, .48], [.76, .3], [.55, .14], [.36, .02], [.2, 0]];
export function ear(side: number, h: number, shape: HeadShape = 'oval'): T.BufferGeometry {
  return shared(`ear/${side}/${h}/${shape}`, () => {
    const L = landmarks(h, shape), k = h / .285, top = .5 * h, bot = .245 * h, W = .034 * k, Hh = top - bot, flare = .36, rg = skullRings(shape, h), zFront = L.earZ + W * .45;
    // the skull's side where the ear's front edge meets it
    const rc = ringAt(rg, bot + Hh * .45); let lo = Math.PI / 2, hi = Math.PI; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, q = ringPoint(rc, m); if (q[2] > zFront) lo = m; else hi = m; } const x0 = ringPoint(rc, lo)[0];
    const s = new T.Shape(); EAR.forEach(([u, v], i) => { i ? s.lineTo(u * W, v * Hh) : s.moveTo(u * W, v * Hh); }); s.closePath();
    const t = .0045 * k, g = new T.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: .0018 * k, bevelSize: .0018 * k, bevelSegments: 1, curveSegments: 2 });
    g.translate(0, 0, -t / 2);
    // local x runs back from the front edge, y up, z through the ear's thickness; turned to run back along the head and flared out at the back
    const X = new T.Vector3(Math.sin(flare), 0, -Math.cos(flare)), Y = new T.Vector3(0, 1, 0), Z = new T.Vector3().crossVectors(X, Y);
    g.applyMatrix4(new T.Matrix4().makeBasis(X, Y, Z).setPosition(x0 - .003 * k, bot, zFront)); g.computeVertexNormals(); return side > 0 ? g : mirrorX(g);
  });
}

// ------------------------------------------------------------------ facial hair (the hair itself is hair.ts, hats hat.ts)
/** A patch of surface over the head, from a lower boundary that varies with the angle up to the crown (or `top`), lifted off the scalp by `off`. */
interface Patch { a0: number; a1: number; cols?: number; rows?: number; low: (a: number) => number; top?: (a: number) => number; off: (s: number, a: number) => number; lift?: (s: number, a: number) => number; fwd?: (s: number, a: number) => number; lid?: boolean; lidLift?: number }
function patch(rings: Ring[], o: Patch): T.BufferGeometry {
  const C = o.cols ?? 22, Rw = o.rows ?? 6, pos: number[] = [], uv: number[] = [], idx: number[] = [], crown = rings[rings.length - 1].y - .003;
  for (let j = 0; j <= Rw; j++) for (let i = 0; i <= C; i++) {
    const a = o.a0 + (o.a1 - o.a0) * i / C, lo = o.low(a), hi = o.top ? o.top(a) : crown, s = j / Rw, y = lo + (hi - lo) * s + (o.lift ? o.lift(s, a) : 0), q = headAt(rings, Math.min(y, crown), a, o.off(s, a));
    const fw = o.fwd ? o.fwd(s, a) : 0; pos.push(q.p.x + Math.sin(a) * fw * .5, q.p.y + (y > crown ? y - crown : 0), q.p.z + Math.cos(a) * fw); uv.push(i / C, s);
  }
  for (let j = 0; j < Rw; j++) for (let i = 0; i < C; i++) { const a = j * (C + 1) + i, b = a + C + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  if (o.lid) { // a closed crown: three more rings run in to the middle, rising in a dome whose height is `lidLift`, wound the same way as the rest of the patch (the old fan faced inward: the pale ring)
    const row = Rw * (C + 1); let cx = 0, cy = 0, cz = 0; for (let i = 0; i < C; i++) { cx += pos[(row + i) * 3]; cy += pos[(row + i) * 3 + 1]; cz += pos[(row + i) * 3 + 2]; } cx /= C; cy /= C; cz /= C;
    const LR = 3; let prev = row;
    for (let r = 1; r <= LR; r++) { const t = r / (LR + 1), at = pos.length / 3, e = 1 - Math.cos(t * Math.PI / 2), rise = Math.sin(t * Math.PI / 2);
      for (let i = 0; i <= C; i++) { const x = pos[(row + i) * 3], y = pos[(row + i) * 3 + 1], z = pos[(row + i) * 3 + 2]; pos.push(x + (cx - x) * e, y + (cy - y) * e + (o.lidLift ?? .004) * rise, z + (cz - z) * e); uv.push(i / C, 1); }
      for (let i = 0; i < C; i++) { const a2 = prev + i, b2 = at + i; idx.push(a2, a2 + 1, b2, a2 + 1, b2 + 1, b2); } prev = at; }
    const c = pos.length / 3; pos.push(cx, cy + (o.lidLift ?? .004), cz); uv.push(.5, 1); for (let i = 0; i < C; i++) idx.push(prev + i, prev + i + 1, c);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  if (Math.abs(o.a1 - o.a0 - Math.PI * 2) < 1e-6) { const nr = g.attributes.normal as T.BufferAttribute; for (let j = 0; j <= Rw; j++) { const i0 = j * (C + 1), i1 = i0 + C, x = nr.getX(i0) + nr.getX(i1), y = nr.getY(i0) + nr.getY(i1), z = nr.getZ(i0) + nr.getZ(i1), l = Math.hypot(x, y, z) || 1; nr.setXYZ(i0, x / l, y / l, z / l); nr.setXYZ(i1, x / l, y / l, z / l); } }
  return g;
}
/** A tapered, curved wedge of hair lying along the scalp, following one flow: points are [angle, height, lift off the scalp, half width]. */
function strand(rings: Ring[], pts: number[][], thick = .011, seg = 5): T.BufferGeometry {
  const Q = pts.map(([a, y, off]) => headAt(rings, y, a, off)), curve = new T.CatmullRomCurve3(Q.map(q => q.p.clone())), N = Math.max(5, Math.round(pts.length * 1.6)), sp: SweepPt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, f = t * (pts.length - 1), i0 = Math.min(pts.length - 2, Math.floor(f)), u = f - i0, w = pts[i0][3] + (pts[i0 + 1][3] - pts[i0][3]) * u;
    const n = Q[i0].n.clone().lerp(Q[i0 + 1].n, u).normalize(), tip = Math.max(.04, Math.sqrt(Math.max(0, 1 - Math.pow(t, 3.2)))), c = curve.getPoint(t);
    sp.push({ p: [c.x, c.y, c.z], a: w * 1.3 * tip, b: thick * 1.15 * (.4 + .6 * tip), n: [n.x, n.y, n.z] });
  }
  return sweep(sp, { seg, capStart: true, capEnd: true });
}
const sm = (a: number, lo: number, hi: number) => T.MathUtils.smoothstep(a, lo, hi);

/** Facial hair: attached to the lip and jaw, never painted. */
export function facialOf(look: Look, h: number): T.BufferGeometry[] {
  const k = h / .285, rings = skullRings(look.headShape, h), out: T.BufferGeometry[] = [];
  // a moustache (People XXVI): a parted chevron, never a toothbrush. Two halves over the whole upper lip, thin where they part at the philtrum, fullest over each half of the lip and
  // sweeping down past the mouth's corners to tapered points, so it is wider than the mouth and has no square lower edge; it sits on the lip, clear above the painted mouth. (The
  // old shape stopped at the mouth's corners, thick and level: at seated scale on a dark-haired Ordinance guard it read as a square block under the nose, a toothbrush.)
  const moustache = () => { for (const s of [-1, 1]) out.push(strand(rings, [[s * .0, .0545, .0068, .0055], [s * .09, .055, .0086, .0092], [s * .2, .0505, .0078, .0086], [s * .32, .04, .0055, .0056], [s * .43, .03, .0032, .0022]].map(([a, y, o, w]) => [a, y * k, o * k, w * k]), .0055 * k, 4)); };
  if (look.facial === 'moustache') moustache();
  if (look.facial === 'sideburns') for (const s of [-1, 1]) out.push(strand(rings, [[s * 1.42, .15, .006, .016], [s * 1.38, .115, .008, .017], [s * 1.34, .075, .006, .014]].map(([a, y, o, w]) => [a, y * k, o * k, w * k]), .007 * k));
  // a short full beard (People XXVI): one mass from the moustache down round the chin and up the cheeks into the sideburns, fullest at the chin and thinning to the ear, so it reads as a
  // cut beard joined to the hair and not as a strap along the jaw (a band of even depth from ear to ear, top at .09 H, read as a chin-strap mask)
  if (look.facial === 'beard') { out.push(patch(rings, { a0: -1.5, a1: 1.5, cols: 18, rows: 4, low: () => .0, top: a => (.022 + .115 * sm(Math.abs(a), .42, 1.45)) * k, off: (s, a) => (.005 + .009 * Math.cos(a) ** 2 * (1 - s * .55) + .002 * (1 - s)) * k }));
    moustache(); }
  // a short beard keeps to the chin and the jaw and leaves the mouth clear under the lip (one that covered the mouth read as a mask);
  // facial hair is a shade darker than the hair on the head (a baked `tint`, consumed by the bake): a grey or fair moustache over the lip otherwise came out lighter than the lip line
  // under it, and in rain light an iron-grey one read as a pale blue mouth
  for (const g of out) g.setAttribute('tint', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count).fill(-.85), 1));
  return out;
}
