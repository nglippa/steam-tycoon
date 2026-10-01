import type { Settings } from '../simulation/economy';
export class Soundscape {
  context?: AudioContext; master?: GainNode; ambient?: GainNode; sfx?: GainNode; music?: GainNode; rainGain?: GainNode; machine?: PannerNode; nextBell = 0; nextClang = 0; nextVoice = 0; zones: {gain:GainNode;kind:string}[]=[];
  constructor(public settings: () => Settings) {}
  start() { if (this.context) { void this.context.resume(); return; } const c = this.context = new AudioContext(); this.master = c.createGain(); this.master.connect(c.destination); this.ambient = c.createGain(); this.ambient.connect(this.master); this.sfx = c.createGain(); this.sfx.connect(this.master); this.music = c.createGain(); this.music.connect(this.master);
    const buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate); const samples = buffer.getChannelData(0); let last = 0; for (let i = 0; i < samples.length; i++) { last = (last + (Math.random() * 2 - 1) * .03) / 1.02; samples[i] = last * 3; }
    const noise = c.createBufferSource(); noise.buffer = buffer; noise.loop = true; const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 750; this.rainGain = c.createGain(); this.rainGain.gain.value = .17; noise.connect(filter); filter.connect(this.rainGain); this.rainGain.connect(this.ambient); noise.start();
    const motor = c.createOscillator(); motor.type = 'triangle'; motor.frequency.value = 48; const gain = c.createGain(); gain.gain.value = .045; this.machine = c.createPanner(); this.machine.panningModel = 'HRTF'; this.machine.distanceModel = 'inverse'; this.machine.refDistance = 7; this.machine.maxDistance = 70; this.machine.positionX.value = 12; this.machine.positionZ.value = 40; motor.connect(gain); gain.connect(this.machine); this.machine.connect(this.ambient); motor.start();
    for(const [kind,x,z,hz,volume] of [['foundry',29,14,110,.018],['market',7,-20,190,.012],['housing',-42,27,145,.007]] as const){
      const source=c.createOscillator();source.type=kind==='foundry'?'sawtooth':'triangle';source.frequency.value=hz;
      const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='foundry'?350:500;
      const zoneGain=c.createGain();zoneGain.gain.value=volume;const pan=c.createPanner();pan.panningModel='HRTF';pan.refDistance=5;pan.maxDistance=35;pan.positionX.value=x;pan.positionY.value=1;pan.positionZ.value=z;
      source.connect(filter);filter.connect(zoneGain);zoneGain.connect(pan);pan.connect(this.ambient);source.start();this.zones.push({gain:zoneGain,kind});
      const air=c.createBufferSource();air.buffer=buffer;air.loop=true;air.connect(filter);air.start();
    }
    this.apply(); }
  apply() { if (!this.context) return; const s = this.settings(); this.master!.gain.value = s.master; this.ambient!.gain.value = s.ambience; this.sfx!.gain.value = s.sfx; this.music!.gain.value = s.music; }
  tone(freq: number, duration: number, volume = .1, type: OscillatorType = 'sine', delay = 0) { if (!this.context) return; const c = this.context; const t = c.currentTime + delay; const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + duration); o.connect(g); g.connect(this.sfx!); o.start(t); o.stop(t + duration + .02); }
  purchase() { [261.63, 329.63, 392, 523.25].forEach((f, i) => this.tone(f, .55, .09, 'triangle', i * .07)); }
  /** A milestone is heard as well as seen: a brass rise that holds, not the ledger's chime. */
  milestone() { [196, 261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => this.tone(f, 1.5 - i * .1, .075, i < 3 ? 'sawtooth' : 'triangle', i * .11)); this.tone(98, 2, .05, 'sine'); }
  collect() { this.tone(880, .2, .04); this.tone(1320, .3, .025, 'sine', .08); }
  step() { this.tone(65 + Math.random() * 35, .07, .05, 'triangle'); }
  hammer() { this.tone(180 + Math.random() * 70, .06, .045, 'square'); }
  /** The Directorate's inspection whistle: two shrill blasts. */
  whistle() { this.tone(1760, .16, .05, 'square'); this.tone(1480, .32, .05, 'square', .2); }
  update(x: number, z: number, yaw: number, raining: boolean, time: number) { if (!this.context) return; const l = this.context.listener; if (l.positionX) { l.positionX.value = x; l.positionY.value = 1.75; l.positionZ.value = z; l.forwardX.value = -Math.sin(yaw); l.forwardY.value = 0; l.forwardZ.value = -Math.cos(yaw); l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; } for(const zone of this.zones){const base=zone.kind==='foundry'?.02:zone.kind==='market'?.012:.007;zone.gain.gain.setTargetAtTime(base*(.7+.3*Math.sin(time*(zone.kind==='foundry'?4:1.3))),this.context.currentTime,.1);}
    this.rainGain!.gain.setTargetAtTime(raining ? .2 : .055, this.context.currentTime, 1); const foundry = Math.hypot(x - 32, z - 15), market = Math.hypot(x - 6, z + 26);
    if (foundry < 30 && time > this.nextClang) { this.nextClang = time + .9 + Math.random() * .8; const v = .05 * (1 - foundry / 30); this.tone(820 + Math.random() * 180, .12, v, 'square'); this.tone(1650, .3, v * .3, 'sine', .01); }
    if (market < 26 && time > this.nextVoice) { this.nextVoice = time + .18 + Math.random() * .5; const v = .014 * (1 - market / 26); this.tone(170 + Math.random() * 160, .12 + Math.random() * .1, v, 'triangle'); }
    if (time > this.nextBell) { this.nextBell = time + 90; this.tone(196, 3, .035); this.tone(392, 2.2, .012, 'sine', .1); } }
}
