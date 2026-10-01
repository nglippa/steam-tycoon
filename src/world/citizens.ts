import * as T from 'three';
import { palette as P, wardrobes, type Archetype } from './palette';
import { box, cyl, sphere, torus, bake, mats, thinLine, type Material } from './assets';
import { painted } from './tone';

const ramp = new T.DataTexture(new Uint8Array([128, 202, 255]), 3, 1, T.RedFormat);
ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.generateMipmaps = false; ramp.needsUpdate = true;
const toon = (color: T.ColorRepresentation) => new T.MeshToonMaterial({ color, gradientMap: ramp });
const skinColors = P.skin;
const skin = skinColors.map(toon);
const hair = P.hair.map(toon);
for(const m of [...skin,...hair])m.userData.plain=true;
const boot = toon(P.neutral.ink), brass = toon(P.metal.brass), ivory = toon(P.neutral.paper);
brass.userData.plain=true;
/** Worn cloth: side seams, stitched hems, hatching and grime, inked by hand. u wraps
 * the body (0 = centre front), v runs along each tailored piece. */
function clothMap(){const W=256,c=document.createElement('canvas');c.width=c.height=W;const x=c.getContext('2d')!;
  x.fillStyle='#f4f0e6';x.fillRect(0,0,W,W);
  for(let i=0;i<40;i++){x.strokeStyle='rgba(60,45,35,.12)';x.lineWidth=1.2;const px=Math.random()*W,py=Math.random()*W;x.beginPath();x.moveTo(px,py);x.lineTo(px+10,py+14);x.stroke();}
  for(const u of [.25,.75]){x.strokeStyle='rgba(35,28,24,.75)';x.lineWidth=3;x.beginPath();x.moveTo(u*W,0);x.lineTo(u*W,W);x.stroke();
    x.setLineDash([4,5]);x.lineWidth=1.4;x.strokeStyle='rgba(35,28,24,.5)';x.beginPath();x.moveTo(u*W+6,0);x.lineTo(u*W+6,W);x.stroke();x.setLineDash([]);}
  for(const v of [.06,.94]){x.setLineDash([5,5]);x.strokeStyle='rgba(35,28,24,.55)';x.lineWidth=1.6;x.beginPath();x.moveTo(0,v*W);x.lineTo(W,v*W);x.stroke();x.setLineDash([]);}
  const g=x.createLinearGradient(0,W*.72,0,W);g.addColorStop(0,'rgba(70,55,40,0)');g.addColorStop(1,'rgba(70,55,40,.35)');x.fillStyle=g;x.fillRect(0,0,W,W);
  for(let i=0;i<3;i++){x.fillStyle='rgba(255,250,235,.22)';x.fillRect(Math.random()*W,Math.random()*W,18,12);x.strokeStyle='rgba(35,28,24,.45)';x.lineWidth=1;x.setLineDash([2,3]);x.strokeRect(Math.random()*W,Math.random()*W,16,11);x.setLineDash([]);}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
const coloredToon = new T.MeshToonMaterial({ vertexColors:true, gradientMap:ramp, map:clothMap() });
const wardrobePhase={value:0};
const wardrobeHook=(shader:{uniforms:Record<string,T.IUniform>;vertexShader:string})=>{
  shader.uniforms.wardrobePhase=wardrobePhase;
  shader.vertexShader='attribute vec3 restoredColor; uniform float wardrobePhase;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nvColor=mix(vColor,restoredColor,wardrobePhase);');
};
coloredToon.onBeforeCompile=wardrobeHook;
coloredToon.customProgramCacheKey=()=> 'terra-wardrobe-colors';
painted(coloredToon);thinLine(coloredToon);
// Hair, skin and metal share the wardrobe shader but not the stitched cloth texture.
const plainToon=new T.MeshToonMaterial({vertexColors:true,gradientMap:ramp});
plainToon.onBeforeCompile=wardrobeHook;plainToon.customProgramCacheKey=()=> 'terra-wardrobe-plain';painted(plainToon);thinLine(plainToon);
export function setCitizenProsperity(stage:number){wardrobePhase.value=Math.min(1,stage/5);}
const wardrobeMaterials=new Map<string,T.MeshToonMaterial>();
function outfitMaterial(early:string,late=early){const key=early+late;let m=wardrobeMaterials.get(key);if(!m){m=toon(early);m.userData.restoredColor=late;wardrobeMaterials.set(key,m);}return m;}
export const expressions=['neutral','happy','tired','focused','annoyed','blink','surprised'] as const;
export type Expression=typeof expressions[number];

// Elliptical rings make a continuous tailored silhouette instead of stacked boxes.
function tailored(g:T.Object3D, rings:number[][], material:Material, segments=10, start=0, arc=Math.PI*2) {
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  rings.forEach(([y,w,d,oz=0],j)=>{for(let i=0;i<=segments;i++){const a=start+i/segments*arc;positions.push(Math.sin(a)*w,y,Math.cos(a)*d+oz);uv.push(i/segments,j/(rings.length-1));}});
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;if(rings[1][0]>rings[0][0])indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,material);g.add(mesh);return mesh;
}
function panel(g:T.Object3D,points:number[][],z:number,material:Material){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const mesh=new T.Mesh(new T.ShapeGeometry(shape),material);mesh.position.z=z;g.add(mesh);return mesh;}
function bakeCharacter(group:T.Group){
  group.traverse(object=>{
    if(!(object instanceof T.Mesh)||!(object.material instanceof T.MeshToonMaterial)||object.material.map)return;
    const geometry=object.geometry.clone(),color=object.material.color,colors=new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
    geometry.setAttribute('color',new T.BufferAttribute(colors,3));
    const restored=new T.Color(object.material.userData.restoredColor??color),late=new Float32Array(colors.length);
    for(let i=0;i<late.length;i+=3){late[i]=restored.r;late[i+1]=restored.g;late[i+2]=restored.b;}
    geometry.setAttribute('restoredColor',new T.BufferAttribute(late,3));object.geometry=geometry;object.material=object.material.userData.plain?plainToon:coloredToon;
  });return bake(group);
}
// One atlas per skin tone: eight face types (rows) by five expressions and a blink (columns).
// Types vary eye shape, brows, nose, mouth and marks independently, so a crowd reads as
// different people drawn by one hand (figure-construction: faces). The expression column
// comes from the BatchedMesh instance colour channel; the type row comes from the UVs.
export const FACE_TYPES = 8;
type Nose = 'dash' | 'dot' | 'hook' | 'button'; type Mark = 'none' | 'freckles' | 'stubble' | 'mole' | 'bags' | 'scar' | 'lines';
const faceTypes: { rise: number; w: number; tilt: number; lash: number; iris: string; brow: [thick: number, arch: number, tilt: number]; nose: Nose; mouth: number; marks: Mark }[] = [
  { rise: 64, w: 33, tilt: 2, lash: 11, iris: '#3d6b9a', brow: [5, 8, 0], nose: 'dash', mouth: 1, marks: 'none' },
  { rise: 69, w: 34, tilt: 6, lash: 12, iris: '#7a4b35', brow: [4, 11, -2], nose: 'dot', mouth: .8, marks: 'freckles' },
  { rise: 53, w: 35, tilt: -3, lash: 10, iris: '#2f7f72', brow: [7, 4, 3], nose: 'hook', mouth: 1.15, marks: 'none' },
  { rise: 62, w: 32, tilt: 4, lash: 12, iris: '#6d4a86', brow: [4, 10, -2], nose: 'button', mouth: .85, marks: 'mole' },
  { rise: 57, w: 34, tilt: -6, lash: 10, iris: '#56606e', brow: [6, 5, 4], nose: 'dash', mouth: 1.05, marks: 'bags' },
  { rise: 72, w: 32, tilt: 3, lash: 11, iris: '#8a6a2a', brow: [4, 12, 0], nose: 'dot', mouth: .75, marks: 'none' },
  { rise: 55, w: 35, tilt: 5, lash: 10, iris: '#3b5b3a', brow: [7, 3, -4], nose: 'hook', mouth: 1.1, marks: 'scar' },
  { rise: 65, w: 33, tilt: -1, lash: 11, iris: '#8c3f46', brow: [5, 8, 2], nose: 'button', mouth: .95, marks: 'none' },
];
const faces=skinColors.map(tone=>{
  const canvas=document.createElement('canvas');canvas.width=1792;canvas.height=256*FACE_TYPES;const c=canvas.getContext('2d')!;
  for(let type=0;type<FACE_TYPES;type++)for(let state=0;state<7;state++){
    const f=faceTypes[type];
    c.save();c.translate(state*256,type*256);c.scale(.5,.5);c.fillStyle=tone;c.fillRect(0,0,512,512);c.lineCap='round';c.lineJoin='round';
    const ink=P.neutral.ink,closed=state===5||state===1,y=300;
    // A face is skin, two eyes, brows and a mouth. Anything more has to earn its place (figure-construction: faces).
    // Soft cheek colour under every expression; happiness warms it.
    for(const side of [-1,1]){const blush=c.createRadialGradient(256+side*66,y+50,2,256+side*66,y+50,30);blush.addColorStop(0,state===1?'rgba(240,132,138,.42)':'rgba(238,143,138,.2)');blush.addColorStop(1,'rgba(238,143,138,0)');c.fillStyle=blush;c.fillRect(256+side*66-32,y+18,64,64);}
    // Marks: the small particular things that make a stranger someone.
    if(f.marks==='freckles'){c.fillStyle='rgba(120,62,44,.55)';for(const side of [-1,1])for(let k=0;k<7;k++){c.beginPath();c.arc(256+side*(44+(k*13)%34),y+40+(k*7)%18,2.6,0,Math.PI*2);c.fill();}}
    if(f.marks==='stubble'){c.fillStyle='rgba(40,30,32,.22)';for(let k=0;k<140;k++){const a=(k*2.399)%Math.PI,r=78+(k*7)%40;c.fillRect(256+Math.cos(a)*r*.95-1,382+Math.sin(a)*r*.55-1,2.4,2.4);}}
    if(f.marks==='mole'){c.fillStyle='#3a2426';c.beginPath();c.arc(300,372,4.2,0,Math.PI*2);c.fill();}
    if(f.marks==='bags'){c.strokeStyle='rgba(70,44,48,.28)';c.lineWidth=2;for(const side of [-1,1]){c.beginPath();c.moveTo(256+side*28,y+38);c.quadraticCurveTo(256+side*52,y+48,256+side*76,y+36);c.stroke();}}
    if(f.marks==='scar'){c.strokeStyle='rgba(150,72,72,.5)';c.lineWidth=3;c.beginPath();c.moveTo(196,250);c.lineTo(204,286);c.stroke();}
    if(f.marks==='lines'){c.strokeStyle='rgba(70,44,48,.42)';c.lineWidth=2.4;for(const side of [-1,1]){c.beginPath();c.moveTo(256+side*18,y+50);c.quadraticCurveTo(256+side*34,y+74,256+side*30,y+92);c.stroke();}}
    for(const side of [-1,1]){
      const surprised=state===6,x=256+side*50,w=f.w,rise=f.rise*(state===3?.72:state===4?.6:surprised?1.25:1),lid=state===2?.52:0,up=f.tilt;
      const outer=x+side*w,inner=x-side*w;
      if(closed){c.strokeStyle=ink;c.lineWidth=6;c.beginPath();
        if(state===1){c.moveTo(inner,y-4);c.quadraticCurveTo(x,y-40,outer,y-6-up);}else{c.moveTo(inner,y-10);c.quadraticCurveTo(x,y+10,outer+side*4,y-14-up);}
        c.stroke();}
      else{
        // Tall anime eyes: the opening is nearly as high as it is wide, the iris fills it, and the
        // upper lid covers the top of the iris so it never floats.
        const drop=30,lidPath=()=>{c.beginPath();c.moveTo(inner,y-2);c.quadraticCurveTo(x-side*4,y-rise*1.25,outer,y-8-up);c.quadraticCurveTo(x+side*4,y+drop*1.9,inner,y-2);c.closePath();};
        c.save();lidPath();c.fillStyle='#fbf6ea';c.fill();c.clip();
        const ix=x-side*2,iy=y-rise*.2,rx=surprised?18:25,ry=surprised?24:rise*.66;
        const iris=c.createLinearGradient(0,iy-ry,0,iy+ry);const pale=new T.Color(f.iris).lerp(new T.Color('#fff4dc'),.45).getStyle();iris.addColorStop(0,'#15122a');iris.addColorStop(.38,f.iris);iris.addColorStop(1,pale);
        c.fillStyle=iris;c.beginPath();c.ellipse(ix,iy,rx,ry,0,0,Math.PI*2);c.fill();
        c.strokeStyle='rgba(18,15,30,.75)';c.lineWidth=3;c.beginPath();c.ellipse(ix,iy,rx,ry,0,0,Math.PI*2);c.stroke();
        c.fillStyle='#120f1e';c.beginPath();c.ellipse(ix,iy-ry*.08,rx*.46,ry*.5,0,0,Math.PI*2);c.fill();
        c.fillStyle='#ffffff';c.beginPath();c.ellipse(ix-side*-7-8,iy-ry*.42,7.5,9,0,0,Math.PI*2);c.fill();c.beginPath();c.arc(ix+9,iy+ry*.46,3.2,0,Math.PI*2);c.fill();
        // The lid's shadow on the top of the eye keeps it seated in the head.
        c.fillStyle='rgba(22,16,34,.34)';c.fillRect(inner-40,y-rise*1.3,120,rise*.5);
        if(lid){c.fillStyle=tone;c.fillRect(inner-40,y-rise*1.3,120,rise*.72);}
        c.restore();
        // One confident upper lash line with a small outer flick; a hairline for the lower lid.
        c.strokeStyle='#120f16';c.lineWidth=f.lash;c.beginPath();
        const top=lid?y-rise*.2:y-rise*.64;
        c.moveTo(inner-side*1,y-3);c.quadraticCurveTo(x-side*4,top*2-(y-3+y-8-up)/2,outer,y-8-up);c.lineTo(outer+side*(f.lash>9?8:5),y-15-up*1.3);c.stroke();
        c.strokeStyle='rgba(18,15,22,.55)';c.lineWidth=2;c.beginPath();c.moveTo(outer-side*3,y-2);c.quadraticCurveTo(x+side*6,y+drop*.92,x-side*10,y+drop*.86);c.stroke();
      }
      // Brows: thickness, arch and set vary by face; emotion lives in their angle.
      const slant=state===4?side*-13:state===3?side*-7:state===2?side*6:state===1?side*4:surprised?-12:0,[thick,arch,set]=f.brow;
      const by=y-f.rise*.64-26;c.strokeStyle='rgba(28,20,24,.9)';c.lineWidth=thick;c.beginPath();c.moveTo(inner+side*4,by+slant+set);c.quadraticCurveTo(x,by-arch-(surprised?8:0),outer-side*2,by-slant*.4-set*.5);c.stroke();
    }
    // Nose: halfway between the tops of the eyes and the chin (figure-construction: faces).
    c.strokeStyle='rgba(150,96,88,.75)';c.lineWidth=2.6;c.fillStyle='rgba(150,96,88,.75)';
    if(f.nose==='dash'){c.beginPath();c.moveTo(259,352);c.lineTo(256,359);c.stroke();}
    if(f.nose==='dot'){c.beginPath();c.ellipse(257,356,2.8,2.2,0,0,Math.PI*2);c.fill();}
    if(f.nose==='hook'){c.beginPath();c.moveTo(262,340);c.quadraticCurveTo(266,354,256,360);c.stroke();}
    if(f.nose==='button'){c.beginPath();c.moveTo(251,354);c.quadraticCurveTo(257,361,263,354);c.stroke();}
    // Mouth: slightly above halfway between nose and chin; its width varies by face.
    const m=f.mouth;c.strokeStyle='#4a2a30';c.lineWidth=4.5;
    if(state===1){c.fillStyle='#8c3a47';c.beginPath();c.moveTo(256-14*m,384);c.quadraticCurveTo(256,406,256+14*m,384);c.closePath();c.fill();c.fillStyle='#e0848a';c.beginPath();c.ellipse(256,395,7*m,3.4,0,0,Math.PI*2);c.fill();}
    else if(state===6){c.fillStyle='#6c3b45';c.beginPath();c.ellipse(256,390,7,9,0,0,Math.PI*2);c.fill();}
    else{c.beginPath();c.moveTo(256-9*m,388);c.quadraticCurveTo(256,state===4?383:state===2?388:393,256+9*m,388);c.stroke();}
    c.restore();
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=true;map.minFilter=T.LinearMipmapLinearFilter;map.anisotropy=8;
  const m=new T.MeshToonMaterial({map,gradientMap:ramp,emissive:P.neutral.paper,emissiveMap:map,emissiveIntensity:.12});
  m.userData.faceAtlas=true;
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\n#ifdef USE_BATCHING_COLOR\nvColor=vec3(1.);vMapUv.x+=(batchingColor.r-1.)/7.;vEmissiveMapUv.x+=(batchingColor.r-1.)/7.;\n#endif');
  };
  m.customProgramCacheKey=()=> 'terra-expression-atlas';return thinLine(painted(m));
});
const contactShape=new T.CircleGeometry(.28,14);
const contactInk=new T.MeshBasicMaterial({color:'#253d40',transparent:true,opacity:.19,depthWrite:false});
function hairChunk(g:T.Group,points:number[][],z:number,depth:number,material:Material){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.018,bevelSize:.012,bevelSegments:2,curveSegments:4}),material);mesh.position.z=z;g.add(mesh);return mesh;}

const leather=toon(P.warm.leather),darkCloth=toon('#2c3148'),gloveInk=toon('#262a3c'),apronCanvas=toon('#c9b48f');
const lens=toon(P.aether.cyan),shadowHair=P.hair.map(c=>toon(new T.Color(c).multiplyScalar(.72)));
for(const m of [lens,...shadowHair])m.userData.plain=true;
/** Rings along the forward axis: a boot foot with a rounded, chunky toe. */
function foot(g:T.Object3D,y:number,material:Material,heavy:boolean){const f=heavy?1.12:1;
  const mesh=tailored(g,[[-.075,.046*f,.036],[-.05,.054*f,.052],[.03,.058*f,.05],[.1,.054*f,.04],[.15,.036*f,.028],[.172,.004,.004]],material,12);
  mesh.rotation.x=Math.PI/2;mesh.position.set(0,y,.035);return mesh;}
/** The guard's cap badge: a small brass shield on the band. */
function crestPin(g:T.Object3D){const shield=new T.Shape();shield.moveTo(-.035,.035);shield.lineTo(.035,.035);shield.lineTo(.035,0);shield.lineTo(0,-.04);shield.lineTo(-.035,0);shield.closePath();const m=new T.Mesh(new T.ShapeGeometry(shield),brass);m.position.set(0,.19,.235);g.add(m);}
/** A small relaxed hand in a C-curl: palm, one curled finger mass and a thumb, the "glove
 * shape" that reads as a hand both empty and around a handle (figure-construction: arms-hands). */
function hand(g:T.Object3D,material:Material,side:number){const inward=-side;
  tailored(g,[[-.232,.024,.03],[-.255,.028,.042],[-.29,.029,.045],[-.305,.026,.043]],material,8);
  const fingers=new T.Group();fingers.position.set(0,-.3,0);fingers.rotation.z=inward*1.05;g.add(fingers);
  tailored(fingers,[[.004,.025,.042],[-.03,.022,.04],[-.052,.016,.032],[-.064,.004,.01]],material,8);
  const thumb=new T.Group();thumb.position.set(inward*.012,-.262,.036);thumb.rotation.set(.55,0,inward*.7);g.add(thumb);
  tailored(thumb,[[0,.013,.014],[-.035,.012,.012],[-.05,.003,.004]],material,6);}
/** The grip socket: the palm centre inside the curl, in the forearm's frame. Held things are
 * authored with their grip point at their own origin and their handle along local z. */
function gripSocket(elbow:T.Object3D,side:number){const grip=new T.Group();grip.position.set(-side*.028,-.312,.004);elbow.add(grip);return grip;}

export function citizen(coat:Material=mats.rust,seed=0,archetype:Archetype='worker'){
  void coat;
  const group=new T.Group(),body=new T.Group();group.add(body);
  const contact=new T.Mesh(contactShape,contactInk);contact.rotation.x=-Math.PI/2;contact.position.y=-.10;contact.scale.y=.7;group.add(contact);
  const outfit=wardrobes[archetype][(seed+Math.floor(seed/3))%wardrobes[archetype].length];
  const cloth=outfitMaterial(outfit[0],outfit[3]),secondary=outfitMaterial(outfit[1]),accent=outfitMaterial(outfit[2]);
  const skinTone=seed%3,skinMat=skin[skinTone],variant=Math.floor(seed/6)%2;
  const dress=archetype==='resident'&&variant===0;
  // Each family chooses what builds its silhouette.
  const kit={
    worker:{shirt:secondary,trousers:darkCloth,sleeve:'rolled',coat:false,tails:'apron',boots:'heavy',hands:skinMat,hat:seed%2?'cap':'scarf'},
    engineer:{shirt:cloth,trousers:darkCloth,sleeve:'full',coat:true,tails:'coat',boots:'tall',hands:gloveInk,hat:'goggles'},
    merchant:{shirt:secondary,trousers:leather,sleeve:'puff',coat:false,tails:'skirt',boots:'soft',hands:skinMat,hat:seed%3===0?'top':seed%3===1?'bowler':'none'},
    guard:{shirt:cloth,trousers:darkCloth,sleeve:'full',coat:true,tails:'long',boots:'tall',hands:gloveInk,hat:'peak'},
    resident:{shirt:dress?cloth:secondary,trousers:dress?darkCloth:toon(P.cool.navy),sleeve:dress?'puff':'full',coat:!dress,tails:dress?'dress':'short',boots:'soft',hands:skinMat,hat:dress?'none':seed%3===1?'bowler':'none'},
    courier:{shirt:cloth,trousers:darkCloth,sleeve:'full',coat:true,tails:'short',boots:'heavy',hands:skinMat,hat:'cap'},
    ordinal:{shirt:cloth,trousers:darkCloth,sleeve:'full',coat:true,tails:'long',boots:'tall',hands:gloveInk,hat:'helm'},
  }[archetype];
  const top=kit.coat?cloth:kit.shirt;
  // Builds: slim, standard and sturdy frames change the silhouette at any distance.
  const k=archetype==='worker'||archetype==='guard'||archetype==='ordinal'?[1.16,1,1.1][seed%3]:[1,.9,1.08,1][seed%4];
  const kz=1+(k-1)*.8;
  const W=(rings:number[][])=>rings.map(([y,w,d,oz=0])=>[y,w*k,d*(1+(k-1)*.8),oz]);
  // Torso: ribcage mass from the belt up, with shoulder line, chest and a readable waist.
  tailored(body,W([[1.09,.15,.11],[1.13,.148+(k-1)*.12,.108],[1.24,.17,.118],[1.35,.2,.13],[1.42,.225,.126],[1.47,.212,.112],[1.52,.12,.085],[1.545,.06,.055]]),top,14);
  // Pelvis: a separate rigid mass in the trousers, not the shirt run down to the crotch.
  // Widest at the hip joints, set back into a seat (forward tilt), then turning under
  // into a closed crotch that the thighs leave from, so the legs start at a V, not a rim.
  tailored(body,W([[1.14,.146+(k-1)*.12,.108],[1.06,.162,.12,-.004],[.99,.18,.13,-.012],[.93,.172,.126,-.013],[.885,.126,.104,-.009],[.862,.058,.06,-.004],[.855,0,0,-.004]]),kit.trousers,14);
  tailored(body,[[1.5,.05,.047],[1.6,.04,.04],[1.7,.041,.04]],skinMat,10);
  // Belt at the waist, everyone: the clearest single read of an anime figure.
  tailored(body,W([[1.1,.156+(k-1)*.12,.114],[1.15,.154+(k-1)*.12,.113]]),archetype==='guard'||archetype==='engineer'||archetype==='ordinal'?gloveInk:leather,14);
  box(body,0,1.125,.117*kz,.05,.04,.012,brass);
  if(kit.coat){
    // Asymmetric double-breasted front, lapel and a standing collar.
    panel(body,[[.035,1.44],[.075,1.43],[.06,1.26],[.038,1.29]],.14*kz,accent);
    for(const y of [1.2,1.28,1.36])sphere(body,.085,y,.125*kz+.003,.014,brass);
    tailored(body,W([[1.5,.1,.08],[1.6,.108,.088]]),cloth,12,Math.PI*.3,Math.PI*1.4);
  } else {
    panel(body,[[-.05,1.5],[0,1.44],[.05,1.5],[0,1.53]],.1*kz,ivory);
  }
  // The Ordinance's high oxblood collar closes the throat.
  if(archetype==='ordinal')tailored(body,W([[1.47,.106,.092],[1.53,.112,.098],[1.6,.108,.094]]),accent,12);
  if(archetype==='guard'){
    const shield=new T.Shape();shield.moveTo(-.045,.05);shield.lineTo(.045,.05);shield.lineTo(.045,-.01);shield.lineTo(0,-.055);shield.lineTo(-.045,-.01);shield.closePath();
    const badge=new T.Mesh(new T.ShapeGeometry(shield),brass);badge.position.set(-.1,1.33,.128*kz+.004);body.add(badge);
    for(const x of [-.012,0,.012])box(body,-.1+x,1.335,.131*kz+.004,.006,x?.05:.07,.004,accent);
  }
  if(archetype==='merchant'){for(const side of [-1,1])tailored(body,W([[1.12,.157,.116],[1.24,.178,.126],[1.35,.207,.137],[1.43,.23,.133]]),cloth,6,side<0?-Math.PI*.45:Math.PI*.07,Math.PI*.38);const sash=box(body,0,1.24,.135*kz,.05,.46,.012,accent);sash.rotation.z=.6;torus(body,0,1.47,.07,.07,.01,brass).rotation.x=1.2;}
  if(kit.tails==='apron'){tailored(body,W([[1.38,.14,.132],[1.1,.16,.126]]),apronCanvas,10,-Math.PI*.42,Math.PI*.84);
    for(const x of [-.1,.1])box(body,x,.98,.15,.07,.08,.02,leather);}
  if(archetype==='engineer'||archetype==='courier'||(archetype==='worker'&&seed%3===0)){const strap=box(body,0,1.26,.126,.036,.62,.014,leather);strap.rotation.z=-.62;
    const bag=new T.Shape();bag.moveTo(-.09,.1);bag.lineTo(.09,.1);bag.quadraticCurveTo(.12,-.1,.06,-.12);bag.lineTo(-.06,-.12);bag.quadraticCurveTo(-.12,-.1,-.09,.1);
    const mesh=new T.Mesh(new T.ExtrudeGeometry(bag,{depth:.07,bevelEnabled:true,bevelThickness:.012,bevelSize:.014,bevelSegments:1}),leather);mesh.position.set(.2,1.0,.02);mesh.rotation.y=.35;body.add(mesh);box(body,.2,1.07,.1,.04,.035,.01,brass);}
  if(archetype==='engineer'){const strap=box(body,0,1.26,.126*kz+.006,.036,.62,.014,leather);strap.rotation.z=.62;for(const x of [-.1,.06])box(body,x,1.06,.13*kz,.07,.08,.05,leather);torus(body,-.1,1.07,.16*kz,.018,.006,brass);}
  bakeCharacter(body);
  // Coat tails, skirts and aprons hang from the waist and swing with motion.
  const tails=new T.Group();tails.position.y=1.08;body.add(tails);
  // Everything that hangs below the belt lives here, so the legs can push it (citizen-life: drape).
  // `skirt` records how far the hem hangs below the hip joint and how deep it is front to back at rest.
  const skirt={drop:0,depth:0};
  const flare=(length:number,width:number,mat:Material,start=0,arc=Math.PI*2)=>{skirt.drop=length-.1;skirt.depth=(.16+width*.6)*kz;return tailored(tails,W([[.02,.158+(k-1)*.12,.116],[-.12,.19+width*.2,.14+width*.15],[-length*.6,.2+width*.6,.15+width*.45],[-length,.21+width,.16+width*.6]]),mat,14,start,arc);};
  if(kit.tails==='apron'){skirt.drop=.36;skirt.depth=.13*kz;tailored(tails,W([[.02,.16,.126],[-.18,.2,.14],[-.46,.21,.13]]),apronCanvas,10,-Math.PI*.42,Math.PI*.84);}
  if(kit.tails==='coat')flare(.46,.05,cloth,Math.PI*.62,Math.PI*.76);
  if(kit.tails==='long')flare(.5,.1,cloth,Math.PI*.18,Math.PI*1.64);
  if(kit.tails==='skirt')flare(.42,.1,secondary);
  if(kit.tails==='dress')flare(.48,.14,cloth);
  if(kit.tails==='short')flare(.2,.02,top,Math.PI*.2,Math.PI*1.6);
  bakeCharacter(tails);
  const scarf=new T.Group();scarf.position.set(-.04,1.51,.1);body.add(scarf);
  if(kit.hat==='scarf'||archetype==='courier'||(archetype==='resident'&&!dress)){tailored(scarf,[[0,.095,.066],[.06,.09,.062]],accent);panel(scarf,[[-.07,.02],[.025,.01],[.01,-.25],[-.06,-.22]],.07,accent);}bakeCharacter(scarf);
  // Head and hair.
  const head=new T.Group();head.position.y=1.86;head.scale.setScalar(1.16);body.add(head);
  const jaw=.94+(seed*7%5)*.03;
  // Face type and skull shape vary independently of skin tone and of each other (shape language:
  // round reads soft, square reads steady, triangle reads sharp).
  const faceType=(seed*5+Math.floor(seed/3)*3+archetype.length)%FACE_TYPES,skullShape=(seed*11+Math.floor(seed/2))%3,taper=[.1,.16,.26][skullShape],cheek=[1.04,1,.97][skullShape];
  // Anime head: a round cranium, soft cheeks and a small chin carried forward.
  const rings=[[-.228,.048,.042,.034],[-.2,.092*jaw,.094,.026],[-.15,.126*jaw,.13,.012],[-.11,.145,.142,.004],[-.07,.163,.154,0],[.03,.18,.172,-.006],[.13,.168,.163,-.016],[.205,.112,.112,-.022],[.245,.004,.004,-.022]];
  const skull=tailored(head,rings,faces[skinTone],24,-Math.PI,Math.PI*2);
  const uv=skull.geometry.attributes.uv;for(let j=0;j<rings.length;j++)for(let i=0;i<=24;i++){uv.setX(j*25+i,uv.getX(j*25+i)/7);uv.setY(j*25+i,((Math.max(-.22,rings[j][0])+.22)/.465+FACE_TYPES-1-faceType)/FACE_TYPES);}
  // A soft head: the jaw narrows gently toward a small rounded chin and the front stays curved,
  // so no plane change is hard enough for the ink pass to draw a crease across the cheek.
  {const pos=skull.geometry.attributes.position;for(let i=0;i<pos.count;i++){let x=pos.getX(i),z=pos.getZ(i);const y=pos.getY(i),front=Math.max(0,z)/(.17);
    if(y<-.04){const t=Math.min(1,(-.04-y)/.19);x*=1-t*taper*Math.min(1,front*1.4);z*=1-t*.08;}
    if(y>-.1&&y<.04)x*=cheek;
    if(z>.14&&y>-.16&&y<.1)z=.14+(z-.14)*.75;
    pos.setXYZ(i,x,y,z);}skull.geometry.computeVertexNormals();}
  for(const side of [-1,1]){const ear=sphere(head,side*.177,-.035,-.005,.035,skinMat);ear.scale.set(.027,.046,.033);}
  const hairIndex=(seed*3+Math.floor(seed/4))%4,hairMat=hair[hairIndex],under=shadowHair[hairIndex],rawStyle=(seed*5+Math.floor(seed/8))%8,hatted=kit.hat==='cap'||kit.hat==='peak'||kit.hat==='helm'||kit.hat==='bowler'||kit.hat==='top',style=hatted&&(rawStyle===0||rawStyle===3||rawStyle===7)?1:rawStyle;
  const crown=new T.Mesh(new T.SphereGeometry(.212,20,10,0,Math.PI*2,0,Math.PI*.5),hairMat);crown.position.set(0,.075,-.02);crown.scale.set(1.06,style===7?1.15:1.02,1.02);head.add(crown);
  // Back mass wraps the whole rear of the skull down to the nape, so no scalp shows from behind.
  const backLength=style===1?-.22:style===5?-.16:-.17;
  tailored(head,[[.16,.2,.2],[.04,.222,.218],[-.08,.2,.2],[backLength,style===1?.19:.15,style===1?.17:.14]],under,14,Math.PI*.42,Math.PI*1.16);
  const fringe=[
    [[-.21,.08],[-.2,.22],[.2,.22],[.21,.06],[.16,.12],[.12,.05],[.07,.13],[.02,.04],[-.04,.13],[-.09,.05],[-.14,.12]],
    [[-.21,.02],[-.2,.22],[.2,.22],[.21,.02],[.12,.1],[.04,.07],[-.05,.1],[-.13,.07]],
    [[-.21,.07],[-.19,.22],[.2,.22],[.21,.1],[.1,.15],[.05,.06],[-.06,.14],[-.02,.05],[-.12,.1]],
    [[-.21,-.06],[-.2,.22],[.2,.22],[.21,.12],[.12,.16],[.02,.1],[-.08,.03],[-.15,-.04]],
  ][style===4?3:style%3];
  // Under a hat the fringe stops at the band and the crown tucks in, so nothing pokes through.
  hairChunk(head,hatted?fringe.map(([x,y])=>[x*.97,Math.min(y,.12)]):fringe,.12,.06,hairMat);
  if(hatted)crown.scale.set(.98,.9,.98);
  // Side locks: two tapered strands per side, each a clean point, framing the face.
  const lock=(side:number,len:number)=>{const L=.16-len;for(const [x,z,l,w,rx] of [[side*.192,.05,L,.058,Math.PI+.06],[side*.178,.125,L*.78,.045,Math.PI+.2]] as const){const m=new T.Mesh(new T.ConeGeometry(w,l,6),hairMat);m.position.set(x,.15-l/2,z);m.rotation.set(rx,0,-side*.09);m.scale.z=.5;head.add(m);}};
  if(style!==0&&style!==7)for(const side of [-1,1])lock(side,style===1||style===5?-.2:style===4&&side<0?-.16:-.1);
  if(style===0)for(let i=0;i<7;i++){const a=-1.2+i*.4;const spike=new T.Mesh(new T.ConeGeometry(.05,.14,5),hairMat);spike.position.set(Math.sin(a)*.18,.2-Math.abs(a)*.04,Math.cos(a)*-.13);spike.rotation.set(-.9*Math.cos(a),0,-a*.5);head.add(spike);}
  if(style===7)for(let i=0;i<9;i++){const a=i/9*Math.PI*2;sphere(head,Math.sin(a)*.2,.1+Math.cos(a*2)*.04,Math.cos(a)*.17-.03,.075,hairMat);}
  // Separate locks break the cap: a fanned back mass with gaps, and a crown tuft.
  const lockCone=(x:number,y:number,z:number,len:number,wid:number,rx:number,rz:number,mat=hairMat)=>{const m=new T.Mesh(new T.ConeGeometry(wid,len,5),mat);m.position.set(x,y,z);m.rotation.set(rx,0,rz);m.scale.z=.45;head.add(m);};
  if(style!==3&&style!==7&&style!==5){for(const [x,rz,len] of [[-.12,-.35,.26],[0,0,.3],[.12,.35,.24]] as const)lockCone(x,-.08,-.17,len,.07,Math.PI+.35,rz,under);}
  if(seed%3===0&&kit.hat==='none')lockCone(.02,.29,.02,.14,.03,-.5,-.35);
  if(style===1||style===4)for(const side of [-1,1])lockCone(side*.13,.1,.17,.16,.05,Math.PI-.25,side*.25);
  if(style===3){const bun=sphere(head,0,.25,-.1,1,hairMat);bun.scale.set(.1,.09,.1);torus(head,0,.2,-.09,.07,.014,accent).rotation.x=-1.1;}
  bakeCharacter(head);
  // Ponytails and long hair swing from their own pivot.
  const swing=new T.Group();swing.position.set(0,.1,-.2);head.add(swing);
  if(style===2){torus(swing,0,.02,0,.045,.018,accent);tailored(swing,[[0,.06,.055],[-.12,.085,.065],[-.3,.06,.04],[-.42,.012,.012]],hairMat,10).rotation.x=-.2;}
  if(style===5)tailored(swing,[[0,.19,.08],[-.2,.19,.07],[-.4,.15,.05],[-.47,.06,.02]],hairMat,12,Math.PI*.55,Math.PI*.9).position.z=.14;
  if(style===6)for(const side of [-1,1]){const t=tailored(swing,[[0,.045,.045],[-.1,.06,.055],[-.26,.04,.035],[-.33,.01,.01]],hairMat,8);t.position.set(side*.17,-.08,.12);sphere(swing,side*.17,-.07,.12,.03,accent);}
  bakeCharacter(swing);
  // Headwear sits on top of the hair silhouette, never replacing it.
  const hat=new T.Group();head.add(hat);
  // Headwear from turned profiles: clean crowns, a band, and a shaped visor or brim.
  const turned=(pts:number[][],mat:Material,y:number,sx=1,sz=.96)=>{const m=new T.Mesh(new T.LatheGeometry(pts.map(([r,h])=>new T.Vector2(r,h)),24),mat);m.position.y=y;m.scale.set(sx,1,sz);hat.add(m);return m;};
  const visor=(w:number,d:number,y:number,z:number,tilt:number,mat:Material)=>{const sh=new T.Shape();const n=12;for(let i=0;i<=n;i++){const a=-Math.PI/2+i/n*Math.PI;const px=Math.sin(a)*w,py=Math.cos(a)*d;i?sh.lineTo(px,py):sh.moveTo(px,py);}for(let i=n;i>=0;i--){const a=-Math.PI/2+i/n*Math.PI;sh.lineTo(Math.sin(a)*w*.92,Math.cos(a)*d*.15);}sh.closePath();
    const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.014,bevelEnabled:false,curveSegments:12}),mat);m.rotation.x=Math.PI/2+tilt;m.position.set(0,y,z);hat.add(m);return m;};
  if(kit.hat==='peak'){// Guard's kepi: tight band, crown flaring to a flat top, visor pitched down.
    const k=turned([[.226,0],[.23,.06],[.262,.15],[.268,.18],[.255,.195],[0,.2]],darkCloth,.11);k.rotation.x=-.07;
    turned([[.229,0],[.231,.045],[0,.045]],brass,.115);visor(.2,.13,.125,.17,.38,boot);crestPin(hat);}
  if(kit.hat==='helm'){// Ordinance helm: a hard dome that sweeps into a flared neck guard, a
    // blunt brow ridge and a thin iron crest. Reads as occupation at any distance.
    const dome=turned([[.238,0],[.25,.07],[.246,.15],[.2,.23],[.11,.275],[0,.285]],darkCloth,.08,1.02,1.06);dome.rotation.x=-.05;
    const flare=turned([[.3,0],[.27,.03],[.24,.07]],darkCloth,.07,1,1.12);flare.position.z=-.03;flare.rotation.x=.2;
    visor(.21,.1,.1,.2,.12,boot);box(hat,0,.37,-.02,.03,.13,.44,boot);box(hat,0,.31,.2,.032,.05,.06,accent);turned([[.241,0],[.243,.03],[0,.03]],accent,.1);}
  if(kit.hat==='cap'){// Newsboy cap: soft crown pulled forward over the brow, short stiff peak.
    const c=turned([[.228,0],[.262,.045],[.272,.085],[.24,.125],[.13,.155],[0,.16]],cloth,.1,1.04,1.02);c.position.z=.025;c.rotation.x=.14;sphere(hat,0,.265,.02,.022,cloth);visor(.17,.12,.12,.19,.3,darkCloth);}
  if(kit.hat==='bowler'){// Bowler: round dome, curled narrow brim.
    turned([[.232,0],[.238,.07],[.222,.15],[.165,.205],[.08,.228],[0,.232]],boot,.12);turned([[.228,0],[.231,.03],[0,.03]],darkCloth,.125);
    turned([[.23,0],[.33,-.004],[.345,.02],[.335,.028],[.232,.012]],boot,.12,1,.92);}
  if(kit.hat==='top'){// Top hat: tall slightly waisted crown, band, wide curled brim.
    turned([[.226,0],[.214,.12],[.222,.28],[.236,.31],[0,.31]],boot,.12);turned([[.218,0],[.221,.05],[0,.05]],accent,.14);
    turned([[.225,0],[.35,-.006],[.365,.024],[.352,.032],[.228,.014]],boot,.12,1,.9);}
  if(kit.hat==='goggles'){tailored(hat,[[.12,.214,.2],[.16,.214,.2]],leather,14);for(const x of [-.075,.075]){const rim=torus(hat,x,.15,.19,.045,.014,brass);rim.rotation.x=-.3;const glass=sphere(hat,x,.15,.19,1,lens);glass.scale.set(.034,.034,.012);}}
  bakeCharacter(hat);
  const face=head.children.find(o=>o instanceof T.Mesh&&o.material===faces[skinTone]) as T.Mesh;face.userData.expression=0;
  const legs:T.Group[]=[],knees:T.Group[]=[],arms:T.Group[]=[],elbows:T.Group[]=[],grips:T.Group[]=[];
  for(const side of [-1,1]){
    // Legs: shaped thigh, knee, calf and a clear ankle into real boots.
    // The hip joint sits inside the pelvis; the thigh is slimmer at its root, fullest in the
    // upper-middle, and angles in so the knees sit closer than the hips (no parallel posts).
    const hip=new T.Group();hip.position.set(side*.09*k,.98,0);group.add(hip);legs.push(hip);
    const thigh=tailored(hip,W([[.04,.088,.096],[-.08,.094,.1],[-.26,.078,.084],[-.43,.062,.066]]),kit.trousers,12),inward=side*-.022;
    {const pos=thigh.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setX(i,pos.getX(i)+inward*Math.max(0,-pos.getY(i))/.43);thigh.geometry.computeVertexNormals();}
    bakeCharacter(hip);
    const knee=new T.Group();knee.position.set(inward,-.43,0);hip.add(knee);knees.push(knee);
    tailored(knee,W([[.01,.063,.067],[-.1,.068,.074],[-.27,.05,.054],[-.4,.042,.046]]),kit.trousers,12);
    const bootMat=kit.boots==='soft'?leather:boot;
    if(kit.boots==='tall'){tailored(knee,[[-.08,.07,.075],[-.14,.066,.071],[-.42,.053,.058],[-.49,.056,.062]],bootMat,12);tailored(knee,[[-.3,.061,.066],[-.33,.061,.066]],brass,12);}
    else tailored(knee,[[-.33,.056,.06],[-.49,.057,.062]],bootMat,12);
    if(kit.boots==='heavy')tailored(knee,[[-.33,.061,.065],[-.36,.061,.065]],leather,12);
    foot(knee,-.495,bootMat,kit.boots==='heavy');bakeCharacter(knee);
    // Arms: rounded shoulder cap, shaped upper arm, tapered forearm, small hand.
    const shoulder=new T.Group();shoulder.position.set(side*.215*k,1.44,0);body.add(shoulder);arms.push(shoulder);
    const sleeve=kit.sleeve==='rolled'?kit.shirt:top;
    tailored(shoulder,W([[.075,.02,.02],[.05,.058,.06],[0,.07,.072],[-.12,kit.sleeve==='puff'?.078:.064,kit.sleeve==='puff'?.078:.066],[-.25,.05,.052]]),sleeve,12).rotation.z=side*.06;
    if(archetype==='ordinal'&&side<0)tailored(shoulder,W([[-.05,.074,.076],[-.13,.07,.072]]),accent,12);
    // Squared shoulder boards: the occupation silhouette is wider and harder than any civilian's.
    if(archetype==='ordinal'){const board=box(shoulder,side*.035,.075,0,.2,.035,.17,boot);board.rotation.z=side*-.18;box(shoulder,side*.13,.075,0,.02,.04,.17,accent);}
    if(archetype==='guard'){const pad=sphere(shoulder,side*.02,.035,0,1,cloth);pad.scale.set(.1,.05,.095);torus(shoulder,side*.02,.02,0,.085,.012,brass).rotation.x=Math.PI/2;}
    bakeCharacter(shoulder);
    const elbow=new T.Group();elbow.position.set(side*.015,-.25,0);elbow.rotation.x=-.12;shoulder.add(elbow);elbows.push(elbow);
    if(kit.sleeve==='rolled'){tailored(elbow,[[.03,.062,.064],[-.03,.062,.064]],kit.shirt,12);tailored(elbow,[[0,.046,.048],[-.08,.05,.05],[-.2,.036,.038],[-.24,.032,.034]],skinMat,10);}
    else{tailored(elbow,[[.01,.051,.053],[-.08,.055,.055],[-.2,.042,.044],[-.235,.041,.043]],sleeve,12);tailored(elbow,[[-.19,.046,.048],[-.237,kit.coat?.056:.047,kit.coat?.058:.049]],kit.coat?accent:ivory,12);}
    // A joint cap closes the notch that opens on the outside of a bent elbow.
    sphere(elbow,0,0,0,.05,kit.sleeve==='rolled'?kit.shirt:sleeve);
    hand(elbow,kit.hands,side);bakeCharacter(elbow);grips.push(gripSocket(elbow,side));
  }
  // Early Terra: patches and grime. Later: brass watch chains and clean trims.
  const worn=new T.Group();body.add(worn);
  panel(worn,[[-.15,1.02],[-.08,1.015],[-.085,.94],[-.16,.95]],.15*kz,toon('#7d6a58'));panel(worn,[[.06,1.34],[.13,1.33],[.12,1.27],[.07,1.28]],.135*kz,toon('#6f6352'));
  bakeCharacter(worn);
  const finery=new T.Group();body.add(finery);
  const chain=torus(finery,.06,1.2,.12*kz,.05,.006,brass);chain.rotation.set(0,0,.2);sphere(finery,.1,1.17,.122*kz,.016,brass);
  if(archetype!=='worker')torus(finery,0,1.51,.02,.075,.01,brass).rotation.x=1.25;
  bakeCharacter(finery);finery.visible=false;
  body.position.y-=.14;for(const leg of legs)leg.position.y-=.14;
  group.scale.set(1+(seed%4-1.5)*.03,.95+(seed%5)*.022,1);
  group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
  const motion={stride:seed*1.3,gait:0,speed:0,prevX:NaN,prevZ:0,prevYaw:0,turn:0,tail:0,tailV:0,hair:0,hairV:0,tempo:.88+((seed*37)%25)/100,idle:0,drape:1,pose:null as Float32Array|null};
  return {group,body,legs,knees,arms,elbows,grips,head,worn,finery,scarf,tails,skirt,swing,face,archetype,motion,phase:seed*1.7,expression:'neutral' as Expression,gaze:'away',setExpression(state:Expression){this.expression=state;face.userData.expression=expressions.indexOf(state);}};
}

export type Citizen=ReturnType<typeof citizen>;
