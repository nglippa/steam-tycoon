import * as T from 'three';
import { bake } from './assets';
import { SITE_LIBERATED, SITE_RESTORED, type PropertyId } from '../simulation/economy';

/** Terra is one city in strata: an ancient base, the occupation built over it, the
 * damage of the Lowworks, economic repair, the resistance hidden inside it, and finally
 * liberation and the ancient works running again. A layered site authors each stratum
 * once and lets saved state decide what is standing, so every district can reuse it. */
export interface SiteView { control: number; stage: number; levels: Record<PropertyId, number> }
export type When = (v: SiteView) => boolean;

export const when = {
  always: (() => true) as When,
  occupied: ((v) => v.control < SITE_LIBERATED) as When,
  /** Secret work from step n until the square is openly liberated. */
  covert: (n: number): When => v => v.control >= n && v.control < SITE_LIBERATED,
  liberated: ((v) => v.control >= SITE_LIBERATED) as When,
  restored: ((v) => v.control >= SITE_RESTORED) as When,
  dormant: ((v) => v.control < SITE_RESTORED) as When,
  /** Economic condition of one business, independent of who controls the street. */
  business: (id: PropertyId, test: (level: number) => boolean): When => v => test(v.levels[id]),
  all: (...tests: When[]): When => v => tests.every(t => t(v)),
};

export class LayeredSite {
  layers: { group: T.Group; when: When; baked: boolean }[] = [];
  constructor(public root: T.Group) {}
  /** A stratum. Static strata are merged into one draw per material when sealed;
   * pass baked=false for parts that animate or carry interaction targets. */
  layer(test: When, baked = true) { const group = new T.Group(); this.root.add(group); this.layers.push({ group, when: test, baked }); return group; }
  seal() { for (const l of this.layers) if (l.baked) bake(l.group); }
  sync(view: SiteView) { for (const l of this.layers) l.group.visible = l.when(view); }
}
