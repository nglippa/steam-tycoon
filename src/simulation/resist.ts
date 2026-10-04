import { PORCH_ANSWERS } from './intro';
import type { PropertyId } from './economy';
import { crateHeld, strangerDue, type SiteOutcome } from './alignment';
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
