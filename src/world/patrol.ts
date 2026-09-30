import * as T from 'three';
import type { City } from './city';
import type { Activity } from './citizen-life';

export type Alert = 'patrol' | 'notice' | 'investigate' | 'search' | 'return';
interface Actor { person: { group: T.Group }; kind: Activity }
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** Line of sight on the ground plan: tall colliders (stalls, piers, houses) block it. */
export function lineOfSight(city: City, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az;
  for (const c of city.colliders) { if (c.height < 1.5 || c.open?.()) continue; if ((ax > c.minX && ax < c.maxX && az > c.minZ && az < c.maxZ) || (bx > c.minX && bx < c.maxX && bz > c.minZ && bz < c.maxZ)) continue;
    let t0 = 0, t1 = 1; for (const [p, d, lo, hi] of [[ax, dx, c.minX, c.maxX], [az, dz, c.minZ, c.maxZ]]) { if (Math.abs(d) < 1e-6) { if (p < lo || p > hi) { t0 = 2; break; } continue; } let a = (lo - p) / d, b = (hi - p) / d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) break; }
    if (t0 <= t1) return false; }
  return true;
}
/** Occupation eyes, shared by every observer: is this point inside the observer's view
 * cone, within range, at street level and not hidden behind a building? */
export function inView(city: City, observer: T.Object3D, point: { x: number; y: number; z: number }, range: number, cone = .7) {
  const o = observer.position, dx = point.x - o.x, dz = point.z - o.z, d = Math.hypot(dx, dz);
  if (d > range || point.y > o.y + 4) return false;
  if (d > 1.4 && Math.abs(wrap(Math.atan2(dx, dz) - observer.rotation.y)) > cone) return false;
  return lineOfSight(city, o.x, o.z, point.x, point.z);
}
function mark(text: string, color: string) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!; x.font = '900 54px "Avenir Next",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#1d1a1a'; x.strokeText(text, 32, 34); x.fillStyle = color; x.fillText(text, 32, 34); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return new T.SpriteMaterial({ map: t, depthWrite: false }); }

/** One Ordinance patrol, the smallest stealth loop that means something: it walks a
 * waypoint beat, sees in a cone with collider line of sight, grows suspicious of a
 * Steward who lingers (faster near covert places or at a run), investigates, searches,
 * then returns to its beat. Covert work is refused while it is watching. */
export class Patrol {
  state: Alert = 'patrol'; suspicion = 0; seen = false; distance = 99;
  hot: { x: number; z: number; r: number }[] = [];
  onConfront: () => void = () => {};
  private s = 0; private dir = 1; private pause = 0; private timer = 0; private yaw = Math.PI; private warned = -99;
  private last = new T.Vector3(); private prev = new T.Vector3(); private back = new T.Vector2();
  private lengths: number[] = []; private total = 0;
  private marker: T.Sprite; private query = mark('?', '#f0e2b0'); private alarm = mark('!', '#e8643c');
  constructor(public city: City, public actor: Actor, public route: T.Vector2[], parent: T.Object3D) {
    for (let i = 1; i < route.length; i++) { this.lengths.push(route[i].distanceTo(route[i - 1])); this.total += this.lengths[i - 1]; }
    this.marker = new T.Sprite(this.query); this.marker.scale.setScalar(.34); this.marker.visible = false; parent.add(this.marker);
    this.place(this.along(0));
  }
  /** Watching means covert business at the cellar would be seen. */
  get watching() { return this.state !== 'patrol' || (this.seen && this.distance < 12); }
  private along(s: number) { let d = s; for (let i = 0; i < this.lengths.length; i++) { if (d <= this.lengths[i] || i === this.lengths.length - 1) return new T.Vector2().lerpVectors(this.route[i], this.route[i + 1], Math.min(1, d / this.lengths[i])); d -= this.lengths[i]; } return this.route[0].clone(); }
  private place(p: T.Vector2) { const g = this.actor.person.group; g.position.set(p.x, this.city.groundHeight(p.x, p.y), p.y); }
  private face(target: number, dt: number, rate = 5) { this.yaw += wrap(target - this.yaw) * Math.min(1, dt * rate); this.actor.person.group.rotation.y = this.yaw; }
  /** Walk toward a point; false when a collider or the goal stops the step. */
  private walk(x: number, z: number, speed: number, dt: number, stop = .1) {
    const g = this.actor.person.group.position, dx = x - g.x, dz = z - g.z, d = Math.hypot(dx, dz); if (d <= stop + .02) return false;
    const step = Math.min(d - stop, speed * dt), nx = g.x + dx / d * step, nz = g.z + dz / d * step;
    if (this.city.blocked(nx, nz, .2)) return false;
    g.set(nx, this.city.groundHeight(nx, nz), nz); this.face(Math.atan2(dx, dz), dt, 8); return true;
  }
  private clear(ax: number, az: number, bx: number, bz: number) { return lineOfSight(this.city, ax, az, bx, bz); }
  update(dt: number, time: number, player: T.Vector3) {
    const g = this.actor.person.group.position, dx = player.x - g.x, dz = player.z - g.z; this.distance = Math.hypot(dx, dz);
    const speed = dt > 0 ? Math.hypot(player.x - this.prev.x, player.z - this.prev.z) / dt : 0; this.prev.copy(player);
    const bearing = Math.atan2(dx, dz), inCone = Math.abs(wrap(bearing - this.yaw)) < 1.05 || this.distance < 2.2;
    this.seen = this.distance < 14 && inCone && player.y < 4 && this.clear(g.x, g.z, player.x, player.z);
    if (this.seen) { const hot = this.hot.some(h => Math.hypot(player.x - h.x, player.z - h.z) < h.r);
      this.suspicion = Math.min(1.2, this.suspicion + dt * (.08 + (this.distance < 5 ? .3 : 0) + (speed > 5.5 && speed < 20 ? .35 : 0) + (hot ? .6 : 0))); this.last.copy(player); }
    else this.suspicion = Math.max(0, this.suspicion - dt * .16);
    let moving = false; this.timer += dt;
    if (this.state === 'patrol') {
      if (this.seen && this.suspicion > .3) { this.state = 'notice'; this.timer = 0; }
      else if (this.pause > 0) { this.pause -= dt; this.face(this.yaw + Math.sin(time * .9) * .6, dt, 1.2); }
      else { this.s += this.dir * 1.1 * dt; if (this.s >= this.total || this.s <= 0) { this.s = Math.min(this.total, Math.max(0, this.s)); this.dir *= -1; this.pause = 3; }
        const p = this.along(this.s); if (p.x !== g.x || p.y !== g.z) this.face(Math.atan2(p.x - g.x, p.y - g.z), dt, 8); this.place(p); moving = this.pause <= 0; }
    } else if (this.state === 'notice') {
      this.face(bearing, dt, 3);
      if (this.suspicion >= 1) { this.state = 'investigate'; this.timer = 0; }
      else if (!this.seen && this.suspicion < .12) this.enterReturn();
    } else if (this.state === 'investigate') {
      if (this.seen && this.distance < 2.6) { this.face(bearing, dt, 6);
        if (time - this.warned > 25) { this.warned = time; this.onConfront(); }
        if (this.timer > 2.5) { this.suspicion = .45; this.enterReturn(); } }
      else { moving = this.walk(this.last.x, this.last.z, 2.1, dt, this.seen ? 2.2 : .4); if (this.seen) this.timer = Math.min(this.timer, 1); if (!moving || this.timer > 10) { this.state = 'search'; this.timer = 0; } }
    } else if (this.state === 'search') {
      this.face(this.yaw + Math.sin(this.timer * 2.2) * 1.4, dt, 1.5);
      if (this.seen && this.suspicion >= 1) { this.state = 'investigate'; this.timer = 0; } else if (this.timer > 3.5) this.enterReturn();
    } else if (this.state === 'return') {
      if (this.seen && this.suspicion > .6) { this.state = 'notice'; this.timer = 0; }
      else { moving = this.walk(this.back.x, this.back.y, 1.3, dt, .15); if (!moving) { this.state = 'patrol'; if (g.distanceTo(new T.Vector3(this.back.x, g.y, this.back.y)) > .5) this.place(this.back); } }
    }
    this.actor.kind = moving ? 'walk' : 'guard';
    const alarmed = this.state === 'investigate', curious = this.state === 'notice' || this.state === 'search' || (this.state === 'return' && this.suspicion > .3);
    this.marker.visible = alarmed || curious; this.marker.material = alarmed ? this.alarm : this.query; this.marker.position.set(g.x, g.y + 2.45 + Math.sin(time * 4) * .03, g.z);
  }
  /** Back to the nearest point of the beat, then resume it from there. */
  private enterReturn() { this.state = 'return'; this.timer = 0; const g = this.actor.person.group.position; let best = 0, bestD = Infinity;
    for (let s = 0; s <= this.total; s += .5) { const p = this.along(s), d = Math.hypot(p.x - g.x, p.y - g.z); if (d < bestD) { bestD = d; best = s; } }
    this.s = best; this.back.copy(this.along(best)); }
  hide() { this.state = 'patrol'; this.suspicion = 0; this.seen = false; this.marker.visible = false; }
}
