import * as T from 'three';
import type { Citizen, Expression } from './citizens';
import type { Archetype } from './palette';
export type Activity='talk'|'browse'|'guard'|'carry'|'walk'|'read'|'hammer'|'sweep'|'warm'|'gauge'|'valve';
type Scene={x:number;z:number;yaw:number;role:Archetype;activity:Activity;partner?:number;target?:[number,number];route?:number;speed?:number};
// Small authored scenes reuse the existing population. Route endpoints stay in open lanes.
export const streetScenes:Scene[]=[
  {x:8.5,z:47,yaw:Math.PI/2,role:'guard',activity:'guard',partner:1},
  {x:9.9,z:45.9,yaw:-.9,role:'courier',activity:'read',partner:0},
  {x:-5.8,z:-26,yaw:.15,role:'resident',activity:'talk',partner:3},
  {x:-5.6,z:-24.4,yaw:Math.PI,role:'merchant',activity:'talk',partner:2},
  {x:5.65,z:-22,yaw:Math.PI/2,role:'merchant',activity:'browse',partner:5},
  {x:9.55,z:-22,yaw:-Math.PI/2,role:'merchant',activity:'talk',partner:4},
  {x:34.5,z:45,yaw:-2.6,role:'engineer',activity:'talk',partner:7},
  {x:33.6,z:43.5,yaw:.5,role:'worker',activity:'talk',partner:6},
  {x:-40.2,z:5,yaw:Math.PI/2,role:'resident',activity:'talk',partner:9},
  {x:-38.5,z:5.2,yaw:-Math.PI/2,role:'resident',activity:'talk',partner:8},
  {x:35,z:28,yaw:Math.PI,role:'worker',activity:'carry',route:17,speed:.43},
  {x:-39,z:22,yaw:Math.PI,role:'resident',activity:'walk',route:14,speed:.30},
  {x:4.7,z:-27,yaw:Math.PI/2,role:'resident',activity:'browse',target:[7.9,-22]},
  {x:-5.1,z:56,yaw:Math.PI,role:'courier',activity:'walk',route:45,speed:.63},
];
function makeScene(index:number):Scene{
  if(index<streetScenes.length)return streetScenes[index];
  const n=index-14,zone=n%4,offset=Math.floor(n/4);
  if(zone===0){
    if(offset%2===0){const stall=offset/2,side=stall===1?-1:1,z=stall===1?-32:stall===0?-28:-34;return {x:side*9.55,z,yaw:-side*Math.PI/2,role:'merchant',activity:'browse',target:[side*7.9,z]};}
    return {x:(offset%3?-1:1)*4.6,z:-16-offset*2,yaw:Math.PI,role:'merchant',activity:'walk',route:20,speed:.31+offset*.015};
  }
  if(zone===1)return {x:-38.7+offset%2*.9,z:49-offset*8,yaw:Math.PI,role:'resident',activity:'walk',route:14,speed:.28};
  if(zone===2)return {x:34.6+offset%2*.9,z:27-offset*2,yaw:Math.PI,role:'worker',activity:offset%2?'walk':'carry',route:22,speed:.45};
  return {x:(offset%2?-1:1)*5.1,z:59-offset*11,yaw:Math.PI,role:offset%2?'engineer':'courier',activity:'walk',route:30,speed:.54};
}
const scenes=Array.from({length:42},(_,index)=>makeScene(index));
export function sceneFor(index:number){return scenes[index];}
function angle(value:number){return Math.atan2(Math.sin(value),Math.cos(value));}
const look=new T.Vector3();
export function animateLife(n:Citizen,activity:Activity,dt:number,time:number,calm:boolean,player:T.Vector3,target?:T.Vector3,speaking=false,moving=false){
  const phase=time+n.phase,breath=Math.sin(phase*1.1),step=phase*3.15;
  n.body.rotation.z=calm?0:moving?Math.sin(step)*.01:breath*.009;n.body.rotation.y=moving?Math.sin(step)*.025:0;
  n.legs.forEach((leg,k)=>{const cycle=step+k*Math.PI;leg.rotation.x=moving?Math.sin(cycle)*.30:k===0?.035:-.025;n.knees[k].rotation.x=moving?Math.max(0,-Math.sin(cycle))*.40:.035;});
  n.arms.forEach((arm,k)=>{arm.rotation.x=moving?-Math.sin(step+k*Math.PI)*.31:-.12;arm.rotation.z=0;n.elbows[k].rotation.x=-.13;});
  let expression:Expression='neutral';
  const gesture=Math.max(0,Math.sin(phase*1.65));
  if(activity==='talk'||activity==='browse'){
    expression=speaking?(activity==='browse'?'focused':'happy'):'neutral';
    if(activity==='talk'&&speaking){n.arms[0].rotation.x=-.35-gesture*.23;n.elbows[0].rotation.x=-.65;n.arms[0].rotation.z=.18;}
    if(activity==='browse'){n.arms[1].rotation.x=-.4-gesture*.15;n.elbows[1].rotation.x=-.55;if(Math.floor(time/5+n.phase)%7===0)expression='annoyed';}
  }
  if(activity==='read'||activity==='gauge'){
    expression='focused';n.arms[0].rotation.x=-.55;n.arms[1].rotation.x=activity==='read'?-.5:-.15;n.elbows[0].rotation.x=-.85;
  }
  if(activity==='carry'){expression='tired';for(let k=0;k<2;k++){n.arms[k].rotation.x=-.46;n.elbows[k].rotation.x=-.9;}}
  if(activity==='hammer'){expression='focused';n.arms[0].rotation.x=-.7+Math.sin(phase*3.5)*.48;n.elbows[0].rotation.x=-.3;}
  if(activity==='sweep'){expression='tired';n.arms[0].rotation.x=-.45+Math.sin(phase*1.8)*.2;n.arms[1].rotation.x=-.4;n.body.rotation.y=Math.sin(phase*1.8)*.04;}
  if(activity==='valve'){expression='focused';for(let k=0;k<2;k++){n.arms[k].rotation.x=-.8+Math.sin(phase*1.4+k*Math.PI)*.1;n.arms[k].rotation.z=(k?-.12:.12)+Math.cos(phase*1.4)*.09;}}
  if(activity==='warm'){expression='tired';for(const arm of n.arms)arm.rotation.x=-.85+breath*.06;}
  if(activity==='guard')expression=Math.floor(time/12+n.phase)%3===0?'annoyed':'focused';
  // Brief, staggered glances: nearby people remain more interesting than the player.
  const dx=player.x-n.group.position.x,dz=player.z-n.group.position.z,near=dx*dx+dz*dz<14;
  const glance=near&&(phase%11)<1.35;
  let yaw=Math.sin(phase*.39)*.12,pitch=activity==='read'?.16:activity==='browse'?.1:0;
  n.gaze='away';
  if(glance){look.copy(player);n.gaze='player';}
  else if(target&&(phase%9)<6.8){look.copy(target);n.gaze='partner';}
  if(n.gaze!=='away'){
    const relative=angle(Math.atan2(look.x-n.group.position.x,look.z-n.group.position.z)-n.group.rotation.y);
    if(Math.abs(relative)<1.25)yaw=T.MathUtils.clamp(relative,-.48,.48);else n.gaze='away';
  }
  const blend=1-Math.exp(-dt*4);n.head.rotation.y=T.MathUtils.lerp(n.head.rotation.y,yaw,blend);
  n.head.rotation.x=T.MathUtils.lerp(n.head.rotation.x,pitch+(speaking?Math.sin(phase*2)*.025:0),blend);
  n.head.rotation.z=calm?0:breath*.012;n.scarf.rotation.x=calm?0:Math.sin(phase*2.2)*(moving?.07:.025);
  if((phase%4.7)<.13)expression='blink';n.setExpression(expression);
}
export function stageCitizen(n:Citizen,index:number,time:number){
  const scene=sceneFor(index);let z=scene.z,yaw=scene.yaw,moving=false;
  if(scene.route){
    const length=scene.route,cycle=(time*(scene.speed??.4)+index*3)%(length*2+5);
    if(cycle<length){z-=cycle;yaw=Math.PI;moving=true;}
    else if(cycle<length+2.5){z-=length;yaw=Math.PI*(1-T.MathUtils.smoothstep(cycle-length,0,2.5));}
    else if(cycle<length*2+2.5){z-=length*2+2.5-cycle;yaw=0;moving=true;}
    else yaw=Math.PI*T.MathUtils.smoothstep(cycle-length*2-2.5,0,2.5);
  }
  n.group.position.set(scene.x,.18,z);n.group.rotation.y=yaw;return {scene,moving};
}
