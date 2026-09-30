import * as T from 'three';
import { box, cyl, sphere, torus, mats, bake, surface, illustrated } from './assets';
import { V } from './art-kit';
import { skylineMaterial } from './architecture';
import { ancientMats } from './factions';
import type { City } from './city';
import { tone } from './tone';

/** The south edge of Terra, behind the arrival gate. The ward ends at a cliff; an old
 * ivory terrace juts past it, and from its balustrade the drop is the whole view: a
 * spillway pouring off into nothing, ancient ribs under the rim, a lesser isle hung on
 * chains far below, and the cloud sea (WeatherArt) with Locke showing through. */
export const EDGE_Z = 84, TERRACE = { half: 24.2, z: 88.6 };
const rock = illustrated(new T.MeshStandardMaterial({ color: '#817a70', map: surface('stone') }));

export class TerraEdge {
  root = new T.Group(); fall: T.Mesh; water: T.MeshBasicMaterial; private waterBase = new T.Color('#dff5f2'); isle = new T.Group(); farIsle!: T.Group; eastIsle!: T.Group; birds: T.InstancedMesh; waterTime = { value: 0 };
  constructor(public city: City) {
    city.root.add(this.root); const g = new T.Group(); this.root.add(g); const I = ancientMats.ivory, G = ancientMats.gold;
    // The plate Terra stands on: the ward and the far ring sit on it, with bastions and the
    // terrace promontory breaking the rim. Ninety metres of cliff; the haze takes the rest.
    const rim: [number, number][] = [[-150, -150], [150, -150], [150, EDGE_Z], [78, EDGE_Z], [78, 90], [62, 90], [62, EDGE_Z], [TERRACE.half, EDGE_Z], [TERRACE.half, TERRACE.z], [-TERRACE.half, TERRACE.z], [-TERRACE.half, EDGE_Z], [-62, EDGE_Z], [-62, 90], [-78, 90], [-78, EDGE_Z], [-150, EDGE_Z]];
    const depth = 90, slab = new T.ExtrudeGeometry(new T.Shape(rim.map(([x, z]) => new T.Vector2(x, -z))), { depth, bevelEnabled: false });
    const uv = slab.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * .08, uv.getY(i) * .08);
    const plate = new T.Mesh(slab, [mats.dirt, rock]); plate.rotation.x = -Math.PI / 2; plate.position.y = -depth - .02; plate.receiveShadow = true; this.root.add(plate);
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
    // Swifts over the void: one instanced draw, riding the updraft off the cliff.
    const wing = new T.BufferGeometry(); wing.setAttribute('position', new T.Float32BufferAttribute([-.5, 0, .14, 0, 0, -.16, 0, .06, .14, 0, .06, .14, 0, 0, -.16, .5, 0, .14], 3)); wing.computeVertexNormals();
    this.birds = new T.InstancedMesh(wing, new T.MeshBasicMaterial({ color: '#2d3346', side: T.DoubleSide }), 9); this.birds.frustumCulled = false; this.root.add(this.birds);
  }
  update(time: number, calm: boolean) {
    this.waterTime.value = calm ? time * .4 : time;
    // Unlit water follows the painted light key, so the fall dims with dusk and night.
    this.water.color.copy(this.waterBase).multiply(tone.lit.value);
    this.isle.position.y = -58 + Math.sin(time * .12) * .8; this.isle.rotation.y = Math.sin(time * .02) * .05; this.farIsle.position.y = Math.sin(time * .07 + 1) * 1.5; this.eastIsle.position.y = 118 + Math.sin(time * .06 + 2.4) * 1.8;
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3(2.2, 2.2, 2.2);
    for (let i = 0; i < 9; i++) { const a = time * (.16 + (i % 3) * .03) + i * .7, r = 14 + (i % 4) * 5; p.set(-4 + Math.sin(a) * r, -10 - (i % 3) * 7 + Math.sin(time * .5 + i) * 2, 128 + Math.cos(a) * r); e.set(0, a + Math.PI / 2, calm ? 0 : Math.sin(time * 7 + i) * .45); q.setFromEuler(e); m.compose(p, q, s); this.birds.setMatrixAt(i, m); }
    this.birds.instanceMatrix.needsUpdate = true;
  }
}
