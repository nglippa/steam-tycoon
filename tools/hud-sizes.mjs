// Measures the live HUD at 1280x720, 1920x1080, 800x600, 900x600 and a phone (390x844), at noon in clear and at 23:40 in fog:
// each plate's box and computed font size, whether the ribbon overlaps the identity plate or the treasury, whether the status
// row or the weather's name is clipped, and the persistent plates' area as a share of the window; a screenshot per state.
//   node tools/hud-sizes.mjs <baseUrl> <out.json>
import { chromium } from '@playwright/test';
import { captureStubs } from './capture-stubs.mjs';
import { writeFileSync } from 'node:fs';
const base = process.argv[2], outPath = process.argv[3];
const browser = await chromium.launch({ headless: true }); const res = {};
const problems = [];
for (const [size, w, h, touch] of [['1280x720', 1280, 720, false], ['1920x1080', 1920, 1080, false], ['800x600', 800, 600, false], ['900x600', 900, 600, false], ['phone-390x844', 390, 844, true]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  await page.addInitScript(captureStubs); page.on('pageerror', e => problems.push(e.message));
  await page.goto(`${base}/?dev=1&intro=0&view=street&people=new&weather=clear`);
  await page.waitForFunction(() => window.__TERRA__ && window.__TERRA__.status().draws > 0, null, { timeout: 90000 });
  await page.evaluate(() => { const a = window.__TERRA__; a.economy.tick = () => {}; a.economy.state.settings.quality = 'high'; a.ui.onQuality(); });
  if (!touch) { await page.mouse.click(w / 2, h / 2); await page.evaluate(() => window.__TERRA__.player.lock()); }
  res[size] = {};
  for (const [state, weather, day] of [['normal', 'clear', .5], ['night-fog', 'fog', (23 + 40 / 60) / 24]]) {
    await page.evaluate(([weather, day]) => { const a = window.__TERRA__; a.atmosphere.override = weather; a.economy.state.day = day; a.player.teleport(0, 30, 0); document.getElementById('toast').classList.remove('show'); document.body.classList.remove('toasting'); }, [weather, day]);
    await page.waitForTimeout(1500);
    res[size][state] = await page.evaluate(() => {
      const box = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), fs: parseFloat(getComputedStyle(e).fontSize), disp: getComputedStyle(e).display }; };
      const sel = { identity: '#hud .identity', ribbon: '#hud .ribbon', meta: '#hud .meta', clock: '#clock', curfew: '#curfew', weather: '#weather', noun: '.ward-noun', tag: '#ward', overline: '.objective .overline', objective: '#hud-bottom .objective', controls: '#hud-bottom .controls', kbd: '.controls kbd', treasury: '#hud .treasury' };
      const o = Object.fromEntries(Object.entries(sel).map(([k, s]) => [k, box(s)]));
      const ov = (a, b) => a && b ? !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y) : null;
      const m = document.querySelector('#hud .meta'); const kids = [...m.children].filter(c => getComputedStyle(c).display !== 'none').map(c => Math.round(c.getBoundingClientRect().y));
      o.metaRows = new Set(kids).size; o.overlapIdentity = ov(o.ribbon, o.identity); o.overlapTreasury = ov(o.ribbon, o.treasury);
      o.metaClipped = m.scrollWidth > m.clientWidth + 1; o.weatherClipped = (() => { const e = document.querySelector('#weather'); return e.scrollWidth > e.clientWidth + 1; })();
      o.text = [...document.querySelectorAll('#clock, #curfew, #weather, .ward-noun, #ward')].map(e => e.textContent.trim()).filter(Boolean).join(' | ');
      o.area = ['#hud .identity', '#hud .ribbon', '#hud .treasury', '#hud-bottom .objective', '#hud-bottom .controls'].reduce((s, q) => { const r = document.querySelector(q).getBoundingClientRect(); return s + r.width * r.height; }, 0);
      o.areaPct = +(o.area / (innerWidth * innerHeight) * 100).toFixed(2);
      return o; });
    await page.screenshot({ path: outPath.replace('.json', `-${size}-${state}.png`) });
  }
  await page.close();
}
writeFileSync(outPath, JSON.stringify({ res, problems }, null, 1)); await browser.close(); console.log('done', problems.length);
