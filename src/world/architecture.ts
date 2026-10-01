import * as T from 'three';
import { palette as P } from './palette';
import { box,cyl,sphere,beam,torus,windowUnit,windowGlass,sign,bake,mats,seeded } from './assets';
import { V,pipe,railing,crest,roof,artMats,pressureRing,wingedValve,gauge,facadePaints,aetherDiamond,shopDisplay,canopy,grimeSkirt,sootStreak,paintedWear } from './art-kit';
import { gear } from './assets';
import { skyGap } from './geography';

/** Authored structural rhythm; additions stay above the walkable frontage. */
export function facadeDetail(g:T.Group,w:number,h:number,d:number,type:number) {
  const front=d/2;
  // Projecting iron balcony, supported by diagonal corbels.
  const bx=type%2?-w*.24:w*.22;
  if(type<6||type%3===2){box(g,bx,4.25,front+.65,4,.16,1.5,mats.iron);
  railing(g,bx,4.3,front+1.4,4);
  for(const x of [bx-1.7,bx+1.7])beam(g,V(x,3.3,front+.1),V(x,4.2,front+1.25),.075,mats.iron);
  }
  for(const x of [-w/2+.75,w/2-.75]) {
    box(g,x,h*.5,front+.26,.14,h-.5,.18,mats.iron);

  }
  // Side elevations face arrival and the cross streets: timber infill, shutters,
  // drain pipes and upper oriels break the formerly blank masonry rectangles.
  for(const side of [-1,1]) {
    const wall=new T.Group();wall.position.x=side*(w/2+.035);wall.rotation.y=side*Math.PI/2;g.add(wall);
    box(wall,0,h*.58,.06,d*.76,h*.46,.09,type%2?artMats.plaster:artMats.fadedPaint);
    for(const x of [-d*.34,0,d*.34])box(wall,x,h*.58,.14,.14,h*.48,.16,mats.wood);
    for(const y of [h*.35,h*.59,h*.82])box(wall,0,y,.15,d*.77,.15,.16,mats.wood);
    for(const x of [-d*.2,d*.2]) {
      windowUnit(wall,x,h*.43,.23,true,.95,1.7);
      if(type%2)box(wall,x-.7,h*.5,.24,.3,1.7,.07,mats.teal);
    }
    beam(wall,V(-d*.34,h*.35,.22),V(0,h*.59,.22),.06,mats.wood);
    beam(wall,V(0,h*.59,.22),V(d*.34,h*.82,.22),.06,mats.wood);
    pipe(wall,[[-d*.39,h+.3,.3],[-d*.39,2,.3],[-d*.28,1.3,.3],[-d*.28,.3,.3]],.075,mats.rust);

    if(side<0){const vent=new T.Group();vent.position.set(d*.29,2,.18);wall.add(vent);box(vent,0,0,0,1.3,.6,.12,mats.iron);for(let i=0;i<3;i++)box(vent,0,-.2+i*.2,.1,1.12,.045,.04,mats.copper);}
  }
  const rear=new T.Group();rear.position.z=-d/2-.04;rear.rotation.y=Math.PI;g.add(rear);
  box(rear,0,h*.63,.08,w*.67,h*.35,.12,artMats.fadedPaint);
  for(const y of [h*.45,h*.64,h*.81])box(rear,0,y,.2,w*.73,.15,.16,mats.iron);
  for(const x of [-w*.28,0,w*.28]){box(rear,x,h*.62,.2,.13,h*.38,.16,mats.wood);windowUnit(rear,x,h*.48,.3,type%3!==0,1.15,1.9);}
  pipe(rear,[[-w*.39,h,.24],[-w*.39,3,.24],[-w*.18,3,.24],[-w*.18,.2,.24]],.12,mats.copper);
  box(rear,w*.23,2.3,.4,2,1.2,.7,mats.iron);for(let i=0;i<6;i++)box(rear,w*.23,1.88+i*.16,.8,1.8,.055,.12,mats.rust);

  // Only residential blocks use this small roof accent; businesses own their crowns.
  if(type>=6){const dx=type%2?-w*.22:w*.22;box(g,dx,h+1,0,3.2,2,3.1,artMats.plaster);roof(g,dx,h+2,0,3.7,1.8,3.6);windowUnit(g,dx,h+.4,1.57,true,1.1,1.3);}

}

/** Each trade's graphic signature, repeated at the scale of the facade. */
function signature(g:T.Group,index:number,h:number){const f=5.5;
  if(index===0){gear(g,-5.6,h-2.3,f+.12,1.15);for(const [x,c] of [[-4.2,mats.rust],[.6,artMats.ochre],[4.4,mats.cream]] as const){const p=box(g,x,3.28,6.55,1.6,.05,1.3,c);p.rotation.x=.18;}}
  if(index===1){pressureRing(g,0,h-1.7,f+.18,1.05,mats.brass);for(const x of [-7.6,7.6])box(g,x,h/2,f+.2,.5,h-1,.35,mats.stone);}
  if(index===2){for(const x of [-7.1,7.1]){box(g,x,6.2,f+.08,1.1,4.6,.08,mats.cream);box(g,x,6.2,f+.1,1.25,4.75,.04,mats.brass);wingedValve(g,x,7.2,f+.16,.9);}
    pipe(g,[[6.2,3.6,f+.25],[6.2,5.6,f+.25],[4.6,5.6,f+.25]],.06,mats.brass);for(const [x,y] of [[6.2,6.1],[5.4,5.6]])gauge(g,x,y,f+.3,.26,'F');}
  if(index===3){for(let i=0;i<4;i++){const x0=-8+i*4;beam(g,V(x0,4,f+.25),V(x0+2,h-.6,f+.25),.13,mats.iron);beam(g,V(x0+2,h-.6,f+.25),V(x0+4,4,f+.25),.13,mats.iron);}
    box(g,0,4,f+.25,16.4,.3,.3,mats.iron);const flame=new T.Shape();flame.moveTo(0,-.7);flame.quadraticCurveTo(.65,-.3,.35,.25);flame.quadraticCurveTo(.25,.05,.12,.3);flame.quadraticCurveTo(.05,.75,-.1,.95);flame.quadraticCurveTo(-.2,.4,-.45,.2);flame.quadraticCurveTo(-.65,-.3,0,-.7);
    const m=new T.Mesh(new T.ShapeGeometry(flame),artMats.furnace);m.position.set(0,h-2.2,f+.33);g.add(m);}
  if(index===4){const k=new T.Group();k.position.set(7.3,5.3,f+1.45);g.add(k);torus(g,7.3,6.25,f+.75,.72,.06,mats.brass).rotation.set(0,Math.PI/2,0);
    const pot=sphere(k,0,0,0,1,mats.copper);pot.scale.set(.5,.42,.5);cyl(k,0,.42,0,.12,.12,mats.brass);const spout=cyl(k,.5,.12,0,.07,.5,mats.copper);spout.rotation.z=-.9;torus(k,-.1,.35,0,.28,.04,mats.brass);
    for(const x of [-3,0,3]){cyl(g,x,3.05,6.9,.01,.4,mats.iron);sphere(g,x,2.8,6.9,.14,mats.glow);}}
  if(index===5){pressureRing(g,0,h+2.3,f+.3,.8,mats.brass);for(const x of [-6,-3,0,3,6]){const a=new T.Mesh(new T.TorusGeometry(.95,.05,4,16,Math.PI),mats.brass);a.position.set(x,h-1.1,f+.12);g.add(a);}}
}
/** Display-window x positions per trade (goods and early boarding follow these). */
export const shopWindows=[[-5.6],[],[-5.6,5.6],[5.6],[-5.6,5.6],[-5.6,5.6]];
/** Each trade meets the street differently: yard gate, civic portal, glazed
 * instrument shop, furnace loading bay, bow-windowed tavern, arcaded exchange. */
export function shopfront(g:T.Group,index:number){const f=5.5;
  const portal=(x:number,w:number,h:number,frame:T.Material,depth=.5)=>{for(const dx of [-w/2-.18,w/2+.18])box(g,x+dx,h/2,f+depth/2,.36,h,depth,frame);box(g,x,h+.2,f+depth/2,w+.9,.4,depth+.1,frame);box(g,x,h/2,f+.02,w,h,.04,mats.dark);};
  if(index===0){shopDisplay(g,-5.6,f,2.3,2.2,mats.wood);// Salvage yard gate: half-raised ribbed shutter over a lit interior full of wheels.
    portal(5.4,3.6,3.3,mats.iron,.6);for(let y=2.1;y<3.3;y+=.16)box(g,5.4,y,f+.12,3.6,.1,.08,mats.rust);box(g,5.4,2.02,f+.18,3.7,.14,.14,mats.iron);
    sphere(g,5.4,1.8,f-.3,.14,mats.glow);for(const [x,y,r] of [[4.4,.5,.42],[5.9,.4,.32],[6.5,.9,.28]]){const w=torus(g,x,y,f+.08,r,.06,mats.iron);w.rotation.y=.3;}}
  if(index===1){// Civic portal flanked by louvred intake vents; no shop windows.
    for(const x of [-5.4,5.4]){portal(x,2,3.3,mats.stone,.45);for(let y=.5;y<3.2;y+=.3){const l=box(g,x,y,f+.14,2,.06,.22,mats.iron);l.rotation.x=-.5;}}
    for(const x of [-2.9,2.9])box(g,x,2,f+.2,.5,4,.4,mats.stone);}
  if(index===2){// Continuous glazed front with slender brass mullions and a clock over the door.
    for(const x of [-5.1,5.1]){box(g,x,.35,f+.3,4.8,.7,.6,mats.stone);box(g,x,2.25,f+.05,4.6,3.1,.06,mats.dark);for(const f2 of [.36,.7])box(g,x,.7+3.1*f2,f+.25,4.5,.05,.4,mats.wood);
      for(let k=0;k<=6;k++)box(g,x-2.3+k*.767,2.25,f+.58,.05,3.1,.05,mats.brass);box(g,x,3.85,f+.5,4.9,.14,.3,mats.brass);const pane=new T.Mesh(new T.PlaneGeometry(4.6,3.1),displayGlassRef);pane.position.set(x,2.25,f+.57);g.add(pane);sphere(g,x,3.4,f+.3,.12,mats.glow);}
    const face=cyl(g,0,3.75,f+.3,.5,.12,mats.cream);face.rotation.x=Math.PI/2;torus(g,0,3.75,f+.37,.5,.05,mats.brass);box(g,.1,3.82,f+.4,.05,.3,.02,mats.iron);}
  if(index===3){// Furnace loading bay: a wide glowing mouth under a heavy iron hood; the other side a closed iron door.
    const bay=-4.8;box(g,bay,1.9,f+.02,4.4,3.8,.04,artMats.furnace);box(g,bay,.9,f+.04,4.4,1.8,.04,artMats.ember);
    for(const dx of [-2.45,2.45])box(g,bay+dx,2.1,f+.35,.55,4.2,.7,mats.iron);const hood=box(g,bay,4.45,f+.9,5.8,.3,1.9,mats.iron);hood.rotation.x=-.25;box(g,bay,4.1,f+.35,5.6,.5,.7,mats.rust);
    for(let x=bay-1.8;x<bay+2;x+=.6)box(g,x,.06,f+.9,.3,.06,1.6,mats.iron);
    portal(5.4,3,3.3,mats.iron,.5);for(let x=4.1;x<6.8;x+=.43)box(g,x,1.65,f+.1,.3,3.2,.06,mats.iron);}
  if(index===4){// Bow windows: curved glazed bays and a bench beneath each.
    for(const x of [-5.6,5.6]){const bow=new T.Mesh(new T.CylinderGeometry(1.35,1.35,2.4,10,1,true,-Math.PI/2,Math.PI),displayGlassRef);bow.position.set(x,2.05,f);g.add(bow);
      const back=new T.Mesh(new T.CylinderGeometry(1.3,1.3,2.4,10,1,false,-Math.PI/2,Math.PI),mats.dark);back.scale.z=.3;back.position.set(x,2.05,f);g.add(back);
      for(const [y,m] of [[.72,mats.stone],[3.35,mats.wood]] as const){const c=cyl(g,x,y,f,1.5,.3,m);c.scale.z=.9;}for(let k=0;k<7;k++){const a=-Math.PI/2+k*Math.PI/6;box(g,x+Math.sin(a)*1.36,2.05,f+Math.cos(a)*1.36,.06,2.4,.06,mats.wood);}
      sphere(g,x,2.6,f+.4,.12,mats.glow);}}
  if(index===5){// Exchange arcade: brass-framed windows behind the colonnade.
    for(const x of [-5.6,5.6])shopDisplay(g,x,f,2.3,2.2,mats.brass);}
}
let displayGlassRef:T.Material;
export function setDisplayGlass(m:T.Material){displayGlassRef=m;}
/** Extra storeys inserted above the shopfront so the street reads as an enclosed
 * canyon (Thief / Dishonored): the trade's crown is lifted on top, unchanged. */
export const businessLift=[5.5,4,5.5,4.5,0,4];
const JETTY=1.15;
function liftCrown(g:T.Group,index:number){const E=businessLift[index];if(!E)return;const base=4.45,paint=facadePaints[index],f=5.5;
  g.updateWorldMatrix(true,true);const gy=new T.Vector3().setFromMatrixPosition(g.matrixWorld).y,box3=new T.Box3();
  for(const o of [...g.children]){box3.setFromObject(o);const lo=box3.min.y-gy,hi=box3.max.y-gy;
    if(lo>=base-.1){o.position.y+=E;continue;}
    if(hi>base+.1&&o instanceof T.Mesh&&(o.geometry instanceof T.BoxGeometry||o.geometry instanceof T.CylinderGeometry)&&Math.abs(o.rotation.x)<.01&&Math.abs(o.rotation.z)<.01){const H=o.scale.y;o.scale.y=H+E;o.position.y+=E/2;}}
  // The inserted storeys: a jettied block over the pavement on corbels, with a window row per storey.
  const z0=(f+JETTY-5.5)/2;box(g,0,base+E/2,z0,17,E,11+JETTY,paint);box(g,0,base+.05,f+JETTY/2,17.4,.22,JETTY+.2,mats.stone);box(g,0,base+E+.1,z0,17.6,.3,11.7+JETTY,mats.stone);
  for(let x=-7.8;x<=7.8;x+=1.95){const k=box(g,x,base-.35,f+.55,.24,.7,1.0,mats.wood);k.rotation.x=.6;}
  const fam=(['grid','civic','grid','grid','rect','civic'] as const)[index];const rows=Math.floor(E/3.1)||1;
  for(let r=0;r<rows;r++)for(let x=-6.5;x<=6.6;x+=2.6)windowUnit(g,x,base+.9+r*3.1,f+JETTY+.03,(r+Math.round(x))%4!==0,1.3,Math.min(2.2,E/rows-1),fam);
}
/** Top of the front mass for each trade after composition (signature placement). */
export const businessHeights=[9.5,7,14,7.2,16,8];
const sawtooth=(g:T.Group,x:number,y:number,z0:number,width:number,count:number,depth:number,rise:number,roofMat:T.Material,glass:T.Material)=>{
  const tooth=new T.Shape();tooth.moveTo(0,0);tooth.lineTo(depth,0);tooth.lineTo(0,rise);tooth.closePath();const geo=new T.ExtrudeGeometry(tooth,{depth:width,bevelEnabled:false});
  for(let i=0;i<count;i++){const t=new T.Mesh(geo,roofMat);t.rotation.y=-Math.PI/2;t.position.set(x+width/2,y,z0-depth*(i+1));g.add(t);const pane=new T.Mesh(new T.PlaneGeometry(width-.3,rise-.3),glass);pane.position.set(x,y+rise/2,z0-depth*(i+1)-.01);pane.rotation.y=Math.PI;g.add(pane);}
};
/** Composed bodies replace the single box for five of the six trades. The ground
 * storey keeps the shopfront plane (door, displays, ledger); everything above is
 * massing specific to the trade. */
export function businessBody(g:T.Group,index:number){const paint=facadePaints[index],f=5.5;
  box(g,0,2.2,0,17,4.4,11,paint);box(g,0,4.45,0,17.3,.26,11.3,mats.stone);for(const x of [-8.25,8.25])box(g,x,2.2,f+.15,.45,4.4,.4,mats.stone);
  const cornice=(x:number,y:number,z:number,w:number,d:number)=>{box(g,x,y,z,w+.4,.24,d+.4,mats.stone);};
  if(index===0){// Accumulated: old masonry shop, low shed, salvage tower with hoist, cantilevered sorting room.
    box(g,-5,7,0,7,5.2,11,paint);cornice(-5,9.6,0,7,11);for(const x of [-7.4,-2.7])windowUnit(g,x,5,f+.03,true,1,2.1,'arch');
    box(g,3.5,5.6,0,10,2.4,11,mats.darkBrick);const lean=box(g,3.5,7.2,.2,10.4,.22,11.8,mats.rust);lean.rotation.x=-.12;for(const x of [.6,3.6,6.6])windowUnit(g,x,4.75,f+.03,true,1.3,1.3,'grid');
    const tx=-5.7,tz=-3.1;box(g,tx,13.8,tz,3.8,8.6,3.8,mats.rust);for(let y=11;y<18;y+=2.4)box(g,tx,y,tz,4,.16,4,mats.iron);for(const y of [11,14.4])windowUnit(g,tx,y,tz+1.93,true,1.5,1.6,'grid');
    box(g,tx,18.2,tz,4.3,.3,4.3,mats.iron);railing(g,tx,18.3,tz+2.1,4.2);beam(g,V(tx,18.6,tz),V(5,17,-.5),.14,mats.iron);beam(g,V(tx,20.2,tz),V(5,17,-.5),.05,mats.iron);cyl(g,tx,19.4,tz,.12,2.2,mats.iron);
    cyl(g,5,14.2,-.5,.02,5.6,mats.iron);gear(g,5,11,-.5,.6);sign(g,'ROOK & SON','NOTHING IS WASTED',tx,16.3,tz+1.95,3.6,.9);
    const x=5.4,y=8.8;box(g,x,y,f-1,3.8,3,3.8,mats.iron);windowUnit(g,x,y-1.1,f+.92,true,2.6,1.7,'grid');box(g,x,y+1.65,f-1,4.3,.3,4.3,mats.rust);
    for(const dx of [-1.6,1.6])beam(g,V(x+dx,4.6,f+.05),V(x+dx,y-1.5,f+.9),.12,mats.iron);
    cyl(g,7,10.5,-3.2,.7,7.4,mats.rust);cyl(g,7,14.3,-3.2,.9,.3,mats.iron);}
  if(index===1){// The building serves the machine: a low control house before a giant boiler drum.
    box(g,0,5.7,2.75,17,2.6,5.5,paint);cornice(0,7.05,2.75,17,5.5);for(const x of [-6,-2.6,2.6,6])windowUnit(g,x,4.75,f+.03,true,1.2,1.5,'rect');
    const drum=cyl(g,0,7.8,-2.6,3.3,14,mats.teal);drum.rotation.z=Math.PI/2;for(const x of [-6,-3,0,3,6]){const b=torus(g,x,7.8,-2.6,3.36,.1,mats.iron);b.rotation.y=Math.PI/2;}
    for(const side of [-1,1]){const cap=sphere(g,side*7,7.8,-2.6,3.3,mats.teal);cap.scale.x=.45;}
    box(g,0,11.2,-2.6,12,.12,1.3,mats.iron);railing(g,0,11.25,-2.6+.65,12);railing(g,0,11.25,-2.6-.65,12);for(let y=4.6;y<11;y+=.5)box(g,-8.1,y,-1.4,.06,.05,.6,mats.iron);
    cyl(g,5.5,16,-3.4,1.05,10,mats.rust);for(const y of [13,17,20.5])cyl(g,5.5,y,-3.4,1.12,.16,mats.iron);cyl(g,5.5,21.1,-3.4,1.35,.35,mats.iron);
    sign(g,'07','MUNICIPAL STEAM',0,9.3,.78,2.6,1.1);pipe(g,[[-6.5,8,-.4],[-7.4,8,2.2]],.3,mats.copper);gauge(g,-3.2,8.2,.9,.55,'07');
    const x=-7.6,z=3.9;cyl(g,x,9,z,1.8,18,mats.copper);for(let y=2;y<18;y+=2.6)cyl(g,x,y,z,1.86,.16,mats.iron);const cap=sphere(g,x,18,z,1.8,mats.teal);cap.scale.y=.7;cyl(g,x,19.6,z,.3,1.4,mats.brass);gauge(g,x,13,z+1.9,.7,'07');
    pressureRing(g,0,5.3,f+.18,.9,mats.brass);}
  if(index===2){// Engineered: symmetric stepped mass around a braced instrument tower.
    for(const side of [-1,1]){const cx=side*5.85;box(g,cx,6.5,0,5.3,4.2,11,paint);cornice(cx,8.65,0,5.3,11);railing(g,cx,8.75,f+.1,5);windowUnit(g,side*4.9,5,f+.03,true,1.2,2.2,'grid');
      box(g,side*7.1,6.2,f+.08,1.1,3.2,.08,mats.cream);box(g,side*7.1,6.2,f+.1,1.25,3.35,.04,mats.brass);wingedValve(g,side*7.1,7,f+.16,.9);
      pipe(g,[[side*8,9.3,f-.4],[side*3.4,9.3,f-.4],[side*3.4,12.6,f-.4]],.08,mats.brass);}
    box(g,0,9.2,0,6.4,9.6,11,paint);cornice(0,14.05,0,6.4,11);for(const x of [-3.2,3.2])box(g,x,9.2,f+.12,.4,9.6,.3,mats.stone);
    for(const y of [5,8.4])for(const x of [-1.6,1.6])windowUnit(g,x,y,f+.03,true,1.1,2.3,'grid');
    const round=cyl(g,0,12.5,f+.05,1,.12,mats.cream);round.rotation.x=Math.PI/2;torus(g,0,12.5,f+.12,1,.09,mats.brass);crest(g,0,12.5,f+.16,.8);
    const x=0,z=-2.4,base=14,top=25;box(g,x,(base+top)/2,z,2.6,top-base,2.6,artMats.fadedPaint);for(let y=base+2;y<top;y+=3)box(g,x,y,z,2.8,.18,2.8,mats.brass);
    box(g,x,top+1.6,z,5.2,3.2,5.2,mats.teal);for(let side=0;side<4;side++){const fr=new T.Group();fr.position.set(x,0,z);fr.rotation.y=side*Math.PI/2;g.add(fr);windowUnit(fr,0,top+.6,2.62,true,3,1.9,'grid');}
    for(const [dx,dz] of [[-2.5,-2.5],[2.5,-2.5],[-2.5,2.5],[2.5,2.5]])beam(g,V(x+dx,top,z+dz),V(x+dx*.45,top-4.5,z+dz*.45),.09,mats.brass);
    const cap=new T.Mesh(new T.ConeGeometry(4,2.6,4),mats.roof);cap.rotation.y=Math.PI/4;cap.position.set(x,top+4.5,z);g.add(cap);wingedValve(g,x,top+6.2,z,1.1);
    for(const dx of [-3,3])beam(g,V(x,base+6,z),V(x+dx,base,z+1.5),.06,mats.iron);
    for(const dx of [-.55,.55])box(g,dx,(base+top)/2,z+1.36,.08,top-base,.08,mats.iron);}
  if(index===3){// Heat and weight: a low glowing sawtooth hall, a tall rear hall and one dominant exhaust.
    box(g,0,5.8,0,17,2.8,11,paint);sawtooth(g,0,7.2,f,17,4,2.75,2.5,mats.rust,artMats.furnace);
    box(g,-3.25,9.6,-3.75,10.5,4.8,3.5,mats.darkBrick);box(g,-3.25,11.2,-1.98,9,.9,.06,artMats.furnace);cornice(-3.25,12.1,-3.75,10.5,3.5);
    cyl(g,5,16.6,-3,1.7,19,mats.iron);for(const y of [10,14,18,22])cyl(g,5,y,-3,1.78,.2,mats.rust);const lip=cyl(g,5,26.2,-3,2.1,.5,mats.rust);void lip;
    const waist=[new T.Vector2(2.2,0),new T.Vector2(1.6,2.6),new T.Vector2(1.35,4.6),new T.Vector2(1.6,6)];const c=new T.Mesh(new T.LatheGeometry(waist,12),mats.iron);c.position.set(-6.3,12,-3.8);g.add(c);cyl(g,-6.3,18.1,-3.8,1.65,.22,mats.rust);
    cyl(g,8,10,4.4,.3,5.8,mats.iron);beam(g,V(8,12.6,4.4),V(3.2,12.2,7.6),.14,mats.iron);beam(g,V(8,13.2,4.4),V(3.2,12.2,7.6),.05,mats.iron);cyl(g,3.2,10.6,7.6,.02,3.2,mats.iron);box(g,3.2,8.8,7.6,.7,.5,.7,mats.iron);box(g,3.2,9.02,7.6,.55,.08,.55,artMats.ember);}
  if(index===5){// Civic: a colonnaded base, pediment, open rotunda gallery, dome and a restrained aether spire.
    box(g,0,6.2,0,17,3.6,11,paint);cornice(0,8.1,0,17,11);railing(g,0,8.25,f+.15,16.5);for(const x of [-8.2,-5,-1.6,1.6,5,8.2])box(g,x,4,f+.15,.5,8,.35,mats.stone);
    for(const x of [-6.5,-3.3,3.3,6.5])windowUnit(g,x,4.8,f+.03,true,1.35,2.3,'civic');
    const ped=new T.Shape();ped.moveTo(-3.6,0);ped.lineTo(3.6,0);ped.lineTo(0,2.2);ped.closePath();const pm=new T.Mesh(new T.ExtrudeGeometry(ped,{depth:.6,bevelEnabled:false}),mats.cream);pm.position.set(0,8.2,f-.3);g.add(pm);crest(g,0,8.9,f+.35,.7);
    const z=-.8,y=8.2;cyl(g,0,y+2.2,z,4,4.4,mats.cream);for(let i=0;i<14;i++){const a=i/14*Math.PI*2;cyl(g,Math.sin(a)*4.7,y+2.1,z+Math.cos(a)*4.7,.16,4.2,mats.stone);}
    cyl(g,0,y+.1,z,5,.2,mats.stone);cyl(g,0,y+4.35,z,5,.35,mats.stone);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box(g,Math.sin(a)*4.02,y+2.4,z+Math.cos(a)*4.02,.8,2,.1,mats.dark).rotation.y=a;}
    const dome=sphere(g,0,y+4.5,z,4.2,mats.teal);dome.scale.y=1.05;for(let i=0;i<4;i++){const rib=torus(g,0,y+4.5,z,4.22,.09,mats.brass);rib.rotation.y=i*Math.PI/4;rib.scale.y=1.05;}
    cyl(g,0,y+9.4,z,.75,1.4,mats.cream);const lc=new T.Mesh(new T.ConeGeometry(.9,1.1,8),mats.copper);lc.position.set(0,y+10.6,z);g.add(lc);
    cyl(g,0,y+13.3,z,.07,4.6,mats.brass);for(const [yy,r] of [[y+12.2,.45],[y+13.4,.3]]){const ring=torus(g,0,yy,z,r,.04,mats.brass);ring.rotation.x=Math.PI/2;}aetherDiamond(g,0,y+15.8,z,.28);}
  // Signature motifs retained from the facade pass.
  const h=businessHeights[index];
  if(index===0){gear(g,-5.1,7.7,f+.12,1.05);for(const [x,c] of [[-4.2,mats.rust],[.6,artMats.ochre],[4.4,mats.cream]] as const){const p=box(g,x,3.28,6.55,1.6,.05,1.3,c);p.rotation.x=.18;}}
  if(index===3){for(let i=0;i<4;i++){const x0=-8+i*4;beam(g,V(x0,4,f+.25),V(x0+2,h-.6,f+.25),.13,mats.iron);beam(g,V(x0+2,h-.6,f+.25),V(x0+4,4,f+.25),.13,mats.iron);}
    box(g,0,4,f+.25,16.4,.3,.3,mats.iron);const flame=new T.Shape();flame.moveTo(0,-.7);flame.quadraticCurveTo(.65,-.3,.35,.25);flame.quadraticCurveTo(.25,.05,.12,.3);flame.quadraticCurveTo(.05,.75,-.1,.95);flame.quadraticCurveTo(-.2,.4,-.45,.2);flame.quadraticCurveTo(-.65,-.3,0,-.7);
    const m=new T.Mesh(new T.ShapeGeometry(flame),artMats.furnace);m.position.set(0,h-1.9,f+.33);g.add(m);sign(g,'CINDER','IRON • FOUNDRY No. 3',-3.25,10.6,-1.95,6,1.3);}
  if(index===5){for(const x of [-6.5,-3.3,3.3,6.5]){const a=new T.Mesh(new T.TorusGeometry(.95,.05,4,16,Math.PI),mats.brass);a.position.set(x,6.9,f+.12);g.add(a);}}
  liftCrown(g,index);
}
/** Primary masses per trade: each building becomes two or three volumes. */
function mass(g:T.Group,index:number,h:number){const f=5.5;
  if(index===0){// Salvage lookout cantilevered over the crossing on iron knees.
    const x=7.2,y=h+2.6;box(g,x,y,f-.9,3.8,3,3.8,mats.iron);windowUnit(g,x,y-1.1,f+1.02,true,2.6,1.7,'grid');box(g,x,y+1.65,f-.9,4.3,.3,4.3,mats.rust);railing(g,x,y+1.8,f+1.2,4);
    for(const dx of [-1.6,1.6]){beam(g,V(x+dx,h-2.5,f+.1),V(x+dx,y-1.5,f+1),.12,mats.iron);}box(g,x,h/2+1,f-2,.35,h+2,.35,mats.iron);}
  if(index===1){// Copper pressure tower engaged in the corner, taller than the works.
    const x=-7.6,z=3.9;cyl(g,x,9,z,1.8,18,mats.copper);for(let y=2;y<18;y+=2.6)cyl(g,x,y,z,1.86,.16,mats.iron);const cap=sphere(g,x,18,z,1.8,mats.teal);cap.scale.y=.7;cyl(g,x,19.6,z,.3,1.4,mats.brass);gauge(g,x,13,z+1.9,.7,'07');}
  if(index===2){// Finch tower: a narrow shaft carrying a wider workroom on pressure braces.
    const x=-5.4,z=-2.2,top=h+11;box(g,x,(h+top)/2,z,2.6,top-h,2.6,artMats.fadedPaint);for(let y=h+2;y<top;y+=3)box(g,x,y,z,2.8,.18,2.8,mats.brass);
    box(g,x,top+1.6,z,5.2,3.2,5.2,mats.teal);for(let side=0;side<4;side++){const fr=new T.Group();fr.position.set(x,0,z);fr.rotation.y=side*Math.PI/2;g.add(fr);windowUnit(fr,0,top+.6,2.62,true,3,1.9,'grid');}
    for(const [dx,dz] of [[-2.5,-2.5],[2.5,-2.5],[-2.5,2.5],[2.5,2.5]])beam(g,V(x+dx,top,z+dz),V(x+dx*.45,top-4.5,z+dz*.45),.09,mats.brass);
    const cap=new T.Mesh(new T.ConeGeometry(4,2.6,4),mats.roof);cap.rotation.y=Math.PI/4;cap.position.set(x,top+4.5,z);g.add(cap);wingedValve(g,x,top+6.2,z,1.1);
    for(const dx of [-4,4])beam(g,V(x,h+7,z),V(x+dx,h,z+2),.06,mats.iron);}
  if(index===3){// A roof condenser and a stepped rear furnace hall.
    box(g,0,h+2,-3.6,15,4,3.8,mats.darkBrick);for(const x of [-4.5,0,4.5])box(g,x,h+2.4,-1.68,2.6,1.2,.08,artMats.furnace);
    const waist=[new T.Vector2(2.6,0),new T.Vector2(1.9,3),new T.Vector2(1.6,5.4),new T.Vector2(1.9,7)];const c=new T.Mesh(new T.LatheGeometry(waist,12),mats.iron);c.position.set(-5.5,h,2.3);g.add(c);cyl(g,-5.5,h+7.1,2.3,1.95,.25,mats.rust);}
  if(index===4){// Jettied upper storeys and a timber corner turret.
    box(g,0,9.8,f+.45,17.3,4.4,.9,artMats.wine);box(g,0,7.55,f+.5,17.6,.2,1.1,mats.wood);for(let x=-7.8;x<=7.8;x+=1.95)box(g,x,7.2,f+.25,.2,.5,.55,mats.wood).rotation.x=.55;
    for(const x of [-6.5,-3.5,-.5,2.5,5.5])windowUnit(g,x,8.3,f+.92,true,1.3,2,'rect');
    const tx=-7.9,tz=4.4,top=h+3;cyl(g,tx,(4.2+top)/2,tz,1.6,top-4.2,mats.cream);const c=new T.Mesh(new T.ConeGeometry(1.6,1.4,12),mats.wood);c.rotation.x=Math.PI;c.position.set(tx,3.5,tz);g.add(c);
    for(const y of [5,9])windowUnit(g,tx,y,tz+1.55,true,.8,1.6,'rect');const cone=new T.Mesh(new T.ConeGeometry(2.1,4.6,12),artMats.wine);cone.position.set(tx,top+2.3,tz);g.add(cone);for(const [yy,r] of [[top+.9,1.7],[top+2.3,1.1]])cyl(g,tx,yy,tz,r,.14,mats.copper);sphere(g,tx,top+4.7,tz,.2,mats.copper);}
  if(index===5){// The Exchange dome on its drum, a civic crown visible across the ward.
    const z=-1.2,y=h+4;cyl(g,0,y+1.5,z,3.6,3,mats.cream);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;box(g,Math.sin(a)*3.62,y+1.6,z+Math.cos(a)*3.62,.7,1.9,.12,mats.dark).rotation.y=a;box(g,Math.sin(a)*3.7,y+1.5,z+Math.cos(a)*3.7,.22,3,.22,mats.brass).rotation.y=a;}
    const dome=sphere(g,0,y+3,z,3.7,mats.copper);dome.scale.y=.95;for(let i=0;i<4;i++){const rib=torus(g,0,y+3,z,3.72,.09,mats.brass);rib.rotation.y=i*Math.PI/4;rib.scale.y=.95;}cyl(g,0,y+3.1,z,3.8,.3,mats.brass);cyl(g,0,y+7.1,z,.65,1.3,mats.cream);const lc=new T.Mesh(new T.ConeGeometry(.8,1,8),mats.copper);lc.position.set(0,y+8.2,z);g.add(lc);sphere(g,0,y+8.9,z,.25,mats.brass);}
}
export function businessCrown(g:T.Group,index:number,h:number) {
  mass(g,index,h);signature(g,index,h);
  if(index===1) {
    // Boiler No. 07 is visible from the gate, not hidden behind the shop.
    for(const x of [-3.4,2.7]) {
      const top=x<0?20:16;
      cyl(g,x,(h+top)/2,0,1.9,top-h,mats.teal);
      sphere(g,x,top,0,1.9,mats.teal).scale.y*=.38;
      for(let y=h+1;y<top;y+=2)cyl(g,x,y,0,1.97,.13,mats.iron);
      for(const dx of [-1.5,1.5])box(g,x+dx,h+1,0,.18,4,.18,mats.iron);
      pipe(g,[[x,top,0],[x,top+2,0],[x,top+2,3],[x,6,3],[x,6,5.8]],.26);
    }
    box(g,0,12,3,11,.22,2,mats.iron);railing(g,0,12.1,4,11);
    sign(g,'07','MUNICIPAL STEAM',-3.4,16.3,1.95,2.2,2.2);
    crest(g,2.7,13,2,1.2);
  } else if(index===3) {
    for(const x of [-5,0,5])roof(g,x,h+.3,0,4.7,3.7,10,mats.rust);
    for(const x of [-5,4]){const tall=x>0?13:8;const radius=x>0?1.25:.65;cyl(g,x,h+tall/2,-2,radius,tall,mats.iron);cyl(g,x,h+tall,-2,radius+.18,.35,mats.rust);}
    box(g,0,h+1,5.8,13,.26,.3,artMats.furnace);
    sign(g,'CINDER','IRON • FOUNDRY No. 3',0,h+3.5,5.2,9,2);
  } else if(index===0) {
    for(const x of [-5.7,5.7]) {box(g,x,h+3,1,.2,7,.2,mats.iron);beam(g,V(x,h,1),V(-x,h+5,1),.07,mats.rust);}
    box(g,0,h+6.4,1,14,.35,.6,mats.rust);
    sign(g,'ROOK & SON','NOTHING IS WASTED',0,h+4.6,1.4,8,1.5);
    pipe(g,[[-6,3,5.9],[-6,6,5.9],[-1,6,5.9],[-1,9,5.9]],.11,mats.rust);
  } else if(index===2) {
    box(g,2,h+2,0,5,4,5,artMats.fadedPaint);roof(g,2,h+4,0,6,4,5.5);
    const round=cyl(g,2,h+3,2.65,1.1,.13,mats.cream);round.rotation.x=Math.PI/2;torus(g,2,h+3,2.8,1.1,.1);
    crest(g,2,h+3,2.9,.85);sign(g,'FINCH','PRECISION • SINCE 1841',-3,h+2,5.4,4,1.2);
  } else if(index===4) {
    roof(g,-3,h+.2,0,8,5,10,artMats.wine);roof(g,4,h+.2,0,6,3,9,mats.roof);
    box(g,-3,h+1,5.1,5,1.8,.2,artMats.plaster);
    for(const x of [-4.4,-2.9,-1.4])windowUnit(g,x,h+.4,5.25,true,.8,1.35);
    const hanging=new T.Group();hanging.position.set(-7,5,7.7);hanging.rotation.y=Math.PI/2;g.add(hanging);
    box(hanging,0,0,0,2.1,2.1,.16,mats.wood);sign(hanging,'FINCH','ROOMS • HOT SUPPER',0,0,.1,1.9,1.8);
  } else {
    roof(g,0,h+.4,0,17,5,10,mats.teal);box(g,0,h+2,5.2,9,2.8,.18,artMats.plaster);
    crest(g,0,h+2.3,5.4,1.6);for(const x of [-3,3])windowUnit(g,x,h+1,5.35,true,1.5,2);
  }
}

const kindWidth=[5.5,7,9.5,8,14,11,12,8];
/** Outer-city grammar: eight inexpensive silhouettes that share Terra's roof language.
 * 0 tenement, 1 stacked worker house, 2 tower house, 3 roof workshop, 4 sawtooth shed,
 * 5 merchant row, 6 courtyard block, 7 pressure house. Local +z faces the city. */
export function archetype(g:T.Object3D,kind:number,x:number,w:number,h:number,wallMat:T.Material,roofMat:T.Material,detail:boolean){const d=8;
  const gable=(cx:number,y:number,cw:number,pitch:number,cd=d)=>roof(g,cx,y,0,cw+.6,pitch,cd+.6,roofMat);
  const win=(cx:number,y:number,z:number,lit=true)=>{if(!detail)return;box(g,cx,y,z-.04,1.15,1.7,.1,mats.dark);box(g,cx,y,z+.01,.86,1.38,.04,windowGlass[lit?(Math.floor(cx*7+y))%2:3]);box(g,cx,y-.82,z+.08,1.3,.14,.24,mats.stone);box(g,cx,y+.86,z+.04,1.25,.16,.14,mats.stone);};
  // Ground floor: a door with a step and a stone base; upper rows alternate lit and dark rooms; soot gathers at the foot.
  const rows=(cx:number,cw:number,top:number,z=d/2+.02)=>{if(!detail)return;box(g,cx,.55,z+.02,cw+.05,1.1,.14,mats.stone);
    const door=cx+(Math.sin(cx*3.1)>0?-1:1)*Math.min(cw*.22,1.4);box(g,door,1.25,z+.03,1.1,2.5,.06,mats.dark);box(g,door,2.6,z+.1,1.5,.24,.2,mats.stone);box(g,door,.08,z+.35,1.6,.16,.6,mats.stone);
    let r=0;for(let y=4.2;y<top-1.8;y+=3.1,r++)for(let xx=cx-cw/2+1.3;xx<cx+cw/2-.9;xx+=2.1)win(xx,y,z,(Math.floor(xx*5)+r)%4!==0);
    grimeSkirt(g,cx,z+.12,cw,1.6+(Math.abs(Math.sin(cx))*1.2),cx);paintedWear(g,cx,z+.09,cw,top,cx*1.3+top,0,1);if(top>8)sootStreak(g,cx+cw*.3,top-.2,z+.12,.9,2.6);};
  if(kind===0){box(g,x,h/2,0,w,h,d,wallMat);gable(x,h,w,w*.75);box(g,x+w*.25,h+w*.6,-1.5,.8,3,.8,mats.brick);rows(x,w,h);}
  if(kind===1){const lo=h*.7;box(g,x,lo/2,0,w,lo,d,wallMat);box(g,x+.4,lo+(h-lo)/2,.5,w+.2,h-lo,d+1,wallMat);box(g,x+.4,lo+.1,.5,w+.4,.2,d+1.2,mats.wood);gable(x+.4,h,w+.2,w*.5,d+1);rows(x,w,h);}
  if(kind===2){const tw=3.4,tx=x-w/2+tw/2;box(g,tx,h*.75,0,tw,h*1.5,tw,wallMat);const cap=new T.Mesh(new T.ConeGeometry(tw*.85,3.2,4),roofMat);cap.rotation.y=Math.PI/4;cap.position.set(tx,h*1.5+1.6,0);g.add(cap);
    const dw=w-tw,dx=tx+tw/2+dw/2;box(g,dx,h*.3,0,dw,h*.6,d,wallMat);gable(dx,h*.6,dw,dw*.55);rows(dx,dw,h*.6);if(detail)win(tx,h*1.2,tw/2+.02);}
  if(kind===3){box(g,x,h/2,0,w,h,d,wallMat);box(g,x,h+.3,0,w+.3,.4,d+.3,mats.stone);box(g,x-w*.15,h+1.6,-1,w*.45,2.4,3.4,mats.wood);gable(x-w*.15,h+2.8,w*.45,1.2,3.4);cyl(g,x+w*.3,h+2.5,-2,.45,5,mats.rust);rows(x,w,h);}
  if(kind===4){const lo=Math.min(h,6.5);box(g,x,lo/2,0,w,lo,d,wallMat);for(let i=0;i<3;i++){const tooth=box(g,x,lo+.9,d/2-1.3-i*2.7,w,.2,2.9,roofMat);tooth.rotation.x=-.6;}cyl(g,x+w*.35,lo+6,-2,.8,12,mats.brick);cyl(g,x+w*.35,lo+12.1,-2,1,.35,mats.iron);}
  if(kind===5){const fw=w/3;for(let i=0;i<3;i++){const fh=h*[1,1.18,.9][i],cx=x-w/2+fw*(i+.5);box(g,cx,fh/2,0,fw,fh,d,wallMat);gable(cx,fh,fw,fw*.8);rows(cx,fw,fh);if(detail){box(g,cx,1.6,d/2+.05,fw-1,1.8,.06,windowGlass[0]);const aw=box(g,cx,2.85,d/2+.7,fw-.6,.1,1.4,[mats.red,mats.teal,artMats.ochre][i]);aw.rotation.x=.25;}}}
  if(kind===6){for(const [cx,cz,cw,cd] of [[x-w/2+2,0,4,d],[x+w/2-2,0,4,d],[x,-d/2+1.5,w,3]] as const){box(g,cx,h/2,cz,cw,h,cd,wallMat);}roof(g,x-w/2+2,h,0,4.6,2.4,d+.6,roofMat);roof(g,x+w/2-2,h,0,4.6,2.4,d+.6,roofMat);box(g,x,h+.3,-d/2+1.5,w,.5,3.4,mats.stone);rows(x-w/2+2,4,h);rows(x+w/2-2,4,h);}
  if(kind===7){box(g,x,h*.4,0,w,h*.8,d,wallMat);gable(x,h*.8,w,w*.35);cyl(g,x+w/2-1.2,h*.55,d/2-1.2,1.5,h*1.1,mats.copper);const dome=sphere(g,x+w/2-1.2,h*1.1,d/2-1.2,1.5,mats.teal);dome.scale.y=.8;rows(x-1,w-3,h*.8);}
}
/** Mid-city band just outside the playable edge: lit, outlined clusters of 3-6
 * buildings sharing walls, one taller anchor, then open space. */
export function buildOuterCity(root:T.Group,walls:T.Material[]){
  const g=new T.Group();root.add(g);const roofsBy=[mats.roof,mats.rust,mats.teal];
  const path:[number,number,number][]=[];// x,z,yaw facing the city
  // South of the arrival terrace Terra simply ends: no outer ward beyond z≈80, only sky.
  for(let z=66;z>=-92;z-=26)path.push([-92,z,Math.PI/2],[92,z,-Math.PI/2]);for(let x=-66;x<=66;x+=26)if(Math.abs(x)>20)path.push([x,-98,0]);
  path.forEach(([px,pz,yaw],c)=>{const cl=new T.Group();cl.position.set(px,0,pz);cl.rotation.y=yaw;g.add(cl);
    const count=3+(c*7)%4,anchor=(c*3)%count,rhythm=.8+.35*Math.sin((px*.9+pz)*.035),wallMat=walls[(c*5)%walls.length],roofMat=roofsBy[(c*2)%3];
    const kinds=Array.from({length:count},(_,k)=>k===anchor?[2,7,4][c%3]:[0,1,5,3,6,0,1][(c+k*3)%7]);
    let total=kinds.reduce((sum,k)=>sum+kindWidth[k],0)+(count-1)*.1,x=-total/2;
    // A building that would stand where the plate is open to the sky is left out.
    kinds.forEach((kind,k)=>{const w=kindWidth[kind],at=(lx:number)=>skyGap(px+lx*Math.cos(yaw),pz-lx*Math.sin(yaw));if(at(x)||at(x+w/2)||at(x+w)){x+=w+.1;return;}archetype(cl,kind,x+w/2,w,(8.5+((c+k)%3)*2.4)*rhythm*(k===anchor?1.4:1),k%2?walls[(c*5+2)%walls.length]:wallMat,roofMat,true);x+=w+.1;});});
  bake(g);g.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});return g;
}
/** Illustrated aerial perspective: each backdrop plane mixes toward the horizon by a
 * fixed weight and dims at night, instead of dissolving in exponential fog. */
const skylineLayers:{material:T.MeshBasicMaterial;base:T.Color;weight:number}[]=[];
/** A flat, unfogged painted-distance material tinted with the rest of the skyline each frame. */
export function skylineMaterial(color:string,weight=.3){const m=new T.MeshBasicMaterial({color,fog:false});skylineLayers.push({material:m,base:new T.Color(color),weight});return m;}
export function tintSkyline(horizon:T.Color,daylight:number){for(const l of skylineLayers)l.material.color.copy(l.base).multiplyScalar(.28+.72*daylight).lerp(horizon,l.weight);}
/** A painted backdrop in three planes: rooftops, the old Pressure Spires and the
 * snow ridges of Veyr. Flat fog-tinted color keeps it behind the playable street. */
export function buildSkyline(root:T.Group) {
  const rand=seeded(1967),near=new T.Group(),far=new T.Group();root.add(near,far);
  const flat=(color:string,weight=.3)=>{const m=new T.MeshBasicMaterial({color,fog:false});skylineLayers.push({material:m,base:new T.Color(color),weight});return m;};
  const wall=flat('#a9c8c2',.25),roofs=flat('#88aead',.25),deep=flat('#98bab7',.4),spire=flat('#80a8a8',.42);
  // Far ring: the same archetype grammar in flat, tinted planes.
  const far2=[wall,deep];let t=0;
  for(let c=0;c<26;c++){const a=c/26*Math.PI*2+.05,r=118+(c%3)*7,rhythm=.75+.35*Math.sin(a*3+.6);if(Math.cos(a)>.5)continue;const grp=new T.Group(),gx=Math.sin(a)*r,gz=Math.cos(a)*r,yaw=a+Math.PI;grp.position.set(gx,0,gz);grp.rotation.y=yaw;near.add(grp);
    let x=-9;for(let k=0;k<3+c%3;k++){const kind=(c*3+k*5)%8,w=kindWidth[kind],at=(lx:number)=>skyGap(gx+lx*Math.cos(yaw),gz-lx*Math.sin(yaw));if(at(x)||at(x+w/2)||at(x+w)){x+=w+.2;continue;}archetype(grp,kind,x+w/2,w,(9+((c+k)%4)*2.2)*rhythm*(k===1?1.35:1),far2[(c+k)%2],roofs,false);x+=w+.2;t++;}}
  void t;
  // Gasometers and a viaduct give the middle distance an engineered rhythm.
  for(const [x,z] of [[-70,-128],[82,-110],[-120,-40]]){cyl(far,x,11,z,10,22,deep);for(let y=4;y<22;y+=6)torus(far,x,y,z,10.2,.25,spire).rotation.x=Math.PI/2;}
  for(let x=-102;x<=102;x+=17){box(far,x,7,-150,3,14,3,deep);const archway=new T.Mesh(new T.TorusGeometry(7,1.2,4,12,Math.PI),deep);archway.position.set(x+8.5,12,-150);far.add(archway);}
  box(far,0,19.5,-150,218,2,4,deep);
  // Condenser towers and a suspended tank on a truss bridge: Terra's industrial skyline.
  const waist=[new T.Vector2(9,0),new T.Vector2(7,10),new T.Vector2(5.4,20),new T.Vector2(5.8,26),new T.Vector2(6.8,30)];
  for(const [x,z] of [[-104,-96],[-88,-118],[118,-60]]){const t=new T.Mesh(new T.LatheGeometry(waist,10),deep);t.position.set(x,0,z);far.add(t);}
  for(const x of [96,128])box(far,x,17,-140,2.4,34,2.4,deep);box(far,112,33,-140,36,1.6,3,deep);for(let x=96;x<128;x+=4)beam(far,V(x,31,-140),V(x+4,34,-140),.35,deep);
  const tank=sphere(far,112,27,-140,4.5,roofs);tank.scale.set(1.6,1,1);
    // The Pressure Spires: three impossible civic towers older than the city.
  for(const [x,z,h] of [[-46,-205,118],[18,-236,146],[66,-214,104]]){
    cyl(far,x,h*.3,z,5,h*.6,spire);cyl(far,x,h*.62,z,3.2,h*.12,spire);cyl(far,x,h*.8,z,1.6,h*.3,spire);
    for(const y of [h*.6,h*.68])torus(far,x,y,z,6.5,.6,spire).rotation.x=Math.PI/2;
    const crown=sphere(far,x,h*.95,z,2.4,spire);crown.scale.y=1.6;
  }
  bake(near);bake(far);
  // No mountains behind it: Terra hangs in open sky, and the horizon is cloud.
  for(const g of [near,far])g.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=o.receiveShadow=false;});
}
