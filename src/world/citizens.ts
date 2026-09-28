import * as T from 'three';
import { palette as P, wardrobes, type Archetype } from './palette';
import { sphere, torus, bake, mats, thinLine, type Material } from './assets';
import { painted, tone as toneLight } from './tone';
import { skullGeometry, ringGeometry, garmentGeometry, ringSurface, ribbonGeometry, blockGeometry, bootFoot, BOOT_SPEC, handGeometry, lockGeometry, shellGeometry, shineGeometry, hairStyles, HAND_STATES, type HandState, type BootFamily, type Surface } from './character-kit';

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
  {H:37,L:16,tilt:2,rx:17,ry:22,lash:9,flick:6,lid:.14,ew:44},   // tired: a heavier lid, still open
  {H:37,L:12,tilt:9,rx:17,ry:21,lash:12,flick:13,lid:0,ew:45},    // confident
];
/** Anime face shadow map (the Genshin technique, authored analytically): as the light swings
 * from the front to the side of the head, a threshold sweeps across the face from the far
 * edge. Designed shapes ride on it: a cheek triangle under the eye and a nose shadow. The
 * map is mirrored toward whichever side the light is on. */
const FACE_SHADOW=`
  float faceLit = 1.;
  {
    vec3 L = normalize(faceSun), U = normalize(cross(vFaceF, vFaceR));
    vec2 hz = vec2(dot(L, vFaceR), dot(L, vFaceF));
    float hmag = length(hz), elev = dot(L, U);
    float phi = atan(hz.x, hz.y);                        // 0 = light straight ahead of the face
    // Near-vertical light carries no left/right information: settle toward a gentle 3/4 split.
    float t = mix(.35, abs(phi) / 1.5708, smoothstep(.12, .45, hmag)), side = phi >= 0. ? 1. : -1.;
    float u = clamp(vFaceP.x / .17, -1.2, 1.2) * side;    // +1 = cheek nearest the light
    float v = (vFaceP.y + .236) / .486;                  // 0 = chin, 1 = crown
    // Per-face-type design: [cheek triangle, triangle height, edge softness, nose width, extra].
    int ft = int(vFaceType + .5);
    vec4 d = ft == 1 ? vec4(.2, .3, 2.6, .07) : ft == 2 ? vec4(.46, .33, .8, .1) : ft == 3 ? vec4(.3, .3, 1.2, .08) : ft == 4 ? vec4(.4, .35, 1., .12) : vec4(.34, .31, 1.2, .1);
    float b = t <= 1. ? mix(-1.3, .04, t) : mix(.04, 1.3, clamp((t - 1.) * 3.5, 0., 1.));
    float tri = pow(max(0., 1. - abs(v - d.y) / .13), 2.);
    b += d.x * tri * smoothstep(.22, .55, t) * (1. - smoothstep(.88, 1.02, t));   // cheek triangle
    b -= .12 * smoothstep(.62, .8, v) * smoothstep(.3, .7, t);                      // brow and temple stay lit longer
    if (ft == 2) b += .22 * smoothstep(.2, .05, v) * smoothstep(.2, .5, t);         // sharp: jaw shadow reaches under the chin
    float w = max(fwidth(u) * 1.2 * d.z, .004);
    faceLit = smoothstep(b - w, b + w, u);
    // Nose shadow on the far side of the nose, widest at its base.
    float nb = clamp((.405 - v) / .1, 0., 1.), nose = step(.3, v) * step(v, .405) * step(-.015 - nb * d.w, u) * step(u, -.012);
    faceLit *= 1. - nose * smoothstep(.12, .3, t) * (1. - smoothstep(.8, .95, t));
    // Sun height: high light shades the chin band and under the nose; light from below shades the brow.
    float hi = smoothstep(.45, .9, elev), lo = smoothstep(-.1, -.5, elev), wv = max(fwidth(v) * 1.2, .004);
    faceLit *= 1. - hi * (1. - smoothstep(mix(.02, .14, hi) - wv, mix(.02, .14, hi) + wv, v));
    faceLit *= 1. - hi * step(.29, v) * step(v, .33) * step(abs(u), .06);
    faceLit *= 1. - lo * smoothstep(.55 - wv, .55 + wv, v);
    // Tired faces carry a soft under-eye band whenever the face is lit.
    if (ft == 3) faceLit *= 1. - .6 * step(.415, v) * step(v, .44) * step(.18, abs(vFaceP.x / .17)) * step(abs(vFaceP.x / .17), .75);
  }
`;
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
    const y0=318,W=56*(e.ew/44),Hb=(e.H/40)*70*(surprised?1.15:focused?.88:annoyed?.82:1),lid=Math.min(.5,e.lid*.9+(tiredS?.26:0)+(annoyed?.1:0)+(focused?.04:0));
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
        const ix=cx-side*3,iy=y0-Hb*.02,rx=W*.46*(surprised?.78:1),ry=Hb*.6*(surprised?.78:1);
        const g=c.createLinearGradient(0,iy-ry,0,iy+ry);g.addColorStop(0,'#150f1f');g.addColorStop(.28,irises[type][0]);g.addColorStop(.78,irises[type][1]);g.addColorStop(1,'#f3e8d2');
        c.fillStyle=g;c.beginPath();c.ellipse(ix,iy,rx,ry,0,0,Math.PI*2);c.fill();
        c.strokeStyle='rgba(20,14,30,.85)';c.lineWidth=3;c.stroke();
        c.fillStyle='#0f0a18';c.beginPath();c.ellipse(ix,iy+ry*.05,rx*.34,ry*.42,0,0,Math.PI*2);c.fill();
        // Lash shadow across the top of the iris.
        c.fillStyle='rgba(20,12,28,.32)';c.beginPath();upper();c.lineTo(outer,top+Hb*.22);c.lineTo(inner,top+Hb*.22);c.closePath();c.fill();
        c.fillStyle='#ffffff';c.beginPath();c.ellipse(ix-side*rx*.32,iy-ry*.36,rx*.34,ry*.26,-side*.4,0,Math.PI*2);c.fill();
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
      const bx0=256+side*50,by0=238+slant+(surprised?-8:0),bx1=256+side*96,by1=222-Math.abs(slant)*.2+(surprised?-14:0),bx2=256+side*142,by2=234-slant*.4+(surprised?-10:0);
      c.fillStyle='#2b1b1f';c.beginPath();c.moveTo(bx0,by0-4);c.quadraticCurveTo(bx1,by1-4,bx2,by2);c.quadraticCurveTo(bx1,by1+3,bx0,by0+5);c.closePath();c.fill();
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
  (m as unknown as {defines:Record<string,string>}).defines={TOON:'',TERRA_FACE:''};
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\n#ifdef USE_BATCHING_COLOR\nvColor=vec3(1.);vMapUv.x+=(batchingColor.r-1.)/7.;vEmissiveMapUv.x+=(batchingColor.r-1.)/7.;\n#endif');
    // Face shadow map: head-local face coordinates plus the head's world axes.
    shader.vertexShader='varying vec2 vFaceP; varying vec3 vFaceR, vFaceF; varying float vFaceType;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vFaceP = position.xy; vFaceType = float(${FACE_TYPES-1}) - floor(uv.y * ${FACE_TYPES}. - .001); mat4 faceM = modelMatrix;
      #ifdef USE_BATCHING
      faceM = modelMatrix * batchingMatrix;
      #endif
      vFaceR = normalize(mat3(faceM) * vec3(1., 0., 0.)); vFaceF = normalize(mat3(faceM) * vec3(0., 0., 1.));`);
    shader.uniforms.faceSun=toneLight.sunDir;
    shader.fragmentShader='uniform vec3 faceSun; varying vec2 vFaceP; varying vec3 vFaceR, vFaceF; varying float vFaceType;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',FACE_SHADOW+'#include <opaque_fragment>');
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
/** The guard's cap badge: a small brass shield on the band. */
function crestPin(g:T.Object3D){const shield=new T.Shape();shield.moveTo(-.035,.035);shield.lineTo(.035,.035);shield.lineTo(.035,0);shield.lineTo(0,-.04);shield.lineTo(-.035,0);shield.closePath();const m=new T.Mesh(new T.ShapeGeometry(shield),brass);m.position.set(0,.19,.235);g.add(m);}
/** Hands share geometry per state/side/colour; each state lives in its own group so the crowd
 * batch can switch it by visibility. */
const coloredHands=new Map<string,T.BufferGeometry>();
function handMesh(state:HandState,side:number,color:T.Color){const key=state+side+color.getHexString();let g=coloredHands.get(key);
  if(!g){g=handGeometry(state,side).clone();const n=g.attributes.position.count,a=new Float32Array(n*3);for(let i=0;i<n;i++)color.toArray(a,i*3);g.setAttribute('color',new T.BufferAttribute(a,3));g.setAttribute('restoredColor',new T.BufferAttribute(a.slice(),3));coloredHands.set(key,g);}
  return new T.Mesh(g,plainToon);}
const faceTypes:Record<Archetype,number[]>={guard:[4,2],worker:[3,0,4],merchant:[1,0,4],engineer:[2,0,4],resident:[1,0,2],courier:[0,2,1]};
const ring=(g:T.Object3D,rings:number[][],mat:Material,seg=12,start=0,arc=Math.PI*2)=>{const m=new T.Mesh(ringGeometry(rings,seg,start,arc),mat);g.add(m);return m;};
const garment=(g:T.Object3D,rings:number[][],mat:Material,start=0,arc=Math.PI*2,thick=.01,seg=16)=>{const m=new T.Mesh(garmentGeometry(rings,seg,start,arc,thick),mat);g.add(m);return m;};
/** A closed ellipsoid (shoulder caps, knuckle of a joint) from rings. */
const ellipsoid=(g:T.Object3D,x:number,y:number,z:number,rx:number,ry:number,rz:number,mat:Material,n=2)=>{const rings=[-1,-.72,-.3,.3,.72,1].map(t=>{const c=Math.sqrt(1-t*t)||.02;return [t*ry,rx*c,rz*c,0,0,n];});const m=ring(g,rings,mat,12);m.position.set(x,y,z);return m;};
/** Seat an object on a surface, its +z along the surface normal (call before the group is posed). */
const place=<O extends T.Object3D>(g:T.Object3D,object:O,surf:Surface,a:number,y:number,lift:number)=>{object.position.copy(surf(a,y,lift));object.lookAt(surf(a,y,lift+.01));g.add(object);return object;};
const strap=(g:T.Object3D,surf:Surface,path:number[][],mat:Material,lift=.004,thick=.007)=>{const m=new T.Mesh(ribbonGeometry(surf,path,lift,thick),mat);g.add(m);return m;};
/** Interpolated torso ring at height y, grown outward (belts, vests, straps follow the body). */
function bandAt(rings:number[][],y:number,grow:number){const r=[...rings].sort((p,q)=>p[0]-q[0]);let i=0;while(i<r.length-2&&r[i+1][0]<y)i++;const t=T.MathUtils.clamp((y-r[i][0])/(r[i+1][0]-r[i][0]),0,1);
  const v=(k:number,d:number)=>T.MathUtils.lerp(r[i][k]??d,r[i+1][k]??d,t);return [y,v(1,0)+grow,v(2,0)+grow,v(3,0),v(4,0),v(5,2),T.MathUtils.lerp(r[i][6]??r[i][2],r[i+1][6]??r[i+1][2],t)+grow];}

/** Body grammar (group-local): leg pivots at HIP_Y; thigh, shin and ankle-to-floor lengths put
 * the sole on the street surface ~.095 below the group origin. */
export const HIP_Y=.95;
export const THIGH=.49,SHIN=.46;
const ANKLE=.095;
/** Torso group height: body-local y = group y + .14. Its hip-joint height is HIP_Y - BODY_Y. */
export const BODY_Y=-.14;
/** Hand centre below the elbow: where held tools sit. */
export const GRIP_Y=-.33;
type Trousers='straight'|'breeches'|'fitted'|'tailored'|'loose'|'stocking';
/** Optional overrides for review lineups; gameplay citizens derive everything from their seed. */
export type CitizenLook={hair?:number;hat?:string;face?:number;build?:number;fem?:boolean};
export function citizen(coat:Material=mats.rust,seed=0,archetype:Archetype='worker',look:CitizenLook={}){
  void coat;
  const group=new T.Group(),body=new T.Group();group.add(body);
  const contact=new T.Mesh(contactShape,contactInk);contact.rotation.x=-Math.PI/2;contact.position.y=-.09;contact.scale.y=.7;group.add(contact);
  const outfit=wardrobes[archetype][(seed+Math.floor(seed/3))%wardrobes[archetype].length];
  const cloth=outfitMaterial(outfit[0],outfit[3]),secondary=outfitMaterial(outfit[1]),accent=outfitMaterial(outfit[2]);
  const skinTone=seed%3,skinMat=skin[skinTone],variant=Math.floor(seed/6)%2;
  const dress=archetype==='resident'&&variant===0;
  // Presentation: narrower shoulders, a softer waist-to-hip line, same anime system.
  const fem=look.fem??(dress||(seed*7+3)%5<2);
  // Each family chooses what builds its silhouette: sleeves, trousers, boots and what hangs from the waist.
  const kit={
    worker:{shirt:secondary,trousers:darkCloth,cut:'straight' as Trousers,sleeve:'rolled',coat:false,tails:'apron',boots:'work' as BootFamily,bootMat:leather,hands:skinMat,hat:seed%2?'cap':'scarf',collar:'shirt'},
    engineer:{shirt:secondary,trousers:darkCloth,cut:'fitted' as Trousers,sleeve:'gauntlet',coat:true,tails:'coat',boots:'engineer' as BootFamily,bootMat:leather,hands:gloveInk,hat:'goggles',collar:'stand'},
    merchant:{shirt:ivory,trousers:merchantTrousers,cut:(fem?'stocking':'loose') as Trousers,sleeve:'turned',coat:false,tails:fem?'skirt':'frock',boots:'civic' as BootFamily,bootMat:boot,hands:skinMat,hat:seed%3===0?'top':seed%3===1?'bowler':'none',collar:'shirt'},
    guard:{shirt:cloth,trousers:darkCloth,cut:'breeches' as Trousers,sleeve:'full',coat:true,tails:'long',boots:'guard' as BootFamily,bootMat:boot,hands:gloveInk,hat:'peak',collar:'stand'},
    resident:{shirt:dress?cloth:secondary,trousers:dress?darkCloth:toon(P.cool.navy),cut:(dress?'stocking':'tailored') as Trousers,sleeve:dress?'puff':'full',coat:!dress,tails:dress?'dress':'civic',boots:'civic' as BootFamily,bootMat:dress?leather:boot,hands:skinMat,hat:dress?'none':seed%3===1?'bowler':'none',collar:dress?'neck':'lapel'},
    courier:{shirt:cloth,trousers:darkCloth,cut:'straight' as Trousers,sleeve:'full',coat:true,tails:'short',boots:'work' as BootFamily,bootMat:leather,hands:skinMat,hat:'cap',collar:'shirt'},
  }[archetype];
  if(look.hat)kit.hat=look.hat;
  const top=kit.coat?cloth:archetype==='merchant'?ivory:kit.shirt,jacket=archetype==='merchant'?cloth:top;
  // Builds: slim, standard and sturdy change widths and stance, never the proportion.
  const build=look.build??(archetype==='worker'||archetype==='guard'?[2,1,2][seed%3]:[1,0,2,1][seed%4]);
  const B={S:[.87,1,1.16][build],C:[.87,1,1.18][build],W:[.8,1,1.32][build],H:[.9,1,1.1][build],limb:[.82,1,1.22][build],depth:[.88,1,1.2][build]};
  // Role bodies: the outline carries the job before any accessory does.
  const R={worker:{S:1.13,C:1.07,W:1.08,belly:0},engineer:{S:.95,C:.97,W:.9,belly:0},merchant:{S:.97,C:1,W:1.08,belly:.026},
    guard:{S:1.08,C:1.06,W:.86,belly:0},resident:{S:.92,C:.96,W:.9,belly:0},courier:{S:1,C:1,W:.94,belly:0}}[archetype];
  const S=R.S*B.S*(fem?.88:1),C=R.C*B.C*(fem?.94:1),Wt=R.W*B.W*(fem?.9:1),H=B.H*(fem?1.1:.95),dp=B.depth,bust=fem?.016:0,LK=B.limb*(fem?.93:1)*(archetype==='worker'?1.07:1);
  const sq=archetype==='guard'?3.2:archetype==='engineer'?2.8:archetype==='merchant'?2.1:2.5; // structured coats square the shoulder line
  // Torso: [y, half width, front depth, dz, dx, squareness, back depth]. Crotch, seat, hips,
  // waist, ribcage, chest, the shoulder line, then a trapezius slope into a slender neck.
  const torsoRings=[[1.02,.045*H,.04,-.012],[1.05,.112*H,.08*dp,-.016,0,2.3,.1*dp],[1.1,.14*H,.09*dp,-.014,0,2.3,.114*dp],[1.15,.146*H,.092*dp,-.01,0,2.3,.106*dp],
    [1.21,(.13*H+.13*Wt)/2,.088*dp+R.belly,.002+R.belly*.4,0,2.2,.086*dp],[1.27,.118*Wt,.086*dp+R.belly*.8,.01+R.belly*.5,0,2,.074*dp],[1.35,.132*C,.094*dp+R.belly*.3+bust*.5,.016,0,2.2,.082*dp],
    [1.43,.148*C,.104*dp+bust,.02,0,2.4,.094*dp],[1.49,.158*S,.1*dp,.014,0,2.6,.108*dp],[1.54,.166*S,.088*dp,.004,0,sq,.1*dp],[1.575,.146*S,.074*dp,0,0,sq,.084*dp],[1.605,.098*S,.062,.002,0,2.2],[1.628,.064,.054,.008],[1.645,.056,.05,.012]];
  const upperTorso=torsoRings.filter(r=>r[0]>=1.21),lowerTorso=torsoRings.filter(r=>r[0]<=1.27);
  const surf=ringSurface(torsoRings);
  ring(body,upperTorso,top,16);
  const shoulderX=.168*S,capR=.056*Math.max(1,S*.96);
  // Shoulder caps: the torso rolls over into the arm, and hide the joint at any arm angle.
  for(const side of [-1,1])ellipsoid(body,side*shoulderX,1.54,0,capR*(archetype==='guard'?1.12:1),capR*1.04,capR*1.06,kit.sleeve==='puff'?top:jacket,archetype==='guard'?2.6:2);
  ring(body,[[1.6,.054,.05,.006],[1.66,.05,.047,.014],[1.76,.047,.045,.02]],skinShade[skinTone],10); // anime convention: the neck sits in the chin's shadow
  // Collars sit off the neck with real depth.
  if(kit.collar==='stand')garment(body,[[1.715,.066,.064,.012],[1.66,.072,.068,.008],[1.618,.084,.074,.006]],archetype==='guard'?accent:cloth,archetype==='guard'?.18:.5,Math.PI*2-(archetype==='guard'?.36:.9),.008);
  if(kit.collar==='shirt')garment(body,[[1.672,.086,.084,.014],[1.628,.07,.064,.004]],kit.coat?secondary:ivory,.32,Math.PI*2-.64,.006,14);
  if(kit.collar==='lapel'){garment(body,[[1.668,.08,.078,.012],[1.628,.066,.062,.004]],ivory,.3,Math.PI*2-.6,.006,14);
    for(const side of [-1,1])strap(body,surf,[[side*.2,1.6,.024],[side*.34,1.53,.07],[side*.3,1.42,.05],[side*.14,1.31,.012]],accent,.004,.006);}
  if(kit.collar==='neck')garment(body,[[1.648,.07,.066,.006],[1.625,.066,.062,.004]],accent,0,Math.PI*2,.006,12);
  // Belt: a band over the waist with a buckle.
  garment(body,[bandAt(torsoRings,1.29,.008),bandAt(torsoRings,1.245,.008)],archetype==='guard'||archetype==='engineer'?gloveInk:leather,0,Math.PI*2,.008,18);
  place(body,new T.Mesh(blockGeometry(.028,.042,.008),brass),surf,0,1.268,.014);
  if(archetype==='guard'){
    // Structured shoulder boards extend the shoulder line; a placket with two button rows; a crest.
    for(const side of [-1,1]){const b=new T.Mesh(blockGeometry(.008,.14,.05,4).rotateZ(Math.PI/2),accent);b.position.set(side*(shoulderX-.006),1.606,0);b.rotation.z=-side*.2;body.add(b);
      const f=new T.Mesh(blockGeometry(.011,.036,.052,4),brass);f.position.set(side*(shoulderX+.062),1.582,0);f.rotation.z=-side*.2;body.add(f);}
    strap(body,surf,[[.2,1.6,.05],[.16,1.43,.05],[.12,1.3,.045]],accent,.003,.004);
    for(const y of [1.33,1.4,1.47,1.54])for(const a of [.03,.3])place(body,new T.Mesh(new T.SphereGeometry(.011,8,6),brass),surf,a,y,.008);
    const shield=new T.Mesh(blockGeometry(.024,.05,.006,3),brass);place(body,shield,surf,-.5,1.45,.006);
    strap(body,surf,[[-.9,1.575,.05],[-.3,1.42,.05],[.4,1.29,.05],[1.2,1.21,.05]],gloveInk,.006,.008); // cross belt
  }
  if(archetype==='engineer'){
    // Asymmetric closure flap with brass studs; an X harness; pouches on the tool belt.
    strap(body,surf,[[.12,1.62,.03],[.24,1.54,.07],[.3,1.4,.07],[.28,1.29,.06]],accent,.004,.007);
    for(const y of [1.34,1.41,1.48,1.55])place(body,new T.Mesh(new T.SphereGeometry(.01,8,6),brass),surf,.32,y,.012);
    for(const side of [-1,1])strap(body,surf,[[side*.62,1.585,.034],[side*.25,1.46,.034],[-side*.25,1.33,.034],[-side*.55,1.27,.034]],leather,.012,.008);
    place(body,new T.Mesh(new T.TorusGeometry(.018,.005,6,14),brass),surf,0,1.4,.022);
    for(const a of [-.75,-1.15,.9])place(body,new T.Mesh(blockGeometry(.036,.06,.022,3.5),leather),surf,a,1.23,.03);
    // Back-mounted pressure pack: the engineer's profile read.
    const pack=place(body,new T.Group(),surf,Math.PI,1.42,.018);pack.add(new T.Mesh(blockGeometry(.1,.24,.035,3.5),leather));
    for(const x of [-.052,.052]){const c=ring(pack,[[-.15,.004,.004],[-.145,.036,.036],[.14,.036,.036],[.17,.022,.022],[.175,.004,.004]],brass,10);c.position.set(x,0,.055);}
  }
  if(archetype==='merchant'){
    // Layers: shirt, a closed waistcoat with a V neck, an open cutaway jacket, a sash and a brass pin.
    // Layers: shirt, a buttoned waistcoat, a cravat, then an open frock coat whose skirt hangs from the waist.
    garment(body,[1.45,1.38,1.3,1.24,1.18].map(y=>bandAt(torsoRings,y,.007)),secondary,0,Math.PI*2,.006,18);
    for(const y of [1.22,1.28,1.34,1.4])place(body,new T.Mesh(new T.SphereGeometry(.009,8,6),brass),surf,0,y,.016);
    strap(body,surf,[[0,1.63,.05],[0,1.56,.06],[0,1.49,.04]],accent,.01,.012);
    garment(body,[1.57,1.5,1.43,1.35,1.28].map(y=>bandAt(torsoRings,y,.018+(1.57-y)*.02)),jacket,.5,Math.PI*2-1,.008,18);
  }
  if(kit.tails==='apron'){
    // Canvas apron: a bib and neck straps; the skirt hangs from the waist below.
    garment(body,[1.47,1.4,1.33,1.27].map(y=>bandAt(torsoRings,y,.009)),apronCanvas,-.68,1.36,.006,12);
    for(const side of [-1,1])strap(body,surf,[[side*.6,1.465,.024],[side*.7,1.56,.022],[side*1.1,1.605,.02],[side*2.3,1.52,.02],[side*2.75,1.3,.02]],apronCanvas,.012,.005);
  }
  if(archetype==='courier'||(archetype==='worker'&&seed%3===0)){strap(body,surf,[[-.55,1.585,.04],[-.2,1.47,.042],[.35,1.32,.042],[1.0,1.18,.04],[1.4,1.1,.04]],leather,.014,.008);
    const bag=new T.Mesh(blockGeometry(.1,.16,.042,3.4),leather);bag.position.set(.2*S,1.1,.03);bag.rotation.set(0,1.1,0);body.add(bag);const flap=new T.Mesh(blockGeometry(.104,.07,.046,3.4),kit.shirt===leather?brass:leather);flap.position.set(.205*S,1.155,.033);flap.rotation.set(0,1.1,0);body.add(flap);}
  bakeCharacter(body);
  // Pelvis (figure-construction ch01/ch02): its own transform at the hip-joint height, so walking
  // can turn and tilt it against the thorax. Its rings overlap the thorax up to the belt.
  const pelvis=new T.Group();pelvis.position.y=HIP_Y-BODY_Y;body.add(pelvis);
  ring(pelvis,lowerTorso.map(([y,w,d,...r])=>[y-(HIP_Y-BODY_Y),w*(y>1.2?1.012:1),d*(y>1.2?1.012:1),...r]),kit.cut==='stocking'?top:kit.trousers,16);
  bakeCharacter(pelvis);
  // Coats, skirts and aprons hang from the waist with thickness and swing with motion; open fronts clear the stride.
  const tails=new T.Group();tails.position.y=1.26;body.add(tails);
  const skirt=(length:number,spread:number,mat:Material,start=0,arc=Math.PI*2,thick=.01,tilt=0)=>{tails.userData.length=Math.max(tails.userData.length??0,length);const w0=.118*Wt+.02,h0=.146*H+.018,rise=(t:number)=>t*t;
    const rings=[[.012,.118*Wt+.004,.084*dp+R.belly*.8+.004,.004+R.belly*.5,0,2,.084*dp+.004],[-.02,w0,.086*dp+R.belly+.014,.004+R.belly*.5,0,2,.088*dp+.014],[-.05,(w0+h0)/2+.004,.09*dp+R.belly+.016,R.belly*.3,0,2.2,.098*dp+.016],[-.13,h0+.008,.096*dp+R.belly*.5+.018,0,0,2.2,.118*dp+.02],
      ...[.3,.55,.8,1].map(t=>{const y=-.13-(length-.13)*t,f=rise(t);return [y,h0+.012+spread*f,.1*dp+.024+spread*.62*f,0,0,2,.122*dp+.024+spread*.7*f];})];
    const m=garment(tails,rings,mat,start,arc,thick,18);
    // Asymmetric hem: one side hangs longer, a diagonal line across the figure.
    if(tilt){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<-.13)p.setY(i,-.13+(y+.13)*(1+tilt*Math.sin(Math.atan2(p.getX(i),p.getZ(i))+.6)));}m.geometry.computeVertexNormals();}
    return m;};
  if(kit.tails==='coat')skirt(.62,.1,cloth,.8,Math.PI*2-1.42,.01,.24);   // engineer: cut away in front, flared behind, off-centre
  if(kit.tails==='long')skirt(.82,.06,cloth,.2,Math.PI*2-.4);     // guard: long straight panels
  if(kit.tails==='civic')skirt(.96,.12,cloth,.14,Math.PI*2-.28);   // civic: mid-calf, a clean A-line
  if(kit.tails==='frock')skirt(.6,.1,jacket,.55,Math.PI*2-1.1,.012); // merchant: full frock skirt, open in front
  if(kit.tails==='skirt')skirt(.66,.14,secondary);
  if(kit.tails==='dress')skirt(.9,.2,cloth);
  if(kit.tails==='short')skirt(.2,.02,top,.22,Math.PI*2-.44);
  if(kit.tails==='apron'){skirt(.62,.035,apronCanvas,-1.05,2.1,.006);
    // A hammer hangs from the belt loop and swings with the stride: the worker's read at a distance.
    const hr=.146*H+.045,hx=-Math.sin(2.1)*hr,hz=Math.cos(2.1)*hr,handle=new T.Mesh(blockGeometry(.011,.28,.011,2.4),leather);handle.position.set(hx,-.19,hz);tails.add(handle);
    const headM=new T.Mesh(blockGeometry(.024,.032,.06,3),gloveInk);headM.position.set(hx,-.34,hz);headM.rotation.y=-2.1;tails.add(headM);torus(tails,hx,-.04,hz,.018,.005,brass).rotation.y=Math.PI/2-2.1;for(const side of [-1,1])place(tails,new T.Mesh(blockGeometry(.04,.07,.02,3.5),leather),ringSurface([[-.02,.118*Wt+.034,.1*dp+.03],[-.12,.146*H+.034,.112*dp+.034]]),side*1.05,-.07,.012);}
  bakeCharacter(tails);
  const scarf=new T.Group();scarf.position.set(-.04,1.63,.1);body.add(scarf);
  if(kit.hat==='scarf'||archetype==='courier'||(archetype==='resident'&&!dress)){tailored(scarf,[[0,.1,.07],[.05,.095,.066]],accent);panel(scarf,[[-.07,.02],[.025,.01],[.01,-.25],[-.06,-.22]],.075,accent);}bakeCharacter(scarf);
  // Head: a planar-mapped anime face on the shared skull surface.
  const head=new T.Group();head.position.y=1.845;head.scale.set(.655,.665,.65);body.add(head);
  const types=faceTypes[archetype],faceType=look.face??types[(seed+Math.floor(seed/5))%types.length];
  head.add(new T.Mesh(skullGeometry((u,v)=>[u/7,(v+FACE_TYPES-1-faceType)/FACE_TYPES]),faces[skinTone]));
  // Ears use the face material (a plain-skin corner of the face tile) so they share the face shadow.
  for(const side of [-1,1]){const g=new T.SphereGeometry(1,10,8),uvA=g.attributes.uv;for(let i=0;i<uvA.count;i++)uvA.setXY(i,.012/7,(.55+FACE_TYPES-1-faceType)/FACE_TYPES);
    const ear=new T.Mesh(g,faces[skinTone]);ear.position.set(side*.163,-.03,-.012);ear.scale.set(.02,.044,.032);head.add(ear);}
  // Hair: a crown shell cut to a hairline, then designed locks with gaps between them.
  const hairIndex=(seed*3+Math.floor(seed/4))%4,hairMat=hair[hairIndex],under=shadowHair[hairIndex];
  const hatted=kit.hat==='cap'||kit.hat==='peak'||kit.hat==='bowler'||kit.hat==='top';
  const pool=(fem?[3,4,5,6,2,7,1,3]:[0,1,2,8,7,0,8,6]).filter(i=>!hatted||hairStyles[i].hatSafe);
  const style=hairStyles[look.hair??pool[(seed*5+Math.floor(seed/7))%pool.length]];
  const [hf,hs,hb,vol]=style.shell;head.add(new T.Mesh(shellGeometry(hatted?Math.max(hf,.13):hf-.025,hs,hb,hatted?Math.min(vol,1.04):vol,(seed%3-1)*.6),hairMat));
  // Anime hair shine: a broken band of light locks across the crown.
  if(!hatted)head.add(new T.Mesh(shineGeometry(vol+.062),shineHair[hairIndex]));
  for(const l of style.locks){if(hatted&&(l.y0>.2||l.len<0))continue;head.add(new T.Mesh(lockGeometry(hatted?{...l,y0:Math.min(l.y0,.16),out:Math.min(l.out??.04,.03)}:l),l.under?under:hairMat));}
  bakeCharacter(head);
  // Tied hair swings from its own pivot.
  const swing=new T.Group();head.add(swing);
  if(style.tie==='pony'){swing.position.set(0,-.04,-.19);torus(swing,0,0,0,.045,.016,accent).rotation.x=Math.PI/2;ring(swing,[[.02,.04,.036],[-.08,.068,.054,-.03],[-.22,.062,.046,-.05],[-.36,.036,.03,-.05],[-.45,.004,.004,-.04]],hairMat,10).rotation.x=-.2;}
  if(style.tie==='high'){swing.position.set(0,.19,-.16);torus(swing,0,0,0,.05,.018,accent).rotation.x=Math.PI/2.4;ring(swing,[[.03,.045,.04],[-.04,.07,.058,-.05],[-.2,.066,.05,-.1],[-.38,.04,.032,-.1],[-.48,.004,.004,-.08]],hairMat,10).rotation.x=-.35;}
  if(style.tie==='bun'){swing.position.set(0,.16,-.18);ring(swing,[[-.075,.004,.004],[-.06,.062,.062],[0,.088,.088],[.06,.062,.062],[.078,.004,.004]],hairMat,12).rotation.x=1.1;torus(swing,0,-.01,.05,.06,.016,accent).rotation.x=.3;}
  if(style.tie==='curtain'){swing.position.set(0,.06,-.15);garment(swing,[[.02,.19,.14,.02],[-.14,.2,.13,.02],[-.3,.19,.11,.01],[-.44,.16,.08,0]],hairMat,Math.PI*.55,Math.PI*.9,.035,14);
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
  const legs:T.Group[]=[],knees:T.Group[]=[],ankles:T.Group[]=[],arms:T.Group[]=[],elbows:T.Group[]=[],hands:Record<HandState,T.Group>[]=[];
  const L=(rings:number[][],f:number,side=0)=>rings.map(([y,w,d,oz=0,ox=0])=>[y,w*f,d*f,oz,ox*side]);
  const spec=BOOT_SPEC[kit.boots],shaftTop=-SHIN+spec.shaft;
  for(const side of [-1,1]){
    // Legs: thigh → knee → calf → ankle, shaped by the trouser cut; the foot pivots at the ankle.
    const hip=new T.Group();hip.position.set(side*.08*H,HIP_Y,0);hip.userData.baseX=hip.position.x;group.add(hip);legs.push(hip);
    const flare=kit.cut==='breeches'?.022:kit.cut==='loose'?.018:kit.cut==='straight'?.006:0;
    // Calf: knee cap in front, the calf swelling behind, a slim ankle.
    const calf=[[.045,.041,.045,.012],[0,.047,.052,.014],[-.05,.044,.05,-.002],[-.12,.049,.06,-.018],[-.2,.046,.055,-.016],[-.3,.037,.042,-.006],[-.4,.03,.033,0],[-.475,.029,.032,0]];
    const trouserCalf={straight:[[.045,.052,.056,.01],[0,.058,.062,.01],[-.12,.06,.064,0],[-.26,.061,.065,0],[-.36,.063,.067,0],[-.375,.066,.07,0]],
      tailored:[[.045,.05,.054,.01],[0,.055,.058,.01],[-.15,.052,.056,0],[-.3,.05,.055,0],[-.43,.052,.058,.006],[-.455,.054,.06,.01]],
      loose:[[.045,.06,.064,.01],[0,.066,.07,.01],[-.14,.064,.068,-.004],[-.3,.055,.06,0],[-.41,.047,.052,0]],
      fitted:calf.map(([y,w,d,oz])=>[y,w+.005,d+.005,oz]).filter(r=>r[0]>shaftTop-.06),breeches:calf.map(([y,w,d,oz])=>[y,w+.004,d+.004,oz]).filter(r=>r[0]>shaftTop-.06),stocking:calf}[kit.cut];
    // Knee (figure-construction ch06): the thigh ends at exactly the width the lower leg starts, so
    // the knee is a hint, never a band. The thigh bows forward; the joint closes inside both segments.
    const kneeR=trouserCalf.reduce((m,r)=>r[0]<=.01&&r[0]>=-.04?[Math.max(m[0],r[1]),Math.max(m[1],r[2])]:m,[0,0]);
    const thighRings=[[.1,.05,.056,-.014],[.04,.078+flare*.3,.082,-.004,.004],[-.06,.078+flare,.082,.012,flare*.6+.004],[-.17,.071+flare*.9,.077+flare*.4,.018,flare*.7],[-.29,.061+flare*.5,.067+flare*.3,.016,flare*.3],[-.4,Math.max(.051+flare*.2,kneeR[0]*.98),Math.max(.057,kneeR[1]*.98),.01],[-.47,kneeR[0]*1.01,kneeR[1]*1.01,.008],[-.52,kneeR[0]*1.008,kneeR[1]*1.008,.008]];
    ring(hip,L(thighRings,LK,side),kit.cut==='stocking'?darkCloth:kit.trousers,12);
    bakeCharacter(hip);
    const knee=new T.Group();knee.position.y=-THIGH;hip.add(knee);knees.push(knee);
    ring(knee,L(trouserCalf,LK),kit.cut==='stocking'?darkCloth:kit.trousers,12);
    // Knee cap: the joint stays closed at any bend (sitting folds it ninety degrees).
    ellipsoid(knee,0,0,.006,kneeR[0]*LK*.97,.05,kneeR[1]*LK*.97,kit.cut==='stocking'?darkCloth:kit.trousers);
    if(kit.cut==='straight')garment(knee,L([[-.34,.068,.072],[-.375,.069,.073]],LK),kit.trousers,0,Math.PI*2,.008,14); // turned-up hem
    if(kit.cut==='loose')ring(knee,L([[-.4,.042,.05,.004],[-.43,.047,.056,.006],[-.475,.047,.058,.01]],LK),ivory,12); // spats over the shoe
    // Boot shafts by family.
    const bm=kit.bootMat;
    const shaft=(top:number,grow:number)=>calf.filter(r=>r[0]<top+.01).map(([y,w,d,oz])=>[Math.min(y,top),w+grow,d+grow,oz]).concat([[-.49,.03+grow,.036+grow,.008]]);
    if(kit.boots==='work'){ring(knee,L(shaft(shaftTop,.012),LK),bm,12);garment(knee,L([[shaftTop+.005,.05,.056],[shaftTop-.03,.05,.055]],LK),bm,0,Math.PI*2,.008,12);}
    if(kit.boots==='engineer'){ring(knee,L(shaft(shaftTop,.011),LK),bm,12);for(const y of [shaftTop-.03,-.38]){garment(knee,L([bandAt(calf,y+.012,.016),bandAt(calf,y-.012,.016)],LK),gloveInk,0,Math.PI*2,.006,12);const k=new T.Mesh(blockGeometry(.014,.022,.008,4),brass);const r=bandAt(calf,y,.018)[1]*LK;k.position.set(side*r,y,0);k.rotation.y=side*Math.PI/2;knee.add(k);}}
    if(kit.boots==='guard'){ring(knee,L(shaft(shaftTop-.04,.01),LK),bm,12);garment(knee,L([[shaftTop+.06,.066,.074,.026],[shaftTop,.06,.068,.012],[shaftTop-.05,.054,.062,.004]],LK),bm,-1.1,2.2,.008,12);garment(knee,L([[shaftTop,.06,.068,.012],[shaftTop-.05,.054,.062,.004]],LK),bm,1.1,Math.PI*2-2.2,.008,12);}
    if(kit.boots==='civic')ring(knee,L([[-.428,.034,.041,.004],[-.44,.036,.043,.006],[-.49,.033,.04,.008]],LK),bm,12);
    bakeCharacter(knee);
    const ankle=new T.Group();ankle.position.y=-SHIN;knee.add(ankle);ankles.push(ankle);
    const foot=bootFoot(kit.boots,ANKLE);const fs=Math.min(1.08,Math.max(.94,LK));
    const upperMesh=new T.Mesh(foot.upper,bm);upperMesh.scale.set(fs,1,fs);ankle.add(upperMesh);const soleMesh=new T.Mesh(foot.sole,soleMat);soleMesh.scale.set(fs,1,fs);ankle.add(soleMesh);
    bakeCharacter(ankle);
    // Arms hang from the shoulder cap: deltoid, bicep, a narrowing elbow, a shaped forearm, wrist.
    const shoulder=new T.Group();shoulder.position.set(side*shoulderX,1.54,0);body.add(shoulder);arms.push(shoulder);
    const sleeveMat=kit.sleeve==='rolled'?kit.shirt:kit.sleeve==='puff'?top:jacket;
    const puff=kit.sleeve==='puff'?1.25:1,ease=kit.coat||archetype==='merchant'?.006:.003;
    const upper=[[.045,.028,.028],[.015,.05*puff,.052*puff,0,.003],[-.035,.053*puff,.055*puff,.002,.008],[-.09,.048*Math.min(puff,1.12),.051*Math.min(puff,1.12),.004,.004],[-.15,.044,.048,.008],[-.22,.04,.043,.004],[-.27,.036,.039,0],[-.3,.035,.037,-.002]].map(([y,w,d,oz,ox])=>[y,w+ease,d+ease,oz,ox]);
    if(kit.sleeve==='rolled'){ring(shoulder,L(upper.slice(0,6),LK,side),sleeveMat,12);garment(shoulder,L([[-.19,.052,.056,.004],[-.215,.062,.066,.004],[-.24,.058,.062,.002]],LK),sleeveMat,0,Math.PI*2,.008,12);ring(shoulder,L(upper.slice(5).map(([y,w,d,oz])=>[y,w-.003,d-.003,oz]),LK),skinMat,12);}
    else ring(shoulder,L(upper,LK,side),sleeveMat,12);
    bakeCharacter(shoulder);
    const elbow=new T.Group();elbow.position.set(0,-.29,0);elbow.rotation.x=-.12;shoulder.add(elbow);elbows.push(elbow);
    const fore=[[.04,.026,.028,-.012],[.01,.034,.037,-.008],[-.04,.04,.042,-.002],[-.1,.037,.038,.002],[-.18,.029,.03,0],[-.235,.024,.027,0],[-.255,.023,.026,0]];
    const bare=kit.sleeve==='rolled';
    ring(elbow,L(bare?fore:fore.map(([y,w,d,oz])=>[y,w+ease,d+ease,oz]),LK),bare?skinMat:sleeveMat,12);
    ellipsoid(elbow,0,0,-.004,(.035+ease)*LK,.036,(.037+ease)*LK,bare?skinMat:sleeveMat);
    // Cuffs: shirt cuff, turned-back merchant cuff, flared engineer gauntlet.
    if(kit.sleeve==='full'||kit.sleeve==='puff')garment(elbow,L([[-.195,.037,.04],[-.245,.035,.038],[-.252,.034,.037]],LK),kit.coat?accent:ivory,0,Math.PI*2,.006,12);
    if(kit.sleeve==='turned')garment(elbow,L([[-.15,.048,.05],[-.19,.043,.045],[-.225,.037,.04]],LK),ivory,0,Math.PI*2,.007,12);
    if(kit.sleeve==='gauntlet')garment(elbow,L([[-.12,.046,.049],[-.17,.05,.053],[-.24,.036,.039]],LK),gloveInk,0,Math.PI*2,.008,12);
    if(kit.hands===gloveInk&&kit.sleeve!=='gauntlet')ring(elbow,L([[-.225,.03,.032],[-.245,.031,.033],[-.26,.028,.03]],LK),gloveInk,12);
    bakeCharacter(elbow);
    const handRoot=new T.Group();handRoot.position.y=-.25;handRoot.scale.setScalar(Math.min(1.1,Math.max(.94,LK)));elbow.add(handRoot);
    const set={} as Record<HandState,T.Group>;const color=(kit.hands as T.MeshToonMaterial).color;
    for(const state of HAND_STATES){const g=new T.Group();g.add(handMesh(state,side,color));g.visible=state==='relaxed';handRoot.add(g);set[state]=g;}
    hands.push(set);
  }
  // Early Terra: patches and grime. Later: brass watch chains and clean trims.
  const worn=new T.Group();body.add(worn);
  const patch=toon('#7d6a58');strap(worn,surf,[[-.55,1.2,.06],[-.45,1.13,.06]],patch,.022,.004);strap(worn,surf,[[.45,1.47,.05],[.52,1.42,.05]],toon('#6f6352'),.022,.004);
  bakeCharacter(worn);
  const finery=new T.Group();body.add(finery);
  strap(finery,surf,[[.12,1.31,.006],[.3,1.27,.006],[.5,1.3,.006]],brass,.03,.004);place(finery,new T.Mesh(new T.SphereGeometry(.014,8,6),brass),surf,.52,1.29,.034);
  if(archetype!=='worker')torus(finery,0,1.625,.02,.075,.01,brass).rotation.x=1.25;
  bakeCharacter(finery);finery.visible=false;
  body.position.y=BODY_Y;for(const leg of legs)leg.position.y=HIP_Y;
  group.scale.set(1+(seed%4-1.5)*.02,.96+(seed%5)*.018,1);
  group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
  const motion={pelvisYaw:0,pelvisRoll:0,stride:seed*1.3,gait:0,speed:0,prevX:NaN,prevZ:0,prevYaw:0,turn:0,tail:0,tailV:0,hair:0,hairV:0,tempo:.88+((seed*37)%25)/100,idle:0};
  const handState:HandState[]=['relaxed','relaxed'];
  return {group,body,pelvis,legs,knees,ankles,arms,elbows,head,worn,finery,scarf,tails,swing,face,archetype,build,motion,phase:seed*1.7,expression:'neutral' as Expression,gaze:'away',hands,handState,
    setExpression(state:Expression){this.expression=state;face.userData.expression=expressions.indexOf(state);},
    setHand(side:0|1,state:HandState){if(handState[side]===state)return;hands[side][handState[side]].visible=false;hands[side][state].visible=true;handState[side]=state;}};
}

export type Citizen=ReturnType<typeof citizen>;
