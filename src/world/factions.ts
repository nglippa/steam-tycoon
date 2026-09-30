import * as T from 'three';
import { illustrated, printed, surface, seeded } from './assets';

/** Three visual languages share Terra's streets. Each is a closed palette so a glance
 * tells you whose hand made a thing: the Ordinance that occupies the city, the Embers
 * who resist it, and the ancient sky civilization underneath both. */
export const ordinance = { charcoal: '#262826', iron: '#353b36', green: '#3b463a', rust: '#6b3a2a', oxblood: '#5c2228', bone: '#cbbf9f' };
export const ancient = { ivory: '#ece2cb', stone: '#dbcfb4', turquoise: '#2f9c97', deep: '#1d6d70', gold: '#d8aa48', aether: '#8af0ec', water: '#5fc6c9' };
export const embers = { chalk: '#efe9da', ember: '#e27a3c' };

type Ctx = CanvasRenderingContext2D;
function texture(w: number, h: number, draw: (x: Ctx) => void) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; }
const stencilFont = (px: number) => `900 ${px}px "Avenir Next Condensed","DIN Condensed","Arial Narrow",sans-serif`;
/** Painted grime: specks and faded vertical runs, so nothing printed looks new. */
function weather(x: Ctx, w: number, h: number, seed: number, amount = 1) { const r = seeded(seed); x.save(); x.globalAlpha = .18 * amount; x.fillStyle = '#16140f';
  for (let i = 0; i < 90 * amount; i++) x.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 4);
  for (let i = 0; i < 14 * amount; i++) { const px = r() * w; x.fillRect(px, r() * h * .4, 2 + r() * 5, h * (.2 + r() * .6)); } x.restore(); }

/** The Ordinance clamp: two brackets gripping a bar, a weight held in place. */
export function drawClamp(x: Ctx, cx: number, cy: number, s: number, color: string) {
  x.save(); x.strokeStyle = x.fillStyle = color; x.lineWidth = s * .17; x.lineCap = 'butt'; x.lineJoin = 'miter';
  for (const d of [-1, 1]) { x.beginPath(); x.moveTo(cx + d * .28 * s, cy - .62 * s); x.lineTo(cx + d * .62 * s, cy - .62 * s); x.lineTo(cx + d * .62 * s, cy + .62 * s); x.lineTo(cx + d * .28 * s, cy + .62 * s); x.stroke(); }
  x.fillRect(cx - .47 * s, cy - .09 * s, .94 * s, .18 * s);
  x.beginPath(); x.moveTo(cx, cy - .44 * s); x.lineTo(cx + .14 * s, cy - .22 * s); x.lineTo(cx, cy - .1 * s); x.lineTo(cx - .14 * s, cy - .22 * s); x.closePath(); x.fill(); x.restore();
}
/** The Embers: a ring left open at the top, a flame rising out of it. Drawn in chalk. */
export function drawEmber(x: Ctx, cx: number, cy: number, s: number, color: string, chalk = true) {
  const r = seeded(Math.round(cx * 7 + cy)); x.save(); x.strokeStyle = x.fillStyle = color; x.lineCap = 'round';
  const passes = chalk ? 3 : 1;
  for (let p = 0; p < passes; p++) { const j = () => chalk ? (r() - .5) * s * .05 : 0;
    x.globalAlpha = chalk ? .55 : 1; x.lineWidth = s * (chalk ? .07 : .1);
    x.beginPath(); x.arc(cx + j(), cy + j(), s * .5, -Math.PI * .32, Math.PI * 1.32, true); x.stroke();
    x.beginPath(); x.moveTo(cx + j(), cy + s * .32); x.bezierCurveTo(cx - s * .3, cy + s * .1, cx - s * .12, cy - s * .25, cx + j(), cy - s * .7); x.bezierCurveTo(cx + s * .1, cy - s * .3, cx + s * .3, cy + s * .05, cx + j(), cy + s * .32); if (chalk) x.stroke(); else x.fill(); }
  x.restore();
}
/** Ancient Terra's sign: the sun-ring above a floating isle whose waters fall away. */
export function drawSkyIsle(x: Ctx, cx: number, cy: number, s: number, color: string) {
  x.save(); x.strokeStyle = x.fillStyle = color; x.lineWidth = s * .08;
  x.beginPath(); x.arc(cx, cy - s * .32, s * .34, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(cx - s * .72, cy + s * .2); x.lineTo(cx + s * .72, cy + s * .2); x.quadraticCurveTo(cx + s * .3, cy + s * .34, cx, cy + s * .72); x.quadraticCurveTo(cx - s * .3, cy + s * .34, cx - s * .72, cy + s * .2); x.fill();
  x.lineWidth = s * .05; for (const d of [-.42, .42]) { x.beginPath(); x.moveTo(cx + d * s, cy + s * .34); x.lineTo(cx + d * s * 1.05, cy + s * .82); x.stroke(); }
  x.restore();
}
function swallowtail(x: Ctx, w: number, h: number) { x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h); x.lineTo(w / 2, h * .9); x.lineTo(0, h); x.closePath(); }

export const regimeBanner = texture(256, 1024, x => {
  swallowtail(x, 256, 1024); x.fillStyle = ordinance.charcoal; x.fill(); x.save(); x.clip();
  x.fillStyle = ordinance.oxblood; x.fillRect(58, 0, 140, 1024);
  x.strokeStyle = ordinance.green; x.lineWidth = 12; swallowtail(x, 256, 1024); x.stroke();
  drawClamp(x, 128, 230, 92, ordinance.bone);
  x.fillStyle = ordinance.bone; x.font = stencilFont(74); x.textAlign = 'center'; x.textBaseline = 'middle';
  [...'ORDER'].forEach((l, i) => x.fillText(l, 128, 420 + i * 86));
  weather(x, 256, 1024, 11); x.restore();
});
export const civicBanner = texture(256, 1024, x => {
  swallowtail(x, 256, 1024); x.fillStyle = ancient.ivory; x.fill(); x.save(); x.clip();
  x.fillStyle = ancient.turquoise; x.fillRect(64, 0, 128, 1024);
  x.strokeStyle = ancient.gold; x.lineWidth = 6; for (const px of [58, 198]) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, 1024); x.stroke(); }
  drawSkyIsle(x, 128, 250, 100, ancient.gold);
  x.fillStyle = ancient.gold; for (let i = 0; i < 5; i++) { const y = 460 + i * 80; x.beginPath(); x.moveTo(128, y - 18); x.lineTo(146, y); x.lineTo(128, y + 18); x.lineTo(110, y); x.closePath(); x.fill(); }
  weather(x, 256, 1024, 23, .35); x.restore();
});
/** The checkpoint hoarding: "WITHOUT ORDER, TERRA FALLS", a floating city cracking into
 * the clouds. Its defacement shares the same metrics so the chalk lands on the words. */
export const propaganda = (() => {
  const W = 2048, H = 272, left = 520, right = 1528; let orderX = 0, orderW = 0;
  const board = texture(W, H, x => {
    x.fillStyle = ordinance.bone; x.fillRect(0, 0, W, H); x.strokeStyle = ordinance.charcoal; x.lineWidth = 14; x.strokeRect(10, 10, W - 20, H - 20);
    x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = stencilFont(118); x.fillStyle = ordinance.charcoal;
    const lead = 'WITHOUT ', word = 'ORDER', total = x.measureText(lead + word).width; const start = left - total / 2; x.fillText(lead + word, start, H * .47); orderX = start + x.measureText(lead).width; orderW = x.measureText(word).width;
    x.textAlign = 'center'; x.fillStyle = ordinance.oxblood; x.fillText('TERRA FALLS', right, H * .47);
    x.font = stencilFont(26); x.fillStyle = ordinance.charcoal; x.fillText('THE ORDINANCE KEEPS TERRA ALOFT  ·  WARD 07', right, H * .84);
    for (const cx of [70, W - 70]) drawClamp(x, cx, H / 2, 70, ordinance.oxblood);
    // The picture: a tilted isle, cracked through, shedding stones into scalloped cloud.
    x.save(); x.translate(1024, 118); x.rotate(-.2); x.fillStyle = ordinance.charcoal;
    x.beginPath(); x.moveTo(-150, 0); x.lineTo(150, 0); x.lineTo(40, 110); x.lineTo(0, 150); x.lineTo(-60, 90); x.closePath(); x.fill();
    for (const [bx, bw, bh] of [[-120, 26, 60], [-80, 34, 92], [-30, 22, 130], [10, 40, 76], [70, 28, 104], [112, 22, 50]]) x.fillRect(bx, -bh, bw, bh);
    x.strokeStyle = ordinance.bone; x.lineWidth = 7; x.beginPath(); x.moveTo(-10, -40); x.lineTo(12, 20); x.lineTo(-6, 70); x.lineTo(14, 128); x.stroke(); x.restore();
    x.fillStyle = ordinance.charcoal; for (const [px, py, s] of [[1080, 222, 16], [1112, 248, 10], [990, 238, 12], [1150, 214, 8]]) x.fillRect(px, py, s, s);
    x.fillStyle = '#9d9580'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(860 + i * 42, 262, 34, Math.PI, 0); x.fill(); }
    weather(x, W, H, 5, 1.4);
  });
  const defaced = texture(W, H, x => {
    // Brushed in ember paint, fast: ORDER struck out, US written over it, the ember signed beside.
    const r = seeded(77); x.strokeStyle = x.fillStyle = embers.ember; x.lineCap = 'round';
    for (let p = 0; p < 2; p++) { x.globalAlpha = .9; x.lineWidth = 16; x.beginPath(); x.moveTo(orderX - 14, H * .52 + (r() - .5) * 10); x.lineTo(orderX + orderW + 14, H * .42 + (r() - .5) * 10); x.stroke(); }
    x.save(); x.translate(orderX + orderW / 2, H * .2); x.rotate(-.06); x.globalAlpha = .95; x.font = `900 120px "Marker Felt","Chalkduster",fantasy`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = ordinance.charcoal; x.strokeText('US', 0, 0); x.fillText('US', 0, 0); x.restore();
    for (let i = 0; i < 6; i++) { x.globalAlpha = .8; x.fillRect(orderX + 20 + r() * orderW, H * .3 + r() * 20, 5, 20 + r() * 50); }
    drawEmber(x, orderX + orderW + 100, H * .5, 170, embers.ember, false);
    x.globalAlpha = 1; x.fillStyle = ordinance.iron; x.beginPath(); x.moveTo(W - 330, 0); x.lineTo(W - 180, 0); x.lineTo(W - 250, 90); x.lineTo(W - 300, 60); x.closePath(); x.fill();
  });
  return { board, defaced };
})();
export const sealPlaque = texture(256, 256, x => { x.fillStyle = ordinance.oxblood; x.beginPath(); x.arc(128, 128, 120, 0, Math.PI * 2); x.fill(); x.strokeStyle = ordinance.bone; x.lineWidth = 8; x.beginPath(); x.arc(128, 128, 104, 0, Math.PI * 2); x.stroke(); drawClamp(x, 128, 128, 70, ordinance.bone); weather(x, 256, 256, 3); });
export function stencilPlate(text: string, w: number, h: number) { return texture(Math.round(w * 160), Math.round(h * 160), x => { const W = x.canvas.width, H = x.canvas.height; x.fillStyle = ordinance.charcoal; x.fillRect(0, 0, W, H); x.fillStyle = ordinance.bone; x.font = stencilFont(H * .56); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2, W * .92); weather(x, W, H, text.length); }); }
export const emberChalk = texture(256, 256, x => drawEmber(x, 128, 136, 170, embers.chalk));
/** The regime's quota board. Prosperity raises the number; it never changes who sets it. */
export function quotaBoard(quota: string) { return texture(384, 288, x => {
  x.fillStyle = ordinance.charcoal; x.fillRect(0, 0, 384, 288); x.strokeStyle = ordinance.oxblood; x.lineWidth = 10; x.strokeRect(8, 8, 368, 272);
  drawClamp(x, 48, 50, 36, ordinance.bone); x.fillStyle = ordinance.bone; x.textAlign = 'left'; x.textBaseline = 'middle';
  x.font = stencilFont(30); x.fillText('ORDINANCE WORKS No. 3', 84, 42, 280); x.font = stencilFont(22); x.fillText('SHIFT QUOTA · CASTINGS', 84, 72, 280);
  x.textAlign = 'center'; x.font = stencilFont(92); x.fillText(quota, 192, 150); x.fillStyle = ordinance.oxblood; x.fillRect(40, 204, 304, 6);
  x.fillStyle = ordinance.bone; x.font = stencilFont(28); x.fillText('WORK IS ORDER', 192, 244); weather(x, 384, 288, quota.length * 7); }); }
export const councilBoard = texture(384, 288, x => {
  x.fillStyle = '#2c3a33'; x.fillRect(0, 0, 384, 288); x.strokeStyle = '#6b5a44'; x.lineWidth = 12; x.strokeRect(6, 6, 372, 276);
  x.fillStyle = embers.chalk; x.globalAlpha = .9; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = '700 30px "Marker Felt","Chalkduster",fantasy';
  x.fillText('WORKS COUNCIL', 30, 40); x.font = '600 22px "Marker Felt","Chalkduster",fantasy';
  ['EARLY  Holt · Marr · Oyelaran', 'LATE    Vess · Corrin · Ada', 'RINGS   everyone, Thursday', 'NO QUOTA. REST ON THE HOUR.'].forEach((t, i) => x.fillText(t, 30, 92 + i * 44, 270));
  drawEmber(x, 330, 230, 80, embers.ember, false);
});
export const tallies = texture(256, 128, x => { const r = seeded(31); x.strokeStyle = embers.chalk; x.lineCap = 'round'; x.globalAlpha = .8; x.lineWidth = 4;
  for (let g = 0; g < 4; g++) { const gx = 14 + g * 44; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(gx + k * 8, 30 + r() * 4); x.lineTo(gx + k * 8 + 2, 74 + r() * 4); x.stroke(); } x.beginPath(); x.moveTo(gx - 4, 66); x.lineTo(gx + 32, 38); x.stroke(); }
  drawEmber(x, 222, 64, 70, embers.chalk); });
export const emberPaint = texture(256, 256, x => drawEmber(x, 128, 136, 170, embers.ember, false));
/** Ancient paving: a sun medallion of ivory rays and turquoise tile set around the spring. */
export const medallion = texture(1024, 1024, x => {
  const c = 512, R = 500; x.fillStyle = ancient.stone; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill();
  const ring = (r0: number, r1: number, color: string) => { x.fillStyle = color; x.beginPath(); x.arc(c, c, r1 * R, 0, Math.PI * 2); x.arc(c, c, r0 * R, 0, Math.PI * 2, true); x.fill(); };
  ring(.84, .97, ancient.turquoise); ring(.82, .84, ancient.gold); ring(.97, 1, ancient.gold);
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; x.strokeStyle = ancient.deep; x.lineWidth = 3; x.beginPath(); x.moveTo(c + Math.cos(a) * .84 * R, c + Math.sin(a) * .84 * R); x.lineTo(c + Math.cos(a) * .97 * R, c + Math.sin(a) * .97 * R); x.stroke(); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, w = Math.PI / 16 * .55; x.fillStyle = i % 2 ? ancient.ivory : ancient.turquoise;
    x.beginPath(); x.moveTo(c + Math.cos(a) * .42 * R, c + Math.sin(a) * .42 * R); x.lineTo(c + Math.cos(a - w) * .78 * R, c + Math.sin(a - w) * .78 * R); x.lineTo(c + Math.cos(a) * .8 * R, c + Math.sin(a) * .8 * R); x.lineTo(c + Math.cos(a + w) * .78 * R, c + Math.sin(a + w) * .78 * R); x.closePath(); x.fill(); }
  ring(.4, .42, ancient.gold);
  x.strokeStyle = 'rgba(90,76,52,.35)'; x.lineWidth = 2; for (const r of [.55, .68]) { x.beginPath(); x.arc(c, c, r * R, 0, Math.PI * 2); x.stroke(); }
  weather(x, 1024, 1024, 41, .5);
});
export const tiles = texture(256, 256, x => { x.fillStyle = ancient.deep; x.fillRect(0, 0, 256, 256); const r = seeded(9); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = r() > .5 ? ancient.turquoise : '#34a8a1'; x.fillRect(i * 64 + 4, j * 64 + 4, 56, 56); } });
tiles.wrapS = tiles.wrapT = T.RepeatWrapping;
export const grime = texture(512, 512, x => { const r = seeded(15); const g = x.createRadialGradient(256, 256, 60, 256, 256, 256); g.addColorStop(0, 'rgba(24,22,18,.8)'); g.addColorStop(.8, 'rgba(24,22,18,.68)'); g.addColorStop(1, 'rgba(24,22,18,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 70; i++) { x.globalAlpha = .15 + r() * .4; x.beginPath(); x.arc(r() * 512, r() * 512, 8 + r() * 34, 0, Math.PI * 2); x.fill(); } });

const lit = (color: string, map?: T.Texture) => illustrated(new T.MeshStandardMaterial({ color, map: map ?? null }));
/** One sweeping-light material for every occupation searchlight and floodlight: opacity follows the night. */
export const beamMat = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d')!; const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,236,196,1)'); g.addColorStop(.35, 'rgba(255,236,196,.45)'); g.addColorStop(1, 'rgba(255,236,196,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 128);
  return new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, opacity: 0, fog: false }); })();
export function lightCone(parent: T.Object3D, radius: number, length: number) { const cone = new T.ConeGeometry(radius, length, 20, 1, true); cone.translate(0, -length / 2, 0); const m = new T.Mesh(cone, beamMat); parent.add(m); return m; }
export const canvasTarp = illustrated(new T.MeshStandardMaterial({ color: '#58563f', side: T.DoubleSide }));
export const occupationMats = { iron: lit(ordinance.iron, surface('metal')), green: lit(ordinance.green), oxblood: lit(ordinance.oxblood), rust: lit(ordinance.rust), bone: lit(ordinance.bone) };
export const ancientMats = { ivory: lit(ancient.ivory, surface('stone')), ivoryDark: lit('#8c8676'), turquoise: lit(ancient.turquoise), gold: lit(ancient.gold), tile: lit('#ffffff', tiles), dormant: lit('#51677a'),
  awake: new T.MeshStandardMaterial({ color: ancient.aether, emissive: ancient.aether, emissiveIntensity: 1.6, roughness: .3 }) };
ancientMats.dormant.side = ancientMats.awake.side = T.DoubleSide;
// Ancient stone keeps a little of its own light: in backlight it reads as pale stone, not grey concrete.
ancientMats.ivory.emissive.set('#3d3628');
/** Printed cloth and paper: lit like the world, but the ink pass keeps out of the lettering. */
export function printedMat(map: T.Texture, doubleSide = false) { const m = printed(illustrated(new T.MeshStandardMaterial({ map, alphaTest: .5 }))); if (doubleSide) m.side = T.DoubleSide; return m; }
export function decalMat(map: T.Texture, opacity = .9) { return new T.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); }

/** Water and aether that travel: uv.x is metres along the circuit from the spring, so a
 * single front uniform can wake the whole system in order and pulses run outward. */
export type FlowClock = { time: { value: number }; front: { value: number } };
export const flowClock: FlowClock = { time: { value: 0 }, front: { value: 0 } };
/** Each restored site owns a clock, so one waking never replays another. */
export function flowMaterial(color: string, kind: 'water' | 'aether', opacity: number, clock: FlowClock = flowClock) {
  const aether = kind === 'aether';
  const m = new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false, side: T.DoubleSide, blending: aether ? T.AdditiveBlending : T.NormalBlending, polygonOffset: true, polygonOffsetFactor: -2 });
  m.onBeforeCompile = sh => {
    sh.uniforms.flowTime = clock.time; sh.uniforms.flowFront = clock.front;
    sh.vertexShader = 'varying vec2 vFlow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlow = uv;');
    sh.fragmentShader = 'uniform float flowTime, flowFront;\nvarying vec2 vFlow;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float reach = smoothstep(flowFront, flowFront - 1.4, vFlow.x);
      ${aether
        ? 'float pulse = pow(.5 + .5 * sin((vFlow.x - flowTime * 2.4) * 1.1), 4.); float crest = smoothstep(flowFront - 3., flowFront, vFlow.x) * step(vFlow.x, flowFront);\n      diffuseColor.rgb *= .45 + 1.1 * pulse + 2.2 * crest; diffuseColor.a *= reach * (1. - abs(vFlow.y - .5) * 1.4);'
        : 'float ripple = .5 + .5 * sin(vFlow.x * 6. - flowTime * 4.5 + sin(vFlow.y * 9. + flowTime * 1.7) * 1.4);\n      diffuseColor.rgb *= .8 + .4 * ripple; diffuseColor.a *= reach;'}`);
  };
  m.customProgramCacheKey = () => 'terra-flow-' + kind;
  return m;
}
/** A flat strip along a polyline. uv.x carries circuit distance from d0; uv.y spans the width. */
export function strip(points: T.Vector3[], normal: T.Vector3, width: number, d0: number, material: T.Material) {
  const pos: number[] = [], uv: number[] = [], nor: number[] = [], index: number[] = []; let d = d0;
  points.forEach((p, i) => { if (i) d += p.distanceTo(points[i - 1]); const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const side = new T.Vector3().subVectors(b, a).normalize().cross(normal).normalize().multiplyScalar(width / 2);
    pos.push(p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z); uv.push(d, 0, d, 1); nor.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
    if (i) { const k = i * 2; index.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(index);
  return { mesh: new T.Mesh(geo, material), end: d };
}
/** Worker-made bolt cutters: iron jaws, long handles taped in turquoise. */
export function boltCutters(g: T.Object3D, x: number, y: number, z: number, yaw: number, tilt = 0) {
  const c = new T.Group(); c.position.set(x, y, z); c.rotation.set(0, yaw, tilt); g.add(c);
  for (const s of [-1, 1]) { const h = new T.Mesh(new T.CylinderGeometry(.025, .025, 1.1, 6), occupationMats.iron); h.position.set(s * .05, .55, 0); h.rotation.z = s * .05; c.add(h); const grip = new T.Mesh(new T.CylinderGeometry(.034, .034, .32, 6), ancientMats.turquoise); grip.position.set(s * .07, .2, 0); c.add(grip); }
  const jaw = new T.Mesh(new T.BoxGeometry(.16, .22, .05), occupationMats.iron); jaw.position.y = 1.18; c.add(jaw); return c;
}
