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
    assert.ok(food < .075, `${label}: the food's centre is ${(food * 100).toFixed(1)} cm from the lips at the top of the bite`);
    assert.ok(over < 0, `${label}: the forearm or hand rises ${(over * 100).toFixed(1)} cm past the nose at the top of the bite`);
  }
});

test('seated knees part (People XXVI): two knees with daylight between them, about hip width apart in trousers, a little closer under long cloth, every representative, the child and the elder', async () => {
  // The blind review: seated, from the front, both shins fused into one column (the thighs were splayed .06 rad inward, so the knee centres stood 7-10 cm apart, closer than two knees are wide).
  // A long coat cut narrower than .45 of its drop keeps the knees together as it is cut (its hem closes round the calves): it is the one exception.
  const { make, REPS } = await import('./people-rig.ts'), { animateLife } = await import('../src/world/citizen-life.ts'), T = await import('three');
  const player = new T.Vector3(0, 1.7, 25), cast: [string, string, number][] = [...REPS, ['child', 'child.child.narrow', 3], ['elder', 'elder.slim.narrow', 5]];
  for (const [label, combo, seed] of cast) {
    const n = make(combo, seed), [family, frame] = combo.split(':')[0].split('.').slice(1) as ['slim', 'broad'], d = dimsOf(family, frame);
    if (n.skirt.drop > .3 && n.skirt.depth < .45 * n.skirt.drop) continue;
    for (const a of ['sit', 'eat'] as const) {
      for (let i = 0; i < 120; i++) animateLife(n, a, 1 / 60, i / 60, false, player); n.group.updateMatrixWorld(true);
      const [k0, k1] = n.knees.map(k => k.getWorldPosition(new T.Vector3()).applyMatrix4(n.group.matrixWorld.clone().invert())), gap = Math.abs(k0.x - k1.x) - 2 * (d.kneeR + .007);
      assert.ok(gap > .02, `${label} (${a}): ${(gap * 100).toFixed(1)} cm between the seated knees`);
      if (!n.drape?.panel && !n.skirt.depth) assert.ok(Math.abs(k0.x - k1.x) >= 2 * d.hipX, `${label} (${a}): the knees are ${(Math.abs(k0.x - k1.x) * 100).toFixed(1)} cm apart against the hip joints' ${(2 * d.hipX * 100).toFixed(1)}`);
    }
  }
});

test('the bite brings the food in front of the face, the hand under the lips and off the face (People XXIX-b): food about 1.2 cm under and 5 cm ahead of the lips, every hand point 1 cm under the lip line, the hand over at most 12% of the face-front quad; every representative, the child and the elder', async () => {
  // The blind review: the hands "tangle at the mouth", the young mechanic's glove covers half the face. The stroke (citizen-life.ts `biteReach`) now takes the food to 5 cm ahead of the lips and 1.2 under them
  // while every vertex of the hand (the mesh beyond the wrist, its glove included) keeps 1 cm under the lip line and in front of the face plane.
  const { make, REPS } = await import('./people-rig.ts'), { animateLife } = await import('../src/world/citizen-life.ts'), { FOOD } = await import('../src/world/people/parts.ts'), { CHIN_TO_PIVOT } = await import('../src/world/people/head.ts'), { landmarks } = await import('../src/world/people/headform.ts'), T = await import('three');
  const player = new T.Vector3(0, 1.7, 25), cast: [string, string, number][] = [...REPS, ['child', 'child.child.narrow', 3], ['elder', 'elder.slim.narrow', 5]], W = .2, GX = 200, GY = 125, cell = W / GX;
  for (const [label, combo, seed] of cast) {
    const n = make(combo, seed); let best = -Infinity, rep = '';
    for (let i = 0; i < 345; i++) { animateLife(n, 'eat', 1 / 30, i / 30, false, player); if (i < 45 || -n.elbows[0].rotation.x <= best) continue; best = -n.elbows[0].rotation.x; n.group.updateMatrixWorld(true);
      const m = n.head.userData.mouth as number[], inv = n.head.matrixWorld.clone().invert(), f = n.grips[0].localToWorld(new T.Vector3(...FOOD.at)).applyMatrix4(inv), v = new T.Vector3(), grid = new Uint8Array(GX * GY);
      const dy = f.y - m[1], dz = f.z - m[2]; let maxY = -Infinity, minZ = Infinity;
      for (const o of n.elbows[0].children) if (o instanceof T.Mesh) { const p = o.geometry.attributes.position, ix = o.geometry.index, pts: any[] = [];
        for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k).applyMatrix4(o.matrixWorld); const hand = n.elbows[0].worldToLocal(v.clone()).y < -.236; pts.push({ q: v.clone().applyMatrix4(inv), hand }); }
        for (const { q, hand } of pts) if (hand) { maxY = Math.max(maxY, q.y - m[1]); if (q.y > m[1] - .04 && Math.abs(q.x) < .07) minZ = Math.min(minZ, q.z - m[2]); }
        const nT = ix ? ix.count : p.count;
        for (let t = 0; t < nT; t += 3) { const a = [0, 1, 2].map(j => pts[ix ? ix.getX(t + j) : t + j]); if (!a.every(x => x.hand) || Math.max(...a.map(x => x.q.z)) < m[2] - .004) continue;
          const A = a.map(x => [(x.q.x + W / 2) / cell, x.q.y / cell]), x0 = Math.max(0, Math.floor(Math.min(...A.map(c => c[0])))), x1 = Math.min(GX - 1, Math.ceil(Math.max(...A.map(c => c[0])))), y0 = Math.max(0, Math.floor(Math.min(...A.map(c => c[1])))), y1 = Math.min(GY - 1, Math.ceil(Math.max(...A.map(c => c[1]))));
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x + .5, py = y + .5, e = (u: number[], w: number[]) => (w[0] - u[0]) * (py - u[1]) - (w[1] - u[1]) * (px - u[0]), e0 = e(A[0], A[1]), e1 = e(A[1], A[2]), e2 = e(A[2], A[0]); if ((e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0)) grid[y * GX + x] = 1; } } }
      // the face-front quad: brow to chin, a cheekbone's width either side
      const brow = landmarks(.285, n.head.userData.shape ?? 'oval' as never).brow; let inq = 0, tot = 0;
      for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) { const X = (x + .5) * cell - W / 2, Y = (y + .5) * cell; if (Math.abs(X) < .07 && Y >= CHIN_TO_PIVOT && Y <= CHIN_TO_PIVOT + brow) { tot++; if (grid[y * GX + x]) inq++; } }
      rep = JSON.stringify({ dy, dz, maxY, cover: inq / tot, minZ }); }
    { const r = JSON.parse(rep), { dy, dz } = r;
      assert.ok(Math.hypot(dy + .012, dz - .05) < .04, `${label}: the food is ${(-dy * 100).toFixed(1)} cm under and ${(dz * 100).toFixed(1)} cm ahead of the lips (about 1.2 and 5)`);
      assert.ok(dz > .04 && dz < .07, `${label}: the food is ${(dz * 100).toFixed(1)} cm ahead of the lips`);
      assert.ok(r.maxY <= -.01, `${label}: the hand's highest point is ${(-r.maxY * 100).toFixed(1)} cm under the lip line (at least 1)`);
      assert.ok(r.cover <= .12, `${label}: the hand covers ${(100 * r.cover).toFixed(1)}% of the face-front quad (at most 12)`);
      assert.ok(r.minZ > .006, `${label}: the hand comes to ${(r.minZ * 100).toFixed(1)} cm of the lips' plane`); }
  }
});
