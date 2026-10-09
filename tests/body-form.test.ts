import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimsOf, ribcage, pelvis } from '../src/world/people/body.ts';
import { ringAt, type Ring } from '../src/world/people/loft.ts';

const BODIES = [...(['slim', 'standard', 'sturdy'] as const).flatMap(f => (['broad', 'narrow'] as const).map(fr => [f, fr] as const)), ['child', 'narrow'] as const];
const front = (r: Ring) => (r.z ?? 0) + r.f, back = (r: Ring) => (r.z ?? 0) - r.b;

test('the torso is an S in profile (People XXVI): the chest stands forward of the waist, the shoulder blades and the seat stand behind the small of the back', () => {
  // Book 5, Torso: the body reference's profile, every family and frame. A plank (a back line straight from the collar to the hip, the chest barely forward of the waist) is the fail.
  for (const [family, frame] of BODIES) {
    const d = dimsOf(family, frame), rib = ribcage(d), pel = pelvis(d), label = `${family}/${frame}`;
    const chest = ringAt(rib, 1.33), waist = ringAt(rib, 1.1), seat = ringAt(pel, .93), adult = family !== 'child';
    const depth = (r: Ring) => r.f + r.b;
    // (a sturdy body's belly carries forward of the chest line, and a child's a little forward, Book 3: their chests are deeper than their waists, by less)
    assert.ok(depth(chest) > depth(waist) + (family === 'sturdy' ? .015 : adult ? .04 : .008), `${label}: chest depth ${depth(chest).toFixed(3)} against the waist's ${depth(waist).toFixed(3)}`);
    if (family !== 'sturdy' && adult) assert.ok(front(chest) > front(waist) + .02, `${label}: the chest stands ${((front(chest) - front(waist)) * 100).toFixed(1)} cm forward of the waist`);
    assert.ok(back(chest) < back(waist) - (adult ? .02 : .01), `${label}: the shoulder blades stand ${((back(waist) - back(chest)) * 100).toFixed(1)} cm behind the small of the back`);
    assert.ok(back(seat) < back(waist) - (adult ? .025 : .012), `${label}: the seat stands ${((back(waist) - back(seat)) * 100).toFixed(1)} cm behind the small of the back`);
    // the waist is the narrowest ring in depth between the chest and the seat, so the profile curves in and out again rather than tapering one way
    for (let y = 1.0; y <= 1.3; y += .02) { const r = y > 1.1 ? ringAt(rib, y) : ringAt(pel, y); assert.ok(back(r) <= back(waist) + 1e-6 || Math.abs(y - 1.1) < .045, `${label}: the back at ${y.toFixed(2)} (${back(r).toFixed(3)}) is in front of the small of the back (${back(waist).toFixed(3)})`); }
  }
});
