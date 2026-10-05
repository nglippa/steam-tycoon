/** Where the Steward has landed on the contested sites, as rules. Three things stay apart: the episode stage (`resist.rook`, local sequencing only),
 * the deeds the Steward has done (memory, never a switch), and the outcome of a site (the one thing the physical world reads).
 * A base site can be resolved once, by one deed of the matching side; nothing here draws. */
export type Side = 'resistance' | 'ordinance';
export type SiteOutcome = 'base' | Side;
export type ContestedId = 'greatMain' | 'finchRun';
export type DeedId = 'rook.diverted' | 'rook.custody' | 'finch.bypassed' | 'finch.certified';
export type CommitId = 'call.sent' | 'call.reported';
export const SIDES: readonly Side[] = ['resistance', 'ordinance'];
export const CONTESTED: readonly ContestedId[] = ['greatMain', 'finchRun'];
/** Which side a deed belongs to and which site it settles. */
export const DEEDS: Record<DeedId, { side: Side; site: ContestedId }> = { 'rook.diverted': { side: 'resistance', site: 'greatMain' }, 'rook.custody': { side: 'ordinance', site: 'greatMain' }, 'finch.bypassed': { side: 'resistance', site: 'finchRun' }, 'finch.certified': { side: 'ordinance', site: 'finchRun' } };
/** `deeds` maps a deed done to when (seconds of play). `commit` is set by the one decisive act (`commit`, written only through `Economy.commit`): the Steward has sent the ward call or signed the card in, once, for one side. `broke` is still reserved for the single defection; nothing sets or reads it but the save sanitiser and the guards on `commit` and `callOffered`. */
export interface Alignment { deeds: Partial<Record<DeedId, number>>; outcomes: Record<ContestedId, SiteOutcome>; commit: { side: Side; at: number; by: string } | null; broke: { from: Side; at: number; by: string } | null }
export const freshAlignment = (): Alignment => ({ deeds: {}, outcomes: { greatMain: 'base', finchRun: 'base' }, commit: null, broke: null });
/** Which side the decisive act belongs to: sending the ward call is the Embers', signing the card in at the Sael Gate is the Ordinance's. `commit.by` stays a string; it is valid only if it is a key here and matches the side. */
export const COMMITS: Record<CommitId, Side> = { 'call.sent': 'resistance', 'call.reported': 'ordinance' };
/** The alignment after `deed` settles `site` for `side`, or null: the site is not base, or the deed is not that side's for that site. Never mutates. */
export function resolve(a: Alignment, site: ContestedId, side: Side, deed: DeedId, at: number): Alignment | null {
  const d = DEEDS[deed]; if (!d || d.side !== side || d.site !== site || a.outcomes[site] !== 'base') return null;
  return { ...a, deeds: { ...a.deeds, [deed]: at }, outcomes: { ...a.outcomes, [site]: side } };
}
/** The side ahead by at least two deeds, from the deeds alone and whatever `commit` is, else null. */
export function tilt(a: Alignment): Side | null {
  const n = (side: Side) => (Object.keys(a.deeds) as DeedId[]).filter(d => DEEDS[d]?.side === side).length;
  return Math.abs(n('resistance') - n('ordinance')) >= 2 ? (n('resistance') > n('ordinance') ? 'resistance' : 'ordinance') : null;
}
/** Committed only once the decisive act is done; leaning from at least two more deeds on one side than the other; one deed is still uncommitted. */
export function phase(a: Alignment): 'uncommitted' | 'leaning' | 'committed' { return a.commit ? 'committed' : tilt(a) ? 'leaning' : 'uncommitted'; }
/** The side ahead while the Steward is leaning (the same rule as `phase`), else null. */
export function leaning(a: Alignment): Side | null { return a.commit ? null : tilt(a); }
/** The alignment after `by` commits the Steward for `side` at `at`, or null: already committed, already broken, or `by` is not that side's act. Never mutates; deeds and outcomes are untouched. */
export function commit(a: Alignment, side: Side, by: string, at: number): Alignment | null {
  if (a.commit || a.broke || COMMITS[by as CommitId] !== side) return null;
  return { ...a, commit: { side, at, by } };
}
/** Who the world takes the Steward for: the commitment rules over the deeds. */
export const standing = (a: Alignment): Side | null => a.commit?.side ?? leaning(a);
/** What the deeds say of the commitment: kept (they tilt the same way), crossed (the other way), open (no tilt); null while uncommitted. */
export function crossing(a: Alignment): 'kept' | 'crossed' | 'open' | null {
  if (!a.commit) return null; const t = tilt(a); return !t ? 'open' : t === a.commit.side ? 'kept' : 'crossed';
}
/** The ward call is offered once both contested sites are settled (any mix), nothing is committed or broken, and the square is still held (`market` below `liberated`, passed in so this file imports nothing). */
export const callOffered = (a: Alignment, market: number, liberated: number) => CONTESTED.every(id => a.outcomes[id] !== 'base') && !a.commit && !a.broke && market < liberated;
/** What the physical world reads, from the outcome and never from the stage. */
export const catwalkRestored = (outcome: SiteOutcome) => outcome === 'resistance';
/** The held crate waits in the yard from the report until the site is settled. */
export const crateHeld = (stage: number, outcome: SiteOutcome) => stage >= 1 && stage < 3 && outcome === 'base';
/** The stranger is due on the restored catwalk, once: delivered, and the outcome is the Embers'. */
export const strangerDue = (stage: number, outcome: SiteOutcome) => stage === 3 && outcome === 'resistance';
/** Service Run 7 is open to the street once its site is settled, by either side; the grilles and the hoisted ladder read this and nothing else. */
export const runOpen = (outcome: SiteOutcome) => outcome !== 'base';
