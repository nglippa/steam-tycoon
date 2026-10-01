import * as T from 'three';
import { Atlas, place, type Placed } from './sign-atlas';
import { box,cyl,sphere,torus,beam,gear,barrel,crate,sign,arch,bake,mats,seeded,illustrated,tree,bareTree,blossom,windowUnit,printed,windowGlass,asProp } from './assets';
import { V,pipe,cable,crest,gauge,lampHead,railing,canopy,artMats,roof,pressureRing,wingedValve,bench,pressureStation,mailPost,fabricOf,poster,meterBox,labeledCrate,stencilBarrel,stove,workbench,cafeTable,anvil,pipeStack } from './art-kit';
import { citizen } from './citizens';
import type { Archetype } from './palette';
import { animateLife, turnTaking, eased, type Activity } from './citizen-life';
import { reducedMotion } from '../motion';
import type { City } from './city';
import { PROPERTIES } from '../simulation/economy';
import { businessHeights, businessLift } from './architecture';
import { TERRACE, terraceRise } from './city';
import { MarketSquare } from './market-square';
import { FoundryWorks } from './foundry-works';
import { CinderRow } from './cinder-row';
import { SkyCanal } from './sky-canal';
import { Weatherside } from './weatherside';
import { Hangway } from './hangway';
import { Roofwalk } from './roofwalk';
import { CanalWard } from './canal-ward';
import { WEST_EDGE } from './geography';
import { RationLine } from './ration-line';
import type { SiteModule } from './layers';
import { SITE_RESTORED } from '../simulation/economy';

/** Merge a group of static, shadowless overlays (light shafts, lamp pools) into one mesh per material. */
const unlit=(g:T.Group)=>{bake(g);for(const m of g.children)m.castShadow=m.receiveShadow=false;};
/** World-only presentation. Reads completed visual levels; never changes the economy. */
const w2=(w:number)=>w*.18;
const plaqueAtlas=new Atlas(map=>printed(illustrated(new T.MeshStandardMaterial({map}))),2048);
export class Presentation {
  root=new T.Group(); restored=new T.Group(); worn=new T.Group(); market=new T.Group();
  mechanisms:{object:T.Object3D;axis:'x'|'y'|'z';speed:number}[]=[];
  workers:{person:ReturnType<typeof citizen>;kind:Activity;tool?:T.Group;minStage:number;maxStage:number;time:'any'|'day'|'night';partner?:number;path?:{a:T.Vector3;b:T.Vector3;speed:number};y:number;when?:()=>boolean}[]=[];
  marketSquare!:MarketSquare; foundryWorks!:FoundryWorks; cinderRow!:CinderRow; rationLine!:RationLine; sites:SiteModule[]=[];
  /** The Ordinance's coal furnace at Cinder No. 3: its own group, because restoration removes it. */
  foundryFurnace?:T.Group; foundryHoist?:T.Group; furnaceHammer=0;
  cartPusher=0;shaftMat?:T.MeshBasicMaterial;shafts?:T.Group;poolMat?:T.MeshBasicMaterial;pools?:T.Group;terracePlanters:[number,number][]=[];birds!:T.InstancedMesh;capsules:T.Group[]=[];moths!:T.InstancedMesh;hoistCrate!:T.Group;skyCanal!:SkyCanal;weatherside!:Weatherside;hangway!:Hangway;roofwalk!:Roofwalk;canalWard!:CanalWard;craneJib!:T.Group;ingotCart!:T.Group;
  steamOrigins=[V(32.8,13,40),V(0,17.9,29),V(-9,.25,25),V(31,3,14),V(-29,2,14),V(9,.3,-25)];
  runoff: T.Vector3[]=[]; heat:T.Mesh[]=[]; lanterns:T.Mesh[]=[];
  signature='';
  /** Rooms that are lit from inside. One light serves them all: it sits in whichever room the Steward is nearest. */
  interiors:{x:number;y:number;z:number;color:string;reach:number;power?:number}[]=[];interiorLight=new T.PointLight('#ffd9a0',0,11,1.4);private interiorColor=new T.Color();
  verges:[number,number][]=[[-7.3,42],[-7.3,16],[-7.3,-13],[7.3,38],[7.3,13],[7.3,-17]];
  tarp=illustrated(new T.MeshStandardMaterial({color:'#8f9d97',side:T.DoubleSide}));
  soot=new T.MeshBasicMaterial({color:'#2a2a36',transparent:true,opacity:.28,depthWrite:false});
  constructor(public city:City){city.root.add(this.root);this.root.add(this.restored,this.worn,this.market);this.gate();this.street();this.industries();this.square();this.story();this.boundaries();this.greatMain();this.streetEdges();this.life();this.everyday();this.nightLights();this.density();this.ornament();this.carving();this.vignettes();this.marketSquare=new MarketSquare(this);this.foundryWorks=new FoundryWorks(this);this.cinderRow=new CinderRow(this);this.rationLine=new RationLine(this);this.sites=[this.marketSquare,this.foundryWorks,this.cinderRow,this.rationLine];}
  section(){const g=new T.Group();this.root.add(g);return g;}
  gate(){const g=this.section();
    // Curved iron arch lowers the opening into the player's field of view.
    const curve=new T.QuadraticBezierCurve3(V(-8.6,5.4,66),V(0,10,66),V(8.6,5.4,66));
    for(const z of [-.65,.65]){const c=curve.clone();c.v0.z+=z;c.v1.z+=z;c.v2.z+=z;g.add(new T.Mesh(new T.TubeGeometry(c,24,.18,6,false),mats.iron));}
    for(let i=0;i<=12;i++){const p=curve.getPoint(i/12);beam(g,V(p.x,p.y,p.z-.75),V(p.x,p.y,p.z+.75),.06,mats.brass);}
    for(const x of [-8.8,8.8]) {pipe(g,[[x,0,67.5],[x,4.8,67.5],[x+Math.sign(x)*1.2,5.5,67.5],[x+Math.sign(x)*1.2,9,67.5]],.18,mats.rust);lampHead(g,x,3.4,67.7);crest(g,x,6,67.5,.95);}
    box(g,0,6.9,67.1,7.7,1.4,.22,mats.iron);sign(g,'T E R R A','LOWWORKS • WARD 07',0,6.9,67.25,7.3,1.25);crest(g,0,8.35,67.1,.6);
    sign(g,'KEEP THE ENGINES LIT','CITY STEWARDSHIP • EST. 1841',-8.8,1.9,67.65,1.8,1);
    bake(g);
  }
  street(){const g=this.section();const rand=seeded(891);
    // The Market Bridge-house: a vaulted masonry span with rooms above, touching the
    // facades on both sides. The street compresses beneath it, then opens to the clock.
    { const z=5.6,outer=new T.Shape();outer.moveTo(-13.4,0);outer.lineTo(13.4,0);outer.lineTo(13.4,8.2);outer.lineTo(-13.4,8.2);outer.closePath();
      const hole=new T.Path();hole.moveTo(-11.8,0);hole.lineTo(-11.8,5.4);hole.quadraticCurveTo(0,8.4,11.8,5.4);hole.lineTo(11.8,0);hole.closePath();outer.holes.push(hole);
      const vault=new T.Mesh(new T.ExtrudeGeometry(outer,{depth:3.2,bevelEnabled:false,curveSegments:10}),mats.warmStone);vault.position.set(0,0,z-1.6);g.add(vault);
      for(const zz of [z-1.7,z+1.7]){box(g,0,8.3,zz,27.2,.28,.3,mats.stone);for(const x of [-12.6,12.6])box(g,x,2.6,zz,1.8,5.2,.2,mats.stone);const key=new T.Group();key.position.set(0,7,zz+(zz>z?.12:-.12));key.rotation.y=zz>z?0:Math.PI;g.add(key);box(key,0,0,0,1.1,1.4,.2,mats.stone);pressureRing(key,0,0,.14,.42,mats.brass);}
      box(g,0,9.9,z,25.4,3.2,2.8,artMats.plaster);box(g,0,11.6,z,26,.26,3.4,mats.stone);
      for(const zz of [z-1.42,z+1.42])for(let x=-10.5;x<=10.5;x+=3){const face=new T.Group();face.position.set(x,0,zz);face.rotation.y=zz>z?0:Math.PI;g.add(face);windowUnit(face,0,8.8,0,true,1.1,1.8,'rect');}
      for(const x of [-12.9,-6.45,0,6.45,12.9])box(g,x,9.9,z,.3,3.3,3,mats.wood);
      const rg=new T.Group();rg.position.set(0,0,z);rg.rotation.y=Math.PI/2;g.add(rg);roof(rg,0,11.72,0,3.9,2.1,26.8,mats.teal);
      for(const x of [-7,7]){box(g,x,13.3,z,.7,2.2,.7,mats.brick);}
      pipe(g,[[-14,8.55,z+1.9],[14,8.55,z+1.9]],.12,mats.copper);
      sign(g,'MARKET SQUARE ↑','CIVIC WALK',-6.2,7.35,z+1.72,3.5,.55);
      for(const x of [-12.6,12.6])this.city.collider(x,z,1.6,3.2);}
    // Side-street service infrastructure and projecting signs.
    for(const side of [-1,1])for(const z of [28,2,-30]){

      const label=new T.Group();label.position.set(side*11.9,3.7,z+3);label.rotation.y=side<0?Math.PI/2:-Math.PI/2;g.add(label);
      box(label,0,0,0,2,.9,.15,mats.iron);sign(label,z===28?'BOILER ROW':z===2?'FINCH YARD':'BELLWEATHER','LOWWORKS • 07',0,0,.1,1.8,.75);
    }
    // Foreground pockets are outside the central walking and cart lanes.
    for(const [x,z] of [[-8,59],[8,7]] as number[][]){
      box(g,x,.28,z,1.8,.5,2.8,mats.stone);this.city.collider(x,z,1.8,2.8,.6);
      for(let i=0;i<4;i++){const rock=new T.Mesh(new T.DodecahedronGeometry(.32,0),artMats.coal);rock.position.set(x+(rand()-.5),.65,z+(rand()-.5)*1.5);g.add(rock);}

    }
    for(const x of [-6.2,6.2])for(let z=59;z>-56;z-=24){
      box(g,x,.08,z,.18,.025,4.8,mats.dark);for(let j=0;j<4;j++)box(g,x,.105,z-2+j*.6,.4,.04,.055,mats.iron);
    }
    // A few authored repair patches sit at the gutter, away from the hero lane.
    for(const [x,z,w,d] of [[-5.1,43,1.4,2.8],[5.1,16,1.2,2.1],[-5.0,-8,1.8,1.3]])box(this.worn,x,.071,z,w,.018,d,artMats.fadedPaint);
    for(const z of [53,27,1,-13])box(g,0,.11,z,12.7,.028,1.7,mats.stone);
    for(const p of PROPERTIES){for(const offset of [-7,7]){const local=V(offset,3.1,7.5);local.applyAxisAngle(V(0,1,0),p.rotation).add(V(p.x,.18,p.z));this.runoff.push(local);}}
    bake(g);bake(this.worn);
  }
  industries(){const g=this.section();
    // Boiler yard: a full pressure manifold ties the roof reservoirs to street mains.
    const b=new T.Group();b.position.set(30,0,40);b.rotation.y=Math.PI/2;g.add(b);
    pipe(b,[[-2,1,1],[-2,10,1],[2,10,1],[2,3,1],[0,3,3]],.38);
    gauge(b,0,4,2.25,1.05,'07');crest(b,0,1.7,2.15,.7);
    for(const y of [1.4,2.7,5])for(const x of [-2,2]){cyl(b,x,y,1,.32,.1,mats.iron);}
    box(b,0,8,0,6,.16,5,mats.iron);railing(b,0,8.1,2.5,6);
    for(const x of [-2.7,2.7])box(b,x,4,2.2,.1,8,.1,mats.iron);
    for(let y=.5;y<8;y+=.55)box(b,-2.7,y,2.3,.65,.055,.07,mats.brass);
    sign(b,'MUNICIPAL No. 07','PRESSURE IS A PUBLIC TRUST',0,7.2,2.6,5.5,.65);
    pipe(b,[[0,11,0],[0,13,0],[0,13,2.8]],.5,mats.iron);
    // Foundry's heavy open furnace and overhead material-handling crane.
    const f=new T.Group();f.position.set(29,0,14);f.rotation.y=Math.PI/2;this.root.add(f);this.foundryFurnace=f;
    for(const x of [-3,3])box(f,x,4.7,0,.28,9.4,.35,mats.iron);
    box(f,0,9.2,0,8,.55,.5,mats.rust);for(let i=0;i<7;i++)beam(f,V(-3+i,8.95,0),V(-2+i,9.45,0),.035,mats.brass);
    box(f,0,2.7,.5,4.6,5.4,2.5,artMats.coal);arch(f,0,.3,1.79,3,3.5,mats.iron);arch(f,0,.5,1.82,2.5,3,artMats.furnace);
    for(const x of [-1.5,1.5]){box(f,x,2.1,2,.3,3.3,.3,mats.rust);for(let y=.8;y<3.6;y+=.5)sphere(f,x,y,2.18,.075,mats.brass);}
    box(f,0,.35,3,3,.25,2,mats.iron);for(const x of [-.8,0,.8])box(f,x,.51,3.1,.4,.08,1.2,artMats.ember);
    const hoist=new T.Group();hoist.position.set(0,8.7,0);f.add(hoist);cyl(hoist,0,-1.3,0,.025,2.6,mats.iron);torus(hoist,0,-2.8,0,.26,.065,mats.brass);bake(hoist);
    f.remove(hoist);hoist.position.set(29,8.7,14);this.root.add(hoist);this.foundryHoist=hoist;this.mechanisms.push({object:hoist,axis:'z',speed:.05});
    pipe(f,[[0,5.4,.5],[0,7.3,.5],[-2,7.3,.5],[-2,12,.5]],.65,mats.iron);
    sign(f,'CINDER No. 3','FOUNDRY • HOT METAL',0,5.6,2.05,3.8,.65);
    bake(f);this.city.collider(29,14,3.4,4.5,6,undefined,()=>this.city.economy.state.sites.foundry>=SITE_RESTORED);this.city.collider(29.5,40,4.5,4.5,7);
    // Belt-driven wheel at the workshop. The axle and bearing supports connect it.
    const drive=new T.Group();drive.position.set(-29,2.7,14);this.root.add(drive);const wheel=gear(drive,0,0,0,1.3);this.mechanisms.push({object:wheel,axis:'z',speed:-.75});
    beam(g,V(-29,2.7,13.6),V(-29,2.7,15.4),.11,mats.iron);for(const z of [13.7,15.3])box(g,-29,1.25,z,.35,2.5,.35,mats.iron);
    for(const x of [-30.25,-27.75])box(g,x,1.75,14,.06,2,.16,mats.wood);
    this.furnaceHammer=this.addWorker(33.6,16,-Math.PI/2,'hammer');this.addWorker(33.1,42,-Math.PI/2,'gauge');this.addWorker(-30,12,Math.PI/2,'valve');
    const valve=torus(g,-29.4,1.55,12,.28,.04,mats.brass);valve.rotation.y=Math.PI/2;pipe(g,[[-29.4,1.55,12],[-29.4,1.55,14]],.055);
    bake(g);
  }
  square(){const g=this.section();const T0=TERRACE;
    // The clock terrace: concentric curved steps, a paved plateau and a stone lip on every riser.
    for(let k=0;k<T0.steps;k++){const r=T0.outer-k*(T0.outer-T0.inner)/T0.steps,h=(k+1)*T0.rise/T0.steps;const step=new T.Mesh(new T.CylinderGeometry(r,r,h,64),k%2?mats.warmStone:mats.stone);step.position.set(T0.x,h/2+.01,T0.z);g.add(step);
      const lip=new T.Mesh(new T.CylinderGeometry(r+.04,r+.04,.05,64),mats.brick);lip.position.set(T0.x,h-.02,T0.z);g.add(lip);}
    const disc=new T.Mesh(new T.CylinderGeometry(T0.inner-.6,T0.inner-.6,.02,48),mats.brick);disc.position.set(T0.x,T0.rise+.02,T0.z);g.add(disc);
    const inlay=torus(g,T0.x,T0.rise+.04,T0.z,5.6,.07,mats.brass);inlay.rotation.x=Math.PI/2;
    for(const x of [-5.6,5.6]){const y0=terraceRise(x,-43);cyl(g,x,3.1+y0,-43,.07,6.2,mats.iron);lampHead(g,x,5.8+y0,-43);}
    // Terrace furniture: curved benches facing the tower, planters on the south rim.
    for(const a of [.75,2.35,3.95]){const bx=Math.sin(a)*7.6,bz=T0.z+Math.cos(a)*7.6;const b=bench(g,bx,bz,a+Math.PI);b.position.y=T0.rise+.01;this.city.collider(bx,bz,1.4,1.4,1.1);}
    for(const a of [1.75,3.14,4.5]){const px=Math.sin(a)*8.2,pz=T0.z+Math.cos(a)*8.2;cyl(g,px,T0.rise+.35,pz,.75,.7,mats.stone);torus(g,px,T0.rise+.7,pz,.75,.06,mats.brass).rotation.x=Math.PI/2;this.city.collider(px,pz,1.5,1.5,1);this.terracePlanters.push([px,pz]);}
    for(const x of [-11,11]){cyl(g,x,3.8,-28,.10,7.6,mats.iron);crest(g,x,6.9,-27.9,.7);}
    bake(g);
  }
  story(){const g=this.section();
    // Small tableaux: a meal gone cold, a repaired toy, memorial and notices.
    box(g,-29,1.1,19,2,.16,1,mats.wood);for(const x of [-29.7,-28.3])box(g,x,.55,19,.08,1.1,.7,mats.iron);
    cyl(g,-29.3,1.25,19,.22,.055,mats.cream);cyl(g,-28.7,1.35,19,.09,.23,mats.copper);torus(g,-28.58,1.37,19,.07,.025,mats.copper);
    sign(g,'BACK AT THE BELL','FINCH • SECOND SHIFT',-29,1.35,19.5,.8,.4);
    const notice=new T.Group();notice.position.set(-42.8,2,22.6);notice.rotation.y=Math.PI/2;g.add(notice);
    box(notice,0,0,0,2.6,2,.15,mats.wood);sign(notice,'KEEP YOUR RECEIPTS','COAL RATIONS • TUESDAYS',0,.3,.11,2.2,.8,'#d6b778');sign(notice,'MISSING: A SMALL BRASS BIRD','RETURN TO THE COPPER FINCH',.2,-.5,.13,1.8,.6,'#c1b29a');
    const toy=new T.Group();toy.position.set(-41.9,.2,21.2);g.add(toy);box(toy,0,.15,0,.55,.25,.25,mats.red);for(const x of [-.18,.18])for(const z of [-.17,.17])sphere(toy,x,.05,z,.09,mats.iron);cyl(toy,.15,.4,0,.05,.28,mats.copper);
    const memorial=new T.Group();memorial.position.set(34,1.6,-45);memorial.rotation.y=-Math.PI/2;g.add(memorial);sign(memorial,'THE WINTER OF 1841','17 ENGINEERS • THE FLAME REMAINED',0,0,0,2.8,1.2);crest(memorial,0,1,0,.45);
    for(const [x,z] of [[-29,34],[29,8],[-42,3]]){barrel(g,x,0,z);crate(g,x+1,0,z,.7);for(let i=0;i<5;i++)beam(g,V(x-.4,.3+i*.13,z+.7),V(x+.4,.3+i*.13,z+.8),.065,mats.wood);}
    this.addWorker(-41.4,22.6,-Math.PI/2,'read');this.addWorker(-9,-22,Math.PI/2,'sweep');this.addWorker(9.8,-18,-Math.PI/2,'read');this.addWorker(34,19,-Math.PI/2,'warm');
    bake(g);
  }
  boundaries(){const g=this.section();
    for(const x of [-75.5,76.5])for(let z=-78;z<78;z+=9){if(x<0&&z>WEST_EDGE.z0-4&&z<WEST_EDGE.z1+4)continue;box(g,x,1.8,z,.6,3.6,8.8,mats.darkBrick);cyl(g,x,4,z, .2,1,mats.iron);}
    // Freight gates give the far north boundary an intentional silhouette.
    for(const x of [-52,60]){box(g,x,5,-82,20,10,1,mats.darkBrick);sign(g,'EAST LOCKE FREIGHT','RAIL ACCESS • AUTHORIZED CREWS',x,4,-81.4,8,1.2);for(let dx=-4;dx<=4;dx+=.5)cyl(g,x+dx,2,-81.3,.04,4,mats.iron);}
    bake(g);
  }
  /** The Great Main as civic infrastructure: regulators, catwalk, branches, crews. */
  greatMain(){const g=this.section();const z=29,y=14;
    for(const side of [-1,1]){const x=side*9.9;
      box(g,x,1,z,1.1,2,.9,mats.teal);box(g,x,2.05,z,1.25,.12,1.05,mats.brass);
      const face=new T.Group();face.position.set(x-side*.56,1.3,z);face.rotation.y=side*-Math.PI/2;g.add(face);gauge(face,0,.05,.02,.36,'W7');wingedValve(face,0,-.62,.05,.5);
      pipe(g,[[x,2.1,z],[x,12.4,z],[side*11.3,13.3,z]],.16,mats.brass);this.city.collider(x,z,1.3,1.1,3);
      for(const bx of [side*19]) for(const [bz,by] of [[33.5,side<0?7.1:10],[22,side<0?8.9:9.6]]){pipe(g,[[bx,y,z],[bx,y,bz],[bx,by,bz]],.3,mats.copper);torus(g,bx,y,z+(bz>z?.9:-.9),.4,.07,mats.iron);}
      for(let h=1;h<12.3;h+=.45)box(g,side*10.62,h,z+.75,.06,.05,.5,mats.iron);
      for(const dx of [-.8,.8]){const band=torus(g,side*14.5+dx,y,z,.9,.07,dx<0?mats.teal:mats.cream);band.rotation.y=Math.PI/2;}
    }
    // Maintenance catwalk hung beside the pipe.
    box(g,0,12.72,z+1.3,22,.1,.8,mats.iron);railing(g,0,12.77,z+1.72,22);for(let x=-10;x<=10;x+=5)beam(g,V(x,12.72,z+1.3),V(x,13.9,z+.9),.03,mats.iron);
    for(const face of [-1,1]){const plaque=new T.Group();plaque.position.set(0,y+.6,z+face*1.95);plaque.rotation.y=face<0?Math.PI:0;g.add(plaque);pressureRing(plaque,0,0,0,.7,mats.cream);}
    this.steamOrigins.push(V(-6,13.2,z),V(6,13.2,z),V(-24.9,2.6,8));
    bake(g);
    this.addWorker(-3.2,z+1.25,Math.PI,'repair',{y:12.77,role:'worker'});
    this.addWorker(-8.9,z+.9,-Math.PI/2,'clipboard',{role:'engineer'});
  }
  /** Curb furniture narrows the street visually; the road itself stays clear. */
  streetEdges(){const g=this.section();
    for(const [x,z] of [[-7.1,48],[-7.1,22],[-7.1,-4],[7.1,47],[7.1,21],[7.1,-6]]){bench(g,x,z,x<0?Math.PI/2:-Math.PI/2);this.city.collider(x,z,.7,2,.9);}
    for(const [x,z,yaw] of [[-7.3,33,Math.PI/2],[7.3,8,-Math.PI/2],[-7.3,-9,Math.PI/2]] as const){pressureStation(g,x,z,yaw);this.city.collider(x,z,.9,1.3,1.6);}
    for(const [x,z] of [[-7.3,55],[7.3,-2.8]]){mailPost(g,x,z);this.city.collider(x,z,.4,.4,2);}
    // Road texture in value regions: rail bed, service covers and drains, all quiet.
    const bed=illustrated(new T.MeshStandardMaterial({map:mats.road.map,color:'#7f8a8a'}));box(g,0,.089,9,5.8,.006,139,bed);
    for(const [x,z] of [[-4.3,40],[4.2,12],[-4.2,-18],[4.4,58]]){cyl(g,x,.09,z,.5,.02,mats.dark);const ring=torus(g,x,.1,z,.42,.035,mats.iron);ring.rotation.x=Math.PI/2;box(g,x,.1,z,.75,.02,.06,mats.iron);}
    // Warm-stone loading bands narrow the dark carriageway without touching the walking lanes.
    const band=illustrated(new T.MeshStandardMaterial({map:mats.road.map,color:'#bfae91'}));
    for(const [z0,z1] of [[30.5,68.5],[4.5,23.5],[-27.5,-2.5]])for(const side of [-1,1]){box(g,side*5.3,.09,(z0+z1)/2,1.6,.008,z1-z0,band);box(g,side*4.47,.095,(z0+z1)/2,.07,.012,z1-z0,mats.dark);}
    for(const [x,z] of this.verges){box(g,x,.1,z,1.5,.02,1.5,mats.iron);for(let k=-2;k<=2;k++)box(g,x+k*.28,.115,z,.05,.01,1.4,mats.dark);this.city.collider(x,z,.5,.5,3);}
    // A tea cart holds a vendor pocket at the gate end of the street.
    const cart=new T.Group();cart.position.set(8.4,0,60.5);cart.rotation.y=-Math.PI/2;g.add(cart);box(cart,0,.9,0,1.6,.7,.9,mats.teal);box(cart,0,1.28,0,1.75,.06,1,mats.brass);
    for(const x of [-.6,.6]){const w=torus(cart,x,.42,.48,.38,.05,mats.iron);void w;}cyl(cart,.3,1.55,0,.18,.4,mats.copper);sphere(cart,.3,1.8,0,.1,mats.brass);cyl(cart,-.4,1.45,0,.12,.28,mats.copper);
    cyl(cart,0,2.1,0,.02,1.6,mats.iron);const shade=new T.Mesh(new T.ConeGeometry(1.1,.45,8,1,true),fabricOf(mats.red));shade.position.set(0,2.85,0);cart.add(shade);this.city.collider(8.4,60.5,1.1,1.8,1.5);
    bake(g);
    this.addWorker(9.35,60.5,-Math.PI/2,'browse',{role:'merchant',minStage:1});
    const buyer=this.addWorker(7.35,60.3,Math.PI/2,'talk',{role:'resident',minStage:1,tool:'mug'});this.workers[buyer].partner=buyer-1;this.workers[buyer-1].partner=buyer;
  }
  /** Small authored stories, each placed where a turn in the street reveals it. */
  life(){const g=this.section();
    // Foundry Lane gantry: a low pipe bridge compresses the lane before the boiler yard opens up.
    { const z=56;for(const x of [30.1,38.3]){box(g,x,2.4,z,.9,4.8,1.6,mats.darkBrick);box(g,x,.3,z,1.3,.6,2,mats.stone);this.city.collider(x,z,1,1.7);}
      box(g,34.2,4.95,z,9.4,.3,1.8,mats.iron);railing(g,34.2,5.05,z+.85,9);for(const [dz,r,m] of [[-.55,.38,mats.copper],[0,.26,mats.brass],[.5,.2,mats.copper]] as const){const p=cyl(g,34.2,4.45-r,z+dz,r,9.4,m);p.rotation.z=Math.PI/2;}
      for(let x=30.6;x<38;x+=1.2){const ring=torus(g,x,4.07,z-.55,.42,.05,mats.iron);ring.rotation.y=Math.PI/2;}
      sign(g,'BOILER YARD','PRESSURE • WARD 07',34.2,5.55,z+.95,3.2,.6);}
    // A leaking joint on the Finch rear wall and the mechanic under it (early Terra).
    pipe(g,[[-24.65,0,6],[-24.65,2.5,6],[-24.65,2.5,10],[-24.65,6,10]],.12,mats.copper);torus(g,-24.8,2.5,8,.2,.06,mats.rust).rotation.y=Math.PI/2;
    box(g,-25.7,.2,9.3,.7,.35,.4,mats.red);box(g,-25.7,.42,9.3,.5,.08,.25,mats.iron);
    this.addWorker(-25.6,8,-Math.PI/2,'repair',{maxStage:2});this.addWorker(-25.9,8.2,-Math.PI/2,'clipboard',{minStage:3,role:'engineer'});
    // Lunch on the benches.
    this.addWorker(-7.0,22,Math.PI/2,'eat',{role:'worker',tool:'eat'});this.addWorker(7.0,-6,-Math.PI/2,'sit',{role:'resident',minStage:2});
    // A child and parent watching the airship from Clock Square.
    this.addWorker(3.3,-36.5,Math.PI,'watch',{role:'resident',scale:.72});this.addWorker(4.2,-36.1,Math.PI+.2,'watch',{role:'resident'});
    // The calliope: a street machine that gathers a crowd once Terra recovers.
    const cal=new T.Group();cal.position.set(-7.8,terraceRise(-7.8,-46.6),-46.6);g.add(cal);box(cal,0,.55,0,1.8,1.1,1.1,artMats.wine);box(cal,0,1.12,0,1.95,.08,1.2,mats.brass);
    for(let i=0;i<6;i++)cyl(cal,-.65+i*.26,1.5+(i%3)*.15,-.2,.07,.6+(i%3)*.3,mats.brass);pressureRing(cal,0,.6,.57,.32,mats.brass);for(const x of [-.7,.7]){const w=torus(cal,x,.3,.56,.28,.04,mats.iron);void w;}
    this.city.collider(-7.8,-46.6,2,1.4,2);
    this.addWorker(-8.9,-47.9,.4,'valve',{role:'engineer',minStage:2});
    for(const [x,z,yaw] of [[-7.3,-44.6,Math.PI+.25],[-6.3,-45.4,-2.2],[-8.6,-44.5,2.9]] as const)this.addWorker(x,z,yaw,'watch',{minStage:2});
    // Terrace life: two on the benches, a guard at the tower door, a flower seller with trade.
    for(const a of [.75,3.95]){const bx=Math.sin(a)*7.25,bz=TERRACE.z+Math.cos(a)*7.25;this.addWorker(bx,bz,a+Math.PI,'sit',{y:TERRACE.rise,role:a<2?'resident':'merchant'});}
    this.addWorker(1.6,-40.9,0,'guard',{y:TERRACE.rise,role:'guard'});
    this.addWorker(6.2,-53.4,-2.2,'browse',{y:TERRACE.rise,role:'merchant',minStage:3});
    // Balconies: residents above the street once homes are cared for.
    this.addWorker(-12.85,-19.7,Math.PI/2,'lean',{y:4.33,role:'resident',minStage:3});
    const a=this.addWorker(12.85,-19.4,-Math.PI/2,'talk',{y:4.33,role:'merchant',minStage:3});const b=this.addWorker(12.85,-20.7,-Math.PI/2+.5,'talk',{y:4.33,role:'resident',minStage:3});this.workers[a].partner=b;this.workers[b].partner=a;
    // Night at the Copper Finch.
    const n1=this.addWorker(-11.4,-12.2,Math.PI/2+.6,'talk',{role:'worker',time:'night',minStage:1,tool:'mug'});const n2=this.addWorker(-10.6,-11.2,-2.6,'talk',{role:'courier',time:'night',minStage:1,tool:'mug'});this.workers[n1].partner=n2;this.workers[n2].partner=n1;
    this.addWorker(6.4,-29,Math.PI/2,'sweep',{role:'merchant',time:'night',minStage:1});
    // Engineer on the boiler deck; foundry cart; waterfront crane crew.
    this.addWorker(32.2,38,-Math.PI/2+.4,'clipboard',{y:8.1,role:'engineer'});
    this.cartPusher=this.addWorker(36.4,7.6,0,'carry',{path:[36.4,18.4,.45],role:'worker',tool:'none'});
    this.ingotCart=new T.Group();box(this.ingotCart,0,.55,0,1,.4,1.4,mats.iron);for(const x of [-.35,0,.35])box(this.ingotCart,x,.82,0,.26,.14,1.1,artMats.ember);for(const x of [-.5,.5])for(const z of [-.45,.45]){const w=torus(this.ingotCart,x,.25,z,.2,.05,mats.iron);w.rotation.y=Math.PI/2;}asProp(this.ingotCart);bake(this.ingotCart);this.root.add(this.ingotCart);
    for(const x of [35.9,36.9])box(g,x,.1,13.9,.08,.06,13,mats.iron);
    const crane=new T.Group();crane.position.set(38.8,0,24);g.add(crane);box(crane,0,.3,0,1.8,.6,1.8,mats.stone);cyl(crane,0,3.5,0,.28,6.4,mats.iron);cyl(crane,0,6.9,0,.5,.6,mats.brass);
    this.craneJib=new T.Group();this.craneJib.position.set(38.8,7.1,24);this.root.add(this.craneJib);beam(this.craneJib,V(-1.2,0,0),V(5.2,.6,0),.12,mats.iron);beam(this.craneJib,V(0,1.6,0),V(5.2,.6,0),.05,mats.iron);beam(this.craneJib,V(-1.2,0,0),V(0,1.6,0),.05,mats.iron);box(this.craneJib,-1.3,-.2,0,.9,.7,.9,mats.dark);
    cyl(this.craneJib,5,-1.8,0,.02,3.6,mats.iron);crate(this.craneJib,5,-4.4,0,.8);bake(this.craneJib);this.city.collider(38.8,24,1.8,1.8);
    this.addWorker(37.6,25.3,Math.PI/2+.4,'valve',{role:'worker'});
    for(const z of [30,31.2])crate(g,38.3,0,z,.9);for(const z of [-20,-28,4])cyl(g,39.6,.4,z,.18,.8,mats.iron);
    // The sky canal: steam carriers over the cleft where the barge once ran.
    this.skyCanal=new SkyCanal(this.root);
    // The city behind and beneath the showcase streets.
    this.root.add(this.interiorLight);this.weatherside=new Weatherside(this);this.hangway=new Hangway(this);this.roofwalk=new Roofwalk(this);this.canalWard=new CanalWard(this);
    // A crate rides the salvage pulley.
    this.hoistCrate=new T.Group();crate(this.hoistCrate,0,0,0,.7);asProp(this.hoistCrate);bake(this.hoistCrate);this.root.add(this.hoistCrate);
    // Housing lane: a stoop chair, a delivery handcart and doorstep plants once homes recover.
    for(const [x,z] of [[-41.6,17.2],[-41.6,-8.5]]){box(g,x,.45,z,.5,.06,.5,mats.wood);for(const dx of [-.2,.2])for(const dz of [-.2,.2])box(g,x+dx,.22,z+dz,.05,.45,.05,mats.wood);box(g,x-.23,.75,z,.05,.6,.5,mats.wood);}
    this.addWorker(-41.55,17.2,Math.PI/2,'sit',{role:'resident'});this.addWorker(-41.55,-8.5,Math.PI/2,'read',{role:'resident',minStage:2,tool:'read'});
    const hand=new T.Group();hand.position.set(-38.6,0,-3);g.add(hand);box(hand,0,.6,0,.9,.1,1.5,mats.wood);for(const z of [-.4,.4])crate(hand,0,.65,z,.55);torus(hand,.5,.35,0,.32,.05,mats.iron).rotation.y=Math.PI/2;beam(hand,V(0,.6,.75),V(0,1.1,1.5),.03,mats.wood);
    this.addWorker(-38.6,-4.9,0,'carry',{role:'courier',minStage:1});
    for(const z of [40.5,27,-12,-35])for(const dz of [-1.1,1.1]){cyl(g,-42.3,.25,z+dz,.22,.5,mats.rust);}
    // People lean on walls and sit on stoops: the street is somewhere to spend time.
    this.addWorker(-13.15,17,Math.PI/2,'lean',{role:'courier'});
    this.addWorker(24.85,21,Math.PI/2,'lean',{role:'worker'});
    this.addWorker(-42.6,33,Math.PI/2,'lean',{role:'resident',minStage:1});
    this.addWorker(-42.4,4.3,Math.PI/2,'sit',{role:'resident'});
    this.addWorker(-42.4,-19.4,Math.PI/2,'eat',{role:'worker',tool:'eat',minStage:1});
    this.addWorker(-42.4,49.6,Math.PI/2,'sit',{role:'resident',scale:.74,minStage:2});
    // Early Terra is poor, not empty: a brazier circle, a blanket seller, a lamp repair and an argument.
    const brazier=new T.Group();brazier.position.set(-40.6,0,12);g.add(brazier);cyl(brazier,0,.45,0,.34,.9,mats.rust);for(const y of [.2,.7])cyl(brazier,0,y,0,.36,.06,mats.iron);cyl(brazier,0,.93,0,.28,.05,artMats.ember);sphere(brazier,0,.98,0,.16,artMats.furnace);
    for(const a of [0,2.1,4.2])this.addWorker(-40.6+Math.sin(a)*.95,12+Math.cos(a)*.95,a+Math.PI,'warm',{maxStage:1,role:a>3?'resident':'worker'});
    this.steamOrigins.push(V(-40.6,1.1,12));
    box(g,-7.9,.1,60.8,1.6,.04,2.2,artMats.wine);for(let k=0;k<5;k++)box(g,-7.6-(k%2)*.5,.22,60.1+k*.35,.28,.22,.24,[mats.copper,mats.iron,artMats.ochre][k%3]);
    this.addWorker(-8.5,60.9,Math.PI/2,'sit',{maxStage:1,role:'resident'});this.addWorker(-6.6,60.2,-Math.PI/2+.3,'browse',{maxStage:1,role:'worker'});
    const ladder=new T.Group();ladder.position.set(9.3,0,38);ladder.rotation.z=.2;g.add(ladder);for(const x of [-.25,.25])box(ladder,x,2,0,.06,4,.06,mats.wood);for(let y=.4;y<4;y+=.45)box(ladder,0,y,0,.5,.05,.05,mats.wood);
    this.addWorker(8.9,38.6,Math.PI,'repair',{maxStage:1,y:1.2,role:'worker'});this.addWorker(8.4,37.2,-Math.PI/2+.5,'clipboard',{maxStage:1,role:'engineer'});
    const r1=this.addWorker(-40.6,36.3,.8,'argue',{maxStage:1,role:'resident'});const r2=this.addWorker(-39.7,37.3,-2.4,'argue',{maxStage:1,role:'worker'});this.workers[r1].partner=r2;this.workers[r2].partner=r1;
    // Terra's pneumatic parcel line: a copper tube along the west fronts, receivers at
    // each block and a branch feeding the street mail post. Capsules fire along it.
    { const x=-13.1,y=6.3;pipe(g,[[x,y,62],[x,y,-40]],.13,mats.copper);for(let z=60;z>-40;z-=4)box(g,x-.25,y,z,.5,.08,.08,mats.iron);
      for(const z of [44,18,-6,-30]){box(g,x,y,z,.5,.6,.9,mats.brass);pressureRing(g,x+.26,y,z,.22,mats.iron,Math.PI/2);}
      pipe(g,[[x,y,55],[-7.3,y,55],[-7.3,2.1,55]],.09,mats.copper);
      for(let i=0;i<3;i++){const cap=new T.Group();cyl(cap,0,0,0,.11,.42,mats.brass).rotation.x=Math.PI/2;for(const dz of [-.21,.21])sphere(cap,0,0,dz,.11,mats.brass);bake(cap);this.root.add(cap);this.capsules.push(cap);} }
    // Lamp-moths: small warm-winged creatures that gather at the lanterns after dark.
    this.moths=new T.InstancedMesh(new T.PlaneGeometry(.11,.07),new T.MeshBasicMaterial({color:'#ffe6a6',side:T.DoubleSide}),36);this.moths.frustumCulled=false;this.root.add(this.moths);
    // Swifts circling the clock: one instanced draw.
    const wing=new T.BufferGeometry();wing.setAttribute('position',new T.Float32BufferAttribute([-.35,0,.1,0,0,-.12,0,.05,.1,0,.05,.1,0,0,-.12,.35,0,.1],3));wing.computeVertexNormals();
    this.birds=new T.InstancedMesh(wing,new T.MeshBasicMaterial({color:'#262a44',side:T.DoubleSide}),14);this.birds.frustumCulled=false;this.root.add(this.birds);
    bake(g);
  }
  /** The everyday layer: meters, vents, wires and posters. Nothing monumental. */
  everyday(){const g=this.section();
    this.city.housingFrontages.forEach((h,i)=>{const home=new T.Group();home.position.set(h.x,0,h.z);home.rotation.y=h.yaw;g.add(home);const w=h.width;
      meterBox(home,-w*.44,1.5,.2);box(home,w*.42,.5,.12,.9,.5,.1,mats.iron);for(let k=0;k<4;k++)box(home,w*.42,.32+k*.12,.18,.8,.04,.04,mats.copper);
      if(i%3===0)poster(home,-w*.2,1.9,.07,i,0,(i%2?.04:-.03));
      this.city.localCollider(home,-2.2,.45,1.5,.7,1);});
    // Span wires and laundry across the housing lane, anchored to houses and workshop walls.
    for(const z of [45,33,19,9,-11,-21]){const a=V(-42.9,8.2+(z%3)*.3,z),b=V(-24.6,7.6,z+1.2);const curve=cable(g,a,b,.9);
      if(z%2){for(let k=1;k<5;k++){const p=curve.getPoint(k/5);const cloth=new T.Mesh(new T.PlaneGeometry(.7,1),[mats.cream,artMats.wine,mats.teal,artMats.ochre][k%4]);cloth.position.set(p.x,p.y-.55,p.z);cloth.rotation.y=Math.PI/2+(k%2?.1:-.1);g.add(cloth);}}}
    // Trolley wires above the rails, hung from span wires between the lamp standards.
    for(const x of [-2.15,2.15])box(g,x,6.2,10,.03,.03,128,mats.iron);
    for(let z=57;z>=-38;z-=19){cable(g,V(-9.8,6.5,z),V(9.8,6.5,z),.28);for(const x of [-2.15,2.15])box(g,x,6.28,z,.05,.18,.05,mats.brass);}
    // Posters on civic masonry: bridge piers and regulator towers.
    for(const [x,z,yaw] of [[-12.6,7.32,0],[12.6,3.88,Math.PI],[-11.9,30.51,0],[11.9,27.49,Math.PI],[-12.6,3.88,Math.PI]] as const)poster(g,x,2.2,z,Math.abs(Math.round(x+z)),yaw);
    bake(g);
  }
  /** Dishonored density: wrought iron, painted slogans, clutter pockets, sun shafts. */
  density(){const g=this.section();
    const sloganAtlas=new Atlas(map=>new T.MeshBasicMaterial({map,transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}),2048),painted=new Map<string,Placed<T.MeshBasicMaterial>>();
    const slogan=(text:string,color:string,w:number,h:number)=>{const done=painted.get(text);if(done)return done;const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const x=c.getContext('2d')!;x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';
      const lines=text.split('/');const fs=Math.min(c.height/lines.length*.78,120);x.font=`900 ${fs}px "Marker Felt","Chalkduster",fantasy`;lines.forEach((l,i)=>{x.save();x.translate(256,(i+.5)*c.height/lines.length);x.rotate(-.04+i*.03);x.fillText(l,0,0,480);x.restore();});
      for(let i=0;i<8;i++){x.fillRect(80+Math.random()*350,c.height*.55+Math.random()*c.height*.4,3,10+Math.random()*30);}
      const placed=sloganAtlas.add(c);painted.set(text,placed);return placed;};
    const slogans=[['WHO OWNS/THE STEAM?','#e9e1cf'],['NO EMBER IS/TOO SMALL','#d8b86a'],['KEEP THE/LAMPS BURNING','#e9e1cf'],['PAY WHAT/YOU OWE','#c25a45'],['FINCH/LIES','#e9e1cf']];
    this.city.housingFrontages.forEach((h,i)=>{const f=new T.Group();f.position.set(h.x,0,h.z);f.rotation.y=h.yaw;g.add(f);const w=h.width;
      {const [t,c]=slogans[i%slogans.length];const sl=slogan(t,c,4.2,1.35),m=new T.Mesh(place(new T.PlaneGeometry(4.2,1.35),sl.rect),sl.material);m.position.set((i%3-1)*1.2,7.35,.32);f.add(m);}
      // Wrought-iron balconies on corbels: scroll balusters and a curled bracket either side.
      for(const [bx,by] of (i%2?[[-w*.29,7.6]]:[[w*.29,7.6],[-w*.29,11.1]]) as [number,number][]){if(by>h.height-2.5)continue;box(f,bx,by,.55,2.3,.1,1,mats.stone);
        for(let k=0;k<=8;k++){const px=bx-1.1+k*.275;box(f,px,by+.5,1.02,.03,.9,.03,mats.iron);if(k%2){const s=torus(f,px+.13,by+.72,1.02,.11,.018,mats.iron);s.rotation.y=0;}}
        box(f,bx,by+.98,1.02,2.3,.06,.06,mats.iron);for(const side of [-1,1]){box(f,bx+side*1.15,by+.5,.55,.03,.9,.95,mats.iron);const sc=torus(f,bx+side*.9,by-.35,.35,.28,.03,mats.iron);sc.rotation.y=Math.PI/2;}}});
    // Clutter pockets hug the walls: crates, sacks, a broken chair, a barrow. Never in the lanes.
    const pocket=(x:number,z:number,yaw:number,k:number)=>{const p=new T.Group();p.position.set(x,0,z);p.rotation.y=yaw;g.add(p);crate(p,0,0,0,.8);crate(p,.05,.8,.05,.55);crate(p,.95,0,.2,.6);
      for(let i=0;i<3;i++){const sk=sphere(p,-.8+i*.3,.3,.4+(i%2)*.2,1,mats.cream);sk.scale.set(.32,.28,.26);}
      if(k%2){box(p,1.8,.45,.2,.5,.06,.5,mats.wood);box(p,1.6,.7,.2,.06,.5,.5,mats.wood);box(p,1.95,.22,.2,.05,.45,.05,mats.wood);}
      else{box(p,1.9,.5,0,.9,.25,1.3,mats.wood);torus(p,1.9,.3,.7,.3,.05,mats.iron).rotation.y=Math.PI/2;beam(p,V(1.9,.55,-.6),V(1.9,.9,-1.4),.03,mats.wood);}
      this.city.localCollider(p,.8,.2,3.2,1.6,1.6);};
    [[-41.6,41,Math.PI/2],[-41.6,-2,Math.PI/2],[-41.6,-26,Math.PI/2],[-26.4,35,-Math.PI/2],[-26.4,-12,-Math.PI/2],[26.2,20,Math.PI/2],[26.2,47,Math.PI/2]].forEach(([x,z,y],k)=>pocket(x,z,y,k));
    // Sun shafts through the haze where cross streets cut the canyon.
    const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext('2d')!;const gr=x.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(255,236,190,0)');gr.addColorStop(.25,'rgba(255,236,190,.55)');gr.addColorStop(1,'rgba(255,236,190,0)');x.fillStyle=gr;x.fillRect(0,0,64,256);
    const hx=x.createLinearGradient(0,0,64,0);hx.addColorStop(0,'rgba(0,0,0,1)');hx.addColorStop(.5,'rgba(0,0,0,0)');hx.addColorStop(1,'rgba(0,0,0,1)');x.globalCompositeOperation='destination-out';x.fillStyle=hx;x.fillRect(0,0,64,256);
    this.shaftMat=new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,opacity:.5,fog:false});
    // Shafts belong to the middle distance: they fade out near the eye instead of washing the frame.
    this.shaftMat.onBeforeCompile=sh=>{sh.vertexShader='varying float vEyeDist;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvEyeDist=-mvPosition.z;');
      sh.fragmentShader='varying float vEyeDist;\n'+sh.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=smoothstep(7.,20.,vEyeDist)*(1.-smoothstep(70.,110.,vEyeDist));\n#include <opaque_fragment>').replace('vec4( outgoingLight, diffuseColor.a )','vec4( outgoingLight*diffuseColor.a, diffuseColor.a )');};
    this.shaftMat.customProgramCacheKey=()=> 'terra-shaft-fade';
    const shafts=new T.Group();this.root.add(shafts);this.shafts=shafts;
    const toSun=V(-34,29,-46).normalize(),q=new T.Quaternion().setFromUnitVectors(V(0,1,0),toSun);
    for(const [sx,sz] of [[5,50],[6.5,30],[4,6],[7,-12],[-30.5,34],[-30,6],[37,30]])for(let k=0;k<3;k++)for(const twist of [0,Math.PI/2]){const m=new T.Mesh(new T.PlaneGeometry(2.6+k*1.3,34),this.shaftMat);
      m.quaternion.copy(q).multiply(new T.Quaternion().setFromAxisAngle(V(0,1,0),twist+k*.4));m.position.set(sx+k*1.7,0,sz+k*1.3).addScaledVector(toSun,15);shafts.add(m);}
    // One material, never moved: one draw instead of forty-two planes drawn twice each.
    this.shaftMat.forceSinglePass=true;unlit(shafts);
    bake(g);
  }
  /** Arkane-level detail density: eave dentils and gutters, iron hanging signs, a web of
   * upper-storey cables, and instanced debris at the foot of every wall. */
  ornament(){const g=this.section();const r=seeded(4242);
    this.city.housingFrontages.forEach((h,i)=>{const f=new T.Group();f.position.set(h.x,0,h.z);f.rotation.y=h.yaw;g.add(f);const w=h.width,top=h.height;
      box(f,0,top-.5,.36,w+.2,.4,.62,mats.stone);box(f,0,top-.22,.44,w+.4,.14,.78,mats.warmStone);for(let x=-w/2+.35;x<w/2;x+=.62)box(f,x,top-.9,.3,.28,.4,.44,mats.stone);
      box(f,0,top+.02,.42,w+.4,.14,.26,mats.copper);cyl(f,w/2-.25,top/2,.45,.07,top,mats.copper);for(let y=1.5;y<top;y+=2.4)box(f,w/2-.25,y,.4,.2,.06,.14,mats.iron);
      for(let y=4.2;y<top-2;y+=3.5)box(f,0,y,.12,w,.14,.2,mats.stone);
      if(i%3!==1){const sx=-w*.44,sy=3.6;box(f,sx,sy+.45,.7,.06,.06,1.3,mats.iron);const sc=torus(f,sx,sy+.1,.45,.28,.03,mats.iron);sc.rotation.y=Math.PI/2;
        for(const dz of [.3,1.1])cyl(f,sx,sy+.25,dz,.012,.4,mats.iron);const board=box(f,sx,sy-.25,.72,.06,.7,.95,[mats.teal,artMats.wine,artMats.ochre][i%3]);void board;box(f,sx,sy-.25,.72,.08,.76,1.01,mats.iron).scale.x=.5;}});
    // Cable web across the main street at the upper storeys.
    for(let z=58;z>-26;z-=7){const y1=9+((z*7)%5+5)%5,y2=10+((z*3)%4+4)%4;cable(g,V(-12.3,y1,z),V(12.3,y2,z-3.5),.7);if(z%14===2)cable(g,V(-12.3,y2+1,z-2),V(12.3,y1+1.5,z+1.5),.9);}
    bake(g);
    // Debris: paper, bottles and broken setts, three instanced draws for the whole ward.
    const spots:[number,number][]=[];for(let z=66;z>-40;z-=.9){for(const x of [-11.6,11.6])if(r()<.5)spots.push([x+(x<0?1:-1)*r()*.9,z+r()*.6]);}
    for(let z=58;z>-30;z-=1.2)for(const x of [-42.2,-26.6])if(r()<.4)spots.push([x+(x<-30?1:-1)*r()*.8,z]);
    const make=(geo:T.BufferGeometry,mat:T.Material,n:number,sc:number,y:number)=>{const im=new T.InstancedMesh(geo,mat,n);const m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler();for(let i=0;i<n;i++){const [x,z]=spots[Math.floor(r()*spots.length)];e.set(r()*.3,r()*6.3,r()*.3);q.setFromEuler(e);m.compose(V(x,y+this.city.groundHeight(x,z)-.18,z),q,V(sc*(.6+r()*.8),sc,sc*(.6+r()*.8)));im.setMatrixAt(i,m);}im.receiveShadow=true;this.root.add(im);};
    make(new T.BoxGeometry(.26,.005,.2),artMats.paper,90,1,.2);make(new T.CylinderGeometry(.035,.04,.22,6),mats.teal,40,1,.29);make(new T.DodecahedronGeometry(.09,0),mats.stone,120,1,.22);
  }
  /** Per-building carved ornament. Each house draws its own combination of window hood,
   * door surround, corner treatment, crown and an engraved datestone. */
  carving(){const g=this.section();const S=mats.warmStone,D=mats.stone;
    const names=['ANNO 1841','GUILD OF MASONS · 1867','R · & · S · 1852','FINCH HOUSE · 1873','THE LOWWORKS · 1839','HALL OF PRESSURE · 1880','ANNO 1858','CIVIC TRUST · 1891'];
    this.city.housingFrontages.forEach((h,i)=>{const f=new T.Group();f.position.set(h.x,0,h.z);f.rotation.y=h.yaw;g.add(f);const w=h.width,top=h.height,r=seeded(900+i*37);
      const hoodKind=Math.floor(r()*4),doorKind=Math.floor(r()*4),cornerKind=Math.floor(r()*2),crownKind=Math.floor(r()*4);
      const fam=h.family,cols=fam===0?[-w*.29,0,w*.29]:fam===1?[-w*.30,-w*.10,w*.10,w*.30]:[-w*.28,0,w*.28],ww=fam===1?1.1:fam===0?1.45:1.7,hh=fam===0?1.9:2.3;
      for(let y=4.5,row=0;y<top-1.7;y+=3.5,row++)for(const x of cols){const ty=y+hh+.12,rich=row===0;
        if(hoodKind===0){const sh=new T.Shape();sh.moveTo(-ww/2-.45,0);sh.lineTo(ww/2+.45,0);sh.lineTo(0,rich?.95:.7);sh.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.38,bevelEnabled:false}),S);m.position.set(x,ty+.1,.05);f.add(m);box(f,x,ty+.05,.24,ww+1,.2,.46,D);for(const d of [-1,1])box(f,x+d*(ww/2+.3),ty-.35,.22,.24,.6,.4,D);}
        if(hoodKind===1){const a=new T.Mesh(new T.TorusGeometry(ww/2+.26,.18,5,14,Math.PI),S);a.position.set(x,ty-.1,.18);a.scale.y=.6;f.add(a);box(f,x,ty+.45,.24,.46,.56,.34,D);}
        if(hoodKind===2){box(f,x,ty+.12,.3,ww+.9,.26,.56,S);box(f,x,ty+.3,.26,ww+1.1,.1,.62,D);for(const d of [-1,1])box(f,x+d*(ww/2+.2),ty-.28,.24,.24,.66,.44,D);if(rich)box(f,x,ty+.48,.22,ww*.55,.34,.2,S);}
        if(hoodKind===3){const k=box(f,x,ty,.2,.52,.72,.36,S);k.scale.x=.9;box(f,x,ty-.2,.16,ww+.5,.16,.3,D);if(rich){const face=sphere(f,x,ty+.05,.4,.2,D);face.scale.set(.2,.24,.1);}}}
      const dx=0,dt=3.3;
      if(doorKind===0){for(const d of [-1,1]){cyl(f,dx+d*1.45,1.65,.42,.26,3.3,S);box(f,dx+d*1.45,.15,.42,.66,.3,.66,D);box(f,dx+d*1.45,3.38,.42,.7,.22,.7,D);}const sh=new T.Shape();sh.moveTo(-1.8,0);sh.lineTo(1.8,0);sh.lineTo(0,.8);sh.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.6,bevelEnabled:false}),S);m.position.set(dx,dt+.12,.05);f.add(m);}
      if(doorKind===1){const a=new T.Mesh(new T.TorusGeometry(1.4,.26,6,16,Math.PI),S);a.position.set(dx,2.35,.26);f.add(a);for(let k=-3;k<=3;k++){const v=box(f,dx+Math.sin(k*.42)*1.4,2.35+Math.cos(k*.42)*1.4,.34,k?.3:.46,k?.46:.7,.3,D);v.rotation.z=-k*.42;}}
      if(doorKind===2){box(f,dx,dt+.2,.75,3.2,.12,1.3,mats.iron);for(const d of [-1,1]){const b=beam(f,V(dx+d*1.4,dt-.8,.05),V(dx+d*1.4,dt+.15,1.3),.04,mats.iron);void b;const sc=torus(f,dx+d*1.4,dt-.35,.45,.3,.025,mats.iron);sc.rotation.y=Math.PI/2;}}
      if(doorKind===3){for(let y=.3;y<3.2;y+=.55)for(const d of [-1,1])box(f,dx+d*(1.3+(Math.round(y/.55)%2)*.15),y+.2,.14,.5+(Math.round(y/.55)%2)*.3,.42,.2,S);box(f,dx,3.35,.18,2.9,.5,.24,S);}
      if(cornerKind===0)for(const d of [-1,1])for(let y=.4,k=0;y<top-.6;y+=.7,k++)box(f,d*(w/2-.42-(k%2)*.2),y+.33,.14,.85+(k%2)*.4,.6,.24,S);
      else for(const d of [-1,1]){box(f,d*(w/2-.45),top/2+1.8,.14,.55,top-3.6,.16,D);box(f,d*(w/2-.45),top-1.4,.2,.8,.3,.26,S);for(const yy of [top-1.15,top-1.0])box(f,d*(w/2-.45),yy,.22,.7-(yy-top+1.15)*1.5,.08,.26,S);}
      if(crownKind===0){box(f,0,top+.12,.1,w,.2,.5,S);for(let x=-w/2+.4;x<w/2-.2;x+=.42){cyl(f,x,top+.55,.2,.1,.6,S);}box(f,0,top+.9,.2,w,.14,.4,S);}
      if(crownKind===1){const sh=new T.Shape();sh.moveTo(-w*.3,0);sh.lineTo(w*.3,0);sh.lineTo(0,1.8);sh.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.5,bevelEnabled:false}),S);m.position.set(0,top+.05,-.3);f.add(m);const o=torus(f,0,top+.75,.24,.36,.08,D);void o;const gl=cyl(f,0,top+.75,.2,.3,.05,windowGlass[0]);gl.rotation.x=Math.PI/2;}
      if(crownKind===2)for(let k=0;k<5;k++){const x=-w*.36+k*w*.18;box(f,x,top+.4+(k%2)*.3,.12,w*.16,.8+(k%2)*.6,.3,S);}
      if(crownKind===3){box(f,0,top+1.1,-.1,3.2,2.2,.7,S);const c=cyl(f,0,top+1.15,.28,.8,.08,mats.cream);c.rotation.x=Math.PI/2;torus(f,0,top+1.15,.33,.8,.07,mats.brass);box(f,0,top+1.3,.36,.05,.55,.03,mats.iron);const cap=new T.Mesh(new T.ConeGeometry(1.9,.9,4),mats.roof);cap.rotation.y=Math.PI/4;cap.scale.z=.35;cap.position.set(0,top+2.65,-.1);f.add(cap);}
      // Engraved datestone: unique text per building.
      const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d')!;x.fillStyle='#d6c29c';x.fillRect(0,0,512,160);x.strokeStyle='#5a4a38';x.lineWidth=6;x.strokeRect(10,10,492,140);
      x.font='700 44px Georgia';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff6df';x.fillText(names[i%names.length],258,82,470);x.fillStyle='#4a3a2a';x.fillText(names[i%names.length],256,80,470);
      const pl=plaqueAtlas.add(c),plaque=new T.Mesh(place(new T.PlaneGeometry(2.4,.75),pl.rect),pl.material);plaque.position.set(0,dt+(doorKind===0?1.2:.6),.36);f.add(plaque);});
    bake(g);
  }
  /** Hand-built vignettes: each trade spills its own goods onto the pavement. */
  vignettes(){const g=this.section();const C=this.city;
    const at=(p:{x:number;z:number;rotation:number},lx:number,lz:number)=>{const c=Math.cos(p.rotation),s2=Math.sin(p.rotation);return [p.x+lx*c+lz*s2,p.z-lx*s2+lz*c] as [number,number];};
    const byId=(id:string)=>PROPERTIES.find(p=>p.id===id)!;
    // Copper Finch: two pavement tables with chairs, bottles and a lantern on the sill.
    for(const lx of [-3.1,-8.4]){const [x,z]=at(byId('tavern'),lx,8.6);cafeTable(g,x,z,lx);C.collider(x,z,1.8,1.8,1);}
    // Rook & Son: a salvage workbench, labelled crates and a stack of recovered pipe by the yard gate.
    {const p=byId('scrap');let [x,z]=at(p,7.6,8.3);workbench(g,x,z,p.rotation+Math.PI);C.collider(x,z,1.2,2.2,2);
      [x,z]=at(p,-7.9,8.6);labeledCrate(g,x,0,z,.8,'VEYR/IRON',.2);labeledCrate(g,x+.1,.8,z+.05,.6,'SALVAGE',-.3,'#9a7a52');labeledCrate(g,x,0,z+.95,.7,'FRAGILE/GLASS',.1,'#c19a66');C.collider(x,z+.4,1.2,2,1.6);
      [x,z]=at(p,-2.6,9.4);pipeStack(g,x,z,p.rotation);C.collider(x,z,2.6,1.2,1);}
    // Cinder & Iron: an anvil and ironmongery beside the furnace bay; a cast-iron stove for sale.
    {const p=byId('foundry');let [x,z]=at(p,-8,8.4);anvil(g,x,z);stencilBarrel(g,x+.2,z+1,'QUENCH');C.collider(x,z+.5,1,2,1.2);
      [x,z]=at(p,1.6,8.8);stove(g,x,z,p.rotation);C.collider(x,z,1.2,1.2,2.8);}
    // Finch Mechanical: crates of instruments waiting for the lift.
    {const p=byId('workshop');const [x,z]=at(p,-8,8.6);labeledCrate(g,x,0,z,.7,'FINCH/PRECISION',.1,'#c8a878');labeledCrate(g,x+.05,.7,z,.55,'THIS WAY/UP',-.2);stencilBarrel(g,x+.9,z,'OIL');C.collider(x+.4,z,2,1.2,1.4);}
    // Bellweather Exchange: sealed trade crates from Orison and the Amber Coast.
    {const p=byId('market');const [x,z]=at(p,7.9,8.6);labeledCrate(g,x,0,z,.85,'ORISON/SALT',.1);labeledCrate(g,x,.85,z,.65,'AMBER/COAST TEA',-.2,'#c9a26a');labeledCrate(g,x+.95,0,z+.1,.7,'CUSTOMS/SEALED',.3,'#a67f55');C.collider(x+.4,z,2,1.4,1.6);}
    // Housing lane: a stove on a Lowworks stoop, a neighbour's workbench.
    stove(g,-41.7,15.3,Math.PI/2);C.collider(-41.7,15.3,1,1,2.8);workbench(g,-27,-3,-Math.PI/2);C.collider(-27,-3,1,2.2,2);
    bake(g);
  }
  setShafts(v:number){if(this.shaftMat)this.shaftMat.opacity=v*.5;if(this.shafts)this.shafts.visible=v>.02;}
  /** Thief nights: warm pools under every lamp and a wall lantern by each door.
   * Additive painted gradients, so darkness stays dark between them. */
  nightLights(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;const gr=x.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0,'rgba(255,196,110,.95)');gr.addColorStop(.35,'rgba(255,170,80,.45)');gr.addColorStop(1,'rgba(255,150,60,0)');x.fillStyle=gr;x.fillRect(0,0,128,128);
    const tex=new T.CanvasTexture(c);this.poolMat=new T.MeshBasicMaterial({map:tex,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0,fog:false});
    const pools=new T.Group();this.root.add(pools);this.pools=pools;
    const pool=(x:number,y:number,z:number,r:number,yaw?:number)=>{const m=new T.Mesh(new T.PlaneGeometry(r*2,r*2),this.poolMat);m.position.set(x,y,z);if(yaw===undefined)m.rotation.x=-Math.PI/2;else m.rotation.y=yaw;pools.add(m);};
    for(let z=57;z>=-56;z-=19)for(const lx of [-9.8,9.8]){pool(lx,.16+this.city.groundHeight(lx,z)-.18,z,4.2);pool(lx,4.95,z,1.6,lx<0?Math.PI/2:-Math.PI/2);}
    // Housing lanes: a sconce at every door, its pool on the cobbles and a halo on the wall.
    for(const h of this.city.housingFrontages){const f=new T.Group();f.position.set(h.x,0,h.z);f.rotation.y=h.yaw;pools.add(f);
      const sc=box(f,1.8,2.9,.25,.26,.4,.26,mats.glow);void sc;box(f,1.8,3.18,.25,.34,.08,.34,mats.iron);
      const halo=new T.Mesh(new T.PlaneGeometry(3.4,3.4),this.poolMat);halo.position.set(1.8,2.9,.1);f.add(halo);
      const floor=new T.Mesh(new T.PlaneGeometry(6,6),this.poolMat);floor.rotation.x=-Math.PI/2;floor.position.set(1.8,.2,1.8);f.add(floor);}
    this.poolMat!.forceSinglePass=true;unlit(pools);
  }
  setNight(v:number){for(const s of this.sites)s.setNight(v);const n=Math.max(0,Math.min(1,(v-.35)/.4));if(this.poolMat)this.poolMat.opacity=n;if(this.pools)this.pools.visible=n>0;}
  animateSet(dt:number,time:number,calm:boolean){void dt;
    const m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),p=new T.Vector3(),sc=new T.Vector3(1,1,1);
    for(let i=0;i<14;i++){const a=time*(.22+(i%3)*.03)+i*.45,r=9+(i%4)*2.2;p.set(Math.sin(a)*r,36+Math.sin(time*.7+i)*2.5+(i%5),-46+Math.cos(a)*r);e.set(0,a+Math.PI/2,calm?0:Math.sin(time*9+i)*.5);q.setFromEuler(e);sc.setScalar(1.4);m.compose(p,q,sc);this.birds.setMatrixAt(i,m);}
    this.birds.instanceMatrix.needsUpdate=true;
    const lift=(Math.sin(time*.35)+1)/2;this.hoistCrate.position.set(-24.7,1+lift*4.6,36);
    this.craneJib.rotation.y=Math.sin(time*.12)*.9;
    const pusher=this.workers[this.cartPusher].person.group;this.ingotCart.position.set(36.4,.1,pusher.position.z+Math.cos(pusher.rotation.y)*1.35);
    this.capsules.forEach((cap,i)=>{const u=((time+i*3.7)%11)/11,run=Math.min(1,u*1.6);cap.visible=u<.62;cap.position.set(-13.1,6.3,62-run*102);});
    const day=this.city.economy.state.day,night=day<.23||day>.79;this.moths.visible=night;
    if(night){let n=0;for(let z=57;z>=-56;z-=19)for(const lx of [-9.8,9.8])for(let k=0;k<3&&n<36;k++,n++){const a=time*(2.2+k*.7)+n*1.9,r=.35+.15*Math.sin(time*1.3+n);p.set(lx+Math.cos(a)*r,4.95+Math.sin(time*3+n)*.25,z+Math.sin(a)*r);e.set(0,a,Math.sin(time*18+n)*.8);q.setFromEuler(e);sc.setScalar(1);m.compose(p,q,sc);this.moths.setMatrixAt(n,m);}this.moths.instanceMatrix.needsUpdate=true;}
    this.skyCanal.update(dt,time,reducedMotion(this.city.economy.state.settings.reducedMotion));
  }
  addWorker(x:number,z:number,yaw:number,kind:Activity,o:{y?:number;role?:Archetype;minStage?:number;maxStage?:number;time?:'any'|'day'|'night';scale?:number;partner?:number;path?:[number,number,number];tool?:string;when?:()=>boolean}={}) {
    const role=o.role??(kind==='gauge'||kind==='valve'||kind==='clipboard'?'engineer':kind==='browse'||(z<0&&kind==='read')?'merchant':kind==='read'||kind==='watch'||kind==='lean'?'resident':'worker');
    const person=citizen(mats.rust,this.workers.length+43,role);const y=o.y!==undefined?o.y+.18:this.city.groundHeight(x,z);person.group.position.set(x,y,z);person.group.rotation.y=yaw;if(o.scale)person.group.scale.multiplyScalar(o.scale);this.root.add(person.group);
    // Held things sit in the right hand's grip socket, authored grip-first: the handle runs through
    // the fist along z and the rest hangs off it (figure-construction: arms-hands). Crates are
    // carried against the body between both palms.
    const tool=new T.Group();person.grips[0].add(tool);const t=o.tool??kind,inward=.03;
    if(t==='hammer'){cyl(tool,0,0,.1,.021,.36,mats.wood).rotation.x=Math.PI/2;box(tool,0,0,.29,.08,.2,.08,mats.iron);}
    if(t==='sweep'){const broom=new T.Group();broom.rotation.x=1.1;tool.add(broom);cyl(broom,0,0,.36,.02,1.3,mats.wood).rotation.x=Math.PI/2;box(broom,0,0,1.02,.4,.08,.13,mats.wood);box(broom,0,-.08,1.02,.42,.1,.1,mats.cream);}
    if(t==='read'){const sheet=box(tool,inward+.13,-.03,.02,.26,.2,.012,artMats.paper);sheet.rotation.x=.9;}
    if(t==='clipboard'){box(tool,inward+.11,.03,.03,.24,.32,.02,mats.wood);box(tool,inward+.11,.03,.042,.2,.26,.006,artMats.paper);box(tool,inward+.11,.17,.045,.07,.03,.02,mats.brass);}
    if(t==='repair'){box(tool,0,0,.09,.028,.028,.28,mats.iron);torus(tool,0,0,.25,.045,.016,mats.iron);}
    if(t==='eat'){const bun=sphere(tool,inward*.3,0,.05,1,artMats.ochre);bun.scale.set(.05,.045,.07);}
    if(t==='mug'){cyl(tool,inward+.035,.01,.01,.042,.11,mats.copper);torus(tool,inward*.3,.01,.01,.028,.009,mats.copper).rotation.x=Math.PI/2;}
    if(t==='basket'){torus(tool,0,-.02,0,.1,.011,mats.wood).rotation.y=Math.PI/2;cyl(tool,0,-.2,0,.13,.16,mats.wood);sphere(tool,0,-.12,0,.07,mats.red);}
    if(t==='carry'){const cargo=new T.Group();cargo.position.set(0,1.05,.31);person.body.add(cargo);box(cargo,0,0,0,.43,.32,.33,mats.wood);for(const y of [-.11,.11])box(cargo,0,y,.175,.45,.035,.02,mats.cream);asProp(cargo);bake(cargo);}
    asProp(tool);bake(tool);const path=o.path?{a:V(x,y,z),b:V(o.path[0],y,o.path[1]),speed:o.path[2]}:undefined;
    this.workers.push({person,kind,tool,minStage:o.minStage??0,maxStage:o.maxStage??5,time:o.time??'any',partner:o.partner,path,y,when:o.when});return this.workers.length-1;
  }
  sync(){
    const e=this.city.economy;const levels=PROPERTIES.map(p=>this.city.properties.get(p.id)!.level);const key=[...levels,...Object.values(e.state.infrastructure),...Object.values(e.state.sites),e.stage,...e.state.research,...e.state.districts].join(':');if(key===this.signature)return;this.signature=key;
    const businesses=Object.fromEntries(PROPERTIES.map((p,i)=>[p.id,levels[i]])) as Record<typeof PROPERTIES[number]['id'],number>;
    for(const s of this.sites)s.sync({control:e.state.sites[s.id],stage:e.stage,levels:businesses,sites:{...e.state.sites}});this.weatherside.sync();this.roofwalk.sync(e.state.research);this.canalWard.sync();this.hangway.sync(e.state.research);
    this.worn.visible=e.state.infrastructure.roads===0;
    this.city.disposeGroup(this.restored);this.city.disposeGroup(this.market);const g=this.restored;const rich=e.stage>=3;const soot=this.soot;const marketLevel=levels[5];
    // Repairs have literal mechanical consequences unique to every property.
    PROPERTIES.forEach((p,i)=>{const level=levels[i];if(!level)return;const a=new T.Group();a.position.set(p.x,.18,p.z);a.rotation.y=p.rotation;g.add(a);

      if(i===0){for(let n=0;n<level;n++)crate(a,-7+n*.75,0,8,.6);if(level>=2){box(a,-4,2.7,7,3,.12,1.3,mats.brass);for(let n=0;n<5;n++)cyl(a,-5+n*.5,2.8,7,.12,.25,mats.iron).rotation.z=Math.PI/2;}}
      if(i===1){gauge(a,-3.4,16.3,2.05,1.1,String(20+level*16));for(const x of [-5,5])pipe(a,[[x,1,6],[x,7,6],[x/2,7,6],[x/2,11,6]],.11,level>=4?mats.brass:mats.copper);}
      if(i===2){for(let n=0;n<Math.min(level,3);n++){cyl(a,-6+n*1.1,1.1,7,.32,1.5,mats.brass);sphere(a,-6+n*1.1,1.9,7,.26,level>=4?mats.aether:mats.copper);}}
      if(i===3){for(let n=0;n<Math.min(level,3);n++){arch(a,-6+n*1.8,.5,5.9,1.1,1.9,artMats.furnace);for(const dx of [-.35,0,.35])box(a,-6+n*1.8+dx,1.3,6,.06,1.5,.1,mats.iron);}}
      if(i===4){if(level>=3){railing(a,0,12.5,6,10);for(const x of [-4,4])cyl(a,x,13,5.4,.4,.1,mats.wood);}}
    });
    // Street trees follow prosperity: bare wells, young leaves, then Grand Terra's blossom.
    for(const [x,z] of this.verges){if(e.stage<2&&!e.state.infrastructure.gardens)bareTree(g,x,z,.9);else{tree(g,x,z,.62+e.stage*.05);if(e.stage>=4)for(const [dx,dy,dz] of [[.3,3.6,.2],[-.4,3.2,-.3],[.1,2.9,.5]])sphere(g,x+dx,dy,z+dz,.45,blossom);}}
    // Lamps: every other lantern is dead in the Lowworks; crest banners arrive with trade.
    for(let z=57,n=0;z>=-56;z-=19,n++)for(const x of [-9.8,9.8]){
      if(e.stage<2&&(n+(x>0?1:0))%2===0&&!e.state.infrastructure.lamps){box(g,x,4.95,z,.46,.66,.46,mats.dark);box(g,x,4.95,z,.47,.1,.47,mats.rust);}
      if(e.stage>=3){const d=x<0?1:-1;box(g,x+d*.5,4.45,z,.9,.05,.05,mats.brass);box(g,x+d*.5,3.75,z,.04,1.35,.62,mats.teal);box(g,x+d*.5,3.0,z,.045,.14,.64,mats.brass);const r=new T.Group();r.position.set(x+d*.53,3.85,z);r.rotation.y=Math.PI/2;g.add(r);pressureRing(r,0,0,0,.17,mats.cream);}}
    // Terrace planters: bare soil and a weed early, clipped trees later, blossom at Grand Terra; a flower cart arrives with trade.
    for(const [px,pz] of this.terracePlanters){if(e.stage<2){cyl(g,px,1.95,pz,.62,.06,artMats.mud);box(g,px+.2,2.1,pz,.05,.3,.05,mats.leaf);}else{tree(g,px,pz,.55+e.stage*.04).position.y=1.9;if(e.stage>=4)for(const [dx,dy] of [[.3,4],[-.3,3.6]])sphere(g,px+dx,dy+.5,pz,.35,blossom);}}
    if(e.stage>=3){const cart=new T.Group();cart.position.set(5.2,1.2,-54.5);cart.rotation.y=-.6;g.add(cart);box(cart,0,.8,0,1.5,.5,.9,mats.wood);for(const x of [-.5,0,.5])for(const [c,dz] of [[mats.red,-.2],[artMats.ochre,.2]] as const)sphere(cart,x,1.15,dz,.17,c);for(const x of [-.6,.6])torus(cart,x,.4,.47,.35,.05,mats.iron);cyl(cart,0,1.8,0,.02,1.4,mats.iron);const shade=new T.Mesh(new T.ConeGeometry(1,.4,8,1,true),fabricOf(mats.teal));shade.position.y=2.55;cart.add(shade);}
    // Doorsteps follow prosperity: a dented bucket, then potted herbs, then Grand Terra's flowers.
    this.city.housingFrontages.forEach((h,i)=>{const d=new T.Group();d.position.set(h.x,0,h.z);d.rotation.y=h.yaw;g.add(d);
      const w=h.width;
      if(e.stage<2){// Tarps over broken rooms, ropes to the sill, and timber shoring against a failing wall.
        for(const [x,y] of i%2?[[-w*.29,8.1]]:[[w*.29,4.6],[0,8.1]]){box(d,x,y+.9,.16,2.3,2.7,.05,this.tarp);for(const dx of [-1,1])box(d,x+dx,y+.9,.2,.03,2.8,.03,mats.wood);}
        if(i%3!==1){const sx=-w*.36;beam(d,V(sx,0,1.5),V(sx,4.4,.15),.1,mats.wood);beam(d,V(sx+.5,0,1.7),V(sx+.5,3.2,.15),.09,mats.wood);box(d,sx+.25,.1,1.6,1.1,.2,.5,mats.wood);}}
      if(e.stage>=4){const c=[mats.red,mats.teal,artMats.ochre][i%3];const aw=box(d,0,3.5,.75,3.2,.1,1.5,c);aw.rotation.x=.28;box(d,0,3.3,1.47,3.2,.26,.05,c);
        for(const x of [-w*.29,w*.29]){box(d,x,7.8,.35,1.7,.3,.45,mats.wood);for(let k=0;k<3;k++)sphere(d,x-.5+k*.5,8.02,.4,.2,k%2?blossom:mats.leaf);}}
      if(e.stage<2){cyl(d,-2,.25,.45,.2,.5,mats.iron);if(i%2)crate(d,-2.7,0,.45,.5);}
      else{for(const x of [-1.8,-2.55]){cyl(d,x,.22,.45,.2,.44,artMats.mud);sphere(d,x,.55,.45,.24,mats.leaf);if(e.stage>=4)sphere(d,x+.08,.72,.5,.13,blossom);}
        if(e.stage>=4){cyl(d,-w2(h.width),3.4,.4,.012,.6,mats.iron);cyl(d,-w2(h.width),3,.4,.22,.2,mats.wood);sphere(d,-w2(h.width),3.18,.4,.2,mats.leaf);}}});
    // Early Terra: soot runs down the fronts, upper rooms are boarded, debris sits at the curb.
    if(e.stage<2)PROPERTIES.forEach((p,i)=>{const a=new T.Group();a.position.set(p.x,.18,p.z);a.rotation.y=p.rotation;g.add(a);const h=businessHeights[i]+businessLift[i];
      for(const x of [-6.8,1.9,i%2?4.6:-2.4])box(a,x,h-2.4,5.6,.9+(i%3)*.3,3.6,.02,soot);
      if(levels[i]<2)for(const x of [[-7.4,-2.7],[-2.6,2.6],[-1.6,1.6],[],[-3.5,2.5],[-3.3,3.3]][i])for(const r of [-.28,.3])box(a,x,5.6+r,5.72,1.5,.2,.07,mats.wood).rotation.z=r;});
    if(e.stage<2){const cart=new T.Group();cart.position.set(-38.8,.35,-21);cart.rotation.set(.1,.6,.32);g.add(cart);box(cart,0,.3,0,1.3,.2,2.1,mats.wood);for(const x of [-.65,.65])box(cart,x,.6,0,.08,.55,2.1,mats.wood);torus(g,-37.9,.42,-20.2,.42,.07,mats.iron).rotation.y=1.2;crate(g,-39.9,0,-22.3,.6);}
    if(e.stage<2){for(const [x,z,r] of [[-6.9,30,.3],[6.8,-9,1.2],[-6.8,-27,2]]){const b=cyl(g,x,.42,z,.42,1.1,mats.wood);b.rotation.set(Math.PI/2,r,0);crate(g,x+.1,0,z+1.1,.6);}}
    if(e.state.infrastructure.lamps>0)for(let z=57;z>=-56;z-=19)for(const x of [-9.8,9.8]){cyl(g,x,2.9,z,.11,.12,mats.brass);cyl(g,x,4.62,z,.12,.08,mats.brass);const glow=new T.Mesh(new T.CircleGeometry(2.3,20),artMats.pool);glow.rotation.x=-Math.PI/2;glow.position.set(x,.15,z);glow.scale.setScalar(.6+e.state.infrastructure.lamps*.25);g.add(glow);}
    if(rich){for(const x of [-8.8,8.8])lampHead(g,x,3.4,67.7,true);crest(g,0,8.35,67.2,.7);}
    if(e.stage>=2)for(const x of [-5.6,5.6]){box(g,x,4,-42.8,1.2,2.3,.04,mats.teal);crest(g,x,4.1,-42.74,.7);}
    this.marketUpgrade(marketLevel,rich);bake(g);
  }
  marketUpgrade(level:number,rich:boolean){const g=this.market;const count=level===0?2:level<3?4:6;
    for(let i=0;i<count;i++){
      const side=i%2?-1:1,x=side*7.9,z=(side>0?-22:-26)-Math.floor(i/2)*6;
      for(const dx of [-.97,.97])for(const dz of [-1.52,1.52])box(g,x+dx,.71,z+dz,.10,1.32,.10,mats.wood);
      box(g,x,1.38,z,2.55,.13,3.9,level?mats.cream:mats.wood);
      box(g,x-side*1.04,.97,z,.045,.73,3.25,i%2?artMats.ochre:artMats.wine);
      box(g,x,.43,z,2.15,.08,3.25,mats.wood);
      canopy(g,x-side*.2,2.85,z,3.6,4.6,(level>0?[mats.red,artMats.ochre,mats.teal,artMats.wine]:[mats.teal,artMats.ochre])[i%(level>0?4:2)]);
      // Each trade has its own silhouette on the counter and hanging from the canopy.
      const top=1.45,cx=x-side*.1;
      for(let j=0;j<6;j++){const gx=cx-.55+(j%3)*.55,gz=z-.9+Math.floor(j/3)*1.2;
        if(i===0){for(let k=0;k<2+j%2;k++)cyl(g,gx,top+.12+k*.25,gz,.1,.22,[mats.teal,mats.red,artMats.ochre][(j+k)%3]);}
        if(i===1){const loaf=sphere(g,gx,top+.1,gz,1,artMats.ochre);loaf.scale.set(.12,.1,.26);}
        if(i===2){const pot=sphere(g,gx,top+.16,gz,1,mats.copper);pot.scale.set(.16,.14,.16);const sp=cyl(g,gx+.15,top+.2,gz,.03,.18,mats.copper);sp.rotation.z=-.9;}
        if(i===3){box(g,gx,top+.06,gz,.45,.12,.5,mats.wood);for(let k=0;k<3;k++)sphere(g,gx-.12+k*.12,top+.18,gz,.08,[mats.red,artMats.ochre,mats.leaf][(j+k)%3]);}
        if(i===4){cyl(g,gx,top+.12,gz,.12,.24,mats.iron);for(let k=0;k<3;k++)sphere(g,gx+(k-1)*.07,top+.36,gz+(k%2)*.05,.08,[mats.red,mats.cream,artMats.wine][(j+k)%3]);}
        if(i===5){const sack=sphere(g,gx,top+.14,gz,1,mats.cream);sack.scale.set(.17,.16,.17);sphere(g,gx,top+.27,gz,.1,[mats.red,artMats.ochre,mats.rust][j%3]);}
      }
      if(level>0)for(let j=0;j<3;j++){const hx=x-side*1.15,hz=z-1.2+j*1.2;cyl(g,hx,2.35,hz,.01,.4,mats.iron);
        if(i%3===0){box(g,hx,1.95,hz,.08,.5,.35,[mats.red,mats.teal,artMats.ochre][j]);}
        else if(i%3===1){sphere(g,hx,2.05,hz,.12,mats.glow);cyl(g,hx,2.2,hz,.08,.05,mats.brass);}
        else{const b=sphere(g,hx,2.0,hz,1,mats.leaf);b.scale.set(.1,.2,.1);}}
      const board=new T.Group();board.position.set(x-side*1.3,2.15,z);board.rotation.y=-side*Math.PI/2;g.add(board);sign(board,['ORISON TEA','VEYR BREAD','COPPER KETTLE','COASTAL FRUIT','FINCH FLOWERS','SEVEN SPICES'][i],'LOCAL TRADERS',0,0,0,1.7,.48);
      // Collision footprints reserve the same market pockets in all stages.
    }
    if(level>=2)for(const z of [-28]){const curve=cable(g,V(-11,7.6,z),V(11,7.6,z),.9);for(let i=1;i<6;i++){const p=curve.getPoint(i/6);cyl(g,p.x,p.y-.15,p.z,.025,.3,mats.iron);sphere(g,p.x,p.y-.38,p.z,.12,mats.glow);}}
    if(rich){for(const x of [-10.5,10.5])for(const z of [-35,-43]){const l=terraceRise(x,z);box(g,x,.4+l,z,1.5,.8,1.2,mats.stone);for(let i=0;i<6;i++)sphere(g,x+(i%3-1)*.4,.9+l,z+Math.floor(i/3)*.3,.2,i%2?mats.leaf:artMats.wine);}}
    bake(g);
  }
  update(dt:number,time:number,viewer:T.Vector3){
    for(const m of this.mechanisms)m.object.rotation[m.axis]=Math.sin(time*m.speed)*.12+(m.axis==='z'&&Math.abs(m.speed)>.2?time*m.speed:0);
    const calm=reducedMotion(this.city.economy.state.settings.reducedMotion);
    const stage=this.city.economy.stage,day=this.city.economy.state.day,night=day<.24||day>.78;
    for(const s of this.sites)s.update(dt,time,viewer,calm);this.weatherside.update(time,viewer,calm);this.hangway.update(viewer);this.roofwalk.update(time,calm);
    // Authored light, not more ambient: the lamp follows the Steward from room to room and is dark in the street.
    { let best:typeof this.interiors[number]|undefined,bd=1e9;for(const r of this.interiors){const d=Math.hypot(viewer.x-r.x,viewer.y-r.y,viewer.z-r.z);if(d<r.reach&&d<bd){bd=d;best=r;}}
      const L=this.interiorLight;if(best){L.position.set(best.x,best.y,best.z);L.color.lerp(this.interiorColor.set(best.color),.2);}L.intensity+=((best?best.power??34:0)-L.intensity)*Math.min(1,dt*5); }this.canalWard.update(time,viewer,calm);
    this.workers.forEach((w,i)=>{const {person,kind}=w;
      // People further off than a long street are a few pixels: they are neither posed nor drawn.
      const on=stage>=w.minStage&&stage<=w.maxStage&&(w.time==='any'||(w.time==='night')===night)&&(w.when?.()??true)&&Math.hypot(person.group.position.x-viewer.x,person.group.position.z-viewer.z)<90;person.group.visible=on;if(!on)return;
      person.worn.visible=stage<3;person.finery.visible=stage>=3;
      let moving=false;const position=person.group.position;
      // Out, turn, back, turn: the walk eases in and out of each leg, and the turn is a turn, not a flip.
      if(w.path){const {a,b,speed}=w.path,length=a.distanceTo(b),pause=2.6,cycle=(time*speed+i*2.3)%(length*2+pause*2),out=Math.atan2(b.x-a.x,b.z-a.z),turn=(u:number)=>T.MathUtils.smoothstep(u,.35,pause-.25)*Math.PI;
        if(cycle<length){position.lerpVectors(a,b,eased(cycle,length)/length);moving=true;person.group.rotation.y=out;}
        else if(cycle<length+pause){position.copy(b);person.group.rotation.y=out+turn(cycle-length);}
        else if(cycle<length*2+pause){position.lerpVectors(b,a,eased(cycle-length-pause,length)/length);moving=true;person.group.rotation.y=out+Math.PI;}
        else{position.copy(a);person.group.rotation.y=out+Math.PI+turn(cycle-length*2-pause);}}
      const partner=w.partner===undefined?undefined:this.workers[w.partner].person.group.position;
      if(partner)this.city.lifeTarget.set(partner.x,1.7,partner.z);else this.city.lifeTarget.set(position.x+Math.sin(person.group.rotation.y)*2,1.7,position.z+Math.cos(person.group.rotation.y)*2);
      const speaking=w.partner!==undefined&&turnTaking(time,i+100,w.partner+100);
      animateLife(person,kind,dt,time,calm,viewer,this.city.lifeTarget,speaking,moving);
    });
    this.animateSet(dt,time,calm);
  }
}
