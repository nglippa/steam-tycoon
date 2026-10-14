import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { buildFigure, siteScale, type Kit } from '../src/world/people/figure.ts';
import { resolveLook, type Look } from '../src/world/people/look.ts';

const plain = () => new T.MeshBasicMaterial();
const kit = (): Kit => ({ cloth: plain, plain, skin: [plain(), plain(), plain()], face: plain, bake: g => g, contact: new T.Mesh(new T.CircleGeometry(.28, 8), plain()) });
/** The crown above the sole of a figure as the game spawns it (the spawn site's scale included), with no hair or hat: the top of its world bounding box. */
function crown(look: Look, scale: number | undefined, child: boolean) {
  const f = buildFigure(look, { solo: true, bare: true }, kit());
  f.group.scale.multiplyScalar(siteScale(scale, child, true)); f.group.updateMatrixWorld(true);
  const sole = Math.min(...f.ankles.map(a => new T.Box3().setFromObject(a).min.y));
  return new T.Box3().setFromObject(f.group).max.y - sole;
}

test('a child stands at an adult\'s chest to shoulder: the crown, as spawned, is between .6 and .8 of an adult\'s', () => {
  for (const seed of [0, 3, 11]) {
    const adult = crown(resolveLook(seed, 'resident', { cast: 'rowCoat', family: 'standard', frame: 'broad' }), undefined, false);
    const child = crown(resolveLook(seed, 'resident', { cast: 'child', family: 'child', frame: 'narrow' }), .72, true);
    assert.ok(child < .8 * adult && child > .6 * adult, `seed ${seed}: child crown ${child.toFixed(3)} m against an adult's ${adult.toFixed(3)} m`);
  }
});

test('the spawn site scales an old-builder child and never scales a new-builder child a second time', () => {
  assert.equal(siteScale(.72, true, false), .72);
  assert.equal(siteScale(.72, true, true), 1);
  assert.equal(siteScale(undefined, false, true), 1);
  assert.equal(siteScale(1.1, false, true), 1.1);
});
