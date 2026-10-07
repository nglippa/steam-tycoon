import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { animateLife } from '../src/world/citizen-life.ts';
import { make, through, useLife, REPS } from './people-rig.ts';

useLife((n, a, dt, t, p) => animateLife(n, a, dt, t, false, p));

test('a lifted knee never pierces long cloth: no leg is seen through a skirt, an apron or a coat at any phase of the walk', () => {
  // the QA representatives in long cloth, and the casts with the longest or narrowest: a lady's skirt to the ankle, an elder's coat
  const casts: [string, number][] = REPS.filter(([, c]) => /rowSkirt|stallholder|olderMechanic|foundry|shopMerchant|garrison|inspector|rowCoat/.test(c)).map(([, c, s]) => [c, s]);
  casts.push(['affluent.standard.broad', 2], ['elder.slim.narrow', 5]);
  for (const [combo, seed] of casts) for (const speed of [.6, 1.3]) {
    const r = through(combo, seed, 'walk', speed);
    assert.ok(r.worst < .005, `${combo} s${seed} at ${speed} m/s: a leg shows ${(r.worst * 100).toFixed(1)} cm through the cloth in ${r.bad} of ${r.frames} frames (${r.where})`);
  }
});

test('the Ordinance\'s coats hold the intro\'s 2.9 m/s exit', () => {
  for (const combo of ['garrison.sturdy.broad', 'inspector.standard.broad']) { const r = through(combo, 1, 'walk', 2.9); assert.ok(r.worst < .005, `${combo}: ${(r.worst * 100).toFixed(1)} cm (${r.where})`); }
});

test('long cloth moves like cloth: the hem bends at the knee and trails the upper part, rather than turning with it as one board', () => {
  for (const combo of ['olderMechanic.sturdy.broad', 'shopMerchant.standard.broad', 'foundry.sturdy.broad', 'rowSkirt.slim.narrow']) {
    const n = make(combo, 5), player = new T.Vector3(0, 1.7, 3), dt = 1 / 60, up: number[] = [], hem: number[] = [];
    for (let i = 0; i < 360; i++) { const t = i * dt; n.group.position.set(0, 0, t * 1.2); animateLife(n, 'walk', dt, t, false, player); if (i >= 120) { up.push(n.tails.rotation.x); hem.push(n.hem!.rotation.x); } }
    // the hem's own turn about the knee is not a fixed share of the upper part's: it bends (its range is real) and it lags (its best match to the upper part comes some frames later)
    const range = Math.max(...hem) - Math.min(...hem); assert.ok(range > .08, `${combo}: the hem turns only ${range.toFixed(3)} rad about the knee`);
    const corr = (lag: number) => { let s = 0; for (let i = 0; i + lag < up.length; i++) s += -up[i] * hem[i + lag]; return s; }, lags = Array.from({ length: 30 }, (_, l) => l), best = lags.reduce((b, l) => corr(l) > corr(b) ? l : b, 0);
    assert.ok(best >= 1, `${combo}: the hem keeps step with the upper part (best lag ${best} frames); cloth with weight trails`);
  }
});

test('a seated lap is a lap: the long cloth that holds a walking knee is flattened again when its wearer sits', () => {
  for (const combo of ['rowSkirt.slim.narrow', 'stallholder.sturdy.broad']) {
    const n = make(combo, 1), player = new T.Vector3(0, 1.7, 25);
    for (let i = 0; i < 120; i++) animateLife(n, 'sit', 1 / 60, i / 60, false, player);
    assert.ok(n.tails.scale.z * n.drape!.lap <= .19 + 1e-6, `${combo}: a lap ${(n.tails.scale.z * n.drape!.lap).toFixed(3)} m deep`);
  }
});
