import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { animateLife } from '../src/world/citizen-life.ts';
import { make, useLife } from './people-rig.ts';

useLife((n, a, dt, t, p) => animateLife(n, a, dt, t, false, p));
const mats = (o: T.Object3D) => { const s = new Set<T.Material>(); o.traverse(m => { if (m instanceof T.Mesh) s.add(m.material as T.Material); }); return s; };

test('under a long skirt is the skirt: the thighs are in its cloth, so seated no dark mass shows under or behind the hips', () => {
  // People XXV: seated, a skirt's lap lies along the thighs and its back does not wrap the seat; the thighs' round tops at the hip, in stocking soot, read as a dark hip through the skirt
  for (const [combo, seed] of [['rowSkirt.slim.narrow', 1], ['stallholder.sturdy.broad', 3], ['stallholder.standard.narrow', 8], ['affluent.standard.broad', 2]] as const) {
    const n = make(combo, seed), skirt = mats(n.tails); if (combo.startsWith('affluent') && !n.hem) continue; // (an affluent gentleman wears a frock coat and trousers)
    for (const leg of n.legs) for (const m of leg.children) if (m instanceof T.Mesh) assert.ok(skirt.has(m.material as T.Material), `${combo}: a thigh is not in the skirt's cloth`);
  }
});
