import type { Scrutiny } from './occupation';

/** APPROACHING A CHECKPOINT. One-sided: the Steward walks up to the boom line from one side, the crew notices,
 * a flagged Steward is challenged and given a moment to answer it. Stopping, backing off or stepping out of the
 * approach is an answer; walking on through the boom is the other one, and that is the incident.
 *
 *   idle -> noticed -> challenged -> refused -> incident
 *                          |  ^          |
 *                          v  | (walks on again)
 *                       turnedAway <-----+
 *   any approach that passes the line without a challenge -> cleared
 *
 * Distances are metres along the gate's local z (the boom line is z = 0); `lx` runs along the line. */
export const APPROACH = {
  /** How far out the approach starts. */ outer: 12,
  /** A flagged Steward is challenged once this close (and noticed). */ challengeAt: 9,
  /** Closer than this and it is too late to notice anyone: they are already at the boom. */ late: 3,
  /** Seconds to answer a challenge before walking on counts as refusing it. */ window: 5,
  /** A second, shorter window for someone who turned away and then came on again. */ again: 2.5,
  /** Below this speed toward the line (m/s) the Steward is standing still... */ stillSpeed: .35,
  /** ...and standing still this long is an answer. */ still: .8,
  /** Backing off this far from the closest point reached is an answer. */ retreat: 1,
  /** Coming back on this far after turning away renews the challenge. */ readvance: .8,
  /** Still advancing this close after a challenge is refusing it. */ refuseAt: 2.4,
  /** Beyond the approach by this much the gate forgets the Steward. */ leave: 2.5,
  /** At most one checkpoint incident this often (seconds). */ cooldown: 40,
};

export type Stage = 'idle' | 'noticed' | 'challenged' | 'refused' | 'turnedAway' | 'cleared' | 'incident';
/** What happened this step, for the gate to voice: a look, a line, an arm, an incident. */
export type ApproachEvent = 'notice' | 'challenge' | 'refuse' | 'turnedAway' | 'resume' | 'cleared' | 'excused' | 'incident' | 'lost';
export interface Approach {
  stage: Stage; /** Which side of the line the approach came from: +1 or -1, 0 when idle. */ side: number;
  /** Last distance to the line on the approach side, and the smoothed speed toward it. */ prev: number; vel: number;
  /** Closest point reached since the challenge; furthest point reached since turning away. */ closest: number; furthest: number;
  window: number; still: number; lastIncident: number;
}
export const approachState = (): Approach => ({ stage: 'idle', side: 0, prev: NaN, vel: 0, closest: 0, furthest: 0, window: 0, still: 0, lastIncident: -1e9 });
export interface Reading { lx: number; lz: number; span: [number, number]; seen: boolean; scrutiny: Scrutiny; dt: number; time: number }

const reset = (a: Approach) => { a.stage = 'idle'; a.side = 0; a.prev = NaN; a.vel = 0; a.window = a.still = 0; };
const flaggedStage = (s: Stage) => s === 'challenged' || s === 'refused' || s === 'turnedAway';

/** Advance one gate's approach by one step. Pure: everything it knows is in `a` and `r`. Call it every frame
 * while the Steward is near; `seen` may be refreshed less often (line of sight is the expensive part). */
export function stepApproach(a: Approach, r: Reading): ApproachEvent | null {
  const C = APPROACH, [lo, hi] = r.span, along = Math.abs(r.lz);
  // A sealed gate refuses at the boom; an open one has nobody to ask. Neither runs an approach.
  if (r.scrutiny === 'refuse' || r.scrutiny === 'none') { reset(a); return null; }
  if (r.lx < lo - 1 - C.leave || r.lx > hi + 1 + C.leave || along > C.outer + C.leave) { const was = a.stage; reset(a); return was === 'challenged' || was === 'refused' ? 'turnedAway' : null; }
  const inSpan = r.lx >= lo - 1 && r.lx <= hi + 1, dt = Math.max(1e-3, r.dt);
  // Distance to the line, positive on the approach side; before a side is chosen, just the distance.
  const dist = a.side ? r.lz * a.side : along, raw = Number.isNaN(a.prev) ? 0 : (a.prev - dist) / dt;
  a.vel += (raw - a.vel) * Math.min(1, dt * 8); a.prev = dist;
  if (a.stage === 'idle') {
    // Noticed only on the way in, in the zone, before the boom, and only if a crew man can see it.
    if (inSpan && along <= C.outer && along >= C.late && a.vel > .2 && r.seen) { a.stage = 'noticed'; a.side = Math.sign(r.lz); a.prev = along; return 'notice'; }
    return null;
  }
  if (a.stage === 'cleared' || a.stage === 'incident') return null;
  // Through the boom.
  if (dist <= 0) {
    if (r.scrutiny === 'challenge' && flaggedStage(a.stage)) {
      if (r.time - a.lastIncident >= C.cooldown) { a.stage = 'incident'; a.lastIncident = r.time; return 'incident'; }
      a.stage = 'cleared'; return 'excused';
    }
    // Never challenged (or no longer flagged): nobody punishes what they did not stop.
    a.stage = 'cleared'; return 'cleared';
  }
  const answered = () => { a.stage = 'turnedAway'; a.furthest = dist; a.still = 0; return 'turnedAway' as const; };
  if (a.stage === 'noticed') {
    if (!inSpan) { reset(a); return 'lost'; }
    if (r.scrutiny === 'challenge' && r.seen && dist <= C.challengeAt && dist >= C.late) { a.stage = 'challenged'; a.window = C.window; a.closest = dist; a.still = 0; return 'challenge'; }
    return null;
  }
  if (a.stage === 'challenged' || a.stage === 'refused') {
    a.closest = Math.min(a.closest, dist); a.window -= dt;
    a.still = Math.abs(a.vel) < C.stillSpeed ? a.still + dt : 0;
    if (!inSpan || dist > C.outer || dist > a.closest + C.retreat || a.still >= C.still) return answered();
    if (a.stage === 'challenged' && ((a.vel > C.stillSpeed && dist < C.refuseAt) || a.window <= 0)) { a.stage = 'refused'; return 'refuse'; }
    return null;
  }
  // Turned away: watched, not stopped. Coming on again renews the challenge, with less patience.
  a.furthest = Math.max(a.furthest, dist);
  if (inSpan && dist < a.furthest - C.readvance && a.vel > C.stillSpeed) { a.stage = 'challenged'; a.window = C.again; a.closest = dist; a.still = 0; return 'resume'; }
  return null;
}
