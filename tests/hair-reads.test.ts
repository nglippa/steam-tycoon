import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { hairOf } from '../src/world/people/hair.ts';
import { facialOf } from '../src/world/people/head.ts';
import { landmarks } from '../src/world/people/headform.ts';
import { CASTS, HAT_HAIR, resolveLook, type Look } from '../src/world/people/look.ts';
import { palette } from '../src/world/palette.ts';

/** People XX: the hair reads QA II found wrong, held as rules. */
const look = (o: Partial<Look>): Look => ({ cast: 'shopMerchant', family: 'sturdy', frame: 'narrow', stature: 1, skin: 1, headShape: 'oval', faceType: 1, hairStyle: 'balding', hairColour: 'soot', hat: 'none', facial: 'none', outfit: 'shopMerchant.waistcoat', palette: 'wine', asymmetries: ['watchChain'], ...o });
const pts = (gs: T.BufferGeometry[]) => gs.flatMap(g => { const p = g.attributes.position, out: T.Vector3[] = []; for (let i = 0; i < p.count; i++) out.push(new T.Vector3().fromBufferAttribute(p, i)); return out; });

test('balding is a symmetric horseshoe: the same mass either side, carried behind the ear, and thin at its front ends', () => {
  for (const headShape of ['oval', 'square', 'long', 'heart'] as const) for (const hat of ['none', 'bowler', 'flatCap'] as const) {
    const h = .285, L = landmarks(h, headShape), P = pts(hairOf(look({ headShape, hat }), h, hat !== 'none').hair);
    const left = P.filter(p => p.x < -.02), right = P.filter(p => p.x > .02);
    assert.ok(Math.abs(left.length - right.length) <= .1 * Math.max(left.length, right.length), `${headShape}/${hat}: ${left.length} vs ${right.length} vertices a side`);
    const zl = left.reduce((a, p) => a + p.z, 0) / left.length, zr = right.reduce((a, p) => a + p.z, 0) / right.length;
    assert.ok(Math.abs(zl - zr) < .004, `${headShape}/${hat}: the two sides sit at the same depth`);
    // the band runs round the back: hair at the centre back, and the mass of each side behind the ear, not on the temple
    assert.ok(P.some(p => Math.abs(p.x) < .02 && p.z < L.z0 - .08), `${headShape}/${hat}: nothing crosses the back of the head`);
    assert.ok(zl < L.earZ && zr < L.earZ, `${headShape}/${hat}: the side masses sit behind the ear (${zl.toFixed(3)} vs ear ${L.earZ.toFixed(3)})`);
    const fwd = P.filter(p => p.z > L.earZ + .02).length / P.length;
    assert.ok(fwd < (hat === "none" ? .2 : .3) && !P.some(p => p.z > L.earZ + .07), `${headShape}/${hat}: ${(fwd * 100).toFixed(0)} % of the hair runs forward of the ear onto the temple`);
  }
});

test('under a hat the balding sides lie close: no flap stands out under the brim', () => {
  const h = .285, bare = pts(hairOf(look({ hat: 'none' }), h, false).hair), hatted = pts(hairOf(look({ hat: 'bowler', hairColour: 'iron', headShape: 'heart', faceType: 6 }), h, true).hair);
  const wide = (P: T.Vector3[]) => Math.max(...P.map(p => Math.abs(p.x)));
  assert.ok(wide(hatted) < wide(bare) - .006, `under the bowler the sides stand ${wide(hatted).toFixed(3)} vs ${wide(bare).toFixed(3)} bare`);
});

test('a bob is never dealt under a soft cap (it read as ear flaps); the soft cap still has five styles', () => {
  assert.ok(!HAT_HAIR.softCap.includes('bob'));
  assert.ok(HAT_HAIR.softCap.length >= 5);
});

test('facial hair is a shade darker than the hair, and grey is a warm grey, not a blue one', () => {
  for (const facial of ['moustache', 'beard', 'sideburns'] as const) for (const g of facialOf(look({ facial }), .285)) {
    const t = g.attributes.tint; assert.ok(t, `${facial}: a baked tint`); for (let i = 0; i < t.count; i++) assert.ok(t.getX(i) < -.5);
  }
  const c = new T.Color(palette.hair2.iron); assert.ok(c.r >= c.b, `iron ${palette.hair2.iron}: red ${c.r.toFixed(3)} >= blue ${c.b.toFixed(3)}`);
});

test('the older mechanic reads older: grey hair, mostly a moustache, a heavier brow; a short beard joins the moustache and the sideburns and leaves the mouth clear', () => {
  const mech = Array.from({ length: 600 }, (_, s) => resolveLook(s, 'engineer', { cast: 'olderMechanic' }));
  assert.ok(mech.every(l => l.hairColour === 'iron' || l.hairColour === 'white'), 'every older mechanic is grey');
  assert.ok(mech.filter(l => l.facial !== 'none').length / mech.length >= .75, 'three in four wear a moustache or beard');
  assert.ok(mech.filter(l => l.facial === 'moustache').length / mech.length > .6, 'he mostly wears his moustache');
  const heavy = CASTS.olderMechanic.faceRows!; assert.ok(mech.filter(l => heavy.includes(l.faceType)).length / mech.length > .7, 'the heavier-browed face rows');
  const h = .285, beard = pts(facialOf(look({ facial: 'beard' }), h)), lip = .13 * h;
  assert.ok(!beard.some(p => Math.abs(p.x) < .012 && p.y > lip - .004 && p.y < lip + .004), 'the beard reaches the mouth');
  // People XXVI: a cut beard, not a chin strap: it joins the moustache over the lip and rises up the cheeks to the sideburns (above the nose base by the ears)
  assert.ok(beard.some(p => Math.abs(p.x) < .012 && p.y > lip + .004), 'the beard has no moustache joined to it');
  assert.ok(beard.some(p => Math.abs(p.x) > .07 && p.y > .25 * h), 'the beard stops at the jaw instead of rising into the sideburns');
});

test('no moustache is a toothbrush (People XXVI): it is wider than the mouth by far, parted thin at the philtrum and swept down past the mouth\'s corners, on every head shape and every Ordinance face', async () => {
  // The blind review: seated, the introGuard's square black moustache read as a toothbrush moustache, a loaded shape for an occupying authority. The one moustache (also joined to the
  // short beard) is a parted chevron; a toothbrush is a level block about the nose's width, as thick at the middle as anywhere and with a flat lower edge.
  const { STORY } = await import('../src/world/people/look.ts');
  const chevron = (lk: Look, label: string) => {
    const h = .285 * ((lk.family === 'sturdy' ? .295 : lk.family === 'slim' ? .275 : .285) / .285), k = h / .285, ps = pts(facialOf({ ...lk, facial: 'moustache' }, h)).filter(p => p.y > .1 * h && Math.abs(p.x) < .1 * k);
    const maxX = Math.max(...ps.map(p => Math.abs(p.x))), mid = ps.filter(p => Math.abs(p.x) < .004 * k), full = ps.filter(p => Math.abs(p.x) > .008 * k && Math.abs(p.x) < .016 * k), ends = ps.filter(p => Math.abs(p.x) > .8 * maxX);
    const height = (q: T.Vector3[]) => Math.max(...q.map(p => p.y)) - Math.min(...q.map(p => p.y));
    assert.ok(2 * maxX > .055 * k, `${label}: the moustache is ${(2 * maxX * 100).toFixed(1)} cm wide, about a nose's width`);
    assert.ok(height(mid) < .8 * height(full), `${label}: the moustache is as deep at the philtrum (${(height(mid) * 1000).toFixed(1)} mm) as over the lip (${(height(full) * 1000).toFixed(1)} mm): not parted`);
    assert.ok(Math.min(...ends.map(p => p.y)) < Math.min(...full.map(p => p.y)) - .008 * k, `${label}: the moustache's ends do not sweep down past the mouth's corners: a level block`);
  };
  for (const shape of ['oval', 'square', 'long', 'heart'] as const) chevron(look({ headShape: shape }), shape);
  const ordinance = Object.entries(STORY).filter(([, l]) => l.cast === 'garrison' || l.cast === 'inspector');
  assert.ok(ordinance.some(([id]) => id === 'introGuard'));
  for (const [id, l] of ordinance) if (l.facial !== 'none') chevron(l, id);
  for (const cast of ['garrison', 'inspector'] as const) for (const [f] of CASTS[cast].facial) assert.ok(['none', 'moustache', 'beard', 'sideburns'].includes(f), `${cast}: ${f}`);
});
