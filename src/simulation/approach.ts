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
 * Nobody is punished faster than they could have answered. The challenge is timed by pace, not by place: it comes
 * `lead` seconds short of the line (and a beat after the look that notices him), a Steward first seen closer than
 * `lateLead` seconds is let through unasked, and going through the boom is an incident only after a refusal, at least
 * `grace` seconds after the first challenge and `warn` seconds after a renewed one. That last allowance is given once
 * an approach: stopping and starting again does not buy more of it.
 *
 * Distances are metres along the gate's local z (the boom line is z = 0); `lx` runs along the line. */
export const APPROACH = {
  /** How far out the approach starts at a walk... */ outer: 12,
  /** ...and the furthest out a running Steward is picked up. Also how far the crew can see. */ reach: 28,
  /** He is noticed this many seconds of his pace before the challenge is due: the look comes first, then the word... */ noticeLead: .8,
  /** ...and never less than this long before it, unless waiting would leave no time to ask at all. */ beat: .6,
  /** A flagged Steward is challenged once this close (and noticed)... */ challengeAt: 9,
  /** ...or this many seconds short of the line at his pace, whichever is further out. */ lead: 3,
  /** Closer than this and it is too late to stop anyone: they are already at the boom... */ late: 3,
  /** ...and so is anyone less than this many seconds from it. They pass unchallenged. */ lateLead: 2.5,
  /** Seconds to answer a challenge before walking on counts as refusing it. */ window: 5,
  /** A second, shorter window for someone who turned away and then came on again. */ again: 2.5,
  /** Going through the boom sooner than this after the first challenge is excused with a warning. */ grace: 2,
  /** The same after the challenge is renewed (he stopped, then came on): no incident sooner than this after that warning. Once an approach. */ warn: 1.2,
  /** Below this speed toward the line (m/s) the Steward is standing still... */ stillSpeed: .35,
  /** ...and standing still this long is an answer. */ still: .8,
  /** Backing off this far from the closest point reached is an answer. */ retreat: 1,
  /** Coming back on this far after turning away renews the challenge. */ readvance: .8,
  /** Still advancing this close after a challenge is refusing it... */ refuseAt: 2.4,
  /** ...or this many seconds short of the line at his pace, whichever is further out: the last warning can be heard before the boom. */ refuseLead: 1.3,
  /** Beyond the approach by this much the gate forgets the Steward. */ leave: 2.5,
  /** At most one checkpoint incident this often (seconds). */ cooldown: 40,
  /** Further than this in one step is not a step. */ stride: 2.5,
};

export type Stage = 'idle' | 'noticed' | 'challenged' | 'refused' | 'turnedAway' | 'cleared' | 'incident';
/** What happened this step, for the gate to voice: a look, a line, an arm, an incident. */
export type ApproachEvent = 'notice' | 'challenge' | 'refuse' | 'turnedAway' | 'resume' | 'released' | 'cleared' | 'excused' | 'incident';
export interface Approach {
  stage: Stage; /** Which side of the line the approach came from: +1 or -1, 0 when idle. */ side: number;
  /** Last distance to the line on the approach side and last place along it; smoothed speed toward the line, and over the ground. */ prev: number; px: number; vel: number; speed: number;
  /** Closest point reached since the challenge; furthest point reached since turning away. */ closest: number; furthest: number;
  /** Seconds since the first challenge of this approach; since he was noticed; since the renewed warning that counts; how often it has been renewed. */ since: number; seenFor: number; warned: number; renewed: number;
  window: number; still: number; lastIncident: number;
}
export const approachState = (): Approach => ({ stage: 'idle', side: 0, prev: NaN, px: 0, vel: 0, speed: 0, closest: 0, furthest: 0, since: 0, seenFor: 0, warned: 99, renewed: 0, window: 0, still: 0, lastIncident: -1e9 });
export interface Reading { lx: number; lz: number; span: [number, number]; seen: boolean; scrutiny: Scrutiny; dt: number; time: number }

const reset = (a: Approach) => { a.stage = 'idle'; a.side = 0; a.prev = NaN; a.vel = a.speed = 0; a.window = a.still = a.since = a.seenFor = a.renewed = 0; a.warned = 99; };
const flaggedStage = (s: Stage) => s === 'challenged' || s === 'refused' || s === 'turnedAway';

/** Advance one gate's approach by one step. Pure: everything it knows is in `a` and `r`. Call it every frame
 * while the Steward is near; `seen` may be refreshed less often (line of sight is the expensive part). */
export function stepApproach(a: Approach, r: Reading): ApproachEvent | null {
  const C = APPROACH, [lo, hi] = r.span, along = Math.abs(r.lz);
  // A sealed gate refuses at the boom; an open one has nobody to ask. Neither runs an approach.
  if (r.scrutiny === 'refuse' || r.scrutiny === 'none') { reset(a); return null; }
  // Off the end of the line, or far enough off, the gate forgets: going round is the other way through, not this one.
  // An approach still running is followed out to `reach`; one that is settled is dropped at the edge of the zone.
  const inSpan = r.lx >= lo - 1 && r.lx <= hi + 1, running = a.stage === 'idle' || a.stage === 'noticed' || a.stage === 'challenged' || a.stage === 'refused';
  if (!inSpan || along > (running ? C.reach : C.outer) + C.leave) { const was = a.stage; reset(a); return was === 'challenged' || was === 'refused' ? 'turnedAway' : null; }
  // Distance to the line, positive on the approach side; before a side is chosen, just the distance.
  // (A jump of metres in one step is not walking: a ladder, a lift, a road home. It counts as arriving, not as speed.)
  const dt = Math.max(1e-3, r.dt), dist = a.side ? r.lz * a.side : along, moved = Math.hypot(r.lx - a.px, dist - a.prev), walked = moved <= C.stride, ease = Math.min(1, dt * 8);
  a.vel += ((walked ? (a.prev - dist) / dt : 0) - a.vel) * ease; a.speed += ((walked ? moved / dt : 0) - a.speed) * ease; a.prev = dist; a.px = r.lx;
  const late = Math.max(C.late, a.speed * C.lateLead), flagged = r.scrutiny === 'challenge';
  if (a.stage === 'idle') {
    // Noticed only on the way in, in the zone, and only if a crew man can see it.
    if (!r.seen || a.vel <= .2 || along > Math.max(C.outer, a.speed * (C.lead + C.noticeLead))) return null;
    a.side = Math.sign(r.lz) || 1; a.prev = along;
    // First seen with the boom already at hand: there is no time left to ask, so nobody asks.
    if (flagged && along < late) { a.stage = 'cleared'; return 'cleared'; }
    a.stage = 'noticed'; a.seenFor = 0; return 'notice';
  }
  if (a.stage === 'cleared' || a.stage === 'incident') return null;
  if (flaggedStage(a.stage)) {
    a.since += dt; a.warned += dt;
    // The patrols lost interest while he stood there: the challenge is withdrawn, not carried out.
    if (!flagged) { a.stage = 'noticed'; return 'released'; }
  }
  // Through the boom. Only a refusal that had time to be answered is an incident; anything quicker is let go with a word.
  if (dist <= 0) {
    const was = a.stage; a.stage = 'cleared';
    if (!flaggedStage(was)) return 'cleared';
    if (was !== 'refused' || a.since < C.grace || a.warned < C.warn || r.time - a.lastIncident < C.cooldown) return 'excused';
    a.stage = 'incident'; a.lastIncident = r.time; return 'incident';
  }
  if (a.stage === 'noticed') {
    a.seenFor += dt;
    if (!flagged || !r.seen || dist > Math.max(C.challengeAt, a.speed * C.lead)) return null;
    if (dist < late) { a.stage = 'cleared'; return 'cleared'; }
    // The look, then the word: a beat between them, unless by then it would be too late to ask.
    if (a.seenFor < C.beat && dist - Math.max(0, a.vel) * (C.beat - a.seenFor) > late) return null;
    a.stage = 'challenged'; a.window = C.window; a.closest = dist; a.still = a.since = a.renewed = 0; a.warned = 99; return 'challenge';
  }
  if (a.stage === 'challenged' || a.stage === 'refused') {
    a.closest = Math.min(a.closest, dist); a.window -= dt;
    a.still = Math.abs(a.vel) < C.stillSpeed ? a.still + dt : 0;
    if (dist > a.closest + C.retreat || a.still >= C.still) { a.stage = 'turnedAway'; a.furthest = dist; a.still = 0; return 'turnedAway'; }
    if (a.stage === 'challenged' && ((a.vel > C.stillSpeed && dist < Math.max(C.refuseAt, a.vel * C.refuseLead)) || a.window <= 0)) { a.stage = 'refused'; return 'refuse'; }
    return null;
  }
  // Turned away: watched, not stopped. Coming on again renews the challenge, with less patience.
  a.furthest = Math.max(a.furthest, dist);
  if (dist < a.furthest - C.readvance && a.vel > C.stillSpeed) { a.stage = 'challenged'; a.window = C.again; a.closest = dist; a.still = 0; if (++a.renewed === 1) a.warned = 0; return 'resume'; }
  return null;
}
