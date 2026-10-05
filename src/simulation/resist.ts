import { PORCH_ANSWERS } from './intro';
import type { PropertyId } from './economy';
import { clock } from './occupation';
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
/** The ward call's episode stage (`Save.resist.call`), local sequencing only: 0 untouched, 1 heard (the order read or the hand heard), 2 settled by the commitment. Next step only, and only up to 1: the second is the commitment, written by the economy alone. */
export const CALL_DONE = 2;
export const advanceCall = (stage: number, to: number) => to === stage + 1 && to < CALL_DONE ? to : stage;
/** After dusk: the relay only speaks from seven in the evening to five in the morning. */
export const CALL_SENDING = 19;
export const callHour = (day: number) => { const h = clock(day).hour; return h >= CALL_SENDING || h < 5; };
/** The ward call (the Weathervane's relay against the Sael Gate's sill): every word of it, in one place. The regime says "citizen" and never "Steward"; only Finch's hand, after a resistance commitment, says "Steward". The stage-V lines (the hand's and the officer's aftermath, the plates) are written here now and spoken by nothing yet. */
export const CALL = {
  plate: 'DIRECTORATE • MOVEMENT ORDER 12 • A column is ordered into Market Square by the Great Main. Lamps, mirrors and pattern cards are to be surrendered to the officer at the Sael Gate. Keyholders will report.',
  orderToast: 'Movement order. A column into Market Square by the Great Main; any lamp, mirror or pattern card goes to the officer at the Sael Gate.',
  handOffer: { open: 'They’re marching a column into the square. The Weathervane can call every roof in the ward at once, if someone carries the card up. It’s cut. It’s on your bench.', resistance: 'You’ve read their order. The card’s cut and on the bench. Top of the Weathervane, after dark.', ordinance: 'You’ve signed two of their sheets, so you’ve read the order. The card is on your bench all the same. It’s your bench.' },
  taken: 'You take the card off the bench: a hand of punched brass. The Weathervane’s relay reads it. So would the Directorate.',
  carrying: 'The pattern card: the Weathervane’s relay after dusk, or the officer at the Sael Gate.',
  shutterOpen: 'The shutter folds back on its pin. The lens looks east over the whole ward.', shutterClosed: 'You swing the shutter to. The lens is dark again.',
  seated: 'The card drops into the frame and seats. The relay is one lamp short of speaking.', lifted: 'You lift the card out of the frame.', byDay: 'A lamp says nothing in daylight. After dusk.',
  sent: 'You turn the lamp up behind the card. The lens throws it east, long and short. The card will not come out of the frame again.', answered: 'One roof answers. Then another. Then the square.',
  relayAfter: 'The lamp is still warm. The card has fused in its frame.', sealed: 'A Directorate seal on the shutter pin, oxblood wax, and boot marks on the deck. They found the way up.',
  watch: 'You sit against the parapet and watch the light go out of the ward. Dusk.',
  officer: { approach: 'Report.', empty: 'Nothing in your hands, citizen. Move along.', offered: 'Put it there.', certain: 'You’re certain?', back: 'Then stop wasting the gate’s time, citizen.',
    signed: { open: 'Then we’ll move first.', kept: 'Finch Mechanical. Three sheets now. Then we’ll move first.', crossed: 'From you. That is noted, citizen. Then we’ll move first.' },
    later: 'Finch Mechanical. Two of our sheets carry your name, citizen. There will be a third.' },
  signedToast: 'You sign the card in. The officer turns it over once and sends a runner up the Great Main.',
  hand: { resistance: { open: 'It carried. Every roof I can see answered. Steward.', kept: 'Knew you’d climb. Every roof answered, Steward.', crossed: 'Two of their sheets, and you climbed anyway. Every roof answered. Steward.' },
    ordinance: { open: 'The card was on your bench this morning. I see where it went.', kept: 'You own the bench. I only work at it.', crossed: 'I cut that card for you.' } },
  cellar: 'SEALED • MOVEMENT ORDER 12', hoarding: 'ORDER 12 • THE SQUARE IS UNDER COUNT', yard: 'CONTRACT UNDER REVIEW',
} as const;
/** What Finch's hand says of the order while it stands: by the side the deeds lean to, or the open offer. */
export const handOfferLine = (side: Side | null) => CALL.handOffer[side ?? 'open'];
/** The send-and-answer sequence, in seconds after the lamp is turned up (about 35 s; the player keeps full control throughout and nothing depends on where they look). The lens flashes, long and short (on, off, on, off ... in seconds, repeating) until `flash`; the answering lamps light one by one at `lamps`; the answer is announced at `answered`; the roofs have stirred from `stirred` and the Directorate has taken notice from `alerted`. None of it is saved: the commitment is the whole of the durable state, and a reload shows the end of it. */
export const CALL_PACE = { flash: 25, pattern: [1.2, .5, .4, .5, .4, .5, 1.2, .9], lamps: [5, 9, 13, 17, 21, 24, 27], answered: 29, stirred: 29, alerted: 32 } as const;
const PERIOD = CALL_PACE.pattern.reduce((a, b) => a + b, 0);
/** Whether the lens is lit `t` seconds after sending: flashing to the pattern, then steadily. */
export function lensOn(t: number) { if (t >= CALL_PACE.flash) return true; let u = t % PERIOD; for (let i = 0; i < CALL_PACE.pattern.length; i++) { u -= CALL_PACE.pattern[i]; if (u < 0) return i % 2 === 0; } return true; }
/** How many of the answering lamps are lit `t` seconds after sending. */
export function lampsLit(t: number) { let n = 0; for (const s of CALL_PACE.lamps) if (t >= s) n++; return n; }
/** What the relay's hint says: the sequence of the shutter, the card, the dusk and the lamp, and after a commitment only what is left to look at. */
export function relayHint(commit: Side | null, open: boolean, seated: boolean, carrying: boolean, day: number) {
  if (commit) return commit === 'resistance' ? 'LOOK CLOSER' : 'SEALED';
  if (!open) return 'OPEN THE SHUTTER'; if (!seated) return carrying ? 'SET THE CARD' : 'CLOSE THE SHUTTER'; return callHour(day) ? 'SEND THE CALL' : 'AFTER DUSK';
}
/** The Directorate's own answer to a signature, in seconds after signing: four caged lamps along the gallery rail light one after another (about eight seconds) and then the posts turn out. Nothing here is saved; a reload shows the end of it. */
export const MUSTER = { lamps: [1.5, 3.5, 5.5, 7.5], stirred: 10, alerted: 10 } as const;
/** How many of the gallery's caged lamps are lit `t` seconds after signing. */
export function musterLit(t: number) { let n = 0; for (const s of MUSTER.lamps) if (t >= s) n++; return n; }
