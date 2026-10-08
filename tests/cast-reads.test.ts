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
