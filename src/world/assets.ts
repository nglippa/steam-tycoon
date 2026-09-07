import * as T from 'three';
import { palette as P, worldColors } from './palette';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const seeded = (seed: number) => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
export const random = seeded(7281);
function surface(kind: 'brick' | 'stone' | 'road' | 'metal' | 'wood' | 'mud') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!; const r = seeded(29);
  x.fillStyle = '#f3f0e5'; x.fillRect(0, 0, 256, 256);
  // Sparse broken pen strokes: color comes from the material, not noisy masonry.
  x.strokeStyle = kind === 'road' ? '#46545314' : '#46545330'; x.lineWidth = 1.5;
  const count = kind === 'brick' ? 9 : kind === 'road' ? 2 : kind === 'wood' ? 8 : 5;
  for (let i = 0; i < count; i++) {
    const px = r() * 230, py = r() * 250, w = 10 + r() * 34;
    x.beginPath(); x.moveTo(px, py);
    if (kind === 'wood') { x.lineTo(px + 1, py + 45); x.lineTo(px - 1, py + 75); }
    else { x.lineTo(px + w, py + r() * 2); if (i % 3 === 0) x.lineTo(px + w - 1, py + 9); }
    x.stroke();
    if (i % 3 === 0) { x.fillStyle = '#bac1b51c'; x.fillRect(px, py + 2, w, 8); }
  }
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 4; return tex;
}
export const mats = {
  brick: new T.MeshStandardMaterial({ map: surface('brick'), color: P.neutral.plaster, roughness: .86 }),
  darkBrick: new T.MeshStandardMaterial({ map: surface('brick'), color: P.neutral.industrial, roughness: .9 }),
  stone: new T.MeshStandardMaterial({ map: surface('stone'), color: P.neutral.stone, roughness: .85 }),
  warmStone: new T.MeshStandardMaterial({ map: surface('stone'), color: P.neutral.ivory, roughness: .75 }),
  road: new T.MeshStandardMaterial({ map: surface('road'), color: P.neutral.slate, roughness: .48, metalness: .17 }),
  dirt: new T.MeshStandardMaterial({ map: surface('mud'), color: worldColors.dirt[0], roughness: .5 }),
  roof: new T.MeshStandardMaterial({ map: surface('metal'), color: P.cool.navy, metalness: .38, roughness: .66 }),
  iron: new T.MeshStandardMaterial({ color: P.metal.iron, metalness: .65, roughness: .6 }),
  rust: new T.MeshStandardMaterial({ color: P.metal.rust, metalness: .55, roughness: .75 }),
  brass: new T.MeshStandardMaterial({ color: P.metal.agedBrass, metalness: .65, roughness: .36 }),
  copper: new T.MeshStandardMaterial({ color: P.metal.copper, metalness: .7, roughness: .48 }),
  wood: new T.MeshStandardMaterial({ map: surface('wood'), color: P.warm.timber, roughness: .9 }),
  teal: new T.MeshStandardMaterial({ color: P.cool.teal, roughness: .78 }),
  red: new T.MeshStandardMaterial({ color: P.warm.crimson, roughness: .8 }),
  cream: new T.MeshStandardMaterial({ color: P.neutral.ivory, roughness: .8 }),
  glow: new T.MeshStandardMaterial({ color: P.warm.lamp, emissive: P.warm.lamp, emissiveIntensity: 1.1, roughness: .45 }),
  aether: new T.MeshStandardMaterial({ color: P.aether.white, emissive: P.aether.glow, emissiveIntensity: 1.4, metalness: .4, roughness: .3 }),
  dark: new T.MeshStandardMaterial({ color: P.metal.steel, roughness: .5 }),
  leaf: new T.MeshStandardMaterial({ color: worldColors.leaf[0], roughness: .95 }),
};
// Four shared glass treatments replace uniformly luminous window cutouts.
export const windowGlass = [0,1,2,3].map(i => {
  const c=document.createElement('canvas');c.width=128;c.height=256;const ctx=c.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,['#775846','#76504c','#425b6b','#2d3c48'][i]);gradient.addColorStop(1,['#e8be70','#e2a76c','#8bb6ae','#50616d'][i]);ctx.fillStyle=gradient;ctx.fillRect(0,0,128,256);
  ctx.fillStyle='#14272d50';ctx.fillRect(6,0,10,256);ctx.fillRect(112,0,10,256);
  ctx.fillStyle='#efd4ac38';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(50,0);ctx.lineTo(95,256);ctx.lineTo(74,256);ctx.fill();
  if(i===1){ctx.fillStyle='#312d36';ctx.beginPath();ctx.arc(77,168,13,0,Math.PI*2);ctx.fill();ctx.fillRect(62,180,30,75);}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;
  return new T.MeshStandardMaterial({map:t,emissiveMap:t,emissive:'#ffffff',emissiveIntensity:i===3?.06:.6,roughness:.38,metalness:.12});
});
export type Material = T.Material;
const boxGeo = new T.BoxGeometry(1, 1, 1); const cylinderGeo = new T.CylinderGeometry(1, 1, 1, 12); const sphereGeo = new T.SphereGeometry(1, 12, 8);
export function box(g: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, m: Material = mats.iron) { let geometry = boxGeo; if (m instanceof T.MeshStandardMaterial && m.map) { geometry = boxGeo.clone(); const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { const face = Math.floor(i / 4); const sx = face < 2 ? d / 2 : w / 2; const sy = face === 2 || face === 3 ? d / 2 : h / 2; uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); } } const mesh = new T.Mesh(geometry, m); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; }
export function cyl(g: T.Object3D, x: number, y: number, z: number, r: number, h: number, m: Material = mats.iron) { const mesh = new T.Mesh(cylinderGeo, m); mesh.position.set(x, y, z); mesh.scale.set(r, h, r); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; }
export function sphere(g: T.Object3D, x: number, y: number, z: number, r: number, m: Material = mats.brass) { const mesh = new T.Mesh(sphereGeo, m); mesh.position.set(x, y, z); mesh.scale.setScalar(r); g.add(mesh); return mesh; }
export function torus(g: T.Object3D, x: number, y: number, z: number, r: number, tube: number, m: Material = mats.brass) { const mesh = new T.Mesh(new T.TorusGeometry(r, tube, 6, 20), m); mesh.position.set(x, y, z); g.add(mesh); return mesh; }
export function beam(g: T.Object3D, a: T.Vector3, b: T.Vector3, radius: number, mat: Material = mats.iron) { const c = cyl(g, 0, 0, 0, radius, a.distanceTo(b), mat); c.position.copy(a).add(b).multiplyScalar(.5); c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return c; }
export function sign(g: T.Object3D, text: string, sub: string, x: number, y: number, z: number, width = 6, height = 1.2, theme = '#bfa16b') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const ctx = c.getContext('2d')!; ctx.fillStyle = '#172829'; ctx.fillRect(0, 0, 1024, 256); ctx.strokeStyle = theme; ctx.lineWidth = 4; ctx.strokeRect(14, 14, 996, 228); ctx.strokeRect(24, 24, 976, 208); ctx.fillStyle = theme; ctx.textAlign = 'center'; ctx.font = '900 66px sans-serif'; ctx.fillText(text.toUpperCase(), 512, 121, 930); ctx.font = 'bold 24px sans-serif'; ctx.fillText(sub.toUpperCase().split('').join(' '), 512, 183, 880); const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map: tex, roughness: .7, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .3 })); mesh.position.set(x, y, z); g.add(mesh); return mesh;
}
export function arch(g: T.Object3D, x: number, y: number, z: number, w: number, h: number, mat: Material) { const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); const geo = new T.ShapeGeometry(s, 8); const uv = geo.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,(uv.getX(i)+w/2)/w,uv.getY(i)/h); const m = new T.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; }
export function windowUnit(g: T.Object3D, x: number, y: number, z: number, lit = true, w = 1.35, h = 2.3) { arch(g, x, y, z, w + .25, h + .13, mats.stone); arch(g, x, y + .08, z + .025, w, h - .1, lit ? windowGlass[Math.abs(Math.floor(x*3+y))%3] : windowGlass[3]); box(g, x, y + .06, z + .13, w + .4, .16, .35, mats.stone); box(g, x, y + h * .45, z + .05, w, .09, .08, mats.iron); box(g, x, y + h * .45, z + .07, .075, h * .9, .08, mats.iron); }
export function gear(g: T.Object3D, x: number, y: number, z: number, r: number) { const group = new T.Group(); group.position.set(x, y, z); torus(group, 0, 0, 0, r * .78, r * .16); const hub = cyl(group, 0, 0, 0, r * .24, .26, mats.iron); hub.rotation.x = Math.PI / 2; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const tooth = box(group, Math.cos(a) * r, Math.sin(a) * r, 0, r * .27, r * .28, .28, mats.brass); tooth.rotation.z = a; } for (let i = 0; i < 4; i++) { const spoke = box(group, 0, 0, 0, r * 1.5, r * .13, .18, mats.copper); spoke.rotation.z = i * Math.PI / 4; } g.add(group); bake(group); return group; }
export function barrel(g: T.Object3D, x: number, y: number, z: number) { cyl(g, x, y + .55, z, .42, 1.1, mats.wood); for (const yy of [.18, .85]) cyl(g, x, y + yy, z, .44, .09, mats.iron); }
export function crate(g: T.Object3D, x: number, y: number, z: number, size = 1) { box(g, x, y + size / 2, z, size, size, size, mats.wood); for (const yy of [.1, .9]) box(g, x, y + yy * size, z + size / 2 + .01, size, .08, .06, mats.iron); const b = box(g, x, y + size / 2, z + size / 2 + .04, size * 1.3, .09, .05, mats.cream); b.rotation.z = Math.PI / 4; }
export function tree(g: T.Object3D, x: number, z: number, scale = 1) { const t = new T.Group(); t.position.set(x, 0, z); t.scale.setScalar(scale); cyl(t, 0, 1.8, 0, .17, 3.6, mats.wood); for (let i = 0; i < 5; i++) { const a = i * 2.4; const mesh = new T.Mesh(new T.IcosahedronGeometry(1.2, 1), mats.leaf); mesh.position.set(Math.cos(a) * .7, 3.1 + i * .24, Math.sin(a) * .7); mesh.scale.y = 1.2; t.add(mesh); } g.add(t); }
/** Bake procedural architectural detail into one draw call per shared material. */
export function bake(group: T.Group) {
  group.updateMatrixWorld(true); const inverse = group.matrixWorld.clone().invert(); const buckets = new Map<Material, T.BufferGeometry[]>();
  group.traverse(o => { if (o instanceof T.Mesh && !Array.isArray(o.material)) { let geos = buckets.get(o.material); if (!geos) { geos = []; buckets.set(o.material, geos); } let geo = o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)); if (geo.index) geo = geo.toNonIndexed(); if (!geo.attributes.uv) geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2)); geos.push(geo); } });
  group.clear(); for (const [mat, geos] of buckets) { const merged = mergeGeometries(geos, false); if (!merged) continue; // Slightly imperfect silhouettes, like assembled painted miniatures.
    // The deterministic field keeps coincident vertices together.
    const mesh = new T.Mesh(merged, mat); mesh.castShadow = mat!==mats.stone&&mat!==mats.brass&&!windowGlass.includes(mat as T.MeshStandardMaterial);mesh.receiveShadow=true; group.add(mesh); geos.forEach(g => g.dispose()); } return group;
}

/** Matte ink-and-gouache lighting, shared by the whole material palette. */
export function illustrated(material: T.MeshStandardMaterial) {
  material.metalness = Math.min(material.metalness, .12);
  material.roughness = Math.max(material.roughness, .8);
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
      `vec3 lightRatio = totalDiffuse / max(diffuseColor.rgb, vec3(0.025));
       float lightValue = dot(lightRatio, vec3(0.2126, 0.7152, 0.0722));
       float band = mix(0.40, 0.73, smoothstep(0.75, 0.8, lightValue));
       band = mix(band, 1.0, smoothstep(1.55, 1.62, lightValue));
       vec3 shade = mix(vec3(0.72, 0.77, 0.96), vec3(1.0, .99, .97), step(0.7, band));
       vec3 outgoingLight = diffuseColor.rgb * band * shade + totalSpecular * .12 + totalEmissiveRadiance;`
    );
  };
  material.customProgramCacheKey = () => 'terra-composed-gouache-v3';
  return material;
}
for (const material of Object.values(mats)) illustrated(material);

/** Restore selected materials, not a global saturation filter. Shared meshes follow. */
export function applyWorldPalette(stage:number){
  const phase=Math.min(2,stage/2.5),a=Math.floor(phase),b=Math.min(2,a+1);
  for(const [key,colors] of Object.entries(worldColors))mats[key as keyof typeof worldColors].color.set(colors[a]).lerp(new T.Color(colors[b]),phase-a);
  mats.brass.roughness=.82-stage*.045;mats.brass.metalness=.16+stage*.012;
  mats.copper.roughness=.78-stage*.026;mats.copper.metalness=.16;
}
