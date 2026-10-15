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
    assert.ok(eye > .7 && lit < 1.5 && nose > .75, `tone ${t}: close up the shapes stay modelling, not paint`);
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
  assert.equal(FACE_INK.length, palette.skin.length); assert.ok(FACE_INK[0] <= .25, 'the lightest skin is inked little: its features already read');
  for (let t = 1; t < FACE_INK.length; t++) assert.ok(FACE_INK[t] > FACE_INK[t - 1], `tone ${t}: inked no more than the lighter skin`);
  assert.match(FACE_PAINT_HEAD, /uniform float uInk/); assert.match(FACE_PAINT, /uInk/);
  const Lstar = (c: number[]) => { const Y = c.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); return Y > 216 / 24389 ? 116 * Math.cbrt(Y) - 16 : Y * 24389 / 27; };
  const step = (t: number, ink = FACE_INK[t]) => { const s = new T.Color(palette.skin[t]), skin = [s.r, s.g, s.b], f = .42 ** (1 + 1.6 * ink), a = Math.min(1, .33 * (1 + 2 * Math.min(ink, 1))); return Lstar(skin) - Lstar(skin.map(v => v + (f - v) * a)); };
  const light = step(0);
  for (let t = 1; t < FACE_INK.length; t++) {
    assert.ok(step(t) >= light, `tone ${t}: an averaged eye stands ${step(t).toFixed(1)} L* under the skin against ${light.toFixed(1)} on the lightest`);
    assert.ok(step(t) >= 1.5 * step(t, 0), `tone ${t}: the ink lifts an averaged eye's step only from ${step(t, 0).toFixed(1)} to ${step(t).toFixed(1)} L*`); }
});

test('the face is deeper on the light skin and the dark skin keeps a darker lip and a nose-side shade (People XXIX-b)', async () => {
  const { FACE_INK, FACE_MOUTH, FACE_LIFT } = await import('../src/world/people/head.ts');
  assert.ok(FACE_VALUE[0][0] <= .88, 'the lightest skin carries an eye band deep enough to read');
  assert.equal(FACE_INK.length, 3); for (let t = 1; t < 3; t++) assert.ok(FACE_INK[t] > FACE_INK[t - 1]);
  assert.equal(FACE_MOUTH.length, palette.skin.length); assert.equal(FACE_MOUTH[0], 1);
  for (let t = 1; t < FACE_MOUTH.length; t++) assert.ok(FACE_MOUTH[t] < FACE_MOUTH[t - 1], `tone ${t}: the lips are deeper than on the lighter skin`);
  assert.equal(FACE_LIFT.length, palette.skin.length); assert.deepEqual([...FACE_LIFT[0]], [1, 1, 1]);
  for (let t = 1; t < FACE_LIFT.length; t++) for (let c = 0; c < 3; c++) assert.ok(FACE_LIFT[t][c] >= FACE_LIFT[t - 1][c], `tone ${t}: the face is lifted no less than on the lighter skin`);
  assert.ok(FACE_LIFT[2][0] > FACE_LIFT[2][1] && FACE_LIFT[2][1] > FACE_LIFT[2][2], 'the lift is warm, not grey');
  assert.match(FACE_PAINT, /g_ns/); assert.match(FACE_PAINT_HEAD, /uniform float uInk,uMouth/);
  // the darkest skin's averaged eye stands well under it: at least 12 L* (was 6 at ink 1; the model of the test above, with the dark skin's own ink)
  const T = await import('three'), Lstar = (c: number[]) => { const Y = c.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0); return Y > 216 / 24389 ? 116 * Math.cbrt(Y) - 16 : Y * 24389 / 27; };
  const s = new T.Color(palette.skin[2]), skin = [s.r, s.g, s.b], f = .42 ** (1 + 1.6 * FACE_INK[2]), a = Math.min(1, .33 * (1 + 2 * Math.min(FACE_INK[2], 1)));
  assert.ok(Lstar(skin) - Lstar(skin.map(v => v + (f - v) * a)) >= 12, 'the darkest skin\'s averaged eye stands at least 12 L* under it (6 at ink 1)');
});

test('calm faces are spread over the crowd by seed, and the Ordinance stays cold (People XXIX-b)', async () => {
  const { spreadExpression, CALM_FACES } = await import('../src/world/citizen-life.ts');
  // (the seven calm faces are seven different eye/brow/mouth triples of citizens.ts LOOK: neutral 0,0,0 relaxed 0,0,1 focused 1,0,0 curious 9,5,0 smiling 14,6,2 tired 5,7,0 guarded 6,0,4; citizens.ts needs a DOM, so the names stand for them)
  assert.equal(spreadExpression(5, 'courier'), spreadExpression(5, 'courier'), 'pure');
  for (let s = 0; s < 60; s++) { assert.equal(spreadExpression(s, 'guard'), 'cold'); assert.equal(spreadExpression(s, 'ordinal'), 'cold'); }
  const dark = [0, 8, 16, 23, 26, 33, 1, 3, 10, 11, 12, 15, 21, 22, 25, 27, 29, 2, 4, 5, 6, 7, 9, 13, 14, 17, 18, 19]; // 28 seeds
  const looks = new Set(dark.map(s => spreadExpression(s, 'courier')));
  assert.ok(looks.size >= 4, `${looks.size} distinct faces over 28 dark-skin seeds`);
  const kinds = new Set(Array.from({ length: 200 }, (_, s) => spreadExpression(s, 'resident'))); for (const k of CALM_FACES) assert.ok(kinds.has(k), `${k} is drawn`);
  let neutral = 0; for (let s = 0; s < 400; s++) if (spreadExpression(s, 'resident') === 'neutral') neutral++; assert.ok(neutral / 400 < .3, 'no single face takes more than 30%');
});

test('every face type has a brow that reads, and no hat hides the brow band (People XXIX-b)', async () => {
  const { readFileSync } = await import('node:fs'), src = readFileSync(new URL('../src/world/citizens.ts', import.meta.url), 'utf8'), block = src.slice(src.indexOf('export const faceTypesNext'), src.indexOf('];', src.indexOf('export const faceTypesNext')));
  const thick = [...block.matchAll(/brow: \[([\d.]+),/g)].map(m => Number(m[1])); assert.equal(thick.length, 8);
  for (const [r, t] of thick.entries()) assert.ok(t >= ([2, 4, 6].includes(r) ? 4 : 6), `face type ${r}: brow ${t} thick (the light rows' thin brows, 3, left the young mechanic and the inspector blank)`);
  // the hat's peak or brim over the eyes: its lowest vertex in front of the eyes (x 3-6 cm either side of the midline) stands at least 1.5 cm over the brow line
  const T = await import('three'), { resolveLook, CASTS } = await import('../src/world/people/look.ts'), { BUILT } = await import('../src/world/people/figure.ts'), { hatOf } = await import('../src/world/people/hat.ts'), { landmarks } = await import('../src/world/people/headform.ts');
  const H = .285, v = new T.Vector3(); let n = 0;
  for (const id of BUILT) for (const hat of CASTS[id].hats) {
    if (hat === 'none' || !['helm', 'flatCap', 'softCap', 'kepi', 'bowler', 'elderHat'].includes(hat)) continue;
    const base = resolveLook(3, CASTS[id].archetype, { cast: id, casts: BUILT }), look = { ...base, hat }, L = landmarks(H, look.headShape as never); let low = 9;
    for (const g of hatOf(look, H).cloth) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (Math.abs(v.x) > .03 && Math.abs(v.x) < .06 && v.z > L.z0 + L.R * .5) low = Math.min(low, v.y); } }
    assert.ok(low - L.brow >= .015, `${id} in a ${hat}: the peak's lowest point in front of the eyes is ${(100 * (low - L.brow)).toFixed(1)} cm over the brow line`); n++;
  }
  assert.ok(n >= 6, 'a handful of hats were checked');
});
