import * as T from 'three';
import type { Citizen, Expression } from './citizens';
import type { Archetype } from './palette';
export type Activity='talk'|'browse'|'guard'|'carry'|'walk'|'read'|'hammer'|'sweep'|'warm'|'gauge'|'valve'|'argue'|'sit'|'eat'|'lean'|'watch'|'clipboard'|'repair';
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
let weariness=1;let raining=false;
/** Early Terra walks tired; prosperity straightens backs. Rain opens umbrellas. */
export function setLifeConditions(stage:number,rain:boolean){weariness=Math.max(0,1-stage/3);raining=rain;}
const hipHeight=.92,bodyHeight=-.14,seatDrop=.54;
// Parameterized personality: one motion system, different bodies.
const personality:Record<string,{cad:number;arm:number;bob:number;lean:number;stride:number;gesture:number}>={
  worker:{cad:.92,arm:.34,bob:.032,lean:.07,stride:.44,gesture:1},engineer:{cad:1.12,arm:.38,bob:.022,lean:.09,stride:.46,gesture:.9},
  merchant:{cad:.96,arm:.3,bob:.02,lean:.03,stride:.4,gesture:1.45},guard:{cad:.9,arm:.2,bob:.014,lean:-.01,stride:.44,gesture:.6},
  resident:{cad:.95,arm:.28,bob:.02,lean:.04,stride:.4,gesture:1.1},courier:{cad:1.18,arm:.42,bob:.028,lean:.1,stride:.48,gesture:1}};
const ease=(x:number)=>x*x*(3-2*x),clamp01=(x:number)=>Math.min(1,Math.max(0,x));
const STANCE=.62,LEG=.92;
/** Stance: the foot sweeps back linearly (planted). Swing: it eases forward and lifts. */
function footPhase(c:number){const u=c/(Math.PI*2)-Math.floor(c/(Math.PI*2));
  if(u<STANCE)return {z:1-2*u/STANCE,lift:0,stanceU:u/STANCE};const t=(u-STANCE)/(1-STANCE);return {z:-1+2*ease(t),lift:Math.sin(Math.PI*t),stanceU:0};}
const fract=(x:number)=>x-Math.floor(x);
/** Irregular turn-taking per pair: uneven shares and short pauses where neither speaks. */
export function turnTaking(time:number,self:number,partner:number){const pair=Math.min(self,partner),period=7.5+(pair%4)*1.8,u=fract((time+pair*5.3)/period),share=.45+(pair%3)*.08;
  if(Math.abs(u-share)<.04||u>.96)return false;return (u<share)===(self<partner);}
export function animateLife(n:Citizen,activity:Activity,dt:number,time:number,calm:boolean,player:T.Vector3,target?:T.Vector3,speaking=false,moving=false){void moving;
  const m=n.motion,pr=personality[n.archetype]??personality.resident,tempo=m.tempo,phase=time*tempo+n.phase,breath=Math.sin(phase*1.1);
  const pos=n.group.position,yaw=n.group.rotation.y;
  // Gait comes from real velocity, so route easing produces anticipation and settling.
  if(Number.isNaN(m.prevX)){m.prevX=pos.x;m.prevZ=pos.z;m.prevYaw=yaw;}
  const step=Math.max(dt,1e-4),speed=Math.hypot(pos.x-m.prevX,pos.z-m.prevZ)/step,turnRate=angle(yaw-m.prevYaw)/step;m.prevX=pos.x;m.prevZ=pos.z;m.prevYaw=yaw;
  const accel=(speed-m.speed)/step;m.speed+=(Math.min(speed,1.5)-m.speed)*Math.min(1,dt*8);m.turn+=(turnRate-m.turn)*Math.min(1,dt*6);
  const turning=Math.abs(m.turn)>.25&&m.speed<.1,target_g=clamp01(m.speed/.35)+(turning?.35:0);m.gait+=(Math.min(1,target_g)-m.gait)*Math.min(1,dt*5);
  const g=calm?m.gait*.5:m.gait,load=activity==='carry'?1.25:1;
  // Planted feet: stride rate is solved from speed so the stance foot moves backward
  // exactly as fast as the body moves forward. Turning in place still takes steps.
  const A=turning?.13:Math.min(.42,Math.max(.12,.16+.3*m.speed))*(pr.stride/.44),stepRate=turning?2.4*pr.cad:STANCE*Math.PI*m.speed/(LEG*A);
  m.stride+=dt*Math.max(stepRate,.4)/load;
  const c=m.stride,seated=activity==='sit'||activity==='eat',tired=weariness*(activity==='guard'?.3:1);
  // Idle weight transfer holds on one leg, then shifts: never a metronome.
  const shift=Math.tanh(3*Math.sin(phase*.21+n.phase))*(1-g),bob=pr.bob*load*g*(Math.cos(2*c)*.5+.5);
  n.body.position.set(shift*.022+g*Math.cos(c)*.012,bodyHeight+bob-(seated?seatDrop:0)+breath*.003*(1-g),0);
  n.body.rotation.set(g*(pr.lean+tired*.05)+(1-g)*tired*.06-(activity==='lean'?.07:0)-(activity==='carry'?.08:0)+(seated?-.06:0),-g*Math.sin(c)*.09+m.turn*.06,shift*.025+g*Math.sin(c)*.012);
  const feet=[footPhase(c),footPhase(c+Math.PI)];
  n.legs.forEach((leg,k)=>{const {z,lift,stanceU}=feet[k];leg.position.y=hipHeight-(seated?seatDrop:0);
    if(seated){leg.position.z=0;leg.rotation.set(-1.42,0,(k?-1:1)*.06);n.knees[k].rotation.x=1.4+(activity==='eat'&&k?Math.sin(phase)*.05:0);return;}
    const stance=k===0?Math.max(0,-shift):Math.max(0,shift),amp=A*g;
    leg.position.z=0;leg.rotation.set(-amp*z+(1-g)*(k?-.02:.03),0,activity==='lean'&&k===1?-.1:(k?-1:1)*stance*.02);
    n.knees[k].rotation.x=.05+g*(.95*lift+.07*Math.sin(Math.PI*stanceU))+(1-g)*(k===0?Math.max(0,shift):Math.max(0,-shift))*.14;});
  n.arms.forEach((arm,k)=>{const z=feet[k].z;arm.rotation.set(pr.arm*g*z-.05+breath*.008,0,(k?-1:1)*(.07+tired*.03));n.elbows[k].rotation.x=-.15-g*.3*Math.max(0,z)-(1-g)*.03*Math.sin(phase*.7+k);});
  let expression:Expression=tired>.6&&(phase%13)<5?'tired':'neutral';
  let nod=0,tilt=0;
  if(activity==='talk'||activity==='browse'||activity==='argue'){
    // Listen → react → gesture → settle. Gestures come in bursts, not on a beat.
    const burst=Math.max(0,Math.sin(phase*.55))*pr.gesture,gesture=Math.pow(Math.max(0,Math.sin(phase*2.3)),2)*burst;
    expression=activity==='argue'?(speaking?'annoyed':'focused'):speaking?(activity==='browse'?'focused':'happy'):'neutral';
    if(speaking){const big=activity==='argue'?1.5:1;n.arms[0].rotation.set(-.3-gesture*.45*big,0,.2+gesture*.15);n.elbows[0].rotation.x=-.75-gesture*.35;
      if(activity==='argue'||gesture>.8){n.arms[1].rotation.set(-.25-Math.max(0,Math.sin(phase*1.9+1))*.4*big,0,-.22);n.elbows[1].rotation.x=-.9;}
      tilt=Math.sin(phase*.9)*.05;}
    else if(activity!=='browse'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.14,0,(k?-1:1)*.42);n.elbows[k].rotation.x=-1.5;}
      nod=fract(phase*.27)<.12?Math.sin(fract(phase*.27)/.12*Math.PI*2)*.13:0;tilt=Math.sin(phase*.33)*.06;if(fract(phase*.13)<.05)expression='happy';}
    if(activity==='browse'){n.arms[1].rotation.x=-.45-gesture*.18;n.elbows[1].rotation.x=-.6;if(Math.floor(time/5+n.phase)%7===0)expression='annoyed';}
  }
  if(activity==='read'||activity==='gauge'||activity==='clipboard'){
    // Lean → inspect → write → glance back.
    const u=fract(phase/6.5),inspect=u<.35,write=u>=.35&&u<.75;expression='focused';
    n.body.rotation.x+=inspect?.12*ease(clamp01(u/.1)):write?.06:0;
    n.arms[0].rotation.x=-.62;n.arms[1].rotation.x=activity==='gauge'&&inspect?-.9:-.55;n.elbows[0].rotation.x=-.9;
    if(write||activity==='clipboard'){n.elbows[1].rotation.x=-1.1+Math.sin(phase*7)*.07*(write?1:.3);n.arms[1].rotation.z=-.3;}
    tilt=inspect?.08:0;if(u>.8)tilt=-.05;
  }
  if(activity==='carry'){expression=tired>.3?'tired':'neutral';for(let k=0;k<2;k++){n.arms[k].rotation.set(-.5,0,(k?1:-1)*.1);n.elbows[k].rotation.x=-.95;}}
  if(activity==='hammer'){// Raise → strike → recoil → settle.
    const u=fract(phase*.72),a=u<.55?-.6-1.8*ease(u/.55):u<.64?-2.4+1.95*((u-.55)/.09):u<.76?-.45-.35*Math.sin((u-.64)/.12*Math.PI):-.6;
    expression='focused';n.arms[0].rotation.x=a;n.elbows[0].rotation.x=-.3-(u<.55?.3*ease(u/.55):0);n.arms[1].rotation.x=-.45;n.elbows[1].rotation.x=-.5;n.body.rotation.x=.1+(u>.55&&u<.7?.1:0);}
  if(activity==='repair'){expression='focused';const twist=Math.sin(phase*2.4);for(let k=0;k<2;k++){n.arms[k].rotation.set(-2.5+Math.sin(phase*2.4+k*2)*.12,0,(k?-1:1)*.15);n.elbows[k].rotation.x=-.4-(k===0?Math.max(0,twist)*.25:0);}n.body.rotation.x=-.08;}
  if(activity==='sweep'){expression=tired>.3?'tired':'neutral';const stroke=Math.sin(phase*1.8);n.arms[0].rotation.x=-.45+stroke*.22;n.arms[1].rotation.x=-.4+stroke*.1;n.body.rotation.set(.12,stroke*.08,0);n.body.position.x+=stroke*.035;}
  if(activity==='valve'){// Reach → grip → turn against resistance → release → rest.
    const u=fract(phase/4.2),reach=ease(clamp01(u/.18))*(1-ease(clamp01((u-.74)/.12)));const turnU=clamp01((u-.2)/.54),jerk=Math.floor(turnU*5)/5+ease(fract(turnU*5))/5;
    expression=u>.2&&u<.74?'focused':'neutral';
    for(let k=0;k<2;k++){const r=(k?-1:1)*(Math.cos(jerk*Math.PI*2)*.22);n.arms[k].rotation.set(-.2-.75*reach+(k?.08:-.08)*Math.sin(jerk*Math.PI*2)*reach,0,(k?-.1:.1)+r*reach);n.elbows[k].rotation.x=-.3-.25*reach;}
    n.body.rotation.x=.04+.1*reach;}
  if(activity==='warm'){expression='tired';const rub=Math.sin(phase*6)*.06;for(let k=0;k<2;k++){n.arms[k].rotation.set(-.9+breath*.06,0,(k?1:-1)*(.25+rub));n.elbows[k].rotation.x=-.9;}n.body.rotation.x=.1;}
  if(activity==='guard'){expression=Math.floor(time/12+n.phase)%3===0?'annoyed':'focused';for(let k=0;k<2;k++){n.arms[k].rotation.set(.15,0,(k?1:-1)*-.12);n.elbows[k].rotation.x=-.25;}}
  if(activity==='lean'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.14,0,(k?-1:1)*.42);n.elbows[k].rotation.x=-1.52;}}
  if(activity==='watch'){expression=(phase%10)<3?'surprised':'happy';for(let k=0;k<2;k++){n.arms[k].rotation.set(.2,0,(k?1:-1)*-.15);n.elbows[k].rotation.x=-.5;}if((phase%10)<3){n.arms[0].rotation.set(-2.2,0,.2);n.elbows[0].rotation.x=-.1;}}
  if(seated){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.35,0,(k?-1:1)*.05);n.elbows[k].rotation.x=-.6;}
    if(activity==='eat'){const bite=Math.max(0,Math.sin(phase*.9));n.arms[0].rotation.x=-.4-bite*.9;n.elbows[0].rotation.x=-.8-bite*1.1;expression=bite>.8?'happy':'neutral';}}
  const umbrella=n.group.userData.umbrella as T.Object3D|undefined;
  if(umbrella){umbrella.visible=raining;if(raining){n.arms[1].rotation.set(-.55,0,-.1);n.elbows[1].rotation.x=-1.3;}}
  // Secondary motion: damped springs driven by gait, acceleration and turning.
  const near=(player.x-pos.x)**2+(player.z-pos.z)**2;
  if(!calm&&near<1600){
    const tailTarget=-g*.1-clamp01(Math.abs(accel))*Math.sign(accel)*.12+Math.sin(c*2)*.03*g,hairTarget=.08+g*.22-m.turn*.05;
    m.tailV+=((tailTarget-m.tail)*55-m.tailV*8)*dt;m.tail+=m.tailV*dt;m.hairV+=((hairTarget-m.hair)*35-m.hairV*6)*dt;m.hair+=m.hairV*dt;
    n.tails.rotation.set(m.tail,0,g*Math.sin(c)*.035-m.turn*.03);n.swing.rotation.set(m.hair,0,Math.sin(c)*.08*g-m.turn*.08);n.scarf.rotation.x=m.tail*.8+Math.sin(phase*2.2)*.02;
  } else {n.tails.rotation.set(0,0,0);n.swing.rotation.set(.05,0,0);n.scarf.rotation.x=0;}
  // Brief, staggered glances; turns are led by the head.
  const dx=player.x-pos.x,dz=player.z-pos.z,close=dx*dx+dz*dz<14;
  const glance=close&&(phase%11)<1.35;
  let headYaw=Math.sin(phase*.39)*.12*(1-g)+m.turn*.28,pitch=activity==='read'||activity==='clipboard'?.2:activity==='browse'?.1:activity==='watch'?-.38:activity==='repair'?-.45:tired*.12;
  n.gaze='away';
  if(glance){look.copy(player);n.gaze='player';if((phase%11)<.45&&!seated)expression='surprised';
    const idleHands=activity==='guard'||activity==='lean'||activity==='sit'||activity==='watch'||(activity==='talk'&&!speaking)||activity==='walk';
    if(idleHands&&Math.floor(n.phase*3)%3===0&&(phase%11)>.35&&(phase%11)<1.3&&dx*dx+dz*dz<9){n.arms[0].rotation.set(-2.7,0,.4);n.elbows[0].rotation.x=-.35+Math.sin(phase*13)*.35;expression='happy';}}
  else if(target&&(phase%9)<6.8){look.copy(target);n.gaze='partner';}
  if(n.gaze!=='away'){
    const relative=angle(Math.atan2(look.x-pos.x,look.z-pos.z)-yaw);
    if(Math.abs(relative)<1.25)headYaw=T.MathUtils.clamp(relative,-.48,.48);else n.gaze='away';
  }
  // Head stabilization: the head cancels torso lean and twist.
  const blend=1-Math.exp(-dt*4);n.head.rotation.y=T.MathUtils.lerp(n.head.rotation.y,T.MathUtils.clamp(headYaw-n.body.rotation.y,-.6,.6),blend);
  n.head.rotation.x=T.MathUtils.lerp(n.head.rotation.x,pitch-n.body.rotation.x*.8+nod+(speaking?Math.sin(phase*2)*.03:0),blend);
  n.head.rotation.z=calm?0:breath*.012+tilt;
  if((phase%4.7)<.13)expression='blink';n.setExpression(expression);
}
/** Route distance with acceleration and deceleration ramps (meters). */
function eased(d:number,L:number,a=1.1){const k=L/(L-a);if(d<a)return d*d/(2*a)*k;if(d<L-a)return (d-a/2)*k;return (L-a-(L-d)*(L-d)/(2*a))*k;}
export function stageCitizen(n:Citizen,index:number,time:number){
  const scene=sceneFor(index);let z=scene.z,yaw=scene.yaw,moving=false;
  if(scene.route){
    const length=scene.route,cycle=(time*(scene.speed??.4)+index*3)%(length*2+5);
    if(cycle<length){z-=eased(cycle,length);yaw=Math.PI;moving=true;}
    else if(cycle<length+2.5){z-=length;yaw=Math.PI*(1-T.MathUtils.smoothstep(cycle-length,.4,2.3));}
    else if(cycle<length*2+2.5){z-=length-eased(cycle-length-2.5,length);yaw=0;moving=true;}
    else yaw=Math.PI*T.MathUtils.smoothstep(cycle-length*2-2.5,.4,2.3);
  }
  n.group.position.set(scene.x,.18,z);n.group.rotation.y=yaw;return {scene,moving};
}
