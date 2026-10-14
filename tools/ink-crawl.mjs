// Shimmer of static edges under a slow pan: the final picture (ink, wires, grade) over a sub-pixel yaw sequence.
//   node tools/ink-crawl.mjs <baseUrl> <outDir> [--people=old] [--frames=17] [--step=.25]
// One headless page at 1280x720, device scale 1. Each view is placed as tools/game-captures.mjs places it, the world is then
// frozen (city and atmosphere updates stop: no crowd, smoke or rain moves), and the view turns by `step` buffer pixels at the
// centre per frame. Every frame is read straight after the ink quad. Per pixel, over the sequence:
//   d1 = mean |L(t+1) - L(t)|, how much the pixel changes per frame (an edge passing through it);
//   d2 = mean |L(t+1) - 2 L(t) + L(t-1)|, how unevenly it changes. A soft, steady edge moving at a constant speed changes
//   its pixels by even amounts (d2 ~ 0); a beaded or thresholded edge jumps on and off (crawl), so d2 is the shimmer.
// L is luma 0-1. Means over the named regions (the review's crops, CSS px) and the central third. Writes <outDir>/crawl.json,
// and per view the first frame (crawl-<view>.png) and a map of d2 (crawl-<view>-d2.png, white = 0.1 or more).
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), flag = (n, d = '') => (args.find(a => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const base = pos[0] ?? 'http://127.0.0.1:5791', out = pos[1] ?? 'screenshots/presentation/ink-vii/after';
const people = flag('people', 'old'), frames = +flag('frames', '17'), step = +flag('step', '.25');
mkdirSync(out, { recursive: true });
// [x0, y0, x1, y1] in CSS px, from the review (review-ui-render-2.md §2, Q24-Q25).
const CLOCK = { foliage: [770, 410, 840, 445], cablesAbove: [690, 330, 730, 380], cablesBanner: [660, 370, 720, 420] };
const VIEWS = [
  ['mid-street', [0, 40, 0, undefined, 0.03], 'clear', { tree: [750, 330, 830, 410], checkpoint: [580, 310, 700, 420] }],
  ['far-clock-tower', [0, 6, 0, undefined, 0.2], 'clear', CLOCK],
  ['far-clock-tower-rain', [0, 6, 0, undefined, 0.2], 'rain', CLOCK],
  ['far-clock-tower-fog', [0, 6, 0, undefined, 0.2], 'fog', CLOCK],
];

let browser; try { browser = await chromium.launch({ headless: true }); } catch { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
const problems = [], result = { viewport: [1280, 720], deviceScaleFactor: 1, people, frames, stepPx: step, views: {} };
for (const [name, cam, weather, regions] of VIEWS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => problems.push(e.message)); page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
  await page.goto(`${base}/?dev=1&intro=0&view=street&people=${people}&weather=clear&level=2`);
  await page.waitForFunction(() => window.__TERRA__ && window.__TERRA__.status().draws > 0, null, { timeout: 90000 });
  await page.evaluate(([cam, weather]) => { const a = window.__TERRA__; a.economy.tick = () => {}; a.economy.state.day = .5; a.economy.state.settings.quality = 'high'; a.ui.onQuality();
    a.atmosphere.override = weather; a.player.teleport(cam[0], cam[1], cam[2], cam[3]); a.player.pitch = cam[4]; }, [cam, weather]);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(([regions, frames, step]) => new Promise(done => {
    const a = window.__TERRA__, R = a.renderer, gl = R.getContext(), orig = R.render.bind(R);
    a.city.update = () => {}; a.atmosphere.update = () => {}; // the world holds still; only the view turns
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, k = W / innerWidth, f = (H / 2) / Math.tan(a.camera.fov * Math.PI / 360), yaw0 = a.player.yaw;
    const lum = [], px = new Uint8Array(W * H * 4); let first = null, n = -2; // two frames to let the frozen world settle
    R.render = (s, c) => { const res = orig(s, c); if (s.children[0]?.material?.uniforms?.recovery) {
      if (n >= 0) { gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px); const L = new Float32Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4; L[y * W + x] = (.299 * px[i] + .587 * px[i + 1] + .114 * px[i + 2]) / 255; }
        lum.push(L); if (!first) first = px.slice(); }
      n++; a.player.yaw = yaw0 + Math.max(0, n) * step / f;
      if (lum.length === frames) { R.render = orig; done(summary()); } }
      return res; };
    const summary = () => {
      const d1 = new Float32Array(W * H), d2 = new Float32Array(W * H);
      for (let t = 1; t < frames; t++) for (let j = 0; j < W * H; j++) d1[j] += Math.abs(lum[t][j] - lum[t - 1][j]) / (frames - 1);
      for (let t = 1; t < frames - 1; t++) for (let j = 0; j < W * H; j++) d2[j] += Math.abs(lum[t + 1][j] - 2 * lum[t][j] + lum[t - 1][j]) / (frames - 2);
      const mean = ([x0, y0, x1, y1]) => { let s1 = 0, s2 = 0, c = 0, hot = 0; for (let y = Math.round(y0 * k); y < Math.round(y1 * k); y++) for (let x = Math.round(x0 * k); x < Math.round(x1 * k); x++) { const j = y * W + x; s1 += d1[j]; s2 += d2[j]; if (d2[j] >= .05) hot++; c++; } return { d1: +(s1 / c).toFixed(4), d2: +(s2 / c).toFixed(4), shimmerPct: +(hot / c * 100).toFixed(2) }; };
      const regionsOut = Object.fromEntries(Object.entries(regions).map(([key, box]) => [key, mean(box)]));
      regionsOut.centralThird = mean([innerWidth / 3, 0, innerWidth * 2 / 3, innerHeight]);
      const png = (fill) => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), im = cx.createImageData(W, H); fill(im.data); cx.putImageData(im, 0, 0); return cv.toDataURL('image/png'); };
      const frame0 = png(d => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((H - 1 - y) * W + x) * 4, o = (y * W + x) * 4; d[o] = first[i]; d[o + 1] = first[i + 1]; d[o + 2] = first[i + 2]; d[o + 3] = 255; } });
      const map = png(d => { for (let j = 0; j < W * H; j++) { const v = Math.min(255, d2[j] / .1 * 255), g = lum[0][j] * 60; d[j * 4] = Math.max(v, g); d[j * 4 + 1] = Math.max(v, g); d[j * 4 + 2] = Math.max(v, g); d[j * 4 + 3] = 255; } });
      return { buffer: [W, H], pixelRatio: R.getPixelRatio(), regions: regionsOut, frame0, map };
    };
  }), [regions, frames, step]);
  writeFileSync(join(out, `crawl-${name}.png`), Buffer.from(r.frame0.split(',')[1], 'base64'));
  writeFileSync(join(out, `crawl-${name}-d2.png`), Buffer.from(r.map.split(',')[1], 'base64'));
  result.views[name] = { camera: cam, weather, buffer: r.buffer, pixelRatio: r.pixelRatio, regions: r.regions };
  console.log(name, JSON.stringify(r.regions));
  await page.goto('about:blank'); await page.close();
}
result.problems = problems;
writeFileSync(join(out, 'crawl.json'), JSON.stringify(result, null, 2) + '\n');
await browser.close();
if (problems.length) console.log('problems:', problems.join('\n'));
