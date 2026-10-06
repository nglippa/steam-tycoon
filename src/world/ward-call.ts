import * as T from 'three';
import { box, cyl, sphere, torus, beam, crate, sign, bake, mats } from './assets';
import { artMats, fabricOf } from './art-kit';
import { unseen } from './routes';
import { Consignment } from './logistics';
import { occupationMats, ancientMats, decalMat, emberChalk } from './factions';
import { callOffered, crossing, leaning, type Side } from '../simulation/alignment';
import { SITE_LIBERATED } from '../simulation/economy';
import { CALL, CALL_PACE, MUSTER, handOfferLine, callHour, lensOn, lampsLit, musterLit, relayHint } from '../simulation/resist';
import type { Line } from '../simulation/intro';
import type { Presentation } from './presentation';
import type { Target } from './city';

/** THE WARD CALL. Directorate Movement Order 12 goes up on Finch's yard door beside Work Order 7, and the pattern card (a hand of punched brass, cut by Finch's hand on the Steward's own bench)
 * waits on that bench. The card is the one object and it is only ever carried: nothing here commits the Steward to anything until the relay's lamp is turned up or the card is signed in (both of them
 * `Economy.commit`, and nothing else is). It is offered only while both contested sites are settled, nothing is committed and the square is still held; when it is not offered and nothing is committed
 * NOTHING of it exists. The world reads the commitment, the outcomes, the leaning and the stage; the stage only decides what Finch's hand says. */
const BENCH = { x: -16.4, z: 23.5 }, NOTICE = { x: -21.1, z: 22.7 }, CARD = { x: BENCH.x + .15, z: BENCH.z + .02 }, O = occupationMats;
/** The Weathervane's top deck (weatherside.ts): the relay stands on its pedestal at (TX, TZ), the lens at LY looking east over the ward, and the Embers' lookout blanket lies on the gallery below. */
const TX = -71, TZ = -28, TOP = 31.1, LY = TOP + 1.8, GAL = 18.1, LOOKOUT = { x: TX + 4.2, z: TZ - 4.2 };
/** The Sael Gate's sentry box (market-square.ts), which the Ordinance planted and which outlives them: the officer is posted a few paces west, and the card goes onto a ledge under the box's window on the side facing the square. */
const BOX = { x: 10.85, z: -32.9 }, SILL = { x: BOX.x - .15, y: 1.645, z: -32.2 }, LEDGER = { x: BOX.x + .25 }, NEAR = 8;
/** Market Square (market-square.ts): its centre, the Sael Gate's line, the Copper Finch's cellar hatch, and how far the Steward must walk from the square before the Directorate's placed things stand. The two lanes flank the stalls where the street meets the gate square. */
const SQ = { x: 0, z: -31 }, GZ = -35.35, CELLAR = { x: -12.75, z: -23.6 }, AWAY = 45, YARD = { x: -19.2, z: 22.7 }, WINCH = { x: -13.95, z: 20.6 }, TERRACE = 14.45;
/** The Directorate's caged lamps on the gallery rail: a cold bone-white core and a pale neutral halo (turquoise is the Embers'), emissive only. */
const strike = new T.MeshBasicMaterial({ color: '#ece6d4', transparent: true, opacity: .92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), galCore = new T.MeshBasicMaterial({ color: '#eef2f4' }), galHalo = new T.MeshBasicMaterial({ color: '#c8d0d6', transparent: true, opacity: .36, depthWrite: false }), mirror = new T.MeshStandardMaterial({ color: '#c9d6d3', metalness: .6, roughness: .25 });
/** One turquoise-warm lamp pair for the lit lens and every answering lamp: an emissive core and a faint halo, the idiom of the caged lamps. No real light anywhere. */
const lampCore = new T.MeshBasicMaterial({ color: '#d2ffe6' }), lampHalo = new T.MeshBasicMaterial({ color: '#3fe0bc', transparent: true, opacity: .3, depthWrite: false }), DAY_CORE = new T.Color('#79ab9c'), NIGHT_CORE = new T.Color('#d2ffe6');
/** The lit lens is a lamp behind glass, not a neon disc: its own quieter pair, and its halo is put away whenever the viewer is near enough to be inside it. */
const lensCore = new T.MeshBasicMaterial({ color: '#8fd9c0' }), LENS_DAY = new T.Color('#4f7a70'), LENS_NIGHT = new T.Color('#8fd9c0'), FAR = 12, CLOSE = 9;
/** The seven answering lamps, in the order they answer: where each stands (the roof or ledge it is fixed to, x, y of the surface, z) and how tall its little iron mast is. Each is on an existing structure with a line of sight from the Weathervane's top deck. */
const LAMPS: readonly { on: string; x: number; y: number; z: number; mast?: number }[] = [
  { on: 'Finch Mechanical’s block roof', x: -15, y: 19.85, z: 12.5, mast: 1.4 }, { on: 'Rook & Son’s roof', x: -18, y: 15.4, z: 42 }, { on: 'the roof west of the Great Main’s head', x: -18, y: 17.38, z: -22 },
  { on: 'the west block’s roof edge, on the square’s south-west corner', x: -14, y: 16.3, z: -23, mast: 1.2 }, { on: 'the east block’s lower roof, on the square’s south-east corner', x: 12.6, y: 8.88, z: -22, mast: 1.2 }, { on: 'the roof east of the Great Main’s head', x: 18, y: 12.4, z: -22 }, { on: 'the east rim roof', x: 22, y: 16.9, z: 14 }];

/** The lanterns: where each stands when its own stall is built (a stall count of at least `min`), and where it stands on the two stalls that always are (`fx`, `fz`). The counters are 1.445 high; a stall's counter is 3.9 deep about its z. */
const LANTERNS: readonly { x: number; z: number; min: number; fx: number; fz: number }[] = [{ x: -6.85, z: -27.4, min: 2, fx: -6.85, fz: -27.4 }, { x: 6.85, z: -27.4, min: 3, fx: 6.85, fz: -23.7 }, { x: -6.85, z: -31.4, min: 4, fx: -6.85, fz: -25.3 }];

/** A hand of punched brass, flat on a bench or a sill (or, `upright`, pinned to a board): the one card model. */
function punched(g: T.Object3D, flat = true) { if (flat) { box(g, 0, .008, 0, .26, .014, .18, mats.brass); for (let k = 0; k < 6; k++) box(g, -.1 + k * .04, .016, (k % 3 - 1) * .045, .016, .004, .016, mats.dark); } else { box(g, 0, 0, 0, .26, .18, .012, mats.brass); for (let k = 0; k < 6; k++) box(g, -.1 + k * .04, (k % 3 - 1) * .045, .008, .016, .016, .004, mats.dark); } }

export class WardCall {
  /** Say a line to the player now; false if this is not the moment (the ledger is open, the opening is playing). */
  onLine: (line: Line) => boolean = () => false;
  /** What the call has done, for stage V: the roofs have begun to answer (from ~29 s after sending, and always once nothing is live) and the Directorate has taken notice (~32 s). */
  stirred = false; alerted = false;
  /** The order on Finch's yard door, and the two groups the square's answer will go into (stage V): the Embers' response, and the Directorate's. */
  private notice = new T.Group(); private risen = new T.Group(); private mustered = new T.Group();
  /** The relay's own parts, always in the world (the tower is always seen): the shutter on its pin, the card in the frame, the lit lens and the Directorate's seal; and the answering lamps. */
  private leaf = new T.Group(); private seat = new T.Group(); readonly lens = new T.Group(); private halo!: T.Mesh; private sealed = new T.Group(); readonly lamps: T.Group[] = []; private lanternHalos: T.Mesh[] = [];
  /** The one card, carried by hand and never contraband: not covert, not in custody, ignored by the checkpoints. */
  card!: Consignment; private cardTarget!: Target; private relayTarget!: Target; private keyTarget!: Target; private hear = 0;
  /** Transient, in memory only (a reload or a New Game puts the card back on the bench and shuts the shutter): the shutter is open, the card is seated in the relay's frame. */
  private open = false; private seated = false;
  /** The gate's own props (a ledge, a ledger and a pen under the sentry box's window while the order stands), the card lying on the sill, and the card pinned to the box's board once it is signed in; the card is on the sill (transient), the officer's approach line was said, and the seconds until the officer asks if you are certain (0 when not waiting). */
  private sillProps = new T.Group(); private onSill = new T.Group(); private pinned = new T.Group(); private sill = false; private hailed = false; private certain = 0; private near = false; private spoken = false;
  /** Seconds since the lamp was turned up while the sequence is live, else -1 (nothing live: after a reload, or once it is over); the answered toast is given once; the lamps' shade is refreshed once a second. */
  seq = -1; private told = false; private shade = 0;
  /** The square's answer (stage V), baked and toggled by `visible`: the Embers' ribbons (on the stalls' posts and on the Saelspring's cage), chalk and lanterns (`risen`, above), the Directorate's caged gallery lamps (`mustered`, above, each lamp its own group) and the things it places (`placed`: the sealed cellar, trestles and the cordon, the crate of seized lamps, Order 12 on its stand), and the two history scars. The people are workers whose `when` is `peopleOn`. */
  private placed = new T.Group(); private gallery: T.Group[] = []; private yardScar = new T.Group(); private winchScar = new T.Group();
  /** The placed things stand once the Steward has been more than AWAY from the square after signing (`fresh` is that latch, open from signing until then) or at once when nothing is live (a reload): they never appear in front of someone standing at the sentry box. */
  private placedOn = false; private fresh = false; private wasHeld = true; private handSaid = false; private later = false;
  constructor(private pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root); root.add(this.notice, this.risen, this.mustered, this.placed, this.yardScar, this.winchScar, this.leaf, this.seat, this.lens, this.sealed, this.sillProps, this.onSill, this.pinned); this.risen.visible = this.mustered.visible = false;
    // The order, on its own board clear of Work Order 7: the Directorate's header, oxblood strips, and the sheet.
    const p = CALL.plate.split(' • '), n = this.notice; box(n, NOTICE.x, 1.5, NOTICE.z + .03, 1, 1.3, .06, mats.wood); box(n, NOTICE.x, 1.5, NOTICE.z + .07, .8, 1.06, .012, artMats.paper);
    sign(n, p[0], p[1], NOTICE.x, 1.84, NOTICE.z + .086, .72, .3, '#cbbf9f'); for (const dy of [.2, .06, -.08, -.22]) box(n, NOTICE.x, 1.5 + dy, NOTICE.z + .08, .6, .012, .004, mats.dark);
    box(n, NOTICE.x, 1.16, NOTICE.z + .08, .72, .05, .006, O.oxblood); box(n, NOTICE.x + .24, 1.3, NOTICE.z + .08, .14, .14, .006, O.oxblood); bake(n);
    const spot = (id: string, label: string, hint: string, x: number, z: number, w: number, d: number, when: () => boolean, y = 1.1, h = 1.4) => { const t = new T.Mesh(new T.BoxGeometry(w, h, d), unseen); t.position.set(x, y, z); root.add(t); t.updateWorldMatrix(true, false);
      const target = { object: t, id, kind: 'site' as const, label, hint, position: t.getWorldPosition(new T.Vector3()), when }; city.targets.push(target); return target; };
    spot('call.order', 'Movement order', 'READ THE ORDER', NOTICE.x, NOTICE.z + .7, 1.4, 1.4, () => this.shown);
    this.card = new Consignment('call.card', null, 'call.none', root, CARD, g => punched(g),
      () => this.offered && !this.seated && !this.sill, CALL.taken); this.card.waiting.position.y = .91; this.card.name = 'pattern card'; this.card.carryLine = CALL.carrying;
    this.cardTarget = spot('call.card', 'Pattern card', 'TAKE THE CARD', CARD.x, CARD.z, .7, .8, () => this.offered && !this.seated && !this.sill);
    // THE RELAY. On the pedestal under the cap: an iron leaf over the lens's east face on a vertical pin at its north edge (folded back along the north side when open), a brass frame on the lens for the card,
    // the card in it, the lit lens (a bright disc and a halo, after the lamp is turned up), and the Directorate's seal on the pin (oxblood wax, a brass tag, boot marks on the deck) after the card is signed in.
    const rl = new T.Group(), fx = TX + .07; root.add(rl); for (const dz of [-.33, .33]) box(rl, fx, LY, TZ + dz, .035, .46, .035, mats.brass); for (const dy of [-.22, .22]) box(rl, fx, LY + dy, TZ, .035, .035, .64, mats.brass); box(rl, fx, LY - .26, TZ, .05, .04, .74, mats.iron);
    cyl(rl, TX + .16, LY, TZ - 1.02, .04, 2.1, mats.iron); sphere(rl, TX + .16, LY + 1.07, TZ - 1.02, .07, mats.brass);
    // The lamp key: a brass T-handle on a short shaft through an iron plate on the pedestal's east face, well below the ring. Turning it is the one act that sends the call.
    box(rl, TX + .55, TOP + .42, TZ, .03, .22, .22, mats.iron); cyl(rl, TX + .64, TOP + .42, TZ, .022, .18, mats.brass).rotation.z = Math.PI / 2; cyl(rl, TX + .73, TOP + .42, TZ, .024, .22, mats.brass); for (const dy of [-.11, .11]) sphere(rl, TX + .73, TOP + .42 + dy, TZ, .04, mats.brass); bake(rl);
    this.leaf.position.set(TX + .16, LY, TZ - 1.02); cyl(this.leaf, 0, 0, 1.02, .94, .05, O.iron).rotation.z = Math.PI / 2; torus(this.leaf, .03, 0, 1.02, .78, .02, mats.brass).rotation.y = Math.PI / 2; box(this.leaf, .06, 0, 1.78, .05, .5, .06, mats.brass); bake(this.leaf);
    box(this.seat, fx + .018, LY, TZ, .02, .38, .54, mats.brass); for (let k = 0; k < 5; k++) box(this.seat, fx + .03, LY - .12 + (k % 3) * .12, TZ - .2 + k * .1, .008, .035, .035, mats.dark); bake(this.seat);
    const disc = new T.Mesh(new T.CircleGeometry(.68, 28), lensCore); disc.position.set(TX + .035, LY, TZ); disc.rotation.y = Math.PI / 2; this.lens.add(disc); this.halo = sphere(this.lens, TX + .2, LY, TZ, 1.3, lampHalo);
    sphere(this.sealed, TX + .16, LY + .62, TZ - 1.02, .09, O.oxblood).scale.y = .6; box(this.sealed, TX + .22, LY + .62, TZ - 1.02, .015, .12, .1, mats.brass); for (const [dx, dz, ry] of [[1.5, .5, .3], [1.9, -.2, -.2], [1.1, -.9, .6]]) box(this.sealed, TX + dx, TOP + .008, TZ + dz, .16, .012, .38, mats.dark).rotation.y = ry;
    this.relayTarget = spot('call.relay', 'Relay shutter', 'OPEN THE SHUTTER', TX + .35, TZ, .3, 1.9, () => this.shown && (!!this.side || !this.seated), LY, 1.9);
    this.keyTarget = spot('call.lamp', 'The relay lamp', 'AFTER DUSK', TX + .7, TZ, .34, .34, () => this.offered && this.open && this.seated, TOP + .42, .34);
    spot('call.frame', 'Pattern card in the frame', 'TAKE THE CARD BACK', TX + .5, TZ, .1, .5, () => this.offered && this.seated, LY, .34);
    spot('call.watch', 'The Embers’ lookout', 'KEEP WATCH UNTIL DUSK', LOOKOUT.x, LOOKOUT.z, 1.4, 1.9, () => this.offered && !this.economy.state.resist.watch && !callHour(this.economy.state.day) && (this.card.carrying || this.seated), GAL + .55, .8);
    // THE SAEL GATE'S SILL. A ledge under the sentry box's window with a ledger and a pen on it while the order stands; the card lies on the ledge once it is reported, and is pinned to a small board on the box's face once it is signed in.
    const sp = this.sillProps; box(sp, SILL.x + .1, SILL.y - .025, SILL.z, .95, .045, .22, O.iron); box(sp, LEDGER.x, SILL.y + .02, SILL.z, .26, .04, .18, mats.dark); box(sp, LEDGER.x - .12, SILL.y + .02, SILL.z, .02, .042, .18, O.oxblood); box(sp, LEDGER.x, SILL.y + .042, SILL.z, .2, .004, .14, artMats.paper); cyl(sp, LEDGER.x + .06, SILL.y + .06, SILL.z + .02, .008, .16, mats.brass).rotation.z = 1.2; bake(sp);
    punched(this.onSill); this.onSill.position.set(SILL.x, SILL.y, SILL.z); box(this.pinned, BOX.x - .35, 1.35, BOX.z + .6, .5, .6, .03, mats.wood); box(this.pinned, BOX.x - .35, 1.45, BOX.z + .625, .38, .26, .004, artMats.paper); const pc = new T.Group(); pc.position.set(BOX.x - .35, 1.3, BOX.z + .635); punched(pc, false); this.pinned.add(pc); sphere(this.pinned, BOX.x - .35, 1.36, BOX.z + .65, .02, O.oxblood); bake(this.pinned);
    const desk = (id: string, label: string, hint: string, x: number, w: number, when: () => boolean) => spot(id, label, hint, x, BOX.z + .59, w, .12, () => this.officerHere() && when(), SILL.y + .1, .7);
    desk('call.report', 'Sael Gate sentry box', 'REPORT', BOX.x, 1.1, () => this.offered && !this.sill); desk('call.sill', 'Pattern card on the sill', 'TAKE IT BACK', SILL.x, .34, () => this.offered && this.sill); desk('call.ledger', 'The gate ledger', 'SIGN IT IN', LEDGER.x + .02, .3, () => this.offered && this.sill);
    // The answering lamps: each a post, a core and a halo on an existing roof or ledge, unseen until it answers.
    for (const l of LAMPS) { const g = new T.Group(), mast = l.mast ?? .9; g.position.set(l.x, l.y + mast, l.z); cyl(g, 0, -mast / 2, 0, .035, mast, mats.iron); sphere(g, 0, 0, 0, .35, lampCore); sphere(g, 0, 0, 0, 1.1, lampHalo); g.visible = false; root.add(g); this.lamps.push(g); }
    // THE SQUARE'S ANSWER. The Embers' (`risen`, once the roofs have stirred): turquoise ribbons tied on the first two stalls' posts, three chalk Embers (the gate's west pier, the Copper Finch's east wall, the exchange's west wall), a handcart turned across the east lane, and, where the Steward stands, ribbons on the cage round the spring, an Ember chalked before it and three turquoise lanterns on the stalls. No banners, nothing on the gate itself.
    const r = this.risen, rib = fabricOf(ancientMats.turquoise), ember = (x: number, y: number, z: number, ry: number) => { const m = new T.Mesh(new T.PlaneGeometry(.5, .5), decalMat(emberChalk, .9)); m.position.set(x, y, z); m.rotation.y = ry; r.add(m); };
    for (const [x, z] of [[6.93, -20.48], [6.93, -23.52], [8.87, -23.52], [-6.93, -24.48], [-6.93, -27.52], [-8.87, -27.52]]) { box(r, x, 1, z, .05, .55, .1, rib); box(r, x + .03, .78, z - .04, .04, .4, .08, rib); torus(r, x, 1.27, z, .1, .025, rib).rotation.y = Math.PI / 2; }
    ember(-10.8, 2.15, GZ + .71, 0); ember(-13.46, 1.5, -17.4, Math.PI / 2); ember(13.46, 1.5, -18.6, -Math.PI / 2);
    // Ribbons knotted on the Ordinance's cage round the Saelspring: two on the corner posts and two on the top plate rail facing the south approach, one on each side face; the cage's plates run y .65-1.95 and its rails stand .595 off the spring's axis.
    const tie = (x: number, y: number, z: number, ry: number, len: number, d: number, w = .1) => { const t = new T.Group(); t.position.set(x, y, z); t.rotation.y = ry; r.add(t); box(t, 0, 0, 0, .2, .14, d * 2, rib); box(t, -.045, -len / 2 - .07, d + .007, w, len, .014, rib); box(t, .05, -len * .4 - .07, d + .009, w * .9, len * .8, .014, rib).rotation.z = .07; };
    tie(-.56, 1.3, SQ.z + .56, 0, 1.2, .07, .16); tie(.56, 1.3, SQ.z + .56, 0, 1.1, .07, .16); tie(-.42, 1.98, SQ.z + .57, 0, .45, .04); tie(.42, 1.98, SQ.z + .57, 0, .45, .04); tie(-.57, 1.98, SQ.z + .2, -Math.PI / 2, .6, .04); tie(.57, 1.98, SQ.z + .2, Math.PI / 2, .6, .04);
    // One large Ember chalked flat on the paving south of the fountain, the right way up for someone coming from the south, clear of the basin's ring and above the iron plates over the channel.
    { const m = new T.Mesh(new T.PlaneGeometry(1.5, 1.5), decalMat(emberChalk, .9)); m.rotation.x = -Math.PI / 2; m.position.set(SQ.x, .2, -26); r.add(m); }
    { const c = new T.Group(); c.position.set(11.4, 0, -24.8); c.rotation.y = .35; r.add(c); box(c, 0, .55, 0, 1.5, .1, .8, mats.wood); for (const dz of [-.4, .4]) box(c, 0, .72, dz, 1.5, .26, .05, mats.wood); box(c, -.75, .72, 0, .05, .26, .8, mats.wood);
      for (const dz of [-.46, .46]) torus(c, 0, .38, dz, .36, .05, mats.iron); cyl(c, 0, .38, 0, .03, .96, mats.iron).rotation.x = Math.PI / 2; for (const dz of [-.3, .3]) beam(c, new T.Vector3(.75, .6, dz), new T.Vector3(1.7, .15, dz), .035, mats.wood); sphere(c, -.2, .86, .1, .2, mats.cream).scale.y = .7; bake(c); }
    bake(r);
    // Three small turquoise lanterns on the stall counters' inner edge, the same lamp pair as the answering lamps (no real light), where the Steward standing in the south approach can see them: each stands on its stall if the market has grown to it (stalls 2, 3, 4) and otherwise on one of the first two, which always stand. Their halos are put away when the viewer is close.
    for (const [x, z] of LANTERNS.map(l => [l.x, l.z])) { const g = new T.Group(); g.position.set(x, 1.445, z); cyl(g, 0, .03, 0, .07, .06, mats.iron); sphere(g, 0, .15, 0, .11, lampCore); cyl(g, 0, .29, 0, .06, .03, mats.iron); this.lanternHalos.push(sphere(g, 0, .15, 0, .42, lampHalo)); r.add(g); }
    for (const [x, z, yaw] of [[-5.2, -25.6, Math.PI], [-4.4, -26.3, Math.PI], [5, -26, Math.PI], [4.3, -26.8, Math.PI]] as const) pres.addWorker(x, z, yaw, 'watch', { role: z === -25.6 || z === -26 ? 'resident' : 'worker', essential: true, when: () => this.peopleOn });
    // The Directorate's (`mustered`: four caged lamps along the gallery rail, which light in turn after signing) and what it places (`placed`): the cellar boarded and sealed, black-iron trestles across the two lanes and a cordon across the south approach (a 4 m gap kept open), an open crate of seized lamps and mirrors beside the sentry box, Order 12 on a stand before the fountain (never on the banner).
    for (const x of [-8.2, -3.4, 1.6, 8.4]) { const g = new T.Group(); g.position.set(x, 8.85, GZ + .55); g.scale.setScalar(1.6); cyl(g, 0, -.24, 0, .1, .06, O.iron); cyl(g, 0, .24, 0, .12, .05, O.iron); sphere(g, 0, 0, 0, .17, galCore); sphere(g, 0, 0, 0, .38, galHalo); for (const [dx, dz] of [[.14, 0], [-.14, 0], [0, .14], [0, -.14]]) cyl(g, dx, 0, dz, .014, .5, O.iron); bake(g); this.mustered.add(g); this.gallery.push(g); }
    const pl = this.placed, hatch = new T.Group(), seal = CALL.cellar.split(' • '); hatch.position.set(CELLAR.x, .52, CELLAR.z); hatch.rotation.z = -.38; pl.add(hatch); for (const k of [-1, 1]) beam(hatch, new T.Vector3(-.62, .1, -.66 * k), new T.Vector3(.62, .1, .66 * k), .045, mats.wood);
    for (const dz of [-.55, .55]) box(hatch, 0, .1, dz, 1.4, .05, .16, mats.wood); sphere(hatch, 0, .16, 0, .13, O.oxblood).scale.y = .45; { const plate = sign(hatch, seal[0], seal[1], 0, .2, .38, .9, .3, '#cbbf9f'); plate.rotation.x = -Math.PI / 2; }
    const trestle = (x: number, z: number, w = 3) => { box(pl, x, .92, z, w, .14, .1, O.iron); box(pl, x, .6, z, w, .07, .07, O.iron); for (const dx of [-w / 2 + .3, w / 2 - .3]) for (const k of [-1, 1]) beam(pl, new T.Vector3(x + dx, 0, z - .38 * k), new T.Vector3(x + dx, .95, z), .05, O.iron); for (let dx = -w / 2 + .55; dx < w / 2 - .3; dx += 1.3) box(pl, x + dx, .92, z + .06, .6, .15, .02, O.oxblood); city.collider(x, z, w, .5, 1, undefined, () => !pl.visible); };
    trestle(-11, -28.2); trestle(11, -28.2); trestle(-4, -24.5, 4); trestle(4, -24.5, 4);
    crate(pl, 9.3, 0, -32.75, .8); for (const [dx, dz] of [[-.2, -.1], [.1, .12], [.22, -.15]]) { cyl(pl, 9.3 + dx, .95, -32.75 + dz, .06, .22, mats.brass); sphere(pl, 9.3 + dx, 1.1, -32.75 + dz, .07, mats.brass); } for (const [dx, tilt] of [[-.28, .5], [.3, -.45]]) { const m = cyl(pl, 9.3 + dx, 1.05, -32.75, .22, .02, mirror); m.rotation.z = tilt; m.rotation.x = Math.PI / 2 - .2; } city.collider(9.3, -32.75, .9, .9, .9, undefined, () => !pl.visible);
    // Order 12 on its own black-iron stand in the south approach by the fountain, facing the Steward as he arrives (never on the gallery's banner): the Directorate's plate, bone on dark, over an oxblood rule.
    { const h = CALL.hoarding.split(' • '), x = 2.6, z = -26.2; for (const dx of [-.55, .55]) { cyl(pl, x + dx, .95, z, .035, 1.9, O.iron); box(pl, x + dx, .03, z, .12, .06, .6, O.iron); } box(pl, x, 1.5, z, 1.3, .8, .05, O.iron); sign(pl, h[0], h[1], x, 1.52, z + .036, 1.14, .62, '#cbbf9f'); box(pl, x, 1.15, z + .032, 1.2, .05, .01, O.oxblood); box(pl, x, 1.87, z + .032, 1.2, .03, .01, O.oxblood); city.collider(x, z, 1.3, .3, 1.9, undefined, () => !pl.visible); }
    bake(pl);
    // The history scars: an oxblood stamp across Finch's work-order board on the yard door (an ordinance tilt, then the Embers), and two chalk-white strokes crossing through the Ember on the winch's north face (an Embers tilt, then the Directorate).
    { const y = this.yardScar; const strip = box(y, YARD.x, 1.5, YARD.z + .075, .76, .17, .012, O.oxblood); strip.rotation.z = -.1; const tag = sign(y, CALL.yard, '', YARD.x, 1.5, YARD.z + .085, .7, .14, '#cbbf9f'); tag.rotation.z = -.1; bake(y); }
    for (const rz of [.8, -.8]) box(this.winchScar, WINCH.x + .16, TERRACE + .2, WINCH.z - .41 - .02, .4, .03, .006, strike).rotation.z = rz; bake(this.winchScar);
    // The old relay plaque (weatherside.ts) says the Ordinance never found the way up, which a sealed relay contradicts: that one target is unavailable after an ordinance commitment and is exactly as it was otherwise.
    const old = city.targets.find(t => t.id === 'weathervane'); if (old) { const was = old.when; old.when = () => this.side !== 'ordinance' && (was?.() ?? true); }
    this.sync();
  }
  private get economy() { return this.pres.city.economy; }
  private get alignment() { return this.economy.state.alignment; }
  private get side(): Side | null { return this.alignment.commit?.side ?? null; }
  /** The call is on offer: both sites settled, nothing committed, the square still held. Nothing else makes it so. */
  get offered() { const s = this.economy.state; return callOffered(s.alignment, s.sites.market, SITE_LIBERATED); }
  /** The square is still held: the officer exists and the square's own layers (liberated, restored) have not taken it over. Everything of the square's answer stands down when it is not. */
  private get held() { return this.economy.state.sites.market < SITE_LIBERATED; }
  /** The Embers' people stand at the lanes (while the roofs have stirred, a resistance commitment and the square held), and the garrison's crackdown posts in the market district turn out for a commitment of either side once the Directorate has taken notice. */
  get peopleOn() { return this.held && this.side === 'resistance' && this.stirred; }
  get turnedOut() { return this.held && !!this.side && this.alerted; }
  /** The Finch cellar stands boarded and sealed (the placed things are up): its KNOCK (market-square.ts) is not offered while this is so, and is exactly as it was otherwise. */
  get cellarSealed() { return this.placed.visible; }
  /** The notice and the relay's targets stand while the call is offered or once it is settled (committed); never otherwise. */
  private get shown() { return this.offered || !!this.alignment.commit; }
  /** E on something of the call's: what it says, and the stage it moves. Null if there is nothing to say. */
  use(id: string): string | null {
    if (id === 'call.order') { if (!this.shown) return null; this.economy.advanceCall(1); return CALL.orderToast; }
    if (id === 'call.relay') {
      if (!this.shown) return null; if (this.side) return this.side === 'resistance' ? CALL.relayAfter : CALL.sealed; if (this.seated) return null;
      if (!this.open) { this.open = true; this.refresh(); return CALL.shutterOpen; }
      if (this.card.carrying) { this.card.drop(); this.seated = true; this.refresh(); return CALL.seated; } this.open = false; this.refresh(); return CALL.shutterClosed;
    }
    // The lamp key, on the pedestal well below the ring, is the one resistance commit path and nothing else sends: only if the economy takes it does anything else happen.
    if (id === 'call.lamp') { if (!this.offered || !this.open || !this.seated) return null; if (!callHour(this.economy.state.day)) return CALL.byDay; if (!this.economy.commit('resistance', 'call.sent')) return null; this.begin(); return CALL.sent; }
    if (id === 'call.frame') { if (!this.offered || !this.seated) return null; this.seated = false; const refusal = this.card.take(); if (refusal) { this.seated = true; return refusal; } this.refresh(); return CALL.lifted; }
    if (id === 'call.watch') { if (!this.offered || this.economy.state.resist.watch || callHour(this.economy.state.day) || !(this.card.carrying || this.seated)) return null; return this.economy.watchUntilDusk() ? CALL.watch : null; }
    // The gate. The officer must be there to be reported to and to see the signature; nothing here moves the commitment but the signature itself.
    if (id === 'call.report') { if (!this.offered || this.sill || !this.officerHere()) return null; if (!this.card.carrying) { this.say(CALL.officer.empty); return null; }
      this.card.drop(); this.sill = true; this.certain = 2.5; this.say(CALL.officer.offered); this.refresh(); return null; }
    if (id === 'call.sill') { if (!this.offered || !this.sill || !this.officerHere()) return null; this.sill = false; this.certain = 0; const refusal = this.card.take(); if (refusal) { this.sill = true; return refusal; } this.say(CALL.officer.back); this.refresh(); return null; }
    if (id === 'call.ledger') { if (!this.offered || !this.sill || !this.officerHere()) return null;
      // The one ordinance commit path: only if the economy takes it does anything else happen.
      if (!this.economy.commit('ordinance', 'call.reported')) return null; this.sill = false; this.certain = 0; this.begin(); this.say(CALL.officer.signed[crossing(this.alignment) ?? 'open']); return CALL.signedToast; }
    return null;
  }
  /** The officer at the Sael Gate (a posted worker) is in the world. Without him nobody can be reported to and nothing is offered at the sill. */
  private officerHere() { return this.pres.workers[this.pres.marketSquare.officer].person.group.visible; }
  /** The officer speaks only while he is there and within earshot: no speaker, no line. */
  private say(text: string) { if (this.near) this.onLine({ who: 'Gate officer', text }); }
  /** Everything the call shows is worked out here from the state, so a reload, a New Game or a liberated square all land in the same place: transient state (the card in the arms or in the frame, the shutter) is dropped whenever the call is neither on offer nor committed, and a commitment with nothing live shows its end state at once. */
  sync() { const c = this.alignment.commit; this.notice.visible = this.shown; this.hear = 0; if (this.seq >= 0 && !this.held) this.seq = -1; if (!this.offered) this.card.drop();
    if (c) { this.sill = false; this.certain = 0; if (this.seq < 0) this.open = this.seated = c.side === 'resistance'; if (!this.fresh) this.placedOn = c.side === 'ordinance'; } else { this.fresh = this.placedOn = false; if (!this.offered) this.clear(); }
    this.refresh(); }
  /** The call is neither on offer nor committed: nothing of it is in progress. */
  private clear() { this.open = this.seated = this.sill = false; this.certain = 0; this.seq = -1; this.card.drop(); }
  /** The lamp has just been turned up: the sequence starts from a dark lens and no answers. */
  private begin() { this.seq = 0; this.told = false; this.fresh = this.side === 'ordinance'; this.placedOn = false; this.refresh(); }
  /** Pose the relay without the economy, for review: 0 shut, 1 shutter open, 2 card seated. Only while the call is on offer. */
  pose(step: number) { if (!this.offered) return; this.open = step >= 1; this.seated = step >= 2; if (this.seated) this.card.drop(); this.refresh(); }
  /** Lay the card on the gate's sill without the officer, for review. */
  poseSill(on: boolean) { if (!this.offered) return; this.sill = on; if (on) this.card.drop(); this.refresh(); }
  /** Put the shutter, the card, the lens, the lamps and the seal where the state and the sequence say. */
  private refresh() { const side = this.side, res = side === 'resistance', live = this.seq >= 0, lit = lampsLit(this.seq);
    this.leaf.rotation.y = this.open ? -Math.PI / 2 : 0; this.seat.visible = this.seated; this.sealed.visible = this.pinned.visible = side === 'ordinance'; this.onSill.visible = this.sill; this.sillProps.visible = this.offered || side === 'ordinance'; this.lens.visible = res && (!live || lensOn(this.seq));
    for (let i = 0; i < this.lamps.length; i++) this.lamps[i].visible = res && (!live || i < lit); this.stirred = this.alerted = !!side && !live; this.dress(); this.dim(); }
  /** The square's answer and the scars, from the state: nothing of the square's stands once it is not held; the scars and the relay do not depend on it. */
  private dress() { const side = this.side, held = this.held, live = this.seq >= 0, lit = musterLit(this.seq), how = crossing(this.alignment);
    this.risen.visible = held && side === 'resistance' && this.stirred; this.mustered.visible = held && side === 'ordinance'; for (let i = 0; i < this.gallery.length; i++) this.gallery[i].visible = !live || i < lit; this.placed.visible = held && side === 'ordinance' && this.placedOn;
    this.yardScar.visible = side === 'resistance' && how === 'crossed'; this.winchScar.visible = side === 'ordinance' && how === 'crossed' && this.alignment.outcomes.finchRun === 'resistance'; }
  /** By day the lamps are dimmer, by night they are at full: the one pair of materials, set from the clock. */
  private dim() { const h = this.economy.state.day * 24, dark = h >= 19 || h < 5 ? 1 : h >= 17 || h < 7 ? .5 : 0; lampHalo.opacity = .12 + .22 * dark; lampCore.color.lerpColors(DAY_CORE, NIGHT_CORE, dark); lensCore.color.lerpColors(LENS_DAY, LENS_NIGHT, dark); }
  update(dt: number, _time: number, viewer: T.Vector3) {
    if (!this.shown && (this.open || this.seated || this.sill)) { this.clear(); this.refresh(); }
    const card = this.card; card.update(); this.cardTarget.hint = card.carrying ? 'PUT IT BACK' : 'TAKE THE CARD';
    this.keyTarget.hint = callHour(this.economy.state.day) ? 'SEND THE CALL' : 'AFTER DUSK'; const side = this.side; this.relayTarget.hint = relayHint(side, this.open, this.seated, card.carrying, this.economy.state.day); this.relayTarget.label = side ? (side === 'resistance' ? 'The lit relay' : 'Sealed relay') : this.open ? 'Relay lens' : 'Relay shutter';
    // The send-and-answer sequence is the only per-frame work, and only while it is live; the lamps' shade follows the clock once a second.
    if (this.seq >= 0) { this.seq += dt; const t = this.seq, res = side === 'resistance', pace = res ? CALL_PACE : MUSTER;
      if (res) { this.lens.visible = lensOn(t); const lit = lampsLit(t); for (let i = 0; i < this.lamps.length; i++) this.lamps[i].visible = i < lit; if (t >= CALL_PACE.answered && !this.told) { this.told = true; this.pres.city.onEvent(CALL.answered); } }
      this.stirred = t >= pace.stirred; this.alerted = t >= pace.alerted; if (this.alerted) { this.seq = -1; this.refresh(); } else this.dress(); }
    // The Directorate's placed things stand once the Steward has been away from the square after signing; the latch is only open from signing until then.
    if (this.fresh && Math.hypot(viewer.x - SQ.x, viewer.z - SQ.z) > AWAY) { this.fresh = false; this.placedOn = true; this.dress(); }
    const held = this.held; if (held !== this.wasHeld) { this.wasHeld = held; if (!held && this.seq >= 0) { this.seq = -1; this.refresh(); } else this.dress(); }
    if (side === 'resistance') { this.shade -= dt; if (this.shade <= 0) { this.shade = 1; this.dim(); this.halo.visible = Math.hypot(viewer.x - TX, viewer.y - LY, viewer.z - TZ) > FAR; for (const l of this.lamps) l.children[2].visible = Math.hypot(viewer.x - l.position.x, viewer.y - l.position.y, viewer.z - l.position.z) > CLOSE; const built = (this.pres as { stalls?: number }).stalls ?? 6; for (let i = 0; i < LANTERNS.length; i++) { const l = LANTERNS[i], on = built >= l.min, g = this.lanternHalos[i].parent!; g.position.x = on ? l.x : l.fx; g.position.z = on ? l.z : l.fz; this.lanternHalos[i].visible = Math.hypot(viewer.x - g.position.x, viewer.y - g.position.y - .15, viewer.z - g.position.z) > 4; } } }
    // The officer is heard only while he is there and near; he says his one word on each approach and, a moment after the card is put down, asks whether you are certain.
    const here = this.shown && this.officerHere(), po = here ? this.pres.workers[this.pres.marketSquare.officer].person.group.position : null, dist = po ? Math.hypot(viewer.x - po.x, viewer.z - po.z) : 99; this.near = dist < NEAR; const how = crossing(this.alignment);
    if (side === 'resistance' && how === 'crossed') { if (!here || dist > 16) this.later = false; else if (this.near && viewer.y < 4 && !this.later && this.onLine({ who: 'Gate officer', text: CALL.officer.later })) this.later = true; }
    if (this.sill && this.certain > 0) { this.certain -= dt; if (this.certain <= 0) { this.certain = 0; this.say(CALL.officer.certain); } }
    if (this.offered && here) { if (dist > 16) this.hailed = false; else if (this.near && viewer.y < 4 && !this.hailed && this.onLine({ who: 'Gate officer', text: CALL.officer.approach })) this.hailed = true; } else this.hailed = false;
    // After a commitment the hand says how it looks to him, once per approach, only while he is there (Finch's own greetings are silent now: `leaning` is null once committed, and his order line is not offered).
    if (side && how) { const hg = this.pres.workers[this.pres.finchRun.hand].person.group, hd = hg.visible ? Math.hypot(viewer.x - hg.position.x, viewer.z - hg.position.z) : 99; if (hd > 14) this.handSaid = false; else if (hd < 4.5 && !this.handSaid && this.onLine({ who: 'Finch’s hand', text: CALL.hand[side][how] })) this.handSaid = true; } else this.handSaid = false;
    // The hand says it once, to someone standing at the bench who is not in a menu, and after Finch's own greeting (the hover line of the yard) has had its moment.
    if (!this.offered || this.economy.state.resist.call !== 0) { this.hear = 0; this.spoken = false; return; }
    const hand = this.pres.workers[this.pres.finchRun.hand].person.group, near = hand.visible ? Math.hypot(viewer.x - hand.position.x, viewer.z - hand.position.z) : 99;
    // Heard, the stage moves on only once the Steward has walked away from the hand: any resist event re-arms Finch's own greeting (FinchRun.sync), which would otherwise talk over this line.
    if (this.spoken) { if (near > 6) { this.spoken = false; this.economy.advanceCall(1); } return; }
    this.hear = near < 4 ? this.hear + dt : 0;
    if (this.hear > 3 && this.onLine({ who: 'Finch’s hand', text: handOfferLine(leaning(this.alignment)) })) { this.hear = 0; this.spoken = true; }
  }
}
