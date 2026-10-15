// Page-side stubs shared by the capture tools (page.addInitScript(captureStubs)). Headless only; real play is untouched.
//  - Pointer lock: headless Chromium refuses requestPointerLock without a user gesture, which would put the game on its
//    drag-to-look fallback (a footer line in #save-status, a paused look). The stub takes the game's normal locked path.
export function captureStubs() {
  let el = null;
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => el });
  HTMLCanvasElement.prototype.requestPointerLock = function () { el = this; document.dispatchEvent(new Event('pointerlockchange')); return Promise.resolve(); };
  document.exitPointerLock = () => { el = null; document.dispatchEvent(new Event('pointerlockchange')); };
}
