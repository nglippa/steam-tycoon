import * as T from 'three';
import { Economy, SAVE_KEY, PROPERTIES, INFRA, SITES, type SiteId } from './simulation/economy';
import { Review } from './review';
import { InkRenderer } from './world/ink-renderer';
import { City } from './world/city';
import { Atmosphere } from './world/atmosphere';
import { Player } from './player/controller';
import { TouchControls, isTouch } from './player/touch';
import { Soundscape } from './audio/sound';
import { Interface } from './ui/interface';
import './ui/style.css';
import { palette } from './world/palette';
import { Consignment } from './world/logistics';
for(const [key,color] of Object.entries({ink:palette.neutral.ink,paper:palette.neutral.paper,parchment:palette.neutral.ivory,slate:palette.neutral.slate,brass:palette.metal.brass,civic:palette.cool.teal,burgundy:palette.warm.burgundy}))document.documentElement.style.setProperty('--terra-'+key,color);
import { reducedMotion as prefersReducedMotion } from './motion';
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; renderer.toneMapping = T.NoToneMapping; renderer.toneMappingExposure = 1.2; renderer.outputColorSpace = T.SRGBColorSpace;
const inkRenderer = new InkRenderer(renderer);
const scene = new T.Scene(); const camera = new T.PerspectiveCamera(68, innerWidth / innerHeight, .08, 500);
const saveKey = SAVE_KEY + (new URLSearchParams(location.search).has('dev') ? '.qa' : '');
const reviewMode = new URLSearchParams(location.search).has('dev') && new URLSearchParams(location.search).has('review');
const economy = new Economy(reviewMode ? { read: () => null, write: () => {}, clear: () => {} } : { read: () => { try { return localStorage.getItem(saveKey); } catch { return null; } }, write: s => localStorage.setItem(saveKey, s), clear: () => localStorage.removeItem(saveKey) });
const city = new City(scene, economy); const atmosphere = new Atmosphere(scene, city); const player = new Player(camera, canvas, city); const sound = new Soundscape(() => economy.state.settings); const ui = new Interface(economy, player, city, sound);
let review: Review | undefined;
let arrival = 1; const titlePosition = new T.Vector3(); const titleRotation = new T.Quaternion();
const reducedMotion = () => prefersReducedMotion(economy.state.settings.reducedMotion);
let time = economy.state.playtime; let last = performance.now(); let autosave = 0; let hud = 0; let hammer = 0; let fps = 60; let debug = false; let previousConstructionCount = 0; let shadowElapsed = 0;
const query = new URLSearchParams(location.search); const dev = query.has('dev');
function quality() { const high = economy.state.settings.quality === 'high'; inkRenderer.setQuality(high); renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? (high ? 1.25 : 1) : high ? 1.5 : 1)); renderer.shadowMap.enabled = high; renderer.shadowMap.needsUpdate = true; atmosphere.rain.geometry.setDrawRange(0, high ? 3000 : 1100); }
// Phones and tablets: touch controls, no pointer lock, the lighter renderer on a fresh game.
const touch = isTouch(); let touchControls: TouchControls | undefined;
if (touch) { document.body.classList.add('touch'); player.touch = true; if (economy.state.playtime < 1) economy.state.settings.quality = 'low';
  touchControls = new TouchControls(player, canvas, { ledger: () => ui.openLedger(), pause: () => player.release() }); }
ui.onQuality = quality; quality();
city.onEvent = message => ui.toast(message, 8000);
// The Directorate's reactions are heard as well as read; the cutters crate rides in the Steward's arms.
const responders = [city.presentation.cinderRow, city.presentation.rationLine];
for (const s of responders) s.onAlarm = message => { sound.whistle(); ui.toast(message, 8000); };
for (const c of Consignment.all) { c.held.position.set(.36, -.5, -.8); c.held.rotation.set(.2, -.45, .05); c.held.scale.setScalar(.55); camera.add(c.held); } scene.add(camera);
economy.onChange = (kind, id) => { if (kind === 'save-error') { ui.toast('City records could not be saved. Check this browser’s storage permissions.'); return; } const oldStage = city.stage; city.construct(kind, id); if (kind === 'site') { const site = SITES.find(s => s.id === id)!; ui.toast(site.steps[economy.state.sites[site.id] - 1].done, 8000); return; } if (kind === 'property' && id === 'tavern' && economy.state.properties.tavern.level === 1 && economy.state.sites.market === 0) { ui.toast('The Copper Finch reopens. By morning, someone has chalked a small ember on its cellar door.', 8000); return; } if (economy.stage > oldStage) ui.toast(`Terra enters ${['The Lowworks', 'Recovery', 'Industry', 'Commerce', 'Innovation', 'Grand Terra'][economy.stage]}. Look what your city is becoming.`, 7000); else if (['property', 'infrastructure', 'research'].includes(kind)) ui.toast('Commission approved. The civic engineers are on their way.'); };
player.onStep = () => sound.step(); ui.onStart = () => { arrival = reducedMotion() ? 1 : 0; titlePosition.copy(camera.position); titleRotation.copy(camera.quaternion); if (economy.state.playtime < 1) time = 0; }; ui.onReset = () => { for (const c of city.constructions) city.root.remove(c.group); city.constructions = []; city.sync(true); player.teleport(0, 77); player.pitch = -.025; ui.tracked = 'scrap'; time = 0; sound.apply(); quality(); };
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
window.addEventListener('pagehide', () => economy.save()); document.addEventListener('visibilitychange', () => { if (document.hidden) economy.save(); });
document.addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); debug = !debug; } });
function frame(now: number) { requestAnimationFrame(frame); if ((document.hidden || !ui.started) && now-last < (document.hidden ? 250 : 1000/24)) return; const raw = (now - last) / 1000; const dt = Math.min(.05, raw); last = now; fps = T.MathUtils.lerp(fps, 1 / Math.max(.001, raw), .035); time += dt;
  if (ui.started) { economy.tick(raw); autosave += dt; if (autosave >= 10) { autosave = 0; economy.save(); } }
  player.update(dt, time); city.update(dt, time, player.position); atmosphere.update(dt, time, camera, !ui.started); sound.update(player.position.x, player.position.z, player.yaw, atmosphere.weather === 'rain', time); if (city.constructions.length) { hammer += dt; if (hammer > .35) { hammer = 0; sound.hammer(); } }
  hud += dt; if (hud > .1) { hud = 0; ui.update(atmosphere.weather, fps, debug); touchControls?.update(); } if (previousConstructionCount > city.constructions.length && ui.panel) ui.render();
  shadowElapsed += dt; if(shadowElapsed > .75 || city.constructions.length !== previousConstructionCount) { renderer.shadowMap.needsUpdate = true; shadowElapsed = 0; }
  previousConstructionCount = city.constructions.length;
  if (!ui.started) {
    const orbit = reducedMotion() ? 0 : Math.sin(time * .07) * .08;
    camera.position.set(32 + Math.sin(orbit) * 32, 25, 69 + Math.cos(orbit) * 3);
    camera.lookAt(-23, 8, 5);
    camera.updateMatrixWorld();
  } else if (arrival < 1) {
    arrival = reducedMotion() ? 1 : Math.min(1, arrival + dt / 2.2);
    const ease = arrival * arrival * (3 - 2 * arrival);
    camera.position.lerpVectors(titlePosition, player.position, ease);
    camera.quaternion.slerpQuaternions(titleRotation, new T.Quaternion().setFromEuler(new T.Euler(player.pitch, player.yaw, 0, 'YXZ')), ease);
    camera.updateMatrixWorld();
  }
  inkRenderer.setRecovery(economy.stage); inkRenderer.render(scene, camera);
  review?.frame(now, raw);
}
requestAnimationFrame(frame);
// Explicit opt-in QA hooks. Normal gameplay has no treasury cheats or teleport controls.
if (dev) {
  const api = { economy, city, player, atmosphere, ui, renderer, scene, camera, status: () => ({ crowns: economy.state.crowns, rate: economy.rate, stage: economy.stage, draws: renderer.info.render.calls, triangles: renderer.info.render.triangles, fps, locked: player.locked, position: player.position.toArray(), constructions: city.constructions.length }), stage: (level: number) => { for (const p of PROPERTIES) { economy.state.properties[p.id].level = level; economy.state.properties[p.id].automated = level > 1; } for (const i of INFRA) economy.state.infrastructure[i.id] = Math.min(3, Math.max(0, level - 1)); economy.state.crowns = 10000; if (level >= 3) economy.state.districts = ['canal', 'heights']; else economy.state.districts = []; city.sync(true); ui.render(); }, site: (level: number, id: SiteId = 'market') => { economy.state.sites[id] = T.MathUtils.clamp(Math.floor(level), 0, 5); city.sync(); ui.render(); }, carry: (id = 'row.crate') => Consignment.all.find(c => c.id === id)?.take(), wake: (id: 'market' | 'foundry' = 'market') => (id === 'market' ? city.presentation.marketSquare : city.presentation.foundryWorks).replayWake(), view: (name: string) => { const views: Record<string, [number, number, number, number?, number?]> = { conversation: [-2.5,-22.5,.94,1.65,.015], housingLife: [-33,10,1.3,1.8,.07], citizens: [11.2, 47, Math.PI / 2, 1.52, .015], clock: [0, 4, 0, 1.93, .24], overview: [30, 65, .65, 25, -.22], spawn: [0, 77, 0], street: [0, 26, 0], scrap: [-8, 37, Math.PI / 2], boiler: [7, 43, -Math.PI / 2], market: [1, -9, -.9], square: [0, -22, 0], roof: [-34, -56, Math.PI, 8.15], canal: [56, -6, -Math.PI / 2], foundry: [37, 24, .7, 1.93, .18], boilerYard: [38, 51, .7, 1.93, .27], housing: [-34, 32, Math.PI / 2], gate: [0, 59, Math.PI], marketSquare: [0, -12.5, 0, undefined, .07], saelGate: [0, -22, 0, undefined, .2], cellar: [-8.6, -27.4, 2.31, undefined, -.14], spring: [4.8, -25.5, .72, undefined, -.02], foundryYard: [36.2, 16.5, 1.72, undefined, .1], shiftBoard: [29.6, 8.9, 1.2, undefined, -.02], forge: [31.4, 9.4, 1.95, undefined, .08], edge: [0, 84.5, Math.PI, undefined, -.18], arrival: [0, 74, Math.PI, undefined, -.02], row: [3.5, -1, -Math.PI / 2, undefined, .02], rowPost: [25, -1, Math.PI / 2, undefined, .01], rowLane: [32.5, -5.5, 0, undefined, .02], rowSky: [5, -1, -Math.PI / 2, undefined, .38], rowMast: [26.5, 3.5, .91, undefined, .1], gauge: [29.3, 22.4, Math.PI - .25, undefined, -.04], gaugeValve: [28.2, 28.6, -1.13, undefined, -.1], gaugeYard: [30, 35, 0, undefined, 0] }; const v = views[name]; if (v) { player.teleport(v[0],v[1],v[2],v[3]); player.pitch = v[4] ?? .05; } } }; Object.assign(window, { __TERRA__: api });
  if (query.has('level')) api.stage(T.MathUtils.clamp(Number(query.get('level')) || 0, 0, 5));
  // URL state is the starting point of a review, not something the Directorate saw happen.
  const alarms = responders.map(s => s.onAlarm); for (const s of responders) s.onAlarm = () => {};
  if (query.has('site')) api.site(Number(query.get('site')) || 0);
  if (query.has('foundry')) api.site(Number(query.get('foundry')) || 0, 'foundry');
  if (query.has('row')) api.site(Number(query.get('row')) || 0, 'row');
  if (query.has('gauge')) api.site(Number(query.get('gauge')) || 0, 'gauge');
  responders.forEach((s, i) => { s.onAlarm = alarms[i]; });
  if (['rain','overcast','fog','clear'].includes(query.get('weather') ?? '')) atmosphere.override = query.get('weather');
  // Reproducible art review without changing the player's normal save.
  if (query.has('view')) {
    ui.started = true; document.body.classList.add('started');
    document.querySelector('#welcome')!.setAttribute('hidden', '');
    api.view(query.get('view')!);
    if (reviewMode) time = 15;
    const day = Number(query.get('day'));
    if (query.has('day') && Number.isFinite(day)) economy.state.day = T.MathUtils.clamp(day, 0, 1);
  }
  if (reviewMode) { renderer.setPixelRatio(T.MathUtils.clamp(Number(query.get('dpr')) || 1.5, 1, 2)); review = new Review(renderer, city, player, query); }
}
