// Reproducible in-game captures: the HUD, the HUD's measured DOM, and the shader distance set.
//   node tools/game-captures.mjs <baseUrl> <outDir> [--people=old|new] [--sets=hud,shader,strain] [--query=extra&params]
// e.g. node tools/game-captures.mjs http://127.0.0.1:5731 screenshots/presentation/baseline
// Needs a dev server for the repo (`npx vite --host 127.0.0.1 --port 5731 --strictPort`). One headless browser, one page at a time,
// 1280x720 at device scale 1. Every shot pins position, heading, pitch, weather and the time of day (the game clock is frozen
// for the capture), and records them with the renderer's pixel ratio, the canvas buffer and the quality setting in captures.json.
// Pages are closed (about:blank) between sets so the game never idles.
// `strain` (not in the default sets) shoots the far and very-far views at 1920x1080, device scale 2, under load (as
// tools/ink-measure.mjs --mode=strain loads it; at 1280x720 the 1.5x cap sits under even the strained budget): a fresh page
// per view, 30 ms burnt in every frame for 15 s, the shot taken at the end of the load (the whole view at CSS scale, and the
// centre 640x360 CSS px at device scale), with the pixel ratio sampled every half second.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), flag = (n, d = '') => (args.find(a => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const base = pos[0] ?? 'http://127.0.0.1:5731', out = pos[1] ?? 'screenshots/presentation/baseline';
const people = flag('people', 'old'), sets = flag('sets', 'hud,shader').split(','), extra = flag('query', '');
const DAY = 0.5; // noon: the clock reads 12:00
mkdirSync(out, { recursive: true });

// Camera: [x, z, yaw, eyeY | undefined, pitch]. Facing is (-sin yaw, -cos yaw): yaw 0 looks north (-z), PI/2 looks west (-x).
const HUD = {
  street: [0, 30, 0, undefined, -0.02],            // the Great Main, the garrison at the checkpoint ahead
  prompt: [-8.6, 37, Math.PI / 2, undefined, 0],     // the Rook & Son Salvage board is the target
};
const SHADER = [
  // name, camera or { worker: index, dist }, weather
  ['close-character-storefront', { worker: 13, dist: 4, pitch: 0.02 }, 'clear'],
  ['mid-street', [0, 40, 0, undefined, 0.03], 'clear'],
  ['mid-market-square', [0, -12.5, 0, undefined, 0.07], 'clear'],
  ['far-clock-tower', [0, 6, 0, undefined, 0.2], 'clear'],
  ['far-rooftops-overview', [30, 65, 0.65, 25, -0.22], 'clear'],
  ['veryfar-skyline-edge', [0, 84.5, Math.PI + 0.3, undefined, 0.02], 'clear'],
  ['mid-market-square-rain', [0, -12.5, 0, undefined, 0.07], 'rain'],
  ['far-clock-tower-rain', [0, 6, 0, undefined, 0.2], 'rain'],
  ['mid-market-square-fog', [0, -12.5, 0, undefined, 0.07], 'fog'],
  ['far-clock-tower-fog', [0, 6, 0, undefined, 0.2], 'fog'],
];

let browser;
try { browser = await chromium.launch({ headless: true }); } catch { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
const problems = [], records = [];
let page;
async function open(query, deviceScaleFactor = 1, viewport = { width: 1280, height: 720 }) {
  page = await browser.newPage({ viewport, deviceScaleFactor });
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  const url = `${base}/?dev=1&intro=0&view=street&people=${people}&${query}${extra ? '&' + extra : ''}`, t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__TERRA__ && window.__TERRA__.status().draws > 0, null, { timeout: 90000 });
  const loadMs = Date.now() - t0;
  // The clock stands still for the capture; weather is set by the shot.
  await page.evaluate(day => { const a = window.__TERRA__; a.economy.tick = () => {}; a.economy.state.day = day; a.economy.state.settings.quality = 'high'; a.ui.onQuality(); }, DAY);
  return { url, loadMs };
}
const close = async () => { await page.goto('about:blank').catch(() => {}); await page.close(); };
const settle = ms => page.waitForTimeout(ms);
async function lock() { await page.mouse.click(640, 360); await page.evaluate(() => window.__TERRA__.player.lock()); await settle(400); return page.evaluate(() => ({ locked: window.__TERRA__.player.locked, fallback: window.__TERRA__.player.fallback })); }
async function place(cam, weather) {
  return page.evaluate(([cam, weather]) => {
    const a = window.__TERRA__; let c = cam;
    if (!Array.isArray(cam)) { const w = a.city.presentation.workers[cam.worker], g = w.person.group, ry = g.rotation.y; c = [g.position.x + Math.sin(ry) * cam.dist, g.position.z + Math.cos(ry) * cam.dist, ry, g.position.y + 1.75, cam.pitch ?? 0]; }
    a.atmosphere.override = weather; a.economy.state.day = 0.5; a.player.teleport(c[0], c[1], c[2], c[3]); a.player.pitch = c[4] ?? 0.05; return c;
  }, [cam, weather]).then(async c => {
    // Walking into a ward says so in a toast for five seconds; the capture dismisses it so it never covers the view.
    await settle(350); await page.evaluate(() => { document.getElementById('toast').classList.remove('show'); document.body.classList.remove('toasting'); }); return c;
  });
}
const facts = () => page.evaluate(() => {
  const a = window.__TERRA__, cv = document.querySelector('#world');
  return { pixelRatio: a.renderer.getPixelRatio(), devicePixelRatio, canvasBuffer: [cv.width, cv.height], canvasCss: [cv.clientWidth, cv.clientHeight], quality: a.economy.state.settings.quality, drawCalls: a.renderer.info.render.calls, triangles: a.renderer.info.render.triangles, clockHour: +(a.economy.state.day * 24).toFixed(2), weather: a.atmosphere.override, stage: a.economy.stage, camera: { x: +a.camera.position.x.toFixed(3), y: +a.camera.position.y.toFixed(3), z: +a.camera.position.z.toFixed(3), yaw: +a.player.yaw.toFixed(4), pitch: +a.player.pitch.toFixed(4) }, locked: a.player.locked, people: new URLSearchParams(location.search).get('people') };
});
async function shot(name, record) {
  await settle(900);
  await page.screenshot({ path: join(out, `${name}.png`) });
  const f = await facts(); records.push({ name: `${name}.png`, url: page.url(), ...f, ...record }); console.log(name);
}

// ---- measuring the HUD's real DOM ---------------------------------------------------------------
const measure = (sel, kids) => page.evaluate(([sel, kids]) => {
  const px = v => parseFloat(v), r1 = n => Math.round(n * 100) / 100;
  const one = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return { x: r1(r.x), y: r1(r.y), w: r1(r.width), h: r1(r.height), fontSize: px(s.fontSize), lineHeight: s.lineHeight, fontWeight: s.fontWeight, fontFamily: s.fontFamily.split(',')[0].replace(/"/g, ''), letterSpacing: s.letterSpacing, padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(px), borderWidth: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(px), color: s.color, background: s.backgroundColor, opacity: s.opacity }; };
  const el = document.querySelector(sel); if (!el) return null;
  return { selector: sel, ...one(el), children: Object.fromEntries(kids.map(k => { const c = el.querySelector(k); return [k, c ? one(c) : null]; })) };
}, [sel, kids]);
const PERSISTENT = [
  ['identityPlate', '#hud .identity', ['svg', '#ward-name']],
  ['compassRibbon', '#hud .ribbon', ['.tape', '#clock', '#weather', '#ward', '#curfew']],
  ['treasury', '#hud .treasury', ['small', '.coin', '#crowns', '.income']],
  ['objectiveTicket', '#hud-bottom .objective', ['.overline', '#objective', '.steps', '#step-no', '#stage']],
  ['keyHints', '#hud-bottom .controls', ['span', 'kbd', '.ledger-control']],
];

if (sets.includes('hud')) {
  const { url, loadMs } = await open('weather=clear');
  const lk = await lock();
  const measureOut = { viewport: [1280, 720], url, people, lock: lk, persistent: {}, transient: {} };
  await place(HUD.street, 'clear');
  await page.evaluate(() => { document.getElementById('toast').classList.remove('show'); document.body.classList.remove('toasting'); });
  await shot('hud-normal', { set: 'hud', note: 'persistent HUD, standing in the Great Main, pointer locked', lock: lk, loadMs });
  for (const [k, sel, kids] of PERSISTENT) measureOut.persistent[k] = await measure(sel, kids);
  const area = Object.values(measureOut.persistent).reduce((s, e) => s + e.w * e.h, 0);
  measureOut.persistentAreaPx = Math.round(area); measureOut.persistentAreaPercent = +(area / (1280 * 720) * 100).toFixed(2);
  measureOut.hud = await measure('#hud', []); measureOut.hudBottom = await measure('#hud-bottom', []);
  // The top band: from the top of the viewport to the bottom of the tallest top plate.
  measureOut.topBandPx = Math.max(...['identityPlate', 'compassRibbon', 'treasury'].map(k => measureOut.persistent[k].y + measureOut.persistent[k].h));
  // toast
  await page.evaluate(() => window.__TERRA__.ui.toast('The Copper Finch reopens. By morning, someone has chalked a small ember on its cellar door.', 60000));
  await settle(700); await shot('hud-toast', { set: 'hud', note: 'a toast showing', lock: lk });
  measureOut.transient.toast = await measure('#toast', ['.t-over']);
  // A ward change: the toast with its overline.
  await page.evaluate(() => window.__TERRA__.ui.toast('Heavy occupation. More patrols · Curfew enforced · Commerce suppressed.', 60000, 'Cinder Row · Occupation 80%'));
  await settle(400); measureOut.transient.toastWard = await measure('#toast', ['.t-over']);
  await page.evaluate(() => window.__TERRA__.ui.toast('Commission approved. The civic engineers are on their way.', 100));
  await settle(1500);
  // interaction prompt
  await place(HUD.prompt, 'clear'); await settle(500);
  const prompt = await page.evaluate(() => { const e = document.getElementById('interaction'); return { hidden: e.hidden, text: e.textContent }; });
  await shot('hud-prompt', { set: 'hud', note: 'interaction prompt for the Rook workbench', prompt, lock: lk });
  measureOut.transient.prompt = { ...(await measure('#interaction', ['kbd', 'small'])), text: prompt.text, hidden: prompt.hidden };
  // dialogue line (the opening's card, flashed over the street)
  await place(HUD.street, 'clear');
  const said = await page.evaluate(() => window.__TERRA__.city.presentation.rookYard.onLine({ who: 'Rook', text: 'That crate was meant for the governors. It stays where it is.' }));
  await settle(500); await shot('hud-dialogue', { set: 'hud', note: 'a dialogue line flashed over the street', said, lock: lk });
  measureOut.transient.dialogue = await measure('#dialogue .dlg-card', ['.overline', 'p', 'small']);
  writeFileSync(join(out, 'hud-measure.json'), JSON.stringify(measureOut, null, 2) + '\n');
  await close();
}

if (sets.includes('shader')) {
  const { url, loadMs } = await open('weather=clear&level=2');
  for (const [name, cam, weather] of SHADER) {
    const c = await place(cam, weather);
    await shot(`shader-${name}`, { set: 'shader', shot: name, requested: cam, placed: c, loadMs, level: 2 });
  }
  await close();
}
// `product` (not in the default sets): the QA product-test placement in Market Square (tools/qa-captures.mjs: inside the
// square, facing the Clock Tower) in clear, rain and fog at noon and clear at 23:00, each shot with the HUD and again with the
// HUD hidden (`-world`), with the HUD plates' boxes, so the text contrast can be taken against the real pixels behind them.
if (sets.includes('product')) {
  const { loadMs } = await open('weather=clear&level=2'); const lk = await lock();
  for (const [w, day] of [['clear', .5], ['rain', .5], ['fog', .5], ['clear', 23 / 24]]) {
    const c = await place([-5, -16, 0, undefined, .06], w); await page.evaluate(day => { window.__TERRA__.economy.state.day = day; }, day); await settle(w === 'clear' ? 600 : 1500);
    const tag = `product-test-${w}${day > .9 ? '-night' : ''}`;
    const boxes = await page.evaluate(() => Object.fromEntries([['identity', '#hud .identity'], ['ribbon', '#hud .ribbon'], ['treasury', '#hud .treasury'], ['objective', '#hud-bottom .objective'], ['hints', '#hud-bottom .controls']].map(([k, s]) => { const r = document.querySelector(s).getBoundingClientRect(); return [k, [r.x, r.y, r.width, r.height].map(Math.round)]; })));
    const status = await page.evaluate(() => [...document.querySelectorAll('#clock, #phase, #curfew, #weather, .ward-noun, #ward')].map(e => e.id === 'phase' ? `(${e.dataset.phase})` : e.textContent.trim()).filter(Boolean).join(' · '));
    await shot(tag, { set: 'product', note: 'Market Square product-test placement, HUD shown', placed: c, boxes, status, lock: lk, loadMs });
    await page.evaluate(() => { for (const s of ['#hud', '#hud-bottom', '#crosshair', '#marker']) document.querySelector(s).style.visibility = 'hidden'; });
    await shot(`${tag}-world`, { set: 'product', note: 'the same frame with the HUD hidden: the world behind the plates', placed: c, boxes });
    await page.evaluate(() => { for (const s of ['#hud', '#hud-bottom', '#crosshair', '#marker']) document.querySelector(s).style.visibility = ''; });
  }
  await close();
}
if (sets.includes('strain')) {
  for (const [name, cam, weather] of SHADER.filter(s => /^(far|veryfar)-/.test(s[0]))) {
    const { loadMs } = await open('weather=clear&level=2', 2, { width: 1920, height: 1080 });
    const c = await place(cam, weather); await settle(1500);
    const samples = await page.evaluate(() => new Promise(done => {
      const a = window.__TERRA__, t0 = performance.now(), rows = []; let frames = [], prev = t0;
      const burn = () => { const t = performance.now(); frames.push(t - prev); prev = t; if (t < t0 + 15000) { while (performance.now() - t < 30); requestAnimationFrame(burn); } };
      requestAnimationFrame(burn);
      const tick = setInterval(() => { const t = performance.now() - t0, ms = frames.length ? frames.reduce((s, f) => s + f, 0) / frames.length : 0; frames = [];
        rows.push({ t: +(t / 1000).toFixed(1), pixelRatio: +a.renderer.getPixelRatio().toFixed(3), frameMs: +ms.toFixed(1) }); if (t >= 14600) { clearInterval(tick); done(rows); } }, 500);
    }));
    await page.screenshot({ path: join(out, `strain-${name}.png`), scale: 'css' });
    await page.screenshot({ path: join(out, `strain-${name}-centre-2x.png`), clip: { x: 640, y: 270, width: 640, height: 360 } });
    const f = await facts(); records.push({ name: `strain-${name}.png`, url: page.url(), ...f, set: 'strain', shot: name, deviceScaleFactor: 2, burn: '30 ms per frame, shot at 15 s while still loaded', placed: c, loadMs, level: 2, samples, start: samples[0].pixelRatio, lowest: Math.min(...samples.map(s => s.pixelRatio)), atShot: f.pixelRatio });
    console.log(`strain-${name}`, samples[0].pixelRatio, '->', f.pixelRatio);
    await close();
  }
}
// Runs of different sets into one folder add to its captures.json (a shot taken again replaces its record).
const known = existsSync(join(out, 'captures.json')) ? JSON.parse(readFileSync(join(out, 'captures.json'), 'utf8')).shots.filter(r => !records.some(n => n.name === r.name)) : [];
writeFileSync(join(out, 'captures.json'), JSON.stringify({ base, people, day: DAY, viewport: [1280, 720], deviceScaleFactor: 1, problems, shots: [...known, ...records] }, null, 2) + '\n');
if (problems.length) console.log('console problems:\n' + problems.join('\n'));
await browser.close();
