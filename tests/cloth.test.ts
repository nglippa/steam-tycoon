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

test('belts, bands and straps lie on what they wrap: every QA cast and the garrison in other builds has each within 6 mm of the cloth under it and none lost', () => {
  // People XXV: the garrison's crossbelt was 19.4 mm clear of the coat over the chest and shoulder. It was a flat strap swept through ten points over a coat of ten flat facets, so its middle
  // stood off the facets' middles and its edges off the next facets; it is now a ribbon laid on the coat's own triangles, riding the buttoned front's plate where it crosses it.
  const casts: [string, number][] = [...REPS.map(([, c, s]) => [c, s] as [string, number]), ['garrison.standard.narrow', 3], ['garrison.slim.broad', 7], ['look:introGuard', 1]];
  for (const [combo, seed] of casts) { const r = beltGap(combo, seed); assert.ok(r.belts > 0 || !/garrison|inspector|stallholder/.test(combo), `${combo} s${seed}: no belt found`);
    assert.ok(r.worst <= .006 && r.lost === 0, `${combo} s${seed}: a belt stands ${(r.worst * 1000).toFixed(1)} mm off at ${r.where}, ${r.lost} outer vertices found nothing under them`); }
});

/** How close an apron hangs to what it hangs on (People XXV). From points over its front face (normal toward the front, above the knee, every 2.5 cm) a ray goes straight back, level, up to 12 cm
 *  to the first surface of the figure that is not the apron, its band and ties, an arm, the head or a held prop. At each height (4 cm slices from just above the knee up) the cloth lies on
 *  the nearest thing behind it, so the slice's gap is the smallest of its rays: the leading thigh, the belly. `how` 'stand' is a talker's stance (one foot ahead), 'walk' a stride at `speed` m/s
 *  (every 6th frame of 1.2 s after a 2 s warm-up). Returns the largest slice gap (m), the mean over slices, how many slices found nothing, and where. */
export function apronGap(combo: string, seed: number, how: 'stand' | 'walk', speed = 1.3) {
  const n = make(combo, seed), ray = new T.Raycaster(), P: T.Mesh[] = [], S: T.Mesh[] = [], skip = new Set<T.Object3D>(), player = new T.Vector3(0, 1.7, 25), v = new T.Vector3(), nr = new T.Vector3(), dir = new T.Vector3(), kn = new T.Vector3(), inv = new T.Matrix4();
  const panel = n.drape?.panel; if (!panel) throw new Error(`${combo}: no apron part`);
  for (const root of [panel.tails, panel.hem, ...n.arms, n.head, ...n.grips]) root?.traverse(o => skip.add(o));
  n.group.traverse(o => { if (!(o instanceof T.Mesh)) return; (o.material as T.Material).side = T.DoubleSide; if (o.userData.belt) return; if (panel.tails.getObjectById(o.id) || panel.hem?.getObjectById(o.id)) { P.push(o); return; } if (!skip.has(o)) S.push(o); });
  let worst = 0, sum = 0, slices = 0, bare = 0, where = '';
  const frames = how === 'stand' ? [90] : Array.from({ length: 8 }, (_, i) => 120 + i * 6);
  for (let f = 0; f <= frames[frames.length - 1]; f++) { n.group.position.set(0, 0, how === 'walk' ? f / 60 * speed : 0); animateLife(n, how === 'walk' ? 'walk' : 'talk', 1 / 60, f / 60, false, player); if (!frames.includes(f)) continue;
    n.group.updateMatrixWorld(true); inv.copy(n.group.matrixWorld).invert(); let kneeY = 9; for (const k of n.knees) kneeY = Math.min(kneeY, n.group.worldToLocal(k.getWorldPosition(kn)).y);
    dir.set(0, 0, -1).transformDirection(n.group.matrixWorld); const best = new Map<number, number>();
    for (const m of P) { const pa = m.geometry.attributes.position, ix = m.geometry.index, nt = (ix ? ix.count : pa.count) / 3, vi = (t: number) => ix ? ix.getX(t) : t, A = new T.Vector3(), B = new T.Vector3(), C = new T.Vector3(), E1 = new T.Vector3(), E2 = new T.Vector3();
      for (let t = 0; t < nt; t++) { A.fromBufferAttribute(pa, vi(3 * t)).applyMatrix4(m.matrixWorld); B.fromBufferAttribute(pa, vi(3 * t + 1)).applyMatrix4(m.matrixWorld); C.fromBufferAttribute(pa, vi(3 * t + 2)).applyMatrix4(m.matrixWorld);
        nr.crossVectors(E1.subVectors(B, A), E2.subVectors(C, A)).normalize().transformDirection(inv); if (nr.z < .35) continue; // (its front face: the lining's faces look in)
        const steps = Math.max(1, Math.ceil(Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A)) / .025));
        for (let i = 0; i <= steps; i++) for (let j = 0; i + j <= steps; j++) { v.copy(A).addScaledVector(E1, i / steps).addScaledVector(E2, j / steps); const lp = v.clone().applyMatrix4(inv); if (lp.y < kneeY + .04 || lp.z < .02) continue;
          const k = Math.floor(lp.y / .04); ray.set(v, dir); ray.far = .12; const h = ray.intersectObjects(S, false)[0]; if (!best.has(k)) best.set(k, 9); if (h && h.distance < best.get(k)!) best.set(k, h.distance); } } }
    for (const [k, g] of best) { if (g > 8) { bare++; continue; } sum += g; slices++; if (g > worst) { worst = g; where = `at ${(k * 4)} cm, frame ${f}`; } } }
  return { worst, mean: slices ? sum / slices : 0, bare, where, slices };
}

const APRONS: [string, number][] = [['olderMechanic.sturdy.broad:olderMechanic.apron', 5], ['olderMechanic.standard.narrow:olderMechanic.apron', 2], ['shopMerchant.standard.broad', 9], ['foundry.sturdy.broad', 7],
  ['stallholder.sturdy.broad:stallholder.apron', 3], ['stallholder.standard.narrow', 8]];
test('an apron hangs on the belly and thighs: standing, a centimetre or two off them at every height, and in a stride it stays on the leading thigh, not off it like a board', () => {
  // People XXV: the review saw the older mechanic's, the merchant's and the foundry worker's aprons stand 8-10 cm off the thighs under the belly (a bell cut on the skirt's rings, a plank in
  // side view) and in stride stay a rigid rectangle with an air gap to the leg. Now its front is cut to the belly, the pelvis, the thighs and the shin (wardrobe.ts `hugRings`), and in a
  // stride the cloth is pushed ahead by the thigh and the knee at their own heights (drape.ts `shapePanel`). Measured from the front face level to what is behind it, the nearest thing at each height
  // (the worst slice standing is the crotch, where the pelvis steps back 6 cm into the tops of the thighs and cloth can only bridge).
  for (const [combo, seed] of APRONS) {
    const s = apronGap(combo, seed, 'stand'); assert.ok(s.slices > 8 && s.bare === 0, `${combo}: only ${s.slices} slices measured standing, ${s.bare} bare`);
    assert.ok(s.mean <= .018 && s.worst <= .06, `${combo} s${seed} standing: the apron is ${(s.mean * 100).toFixed(1)} cm off on average and ${(s.worst * 100).toFixed(1)} cm at worst (${s.where})`);
    const w = apronGap(combo, seed, 'walk'); assert.ok(w.slices > 50 && w.bare <= 4, `${combo}: only ${w.slices} slices measured walking (${w.bare} bare)`);
    assert.ok(w.mean <= .03 && w.worst <= .1, `${combo} s${seed} in stride: the apron is ${(w.mean * 100).toFixed(1)} cm off on average and ${(w.worst * 100).toFixed(1)} cm at worst (${w.where})`);
  }
});

test('an apron in stride bends over the leading thigh and its hem is a curve: the cloth is pushed ahead by different amounts at different heights, and its foot is not a level edge', () => {
  const player = new T.Vector3(0, 1.7, 25);
  for (const [combo, seed] of APRONS.filter(([c]) => !c.includes('stallholder'))) {
    const n = make(combo, seed), skin = () => n.drape!.panel!.skin; let fold = 0;
    for (let f = 0; f < 60 * 4; f++) { n.group.position.set(0, 0, f / 60 * 1.3); animateLife(n, 'walk', 1 / 60, f / 60, false, player); const s = skin(); if (f < 120 || !s) continue;
      const rows = s.ys.map((y, i) => [y, s.dz[i]]).filter(([y]) => y < -.05 && y > -.5).map(([, d]) => d); fold = Math.max(fold, Math.max(...rows) - Math.min(...rows)); }
    assert.ok(fold > .04, `${combo} s${seed}: in stride the cloth is pushed ahead by the same amount (${(fold * 100).toFixed(1)} cm) at every height, a board`);
    // the foot: the lowest row of the hinge's part, its middle and its corners
    let lo = 9, mid = 9, edge = 9, wx = 0; const v = new T.Vector3(), foot = n.drape!.panel!.hem ?? n.drape!.panel!.tails; foot.traverse(o => { if (o instanceof T.Mesh) { const pa = o.geometry.attributes.position; for (let j = 0; j < pa.count; j++) { lo = Math.min(lo, pa.getY(j)); wx = Math.max(wx, Math.abs(pa.getX(j))); } } });
    foot.traverse(o => { if (o instanceof T.Mesh) { const pa = o.geometry.attributes.position; for (let j = 0; j < pa.count; j++) { v.fromBufferAttribute(pa, j); if (v.y > lo + .12) continue; const u = Math.abs(v.x) / wx; if (u < .15) mid = Math.min(mid, v.y); if (u > .8) edge = Math.min(edge, v.y); } } });
    assert.ok(edge - mid > .02, `${combo} s${seed}: the hem is a level edge (corners ${((edge - mid) * 100).toFixed(1)} cm above the middle)`);
  }
});
