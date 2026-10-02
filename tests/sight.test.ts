import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineOfSight } from '../src/world/patrol.ts';
import type { Collider } from '../src/world/city.ts';

const at = (x: number, z: number, w: number, d: number, height = 30, base?: number): Collider => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height, base });
// The Great Main under the Market Bridge-house: two piers, the room and the roof parapets over the arch, a trestle.
const street = { colliders: [at(-12.6, 5.6, 1.6, 3.2), at(12.6, 5.6, 1.6, 3.2), at(-3.2, 3.95, 6.6, .1, 11.6, 8.2), at(0, 3.2, 26.3, .3, 15.1, 13.8), at(4, 10.4, 4, .3, 1.2)] };
test('the open arch is seen through at street level; its piers and buildings are not', () => {
  assert.equal(lineOfSight(street, -1.55, 9.5, 0, -10, 3.75), true, 'under the arch, past the room and parapets overhead');
  assert.equal(lineOfSight(street, -1.55, 9.5, 4, 14, 3.75), true, 'over a waist-high trestle');
  assert.equal(lineOfSight(street, -1.55, 9.5, 14, 5.6, 3.75), false, 'behind a pier');
});
test('something overhead blocks only eyes raised to it', () => {
  assert.equal(lineOfSight(street, -1.55, 9.5, -3, -2, 9), false, 'level with the room over the arch, its wall is in the way');
  assert.equal(lineOfSight(street, -1.55, 9.5, -3, -2, 3.75), true);
  assert.equal(lineOfSight(street, -1.55, 9.5, -3, -2), false, 'asked without eyes, everything stands from the ground up, as it always has');
});
