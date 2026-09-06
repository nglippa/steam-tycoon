import * as T from 'three';
import { box,cyl,sphere,beam,torus,windowUnit,sign,bake,mats,seeded } from './assets';
import { V,pipe,cable,railing,crest,roof,artMats } from './art-kit';

/** Authored structural rhythm; additions stay above the walkable frontage. */
export function facadeDetail(g:T.Group,w:number,h:number,d:number,type:number) {
  const front=d/2;
  // Projecting iron balcony, supported by diagonal corbels.
  const bx=type%2?-w*.24:w*.22;
  box(g,bx,4.25,front+.65,4,.16,1.5,mats.iron);
  railing(g,bx,4.3,front+1.4,4);
  for(const x of [bx-1.7,bx+1.7])beam(g,V(x,3.3,front+.1),V(x,4.2,front+1.25),.075,mats.iron);
  for(const x of [-w/2+.75,w/2-.75]) {
    box(g,x,h*.5,front+.26,.14,h-.5,.18,mats.iron);
    for(let y=1;y<h;y+=1.2)sphere(g,x,y,front+.38,.055,mats.brass);
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
    for(let i=0;i<6;i++)box(wall,-d*.22+i*.35,2.7,.1,.3,.7,.08,i%2?mats.wood:mats.rust).rotation.z=.08*(i%3-1);
    const vent=new T.Group();vent.position.set(d*.29,2,.18);wall.add(vent);box(vent,0,0,0,1.3,.85,.2,mats.iron);
    for(let i=0;i<5;i++)box(vent,0,-.3+i*.15,.15,1.12,.04,.09,mats.copper);
  }
  const rear=new T.Group();rear.position.z=-d/2-.04;rear.rotation.y=Math.PI;g.add(rear);
  box(rear,0,h*.63,.08,w*.67,h*.35,.12,artMats.fadedPaint);
  for(const y of [h*.45,h*.64,h*.81])box(rear,0,y,.2,w*.73,.15,.16,mats.iron);
  for(const x of [-w*.28,0,w*.28]){box(rear,x,h*.62,.2,.13,h*.38,.16,mats.wood);windowUnit(rear,x,h*.48,.3,type%3!==0,1.15,1.9);}
  pipe(rear,[[-w*.39,h,.24],[-w*.39,3,.24],[-w*.18,3,.24],[-w*.18,.2,.24]],.12,mats.copper);
  box(rear,w*.23,2.3,.4,2,1.2,.7,mats.iron);for(let i=0;i<6;i++)box(rear,w*.23,1.88+i*.16,.8,1.8,.055,.12,mats.rust);
  sign(rear,'SERVICE '+String(type+1).padStart(2,'0'),'LOWWORKS • KEEP ACCESS CLEAR',-w*.2,1.7,.15,2.8,.75);
  // Offset dormer and a rooftop utility silhouette, rather than a single roof slab.
  const dx=type%2?-w*.22:w*.22;
  box(g,dx,h+1.4,front*.25,3.2,2.4,3.1,artMats.plaster);
  roof(g,dx,h+2.6,front*.25,3.9,2.4,3.6);
  windowUnit(g,dx,h+.9,front*.25+1.57,true,1.1,1.6);
  for(const x of [-w*.3,-w*.22]) {cyl(g,x,h+3,-d*.26,.25,5.6,mats.rust);cyl(g,x,h+5.8,-d*.26,.38,.16,mats.iron);}
  cable(g,V(-w/2,h-.6,front+.3),V(w/2,h-1.4,front+.3),.6);
}

export function businessCrown(g:T.Group,index:number,h:number) {
  if(index===1) {
    // Boiler No. 07 is visible from the gate, not hidden behind the shop.
    for(const x of [-3.4,2.7]) {
      const top=x<0?20:16;
      cyl(g,x,(h+top)/2,0,1.9,top-h,mats.copper);
      sphere(g,x,top,0,1.9,mats.copper).scale.y=.6;
      for(let y=h+1;y<top;y+=2)cyl(g,x,y,0,1.97,.13,mats.iron);
      for(const dx of [-1.5,1.5])box(g,x+dx,h+1,0,.18,4,.18,mats.iron);
      pipe(g,[[x,top,0],[x,top+2,0],[x,top+2,3],[x,6,3],[x,6,5.8]],.26);
    }
    box(g,0,12,3,11,.22,2,mats.iron);railing(g,0,12.1,4,11);
    sign(g,'07','MUNICIPAL STEAM',-3.4,16.3,1.95,2.2,2.2);
    crest(g,2.7,13,2,1.2);
  } else if(index===3) {
    for(const x of [-5,0,5])roof(g,x,h+.3,0,4.7,3.7,10,mats.rust);
    for(const x of [-5,4]){cyl(g,x,h+5,-2,.8,10,mats.darkBrick);cyl(g,x,h+10,-2,1,.4,mats.iron);}
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

export function buildSkyline(root:T.Group) {
  const rand=seeded(1967);const near=new T.Group();const far=new T.Group();root.add(near,far);
  // Roof clusters form a lower city layer around asymmetric civic/industrial peaks.
  for(let i=0;i<40;i++) {
    const a=i/40*Math.PI*2;const r=108+rand()*23;const x=Math.sin(a)*r,z=Math.cos(a)*r;
    const w=5+rand()*7,h=12+rand()*19,d=7+rand()*6;
    box(near,x,h/2,z,w,h,d,i%3?mats.darkBrick:artMats.plaster);
    roof(near,x,h,z,w+1,3+rand()*5,d+1);
    for(let y=5;y<h-1;y+=4)for(let dx=-w/2+1;dx<w/2;dx+=2.4)if(rand()>.4)box(near,x+dx,y,z+d/2+.04,.7,1.4,.05,mats.glow);
    if(i%4===0){cyl(near,x,h+4,z,1.8,5,mats.copper);cyl(near,x,h+6.7,z,2,.25,mats.iron);}
  }
  // Far silhouette: stepped engine cathedrals, airship moorings and clustered flues.
  for(let i=0;i<19;i++) {
    const x=(i-9)*21,z=-145-(i%3)*19,h=30+rand()*32;
    box(far,x,h/2,z,10,h,12,mats.darkBrick);
    box(far,x,h*.72,z,14,.5,15,mats.iron);
    if(i%3===0){const dome=sphere(far,x,h,z,7,mats.roof);dome.scale.y*=1.4;cyl(far,x,h+11,z,.3,10,mats.brass);}
    else {roof(far,x,h,z,13,10,14);for(const dx of [-5,5])cyl(far,x+dx,h+7,z,.45,18,mats.rust);}
    for(let y=10;y<h-2;y+=5)for(const dx of [-3,0,3])box(far,x+dx,y,z+6.1,.5,2,.05,mats.glow);
  }
  for(const x of [-95,94]) {
    for(const dx of [-5,5])box(near,x+dx,23,-87,.45,46,.45,mats.iron);
    for(let y=6;y<42;y+=9)beam(near,V(x-5,y,-87),V(x+5,y+8,-87),.1,mats.iron);
    box(near,x,42,-87,28,.45,.8,mats.rust);cable(near,V(x-5,48,-87),V(x+15,42,-87),.3);
  }
  // Horizontal aqueduct between vertical peaks establishes another horizon.
  for(let x=-100;x<=100;x+=17) {box(far,x,9,-116,1.5,18,2.5,mats.darkBrick);beam(far,V(x,11,-116),V(x+8,17,-116),.22,mats.stone);}
  box(far,0,18,-116,225,1.5,4,mats.darkBrick);
  bake(near);bake(far);far.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
}
