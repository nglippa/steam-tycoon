export const PROPERTIES = [
  { id: 'scrap', name: 'Rook & Son Salvage', kind: 'SCRAP YARD', base: 4, interval: 4, cost: 25, x: -19, z: 40, rotation: Math.PI / 2, description: 'A hundred years of discarded Locke iron. There is a second life in all of it.', upgrades: ['Mend the sorting rig', 'Hire a second shift', 'Install the magnetic crane', 'Expand the salvage hall', 'Commission an aether sorter'] },
  { id: 'boiler', name: 'The Municipal Boiler', kind: 'BOILER WORKS', base: 7, interval: 5, cost: 45, x: 19, z: 40, rotation: -Math.PI / 2, description: 'The heart beneath Terra. Bring the pressure back, and the whole district breathes.', upgrades: ['Seal the pressure vessel', 'Replace the copper mains', 'Fit a governor engine', 'Raise the chimney stack', 'Install aether compression'] },
  { id: 'workshop', name: 'Finch Mechanical', kind: 'WORKSHOP', base: 12, interval: 6, cost: 90, x: -19, z: 14, rotation: Math.PI / 2, description: 'Gears cut by hand. Machines built to last longer than their makers.', upgrades: ['Restore the belt drive', 'Fit precision lathes', 'Open the assembly floor', 'Train the machinists', 'Build clockwork automata'] },
  { id: 'foundry', name: 'Cinder & Iron', kind: 'FOUNDRY', base: 20, interval: 7, cost: 140, x: 19, z: 14, rotation: -Math.PI / 2, description: 'From the mountains of Veyr to the bones of Terra. Iron makes a city stand.', upgrades: ['Relight the furnace', 'Build a casting line', 'Install a steam hammer', 'Forge tempered alloys', 'Smelt aether steel'] },
  { id: 'tavern', name: 'The Copper Finch', kind: 'TAVERN', base: 17, interval: 6, cost: 115, x: -19, z: -16, rotation: Math.PI / 2, description: 'A warm window. A familiar face. A city needs more than industry.', upgrades: ['Reopen the taproom', 'Mend the guest rooms', 'Commission a brass sign', 'Open the roof terrace', 'Welcome Locke travelers'] },
  { id: 'market', name: 'Bellweather Exchange', kind: 'MARKET', base: 24, interval: 7, cost: 175, x: 19, z: -16, rotation: -Math.PI / 2, description: 'Salt from Orison. Tea from the Amber Coast. Tomorrow, trade with all of Locke.', upgrades: ['Restore the market stalls', 'License the guild traders', 'Open the covered arcade', 'Build a trade office', 'Charter the sky merchants'] },
] as const;
export type PropertyId = typeof PROPERTIES[number]['id'];
export const INFRA = [
  { id: 'lamps', name: 'Street lighting', cost: 65, detail: 'Replace failing lanterns with brass lamps, then luminous aether glass.', effect: 'More light · +8% city income / level' },
  { id: 'roads', name: 'Roads & transit', cost: 100, detail: 'Repair muddy lanes, lay stone paving, and welcome the municipal tram.', effect: 'New paving and transit · +10% income / level' },
  { id: 'steam', name: 'Steam distribution', cost: 140, detail: 'Repair the overhead mains and replace leaking joints with pressure regulators.', effect: 'Refined pipes · +15% income / level' },
  { id: 'gardens', name: 'Water & public gardens', cost: 200, detail: 'Restore the drinking fountain, clean the canal, and plant the clock square.', effect: 'Clean water and greenery · +8% income / level' },
  { id: 'housing', name: 'Workers’ homes', cost: 180, detail: 'Replace boarded windows, mend the rooftops, and raise a better home for Terra.', effect: 'Restored housing · +12% income / level' },
] as const;
export type InfraId = typeof INFRA[number]['id'];
export const STAGES = ['The Lowworks', 'Recovery', 'Industry', 'Commerce', 'Innovation', 'Grand Terra'];
export interface PropertyState { level: number; automated: boolean; stored: number; progress: number }
export interface Settings { master: number; ambience: number; sfx: number; music: number; sensitivity: number; reducedMotion: boolean; quality: 'high' | 'low' }
export interface Save { version: 2; crowns: number; earned: number; properties: Record<PropertyId, PropertyState>; infrastructure: Record<InfraId, number>; districts: string[]; research: string[]; discoveries: string[]; objective: number; playtime: number; day: number; lastSave: number; settings: Settings }
export interface StorageAdapter { read(): string | null; write(value: string): void; clear(): void }
export const SAVE_KEY = 'locke.terra.save';
export function freshSave(now = Date.now()): Save {
  return { version: 2, crowns: 35, earned: 0, properties: Object.fromEntries(PROPERTIES.map(p => [p.id, { level: 0, automated: false, stored: 0, progress: 0 }])) as Save['properties'], infrastructure: { lamps: 0, roads: 0, steam: 0, gardens: 0, housing: 0 }, districts: [], research: [], discoveries: [], objective: 0, playtime: 0, day: .72, lastSave: now, settings: { master: .55, ambience: .45, sfx: .7, music: 0, sensitivity: 1, reducedMotion: false, quality: 'high' } };
}
const finite = (v: unknown, fallback: number, max = 1e15) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : fallback;
export function decodeSave(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw); if (!data || ![1, 2].includes(data.version)) return null;
    const s = freshSave(); s.crowns = finite(data.crowns, 35); s.earned = finite(data.earned, 0);
    for (const p of PROPERTIES) { const v = data.properties?.[p.id]; if (v) s.properties[p.id] = { level: Math.floor(finite(v.level, 0, 5)), automated: Boolean(v.automated), stored: finite(v.stored, 0), progress: finite(v.progress, 0, p.interval) }; }
    for (const i of INFRA) s.infrastructure[i.id] = Math.floor(finite(data.infrastructure?.[i.id], 0, 3));
    s.districts = Array.isArray(data.districts) ? [...new Set<string>(data.districts.filter((x: unknown) => typeof x === 'string' && ['canal', 'heights'].includes(x)))] : [];
    s.research = Array.isArray(data.research) ? [...new Set<string>(data.research.filter((x: unknown) => typeof x === 'string' && ['governors', 'aether', 'charter'].includes(x)))] : [];
    s.discoveries = Array.isArray(data.discoveries) ? [...new Set<string>(data.discoveries.filter((x: unknown) => typeof x === 'string' && ['map', 'automaton', 'shrine'].includes(x)))] : [];
    s.objective = Math.floor(finite(data.objective, 0, 5)); s.playtime = finite(data.playtime, 0); s.day = finite(data.day, .72, 1); s.lastSave = finite(data.lastSave, Date.now());
    for (const key of ['master', 'ambience', 'sfx', 'music', 'sensitivity'] as const) s.settings[key] = finite(data.settings?.[key], s.settings[key], key === 'sensitivity' ? 2 : 1);
    s.settings.reducedMotion = Boolean(data.settings?.reducedMotion); s.settings.quality = data.settings?.quality === 'low' ? 'low' : 'high'; return s;
  } catch { return null; }
}
export class Economy {
  state: Save; onChange: (kind: string, id: string) => void = () => {}; offlineAward = 0;
  constructor(public storage: StorageAdapter, now = Date.now()) {
    this.state = decodeSave(storage.read()) ?? freshSave(now);
    const seconds = Math.max(0, Math.min(4 * 3600, (now - this.state.lastSave) / 1000));
    this.offlineAward = this.rate * seconds; this.state.crowns += this.offlineAward; this.state.earned += this.offlineAward; this.state.lastSave = now;
  }
  get multiplier() { const i = this.state.infrastructure; return (1 + i.lamps * .08 + i.roads * .1 + i.steam * .15 + i.gardens * .08 + i.housing * .12) * (1 + this.state.districts.length * .25) * (1 + this.state.research.length * .25) * (1 + this.state.discoveries.length * .03); }
  output(id: PropertyId) { const p = PROPERTIES.find(p => p.id === id)!; const level = this.state.properties[id].level; return p.base * (level === 0 ? .25 : Math.pow(1.85, level - 1)) * (level >= 3 ? 1.5 : 1) * (level === 5 ? 2 : 1) * this.multiplier; }
  get rate() { return PROPERTIES.reduce((sum, p) => sum + this.output(p.id) / p.interval * (this.state.properties[p.id].automated ? 1 : .4), 0); }
  get investment() { return Object.values(this.state.properties).reduce((n, p) => n + p.level, 0) + Object.values(this.state.infrastructure).reduce((a, b) => a + b, 0); }
  get stage() { return Math.min(5, Math.floor(this.investment / 7)); }
  cost(id: PropertyId) { const p = PROPERTIES.find(p => p.id === id)!; return Math.ceil(p.cost * Math.pow(2.1, this.state.properties[id].level)); }
  infraCost(id: InfraId) { return Math.ceil(INFRA.find(i => i.id === id)!.cost * Math.pow(3, this.state.infrastructure[id])); }
  spend(amount: number) { if (!Number.isFinite(amount) || amount < 0) return false; if (this.state.crowns + 1e-8 < amount) return false; this.state.crowns -= amount; return true; }
  upgrade(id: PropertyId) { const p = this.state.properties[id]; if (p.level >= 5 || !this.spend(this.cost(id))) return false; p.level++; this.checkObjective(); this.onChange('property', id); this.save(); return true; }
  automate(id: PropertyId) { const p = this.state.properties[id]; if (!p.level || p.automated || !this.spend(PROPERTIES.find(v => v.id === id)!.cost * 2)) return false; p.automated = true; this.collect(id); this.onChange('automation', id); this.save(); return true; }
  collect(id: PropertyId) { const p = this.state.properties[id]; const amount = p.stored; this.state.crowns += amount; this.state.earned += amount; p.stored = 0; if (id === 'scrap' && this.state.objective === 1 && amount > 0) this.state.objective = 2; this.checkObjective(); return amount; }
  upgradeInfra(id: InfraId) { if (this.state.infrastructure[id] >= 3 || !this.spend(this.infraCost(id))) return false; this.state.infrastructure[id]++; this.checkObjective(); this.onChange('infrastructure', id); this.save(); return true; }
  unlock(id: string) { const price = id === 'canal' ? 750 : 3000; const stage = id === 'canal' ? 1 : 3; if (!['canal', 'heights'].includes(id) || this.state.districts.includes(id) || this.stage < stage || !this.spend(price)) return false; this.state.districts.push(id); this.onChange('district', id); this.save(); return true; }
  research(id: string) { const price = { governors: 450, aether: 1800, charter: 4500 }[id]; if (!price || this.state.research.includes(id) || this.stage < (id === 'governors' ? 1 : 3) || !this.spend(price)) return false; this.state.research.push(id); this.onChange('research', id); this.save(); return true; }
  discover(id: string) { if (!['map', 'automaton', 'shrine'].includes(id) || this.state.discoveries.includes(id)) return false; this.state.discoveries.push(id); this.state.crowns += 55; this.state.earned += 55; this.save(); return true; }
  inspect(id: string) { if (id === 'scrap' && this.state.objective === 0) this.state.objective = 1; }
  checkObjective() { if (this.state.objective === 2 && this.state.properties.scrap.level > 0) this.state.objective = 3; if (this.state.objective === 3 && this.state.properties.boiler.level > 0) this.state.objective = 4; if (this.state.objective === 4 && this.state.infrastructure.lamps > 0) this.state.objective = 5; }
  tick(dt: number) { dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 14400)) : 0; this.state.playtime += dt; this.state.day = (this.state.day + dt / 720) % 1;
    for (const p of PROPERTIES) { const s = this.state.properties[p.id]; const out = this.output(p.id); const passive = out / p.interval * (s.automated ? 1 : .4) * dt; this.state.crowns += passive; this.state.earned += passive; s.progress += dt; const cycles = Math.floor(s.progress / p.interval); s.progress %= p.interval; if (!s.automated) s.stored = Math.min(s.stored + cycles * out * .6, out * 30); }
  }
  save(now = Date.now()) { this.state.lastSave = now; try { this.storage.write(JSON.stringify(this.state)); } catch { this.onChange('save-error', ''); } }
  reset() { this.state = freshSave(); this.offlineAward = 0; this.storage.clear(); this.save(); }
}
export function format(n: number) { return n >= 1e6 ? (n / 1e6).toFixed(2) + 'm' : n >= 1e4 ? (n / 1000).toFixed(1) + 'k' : Math.floor(n).toLocaleString('en-US'); }
