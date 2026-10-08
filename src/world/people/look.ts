import { palette, type Archetype } from '../palette';

/** Pure data and resolution for who a person is (Terra Character Book sections 3, 6, 7, 9, 10, 11). No `three`, no DOM.
 *  Randomness chooses between authored, valid combinations; it never designs the person. The whitelists below are the contract the figure builder is written against. */
export type Family = 'slim' | 'standard' | 'sturdy';
/** `child` is its own authored family (Book 3); it has a cast and a row in the tables, and its body is built in a later task. */
export type LookFamily = Family | 'child';
export type Frame = 'broad' | 'narrow';
export type HeadShape = 'oval' | 'square' | 'long' | 'heart';
export type HairStyle = 'shortCrop' | 'sidePart' | 'sweptBack' | 'tousled' | 'bob' | 'lowBun' | 'highKnot' | 'ponytail' | 'longTied' | 'balding';
export type Hat = 'none' | 'flatCap' | 'softCap' | 'bowler' | 'topHat' | 'kepi' | 'helm' | 'bonnet' | 'headscarf' | 'elderHat' | 'kerchief';
export type Facial = 'none' | 'moustache' | 'beard' | 'sideburns';
export type HairColour = keyof typeof palette.hair2;
export type Swatch = keyof typeof palette.cloth;
export type CastId = 'rowCoat' | 'rowSkirt' | 'elder' | 'affluent' | 'stallholder' | 'shopMerchant' | 'labourer' | 'foundry' | 'youngMechanic' | 'olderMechanic' | 'courier' | 'garrison' | 'inspector' | 'child';

export interface Look {
  cast: CastId; family: LookFamily; frame: Frame;
  /** a uniform group scale, 0.96..1.04 */ stature: number;
  /** index into palette.skin */ skin: 0 | 1 | 2;
  headShape: HeadShape;
  /** a row of the face atlas */ faceType: number;
  hairStyle: HairStyle; hairColour: HairColour; hat: Hat; facial: Facial;
  outfit: string; palette: string;
  asymmetries: string[];
}

export interface Outfit { id: string; /** palette id -> a swatch per slot of the cast */ palettes: Record<string, readonly Swatch[]> }
export interface Cast {
  id: CastId; archetype: Archetype; families: readonly LookFamily[]; frames: readonly Frame[]; headShapes: readonly HeadShape[]; hair: readonly HairStyle[]; hairColours: readonly HairColour[];
  hats: readonly Hat[]; /** facial hair with weights: a moustache or a beard belongs to a cast that wears one (Book 7), at a modest rate, never dealt to anyone at a third */ facial: readonly (readonly [Facial, number])[]; outfits: readonly Outfit[];
  /** what a palette's swatches colour, in order */ slots: readonly string[]; asymmetries: readonly string[]; /** items only a named person carries (Book 9, story characters): valid in a look, never dealt by the resolver */ story?: readonly string[]; elder?: boolean;
  /** the face rows this cast is drawn from, where it narrows the head shape's rows (the older mechanic's heavier brows) */ faceRows?: readonly number[];
}

/** Faces are rows of the atlas. Rows 2 (teal), 3 (violet) and 7 (red) carry irises the Book forbids; they stay out of every table until the atlas is repainted. */
export const FACE_ROWS: Record<HeadShape, readonly number[]> = { oval: [0, 1, 5], square: [4, 6, 0], long: [4, 5, 1], heart: [1, 5, 6] };
/** Which hair a hat leaves room for. A hat never sits on a full head of hair (Book 7). */
export const HAT_HAIR: Record<Hat, readonly HairStyle[]> = {
  none: ['shortCrop', 'sidePart', 'sweptBack', 'tousled', 'bob', 'lowBun', 'highKnot', 'ponytail', 'longTied', 'balding'],
  flatCap: ['shortCrop', 'sidePart', 'tousled', 'balding'], softCap: ['shortCrop', 'sidePart', 'tousled', 'lowBun', 'ponytail'],
  bowler: ['shortCrop', 'sidePart', 'balding'], topHat: ['sweptBack', 'sidePart', 'shortCrop'], kepi: ['shortCrop'], helm: ['shortCrop', 'sweptBack'],
  bonnet: ['lowBun', 'highKnot', 'bob'], headscarf: ['lowBun', 'bob', 'tousled'], elderHat: ['balding', 'shortCrop', 'lowBun', 'sidePart'], kerchief: ['shortCrop', 'tousled', 'balding'],
};
const young: readonly HairColour[] = ['soot', 'umber', 'chestnut', 'auburn', 'straw'], aged: readonly HairColour[] = ['iron', 'white'], mid: readonly HairColour[] = ['soot', 'umber', 'chestnut', 'iron'];
const allShapes: readonly HeadShape[] = ['oval', 'square', 'long', 'heart'];
const o = (id: string, palettes: Record<string, readonly Swatch[]>): Outfit => ({ id, palettes });

/** The fourteen casts. A cast fixes a family and frame range, face and hair compatibility, a wardrobe, a palette range and its asymmetries. */
export const CASTS: Record<CastId, Cast> = {
  rowCoat: { id: 'rowCoat', archetype: 'resident', families: ['slim', 'standard'], frames: ['broad', 'narrow'], headShapes: allShapes, hair: ['shortCrop', 'sidePart', 'tousled', 'bob', 'lowBun', 'ponytail'], hairColours: young, hats: ['none', 'flatCap', 'softCap'], facial: [['none', 5], ['sideburns', 1]],
    slots: ['coat', 'waistcoat', 'trousers', 'cap', 'scarf'], asymmetries: ['unevenFront', 'scarfTail', 'pouchHip', 'sleeveRolled'], story: ['chalk'],
    outfits: [o('rowCoat.open', { ash: ['slate', 'stone', 'navy', 'slate', 'oxblood'], umber: ['umber', 'mustard', 'slate', 'umber', 'greyGreen'], moss: ['greyGreen', 'canvas', 'umber', 'greyGreen', 'bone'] }),
      o('rowCoat.closed', { ash: ['charcoal', 'stone', 'navy', 'charcoal', 'mustard'], oxblood: ['oxblood', 'canvas', 'slate', 'umber', 'stone'], stone: ['stone', 'umber', 'navy', 'stone', 'oxblood'] })] },
  rowSkirt: { id: 'rowSkirt', archetype: 'resident', families: ['slim', 'standard'], frames: ['narrow'], headShapes: allShapes, hair: ['lowBun', 'bob', 'ponytail', 'highKnot', 'longTied'], hairColours: young, hats: ['none', 'headscarf'], facial: [['none', 1]],
    slots: ['shawl', 'bodice', 'skirt', 'scarf'], asymmetries: ['scarfTail', 'pouchHip', 'apronTie'],
    outfits: [o('rowSkirt.shawl', { ash: ['slate', 'bone', 'umber', 'greyGreen'], plum: ['oxblood', 'cream', 'charcoal', 'bone'] }), o('rowSkirt.plain', { moss: ['greyGreen', 'bone', 'umber', 'mustard'], umber: ['umber', 'cream', 'slate', 'oxblood'] })] },
  elder: { id: 'elder', archetype: 'resident', families: ['slim'], frames: ['broad', 'narrow'], headShapes: ['oval', 'long', 'square'], hair: ['balding', 'shortCrop', 'lowBun', 'sidePart'], hairColours: aged, hats: ['elderHat', 'softCap', 'none'], facial: [['none', 4], ['moustache', 2], ['beard', 1]], elder: true,
    slots: ['coat', 'waistcoat', 'trousers', 'hat'], asymmetries: ['stick', 'basket', 'scarfTail'],
    outfits: [o('elder.longCoat', { ash: ['charcoal', 'stone', 'stone', 'charcoal'], umber: ['umber', 'bone', 'slate', 'umber'] })] },
  affluent: { id: 'affluent', archetype: 'resident', families: ['slim', 'standard'], frames: ['broad', 'narrow'], headShapes: ['oval', 'long', 'heart'], hair: ['sweptBack', 'sidePart', 'lowBun', 'highKnot'], hairColours: young, hats: ['topHat', 'bonnet'], facial: [['none', 1]],
    slots: ['frock', 'waistcoat', 'trousers', 'hat', 'trim'], asymmetries: ['watchChain', 'unevenFront'],
    outfits: [o('affluent.frock', { oxblood: ['burgundy', 'cream', 'slate', 'soot', 'mustard'], navy: ['navy', 'bone', 'stone', 'soot', 'ochre'] })] },
  stallholder: { id: 'stallholder', archetype: 'merchant', families: ['standard', 'sturdy'], frames: ['broad', 'narrow'], headShapes: allShapes, hair: ['lowBun', 'bob', 'tousled'], hairColours: young, hats: ['headscarf', 'none'], facial: [['none', 1]],
    slots: ['blouse', 'skirt', 'apron', 'scarf'], asymmetries: ['apronTie', 'pouchHip', 'scarfTail'],
    outfits: [o('stallholder.apron', { ochre: ['cream', 'ochre', 'canvas', 'burgundy'], wine: ['bone', 'burgundy', 'stone', 'mustard'] })] },
  shopMerchant: { id: 'shopMerchant', archetype: 'merchant', families: ['standard', 'sturdy'], frames: ['broad', 'narrow'], headShapes: allShapes, hair: ['sidePart', 'shortCrop', 'balding'], hairColours: mid, hats: ['bowler', 'none'], facial: [['none', 4], ['sideburns', 1]],
    slots: ['waistcoat', 'shirt', 'trousers', 'apron', 'hat'], asymmetries: ['watchChain', 'pencilEar', 'sleeveGarters'],
    outfits: [o('shopMerchant.waistcoat', { wine: ['burgundy', 'cream', 'charcoal', 'greyGreen', 'soot'], ochre: ['mustard', 'bone', 'navy', 'slate', 'charcoal'] })] },
  labourer: { id: 'labourer', archetype: 'worker', families: ['sturdy', 'standard'], frames: ['broad'], headShapes: allShapes, hair: ['shortCrop', 'tousled', 'sidePart'], hairColours: young, hats: ['flatCap', 'none', 'softCap'], facial: [['none', 4], ['sideburns', 1]],
    slots: ['shirt', 'trousers', 'braces', 'cap', 'kerchief'], asymmetries: ['pouchHip', 'ragBelt', 'braceDown'], story: ['leatherApron', 'hook'],
    outfits: [o('labourer.braced', { dust: ['canvas', 'umber', 'leatherDark', 'slate', 'rust'], soot: ['stone', 'charcoal', 'leatherDark', 'soot', 'oxblood'], moss: ['greyGreen', 'stone', 'leather', 'umber', 'mustard'] }),
      o('labourer.vested', { umber: ['bone', 'rust', 'oxblood', 'umber', 'greyGreen'], grey: ['canvas', 'slate', 'charcoal', 'stone', 'rust'] })] },
  foundry: { id: 'foundry', archetype: 'worker', families: ['sturdy'], frames: ['broad', 'narrow'], headShapes: ['square', 'oval', 'long'], hair: ['shortCrop', 'tousled', 'balding'], hairColours: young, hats: ['kerchief', 'none'], facial: [['none', 4], ['sideburns', 1]],
    slots: ['shirt', 'trousers', 'apron', 'kerchief'], asymmetries: ['gogglesUp', 'pouchHip'],
    outfits: [o('foundry.apron', { soot: ['charcoal', 'rust', 'leather', 'rust'], umber: ['umber', 'greyGreen', 'leatherDark', 'oxblood'] })] },
  youngMechanic: { id: 'youngMechanic', archetype: 'engineer', families: ['slim', 'standard'], frames: ['broad', 'narrow'], headShapes: allShapes, hair: ['tousled', 'sweptBack', 'shortCrop', 'ponytail'], hairColours: young, hats: ['softCap', 'none'], facial: [['none', 4], ['sideburns', 1]],
    slots: ['jacket', 'shirt', 'trousers', 'roll', 'cap'], asymmetries: ['toolRoll', 'gogglesUp', 'ragBelt'], story: ['valveSleeve'],
    outfits: [o('youngMechanic.jacket', { slate: ['slate', 'bone', 'canvas', 'leather', 'slate'], moss: ['greyGreen', 'cream', 'umber', 'leatherDark', 'greyGreen'] })] },
  olderMechanic: { id: 'olderMechanic', archetype: 'engineer', families: ['standard', 'sturdy'], frames: ['broad', 'narrow'], headShapes: allShapes, hair: ['balding', 'shortCrop', 'sidePart'], hairColours: ['iron'], hats: ['flatCap', 'none'], facial: [['moustache', 5], ['beard', 1], ['none', 1]], faceRows: [2, 4, 6],
    slots: ['shopCoat', 'shirt', 'trousers', 'cap'], asymmetries: ['spectacles', 'pencilEar', 'ragBelt'],
    outfits: [o('olderMechanic.shopCoat', { canvas: ['canvas', 'bone', 'greenCharcoal', 'umber'], slate: ['slate', 'cream', 'navy', 'slate'] })] },
  courier: { id: 'courier', archetype: 'courier', families: ['slim'], frames: ['broad', 'narrow'], headShapes: allShapes, hair: ['shortCrop', 'tousled', 'ponytail', 'bob'], hairColours: young, hats: ['softCap'], facial: [['none', 1]],
    slots: ['jacket', 'shirt', 'trousers', 'satchel', 'scarf', 'cap'], asymmetries: ['satchelStrap', 'scarfTail'], story: ['threadStrap', 'noSatchel', 'scarfUp'],
    outfits: [o('courier.jacket', { oxblood: ['oxblood', 'bone', 'greyGreen', 'leather', 'mustard', 'umber'], slate: ['slate', 'cream', 'umber', 'leather', 'oxblood', 'slate'] })] },
  garrison: { id: 'garrison', archetype: 'guard', families: ['standard', 'sturdy'], frames: ['broad'], headShapes: ['square', 'oval', 'long'], hair: ['shortCrop'], hairColours: mid, hats: ['kepi'], facial: [['none', 4], ['moustache', 1], ['sideburns', 1]],
    slots: ['greatcoat', 'trousers', 'crossbelt', 'kepi'], asymmetries: ['crossbelt'],
    outfits: [o('garrison.greatcoat', { ordinance: ['greenCharcoal', 'soot', 'leatherDark', 'greenCharcoal'] })] },
  inspector: { id: 'inspector', archetype: 'ordinal', families: ['slim', 'standard'], frames: ['broad'], headShapes: ['square', 'long', 'oval'], hair: ['shortCrop', 'sweptBack', 'sidePart'], hairColours: mid, hats: ['helm', 'none'], facial: [['none', 5], ['moustache', 1]],
    slots: ['coat', 'trousers', 'collar', 'helm', 'armband'], asymmetries: ['ledger', 'whistle'], story: ['spectacles', 'sleeveGuards', 'keyRing', 'truncheon'],
    outfits: [o('inspector.coat', { ordinance: ['greenCharcoal', 'soot', 'oxblood', 'soot', 'oxblood'] })] },
  child: { id: 'child', archetype: 'resident', families: ['child'], frames: ['narrow'], headShapes: ['oval', 'heart'], hair: ['tousled', 'bob', 'shortCrop'], hairColours: young, hats: ['softCap', 'none'], facial: [['none', 1]],
    slots: ['coat', 'shirt', 'trousers', 'cap'], asymmetries: ['scarfTail'],
    outfits: [o('child.coat', { ash: ['slate', 'bone', 'leather', 'slate'], rust: ['rust', 'cream', 'greenCharcoal', 'rust'] })] },
};

/** Which casts an archetype may be, with the weights the street uses when nothing else (place, scene) decides. */
export const ARCHETYPE_CASTS: Record<Archetype, readonly (readonly [CastId, number])[]> = {
  resident: [['rowCoat', 4], ['rowSkirt', 4], ['elder', 2], ['affluent', 1]], merchant: [['stallholder', 1], ['shopMerchant', 1]], worker: [['labourer', 3], ['foundry', 2]],
  engineer: [['youngMechanic', 1], ['olderMechanic', 1]], courier: [['courier', 1]], guard: [['garrison', 1]], ordinal: [['inspector', 1]],
};

/** A real integer hash (a murmur finalizer over seed and stream): an independent stream per choice, never `seed % n`. */
export function hash(seed: number, stream: number): number {
  let x = Math.imul(seed | 0, 0x9E3779B1) ^ Math.imul((stream + 1) | 0, 0x85EBCA6B); x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  x = Math.imul(x ^ (seed >>> 7), 0xC2B2AE35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return x >>> 0;
}
const unit = (seed: number, stream: number) => hash(seed, stream) / 4294967296;
const pick = <T>(list: readonly T[], seed: number, stream: number): T => list[Math.floor(unit(seed, stream) * list.length)];
const weighted = <T>(list: readonly (readonly [T, number])[], seed: number, stream: number): T => { const total = list.reduce((a, [, w]) => a + w, 0); let r = unit(seed, stream) * total; for (const [v, w] of list) { r -= w; if (r < 0) return v; } return list[list.length - 1][0]; };
/** The stream numbers, one per step of Book 11. */
const S = { cast: 1, family: 2, frame: 3, stature: 4, skin: 5, shape: 6, face: 7, hat: 8, hair: 9, hairColour: 10, facial: 11, outfit: 12, palette: 13, asym: 14, asymCount: 15 } as const;

/** The fixed looks of named people (Book 9, "Story characters"): independent of spawn order. */
export const STORY: Record<string, Look> = {
  officer: { cast: 'inspector', family: 'standard', frame: 'broad', stature: 1.04, skin: 0, headShape: 'square', faceType: 4, hairStyle: 'sweptBack', hairColour: 'iron', hat: 'helm', facial: 'none', outfit: 'inspector.coat', palette: 'ordinance', asymmetries: ['ledger'] },
  clerk: { cast: 'inspector', family: 'slim', frame: 'broad', stature: 1, skin: 1, headShape: 'long', faceType: 5, hairStyle: 'sidePart', hairColour: 'umber', hat: 'none', facial: 'none', outfit: 'inspector.coat', palette: 'ordinance', asymmetries: ['spectacles', 'sleeveGuards'] },
  rookHand: { cast: 'labourer', family: 'sturdy', frame: 'broad', stature: 1.02, skin: 2, headShape: 'square', faceType: 6, hairStyle: 'shortCrop', hairColour: 'soot', hat: 'flatCap', facial: 'sideburns', outfit: 'labourer.vested', palette: 'grey', asymmetries: ['leatherApron', 'hook'] },
  finchHand: { cast: 'youngMechanic', family: 'slim', frame: 'narrow', stature: .98, skin: 1, headShape: 'heart', faceType: 1, hairStyle: 'tousled', hairColour: 'chestnut', hat: 'none', facial: 'none', outfit: 'youngMechanic.jacket', palette: 'moss', asymmetries: ['valveSleeve', 'ragBelt'] },
  embersChalker: { cast: 'rowCoat', family: 'standard', frame: 'narrow', stature: 1, skin: 0, headShape: 'oval', faceType: 0, hairStyle: 'bob', hairColour: 'umber', hat: 'none', facial: 'none', outfit: 'rowCoat.open', palette: 'ash', asymmetries: ['chalk', 'sleeveRolled'] },
  embersLookout: { cast: 'courier', family: 'slim', frame: 'narrow', stature: .97, skin: 2, headShape: 'long', faceType: 4, hairStyle: 'shortCrop', hairColour: 'soot', hat: 'softCap', facial: 'none', outfit: 'courier.jacket', palette: 'slate', asymmetries: ['noSatchel', 'scarfUp'] },
  embersCourier: { cast: 'courier', family: 'slim', frame: 'broad', stature: 1, skin: 1, headShape: 'oval', faceType: 1, hairStyle: 'ponytail', hairColour: 'auburn', hat: 'softCap', facial: 'none', outfit: 'courier.jacket', palette: 'oxblood', asymmetries: ['threadStrap', 'satchelStrap'] },
  masked: { cast: 'courier', family: 'slim', frame: 'broad', stature: 1.01, skin: 2, headShape: 'long', faceType: 5, hairStyle: 'tousled', hairColour: 'soot', hat: 'softCap', facial: 'none', outfit: 'courier.jacket', palette: 'slate', asymmetries: ['satchelStrap'] },
  introGuard: { cast: 'garrison', family: 'sturdy', frame: 'broad', stature: 1.03, skin: 1, headShape: 'square', faceType: 4, hairStyle: 'shortCrop', hairColour: 'soot', hat: 'kepi', facial: 'moustache', outfit: 'garrison.greatcoat', palette: 'ordinance', asymmetries: ['crossbelt'] },
  introOrdinal: { cast: 'inspector', family: 'slim', frame: 'broad', stature: 1, skin: 0, headShape: 'long', faceType: 5, hairStyle: 'sweptBack', hairColour: 'umber', hat: 'helm', facial: 'none', outfit: 'inspector.coat', palette: 'ordinance', asymmetries: ['whistle'] },
  overseer: { cast: 'inspector', family: 'standard', frame: 'broad', stature: 1.02, skin: 1, headShape: 'square', faceType: 6, hairStyle: 'shortCrop', hairColour: 'iron', hat: 'helm', facial: 'moustache', outfit: 'inspector.coat', palette: 'ordinance', asymmetries: ['keyRing'] },
  warden: { cast: 'inspector', family: 'slim', frame: 'broad', stature: .99, skin: 0, headShape: 'oval', faceType: 0, hairStyle: 'sidePart', hairColour: 'chestnut', hat: 'none', facial: 'none', outfit: 'inspector.coat', palette: 'ordinance', asymmetries: ['ledger'] },
  beat: { cast: 'inspector', family: 'standard', frame: 'broad', stature: 1, skin: 2, headShape: 'long', faceType: 4, hairStyle: 'shortCrop', hairColour: 'umber', hat: 'helm', facial: 'none', outfit: 'inspector.coat', palette: 'ordinance', asymmetries: ['truncheon'] },
};

export interface LookOpts {
  /** a named story character */ look?: string;
  /** force a cast / family / frame (the cast sheet; not validated against the cast's range) */ cast?: CastId; family?: LookFamily; frame?: Frame;
  /** a place or scene weight override for the cast step: casts the scene wants */ casts?: readonly CastId[];
}

/** The order of Book 11. Each step narrows the next and draws from its own hash stream. */
export function resolveLook(seed: number, archetype: Archetype, opts: LookOpts = {}): Look {
  if (opts.look) { const l = STORY[opts.look]; if (!l) throw new Error(`no story look "${opts.look}"`); return { ...l, asymmetries: [...l.asymmetries] }; }
  const pool = ARCHETYPE_CASTS[archetype].filter(([c]) => !opts.casts || opts.casts.includes(c));
  const cast = CASTS[opts.cast ?? weighted(pool.length ? pool : ARCHETYPE_CASTS[archetype], seed, S.cast)];
  const family = opts.family ?? pick(cast.families, seed, S.family), frame = opts.frame ?? pick(cast.frames, seed, S.frame);
  const stature = Math.round((.96 + .08 * unit(seed, S.stature)) * 1000) / 1000, skin = Math.floor(unit(seed, S.skin) * 3) as 0 | 1 | 2;
  const headShape = pick(cast.headShapes, seed, S.shape), rows = FACE_ROWS[headShape].filter(r => !cast.faceRows || cast.faceRows.includes(r)), faceType = pick(rows.length ? rows : FACE_ROWS[headShape], seed, S.face);
  const hat = pick(cast.hats, seed, S.hat), hairStyle = pick(cast.hair.filter(h => HAT_HAIR[hat].includes(h)), seed, S.hair), hairColour = pick(cast.hairColours, seed, S.hairColour);
  const facial = weighted(cast.facial, seed, S.facial), outfit = pick(cast.outfits, seed, S.outfit), pal = pick(Object.keys(outfit.palettes), seed, S.palette);
  const n = Math.min(cast.asymmetries.length, 1 + Math.floor(unit(seed, S.asymCount) * 2)), pool2 = [...cast.asymmetries], asymmetries: string[] = [];
  for (let i = 0; i < n; i++) asymmetries.push(pool2.splice(Math.floor(unit(seed, S.asym + 100 * i) * pool2.length), 1)[0]);
  return { cast: cast.id, family, frame, stature, skin, headShape, faceType, hairStyle, hairColour, hat, facial, outfit: outfit.id, palette: pal, asymmetries };
}

/** The swatch names for a look's palette slots, and their hex values. */
export function paletteOf(look: Look): Record<string, string> {
  const cast = CASTS[look.cast], outfit = cast.outfits.find(x => x.id === look.outfit)!, sw = outfit.palettes[look.palette], out: Record<string, string> = {};
  cast.slots.forEach((slot, i) => { out[slot] = palette.cloth[sw[i] ?? sw[sw.length - 1]]; }); return out;
}
/** A reason a look is not valid against the tables, or undefined. */
export function invalid(look: Look): string | undefined {
  const c = CASTS[look.cast]; if (!c) return 'cast';
  if (!c.families.includes(look.family)) return `family ${look.family} not in ${look.cast}`; if (!c.frames.includes(look.frame)) return 'frame';
  if (look.stature < .96 || look.stature > 1.04) return 'stature'; if (![0, 1, 2].includes(look.skin)) return 'skin';
  if (!c.headShapes.includes(look.headShape)) return 'headShape'; if (!FACE_ROWS[look.headShape].includes(look.faceType)) return 'faceType';
  if (!c.hats.includes(look.hat)) return 'hat'; if (!c.hair.includes(look.hairStyle)) return 'hair not in cast'; if (!HAT_HAIR[look.hat].includes(look.hairStyle)) return `hat ${look.hat} does not suit hair ${look.hairStyle}`;
  if (!c.hairColours.includes(look.hairColour)) return 'hairColour'; if (!c.facial.some(([f]) => f === look.facial)) return 'facial';
  const outfit = c.outfits.find(x => x.id === look.outfit); if (!outfit) return 'outfit'; if (!outfit.palettes[look.palette]) return 'palette';
  if (look.asymmetries.length < 1 || look.asymmetries.length > 2 || look.asymmetries.some(a => !c.asymmetries.includes(a) && !c.story?.includes(a)) || new Set(look.asymmetries).size !== look.asymmetries.length) return 'asymmetries';
  return undefined;
}
