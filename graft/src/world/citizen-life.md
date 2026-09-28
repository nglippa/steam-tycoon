# src/world/citizen-life.ts

- Activity · type · L4-L4 — type Activity='talk'|'browse'|'guard'|'carry'|'walk'|'read'|'hammer'|'sweep'|'warm'|'gauge'|'valve';
- Scene · type · L5-L5 — type Scene={x:number;z:number;yaw:number;role:Archetype;activity:Activity;partner?:number;target?:[number,number];route?:number;speed?:number};
- makeScene · function · L23-L33 — function makeScene(index:number):Scene
- sceneFor · function · L35-L35 — function sceneFor(index:number)
- angle · function · L36-L36 — function angle(value:number)
- animateLife · function · L38-L74 — function animateLife(n:Citizen,activity:Activity,dt:number,time:number,calm:boolean,player:T.Vector3,target?:T.Vector3,speaking=false,moving=false)
- stageCitizen · function · L75-L85 — function stageCitizen(n:Citizen,index:number,time:number)
