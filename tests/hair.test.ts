import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { hairOf } from '../src/world/people/hair.ts';
import { hatOf, seatOf } from '../src/world/people/hat.ts';
import { skull } from '../src/world/people/head.ts';
import { landmarks } from '../src/world/people/headform.ts';
import { HAT_HAIR, type Hat, type HeadShape, type Look } from '../src/world/people/look.ts';
import { STYLES, base, stats, hairGeos, alike } from '../tools/hair-measure.ts';

/** Hair and hats against the skull (Book 7 and 13). These test the rules, not coordinates: the outline of every style is its own and not the skull's, and a hat covers what it
 *  sits on: no hair and no skull comes through its crown, for every pairing the tables allow. */

test("no style's outline is the skull's outline pushed out evenly, and no two styles share a silhouette", () => {
  const sig: Record<string, { front: number[]; side: number[] }> = {};
  for (const s of STYLES) {
    const g = hairGeos(s), f = stats(g, 'front'), d = stats(g, 'side'); sig[s] = { front: f.r, side: d.r };
    // a helmet: a high, even offset with the skull showing nowhere. Every style has either an uneven outline (sd of the offset >= 1 cm in one view) or skull showing on its outline
    assert.ok(Math.max(f.sd, d.sd) >= 1 || Math.max(f.skullShows, d.skullShows) >= 40, `${s}: outline sd ${f.sd} / ${d.sd} cm`);
    // the masses stand off the scalp: somewhere the outline is at least 1.5 cm out
    assert.ok(Math.max(f.max, d.max) >= 1.5, `${s}: the outline never leaves the skull by 1.5 cm`);
  }
  for (let i = 0; i < STYLES.length; i++) for (let j = i + 1; j < STYLES.length; j++) {
    const a = sig[STYLES[i]], b = sig[STYLES[j]];
    assert.ok(alike(a.front, b.front) >= .005 && alike(a.side, b.side) >= .005, `${STYLES[i]} and ${STYLES[j]} share a silhouette: front ${alike(a.front, b.front).toFixed(4)}, side ${alike(a.side, b.side).toFixed(4)} m`);
  }
});

/** Every vertex of `pts` that a ray from the ball's centre carries into the hat must be inside it: the hat's farthest surface along that ray lies beyond the vertex. */
function poking(hat: T.Mesh[], pts: T.Vector3[], c: T.Vector3) {
  const ray = new T.Raycaster(), bad: T.Vector3[] = [];
  for (const p of pts) {
    const dir = p.clone().sub(c), dist = dir.length(); ray.set(c, dir.normalize()); ray.far = 1;
    const hits = ray.intersectObjects(hat, false); if (!hits.length) continue;
    if (Math.max(...hits.map(h => h.distance)) < dist - .0015) bad.push(p);
  }
  return bad;
}
test('every hat with every hair it allows: no hair and no skull comes through the crown, and hair shows below the band', () => {
  const shapes: HeadShape[] = ['oval', 'square', 'long', 'heart'], mat = new T.MeshBasicMaterial({ side: T.DoubleSide });
  for (const hat of (Object.keys(HAT_HAIR) as Hat[]).filter(h => h !== 'none')) for (const hair of HAT_HAIR[hat]) for (const headShape of shapes) for (const faceType of [0, 1]) for (const h of [.275, .295]) {
    const look: Look = { ...base, hat, hairStyle: hair, headShape, faceType }, L = landmarks(h, headShape), c = new T.Vector3(0, L.ballY, L.z0);
    const o = hatOf(look, h), meshes = [...o.cloth, ...o.trim].map(g => new T.Mesh(g, mat)), hg = hairOf(look, h, true);
    const pts: T.Vector3[] = [];
    for (const g of [...hg.hair, ...hg.under, ...hg.swing, skull(look, h)]) { const p = g.attributes.position; for (let i = 0; i < p.count; i += 2) pts.push(new T.Vector3().fromBufferAttribute(p, i)); }
    const bad = poking(meshes, pts, c);
    assert.equal(bad.length, 0, `${hat} on ${hair} (${headShape}, ${faceType}, h ${h}): ${bad.length} points come through, e.g. ${bad[0]?.toArray().map(v => v.toFixed(3))}`);
    // something of the hair shows under the hat: some hair lies below the seat
    const seat = seatOf(hat as Exclude<Hat, 'none'>), k = h / .285, below = hg.hair.some(g => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i) - L.z0); if (p.getY(i) < (seat(a) - .01) * k) return true; } return false; });
    assert.ok(below, `${hat} on ${hair}: no hair shows under the hat`);
  }
});
