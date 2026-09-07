import * as T from 'three';
import { arch, box, sphere, beam, mats, illustrated } from './assets';
import { palette as P } from './palette';
import { V, canopy, artMats } from './art-kit';
export const housingPaint=[P.neutral.plaster,P.cool.dustyBlue,'#c5a0ad'].map(color=>illustrated(new T.MeshStandardMaterial({color,roughness:.94})));
export const housingGlass=['dark','warm','curtain','boarded','cracked','silhouette'].map((state,index)=>{
  const c=document.createElement('canvas');c.width=128;c.height=192;const x=c.getContext('2d')!;
  const gradient=x.createLinearGradient(0,0,0,192);gradient.addColorStop(0,index===0?P.cool.midnight:'#6d7188');gradient.addColorStop(1,index===0?P.metal.iron:P.warm.lamp);x.fillStyle=gradient;x.fillRect(0,0,128,192);
  if(state==='curtain'){x.fillStyle=P.warm.burgundy;for(const side of [0,1]){x.beginPath();x.moveTo(side*128,0);x.lineTo(side?84:44,0);x.quadraticCurveTo(side?113:15,87,side?94:34,192);x.lineTo(side*128,192);x.fill();}}
  if(state==='boarded'){x.fillStyle=P.metal.steel;x.fillRect(0,0,128,192);x.fillStyle=P.warm.timber;for(const y of [38,112]){x.save();x.translate(64,y);x.rotate(-.14);x.fillRect(-70,-13,140,26);x.restore();}}
  if(state==='cracked'){x.strokeStyle=P.neutral.ivory;x.lineWidth=2;x.beginPath();x.moveTo(81,0);x.lineTo(59,67);x.lineTo(83,108);x.lineTo(42,159);x.lineTo(51,192);x.moveTo(59,67);x.lineTo(22,82);x.stroke();}
  if(state==='silhouette'){x.fillStyle=P.cool.midnight;x.beginPath();x.arc(76,122,13,0,Math.PI*2);x.fill();x.beginPath();x.ellipse(76,176,23,45,0,0,Math.PI*2);x.fill();}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  return new T.MeshStandardMaterial({map,emissiveMap:map,emissive:P.neutral.paper,emissiveIntensity:index===0||index===3?.025:.5,roughness:.45});
});
export type Home={x:number;z:number;width:number;height:number;family:number;yaw:number};
export function residentialWindows(g:T.Group,home:Home,level:number){
  const {width:w,height:h,family}=home;
  const columns=family===0?[-w*.29,0,w*.29]:family===1?[-w*.30,-w*.10,w*.10,w*.30]:[-w*.28,0,w*.28];
  const patterns=[[3,0,4,0,2,1],[2,1,0,1,5,2],[1,2,5,0,1,2]];
  for(let row=0,y=4.5;y<h-1.7;row++,y+=3.5)columns.forEach((x,col)=>{
    let state=patterns[family][(row%2)*3+col%3];if(level>0&&(state===3||state===4))state=2;if(level>1&&state===0&&row===0)state=1;
    const ww=family===1?1.1:family===0?1.45:1.7,hh=family===0?1.9:2.3,frame=family===0?mats.wood:family===1?mats.cream:mats.teal;
    arch(g,x,y,.03,ww+.23,hh+.13,frame);arch(g,x,y+.08,.055,ww,hh-.1,housingGlass[state]);box(g,x,y+hh*.44,.09,ww,.06,.08,mats.iron);box(g,x,y+hh*.44,.1,.055,hh*.86,.06,mats.iron);box(g,x,y,.1,ww+.4,.12,.3,mats.stone);
    if(family===1&&col%2===0)for(const side of [-1,1])box(g,x+side*(ww/2+.29),y+hh*.45,.07,.34,hh*.86,.10,col===0?mats.teal:artMats.wine);
    if(level>=2&&row===0&&col%2===0){box(g,x,y-.17,.35,ww+.2,.32,.50,mats.wood);for(let i=0;i<3;i++){sphere(g,x+(i-1)*.35,y+.07,.4,.15,mats.leaf);sphere(g,x+(i-1)*.35,y+.17,.4,.10,col?artMats.wine:mats.cream);}}
  });
  for(const x of [-w*.3,w*.3]){arch(g,x,1,.03,1.6,2.2,mats.stone);arch(g,x,1.08,.06,1.35,2,housingGlass[family===0?3:2]);}
  if(family===1)canopy(g,-w*.27,3.4,.65,4,1.25,artMats.wine);
  if(family===0){for(const x of [-w*.41,w*.41])box(g,x,h/2,.11,.16,h-.5,.13,mats.wood);beam(g,V(-w*.4,3.6,.1),V(-w*.1,7.6,.1),.065,mats.wood);}
  if(family===2){
    beam(g,V(-3.6,7.5,.5),V(2.7,7.5,.5),.017,mats.iron);
    for(const [i,color] of [mats.cream,artMats.wine,mats.teal].entries()){const cloth=new T.Mesh(new T.PlaneGeometry(.9,1.2),color);cloth.position.set(-2.8+i*1.7,6.8,.51);cloth.rotation.z=(i-1)*.06;g.add(cloth);}
  }
}

export function setHousingCondition(level:number){
  const early=[P.neutral.plaster,P.cool.dustyBlue,'#c5a0ad'],late=['#f2e2c9','#acc8dd','#d6bdc5'];
  housingPaint.forEach((material,index)=>material.color.set(early[index]).lerp(new T.Color(late[index]),Math.min(1,level/3)));
}
