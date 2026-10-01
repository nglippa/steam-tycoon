import * as T from 'three';
import { box, cyl, sphere, mats, type Material } from './assets';

/** A room is never an empty box with one prop. These are the pieces a small interior is made of;
 * what makes two rooms different is which pieces, how many, and who has been at them.
 * Everything here is static and meant to be baked with the layer it is added to. */

/** A wall's lower band and its rail: gives any wall a scale and a place for things to sit against. */
export function dado(g: T.Object3D, x: number, z: number, length: number, alongX: boolean, m: Material = mats.wood, y = .18, h = 1) {
  box(g, x, y + h / 2, z, alongX ? length : .06, h, alongX ? .06 : length, m); box(g, x, y + h + .03, z, alongX ? length : .1, .06, alongX ? .1 : length, m);
}
/** A ceiling beam across the room. */
export function ceilingBeam(g: T.Object3D, x: number, y: number, z: number, length: number, alongX: boolean, m: Material = mats.wood) { box(g, x, y, z, alongX ? length : .18, .2, alongX ? .18 : length, m); }
/** A hanging lamp: cord, shade and a lit bulb. `shade` says whose room it is. */
export function hangingLamp(g: T.Object3D, x: number, y: number, z: number, drop = .8, shade: Material = mats.iron) {
  cyl(g, x, y - drop / 2, z, .012, drop, mats.iron); const s = new T.Mesh(new T.ConeGeometry(.24, .2, 10, 1, true), shade); s.position.set(x, y - drop, z); g.add(s); sphere(g, x, y - drop - .08, z, .08, mats.glow);
}
/** A filing cabinet: `drawers` high, with brass pulls. `open` pulls one drawer out. Faces +x. */
export function cabinet(g: T.Object3D, x: number, y: number, z: number, m: Material, drawers = 4, open = -1) {
  const h = drawers * .6 + .2; box(g, x, y + h / 2, z, .7, h, .9, m);
  for (let k = 0; k < drawers; k++) { const dy = y + .4 + k * .6, out = k === open ? .32 : 0; if (out) box(g, x + .35 + out / 2, dy, z, out, .46, .8, m); box(g, x + .36 + out, dy, z, .04, .08, .3, mats.brass); }
}
/** Open shelves with things on them. `fill` 0 to 1 is how much is left on the shelves. */
export function shelves(g: T.Object3D, x: number, y: number, z: number, length: number, alongX: boolean, rows = 3, fill = 1, items: Material[] = [mats.copper, mats.brass, mats.cream]) {
  for (let r = 0; r < rows; r++) { const sy = y + .5 + r * .75; box(g, x, sy, z, alongX ? length : .4, .06, alongX ? .4 : length, mats.wood);
    const n = Math.floor(length / .32); for (let k = 0; k < n; k++) { if ((k * 7 + r * 3) % 10 >= fill * 10) continue; const o = -length / 2 + .2 + k * .32; box(g, x + (alongX ? o : 0), sy + .2, z + (alongX ? 0 : o), alongX ? .2 : .26, .32, alongX ? .26 : .2, items[(k + r) % items.length]); } }
}
/** A desk or table. */
export function desk(g: T.Object3D, x: number, y: number, z: number, w: number, d: number, m: Material = mats.wood) {
  box(g, x, y + .78, z, w, .07, d, m); for (const dx of [-1, 1]) for (const dz of [-1, 1]) box(g, x + dx * (w / 2 - .08), y + .39, z + dz * (d / 2 - .08), .07, .78, .07, m);
}
/** Loose paper: a neat stack, or scattered when `mess` is set. */
export function papers(g: T.Object3D, x: number, y: number, z: number, n = 4, mess = false, m: Material = mats.cream) {
  for (let k = 0; k < n; k++) { const p = box(g, x + (mess ? ((k * 37) % 9 - 4) * .09 : 0), y + .012 + (mess ? 0 : k * .012), z + (mess ? ((k * 53) % 7 - 3) * .1 : 0), .24, .012, .32, m); p.rotation.y = mess ? k * 1.3 : k * .06; }
}
/** A wall of numbered pigeonholes. Faces +x. */
export function pigeonholes(g: T.Object3D, x: number, y: number, z: number, cols: number, rows: number, m: Material = mats.wood, missing: number[] = []) {
  const w = cols * .3, h = rows * .3; box(g, x - .14, y + h / 2, z, .04, h, w, m);
  for (let c = 0; c <= cols; c++) box(g, x, y + h / 2, z - w / 2 + c * .3, .28, h, .025, m); for (let r = 0; r <= rows; r++) box(g, x, y + r * .3, z, .28, .025, w, m);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const k = r * cols + c; if (missing.includes(k) || (k * 5) % 7 === 0) continue; box(g, x + .02, y + r * .3 + .12, z - w / 2 + c * .3 + .15, .2, .16, .2, mats.cream); }
}
/** Daylight falling through an opening onto the floor: an additive patch, no light. */
const spillMat = new T.MeshBasicMaterial({ color: '#ffe9b8', transparent: true, opacity: .16, blending: T.AdditiveBlending, depthWrite: false, fog: false });
export function windowSpill(g: T.Object3D, x: number, y: number, z: number, w: number, d: number) { const m = new T.Mesh(new T.PlaneGeometry(w, d), spillMat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; }
