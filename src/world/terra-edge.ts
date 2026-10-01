import * as T from 'three';
import { box, cyl, sphere, torus, mats, bake, surface, illustrated } from './assets';
import { V } from './art-kit';
import { skylineMaterial } from './architecture';
import { ancientMats } from './factions';
import type { City } from './city';
import type { Player } from '../player/controller';
import { tone } from './tone';
import { CHASM, WEST_EDGE, GALLERY, TENDING } from './geography';
export { CHASM, WEST_EDGE, GALLERY, skyGap } from './geography';

/** The south edge of Terra, behind the arrival gate. The ward ends at a cliff; an old
 * ivory terrace juts past it, and from its balustrade the drop is the whole view: a
 * spillway pouring off into nothing, ancient ribs under the rim, a lesser isle hung on
 * chains far below, and the cloud sea (WeatherArt) with Locke showing through. */
export const EDGE_Z = 84, TERRACE = { half: 24.2, z: 88.6 };
/** Painted cloud cards: soft lobes on a transparent card, tinted by the light key each frame. */
let clouds: T.MeshBasicMaterial | undefined;
export function cloudMaterial() {
  if (clouds) return clouds;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d')!;
  for (let k = 0; k < 14; k++) { const cx = 70 + k * 27 + Math.sin(k * 2.3) * 18, cy = 150 - Math.abs(Math.sin(k * 1.7)) * 60, r = 46 + (k * 13) % 34;
    const g = x.createRadialGradient(cx, cy, r * .2, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.7, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
  const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
  return clouds = new T.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: T.DoubleSide, color: '#f3efe6' });
}
const cloudBase = new T.Color('#f3efe6');
export const rock = illustrated(new T.MeshStandardMaterial({ color: '#817a70', map: surface('stone') }));

export class TerraEdge {
  /** The lift between the terrace and the gallery: who rides, where to, how far along. */
  ride?: { player: Player; down: boolean; t: number }; cage = new T.Group(); private last = 0;
  root = new T.Group(); fall: T.Mesh; water: T.MeshBasicMaterial; private waterBase = new T.Color('#dff5f2'); isle = new T.Group(); farIsle!: T.Group; eastIsle!: T.Group; birds: T.InstancedMesh; waterTime = { value: 0 };
  constructor(public city: City) {
    city.root.add(this.root); const g = new T.Group(); this.root.add(g); const I = ancientMats.ivory, G = ancientMats.gold;
    // The plate Terra stands on: the ward and the far ring sit on it, with bastions and the
    // terrace promontory breaking the rim. Ninety metres of cliff; the haze takes the rest.
    const rim: [number, number][] = [[-150, -150], [CHASM.x0, -150], [CHASM.x0, TENDING.z0], [TENDING.x0, TENDING.z0], [TENDING.x0, TENDING.z1], [CHASM.x0, TENDING.z1], [CHASM.x0, CHASM.z1], [CHASM.x1, CHASM.z1], [CHASM.x1, -150], [150, -150], [150, EDGE_Z], [78, EDGE_Z], [78, 90], [62, 90], [62, EDGE_Z], [TERRACE.half, EDGE_Z], [TERRACE.half, TERRACE.z], [-TERRACE.half, TERRACE.z], [-TERRACE.half, EDGE_Z], [-62, EDGE_Z], [-62, 90], [-78, 90], [-78, EDGE_Z], [-150, EDGE_Z], [-150, WEST_EDGE.z1 + (WEST_EDGE.x + 150) * WEST_EDGE.flare], [WEST_EDGE.x, WEST_EDGE.z1], [WEST_EDGE.x, WEST_EDGE.z0], [-150, WEST_EDGE.z0 - (WEST_EDGE.x + 150) * WEST_EDGE.flare]];
    const depth = 90, slab = new T.ExtrudeGeometry(new T.Shape(rim.map(([x, z]) => new T.Vector2(x, -z))), { depth, bevelEnabled: false });
    const uv = slab.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * .08, uv.getY(i) * .08);
    const plate = new T.Mesh(slab, [mats.dirt, rock]); plate.rotation.x = -Math.PI / 2; plate.position.y = -depth - .02; plate.receiveShadow = true; this.root.add(plate);
    // Seen from below, the plate is raw rock, not paving: a rock sheet under its whole outline.
    { const sheet = new T.ShapeGeometry(new T.Shape(rim.map(([x, z]) => new T.Vector2(x, -z)))), su = sheet.attributes.uv; for (let i = 0; i < su.count; i++) su.setXY(i, su.getX(i) * .05, su.getY(i) * .05);
      const underRock = rock.clone(); underRock.side = T.DoubleSide; const under = new T.Mesh(sheet, underRock); under.rotation.x = -Math.PI / 2; under.position.y = -depth - .12; this.root.add(under); }
    // The arrival terrace: pale paving past the tenements, an ivory balustrade on the lip.
    box(g, 0, .05, (78.4 + TERRACE.z) / 2, TERRACE.half * 2, .1, TERRACE.z - 78.4, mats.warmStone);
    for (let x = -21; x <= 21; x += 6) box(g, x, .105, 86.3, .08, .012, 4.4, G);
    const baluster = new T.LatheGeometry([[0, 0], [.1, 0], [.07, .12], [.12, .38], [.06, .62], [.09, .72], [0, .74]].map(([r, y]) => new T.Vector2(r, y)), 8);
    const rail = (x0: number, x1: number, z0: number, z1: number) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / .42), yaw = Math.atan2(x1 - x0, z1 - z0);
      box(g, (x0 + x1) / 2, 1.02, (z0 + z1) / 2, .36, .12, len + .3, I).rotation.y = yaw; box(g, (x0 + x1) / 2, .16, (z0 + z1) / 2, .44, .14, len + .3, I).rotation.y = yaw;
      for (let k = 1; k < n; k++) { const t = k / n, m = new T.Mesh(baluster, I); m.position.set(x0 + (x1 - x0) * t, .23, z0 + (z1 - z0) * t); g.add(m); } };
    rail(-TERRACE.half, TERRACE.half, TERRACE.z - .3, TERRACE.z - .3); for (const s of [-1, 1]) rail(s * (TERRACE.half - .2), s * (TERRACE.half - .2), EDGE_Z - .2, TERRACE.z - .3);
    for (const x of [-TERRACE.half + .2, -8, 8, TERRACE.half - .2]) { box(g, x, .7, TERRACE.z - .3, .62, 1.4, .62, I); box(g, x, 1.45, TERRACE.z - .3, .74, .1, .74, G); torus(g, x, 1.85, TERRACE.z - .3, .2, .03, G); sphere(g, x, 1.85, TERRACE.z - .3, .09, mats.glow); }
    city.collider(0, TERRACE.z - .25, TERRACE.half * 2 + .4, .6, 1.3); for (const s of [-1, 1]) city.collider(s * (TERRACE.half - .2), (EDGE_Z + TERRACE.z) / 2, .6, TERRACE.z - EDGE_Z, 1.3);
    // The spillway: an ivory trough reaching past the lip, and a fall that never lands.
    const sx = -9; box(g, sx, -.35, 92, 1.7, .5, 7, I); for (const dx of [-.82, .82]) box(g, sx + dx, -.02, 92, .12, .3, 7, I); torus(g, sx, -.35, 95.5, .7, .09, G);
    for (const z of [89.5, 94.5]) box(g, sx, -1.6, z, .5, 2.4, .5, I).rotation.x = z > 92 ? .5 : .2;
    const water = this.water = new T.MeshBasicMaterial({ color: '#dff5f2', transparent: true, opacity: .92, depthWrite: false, side: T.DoubleSide });
    water.onBeforeCompile = sh => { sh.uniforms.waterTime = this.waterTime; sh.vertexShader = 'varying vec2 vFall;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFall = uv;');
      sh.fragmentShader = 'uniform float waterTime; varying vec2 vFall;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float streak = .5 + .5 * sin(vFall.y * 52. + sin(vFall.x * 40. - waterTime * 3.) * 1.4);
        float rush = fract(vFall.x * 26. - waterTime * 1.6);
        diffuseColor.rgb *= .82 + .22 * streak + .12 * smoothstep(.85, 1., rush);
        diffuseColor.a *= (1. - smoothstep(.72, 1., vFall.x)) * (.7 + .3 * streak);`); };
    water.customProgramCacheKey = () => 'terra-waterfall';
    box(g, sx, -.08, 92, 1.5, .02, 7, water);
    const path = new T.CatmullRomCurve3([V(sx, -.12, 95.4), V(sx, -1.6, 97.2), V(sx, -8, 99), V(sx, -40, 101.5), V(sx, -110, 103.5), V(sx, -200, 105), V(sx, -250, 106)]);
    const tube = new T.TubeGeometry(path, 90, .7, 10, false), pos = tube.attributes.position, tuv = tube.attributes.uv, c = new T.Vector3(), p = new T.Vector3();
    for (let i = 0; i < pos.count; i++) { const u = tuv.getX(i); path.getPointAt(u, c); p.fromBufferAttribute(pos, i).sub(c).multiplyScalar(1 + u * 5).add(c); p.x += (p.x - c.x) * .6; pos.setXYZ(i, p.x, p.y, p.z); }
    tube.computeVertexNormals(); this.fall = new T.Mesh(tube, water); this.fall.frustumCulled = false; this.root.add(this.fall);
    // Ancient ribs: two ivory buttresses curve out from under the rim and back beneath it,
    // banded in gold where they meet the city.
    for (const s of [-1, 1]) { const x = s * 44, rib = new T.QuadraticBezierCurve3(V(x, -1.5, EDGE_Z - 1), V(x + s * 3, -34, EDGE_Z + 20), V(x + s * 7, -96, EDGE_Z - 4));
      g.add(new T.Mesh(new T.TubeGeometry(rib, 28, 2.3, 8, false), I));
      for (const t of [.12, .35, .6, .85]) { const q = rib.getPoint(t), band = torus(g, q.x, q.y, q.z, 2.45, .28, G); band.quaternion.setFromUnitVectors(V(0, 0, 1), rib.getTangent(t)); }
      box(g, x, -.6, EDGE_Z - .1, 6, 1.2, 1.2, I); }
    bake(g);
    // A lesser isle hung on two long chains, far below and out: seen from above and from the side.
    const flat = (c: string, w: number) => skylineMaterial(c, w), stone = flat('#9aa7a4', .34), turf = flat('#7f9a7e', .34), pale = flat('#dcd3bd', .3), dark = flat('#6c7775', .4), gold = flat('#c9a456', .3);
    const cone = new T.Mesh(new T.ConeGeometry(22, 46, 9), stone); cone.rotation.x = Math.PI; cone.position.y = -24; this.isle.add(cone);
    const lower = new T.Mesh(new T.ConeGeometry(9, 20, 7), dark); lower.rotation.x = Math.PI; lower.position.set(4, -52, 3); this.isle.add(lower);
    cyl(this.isle, 0, .8, 0, 22, 2.2, turf); cyl(this.isle, -6, 9, -3, 2.6, 18, pale); cyl(this.isle, -6, 18.4, -3, 3.4, .9, gold); const cap = new T.Mesh(new T.ConeGeometry(3.2, 5, 8), pale); cap.position.set(-6, 21.4, -3); this.isle.add(cap);
    for (let k = 0; k < 5; k++) cyl(this.isle, 6 + k * 2.6, 3.2, 6 - k * .8, .7, 5 - (k % 2) * 1.6, pale); box(this.isle, 11, 6, 4, 13, .9, 2, pale);
    bake(this.isle); this.isle.position.set(62, -58, 232); this.root.add(this.isle);
    const chains = new T.Group(); this.root.add(chains); for (const [ax, ay, az, bx, bz] of [[40, -3, EDGE_Z, 48, 214], [58, -2, 90, 74, 216]]) { const a = V(ax, ay, az), b = V(bx, -56, bz), mid = a.clone().lerp(b, .5); mid.y -= 16; chains.add(new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(a, mid, b), 40, .35, 5, false), dark)); } bake(chains);
    // A sister isle on the horizon: ancient Terra had more than one city in the sky.
    const far = new T.Group(), haze = flat('#a9b6b6', .55), hazeLight = flat('#d3d0c2', .5);
    // A lopsided cluster of hanging roots, not one cone: a single inverted cone reads as an arrow at this range.
    for (const [x, z, r, h] of [[0, 0, 34, 30], [10, -6, 17, 58], [-14, 5, 13, 44], [3, 12, 8, 72], [-4, -14, 9, 36]]) { const root = new T.Mesh(new T.ConeGeometry(r, h, 7), haze); root.rotation.set(Math.PI, x * .02, 0); root.position.set(x, 4.5 - h / 2, z); far.add(root); }
    cyl(far, 0, 6, 0, 34, 3, haze);
    for (const [x, z, h, r] of [[-8, -4, 44, 3.4], [6, 5, 30, 2.6], [15, -6, 22, 2]]) { cyl(far, x, 6 + h / 2, z, r, h, hazeLight); const c2 = new T.Mesh(new T.ConeGeometry(r * 1.3, r * 2.4, 8), hazeLight); c2.position.set(x, 7.5 + h + r, z); far.add(c2); }
    bake(far); far.position.set(-150, 0, 430); this.farIsle = far; this.root.add(far);
    // Its twin hangs high in the east, over the Canal Ward gate at the end of Cinder Row.
    this.eastIsle = far.clone(); this.eastIsle.position.set(210, 118, -1); this.eastIsle.scale.setScalar(.8); this.eastIsle.rotation.y = 1.3; this.root.add(this.eastIsle);
    // THE UNDERSIDE. A gallery hangs on chains from two ivory brackets reaching out from under
    // the terrace, and a lift drops to it. From the deck you look up at Terra itself: hanging
    // rock, the old city's ribs and pipes, and the spillway falling past into the clouds.
    { const u = new T.Group(); this.root.add(u); const F = GALLERY.floor, x0 = GALLERY.x0, x1 = GALLERY.x1, z0 = GALLERY.z0, z1 = GALLERY.z1, gx = (x0 + x1) / 2, gz = (z0 + z1) / 2, under = -depth - .02, L = GALLERY.lift;
      box(u, gx, F - .15, gz, x1 - x0, .3, z1 - z0, I); box(u, gx, F - .36, gz, x1 - x0 - .8, .14, z1 - z0 - .8, G);
      const rail = (ax: number, az: number, bx: number, bz: number) => { const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / 1.3)), yaw = Math.atan2(bx - ax, bz - az);
        box(u, (ax + bx) / 2, F + 1.05, (az + bz) / 2, .12, .1, len, I).rotation.y = yaw; for (let k = 0; k <= n; k++) cyl(u, ax + (bx - ax) * k / n, F + .52, az + (bz - az) * k / n, .05, 1.05, I); };
      rail(x0, z0, L.x - 1.1, z0); rail(L.x + 1.1, z0, x1, z0); rail(x1, z0, x1, z1); rail(x1, z1, x0, z1); rail(x0, z1, x0, z0);
      for (const x of [x0 + .8, x1 - .8]) { const arm = new T.QuadraticBezierCurve3(V(x, under, EDGE_Z - 9), V(x, under - 5, EDGE_Z + 7), V(x, under - 3.5, z1 + 1.5));
        u.add(new T.Mesh(new T.TubeGeometry(arm, 24, .55, 8, false), I)); for (const t of [.2, .5, .8]) { const q = arm.getPoint(t), band = torus(u, q.x, q.y, q.z, .62, .1, G); band.quaternion.setFromUnitVectors(V(0, 0, 1), arm.getTangent(t)); }
        for (const z of [z0 + .6, z1 - .6]) { const top = arm.getPoint(T.MathUtils.clamp((z - (EDGE_Z - 9)) / (z1 + 1.5 - (EDGE_Z - 9)), 0, 1)); const chain = cyl(u, x, (top.y + F) / 2, z, .07, top.y - F, mats.iron); chain.position.set(x, (top.y + F) / 2, z); } }
      // The lift: guide rails down the cliff, a winch on the terrace lip, and the cage.
      for (const dx of [-1, 1]) cyl(u, L.x + dx, F / 2, L.z, .08, -F + .2, mats.iron); box(u, L.x - 2.3, .55, TERRACE.z - .9, 1.1, 1.1, 1.8, mats.iron); cyl(u, L.x - 2.3, 1.25, TERRACE.z - .9, .35, 1.6, mats.brass).rotation.x = Math.PI / 2;
      // A gantry over the cage carries the sheave, and the winch sits aside so the door stays clear.
      for (const dx of [-1.15, 1.15]) cyl(u, L.x + dx, 1.72, TERRACE.z + .15, .09, 3.44, mats.iron); box(u, L.x, 3.4, TERRACE.z + .15, 2.5, .2, .2, mats.iron);
      box(u, L.x, 3.48, (TERRACE.z + L.z) / 2 + .1, .16, .16, L.z - TERRACE.z + .3, mats.iron); torus(u, L.x, 3.22, L.z, .26, .06, mats.brass).rotation.y = Math.PI / 2;
      // Hanging rock, ribs, pipes and one breathing vent under the plate.
      for (let k = 0; k < 26; k++) { const x = -22 + ((k * 37) % 58), z = 34 + ((k * 23) % 50), h = 4 + (k * 7) % 11, r = 1.3 + (k % 4) * .7; const cone = new T.Mesh(new T.ConeGeometry(r, h, 7), rock); cone.rotation.x = Math.PI; cone.position.set(x, under - h / 2 + .4, z); u.add(cone); }
      for (const z of [78, 62, 46]) { const rib = new T.QuadraticBezierCurve3(V(-24, under - .4, z), V(8, under - 7, z), V(38, under - .4, z)); u.add(new T.Mesh(new T.TubeGeometry(rib, 28, .75, 8, false), I)); for (const t of [.25, .5, .75]) { const q = rib.getPoint(t), band = torus(u, q.x, q.y, q.z, .85, .12, G); band.quaternion.setFromUnitVectors(V(0, 0, 1), rib.getTangent(t)); } }
      for (const x of [4, 31]) { const pipe = cyl(u, x, under - 1.3, 58, .45, 52, mats.copper); pipe.rotation.x = Math.PI / 2; for (let z = 36; z < 84; z += 8) torus(u, x, under - 1.3, z, .52, .1, mats.iron); }
      torus(u, 16, under - 1.2, 66, 2.4, .35, G).rotation.x = Math.PI / 2; sphere(u, 16, under - 1.4, 66, 1.3, ancientMats.awake);
      // The west edge: ivory ribs curving out from under the back-lane rim.
      for (const z of [-14, 14]) { const rib = new T.QuadraticBezierCurve3(V(WEST_EDGE.x + 1, -1.5, z), V(WEST_EDGE.x - 18, -32, z + 3), V(WEST_EDGE.x + 5, -84, z)); u.add(new T.Mesh(new T.TubeGeometry(rib, 26, 2, 8, false), I)); for (const t of [.15, .4, .7]) { const q = rib.getPoint(t), band = torus(u, q.x, q.y, q.z, 2.15, .25, G); band.quaternion.setFromUnitVectors(V(0, 0, 1), rib.getTangent(t)); } }
      bake(u); }
    { const cage = this.cage; cage.position.set(GALLERY.lift.x, 0, GALLERY.lift.z); this.root.add(cage); box(cage, 0, .05, 0, 1.7, .1, 1.5, mats.brass); box(cage, 0, 2.35, 0, 1.8, .1, 1.6, mats.iron);
      for (const [dx, dz] of [[-.85, -.75], [.85, -.75], [-.85, .75], [.85, .75]]) cyl(cage, dx, 1.2, dz, .04, 2.3, mats.iron); for (const y of [.9, 1.6]) for (const dz of [-.75, .75]) box(cage, 0, y, dz, 1.7, .04, .04, mats.brass); bake(cage); }
    // Call boxes at the top and bottom of the lift.
    const callBox = (y: number, z: number, id: string, label: string, hint: string) => { const m = box(this.root, GALLERY.lift.x + 1.35, y, z, .3, .4, .2, mats.brass); city.targets.push({ object: m, id, kind: 'lift', label, hint, position: m.getWorldPosition(new T.Vector3()) }); };
    callBox(1.15, TERRACE.z - .45, 'lift.down', 'Undercroft lift', 'RIDE DOWN'); callBox(GALLERY.floor + 1.15, GALLERY.z0 + .3, 'lift.up', 'Undercroft lift', 'RIDE UP');
    // Cloud cards out past the west rim, so the back lane looks down onto weather, not a void.
    { const sky = new T.Group(); this.root.add(sky); const cm = cloudMaterial();
      for (let k = 0; k < 7; k++) { const card = new T.Mesh(new T.PlaneGeometry(70 + (k % 3) * 25, 34 + (k % 2) * 12), cm); card.position.set(-150 - k * 22, -28 - (k % 3) * 22, -50 + k * 17); card.rotation.y = Math.PI / 2 + Math.sin(k) * .25; sky.add(card); }
      for (let k = 0; k < 4; k++) { const sheet = new T.Mesh(new T.PlaneGeometry(120, 70), cm); sheet.rotation.x = -Math.PI / 2; sheet.position.set(-150 - k * 55, -95 - k * 18, -10 + (k % 2) * 40); sky.add(sheet); }
      bake(sky); }
    // Swifts over the void: one instanced draw, riding the updraft off the cliff.
    const wing = new T.BufferGeometry(); wing.setAttribute('position', new T.Float32BufferAttribute([-.5, 0, .14, 0, 0, -.16, 0, .06, .14, 0, .06, .14, 0, 0, -.16, .5, 0, .14], 3)); wing.computeVertexNormals();
    this.birds = new T.InstancedMesh(wing, new T.MeshBasicMaterial({ color: '#2d3346', side: T.DoubleSide }), 9); this.birds.frustumCulled = false; this.root.add(this.birds);
  }
  /** Ride the lift; the controller holds still while the cage carries the Steward. */
  startRide(player: Player, down: boolean) { if (this.ride) return; this.ride = { player, down, t: 0 }; player.riding = true; player.velocity.set(0, 0, 0); }
  update(time: number, calm: boolean) {
    const dt = Math.min(.1, Math.max(0, time - this.last)); this.last = time;
    if (this.ride) { const r = this.ride, top = 1.93, bottom = GALLERY.floor + 1.75; r.t = Math.min(1, r.t + dt / 8); const e = r.t * r.t * (3 - 2 * r.t), y = r.down ? T.MathUtils.lerp(top, bottom, e) : T.MathUtils.lerp(bottom, top, e);
      r.player.position.set(GALLERY.lift.x, y, GALLERY.lift.z); this.cage.position.y = y - 1.75;
      if (r.t >= 1) { r.player.riding = false; this.ride = undefined; if (r.down) r.player.teleport(GALLERY.lift.x, GALLERY.z0 + 1.6, Math.PI, bottom); else { r.player.teleport(GALLERY.lift.x, TERRACE.z - 1.2, 0); this.cage.position.y = 0; } } }
    this.waterTime.value = calm ? time * .4 : time;
    // Unlit water follows the painted light key, so the fall dims with dusk and night.
    this.water.color.copy(this.waterBase).multiply(tone.lit.value); cloudMaterial().color.copy(cloudBase).multiply(tone.lit.value);
    this.isle.position.y = -58 + Math.sin(time * .12) * .8; this.isle.rotation.y = Math.sin(time * .02) * .05; this.farIsle.position.y = Math.sin(time * .07 + 1) * 1.5; this.eastIsle.position.y = 118 + Math.sin(time * .06 + 2.4) * 1.8;
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(2.2, 2.2, 2.2);
    for (let i = 0; i < 9; i++) { const a = time * (.16 + (i % 3) * .03) + i * .7, r = 14 + (i % 4) * 5; p.set(-4 + Math.sin(a) * r, -10 - (i % 3) * 7 + Math.sin(time * .5 + i) * 2, 128 + Math.cos(a) * r); e.set(0, a + Math.PI / 2, calm ? 0 : Math.sin(time * 7 + i) * .45); q.setFromEuler(e); m.compose(p, q, s); this.birds.setMatrixAt(i, m); }
    this.birds.instanceMatrix.needsUpdate = true;
  }
}
