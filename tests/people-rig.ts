// A Citizen built in node, the same shape citizens.ts `finish` returns, to run animateLife in a test without a browser (People XIX).
import * as T from 'three';
import { buildFigure, BUILT, type Kit } from '../src/world/people/figure.ts';
import { resolveLook, CASTS, type CastId } from '../src/world/people/look.ts';
import { footing } from '../src/simulation/gait.ts';
import { mannerOf, seedOf, newMood } from '../src/simulation/occupation.ts';
import type { Citizen } from '../src/world/citizens.ts';

const plain = () => new T.MeshBasicMaterial();
export const kit = (): Kit => ({ cloth: plain, plain, skin: [plain(), plain(), plain()], face: plain, bake: g => g, contact: new T.Mesh(new T.CircleGeometry(.28, 8), plain()) });
export const REPS: [string, string, number][] = [
  ['slim civilian', 'rowSkirt.slim.narrow', 1], ['standard civilian', 'rowCoat.standard.broad', 2], ['sturdy civilian', 'stallholder.sturdy.broad', 3],
  ['young mechanic', 'youngMechanic.slim.narrow', 4], ['older mechanic', 'olderMechanic.sturdy.broad', 5], ['labourer', 'labourer.standard.broad', 6],
  ['foundry worker', 'foundry.sturdy.broad', 7], ['stallholder', 'stallholder.standard.narrow', 8], ['shop merchant', 'shopMerchant.standard.broad', 9],
  ['garrison soldier', 'garrison.sturdy.broad', 10], ['inspector', 'inspector.standard.broad', 11],
];
export function make(combo: string, seed: number): Citizen {
  const [cast, family, frame] = combo.split('.') as [CastId, never, never], archetype = CASTS[cast].archetype;
  const look = resolveLook(seed, archetype, { cast, family, frame, casts: BUILT });
  const f = buildFigure(look, { solo: true }, kit()); f.group.userData.next = true;
  const { faceMat, ...n } = f; void faceMat;
  const motion = { stride: seed * 1.3, latch: footing(), gait: 0, speed: 0, prevX: NaN, prevZ: 0, prevYaw: 0, turn: 0, tail: 0, tailV: 0, hair: 0, hairV: 0, tempo: .88 + ((seed * 37) % 25) / 100, idle: 0, drape: 1, pose: null as Float32Array | null, mood: newMood(), pick: Math.abs(Math.sin(seed * 12.9898 + 1.7) * 43758.5453) % 1 };
  return { ...n, archetype, motion, phase: seed * 1.7, expression: 'neutral', gaze: 'away', manner: mannerOf(archetype, seedOf(seed)), tone: undefined, packed: 0, setExpression() {} } as unknown as Citizen;
}
