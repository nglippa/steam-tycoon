import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ThreatGrid, approaching, passed, intensity, reachOf, respond, jitter, CROSSINGS, crossingAt, crossingSamples, crosses, newGroup, stepGroup, groupPose, hushRadius, routeState, type Situation, type Threat, type GroupInput } from '../src/simulation/crowd.ts';
import type { Trait } from '../src/simulation/occupation.ts';

/** A heavy daytime street (the Lowworks at the start), a patrol 3 m off and coming. */
const heavy = (o: Partial<Situation> = {}): Situation => ({ trait: 'sociable', kind: 'patrol', distance: 3, coming: true, walking: true, occupation: .8, crackdown: false, curfew: 'none', seed: .37, ...o });
const civil: Trait[] = ['sociable', 'reserved', 'hurried', 'tired', 'nervous', 'curious', 'proud'];

test('the threat grid answers nearest-occupier questions exactly, on the same level, from live positions', () => {
  const g = new ThreatGrid(7), pts: Threat[] = [];
  for (let i = 0; i < 60; i++) { const t: Threat = { at: { x: (jitter(i, 1) - .5) * 120, y: jitter(i, 2) < .1 ? 4.5 : .18, z: (jitter(i, 3) - .5) * 120 }, kind: i % 3 ? 'sentry' : 'patrol' }; pts.push(t); g.add(t); }
  for (let q = 0; q < 200; q++) { const x = (jitter(q, 4) - .5) * 120, z = (jitter(q, 5) - .5) * 120, r = 2 + jitter(q, 6) * 9;
    let best: Threat | undefined, bd = r; for (const t of pts) { if (Math.abs(t.at.y - .18) > 2) continue; const d = Math.hypot(t.at.x - x, t.at.z - z); if (d < bd) { bd = d; best = t; } }
    const got = g.nearest(x, z, .18, r); assert.equal(got?.threat, best); if (best) assert.ok(Math.abs(got!.distance - bd) < 1e-9); }
  // Positions are read live: a man who walks off still answers where he is, and one can be passed over.
  const a = pts[0]; const near = g.nearest(a.at.x, a.at.z, a.at.y, 1)!; assert.equal(near.threat, a); a.at.x += .6; assert.ok(Math.abs(g.nearest(a.at.x - .6, a.at.z, a.at.y, 1)!.distance - .6) < 1e-9);
  assert.notEqual(g.nearest(a.at.x, a.at.z, a.at.y, 3, a)?.threat, a);
  g.clear(); assert.equal(g.nearest(0, 0, .18, 50), undefined); assert.equal(g.all.length, 0);
});

test('a patrol is approaching only from the front, and has passed once behind and clear', () => {
  const t: Threat = { at: { x: 5.4, y: .18, z: 30 }, kind: 'patrol', facing: { y: 0 } }; // walking north (+z)
  assert.equal(approaching(t, 5.1, 36), true); assert.equal(approaching(t, 5.1, 24), false);
  assert.equal(passed(t, 5.1, 36), false); assert.equal(passed(t, 5.1, 25), true); assert.equal(passed(t, 5.1, 28), false);
  assert.equal(approaching({ ...t, kind: 'sentry' }, 5.1, 36), false);
});

test('pause state: a tired walker stops for a passing patrol, then goes on restrained', () => {
  const r = respond(heavy({ trait: 'tired' }));
  assert.equal(r.reaction, 'pause'); assert.equal(r.rate, 0); assert.ok(r.hold > 1.5); assert.ok(r.exit > r.reach);
  const c = respond(heavy({ trait: 'curious' })); assert.equal(c.reaction, 'pause'); assert.equal(c.face, 'toward');
});

test('route avoidance: the hurried reroute without stopping; posts are given room but never lingered by; inspectors are waited for', () => {
  const h = respond(heavy({ trait: 'hurried' })); assert.equal(h.reaction, 'reroute'); assert.ok(h.rate >= 1); assert.ok(h.amplitude > 0);
  for (const trait of civil) { const r = respond(heavy({ trait, kind: 'sentry', coming: false, distance: 2 })); assert.ok(r.reaction !== 'pause' && r.reaction !== 'wait' && r.reaction !== 'turnAway', trait); assert.ok(r.rate >= 1, trait); }
  assert.equal(respond(heavy({ trait: 'nervous', kind: 'inspector', distance: 2.5 })).reaction, 'wait');
  assert.equal(respond(heavy({ trait: 'hurried', kind: 'inspector', distance: 2.5 })).reaction, 'reroute');
  // Posts are given a wider berth than a passing beat.
  assert.ok(reachOf('reserved', 'sentry', 1) > reachOf('reserved', 'patrol', 1));
});

test('cross-street: a nervous walker on a trusted crossing crosses from further off; without one, they turn away', () => {
  const far = heavy({ trait: 'nervous', distance: 8.5, canCross: true });
  assert.equal(respond(far).reaction, 'crossStreet'); assert.equal(respond(far).rate, 0);
  assert.equal(respond({ ...far, canCross: false }).reaction, 'none');
  assert.equal(respond({ ...far, coming: false, distance: 3 }).reaction, 'turnAway');
  assert.equal(respond({ ...far, trait: 'proud' }).reaction, 'none');
  assert.equal(crosses('nervous'), true); assert.equal(crosses('tired'), false); assert.equal(crosses('tired', true), true); assert.equal(crosses('proud', true), false); assert.equal(crosses('reserved', false, .5), false); assert.equal(crosses('reserved', false, 1), true);
  // The crossings are where the spec says: the Great Main's east walk at z 34.5..44 to the west kerb, and the housing lane.
  assert.equal(crossingAt(5.1, 38)?.to, -5.6); assert.equal(crossingAt(5.1, 20), undefined); assert.equal(crossingAt(-37.8, 28)?.to, -31.5); assert.equal(crossingAt(-37.8, 40), undefined);
  for (const c of CROSSINGS) { const s = crossingSamples(c); assert.ok(s.length > 40); assert.ok(s.some(([x]) => Math.abs(x - c.to) < 1e-6)); assert.ok(s.every(([, z]) => z >= c.z0 - 2 - 1e-6 && z <= c.z1 + 2 + 1e-6)); }
});

test('traits differ: the nervous react earliest and widest, the proud least, the hurried keep going', () => {
  const n = respond(heavy({ trait: 'nervous', distance: 1.5 })), p = respond(heavy({ trait: 'proud', distance: 1.5 })), h = respond(heavy({ trait: 'hurried', distance: 1.5 }));
  assert.equal(n.reaction, 'turnAway'); assert.equal(p.reaction, 'stepAside'); assert.equal(h.reaction, 'reroute');
  assert.ok(n.amplitude > p.amplitude * 2); assert.ok(n.reach > h.reach && h.reach > p.reach); assert.ok(n.delay < p.delay);
  assert.equal(n.rate, 0); assert.equal(p.rate, 1); assert.ok(h.rate >= 1);
  // The proud do not move for a patrol that is merely near in an ordinary heavy street.
  assert.equal(respond(heavy({ trait: 'proud', occupation: .5, distance: reachOf('proud', 'patrol', intensity(.5)) * .8 })).reaction, 'none');
});

test('nobody reacts in step: delays and amplitudes are seeded per person', () => {
  const delays = new Set<number>(), amps = new Set<number>();
  for (let i = 0; i < 20; i++) { const r = respond(heavy({ trait: 'tired', seed: i / 20 + .013 })); delays.add(+r.delay.toFixed(3)); amps.add(+r.amplitude.toFixed(3)); }
  assert.ok(delays.size >= 18); assert.ok(amps.size >= 18);
  // People standing by a post all learn of a crackdown at the same instant: their answers are spread over more than a second.
  const standing = Array.from({ length: 20 }, (_, i) => respond(heavy({ trait: 'reserved', kind: 'sentry', coming: false, walking: false, distance: 2, crackdown: true, seed: i / 20 + .013 })).delay);
  assert.ok(Math.max(...standing) - Math.min(...standing) > 1.2); assert.ok(Math.max(...standing) < 2.6);
});

const passBy = (g = newGroup(), base: Partial<GroupInput> = {}, cycles = 1) => {
  const input = (d: number): GroupInput => ({ kind: 'patrol', distance: d, occupation: .8, crackdown: false, curfew: 'none', seed: .41, ...base });
  const modes: string[] = [];
  for (let k = 0; k < cycles; k++) { for (let d = 14; d >= 1; d -= .5) { stepGroup(g, input(d), .3); modes.push(g.mode); } for (let d = 1; d <= 14; d += .5) { stepGroup(g, input(d), .3); modes.push(g.mode); }
    for (let t = 0; t < 30; t++) { stepGroup(g, { ...input(99), kind: null }, .5); modes.push(g.mode); } }
  return { g, modes };
};

test('conversations stop while a patrol passes and start again a little after it has gone', () => {
  const g = newGroup(), input = (d: number): GroupInput => ({ kind: 'patrol', distance: d, occupation: .8, crackdown: false, curfew: 'none', seed: .41 });
  stepGroup(g, input(12), .3); assert.equal(g.mode, 'talk'); assert.equal(groupPose(g, .41).speaks, true);
  stepGroup(g, input(5), .3); assert.equal(g.mode, 'hushed'); const pose = groupPose(g, .41); assert.equal(pose.speaks, false); assert.ok(pose.separation > .2 && pose.separation < .5);
  // Hysteresis: a patrol hovering on the edge does not switch them back on.
  stepGroup(g, input(hushRadius('patrol') + .5), .3); assert.equal(g.mode, 'hushed');
  stepGroup(g, input(12), .3); assert.equal(g.mode, 'hushed'); // gone, but not straight back to talk
  let t = 0; while (g.mode === 'hushed' && t < 20) { stepGroup(g, { ...input(99), kind: null }, .25); t += .25; }
  assert.equal(g.mode, 'talk'); assert.ok(t >= 1.5 && t <= 5.5, `resumed after ${t}s`);
  // Different pairs resume at different moments.
  const resume = (seed: number) => { const h = newGroup(); stepGroup(h, { ...input(3), seed }, .3); stepGroup(h, { ...input(20), seed }, .3); let s = 0; while (h.mode !== 'talk' && s < 20) { stepGroup(h, { ...input(99), kind: null, seed }, .1); s += .1; } return +s.toFixed(1); };
  assert.ok(new Set([.1, .3, .5, .7, .9].map(resume)).size >= 4);
});

test('repeated patrols break a conversation up under a crackdown, never in an ordinary heavy street', () => {
  const ordinary = passBy(newGroup(), {}, 4); assert.ok(!ordinary.modes.includes('dispersed'));
  const hard = passBy(newGroup(), { crackdown: true }, 3); assert.ok(hard.modes.includes('dispersed'));
  const g = hard.g; g.mode = 'dispersed'; const pose = groupPose(g, .41); assert.equal(pose.speaks, false); assert.ok(pose.separation > 1.2); assert.equal(pose.turnAway, true);
  // Lockdown does it too, more slowly; and no group forms right beside a post.
  assert.ok(passBy(newGroup(), { occupation: .9 }, 4).modes.includes('dispersed'));
  const post = newGroup(); stepGroup(post, { kind: 'sentry', distance: 2.2, occupation: .8, crackdown: false, curfew: 'none', seed: .2 }, .3); assert.equal(post.mode, 'dispersed');
  const inspected = newGroup(); stepGroup(inspected, { kind: 'inspector', distance: 2.2, occupation: .8, crackdown: false, curfew: 'none', seed: .2 }, .3); assert.equal(inspected.mode, 'hushed');
});

test('a crackdown strengthens every suppression: more room, sooner, wider, and longer to recover', () => {
  for (const trait of civil) { const a = respond(heavy({ trait, distance: 2 })), b = respond(heavy({ trait, distance: 2, crackdown: true }));
    assert.ok(b.reach > a.reach, trait); if (a.reaction !== 'none') { assert.ok(b.amplitude >= a.amplitude, trait); assert.ok(b.delay <= a.delay, trait); } }
  assert.ok(hushRadius('patrol', true) > hushRadius('patrol')); assert.ok(intensity(.6, true) > intensity(.6));
  const a = newGroup(), b = newGroup(), i: GroupInput = { kind: 'patrol', distance: 3, occupation: .8, crackdown: false, curfew: 'none', seed: .5 };
  for (const [g, c] of [[a, false], [b, true]] as const) { stepGroup(g, { ...i, crackdown: c }, .3); stepGroup(g, { ...i, crackdown: c, distance: 30 }, .3); }
  assert.ok(b.timer > a.timer);
});

test('curfew route state: social scenes go indoors, walkers become one-way transit, enforced curfew never pauses anyone', () => {
  for (const e of ['strict', 'normal'] as const) { const s = routeState(e, 'social'), w = routeState(e, 'walker');
    assert.equal(s.shown, false); assert.equal(routeState(e, 'merchant').shown, false); assert.equal(w.shown, true); assert.equal(w.transit, true); assert.equal(w.linger, false); assert.equal(w.width, 0); assert.ok(w.pace > 1); assert.equal(routeState(e, 'worker').shown, true); }
  assert.equal(routeState('lax', 'social', .35).shown, true); assert.equal(routeState('lax', 'walker', .35).transit, false);
  for (const trait of civil) { const r = respond(heavy({ trait, curfew: 'strict', distance: 2 })); assert.ok(!['pause', 'wait', 'turnAway'].includes(r.reaction), trait); if (r.reaction !== 'none') assert.ok(r.rate >= .9, trait); }
  // Day, held street: everything out, kerb-bound walking, no merchant spill.
  const day = routeState('none', 'walker', .8); assert.equal(day.shown, true); assert.equal(day.transit, false); assert.equal(day.width, 0); assert.equal(routeState('none', 'merchant', .8).spill, 0);
});

test('liberation removes the reactions: free streets keep their conversations, their full width and their merchants out front', () => {
  for (const trait of civil) for (const kind of ['patrol', 'sentry', 'inspector', 'checkpoint'] as const) assert.equal(respond(heavy({ trait, kind, occupation: .15, distance: .5 })).reaction, 'none', `${trait} ${kind}`);
  // A low street: only the nervous still flinch.
  assert.equal(respond(heavy({ trait: 'tired', occupation: .35, distance: 1 })).reaction, 'none'); assert.notEqual(respond(heavy({ trait: 'nervous', occupation: .35, distance: 1 })).reaction, 'none');
  assert.ok(!passBy(newGroup(), { occupation: .15 }, 3).modes.some(m => m !== 'talk')); assert.ok(!passBy(newGroup(), { occupation: .35 }, 3).modes.some(m => m !== 'talk'));
  const free = routeState('none', 'walker', .1); assert.equal(free.width, 1); assert.ok(routeState('none', 'merchant', .1).spill > 0);
  // Liberated at night: no curfew there at all, so the night street is as free as the day.
  assert.deepEqual(routeState('none', 'social', 0), routeState('none', 'social', .1));
});
