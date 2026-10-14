// Measures the street's variety and the casts QA could not tell apart at ~50 px (People XXVII). npx tsx tools/variety-measure.ts [--json]
// (tests/variation.test.ts and tests/cast-reads.test.ts import the measures; the report prints only when this file is run.)
// Variety: seeds 0..19 of each street archetype under the street's cast weights, read the way the cast sheet's seed rows read them (tools/qa-captures.mjs: resolveLook(seed, role,
// { casts: BUILT })). Per archetype: the distinct looks by (build, outfit, palette, hat, hair) and their repeat groups, the same without the build (the review's key), the builds, the
// headwear, and the largest share one outfit+palette takes.
// Silhouettes: the review's representatives (tests/people-rig.ts REPS: the same combos and seeds as the cast sheet's matrix), posed standing by the game's animateLife as the sheet poses
// them, every mesh rasterised solid at 5 mm, front (x, y) and side (z, y), aligned at the feet and on the figure's own axis; IoU = shared cells / cells in either.
import * as T from 'three';
import { pathToFileURL } from 'node:url';
import { resolveLook, CASTS, HAT_HAIR, STORY, type Look } from '../src/world/people/look';
import { BUILT, buildFigure, type Kit } from '../src/world/people/figure';
import { animateLife } from '../src/world/citizen-life';
import { make, REPS } from '../tests/people-rig';
import type { Archetype } from '../src/world/palette';

export const STREET: Archetype[] = ['resident', 'worker', 'merchant', 'courier', 'engineer'];
export const row = (a: Archetype, n = 20, from = 0): Look[] => Array.from({ length: n }, (_, i) => resolveLook(from + i, a, { casts: BUILT }));
export const fullKey = (l: Look) => `${l.family}/${l.outfit}/${l.palette}/${l.hat}/${l.hairStyle}`;
export const reviewKey = (l: Look) => `${l.outfit}/${l.palette}/${l.hat}/${l.hairStyle}`;
const groups = (ls: Look[], key: (l: Look) => string) => { const m = new Map<string, number>(); for (const l of ls) m.set(key(l), (m.get(key(l)) ?? 0) + 1); return [...m].filter(([, n]) => n > 1); };

export function variety(a: Archetype, n = 20, from = 0) {
  const ls = row(a, n, from), share = new Map<string, number>(); for (const l of ls) { const k = `${l.outfit}/${l.palette}`; share.set(k, (share.get(k) ?? 0) + 1); }
  const top = [...share].sort((p, q) => q[1] - p[1])[0];
  return { archetype: a, combos: new Set(ls.map(fullKey)).size, repeats: groups(ls, fullKey), reviewRepeats: groups(ls, reviewKey), builds: [...new Set(ls.map(l => l.family))], hats: [...new Set(ls.map(l => l.hat))],
    outfitPalettes: share.size, top: { combo: top[0], share: top[1] / ls.length } };
}

const CELL = .005, W = 200, H = 400; // a 1 x 2 m grid
function raster(g: T.Object3D, view: 'front' | 'side') {
  const grid = new Uint8Array(W * H), v = [new T.Vector3(), new T.Vector3(), new T.Vector3()]; g.updateMatrixWorld(true);
  let floor = Infinity; g.traverse(o => { if (o instanceof T.Mesh && o.visible && !o.userData.contact) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) floor = Math.min(floor, v[0].fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).y); } });
  g.traverse(o => {
    if (!(o instanceof T.Mesh) || !o.visible || o.userData.contact) return; let hidden = false; o.traverseAncestors(a => { if (!a.visible) hidden = true; }); if (hidden) return;
    const p = o.geometry.attributes.position, ix = o.geometry.index, n = ix ? ix.count : p.count;
    for (let t = 0; t < n; t += 3) {
      const q = v.map((w, k) => { w.fromBufferAttribute(p, ix ? ix.getX(t + k) : t + k).applyMatrix4(o.matrixWorld); return [(view === 'front' ? w.x : w.z) / CELL + W / 2, (w.y - floor) / CELL]; });
      const x0 = Math.max(0, Math.floor(Math.min(q[0][0], q[1][0], q[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(q[0][0], q[1][0], q[2][0]))), y0 = Math.max(0, Math.floor(Math.min(q[0][1], q[1][1], q[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(q[0][1], q[1][1], q[2][1])));
      const ar = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1]); if (Math.abs(ar) < 1e-9) continue;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + .5, py = y + .5, e = (a: number[], b: number[]) => (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]);
        const e0 = e(q[0], q[1]), e1 = e(q[1], q[2]), e2 = e(q[2], q[0]); if ((e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0)) grid[y * W + x] = 1;
      }
    }
  });
  return grid;
}
/** A representative standing as the sheet stands it (`pose=stand`: animateLife's walk at rest, 60 frames at 30 fps). */
export function standing(label: string) {
  const r = REPS.find(x => x[0] === label); if (!r) throw new Error(`no representative ${label}`);
  const n = make(r[1], r[2]), player = new T.Vector3(0, 1.7, 25); for (let i = 0; i <= 60; i++) animateLife(n, 'walk', 1 / 30, i / 30, false, player);
  n.group.traverse(o => { if (o instanceof T.Mesh && o.geometry instanceof T.CircleGeometry) o.userData.contact = true; }); return n.group; // (the contact shadow on the pavement)
}
const iou = (a: Uint8Array, b: Uint8Array) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] & b[k]) i++; if (a[k] | b[k]) u++; } return i / u; };
/** The same two shapes each stretched to one box (the larger height and width), so height and breadth do not count, only the shape: the stricter read, and the one that reproduces the
 *  review's numbers within about .02 from its own images (matrix-09/10: garrison and inspector front .818, side .816; sturdy civilian and stallholder side .859; young mechanic and labourer .819, .833). */
function boxed(a: Uint8Array, b: Uint8Array) {
  const bb = (g: Uint8Array) => { let x0 = W, x1 = -1, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, w: x1 - x0 + 1, h: y1 + 1 }; };
  const A = bb(a), B = bb(b), w = Math.max(A.w, B.w), h = Math.max(A.h, B.h), s = (g: Uint8Array, r: typeof A) => (x: number, y: number) => g[Math.floor((y + .5) * r.h / h) * W + r.x0 + Math.floor((x + .5) * r.w / w)];
  const sa = s(a, A), sb = s(b, B); let i = 0, u = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = sa(x, y), q = sb(x, y); if (p & q) i++; if (p | q) u++; } return i / u;
}
export const PAIRS: [string, string][] = [['garrison soldier', 'inspector'], ['sturdy civilian', 'stallholder'], ['young mechanic', 'labourer']];
export function silhouettes() {
  return PAIRS.map(([a, b]) => { const A = standing(a), B = standing(b), af = raster(A, 'front'), bf = raster(B, 'front'), as = raster(A, 'side'), bs = raster(B, 'side');
    return { a, b, front: iou(af, bf), side: iou(as, bs), boxFront: boxed(af, bf), boxSide: boxed(as, bs) }; });
}

/** The budget: triangles per figure over seeds 0..n-1 of every archetype, and the materials the tables can ever ask of the crowd (each distinct material is one BatchedMesh, one draw call:
 *  crowd-batch.ts): every cast in every family, outfit, palette and hat, with all its asymmetries, and the story looks. The kit caches materials the way citizens.ts does (cloth by early and
 *  late colour, plain by colour, late colour and kind). */
export function budget(n = 60) {
  const mats = new Map<string, T.Material>(), get = (k: string) => { let m = mats.get(k); if (!m) { m = new T.MeshBasicMaterial(); mats.set(k, m); } return m; };
  const kit: Kit = { cloth: (c, l) => get(`c${c}${l ?? c}`), plain: (c, l, kind) => get(`p${c}${l ?? c}${kind ?? ''}`), skin: [get('s0'), get('s1'), get('s2')], face: t => get(`f${t}`), bake: g => g, contact: new T.Mesh(new T.CircleGeometry(.28, 8), get('contact')) };
  const tri = (l: Look) => { let t = 0; buildFigure(l, {}, kit).group.traverse(o => { if (o instanceof T.Mesh) { const g = o.geometry as T.BufferGeometry; t += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return t; };
  let tris = 0, figs = 0;
  for (const a of [...STREET, 'guard', 'ordinal'] as Archetype[]) for (let s = 0; s < n; s++) { tris += tri(resolveLook(s, a, { casts: BUILT })); figs++; }
  for (const id of BUILT) { const c = CASTS[id], base = resolveLook(0, c.archetype, { cast: id });
    for (const family of c.families) for (const o of c.outfits) for (const palette of Object.keys(o.palettes)) for (const hat of c.hats) {
      const hairStyle = c.hair.find(h => HAT_HAIR[hat].includes(h)) ?? base.hairStyle; tri({ ...base, family, outfit: o.id, palette, hat, hairStyle, asymmetries: [...c.asymmetries] }); } }
  for (const l of Object.values(STORY)) tri(l);
  return { figures: figs, trianglesPerFigure: Math.round(tris / figs), materials: mats.size, keys: [...mats.keys()].sort() };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const v = STREET.map(a => variety(a)), s = silhouettes(), b = budget();
  if (process.argv.includes('--json')) console.log(JSON.stringify({ variety: v, silhouettes: s, budget: b }, null, 1));
  else {
    for (const r of v) console.log(`${r.archetype.padEnd(9)} combos ${r.combos}/20  repeat groups ${r.repeats.length} (review key ${r.reviewRepeats.length})  builds ${r.builds.join(',')}  hats ${r.hats.join(',')}  outfit+palettes ${r.outfitPalettes}  top ${r.top.combo} ${(100 * r.top.share).toFixed(0)}%` +
      (r.repeats.length ? `\n          repeats: ${r.repeats.map(([k, n]) => `${k} x${n}`).join('; ')}` : ''));
    console.log(`total repeat groups: ${v.reduce((t, r) => t + r.repeats.length, 0)} (review key ${v.reduce((t, r) => t + r.reviewRepeats.length, 0)})`);
    console.log(`budget: ${b.figures} figures, ${b.trianglesPerFigure} triangles per figure, ${b.materials} crowd materials`);
    for (const p of s) console.log(`IoU ${p.a} / ${p.b}: same scale front ${p.front.toFixed(3)} side ${p.side.toFixed(3)} | one box front ${p.boxFront.toFixed(3)} side ${p.boxSide.toFixed(3)}`);
  }
}
