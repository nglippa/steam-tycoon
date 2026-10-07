import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACE_VALUE, FACE_PAINT, FACE_PAINT_HEAD } from '../src/world/people/head.ts';
import { palette } from '../src/world/palette.ts';

/** Book 6, "Value per skin tone": the skin carries the face's big value shapes, deeper the darker the skin, so a face reads at the game's distance on every tone. */
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };

test('one value row per skin tone, deeper as the skin darkens', () => {
  assert.equal(FACE_VALUE.length, palette.skin.length);
  for (let t = 1; t < FACE_VALUE.length; t++) {
    assert.ok(lum(palette.skin[t]) < lum(palette.skin[t - 1]), 'skin tones run light to dark');
    assert.ok(FACE_VALUE[t][0] < FACE_VALUE[t - 1][0], `tone ${t}: the eye band is deeper than on the lighter skin`);
    assert.ok(FACE_VALUE[t][1] > FACE_VALUE[t - 1][1], `tone ${t}: the lighter planes are lighter than on the lighter skin`);
    assert.ok(FACE_VALUE[t][2] < FACE_VALUE[t - 1][2], `tone ${t}: the shade under the nose is deeper than on the lighter skin`);
  }
});

test('the mid and dark skins carry a readable step between the lighter planes and the eye band, without caricature', () => {
  for (let t = 0; t < FACE_VALUE.length; t++) {
    const [eye, lit, nose] = FACE_VALUE[t], step = lit / eye; // close up; the shader doubles the depth of each shape (x2.4) once the face is a few pixels wide
    assert.ok(eye > .7 && lit < 1.35 && nose > .75, `tone ${t}: close up the shapes stay modelling, not paint`);
    if (t > 0) assert.ok(step >= 1.35, `tone ${t}: forehead and cheek vs eye band ${step.toFixed(2)} >= 1.35`);
  }
});

test('the paint is distance-aware and lands at least a pixel wide', () => {
  assert.match(FACE_PAINT_HEAD, /uniform vec3 uPaint/);
  assert.match(FACE_PAINT_HEAD, /max\(sx,w\*/); assert.match(FACE_PAINT, /fwidth/);
});
