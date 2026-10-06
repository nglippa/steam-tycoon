import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCHETYPE_CASTS, CASTS, HAT_HAIR, STORY, hash, invalid, paletteOf, resolveLook, type Look } from '../src/world/people/look.ts';
import { palette, type Archetype } from '../src/world/palette.ts';

const ARCHETYPES = Object.keys(ARCHETYPE_CASTS) as Archetype[], SEEDS = Array.from({ length: 1000 }, (_, i) => i);
const all = ARCHETYPES.flatMap(a => SEEDS.map(s => ({ a, s, look: resolveLook(s, a) })));

test('every look reachable over seeds 0..999 is valid against the tables', () => {
  for (const { a, s, look } of all) {
    assert.equal(invalid(look), undefined, `${a} seed ${s}: ${invalid(look)}`);
    assert.ok(HAT_HAIR[look.hat].includes(look.hairStyle), `${a} ${s}: hat ${look.hat} with hair ${look.hairStyle}`);
    assert.ok(CASTS[look.cast].outfits.some(o => o.id === look.outfit && look.palette in o.palettes), `${a} ${s}: outfit`);
    assert.equal(CASTS[look.cast].archetype === a || (a === 'resident' && look.cast === 'child'), true, `${a} ${s}: cast ${look.cast} does not suit the archetype`);
  }
});

test('the tables are consistent: every cast is reachable from its archetype, every colour is a swatch', () => {
  for (const c of Object.values(CASTS)) {
    assert.ok(c.id === 'child' || ARCHETYPE_CASTS[c.archetype].some(([id]) => id === c.id), `${c.id} is not in its archetype's casts`);
    assert.ok(c.hair.some(h => HAT_HAIR.none.includes(h)));
    for (const h of c.hats) assert.ok(c.hair.some(x => HAT_HAIR[h].includes(x)), `${c.id}: hat ${h} leaves no hair`);
    for (const o of c.outfits) for (const sw of Object.values(o.palettes)) for (const s of sw) assert.ok(s in palette.cloth, `${c.id}/${o.id}: ${s} is not a swatch`);
    for (const k of c.hairColours) assert.ok(k in palette.hair2);
  }
  for (const { look } of all.slice(0, 400)) for (const v of Object.values(paletteOf(look))) assert.ok(Object.values(palette.cloth).includes(v as never));
});

test('the same seed gives the same look, and different seeds give different people', () => {
  for (const a of ARCHETYPES) for (const s of [0, 1, 7, 42, 999]) assert.deepEqual(resolveLook(s, a), resolveLook(s, a));
  const key = (l: Look) => JSON.stringify(l), twins = new Map<string, number>();
  for (let s = 0; s < 300; s++) { const k = key(resolveLook(s, 'resident')); twins.set(k, (twins.get(k) ?? 0) + 1); }
  assert.ok(twins.size > 270, `only ${twins.size} distinct residents in 300 seeds`);
});

test('the hash is a real hash: streams of one seed and neighbouring seeds are unrelated', () => {
  const bits = (x: number) => { let n = 0; for (; x; x &= x - 1) n++; return n; };
  let flips = 0, N = 2000; for (let s = 0; s < N; s++) flips += bits(hash(s, 3) ^ hash(s + 1, 3));
  assert.ok(Math.abs(flips / N - 16) < 1, `avalanche ${flips / N}`);
  let same = 0; for (let s = 0; s < N; s++) if (hash(s, 1) % 3 === hash(s, 2) % 3) same++;
  assert.ok(Math.abs(same / N - 1 / 3) < .04, `streams 1 and 2 agree ${same / N}`);
});

/** Each cell of the joint distribution of two properties is within [1/LOW, HIGH] of what independence predicts, for every cell expecting at least `MIN` samples
 * (at 60 samples a cell's noise is about 13%, so these windows are three to four standard deviations: a real tie between properties is far outside them). */
const LOW = 2, HIGH = 1.6, MIN = 60;
function independent(rows: Look[], f: (l: Look) => string, g: (l: Look) => string, what: string) {
  const n = rows.length, fa = new Map<string, number>(), ga = new Map<string, number>(), joint = new Map<string, number>();
  for (const l of rows) { const a = f(l), b = g(l); fa.set(a, (fa.get(a) ?? 0) + 1); ga.set(b, (ga.get(b) ?? 0) + 1); joint.set(a + '|' + b, (joint.get(a + '|' + b) ?? 0) + 1); }
  for (const [a, na] of fa) for (const [b, nb] of ga) { const expect = na * nb / n; if (expect < MIN) continue; const got = joint.get(a + '|' + b) ?? 0; assert.ok(got / expect < HIGH && got / expect > 1 / LOW, `${what}: ${a} x ${b} observed ${got}, independence predicts ${expect.toFixed(1)}`); }
}
const props: [string, (l: Look) => string][] = [['family', l => l.family], ['skin', l => String(l.skin)], ['hat', l => l.hat], ['hairColour', l => l.hairColour], ['headShape', l => l.headShape]];

test('skin is independent of everything, over every archetype and seed', () => {
  const rows = all.map(r => r.look);
  for (const [name, f] of [['cast', (l: Look) => l.cast], ...props.filter(p => p[0] !== 'skin')] as [string, (l: Look) => string][]) independent(rows, l => String(l.skin), f, `skin x ${name}`);
});
test('within a cast, no two of {family, skin, hat, hair colour, head shape} are correlated; the cast itself is a function of the archetype and place, not of the seed', () => {
  // The cast fixes what the later choices may be, so it is the stratum: choices are tested inside it. 8000 seeds per archetype keeps every stratum large enough.
  for (const a of ARCHETYPES) {
    const rows = Array.from({ length: 8000 }, (_, i) => resolveLook(i, a));
    for (const cast of new Set(rows.map(r => r.cast))) {
      const stratum = rows.filter(r => r.cast === cast);
      for (let i = 0; i < props.length; i++) for (let j = i + 1; j < props.length; j++) independent(stratum, props[i][1], props[j][1], `${cast}: ${props[i][0]} x ${props[j][0]}`);
    }
  }
  // and seed parity does not decide anything (the old builder's `seed % n` did)
  const rows = SEEDS.map(s => resolveLook(s, 'worker'));
  for (const m of [2, 3, 4, 6]) for (const [name, f] of props) independent(rows.map((l, s) => ({ ...l, outfit: String(s % m) })), l => l.outfit, f, `seed%${m} x ${name}`);
});

test('every story look resolves to its fixed table entry, whatever the seed, and is itself valid', () => {
  for (const [name, fixed] of Object.entries(STORY)) {
    assert.equal(invalid(fixed), undefined, `${name}: ${invalid(fixed)}`);
    for (const s of [0, 5, 77, 4000]) for (const a of ARCHETYPES) assert.deepEqual(resolveLook(s, a, { look: name }), fixed, name);
  }
  assert.throws(() => resolveLook(0, 'worker', { look: 'nobody' }));
});

test('a moustache or a beard belongs to a cast that wears one, at a modest rate: never dealt to the crowd at a third', () => {
  const rows = all.map(r => r.look), hairy = (l: Look) => l.facial === 'moustache' || l.facial === 'beard';
  for (const l of rows) if (hairy(l)) assert.ok(['elder', 'olderMechanic', 'garrison', 'inspector'].includes(l.cast), `${l.cast} with a ${l.facial}`);
  const share = rows.filter(hairy).length / rows.length;
  assert.ok(share < .12, `${(share * 100).toFixed(1)}% of the crowd has a moustache or beard`);
  const mech = Array.from({ length: 2000 }, (_, s) => resolveLook(s, 'engineer', { cast: 'olderMechanic' }));
  assert.ok(mech.filter(l => l.facial === 'moustache').length / mech.length > .35, 'the older mechanic (Book 9) mostly wears his moustache');
});

test('every story character resolves to a valid authored look, and each spawn site asks for the look it is named for', async () => {
  const { readFileSync } = await import('node:fs');
  const sites: Record<string, string[]> = { 'market-square.ts': ['officer', 'beat'], 'rook-yard.ts': ['rookHand', 'clerk', 'masked'], 'finch-run.ts': ['finchHand'], 'cinder-row.ts': ['embersChalker', 'embersLookout', 'embersCourier'], 'foundry-works.ts': ['overseer'], 'ration-line.ts': ['warden'], 'intro.ts': ['introGuard', 'introOrdinal', 'masked'] };
  for (const name of Object.keys(STORY)) { const l = resolveLook(0, 'resident', { look: name }); assert.equal(invalid(l), undefined, `${name}: ${invalid(l)}`); assert.deepEqual(l, { ...STORY[name], asymmetries: [...STORY[name].asymmetries] }); }
  const named = new Set<string>();
  for (const [file, names] of Object.entries(sites)) { const src = readFileSync(new URL(`../src/world/${file}`, import.meta.url), 'utf8'); for (const n of names) { assert.ok(src.includes(`'${n}'`) && (file === 'intro.ts' ? true : src.includes(`look: '${n}'`)), `${file} does not ask for ${n}`); assert.ok(n in STORY, n); named.add(n); } }
  for (const name of Object.keys(STORY)) assert.ok(named.has(name), `${name} is not placed anywhere`);
});

test('no asymmetry in a cast table is a no-op: every name is built by the wardrobe or the figure', async () => {
  const { readFileSync } = await import('node:fs');
  const src = ['wardrobe.ts', 'figure.ts'].map(f => readFileSync(new URL(`../src/world/people/${f}`, import.meta.url), 'utf8')).join('\n');
  for (const c of Object.values(CASTS)) for (const a of [...c.asymmetries, ...(c.story ?? [])]) assert.ok(src.includes(`'${a}'`), `${c.id}: asymmetry ${a} is built nowhere`);
});

test('the story-only items are never dealt by the resolver', () => {
  for (const { look } of all) for (const a of look.asymmetries) assert.ok(!(CASTS[look.cast].story ?? []).includes(a), `${look.cast} was dealt ${a}`);
});

test('the switch: no place outside citizens.ts and the dev sheet builds a person except through person()', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const walk = (dir: URL): URL[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : [new URL(e.name, dir)]);
  for (const f of walk(new URL('../src/', import.meta.url))) { if (/citizens\.ts$|sheet\.ts$/.test(f.pathname) || !f.pathname.endsWith('.ts')) continue; assert.ok(!/\bcitizen(Next)?\(mats\./.test(readFileSync(f, 'utf8')), `${f.pathname} builds a person directly`); }
});
