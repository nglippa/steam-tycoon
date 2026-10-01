/** Where Terra's plate is open to the sky. Plain numbers, imported by the world builders. */
/** The Lowworks canal is a cleft through Terra's plate: open to the sky beneath, and out
 * through the north rim, so the cloud sea and Locke show between the buildings. */
export const CHASM = { x0: 40.5, x1: 48.5, z1: 64 };
/** The west rim comes in behind the housing back lane: the ward's second edge. The notch
 * flares as it runs out to the plate's far edge, so its sides fall away from the view. */
export const WEST_EDGE = { x: -86, z0: -27, z1: 28, flare: .625 };
/** A gallery hung on chains below the rim, reached by a lift from the arrival terrace. */
export const GALLERY = { x0: 13.5, x1: 28.5, z0: 92.2, z1: 106, floor: -101, lift: { x: 21, z: 90.6 } };
/** A room cut into the cleft's west wall behind the door in the rock: the plate is notched for it. */
export const TENDING = { x0: 35.6, z0: -22.5, z1: -17.5 };
/** Where backdrop buildings must not stand, because the city's edge is open there. */
export const skyGap = (x: number, z: number) => (z < -88 && Math.abs(x - (CHASM.x0 + CHASM.x1) / 2) < 17) || (x < WEST_EDGE.x && z > WEST_EDGE.z0 - 16 - (WEST_EDGE.x - x) * WEST_EDGE.flare && z < WEST_EDGE.z1 + 16 + (WEST_EDGE.x - x) * WEST_EDGE.flare);
