import type { Player } from './controller';

/** True on phones and tablets: a coarse primary pointer with touch support. */
export const isTouch = () => matchMedia('(pointer: coarse)').matches && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/** Touch play: left half is a floating joystick (push to the rim to sprint), right half
 * drags the view, and on-screen buttons stand in for E, Space, Tab and Esc. */
export class TouchControls {
  root = document.createElement('div');
  private stickId: number | null = null; private lookId: number | null = null;
  private origin = { x: 0, y: 0 }; private last = { x: 0, y: 0 };
  private base: HTMLDivElement; private knob: HTMLDivElement; private use: HTMLButtonElement;

  constructor(private player: Player, private canvas: HTMLCanvasElement, actions: { ledger: () => void; pause: () => void }) {
    this.root.id = 'touch';
    this.root.innerHTML = `<div class="stick-base"><div class="stick-knob"></div></div>
      <button class="touch-btn touch-use" type="button" aria-label="Interact">USE</button>
      <button class="touch-btn touch-jump" type="button" aria-label="Jump">JUMP</button>
      <button class="touch-btn touch-ledger" type="button" aria-label="City ledger">LEDGER</button>
      <button class="touch-btn touch-pause" type="button" aria-label="Pause">II</button>`;
    document.body.append(this.root);
    this.base = this.root.querySelector('.stick-base')!; this.knob = this.root.querySelector('.stick-knob')!; this.use = this.root.querySelector('.touch-use')!;
    const tap = (sel: string, fn: () => void) => { const b = this.root.querySelector<HTMLButtonElement>(sel)!; b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false }); b.addEventListener('click', fn); };
    tap('.touch-use', () => { if (player.locked && player.target) player.onInteract(player.target); });
    tap('.touch-jump', () => player.jump());
    tap('.touch-ledger', actions.ledger);
    tap('.touch-pause', actions.pause);
    canvas.style.touchAction = 'none';
    canvas.addEventListener('touchstart', e => this.start(e), { passive: false });
    canvas.addEventListener('touchmove', e => this.move(e), { passive: false });
    canvas.addEventListener('touchend', e => this.end(e));
    canvas.addEventListener('touchcancel', e => this.end(e));
  }
  private start(e: TouchEvent) {
    e.preventDefault(); if (!this.player.locked) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < innerWidth * .45 && this.stickId === null) { this.stickId = t.identifier; this.origin = { x: t.clientX, y: t.clientY }; this.base.style.transform = `translate(${t.clientX - 60}px, ${t.clientY - 60}px)`; this.base.classList.add('active'); this.knob.style.transform = 'translate(0,0)'; }
      else if (this.lookId === null) { this.lookId = t.identifier; this.last = { x: t.clientX, y: t.clientY }; }
    }
  }
  private move(e: TouchEvent) {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.stickId) {
        let dx = t.clientX - this.origin.x, dy = t.clientY - this.origin.y; const r = Math.hypot(dx, dy), max = 55;
        if (r > max) { dx *= max / r; dy *= max / r; }
        this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.player.stick.set(dx / max, dy / max);
      } else if (t.identifier === this.lookId) {
        const s = this.player.city.economy.state.settings.sensitivity * .0042;
        this.player.look(-(t.clientX - this.last.x) * s, -(t.clientY - this.last.y) * s);
        this.last = { x: t.clientX, y: t.clientY };
      }
    }
  }
  private end(e: TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.stickId) { this.stickId = null; this.player.stick.set(0, 0); this.base.classList.remove('active'); }
      if (t.identifier === this.lookId) this.lookId = null;
    }
  }
  /** Called every HUD tick: the USE button only shows when something can be used. */
  update() { this.use.classList.toggle('ready', Boolean(this.player.locked && this.player.target)); this.root.classList.toggle('live', this.player.locked); }
}
