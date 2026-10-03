/** Where the Steward lives, and the rooms it might one day grow into. Pure data: nothing in play reads `home.level` yet. */
export interface HomeTier { id: string; name: string; desc: string; cost: number }
export const HOME_TIERS: readonly HomeTier[] = [
  { id: 'room', name: 'Rented room', desc: 'One window, one bed, and a hatch to the Leads.', cost: 0 },
  { id: 'mended', name: 'Mended room', desc: 'The damp seen to, the stove lit, a rug that is not a rag.', cost: 400 },
  { id: 'two', name: 'Two rooms', desc: 'A door that closes on the work, and a table for visitors.', cost: 2500 },
  { id: 'townhouse', name: 'Townhouse', desc: 'The whole house over the arch, stair and all.', cost: 15000 },
];
export const homeTier = (level: number) => HOME_TIERS[Math.max(0, Math.min(HOME_TIERS.length - 1, Math.floor(level)))];
interface Zone { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }
/** The room over the arch, the corridor out of its west door, the stair-house down to the street door. Indoors is home:
 * nobody watches a Steward there, and the stair counts all the way down. */
const ZONES: Zone[] = [
  { x0: -6.5, x1: .1, z0: 3.9, z1: 7.3, y0: 7, y1: 12 },
  { x0: -13, x1: -6.3, z0: 4.3, z1: 5.7, y0: 7, y1: 12 },
  { x0: -15.6, x1: -13.4, z0: -3.6, z1: 5.4, y0: -1, y1: 10.5 },
];
export const atHome = (x: number, y: number, z: number) => ZONES.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1 && y > r.y0 && y < r.y1);
