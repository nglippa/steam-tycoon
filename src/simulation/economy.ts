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
/** Liberation is a second, place-bound progression. Each site climbs one ladder:
 * 0 occupied, 1-3 covert resistance, 4 liberated, 5 ancient Terra restored. Economic
 * prosperity gates the steps but is never the same thing as control of the street. */
export type SiteId = 'market' | 'foundry' | 'row';
/** `sites` ties a step to progress elsewhere in the city; a `carried` step is never bought,
 * it completes when something is physically delivered (see Economy.deliver). */
export interface SiteStep { name: string; kind: 'covert' | 'liberation' | 'restoration'; cost: number; detail: string; done: string; carried?: true; requires: { property?: PropertyId; infra?: InfraId; level?: number; stage?: number; sites?: Partial<Record<SiteId, number>> } }
/** A physical place in the street that carries some of a site's steps. Outside its own
 * steps it only speaks (before/after); `closed` refuses it outright; covert spots
 * refuse while occupation eyes are on the Steward. */
export interface SiteSpot { from: number; to: number; before: string; after: string; covert?: boolean; closed?: (s: Save) => string | null }
export interface SiteDef { id: SiteId; name: string; steps: SiteStep[]; spots: Record<string, SiteSpot>; watched: string; voice: Record<SiteStep['kind'], [overline: string, lore: string, verb: string]> }
export const SITES: SiteDef[] = [
  { id: 'market', name: 'Market Square', steps: [
    { name: 'Knock at the Copper Finch cellar', kind: 'covert', cost: 120, detail: 'The taproom keeps a second ledger below the kegs. Stand the first round for the Embers.', done: 'A turquoise lamp is lit above the Copper Finch cellar. The Embers have a door in Market Square.', requires: { property: 'tavern', level: 1 } },
    { name: 'Turn the Bellweather stallholders', kind: 'covert', cost: 300, detail: 'Traders carry more than tea. Fund the couriers who move word between wards.', done: 'Someone has been at the checkpoint hoarding with chalk. Couriers cross the square with crates.', requires: { property: 'market', level: 1 } },
    { name: 'Stock the cellar', kind: 'covert', cost: 650, detail: 'Bolt cutters, lamp oil and pry bars, delivered with the Finch’s beer.', done: 'A tarp covers new crates by the cellar, and turquoise ribbons are tied to the lamp posts. Nobody at the gate has noticed.', requires: { property: 'tavern', level: 2 } },
    { name: 'Raise Market Square', kind: 'liberation', cost: 1600, detail: 'On the signal, the square refuses the checkpoint. The foundry’s cutters take the gallery off the gate, and the Ordinance banners come down.', done: 'Market Square rises. The gallery is torn off the old gate, and the square flies Terra’s own colours.', requires: { stage: 2, sites: { row: 2 } } },
    { name: 'Wake the Saelspring', kind: 'restoration', cost: 3200, detail: 'Under the Ordinance seal sits a machine older than the city’s records. Clean mains may let it run again.', done: 'The civic engineers are cutting the Ordinance seal off the spring.', requires: { infra: 'gardens', level: 1 } },
  ], spots: {
    cell: { from: 0, to: 3, covert: true, before: '', after: 'The cellar is a meeting room now. The Embers hold Market Square in the open.', closed: s => s.sites.market === 0 && s.properties.tavern.level < 1 ? 'The cellar door is padlocked and the Copper Finch is shuttered. Nobody answers.' : null },
    spring: { from: 4, to: 4, before: 'An Ordinance seal is welded around something older than the city’s records. Under the soot, the stone is pale and the tiles are turquoise.', after: 'The Saelspring runs. Its light follows the old channels to the Sael Gate.' },
  }, watched: 'An Ordinance patrol is watching the square. Wait until it passes.',
  voice: { covert: ['THE EMBERS · BELOW THE COPPER FINCH', 'Nobody upstairs asks why the Steward drinks in the cellar.', 'Pass the coin'], liberation: ['THE EMBERS · THE SIGNAL', 'Every stall, every courier and every lamp is ready. One word and the square refuses the checkpoint.', 'Give the signal'], restoration: ['ANCIENT TERRA · BENEATH THE SEAL', 'Under the Ordinance cage: an ivory basin, a closed flower of turquoise petals and a dark crystal. The channels still lead to the gate.', 'Commission the restoration'] } },
  { id: 'foundry', name: 'Cinder No. 3', steps: [
    { name: 'Answer the shift board', kind: 'covert', cost: 180, detail: 'The quota tallies hide a second count. Word from the Copper Finch lets you add your own mark to it.', done: 'Chalk tallies under the quota board now keep the Embers’ count. Behind the coal bunker, somebody has set out stools.', requires: { property: 'foundry', level: 1, sites: { market: 1 } } },
    { name: 'Hide work in the quota', kind: 'covert', cost: 420, detail: 'Legitimate castings leave the yard every hour. Some crates will carry a false bottom.', done: 'Every hundredth crate out of Cinder No. 3 has a false bottom. The overseer counts the crates, not what is in them.', requires: { property: 'foundry', level: 2 } },
    { name: 'Forge the cutters', kind: 'covert', cost: 850, detail: 'Bolt cutters and pressure keys, cast between quota runs. Enough to take a checkpoint apart.', done: 'A rack of cutters and pressure keys waits under the tarp, and a crate of them sits by the cage door. Someone has to carry it to the Copper Finch.', requires: { property: 'foundry', level: 3 } },
    { name: 'Down tools', kind: 'liberation', cost: 2200, detail: 'The whole yard stops at once. Without its workers the furnace is only iron, and the Ordinance knows it.', done: 'Cinder No. 3 downs tools. The overseer’s booth comes apart, the supply cage opens, and the workers post their own shifts.', requires: { stage: 3 } },
    { name: 'Wake the Armillary', kind: 'restoration', cost: 4200, detail: 'Behind the furnace, welded still, are rings older than any foundry. They want steady pressure, not coal.', done: 'The civic engineers are cutting Cinder No. 3 out of the old wall.', requires: { infra: 'steam', level: 2 } },
  ], spots: {
    board: { from: 0, to: 3, covert: true, before: '', after: 'The shift board belongs to the works council now. Names, not quotas.', closed: s => s.sites.foundry === 0 && s.properties.foundry.level < 1 ? 'No shifts are posted. The yard is cold and nobody will meet your eye.' : null },
    forge: { from: 4, to: 4, before: 'An anvil is strapped to an ivory table that is far too fine for it. Behind the furnace, gold rings are welded into the wall.', after: 'The Armillary turns without a sound. Whatever it is making, the Ordinance never knew how to ask.' },
  }, watched: 'The overseer is looking this way. Wait until he turns back to the lane.',
  voice: { covert: ['THE EMBERS · CINDER No. 3', 'The quota board counts crates. The workers count something else.', 'Make your mark'], liberation: ['THE EMBERS · THE WHISTLE', 'Every furnace crew is ready. One whistle and the yard belongs to the people who work it.', 'Blow the whistle'], restoration: ['ANCIENT TERRA · THE ARMILLARY', 'Behind the coal furnace, welded still: an ivory frame, three gold rings and a dark core, and in front of it a fabrication table used as an anvil.', 'Commission the restoration'] } },
  { id: 'row', name: 'Cinder Row', steps: [
    { name: 'Chalk the courier run', kind: 'covert', cost: 150, detail: 'Mark the old waymark so the Finch’s runners and the yard’s packers know the Row. From then on, things move between them.', done: 'An ember is chalked on the old waymark. A courier now runs Cinder Row between the yard and the Copper Finch.', requires: { sites: { market: 1, foundry: 1 } } },
    { name: 'Run the cutters to the Finch', kind: 'covert', cost: 0, carried: true, detail: 'The cutters are too heavy for a satchel. Carry the crate from Cinder No. 3 to the Copper Finch cellar yourself, past whatever the Directorate has put on the Row.', done: 'The crate is down the Finch’s cellar steps. Market Square has the tools to take the gallery off its gate.', requires: { sites: { foundry: 3 } } },
    { name: 'Cut the searchlight feed', kind: 'covert', cost: 450, detail: 'The inspection searchlight draws its power from somewhere under the Row. Open the cable trench at the junction box and cut it.', done: 'The searchlight dies. Under the Directorate’s cable the trench is lined with turquoise tile, and something in it is still faintly alight. They were running their lamp off Terra.', requires: {} },
    { name: 'Take down the inspection post', kind: 'liberation', cost: 900, detail: 'With the square and the yard both free, the post between them guards nothing. Take it apart in daylight.', done: 'The inspection post comes down. The Row fills with the people who were searched on it, and the old conduit lights from end to end.', requires: { sites: { market: 4, foundry: 4 } } },
  ], spots: {
    waymark: { from: 0, to: 0, covert: true, before: '', after: 'An ember in chalk on the old waymark. Under the soot the stone is ivory, and its arrow points to the square.' },
    junction: { from: 2, to: 2, covert: true, before: 'A Directorate junction box, humming. Its cable runs down into an iron-covered trench.', after: 'The cut cable hangs over an open trench of turquoise tile.' },
    post: { from: 3, to: 3, before: 'The inspection table. Nobody lingers here.', after: 'The inspection table is a stall now.' },
  }, watched: 'The inspector is looking this way. Wait until he bends over his table.',
  voice: { covert: ['THE EMBERS · CINDER ROW', 'Between the yard and the square, every doorway on the Row has an opinion about the Directorate.', 'Pass the chalk'], liberation: ['THE EMBERS · CINDER ROW', 'The square and the yard are free. The post between them is a table and four sawhorses.', 'Take it down'], restoration: ['ANCIENT TERRA · CINDER ROW', 'An old conduit runs under the Row.', 'Commission the restoration'] } },
];
export const SITE_LIBERATED = 4, SITE_RESTORED = 5;
/** What the city knows about itself: facts that follow from progress at several sites.
 * Districts read these instead of re-deriving rules, so a change in one place shows up
 * wherever it matters (the Directorate's response, the courier, the cutters' journey). */
export function cityFacts(sites: Record<SiteId, number>) {
  const { market, foundry, row } = sites;
  return {
    /** The Finch vouches: the Embers have a network in the square. */
    network: market >= 1,
    /** A courier runs Cinder Row between the yard and the Finch. */
    courierRun: row >= 1,
    /** Crates leave the yard light and couriers use the Row: the Directorate notices. */
    inspection: row >= 1 && foundry >= 2 && row < SITE_LIBERATED,
    /** The forged cutters wait at the yard for someone to carry them. */
    cuttersWaiting: foundry >= 3 && row === 1,
    /** The cutters reached the Finch. */
    cuttersDelivered: row >= 2,
    searchlightCut: row >= 3,
    rowFree: row >= SITE_LIBERATED,
  };
}
export type CityFacts = ReturnType<typeof cityFacts>;
export interface PropertyState { level: number; automated: boolean; stored: number; progress: number }
export interface Settings { master: number; ambience: number; sfx: number; music: number; sensitivity: number; reducedMotion: boolean; quality: 'high' | 'low' }
export interface Save { version: 3; crowns: number; earned: number; properties: Record<PropertyId, PropertyState>; infrastructure: Record<InfraId, number>; districts: string[]; research: string[]; discoveries: string[]; sites: Record<SiteId, number>; objective: number; playtime: number; day: number; lastSave: number; settings: Settings }
export interface StorageAdapter { read(): string | null; write(value: string): void; clear(): void }
export const SAVE_KEY = 'locke.terra.save';
export function freshSave(now = Date.now()): Save {
  return { version: 3, crowns: 35, earned: 0, properties: Object.fromEntries(PROPERTIES.map(p => [p.id, { level: 0, automated: false, stored: 0, progress: 0 }])) as Save['properties'], infrastructure: { lamps: 0, roads: 0, steam: 0, gardens: 0, housing: 0 }, districts: [], research: [], discoveries: [], sites: { market: 0, foundry: 0, row: 0 }, objective: 0, playtime: 0, day: .72, lastSave: now, settings: { master: .55, ambience: .45, sfx: .7, music: 0, sensitivity: 1, reducedMotion: false, quality: 'high' } };
}
const finite = (v: unknown, fallback: number, max = 1e15) => typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : fallback;
export function decodeSave(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw); if (!data || ![1, 2, 3].includes(data.version)) return null;
    const s = freshSave(); s.crowns = finite(data.crowns, 35); s.earned = finite(data.earned, 0);
    for (const p of PROPERTIES) { const v = data.properties?.[p.id]; if (v) s.properties[p.id] = { level: Math.floor(finite(v.level, 0, 5)), automated: Boolean(v.automated), stored: finite(v.stored, 0), progress: finite(v.progress, 0, p.interval) }; }
    for (const i of INFRA) s.infrastructure[i.id] = Math.floor(finite(data.infrastructure?.[i.id], 0, 3));
    s.districts = Array.isArray(data.districts) ? [...new Set<string>(data.districts.filter((x: unknown) => typeof x === 'string' && ['canal', 'heights'].includes(x)))] : [];
    s.research = Array.isArray(data.research) ? [...new Set<string>(data.research.filter((x: unknown) => typeof x === 'string' && ['governors', 'aether', 'charter'].includes(x)))] : [];
    s.discoveries = Array.isArray(data.discoveries) ? [...new Set<string>(data.discoveries.filter((x: unknown) => typeof x === 'string' && ['map', 'automaton', 'shrine'].includes(x)))] : [];
    for (const site of SITES) s.sites[site.id] = Math.floor(finite(data.sites?.[site.id], 0, SITE_RESTORED));
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
  get multiplier() { const i = this.state.infrastructure; return (1 + i.lamps * .08 + i.roads * .1 + i.steam * .15 + i.gardens * .08 + i.housing * .12) * (1 + this.state.districts.length * .25) * (1 + this.state.research.length * .25) * (1 + this.state.discoveries.length * .03) * this.liberation; }
  /** Lifting the occupation levy: +15% per liberated site, +10% more once its ancient works run. */
  get liberation() { return 1 + SITES.reduce((n, s) => { const v = this.state.sites[s.id]; return n + (v >= SITE_LIBERATED ? .15 : 0) + (v >= SITE_RESTORED ? .1 : 0); }, 0); }
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
  site(id: SiteId) { return SITES.find(s => s.id === id)!; }
  /** Why the next step at a site cannot be taken yet; null when only the price stands in the way. */
  siteBlocker(id: SiteId): string | null { const step = this.site(id).steps[this.state.sites[id]]; if (!step) return 'Complete';
    return this.requirement(step) ?? (step.carried ? 'Carried by hand, not bought' : null); }
  /** A carried step completes, free, when its goods arrive and everything else it needs is in place. */
  deliver(id: SiteId) { const step = this.site(id).steps[this.state.sites[id]]; if (!step?.carried || this.requirement(step)) return false; this.state.sites[id]++; this.onChange('site', id); this.save(); return true; }
  private requirement(step: SiteStep): string | null { const r = step.requires;
    if (r.property && this.state.properties[r.property].level < (r.level ?? 1)) return `Requires ${PROPERTIES.find(p => p.id === r.property)!.name} restored to level ${r.level ?? 1}`;
    if (r.infra && this.state.infrastructure[r.infra] < (r.level ?? 1)) return `Requires ${INFRA.find(i => i.id === r.infra)!.name.toLowerCase()} level ${r.level ?? 1}`;
    if (r.stage !== undefined && this.stage < r.stage) return `Requires Terra to reach ${STAGES[r.stage]}`;
    for (const [other, control] of Object.entries(r.sites ?? {}) as [SiteId, number][]) if (this.state.sites[other] < control) return `Requires ${this.site(other).name}: ${this.site(other).steps[control - 1].name.toLowerCase()}`;
    return null; }
  advanceSite(id: SiteId) { const level = this.state.sites[id], step = this.site(id).steps[level]; if (!step || this.siteBlocker(id) || !this.spend(step.cost)) return false; this.state.sites[id]++; this.onChange('site', id); this.save(); return true; }
  inspect(id: string) { if (id === 'scrap' && this.state.objective === 0) this.state.objective = 1; }
  checkObjective() { if (this.state.objective === 2 && this.state.properties.scrap.level > 0) this.state.objective = 3; if (this.state.objective === 3 && this.state.properties.boiler.level > 0) this.state.objective = 4; if (this.state.objective === 4 && this.state.infrastructure.lamps > 0) this.state.objective = 5; }
  tick(dt: number) { dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 14400)) : 0; this.state.playtime += dt; this.state.day = (this.state.day + dt / 720) % 1;
    for (const p of PROPERTIES) { const s = this.state.properties[p.id]; const out = this.output(p.id); const passive = out / p.interval * (s.automated ? 1 : .4) * dt; this.state.crowns += passive; this.state.earned += passive; s.progress += dt; const cycles = Math.floor(s.progress / p.interval); s.progress %= p.interval; if (!s.automated) s.stored = Math.min(s.stored + cycles * out * .6, out * 30); }
  }
  save(now = Date.now()) { this.state.lastSave = now; try { this.storage.write(JSON.stringify(this.state)); } catch { this.onChange('save-error', ''); } }
  reset() { this.state = freshSave(); this.offlineAward = 0; this.storage.clear(); this.save(); }
}
export function format(n: number) { return n >= 1e6 ? (n / 1e6).toFixed(2) + 'm' : n >= 1e4 ? (n / 1000).toFixed(1) + 'k' : Math.floor(n).toLocaleString('en-US'); }
