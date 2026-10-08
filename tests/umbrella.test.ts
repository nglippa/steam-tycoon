import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { animateLife, setLifeConditions } from '../src/world/citizen-life.ts';
import { RIG } from '../src/world/people/body.ts';
import { make, REPS } from './people-rig.ts';

/** City.ts hangs a walker's umbrella in the grip socket of the free hand; this builds the same (a shaft from 15 cm under the grip to the canopy). */
function withUmbrella(combo: string, seed: number) {
  const n = make(combo, seed), hand = n.grips[1].children.length ? 0 : 1, u = new T.Group(), shaft = new T.Mesh(new T.CylinderGeometry(.012, .012, 1.2, 6)); shaft.position.y = .45; u.add(shaft);
  n.grips[hand].add(u); n.group.userData.umbrella = u; n.group.userData.umbrellaHand = hand; return { n, hand, u };
}

test('an umbrella\'s shaft runs through the closed hand, upright, standing and walking in rain', () => {
  setLifeConditions(3, true);
  try {
    for (const [label, combo, seed] of [...REPS, ['elder with a stick', 'elder.slim.broad', 3] as const, ['older mechanic in his shop coat', 'olderMechanic.sturdy.broad:olderMechanic.shopCoat', 5] as const, ['courier in shirt sleeves', 'courier.slim.narrow:courier.vest', 2] as const, ['courier in his coat', 'courier.slim.broad:courier.coat', 1] as const]) {
      const { n, hand, u } = withUmbrella(combo, seed), player = new T.Vector3(0, 1.7, 25), dt = 1 / 60, v = new T.Vector3(), up = new T.Vector3();
      for (const speed of [0, 1.2]) for (let i = 0; i < 240; i++) { n.group.position.set(0, 0, i * dt * speed); animateLife(n, 'walk', dt, i * dt, false, player); if (i < 120 || i % 10) continue; n.group.updateMatrixWorld(true);
        // the hand: what the forearm's group holds below the wrist, as a box in the forearm's own frame
        const el = n.elbows[hand], inv = el.matrixWorld.clone().invert(), box = new T.Box3();
        el.traverse(o => { if (!(o instanceof T.Mesh) || o.parent !== el) return; const pa = o.geometry.attributes.position; for (let k = 0; k < pa.count; k++) { v.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld).applyMatrix4(inv); if (v.y < -RIG.forearm - .005) box.expandByPoint(v); } });
        for (const y of [-.02, 0, .02]) { v.set(0, y, 0).applyMatrix4(u.matrixWorld).applyMatrix4(inv); assert.ok(box.containsPoint(v), `${label} at ${speed} m/s: the shaft at ${y} m from the grip is outside the hand (${v.toArray().map(x => x.toFixed(3))}, hand ${box.min.toArray().map(x => x.toFixed(3))}..${box.max.toArray().map(x => x.toFixed(3))})`); }
        up.set(0, 1, 0).transformDirection(u.matrixWorld); assert.ok(up.y > Math.cos(.3), `${label}: the umbrella leans ${Math.acos(up.y).toFixed(2)} rad`); }
    }
  } finally { setLifeConditions(0, false); }
});
