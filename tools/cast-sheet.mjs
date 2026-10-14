// Captures the cast sheet (sheet.html) to PNGs: node tools/cast-sheet.mjs <baseUrl> <outDir> [extraQuery] [roles]
// extraQuery is appended to every capture, e.g. `build=new` (the next figure builder); roles limits the cast, e.g. worker,resident
// e.g. node tools/cast-sheet.mjs http://127.0.0.1:5199 screenshots/presentation/people-baseline
// Needs a dev server for the repo (`npx vite --host 127.0.0.1 --port 5199`). One headless browser, one page, 1280x720 at scale 1.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base = 'http://127.0.0.1:5173', out = 'cast-sheet', extra = '', only = ''] = process.argv.slice(2);
const views = ['front', 'quarter', 'side', 'back'], poses = ['stride', 'sit', 'raise', 'carry', 'bite'];
const roles = (only || ['worker', 'engineer', 'merchant', 'guard', 'resident', 'courier', 'ordinal'].join(','));
const all = `roles=${roles}&seeds=3`;
const shots = [];
views.forEach((v, i) => shots.push([`01-stand-${v}`, `${all}&view=${v}&pose=stand`, i === 0]));
views.forEach(v => shots.push([`02-silhouette-${v}`, `${all}&view=${v}&pose=stand&sil=1`]));
shots.push(['03-distance-50px', `${all}&view=front&px=50`], ['03-distance-50px-silhouette', `${all}&view=front&px=50&sil=1`]);
for (const [i, p] of poses.entries()) for (const v of ['side', 'front']) shots.push([`04-${i + 1}-${p}-${v}`, `${all}&view=${v}&pose=${p}`]);
for (const r of (only ? only.split(',') : ['resident', 'worker', 'guard'])) shots.push([`05-seeds-0-19-${r}`, `roles=${r}&seeds=0-19&view=front&pose=stand`]);

mkdirSync(out, { recursive: true });
let browser;
try { browser = await chromium.launch({ headless: true }); }
catch { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  for (const [name, query, measure] of shots) {
    await page.goto(`${base}/sheet.html?${query}${extra ? '&' + extra : ''}`);
    await page.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
    await page.screenshot({ path: join(out, `${name}.png`) });
    if (measure) writeFileSync(join(out, 'measure.json'), JSON.stringify(await page.evaluate(() => window.__SHEET__.measure()), null, 2) + '\n');
    console.log(name);
  }
  if (problems.length) console.log('console problems:\n' + problems.join('\n'));
} finally { await browser.close(); }
