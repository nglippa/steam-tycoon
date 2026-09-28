import * as T from 'three';

/** Shared character geometry: one skull surface that face, hair and hats agree on, designed
 * hands with a few grip states, and graphic anime hair built from large pointed locks. */

// Skull profile: [y, half-width, half-depth, forward offset]. Head-local units (the head
// group is scaled to world size). A broad cranium above the ears, a smooth temple into the
// cheekbone just under the eye line, then a V jaw to a small chin.
const skullRings = [[-.205,.004,.004,.1],[-.198,.024,.03,.1],[-.184,.05,.064,.088],[-.16,.08,.1,.06],[-.135,.106,.13,.036],[-.105,.13,.15,.016],
  [-.07,.15,.16,.004],[-.035,.16,.156,0],[.01,.169,.166,-.004],[.07,.176,.172,-.01],[.13,.17,.168,-.018],[.19,.142,.142,-.024],[.23,.09,.09,-.026],[.25,.004,.004,-.026]];
function skullRing(y: number) {
  const r = skullRings; if (y <= r[0][0]) return r[0]; if (y >= r[r.length - 1][0]) return r[r.length - 1];
  let i = 0; while (r[i + 1][0] < y) i++; const t = (y - r[i][0]) / (r[i + 1][0] - r[i][0]);
  return r[i].map((v, k) => v + (r[i + 1][k] - v) * t);
}
// The face front seen in profile (midline depth by height): forehead sloping back into the
// hair, brow, a flat mask through the eyes and cheeks, mouth, then the chin tucking under.
// Anime profile (figure-construction ch05): forehead slopes back from the crown, the face line
// runs down at a slight angle to the nose, the lower face recedes to a small chin.
const faceFront = [[-.205,.098],[-.192,.128],[-.178,.144],[-.16,.145],[-.14,.145],[-.12,.147],[-.1,.149],[-.05,.15],[0,.149],[.03,.146],[.08,.138],[.14,.12],[.2,.086],[.25,0]];
function faceDepth(y: number) { const r = faceFront; if (y <= r[0][0]) return r[0][1]; let i = 0; while (i < r.length - 2 && r[i + 1][0] < y) i++; return T.MathUtils.lerp(r[i][1], r[i + 1][1], T.MathUtils.clamp((y - r[i][0]) / (r[i + 1][0] - r[i][0]), 0, 1)); }
/** A point on the skull at angle a (0 = straight ahead) and height y, after face shaping. */
export function skullPoint(a: number, y: number, grow = 1) {
  const [, w, d, oz] = skullRing(y); let x = Math.sin(a) * w, z = Math.cos(a) * d + oz;
  const front = Math.max(0, Math.cos(a));
  if (y < -.04) { const t = Math.min(1, (-.04 - y) / .165); x *= 1 - t * .26 * Math.min(1, front * 1.4); }   // V jaw
  if (front > 0) {
    const ax = Math.abs(x);
    // A flat anime mask: the front follows the profile and only curves back toward the sides.
    z = Math.min(z, faceDepth(y) - 2.8 * x * x); // the face turns back toward the sides: eyes sit behind the nose in profile
    z += .005 * bump(y, 0, .045) * (1 - smooth(.09, .14, ax));                 // brow
    z -= .004 * bump(y, -.075, -.025) * bump(ax, .035, .12);                   // soft eye sockets
    z -= .007 * smooth(.08, .15, ax) * bump(y, -.17, -.04);                    // cheek plane turns back
    // Nose: a narrow wedge from the bridge to a small tip, cut back sharply underneath.
    // Nose wedge: bridge at the eye line, tip at ~1/4 head height above the chin, cut back
    // sharply underneath. It carries the profile; sphere normals keep it off the shading.
    const nose = y > -.1 && y < -.012 ? (y > -.084 ? (-.012 - y) / .072 * .036 : .036 * (y + .1) / .016) : 0;
    z += nose * (1 - smooth(.004, .02 + (-.012 - y) * .12, ax));
    z += .005 * bump(y, -.145, -.122) * (1 - smooth(.012, .035, ax));           // lip mound (~1/8 up)
    z += .003 * bump(y, -.19, -.158) * (1 - smooth(.02, .05, ax));              // small chin, behind the lip
  }
  return new T.Vector3(x * grow, y, z * grow);
}
/** SKULL_BOTTOM anchors the painted face tile; the modelled chin sits higher, at CHIN. */
export const SKULL_TOP = .25, SKULL_BOTTOM = -.236, CHIN = -.205;
/** Anime face shading: normals from a sphere, not the sculpt, so the terminator sweeps across
 * the face as one clean shape and features never pick up muddy local shading. */
function sphereNormals(g: T.BufferGeometry) {
  const p = g.attributes.position, n = new Float32Array(p.count * 3), v = new T.Vector3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), (p.getY(i) - .01) * .8, p.getZ(i) + .03).normalize(); v.toArray(n, i * 3); }
  g.setAttribute('normal', new T.BufferAttribute(n, 3)); return g;
}
function smooth(a: number, b: number, x: number) { const t = T.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function bump(x: number, a: number, b: number) { const m = (a + b) / 2, h = Math.abs(b - a) / 2; return Math.max(0, 1 - Math.pow((x - m) / h, 2)); }
/** Skull mesh with a planar face projection: painted features stay undistorted from the
 * front; the back of the head samples plain skin at the tile edge. */
export function skullGeometry(tile: (u: number, v: number) => [number, number]) {
  const A = 44, Y = 30, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= Y; j++) {
    const y = CHIN + (SKULL_TOP - CHIN) * j / Y;
    for (let i = 0; i <= A; i++) {
      // Denser sampling across the face so the narrow nose and lips resolve; sparse at the back.
      const sN = i / A * 2 - 1, a = sN * Math.PI * (.5 + .5 * Math.abs(sN)), p = skullPoint(a, y); pos.push(p.x, p.y, p.z);
      const u = p.z > .03 ? T.MathUtils.clamp(.5 + p.x / .42, .01, .99) : .5 + Math.sign(p.x || 1) * .495;
      uv.push(...tile(u, (y - SKULL_BOTTOM) / (SKULL_TOP - SKULL_BOTTOM)));
    }
  }
  for (let j = 0; j < Y; j++) for (let i = 0; i < A; i++) { const a = j * (A + 1) + i, b = a + A + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return sphereNormals(g);
}

/** Elliptical (or squarer, n > 2) rings along y: [y, halfWidth, halfDepth, dz?, dx?, n?, backDepth?].
 * A separate back depth lets one loft carry a chest in front and shoulder blades behind. */
export function ringGeometry(rings: number[][], segments = 12, start = 0, arc = Math.PI * 2) {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  rings.forEach(([y, w, d, oz = 0, ox = 0, n = 2, db = d], j) => {
    for (let i = 0; i <= segments; i++) {
      const a = start + i / segments * arc, s = Math.sin(a), c = Math.cos(a), e = 2 / n;
      positions.push(Math.sign(s) * Math.pow(Math.abs(s), e) * w + ox, y, Math.sign(c) * Math.pow(Math.abs(c), e) * (c >= 0 ? d : db) + oz); uv.push(i / segments, j / (rings.length - 1));
    }
  });
  const up = rings.length > 1 && rings[1][0] > rings[0][0];
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < segments; i++) { const a = j * (segments + 1) + i, b = a + segments + 1; if (up) indices.push(a, a + 1, b, a + 1, b + 1, b); else indices.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}
/** Reverse triangle winding (inside faces of a garment). */
function flipped(g: T.BufferGeometry) { const idx = g.index!.array as ArrayLike<number>, out: number[] = []; for (let i = 0; i < idx.length; i += 3) out.push(idx[i], idx[i + 2], idx[i + 1]); g.setIndex(out); g.computeVertexNormals(); return g; }
/** Two-sided strip between matching vertex runs (garment edges seen from either side). */
function strip(a: T.Vector3[], b: T.Vector3[]) {
  const pos: number[] = [], uv: number[] = [];
  for (let i = 0; i < a.length - 1; i++) for (const [p, q, r] of [[a[i], b[i], a[i + 1]], [b[i], b[i + 1], a[i + 1]], [a[i], a[i + 1], b[i]], [b[i], a[i + 1], b[i + 1]]]) { pos.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z); uv.push(0, 0, 0, 0, 0, 0); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
/** Cloth with real thickness: outer and inner lofts, plus closed hem and front edges, so an
 * open coat reads as a panel with depth instead of a sheet that vanishes edge-on. */
export function garmentGeometry(rings: number[][], segments = 14, start = 0, arc = Math.PI * 2, thick = .01) {
  const closed = arc >= Math.PI * 2 - 1e-3;
  const inner = rings.map(([y, w, d, oz = 0, ox = 0, n = 2, db = d]) => [y, w - thick, d - thick, oz, ox, n, db - thick]);
  // Closed bands (belts, cuffs, straps, skirts) never show their inside: outer surface plus a thick hem only.
  const outerG = ringGeometry(rings, segments, start, arc), innerG = closed ? ringGeometry(inner, segments, start, arc) : flipped(ringGeometry(inner, segments, start, arc));
  const at = (g: T.BufferGeometry, j: number, i: number) => new T.Vector3().fromBufferAttribute(g.attributes.position as T.BufferAttribute, j * (segments + 1) + i);
  const last = rings.length - 1, parts = closed ? [outerG] : [outerG, innerG];
  const hemO: T.Vector3[] = [], hemI: T.Vector3[] = [];
  for (let i = 0; i <= segments; i++) { hemO.push(at(outerG, last, i)); hemI.push(at(innerG, last, i)); }
  parts.push(strip(hemO, hemI));
  if (!closed) for (const i of [0, segments]) { const o: T.Vector3[] = [], n: T.Vector3[] = []; for (let j = 0; j <= last; j++) { o.push(at(outerG, j, i)); n.push(at(innerG, j, i)); } parts.push(strip(o, n)); }
  return mergeParts(parts);
}
/** A point on a ring loft at angle a (0 = front) and height y, lifted off the surface. */
export type Surface = (a: number, y: number, lift?: number) => T.Vector3;
export function ringSurface(rings: number[][]): Surface {
  const r = [...rings].sort((p, q) => p[0] - q[0]);
  return (a, y, lift = 0) => {
    let i = 0; while (i < r.length - 2 && r[i + 1][0] < y) i++;
    const t = T.MathUtils.clamp((y - r[i][0]) / (r[i + 1][0] - r[i][0]), 0, 1), v = (k: number, dflt: number) => T.MathUtils.lerp(r[i][k] ?? dflt, r[i + 1][k] ?? dflt, t);
    const w = v(1, 0), d = v(2, 0), oz = v(3, 0), ox = v(4, 0), n = v(5, 2), db = T.MathUtils.lerp(r[i][6] ?? r[i][2], r[i + 1][6] ?? r[i + 1][2], t);
    const s = Math.sin(a), c = Math.cos(a), e = 2 / n;
    return new T.Vector3(Math.sign(s) * Math.pow(Math.abs(s), e) * (w + lift) + ox, y, Math.sign(c) * Math.pow(Math.abs(c), e) * ((c >= 0 ? d : db) + lift) + oz);
  };
}
/** A strap, sash or lapel laid over a surface: [a, y, width] control points, densified and
 * given thickness, so bands wrap the body instead of floating as slabs. */
export function ribbonGeometry(surface: Surface, path: number[][], lift = .004, thick = .007, samples = 4) {
  const pts: number[][] = [];
  for (let i = 0; i < path.length - 1; i++) for (let k = 0; k < samples; k++) { const t = k / samples; pts.push(path[i].map((v, j) => v + (path[i + 1][j] - v) * t)); }
  pts.push(path[path.length - 1]);
  const lo: T.Vector3[][] = [], hi: T.Vector3[][] = [];
  pts.forEach(([a, y, w], i) => {
    const p = surface(a, y, lift), q = surface(a, y, lift + thick), n = q.clone().sub(p).normalize();
    const [a0, y0] = pts[Math.max(0, i - 1)], [a1, y1] = pts[Math.min(pts.length - 1, i + 1)];
    const tan = surface(a1, y1, lift).sub(surface(a0, y0, lift)).normalize(), b = new T.Vector3().crossVectors(tan, n).normalize().multiplyScalar(w / 2);
    lo.push([p.clone().add(b), p.clone().sub(b)]); hi.push([q.clone().add(b), q.clone().sub(b)]);
  });
  const col = (arr: T.Vector3[][], k: number) => arr.map(e => e[k]);
  const parts = [strip(col(hi, 0), col(hi, 1)), strip(col(lo, 0), col(hi, 0)), strip(col(lo, 1), col(hi, 1)), strip([hi[0][0], hi[0][1]], [lo[0][0], lo[0][1]]), strip([hi[hi.length - 1][0], hi[hi.length - 1][1]], [lo[lo.length - 1][0], lo[lo.length - 1][1]])];
  return mergeParts(parts);
}
/** A rounded block (pouch, buckle, board): squarish rings with closed ends, centred. */
export function blockGeometry(w: number, h: number, d: number, round = 3.2, segments = 12) {
  const e = .004;
  return ringGeometry([[-h / 2, e, e], [-h / 2 + .004, w * .92, d * .92, 0, 0, round], [-h / 2 + .012, w, d, 0, 0, round], [h / 2 - .012, w, d, 0, 0, round], [h / 2 - .004, w * .92, d * .92, 0, 0, round], [h / 2, e, e]], segments);
}

export type HandState = 'relaxed' | 'open' | 'gesture' | 'grip' | 'point' | 'fist';
export const HAND_STATES: HandState[] = ['relaxed', 'open', 'gesture', 'grip', 'point', 'fist'];
/** Progressive curl about the knuckle line: vertices past y0 wrap on an arc toward the palm. */
function curl(g: T.BufferGeometry, y0: number, length: number, angle: number, inward: number) {
  if (Math.abs(angle) < .01) return g; const p = g.attributes.position, rho = length / angle;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y >= y0) continue; const x = p.getX(i), u = x * inward, s = Math.min(y0 - y, length * 1.15), phi = s / rho, r = rho - u, over = y0 - y - s;
    p.setX(i, inward * (rho - r * Math.cos(phi)) + inward * Math.sin(phi) * over); p.setY(i, y0 - r * Math.sin(phi) - Math.cos(phi) * over); }
  g.computeVertexNormals(); return g;
}
// Authored hand poses. Finger curls are [index, middle+ring, little]; fan spreads index and
// little finger away from the group; the thumb has forward swing, opposition toward the palm
// and its own curl.
const POSES: Record<HandState, { curl: [number, number, number]; fan: [number, number]; thumb: [number, number, number] }> = {
  relaxed: { curl: [.5, .78, 1.02], fan: [.03, -.06], thumb: [.5, .28, .35] },
  open: { curl: [.04, .07, .12], fan: [.13, -.16], thumb: [1.05, -.15, 0] },
  gesture: { curl: [.12, .5, .86], fan: [.1, -.08], thumb: [.85, .05, .18] },
  grip: { curl: [2.05, 2.2, 2.3], fan: [0, 0], thumb: [.95, .7, .7] },
  point: { curl: [0, 2.85, 2.95], fan: [.02, 0], thumb: [.55, .95, .95] },
  fist: { curl: [2.95, 3.05, 3.1], fan: [0, 0], thumb: [.6, 1.05, 1.05] },
};
const handCache = new Map<string, T.BufferGeometry>();
/** Graphic anime hand in hand-local space (wrist at y=0, fingers toward -y, palm facing the
 * body, thumb forward): a tapered palm with a thumb-side pad, an index finger, a grouped
 * middle+ring wedge and a little finger stepping back, plus a thumb with a clear notch. The
 * stepped fingertips and the thumb gap are what make it read as a hand at a distance. */
export function handGeometry(state: HandState, side: number) {
  const key = state + side; const hit = handCache.get(key); if (hit) return hit;
  const inward = -side, pose = POSES[state], parts: T.BufferGeometry[] = [];
  // Palm: [y, half thickness, half span, forward offset]. Knuckles slope from index to little finger.
  parts.push(ringGeometry([[.014, .004, .01], [.01, .017, .024], [0, .019, .03, .002], [-.035, .022, .041, .004], [-.068, .02, .046, .002], [-.09, .016, .047], [-.1, .011, .043, -.002], [-.105, .004, .03, -.002]], 12));
  const fingers: [number, number, number, number, number][] = [[.03, .0105, .082, .0098, -.094], [-.002, .02, .088, .0102, -.098], [-.033, .0088, .066, .0088, -.09]]; // [z, half span, length, half thickness, knuckle y]
  fingers.forEach(([z, half, len, th, ky], k) => {
    const rings = [[.012, th * .9, half * .95], [0, th, half], [-len * .35, th * .96, half * .97], [-len * .7, th * .86, half * .88], [-len * .9, th * .7, half * .72], [-len, th * .35, half * .38], [-len - .004, .002, .003]];
    const g = ringGeometry(rings, 7).translate(0, ky, z);
    const fan = k === 0 ? pose.fan[0] : k === 2 ? pose.fan[1] : 0;
    if (fan) g.translate(0, -ky, -z).rotateX(-fan).translate(0, ky, z);
    parts.push(curl(g, ky, len * .92, pose.curl[k], inward));
  });
  const [fwd, opp, tc] = pose.thumb;
  const thumb = curl(ringGeometry([[.012, .012, .012], [0, .0145, .0135], [-.028, .0125, .0118], [-.05, .011, .0102], [-.066, .0088, .008], [-.074, .004, .004], [-.077, .0015, .0015]], 7), -.03, .045, tc * 1.3, inward);
  thumb.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(-fwd, 0, inward * opp))).translate(inward * .007, -.016, .03); parts.push(thumb);
  const merged = mergeParts(parts); handCache.set(key, merged); return merged;
}
/** Boot families: the foot is a design feature with a real sole, heel and toe. */
export type BootFamily = 'work' | 'civic' | 'engineer' | 'guard';
export const BOOT_SPEC: Record<BootFamily, { w: number; toe: number; toeH: number; sole: number; heel: number; shaft: number; point: number }> = {
  work: { w: 1.14, toe: .205, toeH: .046, sole: .024, heel: .026, shaft: .15, point: 0 },
  civic: { w: .9, toe: .215, toeH: .03, sole: .012, heel: .034, shaft: .03, point: .55 },
  engineer: { w: 1.04, toe: .205, toeH: .04, sole: .02, heel: .03, shaft: .28, point: .1 },
  guard: { w: .98, toe: .21, toeH: .034, sole: .016, heel: .04, shaft: .44, point: .3 },
};
/** Foot sections along +z: [z, half width, top y, bottom y]; a squared ellipse through each. */
function footLoft(sections: number[][], segments = 12, n = 2.5) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  sections.forEach(([z, w, top, bot], j) => { const yc = (top + bot) / 2, h = (top - bot) / 2;
    for (let i = 0; i <= segments; i++) { const a = i / segments * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), e = 2 / n;
      pos.push(Math.sign(s) * Math.pow(Math.abs(s), e) * w, yc + Math.sign(c) * Math.pow(Math.abs(c), e) * h, z); uv.push(i / segments, j / (sections.length - 1)); } });
  for (let j = 0; j < sections.length - 1; j++) for (let i = 0; i < segments; i++) { const a = j * (segments + 1) + i, b = a + segments + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** Boot below the ankle pivot (ankle-local: pivot at origin, floor at y = -ankle, toe +z).
 * Returns the leather upper and the dark sole/heel separately. */
export function bootFoot(family: BootFamily, ankle: number) {
  const key = 'boot' + family + ankle; const hit = bootCache.get(key); if (hit) return hit;
  const b = BOOT_SPEC[family], F = -ankle, W = b.w;
  // Sole underside: on the floor at the ball, lifted by the heel under the arch.
  const under = (z: number) => F + b.heel * (1 - T.MathUtils.smoothstep(z, -.01, .075)), top = (z: number) => under(z) + b.sole;
  const toeTop = F + b.sole + b.toeH, t = b.toe, p = b.point;
  const upper = footLoft([[-.081, .002, -.036, top(-.081) + .02], [-.078, .016 * W, -.03, top(-.078) + .012], [-.07, .034 * W, .01, top(-.07)], [-.045, .042 * W, .04, top(-.045)], [-.005, .045 * W, .04, top(-.005)], [.04, .047 * W, -.006, top(.04)],
    [.085, .05 * W, toeTop + .016, top(.085)], [.13, .05 * W * (1 - p * .08), toeTop + .004, top(.13)], [t - .035, .044 * W * (1 - p * .2), toeTop - .002, top(t - .035)], [t - .012, .032 * W * (1 - p * .38), toeTop - b.toeH * .3, top(t)], [t, .01 * W, top(t) + b.toeH * .45, top(t) + .004], [t + .002, .002, top(t) + .02, top(t) + .016]]);
  // Welted sole plate following the upper, a stacked heel block and a slight toe spring.
  const plate = footLoft([[-.085, .003, top(-.085) - .002, under(-.085) + .006], [-.083, .02 * W, top(-.083), under(-.083) + .004], [-.075, .04 * W, top(-.075), under(-.075)], [-.02, .048 * W, top(-.02), under(-.02)], [.085, .056 * W, top(.085), under(.085)], [.14, .055 * W * (1 - p * .08), top(.14), under(.14)],
    [t - .03, .048 * W * (1 - p * .2), top(t - .03), under(t - .03) + .002], [t + .004, .028 * W * (1 - p * .4), top(t), under(t) + .008], [t + .012, .004, top(t) - .002, under(t) + .01]], 12, 4);
  const heel = footLoft([[-.08, .004, F + b.heel, F + .004], [-.077, .037 * W, F + b.heel, F], [-.018, .039 * W, F + b.heel, F], [-.014, .004, F + b.heel, F + .004]], 10, 5);
  const out = { upper, sole: mergeParts([plate, heel]) }; bootCache.set(key, out); return out;
}
const bootCache = new Map<string, { upper: T.BufferGeometry; sole: T.BufferGeometry }>();
export function mergeParts(parts: T.BufferGeometry[]) {
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
  const N = 6, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = l.a + (l.twist ?? 0) * t, y = l.y0 - l.len * t;
    const base = skullPoint(a, Math.max(y, CHIN + .03), grow + (l.out ?? .04) * t * t);
    if (y < CHIN + .03) base.y = y; // below the jaw the lock hangs free
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
// Shared masses that break the helmet: crown spikes lifting off the skull, flicks at the nape,
// and an ahoge (the single upright lock) for a few styles.
const crown = (spread: number, lift = .09, n = 3) => fan(180 - spread, 180 + spread, n, (_, i) => ({ y0: .245, len: .17 + (i % 2) * .05, w: .062, out: lift * 2.2, flick: .1 + (i % 2) * .05, twist: (i - (n - 1) / 2) * .14, curve: -.03 }));
const nape = (from: number, to: number, n: number, len = .13) => fan(from, to, n, (_, i) => ({ y0: -.02, len: len + (i % 2) * .05, w: .05, out: .08, flick: .11 + (i % 3) * .03, twist: (i % 2 ? .12 : -.12), under: i % 2 === 1 }));
const ahoge: Lock = { a: 10 * D, y0: .24, len: -.1, w: .018, out: .02, curve: .07, flick: .02, th: .01 };
/** Nine designed silhouettes. Gaps between fringe and side locks keep rhythm, never helmets. */
export const hairStyles: HairStyle[] = [
  { name: 'short messy', shell: [.12, .03, -.12, 1.09], hatSafe: true, locks: [
    ...fan(-38, 38, 6, (_, i) => ({ y0: .17, len: .13 + (i % 2) * .04, w: .045, twist: (i % 2 ? .18 : -.14), out: .05, th: .02 })),
    ...fan(-100, -78, 2, () => ({ y0: .08, len: .17, w: .04, flick: .04, out: .05 })), ...fan(78, 100, 2, () => ({ y0: .08, len: .15, w: .04, flick: .04, out: .05 })),
    ...fan(125, 235, 6, (_, i) => ({ y0: .03, len: .17, w: .06, flick: .05 + (i % 2) * .03, under: i % 2 === 1 })),
    ...crown(40, .11, 4), ...nape(140, 220, 4) ] },
  { name: 'swept asymmetric', shell: [.13, .03, -.12, 1.08], hatSafe: true, locks: [
    ...fan(-42, 22, 5, (_, i) => ({ y0: .18, len: .14 + i * .018, w: .052, twist: .42, out: .05, th: .02 })),
    { a: 40 * D, y0: .12, len: .34, w: .05, twist: .1, flick: .03, out: .06 }, { a: -88 * D, y0: .08, len: .14, w: .04, flick: .03, out: .05 },
    ...fan(125, 235, 5, (_, i) => ({ y0: .04, len: .18, w: .065, flick: .035, under: i % 2 === 1 })), ...crown(30, .1, 3), ...nape(150, 210, 3), ahoge ] },
  { name: 'layered medium', shell: [.12, .02, -.14, 1.08], hatSafe: true, locks: [
    ...fan(-34, 34, 5, (_, i) => ({ y0: .17, len: .15 + (i === 2 ? .03 : 0), w: .048, twist: (i - 2) * .06, out: .04 })),
    ...fan(-98, -72, 2, (_, i) => ({ y0: .09, len: .32 - i * .05, w: .045, flick: .03, out: .07, curve: .02 })), ...fan(72, 98, 2, (_, i) => ({ y0: .09, len: .27 + i * .05, w: .045, flick: .03, out: .07, curve: .02 })),
    ...fan(118, 242, 6, () => ({ y0: .08, len: .26, w: .065, flick: .03 })), ...fan(135, 225, 4, () => ({ y0: -.02, len: .27, w: .07, flick: .05, under: true })), ...crown(35, .08, 3) ] },
  { name: 'ponytail', shell: [.13, .03, -.13, 1.05], hatSafe: true, tie: 'pony', locks: [
    ...fan(-30, 30, 4, (_, i) => ({ y0: .17, len: .13 + (i % 3) * .02, w: .05, twist: (i - 1.5) * .07, out: .04 })),
    ...fan(-92, -76, 2, (_, i) => ({ y0: .09, len: .28 - i * .06, w: .038, flick: .02, out: .07, curve: .025 })), ...fan(76, 92, 2, (_, i) => ({ y0: .09, len: .22 + i * .06, w: .038, flick: .02, out: .07, curve: .025 })), ahoge ] },
  { name: 'high tied', shell: [.15, .04, -.1, 1.04], hatSafe: false, tie: 'high', locks: [
    ...fan(-36, 30, 5, (_, i) => ({ y0: .18, len: .13 + (i % 2) * .03, w: .045, twist: .22, out: .045 })),
    ...fan(-84, -84, 1, () => ({ y0: .1, len: .32, w: .032, flick: .02, out: .08, curve: .03 })), ...fan(84, 84, 1, () => ({ y0: .1, len: .32, w: .032, flick: .02, out: .08, curve: .03 })) ] },
  { name: 'bun', shell: [.13, .03, -.12, 1.05], hatSafe: false, tie: 'bun', locks: [
    ...fan(-26, 34, 3, (_, i) => ({ y0: .17, len: .14 + i * .02, w: .055, twist: .25, out: .04 })),
    ...fan(-90, -74, 2, () => ({ y0: .09, len: .22, w: .036, flick: .02, out: .07, curve: .02 })), ...fan(74, 90, 2, () => ({ y0: .09, len: .22, w: .036, flick: .02, out: .07, curve: .02 })) ] },
  { name: 'long straight', shell: [.12, .02, -.14, 1.07], hatSafe: true, tie: 'curtain', locks: [
    ...fan(-32, 32, 5, (_, i) => ({ y0: .17, len: .17 + (i === 2 ? .02 : 0), w: .048, twist: (i - 2) * .05, out: .035 })),
    ...fan(-100, -70, 3, (_, i) => ({ y0: .1, len: .44 - i * .06, w: .05, out: .05 })), ...fan(70, 100, 3, (_, i) => ({ y0: .1, len: .32 + i * .06, w: .05, out: .05 })), ahoge ] },
  { name: 'wavy mass', shell: [.12, .02, -.16, 1.13], hatSafe: false, locks: [
    ...fan(-36, 36, 4, (_, i) => ({ y0: .18, len: .15, w: .06, twist: (i % 2 ? .2 : -.2), out: .07, curve: .02 })),
    ...fan(-110, -70, 3, (_, i) => ({ y0: .08, len: .3, w: .06, flick: .07 * (i % 2 ? 1 : -.4), twist: .12 })), ...fan(70, 110, 3, (_, i) => ({ y0: .08, len: .3, w: .06, flick: .07 * (i % 2 ? -.4 : 1), twist: -.12 })),
    ...fan(120, 240, 7, (_, i) => ({ y0: .06, len: .33, w: .07, flick: i % 2 ? .08 : -.02, twist: i % 2 ? .1 : -.1, under: i % 2 === 0 })), ...crown(45, .1, 3) ] },
  { name: 'cropped', shell: [.14, .05, -.1, 1.03], hatSafe: true, locks: [
    ...fan(-30, 30, 5, (_, i) => ({ y0: .18, len: .08 + (i % 2) * .02, w: .045, twist: -.1, out: .03, th: .014 })),
    ...fan(-88, -88, 1, () => ({ y0: .07, len: .09, w: .03 })), ...fan(88, 88, 1, () => ({ y0: .07, len: .09, w: .03 })),
    ...fan(130, 230, 5, () => ({ y0: .0, len: .1, w: .06, flick: .02 })), ...crown(50, .07, 5) ] },
];
/** Anime crown shine: one jagged band of light across the top of the hair. */
export function shineGeometry(volume: number) {
  const pos: number[] = [], N = 16;
  for (let i = 0; i <= N; i++) { const a = (-75 + 150 * i / N) * D, top = skullPoint(a, .185, volume), bot = skullPoint(a, i % 2 ? .148 : .163, volume); top.y = .185; bot.y = i % 2 ? .148 : .163; pos.push(top.x, top.y, top.z, bot.x, bot.y, bot.z); }
  const idx: number[] = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
