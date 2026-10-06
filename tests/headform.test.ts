import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANIME, HEAD_SHAPES, landmarks, skullTable, type Shape } from '../src/world/people/headform.ts';

/** The head formula (skill figure-construction ch07, restrained anime): every landmark as a fraction of H, from the derivation the head is built from. */
const SHAPES = Object.keys(HEAD_SHAPES) as Shape[], H = .285;

test('the ball and the side plane come from one number', () => {
  for (const s of SHAPES) { const L = landmarks(H, s);
    assert.ok(Math.abs(L.t - H / 3.5) < 1e-9 && Math.abs(L.R - 1.5 * L.t) < 1e-9 && Math.abs(L.sideR - L.t) < 1e-9);
    assert.ok(Math.abs(L.ballY - 2 * L.t) < 1e-9, 'the ball is centred on the Loomis brow line (two thirds up)');
    assert.ok(Math.abs(L.ballY + L.R - H) < 1e-9, 'the ball reaches the crown'); }
});

test('landmarks sit in the restrained-anime ranges', () => {
  for (const s of SHAPES) { const L = landmarks(H, s), f = (v: number) => v / H;
    assert.ok(f(L.width) >= .69 && f(L.width) <= .76, `${s} width ${f(L.width)}`);
    assert.ok(f(L.depth) >= .84 && f(L.depth) <= .88 && L.depth > L.width * 1.1, `${s}: the head is deeper than it is wide`);
    assert.ok(f(L.eye) >= .43 && f(L.eye) <= .46, `${s} eye ${f(L.eye)}`);
    assert.ok(f(L.brow) >= .52 && f(L.brow) <= .55);
    assert.ok(f(L.noseTip) >= .25 && f(L.noseTip) <= .29, `${s} nose tip ${f(L.noseTip)}`);
    assert.ok(f(L.lip) >= .12 && f(L.lip) <= .15, `${s} lip ${f(L.lip)}`);
    assert.ok(L.jawW / L.width >= .64 && L.jawW / L.width <= .8, `${s} jaw ratio`); assert.ok(L.chinW / L.width >= .15 && L.chinW / L.width <= .26, `${s} chin ratio`);
    assert.ok(f(L.jawY) >= .14 && f(L.jawY) <= .19);
    assert.ok(L.earZ < L.z0, 'the ear is behind the depth midline'); assert.ok(L.earTop <= L.brow + 1e-9 && L.earBottom <= L.noseBase + 1e-9);
    assert.ok(Math.abs(f(L.hairline) - 3 / 3.5) < 1e-3, 'hairline at the third third'); }
});

test('the derived skull rows realise those landmarks', () => {
  for (const s of SHAPES) { const L = landmarks(H, s), t = skullTable(H, s);
    const zf = Math.max(...t.map(r => r[2])), zb = Math.min(...t.map(r => r[3])), wmax = Math.max(...t.map(r => r[1] * 2));
    assert.ok(Math.abs((zf - zb) / H - .857) < .02, `${s} depth ${(zf - zb) / H}`); assert.ok(Math.abs(wmax - L.width) < .003, `${s} width`);
    assert.equal(t[0][0], 0); assert.ok(Math.abs(t[t.length - 1][0] - H) < 1e-9);
    const at = (y: number) => { const i = t.findIndex(r => r[0] >= y); const a = t[i - 1], b = t[i], u = (y - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; };
    assert.ok(Math.abs(at(L.jawY) * 2 / L.width - HEAD_SHAPES[s].jaw) < .02, `${s} jaw corner width`);
    for (let i = 1; i < t.length; i++) assert.ok(t[i][0] > t[i - 1][0], 'rows rise'); }
  assert.ok(ANIME.depth > .84 && ANIME.depth < .88);
});

test('the four shapes differ only in their jaw parameters: same ball, same depth, same eye line', () => {
  const a = landmarks(H, 'oval'); for (const s of SHAPES) { const L = landmarks(H, s); assert.equal(L.R, a.R); assert.equal(L.depth, a.depth); assert.equal(L.eye, a.eye); }
  assert.ok(HEAD_SHAPES.square.jaw > HEAD_SHAPES.oval.jaw && HEAD_SHAPES.oval.jaw > HEAD_SHAPES.heart.jaw);
  assert.ok(HEAD_SHAPES.long.lower > HEAD_SHAPES.oval.lower && HEAD_SHAPES.heart.lower < HEAD_SHAPES.oval.lower);
});
