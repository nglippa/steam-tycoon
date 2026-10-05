import * as T from 'three';
import { Atlas, place, type Placed } from './sign-atlas';
import { palette as P } from './palette';
import { box, cyl, sphere, beam, torus, sign, mats, illustrated, displayGlass, printed, surface, thinLine, asProp, type Material } from './assets';
export const plasterMap=surface('plaster');plasterMap.repeat.set(.37,.37);

export const artMats = {
  plaster: new T.MeshStandardMaterial({color:'#cdbb98',roughness:.94,map:plasterMap}),
  fadedPaint: new T.MeshStandardMaterial({color:'#6f7a7c',roughness:.85,map:plasterMap}),
  coal: new T.MeshStandardMaterial({color:'#2f2c2a',roughness:1,map:plasterMap}),
  mud: new T.MeshStandardMaterial({color:P.warm.leather,roughness:.75}),
  ochre: new T.MeshStandardMaterial({color:P.warm.mustard,roughness:.8}),
  wine: new T.MeshStandardMaterial({color:'#7a3a3a',roughness:.85}),
  paper: new T.MeshStandardMaterial({color:P.neutral.paper,roughness:1}),
  furnace: new T.MeshBasicMaterial({color:P.warm.furnace}),
  ember: new T.MeshBasicMaterial({color:P.warm.ember}),
  pool: new T.MeshBasicMaterial({color:P.warm.lamp,transparent:true,opacity:.1,depthWrite:false,side:T.DoubleSide}),
};
for(const material of [artMats.plaster,artMats.fadedPaint,artMats.ochre,artMats.wine,artMats.coal,artMats.mud,artMats.paper]) illustrated(material);
// One confident wall color per business: salvage ochre, civic navy, Finch teal,
// blackened foundry, tavern wine and the ivory Exchange. Investment cleans the paint.
// One family: ochre, slate blue, soft teal, charcoal slate, brick rose, ivory. Muted early, clean late.
// Rook ochre, civic slate, Finch verdigris, foundry soot, tavern oxblood, Exchange sandstone.
const facadeKeys=[['#857258','#a58c62'],['#4f575e','#5b6a76'],['#4a5f57','#51736a'],['#2e2b28','#383431'],['#62352f','#7b3d34'],['#b0a286','#cbb998']];
export const facadePaints=facadeKeys.map(([early])=>illustrated(new T.MeshStandardMaterial({color:early,map:plasterMap})));
export function refreshFacades(stage:number){const worn=Math.max(.35,1-stage/4);
  // The Lowworks are scarred; Grand Terra is freshly rendered. Same walls, different care.
  soot.opacity=.08+.3*worn;patchDark.opacity=.04+.36*worn;wainscot.opacity=.1+.18*worn;rustRun.opacity=.06+.46*worn;patchLight.opacity=.1+.2*Math.max(0,1-Math.abs(stage-2)/2);exposedBrick.opacity=.88*Math.max(0,1-stage/2.5);exposedBrick.visible=stage<3;facadePaints.forEach((m,i)=>m.color.set(facadeKeys[i][0]).lerp(new T.Color(facadeKeys[i][1]),Math.min(1,stage/4)));}
export const V = (x:number,y:number,z:number) => new T.Vector3(x,y,z);
export function pipe(g:T.Object3D, points:number[][], radius=.12, material:Material=mats.copper) {
  for(let i=1;i<points.length;i++) {
    const a=new T.Vector3(...points[i-1] as [number,number,number]); const b=new T.Vector3(...points[i] as [number,number,number]);
    beam(g,a,b,radius,material);
    const joint=cyl(g,0,0,0,radius*1.38,.13,mats.iron);joint.position.copy(a).lerp(b,.85);joint.quaternion.setFromUnitVectors(V(0,1,0),b.sub(a).normalize());
    sphere(g,...points[i] as [number,number,number],radius*1.1,material);
  }
}
export function cable(g:T.Object3D,a:T.Vector3,b:T.Vector3,sag=.6) {
  const mid=a.clone().lerp(b,.5);mid.y-=sag;
  const curve=new T.QuadraticBezierCurve3(a,mid,b);
  g.add(new T.Mesh(new T.TubeGeometry(curve,12,.018,4,false),mats.iron));return curve;
}
export function railing(g:T.Object3D,x:number,y:number,z:number,width:number) {
  // Terra railing: plain balusters punctuated by the split pressure ring.
  let n=0;for(let dx=-width/2;dx<=width/2;dx+=.6,n++){if(n%4===2)pressureRing(g,x+dx,y+.55,z,.24,mats.iron);else box(g,x+dx,y+.5,z,.045,1,.045,mats.iron);}
  box(g,x,y+1,z,width+.1,.065,.08,mats.brass);box(g,x,y+.12,z,width,.055,.06,mats.iron);
}
/** Terra's three rising flues inside a pointed civic shield. */
export function crest(g:T.Object3D,x:number,y:number,z:number,size=1,material:Material=mats.brass) {
  const a=[[-.5,.6],[.5,.6],[.5,-.15],[0,-.6],[-.5,-.15],[-.5,.6]];
  for(let i=1;i<a.length;i++)beam(g,V(x+a[i-1][0]*size,y+a[i-1][1]*size,z),V(x+a[i][0]*size,y+a[i][1]*size,z),.035*size,material);
  for(const dx of [-.22,0,.22]){box(g,x+dx*size,y+.06*size,z,.055*size,(dx===0?.72:.45)*size,.05*size,material);box(g,x+dx*size,y+(dx===0?.43:.29)*size,z,.15*size,.05*size,.06*size,material);}
  box(g,x,y-.18*size,z,.48*size,.05*size,.06*size,material);
}
export function gauge(g:T.Object3D,x:number,y:number,z:number,r=.65,label='07') {
  const plate=cyl(g,x,y,z,r,.14,mats.cream);plate.rotation.x=Math.PI/2;torus(g,x,y,z+.1,r,.08,mats.brass);
  for(let i=0;i<9;i++){const a=(i/8*1.5-.75)*Math.PI;const tick=box(g,x+Math.sin(a)*r*.78,y+Math.cos(a)*r*.78,z+.19,.035,r*.14,.025,mats.iron);tick.rotation.z=-a;}
  const needle=box(g,x+r*.17,y+r*.2,z+.22,.035,r*.62,.035,mats.red);needle.rotation.z=-.65;
  sign(g,label,'TMSA',x,y-r*.4,z+.2,r*.64,r*.3);return needle;
}
export function lampHead(g:T.Object3D,x:number,y:number,z:number,rich=false) {
  for(const dx of [-.55,0,.55]) {
    const height=dx===0?.35:0;beam(g,V(x,y-.5,z),V(x+dx,y+height,z),.045,rich?mats.brass:mats.iron);
    box(g,x+dx,y+height+.2,z,.24,.42,.24,rich?mats.glow:mats.cream);
    for(const sx of [-.15,.15])box(g,x+dx+sx,y+height+.2,z,.025,.48,.32,mats.iron);
    const cap=new T.Mesh(new T.ConeGeometry(.27,.23,4),rich?mats.brass:mats.iron);cap.position.set(x+dx,y+height+.55,z);cap.rotation.y=Math.PI/4;g.add(cap);
  }
}
/** A gable roof. `hole` ([across0, across1, along0, along1] in the roof's own frame) leaves a vertical opening through it, for a hatch. */
export function roof(g:T.Object3D,x:number,y:number,z:number,width:number,height:number,depth:number,mat:Material=mats.roof,hole?:readonly number[]) {
  const V2=(u:number,v:number)=>new T.Vector2(u,v),half=width/2,rise=(u:number)=>height*(1-Math.abs(u)/half);
  // the gable's cross-section between u0 and u1, pushed from d0 to d1 along the roof
  const part=(u0:number,u1:number)=>new T.Shape([V2(u0,0),V2(u1,0),V2(u1,rise(u1)),...(u0<0&&u1>0?[V2(0,height)]:[]),V2(u0,rise(u0))].filter((p,i,a)=>!i||!p.equals(a[i-1])&&!p.equals(a[0])));
  const run=(shapes:T.Shape[],d0:number,d1:number)=>{const geo=new T.ExtrudeGeometry(shapes,{depth:d1-d0,bevelEnabled:false});geo.translate(0,0,d0);const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);g.add(mesh);};
  if(!hole)run([part(-half,half)],-depth/2,depth/2);
  else{const [u0,u1,d0,d1]=hole;run([part(-half,half)],-depth/2,d0);run([part(-half,half)],d1,depth/2);run([part(-half,u0),part(u1,half)],d0,d1);}
  for(const dz of [-depth/2,depth/2]) {beam(g,V(x-width/2,y,z+dz),V(x,y+height,z+dz),.055,mats.iron);beam(g,V(x,y+height,z+dz),V(x+width/2,y,z+dz),.055,mats.iron);}
  box(g,x,y+height,z,.12,.14,depth+.4,mats.brass);
}
const canopyMaterials=new Map<Material,T.MeshStandardMaterial>();
export const fabricOf=(mat:Material)=>{let fabric=canopyMaterials.get(mat);if(!fabric){fabric=illustrated((mat as T.MeshStandardMaterial).clone());fabric.side=T.DoubleSide;canopyMaterials.set(mat,fabric);}return fabric;};
export function canopy(g:T.Object3D,x:number,y:number,z:number,w:number,d:number,mat:Material=mats.red) {
  let fabric=canopyMaterials.get(mat);if(!fabric){fabric=illustrated((mat as T.MeshStandardMaterial).clone());fabric.side=T.DoubleSide;canopyMaterials.set(mat,fabric);}
  const geo=new T.PlaneGeometry(w,d,10,2),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const xx=pos.getX(i),yy=pos.getY(i);pos.setXYZ(i,xx,Math.cos(xx/w*Math.PI)*.58+yy*.045,yy);}
  geo.computeVertexNormals();const mesh=new T.Mesh(geo,fabric);mesh.position.set(x,y,z);g.add(mesh);
  for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])cyl(g,x+dx,y/2,z+dz,.035,y,mats.iron);
  const edge=new T.Shape();edge.moveTo(-w/2,0);for(let i=0;i<=10;i++){const xx=-w/2+i*w/10;edge.lineTo(xx,Math.cos(xx/w*Math.PI)*.58);}
  for(let i=10;i>=0;i--){const xx=-w/2+i*w/10;edge.lineTo(xx,Math.cos(xx/w*Math.PI)*.58-.2-(i%2)*.07);}edge.closePath();
  const hem=new T.Mesh(new T.ShapeGeometry(edge),fabric);hem.position.set(x,y,z+d/2);g.add(hem);return mesh;

}

export function refreshCanopyColors(){for(const [source,fabric] of canopyMaterials){if(source instanceof T.MeshStandardMaterial&&fabric instanceof T.MeshStandardMaterial)fabric.color.copy(source.color);}}

const buntingMaterial=illustrated(new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide}));
const buntingColors=['#6e3a34','#8a7a58','#4d5e5a','#b3a88f','#3c4250'].map(c=>new T.Color(c));
/** Pennant strings: one draw per string, colors in a repeating civic order. */
export function bunting(g:T.Object3D,a:T.Vector3,b:T.Vector3,sag=1.2,count=18){
  const curve=cable(g,a,b,sag),pos:number[]=[],col:number[]=[];
  for(let i=0;i<count;i++){const p0=curve.getPoint((i+.1)/count),p1=curve.getPoint((i+.9)/count),mid=p0.clone().lerp(p1,.5);mid.y-=.55;
    pos.push(p0.x,p0.y,p0.z,p1.x,p1.y,p1.z,mid.x,mid.y,mid.z);const c=buntingColors[i%buntingColors.length];for(let k=0;k<3;k++)col.push(c.r,c.g,c.b);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.computeVertexNormals();
  g.add(new T.Mesh(geo,buntingMaterial));
}

/** Terra's signature: a split pressure ring, the gauge seen edge-on by every citizen. */
export function pressureRing(g:T.Object3D,x:number,y:number,z:number,r:number,material:Material=mats.brass,yaw=0){
  const ring=torus(g,x,y,z,r,r*.13,material);ring.rotation.y=yaw;
  const bar=box(g,x,y,z,r*1.7,r*.16,r*.16,material);bar.rotation.y=yaw;
  const dot=sphere(g,x,y+r*.42,z,r*.16,material);void dot;return ring;
}
/** Finch's winged valve: a wheel with two swept wings. */
export function wingedValve(g:T.Object3D,x:number,y:number,z:number,s=1,material:Material=mats.brass){
  torus(g,x,y,z,.3*s,.045*s,material);for(let i=0;i<2;i++)box(g,x,y,z,.6*s,.05*s,.05*s,material).rotation.z=i*Math.PI/2;
  for(const side of [-1,1]){const w=new T.Shape();w.moveTo(0,0);w.quadraticCurveTo(.35,.25,.9,.28);w.lineTo(.62,.12);w.lineTo(.8,.05);w.lineTo(.5,-.02);w.quadraticCurveTo(.25,-.08,0,0);
    const mesh=new T.Mesh(new T.ShapeGeometry(w),material);mesh.position.set(x+side*.3*s,y+.02*s,z);mesh.scale.set(side*s,s,s);g.add(mesh);}
}
export function aetherDiamond(g:T.Object3D,x:number,y:number,z:number,s=.3){const m=new T.Mesh(new T.OctahedronGeometry(s,0),mats.aether);m.position.set(x,y,z);m.scale.y=1.5;g.add(m);return m;}
/** Iron-and-timber bench with curved ring ends. */
export function bench(g:T.Object3D,x:number,z:number,yaw=0){
  const b=new T.Group();b.position.set(x,0,z);b.rotation.y=yaw;g.add(b);
  for(const dx of [-.8,.8]){const end=torus(b,dx,.45,0,.34,.045,mats.iron);end.rotation.y=Math.PI/2;box(b,dx,.2,0,.07,.4,.5,mats.iron);}
  for(const [y,z] of [[.47,-.12],[.47,.06],[.47,.24],[.75,-.24],[.93,-.27]])box(b,0,y,z,1.9,.05,.13,mats.wood);return asProp(b);
}
/** A street pressure station: the district system meeting human hands. */
export function pressureStation(g:T.Object3D,x:number,z:number,yaw=0,label='W7'){
  const p=new T.Group();p.position.set(x,0,z);p.rotation.y=yaw;g.add(p);
  box(p,0,.08,0,1.2,.16,.8,mats.stone);cyl(p,-.25,.75,0,.13,1.4,mats.copper);beam(p,V(-.25,1.45,0),V(.3,1.45,0),.11,mats.copper);cyl(p,.3,1.1,0,.24,.8,mats.teal);
  sphere(p,.3,1.55,0,.24,mats.brass);gauge(p,.3,1.12,.25,.2,label);wingedValve(p,-.25,.9,.16,.45,mats.brass);return p;
}
/** Pneumatic mail post: brass column, capsule window, tube into the ground. */
export function mailPost(g:T.Object3D,x:number,z:number){
  cyl(g,x,.9,z,.16,1.8,mats.brass);cyl(g,x,1.9,z,.22,.2,mats.teal);sphere(g,x,2.05,z,.14,mats.brass);cyl(g,x,1.25,z+.14,.08,.35,mats.aether).rotation.x=Math.PI/2;
  torus(g,x,.35,z,.19,.03,mats.iron).rotation.x=Math.PI/2;
}

/** Projecting shop display: a real 0.6 m bay with a dark interior shell, shelves and
 * a pendant lamp. Goods are placed by the property's level. */
export function shopDisplay(g:T.Object3D,x:number,z:number,w=2.3,h=2.3,frame:Material=mats.wood){
  const y0=.75,d=.62;
  box(g,x,y0/2,z+d/2,w+.36,y0,d+.06,mats.stone);box(g,x,y0+h/2,z+.04,w,h,.06,mats.dark);
  for(const dx of [-w/2-.07,w/2+.07])box(g,x+dx,y0+h/2,z+d/2,.14,h,d,frame);
  box(g,x,y0+h+.16,z+d/2+.03,w+.4,.32,d+.1,frame);box(g,x,y0+h+.36,z+d/2+.06,w+.55,.08,d+.18,mats.stone);
  for(const f of [.36,.7])box(g,x,y0+h*f,z+.26,w-.04,.05,.4,mats.wood);
  box(g,x,y0+h*.78,z+d-.02,w,.05,.05,frame);box(g,x,y0+h*.39,z+d-.02,.05,h*.78,.05,frame);
  cyl(g,x,y0+h-.15,z+.3,.012,.3,mats.iron);sphere(g,x,y0+h-.34,z+.3,.09,mats.glow);
  const pane=new T.Mesh(new T.PlaneGeometry(w,h),displayGlass);pane.position.set(x,y0+h/2,z+d-.01);g.add(pane);
}

/** Graphic grime: flat, hard-edged soot shapes (Borderlands-style ink wash, not texture). */
export const soot=new T.MeshBasicMaterial({color:'#262436',transparent:true,opacity:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
export function grimeSkirt(g:T.Object3D,x:number,z:number,w:number,h:number,seed:number,yaw=0){
  const sh=new T.Shape(),n=Math.max(4,Math.round(w/1.1));sh.moveTo(-w/2,0);
  for(let i=0;i<=n;i++){const t=i/n,v=Math.sin(seed*12.9+i*78.2)*43758.5;const r=v-Math.floor(v);sh.lineTo(-w/2+t*w,h*(.45+.55*r)*(i%2?1:.7));}
  sh.lineTo(w/2,0);sh.closePath();const m=new T.Mesh(new T.ShapeGeometry(sh),soot);m.position.set(x,0,z);m.rotation.y=yaw;g.add(m);return m;
}
/** A tapered soot streak running down from a sill, flue or joint. */
export function sootStreak(g:T.Object3D,x:number,y:number,z:number,w:number,len:number,yaw=0){
  const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(w/2,0);sh.lineTo(w*.18,-len);sh.lineTo(-w*.1,-len*.8);sh.closePath();
  const m=new T.Mesh(new T.ShapeGeometry(sh),soot);m.position.set(x,y,z);m.rotation.y=yaw;g.add(m);return m;
}

/** Painted wear: a two-tone wainscot, patched render and rust runs. Flat color shapes
 * that the ink pass outlines, so a light city still reads worn and worked-in. */
const wearOpts={transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1};
export const wainscot=new T.MeshBasicMaterial({color:'#4c5a55',opacity:.2,...wearOpts});
export const patchLight=new T.MeshBasicMaterial({color:'#fffaf0',opacity:.34,...wearOpts});
export const patchDark=new T.MeshBasicMaterial({color:'#51584b',opacity:.24,...wearOpts});
export const rustRun=new T.MeshBasicMaterial({color:'#a8603f',opacity:.3,...wearOpts});
// Render fallen away to the old brick beneath: the Lowworks' most legible poverty.
export const exposedBrick=new T.MeshBasicMaterial({color:'#b5735c',opacity:.6,...wearOpts});
const rnd=(n:number)=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
function quad(g:T.Object3D,x:number,y:number,z:number,w:number,h:number,m:T.Material,seed:number,yaw:number){
  const sh=new T.Shape(),j=(k:number)=>(rnd(seed+k)-.5)*.35;sh.moveTo(-w/2+j(1)*w*.3,-h/2+j(2));sh.lineTo(w/2+j(3),-h/2+j(4)*.5);sh.lineTo(w/2+j(5)*.6,h/2+j(6));sh.lineTo(-w/2+j(7),h/2+j(8)*.4);sh.closePath();
  const mesh=new T.Mesh(new T.ShapeGeometry(sh),m);mesh.position.set(x,y,z);mesh.rotation.y=yaw;g.add(mesh);}
export function paintedWear(g:T.Object3D,x:number,z:number,w:number,h:number,seed:number,yaw=0,band=1.25){
  const b=new T.Mesh(new T.PlaneGeometry(w,band),wainscot);b.position.set(x,band/2,z);b.rotation.y=yaw;g.add(b);
  const count=Math.max(3,Math.round(w/3));
  for(let i=0;i<count;i++){const px=x+(rnd(seed+i*3)-.5)*(w-2),py=1.6+rnd(seed+i*5)*Math.max(1,h-3.5),pw=1.4+rnd(seed+i*7)*2.8,ph=.9+rnd(seed+i*11)*1.8;
    quad(g,Math.cos(yaw)*(px-x)+x,py,z-Math.sin(yaw)*(px-x),pw,ph,i%3===1?patchDark:i%3===2?exposedBrick:patchLight,seed+i*13,yaw);}
}
export function rustStreak(g:T.Object3D,x:number,y:number,z:number,len:number,yaw=0){
  const sh=new T.Shape();sh.moveTo(-.12,0);sh.lineTo(.12,0);sh.lineTo(.05,-len);sh.lineTo(-.02,-len*.85);sh.closePath();
  const m=new T.Mesh(new T.ShapeGeometry(sh),rustRun);m.position.set(x,y,z);m.rotation.y=yaw;g.add(m);}

/** Three printed civic posters: flat graphic shapes, readable as posters at a glance. */
export const posters=[0,1,2].map(i=>{const c=document.createElement('canvas');c.width=256;c.height=384;const x=c.getContext('2d')!;
  x.fillStyle=['#efe4cc','#2f5f66','#d99a5a'][i];x.fillRect(0,0,256,384);x.fillStyle=['#b0503f','#f1e5c8','#2b3440'][i];
  if(i===0){x.beginPath();x.arc(128,150,86,0,Math.PI*2);x.fill();x.fillStyle='#efe4cc';for(const dx of [-30,0,30])x.fillRect(128+dx-7,110-(dx?0:20),14,dx?90:110);}
  if(i===1){for(let k=0;k<5;k++)x.fillRect(0,40+k*40,256,16);x.beginPath();x.moveTo(128,240);x.lineTo(200,330);x.lineTo(56,330);x.fill();}
  if(i===2){x.beginPath();x.moveTo(128,50);x.lineTo(210,200);x.lineTo(128,350);x.lineTo(46,200);x.closePath();x.fill();x.fillStyle='#d99a5a';x.beginPath();x.arc(128,200,40,0,Math.PI*2);x.fill();}
  x.fillStyle=['#2b3440','#f1e5c8','#2b3440'][i];x.font='900 34px sans-serif';x.textAlign='center';x.fillText(['TERRA FAIR','PRESSURE','AETHER'][i],128,i===1?372:30+(i?0:334));
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=16;return printed(illustrated(new T.MeshStandardMaterial({map:t})));});
export function poster(g:T.Object3D,x:number,y:number,z:number,i:number,yaw=0,tilt=0){const m=new T.Mesh(new T.PlaneGeometry(.8,1.2),posters[i%3]);m.position.set(x,y,z);m.rotation.set(0,yaw,tilt);g.add(m);return m;}
/** Domestic gas/pressure meter: a small cabinet with a dial, pipe stubs to the ground. */
export function meterBox(g:T.Object3D,x:number,y:number,z:number){box(g,x,y,z,.55,.7,.28,mats.teal);box(g,x,y+.4,z+.02,.62,.08,.34,mats.stone);const d=cyl(g,x,y+.08,z+.15,.13,.03,mats.cream);d.rotation.x=Math.PI/2;torus(g,x,y+.08,z+.16,.13,.02,mats.brass);cyl(g,x-.12,y/2-.2,z,.035,y-.3,mats.copper);}

/** Stencilled cargo labels on painted crate wood: every crate says where it came from. */
const stencilAtlas=new Atlas(map=>thinLine(printed(illustrated(new T.MeshStandardMaterial({map})))),2048);
const stencilCache=new Map<string,Placed<T.MeshStandardMaterial>>();
function stencil(text:string,wood:string){const key=text+wood;let m=stencilCache.get(key);if(m)return m;const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d')!;
  x.fillStyle=wood;x.fillRect(0,0,256,256);for(let i=0;i<5;i++){x.strokeStyle='rgba(40,28,20,.55)';x.lineWidth=3;x.beginPath();x.moveTo(0,i*51+2);x.lineTo(256,i*51+2);x.stroke();}
  x.strokeStyle='rgba(40,28,20,.7)';x.lineWidth=10;x.strokeRect(5,5,246,246);x.beginPath();x.moveTo(10,10);x.lineTo(246,246);x.stroke();
  x.fillStyle='rgba(30,26,24,.82)';x.font='900 40px "Courier New",monospace';x.textAlign='center';x.textBaseline='middle';text.split('/').forEach((l,i,a)=>x.fillText(l,128,128+(i-(a.length-1)/2)*42,220));
  m=stencilAtlas.add(c);stencilCache.set(key,m);return m;}
export function labeledCrate(g:T.Object3D,x:number,y:number,z:number,s:number,text:string,yaw=0,wood='#b08a5c'){const st=stencil(text,wood),m=new T.Mesh(place(new T.BoxGeometry(s,s,s),st.rect),st.material);m.position.set(x,y+s/2,z);m.rotation.y=yaw;g.add(m);return m;}
export function stencilBarrel(g0:T.Object3D,x:number,z:number,text:string,y=0){const g=new T.Group();g0.add(g);const st=stencil(text,'#6f5a44'),m=new T.Mesh(place(new T.CylinderGeometry(.4,.4,1.05,14),st.rect),st.material);m.position.set(x,y+.53,z);g.add(m);for(const yy of [.12,.5,.9])cyl(g,x,y+yy,z,.43,.07,mats.iron);cyl(g,x,y+1.07,z,.37,.02,mats.wood);asProp(g);}
export function stove(g:T.Object3D,x:number,z:number,yaw=0){const s=new T.Group();s.position.set(x,0,z);s.rotation.y=yaw;g.add(s);box(s,0,.55,0,.9,.8,.7,mats.iron);for(const dx of [-.38,.38])for(const dz of [-.28,.28])box(s,dx,.08,dz,.1,.16,.1,mats.iron);
  box(s,0,.98,0,1,.08,.8,mats.iron);box(s,0,.5,.36,.5,.4,.02,artMats.ember);for(let k=0;k<4;k++)box(s,-.2+k*.13,.5,.38,.04,.4,.03,mats.iron);cyl(s,.25,1.9,-.2,.09,1.8,mats.iron);box(s,.25,2.8,-.2,.35,.08,.35,mats.iron);cyl(s,-.2,1.1,.1,.14,.2,mats.copper);asProp(s);}
export function workbench(g:T.Object3D,x:number,z:number,yaw=0){const b=new T.Group();b.position.set(x,0,z);b.rotation.y=yaw;g.add(b);box(b,0,.9,0,2,.12,.8,mats.wood);for(const dx of [-.9,.9])for(const dz of [-.32,.32])box(b,dx,.45,dz,.1,.9,.1,mats.wood);box(b,0,.3,0,1.9,.06,.7,mats.wood);
  box(b,-.7,1.05,.3,.25,.18,.2,mats.iron);cyl(b,-.7,1.05,.45,.03,.3,mats.iron).rotation.x=Math.PI/2;box(b,.3,.98,.1,.5,.05,.08,mats.iron);box(b,.6,.99,-.1,.08,.08,.35,mats.wood);
  box(b,0,1.8,-.42,2,1.4,.05,mats.wood);for(let k=0;k<5;k++){const hx=-.8+k*.4;cyl(b,hx,1.9,-.36,.015,.12,mats.iron).rotation.x=Math.PI/2;box(b,hx,1.7,-.36,.05,[.35,.5,.3,.45,.4][k],.03,k%2?mats.iron:mats.wood);}sphere(b,.7,2.5,-.3,.1,mats.glow);asProp(b);}
export function cafeTable(g:T.Object3D,x:number,z:number,seed=0){const t=new T.Group();t.position.set(x,0,z);g.add(t);cyl(t,0,.38,0,.05,.76,mats.iron);cyl(t,0,.04,0,.3,.06,mats.iron);cyl(t,0,.77,0,.45,.04,mats.wood);
  for(let k=0;k<2;k++){const a=k*Math.PI+seed;const cx=Math.sin(a)*.72,cz=Math.cos(a)*.72;const c=new T.Group();c.position.set(cx,0,cz);c.rotation.y=a+Math.PI;t.add(c);box(c,0,.45,0,.42,.05,.42,mats.wood);box(c,0,.75,-.2,.42,.55,.04,mats.wood);for(const dx of [-.18,.18])for(const dz of [-.18,.18])cyl(c,dx,.22,dz,.02,.45,mats.iron);}
  for(let k=0;k<3;k++){cyl(t,-.2+k*.18,.9,(k%2)*.12,.04,.22,k===1?mats.teal:mats.brass);}cyl(t,.15,.83,-.15,.08,.08,mats.cream);asProp(t);}
export function anvil(g0:T.Object3D,x:number,z:number){const g=new T.Group();g0.add(g);box(g,x,.3,z,.5,.6,.5,mats.wood);box(g,x,.7,z,.55,.2,.3,mats.iron);box(g,x+.35,.72,z,.3,.12,.2,mats.iron);box(g,x-.25,.75,z,.15,.18,.3,mats.iron);asProp(g);}
export function pipeStack(g:T.Object3D,x:number,z:number,yaw=0){const p=new T.Group();p.position.set(x,0,z);p.rotation.y=yaw;g.add(p);let k=0;for(let row=0;row<3;row++)for(let i=0;i<4-row;i++,k++){const c=cyl(p,-.45+i*.3+row*.15,.16+row*.27,0,.13,2.2,k%3?mats.rust:mats.copper);c.rotation.x=Math.PI/2;}
  for(let i=0;i<3;i++){const e=torus(p,.9,.2+i*.02,.5+i*.35,.18,.07,mats.iron);e.rotation.x=Math.PI/2;}asProp(p);}
