import * as T from 'three';
import type { City } from './world/city';
import type { Player } from './player/controller';

/** Explicit developer review only: measured frames and real-controller traversal. */
export class Review {
  element = document.createElement('pre'); life=document.createElement('pre');lifeAt=0;seenExpressions=new Set<string>();seenGazes=new Set<string>();blockedActors=new Set<number>();
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
    const walk=(x:number,z:number,yaw:number,seconds:number)=>{player.teleport(x,z,yaw);player.pitch=0;player.locked=true;player.keys.clear();player.keys.add('KeyW');for(let i=0;i<seconds*60;i++)player.update(1/60,i/60);player.keys.clear();return player.position.clone();};
    results.mainStreet=walk(0,77,0,17).z<2;
    results.westLane=walk(-5.5,60,0,18).z< -19;
    results.eastLane=walk(5.5,60,0,18).z< -19;
    results.foundryLane=walk(34,60,0,18).z< -19;
    results.housingLane=walk(-34,60,0,18).z< -19;
    results.ramp=walk(-34,-27,0,6.5).y>8;
    results.wallCollision=walk(0,40,-Math.PI/2,5).x<13.1;
    player.teleport(saved.position.x,saved.position.z,saved.yaw,saved.position.y);player.pitch=saved.pitch;player.locked=saved.locked;player.paused=saved.paused;player.keys.clear();player.desired.set(0,0,0);player.update(0,0);
    return results;
  }
}
