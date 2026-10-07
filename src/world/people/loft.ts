import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** The authored cross-section loft (Terra Character Book section 5).
 *  A ring is a section at height `y`: half-width `w`, FRONT depth `f` and BACK depth `b` measured from the ring's widest line, that line's z offset `z` (and an optional
 *  x offset), and a squareness `n` (the superellipse exponent: 2 is an ellipse, higher is boxier). A calf is a ring with a small `f` and a large `b`; a boot toe a ring with n > 2.
 *  Rings run along y in either direction. u runs around (0 is the centre front), v along, as the old `tailored()` did, so the cloth map works unchanged. */
export interface Ring { y: number; w: number; f: number; b: number; z?: number; x?: number; n?: number }
export type Cap = 'flat' | { round: number } | undefined;
export interface LoftOpts {
  /** segments around */ seg?: number;
  /** start angle, radians (0 is the centre front, positive turns to +x) */ start?: number;
  /** arc, radians (2 pi is closed; less is an open shell) */ arc?: number;
  capStart?: Cap; capEnd?: Cap;
  /** hem lip at the first / last ring: an inward-turned band of this thickness, so an edge has a lit face and a shadowed underside */
  lipStart?: number; lipEnd?: number;
  /** how far the lip's inner wall runs back along the part (default 2.5 x thickness) */ lipDepth?: number;
  /** a cache key: identical parts are built once and shared (Book section 14) */ key?: string;
}
const TAU = Math.PI * 2;
const sp = (t: number, n: number) => { const k = 2 / n; return Math.sign(t) * Math.pow(Math.abs(t), k); };

const cache = new Map<string, T.BufferGeometry>();
/** Geometry shared by key. Callers must not mutate what they get back (clone first). */
export function shared(key: string, make: () => T.BufferGeometry): T.BufferGeometry { let g = cache.get(key); if (!g) { g = make(); cache.set(key, g); } return g; }
export const sharedCount = () => cache.size;

/** The point on a ring at angle a (0 front). */
export function ringPoint(r: Ring, a: number, out: number[] = [0, 0, 0]) {
  const s = Math.sin(a), c = Math.cos(a), n = r.n ?? 2;
  out[0] = (r.x ?? 0) + sp(s, n) * r.w; out[1] = r.y; out[2] = (r.z ?? 0) + sp(c, n) * (c >= 0 ? r.f : r.b); return out;
}
/** Interpolated ring at height y (clamped), for surfaces that sit on a part: straps, lapels, pockets. */
export function ringAt(rings: Ring[], y: number): Ring {
  const up = rings[rings.length - 1].y > rings[0].y; let j = 0;
  while (j < rings.length - 2 && (up ? y > rings[j + 1].y : y < rings[j + 1].y)) j++;
  const a = rings[j], b = rings[j + 1], t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y))), m = (p: number | undefined, q: number | undefined, d = 0) => (p ?? d) + ((q ?? d) - (p ?? d)) * t;
  return { y, w: m(a.w, b.w), f: m(a.f, b.f), b: m(a.b, b.b), z: m(a.z, b.z), x: m(a.x, b.x), n: m(a.n, b.n, 2) };
}
/** Surface point and outward normal at height y, angle a, pushed out by `off` along the normal. */
export function surface(rings: Ring[], y: number, a: number, off = 0): { p: T.Vector3; n: T.Vector3 } {
  const lo = Math.min(rings[0].y, rings[rings.length - 1].y), hi = Math.max(rings[0].y, rings[rings.length - 1].y), e = .01;
  const r = ringAt(rings, y), q = ringPoint(r, a), q2 = ringPoint(r, a + .01), q0 = ringPoint(r, a - .01);
  const ta = new T.Vector3(q2[0] - q0[0], 0, q2[2] - q0[2]), flat = new T.Vector3(-ta.z, 0, ta.x).normalize();
  const pa = ringPoint(ringAt(rings, Math.min(hi, y + e)), a), pb = ringPoint(ringAt(rings, Math.max(lo, y - e)), a), tv = new T.Vector3(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
  const n = new T.Vector3().crossVectors(tv, ta).normalize(); if (!(n.lengthSq() > .5)) n.copy(flat); else if (n.dot(flat) < 0) n.negate();
  return { p: new T.Vector3(q[0], q[1], q[2]).addScaledVector(n, off), n };
}
/** The rings pushed out by `d` all round (a garment shell off a body reference). `shape(ring, i)` returns extra amounts to add to w, f, b, y or z (fullness at the chest, a flared hem). */
export const offset = (rings: Ring[], d: number, shape?: (r: Ring, i: number) => { w?: number; f?: number; b?: number; y?: number; z?: number }): Ring[] => rings.map((r, i) => { const s = shape ? shape(r, i) : {}; return { ...r, y: r.y + (s.y ?? 0), w: Math.max(.001, r.w + d + (s.w ?? 0)), f: Math.max(.001, r.f + d + (s.f ?? 0)), b: Math.max(.001, r.b + d + (s.b ?? 0)), z: (r.z ?? 0) + (s.z ?? 0) }; });
/** Linear blend of two ring lists of equal length. */
export const mixRings = (a: Ring[], b: Ring[], t: number): Ring[] => a.map((r, i) => { const s = b[i], m = (p = 0, q = 0) => p + (q - p) * t; return { y: m(r.y, s.y), w: m(r.w, s.w), f: m(r.f, s.f), b: m(r.b, s.b), z: m(r.z, s.z), x: m(r.x, s.x), n: m(r.n ?? 2, s.n ?? 2) }; });

export function loft(input: Ring[], o: LoftOpts = {}): T.BufferGeometry {
  if (o.key) { const hit = cache.get(o.key); if (hit) return hit; }
  const seg = o.seg ?? 12, start = o.start ?? 0, arc = o.arc ?? TAU, closed = Math.abs(arc - TAU) < 1e-6;
  const dir = input[input.length - 1].y >= input[0].y ? 1 : -1;
  let rings = input.map(r => ({ ...r }));
  const grow = (r: Ring, d: number): Ring => ({ ...r, w: Math.max(r.w - d, .0005), f: Math.max(r.f - d, .0005), b: Math.max(r.b - d, .0005) });
  // Hem lips: the outer end ring, the flat of the lip (inset), then the inner wall running back along the part.
  const lip = (end: 'start' | 'end', t: number) => {
    const e = end === 'end' ? rings[rings.length - 1] : rings[0], inner = end === 'end' ? -dir : dir, depth = o.lipDepth ?? t * 2.5;
    const flat = grow(e, t), wall = { ...flat, y: e.y + inner * depth };
    if (end === 'end') rings.push(flat, wall); else rings.unshift(wall, flat);
  };
  let fanStart = false, fanEnd = false;
  if (o.lipStart) lip('start', o.lipStart); if (o.lipEnd) lip('end', o.lipEnd);
  // Rounded caps: a quarter sphere of radius R of rings past the end, scaled by cos(phi) at sin(phi) R out.
  const round = (end: 'start' | 'end', R: number) => {
    const e = end === 'end' ? rings[rings.length - 1] : rings[0], out = end === 'end' ? dir : -dir, extra: Ring[] = [];
    for (const phi of [.7, 1.3]) { const s = Math.cos(phi); extra.push({ ...e, y: e.y + out * Math.sin(phi) * R, w: e.w * s, f: e.f * s, b: e.b * s }); }
    if (end === 'end') { rings.push(...extra); fanEnd = true; } else { rings.unshift(...extra.reverse()); fanStart = true; }
  };
  if (o.capStart && o.capStart !== 'flat') round('start', o.capStart.round);
  if (o.capEnd && o.capEnd !== 'flat') round('end', o.capEnd.round);
  const R = rings.length, pos: number[] = [], uv: number[] = [], idx: number[] = [], q = [0, 0, 0];
  // v by distance along the profile, so a texture is not stretched by uneven ring spacing
  const dist = [0]; for (let j = 1; j < R; j++) dist.push(dist[j - 1] + Math.hypot(rings[j].y - rings[j - 1].y, (rings[j].w - rings[j - 1].w) * .5) + 1e-6);
  const total = dist[R - 1] || 1;
  for (let j = 0; j < R; j++) for (let i = 0; i <= seg; i++) { ringPoint(rings[j], start + i / seg * arc, q); pos.push(q[0], q[1], q[2]); uv.push(i / seg, dist[j] / total); }
  for (let j = 0; j < R - 1; j++) for (let i = 0; i < seg; i++) { const a = j * (seg + 1) + i, b = a + seg + 1; if (dir > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
  // Flat caps: a fan to the ring's centre.
  const fan = (ring: number, atEnd: boolean) => { const r = rings[ring], c = pos.length / 3; pos.push(r.x ?? 0, r.y, r.z ?? 0); uv.push(.5, ring / (R - 1));
    for (let i = 0; i < seg; i++) { const a = ring * (seg + 1) + i; const up = atEnd ? dir > 0 : dir < 0; if (up) idx.push(a + 1, a, c); else idx.push(a, a + 1, c); } };
  if (o.capStart === 'flat' || fanStart) fan(0, false); if (o.capEnd === 'flat' || fanEnd) fan(R - 1, true);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  if (closed) { // one smooth normal across the seam
    const nrm = g.attributes.normal as T.BufferAttribute;
    for (let j = 0; j < R; j++) { const a = j * (seg + 1), b = a + seg; const x = nrm.getX(a) + nrm.getX(b), y = nrm.getY(a) + nrm.getY(b), z = nrm.getZ(a) + nrm.getZ(b), l = Math.hypot(x, y, z) || 1; nrm.setXYZ(a, x / l, y / l, z / l); nrm.setXYZ(b, x / l, y / l, z / l); }
  }
  if (o.key) cache.set(o.key, g);
  return g;
}

/** A tube or ribbon swept along a 3D path: fingers, thumbs, hair clumps, straps, belts, collars. `a` is the half-extent along the binormal, `b` along `n` (the surface
 *  normal for a strap, so a strap lies flat on what it crosses). Tapers end in a point. */
export interface SweepPt { p: [number, number, number]; a: number; b: number; n?: [number, number, number] }
export interface SweepOpts { seg?: number; capStart?: boolean; capEnd?: boolean; sq?: number; closed?: boolean; key?: string }
export function sweep(pts: SweepPt[], o: SweepOpts = {}): T.BufferGeometry {
  if (o.key) { const hit = cache.get(o.key); if (hit) return hit; }
  const seg = o.seg ?? 8, sq = o.sq ?? 2, N = pts.length, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const P = pts.map(p => new T.Vector3(...p.p)), tang = P.map((_, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)]; if (o.closed) { const c = P[(i + N - 1) % N], d = P[(i + 1) % N]; return d.clone().sub(c).normalize(); } return b.clone().sub(a).normalize(); });
  let prev = new T.Vector3(0, 0, 1);
  const ring: { c: T.Vector3; B: T.Vector3; Nn: T.Vector3 }[] = [];
  for (let i = 0; i < N; i++) {
    const t = tang[i]; let n = pts[i].n ? new T.Vector3(...pts[i].n!) : prev.clone();
    n.addScaledVector(t, -n.dot(t)); if (n.lengthSq() < 1e-8) n = Math.abs(t.y) < .9 ? new T.Vector3(0, 1, 0).addScaledVector(t, -t.y) : new T.Vector3(1, 0, 0); n.normalize();
    ring.push({ c: P[i], Nn: n, B: new T.Vector3().crossVectors(t, n).normalize() }); prev = n;
  }
  for (let i = 0; i < N; i++) for (let k = 0; k <= seg; k++) {
    const th = k / seg * TAU, c = sp(Math.cos(th), sq), s = sp(Math.sin(th), sq), r = ring[i];
    const p = r.c.clone().addScaledVector(r.B, c * pts[i].a).addScaledVector(r.Nn, s * pts[i].b); pos.push(p.x, p.y, p.z); uv.push(k / seg, i / (N - 1));
  }
  const rows = o.closed ? N : N - 1;
  for (let i = 0; i < rows; i++) for (let k = 0; k < seg; k++) { const a = i * (seg + 1) + k, b = ((i + 1) % N) * (seg + 1) + k; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const capAt = (i: number, atEnd: boolean) => { const c = pos.length / 3, p = ring[i].c; pos.push(p.x, p.y, p.z); uv.push(.5, atEnd ? 1 : 0); for (let k = 0; k < seg; k++) { const a = i * (seg + 1) + k; if (atEnd) idx.push(a, a + 1, c); else idx.push(a + 1, a, c); } };
  if (!o.closed && o.capStart) capAt(0, false); if (!o.closed && o.capEnd) capAt(N - 1, true);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  // Orient outward: the first triangle's normal must point away from the path.
  g.computeVertexNormals();
  { const p = g.attributes.position as T.BufferAttribute, n = g.attributes.normal as T.BufferAttribute, i = Math.floor(N / 2) * (seg + 1), c = ring[Math.floor(N / 2)].c; const out = new T.Vector3(p.getX(i) - c.x, p.getY(i) - c.y, p.getZ(i) - c.z); if (out.dot(new T.Vector3(n.getX(i), n.getY(i), n.getZ(i))) < 0) { const ix = g.index!; for (let t = 0; t < ix.count; t += 3) { const x = ix.getX(t + 1); ix.setX(t + 1, ix.getX(t + 2)); ix.setX(t + 2, x); } g.computeVertexNormals(); } }
  if (o.key) cache.set(o.key, g);
  return g;
}

/** Moves a geometry (returns a clone): position, then Euler rotation, then per-axis scale applied first. */
export function place(g: T.BufferGeometry, p: [number, number, number] = [0, 0, 0], r: [number, number, number] = [0, 0, 0], s: [number, number, number] | number = 1): T.BufferGeometry {
  const m = new T.Matrix4().compose(new T.Vector3(...p), new T.Quaternion().setFromEuler(new T.Euler(r[0], r[1], r[2], 'YXZ')), typeof s === 'number' ? new T.Vector3(s, s, s) : new T.Vector3(...s));
  return g.clone().applyMatrix4(m);
}
/** Merges geometries that share attributes (position, normal, uv). */
export function merge(list: T.BufferGeometry[]): T.BufferGeometry {
  const gs = list.map(g => { const c = g.clone(); if (!c.index) { const n = c.attributes.position.count, ix: number[] = []; for (let i = 0; i < n; i++) ix.push(i); c.setIndex(ix); } for (const k of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(k)) c.deleteAttribute(k); if (!c.attributes.uv) c.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2)); return c; });
  return mergeGeometries(gs, false)!;
}
export const triangles = (g: T.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;

/** The same surface facing the other way (a lining: its faces look in, so the cloth's inside is drawn): the winding turned and the normals reversed. Returns a clone. */
export function inward(g: T.BufferGeometry): T.BufferGeometry {
  const c = g.clone(), ix = c.index!; for (let t = 0; t < ix.count; t += 3) { const a = ix.getX(t + 1); ix.setX(t + 1, ix.getX(t + 2)); ix.setX(t + 2, a); }
  const n = c.attributes.normal as T.BufferAttribute; if (n) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return c;
}
/** The mirror image (x -> -x) of a geometry, with the winding turned back so it still faces out. */
export function mirrorX(g: T.BufferGeometry): T.BufferGeometry {
  const c = g.clone(); c.applyMatrix4(new T.Matrix4().makeScale(-1, 1, 1)); const ix = c.index;
  if (ix) for (let t = 0; t < ix.count; t += 3) { const a = ix.getX(t + 1); ix.setX(t + 1, ix.getX(t + 2)); ix.setX(t + 2, a); }
  else { const p = c.attributes; for (const k of Object.keys(p)) { const at = p[k] as T.BufferAttribute; for (let t = 0; t < at.count; t += 3) for (let q = 0; q < at.itemSize; q++) { const a = at.array[(t + 1) * at.itemSize + q]; at.array[(t + 1) * at.itemSize + q] = at.array[(t + 2) * at.itemSize + q]; at.array[(t + 2) * at.itemSize + q] = a; } } }
  c.computeVertexNormals(); return c;
}

/** A plate lying on a surface (a pocket, a lapel, a flap, a patch): its rows are [height, left angle, right angle]; the top face stands `off + thick` off the rings and its edge walls
 *  run down to `off`, so the edge has thickness and nothing floats. The plate follows the surface's curve, so it is never a flat panel in front of a round thing. */
export function plate(rings: Ring[], rows: number[][], off: number, thick: number, cols = 6): T.BufferGeometry {
  const R = rows.length, pos: number[] = [], uv: number[] = [], idx: number[] = [], at = (j: number, i: number, o: number) => { const [y, a0, a1] = rows[j], q = surface(rings, y, a0 + (a1 - a0) * i / cols, o); return q.p; };
  const top = (j: number, i: number) => { pos.push(...at(j, i, off + thick).toArray()); uv.push(i / cols, j / (R - 1)); };
  for (let j = 0; j < R; j++) for (let i = 0; i <= cols; i++) top(j, i);
  for (let j = 0; j < R - 1; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + cols + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  { // face outward, whichever way the rows and columns run
    const v = (n: number) => new T.Vector3(pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2]), A = v(idx[0]), B = v(idx[1]), C = v(idx[2]), fn = B.clone().sub(A).cross(C.clone().sub(A));
    const mid = Math.floor(R / 2), sn = surface(rings, rows[mid][0], (rows[mid][1] + rows[mid][2]) / 2).n;
    if (fn.dot(sn) < 0) for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; }
  }
  // edge walls
  const wall = (pts: [number, number][]) => { const base = pos.length / 3; pts.forEach(([j, i], k) => { pos.push(...at(j, i, off + thick).toArray()); uv.push(k / pts.length, 0); pos.push(...at(j, i, off - .001).toArray()); uv.push(k / pts.length, 1); });
    for (let k = 0; k < pts.length - 1; k++) { const a = base + k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } };
  wall(Array.from({ length: cols + 1 }, (_, i) => [0, i] as [number, number])); wall(Array.from({ length: cols + 1 }, (_, i) => [R - 1, i] as [number, number]));
  wall(Array.from({ length: R }, (_, j) => [j, 0] as [number, number])); wall(Array.from({ length: R }, (_, j) => [j, cols] as [number, number]));
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** A point on the surface at height y and sideways position x on the front (or back) face. */
export function onFace(rings: Ring[], y: number, x: number, back = false, off = 0) {
  const r = ringAt(rings, y), n = r.n ?? 2, t = Math.max(-1, Math.min(1, (x - (r.x ?? 0)) / r.w)), a0 = Math.asin(Math.pow(Math.abs(t), n / 2)) * Math.sign(t), a = back ? Math.PI - a0 : a0;
  return { ...surface(rings, y, a, off), a };
}
