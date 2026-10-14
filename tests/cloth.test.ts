import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { animateLife } from '../src/world/citizen-life.ts';
import { make, useLife, REPS } from './people-rig.ts';
import { SEAT } from '../src/world/drape.ts';

useLife((n, a, dt, t, p) => animateLife(n, a, dt, t, false, p));
const mats = (o: T.Object3D) => { const s = new Set<T.Material>(); o.traverse(m => { if (m instanceof T.Mesh) s.add(m.material as T.Material); }); return s; };

test('under a long skirt is the skirt: the thighs are in its cloth, so seated no dark mass shows under or behind the hips', () => {
  // People XXV: seated, a skirt's lap lies along the thighs and its back does not wrap the seat; the thighs' round tops at the hip, in stocking soot, read as a dark hip through the skirt
  for (const [combo, seed] of [['rowSkirt.slim.narrow', 1], ['stallholder.sturdy.broad', 3], ['stallholder.standard.narrow', 8], ['affluent.standard.broad', 2]] as const) {
    const n = make(combo, seed), skirt = mats(n.tails); if (combo.startsWith('affluent') && !n.hem) continue; // (an affluent gentleman wears a frock coat and trousers)
    for (const leg of n.legs) for (const m of leg.children) if (m instanceof T.Mesh) assert.ok(skirt.has(m.material as T.Material), `${combo}: a thigh is not in the skirt's cloth`);
  }
});

test('seated cloth stays out of the seat: no cloth of any seated cast, sitting or eating, is inside the bench or under its top anywhere over it', () => {
  // People XXV: a full skirt's and a greatcoat's hem, hung along the shins, kept its back as far behind them as a bell is and came down through the seat's front edge and on below the
  // plank (up to 4.4 cm into it); a short jacket's or an elder's lap dipped 1-6 cm into it under the thighs. The seat is the game's bench (drape.ts SEAT): its top .42 over the pavement,
  // from .185 behind the figure's origin to .305 ahead of it, the plank 5 cm thick. Every vertex of the long cloth (tails, its hinge, an apron, a split coat's two sides) is checked.
  const casts: [string, number][] = [...REPS.map(([, c, s]) => [c, s] as [string, number]), ['child.child.narrow', 3], ['elder.slim.narrow', 5], ['elder.slim.broad', 2], ['affluent.standard.broad', 2],
    ['inspector.slim.broad', 1], ['garrison.standard.broad', 2], ['look:introGuard', 1], ['stallholder.sturdy.broad:stallholder.shawl', 3], ['stallholder.sturdy.broad:stallholder.apron', 3],
    ['olderMechanic.sturdy.broad:olderMechanic.shopCoat', 5], ['olderMechanic.standard.narrow:olderMechanic.shopCoat', 2], ['olderMechanic.sturdy.broad:olderMechanic.apron', 5], ['courier.slim.broad:courier.coat', 1], ['courier.slim.broad:courier.jacket', 3]];
  const player = new T.Vector3(0, 1.7, 25), v = new T.Vector3(), top = SEAT.top - SEAT.pave;
  for (const [combo, seed] of casts) for (const a of ['sit', 'eat'] as const) {
    const n = make(combo, seed); let worst = 0, where = '', plank = 0;
    for (let f = 0; f < 60 * 5; f++) { animateLife(n, a, 1 / 60, f / 60, false, player); if (f < 90 || f % 15) continue; n.group.updateMatrixWorld(true);
      n.tails.traverse(o => { if (!(o instanceof T.Mesh)) return; const pa = o.geometry.attributes.position;
        for (let j = 0; j < pa.count; j++) { v.fromBufferAttribute(pa, j).applyMatrix4(o.matrixWorld); if (v.z <= SEAT.back || v.z >= SEAT.front || v.y >= top) continue;
          if (v.y > top - .05) plank++; if (top - v.y > worst) { worst = top - v.y; where = `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}) at frame ${f}`; } } }); }
    assert.ok(worst === 0, `${combo} s${seed} ${a}: cloth ${(worst * 100).toFixed(1)} cm under the seat's top over it, ${plank} vertex samples inside the plank (deepest ${where})`);
  }
});

/** How far each belt, band and strap (meshes marked userData.belt with their thickness) stands off what it wraps: from each vertex of its outer face a ray goes in along the face's normal to
 *  the first other surface of the figure; the gap is that distance less the belt's own thickness. Returns the largest gap (m), how many outer vertices found nothing within 4 cm, and where. */
export function beltGap(combo: string, seed: number) {
  const n = make(combo, seed), ray = new T.Raycaster(), v = new T.Vector3(), nr = new T.Vector3(), all: T.Mesh[] = [], belts: T.Mesh[] = [];
  n.group.updateMatrixWorld(true); n.group.traverse(o => { if (!(o instanceof T.Mesh)) return; (o.material as T.Material).side = T.DoubleSide; (o.userData.belt ? belts : all).push(o); });
  let worst = 0, lost = 0, where = ''; const per: number[] = [];
  for (const b of belts) { let bw = 0; const pa = b.geometry.attributes.position, na = b.geometry.attributes.normal, nm = new T.Matrix3().getNormalMatrix(b.matrixWorld);
    for (let j = 0; j < pa.count; j++) { v.fromBufferAttribute(pa, j).applyMatrix4(b.matrixWorld); nr.fromBufferAttribute(na, j).applyMatrix3(nm).normalize();
      if (nr.x * v.x + nr.z * v.z <= .6 * Math.hypot(v.x, v.z)) continue; // (its outer face, turned out from the body: the lips at its edges, a strap's edges and its ends are left out)
      ray.set(v, nr.clone().negate()); ray.far = .04; const h = ray.intersectObjects(all, false)[0];
      if (!h) { lost++; continue; } const gap = h.distance - (b.userData.belt as number); bw = Math.max(bw, gap); if (gap > worst) { worst = gap; where = `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`; } } per.push(bw); }
  return { worst, lost, where, belts: belts.length, per };
}
