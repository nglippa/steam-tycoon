import * as T from 'three';
import { box, cyl, torus, beam, sign, bake, mats } from './assets';
import { V, artMats } from './art-kit';
import { unseen, ladder, parapet } from './routes';
import { occupationMats } from './factions';
import { runOpen } from '../simulation/alignment';
import { FINCH, finchOffered, handLine } from '../simulation/resist';
import type { Line } from '../simulation/intro';
import type { Presentation } from './presentation';

/** Service Run 7 (simulation/resist.ts, FINCH): the Directorate's maintenance gantry hung on Finch Mechanical's street face at terrace height, joining the two
 * terraces without crossing the block, and the maintenance ladder from the Great Main's west pavement up to its south end. One winch and latch box on the south
 * terrace holds the ladder's lower flight hoisted and both grilles shut. The world reads the OUTCOME of the site and never the stage: base is shut, anything else
 * is open. The stage only decides what Finch's yard offers. A resistance group and an ordinance group wait, empty, for the dressing each side leaves. */
const TERRACE = 14.45, G = .18, X0 = -13.3, X1 = -11.5, Z0 = 7.6, Z1 = 19.9, XC = (X0 + X1) / 2, N_GAP = [7.9, 9.5], S_GAP = [18, 19.6];
/** The winch on the south terrace beside the south gap, and Finch's yard: the bench where the part is collected, the work order beside it, and the hand. */
const WINCH = { x: -13.95, z: 20.6 }, BENCH = { x: -16.4, z: 23.5 }, NOTICE = { x: -19.2, z: 22.7 }, HAND = { x: -16.4, z: 25 }, HOISTED = 3.4;
const O = occupationMats;
/** One flight of the ladder, drawn like routes.ladder's: rails, rungs, and hoops on a long climb. Drawing only; the real ladder is registered once, below. */
function flight(g: T.Object3D, x: number, z: number, y0: number, y1: number) {
  const head = y1 + 1.15, UP = new T.Vector3(0, 1, 0), across = new T.Vector3(1, 0, 0), lz = z + .1;
  for (const s of [-.27, .27]) cyl(g, x + s, (y0 + head) / 2, lz, .035, head - y0, mats.iron);
  for (let y = y0 + .3; y < head - .1; y += .32) cyl(g, x, y, lz, .022, .54, mats.iron).quaternion.setFromUnitVectors(UP, across);
  if (y1 - y0 > 6) for (let y = y0 + 2.6; y < y1 + .6; y += 1.5) torus(g, x, y, lz + .34, .36, .018, mats.iron).rotation.x = Math.PI / 2;
}
/** A Directorate grille over a gap in the street parapet: a frame, bars, and the oxblood seal on the latch. Faces east, in the plane of the parapet. */
function grille(g: T.Object3D, [a, b]: number[]) {
  const c = (a + b) / 2, w = b - a; box(g, X0, TERRACE + .06, c, .08, .12, w, O.iron); box(g, X0, TERRACE + 1.38, c, .08, .08, w, O.iron);
  for (let z = a + .1; z < b; z += .2) box(g, X0, TERRACE + .72, z, .04, 1.3, .04, O.iron);
  box(g, X0 + .06, TERRACE + .72, c, .06, .16, .16, O.oxblood);
}

export class FinchRun {
  /** Say a line to the player now; false if this is not the moment (the ledger is open, the opening is playing). */
  onLine: (line: Line) => boolean = () => false;
  /** What the outcome and nothing else shows: shut (grilles, hoisted lower flight, seals), open (the lowered flight), and a place each side's dressing will go. */
  private shut = new T.Group(); private lowered = new T.Group(); private resistance = new T.Group(); private ordinance = new T.Group(); private yard = new T.Group();
  private hand: number; private hear = 0;
  constructor(private pres: Presentation) {
    const city = pres.city, root = new T.Group(); pres.root.add(root); root.add(this.shut, this.lowered, this.resistance, this.ordinance, this.yard);
    const gantry = new T.Group(); root.add(gantry);
    // The gantry: an iron deck on two stringers, braced back to the wall on brass bosses, a rail along the street and across the north end. The wall shows between the braces.
    city.deck(X0, X1, Z0, Z1, TERRACE);
    box(gantry, XC, TERRACE - .06, (Z0 + Z1) / 2, X1 - X0, .12, Z1 - Z0, mats.iron); for (const x of [X0 + .2, X1 - .2]) box(gantry, x, TERRACE - .3, (Z0 + Z1) / 2, .1, .24, Z1 - Z0 - .1, mats.iron);
    for (const z of [9.2, 13.5, 17.8]) { beam(gantry, V(X0, TERRACE - 1.9, z), V(X1 - .2, TERRACE - .36, z), .045, mats.iron); box(gantry, X0 + .03, TERRACE - 1.9, z, .08, .24, .24, mats.brass); box(gantry, X0 + .03, TERRACE - .3, z, .08, .24, .24, mats.brass); }
    parapet(gantry, city, X1, Z0, X1, Z1, TERRACE, mats.iron, false); parapet(gantry, city, X0, Z0, X1, Z0, TERRACE, mats.iron, false);
    // The ladder comes up through a gap in the south end rail, as the other ladders come up through theirs.
    parapet(gantry, city, X0, Z1, XC - .45, Z1, TERRACE, mats.iron, false); parapet(gantry, city, XC + .45, Z1, X1, Z1, TERRACE, mats.iron, false);
    const plate = FINCH.plate.split(' • '), board = sign(gantry, plate[0], `${plate[1]} • ${plate[2]}`, X1 + .06, TERRACE + .55, 14, 1.4, .46, '#cbbf9f'); board.rotation.y = Math.PI / 2; bake(gantry);
    // The grilles over the two gaps in the terraces' street parapets. Shut they are walls; open they are gone.
    for (const gap of [N_GAP, S_GAP]) { grille(this.shut, gap); city.collider(X0, (gap[0] + gap[1]) / 2, .3, gap[1] - gap[0], TERRACE + 1.1, undefined, () => runOpen(this.outcome), TERRACE - .2); }
    // The ladder: the lower flight hoisted ~3 m up on its chain and padlocked while shut, lowered to the pavement once open. Only the lowered one can be climbed.
    flight(this.shut, XC, Z1, HOISTED, TERRACE); for (const s of [-.27, .27]) beam(this.shut, V(XC + s, HOISTED, Z1 + .1), V(XC + s * 1.8, TERRACE - 1.6, Z1 + .1), .012, mats.iron); box(this.shut, XC, HOISTED + .12, Z1 + .16, .22, .18, .08, O.oxblood);
    ladder(this.lowered, root, city, 'ladder.finch.run', 'Service Run 7 ladder', XC, Z1, G, TERRACE, 0, 1, mats.iron, undefined, () => runOpen(this.outcome));
    // The winch and latch box: a drum on iron cheeks, the chain over the parapet to the ladder, and a governor housing under an oxblood seal while shut.
    const winch = new T.Group(); root.add(winch); box(winch, WINCH.x, TERRACE + .5, WINCH.z, .7, 1, .8, mats.iron); cyl(winch, WINCH.x - .1, TERRACE + 1.15, WINCH.z, .17, .72, mats.dark).rotation.x = Math.PI / 2;
    torus(winch, WINCH.x - .1, TERRACE + 1.15, WINCH.z + .38, .2, .03, mats.brass); box(winch, WINCH.x + .2, TERRACE + 1.15, WINCH.z - .46, .08, .08, .24, mats.brass);
    beam(winch, V(WINCH.x + .2, TERRACE + 1.1, WINCH.z - .4), V(XC, TERRACE + .9, Z1 - .2), .014, mats.iron); city.collider(WINCH.x, WINCH.z, .7, .8, TERRACE + 1.4, undefined, undefined, TERRACE - .2);
    box(this.shut, WINCH.x + .36, TERRACE + .55, WINCH.z, .06, .4, .4, O.iron); box(this.shut, WINCH.x + .4, TERRACE + .55, WINCH.z, .03, .12, .12, O.oxblood);
    const face = sign(this.shut, plate[0], `${plate[1]} • ${plate[2]}`, WINCH.x, TERRACE + .62, WINCH.z - .41, .64, .4, '#cbbf9f'); face.rotation.y = Math.PI; bake(winch); bake(this.shut);
    const hit = new T.Mesh(new T.BoxGeometry(1.3, 1.5, 1.3), unseen); hit.position.set(WINCH.x, TERRACE + .75, WINCH.z); root.add(hit); hit.updateWorldMatrix(true, false);
    city.targets.push({ object: hit, id: 'finch.winch', kind: 'site', label: 'Winch, Service Run 7', hint: 'EXAMINE', position: hit.getWorldPosition(new T.Vector3()), when: () => !runOpen(this.outcome) });
    // Finch's yard, only while the run is on offer: the bench under the south wall, and the Directorate's work order on the board beside it.
    const y = this.yard; box(y, BENCH.x, .86, BENCH.z, 1.9, .1, .8, mats.wood); for (const dx of [-.85, .85]) for (const dz of [-.32, .32]) box(y, BENCH.x + dx, .42, BENCH.z + dz, .08, .84, .08, mats.wood);
    box(y, BENCH.x - .55, .98, BENCH.z, .16, .14, .2, mats.iron); cyl(y, BENCH.x + .2, .96, BENCH.z, .07, .1, mats.iron); box(y, BENCH.x + .55, .93, BENCH.z, .5, .05, .26, artMats.paper); cyl(y, BENCH.x + .55, .97, BENCH.z, .015, .3, mats.brass).rotation.z = Math.PI / 2;
    city.collider(BENCH.x, BENCH.z, 1.9, .8, 1.1, undefined, () => !this.offered);
    box(y, NOTICE.x, 1.5, NOTICE.z + .03, .8, 1.1, .06, mats.wood); box(y, NOTICE.x, 1.5, NOTICE.z + .07, .6, .84, .012, artMats.paper); for (const dy of [.24, .08, -.08]) box(y, NOTICE.x, 1.5 + dy, NOTICE.z + .08, .44, .012, .004, mats.dark); box(y, NOTICE.x + .16, 1.2, NOTICE.z + .08, .16, .16, .006, O.oxblood); bake(y);
    for (const [id, label, hint, x, h, z, w, d] of [['finch.notice', 'Work order', 'READ THE ORDER', NOTICE.x, 1.5, NOTICE.z + .7, 1.6, 1.4], ['finch.bench', 'Finch’s bench', 'LOOK OVER THE BENCH', BENCH.x, 1.1, BENCH.z, 2.1, 1.2]] as const) {
      const t = new T.Mesh(new T.BoxGeometry(w, 1.4, d), unseen); t.position.set(x, h, z); root.add(t); t.updateWorldMatrix(true, false);
      city.targets.push({ object: t, id, kind: 'site', label, hint, position: t.getWorldPosition(new T.Vector3()), when: () => this.offered }); }
    this.hand = pres.addWorker(HAND.x, HAND.z, Math.PI, 'repair', { role: 'worker', essential: true, when: () => this.offered });
  }
  private get economy() { return this.pres.city.economy; }
  private get outcome() { return this.economy.state.alignment.outcomes.finchRun; }
  private get stage() { return this.economy.state.resist.finch; }
  /** Finch's yard makes its offers only once the Great Main is settled, the bench is the Steward's, and the run is still shut. */
  private get offered() { const s = this.economy.state; return finchOffered(s.alignment.outcomes.greatMain, s.properties.workshop.level, this.outcome); }
  /** E on something of the run's: what it says, and the stage it moves. Null if there is nothing to say. */
  use(id: string): string | null {
    if (id === 'finch.notice') { if (!this.offered) return null; this.economy.advanceFinch(1); return FINCH.noticeToast; }
    if (id === 'finch.winch') { if (runOpen(this.outcome)) return null; if (this.offered && this.stage >= 1) this.economy.advanceFinch(2); return this.stage >= 2 ? FINCH.pawl : FINCH.plate; }
    return id === 'finch.bench' && this.offered ? 'A vise, a rag, a pawl pin and a stamped housing in its cradle. Nothing on the bench is yours to lift yet.' : null;
  }
  sync() { const open = runOpen(this.outcome); this.shut.visible = !open; this.lowered.visible = open; this.resistance.visible = this.outcome === 'resistance'; this.ordinance.visible = this.outcome === 'ordinance'; this.yard.visible = this.offered; }
  update(dt: number, _time: number, viewer: T.Vector3) {
    // The hand says it once, to someone standing at the bench who is not in a menu.
    if (!this.offered || this.stage !== 0) { this.hear = 0; return; }
    const g = this.pres.workers[this.hand].person.group.position; this.hear = Math.hypot(viewer.x - g.x, viewer.z - g.z) < 5.5 ? this.hear + dt : 0;
    if (this.hear > 1.2 && this.onLine({ who: 'Finch’s hand', text: handLine(this.economy.state.alignment.deeds['rook.custody'] !== undefined) })) { this.hear = 0; this.economy.advanceFinch(1); }
  }
}
