import * as T from 'three';
import type { City } from './world/city';
import type { Player } from './player/controller';

/** Explicit developer review only: measured frames and real-controller traversal. */
export class Review {
  element = document.createElement('pre'); life=document.createElement('pre');lifeAt=0;seenExpressions=new Set<string>();seenGazes=new Set<string>();blockedActors=new Set<number>();poke=-1;
  private city:City;
  start = performance.now(); samples: number[] = []; calls: number[] = []; triangles: number[] = [];
  done = false; checks: Record<string, unknown> = {};
  constructor(private renderer: T.WebGLRenderer, city: City, player: Player, query: URLSearchParams) {
    this.city=city;this.life.id='life-status';this.life.hidden=true;document.body.append(this.life);
    this.element.id = 'review-status';
    this.element.style.cssText = 'position:fixed;bottom:4px;left:50%;transform:translateX(-50%);z-index:20;background:#eef0df;color:#263f40;padding:8px;font:11px monospace;max-width:80vw;white-space:pre-wrap;pointer-events:none';
    document.body.append(this.element);
    if (query.has('clean')) this.element.style.display = 'none';
    if (query.has('check')) this.checks = this.traversal(city, player);
    this.element.textContent = 'Review: warming up';
  }
  frame(now: number, dt: number) {
    this.city.npcs.forEach((n,i)=>{if(n.group.visible){this.seenExpressions.add(n.expression);this.seenGazes.add(n.gaze);if(this.city.blocked(n.group.position.x,n.group.position.z,.18))this.blockedActors.add(i);}});
    // Drape: no thigh may reach past its hem. The worst overshoot seen (metres; negative is clear) is recorded.
    for(const n of [...this.city.npcs,...this.city.presentation.workers.map(w=>w.person)]){if(!n.group.visible||!n.skirt.depth)continue;const hem=n.skirt.depth*n.tails.scale.z;for(const leg of n.legs){if(Math.abs(leg.rotation.x)>1.2)continue;this.poke=Math.max(this.poke,Math.abs(Math.tan(Math.min(1.1,Math.abs(leg.rotation.x))))*n.skirt.drop+.085-hem);}}
    this.life.dataset.poke=this.poke.toFixed(3);
    this.life.dataset.expressions=[...this.seenExpressions].sort().join(',');this.life.dataset.gazes=[...this.seenGazes].sort().join(',');this.life.dataset.blocked=[...this.blockedActors].join(',');
    if(now-this.lifeAt>500){this.lifeAt=now;this.life.textContent=JSON.stringify(this.city.npcs.filter(n=>n.group.visible).slice(0,14).map((n,id)=>({id,role:n.archetype,expression:n.expression,gaze:n.gaze,head:+n.head.rotation.y.toFixed(2),position:n.group.position.toArray()})));}
    if (this.done || document.hidden) return;
    if (now - this.start < 1200) return;
    this.samples.push(dt * 1000); this.calls.push(this.renderer.info.render.calls); this.triangles.push(this.renderer.info.render.triangles);
    if (now - this.start < 6200) return;
    const average = (v: number[]) => v.reduce((a,b)=>a+b,0)/v.length;
    const ordered = [...this.samples].sort((a,b)=>a-b);
    const result = { fps: +(1000/average(this.samples)).toFixed(1), p95Ms: +ordered[Math.floor(ordered.length*.95)].toFixed(1), draws: Math.round(average(this.calls)), triangles: Math.round(average(this.triangles)), frames: this.samples.length, viewport: [innerWidth,innerHeight], pixelRatio: this.renderer.getPixelRatio(), checks: this.checks };
    this.element.textContent = JSON.stringify(result); this.element.dataset.complete = 'true'; this.done = true;
  }
  private traversal(city: City, player: Player) {
    const saved = { position: player.position.clone(), yaw: player.yaw, pitch: player.pitch, locked: player.locked, paused: player.paused };
    const results: Record<string,unknown> = {};
    city.root.updateWorldMatrix(true,true);
    results.ledgers = city.targets.filter(t=>t.kind==='property').map(target=>{
      const normal = target.object.getWorldDirection(new T.Vector3()); const p = target.object.getWorldPosition(new T.Vector3()).addScaledVector(normal,2.5);
      player.teleport(p.x,p.z,Math.atan2(normal.x,normal.z)); player.pitch=Math.atan2(target.position.y-player.position.y,2.5); player.update(0,0);
      return {id:target.id,reachable:!city.blocked(p.x,p.z,.18),raycast:player.target?.id===target.id};
    });
    const walk=(x:number,z:number,yaw:number,seconds:number,eye?:number)=>{player.teleport(x,z,yaw,eye);player.pitch=0;player.locked=true;player.keys.clear();player.keys.add('KeyW');for(let i=0;i<seconds*60;i++)player.update(1/60,i/60);player.keys.clear();return player.position.clone();};
    // The Great Main is walked down its east lane: the checkpoint's box stands in the middle. By day the opening is passable;
    // at an enforced curfew the boom is down and the same walk must stop at it.
    { const gate=city.presentation.checkpoints.gates[0].state,end=walk(4,77,0,17); results.mainStreet=gate==='sealed'?end.z>10.5&&end.z<12:end.z<2; results.mainStreetCentre=walk(0,77,0,17).z>10.5; }
    results.westLane=walk(-5.5,60,0,18).z< -19;
    results.eastLane=walk(5.5,60,0,18).z< -19;
    results.foundryLane=walk(34,60,0,18).z< -19;
    results.housingLane=walk(-34,60,0,18).z< -19;
    results.ramp=walk(-34,-27,0,6.5).y>8;
    results.wallCollision=walk(0,40,-Math.PI/2,5).x<13.1;
    // Phase 4 routes, walked with the real controller. Yaw 0 walks north, PI south, PI/2 west.
    const S=Math.PI,W=Math.PI/2,near=(v:number,to:number)=>Math.abs(v-to)<.2;
    results.alleys=city.alleys.map(z=>walk(-39.5,z-1.6,W,4.5).x< -55);
    results.yardGantry=(p=>p.z>94&&near(p.y,10.85))(walk(-73.4,57,S,10,8.85));
    results.aqueduct=(p=>p.z>20&&near(p.y,7.85))(walk(-66.5,-60.5,S,20,7.85));
    results.hallStair=(p=>near(walk(p.x,p.z,0,1.5,p.y).y,7.85))(walk(-67.5,-10.1,W,3.5));
    results.channelStair=walk(-64.7,-46,0,5).y>7.6;
    results.hangway=(p=>p.z< -56&&near(p.y,-3.75))(walk(41.6,43,0,24,-3.75));
    // The Leads: along the Bridge-house ridge onto the terrace, and the lower Hangway by its two flights.
    results.leads=(a=>(b=>(c=>c.x< -14&&near(c.y,16.2))(walk(b.x,b.z,W,2,b.y)))(walk(a.x,a.z,S,.45,a.y)))(walk(12,4.2,W,7,15.75));
    results.keelHolds=[0,S,W,-W].every(yaw=>near(walk(42.4,-23,yaw,3,-25.25).y,-25.25));
    results.chainBridge=(p=>p.x>50&&near(p.y,1.93))(walk(38,34,-W,3.5));
    // The Backwater: its two passages from Salt Row, the gallery end to end, and each flight up from its yard.
    if(city.economy.state.districts.includes('canal'))results.eastAlleys=city.eastAlleys.map(z=>walk(60.5,z-1.6,-W,4).x>73.4);
    // Until Cinder Row is organised the gallery is barred between the yards; each half is still reached by its own stair.
    results.backGallery=(p=>near(p.y,8.35)&&(city.economy.state.sites.row>=2?p.z< -38:p.z>2&&p.z<3.2))(walk(74,45,0,20,8.35));results.backGalleryNorth=(p=>p.z< -38&&near(p.y,8.35))(walk(74,1,0,12,8.35));
    results.backStairs=[[75.55,-29.6,S],[75.55,17.6,0],[75.55,45.6,0]].map(([x,z,yaw])=>near(walk(x,z,yaw,4).y,8.35));
    results.pierEnd=(p=>p.z<100&&p.z>98&&near(p.y,1.93))(walk(-67,80,S,6));
    // No roof lets a walker off its edge: push at all four sides of the high places.
    results.edgesHold=([[-71,-28,32.85],[-71,-23.9,19.85],[-70,-18,7.85],[-70,18,7.85],[-69,-63,7.85],[-70.5,54,8.85],[-68,96.5,10.85],[6,4.2,15.75],[-19,8,16.2],[-15.9,14,21.6],[-19,20,16.2],[57.5,-41.5,13.85],[60,-44,25.85]] as const).every(([x,z,eye])=>[0,S,W,-W].every(yaw=>near(walk(x,z,yaw,2.6,eye).y,eye)));
    // Every ladder, up and then down again, ending where a walker can move off.
    results.ladders=Object.fromEntries(city.ladders.filter(l=>!city.blocked(l.bottom.x,l.bottom.z,l.bottom.y)).map(l=>{const ride=()=>{player.climb(l);let n=0;while(player.climbing&&n++<1500)player.update(1/60,n/60);return n;};
      player.teleport(l.bottom.x,l.bottom.z,0,l.bottom.y+1.75);const up=ride(),top=near(player.position.y-1.75,l.top.y)&&!city.blocked(player.position.x,player.position.z,l.top.y);
      const down=ride(),foot=near(player.position.y-1.75,l.bottom.y)&&!city.blocked(player.position.x,player.position.z,l.bottom.y);
      return [l.id,{top,foot,seconds:+(up/60).toFixed(1),height:+(l.top.y-l.bottom.y).toFixed(1),ok:top&&foot&&up<1500&&down<1500}];}));
    player.teleport(saved.position.x,saved.position.z,saved.yaw,saved.position.y);player.pitch=saved.pitch;player.locked=saved.locked;player.paused=saved.paused;player.keys.clear();player.desired.set(0,0,0);player.update(0,0);
    return results;
  }
}
