// Measures hair and hats against the skull (Book 7 and 13: "the hair's outline is the skull's outline" is a fail). npx tsx tools/hair-measure.ts [--json]
// (tests/hair.test.ts imports the measure; the report prints only when this file is run.)
// For each style (bare) and each hat (on its first fitting hair), the front (x, y) and side (z, y) silhouettes are rasterised at 1 mm and compared with the bare skull's along rays
// from the ball's centre, over the upper head (within 135 degrees of straight up). Reported per view, in cm: the largest and mean outward offset of the outline from the skull's, its
// spread (sd), the share of rays where the skull's own outline shows (offset under 3 mm), and the width and height of the whole silhouette. A helmet is a high mean, a low sd and no
// exposed rays: the skull's outline pushed out evenly. Then, per view, the two styles whose outlines are most alike (mean difference along the rays).
import * as T from 'three';
import { pathToFileURL } from 'node:url';
import { skullRings } from '../src/world/people/head';
import { hairOf } from '../src/world/people/hair';
import { hatOf } from '../src/world/people/hat';
import { HAT_HAIR, type HairStyle, type Hat, type Look } from '../src/world/people/look';
import { landmarks } from '../src/world/people/headform';
import { loft } from '../src/world/people/loft';

const H = .285, CELL = .001, N = 700;
export const STYLES: HairStyle[] = ['shortCrop', 'sidePart', 'sweptBack', 'tousled', 'bob', 'lowBun', 'highKnot', 'ponytail', 'longTied', 'balding'];
const HATS = (Object.keys(HAT_HAIR) as Hat[]).filter(h => h !== 'none');
export const base: Look = { cast: 'rowCoat', family: 'standard', frame: 'broad', stature: 1, skin: 1, headShape: 'oval', faceType: 0, hairStyle: 'shortCrop', hairColour: 'umber', hat: 'none', facial: 'none', outfit: 'rowCoat.open', palette: 'ash', asymmetries: ['scarfTail'] };
const L = landmarks(H, 'oval');

export type View = 'front' | 'side';
function raster(geos: T.BufferGeometry[], view: View) {
  const g = new Uint8Array(N * N), cx = view === 'front' ? 0 : L.z0, cy = L.ballY; // the grid is centred on the ball's centre
  const P = (x: number, y: number) => [(x - cx) / CELL + N / 2, (y - cy) / CELL + N / 2];
  for (const geo of geos) {
    const p = geo.attributes.position, ix = geo.index, n = ix ? ix.count : p.count;
    for (let t = 0; t < n; t += 3) {
      const v = [0, 1, 2].map(k => { const i = ix ? ix.getX(t + k) : t + k; return P(view === 'front' ? p.getX(i) : p.getZ(i), p.getY(i)); });
      const x0 = Math.max(0, Math.floor(Math.min(...v.map(q => q[0])))), x1 = Math.min(N - 1, Math.ceil(Math.max(...v.map(q => q[0])))), y0 = Math.max(0, Math.floor(Math.min(...v.map(q => q[1])))), y1 = Math.min(N - 1, Math.ceil(Math.max(...v.map(q => q[1]))));
      const [a, b, c] = v, d = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); if (Math.abs(d) < 1e-9) continue;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + .5, py = y + .5, w1 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / d, w2 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / d, w3 = 1 - w1 - w2;
        if (w1 >= -.02 && w2 >= -.02 && w3 >= -.02) g[y * N + x] = 1;
      }
    }
  }
  return g;
}
const ANG = Array.from({ length: 91 }, (_, i) => -135 + i * 3); // degrees from straight up; positive is the figure's left (front view) or forward (side view)
function rays(g: Uint8Array, view: View) {
  return ANG.map(deg => { const a = deg * Math.PI / 180, dx = Math.sin(a) * (view === 'front' ? -1 : 1), dy = Math.cos(a); let far = 0;
    for (let r = 0; r < N / 2; r += .5) { const x = Math.round(N / 2 + dx * r), y = Math.round(N / 2 + dy * r); if (x < 0 || y < 0 || x >= N || y >= N) break; if (g[y * N + x]) far = r; } return far * CELL; });
}
function extent(g: Uint8Array) { let x0 = N, x1 = 0, y0 = N, y1 = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y * N + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { w: (x1 - x0 + 1) * CELL, h: (y1 - y0 + 1) * CELL }; }
const skull = [loft(skullRings('oval', H), { seg: 26, capEnd: 'flat' })];
const skullRays = { front: rays(raster(skull, 'front'), 'front'), side: rays(raster(skull, 'side'), 'side') };
const cm = (v: number) => Math.round(v * 1000) / 10;
export function stats(geos: T.BufferGeometry[], view: View) {
  const g = raster([...skull, ...geos], view), r = rays(g, view), off = r.map((v, i) => Math.max(0, v - skullRays[view][i])), mean = off.reduce((a, b) => a + b, 0) / off.length;
  const sd = Math.sqrt(off.reduce((a, b) => a + (b - mean) ** 2, 0) / off.length), e = extent(g);
  return { max: cm(Math.max(...off)), mean: cm(mean), sd: cm(sd), skullShows: Math.round(off.filter(v => v < .003).length / off.length * 100), w: cm(e.w), h: cm(e.h), r };
}
export const hairGeos = (style: HairStyle, hat: Hat = 'none') => { const look = { ...base, hairStyle: style, hat }, o = hairOf(look, H, hat !== 'none'); return [...o.hair, ...o.under, ...o.swing]; };
export const hatGeos = (hat: Hat) => { const o = hatOf({ ...base, hat }, H); return [...o.cloth, ...o.trim, ...o.metal]; };
const tris = (gs: T.BufferGeometry[]) => gs.reduce((a, g) => a + (g.index ? g.index.count : g.attributes.position.count) / 3, 0);

export const alike = (a: number[], b: number[]) => a.reduce((s, v, k) => s + Math.abs(v - b[k]), 0) / a.length;
export function report() {
  const rows: Record<string, unknown>[] = [], sig: Record<View, Record<string, number[]>> = { front: {}, side: {} };
  const line = (name: string, geos: T.BufferGeometry[]) => {
    const f = stats(geos, 'front'), s = stats(geos, 'side'); sig.front[name] = f.r; sig.side[name] = s.r;
    rows.push({ name, tris: tris(geos), front: `max ${f.max} mean ${f.mean} sd ${f.sd} skull ${f.skullShows}% | ${f.w} x ${f.h}`, side: `max ${s.max} mean ${s.mean} sd ${s.sd} skull ${s.skullShows}% | ${s.w} x ${s.h}` });
  };
  line('(skull)', []);
  for (const s of STYLES) line(s, hairGeos(s));
  for (const h of HATS) { const hair = HAT_HAIR[h][0]; line(`${h}+${hair}`, [...hatGeos(h), ...hairGeos(hair, h)]); }
  const closest = (view: View, names: string[]) => { let best = Infinity, pair = ''; for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) { const a = sig[view][names[i]], b = sig[view][names[j]], d = a.reduce((s, v, k) => s + Math.abs(v - b[k]), 0) / a.length; if (d < best) { best = d; pair = `${names[i]} ~ ${names[j]}`; } } return `${pair} (${cm(best)} cm)`; };
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else { console.log('offsets of the outline from the skull outline, cm; skull% = share of the upper outline where the skull itself shows; w x h = silhouette, cm');
    for (const r of rows) console.log(`${String(r.name).padEnd(20)} ${String(r.tris).padStart(5)} tris  FRONT ${r.front}   SIDE ${r.side}`);
    console.log(`most alike styles: front ${closest('front', STYLES)}; side ${closest('side', STYLES)}`); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) report();
