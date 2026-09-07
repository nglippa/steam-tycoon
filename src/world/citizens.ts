import * as T from 'three';
import { palette as P, wardrobes, type Archetype } from './palette';
import { box, cyl, sphere, torus, bake, mats, type Material } from './assets';

const ramp = new T.DataTexture(new Uint8Array([128, 202, 255]), 3, 1, T.RedFormat);
ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.generateMipmaps = false; ramp.needsUpdate = true;
const toon = (color: T.ColorRepresentation) => new T.MeshToonMaterial({ color, gradientMap: ramp });
const skinColors = P.skin;
const skin = skinColors.map(toon);
const hair = P.hair.map(toon);
const boot = toon(P.neutral.ink), brass = toon(P.metal.brass), ivory = toon(P.neutral.paper);
const scarves = ['#b44f43','#4c9c93','#c69546'].map(toon);
const coloredToon = new T.MeshToonMaterial({ vertexColors:true, gradientMap:ramp });
const wardrobePhase={value:0};
coloredToon.onBeforeCompile=shader=>{
  shader.uniforms.wardrobePhase=wardrobePhase;
  shader.vertexShader='attribute vec3 restoredColor; uniform float wardrobePhase;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nvColor=mix(vColor,restoredColor,wardrobePhase);');
};
coloredToon.customProgramCacheKey=()=> 'terra-wardrobe-colors';
export function setCitizenProsperity(stage:number){wardrobePhase.value=Math.min(1,stage/5);}
const wardrobeMaterials=new Map<string,T.MeshToonMaterial>();
function outfitMaterial(early:string,late=early){const key=early+late;let m=wardrobeMaterials.get(key);if(!m){m=toon(early);m.userData.restoredColor=late;wardrobeMaterials.set(key,m);}return m;}
export const expressions=['neutral','happy','tired','focused','annoyed','blink'] as const;
export type Expression=typeof expressions[number];

// Elliptical rings make a continuous tailored silhouette instead of stacked boxes.
function tailored(g:T.Object3D, rings:number[][], material:Material, segments=10, start=0, arc=Math.PI*2) {
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  rings.forEach(([y,w,d],j)=>{for(let i=0;i<=segments;i++){const a=start+i/segments*arc;positions.push(Math.sin(a)*w,y,Math.cos(a)*d);uv.push(i/segments,j/(rings.length-1));}});
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
    geometry.setAttribute('restoredColor',new T.BufferAttribute(late,3));object.geometry=geometry;object.material=coloredToon;
  });return bake(group);
}
// One atlas per skin tone: four face archetypes, five expressions and a blink.
// Face selection uses the existing BatchedMesh instance color channel as an index.
const faces=skinColors.map(tone=>{
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;const c=canvas.getContext('2d')!;
  for(let type=0;type<4;type++)for(let state=0;state<6;state++){
    c.save();c.translate(state*256,type*256);c.scale(.5,.5);c.fillStyle=tone;c.fillRect(0,0,512,512);c.lineCap='round';c.lineJoin='round';
    for(const side of [-1,1]){
      const x=256+side*41,y=276+(type===3?4:0),rise=state===2?5:state===1?18:[15,10,13,8][type];
      const tilt=state===3?side*5:state===4?side*8:type===0?side*2:0;
      c.strokeStyle=P.neutral.ink;c.lineWidth=4;
      if(state===5){c.beginPath();c.moveTo(x-23,y);c.quadraticCurveTo(x,y+9,x+23,y);c.stroke();}
      else {c.fillStyle=P.neutral.paper;c.beginPath();c.moveTo(x-23,y);c.quadraticCurveTo(x,y-rise,x+23,y+tilt);c.quadraticCurveTo(x,y+11,x-23,y);c.fill();
        c.fillStyle=P.neutral.ink;c.beginPath();c.ellipse(x,y+1,7,state===2?5:9,0,0,Math.PI*2);c.fill();
        c.beginPath();c.moveTo(x-24,y);c.quadraticCurveTo(x,y-rise,x+23,y+tilt);c.stroke();}
      const slant=state===4?side*13:state===3?side*7:state===2?-side*7:0;
      c.lineWidth=5;c.beginPath();c.moveTo(x-21,y-23-slant);c.quadraticCurveTo(x,y-30,x+19,y-23+slant);c.stroke();
      if(type===3){c.strokeStyle='#9a736b';c.lineWidth=2;c.beginPath();c.moveTo(x+side*23,y+9);c.lineTo(x+side*29,y+13);c.stroke();}
    }
    c.strokeStyle='#9b6b64';c.lineWidth=3;c.beginPath();c.moveTo(259,307);c.lineTo(252,328);c.lineTo(260,331);c.stroke();
    c.strokeStyle='#76515a';c.beginPath();c.moveTo(240,367);c.quadraticCurveTo(256,state===1?389:state===4?357:state===2?363:371,272,366);c.stroke();
    if(state===1){c.strokeStyle='#f2c2af';c.lineWidth=7;for(const x of [200,310]){c.beginPath();c.moveTo(x-8,316);c.lineTo(x+8,317);c.stroke();}}
    c.restore();
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=T.LinearFilter;
  const m=new T.MeshToonMaterial({map,gradientMap:ramp,emissive:P.neutral.paper,emissiveMap:map,emissiveIntensity:.12});
  m.userData.faceAtlas=true;
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\n#ifdef USE_BATCHING_COLOR\nvColor=vec3(1.);vMapUv.x+=(batchingColor.r-1.)/6.;vEmissiveMapUv.x+=(batchingColor.r-1.)/6.;\n#endif');
  };
  m.customProgramCacheKey=()=> 'terra-expression-atlas';return m;
});
const contactShape=new T.CircleGeometry(.28,14);
const contactInk=new T.MeshBasicMaterial({color:'#253d40',transparent:true,opacity:.19,depthWrite:false});
function hairChunk(g:T.Group,points:number[][],z:number,depth:number,material:Material){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),material);mesh.position.z=z;g.add(mesh);return mesh;}

export function citizen(coat:Material=mats.rust,seed=0,archetype:Archetype='worker'){
  const group=new T.Group(),body=new T.Group();group.add(body);
  const contact=new T.Mesh(contactShape,contactInk);contact.rotation.x=-Math.PI/2;contact.position.y=-.10;contact.scale.y=.7;group.add(contact);
  void coat;
  const outfit=wardrobes[archetype][(seed+Math.floor(seed/4))%wardrobes[archetype].length];
  const cloth=outfitMaterial(outfit[0],outfit[3]),secondary=outfitMaterial(outfit[1]),accent=outfitMaterial(outfit[2]);
  const role=seed%4,skinTone=seed%3;
  tailored(body,[[.89,.245,.158],[.98,.225,.156],[1.18,.18,.13],[1.36,.23,.155],[1.49,.22,.145],[1.55,.11,.09]],cloth);
  cyl(body,0,1.58,0,.068,.17,skin[skinTone]);
  if(role!==2)tailored(body,[[1.0,.184,.17],[1.18,.177,.142],[1.43,.205,.164]],secondary,8,-.72,1.44);
  for(const side of [-1,1])panel(body,[[side*.06,1.53],[side*.165,1.45],[side*.075,1.32],[side*.025,1.43]],.155,ivory);
  for(const y of [1.14,1.29,1.41])sphere(body,.025,y,.17,.016,brass);
  tailored(body,[[1.06,.196,.152],[1.095,.194,.152]],boot);
  box(body,0,1.078,.158,.06,.038,.013,brass);
  if(role===0||role===3){const strap=box(body,0,1.25,.183,.039,.6,.016,boot);strap.rotation.z=-.5;
    const bag=new T.Shape();bag.moveTo(-.10,.13);bag.lineTo(.1,.13);bag.quadraticCurveTo(.14,-.13,.07,-.16);bag.lineTo(-.07,-.16);bag.quadraticCurveTo(-.14,-.13,-.1,.13);
    const mesh=new T.Mesh(new T.ExtrudeGeometry(bag,{depth:.07,bevelEnabled:true,bevelThickness:.012,bevelSize:.016,bevelSegments:1,steps:1}),boot);mesh.position.set(.225,1.0,.055);body.add(mesh);box(body,.225,1.10,.141,.18,.045,.012,cloth);box(body,.225,1.05,.149,.045,.04,.012,brass);
  }
  bakeCharacter(body);
  const scarf=new T.Group();scarf.position.set(-.04,1.51,.12);group.add(scarf);
  if(role!==1){tailored(scarf,[[0,.095,.056],[.065,.09,.055]],accent);panel(scarf,[[-.075,.02],[.025,.01],[.01,-.27],[-.065,-.23]],.075,accent);}bakeCharacter(scarf);
  const head=new T.Group();head.position.y=1.83;group.add(head);
  const rings=[[-.22,.04,.055],[-.17,.108,.12],[-.07,.17,.156],[.045,.178,.17],[.145,.145,.15],[.22,.085,.09],[.245,.005,.005]];
  const skull=tailored(head,rings,faces[skinTone],16,-Math.PI,Math.PI*2);
  const uv=skull.geometry.attributes.uv;for(let j=0;j<rings.length;j++)for(let i=0;i<=16;i++){uv.setX(j*17+i,uv.getX(j*17+i)/6);uv.setY(j*17+i,((rings[j][0]+.22)/.465+3-seed%4)/4);}
  for(const side of [-1,1]){const ear=sphere(head,side*.177,-.035,-.005,.035,skin[skinTone]);ear.scale.set(.027,.046,.033);}
  const hairMat=hair[seed%4],style=seed%6;
  const crown=new T.Mesh(new T.SphereGeometry(.195,12,7,0,Math.PI*2,0,Math.PI*.55),hairMat);crown.position.y=.068;crown.scale.set(1,1,.95);head.add(crown);
  if(style===0||style===5){hairChunk(head,[[-.18,.17],[-.07,.23],[.17,.16],[.09,.065],[.05,.12],[-.1,.035]],.125,.07,hairMat);hairChunk(head,[[.12,.17],[.2,.12],[.18,-.1],[.14,-.04]],-.015,.1,hairMat);}
  else if(style===1||style===4){hairChunk(head,[[-.18,.17],[-.11,.23],[-.03,.17],[.06,.23],[.17,.14],[.12,.03],[.05,.11],[-.005,.02],[-.055,.10],[-.13,.045]],.13,.07,hairMat);}
  else {hairChunk(head,[[-.19,.12],[-.07,.23],[.13,.19],[.17,.08],[.09,.1],[.03,.16],[-.1,.02],[-.17,-.06]],.10,.095,hairMat);}
  if(style===2){const tie=sphere(head,0,.085,-.18,.065,accent);void tie;const tail=tailored(head,[[.1,.075,.07],[-.08,.10,.075],[-.25,.065,.045],[-.34,.025,.025]],hairMat);tail.position.z=-.23;tail.rotation.x=-.3;}
  if(style===3){const bun=sphere(head,.02,.13,-.19,.10,hairMat);bun.scale.set(.105,.12,.095);torus(head,.02,.13,-.225,.093,.012,accent);}
  if(style===0||style===4){const cap=cyl(head,0,.205,-.02,.186,.085,cloth);cap.rotation.z=-.09;const brim=sphere(head,0,.17,.10,.1,boot);brim.scale.set(.207,.025,.16);
    for(const x of [-.066,.066]){torus(head,x,.205,.155,.038,.011,brass);const lens=sphere(head,x,.205,.155,.026,boot);lens.scale.z*=.28;}
  }
  bakeCharacter(head);
  const face=head.children.find(o=>o instanceof T.Mesh&&o.material===faces[skinTone]) as T.Mesh;face.userData.expression=0;
  const legs:T.Group[]=[],knees:T.Group[]=[],arms:T.Group[]=[],elbows:T.Group[]=[];
  for(const side of [-1,1]){
    const hip=new T.Group();hip.position.set(side*.105,.98,0);group.add(hip);legs.push(hip);
    tailored(hip,[[.02,.092,.10],[-.19,.077,.08],[-.43,.061,.064]],boot);bakeCharacter(hip);
    const knee=new T.Group();knee.position.y=-.43;hip.add(knee);knees.push(knee);
    tailored(knee,[[.015,.065,.07],[-.25,.055,.057],[-.42,.052,.061]],boot);
    const shoe=sphere(knee,0,-.45,.05,.1,boot);shoe.scale.set(.077,.065,.147);
    tailored(knee,[[-.28,.061,.068],[-.32,.063,.07]],role===1?ivory:cloth);bakeCharacter(knee);
    const shoulder=new T.Group();shoulder.position.set(side*.247,1.46,0);group.add(shoulder);arms.push(shoulder);
    const upper=tailored(shoulder,[[.025,.075,.083],[-.10,.079,.078],[-.265,.061,.061]],cloth);upper.rotation.z=side*.085;bakeCharacter(shoulder);
    const elbow=new T.Group();elbow.position.set(side*.022,-.255,0);elbow.rotation.x=-.12;shoulder.add(elbow);elbows.push(elbow);
    tailored(elbow,[[.015,.061,.062],[-.16,.049,.052],[-.245,.041,.046]],cloth);
    tailored(elbow,[[-.215,.046,.05],[-.245,.046,.05]],ivory);
    const hand=sphere(elbow,0,-.30,.005,.055,skin[skinTone]);hand.scale.set(.041,.065,.044);bakeCharacter(elbow);
  }
  const worn=new T.Group();group.add(worn);
  if(role===0&&archetype==='worker')panel(worn,[[-.15,1.38],[.12,1.38],[.18,.91],[-.20,.91]],.18,toon('#87725b'));
  else panel(worn,[[-.16,1.02],[-.085,1.015],[-.09,.93],[-.175,.94]],.16,boot);
  bakeCharacter(worn);
  const finery=new T.Group();group.add(finery);
  if((role===0||role===1)&&archetype!=='guard'){panel(finery,[[-.13,1.4],[.13,1.4],[.14,1.08],[-.14,1.08]],.18,accent);for(const y of [1.16,1.27,1.37])sphere(finery,0,y,.19,.016,brass);}
  else{torus(finery,.11,1.19,.185,.036,.008,brass);box(finery,.11,1.25,.185,.008,.08,.008,brass);}bakeCharacter(finery);finery.visible=false;
  for(const child of group.children)if(child!==contact)child.position.y-=.14;
  group.scale.set(1+(seed%4-1.5)*.035,.94+(seed%5)*.025,1);
  group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false;});
  return {group,body,legs,knees,arms,elbows,head,worn,finery,scarf,face,archetype,phase:seed*1.7,expression:'neutral' as Expression,gaze:'away',setExpression(state:Expression){this.expression=state;face.userData.expression=expressions.indexOf(state);}};
}

export type Citizen=ReturnType<typeof citizen>;
