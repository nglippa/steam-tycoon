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

test('features keep their contrast on every skin at small sizes (People XXVI): the darker the skin, the more its painted features are inked up once they are too small to draw crisply', async () => {
  // The atlas is painted on a canvas (no canvas in node), so the shader's ink step is checked as a model: an eye averaged into a pixel at seed-row scale (a mid grey, a third opaque, from
  // a 6-11 unit lash and a white over a 512-unit tile), laid on each skin by FACE_PAINT's rule with its FACE_INK. On every darker skin its L* step below the skin is at least the lightest skin's and at least
  // half again what it is without the ink (measured on the cast sheet with PIL: courier seeds 0, 8, 16 went from a dark-feature luma delta of 28-33 to 46-53; screenshots/presentation/qa/people-xxvi).
  const { FACE_INK } = await import('../src/world/people/head.ts'), T = await import('three');
  assert.equal(FACE_INK.length, palette.skin.length); assert.equal(FACE_INK[0], 0);
  for (let t = 1; t < FACE_INK.length; t++) assert.ok(FACE_INK[t] > FACE_INK[t - 1], `tone ${t}: inked no more than the lighter skin`);
  assert.match(FACE_PAINT_HEAD, /uniform float uInk/); assert.match(FACE_PAINT, /uInk/);
  const Lstar = (c: number[]) => { const Y = c.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); return Y > 216 / 24389 ? 116 * Math.cbrt(Y) - 16 : Y * 24389 / 27; };
  const step = (t: number, ink = FACE_INK[t]) => { const s = new T.Color(palette.skin[t]), skin = [s.r, s.g, s.b], f = .42 ** (1 + 1.6 * ink), a = Math.min(1, .33 * (1 + 2 * ink)); return Lstar(skin) - Lstar(skin.map(v => v + (f - v) * a)); };
  const light = step(0);
  for (let t = 1; t < FACE_INK.length; t++) {
    assert.ok(step(t) >= light, `tone ${t}: an averaged eye stands ${step(t).toFixed(1)} L* under the skin against ${light.toFixed(1)} on the lightest`);
    assert.ok(step(t) >= 1.5 * step(t, 0), `tone ${t}: the ink lifts an averaged eye's step only from ${step(t, 0).toFixed(1)} to ${step(t).toFixed(1)} L*`); }
});
