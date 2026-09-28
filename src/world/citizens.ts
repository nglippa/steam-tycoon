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
// One atlas per skin tone: four face archetypes, five expressions and a blink.
// Face selection uses the existing BatchedMesh instance color channel as an index.
const faces=skinColors.map(tone=>{
  const canvas=document.createElement('canvas');canvas.width=1792;canvas.height=1024;const c=canvas.getContext('2d')!;
  const irises=['#3d6b9a','#7a4b35','#2f7f72','#6d4a86'];
  for(let type=0;type<4;type++)for(let state=0;state<7;state++){
    c.save();c.translate(state*256,type*256);c.scale(.5,.5);c.fillStyle=tone;c.fillRect(0,0,512,512);c.lineCap='round';c.lineJoin='round';
    const ink=P.neutral.ink,closed=state===5||state===1,y=296;
    // Borderlands-style inked face: jaw shadow shape, nose side, under-eye lines, cheek hatching.
    c.fillStyle='rgba(90,50,45,.22)';c.beginPath();c.moveTo(262,300);c.lineTo(274,340);c.lineTo(258,348);c.closePath();c.fill();
    c.strokeStyle='rgba(40,24,24,.5)';c.lineWidth=2.5;for(const side of [-1,1]){const cx=256+side*72;for(let k=0;k<3;k++){c.beginPath();c.moveTo(cx-10+k*8,y+58);c.lineTo(cx-4+k*8,y+72);c.stroke();}
      c.beginPath();c.moveTo(256+side*30,y+28);c.quadraticCurveTo(256+side*50,y+36,256+side*70,y+28);c.stroke();}
    c.strokeStyle='rgba(40,24,24,.4)';c.lineWidth=3;c.beginPath();c.moveTo(150,250);c.quadraticCurveTo(145,330,190,420);c.stroke();c.beginPath();c.moveTo(362,250);c.quadraticCurveTo(367,330,322,420);c.stroke();
    // Soft cheek color sits under every expression; happiness warms it.
    c.fillStyle=state===1?'#f0848a66':'#ee8f8a30';for(const side of [-1,1]){c.beginPath();c.ellipse(256+side*64,y+50,26,12,0,0,Math.PI*2);c.fill();}
    for(const side of [-1,1]){
      const surprised=state===6,x=256+side*50,w=type===2?36:34,rise=[60,66,52,58][type]*(state===3?.8:state===4?.7:surprised?1.2:1),lid=state===2?.52:0;
      const outer=x+side*w,inner=x-side*w;
      if(closed){c.strokeStyle=ink;c.lineWidth=8;c.beginPath();
        if(state===1){c.moveTo(inner,y+4);c.quadraticCurveTo(x,y-30,outer,y+2);}else{c.moveTo(inner,y-2);c.quadraticCurveTo(x,y+16,outer+side*4,y-6);}
        c.stroke();}
      else{
        const lidPath=()=>{c.beginPath();c.moveTo(inner,y-2);c.quadraticCurveTo(x-side*6,y-rise,outer,y-10);c.quadraticCurveTo(x+side*6,y+44,inner,y-2);c.closePath();};
        c.save();lidPath();c.fillStyle=P.neutral.paper;c.fill();c.clip();
        const iris=c.createLinearGradient(0,y-30,0,y+28);iris.addColorStop(0,'#2a2540');iris.addColorStop(.3,irises[type]);iris.addColorStop(1,'#f2e8d2');
        c.fillStyle=iris;c.beginPath();c.ellipse(x-side*3,y+2,surprised?17:23,surprised?24:32,0,0,Math.PI*2);c.fill();
        c.fillStyle='#120f1e';c.beginPath();c.ellipse(x-side*3,y+3,9,14,0,0,Math.PI*2);c.fill();
        c.fillStyle='#ffffff';c.beginPath();c.arc(x-side*3-9,y-11,10,0,Math.PI*2);c.fill();c.beginPath();c.arc(x-side*3+6,y+11,2.6,0,Math.PI*2);c.fill();
        if(lid){c.fillStyle=tone;c.fillRect(inner-40,y-60,120,60*lid+10);}
        c.restore();
        // A heavy upper lash line with an outer flick carries the anime read.
        c.strokeStyle='#120f16';c.lineWidth=type===1||type===3?12:10;c.beginPath();
        const top=lid?y-rise*.25:y-rise;
        c.moveTo(inner-side*2,y-1);c.quadraticCurveTo(x-side*6,top,outer,y-10);c.lineTo(outer+side*(type===1?11:7),y-17);c.stroke();
        c.lineWidth=3;c.beginPath();c.moveTo(outer-side*2,y-6);c.quadraticCurveTo(x+side*10,y+22,x-side*6,y+21);c.stroke();
      }
      // Brows stay thin and high; emotion lives in their angle.
      const slant=state===4?side*-13:state===3?side*-7:state===2?side*6:state===1?side*4:surprised?-12:0;
      c.strokeStyle='#1c1418';c.lineWidth=10;c.beginPath();c.moveTo(inner,y-66+slant);c.quadraticCurveTo(x,y-78,outer,y-66-slant*.4);c.stroke();
      if(type===3){c.strokeStyle='#9a736b';c.lineWidth=2;c.beginPath();c.moveTo(outer,y+14);c.lineTo(outer+side*8,y+21);c.stroke();}
    }
    c.strokeStyle='#b27a70';c.lineWidth=3;c.beginPath();c.moveTo(262,338);c.lineTo(258,346);c.stroke();
    c.strokeStyle='#3a1e24';c.lineWidth=7;
    if(state===1){c.fillStyle='#8c3a47';c.beginPath();c.moveTo(240,370);c.quadraticCurveTo(256,396,272,370);c.closePath();c.fill();c.fillStyle='#e0848a';c.beginPath();c.ellipse(256,384,8,4,0,0,Math.PI*2);c.fill();}
    else if(state===6){c.fillStyle='#6c3b45';c.beginPath();c.ellipse(256,378,8,10,0,0,Math.PI*2);c.fill();}
    else{c.beginPath();c.moveTo(246,374);c.quadraticCurveTo(256,state===4?368:state===2?374:380,266,374);c.stroke();}
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
function foot(g:T.Object3D,y:number,material:Material,heavy:boolean){const f=heavy?1.16:1.06;
  const mesh=tailored(g,[[-.075,.046*f,.036],[-.05,.054*f,.052],[.03,.058*f,.05],[.1,.054*f,.04],[.15,.036*f,.028],[.172,.004,.004]].map(([y,w,d])=>[y*1.12,w,d*1.08]),material,12);
  mesh.rotation.x=Math.PI/2;mesh.position.set(0,y,.035);return mesh;}
/** The guard's cap badge: a small brass shield on the band. */
function crestPin(g:T.Object3D){const shield=new T.Shape();shield.moveTo(-.035,.035);shield.lineTo(.035,.035);shield.lineTo(.035,0);shield.lineTo(0,-.04);shield.lineTo(-.035,0);shield.closePath();const m=new T.Mesh(new T.ShapeGeometry(shield),brass);m.position.set(0,.19,.235);g.add(m);}
/** Flat mitten hand with a thumb: reads as a hand, costs two small meshes. */
function hand(g:T.Object3D,material:Material,side:number,ly=1,s=1.25){
  tailored(g,[[-.235,.022,.03],[-.27,.026,.042],[-.32,.025,.043],[-.36,.018,.032],[-.378,.004,.006]].map(([y,w,d])=>[-.235*ly+(y+.235)*s,w*s,d*s]),material,8);
  const thumb=sphere(g,side*.012*s,-.235*ly-.04*s,.035*s,1,material);thumb.scale.set(.016*s,.03*s,.016*s);thumb.rotation.x=.4;}

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
  }[archetype];
  const top=kit.coat?cloth:kit.shirt;
  // Builds: slim, standard and sturdy frames change the silhouette at any distance.
  const k=archetype==='worker'||archetype==='guard'?[1.16,1,1.1][seed%3]:[1,.9,1.08,1][seed%4];
  const kz=1+(k-1)*.8;
  const W=(rings:number[][])=>rings.map(([y,w,d])=>[y,w*k,d*(1+(k-1)*.8)]);
  // Elongated anime frame (~1:6 heads): long legs, a long tapered torso, high shoulders.
  // R() carries every landmark authored on the old compact frame to its new height.
  const R=(y:number)=>y<=.98?y*1.082:y<=1.13?1.06+(y-.98)*1.6:y<=1.47?1.3+(y-1.13)*.882:y<=1.7?1.6+(y-1.47)*.7:1.76+(y-1.7)*.5;
  const RY=(rings:number[][])=>rings.map(([y,...r])=>[R(y),...r]),RP=(pts:number[][])=>pts.map(([x,y])=>[x,R(y)]);
  // Torso: shoulder line, chest, a readable waist and a hip transition.
  tailored(body,RY(W([[.9,.165,.118],[.97,.18,.124],[1.06,.158,.114],[1.13,.136+(k-1)*.12,.104],[1.24,.162,.114],[1.35,.198,.128],[1.42,.222,.124],[1.47,.208,.11],[1.52,.12,.085],[1.545,.06,.055]])),top,14);
  tailored(body,RY([[1.5,.048,.045],[1.6,.038,.038],[1.7,.039,.038]]),skinMat,10);
  // Belt at the waist, everyone: the clearest single read of an anime figure.
  tailored(body,RY(W([[1.1,.144+(k-1)*.12,.11],[1.15,.142+(k-1)*.12,.109]])),archetype==='guard'||archetype==='engineer'?gloveInk:leather,14);
  box(body,0,R(1.125),.113*kz,.05,.04,.012,brass);
  if(kit.coat){
    // Asymmetric double-breasted front, lapel and a standing collar.
    panel(body,RP([[.035,1.44],[.075,1.43],[.06,1.26],[.038,1.29]]),.14*kz,accent);
    for(const y of [1.2,1.28,1.36])sphere(body,.085,R(y),.125*kz+.003,.014,brass);
    tailored(body,RY(W([[1.5,.1,.08],[1.6,.108,.088]])),cloth,12,Math.PI*.3,Math.PI*1.4);
  } else {
    panel(body,RP([[-.05,1.5],[0,1.44],[.05,1.5],[0,1.53]]),.1*kz,ivory);
  }
  if(archetype==='guard'){
    const shield=new T.Shape();shield.moveTo(-.045,.05);shield.lineTo(.045,.05);shield.lineTo(.045,-.01);shield.lineTo(0,-.055);shield.lineTo(-.045,-.01);shield.closePath();
    const badge=new T.Mesh(new T.ShapeGeometry(shield),brass);badge.position.set(-.1,R(1.33),.128*kz+.004);body.add(badge);
    for(const x of [-.012,0,.012])box(body,-.1+x,R(1.335),.131*kz+.004,.006,x?.05:.07,.004,accent);
  }
  if(archetype==='merchant'){for(const side of [-1,1])tailored(body,RY(W([[1.12,.145,.112],[1.24,.17,.122],[1.35,.205,.135],[1.43,.228,.131]])),cloth,6,side<0?-Math.PI*.45:Math.PI*.07,Math.PI*.38);const sash=box(body,0,R(1.24),.131*kz,.05,.5,.012,accent);sash.rotation.z=.6;torus(body,0,R(1.47),.07,.07,.01,brass).rotation.x=1.2;}
  if(kit.tails==='apron'){tailored(body,RY(W([[1.38,.14,.132],[1.1,.15,.122],[.9,.2,.14],[.62,.21,.13]])),apronCanvas,10,-Math.PI*.42,Math.PI*.84);
    for(const x of [-.1,.1])box(body,x,R(.98),.15,.07,.08,.02,leather);}
  if(archetype==='engineer'||archetype==='courier'||(archetype==='worker'&&seed%3===0)){const strap=box(body,0,R(1.26),.122,.036,.66,.014,leather);strap.rotation.z=-.62;
    const bag=new T.Shape();bag.moveTo(-.09,.1);bag.lineTo(.09,.1);bag.quadraticCurveTo(.12,-.1,.06,-.12);bag.lineTo(-.06,-.12);bag.quadraticCurveTo(-.12,-.1,-.09,.1);
    const mesh=new T.Mesh(new T.ExtrudeGeometry(bag,{depth:.07,bevelEnabled:true,bevelThickness:.012,bevelSize:.014,bevelSegments:1}),leather);mesh.position.set(.19,R(1.0),.02);mesh.rotation.y=.35;body.add(mesh);box(body,.19,R(1.07),.1,.04,.035,.01,brass);}
  if(archetype==='engineer'){const strap=box(body,0,R(1.26),.122*kz+.006,.036,.66,.014,leather);strap.rotation.z=.62;for(const x of [-.1,.06])box(body,x,R(1.06),.126*kz,.07,.08,.05,leather);torus(body,-.1,R(1.07),.156*kz,.018,.006,brass);}
  bakeCharacter(body);
  // Coat tails, skirts and aprons hang from the waist and swing with motion.
  const tails=new T.Group();tails.position.y=R(1.08);body.add(tails);
  const flare=(length:number,width:number,mat:Material,start=0,arc=Math.PI*2)=>{length*=1.22;return tailored(tails,W([[.02,.146+(k-1)*.12,.112],[-.12,.18+width*.2,.135+width*.15],[-length*.6,.2+width*.6,.15+width*.45],[-length,.21+width,.16+width*.6]]),mat,14,start,arc);};
  if(kit.tails==='coat')flare(.46,.05,cloth,Math.PI*.62,Math.PI*.76);
  if(kit.tails==='long')flare(.5,.1,cloth,Math.PI*.18,Math.PI*1.64);
  if(kit.tails==='skirt')flare(.42,.1,secondary);
  if(kit.tails==='dress')flare(.48,.14,cloth);
  if(kit.tails==='short')flare(.2,.02,top,Math.PI*.2,Math.PI*1.6);
  bakeCharacter(tails);
  const scarf=new T.Group();scarf.position.set(-.04,R(1.51),.1);body.add(scarf);
  if(kit.hat==='scarf'||archetype==='courier'||(archetype==='resident'&&!dress)){tailored(scarf,[[0,.095,.066],[.06,.09,.062]],accent);panel(scarf,[[-.07,.02],[.025,.01],[.01,-.25],[-.06,-.22]],.07,accent);}bakeCharacter(scarf);
  // Head and hair.
  const head=new T.Group();head.position.y=1.87;head.scale.set(.66,.72,.68);body.add(head);
  const jaw=.94+(seed*7%5)*.03;
  // Anime head: a round cranium, soft cheeks and a small chin carried forward.
  const rings=[[-.228,.03,.03,.04],[-.2,.075*jaw,.085,.028],[-.15,.118*jaw,.126,.012],[-.11,.145,.142,.004],[-.07,.163,.154,0],[.03,.18,.172,-.006],[.13,.168,.163,-.016],[.205,.112,.112,-.022],[.245,.004,.004,-.022]];
  const skull=tailored(head,rings,faces[skinTone],24,-Math.PI,Math.PI*2);
  const uv=skull.geometry.attributes.uv;for(let j=0;j<rings.length;j++)for(let i=0;i<=24;i++){uv.setX(j*25+i,uv.getX(j*25+i)/7);uv.setY(j*25+i,((Math.max(-.22,rings[j][0])+.22)/.465+3-seed%4)/4);}
  // Harder, more angular face: a flattened front plane (cheekbone edge) and a jaw that
  // tapers to a V toward the chin. The painted features keep the same UVs.
  {const pos=skull.geometry.attributes.position;for(let i=0;i<pos.count;i++){let x=pos.getX(i),z=pos.getZ(i);const y=pos.getY(i),front=Math.max(0,z)/(.17);
    if(y<-.04){const t=Math.min(1,(-.04-y)/.19);x*=1-t*.32*Math.min(1,front*1.4);z*=1-t*.08;}
    if(z>.128&&y>-.16&&y<.1)z=.128+(z-.128)*.35;
    if(y>-.08&&y<.02&&Math.abs(x)>.13)x*=1.03;
    pos.setXYZ(i,x,y,z);}skull.geometry.computeVertexNormals();}
  for(const side of [-1,1]){const ear=sphere(head,side*.177,-.035,-.005,.035,skinMat);ear.scale.set(.027,.046,.033);}
  const hairIndex=(seed*3+Math.floor(seed/4))%4,hairMat=hair[hairIndex],under=shadowHair[hairIndex],rawStyle=(seed*5+Math.floor(seed/8))%8,hatted=kit.hat==='cap'||kit.hat==='peak'||kit.hat==='bowler'||kit.hat==='top',style=hatted&&(rawStyle===0||rawStyle===3||rawStyle===7)?1:rawStyle;
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
  const legs:T.Group[]=[],knees:T.Group[]=[],arms:T.Group[]=[],elbows:T.Group[]=[];
  for(const side of [-1,1]){
    // Legs: shaped thigh, knee, calf and a clear ankle into real boots.
    const hip=new T.Group();hip.position.set(side*.09*k,1.06,0);group.add(hip);legs.push(hip);
    const LT=1.13,LS=1.08,Y=(rings:number[][],f:number)=>rings.map(([y,...r])=>[y*f,...r]);
    tailored(hip,Y(W([[.04,.094,.1],[-.08,.09,.096],[-.26,.07,.076],[-.43,.056,.06]]),LT),kit.trousers,12);bakeCharacter(hip);
    const knee=new T.Group();knee.position.y=-.43*LT;hip.add(knee);knees.push(knee);
    tailored(knee,Y(W([[.01,.057,.061],[-.1,.062,.068],[-.27,.045,.049],[-.4,.039,.043]]),LS),kit.trousers,12);
    const bootMat=kit.boots==='soft'?leather:boot;
    if(kit.boots==='tall'){tailored(knee,Y([[-.08,.068,.073],[-.14,.064,.069],[-.42,.054,.059],[-.49,.059,.065]],LS),bootMat,12);tailored(knee,Y([[-.3,.06,.065],[-.33,.06,.065]],LS),brass,12);}
    else tailored(knee,Y([[-.3,.055,.059],[-.49,.06,.065]],LS),bootMat,12);
    if(kit.boots==='heavy')tailored(knee,Y([[-.33,.063,.067],[-.36,.063,.067]],LS),leather,12);
    foot(knee,-.495*LS,bootMat,kit.boots==='heavy');bakeCharacter(knee);
    // Arms: rounded shoulder cap, shaped upper arm, tapered forearm, small hand.
    const shoulder=new T.Group();shoulder.position.set(side*.212*k,R(1.44),0);body.add(shoulder);arms.push(shoulder);
    const LU=1.2,LF=1.17,A=(rings:number[][],f:number)=>rings.map(([y,...r])=>[y*f,...r]);
    const sleeve=kit.sleeve==='rolled'?kit.shirt:top;
    tailored(shoulder,A(W([[.075,.02,.02],[.05,.056,.058],[0,.066,.068],[-.12,kit.sleeve==='puff'?.074:.058,kit.sleeve==='puff'?.074:.06],[-.25,.046,.048]]),LU),sleeve,12).rotation.z=side*.06;
    if(archetype==='guard'){const pad=sphere(shoulder,side*.02,.035,0,1,cloth);pad.scale.set(.1,.05,.095);torus(shoulder,side*.02,.02,0,.085,.012,brass).rotation.x=Math.PI/2;}
    bakeCharacter(shoulder);
    const elbow=new T.Group();elbow.position.set(side*.015,-.25*LU,0);elbow.rotation.x=-.12;shoulder.add(elbow);elbows.push(elbow);
    if(kit.sleeve==='rolled'){tailored(elbow,A([[.03,.058,.06],[-.03,.058,.06]],LF),kit.shirt,12);tailored(elbow,A([[0,.043,.045],[-.08,.046,.046],[-.2,.033,.035],[-.24,.03,.032]],LF),skinMat,10);}
    else{tailored(elbow,A([[.01,.048,.05],[-.08,.051,.051],[-.2,.039,.041],[-.235,.038,.04]],LF),sleeve,12);tailored(elbow,A([[-.19,.043,.045],[-.237,kit.coat?.054:.045,kit.coat?.056:.047]],LF),kit.coat?accent:ivory,12);}
    hand(elbow,kit.hands,side,LF);bakeCharacter(elbow);
  }
  // Early Terra: patches and grime. Later: brass watch chains and clean trims.
  const worn=new T.Group();body.add(worn);
  panel(worn,RP([[-.15,1.02],[-.08,1.015],[-.085,.94],[-.16,.95]]),.15*kz,toon('#7d6a58'));panel(worn,RP([[.06,1.34],[.13,1.33],[.12,1.27],[.07,1.28]]),.135*kz,toon('#6f6352'));
  bakeCharacter(worn);
  const finery=new T.Group();body.add(finery);
  const chain=torus(finery,.06,R(1.2),.116*kz,.05,.006,brass);chain.rotation.set(0,0,.2);sphere(finery,.1,R(1.17),.118*kz,.016,brass);
  if(archetype!=='worker')torus(finery,0,R(1.51),.02,.075,.01,brass).rotation.x=1.25;
  bakeCharacter(finery);finery.visible=false;
  body.position.y-=.14;for(const leg of legs)leg.position.y-=.14;
  group.scale.set(1+(seed%4-1.5)*.03,.95+(seed%5)*.022,1);
  group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
  const motion={stride:seed*1.3,gait:0,speed:0,prevX:NaN,prevZ:0,prevYaw:0,turn:0,tail:0,tailV:0,hair:0,hairV:0,tempo:.88+((seed*37)%25)/100,idle:0};
  return {group,body,legs,knees,arms,elbows,head,worn,finery,scarf,tails,swing,face,archetype,motion,phase:seed*1.7,expression:'neutral' as Expression,gaze:'away',setExpression(state:Expression){this.expression=state;face.userData.expression=expressions.indexOf(state);}};
}

export type Citizen=ReturnType<typeof citizen>;
