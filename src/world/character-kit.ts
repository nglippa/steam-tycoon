import * as T from 'three';

/** Shared character geometry: one skull surface that face, hair and hats agree on, designed
 * hands with a few grip states, and graphic anime hair built from large pointed locks. */

// Skull profile: [y, half-width, half-depth, forward offset]. Head-local units (the head
// group is scaled to world size). The face is a flattened front plane with a V jaw.
const skullRings = [[-.236,.004,.004,.05],[-.224,.034,.03,.047],[-.19,.072,.066,.03],[-.15,.104,.1,.016],[-.1,.14,.132,.006],
  [-.05,.156,.148,0],[0,.166,.158,-.004],[.06,.174,.166,-.008],[.13,.166,.162,-.016],[.2,.122,.12,-.022],[.25,.004,.004,-.022]];
function skullRing(y: number) {
  const r = skullRings; if (y <= r[0][0]) return r[0]; if (y >= r[r.length - 1][0]) return r[r.length - 1];
  let i = 0; while (r[i + 1][0] < y) i++; const t = (y - r[i][0]) / (r[i + 1][0] - r[i][0]);
  return r[i].map((v, k) => v + (r[i + 1][k] - v) * t);
}
/** A point on the skull at angle a (0 = straight ahead) and height y, after face shaping. */
export function skullPoint(a: number, y: number, grow = 1) {
  const [, w, d, oz] = skullRing(y); let x = Math.sin(a) * w, z = Math.cos(a) * d;
  const front = Math.max(0, z) / .17;
  if (y < -.04) { const t = Math.min(1, (-.04 - y) / .19); x *= 1 - t * .3 * Math.min(1, front * 1.4); z *= 1 - t * .06; }
  if (z > .13 && y > -.17 && y < .1) z = .13 + (z - .13) * .35; // flat face plane: features read frontally
  if (y > -.1 && y < 0 && Math.abs(x) > .125) x *= 1.025;     // cheekbone edge
  if (z > .1) { const ax = Math.abs(x);
    z += .007 * bump(y, .02, .06) * (1 - smooth(.1, .15, ax));               // brow shelf over the eyes
    z -= .005 * bump(y, -.04, .015) * bump(ax, .035, .12);                    // soft eye sockets
    z -= .006 * smooth(.07, .14, ax) * bump(y, -.16, -.03);                   // cheek plane turns back
    z += .008 * smooth(-.19, -.215, y) * (1 - smooth(.03, .07, ax)); }        // chin carried forward
  return new T.Vector3(x * grow, y, z * grow + oz);
}
export const SKULL_TOP = .25, SKULL_BOTTOM = -.236;
function smooth(a: number, b: number, x: number) { const t = T.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function bump(x: number, a: number, b: number) { const m = (a + b) / 2, h = Math.abs(b - a) / 2; return Math.max(0, 1 - Math.pow((x - m) / h, 2)); }
/** A small graphic nose: a wedge whose lit and shaded sides give the face a real plane. */
export function noseGeometry() {
  const top = skullPoint(0, -.012), tip = skullPoint(0, -.074), base = -.084;
  const v = [[0, top.y, top.z - .002], [0, tip.y, tip.z + .024], [-.02, base, tip.z - .002], [.02, base, tip.z - .002], [-.012, -.03, top.z - .003], [.012, -.03, top.z - .003]];
  const f = [[0, 4, 1], [0, 1, 5], [4, 2, 1], [5, 1, 3], [2, 3, 1]];
  const pos: number[] = []; f.forEach(t => t.forEach(i => pos.push(...v[i])));
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
/** Skull mesh with a planar face projection: painted features stay undistorted from the
 * front; the back of the head samples plain skin at the tile edge. */
export function skullGeometry(tile: (u: number, v: number) => [number, number]) {
  const A = 40, Y = 24, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= Y; j++) {
    const y = SKULL_BOTTOM + (SKULL_TOP - SKULL_BOTTOM) * j / Y;
    for (let i = 0; i <= A; i++) {
      const a = -Math.PI + i / A * Math.PI * 2, p = skullPoint(a, y); pos.push(p.x, p.y, p.z);
      const u = p.z > .03 ? T.MathUtils.clamp(.5 + p.x / .42, .01, .99) : .5 + Math.sign(p.x || 1) * .495;
      uv.push(...tile(u, (y - SKULL_BOTTOM) / (SKULL_TOP - SKULL_BOTTOM)));
    }
  }
  for (let j = 0; j < Y; j++) for (let i = 0; i < A; i++) { const a = j * (A + 1) + i, b = a + A + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** Elliptical (or squarer, n > 2) rings along y: [y, halfWidth, halfDepth, dz?, dx?, n?]. */
export function ringGeometry(rings: number[][], segments = 12, start = 0, arc = Math.PI * 2) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  rings.forEach(([y, w, d, oz = 0, ox = 0, n = 2], j) => {
    for (let i = 0; i <= segments; i++) {
      const a = start + i / segments * arc, s = Math.sin(a), c = Math.cos(a), e = 2 / n;
      positions.push(Math.sign(s) * Math.pow(Math.abs(s), e) * w + ox, y, Math.sign(c) * Math.pow(Math.abs(c), e) * d + oz); uv.push(i / segments, j / (rings.length - 1));
    }
  });
  const up = rings.length > 1 && rings[1][0] > rings[0][0];
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < segments; i++) { const a = j * (segments + 1) + i, b = a + segments + 1; if (up) indices.push(a, a + 1, b, a + 1, b + 1, b); else indices.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

export type HandState = 'relaxed' | 'open' | 'grip' | 'point' | 'fist';
export const HAND_STATES: HandState[] = ['relaxed', 'open', 'grip', 'point', 'fist'];
/** Progressive curl about the knuckle line: vertices past y0 wrap on an arc toward the palm. */
function curl(g: T.BufferGeometry, y0: number, length: number, angle: number, inward: number) {
  if (Math.abs(angle) < .01) return g; const p = g.attributes.position, rho = length / angle;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y >= y0) continue; const x = p.getX(i), u = x * inward, s = y0 - y, phi = s / rho, r = rho - u;
    p.setX(i, inward * (rho - r * Math.cos(phi))); p.setY(i, y0 - r * Math.sin(phi)); }
  g.computeVertexNormals(); return g;
}
const handCache = new Map<string, T.BufferGeometry>();
/** Stylized anime hand in hand-local space (wrist at y=0, fingers toward -y, palm facing the
 * body): palm block, one grouped finger wedge, a separate thumb. Shared per state and side. */
export function handGeometry(state: HandState, side: number) {
  const key = state + side; const hit = handCache.get(key); if (hit) return hit;
  const inward = -side, s = 1.12, parts: T.BufferGeometry[] = [];
  const S = (rings: number[][]) => rings.map(([y, w, d, oz = 0, ox = 0]) => [y * s, w * s, d * s, oz * s, ox * s]);
  parts.push(ringGeometry(S([[.016, .004, .006], [.012, .019, .026], [-.015, .021, .034], [-.05, .021, .04, .002], [-.078, .019, .04, .002], [-.086, .016, .036, .002], [-.09, .004, .01, .002]]), 10)); // capped: no hole end-on
  const bend = { relaxed: .42, open: 0, grip: 2.2, point: 2.7, fist: 3 }[state];
  const fingers = state === 'point' ? [[-.078, .017, .028, -.009], [-.1, .016, .027, -.009], [-.125, .014, .024, -.009], [-.14, .006, .012, -.009]]
    : [[-.078, .018, .039, .002], [-.105, .017, state === 'open' ? .042 : .037, .002], [-.135, .015, state === 'open' ? .04 : .033, .002], [-.158, .012, .027, .002], [-.171, .004, .012, .002]];
  // Two finger wedges (index+middle, ring+little) with a notch between them: reads as fingers, not a mitten.
  for (const [oz, len, stag] of state === 'point' ? [[-.009, 1, 0]] : [[.019, 1, .004], [-.017, .9, -.004]]) {
    const f = fingers.map(([y, w, d, z]) => [y * (y < -.08 ? len : 1) + (y < -.08 ? stag : 0), w, state === 'point' ? d : d * .5, z + (state === 'point' ? 0 : oz)]);
    const wedge = curl(ringGeometry(S(f.map(([y, w, d, z]) => [y, w * .85, d, z])), 10), -.08 * s, .085 * s * len, bend * (oz < 0 ? 1.08 : 1), inward);
    const fanA = state === 'open' ? Math.sign(oz) * .07 : state === 'relaxed' ? Math.sign(oz) * .03 : 0; // fan from the knuckles
    if (fanA) wedge.translate(0, .08 * s, 0).rotateX(-fanA).translate(0, -.08 * s, 0);
    parts.push(wedge);
  }
  if (state === 'point') parts.push(ringGeometry(S([[-.076, .011, .011, .025], [-.12, .01, .01, .026], [-.155, .008, .008, .026], [-.166, .003, .003, .026]]), 8));
  const thumb = ringGeometry(S([[.004, .013, .014], [-.028, .012, .012], [-.052, .009, .009], [-.063, .003, .003]]), 8);
  const [tx, tz] = { relaxed: [-.35, .35], open: [-.55, -.25], grip: [-.95, .75], point: [-1.05, .85], fist: [-1.1, .95] }[state];
  thumb.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(tx, 0, side * tz))).translate(inward * .004 * s, -.022 * s, .03 * s); parts.push(thumb);
  const merged = mergeParts(parts); handCache.set(key, merged); return merged;
}
function mergeParts(parts: T.BufferGeometry[]) {
  const nonIndexed = parts.map(p => p.index ? p.toNonIndexed() : p); const out = new T.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) { const size = nonIndexed[0].attributes[name].itemSize; const data: number[] = []; nonIndexed.forEach(p => data.push(...(p.attributes[name].array as Float32Array))); out.setAttribute(name, new T.Float32BufferAttribute(data, size)); }
  return out;
}

/** A pointed hair lock hugging the skull: a diamond-section ribbon, wide at the root and
 * tapering to a clean point. [a] angle around the head, [y0] root height, [len] length,
 * [w] root half-width, [out] how far the tip lifts off the head, [twist] sweep around the
 * head, [flick] outward kick at the tip, [curve] forward (+) or back (-) curve. */
export type Lock = { a: number; y0: number; len: number; w: number; out?: number; twist?: number; flick?: number; th?: number; curve?: number; under?: boolean };
export function lockGeometry(l: Lock, grow = 1.08) {
  const N = 7, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = l.a + (l.twist ?? 0) * t, y = l.y0 - l.len * t;
    const base = skullPoint(a, Math.max(y, SKULL_BOTTOM + .03), grow + (l.out ?? .04) * t * t);
    if (y < SKULL_BOTTOM + .03) base.y = y; // below the jaw the lock hangs free
    const N3 = new T.Vector3(Math.sin(a), 0, Math.cos(a)), Tn = new T.Vector3(Math.cos(a), 0, -Math.sin(a));
    base.addScaledVector(N3, (l.flick ?? 0) * t * t * t).addScaledVector(new T.Vector3(0, 0, 1), (l.curve ?? 0) * t * t);
    const w = l.w * Math.pow(1 - t, .75) * (t < .15 ? .75 + t * 1.6 : 1), th = (l.th ?? .016) * (1 - t * .7);
    for (const [tw, tn] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) { const v = base.clone().addScaledVector(Tn, tw * w).addScaledVector(N3, tn * th); pos.push(v.x, v.y, v.z); }
  }
  for (let i = 0; i < N; i++) for (let k = 0; k < 4; k++) { const a = i * 4 + k, b = i * 4 + (k + 1) % 4, c = a + 4, d = b + 4; idx.push(a, c, b, b, c, d); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** The crown shell: skull-hugging volume whose lower edge follows a designed hairline. */
export function shellGeometry(front: number, sides: number, back: number, volume = 1.07, part = 0) {
  const A = 24, Y = 8, pos: number[] = [], idx: number[] = [];
  for (let j = 0; j <= Y; j++) for (let i = 0; i <= A; i++) {
    const a = -Math.PI + i / A * Math.PI * 2, c = Math.cos(a), edge = c > 0 ? sides + (front - sides) * Math.pow(c, 2) : sides + (back - sides) * Math.pow(-c, 1.4);
    const t = j / Y, y = SKULL_TOP + .012 + (edge - SKULL_TOP - .012) * Math.pow(t, 1.05);
    const p = skullPoint(a + part * (1 - t) * .15, Math.min(y, SKULL_TOP - .004), volume + .05 * (1 - t) * (1 - t)); if (j === 0) { p.x *= .2; p.z = p.z * .2 - .02; }
    p.y = y; pos.push(p.x, p.y, p.z);
  }
  for (let j = 0; j < Y; j++) for (let i = 0; i < A; i++) { const a = j * (A + 1) + i, b = a + A + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const D = Math.PI / 180;
const fan = (from: number, to: number, n: number, f: (a: number, i: number) => Omit<Lock, 'a'>) => Array.from({ length: n }, (_, i) => ({ a: (from + (to - from) * (n === 1 ? .5 : i / (n - 1))) * D, ...f(from + (to - from) * i / Math.max(1, n - 1), i) }));
export type HairStyle = { name: string; shell: [number, number, number, number]; locks: Lock[]; tie?: 'pony' | 'high' | 'bun' | 'curtain'; hatSafe: boolean };
/** Nine designed silhouettes. Gaps between fringe and side locks keep rhythm, never helmets. */
export const hairStyles: HairStyle[] = [
  { name: 'short messy', shell: [.12, .03, -.12, 1.09], hatSafe: true, locks: [
    ...fan(-38, 38, 6, (_, i) => ({ y0: .17, len: .13 + (i % 2) * .04, w: .045, twist: (i % 2 ? .18 : -.14), out: .05, th: .02 })),
    ...fan(-100, -78, 2, () => ({ y0: .08, len: .15, w: .04, flick: .03 })), ...fan(78, 100, 2, () => ({ y0: .08, len: .15, w: .04, flick: .03 })),
    ...fan(125, 235, 6, (_, i) => ({ y0: .03, len: .17, w: .06, flick: .05 + (i % 2) * .03, under: i % 2 === 1 })),
    ...fan(160, 200, 2, (_, i) => ({ y0: .27, len: .11, w: .05, out: -.05, flick: .07, curve: -.04 - i * .02 })) ] },
  { name: 'swept asymmetric', shell: [.13, .03, -.12, 1.08], hatSafe: true, locks: [
    ...fan(-42, 22, 5, (_, i) => ({ y0: .18, len: .14 + i * .018, w: .052, twist: .42, out: .05, th: .02 })),
    { a: 40 * D, y0: .12, len: .32, w: .05, twist: .1, flick: .02 }, { a: -88 * D, y0: .08, len: .14, w: .04, flick: .02 },
    ...fan(125, 235, 5, (_, i) => ({ y0: .04, len: .18, w: .065, flick: .035, under: i % 2 === 1 })) ] },
  { name: 'layered medium', shell: [.12, .02, -.14, 1.08], hatSafe: true, locks: [
    ...fan(-34, 34, 5, (_, i) => ({ y0: .17, len: .15 + (i === 2 ? .03 : 0), w: .048, twist: (i - 2) * .06, out: .04 })),
    ...fan(-98, -72, 2, (_, i) => ({ y0: .09, len: .3 - i * .05, w: .045, flick: .02 })), ...fan(72, 98, 2, (_, i) => ({ y0: .09, len: .25 + i * .05, w: .045, flick: .02 })),
    ...fan(118, 242, 6, () => ({ y0: .08, len: .26, w: .065, flick: .03 })), ...fan(135, 225, 4, () => ({ y0: -.02, len: .27, w: .07, flick: .05, under: true })) ] },
  { name: 'ponytail', shell: [.13, .03, -.13, 1.05], hatSafe: true, tie: 'pony', locks: [
    ...fan(-30, 30, 4, (_, i) => ({ y0: .17, len: .13 + (i % 3) * .02, w: .05, twist: (i - 1.5) * .07, out: .04 })),
    ...fan(-92, -76, 2, (_, i) => ({ y0: .09, len: .24 - i * .06, w: .038, flick: .015 })), ...fan(76, 92, 2, (_, i) => ({ y0: .09, len: .18 + i * .06, w: .038, flick: .015 })) ] },
  { name: 'high tied', shell: [.15, .04, -.1, 1.04], hatSafe: false, tie: 'high', locks: [
    ...fan(-36, 30, 5, (_, i) => ({ y0: .18, len: .13 + (i % 2) * .03, w: .045, twist: .22, out: .045 })),
    ...fan(-84, -84, 1, () => ({ y0: .1, len: .3, w: .032, flick: .015 })), ...fan(84, 84, 1, () => ({ y0: .1, len: .3, w: .032, flick: .015 })) ] },
  { name: 'bun', shell: [.13, .03, -.12, 1.05], hatSafe: false, tie: 'bun', locks: [
    ...fan(-26, 34, 3, (_, i) => ({ y0: .17, len: .14 + i * .02, w: .055, twist: .25, out: .04 })),
    ...fan(-90, -74, 2, () => ({ y0: .09, len: .2, w: .036, flick: .02 })), ...fan(74, 90, 2, () => ({ y0: .09, len: .2, w: .036, flick: .02 })) ] },
  { name: 'long straight', shell: [.12, .02, -.14, 1.07], hatSafe: true, tie: 'curtain', locks: [
    ...fan(-32, 32, 5, (_, i) => ({ y0: .17, len: .17 + (i === 2 ? .02 : 0), w: .048, twist: (i - 2) * .05, out: .035 })),
    ...fan(-100, -70, 3, (_, i) => ({ y0: .1, len: .44 - i * .06, w: .05, out: .02 })), ...fan(70, 100, 3, (_, i) => ({ y0: .1, len: .32 + i * .06, w: .05, out: .02 })) ] },
  { name: 'wavy mass', shell: [.12, .02, -.16, 1.13], hatSafe: false, locks: [
    ...fan(-36, 36, 4, (_, i) => ({ y0: .18, len: .15, w: .06, twist: (i % 2 ? .2 : -.2), out: .07, curve: .02 })),
    ...fan(-110, -70, 3, (_, i) => ({ y0: .08, len: .3, w: .06, flick: .07 * (i % 2 ? 1 : -.4), twist: .12 })), ...fan(70, 110, 3, (_, i) => ({ y0: .08, len: .3, w: .06, flick: .07 * (i % 2 ? -.4 : 1), twist: -.12 })),
    ...fan(120, 240, 7, (_, i) => ({ y0: .06, len: .33, w: .07, flick: i % 2 ? .08 : -.02, twist: i % 2 ? .1 : -.1, under: i % 2 === 0 })) ] },
  { name: 'cropped', shell: [.14, .05, -.1, 1.03], hatSafe: true, locks: [
    ...fan(-30, 30, 5, (_, i) => ({ y0: .18, len: .08 + (i % 2) * .02, w: .045, twist: -.1, out: .03, th: .014 })),
    ...fan(-88, -88, 1, () => ({ y0: .07, len: .09, w: .03 })), ...fan(88, 88, 1, () => ({ y0: .07, len: .09, w: .03 })),
    ...fan(130, 230, 5, () => ({ y0: .0, len: .1, w: .06, flick: .02 })) ] },
];
