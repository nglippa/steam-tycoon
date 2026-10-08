import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { ARCHETYPE_CASTS, CASTS, resolveLook, type Look } from '../src/world/people/look.ts';
import { buildFigure, BUILT } from '../src/world/people/figure.ts';
import { kit } from './people-rig.ts';
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
