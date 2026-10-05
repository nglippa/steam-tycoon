import { PORCH_ANSWERS } from './intro';
import type { PropertyId } from './economy';
import { crateHeld, strangerDue, runOpen, type Side, type SiteOutcome } from './alignment';
/** The first resistance loop, as rules. One number per saved game (`Save.resist.rook`) says how far the Steward has come:
 * 0 untouched, 1 reported for work, 2 noticed the chalk, 3 delivered (the city shows it), 4 the stranger has been and gone.
 * It only moves forward, one step at a time, and never replays once it has reached 4. The world reads it; nothing here draws. */
export const RESIST_DONE = 4;
/** The stage after asking for `to`: the next step, and only the next step. */
export const advance = (stage: number, to: number) => to === stage + 1 && to <= RESIST_DONE ? to : stage;
/** The Rook hand speaks once, after the manifest is signed and before anything is noticed. */
export const canNotice = (stage: number) => stage === 1;
/** The held crate can be taken from the Noticed stage until it is delivered; declining costs nothing and ends nothing. */
export const canDivert = (stage: number) => stage >= 2 && stage < 3;
/** The stranger is due the first time the restored work is seen, and only once; the Embers' outcome, not the stage alone, makes it so. */
export const bookendDue = (stage: number, outcome: SiteOutcome) => strangerDue(stage, outcome);
/** What the collection clerk makes of the Steward, visible to everyone while the stock is held on a base site: nothing, a refusal of standing (not the keeper),
 * or an offer of lawful custody (the keeper: Rook & Son owned at level 1 or more). The Embers trust willingness; the Directorate trusts title. */
export type Contact = 'none' | 'refused' | 'offer';
export const clerkContact = (level: number, outcome: SiteOutcome, stage: number): Contact => !crateHeld(stage, outcome) ? 'none' : level >= 1 ? 'offer' : 'refused';
export const custodyAllowed = (level: number, outcome: SiteOutcome, stage: number) => clerkContact(level, outcome, stage) === 'offer';
/** What the stranger says from the catwalk: the opening's promise kept, in the register of the answer given on the porch. */
const BOOKEND: Record<string, string> = {
  point: 'Now you see the point.',
  who: 'Now you know who was asking. And what for.',
  quiet: 'Quietly, as you said. Now you see the point.',
  act: 'You said do something. This is something. Now you see the point.',
};
export const bookendLine = (answer: string | null) => (answer && PORCH_ANSWERS.includes(answer) ? BOOKEND[answer] : null) ?? 'Now you see the point.';
/** What a trade holds for the resistance: the words and marks that belong to it. Rook & Son is the only entry so far. */
export interface Hold { /** The toast when the work is done at the bench. */ signed: string; /** The one line a hand says, unprompted. */ hand: string;
  /** The held crate: what its plate says, the toast on shouldering it, why it will not be touched before it is noticed, and the clerk's eye. */ plate: string; taken: string; held: string; watched: string;
  /** The objective line while the crate is in the arms, and the toast when it is left under the tarp. */ carrying: string; delivered: string;
  /** The clerk's word to someone who is not the keeper, and to the keeper; the toast on signing; the objective line while carrying lawful custody. */ standing: string; offer: string; custodyTaken: string; custodyCarrying: string; /** The toast on signing the crate in at the gate's desk. */ signedIn: string }
export const HOLD: Partial<Record<PropertyId, Hold>> = {
  scrap: { signed: 'Day’s manifest signed. Beside it on the board, someone has chalked a small ember.', hand: 'Not everything on their manifests arrives where they think it does.',
    plate: 'HELD/BY ORDER', taken: 'You shoulder the crate. Regulator governors, by the weight: confiscated, listed, and not yours.', held: 'HELD BY ORDER of the Directorate of Labour. Nothing says it is yours to move.', watched: 'The Directorate’s clerk is counting the held stock. Wait until he bends to his sheet.',
    carrying: 'Get the crate to Finch’s pigeon loft. The gate will want to look inside.', delivered: 'The crate goes under the tarp. Finch’s hands will know what to do with governors. The Great Main’s regulator is the place to look.',
    standing: '“Held stock is signed for by the keeper of Rook & Son, citizen. You are not on this sheet.”', offer: '“The keeper. Sign here, and the held governors are in your custody, citizen.”',
    custodyTaken: 'You sign the sheet and shoulder the crate, with the clerk looking on. Directorate custody: nothing is hidden about it.', custodyCarrying: 'Take the crate to the Directorate collection at the Great Main gate.',
    signedIn: 'You sign the crate in. The stamp comes down on the sheet, and the governors go into the east lane’s booms.' },
};

/** Service Run 7, Finch's street gantry: the second contested site. `Save.resist.finch` is its episode stage, local sequencing only:
 * 0 untouched, 1 heard of the run (either offer), 2 understood the pawl (the resistance's prerequisite), 3 settled. Forward-only, one step; settling lifts it to 3. */
export const FINCH_DONE = 3;
/** The next step only, and only up to 2: the third is the site's outcome, written by the economy alone. */
export const advanceFinch = (stage: number, to: number) => to === stage + 1 && to < FINCH_DONE ? to : stage;
/** Either offer is made at Finch itself, once the Great Main is settled (either way), Finch Mechanical is owned and the run is still base. */
export const finchOffered = (greatMain: SiteOutcome, finchLevel: number, run: SiteOutcome) => greatMain !== 'base' && finchLevel >= 1 && !runOpen(run);
/** The bypass needs the pawl understood; the certification only needs the order read or the offer heard. */
export const canBypass = (stage: number, greatMain: SiteOutcome, finchLevel: number, run: SiteOutcome) => finchOffered(greatMain, finchLevel, run) && stage >= 2;
export const canCertify = (stage: number, greatMain: SiteOutcome, finchLevel: number, run: SiteOutcome) => finchOffered(greatMain, finchLevel, run) && stage >= 1;
/** What Finch's hand and the Directorate's order say, and what is carried and fitted. The words belong to the trade, not to a side. */
export const FINCH = {
  /** The hand's one line, and the variant for a Steward who signed for the Rook crate. */ hand: 'There’s a run hung on the street side of the south roof. Nobody’s used it since the winch seized.',
  handCustody: 'You signed for their crate. Finch doesn’t care whose sheet you sign. You own the bench.',
  /** The notice on the yard door, and the toast on reading it. */ notice: 'DIRECTORATE OF LABOUR • WORK ORDER 7 • Service Run 7 to be certified for maintenance use. A governor, fitted and signed for at the winch, by a keyholder of Finch Mechanical.',
  noticeToast: 'Work order. Service Run 7: a governor, fitted and signed for at the winch on the south roof.',
  pawl: 'The pawl is worn to a hook. The winch will not hold a load without the governor, and the governor is stamped for the Directorate’s own count. Pull the pawl pin and the chain simply lets go.',
  released: 'You take the release off the bench: a pawl pin, a hand’s weight of steel.', governor: 'You take the governor off the bench. Directorate stamp on the housing, oxblood seal on the pin.',
  releaseCarrying: 'Get the release to the winch on Finch’s south roof.', governorCarrying: 'Take the governor up to Service Run 7’s winch.',
  bypassed: 'The pin comes out and the chain runs. The lower flight comes down on its own weight and hangs from the gantry.', certified: 'You fit the governor and sign the plate. The winch takes the load; the grilles come off their hooks and the lower flight runs down.',
  crew: ['Finch contract. Go on.', 'Your name’s on the sheet.'],
  /** At the bench before the pawl is understood. */ wait: 'Look at their winch first. I can’t cut a tooth I haven’t seen described.',
  /** The certified plate and the ordinance dressing's brass. */ certifiedPlate: 'SERVICE RUN 7 • CERTIFIED • FINCH MECHANICAL',
  plate: 'SERVICE RUN 7 • DIRECTORATE MAINTENANCE • KEEP OFF',
} as const;
/** What Finch's hand says, once: the run, and after a lawful Rook crate the bench's owner too. */
export const handLine = (signedCrate: boolean) => signedCrate ? `${FINCH.handCustody} ${FINCH.hand}` : FINCH.hand;
/** What the bench offers at this stage: the hand's pawl release (covert) is 'ready' once the pawl is understood and 'wait' before; the Directorate's governor (signed for) from the first word of the run. */
export const benchOffer = (stage: number, greatMain: SiteOutcome, finchLevel: number, run: SiteOutcome): { release: 'ready' | 'wait' | null; governor: boolean } =>
  ({ release: canBypass(stage, greatMain, finchLevel, run) ? 'ready' : finchOffered(greatMain, finchLevel, run) ? 'wait' : null, governor: canCertify(stage, greatMain, finchLevel, run) });
/** The one acknowledgement a leaning Steward gets, once per approach: the Embers' warmth at Finch's yard, the Directorate's recognition at the gate desk. Mixed or uncommitted histories get none. */
export const ACK: Record<Side, string> = { resistance: 'Kettle’s on, if anyone asks. Nobody will.', ordinance: 'Finch Mechanical. You’re on two of our sheets now.' };
export const acknowledgement = (side: Side | null) => side ? ACK[side] : null;
