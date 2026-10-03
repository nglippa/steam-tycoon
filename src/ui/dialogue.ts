import { readTime, type Choice, type Line } from '../simulation/intro';

/** The opening's voice: a paper card with a speaker and a line (click, tap, E or Enter moves on; it moves on by itself after
 * reading time), choices as buttons marked 1 to 4, a skip pill, and the title card. It is driven by `update(dt)`, never by a
 * timer, so a paused game holds the line where it is. It keeps pointer lock: the keys answer for the mouse. */
export class Dialogue {
  private root = document.createElement('div'); private card = document.createElement('div'); private list = document.createElement('div'); private skipButton = document.createElement('button'); private title = document.createElement('div');
  private mode: 'idle' | 'say' | 'ask' | 'flash' = 'idle'; private t = 0; private hold = 0; private done?: () => void; private choices: Choice[] = []; private pick?: (c: Choice) => void; private shown = 0;
  live = false; onSkip: () => void = () => {};
  constructor(app: HTMLElement) {
    this.root.id = 'dialogue'; this.root.hidden = true; this.card.className = 'dlg-card'; this.list.className = 'dlg-choices'; this.root.append(this.card, this.list);
    this.skipButton.id = 'skip'; this.skipButton.type = 'button'; this.skipButton.innerHTML = 'SKIP<kbd>X</kbd>'; this.title.id = 'title-card'; this.title.innerHTML = '<b>TERRA</b><span>A CITY WORTH SAVING</span>';
    app.append(this.root, this.skipButton, this.title);
    this.card.addEventListener('pointerdown', e => { e.preventDefault(); this.advance(); });
    this.skipButton.addEventListener('click', () => this.onSkip());
    document.addEventListener('keydown', e => { if (!this.live || e.repeat) return; if (e.code === 'KeyX') return this.onSkip();
      if (this.mode === 'ask') { const i = Number(e.code.replace(/^(Digit|Numpad)/, '')) - 1; if (i >= 0 && i < this.choices.length) this.choose(this.choices[i]); }
      else if (e.code === 'KeyE' || e.code === 'Enter') this.advance(); });
  }
  private line(l: Line, hint: boolean) { this.root.hidden = false; this.card.innerHTML = `<span class="overline"></span><p></p>${hint ? '<small>E · CLICK TO CONTINUE</small>' : ''}`; this.card.querySelector('.overline')!.textContent = l.who.toUpperCase(); this.card.querySelector('p')!.textContent = l.text; this.card.hidden = false; this.list.replaceChildren(); this.t = 0; this.hold = readTime(l.text); document.body.classList.add('dialogue'); }
  say(l: Line, done: () => void) { this.line(l, true); this.mode = 'say'; this.done = done; }
  /** A line that asks for nothing: it shows for its reading time and goes. */
  flash(l: Line) { this.line(l, false); this.mode = 'flash'; this.done = undefined; }
  ask(choices: Choice[], pick: (c: Choice) => void) { this.mode = 'ask'; this.choices = choices; this.pick = pick; this.card.hidden = true; this.root.hidden = false; document.body.classList.add('dialogue');
    this.list.replaceChildren(...choices.map((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<kbd>${i + 1}</kbd><span></span>`; b.querySelector('span')!.textContent = c.label; b.addEventListener('click', () => this.choose(c)); return b; })); this.list.querySelector('button')?.focus({ preventScroll: true }); }
  private choose(c: Choice) { if (this.mode !== 'ask') return; const pick = this.pick; this.hide(); pick?.(c); }
  private advance() { if (this.mode !== 'say' || this.t < .25) return; const done = this.done; this.hide(); done?.(); }
  hide() { this.mode = 'idle'; this.done = this.pick = undefined; this.root.hidden = true; this.list.replaceChildren(); document.body.classList.remove('dialogue'); }
  /** The title, held while the HUD comes up behind it. */
  showTitle(seconds = 3.4) { this.title.classList.add('show'); this.shown = seconds; }
  update(dt: number) { if (this.shown > 0 && (this.shown -= dt) <= 0) this.title.classList.remove('show');
    if (this.mode === 'say' || this.mode === 'flash') { this.t += dt; if (this.t >= this.hold) { if (this.mode === 'flash') this.hide(); else { const done = this.done; this.hide(); done?.(); } } } }
  /** Scene over or skipped: everything off. */
  end() { this.hide(); this.live = false; this.title.classList.remove('show'); this.shown = 0; }
}
