import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const seeded = (seed: number) => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
export const random = seeded(7281);
function surface(kind: 'brick' | 'stone' | 'road' | 'metal' | 'wood') {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!; const r = seeded(29); x.fillStyle = '#535460'; x.fillRect(0, 0, 256, 256);
  const h = kind === 'brick' ? 24 : kind === 'road' ? 32 : 64; const w = kind === 'brick' ? 64 : kind === 'road' ? 48 : 128;
  for (let y = -h; y < 256 + h; y += h) for (let xx = -w; xx < 256 + w; xx += w) { const offset = ((y / h) % 2) * w / 2; const b = 120 + r() * 36; x.fillStyle = kind === 'brick' ? `rgb(${b * 1.3},${b * .82},${b * .65})` : kind === 'wood' ? `rgb(${b},${b * .72},${b * .46})` : `rgb(${b},${b * .99},${b * .91})`; x.fillRect(xx + offset + 1, y + 1, w - 3, h - 3); x.fillStyle = '#ffffff0b'; x.fillRect(xx + offset + 2, y + 2, w - 4, 2); }
  for (let i = 0; i < 4000; i++) { x.fillStyle = r() > .5 ? '#00000009' : '#ffffff08'; x.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 2); }
  if (kind === 'metal') { x.fillStyle = '#333b37'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 60; i++) { x.fillStyle = '#79503755'; x.fillRect(r() * 256, r() * 256, r() * 25, r() * 100); } }
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(1, 1); tex.anisotropy = 4; return tex;
}
export const mats = {
  brick: new T.MeshStandardMaterial({ map: surface('brick'), color: '#c3a093', roughness: .86 }),
  darkBrick: new T.MeshStandardMaterial({ map: surface('brick'), color: '#899aab', roughness: .9 }),
  stone: new T.MeshStandardMaterial({ map: surface('stone'), color: '#b0b8bb', roughness: .85 }),
  warmStone: new T.MeshStandardMaterial({ map: surface('stone'), color: '#c0b39c', roughness: .75 }),
  road: new T.MeshStandardMaterial({ map: surface('road'), color: '#818980', roughness: .48, metalness: .17 }),
  dirt: new T.MeshStandardMaterial({ map: surface('stone'), color: '#626e63', roughness: .5 }),
  roof: new T.MeshStandardMaterial({ map: surface('metal'), color: '#537c89', metalness: .38, roughness: .66 }),
  iron: new T.MeshStandardMaterial({ color: '#252f2e', metalness: .65, roughness: .6 }),
  rust: new T.MeshStandardMaterial({ color: '#695044', metalness: .55, roughness: .75 }),
  brass: new T.MeshStandardMaterial({ color: '#b28b4c', metalness: .65, roughness: .36 }),
  copper: new T.MeshStandardMaterial({ color: '#997455', metalness: .7, roughness: .48 }),
  wood: new T.MeshStandardMaterial({ map: surface('wood'), color: '#897b61', roughness: .9 }),
  teal: new T.MeshStandardMaterial({ color: '#358f96', roughness: .78 }),
  red: new T.MeshStandardMaterial({ color: '#ba574a', roughness: .8 }),
  cream: new T.MeshStandardMaterial({ color: '#b6a384', roughness: .8 }),
  glow: new T.MeshStandardMaterial({ color: '#ffcb75', emissive: '#ffb84d', emissiveIntensity: 1.1, roughness: .45 }),
  aether: new T.MeshStandardMaterial({ color: '#6ccdc4', emissive: '#52d6ca', emissiveIntensity: 1.4, metalness: .4, roughness: .3 }),
  dark: new T.MeshStandardMaterial({ color: '#101e21', roughness: .5 }),
  leaf: new T.MeshStandardMaterial({ color: '#4e7959', roughness: .95 }),
};
export type Material = T.Material;
const boxGeo = new T.BoxGeometry(1, 1, 1); const cylinderGeo = new T.CylinderGeometry(1, 1, 1, 12); const sphereGeo = new T.SphereGeometry(1, 12, 8);
export function box(g: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, m: Material = mats.iron) { let geometry = boxGeo; if (m instanceof T.MeshStandardMaterial && m.map) { geometry = boxGeo.clone(); const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); const sx = face < 2 ? d / 2 : w / 2; const sy = face === 2 || face === 3 ? d / 2 : h / 2; uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); } } const mesh = new T.Mesh(geometry, m); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; }
export function cyl(g: T.Object3D, x: number, y: number, z: number, r: number, h: number, m: Material = mats.iron) { const mesh = new T.Mesh(cylinderGeo, m); mesh.position.set(x, y, z); mesh.scale.set(r, h, r); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; }
export function sphere(g: T.Object3D, x: number, y: number, z: number, r: number, m: Material = mats.brass) { const mesh = new T.Mesh(sphereGeo, m); mesh.position.set(x, y, z); mesh.scale.setScalar(r); g.add(mesh); return mesh; }
export function torus(g: T.Object3D, x: number, y: number, z: number, r: number, tube: number, m: Material = mats.brass) { const mesh = new T.Mesh(new T.TorusGeometry(r, tube, 6, 20), m); mesh.position.set(x, y, z); g.add(mesh); return mesh; }
export function beam(g: T.Object3D, a: T.Vector3, b: T.Vector3, radius: number, mat: Material = mats.iron) { const c = cyl(g, 0, 0, 0, radius, a.distanceTo(b), mat); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return c; }
export function sign(g: T.Object3D, text: string, sub: string, x: number, y: number, z: number, width = 6, height = 1.2, theme = '#bfa16b') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const ctx = c.getContext('2d')!; ctx.fillStyle = '#172829'; ctx.fillRect(0, 0, 1024, 256); ctx.strokeStyle = theme; ctx.lineWidth = 4; ctx.strokeRect(14, 14, 996, 228); ctx.strokeRect(24, 24, 976, 208); ctx.fillStyle = theme; ctx.textAlign = 'center'; ctx.font = 'bold 66px Georgia'; ctx.fillText(text.toUpperCase(), 512, 121, 930); ctx.font = '24px Georgia'; ctx.fillText(sub.toUpperCase().split('').join(' '), 512, 183, 880); const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map: tex, roughness: .7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .3 })); mesh.position.set(x, y, z); g.add(mesh); return mesh;
}
export function arch(g: T.Object3D, x: number, y: number, z: number, w: number, h: number, mat: Material) { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); const m = new T.Mesh(new T.ShapeGeometry(s, 8), mat); m.position.set(x, y, z); g.add(m); return m; }
export function windowUnit(g: T.Object3D, x: number, y: number, z: number, lit = true, w = 1.35, h = 2.3) { arch(g, x, y, z, w + .25, h + .13, mats.stone); arch(g, x, y + .08, z + .025, w, h - .1, lit ? mats.glow : mats.dark); box(g, x, y + .06, z + .13, w + .4, .16, .35, mats.stone); box(g, x, y + h * .45, z + .05, w, .09, .08, mats.iron); box(g, x, y + h * .45, z + .07, .075, h * .9, .08, mats.iron); }
export function gear(g: T.Object3D, x: number, y: number, z: number, r: number) { const group = new T.Group(); group.position.set(x, y, z); torus(group, 0, 0, 0, r * .78, r * .16); const hub = cyl(group, 0, 0, 0, r * .24, .26, mats.iron); hub.rotation.x = Math.PI / 2; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const tooth = box(group, Math.cos(a) * r, Math.sin(a) * r, 0, r * .27, r * .28, .28, mats.brass); tooth.rotation.z = a; } for (let i = 0; i < 4; i++) { const spoke = box(group, 0, 0, 0, r * 1.5, r * .13, .18, mats.copper); spoke.rotation.z = i * Math.PI / 4; } g.add(group); bake(group); return group; }
export function barrel(g: T.Object3D, x: number, y: number, z: number) { cyl(g, x, y + .55, z, .42, 1.1, mats.wood); for (const yy of [.18, .85]) cyl(g, x, y + yy, z, .44, .09, mats.iron); }
export function crate(g: T.Object3D, x: number, y: number, z: number, size = 1) { box(g, x, y + size / 2, z, size, size, size, mats.wood); for (const yy of [.1, .9]) box(g, x, y + yy * size, z + size / 2 + .01, size, .08, .06, mats.iron); const b = box(g, x, y + size / 2, z + size / 2 + .04, size * 1.3, .09, .05, mats.cream); b.rotation.z = Math.PI / 4; }
export function tree(g: T.Object3D, x: number, z: number, scale = 1) { const t = new T.Group(); t.position.set(x, 0, z); t.scale.setScalar(scale); cyl(t, 0, 1.8, 0, .17, 3.6, mats.wood); for (let i = 0; i < 5; i++) { const a = i * 2.4; const mesh = new T.Mesh(new T.IcosahedronGeometry(1.2, 1), mats.leaf); mesh.position.set(Math.cos(a) * .7, 3.1 + i * .24, Math.sin(a) * .7); mesh.scale.y = 1.2; t.add(mesh); } g.add(t); }
/** Bake procedural architectural detail into one draw call per shared material. */
export function bake(group: T.Group) {
  group.updateMatrixWorld(true); const inverse = group.matrixWorld.clone().invert(); const buckets = new Map<Material, T.BufferGeometry[]>();
  group.traverse(o => { if (o instanceof T.Mesh && !Array.isArray(o.material)) { let geos = buckets.get(o.material); if (!geos) { geos = []; buckets.set(o.material, geos); } let geo = o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)); if (geo.index) geo = geo.toNonIndexed(); if (!geo.attributes.uv) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2)); geos.push(geo); } });
  group.clear(); for (const [mat, geos] of buckets) { const merged = mergeGeometries(geos, false); if (!merged) continue; const mesh = new T.Mesh(merged, mat); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); geos.forEach(g => g.dispose()); } return group;
}
