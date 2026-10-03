import type { SiteId } from './economy';
import { VOICE } from './voice';

/** OCCUPATION, AS THE STREET FEELS IT.
 *
 * Nothing here is a meter the player fills. A district's occupation is a summary of what has
 * physically been done at the sites that govern it; the band it falls in decides who is in the
 * street, how they carry themselves, what the Ordinance enforces and what trade is worth.
 * Pure rules, no rendering: the world and the interface both read from here. */

// ---------------------------------------------------------------- districts
export type DistrictId = 'market' | 'row' | 'foundry' | 'gauge' | 'canal' | 'weatherside' | 'lowworks';
/** `sites` are the resistance sites whose state the district answers to. `area` is x0, x1, z0, z1 on the plan. */
export const DISTRICTS: { id: DistrictId; name: string; sites: SiteId[]; area?: [number, number, number, number] }[] = [
  { id: 'weatherside', name: 'The Weatherside', sites: ['market', 'foundry'], area: [-200, -42, -200, 200] },
  { id: 'canal', name: 'Canal Ward', sites: ['row'], area: [48, 200, -200, 200] },
  { id: 'market', name: 'Market Square', sites: ['market'], area: [-24, 24, -60, -10] },
  { id: 'row', name: 'Cinder Row', sites: ['row'], area: [6, 30, -10, 6] },
  { id: 'foundry', name: 'Cinder No. 3', sites: ['foundry'], area: [14, 40, 6, 22] },
  { id: 'gauge', name: 'The Ration Line', sites: ['gauge'], area: [14, 40, 22, 46] },
  { id: 'lowworks', name: 'The Lowworks', sites: ['market', 'foundry', 'row', 'gauge'] },
];
export function districtAt(x: number, z: number): DistrictId {
  for (const d of DISTRICTS) if (d.area && x >= d.area[0] && x < d.area[1] && z >= d.area[2] && z < d.area[3]) return d.id;
  return 'lowworks';
}
export const district = (id: DistrictId) => DISTRICTS.find(d => d.id === id)!;

/** How hard the Ordinance holds each site before anyone has done anything. */
export const GRIP: Record<SiteId, number> = { market: 76, row: 70, foundry: 88, gauge: 84 };
/** What is left of that grip at each rung of a site's ladder: occupied, three covert steps, liberated, restored. */
const HOLD = [1, .9, .75, .5, .18, 0];
/** A site the Ordinance still holds tightens once another has fallen, and again while it is answering an incident. */
export const CONTESTED = 8, CRACKDOWN = 12;
export function siteOccupation(sites: Record<SiteId, number>, id: SiteId) {
  const control = sites[id], base = GRIP[id] * HOLD[Math.min(5, Math.max(0, control))];
  const fallenElsewhere = (Object.keys(GRIP) as SiteId[]).some(s => s !== id && sites[s] >= 4);
  return Math.round(base + (control >= 2 && control < 4 && fallenElsewhere ? CONTESTED : 0));
}
/** Occupation of a district, 0 to 100. `crackdown` is the district the Ordinance is currently leaning on, if any. */
export function occupation(sites: Record<SiteId, number>, id: DistrictId, crackdown?: DistrictId | null) {
  const d = district(id), mean = d.sites.reduce((n, s) => n + siteOccupation(sites, s), 0) / d.sites.length;
  return Math.min(100, Math.round(mean + (crackdown === id && mean > 20 ? CRACKDOWN : 0)));
}

// ---------------------------------------------------------------- bands
export type Band = 'liberated' | 'low' | 'controlled' | 'heavy' | 'lockdown';
export type Enforcement = 'none' | 'lax' | 'normal' | 'strict';
/** The whole of what a band does. Densities are fractions of the people a street can hold. */
export interface Effects { name: string; upTo: number; civilians: number; personnel: number; merchants: number; income: number; risk: number; curfew: Enforcement; checkpoints: boolean; notes: [string, string, string] }
export const BANDS: Record<Band, Effects> = {
  liberated:  { name: 'Civic control',   upTo: 20,  civilians: 1,   personnel: 0,   merchants: 1,   income: 1.1,  risk: 0,   curfew: 'none',   checkpoints: false, notes: ['No patrols', 'No curfew', 'Trade open late'] },
  low:        { name: 'Low occupation',  upTo: 40,  civilians: .85, personnel: .25, merchants: .9,  income: 1.06, risk: .6,  curfew: 'lax',    checkpoints: false, notes: ['Few patrols', 'Curfew loosely kept', 'Commerce recovering'] },
  controlled: { name: 'Controlled',      upTo: 60,  civilians: .65, personnel: .5,  merchants: .75, income: 1.03, risk: .85, curfew: 'normal', checkpoints: true,  notes: ['Regular patrols', 'Curfew enforced', 'Checkpoints manned'] },
  heavy:      { name: 'Heavy occupation', upTo: 80, civilians: .38, personnel: .75, merchants: .42, income: 1,    risk: 1,   curfew: 'strict', checkpoints: true,  notes: ['More patrols', 'Curfew enforced', 'Commerce suppressed'] },
  lockdown:   { name: 'Lockdown',        upTo: 100, civilians: .22, personnel: 1,   merchants: .28, income: .95,  risk: 1.3, curfew: 'strict', checkpoints: true,  notes: ['Patrols everywhere', 'Strict curfew', 'Streets emptied'] },
};
export function bandOf(percent: number): Band { for (const [id, b] of Object.entries(BANDS) as [Band, Effects][]) if (percent <= b.upTo) return id; return 'lockdown'; }

// ---------------------------------------------------------------- the clock
/** One source of time: `day` is 0 to 1 from midnight. Light, curfew, people and the HUD all derive from it. */
export function clock(day: number) { const minutes = Math.floor(((day % 1 + 1) % 1) * 1440 + 1e-6) % 1440, hour = Math.floor(minutes / 60), minute = minutes % 60; return { hour, minute, text: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }; }
export const CURFEW = { from: 22, to: 5 };
export const dayAt = (hour: number, minute = 0) => (hour * 60 + minute) / 1440;
/** Is it the curfew hour (whether or not anyone here enforces it)? */
export function curfewHour(day: number) { const h = clock(day).hour; return h >= CURFEW.from || h < CURFEW.to; }
/** How the curfew is being kept in a district right now. A liberated district has none at any hour. */
export function curfewIn(day: number, band: Band): Enforcement { return curfewHour(day) ? BANDS[band].curfew : 'none'; }
/** The line under the clock: nothing most of the day, a notice in the last hour, then the word itself. */
export function curfewNotice(day: number, band: Band) {
  if (BANDS[band].curfew === 'none') return '';
  if (curfewHour(day)) return 'CURFEW';
  return clock(day).hour === CURFEW.from - 1 ? `CURFEW AT ${CURFEW.from}:00` : '';
}

// ---------------------------------------------------------------- who is in the street
export type Standing = 'civilian' | 'merchant' | 'occupier';
export const isOccupier = (archetype: string) => archetype === 'guard' || archetype === 'ordinal';
export const standingOf = (archetype: string): Standing => isOccupier(archetype) ? 'occupier' : archetype === 'merchant' ? 'merchant' : 'civilian';
/** Fractions of each kind present. Curfew empties the street of civilians and puts more of the Ordinance on it. */
export function population(band: Band, enforcement: Enforcement = 'none', crackdown = false) {
  const b = BANDS[band], thin = crackdown ? .75 : 1, night = enforcement === 'strict' ? .1 : enforcement === 'normal' ? .16 : enforcement === 'lax' ? .5 : 1;
  // A crackdown thins the street further and brings out posts that are otherwise never manned (ranks above 1).
  return { civilian: b.civilians * night * thin, merchant: (enforcement === 'none' ? b.merchants : enforcement === 'lax' ? b.merchants * .4 : 0) * thin, occupier: b.personnel === 0 ? 0 : Math.min(1, b.personnel + (enforcement === 'none' ? 0 : enforcement === 'lax' ? .1 : .25)) + (crackdown ? .3 : 0) };
}
/** Whether one person (a stable `seed` in 0..1) is out. The same seed always leaves in the same order, so a street thins, it does not reshuffle. */
export function admits(standing: Standing, seed: number, band: Band, enforcement: Enforcement = 'none', crackdown = false) { return seed < population(band, enforcement, crackdown)[standing]; }
/** How much a staged person matters to play. ESSENTIAL people (a contact, a story actor, anyone the Ordinance posts) stay
 * whatever the street is like; CONDITIONAL ones are authored scenes (a conversation, a stall's customers, a work gang) and
 * AMBIENT ones are population. Both of those obey the district: occupation thins them, curfew sends them indoors. */
export type Importance = 'essential' | 'conditional' | 'ambient';
export function present(importance: Importance, standing: Standing, seed: number, band: Band, enforcement: Enforcement = 'none', crackdown = false) { return importance === 'essential' || admits(standing, seed, band, enforcement, crackdown); }
/** A stable 0..1 number for a person, from their index. */
export const seedOf = (index: number) => { const v = Math.sin(index * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };

// ---------------------------------------------------------------- how people carry themselves
export type Trait = 'sociable' | 'reserved' | 'hurried' | 'tired' | 'nervous' | 'curious' | 'proud' | 'rigid' | 'bored' | 'watchful' | 'weary';
export type Stance = 'attention' | 'behind' | 'crossed' | 'scan' | 'ease';
/** One person's manner: cheap numbers the shared animation reads. Two people rarely get the same set. */
export interface Manner { trait: Trait; pace: number; gesture: number; glance: number; acknowledges: boolean; posture: number; fidget: number; space: number; stance: Stance }
const CIVIL: Record<string, Omit<Manner, 'stance' | 'trait'>> = {
  sociable: { pace: 1,    gesture: 1.35, glance: 8,  acknowledges: true,  posture: 0,    fidget: .3, space: .9 },
  reserved: { pace: .95,  gesture: .55,  glance: 15, acknowledges: false, posture: .03,  fidget: .2, space: 1.3 },
  hurried:  { pace: 1.18, gesture: .7,   glance: 17, acknowledges: false, posture: .05,  fidget: .5, space: 1.1 },
  tired:    { pace: .86,  gesture: .6,   glance: 14, acknowledges: false, posture: .08,  fidget: .1, space: 1 },
  nervous:  { pace: 1.08, gesture: .8,   glance: 5,  acknowledges: false, posture: .04,  fidget: 1,  space: 1.4 },
  curious:  { pace: .97,  gesture: 1,    glance: 6,  acknowledges: true,  posture: -.01, fidget: .4, space: .95 },
  proud:    { pace: 1.02, gesture: .9,   glance: 12, acknowledges: true,  posture: -.05, fidget: .15, space: 1.15 },
};
const ORDINANCE: Record<string, Omit<Manner, 'trait'>> = {
  rigid:    { pace: 1,   gesture: .3,  glance: 9,  acknowledges: false, posture: -.05, fidget: 0,   space: 1.2, stance: 'attention' },
  watchful: { pace: .96, gesture: .35, glance: 4,  acknowledges: false, posture: -.03, fidget: .1,  space: 1.2, stance: 'scan' },
  bored:    { pace: .9,  gesture: .4,  glance: 13, acknowledges: false, posture: .03,  fidget: .35, space: 1.1, stance: 'crossed' },
  weary:    { pace: .88, gesture: .3,  glance: 16, acknowledges: false, posture: .05,  fidget: .2,  space: 1.1, stance: 'behind' },
};
const CIVIL_TRAITS = Object.keys(CIVIL) as Trait[], ORDINANCE_TRAITS = Object.keys(ORDINANCE) as Trait[];
/** Merchants lean animated, workers direct; the Ordinance draws only from its own four. `as` casts a civilian in a given trait (an authored scene that needs one). */
export function mannerOf(archetype: string, seed: number, as?: Trait): Manner {
  if (isOccupier(archetype)) { const trait = ORDINANCE_TRAITS[Math.floor(seed * ORDINANCE_TRAITS.length) % ORDINANCE_TRAITS.length]; return { trait, ...ORDINANCE[trait] }; }
  const trait = as && CIVIL[as] ? as : CIVIL_TRAITS[Math.floor(seed * CIVIL_TRAITS.length) % CIVIL_TRAITS.length], m = { trait, ...CIVIL[trait], stance: 'ease' as Stance };
  if (archetype === 'merchant') m.gesture *= 1.25; if (archetype === 'worker' || archetype === 'engineer') { m.gesture *= .85; m.space *= .9; } if (archetype === 'courier') m.pace *= 1.08;
  return m;
}
/** What a body is allowed to do, given who it is and where it stands. `pressure` is the district's occupation
 * as 0..1 (curfew counts as full); `watched` means an occupier is within earshot. */
export interface Conduct { wave: boolean; smile: boolean; startle: boolean; gesture: number; talks: boolean; lingers: boolean }
export function conduct(archetype: string, manner: Manner, pressure: number, watched: boolean): Conduct {
  if (isOccupier(archetype)) return { wave: false, smile: false, startle: false, gesture: manner.gesture, talks: true, lingers: true };
  const free = pressure < .2, open = pressure < .6 && !watched;
  return { wave: manner.acknowledges && open, smile: open || (free && !watched), startle: !watched, gesture: manner.gesture * (watched ? .35 : 1 - pressure * .5), talks: !watched || free, lingers: pressure < .8 || manner.trait === 'proud' };
}

// ---------------------------------------------------------------- tone: what is said and how the body says it
export type Tone = 'friendly' | 'neutral' | 'authoritative' | 'suspicious' | 'hostile' | 'fearful' | 'secretive';
export type Bearing = 'open' | 'plain' | 'point' | 'watch' | 'square' | 'withdraw' | 'close';
export type Face = Mood | 'happy' | 'annoyed' | 'surprised';
const TONES: Record<Tone, { face: Face; bearing: Bearing }> = {
  friendly: { face: 'happy', bearing: 'open' }, neutral: { face: 'neutral', bearing: 'plain' }, authoritative: { face: 'focused', bearing: 'point' },
  suspicious: { face: 'focused', bearing: 'watch' }, hostile: { face: 'annoyed', bearing: 'square' }, fearful: { face: 'surprised', bearing: 'withdraw' }, secretive: { face: 'neutral', bearing: 'close' },
};
/** The body that goes with a line. The Ordinance has no friendly register: asked for one, it is merely civil. */
export function bodyFor(archetype: string, tone: Tone) { return TONES[isOccupier(archetype) && (tone === 'friendly' || tone === 'fearful' || tone === 'secretive') ? 'neutral' : tone]; }
/** Faces the Ordinance never wears: nothing warm, nothing afraid, nothing curious. */
const NOT_ORDINANCE = new Set<string>(['happy', 'surprised', 'smiling', 'hopeful', 'relaxed', 'curious', 'worried', 'startled', 'guarded']);
/** Faces a kind of person may ever wear in the street. */
export function faceAllowed(archetype: string, face: Face | string) { return !isOccupier(archetype) || !NOT_ORDINANCE.has(face); }

// ---------------------------------------------------------------- mood: the face that goes with who someone is and what is around them
/** One face per feeling. Civilians draw on the first group, the Ordinance on the second (weary and bored are its minority). */
export type Mood = 'neutral' | 'relaxed' | 'smiling' | 'hopeful' | 'curious' | 'worried' | 'guarded' | 'tired' | 'irritated' | 'suspicious' | 'startled' | 'stern' | 'angry' | 'focused'
  | 'cold' | 'scrutiny' | 'sideeye' | 'impatient' | 'contempt' | 'challenge' | 'scan' | 'barking' | 'bored' | 'weary';
/** What the face does for a line of speech. The Ordinance has no friendly, afraid or secretive register. */
export function moodOfTone(archetype: string, tone: Tone): Mood {
  if (isOccupier(archetype)) return tone === 'authoritative' ? 'challenge' : tone === 'suspicious' ? 'scrutiny' : tone === 'hostile' ? 'barking' : 'cold';
  return ({ friendly: 'smiling', neutral: 'neutral', authoritative: 'stern', suspicious: 'suspicious', hostile: 'angry', fearful: 'startled', secretive: 'guarded' } as Record<Tone, Mood>)[tone];
}
type Odds = readonly (readonly [Mood, number])[];
const ODDS: Record<string, readonly [Odds, Odds, Odds]> = {
  // [far, within 9 m, within 4 m]: the Ordinance's face hardens as the Steward comes near.
  rigid: [[['cold', .7], ['scrutiny', .3]], [['cold', .5], ['scrutiny', .5]], [['scrutiny', .6], ['challenge', .4]]],
  watchful: [[['scan', .55], ['sideeye', .25], ['cold', .2]], [['scan', .35], ['sideeye', .35], ['scrutiny', .3]], [['scrutiny', .5], ['challenge', .25], ['sideeye', .25]]],
  bored: [[['bored', .35], ['impatient', .3], ['contempt', .15], ['cold', .2]], [['impatient', .4], ['contempt', .3], ['sideeye', .3]], [['contempt', .4], ['scrutiny', .3], ['impatient', .3]]],
  weary: [[['weary', .4], ['cold', .35], ['bored', .25]], [['cold', .5], ['scrutiny', .3], ['weary', .2]], [['scrutiny', .5], ['cold', .3], ['impatient', .2]]],
};
const roll = (odds: Odds, pick: number): Mood => { let a = 0; for (const [m, w] of odds) { a += w; if (pick < a) return m; } return odds[odds.length - 1][0]; };
export interface MoodIn { archetype: string; trait: Trait; /** 0..1, stable for one hold */ pick: number; pressure: number; watched: boolean; startled: boolean; worried: boolean; activity: string; weariness: number; /** 0 far, 1 within 9 m, 2 within 4 m of the Steward */ near: 0 | 1 | 2; tone?: Tone }
const WORK = new Set(['hammer', 'repair', 'valve', 'read', 'gauge', 'clipboard']);
/** The mood for one moment. A line of speech overrides everything; a fright overrides the street; a hard street is guarded or worried;
 * a free one is warm. The Ordinance draws only from its own vocabulary. Pure: `pick` is the only dice. */
export function moodFor(i: MoodIn): Mood {
  if (i.tone) return moodOfTone(i.archetype, i.tone);
  if (isOccupier(i.archetype)) return i.activity === 'argue' ? 'barking' : roll((ODDS[i.trait] ?? ODDS.rigid)[i.near], i.pick);
  if (i.startled) return 'startled'; if (i.worried) return 'worried';
  const t = i.trait, p = i.pressure, w = i.weariness;
  if (i.watched || p >= .6) return t === 'nervous' ? (i.pick < .6 ? 'worried' : 'guarded') : t === 'proud' ? 'stern' : p >= .6 && i.pick < .3 ? 'worried' : 'guarded';
  if (p >= .2) return t === 'nervous' ? 'worried' : t === 'tired' ? 'tired' : t === 'curious' && i.pick < .5 ? 'curious' : i.pick < .5 ? 'guarded' : 'neutral';
  if (i.activity === 'argue') return 'irritated'; if (WORK.has(i.activity)) return 'focused'; if (i.activity === 'watch') return 'curious';
  if (w > .3 && (i.activity === 'carry' || i.activity === 'sweep' || i.activity === 'warm')) return 'tired';
  if (w > .5 && i.pick < w * .35) return 'tired';
  if (w < .2 && i.pick > .6 && t !== 'hurried' && t !== 'nervous') return 'hopeful';
  return t === 'sociable' ? (i.pick < .7 ? 'smiling' : 'relaxed') : t === 'curious' ? 'curious' : t === 'tired' ? (w > .3 ? 'tired' : 'relaxed') : t === 'hurried' || t === 'nervous' ? 'neutral' : 'relaxed';
}
/** One person's mood over time: they hold a face for seconds, and change it only when it runs out or the street around them changes. */
export interface MoodState { mood: Mood; until: number; min: number; key: number; n: number; reactAt: number; last: number; peak: number; near: 0 | 1 | 2 }
export const newMood = (): MoodState => ({ mood: 'neutral', until: 0, min: 0, key: -1, n: 0, reactAt: -1e9, last: -1e9, peak: 0, near: 0 });
/** Which band of the Steward's distance (m) someone is in, with a margin so hovering at an edge does not flicker: in at 4 and 9, out at 5 and 10.5. */
export const nearBand = (prev: 0 | 1 | 2, d: number): 0 | 1 | 2 => prev === 2 ? (d < 5 ? 2 : d < 10.5 ? 1 : 0) : prev === 1 ? (d < 4 ? 2 : d < 10.5 ? 1 : 0) : (d < 4 ? 2 : d < 9 ? 1 : 0);
/** The 2 Hz step. `react` is 0 none, 1 stepping aside / pausing / crossing, 2 a fresh incident: startled for a moment, worried for a while after.
 * The state changes only on a threshold crossing (pressure .2/.6, watched, near, a fright, a line of speech), never by cycling. */
export function stepMood(s: MoodState, i: Omit<MoodIn, 'startled' | 'worried'> & { react: number }, time: number): Mood {
  if (i.react > 0) { if (time - s.last > 4) { s.reactAt = time; s.peak = i.react; } else s.peak = Math.max(s.peak, i.react); s.last = time; }
  const startled = time - s.reactAt < (s.peak > 1 ? 2.5 : .9), worried = !startled && time - s.last < 6;
  const key = (startled ? 1 : 0) | (worried ? 2 : 0) | (i.tone ? 4 : 0) | (i.pressure < .2 ? 0 : i.pressure < .6 ? 8 : 16) | (i.watched ? 32 : 0) | i.near << 6;
  const changed = key !== s.key; s.key = key;
  if (time >= s.until || (changed && (startled || i.tone || time >= s.min))) {
    s.n++; s.mood = moodFor({ ...i, startled, worried, pick: (i.pick + s.n * .618) % 1 });
    s.until = time + (startled ? (s.peak > 1 ? 2.5 : .9) : 2.5 + i.pick * 3.5); s.min = time + (startled ? 0 : 2.5);
  }
  return s.mood;
}

// ---------------------------------------------------------------- heat: being caught, and being caught again
export type Incident = 'minor' | 'contraband' | 'curfew';
export interface Outcome { tier: number; name: string; fine: number; crackdown: boolean; quiet: boolean; detained: boolean; heat: number; message: string }
/** Seconds of quiet play for one rung of heat to cool; how long a crackdown and the Embers' silence last. */
export const HEAT = { max: 5, cool: 240, crackdown: 300, quiet: 200, sleep: 1.5, liberation: 1 };
/** What the Ordinance does this time, from how often it has had to already. Fines scale with the treasury but
 * are capped by a few minutes of income, so a rich Steward is stung and a poor one is not ruined. */
export function caught(heat: number, kind: Incident, crowns: number, rate: number): Outcome {
  // A quarter-rung of cooling does not make the last offence the first again.
  const prior = Math.floor(Math.max(0, heat) + .25) + (kind === 'contraband' ? 1 : 0) + (kind === 'curfew' ? 1 : 0), tier = Math.min(4, prior);
  const share = [0, .04, .08, .1, .14][tier], cap = Math.max(20, rate * [0, 90, 150, 200, 300][tier]), fine = tier === 0 ? 0 : Math.floor(Math.min(crowns * share, cap));
  const name = ['Warning', 'Fine', 'Fine and a crackdown', 'The Embers go quiet', 'Detention'][tier];
  const message = [
    kind === 'curfew' ? VOICE.curfewWarn : '“Papers. Your business is trade, not loitering. Move along.”',
    kind === 'curfew' && heat < .75 ? VOICE.curfewFine(fine) : VOICE.again(fine),
    `${fine} Crowns, and the ward pays for it too: more men on this street until the Ordinance is satisfied.`,
    `${fine} Crowns. Word goes round faster than the patrol: the Embers will not open a door to you for a while.`,
    `Detained until morning. ${fine} Crowns for the night’s lodging, and you are walked home.`,
  ][tier];
  return { tier, name, fine, crackdown: tier >= 2, quiet: tier >= 3, detained: tier >= 4, heat: Math.min(HEAT.max, Math.max(heat, 0) + (kind === 'minor' ? 1 : 1.5)), message };
}
/** Heat fades with time on the right side of the rules. */
export const cooled = (heat: number, seconds: number) => Math.max(0, heat - seconds / HEAT.cool);
export const heatName = (heat: number) => heat < .5 ? '' : heat < 1.5 ? 'Noticed' : heat < 2.5 ? 'Known to the patrols' : heat < 3.5 ? 'Watched' : 'Marked';

// ---------------------------------------------------------------- the Ordinance uses the street, and people give it room
/** How far off someone starts to make room for a walking patrol, in metres. The nervous move early, the proud barely at all. */
export function berth(manner: Manner) { return manner.trait === 'nervous' ? 4.6 : manner.trait === 'proud' ? 2 : manner.trait === 'reserved' ? 2.6 : manner.trait === 'hurried' ? 3 : 3.4; }
/** How far a civilian steps aside (metres) for an occupier `distance` away: nothing outside their berth, most when it is on top of them.
 * `standing` posts (an inspector, a checkpoint) are given a smaller, steadier margin. The Ordinance steps aside for nobody. */
export function makeRoom(archetype: string, manner: Manner, distance: number, standing = false) {
  if (isOccupier(archetype)) return 0; const r = berth(manner) * (standing ? .6 : 1); if (distance >= r) return 0;
  const k = 1 - distance / r; return Math.min(1, k * 1.6) * (manner.trait === 'proud' ? .45 : manner.trait === 'nervous' ? 1.1 : .8) * (standing ? .6 : 1);
}
/** What each post is for. Only `patrol`, `checkpoint` and `sentry` posts can be asked to act; the rest are staging. */
export type PostRole = 'sentry' | 'patrol' | 'inspector' | 'checkpoint' | 'observation' | 'pair';
export const canAct = (role: PostRole) => role === 'patrol' || role === 'checkpoint' || role === 'sentry' || role === 'inspector';
/** At most this many of the Ordinance are asked each tick whether they can see the Steward, however many are standing in the street. */
export const AUTHORITY_BUDGET = 3;

// ---------------------------------------------------------------- checkpoints
/** A checkpoint is the district's band made into a barrier on an obvious route. */
export type Gate = 'gone' | 'open' | 'light' | 'manned' | 'sealed';
export function gateState(band: Band, enforcement: Enforcement = 'none'): Gate {
  if (band === 'liberated') return 'gone'; if (band === 'low') return 'open';
  if (enforcement === 'strict' || enforcement === 'normal') return 'sealed';
  return band === 'controlled' ? 'light' : 'manned';
}
/** How many of its two men stand at it. */
export const gateCrew = (gate: Gate) => gate === 'manned' || gate === 'sealed' ? 2 : gate === 'light' ? 1 : 0;
/** What walking up to it costs. Unknown to the patrols, the Steward is waved through; once noticed, papers are an incident. Carrying contraband
 * reads as that much more heat, whatever the Steward's record.
 * A lighter checkpoint lets more pass; a crackdown stops everyone it knows at all. */
export type Scrutiny = 'none' | 'wave' | 'challenge' | 'refuse';
export const CONTRABAND_HEAT = 2;
export function scrutiny(gate: Gate, heat: number, crackdown = false, carrying = false): Scrutiny {
  if (gate === 'gone' || gate === 'open') return 'none'; if (gate === 'sealed') return 'refuse';
  const limit = crackdown ? .25 : gate === 'light' ? 1.75 : .75; return heat + (carrying ? CONTRABAND_HEAT : 0) >= limit ? 'challenge' : 'wave';
}
// ---------------------------------------------------------------- borders
/** How a district dresses its own side of a border with the Great Main: the Ordinance's notices while it holds the ward (controlled
 * and harder), defaced and thinning once it is losing it, civic again when it is free. */
export type Dress = 'held' | 'low' | 'free';
export const dressOf = (band: Band): Dress => band === 'liberated' ? 'free' : band === 'low' ? 'low' : 'held';
/** The border's lamp is the stricter side's: the Ordinance lights a border it still holds on either side, and only two free wards share a warm one. */
export const borderLamp = (a: Dress, b: Dress): Dress => a === 'held' || b === 'held' ? 'held' : a === 'free' && b === 'free' ? 'free' : 'low';
/** A ward's name short enough for a phone. */
export const SHORT: Record<DistrictId, string> = { market: 'MARKET', row: 'CINDER ROW', foundry: 'CINDER 3', gauge: 'RATION LINE', canal: 'CANAL', weatherside: 'WEATHERSIDE', lowworks: 'LOWWORKS' };
export const bandWord = (band: Band) => ({ liberated: 'FREE', low: 'LOW', controlled: 'HELD', heavy: 'HEAVY', lockdown: 'LOCKDOWN' })[band];
/** The compact line for a small screen: ward, percentage and band in a dozen characters or so. */
export const wardLine = (id: DistrictId, percent: number, band: Band) => `${SHORT[id]} · ${percent}% ${bandWord(band)}`;
