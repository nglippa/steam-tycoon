// Measures the ink pass in the game: ink share per distance band, far-line crawl in a slow yaw, frame time, and the
// pixel ratio over a strained session.
//   node tools/ink-measure.mjs <baseUrl> <out.json> --mode=ink [--before=<ink-renderer.ts of the old pass>] [--people=old] [--internal]
//   node tools/ink-measure.mjs <baseUrl> <out.json> --mode=strain --label=before|after
// `ink` keeps one page loaded at 1280x720, device scale 1. Each view is placed as tools/game-captures.mjs places it, and on
// one and the same rendered scene the ink quad is drawn again with a debug output per variant (the live shader and, with
// --before, the old one), read back and counted: R = ink strength, G = how much the ink darkened the pixel, B = distance
// of the line's nearer side (the kernel's nearest tap), so the sky half of a near roof's outline counts as near.
// `strain` loads 1920x1080 at device scale 2, burns 30 ms of every frame for 15 s, then lets the game run for 15 s, and
// samples the renderer's pixel ratio every half second. Results are merged into <out.json> under the mode (and label).
import { chromium } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), flag = (n, d = '') => (args.find(a => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const base = pos[0] ?? 'http://127.0.0.1:5731', outPath = pos[1] ?? 'screenshots/presentation/ink/measurements.json';
const mode = flag('mode', 'ink'), people = flag('people', 'old'), label = flag('label', 'run'), beforePath = flag('before', '');
// --internal: R counts internal lines only (creases and colour edges where there is no silhouette), as Ink VI's
// internal-lines.json did; the crawl and timing are skipped. Results go under `internal` instead of `ink`.
const internal = args.includes('--internal'), inkR = internal ? 'step(silhouette, .2) * max(crease * .85, colorEdge * .6) * (1. - text)' : 'clamp(ink, 0., 1.) * .95';
const out = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};

// The shader distance set of tools/game-captures.mjs: name, camera [x, z, yaw, eyeY, pitch] or a worker, weather.
const SHADER = [
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
const CRAWL = ['mid-street', 'veryfar-skyline-edge', 'far-clock-tower-rain'];

let browser; try { browser = await chromium.launch({ headless: true }); } catch { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
const big = mode === 'strain';
const page = await browser.newPage({ viewport: big ? { width: 1920, height: 1080 } : { width: 1280, height: 720 }, deviceScaleFactor: big ? 2 : 1 });
const problems = []; page.on('pageerror', e => problems.push(e.message)); page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
await page.goto(`${base}/?dev=1&intro=0&view=street&people=${people}&weather=clear&level=2`);
await page.waitForFunction(() => window.__TERRA__ && window.__TERRA__.status().draws > 0, null, { timeout: 90000 });
await page.evaluate(() => { const a = window.__TERRA__; a.economy.tick = () => {}; a.economy.state.day = .5; a.economy.state.settings.quality = 'high'; a.ui.onQuality(); });
const settle = ms => page.waitForTimeout(ms);

if (mode === 'strain') {
  await settle(1500);
  const samples = await page.evaluate(() => new Promise(done => {
    const a = window.__TERRA__, cv = document.querySelector('#world'), t0 = performance.now(), end = t0 + 15000, rows = [];
    let frames = [], prev = t0;
    const burn = () => { const t = performance.now(); frames.push(t - prev); prev = t; if (t < end) { while (performance.now() - t < 30); } if (t < t0 + 30000) requestAnimationFrame(burn); };
    requestAnimationFrame(burn);
    const tick = setInterval(() => {
      const t = performance.now() - t0, ms = frames.length ? frames.reduce((s, f) => s + f, 0) / frames.length : 0; frames = [];
      rows.push({ t: +(t / 1000).toFixed(1), pixelRatio: +a.renderer.getPixelRatio().toFixed(3), buffer: [cv.width, cv.height], frameMs: +ms.toFixed(1), load: t < 15000 });
      if (t >= 30000) { clearInterval(tick); done(rows); }
    }, 500);
  }));
  out.strain ??= {}; out.strain[label] = { viewport: [1920, 1080], deviceScaleFactor: 2, quality: 'high', burn: '30 ms per frame for the first 15 s', samples,
    start: samples[0].pixelRatio, lowest: Math.min(...samples.map(s => s.pixelRatio)), end: samples.at(-1).pixelRatio, problems };
  console.log(label, samples.map(s => `${s.t}s ${s.pixelRatio} (${s.frameMs}ms)`).join('\n'));
} else {
  // Variants: the live shader, and the old pass lifted from an older ink-renderer.ts.
  const variants = { after: null };
  if (beforePath) variants.before = readFileSync(beforePath, 'utf8').match(/fragmentShader: `([\s\S]*?)`,\n/)[1];
  await page.evaluate(([variants, inkR]) => {
    const R = window.__TERRA__.renderer, gl = R.getContext(), orig = R.render.bind(R), M = window.__ink = { hook: null };
    R.render = (s, c) => { const m = s.children[0]?.material, ink = !!m?.uniforms?.recovery; if (ink) { M.mat = m; M.scene = s; M.cam = c; M.live ??= m.fragmentShader; } const r = orig(s, c); if (ink && M.hook) { const h = M.hook; M.hook = null; h(); } return r; };
    M.src = { ...variants };
    M.debug = src => { const d = src.replace(/(\n\s*)(vec3 inkColor)/, '$1vec3 preInk = color;$1$2')
      .replace(/(color = (?:min\(color, )?mix\(color, inkColor[^;]*;)/, '$1\n        vec3 dbg = vec3(' + inkR + ', (luma(preInk) - luma(color)) * 4., nearest / 250.);')
      .replace(/gl_FragColor = vec4\(color, 1\.\);\s*#include <colorspace_fragment>/, 'gl_FragColor = vec4(clamp(dbg, 0., 1.), 1.);');
      if (!d.includes('vec3 preInk') || !d.includes('vec3 dbg') || d.includes('colorspace_fragment')) throw new Error('debug patch did not apply'); return d; };
    // Draw the ink quad again with `src` on the scene just rendered, and read the canvas back.
    M.draw = src => { const m = M.mat; m.fragmentShader = src; m.needsUpdate = true; R.setRenderTarget(null); orig(M.scene, M.cam); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { w, h, px }; };
    M.quad = src => { const m = M.mat; m.fragmentShader = src; m.needsUpdate = true; R.setRenderTarget(null); orig(M.scene, M.cam); };
    M.restore = () => { M.mat.fragmentShader = M.live; M.mat.needsUpdate = true; };
    M.next = fn => new Promise(done => { M.hook = () => done(fn()); });
    M.band = b => b < 30.6 ? 0 : b < 91.8 ? 1 : 2; // B = distance / 250 m in a byte: 30 m and 90 m
    M.stats = ({ px }) => { const n = [0, 0, 0], inked = [0, 0, 0], seen = [0, 0, 0], sumR = [0, 0, 0], sumG = [0, 0, 0];
      for (let i = 0; i < px.length; i += 4) { const k = M.band(px[i + 2]); n[k]++; sumR[k] += px[i]; sumG[k] += px[i + 1]; if (px[i] >= 51) inked[k]++; if (px[i + 1] >= 26) seen[k]++; }
      const total = px.length / 4, r = v => +v.toFixed(2);
      return ['near', 'mid', 'far'].map((name, k) => ({ band: name, areaPct: r(n[k] / total * 100), inkPctOfBand: r(n[k] ? inked[k] / n[k] * 100 : 0), inkPctOfScreen: r(inked[k] / total * 100), visiblePctOfBand: r(n[k] ? seen[k] / n[k] * 100 : 0), meanInk: r(n[k] ? sumR[k] / n[k] / 255 : 0), meanDarkening: r(n[k] ? sumG[k] / n[k] / 255 / 4 : 0) })); };
  }, [variants, inkR]);
  const live = await page.evaluate(() => window.__ink.next(() => window.__ink.mat.fragmentShader));
  const names = Object.keys(variants);
  const place = async (cam, weather) => {
    await page.evaluate(([cam, weather]) => { const a = window.__TERRA__; let c = cam;
      if (!Array.isArray(cam)) { const w = a.city.presentation.workers[cam.worker], g = w.person.group, ry = g.rotation.y; c = [g.position.x + Math.sin(ry) * cam.dist, g.position.z + Math.cos(ry) * cam.dist, ry, g.position.y + 1.75, cam.pitch ?? 0]; }
      a.atmosphere.override = weather; a.economy.state.day = .5; a.player.teleport(c[0], c[1], c[2], c[3]); a.player.pitch = c[4] ?? .05; }, [cam, weather]);
    await settle(1250);
  };
  const bands = {};
  for (const [name, cam, weather] of SHADER) {
    await place(cam, weather);
    bands[name] = await page.evaluate(names => window.__ink.next(() => { const M = window.__ink, r = {}; for (const v of names) r[v] = M.stats(M.draw(M.debug(M.src[v] ?? M.live))); M.restore(); return r; }), names);
    console.log(name, JSON.stringify(Object.fromEntries(names.map(v => [v, bands[name][v].map(b => b.inkPctOfBand)]))));
  }
  // Crawl: six consecutive frames, the view turning left by one buffer pixel at the centre per frame. Both variants are
  // drawn on every frame. Change per frame is measured raw and after shifting by the pan (the shift with the least change
  // over the central third of the screen), in the mid and far bands.
  const crawl = {};
  for (const name of internal ? [] : CRAWL) {
    const [, cam, weather] = SHADER.find(s => s[0] === name); await place(cam, weather);
    crawl[name] = await page.evaluate(names => new Promise(done => {
      const M = window.__ink, a = window.__TERRA__, frames = [];
      const f = (a.renderer.getContext().drawingBufferHeight / 2) / Math.tan(a.camera.fov * Math.PI / 360), step = 1 / f;
      const grab = () => { const per = {}; for (const v of names) { const { w, h, px } = M.draw(M.debug(M.src[v] ?? M.live)); const R = new Uint8Array(w * h), B = new Uint8Array(w * h); for (let i = 0, j = 0; j < w * h; i += 4, j++) { R[j] = px[i]; B[j] = px[i + 2]; } per[v] = { w, h, R, B }; } M.restore(); frames.push(per); a.player.yaw += step;
        if (frames.length < 6) M.hook = grab; else done(summary()); };
      const summary = () => Object.fromEntries(names.map(v => [v, [1, 2].map(k => { // 1 = mid, 2 = far
        let raw = 0, rawN = 0, ink = 0; const comp = {};
        for (let t = 1; t < frames.length; t++) { const A = frames[t - 1][v], C = frames[t][v], { w, h } = A;
          for (let j = 0; j < w * h; j++) if (M.band(A.B[j]) === k && M.band(C.B[j]) === k) { raw += Math.abs(C.R[j] - A.R[j]); ink += A.R[j]; rawN++; }
          for (const s of [-1, 0, 1, 2]) { comp[s] ??= [0, 0]; for (let y = 0; y < h; y++) for (let x = Math.floor(w / 3); x < Math.floor(2 * w / 3); x++) { const j = y * w + x, jj = y * w + x + s; if (M.band(A.B[j]) === k && M.band(C.B[jj]) === k) { comp[s][0] += Math.abs(C.R[jj] - A.R[j]); comp[s][1]++; } } } }
        const best = Object.entries(comp).map(([s, [sum, n]]) => [+s, n ? sum / n / 255 : 0]).sort((p, q) => p[1] - q[1])[0];
        return { band: k === 1 ? 'mid' : 'far', pixelsPerFrame: Math.round(rawN / (frames.length - 1)), meanInk: +(rawN ? ink / rawN / 255 : 0).toFixed(4), rawChange: +(rawN ? raw / rawN / 255 : 0).toFixed(4), shift: best[0], compensatedChange: +best[1].toFixed(4) };
      })]));
      M.hook = grab;
    }), names);
    console.log('crawl', name, JSON.stringify(crawl[name]));
  }
  // Frame time over 10 s at the street view with each variant live, then the ink quad alone timed with gl.finish around it.
  await place(SHADER[1][1], 'clear');
  const timing = {};
  for (const v of internal ? [] : names) {
    timing[v] = await page.evaluate(v => new Promise(done => { const M = window.__ink; M.mat.fragmentShader = M.src[v] ?? M.live; M.mat.needsUpdate = true;
      const t0 = performance.now() + 1000, ms = []; let prev = 0;
      const loop = t => { if (t > t0) { if (prev) ms.push(t - prev); prev = t; } if (t < t0 + 10000) requestAnimationFrame(loop); else { ms.sort((p, q) => p - q); const mean = ms.reduce((s, x) => s + x, 0) / ms.length; done({ frames: ms.length, meanMs: +mean.toFixed(2), p95Ms: +ms[Math.floor(ms.length * .95)].toFixed(2), fps: +(1000 / mean).toFixed(1) }); } };
      requestAnimationFrame(loop); }), v);
  }
  // The ink quad alone: 20 draws between two one-pixel reads (a read waits for the GPU), per variant, on 60 frames.
  const pass = internal ? {} : await page.evaluate(names => new Promise(done => { const M = window.__ink, gl = window.__TERRA__.renderer.getContext(), t = Object.fromEntries(names.map(v => [v, []])), one = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
    const once = () => { for (const v of names) { M.quad(M.src[v] ?? M.live); sync(); const t0 = performance.now(); for (let i = 0; i < 20; i++) M.quad(M.src[v] ?? M.live); sync(); t[v].push((performance.now() - t0) / 20); } M.restore();
      if (t[names[0]].length < 60) M.hook = once; else done(Object.fromEntries(names.map(v => { const s = t[v].slice(10).sort((p, q) => p - q); return [v, { medianMs: +s[s.length >> 1].toFixed(3), note: 'one full-screen ink quad, mean of 20 draws timed between one-pixel reads' }]; }))); };
    M.hook = once; }), names);
  for (const v of internal ? [] : names) timing[v].inkPass = pass[v];
  console.log('timing', JSON.stringify(timing));
  out[internal ? 'internal' : 'ink'] = { viewport: [1280, 720], deviceScaleFactor: 1, people, level: 2, day: .5, variants: names, bandsMeters: [30, 90], inkThreshold: .2, visibleThreshold: .025, bands, crawl, timing, problems };
}
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
await page.goto('about:blank'); await browser.close();
if (problems.length) console.log('problems:', problems.join('\n'));
