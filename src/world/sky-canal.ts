import * as T from 'three';
import { box, cyl, sphere, torus, crate, mats, bake } from './assets';
import { V } from './art-kit';
import { ancientMats } from './factions';
import { CHASM } from './geography';
import { cloudMaterial } from './terra-edge';
import { tone } from './tone';

/** The sky canal. The Lowworks "canal" was always a cleft through Terra's plate: open below
 * to the cloud sea and Locke's fields, and out through the north rim into open sky. Steam
 * carriers float its length on brass lift-pods, passing under the bridge and out past the
 * rim and back; the old city's ivory ribs span it far below, and weather drifts through it. */
const CX = (CHASM.x0 + CHASM.x1) / 2, Z_SOUTH = 58, Z_NORTH = -178, MID = (Z_SOUTH + Z_NORTH) / 2, HALF = (Z_SOUTH - Z_NORTH) / 2;
type Carrier = { g: T.Group; fans: T.Group[]; y: number; speed: number; phase: number; scale: number; vents: T.Vector3[] };
type Puff = { p: T.Vector3; age: number; life: number; size: number };

/** One carrier, built facing +z: a planked deck on an iron keel, a boiler and stack astern,
 * two steam turbines with fans, and the brass lift-pods that keep it in the air. */
function buildCarrier(): { g: T.Group; fans: T.Group[]; vents: T.Vector3[] } {
  const g = new T.Group(), hull = new T.Group(); g.add(hull);
  box(hull, 0, 0, 0, 2.2, .3, 5, mats.wood); box(hull, 0, -.32, 0, 1.7, .36, 4.6, mats.iron); box(hull, 0, -.12, 2.65, 1.3, .5, .5, mats.iron);
  for (const s of [-1, 1]) { for (let z = -2.2; z <= 2.21; z += 1.1) cyl(hull, s * 1.06, .38, z, .03, .46, mats.brass); box(hull, s * 1.06, .62, 0, .05, .05, 4.5, mats.brass); }
  crate(hull, -.45, .15, .5, .62); crate(hull, .45, .15, .9, .55); crate(hull, 0, .15, 1.75, .5); crate(hull, -.42, .77, .5, .45);
  cyl(hull, 0, .72, -1.35, .48, 1.1, mats.copper); sphere(hull, 0, 1.27, -1.35, .48, mats.copper); cyl(hull, 0, 1.95, -1.65, .13, 1.4, mats.iron); torus(hull, 0, 2.5, -1.65, .16, .04, mats.brass).rotation.x = Math.PI / 2;
  cyl(hull, 0, .65, -.2, .04, .7, mats.iron); torus(hull, 0, 1.02, -.2, .24, .03, mats.brass);
  for (const s of [-1, 1]) { torus(hull, s * 1.4, .12, -2.05, .42, .1, mats.iron); box(hull, s * 1.2, .12, -2.05, .45, .08, .08, mats.iron);
    sphere(hull, s * .7, -.62, 1.1, .32, mats.brass); sphere(hull, s * .7, -.62, -1.1, .32, mats.brass); sphere(hull, s * .7, -.92, 0, .13, ancientMats.awake); }
  cyl(hull, 0, .45, 2.75, .07, .3, mats.glow);
  bake(hull);
  const fans = [-1, 1].map(s => { const f = new T.Group(); f.position.set(s * 1.4, .12, -2.05); g.add(f); for (let k = 0; k < 4; k++) box(f, 0, 0, 0, .74, .1, .03, mats.brass).rotation.z = k * Math.PI / 4; bake(f); return f; });
  return { g, fans, vents: [V(0, 2.62, -1.65), V(-1.4, .12, -2.5), V(1.4, .12, -2.5)] };
}

export class SkyCanal {
  root = new T.Group(); carriers: Carrier[] = [];
  private wisps: T.Mesh[] = []; private puffs: T.InstancedMesh; private puffMat = new T.MeshBasicMaterial({ color: '#f4f1ea', transparent: true, opacity: .62, depthWrite: false });
  private puffList: Puff[] = []; private emit = 0; private puffBase = new T.Color('#f4f1ea'); private m = new T.Matrix4(); private q = new T.Quaternion(); private sc = new T.Vector3();
  constructor(parent: T.Object3D) {
    parent.add(this.root);
    // The cleft's furniture: regime pipes bracketed along both walls, and far below, the old
    // city's ivory ribs still spanning the gap they were built to hold.
    const dress = new T.Group(); this.root.add(dress);
    for (const [x, y] of [[CHASM.x0 + .28, -1.3], [CHASM.x1 - .28, -2.3], [CHASM.x0 + .3, -2.6]] as const) { const pipe = cyl(dress, x, y, (Z_SOUTH + 6 - 95) / 2, .18, Z_SOUTH + 6 + 95, mats.copper); pipe.rotation.x = Math.PI / 2;
      for (let z = -92; z < Z_SOUTH + 6; z += 6) box(dress, x + (x < CX ? -.14 : .14), y, z, .28, .1, .12, mats.iron); }
    for (const z of [-62, -26, 18, 48]) { const rib = new T.QuadraticBezierCurve3(V(CHASM.x0 - .2, -24, z), V(CX, -34, z), V(CHASM.x1 + .2, -24, z));
      dress.add(new T.Mesh(new T.TubeGeometry(rib, 18, .5, 8, false), ancientMats.ivory)); torus(dress, CX, -29, z, .6, .1, ancientMats.gold).rotation.y = Math.PI / 2; }
    bake(dress);
    // Weather drifting through the cleft below the street.
    const cm = cloudMaterial();
    for (let k = 0; k < 7; k++) { const w = new T.Mesh(new T.PlaneGeometry(9, 26 + (k % 3) * 8), cm); w.rotation.x = -Math.PI / 2; w.rotation.z = (k % 2) * .2; w.position.set(CX + ((k * 13) % 5 - 2) * .5, -42 - k * 14, -70 + k * 22); this.root.add(w); this.wisps.push(w); }
    [{ y: -3.4, speed: .028, phase: 0, scale: 1 }, { y: -9.5, speed: .022, phase: 2.2, scale: 1.15 }, { y: -21, speed: .016, phase: 4.1, scale: 1.4 }].forEach(c => {
      const { g, fans, vents } = buildCarrier(); g.scale.setScalar(c.scale); this.root.add(g); this.carriers.push({ g, fans, vents, ...c }); });
    this.puffs = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), this.puffMat, 96); this.puffs.frustumCulled = false; this.root.add(this.puffs);
    for (let i = 0; i < 96; i++) { this.m.makeScale(0, 0, 0); this.puffs.setMatrixAt(i, this.m); }
  }
  update(dt: number, time: number, calm: boolean) {
    const t = calm ? time * .35 : time;
    // Each carrier shuttles the cleft's length on a smooth back-and-forth: it slows to turn at
    // the ends, out past the rim in open sky and back under the bridge.
    for (const c of this.carriers) { const a = t * c.speed + c.phase, z = MID + HALF * Math.cos(a), heading = -Math.sin(a) < 0 ? Math.PI : 0;
      c.g.position.set(CX + Math.sin(t * .13 + c.phase * 5) * .6, c.y + Math.sin(t * .9 + c.phase * 7) * .18, z);
      c.g.rotation.y += Math.atan2(Math.sin(heading - c.g.rotation.y), Math.cos(heading - c.g.rotation.y)) * Math.min(1, dt * .9);
      c.g.rotation.z = Math.sin(t * .7 + c.phase) * .04; c.g.rotation.x = Math.sin(t * .5 + c.phase * 3) * .02;
      for (const f of c.fans) f.rotation.z += dt * (calm ? 3 : 9); }
    // Steam: puffs from the stacks and turbine exhausts rise, swell and thin away.
    this.emit += dt; if (this.emit > .16) { this.emit = 0; for (const c of this.carriers) { c.g.updateWorldMatrix(true, false); const v = c.vents[Math.floor(time * 6.3 + c.phase) % c.vents.length];
      if (this.puffList.length >= 96) this.puffList.shift(); this.puffList.push({ p: c.g.localToWorld(v.clone()), age: 0, life: 2.2 + Math.random() * .8, size: .32 * c.scale }); } }
    let i = 0; for (const p of this.puffList) { p.age += dt; p.p.y += dt * .75; const u = Math.min(1, p.age / p.life), s = p.size * (1 + u * 2.4) * (u > .75 ? (1 - u) / .25 : 1);
      this.sc.setScalar(Math.max(0, s)); this.m.compose(p.p, this.q, this.sc); this.puffs.setMatrixAt(i++, this.m); }
    this.puffList = this.puffList.filter(p => p.age < p.life);
    for (; i < 96; i++) { this.m.makeScale(0, 0, 0); this.puffs.setMatrixAt(i, this.m); }
    this.puffs.instanceMatrix.needsUpdate = true; this.puffMat.color.copy(this.puffBase).multiply(tone.lit.value);
    this.wisps.forEach((w, k) => { w.position.z += dt * (calm ? .2 : .6) * (k % 2 ? 1 : -1); if (w.position.z > Z_SOUTH) w.position.z = -90; if (w.position.z < -90) w.position.z = Z_SOUTH; });
  }
}
