import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { CASTS, paletteOf, resolveLook, type CastId, type Look } from '../src/world/people/look.ts';
import { buildFigure } from '../src/world/people/figure.ts';
import { kit } from './people-rig.ts';

/** People XX: the casts QA found alike at ~50 px each carry their own value or silhouette cue (Book 4, "Telling the dark coats apart"). */
const lum = (hex: string) => { const c = new T.Color(hex); return .2126 * c.r + .7152 * c.g + .0722 * c.b; }; // linear
const look = (cast: CastId, family: Look['family'], frame: Look['frame'], seed = 3) => resolveLook(seed, CASTS[cast].archetype, { cast, family, frame });

test('the garrison soldier wears a light crossbelt and belt on the dark greatcoat', () => {
  const p = paletteOf(look('garrison', 'sturdy', 'broad'));
  assert.ok(lum(p.crossbelt) > 4 * lum(p.greatcoat), `crossbelt ${p.crossbelt} vs greatcoat ${p.greatcoat}`);
});

test('the older mechanic never wears a coat as dark as the Ordinance', () => {
  const ord = lum(paletteOf(look('inspector', 'standard', 'broad')).coat);
  for (const o of CASTS.olderMechanic.outfits) for (const [id, sw] of Object.entries(o.palettes)) {
    const l = { ...look('olderMechanic', 'sturdy', 'broad'), outfit: o.id, palette: id }, top = paletteOf(l).shopCoat; void sw;
    assert.ok(lum(top) > 3 * ord, `${o.id}/${id}: ${top} is a dark coat`);
  }
});

test('the sturdy stallholder is sturdier in outline than the standard one, not the same outline scaled', () => {
  const width = (l: Look, y0: number, y1: number) => { const g = buildFigure(l, { solo: true }, kit()).group; g.updateMatrixWorld(true); let w = 0; const v = new T.Vector3();
    g.traverse(o => { if (o instanceof T.Mesh) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y > y0 && v.y < y1) w = Math.max(w, Math.abs(v.x)); } } }); return 2 * w; };
  const sd = { ...look('stallholder', 'standard', 'narrow'), stature: 1 }, su = { ...look('stallholder', 'sturdy', 'broad'), stature: 1 };
  const hemRatio = width(su, .15, .35) / width(sd, .15, .35); // (the two skirts were cut to one hem: the same outline under a wider top)
  assert.ok(hemRatio >= 1.15, `the sturdy hem is ${hemRatio.toFixed(2)}x the standard`);
});

test('at 50 px the three pairs the review found alike keep apart: same-scale silhouette IoU under .78, front and side', async () => {
  // People XXVIII: the young mechanic's hip-length jacket left only the cap's peak to tell him from the labourer from the side (.838); he now wears a skirted jacket with a tail, and the
  // Ordinance's coats differ in length and in the shoulder. Measured as tools/variety-measure.ts does (the sheet's standing pose, the silhouette rasterised front and side).
  const { silhouettes } = await import('../tools/variety-measure.ts');
  for (const p of silhouettes()) { assert.ok(p.front < .78, `${p.a} / ${p.b}: front ${p.front.toFixed(3)}`); assert.ok(p.side < .78, `${p.a} / ${p.b}: side ${p.side.toFixed(3)}`); }
});

test('the sleeve cap is set in for men and the Ordinance and gathered only on the women\'s blouses: its top above the shoulder pivot', async () => {
  // People XXVIII: every upper sleeve ended in a dome the whole radius of the shoulder (6-7 cm above the pivot, 2-3 cm over the trapezius), the "bump" on nine of eleven. A set-in cap (SET_CAP) rises
  // 2-4 cm; the puffed cap stays on the rowSkirt and stallholder blouses and the bonnet lady's frock.
  const { make, REPS } = await import('./people-rig.ts');
  const capTop = (combo: string, seed: number) => { const n = make(combo, seed), v = new T.Vector3(); let top = -9; const sleeve = n.arms[0].children.find(o => o instanceof T.Mesh) as T.Mesh; // (the sleeve is the first mesh; boards and bands come after)
    const pa = sleeve.geometry.attributes.position; for (let i = 0; i < pa.count; i++) top = Math.max(top, v.fromBufferAttribute(pa, i).applyMatrix4(sleeve.matrix).y); return top; };
  const puffed = ['rowSkirt.slim.narrow', 'stallholder.sturdy.broad', 'stallholder.standard.narrow'];
  for (const [label, combo, seed] of REPS) { const h = capTop(combo, seed);
    if (puffed.includes(combo)) assert.ok(h >= .06, `${label}: the blouse's cap is ${(h * 100).toFixed(1)} cm above the pivot`); else assert.ok(h <= .045, `${label}: the cap is ${(h * 100).toFixed(1)} cm above the pivot`); }
});
