import * as T from 'three';
import { box,cyl,sphere,torus,beam,gear,barrel,crate,sign,arch,bake,mats,seeded } from './assets';
import { V,pipe,cable,crest,gauge,lampHead,railing,canopy,artMats } from './art-kit';
import { citizen } from './citizens';
import { animateLife, type Activity } from './citizen-life';
import { reducedMotion } from '../motion';
import type { City } from './city';
import { PROPERTIES } from '../simulation/economy';

/** World-only presentation. Reads completed visual levels; never changes the economy. */
export class Presentation {
  root=new T.Group(); restored=new T.Group(); worn=new T.Group(); market=new T.Group();
  mechanisms:{object:T.Object3D;axis:'x'|'y'|'z';speed:number}[]=[];
  workers:{person:ReturnType<typeof citizen>;kind:Activity;tool?:T.Group}[]=[];
  steamOrigins=[V(32.8,13,40),V(12,1,32),V(-9,.25,25),V(31,3,14),V(-29,2,14),V(9,.3,-25)];
  runoff: T.Vector3[]=[]; heat:T.Mesh[]=[]; lanterns:T.Mesh[]=[];
  signature='';
  constructor(public city:City){city.root.add(this.root);this.root.add(this.restored,this.worn,this.market);this.gate();this.street();this.industries();this.square();this.story();this.boundaries();}
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
    // Two covered service bridges compress the long spine without narrowing travel.
    for(const z of [6]) {
      for(const x of [-12.3,12.3]) {box(g,x,4.4,z,.3,8.8,.3,mats.iron);beam(g,V(x,5.5,z),V(x*.72,8.8,z),.12,mats.iron);}
      box(g,0,8.65,z,25,.3,2.2,mats.iron);railing(g,0,8.8,z+1.1,25);railing(g,0,8.8,z-1.1,25);
      for(const y of [9.8,10.4])pipe(g,[[-14,y,z],[0,y,z],[14,y,z]],.15,mats.copper);

      sign(g,'MARKET SQUARE ↑','CIVIC WALK',-7,8.35,z+1.2,3.5,.55);
    }
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
    const f=new T.Group();f.position.set(29,0,14);f.rotation.y=Math.PI/2;g.add(f);
    for(const x of [-3,3])box(f,x,4.7,0,.28,9.4,.35,mats.iron);
    box(f,0,9.2,0,8,.55,.5,mats.rust);for(let i=0;i<7;i++)beam(f,V(-3+i,8.95,0),V(-2+i,9.45,0),.035,mats.brass);
    box(f,0,2.7,.5,4.6,5.4,2.5,artMats.coal);arch(f,0,.3,1.79,3,3.5,mats.iron);arch(f,0,.5,1.82,2.5,3,artMats.furnace);
    for(const x of [-1.5,1.5]){box(f,x,2.1,2,.3,3.3,.3,mats.rust);for(let y=.8;y<3.6;y+=.5)sphere(f,x,y,2.18,.075,mats.brass);}
    box(f,0,.35,3,3,.25,2,mats.iron);for(const x of [-.8,0,.8])box(f,x,.51,3.1,.4,.08,1.2,artMats.ember);
    const hoist=new T.Group();hoist.position.set(0,8.7,0);f.add(hoist);cyl(hoist,0,-1.3,0,.025,2.6,mats.iron);torus(hoist,0,-2.8,0,.26,.065,mats.brass);bake(hoist);
    f.remove(hoist);hoist.position.set(29,8.7,14);this.root.add(hoist);this.mechanisms.push({object:hoist,axis:'z',speed:.05});
    pipe(f,[[0,5.4,.5],[0,7.3,.5],[-2,7.3,.5],[-2,12,.5]],.65,mats.iron);
    sign(f,'CINDER No. 3','FOUNDRY • HOT METAL',0,5.6,2.05,3.8,.65);
    this.city.collider(29,14,3.4,4.5,6);this.city.collider(29.5,40,4.5,4.5,7);
    // Belt-driven wheel at the workshop. The axle and bearing supports connect it.
    const drive=new T.Group();drive.position.set(-29,2.7,14);this.root.add(drive);const wheel=gear(drive,0,0,0,1.3);this.mechanisms.push({object:wheel,axis:'z',speed:-.75});
    beam(g,V(-29,2.7,13.6),V(-29,2.7,15.4),.11,mats.iron);for(const z of [13.7,15.3])box(g,-29,1.25,z,.35,2.5,.35,mats.iron);
    for(const x of [-30.25,-27.75])box(g,x,1.75,14,.06,2,.16,mats.wood);
    this.addWorker(33.6,16,-Math.PI/2,'hammer');this.addWorker(33.1,42,-Math.PI/2,'gauge');this.addWorker(-30,12,Math.PI/2,'valve');
    const valve=torus(g,-29.4,1.55,12,.28,.04,mats.brass);valve.rotation.y=Math.PI/2;pipe(g,[[-29.4,1.55,12],[-29.4,1.55,14]],.055);
    bake(g);
  }
  square(){const g=this.section();
    for(const x of [-5.6,5.6]){cyl(g,x,3.1,-43,.07,6.2,mats.iron);lampHead(g,x,5.8,-43);}
    for(const x of [-11,11]){cyl(g,x,3.8,-28,.10,7.6,mats.iron);crest(g,x,6.9,-27.9,.7);}
    bake(g);
  }
  story(){const g=this.section();
    // Small tableaux: a meal gone cold, a repaired toy, memorial and notices.
    box(g,-29,1.1,19,2,.16,1,mats.wood);for(const x of [-29.7,-28.3])box(g,x,.55,19,.08,1.1,.7,mats.iron);
    cyl(g,-29.3,1.25,19,.22,.055,mats.cream);cyl(g,-28.7,1.35,19,.09,.23,mats.copper);torus(g,-28.58,1.37,19,.07,.025,mats.copper);
    sign(g,'BACK AT THE BELL','FINCH • SECOND SHIFT',-29,1.35,19.5,.8,.4);
    const notice=new T.Group();notice.position.set(-42.8,2,26);notice.rotation.y=Math.PI/2;g.add(notice);
    box(notice,0,0,0,2.6,2,.15,mats.wood);sign(notice,'KEEP YOUR RECEIPTS','COAL RATIONS • TUESDAYS',0,.3,.11,2.2,.8,'#d6b778');sign(notice,'MISSING: A SMALL BRASS BIRD','RETURN TO THE COPPER FINCH',.2,-.5,.13,1.8,.6,'#c1b29a');
    const toy=new T.Group();toy.position.set(-41.9,.2,25);g.add(toy);box(toy,0,.15,0,.55,.25,.25,mats.red);for(const x of [-.18,.18])for(const z of [-.17,.17])sphere(toy,x,.05,z,.09,mats.iron);cyl(toy,.15,.4,0,.05,.28,mats.copper);
    const memorial=new T.Group();memorial.position.set(34,1.6,-45);memorial.rotation.y=-Math.PI/2;g.add(memorial);sign(memorial,'THE WINTER OF 1841','17 ENGINEERS • THE FLAME REMAINED',0,0,0,2.8,1.2);crest(memorial,0,1,0,.45);
    for(const [x,z] of [[-29,34],[29,8],[-42,3]]){barrel(g,x,0,z);crate(g,x+1,0,z,.7);for(let i=0;i<5;i++)beam(g,V(x-.4,.3+i*.13,z+.7),V(x+.4,.3+i*.13,z+.8),.065,mats.wood);}
    this.addWorker(-41.5,27,-Math.PI/2,'read');this.addWorker(-9,-22,Math.PI/2,'sweep');this.addWorker(9.8,-18,-Math.PI/2,'read');this.addWorker(34,19,-Math.PI/2,'warm');
    bake(g);
  }
  boundaries(){const g=this.section();
    for(const x of [-75.5,76.5])for(let z=-78;z<78;z+=9){box(g,x,1.8,z,.6,3.6,8.8,mats.darkBrick);cyl(g,x,4,z, .2,1,mats.iron);}
    // Freight gates give the far north boundary an intentional silhouette.
    for(const x of [-52,52]){box(g,x,5,-82,20,10,1,mats.darkBrick);sign(g,'EAST LOCKE FREIGHT','RAIL ACCESS • AUTHORIZED CREWS',x,4,-81.4,8,1.2);for(let dx=-4;dx<=4;dx+=.5)cyl(g,x+dx,2,-81.3,.04,4,mats.iron);}
    bake(g);
  }
  addWorker(x:number,z:number,yaw:number,kind:Activity) {
    const role=kind==='gauge'||kind==='valve'?'engineer':kind==='browse'||(z<0&&kind==='read')?'merchant':kind==='read'?'resident':'worker';
    const person=citizen(mats.rust,this.workers.length+43,role);person.group.position.set(x,.18,z);person.group.rotation.y=yaw;this.root.add(person.group);
    const tool=new T.Group();person.arms[0].add(tool);
    if(kind==='hammer'){box(tool,0,-.62,.12,.05,.4,.05,mats.wood);box(tool,0,-.8,.12,.3,.1,.12,mats.iron);}
    if(kind==='sweep'){cyl(tool,0,-.9,.15,.024,1.1,mats.wood);box(tool,0,-1.42,.15,.4,.18,.15,mats.cream);}
    if(kind==='read'){box(tool,.25,-.4,.22,.45,.04,.3,artMats.paper);}
    bake(tool);this.workers.push({person,kind,tool});
  }
  sync(){
    const e=this.city.economy;const levels=PROPERTIES.map(p=>this.city.properties.get(p.id)!.level);const key=[...levels,...Object.values(e.state.infrastructure),e.stage].join(':');if(key===this.signature)return;this.signature=key;
    this.worn.visible=e.state.infrastructure.roads===0;
    this.city.disposeGroup(this.restored);this.city.disposeGroup(this.market);const g=this.restored;const rich=e.stage>=3;const marketLevel=levels[5];
    // Repairs have literal mechanical consequences unique to every property.
    PROPERTIES.forEach((p,i)=>{const level=levels[i];if(!level)return;const a=new T.Group();a.position.set(p.x,.18,p.z);a.rotation.y=p.rotation;g.add(a);

      if(i===0){for(let n=0;n<level;n++)crate(a,-7+n*.75,0,8,.6);if(level>=2){box(a,-4,2.7,7,3,.12,1.3,mats.brass);for(let n=0;n<5;n++)cyl(a,-5+n*.5,2.8,7,.12,.25,mats.iron).rotation.z=Math.PI/2;}}
      if(i===1){gauge(a,-3.4,16.3,2.05,1.1,String(20+level*16));for(const x of [-5,5])pipe(a,[[x,1,6],[x,7,6],[x/2,7,6],[x/2,11,6]],.11,level>=4?mats.brass:mats.copper);}
      if(i===2){for(let n=0;n<Math.min(level,3);n++){cyl(a,-6+n*1.1,1.1,7,.32,1.5,mats.brass);sphere(a,-6+n*1.1,1.9,7,.26,level>=4?mats.aether:mats.copper);}}
      if(i===3){for(let n=0;n<Math.min(level,3);n++){arch(a,-6+n*1.8,.5,5.9,1.1,1.9,artMats.furnace);for(const dx of [-.35,0,.35])box(a,-6+n*1.8+dx,1.3,6,.06,1.5,.1,mats.iron);}}
      if(i===4){if(level>=3){railing(a,0,12.5,6,10);for(const x of [-4,4])cyl(a,x,13,5.4,.4,.1,mats.wood);}}
    });
    if(e.state.infrastructure.lamps>0)for(const z of [60,32,0,-26,-43])for(const x of [-9,9]){lampHead(g,x,4.7,z,true);const glow=new T.Mesh(new T.CircleGeometry(2.3,20),artMats.pool);glow.rotation.x=-Math.PI/2;glow.position.set(x,.15,z);g.add(glow);}
    if(rich){for(const x of [-8.8,8.8])lampHead(g,x,3.4,67.7,true);crest(g,0,8.35,67.2,.7);}
    if(e.state.infrastructure.steam>0){for(const x of [-2.5,2.5])sphere(g,x,17.5,-43.5,.15,mats.glow);}
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
      for(let j=0;j<5;j++)sphere(g,x-.7+j%3*.6,1.60,z-.7+Math.floor(j/3)*.8,.18,i%2?mats.leaf:artMats.ochre);
      const board=new T.Group();board.position.set(x-side*1.3,2.15,z);board.rotation.y=-side*Math.PI/2;g.add(board);sign(board,['ORISON TEA','VEYR BREAD','COPPER KETTLE','COASTAL FRUIT','FINCH FLOWERS','SEVEN SPICES'][i],'LOCAL TRADERS',0,0,0,1.7,.48);
      // Collision footprints reserve the same market pockets in all stages.
    }
    if(level>=2)for(const z of [-28]){const curve=cable(g,V(-11,7.6,z),V(11,7.6,z),.9);for(let i=1;i<6;i++){const p=curve.getPoint(i/6);cyl(g,p.x,p.y-.15,p.z,.025,.3,mats.iron);sphere(g,p.x,p.y-.38,p.z,.12,mats.glow);}}
    if(level>=3){const ring=torus(g,0,.43,-31,1.9,.13,mats.brass);ring.rotation.x=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4;cyl(g,Math.sin(a)*1.45,.7,-31+Math.cos(a)*1.45,.05,.4,mats.copper);}}
    if(rich){for(const x of [-10.5,10.5])for(const z of [-35,-43]){box(g,x,.4,z,1.5,.8,1.2,mats.stone);for(let i=0;i<6;i++)sphere(g,x+(i%3-1)*.4,.9,z+Math.floor(i/3)*.3,.2,i%2?mats.leaf:artMats.wine);}}
    bake(g);
  }
  update(dt:number,time:number,viewer:T.Vector3){
    for(const m of this.mechanisms)m.object.rotation[m.axis]=Math.sin(time*m.speed)*.12+(m.axis==='z'&&Math.abs(m.speed)>.2?time*m.speed:0);
    const calm=reducedMotion(this.city.economy.state.settings.reducedMotion);
    for(const {person,kind} of this.workers){
      person.worn.visible=this.city.economy.stage<3;person.finery.visible=this.city.economy.stage>=3;
      const position=person.group.position;this.city.lifeTarget.set(position.x+Math.sin(person.group.rotation.y)*2,1.7,position.z+Math.cos(person.group.rotation.y)*2);
      animateLife(person,kind,dt,time,calm,viewer,this.city.lifeTarget);
    }
  }
}
