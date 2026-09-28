# src/world/citizen-life.ts

- Activity · type · L5-L5 — type Activity='talk'|'browse'|'guard'|'carry'|'walk'|'read'|'hammer'|'sweep'|'warm'|'gauge'|'valve'|'argue'|'sit'|'eat'|'lean'|'watch'|'clipboard'|'repair';
- Scene · type · L6-L6 — type Scene={x:number;z:number;yaw:number;role:Archetype;activity:Activity;partner?:number;target?:[number,number];route?:number;speed?:number};
- makeScene · function · L24-L34 — function makeScene(index:number):Scene
- sceneFor · function · L36-L36 — function sceneFor(index:number)
- angle · function · L37-L37 — function angle(value:number)
- setLifeConditions · function · L41-L41 — function setLifeConditions(stage:number,rain:boolean)
- clamp01 · function · L48-L48 — clamp01=(x:number)
- ease · function · L48-L48 — ease=(x:number)
- footPhase · function · L51-L52 — function footPhase(c:number)
- reach · function · L54-L54 — reach=(hip:number,knee:number)
- fract · function · L55-L55 — fract=(x:number)
- pivotAtHips · function · L61-L70 — function pivotAtHips(n:Citizen)
- turnTaking · function · L72-L73 — function turnTaking(time:number,self:number,partner:number)
- animateLife · function · L74-L191 — function animateLife(n:Citizen,activity:Activity,dt:number,time:number,calm:boolean,player:T.Vector3,target?:T.Vector3,speaking=false,moving=false)
- eased · function · L193-L193 — function eased(d:number,L:number,a=1.1)
- stageCitizen · function · L194-L204 — function stageCitizen(n:Citizen,index:number,time:number)
