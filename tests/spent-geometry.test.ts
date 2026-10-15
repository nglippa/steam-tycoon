import { test } from 'node:test';
import assert from 'node:assert/strict';

// The game's crowd batch (crowd-batch.ts) takes the vertices of every baked figure mesh and leaves `SPENT`, an empty hidden BufferGeometry with no `position`
// attribute, on the source. tests/people-rig.ts bakes with `g => g`, so no other test sees that: People XXIX's handPoints read `.attributes.position.count` there and
// the frame loop threw every frame on the default people. This builds figures, spends their meshes the way the batch does and runs the life through walk, sit and bite.
test('animateLife runs on figures whose meshes were spent by the crowd batch', async () => {
  const { make, REPS } = await import('./people-rig.ts'), { animateLife } = await import('../src/world/citizen-life.ts'), T = await import('three');
  const player = new T.Vector3(0, 1.7, 25), spent = new T.BufferGeometry();
  for (const [, combo, seed] of REPS.slice(0, 4)) for (const early of [0, 40]) {
    const n = make(combo, seed); let meshes = 0;
    n.group.userData.next = true;
    const spend = () => n.group.traverse(o => { if (o instanceof T.Mesh) { o.geometry = spent; o.visible = false; meshes++; } });
    if (!early) spend();
    for (const act of ['walk', 'sit', 'eat'] as const) for (let i = 0; i < 90; i++) {
      if (early && act === 'walk' && i === early) spend();
      assert.doesNotThrow(() => animateLife(n, act, 1 / 30, (i + (act === 'sit' ? 90 : act === 'eat' ? 180 : 0)) / 30, false, player), `${combo} early=${early} ${act} frame ${i}`);
    }
    assert.ok(meshes > 0);
    assert.equal(n.elbows[0].children.some(o => o instanceof T.Mesh && !o.geometry.attributes.position), true, 'the elbow carries a spent mesh');
  }
});
