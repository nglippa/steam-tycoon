// Page-side stubs shared by the capture tools (page.addInitScript(captureStubs)). Headless only; real play is untouched.
//  - Pointer lock: headless Chromium refuses requestPointerLock without a user gesture, which would put the game on its
//    drag-to-look fallback (a footer line in #save-status, a paused look). The stub takes the game's normal locked path.
//  - Empty hand meshes: a figure's elbow carries empty, hidden BufferGeometry meshes (no `position` attribute; the game's
//    bake leaves them), and the bite code (citizen-life.ts handPoints, People XXIX 67b730e) reads `.attributes.position.count`
//    on every Mesh child, so with the new people the game's frame loop throws every frame and draws nothing at 27e8343
//    (people=old is unaffected; the node tests bake with a no-op, so they do not see it). Until the game guards it, those
//    dead meshes are taken out of their parents here (never drawn anyway), so the captures render. Reported; citizen-life.ts is not touched.
export function captureStubs() {
  let el = null;
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => el });
  HTMLCanvasElement.prototype.requestPointerLock = function () { el = this; document.dispatchEvent(new Event('pointerlockchange')); return Promise.resolve(); };
  document.exitPointerLock = () => { el = null; document.dispatchEvent(new Event('pointerlockchange')); };
  // Swept just before every frame callback (and at most every 100 ms), so the first frame never sees one.
  let last = 0;
  const sweep = () => {
    const now = performance.now(); if (now - last < 100) return; last = now;
    const a = window.__TERRA__; if (!a || !a.city || !a.city.presentation) return;
    const dead = [];
    for (const c of [...a.city.presentation.workers.map(w => w.person), ...(a.city.npcs ?? [])]) c.group.traverse(o => { if (o.isMesh && o.geometry && !o.geometry.attributes.position) dead.push(o); });
    for (const o of dead) o.parent.remove(o);
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(t => { sweep(); cb(t); });
}
