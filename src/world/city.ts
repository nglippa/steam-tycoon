import * as T from 'three';
import { box, cyl, sphere, torus, beam, gear, barrel, crate, tree, sign, windowUnit, arch, bake, mats, random } from './assets';
import { citizen } from './citizens';
import { Economy, PROPERTIES, type PropertyId } from '../simulation/economy';
export interface Collider { minX: number; maxX: number; minZ: number; maxZ: number; height: number; gate?: string }
export interface Target { object: T.Object3D; id: string; kind: 'property' | 'ledger' | 'discovery' | 'district'; label: string; position: T.Vector3 }
interface PropertyVisual { root: T.Group; additions: T.Group; machine: T.Group; gear: T.Group; piston: T.Mesh; level: number; building: T.Group; sign: T.Mesh }
export class City {
  root = new T.Group(); colliders: Collider[] = []; targets: Target[] = []; properties = new Map<PropertyId, PropertyVisual>();
  infrastructure = new T.Group(); prosperity = new T.Group(); gears: T.Group[] = []; smokeOrigins: T.Vector3[] = []; lamps: T.PointLight[] = []; 
  npcs: ReturnType<typeof citizen>[] = []; constructions: { group: T.Group; time: number; duration: number; finish: () => void; workers: ReturnType<typeof citizen>[] }[] = [];
  gateMeshes = new Map<string, T.Group>(); flags: T.Mesh[] = []; carts: T.Group[] = []; cartWheels: T.Group[][] = []; airship = new T.Group(); tram = new T.Group();
  fountain!: T.Mesh; water!: T.Mesh; clockHands: T.Mesh[] = []; stage = -1;
  constructor(public scene: T.Scene, public economy: Economy) { scene.add(this.root); this.root.add(this.infrastructure, this.prosperity); this.buildGround(); this.buildBlocks(); this.buildLandmarks(); this.buildSignatureMachinery(); this.buildDetails(); this.buildBackground(); this.createPopulation(); this.sync(true); }
  collider(x: number, z: number, w: number, d: number, height = 30, gate?: string) { this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, height, gate }); }
  target(g: T.Group, id: string, kind: Target['kind'], label: string, x: number, y: number, z: number) { const board = box(g, x, y, z, 1.05, .8, .18, mats.brass); const panel = sign(g, kind === 'property' ? 'LEDGER' : label, kind === 'property' ? 'Accounts & improvements' : 'Terra • Locke', x, y, z + .101, .96, .62); box(g, x, y - .85, z, .12, 1.1, .12, mats.iron); board.updateWorldMatrix(true, false); const pos = board.getWorldPosition(new T.Vector3()); this.targets.push({ object: board, id, kind, label, position: pos }); panel.userData.interaction = id; }
  buildGround() { const g = new T.Group(); this.root.add(g); box(g, 0, -.5, 0, 158, 1, 190, mats.dirt); box(g, 0, .018, 9, 19, .06, 139, mats.road);
    for (const x of [-10.5, 10.5]) { box(g, x, .1, 10, 2.8, .2, 139, mats.stone); for (let z = -59; z < 74; z += 3) box(g, x + (x < 0 ? 1.5 : -1.5), .1, z, .22, .3, 2.8, mats.warmStone); }
    for (const z of [27, 1, -31, -57]) box(g, 0, .025, z, 78, .06, 7, mats.road);
    for (const x of [-34, 34]) box(g, x, .02, 6, 7, .06, 125, mats.road);
    box(g, 0, .04, -44, 28, .1, 23, mats.road);
    for (const x of [40, 49]) { box(g, x, .25, -8, 1, .5, 144, mats.stone); for (let z = -76; z < 64; z += 4) { cyl(g, x, 1, z, .06, 1.4); if (z < -12 || z > 0) box(g, x, 1.5, z + 2, .06, .08, 4); } }
    box(g, 44.5, -.14, -8, 8, .2, 144, mats.dark); const waterMat = new T.MeshStandardMaterial({ color: '#344c43', metalness: .55, roughness: .22, transparent: true, opacity: .82 }); this.water = box(this.root, 44.5, .025, -8, 8, .04, 142, waterMat);
    box(g, 44.5, .22, -6, 11, .45, 8, mats.stone); for (const z of [-10, -2]) { for (let x = 39; x < 51; x += 1.5) box(g, x, .9, z, .12, 1.4, .12, mats.brass); box(g, 44.5, 1.5, z, 11, .12, .12, mats.brass); }
    // Side alley and physically traversable industrial ramp up to a high overlook.
    const ramp = box(g, -34, 3.2, -40, 4.6, .3, 23, mats.wood); ramp.rotation.x = Math.atan(6 / 22); box(g, -34, 6.2, -56, 7, .4, 11, mats.wood);
    for (const x of [-36.2, -31.8]) { beam(g, new T.Vector3(x, 1.3, -29), new T.Vector3(x, 7.3, -51), .065, mats.brass); box(g, x, 7.2, -56, .08, .08, 10, mats.iron); for (let z = -30; z > -61; z -= 4) { const h = z < -51 ? 6.2 : (-z - 29) / 22 * 6 + .2; box(g, x, h + .65, z, .1, 1.3, .1); } }
    for (let i = 0; i < 34; i++) { const x = (random() - .5) * 15; const z = random() * 120 - 53; const puddle = new T.Mesh(new T.CircleGeometry(.4 + random() * 1.3, 12), new T.MeshStandardMaterial({ color: '#678182', metalness: .85, roughness: .12, transparent: true, opacity: .32 })); puddle.rotation.x = -Math.PI / 2; puddle.scale.x = 2; puddle.position.set(x, .065, z); g.add(puddle); }
    bake(g);
  }
  facade(g: T.Group, width: number, height: number, depth: number, type: number, clean = false) { box(g, 0, height / 2, 0, width, height, depth, clean ? mats.warmStone : type % 2 ? mats.darkBrick : mats.brick); box(g, 0, .4, 0, width + .4, .8, depth + .4, mats.stone);
    for (let y = 3.8; y < height; y += 3.5) box(g, 0, y, depth / 2 + .1, width + .25, .18, .3, mats.stone);
    for (const x of [-width / 2 + .25, width / 2 - .25]) { box(g, x, height / 2, depth / 2 + .15, .45, height, .4, mats.stone); for (let y = .9; y < height; y += .7) box(g, x, y, depth / 2 + .38, .6, .3, .12, mats.warmStone); }
    for (let x = -width / 2 + 2; x < width / 2 - 1; x += 3) for (let y = 4.5; y < height - 1.7; y += 3.5) windowUnit(g, x, y, depth / 2 + .03, random() > .45);
    arch(g, 0, .5, depth / 2 + .06, 2.5, 3.2, mats.stone); arch(g, 0, .5, depth / 2 + .08, 2.15, 3, mats.dark); box(g, 0, 1.7, depth / 2 + .1, 1.65, 2.3, .08, mats.wood); sphere(g, .55, 1.7, depth / 2 + .22, .07);
    for (const x of [-width / 2 + 2.7, width / 2 - 2.7]) { windowUnit(g, x, .9, depth / 2 + .05, type % 3 !== 0, 2.1, 2.6); if (!clean && type % 3 === 0) { for (const a of [-.2, .3]) { const plank = box(g, x, 2 + a, depth / 2 + .17, 2.5, .23, .1, mats.wood); plank.rotation.z = a; } } }
    box(g, 0, height, 0, width + .7, .35, depth + .7, mats.stone); const roof = new T.Mesh(new T.CylinderGeometry(width * .43, width * .72, 2.8, 4, 1), mats.roof); roof.rotation.y = Math.PI / 4; roof.scale.z = depth / width; roof.position.y = height + 1.4; g.add(roof); box(g, 0, height + 2.8, 0, width * .62, .25, depth * .62, mats.iron);
    for (const x of [-width * .32, width * .32]) { box(g, x, height + 2, -depth * .26, .85, 4, .9, mats.brick); box(g, x, height + 4, -depth * .26, 1.1, .3, 1.15, mats.stone); }
    const pipe = cyl(g, width / 2 - .65, height / 2, depth / 2 + .4, .1, height, mats.copper); for (let y = 1; y < height; y += 2) { const ring = torus(g, pipe.position.x, y, pipe.position.z, .14, .035, mats.iron); ring.rotation.x = Math.PI / 2; }
  }
  buildBlocks() {
    for (const [index, p] of PROPERTIES.entries()) { const root = new T.Group(); root.position.set(p.x, .18, p.z); root.rotation.y = p.rotation; this.root.add(root); const building = new T.Group(); root.add(building); const height = index === 1 ? 9 : index === 4 ? 12 : 10.5; this.facade(building, 17, height, 11, index); const board = sign(building, p.name, p.kind + ' • EST. 1841', 0, 4.1, 5.9, 13, 1.45);
      // shop awning on a steel frame, individual seams and scalloped edge
      const awning = box(building, 0, 3.2, 6.6, 13, .12, 2.2, index % 2 ? mats.red : mats.teal); awning.rotation.x = .18;
      for (let x = -6; x <= 6; x += 1.5) { box(building, x, 2.96, 7.6, .1, .37, .08, mats.cream); }
      for (const x of [-6.4, 6.4]) cyl(building, x, 1.6, 7.4, .055, 3.2);
      crate(building, -6.2, 0, 6.5); barrel(building, 5.7, 0, 6.5); barrel(building, 6.5, 0, 6.2);
      if (index < 4) { cyl(building, -6, height + 3.5, -3, .75, 8, mats.rust); cyl(building, -6, height + 7.4, -3, .96, .3, mats.iron); root.updateWorldMatrix(true, true); this.smokeOrigins.push(root.localToWorld(new T.Vector3(-6, height + 7.6, -3))); }
      bake(building); this.collider(p.x, p.z, 11.3, 17.3);
      const machine = new T.Group(); machine.position.set(-4.5, 0, 7); root.add(machine); box(machine, 0, .22, 0, 2.5, .4, 1.4, mats.stone); cyl(machine, -.5, 1, 0, .53, 1.45, mats.copper); sphere(machine, -.5, 1.73, 0, .53, mats.copper).scale.y = .4; const gearObj = gear(machine, .5, 1.2, .58, .62); this.gears.push(gearObj); const piston = box(machine, .7, 1, -.3, .25, .8, .25, mats.brass); cyl(machine, .7, .65, -.3, .27, .7, mats.iron); torus(machine, -.5, 1.4, .51, .19, .04); sign(machine, 'PSI', '12', -.5, 1.4, .56, .3, .27);
      const additions = new T.Group(); root.add(additions); this.target(root, p.id, 'property', p.name, 3, 1.65, 7.5); this.properties.set(p.id, { root, building, additions, machine, gear: gearObj, piston, level: -1, sign: board });
    }
    const g = new T.Group(); this.root.add(g);
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) { const b = new T.Group(); b.position.set(side * 48, 0, 50 - i * 23); b.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; if (side > 0) b.position.x = 68; this.facade(b, 14 + random() * 3, 12 + random() * 7, 10, i + 1); g.add(b); this.collider(b.position.x, b.position.z, 10, 17); }
    for (const x of [-22, 22]) { const b = new T.Group(); b.position.set(x, 0, -56); this.facade(b, 15, 15, 9, 2); g.add(b); this.collider(x, -56, 15, 9); }
    bake(g);
  }
  buildLandmarks() { const g = new T.Group(); this.root.add(g);
    // The arrival arch, with lamps and weathered brass city lettering.
    for (const x of [-8.8, 8.8]) { box(g, x, 4, 66, 2.3, 8, 2.8, mats.darkBrick); box(g, x, .7, 66, 3, 1.4, 3.4, mats.stone); box(g, x, 7.8, 66, 3, .6, 3.5, mats.stone); cyl(g, x, 9, 66, .4, 2, mats.copper); sphere(g, x, 10.1, 66, .48, mats.brass); this.collider(x, 66, 2.3, 2.8); }
    box(g, 0, 8.3, 66, 18, 1.2, 1.6, mats.iron); sign(g, 'T E R R A', 'The Lowworks • City of Locke', 0, 8.35, 67, 13, 1.8); const back = sign(g, 'T E R R A', 'May the engines never sleep', 0, 8.35, 65, 13, 1.8); back.rotation.y = Math.PI;
    // Distinct clock tower, four illuminated dials and an ornate copper spire.
    const tower = new T.Group(); tower.position.set(0, 0, -46); g.add(tower); box(tower, 0, .3, 0, 7, .6, 7, mats.stone); box(tower, 0, 6, 0, 4.6, 12, 4.6, mats.darkBrick); for (const x of [-2.4, 2.4]) for (const z of [-2.4, 2.4]) { box(tower, x, 6, z, .45, 12, .45, mats.stone); sphere(tower, x, 13, z, .32, mats.brass); }
    for (const y of [3, 8.5, 12]) box(tower, 0, y, 0, 5.5, .35, 5.5, mats.stone);
    for (let side = 0; side < 4; side++) { const dial = new T.Group(); dial.rotation.y = side * Math.PI / 2; tower.add(dial); const face = cyl(dial, 0, 10.3, 2.37, 1.22, .13, mats.cream); face.rotation.x = Math.PI / 2; torus(dial, 0, 10.3, 2.49, 1.25, .12); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const tick = box(dial, Math.sin(a) * 1.03, 10.3 + Math.cos(a) * 1.03, 2.51, .06, .17, .03, mats.iron); tick.rotation.z = -a; } const handRoot = new T.Group(); handRoot.position.set(Math.sin(side * Math.PI / 2) * 2.54, 10.3, -46 + Math.cos(side * Math.PI / 2) * 2.54); handRoot.rotation.y = side * Math.PI / 2; this.root.add(handRoot); const hand = box(handRoot, 0, .39, 0, .085, .83, .05, mats.iron); this.clockHands.push(hand); box(dial, -.22, 10.45, 2.56, .65, .1, .06, mats.iron).rotation.z = -.65; }
    const spire = new T.Mesh(new T.ConeGeometry(3.8, 7, 4), mats.roof); spire.rotation.y = Math.PI / 4; spire.position.y = 15.6; tower.add(spire); cyl(tower, 0, 20, 0, .07, 3, mats.brass); sphere(tower, 0, 20.7, 0, .2, mats.brass); sign(tower, 'THE LOWWORKS', 'One city. A thousand hands.', 0, 4.9, 2.36, 4.2, .95); this.collider(0, -46, 5.5, 5.5);
    // Elevated rail line forms a second visual horizon.
    for (let x = -64; x <= 64; x += 16) { box(g, x, 7, -63, .65, 14, .65, mats.iron); beam(g, new T.Vector3(x, 8, -63), new T.Vector3(x + 7, 13, -63), .14); }
    for (const z of [-61.8, -64.2]) box(g, 0, 13.4, z, 145, .25, .16, mats.iron); box(g, 0, 13, -63, 145, .5, 3, mats.darkBrick);
    for (let i = 0; i < 3; i++) { box(this.tram, i * 4.6, 1.15, 0, 4.2, 2, 1.9, mats.teal); box(this.tram, i * 4.6, 2.25, 0, 4.4, .25, 2.2, mats.roof); for (let w = 0; w < 3; w++) box(this.tram, i * 4.6 - 1.3 + w * 1.2, 1.5, 1, .8, .85, .04, mats.glow); for (const x of [-1.4, 1.4]) { const wh = cyl(this.tram, i * 4.6 + x, .2, 0, .35, 2.1); wh.rotation.x = Math.PI / 2; } } this.tram.position.set(-65, 13.5, -63); this.root.add(this.tram);
    for (const [id, x, z, angle, name] of [['canal', 54, -6, Math.PI / 2, 'CANAL WARD'], ['heights', 0, -70, 0, 'AETHER HEIGHTS']] as const) { const gate = new T.Group(); gate.position.set(x, 0, z); gate.rotation.y = angle; this.root.add(gate); for (const xx of [-5, 5]) { box(gate, xx, 4.5, 0, 1.3, 9, 1.5, mats.stone); sphere(gate, xx, 9.2, 0, .4, mats.brass); } box(gate, 0, 8.3, 0, 11, .4, .7, mats.iron); sign(gate, name, 'Expansion charter required', 0, 7.1, .5, 8.4, 1.2); const bars = new T.Group(); gate.add(bars); for (let xx = -4.5; xx <= 4.5; xx += .5) { cyl(bars, xx, 3, 0, .065, 6, mats.iron); sphere(bars, xx, 6.1, 0, .1); } this.gateMeshes.set(id, bars); this.target(gate, id, 'district', name, 3.7, 1.65, 1); this.collider(x, z, angle ? 1 : 10, angle ? 10 : 1, 9, id); }
    this.target(this.root, 'city', 'ledger', 'City ledger', 5.5, 1.65, 56); this.target(this.root, 'map', 'discovery', 'Rail map of Locke', -34, 7.7, -59); this.target(this.root, 'automaton', 'discovery', 'Forgotten automaton', -33, 1.65, 4); this.target(this.root, 'shrine', 'discovery', 'The First Flame', 34, 1.65, -48);
    sphere(g, -32, .55, 3, .45, mats.rust); gear(g, -32, .5, 3.42, .29); crate(g, -33, 0, 2); sign(g, 'VEY R • ORISON', 'Railway of the seven provinces', -34, 8.9, -60.5, 5, .8);
    cyl(g, 34, .4, -49, 1, .8, mats.stone); cyl(g, 34, 1.1, -49, .3, .7, mats.brass); sphere(g, 34, 1.75, -49, .28, mats.aether);
    bake(g);
  }
  buildSignatureMachinery() {
    const g = new T.Group(); this.root.add(g);
    // Salvage yard: lattice crane, a suspended grab, sorted scrap and old flywheels.
    const scrap = new T.Group(); scrap.position.set(-28.7, 0, 40); g.add(scrap);
    for (const x of [-1.3, 1.3]) { box(scrap, x, 4.5, -4, .18, 9, .18, mats.iron); beam(scrap, new T.Vector3(x, 0, -4), new T.Vector3(-x, 4, -4), .075, mats.rust); beam(scrap, new T.Vector3(x, 4, -4), new T.Vector3(-x, 8, -4), .075, mats.rust); }
    box(scrap, 1, 8.8, -4, 7, .35, .45, mats.rust); beam(scrap, new T.Vector3(-1.3, 10, -4), new T.Vector3(4.5, 8.8, -4), .045, mats.iron); cyl(scrap, 4, 6.7, -4, .035, 4, mats.iron); torus(scrap, 4, 4.6, -4, .5, .09, mats.rust);
    for (let i = 0; i < 18; i++) { const a = random() * Math.PI * 2; const wheel = torus(scrap, Math.cos(a) * 1.5, .3 + random() * 1.4, 1 + Math.sin(a) * 2, .3 + random() * .4, .09, mats.rust); wheel.rotation.set(random() * 3, random() * 3, random() * 3); }
    // Riveted municipal pressure reservoir, exterior furnace and working fan.
    const boiler = new T.Group(); boiler.position.set(29.5, 0, 40); g.add(boiler);
    cyl(boiler, 0, 3, 0, 2.1, 5.5, mats.copper); sphere(boiler, 0, 5.7, 0, 2.1, mats.copper).scale.y = .45;
    for (const y of [.7, 2.5, 4.4, 5.5]) { cyl(boiler, 0, y, 0, 2.17, .13, mats.iron); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; sphere(boiler, Math.cos(a) * 2.18, y, Math.sin(a) * 2.18, .065, mats.brass); } }
    const pipe = cyl(boiler, 0, 6.7, 0, .4, 2, mats.rust); pipe.rotation.z = .15; torus(boiler, -2.14, 3.4, 0, .45, .08, mats.brass).rotation.y = Math.PI / 2;
    const foundry = new T.Group(); foundry.position.set(29, 0, 14); g.add(foundry); box(foundry, 0, 1.6, 0, 3, 3.2, 4, mats.darkBrick); const furnace = arch(foundry, 0, .3, 2.04, 2.2, 2.4, new T.MeshStandardMaterial({color:'#f58a32',emissive:'#ff6514',emissiveIntensity:2})); for (const x of [-.7,-.35,0,.35,.7]) box(foundry,x,1.2,2.1,.09,2,.12,mats.iron); cyl(foundry,0,5,0,.7,4,mats.rust); furnace.name='Foundry hearth';
    const hearthLight = new T.PointLight('#ff7428', 18, 10, 2); hearthLight.position.set(29, 1.5, 17); this.root.add(hearthLight);
    const workshop = new T.Group(); workshop.position.set(-29, 0, 14); g.add(workshop); box(workshop,0,1.1,0,2.5,.18,4,mats.wood); for (const z of [-1.6,1.6]) box(workshop,0,.55,z,2.1,1.1,.14,mats.iron); gear(workshop,0,1.9,.7,.7); gear(workshop,.9,1.65,.7,.4);
    for (const z of [-11,-20]) { const table = new T.Group(); table.position.set(-29,0,z); cyl(table,0,.6,0,.08,1.2,mats.iron); cyl(table,0,1.2,0,.9,.13,mats.wood); for (const x of [-1.3,1.3]) { box(table,x,.55,0,.7,.12,.7,mats.wood); for(const dz of [-.25,.25]) box(table,x,.28,dz,.07,.55,.07,mats.iron); box(table,x + (x<0?-.3:.3),.95,0,.08,.9,.7,mats.wood); } g.add(table); }
    // Broken paving, drain gratings, small weeds and cargo markings break the street repetition.
    for (let i=0;i<35;i++) { const x=(i%2?-1:1)*(8.4+random()*.35); const z=random()*108-52; box(g,x,.075,z,.8,.035,.55,mats.iron); for(let n=0;n<5;n++) box(g,x-.3+n*.15,.096,z,.045,.02,.5,mats.stone); }
    bake(g);
  }
  lamp(g: T.Group, x: number, z: number, enhanced = false) { const m = enhanced ? mats.brass : mats.iron; cyl(g, x, .15, z, .38, .3, mats.stone); cyl(g, x, 2.4, z, .095, 4.8, m); cyl(g, x, 1.1, z, .17, 1.8, m); box(g, x, 4.5, z, 1.1, .1, .13, m); for (const dx of enhanced ? [-.48, .48] : [.48]) { box(g, x + dx, 4.05, z, .48, .12, .48, m); box(g, x + dx, 4.36, z, .32, .5, .32, enhanced && this.economy.state.infrastructure.lamps === 3 ? mats.aether : mats.glow);  const cap = new T.Mesh(new T.ConeGeometry(.4, .28, 4), m); cap.position.set(x + dx, 4.72, z); cap.rotation.y = Math.PI / 4; g.add(cap); } }
  buildDetails() { const g = new T.Group(); this.root.add(g);
    for (const x of [-9.8, 9.8]) for (let z = 57; z >= -56; z -= 19) this.lamp(g, x, z);
    for (const x of [-9.3, 9.3]) for (let z = 48; z > -55; z -= 27) { const light = new T.PointLight('#ffc273', 7, 13, 2); light.position.set(x, 4, z); this.lamps.push(light); this.root.add(light); }
    for (const z of [29, 3, -30]) { for (const x of [-11.5, 11.5]) cyl(g, x, 3.6, z, .17, 7.2, mats.rust); const pipe = cyl(g, 0, 7.2, z, .23, 23, mats.copper); pipe.rotation.z = Math.PI / 2; for (let x = -10; x <= 10; x += 3) { const joint = cyl(g, x, 7.2, z, .33, .18, mats.iron); joint.rotation.z = Math.PI / 2; } const valve = gear(g, 8, 7.1, z + .5, .55); this.gears.push(valve); this.smokeOrigins.push(new T.Vector3(-8, 7.3, z)); }
    for (let i = 0; i < 38; i++) { const side = i % 2 ? -1 : 1; const x = side * (28 + random() * 2); const z = 55 - random() * 106; if (i % 2) barrel(g, x, 0, z); else crate(g, x, 0, z, .8 + random() * .5); }
    // Merchant stalls, hanging laundry, crates, roof ducts and cobbled stoops.
    for (let i = 0; i < 3; i++) { const stall = new T.Group(); stall.position.set(7.4, 0, -12 - i * 4.7); stall.rotation.y = -Math.PI / 2; g.add(stall); box(stall, 0, .65, 0, 3.6, 1.3, 1.5, mats.wood); for (const x of [-1.8, 1.8]) cyl(stall, x, 1.6, -.6, .065, 3.2); const awning = box(stall, 0, 2.8, .25, 4, .09, 2.8, i % 2 ? mats.cream : mats.red); awning.rotation.x = .15; for (let n = 0; n < 12; n++) sphere(stall, -1.4 + n % 6 * .5, 1.4, -.25 + Math.floor(n / 6) * .5, .16, i % 2 ? mats.leaf : mats.copper); }
    for (const z of [25, -1]) { beam(g, new T.Vector3(-29, 8, z), new T.Vector3(-43, 7.3, z), .025); for (let n = 0; n < 5; n++) { this.cloth(-31 - n * 2, 7.6, z, 1.3, 1.5, n % 2 ? mats.cream : mats.teal); } }
    for (let z = 38; z > -35; z -= 20) { this.cloth(-10, 6.7, z, 1, 2, mats.teal); box(g, -10, 6.75, z, 1.4, .08, .08, mats.brass); }
    for (const x of [-6, 6]) { box(g, x, .65, -39, 2.7, .16, .75, mats.wood); for (const dx of [-1, 1]) { box(g, x + dx, .3, -39, .1, .6, .7); box(g, x + dx, 1, -39.35, .1, 1.2, .1); } box(g, x, 1.1, -39.35, 2.7, .4, .1, mats.wood); }
    cyl(g, 0, .2, -31, 1.8, .4, mats.stone); cyl(g, 0, .6, -31, .3, .8, mats.copper); this.fountain = sphere(this.root, 0, 1.2, -31, .4, mats.copper); this.collider(0, -31, 3.5, 3.5, 1.5);
    sign(g, 'CITY OF LOCKE', 'No ember is too small', -5.6, 2.5, 57, 3.4, .85); sign(g, 'CLOCK SQUARE ↑', 'Canal Ward →   •   Rook & Son ←', 0, 5, 53, 6, .85); for (const x of [-3.2, 3.2]) box(g, x, 2.5, 52.9, .08, 5, .08);
    bake(g);
  }
  cloth(x: number, y: number, z: number, width: number, height: number, material: T.MeshStandardMaterial) {
    const geometry = new T.PlaneGeometry(width, height, 6, 10);
    geometry.translate(0, -height / 2, 0);
    const fabric = material.clone(); fabric.side = T.DoubleSide;
    const mesh = new T.Mesh(geometry, fabric); mesh.position.set(x, y, z);
    mesh.userData.height = height; mesh.userData.rest = geometry.attributes.position.array.slice();
    this.flags.push(mesh); this.root.add(mesh);
  }
  buildBackground() { const g = new T.Group(); this.root.add(g);
    for (let i = 0; i < 45; i++) { const a = i / 45 * Math.PI * 2; const r = 108 + random() * 40; const h = 15 + random() * 36; const x = Math.sin(a) * r; const z = Math.cos(a) * r; cyl(g, x, h / 2 - 2, z, 3 + random() * 4, h, i % 2 ? mats.darkBrick : mats.roof); cyl(g, x, h - 1, z, 4, .6, mats.stone); if (i % 3 === 0) { const roof = new T.Mesh(new T.ConeGeometry(5, 10, 8), mats.roof); roof.position.set(x, h + 4, z); g.add(roof); cyl(g, x, h + 10, z, .13, 8, mats.brass); } }
    for (const x of [-83, 83]) box(g, x, 2, 0, 3, 5, 180, mats.darkBrick); box(g, 0, 2, 83, 168, 5, 3, mats.darkBrick);
    for (let i = 0; i < 14; i++) { const mountain = new T.Mesh(new T.ConeGeometry(40 + random() * 30, 70 + random() * 80, 5), new T.MeshStandardMaterial({ color: '#425c60', roughness: 1 })); mountain.position.set((i - 7) * 60, -10, -260 - random() * 60); g.add(mountain); }
    const balloon = sphere(this.airship, 0, 0, 0, 1, mats.cream); balloon.scale.set(10, 3, 3); for (const xx of [-5, 0, 5]) { const ring = torus(this.airship, xx, 0, 0, 2.95, .075, mats.copper); ring.rotation.y = Math.PI / 2; } box(this.airship, 0, -4.1, 0, 7, 1.5, 2.1, mats.wood); for (const xx of [-3, 3]) for (const z of [-.8, .8]) beam(this.airship, new T.Vector3(xx, -2.2, z * 2), new T.Vector3(xx, -3.8, z), .035); box(this.airship, -9, 0, 0, 3, 5, .13, mats.teal); this.root.add(this.airship); bake(this.airship); bake(g);
  }
  createPopulation() { for (let i = 0; i < 42; i++) { const npc = citizen([mats.rust, mats.teal, mats.wood, mats.cream, mats.red][i % 5], i); npc.group.scale.setScalar(.92 + (i % 4) * .035); this.root.add(npc.group); this.npcs.push(npc); }
    for (let i = 0; i < 3; i++) { const cart = new T.Group(); box(cart, 0, .65, 0, 1.3, .25, 2); for (const x of [-.65, .65]) box(cart, x, 1, 0, .1, .65, 2); crate(cart, 0, .8, -.3, .7); barrel(cart, 0, .8, .55); const wheels: T.Group[] = []; for (const x of [-.85, .85]) { const wheel = new T.Group(); wheel.position.set(x, .45, 0); wheel.rotation.y = Math.PI / 2; cart.add(wheel); torus(wheel, 0, 0, 0, .43, .075, mats.iron); for (let j = 0; j < 4; j++) box(wheel, 0, 0, 0, .77, .045, .06, mats.brass).rotation.z = j * Math.PI / 4; bake(wheel); wheels.push(wheel); } this.cartWheels.push(wheels); this.root.add(cart); this.carts.push(cart); }
  }
  propertyUpgrade(id: PropertyId) { const v = this.properties.get(id)!; const level = this.economy.state.properties[id].level; v.level = level; this.disposeGroup(v.additions); const g = v.additions;
    if (level > 0) { for (const x of [-5.8, 5.8]) windowUnit(g, x, .9, 5.82, true, 2.1, 2.6); box(g, 0, 3.75, 5.85, 15, .1, .1, mats.brass); box(g, 0, .08, 7.8, 15, .15, 3, mats.stone); for (const x of [-6.5, 6.5]) { cyl(g, x, 3, 6, .065, 2, mats.brass); sphere(g, x, 4, 6, .22, mats.glow); } }
    if (level >= 2) { for (const x of [-6.5, -3.5, -.5, 2.5, 5.5]) windowUnit(g, x, 8, 5.7, true, 1.35, 2.3); for (const x of [-7.5, 7.5]) box(g, x, 6, 5.7, .25, 11, .15, mats.brass); sign(g, 'GUILD CERTIFIED', 'Quality in every turning', 0, 6.5, 5.76, 4, .65); }
    if (level >= 3) { box(g, 0, 12.8, 0, 12, 2.5, 8, mats.teal); for (let x = -4; x <= 4; x += 2) windowUnit(g, x, 11.9, 4.04, true, 1.3, 1.8); box(g, 0, 14.1, 0, 13, .25, 9, mats.brass); for (const x of [-5.5, 5.5]) cyl(g, x, 15, -2, .45, 3, mats.copper); }
    if (level >= 4) { const roof = new T.Mesh(new T.ConeGeometry(5, 3.5, 8), mats.copper); roof.position.set(0, 15.7, 0); g.add(roof); for (const x of [-6, 6]) { box(g, x, 8, 6, 1.25, 3.2, .05, mats.teal); box(g, x, 9.7, 6, 1.6, .12, .12, mats.brass); } tree(g, -7, 7.8, .6); tree(g, 7, 7.8, .6); }
    if (level >= 5) { cyl(g, 0, 18.7, 0, .2, 5, mats.brass); sphere(g, 0, 20.6, 0, .75, mats.aether); const ring = torus(g, 0, 20.6, 0, 1.4, .1); ring.rotation.x = Math.PI / 2; for (const x of [-4.5, 4.5]) { cyl(g, x, 16.4, 0, .13, 4, mats.brass); sphere(g, x, 18.4, 0, .32, mats.aether); } }
    bake(g);
  }
  disposeGroup(g: T.Group) { g.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); }); g.clear(); }
  buildInfrastructure() { this.disposeGroup(this.infrastructure); const g = this.infrastructure; const s = this.economy.state.infrastructure;
    if (s.lamps > 0) for (const x of [-9.3, 9.3]) for (let z = 57; z > -60; z -= 19) this.lamp(g, x, z, true);
    if (s.roads > 0) { box(g, 0, .07, 10, 17, .025, 130, s.roads === 3 ? mats.warmStone : mats.stone); for (const x of [-7.8, 7.8]) box(g, x, .089, 10, .14, .02, 130, mats.brass); if (s.roads > 1) for (const x of [-2, 2]) box(g, x, .1, 10, .1, .05, 130, mats.iron); }
    if (s.steam > 0) for (const z of [29, 3, -30]) { const pipe = cyl(g, 0, 7.8, z, .19, 23, mats.brass); pipe.rotation.z = Math.PI / 2; for (const x of [-7, 7]) { sphere(g, x, 7.8, z, .4, s.steam === 3 ? mats.aether : mats.copper); torus(g, x, 7.8, z + .35, .23, .05); } }
    if (s.gardens > 0) { for (const x of [-7, 7]) for (const z of [-36, -51, 52]) { box(g, x, .3, z, 2.4, .6, 2.4, mats.stone); tree(g, x, z, .8 + s.gardens * .12); } cyl(g, 0, .6, -31, 1.55, .15, mats.aether); cyl(g, 0, 1.6, -31, .06, 1.6, mats.aether); }
    if (s.housing > 0) { for (const x of [-42.95]) for (let i = 0; i < 5; i++) { const w = new T.Group(); w.position.set(x, 0, 50 - i * 23); w.rotation.y = Math.PI / 2; for (const xx of [-4, 0, 4]) for (const y of [4.5, 8, 11.5]) windowUnit(w, xx, y, 0, true, 1.4, 2.3); g.add(w); } }
    (this.water.material as T.MeshStandardMaterial).color.set(s.gardens ? '#377b78' : '#344c43'); bake(g);
  }
  buildProsperity() { this.disposeGroup(this.prosperity); const g = this.prosperity; const stage = this.economy.stage; this.stage = stage;
    if (stage >= 2) for (const x of [-6, 6]) { const flag = box(g, x, 6, -45, 1.1, 3, .05, mats.teal); cyl(g, x, 4, -45, .06, 8, mats.brass); sphere(g, x, 8.1, -45, .16, mats.brass); flag.rotation.y = .12; }
    if (stage >= 3) for (const x of [-22, 22]) { const b = new T.Group(); b.position.set(x, 15, -56); this.facade(b, 10, 8, 7, 1, true); g.add(b); }
    if (stage >= 4) { for (const x of [-23, 23]) { cyl(g, x, 28, -57, .2, 12, mats.brass); sphere(g, x, 34, -57, 1, mats.aether); const t = torus(g, x, 34, -57, 2, .13); t.rotation.y = Math.PI / 3; } }
    if (stage >= 5) { const dome = sphere(g, 0, 27, -85, 9, mats.copper); dome.scale.y = 1.4; cyl(g, 0, 16, -85, 11, 22, mats.warmStone); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; cyl(g, Math.sin(a) * 11, 16, -85 + Math.cos(a) * 11, .35, 22, mats.brass); } sphere(g, 0, 40, -85, 1.4, mats.aether); }
    if (this.economy.state.districts.includes('canal')) { for (let i = 0; i < 3; i++) { const frontage = new T.Group(); frontage.position.set(62.9, 0, 27 - i * 23); frontage.rotation.y = -Math.PI / 2; sign(frontage, ['ORISON PACKETS', 'LOCKE CUSTOMS', 'SALT & SAIL'][i], 'Canal Ward • Guild of merchants', 0, 3.8, .12, 11, 1.1); g.add(frontage); } for (const z of [-19, 7]) tree(g, 56, z); sign(g, 'THE CANAL WARD', 'Orison packets • Locke customs', 60, 3, -17, 6, 1); }
    if (this.economy.state.districts.includes('heights')) { box(g, 0, .12, -78, 20, .25, 15, mats.warmStone); for (const x of [-7, 7]) tree(g, x, -78, 1.2); sign(g, 'THE AETHER INSTITUTE', 'Tomorrow is a civic undertaking', 0, 4, -84, 10, 1.3); }
    bake(g);
  }
  construct(kind: string, id: string) { if (!['property', 'infrastructure', 'district', 'research'].includes(kind)) return; const g = new T.Group(); this.root.add(g); const p = PROPERTIES.find(p => p.id === id); const x = p ? p.x : kind === 'district' && id === 'canal' ? 54 : 0; const z = p ? p.z : -40; g.position.set(x, 0, z); if (p) g.rotation.y = p.rotation;
    for (const xx of [-8, 8]) for (const zz of [5.9, 8.2]) { cyl(g, xx, 5, zz, .055, 10, mats.brass); for (const y of [2.7, 5.7, 8.7]) beam(g, new T.Vector3(-8, y, zz), new T.Vector3(8, y, zz), .055, mats.brass); } for (const y of [2.7, 5.7, 8.7]) box(g, 0, y, 7.1, 16, .09, 2.3, mats.wood); for (let xx = -8; xx < 8; xx += 4) beam(g, new T.Vector3(xx, 0, 8.2), new T.Vector3(xx + 4, 5.7, 8.2), .05, mats.iron);
    const workers = [citizen(mats.cream), citizen(mats.rust)]; workers.forEach((w, i) => { w.group.position.set(i * 5 - 2.5, 0, 9); w.group.rotation.y = Math.PI; g.add(w.group); }); sign(g, 'TERRA IS REBUILDING', 'Guild of civic engineers', 0, 1.7, 9.2, 5, .8);
    this.constructions.push({ group: g, time: 0, duration: 6, workers, finish: () => { if (p) this.propertyUpgrade(p.id); this.sync(); } });
  }
  sync(initial = false) { if (initial) for (const p of PROPERTIES) this.propertyUpgrade(p.id); this.buildInfrastructure(); this.buildProsperity(); for (const [id, bars] of this.gateMeshes) bars.visible = !this.economy.state.districts.includes(id); }
  groundHeight(x: number, z: number) { if (x > -36.3 && x < -31.7 && z <= -29 && z >= -51) return .2 + (-z - 29) / 22 * 6; if (x > -37.5 && x < -30.5 && z < -51 && z >= -61.5) return 6.4; return .18; }
  blocked(x: number, z: number, feet: number) { if (x > 40.2 && x < 48.8 && (z < -9.5 || z > -2.5)) return true; if (x < -75 || x > 76 || z > 78 || z < -83) return true; if (x > 53 && !this.economy.state.districts.includes('canal')) return true; if (z < -69 && !this.economy.state.districts.includes('heights')) return true;
    return this.colliders.some(c => !(c.gate && this.economy.state.districts.includes(c.gate)) && feet < c.height && x > c.minX - .32 && x < c.maxX + .32 && z > c.minZ - .32 && z < c.maxZ + .32); }
  update(dt: number, time: number) { for (const p of PROPERTIES) { const v = this.properties.get(p.id)!; const level = this.economy.state.properties[p.id].level; v.gear.rotation.z -= dt * (.35 + level * .6); v.piston.position.y = .95 + Math.sin(time * (1 + level)) * .22; v.machine.rotation.z = level ? 0 : Math.sin(time * 9) * .008; }
    for (const flag of this.flags) {
      const pos = flag.geometry.attributes.position; const rest = flag.userData.rest as Float32Array;
      for (let j = 0; j < pos.count; j++) { const drop = -rest[j * 3 + 1] / flag.userData.height;
        pos.setZ(j, Math.sin(time * 2.4 + rest[j * 3] * 2.8 + drop * 4 + flag.position.z) * .13 * drop);
      }
      pos.needsUpdate = true; flag.geometry.computeVertexNormals();
    }
    for (const [i, npc] of this.npcs.entries()) { npc.group.visible = i < 14 + this.economy.stage * 5; if (!npc.group.visible) continue; const phase = (time * (.5 + i % 3 * .12) + i * 11) % 216; const side = i % 2 ? -1 : 1; const z = phase < 108 ? 57 - phase : -51 + phase - 108; const x = side * (5.1 + i % 3 * .45); npc.group.position.set(x, .18 + Math.abs(Math.sin(time * 4 + i)) * .015, z); npc.group.rotation.y = phase < 108 ? Math.PI : 0; const idle = i % 7 === 0; if (idle) { npc.group.position.set(side * 8.5, .18, 47 - Math.floor(i / 7) * 25); npc.group.rotation.y = side * Math.PI / 2; } const stride = time * (2.8 + i % 3 * .45) + npc.phase; npc.legs.forEach((leg, k) => { const cycle = stride + k * Math.PI; leg.rotation.x = idle ? 0 : Math.sin(cycle) * .36; npc.knees[k].rotation.x = idle ? 0 : Math.max(0, -Math.sin(cycle)) * .55; }); npc.arms.forEach((arm, k) => arm.rotation.x = idle ? -.12 + Math.sin(time * 1.4 + i) * .09 : -Math.sin(stride + k * Math.PI) * .27); npc.head.rotation.y = Math.sin(time * .7 + i) * (idle ? .25 : .07); }
    this.carts.forEach((cart, i) => { cart.visible = i <= this.economy.stage; const speed = 1.1 + this.economy.state.infrastructure.roads * .3; cart.position.set(i % 2 ? -2.8 : 2.8, .18, 60 - (time * speed + i * 38) % 118); for (const wheel of this.cartWheels[i]) wheel.rotation.x = -time * speed / .43; });
    this.airship.position.set(Math.sin(time * .007) * 85, 46 + Math.sin(time * .04), -95 + Math.cos(time * .007) * 15); this.airship.rotation.y = -.1; this.tram.position.x = (time * 5) % 180 - 90;
    for (const hand of this.clockHands) hand.parent!.rotation.z = this.economy.state.infrastructure.steam > 0 ? -this.economy.state.day * Math.PI * 48 : -.4;
    this.water.position.y = .025 + Math.sin(time * .9) * .012; (this.water.material as T.MeshStandardMaterial).roughness = .23 + Math.sin(time * .4) * .04;
    for (let i = this.constructions.length - 1; i >= 0; i--) { const c = this.constructions[i]; c.time += dt; for (const w of c.workers) w.arms[0].rotation.x = -1 + Math.sin(time * 14) * .7; if (c.time >= c.duration) { c.finish(); this.root.remove(c.group); this.constructions.splice(i, 1); } }
  }
}
