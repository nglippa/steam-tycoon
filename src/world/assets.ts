import * as T from 'three';
import { palette as P, worldColors } from './palette';
import { painted } from './tone';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Atlas, place, type Placed } from './sign-atlas';
export const seeded = (seed: number) => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
export const random = seeded(7281);
/** Borderlands-style hand-painted surfaces: light tint-able base, inked construction
 * lines, chipped light edges and painted grime. One tile = 2 m on a box face. */
export type Surface = 'brick' | 'stone' | 'road' | 'metal' | 'wood' | 'mud' | 'plaster' | 'slate';
export function surface(kind: Surface) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d')!; const r = seeded(29 + kind.length * 7);
  const ink = (a: number) => `rgba(38,30,26,${a})`, chalk = (a: number) => `rgba(255,250,236,${a})`;
  const jitterLine = (x0: number, y0: number, x1: number, y1: number, w: number, a: number) => { x.strokeStyle = ink(a); x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); const n = 6; for (let i = 1; i <= n; i++) { const t = i / n; x.lineTo(x0 + (x1 - x0) * t + (r() - .5) * 2.2, y0 + (y1 - y0) * t + (r() - .5) * 2.2); } x.stroke(); };
  const blotch = (cx: number, cy: number, rad: number, col: string) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = rad * (.6 + r() * .5); i ? x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .7) : x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .7); } x.closePath(); x.fill(); };
  x.fillStyle = '#ece6d8'; x.fillRect(0, 0, S, S);
  // Broad painted value variation, never noise.
  for (let i = 0; i < 7; i++) blotch(r() * S, r() * S, 60 + r() * 90, r() < .5 ? 'rgba(255,252,240,.18)' : 'rgba(120,100,80,.08)');
  if (kind === 'brick' || kind === 'plaster') {
    const rows = 16, h = S / rows;
    const brickPass = (alpha: number, mask?: (px: number, py: number) => boolean) => { for (let row = 0; row < rows; row++) { const off = row % 2 ? h * 1.1 : 0; for (let col = -1; col < 5; col++) { const bw = S / 4.4, px = col * bw + off, py = row * h; if (mask && !mask(px + bw / 2, py + h / 2)) continue;
      x.fillStyle = `rgba(${150 + r() * 30},${95 + r() * 20},${70 + r() * 15},${alpha * (.25 + r() * .2)})`; x.fillRect(px + 2, py + 2, bw - 4, h - 4); jitterLine(px, py, px + bw, py, 2, alpha * .55); jitterLine(px, py, px, py + h, 2, alpha * .55); if (r() < .2) jitterLine(px + 4, py + h - 3, px + bw * .5, py + h - 3, 1.5, alpha * .3); } } };
    if (kind === 'brick') brickPass(1);
    else { // Render over brick: cracks, and a patch where the plaster has fallen away.
      const holes = [[r() * S, r() * S * .8 + S * .1, 70 + r() * 50]];
      brickPass(1, (px, py) => holes.some(([hx, hy, hr]) => Math.hypot(px - hx, (py - hy) * 1.4) < hr));
      for (const [hx, hy, hr] of holes) { x.strokeStyle = ink(.7); x.lineWidth = 2.5; x.beginPath(); for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, rr = hr * (.85 + r() * .25); i ? x.lineTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr / 1.4) : x.moveTo(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr / 1.4); } x.closePath(); x.stroke(); }
      for (let i = 0; i < 5; i++) { let cx = r() * S, cy = r() * S; x.strokeStyle = ink(.5); x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx, cy); for (let k = 0; k < 6; k++) { cx += (r() - .5) * 40; cy += 8 + r() * 22; x.lineTo(cx, cy); } x.stroke(); }
      for (let i = 0; i < 26; i++) { x.fillStyle = ink(.12); x.fillRect(r() * S, r() * S, 3 + r() * 5, 2); }
    }
  }
  if (kind === 'stone') { // Ashlar: large dressed blocks, chipped arrises.
    const rows = 5, h = S / rows; for (let row = 0; row < rows; row++) { const off = row % 2 ? S / 5 : 0; for (let col = -1; col < 3; col++) { const bw = S / 2.5, px = col * bw + off, py = row * h;
      x.fillStyle = `rgba(110,95,78,${.05 + r() * .09})`; x.fillRect(px + 4, py + 4, bw - 8, h - 8); jitterLine(px, py, px + bw, py, 3, .6); jitterLine(px, py, px, py + h, 3, .6);
      x.strokeStyle = chalk(.5); x.lineWidth = 2; x.beginPath(); x.moveTo(px + 6, py + 6); x.lineTo(px + bw * .7, py + 6); x.stroke();
      if (r() < .35) { const cx = px + r() * bw, cy = py + r() * h; x.strokeStyle = ink(.45); x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 14, cy + 9); x.lineTo(cx + 8, cy + 22); x.stroke(); } } } }
  if (kind === 'road') { // Cobbles: inked rounded setts, packed dark joints.
    x.fillStyle = '#b7afa2'; x.fillRect(0, 0, S, S); const rows = 12, h = S / rows;
    for (let row = 0; row < rows; row++) for (let col = -1; col < 9; col++) { const w = S / 8, px = col * w + (row % 2) * w / 2 + (r() - .5) * 4, py = row * h + (r() - .5) * 3; const v = 218 + Math.floor(r() * 26);
      x.fillStyle = `rgb(${v},${v - 4},${v - 12})`; x.beginPath(); x.roundRect(px + 3, py + 3, w - 6, h - 6, 11); x.fill(); x.strokeStyle = ink(.55); x.lineWidth = 2; x.stroke();
      x.strokeStyle = chalk(.45); x.lineWidth = 2; x.beginPath(); x.moveTo(px + 9, py + 8); x.lineTo(px + w * .55, py + 8); x.stroke(); } }
  if (kind === 'metal' || kind === 'slate') {
    if (kind === 'metal') { // Corrugated sheet with lapped seams and rivet rows.
      for (let i = 0; i < 24; i++) { const px = i * S / 24; x.fillStyle = i % 2 ? 'rgba(90,80,70,.14)' : 'rgba(255,250,235,.12)'; x.fillRect(px, 0, S / 24, S); jitterLine(px, 0, px, S, 1.2, .25); }
      for (const py of [0, S / 2]) { jitterLine(0, py, S, py, 3, .75); for (let i = 0; i < 16; i++) { x.fillStyle = ink(.6); x.beginPath(); x.arc(i * S / 16 + 12, py + 10, 3, 0, Math.PI * 2); x.fill(); } }
      for (let i = 0; i < 4; i++) { const cx = r() * S; x.fillStyle = 'rgba(160,80,40,.22)'; x.beginPath(); x.moveTo(cx - 8, 0); x.lineTo(cx + 8, 0); x.lineTo(cx + 3, S * (.3 + r() * .4)); x.closePath(); x.fill(); }
    } else { // Slate: staggered rows of inked tiles.
      const rows = 10, h = S / rows; for (let row = 0; row < rows; row++) { const off = row % 2 ? S / 12 : 0; jitterLine(0, row * h, S, row * h, 2.5, .7); for (let col = -1; col < 7; col++) { const px = col * S / 6 + off; jitterLine(px, row * h, px, row * h + h, 1.8, .55); x.fillStyle = `rgba(80,70,60,${r() * .12})`; x.fillRect(px + 2, row * h + 2, S / 6 - 4, h - 4); } } }
  }
  if (kind === 'wood') { // Planks: joints, grain, knots and nail heads.
    const n = 6, w = S / n; for (let i = 0; i < n; i++) { const px = i * w; x.fillStyle = `rgba(120,85,55,${.05 + r() * .12})`; x.fillRect(px, 0, w, S); jitterLine(px, 0, px, S, 3, .7);
      for (let k = 0; k < 4; k++) { const gx = px + 8 + r() * (w - 16); jitterLine(gx, r() * 60, gx + (r() - .5) * 8, S - r() * 60, 1, .22); }
      if (r() < .6) { x.strokeStyle = ink(.4); x.lineWidth = 1.5; x.beginPath(); x.ellipse(px + w / 2, r() * S, 6, 10, 0, 0, Math.PI * 2); x.stroke(); }
      for (const py of [18, S / 2 + 18]) { x.fillStyle = ink(.65); x.beginPath(); x.arc(px + 12, py, 3, 0, Math.PI * 2); x.arc(px + w - 12, py, 3, 0, Math.PI * 2); x.fill(); } } }
  if (kind === 'mud') { for (let i = 0; i < 9; i++) { let cx = r() * S, cy = r() * S; x.strokeStyle = ink(.35); x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += (r() - .5) * 50; cy += (r() - .5) * 50; x.lineTo(cx, cy); } x.stroke(); } for (let i = 0; i < 40; i++) { x.fillStyle = ink(.15); x.beginPath(); x.arc(r() * S, r() * S, 2 + r() * 4, 0, Math.PI * 2); x.fill(); } }
  // Grime pooling at the lower edge of every tile reads as soot and damp.
  const grime = x.createLinearGradient(0, S * .7, 0, S); grime.addColorStop(0, 'rgba(60,48,40,0)'); grime.addColorStop(1, `rgba(60,48,40,${kind === 'road' ? 0 : .14})`); x.fillStyle = grime; x.fillRect(0, 0, S, S);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 8; return tex;
}
/** Inked foliage: scalloped leaf shapes over a mottled base, tinted by the material. */
function foliageMap() { const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d')!; const r = seeded(77);
  x.fillStyle = '#cfd6b4'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) { const px = r() * S, py = r() * S, s = 9 + r() * 12, a = r() * Math.PI;
    x.save(); x.translate(px, py); x.rotate(a); x.fillStyle = r() < .5 ? 'rgba(255,255,230,.35)' : 'rgba(40,50,20,.25)'; x.beginPath(); x.ellipse(0, 0, s, s * .45, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(30,34,18,.7)'; x.lineWidth = 2; x.beginPath(); x.ellipse(0, 0, s, s * .45, 0, Math.PI * .1, Math.PI * 1.05); x.stroke(); x.restore(); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t; }
const leafMap = foliageMap(); leafMap.repeat.set(2.5, 2.5);
export const mats = {
  brick: new T.MeshStandardMaterial({ map: surface('brick'), color: P.neutral.plaster, roughness: .86 }),
  darkBrick: new T.MeshStandardMaterial({ map: surface('brick'), color: P.neutral.industrial, roughness: .9 }),
  stone: new T.MeshStandardMaterial({ map: surface('stone'), color: P.neutral.stone, roughness: .85 }),
  warmStone: new T.MeshStandardMaterial({ map: surface('stone'), color: P.neutral.ivory, roughness: .75 }),
  road: new T.MeshStandardMaterial({ map: surface('road'), color: P.neutral.slate, roughness: .48, metalness: .17 }),
  dirt: new T.MeshStandardMaterial({ map: surface('mud'), color: worldColors.dirt[0], roughness: .5 }),
  roof: new T.MeshStandardMaterial({ map: surface('slate'), color: P.cool.navy, metalness: .38, roughness: .66 }),
  iron: new T.MeshStandardMaterial({ color: P.metal.iron, metalness: .65, roughness: .6 }),
  sheet: new T.MeshStandardMaterial({ map: surface('metal'), color: '#8a8a82' }),
  rust: new T.MeshStandardMaterial({ color: P.metal.rust, metalness: .55, roughness: .75 }),
  brass: new T.MeshStandardMaterial({ color: P.metal.agedBrass, metalness: .65, roughness: .36 }),
  copper: new T.MeshStandardMaterial({ color: P.metal.copper, metalness: .7, roughness: .48 }),
  wood: new T.MeshStandardMaterial({ map: surface('wood'), color: P.warm.timber, roughness: .9 }),
  teal: new T.MeshStandardMaterial({ color: P.cool.teal, roughness: .78 }),
  red: new T.MeshStandardMaterial({ color: P.warm.crimson, roughness: .8 }),
  cream: new T.MeshStandardMaterial({ color: P.neutral.ivory, roughness: .8 }),
  glow: new T.MeshStandardMaterial({ color: P.warm.lamp, emissive: P.warm.lamp, emissiveIntensity: 1.1, roughness: .45 }),
  aether: new T.MeshStandardMaterial({ color: P.aether.white, emissive: P.aether.glow, emissiveIntensity: 1.4, metalness: .4, roughness: .3 }),
  dark: new T.MeshStandardMaterial({ color: '#231f1c', roughness: .5 }),
  leaf: new T.MeshStandardMaterial({ color: worldColors.leaf[0], roughness: .95, map: leafMap }),
};
// Four shared glass treatments. Each fakes a room behind the glass: a warm lamp,
// shelving and a back wall, so a flat pane reads as an interior one meter deep.
export const windowGlass = [0,1,2,3].map(i => {
  const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,['#5a3d34','#5a3b3c','#3d566a','#26323f'][i]);gradient.addColorStop(.55,['#b9794a','#a8644c','#6c93a0','#34414d'][i]);gradient.addColorStop(1,['#f0c378','#e8a86c','#9cc1bb','#48555f'][i]);ctx.fillStyle=gradient;ctx.fillRect(0,0,128,256);
  if(i<2){ctx.fillStyle='#2b1f2466';ctx.fillRect(0,150,128,8);ctx.fillRect(0,196,128,8);for(let k=0;k<7;k++){ctx.fillStyle=['#7a3a4a88','#2f5f6a88','#c0904a88'][k%3];ctx.fillRect(8+k*17,132,11,18);}
    ctx.strokeStyle='#2a1c1c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(64,0);ctx.lineTo(64,58);ctx.stroke();ctx.fillStyle='#ffe3a0';ctx.beginPath();ctx.arc(64,66,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe3a044';ctx.beginPath();ctx.arc(64,66,30,0,Math.PI*2);ctx.fill();}
  if(i===2){ctx.fillStyle='#ffffff30';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(56,0);ctx.lineTo(118,256);ctx.lineTo(80,256);ctx.fill();}
  if(i===3){ctx.fillStyle='#1c242c';ctx.fillRect(0,0,128,256);ctx.fillStyle='#39434d';ctx.fillRect(0,170,128,86);}
  ctx.fillStyle='#14272d60';ctx.fillRect(0,0,9,256);ctx.fillRect(119,0,9,256);
  if(i===1){ctx.fillStyle='#2a2330';ctx.beginPath();ctx.arc(84,150,13,0,Math.PI*2);ctx.fill();ctx.fillRect(69,162,30,94);}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
  return new T.MeshStandardMaterial({map:t,emissiveMap:t,emissive:'#ffffff',emissiveIntensity:i===3?.06:.6,roughness:.38,metalness:.12});
});
export const displayGlass = new T.MeshBasicMaterial({ color: '#cfe7ea', transparent: true, opacity: .16, depthWrite: false });
export type Material = T.Material;
const boxGeo = new T.BoxGeometry(1, 1, 1); const cylinderGeo = new T.CylinderGeometry(1, 1, 1, 12); const sphereGeo = new T.SphereGeometry(1, 12, 8);
export function box(g: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, m: Material = mats.iron) { let geometry = boxGeo; if (m instanceof T.MeshStandardMaterial && m.map) { geometry = boxGeo.clone(); const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); const sx = face < 2 ? d / 2 : w / 2; const sy = face === 2 || face === 3 ? d / 2 : h / 2; uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); } } const mesh = new T.Mesh(geometry, m); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; }
/** A box with a vertical hole `[x0, x1, z0, z1]` through it, built as the boxes round the hole: a hatch through a slab. */
export function holed(g: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, [hx0, hx1, hz0, hz1]: readonly number[], m: Material = mats.iron) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, a = Math.max(x0, hx0), b = Math.min(x1, hx1);
  for (const [l, r, n, s] of [[x0, Math.min(x1, hx0), z0, z1], [Math.max(x0, hx1), x1, z0, z1], [a, b, z0, Math.min(z1, hz0)], [a, b, Math.max(z0, hz1), z1]]) if (r > l && s > n) box(g, (l + r) / 2, y, (n + s) / 2, r - l, h, s - n, m);
}
export function cyl(g: T.Object3D, x: number, y: number, z: number, r: number, h: number, m: Material = mats.iron) { const mesh = new T.Mesh(cylinderGeo, m); mesh.position.set(x, y, z); mesh.scale.set(r, h, r); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; }
export function sphere(g: T.Object3D, x: number, y: number, z: number, r: number, m: Material = mats.brass) { const mesh = new T.Mesh(sphereGeo, m); mesh.position.set(x, y, z); mesh.scale.setScalar(r); g.add(mesh); return mesh; }
export function torus(g: T.Object3D, x: number, y: number, z: number, r: number, tube: number, m: Material = mats.brass) { const mesh = new T.Mesh(new T.TorusGeometry(r, tube, 6, 20), m); mesh.position.set(x, y, z); g.add(mesh); return mesh; }
export function beam(g: T.Object3D, a: T.Vector3, b: T.Vector3, radius: number, mat: Material = mats.iron) { const c = cyl(g, 0, 0, 0, radius, a.distanceTo(b), mat); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return c; }
/** Mark a material as printed text/graphics: the ink pass leaves its interior alone
 * (alpha channel flag), so lettering stays crisp instead of being outlined. */
/** Mark a material for thin outlines (people and movable objects): alpha 0.5 class. */
export function thinLine<M extends T.Material>(m: M): M {
  const previous = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (shader, r) => { previous(shader, r); shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a = 0.5;'); };
  const key = m.customProgramCacheKey.bind(m); m.customProgramCacheKey = () => key() + '|thin'; return m;
}
const propCache = new Map<T.Material, T.Material>();
/** Thin-outlined twin of a world material, for props; shares color so palette updates follow. */
export function propMat(m: T.Material): T.Material { let v = propCache.get(m); if (!v) { const c = (m as T.MeshStandardMaterial).clone(); if (c instanceof T.MeshStandardMaterial) illustrated(c); v = thinLine(c); if ('color' in m && 'color' in v) (v as T.MeshStandardMaterial).color = (m as T.MeshStandardMaterial).color; propCache.set(m, v); } return v; }
/** Swap every mesh in a prop group to its thin-outlined twin (call before bake). */
export function asProp<G extends T.Object3D>(g: G): G { g.traverse(o => { if (o instanceof T.Mesh && !Array.isArray(o.material) && !o.material.customProgramCacheKey().includes('|thin')) o.material = propMat(o.material); }); return g; }
export function printed<M extends T.Material>(m: M): M {
  const previous = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (shader, r) => { previous(shader, r); shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a = 0.0;'); };
  const key = m.customProgramCacheKey.bind(m); m.customProgramCacheKey = () => key() + '|printed'; return m;
}
const signAtlas = new Atlas(map => printed(new T.MeshStandardMaterial({ map, roughness: .7, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: .3 })));
const signCache = new Map<string, Placed<T.MeshStandardMaterial>>();
/** Enamel sign. The canvas matches the board's real proportions at ~190 px/m, so
 * lettering is never stretched; the title is fitted to the board, not squeezed. */
export function sign(g: T.Object3D, text: string, sub: string, x: number, y: number, z: number, width = 6, height = 1.2, theme = '#bfa16b') {
  const key = [text, sub, width, height, theme].join('|'); let placed = signCache.get(key);
  if (!placed) {
    let W = Math.round(Math.min(2048, Math.max(256, width * 190))), H = Math.round(W * height / width); if (H > 1024) { H = 1024; W = Math.round(H * width / height); }
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d')!; const m = Math.min(W, H);
    ctx.fillStyle = '#1b2d2e'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = theme; ctx.lineWidth = Math.max(2, m * .035);
    const i1 = m * .07, i2 = m * .12; ctx.strokeRect(i1, i1, W - 2 * i1, H - 2 * i1); ctx.lineWidth = Math.max(1, m * .015); ctx.strokeRect(i2, i2, W - 2 * i2, H - 2 * i2);
    ctx.fillStyle = theme; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const hasSub = sub.trim().length > 0, maxW = W - 2 * i2 - m * .16;
    let size = H * (hasSub ? .4 : .52); ctx.font = `800 ${size}px "Avenir Next", "Helvetica Neue", sans-serif`;
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${size * .06}px`;
    const tw = ctx.measureText(text.toUpperCase()).width; if (tw > maxW) { size *= maxW / tw; ctx.font = `800 ${size}px "Avenir Next", "Helvetica Neue", sans-serif`; (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${size * .06}px`; }
    ctx.fillText(text.toUpperCase(), W / 2, hasSub ? H * .42 : H / 2);
    if (hasSub) { let ss = H * .13; ctx.font = `600 ${ss}px "Avenir Next", "Helvetica Neue", sans-serif`; (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${ss * .35}px`;
      const sw = ctx.measureText(sub.toUpperCase()).width; if (sw > maxW) { ss *= maxW / sw; ctx.font = `600 ${ss}px "Avenir Next", "Helvetica Neue", sans-serif`; (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${ss * .35}px`; }
      ctx.fillText(sub.toUpperCase(), W / 2, H * .72); }
    placed = signAtlas.add(c); signCache.set(key, placed);
  }
  const mesh = new T.Mesh(place(new T.PlaneGeometry(width, height), placed.rect), placed.material); mesh.position.set(x, y, z); g.add(mesh); return mesh;
}
export function arch(g: T.Object3D, x: number, y: number, z: number, w: number, h: number, mat: Material) { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); const geo = new T.ShapeGeometry(s, 8); const uv = geo.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,(uv.getX(i)+w/2)/w,uv.getY(i)/h); const m = new T.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; }
export type WindowFamily = 'arch' | 'civic' | 'grid' | 'rect';
/** Window families with real relief: jambs, lintel and a bracketed sill project from
 * the wall so light and ink catch them. Glass sits back inside the frame. */
export function windowUnit(g: T.Object3D, x: number, y: number, z: number, lit = true, w = 1.35, h = 2.3, family: WindowFamily = 'arch') {
  const glass = lit ? windowGlass[Math.abs(Math.floor(x * 3 + y)) % 2 === 0 && y > 3 ? 2 : Math.abs(Math.floor(x + y)) % 2] : windowGlass[3];
  if (family === 'grid') {
    const pane = new T.Mesh(new T.PlaneGeometry(w, h), glass); pane.position.set(x, y + h / 2, z + .02); g.add(pane);
    for (const dx of [-w / 2, w / 2]) box(g, x + dx, y + h / 2, z + .08, .14, h + .14, .16, mats.iron);
    box(g, x, y + h + .1, z + .1, w + .5, .22, .22, mats.iron); box(g, x, y - .04, z + .14, w + .3, .12, .3, mats.stone);
    for (let k = 1; k < 3; k++) box(g, x - w / 2 + k * w / 3, y + h / 2, z + .05, .05, h, .05, mats.iron);
    for (let k = 1; k < 4; k++) box(g, x, y + k * h / 4, z + .05, w, .05, .05, mats.iron); return;
  }
  if (family === 'rect') {
    const pane = new T.Mesh(new T.PlaneGeometry(w, h), glass); pane.position.set(x, y + h / 2, z + .02); g.add(pane);
    for (const dx of [-w / 2 - .08, w / 2 + .08]) box(g, x + dx, y + h / 2, z + .07, .16, h + .1, .14, mats.stone);
    box(g, x, y + h + .1, z + .1, w + .6, .2, .22, mats.stone); box(g, x, y - .05, z + .16, w + .5, .12, .34, mats.stone);
    for (const side of [-1, 1]) box(g, x + side * (w / 2 + .45), y + h / 2, z + .06, .5, h, .06, mats.teal);
    box(g, x, y + h * .5, z + .05, w, .05, .05, mats.wood); box(g, x, y + h / 2, z + .05, .05, h, .05, mats.wood); return;
  }
  const civic = family === 'civic';
  arch(g, x, y, z, w + .25, h + .13, civic ? mats.brass : mats.stone); arch(g, x, y + .08, z + .025, w, h - .1, glass);
  for (const dx of [-w / 2 - .14, w / 2 + .14]) box(g, x + dx, y + (h - w / 2) / 2, z + .08, .2, h - w / 2, .16, mats.stone);
  box(g, x, y + h + .14, z + .12, .3, .38, .22, civic ? mats.brass : mats.stone);
  box(g, x, y + .02, z + .15, w + .5, .14, .34, mats.stone); for (const dx of [-w / 2, w / 2]) box(g, x + dx, y - .14, z + .1, .12, .2, .22, mats.stone);
  box(g, x, y + h * .45, z + .05, w, .07, .06, mats.iron); box(g, x, y + h * .45, z + .07, .06, h * .9, .06, mats.iron);
  if (civic) for (const dx of [-w / 2 - .3, w / 2 + .3]) box(g, x + dx, y + h / 2, z + .1, .16, h + .3, .2, mats.stone);
}
export function gear(g: T.Object3D, x: number, y: number, z: number, r: number) { const group = new T.Group(); group.position.set(x, y, z); torus(group, 0, 0, 0, r * .78, r * .16); const hub = cyl(group, 0, 0, 0, r * .24, .26, mats.iron); hub.rotation.x = Math.PI / 2; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const tooth = box(group, Math.cos(a) * r, Math.sin(a) * r, 0, r * .27, r * .28, .28, mats.brass); tooth.rotation.z = a; } for (let i = 0; i < 4; i++) { const spoke = box(group, 0, 0, 0, r * 1.5, r * .13, .18, mats.copper); spoke.rotation.z = i * Math.PI / 4; } g.add(group); bake(group); return group; }
export function barrel(g: T.Object3D, x: number, y: number, z: number) { cyl(g, x, y + .55, z, .42, 1.1, propMat(mats.wood)); for (const yy of [.18, .85]) cyl(g, x, y + yy, z, .44, .09, propMat(mats.iron)); }
export function crate(g: T.Object3D, x: number, y: number, z: number, size = 1) { box(g, x, y + size / 2, z, size, size, size, propMat(mats.wood)); for (const yy of [.1, .9]) box(g, x, y + yy * size, z + size / 2 + .01, size, .08, .06, propMat(mats.iron)); const b = box(g, x, y + size / 2, z + size / 2 + .04, size * 1.3, .09, .05, propMat(mats.cream)); b.rotation.z = Math.PI / 4; }

/** Lumpy foliage clump: a subdivided sphere pushed in and out by a few low bumps,
 * so masses read soft and hand-drawn rather than faceted. */
const leafMass = (() => { const geo = new T.IcosahedronGeometry(1, 2), p = geo.attributes.position, v = new T.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = .82 + .18 * Math.sin(v.x * 3.1 + 1.3) * Math.sin(v.y * 2.7) + .1 * Math.sin(v.z * 5.3 + v.x * 2); v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo; })();
export const leafShade = new T.MeshStandardMaterial({ color: '#3e4a2c', map: leafMap });
export const blossom = new T.MeshStandardMaterial({ color: '#9c8578', map: leafMap });
/** Scrubby street tree: a forked trunk, three limbs and many small faceted clumps in an
 * asymmetric crown, with a darker drooping underside. Reads drawn, not spherical. */
export function tree(g: T.Object3D, x: number, z: number, scale = 1) { const t = new T.Group(); t.position.set(x, 0, z); t.scale.setScalar(scale); const r = seeded(Math.floor(x * 31 + z * 7)); const lean = (r() - .5) * .5;
  const fork = new T.Vector3(lean * .5, 2.1, 0); beam(t, new T.Vector3(0, 0, 0), fork, .17, mats.wood); beam(t, new T.Vector3(0, 0, 0), new T.Vector3(.25, .5, .15), .2, mats.wood);
  const tips: T.Vector3[] = [];
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + r() * .8, tip = new T.Vector3(fork.x + Math.cos(a) * (1 + r() * .6), 3.2 + r() * 1.1, Math.sin(a) * (1 + r() * .6)); beam(t, fork, tip, .09, mats.wood); tips.push(tip); }
  tips.push(new T.Vector3(fork.x + lean, 4.3, 0));
  for (const tip of tips) for (let k = 0; k < 6; k++) { const under = k === 0, s = under ? .65 + r() * .25 : .38 + r() * .34;
    const m = new T.Mesh(leafMass, under ? leafShade : mats.leaf); m.position.set(tip.x + (r() - .5) * 1.4, tip.y + (under ? -.45 : (r() - .2) * .9), tip.z + (r() - .5) * 1.4); m.scale.set(s * 1.25, s * (under ? .6 : .85), s * 1.1); m.rotation.set(r() * 3, r() * 3, r() * 3); t.add(m); }
  g.add(t); return t; }
/** Winter-bare street tree for struggling Terra: trunk and forked limbs only. */
export function bareTree(g: T.Object3D, x: number, z: number, scale = 1) { const t = new T.Group(); t.position.set(x, 0, z); t.scale.setScalar(scale);
  beam(t, new T.Vector3(0, 0, 0), new T.Vector3(.1, 2.4, 0), .12, mats.wood);
  for (const [a, b, c] of [[.1, 1.6, .7], [.1, 2.0, -.8], [.1, 2.4, .2]]) { beam(t, new T.Vector3(a, b, 0), new T.Vector3(a + c, b + 1.1, c * .4), .05, mats.wood); beam(t, new T.Vector3(a + c * .6, b + .7, c * .25), new T.Vector3(a + c * 1.3, b + 1.3, -c * .3), .03, mats.wood); }
  g.add(t); return t; }
/** Bake procedural architectural detail into one draw call per shared material. */
const sequence = (n: number) => { const a = new Array<number>(n); for (let i = 0; i < n; i++) a[i] = i; return a; };
/** Merge a finished group into one mesh per material. Geometry stays indexed: a merged box is 24 vertices, not 36,
 * and a cylinder a fifth of its unrolled size, which is most of the vertex work in a city of primitives. */
export function bake(group: T.Group) {
  group.updateMatrixWorld(true); const inverse = group.matrixWorld.clone().invert(); const buckets = new Map<Material, T.BufferGeometry[]>();
  group.traverse(o => { if (o instanceof T.Mesh && !Array.isArray(o.material)) { let geos = buckets.get(o.material); if (!geos) { geos = []; buckets.set(o.material, geos); } let geo = o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)); if (!geo.index) geo.setIndex(sequence(geo.attributes.position.count)); if (!geo.attributes.uv) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2)); geos.push(geo); } });
  group.clear(); for (const [mat, geos] of buckets) { const merged = mergeGeometries(geos, false); if (!merged) continue; // Slightly imperfect silhouettes, like assembled painted miniatures.
    // The deterministic field keeps coincident vertices together.
    const mesh = new T.Mesh(merged, mat); mesh.castShadow = mat!==mats.stone&&mat!==mats.brass&&!windowGlass.includes(mat as T.MeshStandardMaterial);mesh.receiveShadow=true; group.add(mesh); geos.forEach(g => g.dispose()); } return group;
}

/** Matte painted enamel: every world material shares Terra's cel terminator. */
export function illustrated(material: T.MeshStandardMaterial) {
  material.metalness = 0;
  material.roughness = 1;
  return painted(material);
}
for (const material of Object.values(mats)) illustrated(material);
illustrated(leafShade);illustrated(blossom);

/** Restore selected materials, not a global saturation filter. Shared meshes follow. */
export function applyWorldPalette(stage:number){
  const phase=Math.min(2,stage/2.5),a=Math.floor(phase),b=Math.min(2,a+1);
  for(const [key,colors] of Object.entries(worldColors))mats[key as keyof typeof worldColors].color.set(colors[a]).lerp(new T.Color(colors[b]),phase-a);
}
