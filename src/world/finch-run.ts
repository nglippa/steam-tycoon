import * as T from 'three';
import { box, cyl, sphere, torus, beam, sign, bake, mats } from './assets';
import { V, artMats } from './art-kit';
import { unseen, ladder, parapet } from './routes';
import { Consignment } from './logistics';
import { occupationMats, ancientMats, decalMat, emberChalk } from './factions';
import { leaning, runOpen, type Side } from '../simulation/alignment';
import { FINCH, acknowledgement, benchOffer, canBypass, finchOffered, handLine } from '../simulation/resist';
import type { Line } from '../simulation/intro';
import type { Presentation } from './presentation';
import type { Target } from './city';

/** Service Run 7 (simulation/resist.ts, FINCH): the Directorate's maintenance gantry hung on Finch Mechanical's street face at terrace height, joining the two
 * terraces without crossing the block, and the maintenance ladder from the Great Main's west pavement up to its south end. One winch and latch box on the south
 * terrace holds the ladder's lower flight hoisted and both grilles shut. The world reads the OUTCOME of the site and never the stage: base is shut, anything else
 * is open. The stage only decides what Finch's yard offers. A resistance group and an ordinance group wait, empty, for the dressing each side leaves. */
const TERRACE = 14.45, G = .18, X0 = -13.3, X1 = -11.5, Z0 = 7.6, Z1 = 19.9, XC = (X0 + X1) / 2, N_GAP = [7.9, 9.5], S_GAP = [18, 19.6];
/** The winch on the south terrace beside the south gap, and Finch's yard: the bench where the part is collected, the work order beside it, and the hand. */
const WINCH = { x: -13.95, z: 20.6 }, BENCH = { x: -16.4, z: 23.5 }, NOTICE = { x: -19.2, z: 22.7 }, HAND = { x: -16.4, z: 25 }, HOISTED = 3.4;
const O = occupationMats, GRILLE = 1.8, chalk = decalMat(emberChalk, .92), lampMat = new T.MeshBasicMaterial({ color: '#f3d58a' }), haloMat = new T.MeshBasicMaterial({ color: '#e8c070', transparent: true, opacity: .22, depthWrite: false });
/** One flight of the ladder, drawn like routes.ladder's: rails, rungs, and hoops on a long climb. Drawing only; the real ladder is registered once, below. */
function flight(g: T.Object3D, x: number, z: number, y0: number, y1: number) {
  const head = y1 + 1.15, UP = new T.Vector3(0, 1, 0), across = new T.Vector3(1, 0, 0), lz = z + .1;
  for (const s of [-.27, .27]) cyl(g, x + s, (y0 + head) / 2, lz, .035, head - y0, mats.iron);
  for (let y = y0 + .3; y < head - .1; y += .32) cyl(g, x, y, lz, .022, .54, mats.iron).quaternion.setFromUnitVectors(UP, across);
  if (y1 - y0 > 6) for (let y = y0 + 2.6; y < y1 + .6; y += 1.5) torus(g, x, y, lz + .34, .36, .018, mats.iron).rotation.x = Math.PI / 2;
}
/** A Directorate grille over a gap in the street parapet: a frame, bars, and the oxblood seal on the latch. Faces east, in the plane of the parapet. */
function grille(g: T.Object3D, [a, b]: number[]) {
  const c = (a + b) / 2, w = b - a; box(g, X0, TERRACE + .06, c, .08, .12, w, O.iron); box(g, X0, TERRACE + 1.7, c, .08, .08, w, O.iron); box(g, X0, TERRACE + 1.0, c, .06, .05, w, O.iron);
  for (let z = a + .1; z < b; z += .2) box(g, X0, TERRACE + .9, z, .04, 1.7, .04, O.iron);
  box(g, X0 + .06, TERRACE + .72, c, .06, .16, .16, O.oxblood);
}

export class FinchRun {
  /** Say a line to the player now; false if this is not the moment (the ledger is open, the opening is playing). */
  onLine: (line: Line) => boolean = () => false;
  /** What the outcome and nothing else shows: shut (grilles, hoisted lower flight, seals), open (the lowered flight), and a place each side's dressing will go. */
  private shut = new T.Group(); private lowered = new T.Group(); private resistance = new T.Group(); private ordinance = new T.Group(); private yard = new T.Group(); private offer = new T.Group();
  /** The one part the bench gives: the hand's release taken covertly, or the Directorate's governor signed for. */
  part!: Consignment; private winchTarget!: Target; private releaseTarget!: Target; private orderTarget!: Target;
  /** What sync() works out once: the side the Steward leans to and the line it earns, the gate desk's place, the crew's line. Nothing in update() searches or allocates. */
  private side: Side | null = null; private ack: string | null = null; private desk: T.Vector3 | null = null; private ordinanceRun = false; private crewLine = ''; private foot = new T.Vector3(XC, G, Z1 + .95);
  private hand: number; private hear = 0; private warm = false; private recognised = false; private crewSaid = false;
  constructor(private pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root); root.add(this.shut, this.lowered, this.resistance, this.ordinance, this.yard, this.offer);
    const gantry = new T.Group(); root.add(gantry);
    // The gantry: an iron deck on two stringers, braced back to the wall on brass bosses, a rail along the street and across the north end. The wall shows between the braces.
    city.deck(X0, X1, Z0, Z1, TERRACE);
    for (let z = Z0; z < Z1 - .01; z += .3) box(gantry, XC, TERRACE - .05, z + .14, X1 - X0, .1, .27, mats.wood); for (let z = Z0 + .2; z < Z1; z += 1.2) box(gantry, XC, TERRACE - .15, z, X1 - X0 + .06, .1, .08, mats.iron);
    for (const x of [X0 + .2, X1 - .2]) box(gantry, x, TERRACE - .3, (Z0 + Z1) / 2, .1, .24, Z1 - Z0 - .1, mats.iron);
    for (const z of [9.2, 13.5, 17.8]) { beam(gantry, V(X0, TERRACE - 1.9, z), V(X1 - .2, TERRACE - .36, z), .045, mats.iron); box(gantry, X0 + .03, TERRACE - 1.9, z, .08, .24, .24, mats.brass); box(gantry, X0 + .03, TERRACE - .3, z, .08, .24, .24, mats.brass); }
    parapet(gantry, city, X1, Z0, X1, Z1, TERRACE, mats.iron, false); parapet(gantry, city, X0, Z0, X1, Z0, TERRACE, mats.iron, false);
    // The ladder comes up through a gap in the south end rail, as the other ladders come up through theirs.
    parapet(gantry, city, X0, Z1, XC - .45, Z1, TERRACE, mats.iron, false); parapet(gantry, city, XC + .45, Z1, X1, Z1, TERRACE, mats.iron, false);
    const plate = FINCH.plate.split(' • '), board = sign(gantry, plate[0], `${plate[1]} • ${plate[2]}`, X1 + .06, TERRACE + .55, 14, 1.4, .46, '#cbbf9f'); board.rotation.y = Math.PI / 2; bake(gantry);
    // The south end's ladder gap has a hinged safety bar on a chain, so nobody walks off the end. The north end is screened while shut, too tall to jump from the Leads landing.
    box(gantry, XC - .45, TERRACE + .9, Z1, .06, .1, .06, mats.brass); box(gantry, XC, TERRACE + .95, Z1, .9, .05, .05, mats.iron); beam(gantry, V(XC + .45, TERRACE + .95, Z1), V(XC + .45, TERRACE + .3, Z1), .012, mats.iron);
    city.collider(XC, Z1, .9, .3, TERRACE + 1.1, undefined, undefined, TERRACE - .2);
    box(this.shut, XC, TERRACE + .06, Z0, X1 - X0, .12, .08, O.iron); box(this.shut, XC, TERRACE + 1.7, Z0, X1 - X0, .08, .08, O.iron); for (let x = X0 + .1; x < X1; x += .2) box(this.shut, x, TERRACE + .9, Z0, .04, 1.7, .04, O.iron);
    city.collider(XC, Z0, X1 - X0, .3, TERRACE + GRILLE, undefined, () => runOpen(this.outcome), TERRACE - .2);
    // The grilles over the two gaps in the terraces' street parapets. Shut they are walls; open they are gone.
    for (const gap of [N_GAP, S_GAP]) { grille(this.shut, gap); city.collider(X0, (gap[0] + gap[1]) / 2, .3, gap[1] - gap[0], TERRACE + GRILLE, undefined, () => runOpen(this.outcome), TERRACE - .2); }
    // The ladder: the lower flight hoisted ~3 m up on its chain and padlocked while shut, lowered to the pavement once open. Only the lowered one can be climbed.
    flight(this.shut, XC, Z1, HOISTED, TERRACE); for (const s of [-.27, .27]) beam(this.shut, V(XC + s, HOISTED, Z1 + .1), V(XC + s * 1.8, TERRACE - 1.6, Z1 + .1), .012, mats.iron); box(this.shut, XC, HOISTED + .12, Z1 + .16, .22, .18, .08, O.oxblood);
    ladder(this.lowered, root, city, 'ladder.finch.run', 'Service Run 7 ladder', XC, Z1, G, TERRACE, 0, 1, mats.iron, undefined, () => runOpen(this.outcome)); bake(this.lowered);
    // The winch and latch box: a drum on iron cheeks, the chain over the parapet to the ladder, and a governor housing under an oxblood seal while shut.
    const winch = new T.Group(); root.add(winch); box(winch, WINCH.x, TERRACE + .5, WINCH.z, .7, 1, .8, mats.iron); cyl(winch, WINCH.x - .1, TERRACE + 1.15, WINCH.z, .17, .72, mats.dark).rotation.x = Math.PI / 2;
    torus(winch, WINCH.x - .1, TERRACE + 1.15, WINCH.z + .38, .2, .03, mats.brass); box(winch, WINCH.x + .2, TERRACE + 1.15, WINCH.z - .46, .08, .08, .24, mats.brass);
    beam(winch, V(WINCH.x + .2, TERRACE + 1.1, WINCH.z - .4), V(XC, TERRACE + .9, Z1 - .2), .014, mats.iron); city.collider(WINCH.x, WINCH.z, .7, .8, TERRACE + 1.4, undefined, undefined, TERRACE - .2);
    box(this.shut, WINCH.x - .2, TERRACE + .2, WINCH.z - .43, .26, .26, .08, O.iron); box(this.shut, WINCH.x - .2, TERRACE + .2, WINCH.z - .48, .12, .1, .03, O.oxblood);
    const face = sign(winch, plate[0], `${plate[1]} • ${plate[2]}`, WINCH.x, TERRACE + .62, WINCH.z - .41, .64, .4, '#cbbf9f'); face.rotation.y = Math.PI; bake(winch); bake(this.shut); this.dress(root, plate);
    const hit = new T.Mesh(new T.BoxGeometry(1.3, 1.5, 1.3), unseen); hit.position.set(WINCH.x, TERRACE + .75, WINCH.z); root.add(hit); hit.updateWorldMatrix(true, false);
    city.targets.push({ object: hit, id: 'finch.winch', kind: 'site', label: 'Winch, Service Run 7', hint: 'EXAMINE', position: hit.getWorldPosition(new T.Vector3()), when: () => !runOpen(this.outcome) });
    // Finch's own yard furniture, always: the bench under the south wall and the board beside it. Only what the offers put on them (the order, the governor, the part) comes and goes.
    const y = this.yard; box(y, BENCH.x, .86, BENCH.z, 1.9, .1, .8, mats.wood); for (const dx of [-.85, .85]) for (const dz of [-.32, .32]) box(y, BENCH.x + dx, .42, BENCH.z + dz, .08, .84, .08, mats.wood);
    box(y, BENCH.x - .55, .98, BENCH.z, .16, .14, .2, mats.iron); cyl(y, BENCH.x + .1, .96, BENCH.z + .2, .05, .08, mats.iron); box(y, BENCH.x + .2, .93, BENCH.z - .25, .3, .03, .2, artMats.paper);
    // The governor under the Directorate's stamp, on the right of the bench: signed for, never taken without a name.
    const gov = this.offer; cyl(gov, BENCH.x + .55, 1, BENCH.z, .11, .2, O.iron); cyl(gov, BENCH.x + .55, 1.03, BENCH.z, .115, .05, O.oxblood);
    city.collider(BENCH.x, BENCH.z, 1.9, .8, 1.1);
    box(y, NOTICE.x, 1.5, NOTICE.z + .03, .8, 1.1, .06, mats.wood); bake(y);
    box(gov, NOTICE.x, 1.5, NOTICE.z + .07, .6, .84, .012, artMats.paper); for (const dy of [.24, .08, -.08]) box(gov, NOTICE.x, 1.5 + dy, NOTICE.z + .08, .44, .012, .004, mats.dark); box(gov, NOTICE.x + .16, 1.2, NOTICE.z + .08, .16, .16, .006, O.oxblood); bake(gov);
    // The bench is two targets, as Rook's collection is: the left end is the hand's pawl release (taken covertly, from the first word of the pawl); the right end is the Directorate's governor (signed for, lawful).
    // The part is one Consignment either way; how it was taken, and nothing else, decides which deed the winch records.
    const spot = (id: string, label: string, hint: string, x: number, z: number, w: number, d: number, when: () => boolean) => { const t = new T.Mesh(new T.BoxGeometry(w, 1.4, d), unseen); t.position.set(x, 1.1, z); root.add(t); t.updateWorldMatrix(true, false);
      const target = { object: t, id, kind: 'site' as const, label, hint, position: t.getWorldPosition(new T.Vector3()), when }; city.targets.push(target); return target; };
    spot('finch.notice', 'Work order', 'READ THE ORDER', NOTICE.x, NOTICE.z + .7, 1.6, 1.4, () => this.offered);
    this.part = new Consignment('finch.part', null, 'finch.winch', root, { x: BENCH.x - .5, z: BENCH.z }, g => { cyl(g, 0, .15, 0, .03, .3, mats.brass).rotation.z = Math.PI / 2; box(g, .15, .1, 0, .12, .2, .1, mats.brass); },
      () => this.offered, FINCH.released, () => benchOffer(this.stage, this.greatMain, this.level, this.outcome).release === 'wait' ? FINCH.wait : null, () => this.receive());
    this.part.waiting.position.y = .91; this.part.name = 'release'; this.part.covert = true; this.part.carryLine = FINCH.releaseCarrying; this.part.custodyLine = FINCH.governorCarrying;
    this.releaseTarget = spot('finch.part', 'Finch’s bench', 'TAKE THE RELEASE', BENCH.x - .5, BENCH.z, 1, 1.2, () => this.offered);
    this.orderTarget = spot('finch.order', 'Directorate governor', 'SIGN FOR THE GOVERNOR', BENCH.x + .55, BENCH.z, .9, 1.2, () => this.offered && (this.part.carrying || benchOffer(this.stage, this.greatMain, this.level, this.outcome).governor));
    this.winchTarget = city.targets.find(t => t.id === 'finch.winch')!;
    this.hand = pres.addWorker(HAND.x, HAND.z, Math.PI, 'repair', { role: 'worker', essential: true, when: () => this.present });
  }
  /** What each side leaves on the run, built once and baked, shown by the outcome alone, and put on the faces the terrace sees (north and west) as well as the street's. The resistance's is small and covert: a brass release wedged in the winch, a cut lock, an ember in chalk, the Directorate's plate scratched, turquoise thread at the ladder head and on its lowest rung. The ordinance's is exact: a black-iron governor with an oxblood band and the brass plate, a caged lamp (an emissive only, no light), the number on the gantry plate and an enamel tag at each grille post. */
  private dress(root: T.Group, plate: string[]) {
    const r = this.resistance, o = this.ordinance, WX = WINCH.x, WZ = WINCH.z - .41, flip = Math.PI;
    cyl(r, WX + .1, TERRACE + .86, WZ - .03, .022, .46, mats.brass).rotation.z = Math.PI / 2; box(r, WX + .34, TERRACE + .86, WZ - .035, .07, .12, .05, mats.brass); box(r, WX - .13, TERRACE + .86, WZ - .035, .05, .05, .05, mats.brass);
    box(r, WX - .24, TERRACE + .3, WZ - .03, .1, .12, .05, mats.iron); torus(r, WX - .24, TERRACE + .47, WZ - .03, .05, .009, mats.iron); beam(r, V(WX - .24, TERRACE + .36, WZ - .03), V(WX - .24, TERRACE + .43, WZ - .03), .009, mats.iron);
    const m = new T.Mesh(new T.PlaneGeometry(.26, .26), chalk); m.rotation.y = flip; m.position.set(WX + .16, TERRACE + .2, WZ - .008); r.add(m);
    for (const [dx, rz] of [[-.1, .6], [.14, -.5]]) { const b = box(r, WX + dx, TERRACE + .62, WZ - .012, .32, .018, .004, mats.dark); b.rotation.z = rz; }
    for (const x of [XC + .27]) { torus(r, x, TERRACE + 1.05, Z1 + .1, .05, .006, ancientMats.turquoise); for (const dz of [.03, -.03]) beam(r, V(x, TERRACE + 1, Z1 + .1), V(x + dz * 2, TERRACE + .78, Z1 + .1 + dz), .004, ancientMats.turquoise); }
    torus(r, XC + .27, G + .48, Z1 + .1, .045, .007, ancientMats.turquoise); for (const dx of [.03, -.02]) beam(r, V(XC + .27, G + .46, Z1 + .1), V(XC + .27 + dx, G + .26, Z1 + .1 + dx), .004, ancientMats.turquoise);
    bake(r);
    // The governor on the north face (the terrace's, and the water tank hides the west one), an oxblood band round it, and the brass plate beside it, under the Directorate's.
    cyl(o, WX - .2, TERRACE + .2, WZ - .06, .11, .2, mats.dark).rotation.x = Math.PI / 2; cyl(o, WX - .2, TERRACE + .2, WZ - .09, .125, .06, O.oxblood).rotation.x = Math.PI / 2; sphere(o, WX - .2, TERRACE + .2, WZ - .17, .03, mats.brass);
    const brass = sign(o, plate[0], FINCH.certifiedPlate.split(' • ').slice(1).join(' • '), WX + .16, TERRACE + .2, WZ - .012, .34, .22, '#e8c070'); brass.rotation.y = flip;
    const seven = sign(o, '7', '', X1 + .1, TERRACE + .55, 14.4, .3, .3, '#e8c070'); seven.rotation.y = Math.PI / 2;
    // The caged lamp on a bracket at the ladder head: base, cap, four bars round an emissive core and a faint halo, so the street can read it at night.
    const lx = XC - .75, ly = TERRACE + 1.35; box(o, lx, TERRACE + 1.1, Z1, .04, .6, .04, O.iron); beam(o, V(lx, TERRACE + 1.35, Z1), V(lx + .22, TERRACE + 1.35, Z1 + .1), .015, O.iron);
    const lamp = new T.Group(); lamp.position.set(lx + .22, ly, Z1 + .1); o.add(lamp); cyl(lamp, 0, -.11, 0, .05, .04, O.iron); cyl(lamp, 0, .11, 0, .06, .03, O.iron); sphere(lamp, 0, 0, 0, .06, lampMat); sphere(lamp, 0, 0, 0, .11, haloMat);
    for (const [dx, dz] of [[.07, 0], [-.07, 0], [0, .07], [0, -.07]]) cyl(lamp, dx, 0, dz, .007, .22, O.iron);
    // The enamel tag, oxblood with a brass seven, on the terrace face of the stone beside each grille.
    for (const z of [9.7, 19.8]) { box(o, X0 - .165, TERRACE + .45, z, .03, .22, .22, O.oxblood); const t = sign(o, '7', '', X0 - .185, TERRACE + .45, z, .16, .16, '#e8c070'); t.rotation.y = -Math.PI / 2; }
    bake(o);
  }
  private get economy() { return this.pres.city.economy; }
  private get outcome() { return this.economy.state.alignment.outcomes.finchRun; }
  private get greatMain() { return this.economy.state.alignment.outcomes.greatMain; }
  private get level() { return this.economy.state.properties.workshop.level; }
  /** The hand stays at the yard once the bench is the Steward's and the Great Main is settled, offers or no offers. */
  private get present() { return this.greatMain !== 'base' && this.level >= 1; }
  /** The part is fitted at the winch: signed for, it is the Directorate's certification; carried covertly, it is the pin that lets the chain go. Which one is how it was taken. */
  private receive() { const e = this.economy, s = e.state; if (this.part.custody) { if (!e.resolve('finchRun', 'ordinance', 'finch.certified')) return false; this.pres.city.onEvent(FINCH.certified); return true; }
    if (!canBypass(s.resist.finch, this.greatMain, this.level, this.outcome) || !e.resolve('finchRun', 'resistance', 'finch.bypassed')) return false; this.pres.city.onEvent(FINCH.bypassed); return true; }
  private get stage() { return this.economy.state.resist.finch; }
  /** Finch's yard makes its offers only once the Great Main is settled, the bench is the Steward's, and the run is still shut. */
  private get offered() { const s = this.economy.state; return finchOffered(s.alignment.outcomes.greatMain, s.properties.workshop.level, this.outcome); }
  /** E on something of the run's: what it says, and the stage it moves. Null if there is nothing to say. */
  use(id: string): string | null {
    if (id === 'finch.notice') { if (!this.offered) return null; this.economy.advanceFinch(1); return FINCH.noticeToast; }
    if (id === 'finch.winch') { if (runOpen(this.outcome)) return null; if (this.offered && this.stage >= 1) this.economy.advanceFinch(2); return this.stage >= 2 ? FINCH.pawl : FINCH.plate; }
    if (id === 'finch.order') { if (this.part.carrying) { this.part.drop(); return `You set the ${this.part.name} back where it was.`; } const refusal = this.part.take(true); return refusal ?? FINCH.governor; }
    return null;
  }
  sync() { const open = runOpen(this.outcome), a = this.economy.state.alignment; this.side = leaning(a); this.ack = acknowledgement(this.side); this.desk = this.side === 'ordinance' ? this.pres.city.targets.find(t => t.id === 'gate.desk')?.position ?? null : null;
    this.ordinanceRun = this.outcome === 'ordinance'; this.crewLine = FINCH.crew[Math.floor(a.deeds['finch.certified'] ?? 0) % 2]; this.warm = this.recognised = this.crewSaid = false; this.offer.visible = this.offered; this.shut.visible = !open; this.lowered.visible = open; this.resistance.visible = this.outcome === 'resistance'; this.ordinance.visible = this.outcome === 'ordinance'; }
  update(dt: number, _time: number, viewer: T.Vector3) {
    const part = this.part; part.update(); const carrying = part.carrying; part.name = part.custody ? 'governor' : 'release';
    this.winchTarget.hint = carrying ? (part.custody ? 'FIT THE GOVERNOR' : 'PULL THE PIN') : 'EXAMINE'; this.releaseTarget.hint = carrying ? 'PUT IT BACK' : 'TAKE THE RELEASE'; this.orderTarget.hint = carrying ? 'PUT IT BACK' : 'SIGN FOR THE GOVERNOR';
    const hand = this.pres.workers[this.hand].person.group.position, near = Math.hypot(viewer.x - hand.x, viewer.z - hand.z);
    // A Steward leaning to the Embers is greeted at the yard once per approach, and one leaning to the Directorate is known at the gate desk. Mixed histories get neither.
    if (this.side === 'resistance' && this.present) { if (near > 14) this.warm = false; else if (near < 4.5 && !this.warm && this.onLine({ who: 'Finch’s hand', text: this.ack! })) this.warm = true; }
    const desk = this.desk; if (desk) { const d = Math.hypot(viewer.x - desk.x, viewer.z - desk.z); if (d > 16) this.recognised = false; else if (d < 6 && viewer.y < 4 && !this.recognised && this.onLine({ who: 'Gate desk', text: this.ack! })) this.recognised = true; }
    // The Directorate's contract has a crew who remember it: one line at the ladder's foot, once per visit.
    if (this.ordinanceRun) { const d = Math.hypot(viewer.x - this.foot.x, viewer.z - this.foot.z); if (d > 9) this.crewSaid = false; else if (d < 3.5 && viewer.y < 4 && !this.crewSaid && this.onLine({ who: 'Gate crew', text: this.crewLine })) this.crewSaid = true; }
    // The hand says it once, to someone standing at the bench who is not in a menu.
    if (!this.offered || this.stage !== 0) { this.hear = 0; return; }
    const g = hand; this.hear = near < 5.5 ? this.hear + dt : 0;
    if (this.hear > 1.2 && this.onLine({ who: 'Finch’s hand', text: handLine(this.economy.state.alignment.deeds['rook.custody'] !== undefined) })) { this.hear = 0; this.economy.advanceFinch(1); }
  }
}
