/** Where the Steward has landed on the contested sites, as rules. Three things stay apart: the episode stage (`resist.rook`, local sequencing only),
 * the deeds the Steward has done (memory, never a switch), and the outcome of a site (the one thing the physical world reads).
 * A base site can be resolved once, by one deed of the matching side; nothing here draws. */
export type Side = 'resistance' | 'ordinance';
export type SiteOutcome = 'base' | Side;
export type ContestedId = 'greatMain' | 'finchRun';
export type DeedId = 'rook.diverted' | 'rook.custody' | 'finch.bypassed' | 'finch.certified';
export const SIDES: readonly Side[] = ['resistance', 'ordinance'];
export const CONTESTED: readonly ContestedId[] = ['greatMain', 'finchRun'];
/** Which side a deed belongs to and which site it settles. */
export const DEEDS: Record<DeedId, { side: Side; site: ContestedId }> = { 'rook.diverted': { side: 'resistance', site: 'greatMain' }, 'rook.custody': { side: 'ordinance', site: 'greatMain' }, 'finch.bypassed': { side: 'resistance', site: 'finchRun' }, 'finch.certified': { side: 'ordinance', site: 'finchRun' } };
/** `deeds` maps a deed done to when (seconds of play). `commit` and `broke` are reserved for the later faction lock and single defection; nothing sets them yet. */
export interface Alignment { deeds: Partial<Record<DeedId, number>>; outcomes: Record<ContestedId, SiteOutcome>; commit: { side: Side; at: number; by: string } | null; broke: { from: Side; at: number; by: string } | null }
export const freshAlignment = (): Alignment => ({ deeds: {}, outcomes: { greatMain: 'base', finchRun: 'base' }, commit: null, broke: null });
/** The alignment after `deed` settles `site` for `side`, or null: the site is not base, or the deed is not that side's for that site. Never mutates. */
export function resolve(a: Alignment, site: ContestedId, side: Side, deed: DeedId, at: number): Alignment | null {
  const d = DEEDS[deed]; if (!d || d.side !== side || d.site !== site || a.outcomes[site] !== 'base') return null;
  return { ...a, deeds: { ...a.deeds, [deed]: at }, outcomes: { ...a.outcomes, [site]: side } };
}
/** Committed only once the faction lock is set; leaning from at least two more deeds on one side than the other; one deed is still uncommitted. */
export function phase(a: Alignment): 'uncommitted' | 'leaning' | 'committed' {
  if (a.commit) return 'committed';
  const n = (side: Side) => (Object.keys(a.deeds) as DeedId[]).filter(d => DEEDS[d]?.side === side).length;
  return Math.abs(n('resistance') - n('ordinance')) >= 2 ? 'leaning' : 'uncommitted';
}
/** The side ahead while the Steward is leaning (the same rule as `phase`), else null. */
export function leaning(a: Alignment): Side | null {
  if (phase(a) !== 'leaning') return null;
  const n = (side: Side) => (Object.keys(a.deeds) as DeedId[]).filter(d => DEEDS[d]?.side === side).length;
  return n('resistance') > n('ordinance') ? 'resistance' : 'ordinance';
}
/** What the physical world reads, from the outcome and never from the stage. */
export const catwalkRestored = (outcome: SiteOutcome) => outcome === 'resistance';
/** The held crate waits in the yard from the report until the site is settled. */
export const crateHeld = (stage: number, outcome: SiteOutcome) => stage >= 1 && stage < 3 && outcome === 'base';
/** The stranger is due on the restored catwalk, once: delivered, and the outcome is the Embers'. */
export const strangerDue = (stage: number, outcome: SiteOutcome) => stage === 3 && outcome === 'resistance';
/** Service Run 7 is open to the street once its site is settled, by either side; the grilles and the hoisted ladder read this and nothing else. */
export const runOpen = (outcome: SiteOutcome) => outcome !== 'base';
