// People XX evidence: a batch of cast-sheet shots in ONE headless browser, one page, then exit. Capture only.
//   node tools/people-xx-captures.mjs <baseUrl> <outDir> <jobs.json>
// jobs.json: [{ "name": "dark-50px", "query": "build=new&combos=...&px=50&light=game", "width": 1280, "height": 720, "clip": [x, y, w, h], "scale": 4 }]
// `clip` crops the shot and `scale` enlarges the crop pixel-exact (nearest neighbour, done in the page so no image library is needed).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base = 'http://127.0.0.1:5199', out = 'screenshots/presentation/qa/people-xx', file] = process.argv.slice(2);
const jobs = JSON.parse(readFileSync(file, 'utf8'));
mkdirSync(out, { recursive: true });
let browser; try { browser = await chromium.launch({ headless: true }); } catch { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  for (const j of jobs) {
    await page.setViewportSize({ width: j.width ?? 1280, height: j.height ?? 720 });
    await page.goto(`${base}/sheet.html?${j.query}`);
    await page.waitForSelector('body[data-ready="1"]', { timeout: 90000 });
    if (j.caption) await page.evaluate(c => { const d = document.createElement('div'); d.textContent = c; d.style.cssText = 'position:fixed;left:8px;top:6px;font:12px ui-monospace,Menlo,monospace;color:#1d1d1b;background:#ffffffcc;padding:3px 6px'; document.body.append(d); }, j.caption);
    const shot = await page.screenshot(j.clip ? { clip: { x: j.clip[0], y: j.clip[1], width: j.clip[2], height: j.clip[3] } } : {});
    if (j.scale && j.scale > 1) {
      const big = await page.evaluate(async ([b64, k]) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/png').split(',')[1];
      }, [shot.toString('base64'), j.scale]);
      writeFileSync(join(out, `${j.name}.png`), Buffer.from(big, 'base64'));
    } else writeFileSync(join(out, `${j.name}.png`), shot);
    console.log(j.name);
  }
} finally { await browser.close(); }
if (errors.length) console.log('page errors:', errors.slice(0, 10));
