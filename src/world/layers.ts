import * as T from 'three';
import { bake } from './assets';
import { SITE_LIBERATED, SITE_RESTORED, cityFacts, type CityFacts, type PropertyId, type SiteId } from '../simulation/economy';

/** Terra is one city in strata: an ancient base, the occupation built over it, the
 * damage of the Lowworks, economic repair, the resistance hidden inside it, and finally
 * liberation and the ancient works running again. A layered site authors each stratum
 * once and lets saved state decide what is standing, so every district can reuse it. */
export interface SiteView { control: number; stage: number; levels: Record<PropertyId, number>; sites: Record<SiteId, number> }
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
  /** Another site's control: the resistance network showing up somewhere else. */
  site: (id: SiteId, test: (control: number) => boolean): When => v => test(v.sites[id]),
  /** A city-wide consequence (cityFacts): true wherever that fact holds, in any district. */
  fact: (name: keyof CityFacts): When => v => cityFacts(v.sites)[name],
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
/** What a layered district offers the rest of the world: physical spots to interact
 * with, where restoration crews set up, whether occupation eyes are on the Steward. */
export interface SiteModule {
  id: SiteId; view: SiteView; targets: { object: T.Mesh; spot: string; label: string; hint: string }[];
  anchor: { x: number; z: number; rotation: number }; readonly watching: boolean;
  sync(view: SiteView): void; update(dt: number, time: number, viewer: T.Vector3, calm: boolean): void; setNight(v: number): void;
}

/** A place outside the four sites that still changes with them: one street, roof or room, authored
 * once in strata. `phase` comes from economy.spacePhase; `stage` is prosperity, a separate axis.
 * A layer is drawn when its test passes; baked layers are one draw per material and cost nothing hidden. */
export type Shown = (phase: number, stage: number) => boolean;
export const shown = {
  always: (() => true) as Shown,
  /** The Ordinance still holds it: occupied, covert, organized or contested. */
  held: (p => p < 4) as Shown,
  /** Only while nothing has started: the stripped, shut baseline. */
  untouched: (p => p === 0) as Shown,
  covert: (p => p >= 1) as Shown,
  /** Hidden things that stop being hidden once the place is free. */
  secret: (p => p >= 1 && p < 4) as Shown,
  organized: (p => p >= 2) as Shown,
  contested: (p => p === 3) as Shown,
  free: (p => p >= 4) as Shown,
  restored: (p => p === 5) as Shown,
  dormant: (p => p < 5) as Shown,
  /** Prosperity, whoever holds the street. */
  rich: ((_, s) => s >= 3) as Shown, poor: ((_, s) => s < 3) as Shown,
  all: (...tests: Shown[]): Shown => (p, s) => tests.every(t => t(p, s)),
};
export class Staged {
  layers: { group: T.Group; test: Shown; baked: boolean }[] = []; phase = 0; stage = 0;
  constructor(public root: T.Object3D) {}
  layer(test: Shown, baked = true) { const group = new T.Group(); this.root.add(group); this.layers.push({ group, test, baked }); return group; }
  seal() { for (const l of this.layers) if (l.baked) bake(l.group); }
  sync(phase: number, stage: number) { this.phase = phase; this.stage = stage; for (const l of this.layers) l.group.visible = l.test(phase, stage); }
  /** For people and colliders that belong to a layer. */
  is(test: Shown) { return test(this.phase, this.stage); }
}
