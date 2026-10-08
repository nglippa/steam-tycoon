import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { animateLife } from '../src/world/citizen-life.ts';
import { make, REPS } from './people-rig.ts';
import { SOLE } from '../src/simulation/gait.ts';

/** Walks a figure along +z at `speed` m/s for `secs` at 60 Hz (after a 2 s warm-up) and calls `each` every frame. */
function walkOn(combo: string, seed: number, speed: number, each: (n: ReturnType<typeof make>) => void, secs = 3) {
  const n = make(combo, seed), player = new T.Vector3(0, 1.7, 25), dt = 1 / 60;
  for (let i = 0; i < 60 * (2 + secs); i++) { const t = i * dt; n.group.position.set(0, 0, t * speed); animateLife(n, 'walk', dt, t, false, player); n.group.updateMatrixWorld(true); if (i >= 120) each(n); }
  return n;
}

test('a planted foot stays put whatever the figure\'s stature: the flat-footed ankle drifts under 3 mm in a stance', () => {
  // The stride clock runs on the distance walked in the figure's own units, so a figure scaled to .96 or 1.04 does not skate by 4 % of its stride.
  let worst = 0;
  for (const speed of [1, 1.4]) for (const [label, combo, seed] of REPS) {
    const at: (T.Vector3 | null)[] = [null, null];
    const n = walkOn(combo, seed, speed, n => { const u = n.motion.stride / (Math.PI * 2);
      for (const k of [0, 1]) { const v = (u + k * .5) % 1, a = n.ankles[k].getWorldPosition(new T.Vector3());
        if (v > .07 && v < .3) { const a0 = at[k] ??= a.clone(); worst = Math.max(worst, Math.hypot(a.x - a0.x, a.z - a0.z)); } else at[k] = null; } });
    assert.ok(worst < .003, `${label} at ${speed} m/s (stature ${n.group.scale.x.toFixed(3)}): the flat foot's ankle drifts ${(worst * 100).toFixed(2)} cm`);
  }
});

test('no point of a walker\'s sole goes into the pavement at any phase of the stride, heel-off included', () => {
  // People XXI: the gait rolled the forefoot on an arc that lay above the flat sole, so at heel-off the toe went 3.4-4.7 cm into the pavement (gait.ts now turns the foot on its sole's
  // edges, the figure's own). The pavement is .13 under the origin in the world (the spawn sites stand the origin .13 over it; citizen-life lifts a figure's body by its stature to match).
  for (const speed of [1, 1.4]) for (const [label, combo, seed] of REPS) { let low = 9, at = '';
    walkOn(combo, seed, speed, n => { const pave = n.group.position.y - .13, u = n.motion.stride / (Math.PI * 2), v = new T.Vector3();
      n.ankles.forEach((a, k) => a.traverse(o => { if (!(o instanceof T.Mesh)) return; const pa = o.geometry.attributes.position; for (let j = 0; j < pa.count; j += 2) { v.fromBufferAttribute(pa, j).applyMatrix4(o.matrixWorld); if (v.y - pave < low) { low = v.y - pave; at = `phase ${((u + k * .5) % 1).toFixed(2)}`; } } })); }, 2);
    assert.ok(low > -.003, `${label} at ${speed} m/s: a sole goes ${(-low * 100).toFixed(1)} cm into the pavement (${at})`);
  }
});

test('no point of a standing figure\'s sole goes into the pavement: the free foot rests on its toe, and nothing sinks as a walk starts or stops', () => {
  // People XXII: standing, the free knee bends up to .19 rad and its foot pitched toe down with the shin, the toe 2.8-5.5 cm into the pavement; the weighted foot was 7-10 mm in (the rest hip
  // height is 7 mm short of a straight leg and its sole, and the breath bobbed the feet). Over a whole weight shift (40 s at 15 Hz), then a start to 1 m/s and a stop, every representative.
  const v = new T.Vector3();
  for (const [label, combo, seed] of REPS) { const n = make(combo, seed), player = new T.Vector3(0, 1.7, 25), dt = 1 / 60; let z = 0, low = 9, at = '';
    for (let i = 0; i < 60 * 50; i++) { const t = i * dt, sp = t < 40 ? 0 : t < 46 ? Math.min(1, (t - 40) * 2, (46 - t) * 2) : 0; z += sp * dt; n.group.position.set(0, 0, z); animateLife(n, 'walk', dt, t, false, player);
      if (i < 60 || (t < 40 && i % 4)) continue; n.group.updateMatrixWorld(true); const pave = n.group.position.y - .13;
      n.ankles.forEach(a => a.traverse(o => { if (!(o instanceof T.Mesh)) return; const pa = o.geometry.attributes.position; for (let j = 0; j < pa.count; j++) { v.fromBufferAttribute(pa, j).applyMatrix4(o.matrixWorld); if (v.y - pave < low) { low = v.y - pave; at = `${t < 40 ? 'standing' : 'starting or stopping'}, ${t.toFixed(2)} s`; } } })); }
    assert.ok(low >= -.002, `${label}: a sole goes ${(-low * 100).toFixed(2)} cm into the pavement (${at})`);
  }
});

test('a seated figure\'s seat is at one height whoever sits (the spawn sites put a bench, a crate or a step under it: People XIX)', () => {
  // the hip joints, seated, above the pavement (which lies .13 under the figure's origin in its own scale): every adult within 2.5 cm of every other
  const hs: [string, number][] = [];
  for (const [label, combo, seed] of REPS) { const n = make(combo, seed), player = new T.Vector3(0, 1.7, 25); for (let i = 0; i < 90; i++) animateLife(n, 'sit', 1 / 60, i / 60, false, player); n.group.updateMatrixWorld(true);
    const hip = n.legs[0].getWorldPosition(new T.Vector3()).y, pave = new T.Vector3(0, -.13, 0).applyMatrix4(n.group.matrixWorld).y; hs.push([label, hip - pave]); }
  const lo = Math.min(...hs.map(h => h[1])), hi = Math.max(...hs.map(h => h[1]));
  assert.ok(hi - lo < .025 && lo > .4 && hi < .56, `seated hip heights ${hs.map(([l, h]) => `${l} ${h.toFixed(3)}`).join(', ')}`);
});

test('a seated figure\'s soles are on the pavement: every representative, the child on the stoop and the elder, sitting, eating and with a mug, at rest and through the bite', () => {
  // People XXIII: the seat is .42 m over the pavement whatever the stature (People XIX), and the fixed seated pose (thigh .15 rad below level, shin plumb) put the shin and sole 9-12 cm under
  // it. Each leg is now solved to the figure's own hip and limbs. For each foot, every 2nd frame of 6 s after a 1.5 s warm-up: its lowest point within -2 mm..+1 cm of the pavement (.13 under
  // the origin in the world), and its toe tip, on the pavement throughout (eating, the free heel bobs on it), never sliding more than 3 mm.
  const v = new T.Vector3(), cast: [string, string, number][] = [...REPS, ['child', 'child.child.narrow', 3], ['elder', 'elder.slim.narrow', 5], ['elder, broad', 'elder.slim.broad', 2], ['courier', 'courier.slim.broad', 7]];
  for (const [label, combo, seed] of cast) for (const how of ['sit', 'eat', 'mug'] as const) {
    const n = make(combo, seed), player = new T.Vector3(0, 1.7, 25), dt = 1 / 60, toe0: (T.Vector3 | null)[] = [null, null]; if (how === 'mug') n.group.userData.upright = true;
    let low = 9, high = -9, slip = 0, at = '';
    for (let i = 0; i < 60 * 7.5; i++) { animateLife(n, how === 'sit' ? 'sit' : 'eat', dt, i * dt, false, player); if (i < 90 || i % 2) continue; n.group.updateMatrixWorld(true); const pave = n.group.position.y - .13;
      n.ankles.forEach((a, k) => { let f = 9; a.traverse(o => { if (!(o instanceof T.Mesh)) return; const pa = o.geometry.attributes.position; for (let j = 0; j < pa.count; j++) { v.fromBufferAttribute(pa, j).applyMatrix4(o.matrixWorld); f = Math.min(f, v.y - pave); } });
        if (f < low) { low = f; at = `foot ${k}, ${(i * dt).toFixed(2)} s`; } if (f > high) { high = f; at = `foot ${k}, ${(i * dt).toFixed(2)} s`; }
        const tip = new T.Vector3(0, -SOLE, (a.userData.sole as number[])[1]).applyMatrix4(a.matrixWorld); slip = Math.max(slip, Math.hypot(tip.x - (toe0[k] ??= tip.clone()).x, tip.z - toe0[k]!.z)); }); }
    assert.ok(low >= -.002 && high <= .01, `${label} (${how}): a seated foot's lowest point runs ${(low * 100).toFixed(2)}..${(high * 100).toFixed(2)} cm over the pavement (${at})`);
    assert.ok(slip < .003, `${label} (${how}): a seated toe slides ${(slip * 1000).toFixed(1)} mm`);
  }
});
