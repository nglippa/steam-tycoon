import * as T from 'three';
import { palette as P, wardrobes, type Archetype } from './palette';
import { box, cyl, sphere, torus, bake, mats, thinLine, type Material } from './assets';
import { painted } from './tone';
import { skullGeometry, noseGeometry, ringGeometry, handGeometry, lockGeometry, shellGeometry, hairStyles, HAND_STATES, type HandState } from './character-kit';

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
// One atlas per skin tone: five eye families (rows) x seven expression states (columns).
// Painted for a planar front projection (character-kit skullGeometry), so the eyes sit where
// the viewer looks. Graphic features only: no contour ink across the face.
export const FACE_TYPES=5;
type EyeShape={H:number;L:number;tilt:number;rx:number;ry:number;lash:number;flick:number;lid:number;ew:number};
const eyeShapes:EyeShape[]=[
  {H:40,L:16,tilt:6,rx:17,ry:23,lash:10,flick:10,lid:0,ew:44},   // neutral
  {H:43,L:20,tilt:-2,rx:19,ry:25,lash:8,flick:6,lid:0,ew:42},    // soft
  {H:31,L:13,tilt:14,rx:16,ry:20,lash:11,flick:15,lid:0,ew:46},  // sharp
  {H:37,L:16,tilt:2,rx:17,ry:22,lash:9,flick:6,lid:.34,ew:44},   // tired
  {H:36,L:12,tilt:10,rx:17,ry:21,lash:13,flick:13,lid:.04,ew:45}, // confident
];
const shadeOf=(hex:string,k:number)=>'#'+new T.Color(hex).multiplyScalar(k).getHexString();
/** Modern anime face construction (2020s TV/game style): large almond eyes set low, heavy
 * outer upper lash with a wing, tall iris with lash shadow and two catchlights, only a sliver
 * of white; tiny nose tick and mouth; hard hair shadow across the forehead; hatched blush. */
const faces=skinColors.map(tone=>{
  const canvas=document.createElement('canvas');canvas.width=1792;canvas.height=256*FACE_TYPES;const c=canvas.getContext('2d')!;
  const irises=[['#2c4f86','#6fa6d8'],['#5a3322','#c0874a'],['#1f5f58','#63b3a3'],['#4b2f6e','#a07ac8'],['#6a4a1c','#d8a94a']];
  const lineInk='#23161b',shade=shadeOf(tone,.8);
  for(let type=0;type<FACE_TYPES;type++)for(let state=0;state<7;state++){
    c.save();c.translate(state*256,type*256);c.scale(.5,.5);c.fillStyle=tone;c.fillRect(0,0,512,512);c.lineCap='round';c.lineJoin='round';
    const e=eyeShapes[type],pleasant=state===1,tiredS=state===2,focused=state===3,annoyed=state===4,blink=state===5,surprised=state===6;
    const y0=318,W=56*(e.ew/44),Hb=(e.H/40)*62*(surprised?1.15:focused?.86:annoyed?.8:1),lid=Math.min(.55,e.lid*.9+(tiredS?.28:0)+(annoyed?.12:0)+(focused?.05:0));
    // Hand-painted hair shadow: a hard jagged band under the fringe.
    c.fillStyle=shade;c.beginPath();c.moveTo(0,0);c.lineTo(512,0);for(let i=0;i<=12;i++){const x=512-i*512/12;c.lineTo(x,206+((i*37)%5)*6-(i%2?14:0));}c.closePath();c.fill();
    // Blush: soft oval plus three hatch strokes.
    c.fillStyle=pleasant?'rgba(232,110,112,.34)':'rgba(232,120,118,.2)';for(const side of [-1,1]){c.beginPath();c.ellipse(256+side*104,382,30,11,0,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(200,90,92,.55)';c.lineWidth=3;for(let k=0;k<3;k++){c.beginPath();c.moveTo(256+side*(88+k*12),376);c.lineTo(256+side*(82+k*12),388);c.stroke();}}
    for(const side of [-1,1]){
      const cx=256+side*94,inner=cx-side*W*.92,outer=cx+side*W,top=y0-Hb*.62,bot=y0+Hb*.38;
      if(blink||pleasant&&false){c.strokeStyle=lineInk;c.lineWidth=9;c.beginPath();c.moveTo(inner,y0+4);c.quadraticCurveTo(cx,y0+18,outer,y0-e.tilt*.4);c.stroke();}
      else{
        // Opening: flatter top curve peaking toward the outer corner, soft lower curve.
        const upper=()=>{c.moveTo(inner,y0);c.bezierCurveTo(inner+side*W*.3,top-4,outer-side*W*.35,top-e.tilt*.6,outer,y0-e.tilt);};
        const lower=()=>{c.bezierCurveTo(outer-side*W*.2,bot,inner+side*W*.4,bot+2,inner,y0);};
        c.save();c.beginPath();upper();lower();c.closePath();c.fillStyle='#fbf5ec';c.fill();c.clip();
        const ix=cx-side*4,iy=y0+Hb*.02,rx=W*.5*(surprised?.8:1),ry=Hb*.62*(surprised?.8:1);
        const g=c.createLinearGradient(0,iy-ry,0,iy+ry);g.addColorStop(0,'#150f1f');g.addColorStop(.28,irises[type][0]);g.addColorStop(.78,irises[type][1]);g.addColorStop(1,'#f3e8d2');
        c.fillStyle=g;c.beginPath();c.ellipse(ix,iy,rx,ry,0,0,Math.PI*2);c.fill();
        c.strokeStyle='rgba(20,14,30,.85)';c.lineWidth=3;c.stroke();
        c.fillStyle='#0f0a18';c.beginPath();c.ellipse(ix,iy+ry*.05,rx*.34,ry*.42,0,0,Math.PI*2);c.fill();
        // Lash shadow across the top of the iris.
        c.fillStyle='rgba(20,12,28,.45)';c.beginPath();upper();c.lineTo(outer,top+Hb*.3);c.lineTo(inner,top+Hb*.3);c.closePath();c.fill();
        c.fillStyle='#ffffff';c.beginPath();c.ellipse(ix-side*rx*.35,iy-ry*.4,rx*.32,ry*.24,-side*.4,0,Math.PI*2);c.fill();
        c.globalAlpha=.85;c.beginPath();c.arc(ix+side*rx*.35,iy+ry*.45,rx*.13,0,Math.PI*2);c.fill();c.globalAlpha=1;
        if(lid>0){c.fillStyle=tone;c.beginPath();c.rect(inner-40,top-40,W*2.2+80,40+lid*(bot-top+10));c.fill();}
        c.restore();
        // Upper lash: thin at the inner corner, heavy at the outer third, ending in a wing.
        const lidY=lid>0?top-40+40+lid*(bot-top+10):0;
        c.fillStyle=lineInk;c.beginPath();c.moveTo(inner-side*2,y0+1);
        if(lid>0){c.lineTo(inner,lidY);c.lineTo(outer,lidY-e.tilt*.4);}else c.bezierCurveTo(inner+side*W*.3,top-4,outer-side*W*.35,top-e.tilt*.6,outer,y0-e.tilt);
        c.lineTo(outer+side*e.flick*1.4,y0-e.tilt-e.flick*.9);c.lineTo(outer+side*2,y0-e.tilt+e.lash*.55);
        if(lid>0)c.lineTo(inner,lidY+e.lash*.4);else c.bezierCurveTo(outer-side*W*.35,top-e.tilt*.6+e.lash,inner+side*W*.3,top-4+e.lash*.5,inner,y0+3);
        c.closePath();c.fill();
        // Lower lash: a short tapered line on the outer third only.
        c.strokeStyle=lineInk;c.lineWidth=3.5;c.beginPath();c.moveTo(outer-side*2,y0-e.tilt+6);c.quadraticCurveTo(outer-side*W*.3,bot+1,cx-side*2,bot+2);c.stroke();
        // Lid crease.
        c.strokeStyle='rgba(70,36,40,.5)';c.lineWidth=2.5;c.beginPath();c.moveTo(inner+side*W*.4,top-14);c.quadraticCurveTo(cx+side*W*.4,top-20-e.tilt*.3,outer-side*4,y0-e.tilt-Hb*.45);c.stroke();
      }
      // Thin high brows; emotion lives in their angle.
      const slant=annoyed?side*-14:focused?side*-8:tiredS?side*7:pleasant?side*4:surprised?-16:type===4?side*-4:0;
      c.strokeStyle='#2b1b1f';c.lineWidth=7;c.beginPath();c.moveTo(256+side*52,240+slant);c.quadraticCurveTo(256+side*96,224-Math.abs(slant)*.2+(surprised?-12:0),256+side*140,236-slant*.4+(surprised?-10:0));c.stroke();
    }
    // Nose: a single small shadow tick. Mouth: small and close under it.
    c.strokeStyle='rgba(150,86,78,.7)';c.lineWidth=3.5;c.beginPath();c.moveTo(258,366);c.lineTo(252,377);c.stroke();
    c.strokeStyle='#6a2f36';c.lineWidth=4;c.beginPath();
    if(surprised){c.fillStyle='#6c3b45';c.ellipse(256,412,7,10,0,0,Math.PI*2);c.fill();}
    else if(pleasant){c.fillStyle='#7a3240';c.moveTo(242,404);c.quadraticCurveTo(256,422,270,404);c.closePath();c.fill();}
    else if(annoyed){c.moveTo(246,412);c.quadraticCurveTo(256,406,266,412);c.stroke();}
    else if(focused){c.moveTo(248,410);c.lineTo(264,410);c.stroke();}
    else if(tiredS){c.moveTo(246,412);c.quadraticCurveTo(256,409,266,412);c.stroke();}
    else{c.moveTo(247,408);c.quadraticCurveTo(256,412,265,408);c.stroke();}
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

const leather=toon(P.warm.leather),darkCloth=toon('#2c3148'),gloveInk=toon('#262a3c'),apronCanvas=toon('#c9b48f');
const lens=toon(P.aether.cyan),shadowHair=P.hair.map(c=>toon(new T.Color(c).multiplyScalar(.72))),shineHair=P.hair.map(c=>toon(new T.Color(c).lerp(new T.Color('#fff4e6'),.42)));
const skinShade=P.skin.map(c=>toon(new T.Color(c).multiplyScalar(.74)));
for(const m of [lens,...shadowHair,...shineHair,...skinShade])m.userData.plain=true;
const soleMat=toon('#211b1b'),merchantTrousers=toon('#4a3428');
/** Boot foot along the forward axis: heel, instep and a chunky rounded toe on a dark sole. */
function foot(g:T.Object3D,y:number,material:Material,heavy:boolean){const f=heavy?1.14:1.04;
  const mesh=tailored(g,[[-.08,.043*f,.034],[-.055,.051*f,.05],[.03,.055*f,.05],[.11,.051*f,.04],[.16,.034*f,.028],[.18,.004,.004]],material,12);
  mesh.rotation.x=Math.PI/2;mesh.position.set(0,y,.04);
  const sole=new T.Mesh(ringGeometry([[-.088,.047*f,.012],[-.06,.052*f,.012],[.12,.052*f,.012],[.185,.03*f,.012]],12),soleMat);sole.rotation.x=Math.PI/2;sole.position.set(0,y-.036,.04);g.add(sole);return mesh;}
/** The guard's cap badge: a small brass shield on the band. */
function crestPin(g:T.Object3D){const shield=new T.Shape();shield.moveTo(-.035,.035);shield.lineTo(.035,.035);shield.lineTo(.035,0);shield.lineTo(0,-.04);shield.lineTo(-.035,0);shield.closePath();const m=new T.Mesh(new T.ShapeGeometry(shield),brass);m.position.set(0,.19,.235);g.add(m);}
/** Hands share geometry per state/side/colour; each state lives in its own group so the crowd
 * batch can switch it by visibility. */
const coloredHands=new Map<string,T.BufferGeometry>();
function handMesh(state:HandState,side:number,color:T.Color){const key=state+side+color.getHexString();let g=coloredHands.get(key);
  if(!g){g=handGeometry(state,side).clone();const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++)color.toArray(a,i*3);g.setAttribute('color',new T.BufferAttribute(a,3));g.setAttribute('restoredColor',new T.BufferAttribute(a.slice(),3));coloredHands.set(key,g);}
  return new T.Mesh(g,plainToon);}
/** Hand centre below the elbow: where held tools sit. */
export const GRIP_Y=-.345;
const faceTypes:Record<Archetype,number[]>={guard:[4,2],worker:[3,0,4],merchant:[1,0,4],engineer:[2,0,4],resident:[1,0,2],courier:[0,2,1]};
const ring=(g:T.Object3D,rings:number[][],mat:Material,seg=12,start=0,arc=Math.PI*2)=>{const m=new T.Mesh(ringGeometry(rings,seg,start,arc),mat);g.add(m);return m;};

/** Optional overrides for review lineups; gameplay citizens derive everything from their seed. */
export type CitizenLook={hair?:number;hat?:string;face?:number;build?:number;fem?:boolean};
export function citizen(coat:Material=mats.rust,seed=0,archetype:Archetype='worker',look:CitizenLook={}){
  void coat;
  const group=new T.Group(),body=new T.Group();group.add(body);
  const contact=new T.Mesh(contactShape,contactInk);contact.rotation.x=-Math.PI/2;contact.position.y=-.10;contact.scale.y=.7;group.add(contact);
  const outfit=wardrobes[archetype][(seed+Math.floor(seed/3))%wardrobes[archetype].length];
  const cloth=outfitMaterial(outfit[0],outfit[3]),secondary=outfitMaterial(outfit[1]),accent=outfitMaterial(outfit[2]);
  const skinTone=seed%3,skinMat=skin[skinTone],variant=Math.floor(seed/6)%2;
  const dress=archetype==='resident'&&variant===0;
  // Presentation: a softer waist-to-hip line and narrower shoulders, same anime system.
  const fem=look.fem??(dress||(seed*7+3)%5<2);
  // Each family chooses what builds its silhouette.
  const kit={
    worker:{shirt:secondary,trousers:darkCloth,sleeve:'rolled',coat:false,tails:'apron',boots:'heavy',hands:skinMat,hat:seed%2?'cap':'scarf',collar:'shirt'},
    engineer:{shirt:cloth,trousers:darkCloth,sleeve:'full',coat:true,tails:'coat',boots:'tall',hands:gloveInk,hat:'goggles',collar:'stand'},
    merchant:{shirt:secondary,trousers:merchantTrousers,sleeve:'puff',coat:false,tails:fem?'skirt':'frock',boots:'soft',hands:skinMat,hat:seed%3===0?'top':seed%3===1?'bowler':'none',collar:'shirt'},
    guard:{shirt:cloth,trousers:darkCloth,sleeve:'full',coat:true,tails:'long',boots:'tall',hands:gloveInk,hat:'peak',collar:'stand'},
    resident:{shirt:dress?cloth:secondary,trousers:dress?darkCloth:toon(P.cool.navy),sleeve:dress?'puff':'full',coat:!dress,tails:dress?'dress':'civic',boots:'soft',hands:skinMat,hat:dress?'none':seed%3===1?'bowler':'none',collar:dress?'neck':'lapel'},
    courier:{shirt:cloth,trousers:darkCloth,sleeve:'full',coat:true,tails:'short',boots:'heavy',hands:skinMat,hat:'cap',collar:'shirt'},
  }[archetype];
  if(look.hat)kit.hat=look.hat;
  const top=kit.coat?cloth:kit.shirt;
  // Builds: slim, standard and sturdy frames change widths and stance, never proportion.
  const k=look.build!==undefined?[.92,1,1.1][look.build]:archetype==='worker'||archetype==='guard'?[1.1,1,1.05][seed%3]:[1,.92,1.06,1][seed%4];
  const kd=1+(k-1)*.8;
  // Role bodies: the outline carries the job before any accessory does.
  const R={worker:{S:1.12,waist:1.04,belly:0,chest:1.06},engineer:{S:.93,waist:.86,belly:0,chest:.96},merchant:{S:.98,waist:1.1,belly:.024,chest:1},
    guard:{S:1.1,waist:.82,belly:0,chest:1.1},resident:{S:.96,waist:.86,belly:0,chest:1},courier:{S:1,waist:.92,belly:0,chest:1}}[archetype];
  const S=R.S*(fem?.9:1),waist=(fem?.88:1)*R.waist,hips=fem?1.1:1;
  const sq=archetype==='guard'?3.2:archetype==='engineer'||archetype==='courier'?2.6:2.3; // squarer shoulders for structured coats
  // Torso: pelvis, a readable waist, ribcage, chest, then a shoulder yoke and trapezius slope into the neck.
  const torso=(g=0)=>[[.95,.126+g,.098+g,0,0,2.4],[1.02,.156*hips+g,.11+g,-.004,0,2.4],[1.1,.154*hips+g,.108+g,0,0,2.3],[1.2,.134*waist+g,.098+g+R.belly,.002+R.belly],[1.28,.14*waist+g,.102+g+R.belly*.7,.006+R.belly*.7],
    [1.36,.152*(fem?.97:1)*R.chest+g,.11*R.chest+g,.012],[1.44,.164*(fem?.96:1)*S+g,(fem?.124:.118)*R.chest+g,fem?.02:.014],[1.5,.178*S+g,.112+g,.01,0,sq],[1.545,.2*S+g,.098+g,.004,0,sq],[1.585,.182*S+g,.086+g,0,0,sq],[1.615,.118*S+g,.074+g,0],[1.645,.064+g,.058+g,.004]]
    .map(([y,w,d,oz=0,ox=0,n=2])=>[y,w*k,d*kd,oz,ox,n]);
  ring(body,torso(),top,16);
  ring(body,[[1.62,.058,.054,.004],[1.68,.053,.051,.008],[1.72,.051,.05,.01]],skinMat,10);ring(body,[[1.72,.051,.05,.01],[1.75,.05,.049,.01]],skinShade[skinTone],10); // painted chin shadow
  // Collars sit off the neck with real depth.
  if(kit.collar==='stand')ring(body,[[1.615,.08*k,.072*kd,.006],[1.64,.076*k,.07*kd,.008],[1.715,.071,.067,.012]],archetype==='guard'?accent:cloth,14,.28,Math.PI*2-.56);
  if(kit.collar==='shirt')ring(body,[[1.625,.068*k,.064*kd,.004],[1.665,.092*k,.086*kd,.012]],kit.coat?secondary:ivory,12,-1.25,2.5);
  if(kit.collar==='lapel'){ring(body,[[1.625,.066*k,.062*kd,.004],[1.66,.08*k,.076*kd,.01]],ivory,12,-1.1,2.2);for(const side of [-1,1])panel(body,[[side*.02,1.6],[side*.09,1.56],[side*.075,1.4],[side*.03,1.44]],.121*kd+.004,accent);}
  if(kit.collar==='neck')ring(body,[[1.625,.064*k,.06*kd,.004],[1.64,.07*k,.066*kd,.006]],accent,12);
  // Belt: a separate band over the waist.
  ring(body,[[1.18,.14*waist*k+.009,.1*kd+.009,.002],[1.225,.142*waist*k+.009,.101*kd+.009,.004]],archetype==='guard'||archetype==='engineer'?gloveInk:leather,16);
  box(body,0,1.2,.105*kd+.012,.05,.04,.012,brass);
  if(archetype==='guard'){
    // Structured shoulder boards following the yoke slope, a restrained crest and a button line.
    for(const side of [-1,1]){const x=side*(.17*S*k),b=box(body,x,1.582,0,.12,.016,.1,accent);b.rotation.z=side*-.32;const f=box(body,x+side*.05,1.562,0,.02,.03,.1,brass);f.rotation.z=side*-.32;}
    const shield=new T.Shape();shield.moveTo(-.035,.04);shield.lineTo(.035,.04);shield.lineTo(.035,-.008);shield.lineTo(0,-.045);shield.lineTo(-.035,-.008);shield.closePath();
    const badge=new T.Mesh(new T.ShapeGeometry(shield),brass);badge.position.set(-.085,1.45,.128*kd+.012);body.add(badge);
    for(const y of [1.28,1.35,1.42,1.49])for(const x of [.035,.075])sphere(body,x,y,(y>1.4?.126:.116)*kd+.006,.011,brass);
  }
  if(archetype==='engineer'){
    // Asymmetric closure and a tool harness crossing the chest.
    panel(body,[[-.02,1.6],[.03,1.6],[.06,1.21],[.02,1.21]],.12*kd+.006,accent);for(const y of [1.26,1.34,1.42,1.5])sphere(body,.045,y,.122*kd+.006,.011,brass);
    for(const side of [-1,1]){const st=box(body,0,1.4,.123*kd+.01,.03,.44,.012,leather);st.rotation.z=side*.5;}
    for(const x of [-.1,.08])box(body,x,1.16,.108*kd+.02,.07,.08,.05,leather);torus(body,-.1,1.17,.14*kd,.018,.006,brass);
    // Back-mounted pressure pack: the engineer's profile read.
    const pack=new T.Group();pack.position.set(0,1.4,-.12*kd-.05);body.add(pack);box(pack,0,0,0,.2*k,.24,.07,leather);
    cyl(pack,-.055,.03,-.05,.042,.3,brass);cyl(pack,.055,.03,-.05,.042,.3,brass);for(const x of [-.055,.055])sphere(pack,x,.19,-.05,.042,brass);
  }
  if(archetype==='merchant'){
    // Open-fronted vest layered over the shirt, a sash and a brass pin.
    ring(body,torso(.012).filter(([y])=>y>=1.1&&y<=1.56),cloth,16,.42,Math.PI*2-.84);
    const sash=box(body,0,1.33,.122*kd+.02,.055,.52,.012,accent);sash.rotation.z=.55;torus(body,-.06,1.55,.1*kd,.018,.006,brass).rotation.x=1.3;
  }
  if(kit.tails==='apron'){
    // Canvas apron over the shirt: bib, straps and a skirt that reaches the knee.
    ring(body,[[1.47,.1,.12*kd+.012,.012],[1.3,.13*k,.108*kd+.016],[1.18,.15*k,.106*kd+.016],[1.02,.17*k,.12*kd+.018],[.66,.19*k,.13*kd+.02]],apronCanvas,10,-Math.PI*.4,Math.PI*.8);
    for(const side of [-1,1])box(body,side*.08,1.53,.07,.03,.13,.012,apronCanvas).rotation.x=-.5;
    for(const x of [-.1,.1])box(body,x,1.12,.14*kd,.07,.08,.03,leather);
  }
  if(archetype==='courier'||(archetype==='worker'&&seed%3===0)){const strap=box(body,0,1.36,.12*kd+.008,.034,.66,.014,leather);strap.rotation.z=-.62;
    const bag=new T.Shape();bag.moveTo(-.09,.1);bag.lineTo(.09,.1);bag.quadraticCurveTo(.12,-.1,.06,-.12);bag.lineTo(-.06,-.12);bag.quadraticCurveTo(-.12,-.1,-.09,.1);
    const mesh=new T.Mesh(new T.ExtrudeGeometry(bag,{depth:.07,bevelEnabled:true,bevelThickness:.012,bevelSize:.014,bevelSegments:1}),leather);mesh.position.set(.2*k,1.06,.02);mesh.rotation.y=.35;body.add(mesh);box(body,.2*k,1.13,.1,.04,.035,.01,brass);}
  bakeCharacter(body);
  // Coat tails, skirts and aprons hang from the waist and swing with motion; open fronts clear the stride.
  const tails=new T.Group();tails.position.y=1.2;body.add(tails);
  const flare=(length:number,spread:number,mat:Material,start=0,arc=Math.PI*2)=>ring(tails,[[.03,.14*waist*k+.012,.1*kd+.012],[-.1,.162*hips*k+.014+spread*.2,.118*kd+.018],[-length*.55,(.2+spread*.6)*k,(.14+spread*.4)*kd],[-length,(.21+spread)*k,(.15+spread*.6)*kd]],mat,16,start,arc);
  if(kit.tails==='coat')flare(.7,.2,cloth,Math.PI*.4,Math.PI*1.2);
  if(kit.tails==='long')flare(.62,.03,cloth,Math.PI*.14,Math.PI*1.72);
  if(kit.tails==='civic')flare(.76,.14,cloth,Math.PI*.16,Math.PI*1.68);
  if(kit.tails==='frock')flare(.44,.06,cloth,Math.PI*.3,Math.PI*1.4);
  if(kit.tails==='skirt')flare(.52,.12,secondary);
  if(kit.tails==='dress')flare(.68,.16,cloth);
  if(kit.tails==='short')flare(.17,.02,top,Math.PI*.2,Math.PI*1.6);
  bakeCharacter(tails);
  const scarf=new T.Group();scarf.position.set(-.04,1.63,.1);body.add(scarf);
  if(kit.hat==='scarf'||archetype==='courier'||(archetype==='resident'&&!dress)){tailored(scarf,[[0,.1,.07],[.05,.095,.066]],accent);panel(scarf,[[-.07,.02],[.025,.01],[.01,-.25],[-.06,-.22]],.075,accent);}bakeCharacter(scarf);
  // Head: a planar-mapped anime face on the shared skull surface.
  const head=new T.Group();head.position.y=1.845;head.scale.set(.69,.74,.7);body.add(head);
  const types=faceTypes[archetype],faceType=look.face??types[(seed+Math.floor(seed/5))%types.length];
  head.add(new T.Mesh(skullGeometry((u,v)=>[u/7,(v+FACE_TYPES-1-faceType)/FACE_TYPES]),faces[skinTone]));
  head.add(new T.Mesh(noseGeometry(),skinMat));
  for(const side of [-1,1]){const ear=sphere(head,side*.163,-.03,-.012,1,skinMat);ear.scale.set(.02,.044,.032);}
  // Hair: a crown shell cut to a hairline, then designed locks with gaps between them.
  const hairIndex=(seed*3+Math.floor(seed/4))%4,hairMat=hair[hairIndex],under=shadowHair[hairIndex];
  const hatted=kit.hat==='cap'||kit.hat==='peak'||kit.hat==='bowler'||kit.hat==='top';
  const pool=(fem?[3,4,5,6,2,7,1,3]:[0,1,2,8,7,0,8,6]).filter(i=>!hatted||hairStyles[i].hatSafe);
  const style=hairStyles[look.hair??pool[(seed*5+Math.floor(seed/7))%pool.length]];
  const [hf,hs,hb,vol]=style.shell;head.add(new T.Mesh(shellGeometry(hatted?Math.max(hf,.13):hf-.025,hs,hb,hatted?Math.min(vol,1.04):vol,(seed%3-1)*.6),hairMat));
  // Anime hair shine: a broken band of light locks across the crown.
  if(!hatted)for(const a of [-62,-34,-8,18,44,70])head.add(new T.Mesh(lockGeometry({a:a*Math.PI/180,y0:.2-Math.abs(a)*.0006,len:.045+(Math.abs(a)%3)*.008,w:.022,out:0,th:.003},vol+.06),shineHair[hairIndex]));
  for(const l of style.locks){if(hatted&&l.y0>.2)continue;head.add(new T.Mesh(lockGeometry(hatted?{...l,y0:Math.min(l.y0,.16),out:Math.min(l.out??.04,.03)}:l),l.under?under:hairMat));}
  bakeCharacter(head);
  // Tied hair swings from its own pivot.
  const swing=new T.Group();head.add(swing);
  if(style.tie==='pony'){swing.position.set(0,-.04,-.19);torus(swing,0,0,0,.045,.016,accent).rotation.x=Math.PI/2;ring(swing,[[.02,.04,.036],[-.08,.068,.054,-.03],[-.22,.062,.046,-.05],[-.36,.036,.03,-.05],[-.45,.004,.004,-.04]],hairMat,10).rotation.x=-.2;}
  if(style.tie==='high'){swing.position.set(0,.19,-.16);torus(swing,0,0,0,.05,.018,accent).rotation.x=Math.PI/2.4;ring(swing,[[.03,.045,.04],[-.04,.07,.058,-.05],[-.2,.066,.05,-.1],[-.38,.04,.032,-.1],[-.48,.004,.004,-.08]],hairMat,10).rotation.x=-.35;}
  if(style.tie==='bun'){swing.position.set(0,.16,-.18);ring(swing,[[-.075,.004,.004],[-.06,.062,.062],[0,.088,.088],[.06,.062,.062],[.078,.004,.004]],hairMat,12).rotation.x=1.1;torus(swing,0,-.01,.05,.06,.016,accent).rotation.x=.3;}
  if(style.tie==='curtain'){swing.position.set(0,.06,-.15);ring(swing,[[.02,.19,.14,.02],[-.14,.2,.13,.02],[-.3,.19,.11,.01],[-.44,.16,.08,0]],hairMat,14,Math.PI*.55,Math.PI*.9);
    for(let i=0;i<5;i++){const a=Math.PI*(.62+i*.19);const tip=new T.Mesh(new T.ConeGeometry(.05,.14,4),hairMat);tip.position.set(Math.sin(a)*.15,-.5,Math.cos(a)*.08);tip.rotation.x=Math.PI;tip.scale.z=.35;swing.add(tip);}}
  bakeCharacter(swing);
  // Headwear sits on top of the hair silhouette, never replacing it.
  const hat=new T.Group();hat.scale.setScalar(.92);hat.position.y=-.012;head.add(hat);
  // Headwear from turned profiles: clean crowns, a band, and a shaped visor or brim.
  const turned=(pts:number[][],mat:Material,y:number,sx=1,sz=.96)=>{const m=new T.Mesh(new T.LatheGeometry(pts.map(([r,h])=>new T.Vector2(r,h)),24),mat);m.position.y=y;m.scale.set(sx,1,sz);hat.add(m);return m;};
  const visor=(w:number,d:number,y:number,z:number,tilt:number,mat:Material)=>{const sh=new T.Shape();const n=12;for(let i=0;i<=n;i++){const a=-Math.PI/2+i/n*Math.PI;const px=Math.sin(a)*w,py=Math.cos(a)*d;i?sh.lineTo(px,py):sh.moveTo(px,py);}for(let i=n;i>=0;i--){const a=-Math.PI/2+i/n*Math.PI;sh.lineTo(Math.sin(a)*w*.92,Math.cos(a)*d*.15);}sh.closePath();
    const m=new T.Mesh(new T.ExtrudeGeometry(sh,{depth:.014,bevelEnabled:false,curveSegments:12}),mat);m.rotation.x=Math.PI/2+tilt;m.position.set(0,y,z);hat.add(m);return m;};
  if(kit.hat==='peak'){// Guard's kepi: tight band, crown flaring to a flat top, visor pitched down.
    const k=turned([[.226,0],[.23,.06],[.262,.15],[.268,.18],[.255,.195],[0,.2]],darkCloth,.11);k.rotation.x=-.07;
    turned([[.229,0],[.231,.045],[0,.045]],brass,.115);visor(.2,.13,.125,.17,.38,boot);crestPin(hat);}
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
  const legs:T.Group[]=[],knees:T.Group[]=[],arms:T.Group[]=[],elbows:T.Group[]=[],hands:Record<HandState,T.Group>[]=[];
  const LK=Math.pow(k,.6)*(fem?1.03:1),AK=Math.pow(k,.6)*(archetype==='worker'?1.08:1)*(fem?.94:1);
  const L=(rings:number[][],f:number)=>rings.map(([y,w,d,oz=0])=>[y,w*f,d*f,oz]);
  for(const side of [-1,1]){
    // Legs: thigh into a shaped knee, calf and ankle; boots and hems overlap with real depth.
    const hip=new T.Group();hip.position.set(side*.088*k,1.06,0);group.add(hip);legs.push(hip);
    ring(hip,L([[.09,.07,.076,-.01],[.03,.098,.104],[-.05,.096,.102,.004],[-.18,.085,.092,.01],[-.32,.068,.076,.008],[-.44,.057,.064,.006],[-.49,.055,.062,.004]],LK),kit.trousers,12);bakeCharacter(hip);
    const knee=new T.Group();knee.position.y=-.486;hip.add(knee);knees.push(knee);
    ring(knee,L([[.045,.03,.032,.012],[.02,.052,.058,.012],[-.02,.057,.064,.018],[-.09,.055,.064,-.002],[-.17,.057,.068,-.012],[-.28,.047,.054,-.006],[-.4,.038,.043],[-.5,.034,.038]],LK),kit.trousers,12);
    const bootMat=kit.boots==='soft'?leather:boot;
    if(kit.boots==='tall'){ring(knee,L([[-.165,.068,.077,-.008],[-.195,.068,.077,-.008],[-.2,.062,.071,-.008],[-.3,.058,.067,-.008],[-.46,.046,.052],[-.535,.049,.057,.004]],LK),bootMat,12);ring(knee,L([[-.29,.06,.069,-.008],[-.315,.06,.069,-.008]],LK),brass,12);}
    if(kit.boots==='heavy'){ring(knee,L([[-.33,.05,.057],[-.365,.053,.06]],LK),kit.trousers,12);ring(knee,L([[-.36,.05,.056],[-.44,.046,.051],[-.535,.053,.061,.006]],LK),bootMat,12);ring(knee,L([[-.4,.049,.055],[-.415,.049,.055]],LK),leather,12);}
    if(kit.boots==='soft'){ring(knee,L([[-.39,.045,.05],[-.42,.048,.053]],LK),kit.trousers,12);ring(knee,L([[-.42,.043,.048],[-.535,.047,.055,.004]],LK),bootMat,12);}
    foot(knee,-.535,bootMat,kit.boots==='heavy');bakeCharacter(knee);
    // Arms hang from under the shoulder yoke: deltoid, bicep, a capped elbow, forearm, wrist.
    const shoulder=new T.Group();shoulder.position.set(side*(.2*S*k-.045),1.535,0);body.add(shoulder);arms.push(shoulder);
    const sleeve=kit.sleeve==='rolled'?kit.shirt:top,puff=kit.sleeve==='puff'?1.18:1;
    const upper=[[.06,.03,.03],[.035,.058*puff,.06*puff],[0,.064*puff,.066*puff],[-.06,.058*Math.min(puff,1.1),.06*Math.min(puff,1.1),.004],[-.14,.052,.056,.006],[-.23,.045,.048],[-.3,.043,.046]];
    if(kit.sleeve==='rolled'){ring(shoulder,L(upper.slice(0,5),AK),sleeve,12);ring(shoulder,L([[-.13,.052,.056,.006],[-.16,.063,.066,.004],[-.185,.067,.07],[-.205,.058,.061],[-.21,.046,.048]],AK),sleeve,12);ring(shoulder,L([[-.19,.047,.049],[-.3,.043,.046]],AK),skinMat,10);}
    else ring(shoulder,L(upper,AK),sleeve,12);
    if(archetype==='guard')ring(shoulder,L([[.065,.03,.03],[.04,.07,.072],[.0,.074,.076],[-.035,.066,.068]],AK),cloth,12);
    bakeCharacter(shoulder);
    const elbow=new T.Group();elbow.position.set(side*.008,-.3,0);elbow.rotation.x=-.12;shoulder.add(elbow);elbows.push(elbow);
    const fore=[[.045,.026,.028,-.008],[.02,.043,.046,-.008],[-.01,.047,.049,-.006],[-.07,.047,.05,.004],[-.15,.04,.042],[-.23,.031,.034],[-.27,.027,.031]];
    ring(elbow,L(fore,AK),kit.sleeve==='rolled'?skinMat:sleeve,12);
    if(kit.sleeve!=='rolled')ring(elbow,L([[-.205,.037,.04],[-.225,.043,.046],[-.258,.043,.046],[-.264,.029,.032]],AK),kit.coat?accent:ivory,12);
    if(kit.hands===gloveInk)ring(elbow,L(archetype==='engineer'?[[-.15,.04,.043],[-.2,.056,.06],[-.24,.066,.07],[-.25,.03,.033]]:[[-.24,.035,.038],[-.262,.041,.044],[-.272,.029,.032]],AK),gloveInk,12); // engineer gauntlets flare
    bakeCharacter(elbow);
    const handRoot=new T.Group();handRoot.position.y=-.272;elbow.add(handRoot);
    const set={} as Record<HandState,T.Group>;const color=(kit.hands as T.MeshToonMaterial).color;
    for(const state of HAND_STATES){const g=new T.Group();g.add(handMesh(state,side,color));g.visible=state==='relaxed';handRoot.add(g);set[state]=g;}
    hands.push(set);
  }
  // Early Terra: patches and grime. Later: brass watch chains and clean trims.
  const worn=new T.Group();body.add(worn);
  panel(worn,[[-.14,1.08],[-.07,1.075],[-.075,1.0],[-.15,1.01]],.118*kd+.004,toon('#7d6a58'));panel(worn,[[.05,1.44],[.12,1.43],[.11,1.37],[.06,1.38]],.13*kd+.004,toon('#6f6352'));
  bakeCharacter(worn);
  const finery=new T.Group();body.add(finery);
  const chain=torus(finery,.06,1.27,.112*kd,.05,.006,brass);chain.rotation.set(0,0,.2);sphere(finery,.1,1.24,.114*kd,.016,brass);
  if(archetype!=='worker')torus(finery,0,1.625,.02,.075,.01,brass).rotation.x=1.25;
  bakeCharacter(finery);finery.visible=false;
  body.position.y-=.14;for(const leg of legs)leg.position.y-=.14;
  group.scale.set(1+(seed%4-1.5)*.03,.95+(seed%5)*.022,1);
  group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
  const motion={stride:seed*1.3,gait:0,speed:0,prevX:NaN,prevZ:0,prevYaw:0,turn:0,tail:0,tailV:0,hair:0,hairV:0,tempo:.88+((seed*37)%25)/100,idle:0};
  const handState:HandState[]=['relaxed','relaxed'];
  return {group,body,legs,knees,arms,elbows,head,worn,finery,scarf,tails,swing,face,archetype,motion,phase:seed*1.7,expression:'neutral' as Expression,gaze:'away',hands,handState,
    setExpression(state:Expression){this.expression=state;face.userData.expression=expressions.indexOf(state);},
    setHand(side:0|1,state:HandState){if(handState[side]===state)return;hands[side][handState[side]].visible=false;hands[side][state].visible=true;handState[side]=state;}};
}

export type Citizen=ReturnType<typeof citizen>;
