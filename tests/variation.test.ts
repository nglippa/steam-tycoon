import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { ARCHETYPE_CASTS, CASTS, resolveLook, type Look } from '../src/world/people/look.ts';
import { buildFigure, BUILT } from '../src/world/people/figure.ts';
import { kit } from './people-rig.ts';
import { variety } from '../tools/variety-measure.ts';
import type { Archetype } from '../src/world/palette.ts';

/** Book 11, "Variation minimums" (People XX): curated options, measured the way QA II measured them (looks.json: seeds 0..19 of each street archetype under the street's cast weights). */
const STREET: Archetype[] = ['resident', 'worker', 'merchant', 'courier', 'engineer'];
const row = (a: Archetype, n = 20, from = 0) => Array.from({ length: n }, (_, i) => resolveLook(from + i, a, { casts: BUILT }));
const face = (l: Look) => `${l.skin}/${l.headShape}/${l.faceType}`;

test('at least 40 distinct faces in every hundred figures', () => {
  for (const from of [0, 20, 100, 500]) {
    const all = STREET.flatMap(a => row(a, 20, from)), n = new Set(all.map(face)).size;
    assert.ok(n >= 40, `seeds ${from}..${from + 19}: ${n} distinct faces in 100`);
  }
});

test('at most 10 of 95 neighbouring pairs share an outfit and palette; two of a cast side by side never do', () => {
  let rep = 0; for (const a of STREET) { const r = row(a); for (let i = 1; i < r.length; i++) if (r[i].outfit === r[i - 1].outfit && r[i].palette === r[i - 1].palette) rep++; }
  assert.ok(rep <= 10, `${rep} of 95 neighbours repeat`);
  for (const a of Object.keys(ARCHETYPE_CASTS) as Archetype[]) for (const [cast] of ARCHETYPE_CASTS[a]) if (CASTS[cast].outfits.flatMap(o => Object.keys(o.palettes)).length > 1) for (let s = 1; s < 400; s++) { // (the Ordinance wears one uniform by design)
    const p = resolveLook(s - 1, a, { cast }), q = resolveLook(s, a, { cast });
    assert.ok(p.outfit !== q.outfit || p.palette !== q.palette, `${cast}: seeds ${s - 1} and ${s} wear the same ${q.outfit}/${q.palette}`);
  }
});

test('every street archetype has at least three outfits, and every street outfit at least three palettes', () => {
  for (const a of STREET) {
    const casts = ARCHETYPE_CASTS[a].map(([c]) => CASTS[c]), outfits = casts.flatMap(c => c.outfits);
    assert.ok(outfits.length >= 3, `${a}: ${outfits.length} outfits`);
    for (const o of outfits) assert.ok(Object.keys(o.palettes).length >= 3, `${o.id}: ${Object.keys(o.palettes).length} palettes`);
  }
});

test('the face is not a function of the seed alone: one seed is a different face in different casts', () => {
  let same = 0; for (let s = 0; s < 200; s++) if (new Set(STREET.map(a => face(resolveLook(s, a, { casts: BUILT })))).size === 1) same++;
  assert.equal(same, 0, `${same} seeds give one face in all five archetypes`);
  let pairs = 0, hits = 0; for (let s = 0; s < 300; s++) { const a = resolveLook(s, 'merchant', { cast: 'stallholder' }), b = resolveLook(s, 'merchant', { cast: 'shopMerchant' }); pairs++; if (face(a) === face(b)) hits++; }
  assert.ok(hits / pairs < .15, `the same seed is the same face in two casts ${(100 * hits / pairs).toFixed(0)} % of the time`);
});

test('a new outfit is a different garment, not a recolour', () => {
  const tris = (l: Look) => { let n = 0; buildFigure(l, { solo: true }, kit()).group.traverse(o => { if (o instanceof T.Mesh) { const g = o.geometry as T.BufferGeometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } }); return n; };
  for (const cast of ['courier', 'stallholder', 'olderMechanic'] as const) {
    const base = resolveLook(7, CASTS[cast].archetype, { cast, family: CASTS[cast].families[0], frame: CASTS[cast].frames[0] }), counts = CASTS[cast].outfits.map(o => tris({ ...base, outfit: o.id, palette: Object.keys(o.palettes)[0] }));
    assert.equal(new Set(counts).size, counts.length, `${cast}: outfits ${CASTS[cast].outfits.map(o => o.id).join(', ')} build ${counts.join(', ')} triangles`);
  }
});

/** People XXVII (the blind review's Q10/Q11: 17 groups in the hundred shared outfit, palette, hat and hair; all twenty couriers slim in one soft cap). Outfit, palette and hat are dealt,
 *  not drawn (Book 11, "Dealt, not drawn"): measured on the QA rows (seeds 0..19) and on other runs of twenty, aligned to twenty and not. */
const RUNS = [0, 7, 20, 33, 100, 250, 500, 1000];
test('in a run of twenty, no two of an archetype share build, outfit, palette, hat and hair', () => {
  for (const from of RUNS) for (const a of STREET) { const v = variety(a, 20, from); assert.equal(v.repeats.length, 0, `seeds ${from}..${from + 19} ${a}: ${v.repeats.map(([k, n]) => `${k} x${n}`).join('; ')}`); }
});
test('no outfit in one palette dresses more than 15 % of an archetype in a run of twenty', () => {
  for (const from of RUNS) for (const a of STREET) { const v = variety(a, 20, from); assert.ok(v.top.share <= .15, `seeds ${from}..${from + 19} ${a}: ${v.top.combo} is ${(100 * v.top.share).toFixed(0)} %`); }
});
test('every street archetype shows two builds and three headwear, bare heads among them, in the QA row', () => {
  for (const a of STREET) { const v = variety(a); assert.ok(v.builds.length >= 2, `${a}: builds ${v.builds.join(', ')}`); assert.ok(v.hats.length >= 3 && v.hats.includes('none'), `${a}: headwear ${v.hats.join(', ')}`); }
});
