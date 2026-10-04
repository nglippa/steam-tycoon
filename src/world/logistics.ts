import * as T from 'three';
import { mats } from './assets';
import type { SiteId } from '../simulation/economy';

/** Goods the Steward carries by hand between districts: the prop waiting where it was made,
 * the same prop in the Steward's arms, and the spot that receives it (completing a `carried`
 * site step, or, with no site, whatever `receive` does). One consignment at a time, and never saved: a reload or an interception
 * sends it back to where it waits. Districts decide who can see it and what happens then. */
export class Consignment {
  static all: Consignment[] = [];
  carrying = false; /** What it is called when the arms are full of it. */ name = 'crate'; /** Carried, it reads to the checkpoints as heat, and any incident takes it away. */ contraband = false; /** Taken covertly it is contraband; taken under signature (`custody`) it is lawful freight. Per take, never saved. */ covert = false; custody = false; /** The objective line while it is in the arms, and for a lawful take. */ carryLine = ''; custodyLine = ''; /** Where a lawful take is signed in. */ custodyAt = ''; readonly waiting = new T.Group(); readonly held = new T.Group(); readonly target: T.Mesh;
  constructor(public id: string, public site: SiteId | null, public deliverAt: string, parent: T.Object3D, at: { x: number; z: number }, build: (g: T.Group) => void,
    public ready: () => boolean, public taken: string, public refuse: () => string | null = () => null, public receive?: () => boolean) {
    build(this.waiting); this.waiting.position.set(at.x, 0, at.z); parent.add(this.waiting); build(this.held); this.held.visible = false;
    this.target = new T.Mesh(new T.BoxGeometry(.9, 1, .9), mats.dark); this.target.position.set(at.x, .5, at.z); this.target.visible = false; parent.add(this.target);
    Consignment.all.push(this);
  }
  /** The one in the Steward's arms, if any. */
  static carried() { return Consignment.all.find(c => c.carrying); }
  /** Shoulder it; a refusal message if it cannot be taken now. */
  take(custody = false): string | null {
    if (!this.ready() || this.carrying) return 'Nothing here needs carrying.';
    if (Consignment.carried()) return `Your arms are already full: the ${Consignment.carried()!.name}.`;
    const refusal = custody ? null : this.refuse(); if (refusal) return refusal;
    this.carrying = true; this.custody = custody; this.contraband = this.covert && !custody; return null;
  }
  drop() { this.carrying = false; this.custody = false; this.contraband = false; }
  /** Where it goes this take. */
  get dest() { return this.custody && this.custodyAt ? this.custodyAt : this.deliverAt; }
  /** What the objective line says while it is carried. */
  get line() { return this.carrying ? (this.custody ? this.custodyLine : this.carryLine) : ''; }
  /** Once a frame: the waiting prop shows (and can be aimed at) only while it waits. */
  update() { if (!this.ready()) this.drop(); const waiting = this.ready() && !this.carrying; this.waiting.visible = waiting; this.target.layers.set(waiting ? 0 : 1); this.held.visible = this.carrying; }
}
