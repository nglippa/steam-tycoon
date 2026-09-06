import * as T from 'three';
import type { City, Target } from '../world/city';
export class Player {
  keys = new Set<string>(); yaw = 0; pitch = -.025; velocity = new T.Vector3(); position = new T.Vector3(0, 1.93, 77); grounded = true; locked = false; paused = true; fallback = false; dragging = false; target: Target | null = null; moved = 0;
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
  async lock() { this.fallback = false; try { await this.canvas.requestPointerLock(); } catch { this.fallback = true; this.locked = true; this.paused = false; this.onLock(true); document.querySelector('#save-status')!.textContent = 'DRAG TO LOOK · ESC TO PAUSE · Open in Chrome for captured mouse look'; } }
  release() { if (document.pointerLockElement) document.exitPointerLock(); if (this.fallback) { this.fallback = false; this.locked = false; this.paused = true; this.dragging = false; this.keys.clear(); this.onLock(false); } }
  teleport(x: number, z: number, yaw = 0, y?: number) { this.position.set(x, y ?? this.city.groundHeight(x, z) + 1.75, z); this.yaw = yaw; this.velocity.set(0, 0, 0); this.camera.position.copy(this.position); this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); }
  update(dt: number, time: number) {
    if (this.locked) { const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 7.2 : 4.5; const dx = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')); const dz = Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')); this.desired.set(dx, 0, dz).normalize().applyAxisAngle(T.Object3D.DEFAULT_UP, this.yaw).multiplyScalar(speed); const smoothing = 1 - Math.exp(-dt * 18); this.velocity.x = T.MathUtils.lerp(this.velocity.x, this.desired.x, smoothing); this.velocity.z = T.MathUtils.lerp(this.velocity.z, this.desired.z, smoothing); this.velocity.y -= 18 * dt;
      const substeps = Math.max(1, Math.ceil(dt / .012)); const step = dt / substeps;
      for (let i = 0; i < substeps; i++) { const feet = this.position.y - 1.75; const x = this.position.x + this.velocity.x * step; const z = this.position.z + this.velocity.z * step; if (this.city.groundHeight(x, this.position.z) <= feet + .38 && !this.city.blocked(x, this.position.z, feet)) this.position.x = x; if (this.city.groundHeight(this.position.x, z) <= feet + .38 && !this.city.blocked(this.position.x, z, feet)) this.position.z = z; this.position.y += this.velocity.y * step; const ground = this.city.groundHeight(this.position.x, this.position.z) + 1.75; if (this.position.y <= ground) { this.position.y = ground; this.velocity.y = 0; this.grounded = true; } else { this.grounded = false; } }
      const moving = Math.hypot(this.velocity.x, this.velocity.z); this.moved += moving * dt; if (this.grounded && moving > .3) { this.step += moving * dt; if (this.step > 2.1) { this.step = 0; this.onStep(); } }
    }
    this.camera.position.copy(this.position); if (this.locked && !this.city.economy.state.settings.reducedMotion && this.grounded) this.camera.position.y += Math.sin(time * 9) * Math.min(.025, this.desired.length() * .006); this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ'); this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new T.Vector2(0, 0), this.camera); const hits = this.ray.intersectObjects(this.city.targets.map(t => t.object), false); this.target = hits[0] && hits[0].distance < 4.6 ? this.city.targets.find(t => t.object === hits[0].object)! : null;
  }
}
