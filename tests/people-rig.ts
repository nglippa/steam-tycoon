// A Citizen built in node, the same shape citizens.ts `finish` returns, to run animateLife in a test without a browser (People XIX).
import * as T from 'three';
import { buildFigure, BUILT, type Kit } from '../src/world/people/figure.ts';
import { resolveLook, CASTS, type CastId } from '../src/world/people/look.ts';
import { footing } from '../src/simulation/gait.ts';
import { mannerOf, seedOf, newMood } from '../src/simulation/occupation.ts';
import type { Citizen } from '../src/world/citizens.ts';
import { drapeState } from '../src/world/drape.ts';

const plain = () => new T.MeshBasicMaterial();
export const kit = (): Kit => ({ cloth: plain, plain, skin: [plain(), plain(), plain()], face: plain, bake: g => g, contact: new T.Mesh(new T.CircleGeometry(.28, 8), plain()) });
export const REPS: [string, string, number][] = [
  ['slim civilian', 'rowSkirt.slim.narrow', 1], ['standard civilian', 'rowCoat.standard.broad', 2], ['sturdy civilian', 'stallholder.sturdy.broad', 3],
  ['young mechanic', 'youngMechanic.slim.narrow', 4], ['older mechanic', 'olderMechanic.sturdy.broad', 5], ['labourer', 'labourer.standard.broad', 6],
  ['foundry worker', 'foundry.sturdy.broad', 7], ['stallholder', 'stallholder.standard.narrow', 8], ['shop merchant', 'shopMerchant.standard.broad', 9],
  ['garrison soldier', 'garrison.sturdy.broad', 10], ['inspector', 'inspector.standard.broad', 11],
];
/** `combo` is cast.family.frame, optionally with an outfit after a colon (`stallholder.sturdy.broad:stallholder.shawl`, in the outfit's first palette): the seed draws the rest. */
export function make(combo: string, seed: number): Citizen {
  const [cut, outfit] = combo.split(':'), [cast, family, frame] = cut.split('.') as [CastId, never, never], archetype = CASTS[cast].archetype;
  const drawn = resolveLook(seed, archetype, { cast, family, frame, casts: BUILT }), o = outfit ? CASTS[cast].outfits.find(x => x.id === outfit) : undefined;
  if (outfit && !o) throw new Error(`people-rig: ${cast} has no outfit ${outfit}`);
  const look = o ? { ...drawn, outfit: o.id, palette: Object.keys(o.palettes)[0] } : drawn;
  const f = buildFigure(look, { solo: true }, kit()); f.group.userData.next = true;
  const { faceMat, ...n } = f; void faceMat;
  const motion = { stride: seed * 1.3, latch: footing(), gait: 0, speed: 0, prevX: NaN, prevZ: 0, prevYaw: 0, turn: 0, tail: 0, tailV: 0, hair: 0, hairV: 0, tempo: .88 + ((seed * 37) % 25) / 100, idle: 0, drape: 1, cloth: drapeState(), pose: null as Float32Array | null, mood: newMood(), pick: Math.abs(Math.sin(seed * 12.9898 + 1.7) * 43758.5453) % 1 };
  return { ...n, archetype, motion, phase: seed * 1.7, expression: 'neutral', gaze: 'away', manner: mannerOf(archetype, seedOf(seed)), tone: undefined, packed: 0, setExpression() {} } as unknown as Citizen;
}

/** Whether any leg vertex is visible through the long cloth: walking `combo` at `speed`, every 3rd frame for 1.5 s after a 2 s warm-up, a ray from each leg vertex (every 3rd) toward the
 *  pelvis axis at its height that crosses a wall of the cloth (tails and hem) while a ray outward finds no cloth: the vertex is outside the cloth with cloth behind it. Returns the frames with
 *  any such vertex and the farthest one's depth (m). */
export function through(combo: string, seed: number, activity: import('../src/world/citizen-life.ts').Activity, speed: number) {
  const n = make(combo, seed), ray = new T.Raycaster(), inv = new T.Matrix4(), cloth: T.Mesh[] = [], player = new T.Vector3(0, 1.7, 25), dt = 1 / 60, V = new T.Vector3(), A = new T.Vector3(), dir = new T.Vector3();
  n.group.traverse(o => { if (o instanceof T.Mesh) (o.material as T.Material).side = T.DoubleSide; }); n.tails.traverse(o => { if (o instanceof T.Mesh) cloth.push(o); });
  let worst = 0, bad = 0, frames = 0, where = '';
  for (let f = 0; f < 210; f++) { const t = f * dt; n.group.position.set(0, 0, t * speed); animate(n, activity, dt, t, player); n.group.updateMatrixWorld(true);
    if (f < 120 || f % 3) continue; frames++; inv.copy(n.pelvis.matrixWorld).invert(); let fw = 0;
    for (const lg of n.legs) lg.traverse(o => { if (!(o instanceof T.Mesh)) return; const pa = o.geometry.attributes.position;
      for (let k = 0; k < pa.count; k += 3) { V.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld); const loc = V.clone().applyMatrix4(inv); if (loc.y > .9) continue;
        A.set(0, loc.y, 0).applyMatrix4(n.pelvis.matrixWorld); dir.subVectors(A, V); const far = dir.length(); dir.normalize(); ray.set(V, dir); ray.far = far;
        const hit = ray.intersectObjects(cloth, false).find(h => { if (!h.face || Math.abs(h.face.normal.clone().transformDirection(h.object.matrixWorld).y) > .6) return false; const q = h.point.clone().applyMatrix4(inv); return Math.hypot(q.x, q.z) > .05; });
        if (!hit || hit.distance < .002) continue; ray.set(V, dir.clone().negate()); ray.far = 1; if (ray.intersectObjects(cloth, false).length) continue;
        if (hit.distance > fw) fw = hit.distance; if (hit.distance > worst) { worst = hit.distance; where = `leg vertex at (${loc.x.toFixed(2)}, ${loc.y.toFixed(2)}, ${loc.z.toFixed(2)}) in the pelvis frame, frame ${f}`; } } });
    if (fw > .002) bad++; }
  return { worst, bad, frames, where };
}
let animate: (n: Citizen, a: import('../src/world/citizen-life.ts').Activity, dt: number, t: number, p: T.Vector3) => void = () => { throw new Error('people-rig: call useLife(animateLife) first'); };
/** The rig does not import animateLife itself (a test may want the module fresh); hand it in once. */
export const useLife = (f: typeof animate) => { animate = f; };

/** How deep a hand or forearm goes into a carried prop (a pouch, a tool roll, a ledger, a truncheon: meshes marked userData.prop), over `frames` frames of `activity` at `speed`: each arm
 *  vertex is taken into the prop's own frame and tested against its box, shrunk by 2 mm. Returns the deepest (m) and where. */
export function intoProps(combo: string, seed: number, activity: import('../src/world/citizen-life.ts').Activity, speed: number, frames = 150) {
  const n = make(combo, seed), player = new T.Vector3(0, 1.7, 25), dt = 1 / 60, props: T.Mesh[] = [], v = new T.Vector3(), inv = new T.Matrix4();
  n.group.traverse(o => { if (o instanceof T.Mesh && o.userData.prop) props.push(o); });
  for (const p of props) p.geometry.computeBoundingBox();
  let worst = 0, where = '';
  for (let f = 0; f < 120 + frames; f++) { n.group.position.set(0, 0, f * dt * speed); animate(n, activity, dt, f * dt, player); if (f < 120 || f % 2) continue; n.group.updateMatrixWorld(true);
    for (const p of props) { inv.copy(p.matrixWorld).invert(); const bb = p.geometry.boundingBox!;
      for (const el of n.elbows) el.traverse(o => { if (!(o instanceof T.Mesh)) return; const pa = o.geometry.attributes.position;
        for (let k = 0; k < pa.count; k += 2) { v.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
          const d = Math.min(v.x - bb.min.x, bb.max.x - v.x, v.y - bb.min.y, bb.max.y - v.y, v.z - bb.min.z, bb.max.z - v.z) - .002; if (d > worst) { worst = d; where = `frame ${f}, ${p.parent === n.tails ? 'on the coat skirt' : 'on the body'}`; } } }); } }
  return { worst, where, props: props.length };
}

/** Whether a front panel (an apron, the foundry slab) reads as in front of the legs from the side (People XXII). Walking `combo` at `speed` along its line of walk for the cast sheet's 48-frame
 *  stride window (30 Hz, after its 3 s warm-up), every 3rd frame: rays along the figure's x from each side on a 1 cm grid (its height and the line of walk) whose first hit is a leg (thigh,
 *  knee or shin) with the panel (tails and hem) further along, the leg drawn over the apron (`over`, cm², the worst frame and side); and how far the front of the panel's hem (its lowest
 *  3 cm) is behind the front of a leg at the same height (`behind`, m; 0 or less is the hem in front of or on the leg). */
export function panelSide(combo: string, seed: number, speed: number) {
  const n = make(combo, seed), player = new T.Vector3(0, 1.7, 25), ray = new T.Raycaster(), P: T.Mesh[] = [], H: T.Mesh[] = [], Lg: T.Mesh[] = [], feet = new Set<T.Object3D>(), dt = 1 / 30;
  const o = new T.Vector3(), d = new T.Vector3(), v = new T.Vector3(), inv = new T.Matrix4();
  n.tails.traverse(m => { if (m instanceof T.Mesh) P.push(m); }); n.hem!.traverse(m => { if (m instanceof T.Mesh) H.push(m); }); n.ankles.forEach(a => a.traverse(m => feet.add(m)));
  n.group.traverse(m => { if (m instanceof T.Mesh) (m.material as T.Material).side = T.DoubleSide; }); n.legs.forEach(l => l.traverse(m => { if (m instanceof T.Mesh && !feet.has(m)) Lg.push(m); }));
  const each = (ms: T.Mesh[], f: (p: T.Vector3) => void) => { for (const m of ms) { const pa = m.geometry.attributes.position; for (let j = 0; j < pa.count; j++) f(v.fromBufferAttribute(pa, j).applyMatrix4(m.matrixWorld).applyMatrix4(inv)); } };
  let over = 0, behind = -1, where = '', at = '';
  for (let i = 0; i < 90 + 48; i++) { n.group.position.set(0, 0, i * dt * speed); animate(n, 'walk', dt, i * dt, player); if (i < 90 || (i - 90) % 3) continue; n.group.updateMatrixWorld(true); inv.copy(n.group.matrixWorld).invert();
    const box = new T.Box3(); each(Lg, p => { box.expandByPoint(p); }); // (only where a leg is can one be drawn over the apron)
    for (const side of [-1, 1]) { let cells = 0;
      for (let y = .9; y > .05; y -= .01) for (let z = -.15; z < .6; z += .01) { if (y < box.min.y || y > box.max.y || z < box.min.z || z > box.max.z) continue; n.group.localToWorld(o.set(side, y, z)); d.set(-side, 0, 0).transformDirection(n.group.matrixWorld); ray.set(o, d); ray.far = 2;
        const hs = ray.intersectObjects([...P, ...Lg], false); if (hs.length && Lg.includes(hs[0].object as T.Mesh) && hs.some(h => P.includes(h.object as T.Mesh))) cells++; }
      if (cells > over) { over = cells; where = `stride frame ${i - 90}, seen from ${side < 0 ? 'its right' : 'its left'}`; } }
    let lo = 9, hz = -9, lz = -9; each(H, p => { lo = Math.min(lo, p.y); }); each(H, p => { if (p.y < lo + .03) hz = Math.max(hz, p.z); }); each(Lg, p => { if (p.y > lo && p.y < lo + .03) lz = Math.max(lz, p.z); });
    if (lz - hz > behind) { behind = lz - hz; at = `stride frame ${i - 90}`; } }
  return { over, where, behind, at };
}
