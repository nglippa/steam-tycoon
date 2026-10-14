import * as T from 'three';
import type { Citizen, Expression } from './citizens';
import type { Archetype } from './palette';
import { walk, advance, MIN, pose, legZ, STANCE, REST, SOLE, HEEL_X, TOE_X, type Params } from '../simulation/gait';
import { drape, readLegs, rest, drapeSplit, restSplit, holdSplit, seatPanel, carryPanel, seatLong, unseatLong, LAP_SEATED } from './drape';
import { FOOD } from './people/parts';
import { isOccupier, conduct, bodyFor, faceAllowed, moodOfTone, stepMood, nearBand, type Trait, type MoodIn } from '../simulation/occupation';
export type Activity='talk'|'browse'|'guard'|'carry'|'walk'|'read'|'hammer'|'sweep'|'warm'|'gauge'|'valve'|'argue'|'sit'|'eat'|'lean'|'watch'|'clipboard'|'repair';
/** `seed` and `trait` cast one scene by hand: who is let out (0..1, low is out in a harder street) and how they carry themselves. */
type Scene={x:number;z:number;yaw:number;role:Archetype;activity:Activity;partner?:number;target?:[number,number];route?:number;speed?:number;seed?:number;trait?:Trait};
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
  // The first of them walks the Great Main's east pavement along the patrol's beat, and is out even in a heavy street: a nervous courier,
  // so the crossing between the pressure station and the bench is used by someone who would rather not meet the patrol.
  // The third walks the same pavement through the checkpoint's east opening, and is out by day in a heavy street too: someone has to queue at it.
  return {x:(offset%2?-1:1)*5.1,z:59-offset*11,yaw:Math.PI,role:offset%2?'engineer':'courier',activity:'walk',route:30,speed:.54,...(offset===0?{seed:.2,trait:'nervous' as Trait}:offset===2?{seed:.3}:{})};
}
const scenes=Array.from({length:42},(_,index)=>makeScene(index));
export function sceneFor(index:number){return scenes[index];}
function angle(value:number){return Math.atan2(Math.sin(value),Math.cos(value));}
const look=new T.Vector3(),pelvisPoint=new T.Vector3(),hipPoint=new T.Vector3();
let weariness=1;let raining=false;
/** What the street is like where someone stands: occupation as 0..1 (curfew counts as full) and whether the Ordinance is within earshot.
 * The city sets this; people only read it, and only twice a second each. */
/** `threat`, when set, is a member of the Ordinance this person has stopped to watch go by (a live position). */
/** `react`: 0 nothing, 1 stepping aside, pausing or crossing for the Ordinance, 2 a fresh incident. */
export type Social={pressure:number;watched:boolean;react?:number;threat?:{x:number;z:number}};
let socialAt:(x:number,z:number,self:Citizen)=>Social=()=>({pressure:0,watched:false});
export function setSocialField(f:typeof socialAt){socialAt=f;}
const fields=new WeakMap<Citizen,{at:number;social:Social}>();
const moodIn={archetype:'',trait:'reserved',pick:0,pressure:0,watched:false,activity:'',weariness:0,near:0,react:0} as Omit<MoodIn,'startled'|'worried'>&{react:number},hash=(x:number)=>{const v=Math.sin(x*127.1)*43758.5453;return v-Math.floor(v);};
/** The head of someone on duty dwells, then turns: it holds a bearing for seconds and goes to the next in a beat, not a sine sweep. Returns the bearing and, while it is turning, which way the eyes lead (1 left of the figure, -1 right, 0 settled). */
const dwell={yaw:0,lead:0};
function dwelling(t:number,seed:number,amp:number,period:number){const s=t/period+seed,i=Math.floor(s),u=s-i,a0=(hash(i-1+seed*7)*2-1)*amp,a1=(hash(i+seed*7)*2-1)*amp;dwell.yaw=a0+(a1-a0)*ease(clamp01(u/.16));dwell.lead=u<.28?Math.sign(a1-a0):0;return dwell;}
/** Where the chin goes for each face the Ordinance wears (positive is down). */
const CHIN:Partial<Record<Expression,number>>={scrutiny:.1,contempt:-.11,challenge:-.04,barking:-.08,weary:.1,impatient:.03,sideeye:.02,scan:-.02,bored:.04};
/** Early Terra walks tired; prosperity straightens backs. Rain opens umbrellas. */
export function setLifeConditions(stage:number,rain:boolean){weariness=Math.max(0,1-stage/3);raining=rain;}
const hipHeight=.84,bodyHeight=-.14;
// Parameterized personality: one motion system, different bodies.
const personality:Record<string,{cad:number;arm:number;lean:number;stride:number;gesture:number}>={
  worker:{cad:.92,arm:.34,lean:.07,stride:.44,gesture:1},engineer:{cad:1.12,arm:.38,lean:.09,stride:.46,gesture:.9},
  merchant:{cad:.96,arm:.3,lean:.03,stride:.4,gesture:1.45},guard:{cad:.9,arm:.2,lean:-.01,stride:.44,gesture:.6},
  resident:{cad:.95,arm:.28,lean:.04,stride:.4,gesture:1.1},ordinal:{cad:.84,arm:.14,lean:-.03,stride:.47,gesture:.35},courier:{cad:1.18,arm:.42,lean:.1,stride:.48,gesture:1}};
const ease=(x:number)=>x*x*(3-2*x),clamp01=(x:number)=>Math.min(1,Math.max(0,x));
/** `LEG` is the stride constant: the cycle covers 2*LEG*A/STANCE metres whatever the stance fraction (it is what the stride was before the ankle). */
const LEG=.84,gait=pose(),walking:Params={stance:STANCE,want:0,clear:.07,knee:1,pelvis:1};
/** How a walk is carried, on one base: `s` stance fraction, `knee` stance flexion, `clear` toe clearance (x7 cm), `arm` swing, `lean` forward lean, `pel` pelvis motion. */
const BASE={s:STANCE,knee:1,clear:1,arm:1,lean:0,pel:1},PATROL={...BASE,clear:.8,arm:.55,lean:-.01,pel:.9},WEARY={s:.64,knee:.7,clear:.6,arm:.8,lean:.05,pel:.8},HURRIED={s:.58,knee:1.1,clear:1,arm:1.2,lean:.03,pel:.9};
const GAIT:Record<string,typeof BASE>={hurried:HURRIED,nervous:{...HURRIED,clear:.95,lean:.02},tired:WEARY,weary:{...WEARY,arm:.6}};
const fract=(x:number)=>x-Math.floor(x);
/** Irregular turn-taking per pair: uneven shares and short pauses where neither speaks. */
export function turnTaking(time:number,self:number,partner:number){const pair=Math.min(self,partner),period=7.5+(pair%4)*1.8,u=fract((time+pair*5.3)/period),share=.45+(pair%3)*.08;
  if(Math.abs(u-share)<.04||u>.96)return false;return (u<share)===(self<partner);}
export function animateLife(n:Citizen,activity:Activity,dt:number,time:number,calm:boolean,player:T.Vector3,target?:T.Vector3,speaking=false,moving=false){void moving;
  const m=n.motion,pr=personality[n.archetype]??personality.resident,mn=n.manner,tempo=m.tempo*mn.pace,phase=time*tempo+n.phase,breath=Math.sin(phase*1.1);
  const pos=n.group.position,yaw=n.group.rotation.y;
  // Who this is and where they stand decides what the body may do: the Ordinance never waves, and nobody does with the Ordinance watching.
  let field=fields.get(n);if(!field||time-field.at>.5||time<field.at){field={at:time+(n.phase%.4),social:socialAt(pos.x,pos.z,n)};fields.set(n,field);
    const d2=(player.x-pos.x)**2+(player.z-pos.z)**2,sc=field.social;moodIn.archetype=n.archetype;moodIn.trait=mn.trait;moodIn.pick=m.pick;moodIn.pressure=sc.pressure;moodIn.watched=sc.watched;moodIn.activity=activity;moodIn.weariness=weariness;moodIn.near=m.mood.near=nearBand(m.mood.near,Math.sqrt(d2));moodIn.tone=n.tone&&time<n.tone.until?n.tone.tone:undefined;moodIn.react=sc.react??0;stepMood(m.mood,moodIn,time);}
  const occupier=isOccupier(n.archetype),cd=conduct(n.archetype,mn,field.social.pressure,field.social.watched),spoken=n.tone&&time<n.tone.until?bodyFor(n.archetype,n.tone.tone):undefined;
  if(!cd.talks)speaking=false;
  // Gait comes from real velocity, so route easing produces anticipation and settling.
  if(Number.isNaN(m.prevX)){m.prevX=pos.x;m.prevZ=pos.z;m.prevYaw=yaw;}
  let step=Math.max(dt,1e-4),dist=Math.hypot(pos.x-m.prevX,pos.z-m.prevZ);
  // A jump of more than three quarters of a metre in one frame is a re-pose (a scene change, someone let back out), not a walk: it is not fed into the gait.
  if(dist>.75)dist=0;
  const moved=Math.min(dist,3.2*step),speed=dist/step,turnRate=angle(yaw-m.prevYaw)/step;m.prevX=pos.x;m.prevZ=pos.z;m.prevYaw=yaw;
  const accel=(speed-m.speed)/step;m.speed+=(Math.min(speed,3)-m.speed)*Math.min(1,dt*8);m.turn+=(turnRate-m.turn)*Math.min(1,dt*6);
  const turning=Math.abs(m.turn)>.25&&m.speed<.1,target_g=clamp01(m.speed/.35)+(turning?.35:0);m.gait+=(Math.min(1,target_g)-m.gait)*Math.min(1,dt*5);
  const g=calm?m.gait*.5:m.gait,load=activity==='carry'?1.25:1;
  // Planted feet: the cycle clock runs on distance walked, so the stance foot moves backward exactly as far as the body moves forward
  // (gait.ts pins the sole to the ground and builds the leg around it), through every start, stop and hurry. Turning in place steps on the spot.
  // Stride keeps lengthening above a brisk walk (the intro's guards leave at 2.9 m/s), so cadence stays that of a walk, then a stride.
  const hobble=n.skirt.drop>.3?.86:1,A=turning?.13:Math.min(.6,(Math.min(.42,Math.max(.12,.16+.3*m.speed))+Math.max(0,m.speed-1.2)*.1)*(pr.stride/.44)*hobble);
  // Each leg's sweep is latched at its own heel strike and its planted foot is pinned by the distance walked (gait.ts), so it stays put through starts, stops and turns.
  // The distance is taken in the figure's own units (its stature is a group scale): a person scaled to .96 would otherwise slide 4 % of every stance forward.
  const gp=GAIT[mn.trait]??(occupier?PATROL:BASE),want=turning?MIN:LEG*A*gp.s/STANCE;
  m.stride=Math.PI*2*advance(m.latch,m.stride/(Math.PI*2),moved/n.group.scale.z,dt,want,gp.s,turning?2.4*pr.cad/(Math.PI*2):0);
  const c=m.stride,seated=activity==='sit'||activity==='eat',tired=weariness*(activity==='guard'?.3:1);
  const w=seated?0:clamp01(g/.35),q=clamp01((want-MIN)/.1);
  const sole=n.ankles[0].userData.sole as [number,number]|undefined;walking.heel=sole?.[0];walking.toe=sole?.[1];
  walking.stance=gp.s;walking.want=want;walking.clear=.07*gp.clear*(.5+.5*q);walking.knee=gp.knee*(load>1?1.15:1);walking.pelvis=gp.pel;walk(walking,m.latch,c/(Math.PI*2),gait);
  const twist=gait.yaw*w,roll=gait.roll*w;
  // Idle weight transfer holds on one leg, then shifts: never a metronome.
  const shift=seated?0:Math.tanh(3*Math.sin(phase*.21+n.phase))*(1-g)*(occupier&&mn.trait!=='bored'?.4:1);/* (seated, the hips rest on the seat: no weight shift, or the planted feet would slide) */
  // The pelvis rides the height the stance legs allow, sways over the planted foot, drops on the swing side and turns with the stride;
  // the thorax answers against it (figure-construction: contrapposto), so the walk has torsion and not a rigid block.
  n.body.position.set(shift*.022+w*gait.sway,bodyHeight+w*(gait.H-REST)+.13*(1-1/n.group.scale.y)/* the pavement sits .13 under the origin, in the figure's own scale */-(seated?.46-.42*(1/n.group.scale.y-1)/* seated, the seat stays .42 m over the pavement whatever the stature: the spawn sites put a bench, a crate or a step there */:0)+(seated?0:breath*.003*(1-w))/* (seated, the hips rest on the seat: they do not bob, or the planted feet would slide) */,0);
  n.body.rotation.set(g*(pr.lean+tired*.05)+w*gp.lean+(1-g)*tired*.06-(activity==='lean'?.07:0)-(activity==='carry'?.08:0)+(seated?-.06:0),-.7*twist+m.turn*.06,shift*.025-.5*roll);
  n.legs.forEach((leg,k)=>{leg.position.y=hipHeight-(seated?.46:0);
    if(seated){leg.position.z=0;const a=((n.phase*7.31)%1-.5)*.08;/* the seated knees part about hip width (People XXVI): the thigh splays out (the old .06 rad turned it in, so the shins met in one column), each figure a little unevenly */const long=n.skirt.drop>.3,narrow=long&&n.skirt.depth<.45*n.skirt.drop,sp=narrow?-.06:(long?SPLAY_SKIRT:n.drape?.panel||n.skirt.depth?SPLAY_CLOTH:SPLAY)+(k?-a*.6:a)*(long?.4:1);/* (under a coat's skirt or an apron the knees part less, under a long skirt or coat least, and a long coat cut narrower than .45 of its drop keeps them together as it is cut: the cloth closes round the calves) */leg.rotation.set(-1.42,0,(k?1:-1)*sp);n.knees[k].rotation.x=1.4;return;}/* (the seated thigh, knee and foot are solved once the hips are placed: seatLegs) */
    const stance=k===0?Math.max(0,-shift):Math.max(0,shift);
    leg.position.z=0;leg.rotation.set((1-w)*(k?-.02:.03)-w*gait.thigh[k],0,activity==='lean'&&k===1?-.1:(k?-1:1)*stance*.02);
    const an=n.ankles[k];n.knees[k].rotation.x=(1-w)*(.05+(k===0?Math.max(0,shift):Math.max(0,-shift))*.14)+w*gait.knee[k];an.rotation.set(w*gait.ankle[k],an.userData.out??an.rotation.y,0);});
  // Arms oppose the legs and hang slightly away from the body. The forearm drags behind the
  // swing (the elbow bends as the arm comes forward, a beat late), and the back swing arcs out
  // so the hands clear the hips (figure-construction: motion).
  n.arms.forEach((arm,k)=>{const z=Math.max(-1.3,Math.min(1.3,gait.thigh[k]/Math.max(.12,m.latch[k]/.9)))*w*clamp01((m.latch[k]-MIN)/.1),drag=legZ(c/(Math.PI*2)+k*.5-.095,gp.s),out=k?1:-1;arm.rotation.set(pr.arm*gp.arm*z-.05+breath*.008,0,out*(.06+tired*.03+g*.05*Math.max(0,z)));n.elbows[k].rotation.x=-.16-g*(.1+.3*Math.max(0,-drag))-(1-g)*.03*Math.sin(phase*.7+k);});
  let expression=m.mood.mood as Expression;
  let nod=0,tilt=0,sip=0;
  if(activity==='talk'||activity==='browse'||activity==='argue'){
    // Listen → react → gesture → settle. Gestures come in bursts, not on a beat.
    const burst=Math.max(0,Math.sin(phase*.55))*pr.gesture*cd.gesture,gesture=Math.pow(Math.max(0,Math.sin(phase*2.3)),2)*burst;
    if(speaking){const big=activity==='argue'?1.5:1;n.arms[0].rotation.set(-.3-gesture*.45*big,0,.2+gesture*.15);n.elbows[0].rotation.x=-.75-gesture*.35;
      if(activity==='argue'||gesture>.8){n.arms[1].rotation.set(-.25-Math.max(0,Math.sin(phase*1.9+1))*.4*big,0,-.22);n.elbows[1].rotation.x=-.9;}
      tilt=Math.sin(phase*.9)*.05;}
    else if(activity!=='browse'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.42,0,(k?-1:1)*.45);n.elbows[k].rotation.x=-1.62;}
      nod=fract(phase*.27)<.12?Math.sin(fract(phase*.27)/.12*Math.PI*2)*.13:0;tilt=Math.sin(phase*.33)*.06;      // Talk dies when the Ordinance is in earshot: hands come down, eyes go to the ground.
      if(!cd.talks){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.05,0,(k?-1:1)*.06);n.elbows[k].rotation.x=-.2;}nod=0;tilt=0;}}
    if(activity==='browse'){n.arms[1].rotation.x=-.45-gesture*.18;n.elbows[1].rotation.x=-.6;}
  }
  if(activity==='read'||activity==='gauge'||activity==='clipboard'){
    // Lean → inspect → write → glance back.
    const u=fract(phase/6.5),inspect=u<.35,write=u>=.35&&u<.75;
    n.body.rotation.x+=inspect?.12*ease(clamp01(u/.1)):write?.06:0;
    n.arms[0].rotation.x=-.62;n.arms[1].rotation.x=activity==='gauge'&&inspect?-.9:-.55;n.elbows[0].rotation.x=-.9;
    if(write||activity==='clipboard'){n.elbows[1].rotation.x=-1.1+Math.sin(phase*7)*.07*(write?1:.3);n.arms[1].rotation.z=-.3;}
    tilt=inspect?.08:0;if(u>.8)tilt=-.05;
    // The held sheet and board are fitted to the rig: the sheet sits ~40 cm from the eyes facing them, the board rests at the waist, tilted back, to be written on.
    if(activity==='read'){n.arms[0].rotation.set(-1.16,.18,-.28);n.elbows[0].rotation.x=-1.48;}
    if(activity==='clipboard'){n.arms[0].rotation.set(-.38,.18,-.13);n.elbows[0].rotation.x=-1.22;}
  }
  if(activity==='carry'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.5,0,(k?1:-1)*.1);n.elbows[k].rotation.x=-.95;}}
  if(activity==='hammer'){// Raise → strike → recoil → settle.
    const u=fract(phase*.72),a=u<.55?-.6-1.8*ease(u/.55):u<.64?-2.4+1.95*((u-.55)/.09):u<.76?-.45-.35*Math.sin((u-.64)/.12*Math.PI):-.6;
    n.arms[0].rotation.set(a,0,-.28*Math.min(1,-a/1.4));n.elbows[0].rotation.x=-.3-(u<.55?.3*ease(u/.55):0);n.arms[1].rotation.x=-.45;n.elbows[1].rotation.x=-.5;n.body.rotation.x=.1+(u>.55&&u<.7?.1:0);}
  if(activity==='repair'){const twist=Math.sin(phase*2.4);for(let k=0;k<2;k++){n.arms[k].rotation.set(-2.2+Math.sin(phase*2.4+k*2)*.12,0,(k?1:-1)*.42);n.elbows[k].rotation.x=-.4-(k===0?Math.max(0,twist)*.25:0);}n.body.rotation.x=-.08;}
  if(activity==='sweep'){const stroke=Math.sin(phase*1.8);n.arms[0].rotation.x=-.45+stroke*.22;n.arms[1].rotation.x=-.4+stroke*.1;n.body.rotation.set(.12,stroke*.08,0);n.body.position.x+=stroke*.035;}
  if(activity==='valve'){// Reach → grip → turn against resistance → release → rest.
    const u=fract(phase/4.2),reach=ease(clamp01(u/.18))*(1-ease(clamp01((u-.74)/.12)));const turnU=clamp01((u-.2)/.54),jerk=Math.floor(turnU*5)/5+ease(fract(turnU*5))/5;
    for(let k=0;k<2;k++){const r=(k?-1:1)*(Math.cos(jerk*Math.PI*2)*.22);n.arms[k].rotation.set(-.2-.75*reach+(k?.08:-.08)*Math.sin(jerk*Math.PI*2)*reach,0,(k?-.1:.1)+r*reach);n.elbows[k].rotation.x=-.3-.25*reach;}
    n.body.rotation.x=.04+.1*reach;}
  if(activity==='warm'){const rub=Math.sin(phase*6)*.06;for(let k=0;k<2;k++){n.arms[k].rotation.set(-.9+breath*.06,0,(k?-1:1)*(.16+rub));n.elbows[k].rotation.x=-.9;}n.body.rotation.x=.1;}
  if(activity==='guard'){
    // Standing duty, four ways. Attention: arms down, still. Behind: hands clasped at the back. Crossed: arms folded, weight on one leg. Scan: the head does the work.
    const st=mn.stance;
    for(let k=0;k<2;k++){const o=k?1:-1;
      if(st==='behind'){n.arms[k].rotation.set(.42,0,o*.16);n.elbows[k].rotation.x=-.5;}
      else if(st==='crossed'){n.arms[k].rotation.set(-.42,0,-o*.45);n.elbows[k].rotation.x=-1.65;}
      else if(st==='attention'){n.arms[k].rotation.set(.03,0,o*-.05);n.elbows[k].rotation.x=-.06;}
      else{n.arms[k].rotation.set(.15,0,o*-.12);n.elbows[k].rotation.x=-.25;}}}
  if(activity==='lean'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.42,0,(k?-1:1)*.45);n.elbows[k].rotation.x=-1.65;}}
  if(activity==='watch'){if((phase%10)<3)expression='startled';for(let k=0;k<2;k++){n.arms[k].rotation.set(.2,0,(k?1:-1)*-.15);n.elbows[k].rotation.x=-.5;}if((phase%10)<3){n.arms[0].rotation.set(-2.2,0,.2);n.elbows[0].rotation.x=-.1;}}
  if(seated){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.35,0,(k?-1:1)*.05);n.elbows[k].rotation.x=-.6;}
    // The bite: the mouth is level with the crown of the shoulder, so the upper arm comes up and across and the elbow closes until the food is at the lips (solved against the rig: the grip's food point lands within 1 cm of the mouth).
    // A mug is raised with the same stroke, its rim to the lips (the wrist then keeps it level, below).
    if(activity==='eat'){const bite=ease(clamp01(Math.max(0,Math.sin(phase*.9))*1.25)),mug=n.group.userData.upright;sip=bite;
      const nx=n.group.userData.next,lo=nx?.55:0;/* the new builder's food is aimed at the lips (People XXVI: biteReach); a mug keeps the stroke solved with the sheet's probe(): the stroke stops shorter, folds more and comes in with the shoulder width */
      if(nx&&!mug){const s=n.group.userData.bite??=biteReach(n,occupier);n.arms[0].rotation.set(-.4+(s[0]+.4)*bite,s[1]*bite,.05+(s[2]-.05)*bite);n.elbows[0].rotation.x=-.8+(s[3]+.8)*bite;}
      else{n.arms[0].rotation.set(-.4-((mug?1.01:1.24)-lo)*bite,.21*bite,.05+(mug?.3:.49)*bite+(nx?.3+(Math.abs(n.arms[0].position.x)-.233)*3:0)*bite);n.elbows[0].rotation.x=-.8-(mug?.84:.49)*bite-(nx?.7:0)*bite;}if(bite>.8)expression='smiling';}}
  const umbrella=n.group.userData.umbrella as T.Object3D|undefined;
  const uh=(n.group.userData.umbrellaHand as number|undefined)??1;
  if(umbrella){umbrella.visible=raining;if(raining){n.arms[uh].rotation.set(-.55,0,uh?-.1:.1);n.elbows[uh].rotation.x=-1.3;}}
  // Secondary motion: damped springs driven by gait, acceleration and turning.
  const near=(player.x-pos.x)**2+(player.z-pos.z)**2;
  const lively=!calm&&near<1600,follows=!!(n.drape&&!seated);
  if(lively){
    const tailTarget=-g*.1-clamp01(Math.abs(accel))*Math.sign(accel)*.12+Math.sin(c*2)*.03*g,hairTarget=.08+g*.22-m.turn*.05;
    m.tailV+=((tailTarget-m.tail)*55-m.tailV*8)*dt;m.tail+=m.tailV*dt;m.hairV+=((hairTarget-m.hair)*35-m.hairV*6)*dt;m.hair+=m.hairV*dt;
    n.tails.rotation.set(seated?-1.25:m.tail,0,g*Math.sin(c)*.035-m.turn*.03);n.swing.rotation.set(m.hair,0,Math.sin(c)*.08*g-m.turn*.08);n.scarf.rotation.x=m.tail*.8+Math.sin(phase*2.2)*.02;
  } else {n.tails.rotation.set(seated?-1.25:follows?n.tails.rotation.x:0,0,0);n.swing.rotation.set(.05,0,0);n.scarf.rotation.x=0;}
  // The knee hinge of long cloth (new builder only; the old figures have none): seated, it is set again from the solved legs (seatCloth). Standing and walking, the
  // new builder's long cloth follows the legs (drape.ts, solved below once the legs are placed).
  if(n.hem&&!follows){n.hem.rotation.x=-n.tails.rotation.x*(seated?1:.6);n.hem.scale.z=seated?HEM_SEATED:1;}
  if(n.drape?.split&&!follows)holdSplit(n.drape,-n.tails.rotation.x*(seated?1:.6),seated?HEM_SEATED:1);
  // Drape. Cloth never lets a leg through: the hem is carried by whichever thigh reaches furthest, front and
  // back together, so a skirt, coat or apron opens into an oval over the stride and closes as the legs pass.
  if(n.skirt.depth&&!follows){const reach=seated?0:Math.max(...n.legs.map(leg=>Math.abs(Math.tan(Math.min(1.1,Math.abs(leg.rotation.x))))*n.skirt.drop))+.1,want=Math.max(1,reach/n.skirt.depth);
    m.drape+=(want-m.drape)*Math.min(1,dt*(want>m.drape?30:9));const open=Math.max(m.drape,want);n.tails.scale.set(1-Math.min(.12,(open-1)*.12),1,open);
    // seated, the cloth above the knee that a walking knee needs is flattened to a lap (the new builder's long cloth keeps its depth for the walk)
    if(seated&&n.drape)n.tails.scale.z*=Math.min(1,LAP_SEATED/n.drape.lap);}
  // Brief, staggered glances; turns are led by the head.
  const dx=player.x-pos.x,dz=player.z-pos.z,close=dx*dx+dz*dz<14;
  const glance=close&&(phase%mn.glance)<1.35;
  // Idle heads differ: a sentry sweeps the street, a nervous man checks over his shoulder, most people barely move.
  const dw=occupier?dwelling(phase,n.phase%1,mn.stance==='scan'?.7:mn.stance==='attention'?.14:.3,mn.stance==='scan'?2.4:mn.stance==='attention'?6:3.8+n.phase%1.5):dwell,stare=occupier&&!seated&&(expression==='challenge'||expression==='scrutiny')&&dx*dx+dz*dz<81,lim=stare?.7:.48;
  let headYaw=(occupier?dw.yaw:Math.sin(phase*.39)*(mn.stance==='scan'?.55:.12))*(1-g)+m.turn*.28+(field.social.pressure>.4?Math.sin(phase*1.7+n.phase)*.22*mn.fidget*(1-g):0),pitch=activity==='read'||activity==='clipboard'?.2:activity==='browse'?.1:activity==='watch'?-.38:activity==='repair'?-.45:tired*.12;
  n.gaze='away';
  if(glance){look.copy(player);n.gaze='player';if((phase%mn.glance)<.45&&!seated&&cd.startle)expression='startled';
    const idleHands=activity==='guard'||activity==='lean'||activity==='sit'||activity==='watch'||(activity==='talk'&&!speaking)||activity==='walk';
    if(idleHands&&cd.wave&&(phase%mn.glance)>.35&&(phase%mn.glance)<1.3&&dx*dx+dz*dz<9){n.arms[0].rotation.set(-2.7,0,.4);n.elbows[0].rotation.x=-.35+Math.sin(phase*13)*.35;expression='smiling';}}
  else if(stare){look.copy(player);n.gaze='player';}
  // A conversation that has gone quiet watches the patrol by: most of the time, not all of it, and not in step with each other.
  else if(field.social.threat&&(phase%5.3)<3.9){look.set(field.social.threat.x,1.7,field.social.threat.z);n.gaze='threat';}
  else if(target&&(phase%9)<6.8){look.copy(target);n.gaze='partner';}
  if(n.gaze!=='away'){
    const relative=angle(Math.atan2(look.x-pos.x,look.z-pos.z)-yaw);
    if(Math.abs(relative)<1.25)headYaw=T.MathUtils.clamp(relative,-lim,lim);else n.gaze='away';
  }
  // A sidelong look: the eyes are on the Steward and the head is not quite.
  let eye=-1;if(occupier&&expression==='sideeye'&&dx*dx+dz*dz<81){const rel=angle(Math.atan2(dx,dz)-yaw);if(Math.abs(rel)<1.4){headYaw=rel*.4;if(Math.abs(rel)>.15)eye=rel>0?13:12;}}
  else if(occupier&&expression==='scan'&&!g&&dw.lead)eye=dw.lead>0?13:12;
  if(occupier){pitch+=CHIN[expression]??0;if(expression==='impatient'||expression==='contempt')tilt+=(n.phase%2<1?1:-1)*.05;
    // Squared shoulders: the Ordinance carries its boards wide and high.
    for(const a of n.arms){a.position.x=(a.userData.sx??=a.position.x)*1.05;a.position.y=1.455;}}
  // Posture is personal: the proud stand back on their heels, the tired fold forward.
  n.body.rotation.x+=mn.posture*(1-g*.5);
  // A line being spoken sets the body's register for as long as it hangs in the air.
  if(spoken){const b=spoken.bearing;expression=moodOfTone(n.archetype,n.tone!.tone);look.copy(player);n.gaze='player';
    if(b==='point'){n.arms[0].rotation.set(-1.32,0,.12);n.elbows[0].rotation.x=-.12;n.arms[1].rotation.set(.3,0,.14);n.elbows[1].rotation.x=-.45;}
    else if(b==='square'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.1,0,(k?1:-1)*-.5);n.elbows[k].rotation.x=-1.25;}n.body.rotation.x+=.07;}
    else if(b==='watch'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.42,0,(k?-1:1)*.45);n.elbows[k].rotation.x=-1.65;}}
    else if(b==='withdraw'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.7,0,(k?-1:1)*.3);n.elbows[k].rotation.x=-1.5;}n.body.rotation.x-=.08;}
    else if(b==='close'){n.arms[0].rotation.set(-.5,0,.25);n.elbows[0].rotation.x=-1.2;n.body.rotation.x+=.1;}
    else if(b==='open'){for(let k=0;k<2;k++){n.arms[k].rotation.set(-.35,0,(k?1:-1)*-.3);n.elbows[k].rotation.x=-.7;}}
    // Halt: the other arm out from the side and its forearm raised, palm to the Steward beside the face, for the first moment of the line
    // (eased in and out with the rest of the pose). It is the arm away from the sentry box, so the hand shows against the street; a pointing arm drops for it.
    if(n.tone!.palm!==undefined&&time<n.tone!.palm){n.arms[1].rotation.set(-.85,0,.8);n.elbows[1].rotation.x=-1.75;if(b==='point'){n.arms[0].rotation.set(.08,0,.1);n.elbows[0].rotation.x=-.3;}}
    const relative=angle(Math.atan2(player.x-pos.x,player.z-pos.z)-yaw);headYaw=T.MathUtils.clamp(relative,-.7,.7);if(occupier)n.body.rotation.y+=T.MathUtils.clamp(relative,-.5,.5)*.25;}
  // The pelvis is the rigid base the legs hang from: lean, twist and sway turn the torso
  // about the hip joint, not about the feet, and a sideways weight shift carries the hips
  // (legs tilt so the feet stay planted) instead of sliding the torso off the thighs.
  // The pelvis group takes the body's lean and sway, plus the stride's own yaw and roll (the thorax holds the opposite share).
  const sway=n.body.position.x,pelvis=hipHeight-bodyHeight;n.pelvis.position.copy(n.body.position);n.pelvis.rotation.set(n.body.rotation.x,n.body.rotation.y+1.7*twist,n.body.rotation.z+1.5*roll);
  pelvisPoint.set(0,pelvis,0).applyEuler(n.body.rotation);n.body.position.x-=pelvisPoint.x;n.body.position.y+=pelvis-pelvisPoint.y;n.body.position.z-=pelvisPoint.z;
  pelvisPoint.set(0,pelvis,0).applyEuler(n.pelvis.rotation);n.pelvis.position.x-=pelvisPoint.x;n.pelvis.position.y+=pelvis-pelvisPoint.y;n.pelvis.position.z-=pelvisPoint.z;
  // The legs hang from the pelvis: each hip pivot is the pelvis's own hip point, carried by its sway, lean, twist and bob, so the two can never come apart.
  // The thighs keep the line of walk (the foot is not swung round by the pelvis) and the weight-shift tilt keeps the planted feet in place.
  n.legs.forEach(leg=>{hipPoint.set(leg.userData.hipX??=leg.position.x,pelvis,0).applyEuler(n.pelvis.rotation).add(n.pelvis.position);leg.position.copy(hipPoint);
    leg.rotation.y=(1-w)*n.pelvis.rotation.y;if(!seated)leg.rotation.z-=sway/REST;});
  if(!seated&&g<.6){const up=standFeet(n);n.body.position.y+=up;n.pelvis.position.y+=up;for(const leg of n.legs)leg.position.y+=up;}
  // Seated, the legs are solved to put the soles on the pavement, and the lap and the hem below the knee follow the knees and shins they solve (People XXIII). Eating, the free foot's heel bobs.
  if(n.drape)unseatLong(n.drape,n.tails,n.hem);/* (People XXV: what seatLong moved last frame is put back first, so the lap is read from where it was built) */
  if(seated){seatLegs(n,activity==='eat'?.018*Math.max(0,Math.sin(phase)):0);seatCloth(n);if(n.drape)seatLong(n.drape,n.group,n.pelvis,n.tails,n.hem,n.legs,n.knees,n.ankles);/* (People XXV: and kept out of the seat) */}
  // Long cloth follows the legs, now they are where they will be drawn: a lifted knee never pierces it, the upper part leads with the knees and the hem trails it with weight
  // (beyond 40 m it is solved every third frame, and standing still it eases back to plumb).
  if(follows){if(w>.02){if(lively||(m.cloth.tick=(m.cloth.tick+1)%3)===0){readLegs(n.pelvis,n.tails,n.legs,n.knees,n.ankles);drape(n.drape!,m.cloth,n.tails,n.hem,dt,g,n.tails.rotation.z,lively?m.tail*.6:-g*.06,lively);drapeSplit(n.drape!,n.tails,dt,g,lively);}}else{rest(m.cloth,n.tails,n.hem,dt,n.tails.rotation.z);restSplit(n.drape!,dt);}}
  // A front panel (an apron, the foundry slab: People XXIV) is its own part: seated it rests on the thighs and falls from the knees; otherwise it is carried as the long cloth is.
  if(n.drape?.panel){if(seated)seatPanel(n.drape,n.pelvis,n.tails,n.hem,n.legs,n.knees,n.ankles);else carryPanel(n.drape.panel,n.hem);}
  // Head stabilization: the head cancels torso lean and twist.
  if(activity==='eat'&&n.group.userData.next){headYaw*=1-sip;pitch*=1-sip;}/* the head comes round to the food as it reaches the lips (People XXVI) */
  const blend=1-Math.exp(-dt*(occupier?8:4));n.head.rotation.y=T.MathUtils.lerp(n.head.rotation.y,T.MathUtils.clamp(headYaw-n.body.rotation.y,occupier?-.85:-.6,occupier?.85:.6),blend);
  n.head.rotation.x=T.MathUtils.lerp(n.head.rotation.x,pitch-n.body.rotation.x*.8+nod+(speaking?Math.sin(phase*2)*.03:0),blend);
  n.head.rotation.z=calm?0:breath*.012+tilt;
  // Nothing snaps. The logic above says where each joint should be; the body gets there on a short
  // critically damped ease, so a change of activity, a gesture or a glance blends instead of popping.
  // Legs are left alone: their timing is what keeps the feet planted.
  { const want=[n.arms[0].rotation.x,n.arms[0].rotation.z,n.arms[1].rotation.x,n.arms[1].rotation.z,n.elbows[0].rotation.x,n.elbows[1].rotation.x,n.body.rotation.x,n.body.rotation.y,n.body.rotation.z];
    const p=m.pose??=Float32Array.from(want),ka=1-Math.exp(-dt*(activity==='hammer'?34:occupier&&spoken?26:11+g*9)),kb=1-Math.exp(-dt*9);
    for(let i=0;i<9;i++)p[i]+=(want[i]-p[i])*(i<6?ka:kb);
    n.arms[0].rotation.x=p[0];n.arms[0].rotation.z=p[1];n.arms[1].rotation.x=p[2];n.arms[1].rotation.z=p[3];n.elbows[0].rotation.x=p[4];n.elbows[1].rotation.x=p[5]; }
  // A held mug is kept level through whatever the forearm does, and tipped to the lips on a sip (the wrist is the grip socket).
  if(n.group.userData.upright)n.grips[0].rotation.x=-(n.arms[0].rotation.x+n.elbows[0].rotation.x)-.44*sip;
  // An umbrella's shaft runs through the closed right hand; the wrist keeps it upright over the head.
  if(umbrella&&raining)n.grips[uh].rotation.set(-(n.arms[uh].rotation.x+n.elbows[uh].rotation.x+n.body.rotation.x),0,-n.arms[uh].rotation.z-n.body.rotation.z);
  // Last word on the face: nobody smiles under the Ordinance's eye, and the Ordinance does not smile at all.
  if(!faceAllowed(n.archetype,expression))expression='cold';else if(!cd.smile&&(expression==='happy'||expression==='smiling'||expression==='hopeful'))expression='neutral';
  // Only the blink and, near the camera, a speaking mouth move between decisions; the Ordinance blinks less.
  n.setExpression(expression,(phase%(occupier?6.3:4.7))<.13,(speaking||spoken)&&near<400?Math.floor(time*7+n.phase*3)%3:-1,eye);
}
/** The bite (People XXVI), solved once per figure from its own rig: the shoulder, upper arm and elbow turns that put the food (parts.ts `FOOD`, in the grip) just ahead of the lips
 *  (`head.userData.mouth`, the head unturned) while every point of the hand stays under the lips, so the hand reaches the mouth with the food and never crosses the nose. A pattern search
 *  from the old stroke's top, kept near it, within the arm's range. Returns [shoulder x, y, z, elbow x] in the body's frame. */
const BA=new T.Matrix4(),BB=new T.Matrix4(),BQ=new T.Vector3(),BEu=new T.Euler();
const HAND_KEYS:[number,number,number][]=[[0,-.24,0],[.002,-.32,.03],[.002,-.32,-.03],[.029,-.335,.05],[.03,-.39,0],[.048,-.393,0],[.04,-.393,.026],[.05,-.39,-.02]];
function biteReach(n:Citizen,occupier:boolean):number[]{
  const arm=n.arms[0],grip=n.grips[0],m=(n.head.userData.mouth as number[]|undefined)??[0,.08,.1],sh=arm.position.clone();
  if(occupier){sh.x=(arm.userData.sx??arm.position.x)*1.05;sh.y=1.455;}
  const mouth=new T.Vector3(m[0],m[1],m[2]).add(n.head.position),target=mouth.clone().add(BQ.set(.004,-.006,.028)),el=n.elbows[0].position,food=grip.position.clone().add(BQ.set(...FOOD.at));
  const at=(q:number[],p:T.Vector3,out:T.Vector3)=>{BA.makeRotationFromEuler(BEu.set(q[0],q[1],q[2]));BB.makeRotationFromEuler(BEu.set(q[3],0,0));return out.copy(p).applyMatrix4(BB).add(el).applyMatrix4(BA).add(sh);};
  const q0=[-1.09,.21,.84+(Math.abs(arm.position.x)-.233)*3,-1.99],lo=[-2.4,-.7,-.3,-2.6],hi=[0,.9,1.4,-.2],p=new T.Vector3(),k=new T.Vector3();
  const cost=(q:number[])=>{let c=at(q,food,p).distanceToSquared(target);for(const h of HAND_KEYS){at(q,k.set(...h),p);const up=p.y-(mouth.y+.004);if(up>0)c+=6*up*up;}for(let i=0;i<4;i++)c+=.004*(q[i]-q0[i])**2;return c;};
  const q=q0.slice();let best=cost(q),step=.25;
  while(step>2e-4){let moved=false;for(let i=0;i<4;i++)for(const d of [step,-step]){const t=q.slice();t[i]=T.MathUtils.clamp(t[i]+d,lo[i],hi[i]);const c=cost(t);if(c<best){best=c;q[i]=t[i];moved=true;}}if(!moved)step*=.5;}
  return q;}
const kq=new T.Quaternion(),fv=new T.Vector3(),feet=[{y:0,th:0,rho:1},{y:0,th:0,rho:1}];
/** Feet standing (People XXII). The idle pose bends the free knee up to .19 rad and its foot pitched toe down with the shin, its toe 2.8-5.5 cm into the pavement (.13 under the origin in the
 * world); the weighted leg, nearly straight, is 7 mm longer than the rest hip height allows (REST .97 against .925 of leg and .052 of sole), and the breath's bob took that to 1 cm. So the
 * figure first rises by whatever a flat weighted sole is under the pavement, and then each foot keeps the pitch the pose gives it unless an edge of its sole would go under: it turns at the
 * ankle just far enough to stand on that edge, and the free foot rests on its toe with the heel up, as a relaxed leg does. Walking, gait.ts holds the sole to the ground; this runs while the gait
 * is under .6 (standing, and a walk starting or stopping, where the blend into the gait dipped up to 3.6 mm). Returns the rise, for the caller to give the body, pelvis and legs. */
function standFeet(n:Citizen){const gnd=-.13/n.group.scale.y+.001,sole=n.ankles[0].userData.sole as [number,number]|undefined,heel=sole?.[0]??HEEL_X,toe=sole?.[1]??TOE_X;let rise=0;
  n.legs.forEach((leg,k)=>{const kn=n.knees[k],an=n.ankles[k],f=feet[k];kq.copy(leg.quaternion).multiply(kn.quaternion);
    f.y=leg.position.y+fv.copy(kn.position).applyQuaternion(leg.quaternion).y+fv.copy(an.position).applyQuaternion(kq).y;
    // the ankle's frame without its own turn: the heights of its up and forward axes give the shin's pitch, and how far a roll tips the sole off it
    const uy=fv.set(0,1,0).applyQuaternion(kq).y,zy=fv.set(0,0,1).applyQuaternion(kq).y;f.rho=Math.hypot(uy,zy);f.th=Math.atan2(-zy,uy);rise=Math.max(rise,gnd-(f.y-f.rho*SOLE));});
  n.ankles.forEach((an,k)=>{const f=feet[k],P=f.th+an.rotation.x,D=(f.y+rise-gnd)/f.rho;
    // an edge e (ahead of the ankle) is at y - rho (SOLE cos P + e sin P): toe down it is the toe's, toe up the heel's
    const e=P>=0?toe:heel;if(SOLE*Math.cos(P)+e*Math.sin(P)<=D)return;
    const q2=Math.asin(Math.min(1,D/Math.hypot(e,SOLE)))-Math.atan2(SOLE,Math.abs(e));an.rotation.x+=(P>=0?1:-1)*Math.max(0,q2)-P;});
  return rise;}
/** How a seated leg is carried: the shin leans `SHIN` forward of plumb, the foot ahead of the knee as on a low bench, and the thigh takes whatever pitch puts the ankle one sole over the
 *  pavement, held between `UP` above level and `DOWN` below it (a child's short leg reaches the pavement with the thigh sloping down from the step). */
/** The seated thigh's splay out from the hip, either side (People XXVI): the knees part about hip width, before each figure's unevenness of up to .04 rad. */
const SPLAY=.13,SPLAY_CLOTH=.075,SPLAY_SKIRT=.035;
const SHIN=.24,UP=.2,DOWN=.3,sq=new T.Quaternion(),fq=new T.Quaternion(),eu=new T.Euler(),sv=new T.Vector3(),su=new T.Vector3(),pin=new T.Quaternion();
/** Seated legs (People XXIII). The seat is .42 m over the pavement for every stature (People XIX), and the old fixed pose (thigh .15 rad below level, shin plumb) put a figure's shin and sole
 *  7.7-13.1 cm under the pavement. Each leg is now solved on the figure's own hip, limb lengths and pavement (two bones in the sagittal plane, the legs' yaw and splay included): the thigh's
 *  pitch from the knee height the leaning shin needs, the knee's bend from the ankle's height (its sole 2 mm over the pavement), and the ankle turned so the sole lies flat on the pavement
 *  whatever the leg's turn and splay, toes out as built. `tap` lifts the second foot's heel that far (eating), its knee and thigh solved to carry the ankle round the toe's tip, which stays put on the pavement. */
function seatLegs(n:Citizen,tap:number){const pave=-.13/n.group.scale.y,y0=pave+SOLE+.002,toe=(n.ankles[0].userData.sole as [number,number]|undefined)?.[1]??TOE_X;
  n.legs.forEach((leg,k)=>{const kn=n.knees[k],an=n.ankles[k],L2=-an.position.y;an.userData.out??=an.rotation.y;
    // the thigh: (Rx(a) w).y, w the knee's offset through the leg's yaw and splay, is the knee's height over the hip
    eu.set(0,leg.rotation.y,leg.rotation.z);sv.copy(kn.position).applyEuler(eu);const R0=Math.hypot(sv.y,sv.z),d=y0+L2*Math.cos(SHIN)-leg.position.y;
    leg.rotation.x=T.MathUtils.clamp(-Math.atan2(sv.z,sv.y)+Math.acos(T.MathUtils.clamp(d/R0,-1,1)),-Math.PI/2-UP,-Math.PI/2+DOWN);
    // the knee: the shin's drop from the knee to the ankle's height, leaning forward (the root with the foot ahead)
    const ky=leg.position.y+sv.copy(kn.position).applyQuaternion(leg.quaternion).y,uy=su.set(0,1,0).applyQuaternion(leg.quaternion).y,zy=su.set(0,0,1).applyQuaternion(leg.quaternion).y;
    kn.rotation.x=Math.atan2(zy,uy)-Math.acos(T.MathUtils.clamp((ky-y0)/(L2*Math.hypot(uy,zy)),-1,1));
    // the foot rolls on its toe tip: the pitch that keeps the tip on the pavement with the ankle `tap` higher, and the ankle carried round the tip so the tip does not slide
    let P=0;if(k===1&&tap>0){P=Math.max(0,Math.asin(Math.min(1,(SOLE+tap)/Math.hypot(toe,SOLE)))-Math.atan2(SOLE,toe));const a0=ankleAt(leg,kn,an);
      solve2(leg,kn,an,a0.y+tap,a0.z+toe*(1-Math.cos(P))+SOLE*Math.sin(P));}
    // the foot: flat (or rolled on the toe), turned as the leg and the toe-out turn it
    sq.copy(leg.quaternion).multiply(kn.quaternion);su.set(0,0,1).applyEuler(eu.set(0,an.userData.out,0)).applyQuaternion(sq);
    fq.setFromEuler(eu.set(P,Math.atan2(su.x,su.z),0,'YXZ'));an.quaternion.copy(sq.invert()).multiply(fq);eu.order='XYZ';});}
const av=new T.Vector3();
/** The ankle's position in the figure's frame, from the leg's and the knee's current turns. */
function ankleAt(leg:T.Object3D,kn:T.Object3D,an:T.Object3D){return av.copy(an.position).applyQuaternion(kn.quaternion).add(kn.position).applyQuaternion(leg.quaternion).add(leg.position);}
/** Turns the thigh and knee (Newton's method, at most four steps; it converges in two or three) until the ankle is at height y and depth z. */
function solve2(leg:T.Object3D,kn:T.Object3D,an:T.Object3D,y:number,z:number){const h=1e-3;
  for(let i=0;i<4;i++){const a=ankleAt(leg,kn,an),ay=a.y,az=a.z,ey=y-ay,ez=z-az;if(Math.abs(ey)+Math.abs(ez)<1e-5)return;
    leg.rotation.x+=h;ankleAt(leg,kn,an);const j11=(av.y-ay)/h,j21=(av.z-az)/h;leg.rotation.x-=h;
    kn.rotation.x+=h;ankleAt(leg,kn,an);const j12=(av.y-ay)/h,j22=(av.z-az)/h;kn.rotation.x-=h;
    const det=j11*j22-j12*j21;if(Math.abs(det)<1e-9)return;leg.rotation.x+=(ey*j22-j12*ez)/det;kn.rotation.x+=(j11*ez-j21*ey)/det;}}
/** How deep the cloth below the knee is, seated, against its cut: it lies along the shins, which lean forward of the knee, so a hem narrowed to .45 (as it was when it hung plumb from the knees,
 *  to fall between them and not under the thighs) left the back of the calf showing below the knee; at .8 it closes round the calf and still ends well ahead of the seat. */
const HEM_SEATED=.8;
/** The lap's turn from the knees' line: the cloth's axis from its waist pivot lies this much above the line to the knees (as the fixed seated lap lay over the old fixed knees). */
const LAP_LEAD=-.03;
/** Seated cloth (People XXIII): the lap turns about the waist to lie along the solved thighs, toward the knees (it was a fixed -1.25 rad, made for the old fixed thighs), and the cloth below
 *  the knee hangs along the shins (it hung plumb from the knees), front and back of a split coat with it. Read in the pelvis's frame, where the cloth hangs. */
function seatCloth(n:Citizen){pin.copy(n.pelvis.quaternion).invert();let knee=0,shin=0;
  n.legs.forEach((leg,k)=>{sv.copy(n.knees[k].position).applyQuaternion(leg.quaternion).add(leg.position).sub(n.pelvis.position).applyQuaternion(pin).sub(n.tails.position);knee+=Math.atan2(-sv.y,sv.z)/2;
    su.set(0,-1,0).applyQuaternion(sq.copy(leg.quaternion).multiply(n.knees[k].quaternion)).applyQuaternion(pin);shin+=Math.atan2(su.z,-su.y)/2;});
  n.tails.rotation.x=knee-Math.PI/2+LAP_LEAD;const hem=-shin-n.tails.rotation.x;
  if(n.hem)n.hem.rotation.x=hem;if(n.drape?.split)holdSplit(n.drape,hem,HEM_SEATED);}
/** Route distance with acceleration and deceleration ramps (meters). */
export function eased(d:number,L:number,a=1.1){const k=L/(L-a);if(d<a)return d*d/(2*a)*k;if(d<L-a)return (d-a/2)*k;return (L-a-(L-d)*(L-d)/(2*a))*k;}
/** Where on its route a walker is: going out, or coming back (the turn at the far end counts as out). `clock` is the person's own route clock. */
export function routeLeg(index:number,clock:number):'out'|'back'|undefined{const scene=sceneFor(index);if(!scene.route)return undefined;const length=scene.route,cycle=(clock*(scene.speed??.4)+index*3)%(length*2+5);return cycle<length+2.5?'out':'back';}
const staged={scene:scenes[0],moving:false,again:0};
/** Puts someone where their scene says. `clock` is their route clock: it runs with time, but stops while they stop, so a pause never jumps.
 * `again` is how far on their clock a walker is from being at this same spot going the other way (see City.giveRoom). The answer is one reused object. */
export function stageCitizen(n:Citizen,index:number,clock:number){
  const scene=sceneFor(index);let z=scene.z,yaw=scene.yaw,moving=false,again=0;
  if(scene.route){
    const length=scene.route,cycle=(clock*(scene.speed??.4)+index*3)%(length*2+5);
    if(cycle<length){z-=eased(cycle,length);yaw=Math.PI;moving=true;again=(length*2+2.5-cycle*2)/(scene.speed??.4);}
    else if(cycle<length+2.5){z-=length;yaw=Math.PI*(1-T.MathUtils.smoothstep(cycle-length,.4,2.3));}
    else if(cycle<length*2+2.5){z-=length-eased(cycle-length-2.5,length);yaw=0;moving=true;again=(length*4+7.5-cycle*2)/(scene.speed??.4);}
    else yaw=Math.PI*T.MathUtils.smoothstep(cycle-length*2-2.5,.4,2.3);
  }
  n.group.position.set(scene.x,.18,z);n.group.rotation.y=yaw;staged.scene=scene;staged.moving=moving;staged.again=again;return staged;
}
