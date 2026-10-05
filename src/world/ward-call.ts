import * as T from 'three';
import { box, sign, bake, mats } from './assets';
import { artMats } from './art-kit';
import { unseen } from './routes';
import { Consignment } from './logistics';
import { occupationMats } from './factions';
import { callOffered, leaning } from '../simulation/alignment';
import { SITE_LIBERATED } from '../simulation/economy';
import { CALL, handOfferLine } from '../simulation/resist';
import type { Line } from '../simulation/intro';
import type { Presentation } from './presentation';
import type { Target } from './city';

/** THE WARD CALL. Directorate Movement Order 12 goes up on Finch's yard door beside Work Order 7, and the pattern card (a hand of punched brass, cut by Finch's hand on the Steward's own bench)
 * waits on that bench. The card is the one object and it is only ever carried: nothing here commits the Steward to anything until the relay's lamp is turned up or the card is signed in (both of them
 * `Economy.commit`, and nothing else is). It is offered only while both contested sites are settled, nothing is committed and the square is still held; when it is not offered and nothing is committed
 * NOTHING of it exists. The world reads the commitment, the outcomes, the leaning and the stage; the stage only decides what Finch's hand says. */
const BENCH = { x: -16.4, z: 23.5 }, NOTICE = { x: -21.1, z: 22.7 }, CARD = { x: BENCH.x + .15, z: BENCH.z + .02 }, O = occupationMats;

export class WardCall {
  /** Say a line to the player now; false if this is not the moment (the ledger is open, the opening is playing). */
  onLine: (line: Line) => boolean = () => false;
  /** What the call has done, for stage V: the roofs have begun to answer (from ~29 s after sending, and always after a reload) and the Directorate has taken notice (~32 s). */
  stirred = false; alerted = false;
  /** The order on Finch's yard door, and the two groups the square's answer will go into (stage V): the Embers' response, and the Directorate's. */
  private notice = new T.Group(); private risen = new T.Group(); private mustered = new T.Group();
  /** The one card, carried by hand and never contraband: not covert, not in custody, ignored by the checkpoints. */
  card!: Consignment; private cardTarget!: Target; private hear = 0;
  constructor(private pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root); root.add(this.notice, this.risen, this.mustered); this.risen.visible = this.mustered.visible = false;
    // The order, on its own board clear of Work Order 7: the Directorate's header, oxblood strips, and the sheet.
    const p = CALL.plate.split(' • '), n = this.notice; box(n, NOTICE.x, 1.5, NOTICE.z + .03, 1, 1.3, .06, mats.wood); box(n, NOTICE.x, 1.5, NOTICE.z + .07, .8, 1.06, .012, artMats.paper);
    sign(n, p[0], p[1], NOTICE.x, 1.84, NOTICE.z + .086, .72, .3, '#cbbf9f'); for (const dy of [.2, .06, -.08, -.22]) box(n, NOTICE.x, 1.5 + dy, NOTICE.z + .08, .6, .012, .004, mats.dark);
    box(n, NOTICE.x, 1.16, NOTICE.z + .08, .72, .05, .006, O.oxblood); box(n, NOTICE.x + .24, 1.3, NOTICE.z + .08, .14, .14, .006, O.oxblood); bake(n);
    const spot = (id: string, label: string, hint: string, x: number, z: number, w: number, d: number, when: () => boolean) => { const t = new T.Mesh(new T.BoxGeometry(w, 1.4, d), unseen); t.position.set(x, 1.1, z); root.add(t); t.updateWorldMatrix(true, false);
      const target = { object: t, id, kind: 'site' as const, label, hint, position: t.getWorldPosition(new T.Vector3()), when }; city.targets.push(target); return target; };
    spot('call.order', 'Movement order', 'READ THE ORDER', NOTICE.x, NOTICE.z + .7, 1.4, 1.4, () => this.shown);
    this.card = new Consignment('call.card', null, 'call.none', root, CARD, g => { box(g, 0, .008, 0, .26, .014, .18, mats.brass); for (let k = 0; k < 6; k++) box(g, -.1 + k * .04, .016, (k % 3 - 1) * .045, .016, .004, .016, mats.dark); },
      () => this.offered, CALL.taken); this.card.waiting.position.y = .91; this.card.name = 'pattern card'; this.card.carryLine = CALL.carrying;
    this.cardTarget = spot('call.card', 'Pattern card', 'TAKE THE CARD', CARD.x, CARD.z, .7, .8, () => this.offered);
    this.sync();
  }
  private get economy() { return this.pres.city.economy; }
  private get alignment() { return this.economy.state.alignment; }
  /** The call is on offer: both sites settled, nothing committed, the square still held. Nothing else makes it so. */
  get offered() { const s = this.economy.state; return callOffered(s.alignment, s.sites.market, SITE_LIBERATED); }
  /** The notice stands while the call is offered or once it is settled (committed); never otherwise. */
  private get shown() { return this.offered || !!this.alignment.commit; }
  /** E on something of the call's: what it says, and the stage it moves. Null if there is nothing to say. */
  use(id: string): string | null {
    if (id === 'call.order') { if (!this.shown) return null; this.economy.advanceCall(1); return CALL.orderToast; }
    return null;
  }
  /** Everything the call shows is worked out here from the state, so a reload, a New Game or a liberated square all land in the same place; transient state (the card in the arms) is dropped when the call is not on offer. */
  sync() { this.notice.visible = this.shown; this.hear = 0; if (!this.offered) this.card.drop(); }
  update(dt: number, _time: number, viewer: T.Vector3) {
    const card = this.card; card.update(); this.cardTarget.hint = card.carrying ? 'PUT IT BACK' : 'TAKE THE CARD';
    // The hand says it once, to someone standing at the bench who is not in a menu, and after Finch's own greeting (the hover line of the yard) has had its moment.
    if (!this.offered || this.economy.state.resist.call !== 0) { this.hear = 0; return; }
    const hand = this.pres.workers[this.pres.finchRun.hand].person.group, near = hand.visible ? Math.hypot(viewer.x - hand.position.x, viewer.z - hand.position.z) : 99;
    this.hear = near < 4 ? this.hear + dt : 0;
    if (this.hear > 3 && this.onLine({ who: 'Finch’s hand', text: handOfferLine(leaning(this.alignment)) })) { this.hear = 0; this.economy.advanceCall(1); }
  }
}
