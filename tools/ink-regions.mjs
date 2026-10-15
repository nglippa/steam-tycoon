// Region stats of the ink pass in one scene, per shader variant (a variant is an older ink-renderer.ts; `live` is the running one):
//   node tools/ink-regions.mjs <baseUrl> <out.json> [--people=new] [--views=a,b] [--variants=name=path/to/ink-renderer.ts,...]
// For each shader view and variant, on one and the same rendered frame (the ink quad drawn again per variant): inside named boxes
// (the review's crown and isle crops, the world band y 100-600) the share of pixels inked at .2 or more, their mean strength and
// the luma of the final picture under them, the horizontal edge share (|dL| > 60), the far band's (90 m and over) mean luma with
// and without the sky; for the staged people 8 to 25 m out (2.5 to 6 m for the close view), the ink share of their screen boxes
// against the world's; and on the exact crown-edge pixels (the shader's own crownEdge mask) the strength and luma per variant.
import { chromium } from '@playwright/test';
import { captureStubs } from './capture-stubs.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), flag = (n, d = '') => (args.find(a => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const base = pos[0], outPath = pos[1], people = flag('people', 'new'), vpaths = flag('variants', '').split(',').filter(Boolean).map(s => s.split('='));
const only = flag('views', '').split(',').filter(Boolean);
const VIEWS = [
  ['mid-street', [0, 40, 0, undefined, 0.03], 'clear'],
  ['mid-market-square', [0, -12.5, 0, undefined, 0.07], 'clear'],
  ['far-clock-tower', [0, 6, 0, undefined, 0.2], 'clear'],
  ['far-rooftops-overview', [30, 65, 0.65, 25, -0.22], 'clear'],
  ['veryfar-skyline-edge', [0, 84.5, Math.PI + 0.3, undefined, 0.02], 'clear'],
  ['far-clock-tower-fog', [0, 6, 0, undefined, 0.2], 'fog'],
  ['mid-market-square-fog', [0, -12.5, 0, undefined, 0.07], 'fog'],
  ['close-character-storefront', { worker: 13, dist: 4, pitch: 0.02 }, 'clear'],
].filter(v => !only.length || only.includes(v[0]));
const REG = { street_crown: [400, 300, 700, 450], tower_crown: [360, 370, 560, 500], isle: [1000, 300, 1280, 560], world: [0, 100, 1280, 600], face_region: [440, 150, 840, 560] };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.addInitScript(captureStubs);
const problems = []; page.on('pageerror', e => problems.push(e.message));
await page.goto(`${base}/?dev=1&intro=0&view=street&people=${people}&weather=clear&level=2`);
await page.waitForFunction(() => window.__TERRA__ && window.__TERRA__.status().draws > 0, null, { timeout: 90000 });
await page.evaluate(() => { const a = window.__TERRA__; a.economy.tick = () => {}; a.economy.state.day = .5; a.economy.state.settings.quality = 'high'; a.ui.onQuality(); });
const variants = Object.fromEntries(vpaths.map(([n, p]) => [n, readFileSync(p, 'utf8').match(/fragmentShader: `([\s\S]*?)`,\n/)[1]]));
await page.evaluate(([variants, REG]) => {
  const R = window.__TERRA__.renderer, gl = R.getContext(), orig = R.render.bind(R), M = window.__ink = { hook: null, REG };
  R.render = (s, c) => { const m = s.children[0]?.material, ink = !!m?.uniforms?.recovery; if (ink) { M.mat = m; M.scene = s; M.cam = c; M.live ??= m.fragmentShader; } const r = orig(s, c); if (ink && M.hook) { const h = M.hook; M.hook = null; h(); } return r; };
  M.src = { ...variants };
  M.debug = src => { const d = src.replace(/(\n\s*)(vec3 inkColor)/, '$1vec3 preInk = color;$1$2').replace(/(color = (?:min\(color, )?mix\(color, inkColor[^;]*;)/, '$1\n        vec3 dbg = vec3(clamp(ink, 0., 1.) * .95, (luma(preInk) - luma(color)) * 4., nearest / 250.);').replace(/gl_FragColor = vec4\(color, 1\.\);\s*#include <colorspace_fragment>/, 'gl_FragColor = vec4(clamp(dbg, 0., 1.), 1.);'); if (!d.includes('vec3 dbg') || d.includes('colorspace_fragment')) throw new Error('debug patch'); return d; };
  M.draw = src => { const m = M.mat; m.fragmentShader = src; m.needsUpdate = true; R.setRenderTarget(null); orig(M.scene, M.cam); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { w, h, px }; };
  M.crownDebug = src => { if (!src.includes('crownEdge')) return null; const d = src.replace(/(\n\s*)(vec3 inkColor)/, '$1vec3 preInk = color;$1$2').replace(/(color = (?:min\(color, )?mix\(color, inkColor[^;]*;)/, '$1\n        vec3 dbg = vec3(clamp(ink, 0., 1.) * .95, crownEdge, nearest / 250.);').replace(/gl_FragColor = vec4\(color, 1\.\);\s*#include <colorspace_fragment>/, 'gl_FragColor = vec4(clamp(dbg, 0., 1.), 1.);'); return d; };
  M.restore = () => { M.mat.fragmentShader = M.live; M.mat.needsUpdate = true; };
  M.next = fn => new Promise(done => { M.hook = () => done(fn()); });
  M.analyse = (dbg, fin, boxes) => {
    const { w, h } = dbg, lum = i => .299 * fin.px[i] + .587 * fin.px[i + 1] + .114 * fin.px[i + 2], idx = (x, y) => ((h - 1 - y) * w + x) * 4, out = {};
    const stat = (x0, y0, x1, y1, skip) => { let n = 0, ink = 0, sumR = 0, sumL = 0, lInk = 0, edge = 0, en = 0, far = 0, farL = 0, farNS = 0, farNSL = 0, sky = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { if (skip && skip(x, y)) continue; const i = idx(x, y), l = lum(i), R = dbg.px[i], B = dbg.px[i + 2]; n++; sumL += l;
        if (R >= 51) { ink++; sumR += R; lInk += l; } if (x + 1 < x1) { en++; if (Math.abs(l - lum(idx(x + 1, y))) > 60) edge++; }
        if (B >= 92) { far++; farL += l; if (B < 254) { farNS++; farNSL += l; } } if (B >= 254) sky++; }
      const r = v => +v.toFixed(3); return { n, inkPct: r(100 * ink / n), meanR: r(ink ? sumR / ink / 255 : 0), inkLuma: r(ink ? lInk / ink : 0), meanLuma: r(sumL / n), edgeShare: r(100 * edge / Math.max(1, en)), farPct: r(100 * far / n), farMeanLuma: r(far ? farL / far : 0), farNoSkyPct: r(100 * farNS / n), farNoSkyLuma: r(farNS ? farNSL / farNS : 0), skyPct: r(100 * sky / n) }; };
    for (const [k, [x0, y0, x1, y1]] of Object.entries(M.REG)) out[k] = stat(x0, y0, x1, y1);
    if (boxes.length) { const inB = (x, y) => boxes.some(b => x >= b[0] && x < b[2] && y >= b[1] && y < b[3]); let xs0 = 1e9, xs1 = 0; for (const b of boxes) { xs0 = Math.min(xs0, b[0]); xs1 = Math.max(xs1, b[2]); }
      const S = b => stat(Math.max(0, b[0]), Math.max(0, b[1]), Math.min(w, b[2]), Math.min(h, b[3]));
      const fig = boxes.map(S), tot = fig.reduce((s, f) => s + f.n, 0), figInk = fig.reduce((s, f) => s + f.inkPct * f.n, 0) / tot, figEdge = fig.reduce((s, f) => s + f.edgeShare * f.n, 0) / tot;
      const worldNoFig = stat(0, 100, w, 600, (x, y) => inB(x, y) || dbg.px[idx(x, y) + 2] >= 254); out.people = { boxes, figInkPct: +figInk.toFixed(3), figEdgeShare: +figEdge.toFixed(3), worldInkPct: worldNoFig.inkPct, worldEdgeShare: worldNoFig.edgeShare, inkRatio: +(figInk / worldNoFig.inkPct).toFixed(3), edgeRatio: +(figEdge / worldNoFig.edgeShare).toFixed(3) }; }
    return out; };
}, [variants, REG]);
await page.evaluate(() => window.__ink.next(() => 0));
const res = {};
for (const [name, cam, weather] of VIEWS) {
  await page.evaluate(([cam, weather]) => { const a = window.__TERRA__; let c = cam;
    if (!Array.isArray(cam)) { const w = a.city.presentation.workers[cam.worker], g = w.person.group, ry = g.rotation.y; c = [g.position.x + Math.sin(ry) * cam.dist, g.position.z + Math.cos(ry) * cam.dist, ry, g.position.y + 1.75, cam.pitch ?? 0]; }
    a.atmosphere.override = weather; a.economy.state.day = .5; a.player.teleport(c[0], c[1], c[2], c[3]); a.player.pitch = c[4] ?? .05; document.getElementById('toast').classList.remove('show'); }, [cam, weather]);
  await page.waitForTimeout(1500);
  res[name] = await page.evaluate(([names, lo, hi]) => window.__ink.next(() => { const M = window.__ink, a = window.__TERRA__, V = a.camera.position.constructor, boxes = [], r = {};
    for (const p of [...a.city.presentation.workers.map(w => w.person), ...a.city.npcs]) { if (!p.group.visible) continue; const pos = p.group.getWorldPosition(new V()), d = pos.distanceTo(a.camera.position); if (d < lo || d > hi) continue;
      const f = pos.clone().project(a.camera), t = pos.clone().add(new V(0, 1.8, 0)).project(a.camera); if (f.z > 1 || Math.abs(f.x) > .98) continue;
      const fx = (f.x + 1) / 2 * 1280, fy = (1 - f.y) / 2 * 720, ty = (1 - t.y) / 2 * 720, hh = fy - ty; boxes.push([Math.round(fx - hh * .2), Math.round(ty), Math.round(fx + hh * .2), Math.round(fy), +d.toFixed(1)]); }
    const use = boxes.filter(b => b[3] - b[1] > 8).map(b => b.slice(0, 4));
    for (const v of names) { const fin = M.draw(M.src[v] ?? M.live), dbg = M.draw(M.debug(M.src[v] ?? M.live)); r[v] = M.analyse(dbg, fin, use); } const mk = M.draw(M.crownDebug(M.live)); const mask = []; for (let i = 0; i < mk.px.length; i += 4) if (mk.px[i + 1] >= 128 && mk.px[i + 2] / 255 * 250 < 250) mask.push(i);
      r.crown = {}; for (const v of names) { const fin = M.draw(M.src[v] ?? M.live), dbg = M.draw(M.debug(M.src[v] ?? M.live)); let sl = 0, sr = 0, sb = 0; for (const i of mask) { sl += .299 * fin.px[i] + .587 * fin.px[i + 1] + .114 * fin.px[i + 2]; sr += dbg.px[i]; sb += mk.px[i + 2]; } r.crown[v] = { n: mask.length, meanLuma: +(sl / mask.length).toFixed(2), meanR: +(sr / mask.length / 255).toFixed(3), meanDist: +(sb / mask.length / 255 * 250).toFixed(0) }; }
      M.restore(); r.nBoxes = use.length; return r; }), [['live', ...Object.keys(variants)], name.startsWith('close') ? 2.5 : 8, name.startsWith('close') ? 6 : 25]);
  console.log(name, 'boxes', res[name].nBoxes);
}
writeFileSync(outPath, JSON.stringify(res, null, 1));
console.log('problems', problems.length, problems.slice(0, 3));
await page.goto('about:blank'); await browser.close();
