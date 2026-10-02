import * as T from 'three';
import { box, torus, barrel, crate, bake, mats, asProp } from './assets';
import { ROUTE, makeCarts, step, pose, activate, cartsCease, occupied, type Cart } from '../simulation/traffic';
import type { City } from './city';

/** The Great Main's carts: drawn here, moved by the rules in simulation/traffic. The checkpoint's state is polled
 * every frame from the social picture (it lags by up to half a second; the rules never wait on an event). */
export class Traffic {
  carts: T.Group[] = []; wheels: T.Group[][] = []; state: Cart[];
  constructor(private city: City, count = 3) { this.state = makeCarts(count);
    for (let i = 0; i < count; i++) { const cart = new T.Group(); box(cart, 0, .65, 0, 1.3, .25, 2); for (const x of [-.65, .65]) box(cart, x, 1, 0, .1, .65, 2); crate(cart, 0, .8, -.3, .7); barrel(cart, 0, .8, .55); const wheels: T.Group[] = []; for (const x of [-.85, .85]) { const wheel = new T.Group(); wheel.position.set(x, .45, 0); wheel.rotation.y = Math.PI / 2; cart.add(wheel); torus(wheel, 0, 0, 0, .43, .075, mats.iron); for (let j = 0; j < 4; j++) box(wheel, 0, 0, 0, .77, .045, .06, mats.brass).rotation.z = j * Math.PI / 4; asProp(wheel); bake(wheel); wheels.push(wheel); } this.wheels.push(wheels); asProp(cart); city.root.add(cart); this.carts.push(cart); } }
  update(dt: number) { const city = this.city, works = city.social.get('lowworks')!, market = city.social.get('market')!, stage = city.economy.stage;
    this.state.forEach((_, i) => activate(this.state, i, i <= stage));
    step(this.state, { gate: works.gate, crackdown: works.crackdown, curfew: cartsCease(works.enforcement, market.enforcement) }, dt, 1.1 + city.economy.state.infrastructure.roads * .3);
    this.state.forEach((c, i) => { const cart = this.carts[i]; cart.visible = c.active; if (!c.active) return; const p = pose(ROUTE, c.s);
      cart.position.set(p.x, city.groundHeight(p.x, p.z), p.z); cart.rotation.y = p.yaw; for (const wheel of this.wheels[i]) wheel.rotation.x = c.s / .43; }); }
  /** Is a cart crossing the gate at depth gateZ: past its stop line, tail not yet halfWidth beyond the boom? The
   * checkpoint asks before lowering a boom. Only the Great Main gate (z 10.4) is on the carts' road. */
  occupying(gateZ: number, halfWidth: number) { return occupied(this.state, gateZ, halfWidth); }
}
