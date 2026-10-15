import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { CASTS, paletteOf, resolveLook, type CastId, type Look } from '../src/world/people/look.ts';
import { buildFigure } from '../src/world/people/figure.ts';
import { kit } from './people-rig.ts';

/** People XX: the casts QA found alike at ~50 px each carry their own value or silhouette cue (Book 4, "Telling the dark coats apart"). */
const lum = (hex: string) => { const c = new T.Color(hex); return .2126 * c.r + .7152 * c.g + .0722 * c.b; }; // linear
const look = (cast: CastId, family: Look['family'], frame: Look['frame'], seed = 3) => resolveLook(seed, CASTS[cast].archetype, { cast, family, frame });

test('the garrison soldier wears a light crossbelt and belt on the dark greatcoat', () => {
  const p = paletteOf(look('garrison', 'sturdy', 'broad'));
  assert.ok(lum(p.crossbelt) > 4 * lum(p.greatcoat), `crossbelt ${p.crossbelt} vs greatcoat ${p.greatcoat}`);
});

test('the older mechanic never wears a coat as dark as the Ordinance', () => {
  const ord = lum(paletteOf(look('inspector', 'standard', 'broad')).coat);
  for (const o of CASTS.olderMechanic.outfits) for (const [id, sw] of Object.entries(o.palettes)) {
    const l = { ...look('olderMechanic', 'sturdy', 'broad'), outfit: o.id, palette: id }, top = paletteOf(l).shopCoat; void sw;
    assert.ok(lum(top) > 3 * ord, `${o.id}/${id}: ${top} is a dark coat`);
  }
});

test('the sturdy stallholder is sturdier in outline than the standard one, not the same outline scaled', () => {
  const width = (l: Look, y0: number, y1: number) => { const g = buildFigure(l, { solo: true }, kit()).group; g.updateMatrixWorld(true); let w = 0; const v = new T.Vector3();
    g.traverse(o => { if (o instanceof T.Mesh) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); if (v.y > y0 && v.y < y1) w = Math.max(w, Math.abs(v.x)); } } }); return 2 * w; };
  const sd = { ...look('stallholder', 'standard', 'narrow'), stature: 1 }, su = { ...look('stallholder', 'sturdy', 'broad'), stature: 1 };
  const hemRatio = width(su, .15, .35) / width(sd, .15, .35); // (the two skirts were cut to one hem: the same outline under a wider top)
  assert.ok(hemRatio >= 1.15, `the sturdy hem is ${hemRatio.toFixed(2)}x the standard`);
});

test('at 50 px the three pairs the review found alike keep apart: same-scale silhouette IoU under .78, front and side', async () => {
  // People XXVIII: the young mechanic's hip-length jacket left only the cap's peak to tell him from the labourer from the side (.838); he now wears a skirted jacket with a tail, and the
  // Ordinance's coats differ in length and in the shoulder. Measured as tools/variety-measure.ts does (the sheet's standing pose, the silhouette rasterised front and side).
  const { silhouettes } = await import('../tools/variety-measure.ts');
  for (const p of silhouettes()) { assert.ok(p.front < .78, `${p.a} / ${p.b}: front ${p.front.toFixed(3)}`); assert.ok(p.side < .78, `${p.a} / ${p.b}: side ${p.side.toFixed(3)}`); }
});

test('the sleeve cap is set in for men and the Ordinance and gathered only on the women\'s blouses: its top above the shoulder pivot', async () => {
  // People XXVIII: every upper sleeve ended in a dome the whole radius of the shoulder (6-7 cm above the pivot, 2-3 cm over the trapezius), the "bump" on nine of eleven. A set-in cap (SET_CAP) rises
  // 2-4 cm; the puffed cap stays on the rowSkirt and stallholder blouses and the bonnet lady's frock.
  const { make, REPS } = await import('./people-rig.ts');
  const capTop = (combo: string, seed: number) => { const n = make(combo, seed), v = new T.Vector3(); let top = -9; const sleeve = n.arms[0].children.find(o => o instanceof T.Mesh) as T.Mesh; // (the sleeve is the first mesh; boards and bands come after)
    const pa = sleeve.geometry.attributes.position; for (let i = 0; i < pa.count; i++) top = Math.max(top, v.fromBufferAttribute(pa, i).applyMatrix4(sleeve.matrix).y); return top; };
  const puffed = ['rowSkirt.slim.narrow', 'stallholder.sturdy.broad', 'stallholder.standard.narrow'];
  for (const [label, combo, seed] of REPS) { const h = capTop(combo, seed);
    if (puffed.includes(combo)) assert.ok(h >= .06, `${label}: the blouse's cap is ${(h * 100).toFixed(1)} cm above the pivot`); else assert.ok(h <= .045, `${label}: the cap is ${(h * 100).toFixed(1)} cm above the pivot`); }
});

/** How far a shell stands up out of the sleeve at the point of the shoulder (People XXIX): the coat's, shirt's and vest's shells are lofts over the ribcage, whose shoulder-girdle corner stood
 *  at the anatomical point of the shoulder (1.5 m on a sturdy man) while a set-in sleeve's cap tops out 3.5 cm lower, so the corner showed as a horn at each shoulder (the older mechanic,
 *  front). In the body's frame, every vertex of the torso's garments (arms, head, hair, hats and the skirts excluded) at or beyond 3.5 cm inboard of the pivot and over it
 *  is compared with the highest point of the arms' meshes within 1.5 cm of it sideways. Returns the largest excess (m) and where. */
export async function shoulderHorn(combo: string, seed: number) {
  const { make } = await import('./people-rig.ts');
  const n = make(combo, seed); n.group.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(n.body.matrixWorld).invert(), v = new T.Vector3(), piv = new T.Vector3().setFromMatrixPosition(n.arms[1].matrixWorld).applyMatrix4(inv), skip = new Set<T.Object3D>();
  for (const root of [...n.arms, n.head, n.tails, n.scarf]) root?.traverse(o => skip.add(o));
  const cap: [number, number][] = []; // (|x|, y) of every arm vertex over the elbow, in the body frame
  for (const a of n.arms) a.traverse(o => { if (!(o instanceof T.Mesh)) return; const pa = o.geometry.attributes.position;
    for (let j = 0; j < pa.count; j++) { v.fromBufferAttribute(pa, j).applyMatrix4(o.matrixWorld).applyMatrix4(inv); if (v.y > piv.y - .13) cap.push([Math.abs(v.x), v.y]); } });
  let worst = 0, where = ''; const x0 = Math.abs(piv.x) - .035; // (inboard of that the shoulder line climbs to the neck, over no sleeve)
  n.body.traverse(o => { if (!(o instanceof T.Mesh) || skip.has(o)) return; const pa = o.geometry.attributes.position;
    for (let j = 0; j < pa.count; j++) { v.fromBufferAttribute(pa, j).applyMatrix4(o.matrixWorld).applyMatrix4(inv); const ax = Math.abs(v.x); if (ax < x0 || v.y < piv.y || v.y > piv.y + .2) continue;
      let top = -9; for (const [cx, cy] of cap) if (Math.abs(cx - ax) < .015 && cy > top) top = cy; if (top < 0) continue;
      if (v.y - top > worst) { worst = v.y - top; where = `${o.parent?.name ?? ''}/${(o.geometry as T.BufferGeometry).attributes.position.count}v x ${ax.toFixed(3)} y ${v.y.toFixed(3)} over the sleeve's ${top.toFixed(3)}`; } } });
  return { worst, where };
}
test('no garment shell stands up out of the sleeve at the point of the shoulder: within 1 cm of the cap on every cast and build (2.5 cm on the garrison, its epaulette lying on it, and 2 cm on a courier, its satchel strap)', async () => {
  const { REPS } = await import('./people-rig.ts');
  const casts: [string, number][] = [...REPS.map(([, c, s]) => [c, s] as [string, number]), ['olderMechanic.standard.narrow', 2], ['olderMechanic.sturdy.broad:olderMechanic.apron', 5], ['garrison.slim.broad', 7], ['garrison.standard.narrow', 3],
    ['inspector.slim.broad', 1], ['youngMechanic.standard.broad', 6], ['labourer.sturdy.broad', 4], ['foundry.standard.broad', 2], ['shopMerchant.sturdy.broad', 3], ['elder.slim.narrow', 5], ['courier.slim.broad', 2], ['affluent.standard.broad', 2], ['child.child.narrow', 3]];
  for (const [combo, seed] of casts) { const r = await shoulderHorn(combo, seed); assert.ok(r.worst <= (/^garrison|^look:/.test(combo) ? .025 : /^courier/.test(combo) ? .02 : .01), `${combo} s${seed}: a shell stands ${(r.worst * 100).toFixed(1)} cm over the cap at ${r.where}`); }
});
