import * as T from 'three';
import { faceAtlasNext, citizen, citizenNext, setCitizenProsperity, type Citizen, type Expression } from './world/citizens';
import { BUILT } from './world/people/figure';
import { CASTS, type CastId, type Family, type Frame } from './world/people/look';
import { animateLife, setLifeConditions, type Activity } from './world/citizen-life';
import { InkRenderer } from './world/ink-renderer';
import { tone, painted } from './world/tone';
import { palette, type Archetype } from './world/palette';
import { mats } from './world/assets';

/** Dev-only cast sheet (sheet.html): solo figures posed by the game's own `animateLife` and drawn through the game's ink pass. Not imported by the game.
 * ?roles=worker,guard &seeds=0,1,2 | 0-19 &view=front|quarter|side|back &pose=stand|stride|sit|raise|carry|bite &sil=1 &px=50 &stage=0..5 &light=game &labels=0 &zoom=3 &fy=.9
 * &build=old|new (the figure builder; default old) and, for the new one, &cast=labourer &family=slim|standard|sturdy &frame=broad|narrow to force part of the look, &look=officer for a story character;
 * &combos=labourer.sturdy.broad,rowCoat.slim.narrow,... one figure per entry (cast.family.frame) on a single row, for the family sheet */
const q = new URLSearchParams(location.search);
const ROLES: Archetype[] = ['worker', 'engineer', 'merchant', 'guard', 'resident', 'courier', 'ordinal'];
const roles = (q.get('roles') ?? ROLES.join(',')).split(',').filter((r): r is Archetype => ROLES.includes(r as Archetype));
const seeds = (() => { const s = q.get('seeds') ?? '3', r = /^(\d+)-(\d+)$/.exec(s); return r ? Array.from({ length: +r[2] - +r[1] + 1 }, (_, i) => +r[1] + i) : s.split(',').map(Number).filter(Number.isInteger); })();
const YAW: Record<string, number> = { front: 0, quarter: Math.PI / 4, side: Math.PI / 2, back: Math.PI };
const view = q.get('view') ?? 'front', how = q.get('pose') ?? 'stand', yaw = YAW[view] ?? 0;
const ACTIVITY: Record<string, Activity> = { stand: 'walk', stride: 'walk', sit: 'sit', raise: 'repair', carry: 'carry', bite: 'eat' };
const sil = q.get('sil') === '1', px = Number(q.get('px')) || 0, stage = Math.min(5, Math.max(0, Number(q.get('stage')) || 0));
const next = q.get('build') === 'new', force = { cast: (q.get('cast') as CastId | null) ?? undefined, family: (q.get('family') as Family | null) ?? undefined, frame: (q.get('frame') as Frame | null) ?? undefined, look: q.get('look') ?? undefined };
const combos = (q.get('combos') ?? '').split(',').filter(Boolean).map(c => { const [cast, family, frame] = c.split('.'); return { cast: cast as CastId, family: family as Family, frame: frame as Frame }; });
const make = (seed: number, role: Archetype, c = 0) => next ? citizenNext(mats.rust, seed, role, { solo: true, casts: BUILT, ...force, ...(combos[exprs.length ? 0 : c] ?? {}) }) : citizen(mats.rust, seed, role, { solo: true });
const WALK = 1; // m/s, the pace the stride is simulated at
// Roles run along one row when there is a single seed; otherwise roles are rows and seeds are columns.
const exprs = (q.get('expr') ?? '').split(',').filter(Boolean); // &expr=neutral,happy,... one head through several expressions
const lineup = seeds.length === 1, rows = exprs.length || combos.length ? 1 : lineup ? 1 : roles.length, cols = exprs.length ? exprs.length : combos.length ? combos.length : lineup ? roles.length : seeds.length;
const cell = (r: number, c: number) => exprs.length ? { role: roles[0], seed: seeds[0] } : combos.length ? { role: CASTS[combos[c].cast].archetype, seed: seeds[c % seeds.length] } : { role: lineup ? roles[c] : roles[r], seed: lineup ? seeds[0] : seeds[c] };

// ?atlas=next&rows=0,1&cols=0,1,2,3: the raw face atlas, unlit, on a flat quad (a dev view: what is really painted in a tile)
if (q.get('atlas')) {
  const c0 = document.querySelector<HTMLCanvasElement>('#sheet')!, r0 = new T.WebGLRenderer({ canvas: c0, preserveDrawingBuffer: true }); r0.setSize(innerWidth, innerHeight);
  const rows0 = (q.get('rows') ?? '0,1').split(',').map(Number), cols0 = (q.get('cols') ?? '0,1,2,3').split(',').map(Number), sc = new T.Scene(); sc.background = new T.Color('#9a9a94');
  const cam0 = new T.OrthographicCamera(0, cols0.length, 0, -rows0.length, -1, 1);
  rows0.forEach((r, j) => cols0.forEach((cc, i) => { const t = faceAtlasNext.clone(); t.needsUpdate = true; t.repeat.set(1 / 16, 1 / 8); t.offset.set(cc / 16, r / 8); const m = new T.Mesh(new T.PlaneGeometry(.98, .98), new T.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(i + .5, -j - .5, 0); m.scale.y = -1; sc.add(m); }));
  r0.render(sc, cam0); document.body.dataset.ready = '1'; throw new Error('atlas view');
}
const canvas = document.querySelector<HTMLCanvasElement>('#sheet')!;
const renderer = new T.WebGLRenderer({ canvas, antialias: sil, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); renderer.toneMapping = T.NoToneMapping; renderer.toneMappingExposure = 1.2; renderer.outputColorSpace = T.SRGBColorSpace;
const ink = new InkRenderer(renderer); ink.setQuality(true); ink.setRecovery(stage);
const scene = new T.Scene(); scene.background = new T.Color(sil ? '#ffffff' : '#8a8a86');

// Light: Atmosphere's clear weather at noon (day .5, full daylight), with the stage's smog. Same hemisphere, same sun colour and strength, same tone uniforms.
const smog = Math.max(0, 1 - stage / 3.5) * .75, C = new T.Color();
tone.lit.value.setRGB(1.24, 1.06, .84).lerp(C.setRGB(.95, .93, .88), smog * .2);
tone.shade.value.setRGB(.36, .4, .55).lerp(C.setRGB(.66, .64, .7), smog * .3);
tone.rim.value.set(palette.warm.lamp);
const hemi = new T.HemisphereLight('#ffffff', '#e8e8e8', 1.6); tone.ambient.value = hemi.intensity * .93 / Math.PI; scene.add(hemi);
const sun = new T.DirectionalLight('#fff3e0', 3.22); scene.add(sun, sun.target);
// The game's noon sun stands at (-48, 33, -46): ahead of its main view, so faces are in shade. A review needs the face read, so by default the same sun (same height and
// strength) is turned to stand over the camera's left shoulder; `light=game` keeps the game's own direction.
sun.position.set(-48, 33, q.get('light') === 'game' ? -46 : 46);
setCitizenProsperity(stage); setLifeConditions(stage, false);

// Pose: run the real animateLife on a simulated clock (no rendering), keep the frame that best shows the pose.
const save = (g: T.Object3D) => { const nodes: T.Object3D[] = []; g.traverse(o => o !== g && nodes.push(o)); return nodes.map(o => [o, o.position.clone(), o.quaternion.clone(), o.scale.clone()] as const); };
function simulate(n: Citizen) {
  const dt = 1 / 30, player = new T.Vector3(0, 1.7, 25), fwd = new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); // the player is in earshot, but never close enough to be greeted
  const warm = how === 'stride' ? 90 : how === 'bite' ? 45 : 60, window = how === 'stride' ? 48 : how === 'bite' ? 300 : 0;
  let best = -Infinity, snap: ReturnType<typeof save> | undefined;
  n.group.rotation.y = yaw; n.group.position.set(0, 0, 0);
  for (let i = 0; i < warm + window; i++) {
    const t = i * dt; if (how === 'stride') n.group.position.copy(fwd).multiplyScalar(t * WALK); // gait speed is read from real displacement
    animateLife(n, ACTIVITY[how] ?? 'walk', dt, t, false, player);
    if (i >= warm && window) { const s = how === 'stride' ? Math.max(n.knees[0].rotation.x, n.knees[1].rotation.x) : -n.elbows[0].rotation.x; if (s > best) { best = s; snap = save(n.group); } }
  }
  snap?.forEach(([o, p, r, s]) => { o.position.copy(p); o.quaternion.copy(r); o.scale.copy(s); });
}

const SX = cols > 10 ? .85 : 1, SY = 2.4, bench = painted(new T.MeshLambertMaterial({ color: '#6b5a46' }));
const figures: { role: Archetype; seed: number; n: Citizen; x: number; y: number }[] = [];
let tallest = 0;
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const { role, seed } = cell(r, c), n = make(seed, role, c);
  n.group.traverse(o => { if (o instanceof T.Mesh && o.geometry instanceof T.CircleGeometry) o.visible = false; }); // the contact disc is for pavement; the backdrop is a wall
  simulate(n); if (exprs.length) n.setExpression(exprs[c] as Expression, exprs[c] === 'blink'); scene.add(n.group); n.group.position.set(0, 0, 0); n.group.updateMatrixWorld(true);
  const sole = Math.min(...n.ankles.map(a => new T.Box3().setFromObject(a).min.y)), x = (c - (cols - 1) / 2) * SX, y = (rows - 1 - r) * SY;
  n.group.position.set(x, y - sole, 0); n.group.updateMatrixWorld(true);
  tallest = Math.max(tallest, new T.Box3().setFromObject(n.head).max.y - y);
  if (how === 'sit' || how === 'eat' || how === 'bite') { const hip = n.legs[0].getWorldPosition(new T.Vector3()), seat = new T.Mesh(new T.BoxGeometry(.6, .05, .42), bench); seat.position.set(x, hip.y - .12, -.04); scene.add(seat); }
  if (how === 'carry') { const mid = n.grips[0].getWorldPosition(new T.Vector3()).add(n.grips[1].getWorldPosition(new T.Vector3())).multiplyScalar(.5), crate = new T.Mesh(new T.BoxGeometry(.3, .2, .26), bench); crate.position.copy(n.group.worldToLocal(mid)); n.group.add(crate); }
  figures.push({ role, seed, n, x, y });
}
if (sil) scene.overrideMaterial = new T.MeshBasicMaterial({ color: 0x000000 });
else { const wall = new T.Mesh(new T.PlaneGeometry(200, 200), painted(new T.MeshLambertMaterial({ color: '#a4a39c' }))); wall.position.z = -1.2; scene.add(wall); }

// Camera: looks straight at the wall at the grid's mid height. `px` sets the on-screen height of a figure at the game's 68 degree FOV; otherwise the grid is framed
// (figure at most 70% of the viewport) at a 30 degree FOV, because the game's 68 degrees at a metre or two distorts a figure's proportions.
const aspect = innerWidth / innerHeight, fov = px ? 68 : 30, tan = Math.tan(fov * Math.PI / 360);
const gridW = (cols - 1) * SX + 1, gridH = (rows - 1) * SY + tallest;
const dist = px ? tallest * innerHeight / (px * 2 * tan) : Math.max(gridH * 1.1, gridW * 1.1 / aspect, tallest / .7) / (2 * tan);
const zoom = Number(q.get('zoom')) || 1, fy = q.get('fy'); // zoom and fy (a fraction of the figure's height) frame a close-up: the head is zoom=3.2&fy=.9
const camera = new T.PerspectiveCamera(fov, aspect, .08, 500), midY = fy !== null ? (rows - 1) * SY / 2 + tallest * Number(fy) : (rows - 1) * SY / 2 + tallest / 2;
camera.position.set(0, midY, dist / zoom); camera.lookAt(0, midY, 0); camera.updateMatrixWorld(true);

if (q.get('labels') !== '0' && !px) {
  const tag = (text: string, x: number, y: number) => { const e = document.createElement('div'); e.className = 'tag'; e.textContent = text; e.style.left = x + 'px'; e.style.top = y + 'px'; document.body.append(e); };
  for (const [c, f] of figures.entries()) { const p = new T.Vector3(f.x, f.y - .16, 0).project(camera); tag(combos.length ? combos[c].cast + ' ' + (combos[c].family ?? '') + ' ' + (combos[c].frame ?? '') : lineup ? f.role : String(f.seed), (p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight); }
  if (!lineup && !combos.length) roles.forEach((role, r) => { const p = new T.Vector3(0, (rows - 1 - r) * SY + tallest / 2, 0).project(camera); tag(role, 36, (1 - p.y) / 2 * innerHeight); });
}

/** Proportions from the actual geometry at scale 1, in the unposed construction (world metres). Height is sole to the crown of the skull mesh (no hair, no hat); the
 * shoulder width is the x extent of both shoulder groups' subtrees and the hip width that of the pelvis group (trousers and belt), so they include whatever the role wears there (boards, pads). */
function measure() {
  return figures.map(({ role, seed }, c) => {
    const n = make(seed, role, c), box = (o: T.Object3D) => new T.Box3().setFromObject(o, true);
    n.group.scale.set(1, 1, 1); n.group.updateMatrixWorld(true);
    const sole = Math.min(...n.ankles.map(a => box(a).min.y)), skull = box(n.face), arms = box(n.arms[0]).union(box(n.arms[1])), hips = box(n.pelvis);
    let tris = 0, meshes = 0, nodes = 0; n.group.traverse(o => { nodes++; if (o instanceof T.Mesh && !(o.geometry instanceof T.CircleGeometry)) { let v = o.visible, p: T.Object3D | null = o.parent; while (v && p) { v = p.visible; p = p.parent; } if (v) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } } });
    const height = skull.max.y - sole, head = skull.max.y - skull.min.y, r = (v: number) => Math.round(v * 1e4) / 1e4;
    return { role, seed, ...(combos[c] ?? {}), height: r(height), head: r(head), headsTall: r(height / head), tris, meshes, nodes, shoulderWidth: r(arms.max.x - arms.min.x), hipWidth: r(hips.max.x - hips.min.x) };
  });
}
/** Where a hand lands, for the poses that were solved against the old rig: the first grip (the food point of a bite) against the mouth, in the figure's own frame (metres, world, scale 1). */
function probe() {
  return figures.map(({ n }) => { n.group.updateMatrixWorld(true); const g = n.grips[0].getWorldPosition(new T.Vector3()), box = new T.Box3().setFromBufferAttribute(n.face.geometry.attributes.position as T.BufferAttribute), frac = next ? .125 : .238;
    const m = new T.Vector3(0, box.min.y + (box.max.y - box.min.y) * frac, box.max.z - (next ? .027 * (box.max.y - box.min.y) / .285 : .02)); n.face.localToWorld(m);
    const grips = n.grips.map(x => x.getWorldPosition(new T.Vector3())), sole = Math.min(...n.ankles.map(a => new T.Box3().setFromObject(a).min.y));
    const r = (v: T.Vector3) => [v.x, v.y - sole, v.z].map(q => Math.round(q * 1e3) / 1e3); return { grip: r(g), mouth: r(m), dist: Math.round(g.distanceTo(m) * 1e3) / 1e3, gripGap: Math.round(grips[0].distanceTo(grips[1]) * 1e3) / 1e3, gripHeight: r(grips[0])[1] }; });
}
(window as unknown as { __SHEET__: unknown }).__SHEET__ = { measure, probe, roles, seeds, view, pose: how, sil, px, stage, dist };

// A fixed few frames let the shaders and textures settle, then rendering stops.
let frames = 0;
const draw = () => {
  if (sil) renderer.render(scene, camera); else ink.render(scene, camera);
  if (++frames < 3) requestAnimationFrame(draw); else document.body.dataset.ready = '1';
};
requestAnimationFrame(draw);
