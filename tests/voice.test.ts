import test from 'node:test';
import assert from 'node:assert/strict';
import { VOICE } from '../src/simulation/voice.ts';
import { caught } from '../src/simulation/occupation.ts';

test('the regime says citizen, never Steward', () => {
  const lines = Object.values(VOICE).map(v => typeof v === 'string' ? v : v(3 as never));
  for (const l of lines) assert.ok(!/Steward/.test(l), l);
  assert.ok(lines.filter(l => /citizen/.test(l)).length >= 9);
  for (const heat of [0, 1, 2, 3, 4]) for (const kind of ['minor', 'contraband', 'curfew'] as const) assert.ok(!/Steward/.test(caught(heat, kind, 500, 5).message));
});
