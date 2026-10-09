// The HUD's layout states as a static mock: the real interface.ts template, the touch controls' markup and style.css over a
// game screenshot (no game code runs), shot and measured in one headless browser.
//   node tools/hud-mock.mjs <outDir> [--bg=screenshots/presentation/people-game/01-street-north.png] [--only=desk-normal,...]
// Desktop 1920x1080 (hd) and 1280x720 and narrow 800x600 states, phone portrait 390x844 and landscape 844x390 (touch, coarse pointer). Each shot
// is hud-mock-<view>-<state>.png; hud-mock-states.json holds every box (CSS px), the font sizes, clipped elements, the
// persistent area and the top band. The query string of the mock sets the HUD's text and state (see STATES).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), flag = (n, d = '') => (args.find(a => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const root = resolve('.'), out = resolve(pos[0] ?? 'screenshots/presentation/hud-iv'), bg = resolve(flag('bg', 'screenshots/presentation/people-game/01-street-north.png'));
const only = flag('only', '').split(',').filter(Boolean);
mkdirSync(out, { recursive: true });

// ---- the mock page --------------------------------------------------------------------------------------------------
const ts = readFileSync(`${root}/src/ui/interface.ts`, 'utf8');
const tpl = ts.slice(ts.indexOf('this.app.innerHTML = `') + 22, ts.indexOf('`;\n    document.body.classList.toggle'));
const crest = ts.match(/const crest = `([^`]*)`/)[1];
const touchTs = readFileSync(`${root}/src/player/touch.ts`, 'utf8'), touchHtml = touchTs.match(/this\.root\.innerHTML = `([^`]*)`/)[1];
const K = 2, COMPASS_LABELS = Array.from({ length: 25 }, (_, i) => { const d = i * 45, n = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][i % 8]; return `<span class="${n.length === 1 ? 'card' : ''}" style="left:${d * K}px">${n}</span>`; }).join('');
const OBJECTIVE = readFileSync(`${root}/src/simulation/intro.ts`, 'utf8').match(/export const OBJECTIVE = '([^']*)'/)?.[1] ?? 'Report to work at Rook & Son Salvage.';
const html = new Function('crest', 'COMPASS_LABELS', 'OBJECTIVE', 'economy', 'return `' + tpl + '`')(crest, COMPASS_LABELS, OBJECTIVE, { state: { playtime: 0 } });
const dir = mkdtempSync(join(tmpdir(), 'hud-mock-')), mock = join(dir, 'mock.html');
writeFileSync(mock, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${root}/src/ui/style.css">
<style>:root{--terra-paper:#f2e4c9}</style></head><body class="started playing">
<img id="world" src="file://${bg}" style="object-fit:cover">
<div id="app">${html}<div id="dialogue" hidden role="dialog"><div class="dlg-card"><span class="overline">ROOK</span><p>That crate was meant for the governors. It stays where it is.</p></div><div class="dlg-choices"></div></div><button id="skip" type="button">SKIP<kbd>X</kbd></button></div>
<script>
const q = new URLSearchParams(location.search), $ = s => document.querySelector(s), put = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
if (q.get('body')?.split(',').includes('touch')) { const t = document.createElement('div'); t.id = 'touch'; t.className = 'live'; t.innerHTML = ${JSON.stringify(touchHtml)}; document.body.append(t); }
document.getElementById('strip').style.transform = 'translate3d(' + (-(360 + (+q.get('heading') || 0)) * 2) + 'px,0,0)';
put('clock', q.get('clock') || '12:00'); put('weather', q.get('weather') || 'CLEAR SKIES'); put('crowns', q.get('crowns') || '36'); put('rate', q.get('rate') || '+1.3');
const phase = $('#phase'); if (phase) { const [h, m] = (q.get('clock') || '12:00').split(':').map(Number), night = -Math.cos((h / 24 + m / 1440) * Math.PI * 2) <= .225; phase.dataset.phase = night ? 'night' : 'day'; phase.title = night ? 'Night' : 'Day'; }
put('ward-name', q.get('ward') || 'THE LOWWORKS'); put('stage', q.get('stage') || 'PROSPERITY 0 / 5 · THE LOWWORKS');
const band = q.get('band') || 'heavy', tag = $('#ward'); tag.dataset.band = band; put('ward', q.get('tag') || ({ liberated: 'FREE 12%', low: 'LOW 30%', controlled: 'HELD 55%', heavy: 'HEAVY 80%', lockdown: 'LOCKDOWN 100%' })[band]);
if (q.get('curfew')) { put('curfew', q.get('curfew')); $('#curfew').classList.toggle('on', q.get('curfew') === 'CURFEW'); }
if (q.get('objective')) put('objective', q.get('objective'));
if (q.has('pin')) { const p = $('#rb-pin'), half = Math.max(0, $('#hud .tape').clientWidth / 2 - 12), side = q.get('side'); p.hidden = false; if (side) p.dataset.side = side; // parked as interface.ts parks it
  p.style.transform = 'translate3d(' + (side ? (side === 'l' ? -half : half) : Math.max(-half, Math.min(half, +q.get('pin')))) + 'px,0,0)'; }
const s = q.get('state') || 'normal';
for (const c of (q.get('body') || '').split(',').filter(Boolean)) document.body.classList.add(c);
if (s === 'welcome') { document.body.classList.remove('started', 'playing'); } else $('#welcome').hidden = true;
if (s === 'prompt') { const p = $('#interaction'); p.hidden = false; p.innerHTML = '<kbd>E</kbd><span>' + (q.get('label') || 'Rook &amp; Son Salvage') + '<small>' + (q.get('hint') || 'OPEN PROPERTY LEDGER') + '</small></span>'; }
if (s === 'toast' || q.get('toast')) { const t = $('#toast'); if (q.get('over')) { const o = document.createElement('span'); o.className = 't-over'; o.textContent = q.get('over'); t.append(o); } t.append(q.get('toast') || 'The Copper Finch reopens. By morning, someone has chalked a small ember on its cellar door.'); t.classList.add('show'); document.body.classList.add('toasting'); }
if (s === 'dialogue') $('#dialogue').hidden = false;
if (s === 'pause') { document.body.classList.remove('playing'); $('#pause').hidden = false; }
if (s === 'ledger') { document.body.classList.remove('playing'); const p = $('#panel'); p.hidden = false; p.innerHTML = '<div class="panel-top"><span>TERRA · MUNICIPAL RECORDS</span><button data-action="close" aria-label="Close ledger">×</button></div><div class="panel-scroll"><div class="overline">OFFICE OF THE CITY STEWARD</div><h2>The city ledger</h2></div><div class="panel-bottom"><span>♜ <b>36</b> CROWNS AVAILABLE</span><small>ESC TO CLOSE</small></div>'; }
if (s === 'marker') { const m = $('#marker'); m.hidden = false; m.classList.toggle('edge', q.get('edge') === '1'); m.style.transform = 'translate3d(' + (q.get('mx') || 60) + 'px,' + (q.get('my') || 260) + 'px,0)'; put('mk-dist', '21 m'); if (q.get('edge') === '1') m.firstElementChild.style.transform = 'rotate(3.14rad) translateX(22px)'; }
document.documentElement.style.setProperty('--hud-h', Math.round($('#hud').getBoundingClientRect().height) + 'px');
</script></body></html>`);

// ---- the states -----------------------------------------------------------------------------------------------------
const WARD = 'over=Cinder%20Row%20%C2%B7%20Occupation%2080%25&toast=Heavy%20occupation.%20More%20patrols%20%C2%B7%20Curfew%20enforced%20%C2%B7%20Commerce%20suppressed.';
const WORST = 'weather=INDUSTRIAL%20FOG&curfew=KNOWN%20TO%20THE%20PATROLS&band=lockdown&clock=23:40&crowns=12.4k&rate=%2B231.9';
const STATES = [
  ['normal', ''], ['prompt', 'state=prompt'], ['toast', 'state=toast'], ['toast-ward', `state=toast&${WARD}`],
  ['dialogue', 'state=dialogue'], ['curfew-worst', WORST],
  ['curfew-on', 'curfew=CURFEW&clock=22:30&weather=DRIZZLE'], ['band-liberated', 'band=liberated'], ['band-low', 'band=low'], ['band-controlled', 'band=controlled&pin=60'], ['band-lockdown', 'band=lockdown&pin=200&side=r'], ['pin-left', 'clock=23:00&curfew=CURFEW&pin=-200&side=l&heading=40'],
  ['marker-edge', 'state=marker&edge=1&mx=40&my=300'], ['hint-off', 'body=hint-off'], ['ledger', 'state=ledger'], ['pause', 'state=pause'], ['welcome', 'state=welcome'],
  ['long-ward', 'ward=THE%20WEATHERSIDE&band=lockdown&crowns=12.4k&rate=%2B231.9'],
  ['long-objective', 'objective=Build%20toward%20Commerce.%20Every%20commission%20changes%20Terra.&stage=PROSPERITY%202%20/%205%20%C2%B7%20INDUSTRY'],
];
const VIEWS = {
  hd: { size: [1920, 1080], states: ['normal', 'prompt', 'toast', 'curfew-worst', 'long-ward'] }, // QA V-b
  desk: { size: [1280, 720], states: STATES.map(s => s[0]) },
  narrow: { size: [800, 600], states: ['normal', 'prompt', 'toast-ward', 'curfew-worst', 'dialogue', 'long-ward'] },
  phone: { size: [390, 844], touch: true, states: ['normal', 'toast', 'prompt', 'curfew-worst', 'long-ward'] },
  phoneland: { size: [844, 390], touch: true, states: ['normal', 'prompt', 'toast', 'curfew-worst'] },
};

const measure = page => page.evaluate(() => {
  const box = s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).visibility === 'hidden') return null; return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const b = { identity: box('#hud .identity'), ribbon: box('#hud .ribbon'), treasury: box('#hud .treasury'), objective: box('#hud-bottom .objective'), hints: box('#hud-bottom .controls'), pause: box('#touch .touch-pause'), toast: document.querySelector('#toast.show') ? box('#toast') : null, prompt: box('#interaction'), dialogue: box('#dialogue .dlg-card'), wardTag: box('#ward'), wardNoun: box('.ward-noun') };
  const fonts = Object.fromEntries(['#ward-name', '#clock', '#crowns', '.income', '#rate', '#objective', '.ward-noun', '#ward', '#weather', '#curfew', '#step-no', '#stage', '.objective .overline', '.treasury small', '#interaction', '#interaction small', '#toast', '.t-over', '.controls', '.controls kbd', '.dlg-card .overline', '.strip span', '.strip span.card'].map(s => { const e = document.querySelector(s); return [s, e ? parseFloat(getComputedStyle(e).fontSize) : null]; }));
  const clipped = [...document.querySelectorAll('#hud *, #hud-bottom *, #toast, #interaction, #interaction *')].filter(e => e.offsetParent && (e.scrollWidth > e.clientWidth + 1) && getComputedStyle(e).overflow !== 'visible' && !e.closest('.tape')).map(e => e.id || e.className);
  const persistent = ['identity', 'ribbon', 'treasury', 'objective', 'hints'].reduce((s, k) => s + (b[k] ? b[k].w * b[k].h : 0), 0);
  const topBand = Math.max(...['identity', 'ribbon', 'treasury'].map(k => b[k] ? b[k].y + b[k].h : 0));
  const tape = document.querySelector('.tape').getBoundingClientRect(), ends = [...document.querySelectorAll('.strip span')].map(e => e.getBoundingClientRect()).filter(r => r.right > tape.left && r.left < tape.right && (r.left < tape.left || r.right > tape.right)).length;
  return { boxes: b, fonts, clipped, slicedTapeGlyphs: ends, tapeMask: getComputedStyle(document.querySelector('.strip')).maskImage || getComputedStyle(document.querySelector('.strip')).webkitMaskImage, persistentPct: +(persistent / (innerWidth * innerHeight) * 100).toFixed(2), topBand: +topBand.toFixed(1), overflowX: document.documentElement.scrollWidth > innerWidth };
});

let browser; try { browser = await chromium.launch({ headless: true }); } catch { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
const report = { note: `Static mock (real style.css, the interface.ts template and the touch controls' markup over ${bg.slice(root.length + 1)}); boxes in CSS px. Not the real game.`, states: {} };
for (const [vn, v] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext({ viewport: { width: v.size[0], height: v.size[1] }, deviceScaleFactor: 1, ...(v.touch ? { hasTouch: true, isMobile: true } : {}) });
  const page = await ctx.newPage();
  for (const name of v.states) {
    const key = `${vn}-${name}`; if (only.length && !only.includes(key)) continue;
    const q = [STATES.find(s => s[0] === name)[1], v.touch ? 'body=touch' : ''].filter(Boolean).join('&');
    await page.goto(`file://${mock}?${q}`); await page.waitForTimeout(150);
    await page.screenshot({ path: join(out, `hud-mock-${key}.png`) });
    report.states[key] = { viewport: v.size, query: q, ...(await measure(page)) };
    const r = report.states[key], bx = r.boxes;
    console.log(key.padEnd(26), 'area', r.persistentPct + '%', 'top', r.topBand, 'rib', bx.ribbon && `${bx.ribbon.x}+${bx.ribbon.w}x${bx.ribbon.h}`, 'id.x', bx.identity?.x, 'obj', bx.objective && `${bx.objective.x},${bx.objective.y} ${bx.objective.w}x${bx.objective.h}`, 'tag', bx.wardTag && `${bx.wardTag.x},${bx.wardTag.y}`, r.slicedTapeGlyphs ? `edge glyphs ${r.slicedTapeGlyphs}` : '', r.clipped.length ? 'CLIPPED ' + r.clipped : '', r.overflowX ? 'OVERFLOW-X' : '');
  }
  if (vn === 'desk' && (!only.length || only.includes('desk-focus'))) { // keyboard: the ledger control takes focus and shows the ring
    await page.goto(`file://${mock}?body=hint-off`); await page.evaluate(() => document.querySelector('.ledger-control').focus());
    report.focus = await page.evaluate(() => { const b = document.querySelector('.ledger-control'), s = getComputedStyle(b), c = getComputedStyle(document.querySelector('.controls')); return { tag: b.tagName, focused: document.activeElement === b, outline: s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor, controlsOpacity: c.opacity, h: b.getBoundingClientRect().height }; });
  }
  await ctx.close();
}
writeFileSync(join(out, 'hud-mock-states.json'), JSON.stringify(report, null, 1) + '\n');
console.log('fonts', JSON.stringify(report.states['desk-normal']?.fonts));
await browser.close();
