// The People/Presentation QA evidence: the cast matrix and seed rows from the cast sheet, the foot-slide measure, the in-game
// samples (Market Square, the street crowd, the final product test, a seated mug, an umbrella in rain), the intro's three
// figures, and the performance of the new figure builder against ?people=old. Capture and measure only.
//   node tools/qa-captures.mjs <baseUrl> <outDir> --part=sheet|game|perf|intro [--people=new|old]
// e.g. node tools/qa-captures.mjs http://127.0.0.1:5741 screenshots/presentation/qa --part=sheet
// Needs a dev server for the repo. One headless browser, one page at a time; game pages are 1280x720 at device scale 1, the
// line-up sheets 2560x720 (a wide canvas so eleven or twenty figures stand at a readable height). Results merge into
// <outDir>/perf.json, console.json, foot-slide.json, looks.json and captures.json.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), flag = (n, d = '') => (args.find(a => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const base = pos[0] ?? 'http://127.0.0.1:5741', out = pos[1] ?? 'screenshots/presentation/qa', part = flag('part', 'sheet'), people = flag('people', 'new');
mkdirSync(out, { recursive: true });
const merge = (file, key, value) => { const p = join(out, file), j = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}; j[key] = value; writeFileSync(p, JSON.stringify(j, null, 2) + '\n'); };
const launch = { headless: true, args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] };
let browser; try { browser = await chromium.launch(launch); } catch { browser = await chromium.launch({ ...launch, channel: 'chrome' }); }
const log = []; // console errors/warnings, page errors, failed requests and HTTP >= 400, per page load
function watch(page, label) {
  const entry = { page: label, url: '', messages: [] }; log.push(entry);
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) entry.messages.push({ type: m.type(), text: m.text(), at: m.location()?.url ?? '' }); });
  page.on('pageerror', e => entry.messages.push({ type: 'pageerror', text: e.message }));
  page.on('requestfailed', r => entry.messages.push({ type: 'requestfailed', text: `${r.url()} ${r.failure()?.errorText ?? ''}` }));
  page.on('response', r => { if (r.status() >= 400) entry.messages.push({ type: 'http', text: `${r.status()} ${r.url()}` }); });
  return entry;
}
const settle = (page, ms) => page.waitForTimeout(ms);

// ---- the cast sheet --------------------------------------------------------------------------------------------------
// The representatives of brief §13: [label, cast.family.frame, seed]. Seeds differ so no two share a face by construction.
const REPS = [
  ['slim civilian', 'rowSkirt.slim.narrow', 1], ['standard civilian', 'rowCoat.standard.broad', 2], ['sturdy civilian', 'stallholder.sturdy.broad', 3],
  ['young mechanic', 'youngMechanic.slim.narrow', 4], ['older mechanic', 'olderMechanic.sturdy.broad', 5], ['labourer', 'labourer.standard.broad', 6],
  ['foundry worker', 'foundry.sturdy.broad', 7], ['stallholder', 'stallholder.standard.narrow', 8], ['shop merchant', 'shopMerchant.standard.broad', 9],
  ['garrison soldier', 'garrison.sturdy.broad', 10], ['inspector', 'inspector.standard.broad', 11],
];
const repQuery = `build=new&combos=${REPS.map(r => r[1]).join(',')}&seeds=${REPS.map(r => r[2]).join(',')}`;
async function sheetShot(page, name, query, caption, { width = 2560, height = 720, relabel } = {}) {
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/sheet.html?${query}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  await page.evaluate(([caption, relabel]) => {
    const c = document.createElement('div'); c.textContent = caption; c.style.cssText = 'position:fixed;left:12px;top:10px;font:13px/1.3 ui-monospace,Menlo,monospace;color:#1d1d1b;background:#ffffffcc;padding:4px 8px;max-width:96vw'; document.body.append(c);
    if (relabel) [...document.querySelectorAll('.tag')].forEach((t, i) => { if (relabel[i]) { t.innerHTML = relabel[i]; t.style.lineHeight = '1.25'; t.style.textAlign = 'center'; } });
  }, [caption, relabel ?? null]);
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(name);
}

if (part === 'sheet') {
  const page = await browser.newPage({ viewport: { width: 2560, height: 720 }, deviceScaleFactor: 1 });
  const entry = watch(page, 'sheet.html (all sheet loads)'); entry.url = `${base}/sheet.html?…`;
  const repLabels = REPS.map(([label, combo, seed]) => `<b>${label}</b><br>${combo.split('.')[0]}<br>${combo.split('.').slice(1).join(' ')} · s${seed}`);
  const order = 'left to right: ' + REPS.map(r => r[0]).join(', ');
  const views = [['front', 'front'], ['quarter', '3/4'], ['side', 'side'], ['back', 'back']];
  for (const [i, [v, name]] of views.entries()) await sheetShot(page, `matrix-0${i + 1}-${v}`, `${repQuery}&view=${v}&pose=stand&fov=12`, `QA matrix · ${name} · standing idle (the game's animateLife idle) · new builder · review light`, { relabel: repLabels });
  await sheetShot(page, 'matrix-05-stride-front', `${repQuery}&view=front&pose=stride&fov=12`, 'QA matrix · walking (stride, peak knee) · front · new builder', { relabel: repLabels });
  await sheetShot(page, 'matrix-06-stride-side', `${repQuery}&view=side&pose=stride&fov=12`, 'QA matrix · walking (stride, peak knee) · side · new builder', { relabel: repLabels });
  await sheetShot(page, 'matrix-07-distance-50px', `${repQuery}&view=quarter&pose=stand&px=50&light=game`, `QA matrix · natural gameplay distance: ~50 px tall at the game's 68° FOV · 3/4 · game light · ${order}`, { width: 1280 });
  await sheetShot(page, 'matrix-08-distance-mid', `${repQuery}&view=quarter&pose=stand&px=110&light=game`, `QA matrix · mid distance: ~110 px tall at the game's 68° FOV · 3/4 · game light · ${order}`, { width: 1280 });
  await sheetShot(page, 'matrix-09-silhouette-front', `${repQuery}&view=front&pose=stand&fov=12&sil=1`, 'QA matrix · solid silhouette · front', { relabel: repLabels });
  await sheetShot(page, 'matrix-10-silhouette-side', `${repQuery}&view=side&pose=stand&fov=12&sil=1`, 'QA matrix · solid silhouette · side', { relabel: repLabels });

  // Procedurality: twenty seeds per street archetype, the game's own cast weights (no forced cast), front and 3/4. Each figure is
  // labelled with its resolved look (people/look.ts resolveLook, the same call citizenNext makes), and the looks are saved.
  const looks = {};
  for (const role of ['resident', 'worker', 'merchant', 'courier', 'engineer']) {
    await page.goto(`${base}/sheet.html?build=new&roles=${role}&seeds=0&pose=stand`); await page.waitForSelector('body[data-ready="1"]');
    const rows = await page.evaluate(async role => { const L = await import(location.origin + '/src/world/people/look.ts'), F = await import(location.origin + '/src/world/people/figure.ts');
      return Array.from({ length: 20 }, (_, seed) => ({ seed, ...L.resolveLook(seed, role, { casts: F.BUILT }) })); }, role);
    looks[role] = rows;
    const labels = rows.map(l => `<b>${l.seed}</b> ${l.cast}<br>${{ slim: 'sl', standard: 'sd', sturdy: 'su' }[l.family] ?? l.family}/${l.frame[0]} ${l.outfit.split('.')[1]}<br>${l.palette} f${l.faceType}${l.headShape[0]} s${l.skin}<br>${l.hat === 'none' ? '' : l.hat + ' '}${l.hairStyle}`);
    for (const v of ['front', 'quarter']) await sheetShot(page, `seeds-${role}-${v}`, `build=new&roles=${role}&seeds=0-19&view=${v}&pose=stand&fov=12`, `Procedurality · ${role} · seeds 0-19 · ${v === 'quarter' ? '3/4' : v} · the street's cast weights · label: seed cast / family(sl,sd,su)/frame(b,n) outfit / palette face-type+head-shape skin / hat hair`, { relabel: labels });
  }
  merge('looks.json', 'seeds0to19', looks);

  // The intro's three figures, as the intro builds them (person() with the story looks; the stranger masked), and the stranger seated.
  const introLabels = ['<b>introGuard</b><br>garrison (knocks)', '<b>introOrdinal</b><br>inspector (knocks)', '<b>masked</b><br>the stranger'];
  for (const v of ['front', 'quarter', 'side']) await sheetShot(page, `intro-figures-${v}`, `build=new&looks=introGuard,introOrdinal,masked&view=${v}&pose=stand&fov=12`, `The intro's three figures · ${v === 'quarter' ? '3/4' : v} · standing idle`, { width: 1280, relabel: introLabels });
  await sheetShot(page, 'intro-figures-sit', `build=new&looks=introGuard,introOrdinal,masked&view=quarter&pose=sit&fov=12`, 'The intro\'s three figures · seated pose (the stranger sits on the stoop) · 3/4', { width: 1280, relabel: introLabels });

  // Foot slide: the sheet's stride (animateLife 'walk' while the figure is moved at a steady pace), simulated at 60 Hz for 4 s
  // per figure. A foot is planted while its lowest vertex is within 1 cm of the lowest it gets; its drift is how far the ankle
  // pivot and the lowest point travel over the ground (world x/z) in one stance.
  const slide = await page.evaluate(async reps => {
    const C = await import(location.origin + '/src/world/citizens.ts'), Life = await import(location.origin + '/src/world/citizen-life.ts'), A = await import(location.origin + '/src/world/assets.ts'), F = await import(location.origin + '/src/world/people/figure.ts'), Look = await import(location.origin + '/src/world/people/look.ts');
    const res = [];
    for (const speed of [1, 1.4]) for (const [label, combo, seed] of reps) {
      const [cast, family, frame] = combo.split('.'), n = C.citizenNext(A.mats.rust, seed, Look.CASTS[cast].archetype, { solo: true, casts: F.BUILT, cast, family, frame });
      const V = n.group.position.constructor, player = new V(0, 1.7, 25), dt = 1 / 60, frames = [];
      n.group.rotation.y = 0;
      for (let i = 0; i < 60 * 6; i++) { const t = i * dt; n.group.position.set(0, 0, t * speed); Life.animateLife(n, 'walk', dt, t, false, player); n.group.updateMatrixWorld(true);
        if (i < 120) continue;
        frames.push(n.ankles.map(a => { const p = a.getWorldPosition(new V()); let low = null; a.traverse(o => { if (!o.isMesh) return; const pa = o.geometry.attributes.position, v = new V(); for (let k = 0; k < pa.count; k++) { v.fromBufferAttribute(pa, k).applyMatrix4(o.matrixWorld); if (!low || v.y < low.y) low = v.clone(); } }); return { ax: p.x, az: p.z, ay: p.y, lx: low.x, lz: low.z, ly: low.y }; })); }
      const feet = [0, 1].map(f => { const ys = frames.map(fr => fr[f].ly), floor = Math.min(...ys), stances = []; let cur = null;
        frames.forEach((fr, i) => { const s = fr[f], planted = s.ly < floor + .01; if (planted) { if (!cur) cur = { start: i, a0: [s.ax, s.az], l0: [s.lx, s.lz], aMax: 0, lMax: 0 }; cur.end = i; cur.aMax = Math.max(cur.aMax, Math.hypot(s.ax - cur.a0[0], s.az - cur.a0[1])); cur.lMax = Math.max(cur.lMax, Math.hypot(s.lx - cur.l0[0], s.lz - cur.l0[1])); cur.aEnd = [s.ax - cur.a0[0], s.az - cur.a0[1]]; } else if (cur) { stances.push(cur); cur = null; } });
        if (cur) stances.push(cur);
        const full = stances.filter(s => s.start > 0 && s.end < frames.length - 1 && s.end - s.start >= 3);
        return full.map(s => ({ frames: s.end - s.start + 1, ankleDriftCm: +(s.aMax * 100).toFixed(1), ankleNetCm: +(s.aEnd[1] * 100).toFixed(1), lowestPointDriftCm: +(s.lMax * 100).toFixed(1), bodyTravelCm: +((s.end - s.start) * dt * speed * 100).toFixed(1) })); });
      res.push({ label, combo, seed, speed, feet });
    }
    return res;
  }, REPS);
  merge('foot-slide.json', 'sheet', { method: 'sheet stride simulated at 60 Hz for 4 s after a 2 s warm-up; animateLife(n, "walk") with the figure moved along +z at `speed` m/s (the sheet uses 1 m/s); planted = the foot\'s lowest vertex within 1 cm of its lowest; drift = max horizontal travel during one stance; ankleNetCm = the ankle pivot\'s z travel from touchdown to lift-off (positive = forward with the body, i.e. skating)', figures: slide });
  merge('console.json', 'sheet', log);
  await page.close();
}

// ---- the game ---------------------------------------------------------------------------------------------------------
async function openGame(label, query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const entry = watch(page, label), url = `${base}/?dev=1&intro=0&view=street&people=${people}&weather=clear&level=2${query ? '&' + query : ''}`, t0 = Date.now(); entry.url = url;
  await page.goto(url);
  await page.waitForFunction(() => window.__TERRA__ && window.__TERRA__.status().draws > 0, null, { timeout: 90000 });
  entry.loadMs = Date.now() - t0;
  await page.evaluate(() => { const a = window.__TERRA__; a.economy.tick = () => {}; a.economy.state.day = .5; a.economy.state.settings.quality = 'high'; a.ui.onQuality(); });
  return { page, entry };
}
async function place(page, cam, weather) {
  await page.evaluate(([c, weather]) => { const a = window.__TERRA__; a.atmosphere.override = weather; a.economy.state.day = .5; a.player.teleport(c[0], c[1], c[2], c[3]); a.player.pitch = c[4] ?? .05; }, [cam, weather]);
  await settle(page, 400); await page.evaluate(() => { document.getElementById('toast').classList.remove('show'); document.body.classList.remove('toasting'); });
}
// Everyone who is out: the street's people and the staged workers, with their world position.
const PEOPLE_FN = `(() => { const a = window.__TERRA__, V = a.camera.position.constructor, list = [];
  for (const n of a.city.npcs) if (n.group.visible) list.push({ kind: 'npc', n, p: n.group.getWorldPosition(new V()) });
  for (const w of a.city.presentation.workers) if (w.person.group.visible) list.push({ kind: 'worker', n: w.person, w, p: w.person.group.getWorldPosition(new V()) });
  return list; })()`;
// How many people stand in view between `near` and `far` metres of a camera at [x, z, yaw], inside +-`half` radians of its heading.
// `block`: a candidate with anyone nearer than that in front (within the same angle) is passed over.
async function search(page, candidates, near, far, half, block = 0) {
  return page.evaluate(([cands, near, far, half, block, fn]) => { const people = eval(fn);
    return cands.map(c => { let n = 0, close = 0, blocked = false; const fx = -Math.sin(c[2]), fz = -Math.cos(c[2]);
      for (const { p } of people) { const dx = p.x - c[0], dz = p.z - c[1], d = Math.hypot(dx, dz); if (d > far || Math.abs(p.y) > 3) continue; const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / Math.max(d, 1e-6)))); if (ang >= half) continue; if (d < block) blocked = true; if (d < near) continue; n++; if (d < far * .6) close++; }
      return { cam: c, n, close, blocked }; }).filter(r => !r.blocked || r === undefined).sort((p, q) => q.n - p.n || q.close - p.close); }, [candidates, near, far, half, block, PEOPLE_FN]);
}
const facts = page => page.evaluate(() => { const a = window.__TERRA__; return { drawCalls: a.renderer.info.render.calls, triangles: a.renderer.info.render.triangles, pixelRatio: a.renderer.getPixelRatio(), weather: a.atmosphere.override, clockHour: +(a.economy.state.day * 24).toFixed(2), camera: [+a.camera.position.x.toFixed(2), +a.camera.position.y.toFixed(2), +a.camera.position.z.toFixed(2), +a.player.yaw.toFixed(3), +a.player.pitch.toFixed(3)] }; });
const records = [];
async function shot(page, name, note, extra = {}) { await settle(page, 700); await page.screenshot({ path: join(out, `${name}.png`) }); records.push({ name: `${name}.png`, note, people, ...(await facts(page)), ...extra }); console.log(name); }

if (part === 'game') {
  let { page } = await openGame(`game people=${people} (captures)`);
  await settle(page, 1500);
  // Market Square: the placement (inside the square, facing the Clock Tower to the north) with the most people 2.5-12 m away in view.
  const sq = []; for (let x = -5; x <= 5; x += 1) for (let z = -10; z >= -24; z -= 2) for (const yaw of [0, -.3, .3]) sq.push([x, z, yaw]);
  const productTest = async (tag, weathers) => {
    const best = (await search(page, sq, 2.5, 12, .6, 2.5))[0];
    for (const w of weathers) { await place(page, [...best.cam, undefined, .06], w); if (w !== 'clear') await settle(page, 1500);
      await shot(page, `product-test-${tag}${w}`, `Final product test (${tag || 'default state '}${w}): Market Square, the placement with the most people 2.5-12 m away in view, facing north: the HUD, the stalls and the Clock Tower beyond`, { inView12m: (await search(page, [best.cam], 2.5, 12, .6))[0], inView9m: (await search(page, [best.cam], 2.5, 9, .6))[0], ward: await page.evaluate(() => [...document.querySelectorAll('#clock, #weather, #ward, #curfew')].map(e => e.textContent.trim()).join(' · ')) }); } };
  // A closer Market Square sample: the placement (any heading) with the most people 2-7 m away in view and no one nearer than 2 m in front.
  const sq2 = []; for (let x = -6; x <= 6; x += 1) for (let z = -12; z >= -40; z -= 1) for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .5, -.5, Math.PI - .5, Math.PI + .5]) sq2.push([x, z, yaw]);
  const closeSample = async name => { const best = (await search(page, sq2, 2, 7, .55, 2))[0]; await place(page, [...best.cam, undefined, 0], 'clear');
    await shot(page, name, 'Market Square: the placement with the most people 2-7 m away in view (any heading, no one within 2 m in front)', { inView: (await search(page, [best.cam], 2, 7, .55))[0] }); };
  await productTest('', ['clear', 'rain', 'fog']);
  await closeSample('market-square-close');
  // The busy street: the Great Main placement with the most people 3-30 m away in view.
  const st = []; for (let x = -4; x <= 4; x += 2) for (let z = 10; z <= 74; z += 3) for (const yaw of [0, Math.PI]) st.push([x, z, yaw]);
  const bestSt = (await search(page, st, 3, 30, .6))[0];
  await place(page, [...bestSt.cam, undefined, .03], 'clear');
  await shot(page, 'street-crowd', 'The Great Main: the placement with the most people 3-30 m away in view', { inView: (await search(page, [bestSt.cam], 3, 30, .6))[0] });

  // A seated figure with a mug: every staged worker who sits with a mug (addWorker turns sit + mug into eat). Teleport near each
  // first (the Weatherside's people are only out once the viewer is west of x = -42), then shoot the first that is visible.
  const mugs = await page.evaluate(() => window.__TERRA__.city.presentation.workers.map((w, i) => ({ i, kind: w.kind, mug: !!w.person.group.userData.upright, p: w.base.toArray().map(v => +v.toFixed(2)), yaw: +w.person.group.rotation.y.toFixed(3) })).filter(w => w.mug && w.kind === 'eat'));
  let mugShot = null;
  for (const m of mugs) {
    const cam = [m.p[0] + Math.sin(m.yaw) * 2.2 + Math.cos(m.yaw) * .6, m.p[2] + Math.cos(m.yaw) * 2.2 - Math.sin(m.yaw) * .6, m.yaw + .27, m.p[1] + 1.6, -.12];
    await place(page, cam, 'clear'); await settle(page, 600);
    const vis = await page.evaluate(i => window.__TERRA__.city.presentation.workers[i].person.group.visible, m.i);
    m.visible = vis; if (vis && !mugShot) { mugShot = m; for (const k of [0, 1, 2]) { await settle(page, 700); await shot(page, `seated-mug-${k + 1}`, `a seated worker with a mug (worker ${m.i}, sip cycle frame ${k + 1})`, { worker: m }); }
      await place(page, [m.p[0] + Math.cos(m.yaw) * 2.4, m.p[2] - Math.sin(m.yaw) * 2.4, m.yaw + Math.PI / 2, m.p[1] + 1.3, -.1], 'clear'); await shot(page, 'seated-mug-side', `the same seated worker from their right side (what they sit on)`, { worker: m }); }
  }
  // Umbrellas in rain: a walking street person with an umbrella, shot from 3 m ahead of them.
  await place(page, [0, 30, 0, undefined, .03], 'rain'); await settle(page, 1200);
  const umb = await page.evaluate(fn => { const a = window.__TERRA__, ppl = eval(fn), cam = a.camera.position;
    const u = ppl.filter(q => q.kind === 'npc' && q.n.group.userData.umbrella?.visible).map(q => ({ i: a.city.npcs.indexOf(q.n), d: Math.hypot(q.p.x - cam.x, q.p.z - cam.z), p: [q.p.x, q.p.y, q.p.z], yaw: q.n.group.rotation.y })).sort((p, q) => p.d - q.d);
    return { open: u.length, total: a.city.npcs.filter(n => n.group.userData.umbrella).length, nearest: u[0] }; }, PEOPLE_FN);
  if (umb.nearest) { const { p, yaw } = umb.nearest; await place(page, [p[0] + Math.sin(yaw) * 3.4, p[2] + Math.cos(yaw) * 3.4, yaw, p[1] + 1.7, .12], 'rain'); await shot(page, 'umbrella-rain', 'rain: a walking street person with an open umbrella, from ahead', { umbrellas: umb }); }
  else records.push({ name: null, note: 'no open umbrella found in rain', umbrellas: umb });

  // Foot slide in the game: the ankle pivots of the walking people within 25 m of the street camera, every frame for 4 s.
  await place(page, [0, 40, 0, undefined, .03], 'clear'); await settle(page, 800);
  const gameSlide = await page.evaluate(fn => new Promise(done => { const a = window.__TERRA__, V = a.camera.position.constructor, cam = a.camera.position;
    const walkers = eval(fn).filter(q => q.kind === 'npc' && Math.hypot(q.p.x - cam.x, q.p.z - cam.z) < 25).map(q => q.n), track = walkers.map(() => []), t0 = performance.now();
    const tick = () => { walkers.forEach((n, k) => track[k].push({ t: performance.now() - t0, g: n.group.position.toArray(), f: n.ankles.map(an => an.getWorldPosition(new V()).toArray()) })); if (performance.now() - t0 < 4000) requestAnimationFrame(tick); else done(summary()); };
    const summary = () => track.map((s, k) => { const moved = Math.hypot(s.at(-1).g[0] - s[0].g[0], s.at(-1).g[2] - s[0].g[2]), speed = moved / (s.at(-1).t - s[0].t) * 1000; if (speed < .3) return null;
      const feet = [0, 1].map(f => { const ys = s.map(r => r.f[f][1]), floor = Math.min(...ys), st = []; let cur = null;
        s.forEach((r, i) => { const [x, y, z] = r.f[f]; if (y < floor + .015) { if (!cur) cur = { i0: i, p0: [x, z], max: 0 }; cur.i1 = i; cur.max = Math.max(cur.max, Math.hypot(x - cur.p0[0], z - cur.p0[1])); } else if (cur) { st.push(cur); cur = null; } });
        return st.filter(c => c.i0 > 0 && c.i1 - c.i0 >= 3).map(c => +(c.max * 100).toFixed(1)); });
      return { npc: a.city.npcs.indexOf(walkers[k]), speed: +speed.toFixed(2), frames: s.length, ankleDriftPerStanceCm: feet }; }).filter(Boolean);
    requestAnimationFrame(tick); }), PEOPLE_FN);
  merge('foot-slide.json', 'game', { method: 'walking street people within 25 m of the Great Main camera, ankle pivot world position each frame for 4 s; planted = ankle within 1.5 cm of its lowest; drift = max horizontal travel of the ankle pivot during one stance (the crowd batch drops the source geometry, so the lowest vertex is not available in game)', walkers: gameSlide });
  // The same square further along the market's story (?site=N: the market site's level, which lowers its occupation): a busier square.
  for (const s of [3, 5]) { await page.goto('about:blank'); await page.close(); ({ page } = await openGame(`game people=${people} site=${s} (captures)`, `site=${s}`)); await settle(page, 1500);
    await productTest(`site${s}-`, ['clear']); await closeSample(`market-square-site${s}-close`); }
  merge('captures.json', `game-${people}`, records);
  merge('console.json', `game-${people}`, log);
  await page.goto('about:blank'); await page.close();
}

// ---- performance ------------------------------------------------------------------------------------------------------
if (part === 'perf') {
  const { page, entry } = await openGame(`game people=${people} (perf)`);
  // CPU time of the game's frame callback and of its parts, by wrapping them on the live objects (the ?dev API).
  await page.evaluate(() => { const a = window.__TERRA__, P = window.__perf = { on: false, s: {} };
    const wrap = (o, k, name) => { const f = o[k].bind(o); o[k] = (...x) => { if (!P.on) return f(...x); const t = performance.now(), r = f(...x); (P.s[name] ??= []).push(performance.now() - t); return r; }; };
    wrap(a.city, 'update', 'cityUpdate'); wrap(a.city.presentation, 'update', 'presentationUpdate'); wrap(a.city.crowd, 'update', 'crowdBatchUpdate'); wrap(a.inkRenderer, 'render', 'renderSubmit');
    const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => raf(t => { if (cb.name !== 'frame' || !P.on) return cb(t); const s = performance.now(); cb(t); (P.s.frameCpu ??= []).push(performance.now() - s); (P.s.rafDelta ??= []).push(t - (P.last ?? t)); P.last = t; });
    // the ink quad: catch its material as it is drawn
    const R = a.renderer, orig = R.render.bind(R), M = window.__ink = { hook: null }; R.render = (s, c) => { const m = s.children[0]?.material, ink = !!m?.uniforms?.recovery; if (ink) { M.scene = s; M.cam = c; } const r = orig(s, c); if (ink && M.hook) { const h = M.hook; M.hook = null; h(); } return r; }; M.orig = orig; });
  const VIEWS = { street: [0, 40, 0, undefined, .03], marketSquare: [0, -12.5, 0, undefined, .07] }, result = { people, loadMs: entry.loadMs, views: {} };
  for (const [name, cam] of Object.entries(VIEWS)) {
    await place(page, cam, 'clear'); await settle(page, 2500);
    const r = await page.evaluate(() => new Promise(done => { const P = window.__perf; P.s = {}; P.last = undefined; P.on = true;
      setTimeout(() => { P.on = false; const st = v => { if (!v?.length) return null; const s = [...v].sort((p, q) => p - q), mean = s.reduce((x, y) => x + y, 0) / s.length; return { n: s.length, meanMs: +mean.toFixed(3), p50Ms: +s[s.length >> 1].toFixed(3), p95Ms: +s[Math.floor(s.length * .95)].toFixed(3), maxMs: +s.at(-1).toFixed(3) }; };
        done(Object.fromEntries(Object.entries(P.s).map(([k, v]) => [k, st(k === 'rafDelta' ? v.slice(1) : v)]))); }, 10000); }));
    const scene = await page.evaluate(() => new Promise(done => { const a = window.__TERRA__, info = a.renderer.info, mats = new Set(), peopleMats = new Set(); let meshes = 0;
      a.scene.traverseVisible(o => { if (o.isMesh || o.isBatchedMesh || o.isInstancedMesh) { meshes++; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m)); } });
      const batches = [...new Set(a.city.crowd.entries.map(e => e.batch))]; batches.forEach(b => peopleMats.add(b.material));
      const full = { drawCalls: info.render.calls, triangles: info.render.triangles, programs: info.programs.length, geometries: info.memory.geometries, textures: info.memory.textures };
      // the people's share: the same frame with the crowd's batches hidden (the staged scene figures outside the batch stay)
      batches.forEach(b => b.visible = false);
      requestAnimationFrame(() => requestAnimationFrame(() => { const without = { drawCalls: info.render.calls, triangles: info.render.triangles }; batches.forEach(b => b.visible = true);
        if (window.gc) window.gc(); const mem = performance.memory;
        done({ ...full, visibleMeshes: meshes, sceneMaterials: mats.size, crowdBatches: batches.length, crowdBatchMaterials: peopleMats.size, crowdInstances: a.city.crowd.entries.length,
          peopleDrawCalls: full.drawCalls - without.drawCalls, peopleTriangles: full.triangles - without.triangles, jsHeapUsedMB: +(mem.usedJSHeapSize / 1048576).toFixed(1), jsHeapTotalMB: +(mem.totalJSHeapSize / 1048576).toFixed(1), pixelRatio: a.renderer.getPixelRatio(), started: a.ui.started }); })); }));
    // The ink quad alone: 20 draws timed between two one-pixel reads, on 40 frames (median of the last 30), as tools/ink-measure.mjs does.
    const ink = await page.evaluate(() => new Promise(done => { const M = window.__ink, gl = window.__TERRA__.renderer.getContext(), one = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one), t = [];
      const once = () => { const R = window.__TERRA__.renderer; R.setRenderTarget(null); sync(); const t0 = performance.now(); for (let i = 0; i < 20; i++) M.orig(M.scene, M.cam); sync(); t.push((performance.now() - t0) / 20); if (t.length < 40) M.hook = once; else { const s = t.slice(10).sort((p, q) => p - q); done({ medianMs: +s[s.length >> 1].toFixed(3), note: 'one full-screen ink quad, mean of 20 draws timed between one-pixel reads, median over 30 frames' }); } };
      M.hook = once; }));
    result.views[name] = { camera: cam, timing: r, scene, inkQuad: ink };
    console.log(name, JSON.stringify(result.views[name]));
  }
  merge('perf.json', people, result);
  merge('console.json', `perf-${people}`, log);
  await page.goto('about:blank'); await page.close();
}

// ---- the intro, played ------------------------------------------------------------------------------------------------
if (part === 'intro') {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), entry = watch(page, `intro people=${people}`);
  entry.url = `${base}/?dev=1&people=${people}&weather=clear`; const t0 = Date.now();
  await page.goto(entry.url); await page.waitForFunction(() => window.__TERRA__ && window.__TERRA__.status().draws > 0, null, { timeout: 90000 }); entry.loadMs = Date.now() - t0;
  const beat = () => page.evaluate(() => window.__TERRA__.intro.beat);
  await page.evaluate(() => window.__TERRA__.ui.start()); await page.mouse.click(640, 360); await page.evaluate(() => window.__TERRA__.player.lock()); await settle(page, 300);
  const steps = [{ at: 'start', beat: await beat(), locked: await page.evaluate(() => window.__TERRA__.player.locked) }];
  for (let i = 0; i < 40 && (await beat()) === 'black'; i++) await settle(page, 250);
  steps.push({ at: 'after the knocks', beat: await beat() });
  await page.evaluate(() => window.__TERRA__.ui.onDoor()); await settle(page, 2000); steps.push({ at: 'door answered', beat: await beat() });
  await shot(page, 'intro-1-door-guards', 'the intro: the door answered, the two Ordinance men at it (their first line on the card)');
  // through the guards' lines: Enter on a line, 1 on a choice
  for (let i = 0; i < 60 && ['guards', 'open'].includes(await beat()); i++) { await page.keyboard.press('Digit1'); await settle(page, 350); await page.keyboard.press('Enter'); await settle(page, 350); }
  for (let i = 0; i < 40 && (await beat()) === 'leave'; i++) await settle(page, 250);
  steps.push({ at: 'guards gone', beat: await beat() });
  // The stranger sits on the stoop; walk the Steward down to them (teleport to the porch, the scene's own trigger).
  await page.evaluate(() => { const a = window.__TERRA__; a.player.teleport(-18.8, -3.1, -Math.PI / 2); a.player.pitch = -.05; }); await settle(page, 1800);
  steps.push({ at: 'at the porch', beat: await beat() });
  await shot(page, 'intro-2-stranger-porch', 'the intro: the masked stranger seated on the stoop, the porch line on the card');
  await page.evaluate(() => document.querySelector('#dialogue')?.setAttribute('style', 'visibility:hidden')); await shot(page, 'intro-2b-stranger-porch-nocard', 'the same moment with the dialogue card hidden for the figure'); await page.evaluate(() => document.querySelector('#dialogue')?.removeAttribute('style'));
  for (let i = 0; i < 60 && (await beat()) === 'porch'; i++) { await page.keyboard.press('Digit1'); await settle(page, 350); await page.keyboard.press('Enter'); await settle(page, 350); }
  steps.push({ at: 'farewell', beat: await beat() }); await settle(page, 300);
  await shot(page, 'intro-3-stranger-leaves', 'the intro: the stranger up from the stoop, going to chalk the doorpost');
  merge('captures.json', `intro-${people}`, { steps, shots: records });
  merge('console.json', `intro-${people}`, log);
  await page.goto('about:blank'); await ctx.close();
}
await browser.close();
