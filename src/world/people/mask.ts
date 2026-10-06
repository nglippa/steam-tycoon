import * as T from 'three';
import { surface, sweep, type SweepPt } from './loft';
import { skullRings } from './head';
import type { HeadShape } from './look';

/** The Weathervane's half-mask, fitted to the constructed skull (Book 9, the masked stranger): a dark cloth that lies on the skull's own surface from under the jaw to a top edge that
 *  slopes from just under the eyes at the nose up to the ears (so the eyes show), lifted over the nose wedge, with a knot and two tails over the left ear and a turquoise cross-stitch on
 *  the cheek. In the chin-origin frame of the head group, like the hair and hats. `cloth` and `thread` are the two materials' geometries. */
export function maskOf(shape: HeadShape, h: number): { cloth: T.BufferGeometry[]; thread: T.BufferGeometry[] } {
  const k = h / .285, rg = skullRings(shape, h), C = 24, R = 9, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const top = (a: number) => (.372 + .075 * Math.pow(Math.min(1, Math.abs(a) / 1.5), 1.4)) * h, bottom = .004 * h;
  const at = (a: number, y: number, lift: number) => { const ridge = Math.max(0, 1 - Math.abs(a) / .36) * T.MathUtils.smoothstep(y, .09 * h, .17 * h) * (1 - T.MathUtils.smoothstep(y, .26 * h, .3 * h)) * .02 * k; return surface(rg, Math.max(bottom, y), a, lift + ridge).p; };
  for (let r = 0; r <= R; r++) for (let i = 0; i <= C; i++) { const a = (i / C * 2 - 1) * 1.5, f = r / R, y = bottom + (top(a) - bottom) * f, p = at(a, y, .008 * k + .004 * k * f); pos.push(p.x, p.y, p.z); uv.push(i / C, f); }
  for (let r = 0; r < R; r++) for (let i = 0; i < C; i++) { const a = r * (C + 1) + i, b = a + C + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // the front must face out: flip when the first triangle faces the head's centre
  { const p = g.attributes.position, n = g.attributes.normal, m = Math.floor(R / 2) * (C + 1) + C / 2, c = new T.Vector3(0, .4 * h, rg[0].z ?? 0); if (new T.Vector3(p.getX(m), p.getY(m), p.getZ(m)).sub(c).dot(new T.Vector3(n.getX(m), n.getY(m), n.getZ(m))) < 0) { const ix = g.index!; for (let t = 0; t < ix.count; t += 3) { const x = ix.getX(t + 1); ix.setX(t + 1, ix.getX(t + 2)); ix.setX(t + 2, x); } g.computeVertexNormals(); } }
  const cloth = [g], thread: T.BufferGeometry[] = [];
  // the knot over the left ear and two tails
  const kp = surface(rg, .3 * h, -1.42, .03 * k).p, tails = [[-.012, .15, .14], [.016, .1, -.2]].map(([x, len, tilt]) => sweep([0, .3, .6, 1].map(t => ({ p: [kp.x - .004 + x + tilt * t * .03, kp.y - .01 - t * len * k, kp.z - .006 - t * .012] as [number, number, number], a: .014 * k * (1 + .5 * t), b: .004, n: [1, 0, 0] as [number, number, number] })), { seg: 4, capStart: true, capEnd: true }));
  cloth.push(new T.SphereGeometry(.024 * k, 8, 6).translate(kp.x, kp.y, kp.z), ...tails);
  // the turquoise cross-stitch on the cheek
  const cp = surface(rg, .3 * h, .72, .012 * k);
  for (const rz of [.75, -.75]) { const b = new T.BoxGeometry(.03 * k, .005, .005); b.rotateZ(rz); b.rotateY(.6); b.translate(cp.p.x, cp.p.y, cp.p.z); thread.push(b); }
  void ({} as SweepPt);
  return { cloth, thread };
}
