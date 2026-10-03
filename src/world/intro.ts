import * as T from 'three';
import { citizen } from './citizens';
import { animateLife, type Activity } from './citizen-life';
import { illustrated, mats } from './assets';
import { HOME } from './roofwalk';
import { SCRIPT, DAWDLE, OBJECTIVE, type Choice, type Line } from '../simulation/intro';
import { dayAt } from '../simulation/occupation';
import type { Economy } from '../simulation/economy';
import type { City } from './city';
import type { Player } from '../player/controller';
import type { Dialogue } from '../ui/dialogue';
import type { Soundscape } from '../audio/sound';
import type { Interface } from '../ui/interface';

/** THE KNOCK. The opening, played once on a new save: black and banging, the Ordinance at the room's door, a masked stranger
 * on the stoop. A dt-driven state machine (no timers, no promises: a paused game holds, a skip lands anywhere). The script is
 * simulation/intro.ts; this is the staging. The three figures are the scene's own and are in no one's list of workers, so
 * nothing else moves them and nothing in the ward can be challenged by them. */
type Beat = 'idle' | 'black' | 'room' | 'open' | 'guards' | 'leave' | 'walk' | 'porch' | 'after';
type Figure = { p: ReturnType<typeof citizen>; act: Activity; moving: boolean };
const F = HOME.floor, FAR = new T.Vector3(0, 0, 1e4), KNOCKS = [.7, 1.15, 1.6, 3.9, 4.35, 4.8], SEAT = new T.Vector3(-15.95, .24, -3.3), CHALK = [-15.9, -3.75] as const;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const stoopY = (x: number, z: number) => x > -16.3 && x < -15.4 && z > -3.5 && z < -1.9 ? .4 : x > -17.1 && x <= -16.3 && z > -3.8 && z < -1.7 ? .29 : .18;
export class Intro {
  active = false; beat: Beat = 'idle'; answer: string | null = null;
  private t = 0; private k = 0; private dawdle = 0; private time = 0; private leaf = 0; private hold = 0; private steps = 0; private stepT = 0; private again = 0; private againT = 0; private path: [number, number][] = [];
  private cut = document.createElement('div'); private guards: Figure[] = []; private stranger?: Figure;
  constructor(private o: { economy: Economy; city: City; player: Player; ui: Interface; sound: Soundscape; dialogue: Dialogue; reducedMotion: () => boolean; enabled: boolean }) {
    this.cut.id = 'cut'; o.ui.app.append(this.cut); o.dialogue.onSkip = () => this.skip(); o.ui.onDoor = () => this.answerDoor(); }
  private get roof() { return this.o.city.presentation.roofwalk; }
  private get figures() { return this.stranger ? [...this.guards, this.stranger] : []; }
  /** The three scene figures, made the first time they are needed and hidden between uses. */
  private cast() { if (this.stranger) return; const root = this.o.city.presentation.root;
    const make = (role: 'guard' | 'ordinal' | 'courier', seed: number, act: Activity): Figure => { const p = citizen(mats.rust, seed, role); p.group.visible = false; root.add(p.group); return { p, act, moving: false }; };
    this.guards = [make('guard', 1, 'guard'), make('ordinal', 2, 'guard')]; this.stranger = make('courier', 7, 'sit');
    const mask = new T.Mesh(new T.CylinderGeometry(.205, .17, .15, 16, 1, true, -Math.PI * .62, Math.PI * 1.24), illustrated(new T.MeshStandardMaterial({ color: '#3b3a40', side: T.DoubleSide }))); mask.position.y = -.14; this.stranger.p.head.add(mask); }
  /** A new stewardship starts here. Nothing else starts the scene: not the frame loop, not a view, not a save that has seen it. */
  begin() { const { economy, player, dialogue } = this.o; if (!this.o.enabled || economy.state.intro.played) return; this.cast();
    this.active = true; this.answer = null; this.t = this.k = this.dawdle = this.leaf = this.steps = this.stepT = this.again = this.againT = this.hold = 0; this.path = []; this.beat = 'black'; dialogue.end(); dialogue.live = true;
    document.body.classList.add('scene'); this.cut.classList.add('now', 'on'); economy.state.day = dayAt(6, 20);
    for (const f of this.figures) { f.p.group.visible = false; f.moving = false; } this.stranger!.act = 'sit';
    const d = this.roof.door; d.shut = true; d.awaiting = false; d.leaf.visible = true; d.leaf.rotation.y = 0; this.roof.chalkMark.visible = false;
    player.teleport(-2.8, 5.55, Math.PI / 2, F + 1.75); player.pitch = -.03; player.riding = true; player.only = null; }
  /** Turn the view toward a point: a cut under reduced motion, an ease otherwise. */
  private face(x: number, z: number, dt: number, rate = 3, y?: number) { const { player } = this.o, k = this.o.reducedMotion() ? 1 : Math.min(1, dt * rate), dx = x - player.position.x, dz = z - player.position.z;
    player.yaw += wrap(Math.atan2(-dx, -dz) - player.yaw) * k; player.pitch += ((y === undefined ? -.03 : Math.atan2(y - player.position.y, Math.hypot(dx, dz))) - player.pitch) * k; }
  /** One step of a figure toward a point; true once it is there. */
  private go(f: Figure, x: number, z: number, y: number, dt: number, speed: number) { const g = f.p.group, dx = x - g.position.x, dz = z - g.position.z, d = Math.hypot(dx, dz);
    if (d > .05) { g.rotation.y += wrap(Math.atan2(dx, dz) - g.rotation.y) * Math.min(1, dt * 8); const s = Math.min(d, speed * dt); g.position.x += dx / d * s; g.position.z += dz / d * s; } g.position.y = y; f.moving = d > .1; return d <= .1; }
  private say(lines: Line[], done: () => void, speaker?: Figure) { const [first, ...rest] = lines; if (speaker) speaker.p.tone = { tone: 'authoritative', until: this.time + 4, palm: this.time + 1.6 }; this.o.dialogue.say(first, rest.length ? () => this.say(rest, done, speaker) : done); }
  private ask(node: 'guard' | 'porch', done: () => void, speaker?: Figure) { this.o.dialogue.ask(SCRIPT.find(s => s.id === node)!.choices, (c: Choice) => { if (node === 'porch') this.answer = c.id; this.say(c.reply, done, speaker); }); }
  private to(beat: Beat) { this.beat = beat; this.t = 0; }
  /** The door is answered: it opens on the two men who were knocking. */
  answerDoor() { if (this.beat !== 'room') return; const { player } = this.o, d = this.roof.door; d.awaiting = false; d.shut = false; player.only = null; player.riding = true; this.again = 0; this.o.sound.door();
    this.guards[0].p.group.position.set(-7.1, F, 4.9); this.guards[1].p.group.position.set(-8.3, F, 5.15); for (const f of this.guards) { f.p.group.rotation.y = Math.PI / 2; f.p.group.visible = true; f.act = 'guard'; f.moving = false; } this.to('open'); }
  update(dt: number, time: number) { if (this.beat === 'idle' || !dt) return; this.time = time; this.t += dt; const { player, sound, dialogue } = this.o, calm = this.o.reducedMotion(), d = this.roof.door; dialogue.update(dt);
    if (this.beat === 'black') { while (this.k < KNOCKS.length && this.t > KNOCKS[this.k]) sound.knock(this.k++ >= 3);
      if (this.t > 5.8) { this.cut.classList.remove('now', 'on'); player.riding = false; player.only = 'home.door'; d.awaiting = true; this.dawdle = 0; this.to('room'); } }
    else if (this.beat === 'room') { this.dawdle += dt; if (this.dawdle > DAWDLE.after) { this.dawdle = 0; this.again = 4; dialogue.flash(DAWDLE.line); } }
    else if (this.beat === 'open') { this.leaf = Math.min(1.5, this.leaf + dt * (calm ? 9 : 2.2)); d.leaf.rotation.y = this.leaf; this.face(-7.7, 5, dt);
      if (this.t > 1.1) { this.to('guards'); this.say(SCRIPT[0].lines, () => this.ask('guard', () => this.to('leave'), this.guards[0]), this.guards[0]); } }
    else if (this.beat === 'leave') { const [a, b] = this.guards; this.face(a.p.group.position.x, a.p.group.position.z, dt);
      if (this.t > .6) { a.act = b.act = 'walk'; this.stepT -= dt; if (this.stepT <= 0 && this.steps === 0) { this.stepT = .4; sound.step(.03); }
        if (this.go(a, -14.4, 4.95, F, dt, 2.9) && this.go(b, -14.4, 5.15, F, dt, 2.7)) { for (const f of this.guards) f.p.group.visible = false; this.steps = 7; this.stepT = 0; this.stranger!.p.group.position.copy(SEAT); this.stranger!.p.group.rotation.y = -Math.PI / 2; this.stranger!.p.group.visible = true; player.riding = false; player.only = 'scene'; this.to('walk'); } } }
    else if (this.beat === 'walk') { const g = this.stranger!.p.group.position; if (player.position.x < -17.4 && player.position.y < 3 && Math.hypot(player.position.x - g.x, player.position.z - g.z) < 3.5) { player.riding = true; player.velocity.set(0, 0, 0); this.to('porch'); this.say(SCRIPT[1].lines, () => this.ask('porch', () => this.farewell())); } }
    else if (this.beat === 'porch') this.face(SEAT.x, SEAT.z, dt, 4, SEAT.y + .85);
    else if (this.beat === 'after') this.leaveStranger(dt);
    // Echoes: the second round of knocks, the guards' boots going down the stair.
    if (this.again > 0 && (this.againT -= dt) <= 0) { this.againT = .33; this.again--; sound.knock(true); }
    if (this.steps > 0 && (this.stepT -= dt) <= 0) { this.stepT = .38; sound.step(.025 * this.steps / 7); this.steps--; }
    for (const f of this.figures) if (f.p.group.visible) animateLife(f.p, f.act, dt, time, calm, f === this.stranger ? FAR : player.position, undefined, false, f.moving); }
  /** The stranger stands, goes to the doorpost, chalks it, and walks off; the street is the player's again. */
  private farewell() { this.stranger!.act = 'walk'; this.path = [[CHALK[0], CHALK[1]], [-17.6, -4.9], [-24, -5.6]]; this.to('after'); this.o.player.riding = false; this.o.dialogue.live = true; }
  private leaveStranger(dt: number) { const f = this.stranger!, g = f.p.group;
    if (this.hold > 0) { f.moving = false; if ((this.hold -= dt) <= 0) { this.roof.chalkMark.visible = true; this.release(false); } return; }
    const [x, z] = this.path[0]; if (!this.go(f, x, z, stoopY(g.position.x, g.position.z), dt, 1.5)) return;
    this.path.shift(); if (this.path.length === 2) { g.rotation.y = Math.PI / 2; this.hold = 1.1; } else if (!this.path.length) { g.visible = false; this.beat = 'idle'; } }
  /** The scene is over, whether it ran out or was skipped: the save remembers, the HUD comes up behind the title. */
  private release(skipped: boolean) { if (!this.active) return; const { economy, player, ui, dialogue } = this.o, d = this.roof.door; this.active = false;
    d.shut = d.awaiting = false; d.leaf.visible = false; player.only = null; player.riding = false; player.velocity.set(0, 0, 0); this.cut.classList.remove('on'); this.steps = this.again = 0; economy.finishIntro(this.answer);
    document.body.classList.remove('scene'); ui.tracked = 'scrap'; ui.toast(OBJECTIVE, 7000); if (skipped) dialogue.end(); else { dialogue.hide(); dialogue.live = false; dialogue.showTitle(); } }
  /** Skip, from any beat: the save is marked, everything off, the Steward on the stoop with the mark on the post. */
  skip() { if (!this.active) return; this.release(true); for (const f of this.figures) f.p.group.visible = false; this.beat = 'idle'; this.roof.chalkMark.visible = true; this.o.player.teleport(-16.7, -2.35, Math.PI / 2); this.o.player.pitch = -.03; }
}
