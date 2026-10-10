import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimsOf, ribcage, pelvis } from '../src/world/people/body.ts';
import { ringAt, type Ring } from '../src/world/people/loft.ts';

const BODIES = [...(['slim', 'standard', 'sturdy'] as const).flatMap(f => (['broad', 'narrow'] as const).map(fr => [f, fr] as const)), ['child', 'narrow'] as const];
const front = (r: Ring) => (r.z ?? 0) + r.f, back = (r: Ring) => (r.z ?? 0) - r.b;

test('the torso is an S in profile (People XXVI): the chest stands forward of the waist, the shoulder blades and the seat stand behind the small of the back', () => {
  // Book 5, Torso: the body reference's profile, every family and frame. A plank (a back line straight from the collar to the hip, the chest barely forward of the waist) is the fail.
  for (const [family, frame] of BODIES) {
    const d = dimsOf(family, frame), rib = ribcage(d), pel = pelvis(d), label = `${family}/${frame}`;
    const chest = ringAt(rib, 1.33), waist = ringAt(rib, 1.1), seat = ringAt(pel, .93), adult = family !== 'child';
    const depth = (r: Ring) => r.f + r.b;
    // (a sturdy body's belly carries forward of the chest line, and a child's a little forward, Book 3: their chests are deeper than their waists, by less)
    assert.ok(depth(chest) > depth(waist) + (family === 'sturdy' ? .015 : adult ? .04 : .008), `${label}: chest depth ${depth(chest).toFixed(3)} against the waist's ${depth(waist).toFixed(3)}`);
    if (family !== 'sturdy' && adult) assert.ok(front(chest) > front(waist) + .02, `${label}: the chest stands ${((front(chest) - front(waist)) * 100).toFixed(1)} cm forward of the waist`);
    assert.ok(back(chest) < back(waist) - (adult ? .02 : .01), `${label}: the shoulder blades stand ${((back(waist) - back(chest)) * 100).toFixed(1)} cm behind the small of the back`);
    assert.ok(back(seat) < back(waist) - (adult ? .025 : .012), `${label}: the seat stands ${((back(waist) - back(seat)) * 100).toFixed(1)} cm behind the small of the back`);
    // the waist is the narrowest ring in depth between the chest and the seat, so the profile curves in and out again rather than tapering one way
    for (let y = 1.0; y <= 1.3; y += .02) { const r = y > 1.1 ? ringAt(rib, y) : ringAt(pel, y); assert.ok(back(r) <= back(waist) + 1e-6 || Math.abs(y - 1.1) < .045, `${label}: the back at ${y.toFixed(2)} (${back(r).toFixed(3)}) is in front of the small of the back (${back(waist).toFixed(3)})`); }
  }
});

test('an elbow is a landmark (People XXVI): the arm and its sleeve draw in over the joint, narrower than the upper arm above it and the forearm\'s swell below it', async () => {
  const { upperArm, forearm } = await import('../src/world/people/body.ts');
  for (const [family, frame] of BODIES) {
    const d = dimsOf(family, frame), up = upperArm(d), fore = forearm(d), label = `${family}/${frame}`, e = ringAt(up, -.25), full = ringAt(up, -.07), swell = ringAt(fore, -.07);
    assert.ok(e.w < full.w * .9 && e.w < swell.w * .97, `${label}: the elbow is ${(e.w * 200).toFixed(1)} cm wide against the upper arm's ${(full.w * 200).toFixed(1)} and the forearm's ${(swell.w * 200).toFixed(1)}`);
    assert.ok(e.b > e.f + .008, `${label}: the elbow's point stands ${((e.b - e.f) * 100).toFixed(1)} cm out behind`);
  }
  // dressed: the sleeve's width across the arm (shoulder frame) at the elbow against a third of the way down
  const { make, REPS } = await import('./people-rig.ts'), T = await import('three');
  for (const [label, combo, seed] of REPS) {
    const n = make(combo, seed), sh = n.arms[0], v = new T.Vector3(), w = (y0: number, y1: number) => { let lo = Infinity, hi = -Infinity; sh.updateMatrixWorld(true); const inv = sh.matrixWorld.clone().invert();
      sh.traverse(o => { if (!(o instanceof T.Mesh) || n.elbows[0].children.includes(o)) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); if (v.y < y1 && v.y > y0) { lo = Math.min(lo, v.z); hi = Math.max(hi, v.z); } } }); return hi - lo; };
    const upper = w(-.09, -.05), elbow = w(-.25, -.235);
    assert.ok(elbow < upper * .92, `${label}: the sleeve is ${(elbow * 100).toFixed(1)} cm deep at the elbow against ${(upper * 100).toFixed(1)} cm a third of the way down`);
  }
});

test('the bite reaches the mouth (People XXVI): at the top of the stroke the food is at the lips and no part of the hand rises past the nose, every representative, the child and the elder', async () => {
  // The blind review: the fist went into the nose and the food stood off beside the face. The stroke is now solved per figure (citizen-life.ts `biteReach`) for parts.ts `FOOD`.
  const { make, REPS } = await import('./people-rig.ts'), { animateLife } = await import('../src/world/citizen-life.ts'), { FOOD } = await import('../src/world/people/parts.ts'), { CHIN_TO_PIVOT } = await import('../src/world/people/head.ts'), T = await import('three');
  const player = new T.Vector3(0, 1.7, 25), cast: [string, string, number][] = [...REPS, ['child', 'child.child.narrow', 3], ['elder', 'elder.slim.narrow', 5]];
  for (const [label, combo, seed] of cast) {
    const n = make(combo, seed); let best = -Infinity, food = 0, over = 0;
    for (let i = 0; i < 345; i++) { animateLife(n, 'eat', 1 / 30, i / 30, false, player); if (i < 45 || -n.elbows[0].rotation.x <= best) continue; best = -n.elbows[0].rotation.x; n.group.updateMatrixWorld(true);
      const m = n.head.userData.mouth as number[], mouth = n.head.localToWorld(new T.Vector3(m[0], m[1], m[2])), f = n.grips[0].localToWorld(new T.Vector3(...FOOD.at)), noseY = m[1] + (m[1] - CHIN_TO_PIVOT);
      food = f.distanceTo(mouth); over = -Infinity; const inv = n.head.matrixWorld.clone().invert(), v = new T.Vector3();
      for (const o of n.elbows[0].children) if (o instanceof T.Mesh) { const p = o.geometry.attributes.position; for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld).applyMatrix4(inv); over = Math.max(over, v.y - noseY); } } }
    assert.ok(food < .04, `${label}: the food's centre is ${(food * 100).toFixed(1)} cm from the lips at the top of the bite`);
    assert.ok(over < 0, `${label}: the forearm or hand rises ${(over * 100).toFixed(1)} cm past the nose at the top of the bite`);
  }
});
