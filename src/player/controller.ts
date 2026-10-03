import * as T from 'three';
import { reducedMotion } from '../motion';
import type { City, Ladder, Target } from '../world/city';
export class Player {
  keys = new Set<string>(); yaw = 0; pitch = -.025; velocity = new T.Vector3(); position = new T.Vector3(0, 1.93, 77); grounded = true; locked = false; paused = true; fallback = false; dragging = false; target: Target | null = null; moved = 0; stick = new T.Vector2(); touch = false; /** Carried by a lift: no walking, gravity or ground snapping. */ riding = false; /** While set, the only thing that can be offered is the target with this id (the opening scene). */ only: string | null = null;
  /** On a ladder: the three legs of the climb (onto the rungs, along them, off at the far end). */
  climbing?: { path: T.Vector3[]; leg: number; rung: number };
  onInteract: (t: Target) => void = () => {}; onLock: (locked: boolean) => void = () => {}; onStep: () => void = () => {};
  ray = new T.Raycaster(); forward = new T.Vector3(); desired = new T.Vector3(); private step = 0;
  constructor(public camera: T.PerspectiveCamera, public canvas: HTMLCanvasElement, public city: City) {
    camera.rotation.order = 'YXZ'; camera.position.copy(this.position);
    document.addEventListener('keydown', e => { if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Tab'].includes(e.code) && this.locked) e.preventDefault(); if (e.target instanceof HTMLInputElement) return; this.keys.add(e.code); if (e.code === 'KeyE' && this.locked && this.target && !e.repeat) this.onInteract(this.target); if (e.code === 'Escape' && this.fallback) this.release(); if (e.code === 'Space' && this.locked && this.grounded && !e.repeat) { this.velocity.y = 5.4; this.grounded = false; } });
    document.addEventListener('keyup', e => this.keys.delete(e.code));
    document.addEventListener('mousemove', e => { if (!this.locked || (this.fallback && !this.dragging)) return; const s = this.city.economy.state.settings.sensitivity * .00165; this.yaw -= e.movementX * s; this.pitch = T.MathUtils.clamp(this.pitch - e.movementY * s, -1.45, 1.45); });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; this.paused = !this.locked; this.keys.clear(); this.velocity.x = this.velocity.z = 0; this.onLock(this.locked); });
    canvas.addEventListener('mousedown', () => { this.dragging = true; }); document.addEventListener('mouseup', () => { this.dragging = false; }); window.addEventListener('blur', () => { this.keys.clear(); if (this.fallback) this.release(); });
  }
  look(dYaw: number, dPitch: number) { this.yaw += dYaw; this.pitch = T.MathUtils.clamp(this.pitch + dPitch, -1.45, 1.45); }
  jump() { if (this.locked && this.grounded) { this.velocity.y = 5.4; this.grounded = false; } }
  async lock() { if (this.touch) { this.fallback = true; this.locked = true; this.paused = false; this.onLock(true); return; } this.fallback = false; try { await this.canvas.requestPointerLock(); } catch { this.fallback = true; this.locked = true; this.paused = false; this.onLock(true); document.querySelector('#save-status')!.textContent = 'DRAG TO LOOK · ESC TO PAUSE · Open in Chrome for captured mouse look'; } }
  release() { if (document.pointerLockElement) document.exitPointerLock(); if (this.fallback) { this.fallback = false; this.locked = false; this.paused = true; this.dragging = false; this.keys.clear(); this.onLock(false); } }
  teleport(x: number, z: number, yaw = 0, y?: number) { this.position.set(x, y ?? this.city.groundHeight(x, z) + 1.75, z); this.yaw = yaw; this.velocity.set(0, 0, 0); this.camera.position.copy(this.position); this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); }
  /** Take a ladder from whichever end is nearer. The Steward is carried rung by rung and set
   * down clear of the edge; the view stays free the whole way. */
  climb(l: Ladder) { if (this.climbing || this.riding) return; const up = Math.abs(this.position.y - 1.75 - l.bottom.y) < Math.abs(this.position.y - 1.75 - l.top.y), from = up ? l.bottom : l.top, to = up ? l.top : l.bottom, eye = 1.75;
    this.climbing = { path: [new T.Vector3(l.x, from.y + eye, l.z), new T.Vector3(l.x, to.y + eye, l.z), new T.Vector3(to.x, to.y + eye, to.z)], leg: 0, rung: 0 }; this.riding = true; this.velocity.set(0, 0, 0); this.grounded = false; }
  private climbStep(dt: number) { const c = this.climbing!; let move = (c.leg === 1 ? 2.6 : 3.4) * dt;
    while (move > 0 && c.leg < c.path.length) { const to = c.path[c.leg], d = this.position.distanceTo(to); if (d <= move) { this.position.copy(to); move -= d; c.leg++; } else { this.position.addScaledVector(to.clone().sub(this.position).normalize(), move); move = 0; } }
    c.rung += dt; if (c.rung > .42) { c.rung = 0; this.onStep(); }
    if (c.leg >= c.path.length) { this.climbing = undefined; this.riding = false; this.velocity.set(0, 0, 0); this.grounded = true; } }
  update(dt: number, time: number) {
    if (this.climbing) this.climbStep(dt);
    if (this.locked && !this.riding) { const push = this.stick.length(); const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || push > .92 ? 7.2 : 4.5; const dx = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.stick.x; const dz = Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')) + this.stick.y; this.desired.set(dx, 0, dz); if (this.desired.length() > 1) this.desired.normalize(); this.desired.applyAxisAngle(T.Object3D.DEFAULT_UP, this.yaw).multiplyScalar(speed); const smoothing = 1 - Math.exp(-dt * 18); this.velocity.x = T.MathUtils.lerp(this.velocity.x, this.desired.x, smoothing); this.velocity.z = T.MathUtils.lerp(this.velocity.z, this.desired.z, smoothing); this.velocity.y -= 18 * dt;
      const substeps = Math.max(1, Math.ceil(dt / .012)); const step = dt / substeps;
      for (let i = 0; i < substeps; i++) { const feet = this.position.y - 1.75; const x = this.position.x + this.velocity.x * step; const z = this.position.z + this.velocity.z * step; if (this.city.groundHeight(x, this.position.z, feet) <= feet + .38 && !this.city.blocked(x, this.position.z, feet)) this.position.x = x; if (this.city.groundHeight(this.position.x, z, feet) <= feet + .38 && !this.city.blocked(this.position.x, z, feet)) this.position.z = z; this.position.y += this.velocity.y * step; const ground = this.city.groundHeight(this.position.x, this.position.z, feet) + 1.75; if (this.position.y <= ground) { this.position.y = ground; this.velocity.y = 0; this.grounded = true; } else { this.grounded = false; } }
      const moving = Math.hypot(this.velocity.x, this.velocity.z); this.moved += moving * dt; if (this.grounded && moving > .3) { this.step += moving * dt; if (this.step > 2.1) { this.step = 0; this.onStep(); } }
    }
    this.camera.position.copy(this.position); if (this.locked && !reducedMotion(this.city.economy.state.settings.reducedMotion) && this.grounded) this.camera.position.y += Math.sin(time * 9) * Math.min(.025, this.desired.length() * .006); this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new T.Vector2(0, 0), this.camera); const hits = this.ray.intersectObjects(this.city.targets.filter(t => t.when?.() ?? true).map(t => t.object), false); const reach = hits[0]?.distance ?? Infinity; this.target = reach < 4.6 ? this.city.targets.find(t => t.object === hits[0].object)! : null;
    // A ladder is offered to anyone standing at either end of it, wherever they are looking: no aiming on a phone.
    // It wins over anything else in view that is further off than arm's length.
    if ((!this.target || (this.target.kind !== 'ladder' && reach > 2.2)) && !this.riding) { const feet = this.position.y - 1.75, near = this.city.ladders.find(l => (l.active?.() ?? true) && [l.bottom, l.top].some(e => Math.abs(e.y - feet) < .6 && Math.hypot(e.x - this.position.x, e.z - this.position.z) < 1.5)); if (near) this.target = this.city.targets.find(t => t.id === near.id) ?? this.target; }
    if (this.only && this.target?.id !== this.only) this.target = null;
    if (this.riding) this.target = null;
  }
}
