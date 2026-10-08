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
  // every outfit of the casts with more than one (People XX), whichever the representatives' seeds happen to draw
  casts.push(...NEW_OUTFITS);
  for (const [combo, seed] of casts) for (const speed of [.6, 1.3]) {
    const r = through(combo, seed, 'walk', speed);
    assert.ok(r.worst < .005, `${combo} s${seed} at ${speed} m/s: a leg shows ${(r.worst * 100).toFixed(1)} cm through the cloth in ${r.bad} of ${r.frames} frames (${r.where})`);
  }
});

/** each outfit of every cast that has more than one, by name: the representatives' seeds draw only one of them */
const NEW_OUTFITS: [string, number][] = [['stallholder.standard.narrow:stallholder.shawl', 8], ['stallholder.sturdy.broad:stallholder.shawl', 3], ['stallholder.sturdy.broad:stallholder.apron', 3],
  ['olderMechanic.sturdy.broad:olderMechanic.shopCoat', 5], ['olderMechanic.sturdy.broad:olderMechanic.apron', 5], ['olderMechanic.standard.narrow:olderMechanic.apron', 2],
  ['courier.slim.broad:courier.coat', 1], ['courier.slim.narrow:courier.vest', 2], ['courier.slim.broad:courier.jacket', 3]];

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

test('a skirt in stride wraps the forward leg and trails: it is opened only as far as the knee needs, never into a bell or a tent', () => {
  // People XXI: the hem's top is cut narrow inside the upper part, and asking it to hold the knee as well opened the whole hem by ~45 %: every skirt kicked into a stiff bell, its hem tilted
  // 27-49 cm front to back. Measured at the hem's lowest band, in the pelvis frame: its depth front to back against its cut, and how far its front and back part in height.
  for (const [combo, seed] of [['stallholder.sturdy.broad', 3], ['stallholder.standard.narrow', 8], ['stallholder.sturdy.broad:stallholder.shawl', 3], ['rowSkirt.slim.narrow', 1], ['affluent.standard.broad', 2]] as const) for (const speed of [.6, 1, 1.3]) {
    const n = make(combo, seed), player = new T.Vector3(0, 1.7, 25), dt = 1 / 60, inv = new T.Matrix4(), g = n.drape!.garments[0], bot = g.lo[g.lo.length - 1];
    const P = (z: number) => new T.Vector3(0, bot.y, z).applyMatrix4(n.hem!.matrixWorld).applyMatrix4(inv); let depth = 0, tilt = 0;
    for (let f = 0; f < 300; f++) { n.group.position.set(0, 0, f * dt * speed); animateLife(n, 'walk', dt, f * dt, false, player); if (f < 120) continue; n.group.updateMatrixWorld(true); inv.copy(n.pelvis.matrixWorld).invert();
      const fr = P(bot.z + bot.f), bk = P(bot.z - bot.b); depth = Math.max(depth, (fr.z - bk.z) / (bot.f + bot.b)); tilt = Math.max(tilt, Math.abs(fr.y - bk.y)); }
    assert.ok(depth < 1.3 && tilt < .25, `${combo} at ${speed} m/s: the hem opens to ${depth.toFixed(2)}x its cut and tilts ${(tilt * 100).toFixed(0)} cm front to back`);
  }
});

test('a greatcoat parts and trails instead of ballooning: its front goes out over the knee and its back trails, and neither opens round the waist', () => {
  // People XXI: in one piece the narrow Ordinance coats opened to 1.5-2x their depth (2.75x at 2.9 m/s), front and back together, to let the forward knee through, so they ballooned from
  // the waist down. Cut at the side seams (drape.ts `split`), each side is led and opened by its own faces of the legs.
  for (const [combo, seed] of [['inspector.standard.broad', 11], ['inspector.slim.broad', 1], ['garrison.sturdy.broad', 10], ['garrison.standard.broad', 2]] as const) for (const speed of [1, 1.3]) {
    const n = make(combo, seed), sp = n.drape!.split!, player = new T.Vector3(0, 1.7, 25), dt = 1 / 60; let open = 0;
    for (let f = 0; f < 300; f++) { n.group.position.set(0, 0, f * dt * speed); animateLife(n, 'walk', dt, f * dt, false, player); if (f >= 120) for (const p of [sp.front, sp.back]) open = Math.max(open, p.tails.scale.z * n.tails.scale.z, p.hem!.scale.z); }
    assert.ok(open < 1.15, `${combo} at ${speed} m/s: a side of the coat opens to ${open.toFixed(2)}x`);
  }
});

test('a seated lap is a lap: the long cloth that holds a walking knee is flattened again when its wearer sits', () => {
  for (const combo of ['rowSkirt.slim.narrow', 'stallholder.sturdy.broad', 'stallholder.sturdy.broad:stallholder.shawl', 'olderMechanic.sturdy.broad:olderMechanic.apron']) {
    const n = make(combo, 1), player = new T.Vector3(0, 1.7, 25);
    for (let i = 0; i < 120; i++) animateLife(n, 'sit', 1 / 60, i / 60, false, player);
    assert.ok(n.tails.scale.z * n.drape!.lap <= .19 + 1e-6, `${combo}: a lap ${(n.tails.scale.z * n.drape!.lap).toFixed(3)} m deep`);
  }
});

test('no hand or forearm passes through what is carried at the hip: pouches, the tool roll, the hook, a courier\'s satchel, the Ordinance\'s ledger, truncheon, keys and pouch, standing, walking and on guard', async () => {
  const { intoProps } = await import('./people-rig.ts'), { BUILT } = await import('../src/world/people/figure.ts'), { CASTS } = await import('../src/world/people/look.ts');
  // every outfit of a cast is worn at least once over the four seeds (People XX: a courier's satchel, the stallholder's shawl, the older mechanic's apron)
  for (const cast of BUILT) for (const [i, seed] of [1, 2, 4, 11].entries()) { const fam = CASTS[cast].families[seed % CASTS[cast].families.length], outfits = CASTS[cast].outfits, combo = `${cast}.${fam}.${CASTS[cast].frames[seed % CASTS[cast].frames.length]}:${outfits[i % outfits.length].id}`;
    for (const [a, sp] of [['walk', 0], ['walk', 1.2], ['guard', 0]] as const) { const r = intoProps(combo, seed, a, sp, 90); assert.ok(r.worst <= 0, `${combo} s${seed} ${a} ${sp}: a hand or forearm ${(r.worst * 100).toFixed(1)} cm inside a prop (${r.where})`); } }
});
