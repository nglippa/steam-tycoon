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
import { DetailCull } from './world/detail-cull';
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const renderer = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); // the scene is drawn to the ink pass's own multisampled target; the canvas only receives one full-screen quad
renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; renderer.toneMapping = T.NoToneMapping; renderer.toneMappingExposure = 1.2; renderer.outputColorSpace = T.SRGBColorSpace;
const inkRenderer = new InkRenderer(renderer);
const scene = new T.Scene(); const camera = new T.PerspectiveCamera(68, innerWidth / innerHeight, .08, 500);
const saveKey = SAVE_KEY + (new URLSearchParams(location.search).has('dev') ? '.qa' : '');
const reviewMode = new URLSearchParams(location.search).has('dev') && new URLSearchParams(location.search).has('review');
const economy = new Economy(reviewMode ? { read: () => null, write: () => {}, clear: () => {} } : { read: () => { try { return localStorage.getItem(saveKey); } catch { return null; } }, write: s => localStorage.setItem(saveKey, s), clear: () => localStorage.removeItem(saveKey) });
const city = new City(scene, economy); const atmosphere = new Atmosphere(scene, city); const player = new Player(camera, canvas, city); const sound = new Soundscape(() => economy.state.settings); const ui = new Interface(economy, player, city, sound);
const detailCull = new DetailCull(scene);
let review: Review | undefined;
let arrival = 1; const titlePosition = new T.Vector3(); const titleRotation = new T.Quaternion();
const reducedMotion = () => prefersReducedMotion(economy.state.settings.reducedMotion);
let time = economy.state.playtime; let last = performance.now(); let autosave = 0; let hud = 0; let hammer = 0; let fps = 60; let debug = false; let previousConstructionCount = 0; let shadowElapsed = 0;
const query = new URLSearchParams(location.search); const dev = query.has('dev');
// Resolution is a pixel budget, not a fixed ratio: a laptop panel gets the full 1.5x, a 4K or 5K window is capped
// at the same number of pixels instead of four times the fill. `strain` steps the budget down when frames run slow.
let strain = 1, slow = 0;
function pixelRatio() { const high = economy.state.settings.quality === 'high', budget = Math.sqrt((high ? 4.4e6 : 2.4e6) * strain / (innerWidth * innerHeight)); return Math.max(.6, Math.min(devicePixelRatio, touch ? (high ? 1.25 : 1) : high ? 1.5 : 1, budget)); }
function quality() { const high = economy.state.settings.quality === 'high'; inkRenderer.setQuality(high); strain = 1; renderer.setPixelRatio(pixelRatio()); renderer.shadowMap.enabled = high; renderer.shadowMap.needsUpdate = true; atmosphere.rain.geometry.setDrawRange(0, high ? 3000 : 1100); }
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
economy.onChange = (kind, id) => { if (kind === 'save-error') { ui.toast('City records could not be saved. Check this browser’s storage permissions.'); return; } const oldStage = city.stage; city.construct(kind, id); if (kind === 'site') { const site = SITES.find(s => s.id === id)!; ui.toast(site.steps[economy.state.sites[site.id] - 1].done, 8000); return; } if (kind === 'property' && id === 'tavern' && economy.state.properties.tavern.level === 1 && economy.state.sites.market === 0) { ui.toast('The Copper Finch reopens. By morning, someone has chalked a small ember on its cellar door.', 8000); return; } if (economy.stage > oldStage) ui.toast(`Terra enters ${['The Lowworks', 'Recovery', 'Industry', 'Commerce', 'Innovation', 'Grand Terra'][economy.stage]}. Look what your city is becoming.`, 7000); else if (kind === 'property') { const p = PROPERTIES.find(p => p.id === id)!, level = economy.state.properties[p.id].level;
    // The two milestone levels are announced for what they are; the rest are routine commissions.
    if (level === 3) { sound.milestone(); ui.toast(`${p.name} takes on journeymen. A new storey is going up over the street: output is half as much again.`, 8000); }
    else if (level === 5) { sound.milestone(); ui.toast(`${p.name} is a masterwork. Look for its aether crown over the roofs: it now earns double.`, 9000); }
    else ui.toast('Commission approved. The civic engineers are on their way.'); }
  else if (kind === 'automation') ui.toast(`A foreman takes the desk at ${PROPERTIES.find(p => p.id === id)!.name}. Everything it earns now reaches the treasury on its own.`, 7000);
  else if (kind === 'research') { sound.milestone(); ui.toast(({ governors: 'Precision governors. Watch the Great Main’s cabinets in the main street: the engineers now build in half the time.', aether: 'Aether induction. The old works have taken the light back. Look west after dark, from any roof.', charter: 'The Seven Provinces charter is sealed. Their colours are going up over the main street, and their traders with them.', anchors: 'The survey is done. Whatever Anchor III is, it answered. A door has opened below the Hangway that had no handle on our side.' } as Record<string, string>)[id] ?? 'The Finch Institute publishes.', 10000); }
  else if (kind === 'district') { sound.milestone(); ui.toast('The charter is sealed and the ward gate is opening. Go and see what is behind it.', 8000); }
  else if (kind === 'infrastructure') ui.toast('Commission approved. The civic engineers are on their way.'); };
player.onStep = () => sound.step(); ui.onStart = () => { arrival = reducedMotion() ? 1 : 0; titlePosition.copy(camera.position); titleRotation.copy(camera.quaternion); if (economy.state.playtime < 1) time = 0; }; ui.onReset = () => { for (const c of city.constructions) city.root.remove(c.group); city.constructions = []; city.sync(true); player.teleport(0, 77); player.pitch = -.025; ui.tracked = 'scrap'; time = 0; sound.apply(); quality(); };
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(pixelRatio()); renderer.setSize(innerWidth, innerHeight); });
window.addEventListener('pagehide', () => economy.save()); document.addEventListener('visibilitychange', () => { if (document.hidden) economy.save(); });
document.addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); debug = !debug; } });
function frame(now: number) { requestAnimationFrame(frame); if ((document.hidden || !ui.started) && now-last < (document.hidden ? 250 : 1000/24)) return; const raw = (now - last) / 1000; const dt = Math.min(.05, raw); last = now; fps = T.MathUtils.lerp(fps, 1 / Math.max(.001, raw), .035); time += dt;
  // Sustained slow frames (under ~50 a second for a couple of seconds, not one hitch): give up a fifth of the pixels.
  if (ui.started && !document.hidden && !reviewMode) { slow = raw > 1 / 50 && raw < .25 ? slow + raw : Math.max(0, slow - raw * 2); if (slow > 2 && strain > .4) { strain *= .8; slow = 0; renderer.setPixelRatio(pixelRatio()); } }
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
  detailCull.update(raw, camera.position); inkRenderer.setRecovery(economy.stage); inkRenderer.render(scene, camera);
  review?.frame(now, raw);
}
requestAnimationFrame(frame);
// Explicit opt-in QA hooks. Normal gameplay has no treasury cheats or teleport controls.
if (dev) {
  const api = { economy, city, player, atmosphere, ui, renderer, scene, camera, status: () => ({ crowns: economy.state.crowns, rate: economy.rate, stage: economy.stage, draws: renderer.info.render.calls, triangles: renderer.info.render.triangles, fps, locked: player.locked, position: player.position.toArray(), constructions: city.constructions.length }), stage: (level: number) => { for (const p of PROPERTIES) { economy.state.properties[p.id].level = level; economy.state.properties[p.id].automated = level > 1; } for (const i of INFRA) economy.state.infrastructure[i.id] = Math.min(3, Math.max(0, level - 1)); economy.state.crowns = 10000; if (level >= 3) economy.state.districts = ['canal', 'heights']; else economy.state.districts = []; city.sync(true); ui.render(); }, site: (level: number, id: SiteId = 'market') => { economy.state.sites[id] = T.MathUtils.clamp(Math.floor(level), 0, 5); city.sync(); ui.render(); }, carry: (id = 'row.crate') => Consignment.all.find(c => c.id === id)?.take(), wake: (id: 'market' | 'foundry' = 'market') => (id === 'market' ? city.presentation.marketSquare : city.presentation.foundryWorks).replayWake(), view: (name: string) => { const views: Record<string, [number, number, number, number?, number?]> = { conversation: [-2.5,-22.5,.94,1.65,.015], housingLife: [-33,10,1.3,1.8,.07], citizens: [11.2, 47, Math.PI / 2, 1.52, .015], clock: [0, 4, 0, 1.93, .24], overview: [30, 65, .65, 25, -.22], spawn: [0, 77, 0], street: [0, 26, 0], scrap: [-8, 37, Math.PI / 2], boiler: [7, 43, -Math.PI / 2], market: [1, -9, -.9], square: [0, -22, 0], roof: [-34, -56, Math.PI, 8.15], canal: [56, -6, -Math.PI / 2], foundry: [37, 24, .7, 1.93, .18], boilerYard: [38, 51, .7, 1.93, .27], housing: [-34, 32, Math.PI / 2], gate: [0, 59, Math.PI], marketSquare: [0, -12.5, 0, undefined, .07], saelGate: [0, -22, 0, undefined, .2], cellar: [-8.6, -27.4, 2.31, undefined, -.14], spring: [4.8, -25.5, .72, undefined, -.02], foundryYard: [36.2, 16.5, 1.72, undefined, .1], shiftBoard: [29.6, 8.9, 1.2, undefined, -.02], forge: [31.4, 9.4, 1.95, undefined, .08], edge: [0, 84.5, Math.PI, undefined, -.18], arrival: [0, 74, Math.PI, undefined, -.02], row: [3.5, -1, -Math.PI / 2, undefined, .02], rowPost: [25, -1, Math.PI / 2, undefined, .01], rowLane: [32.5, -5.5, 0, undefined, .02], rowSky: [5, -1, -Math.PI / 2, undefined, .38], rowMast: [26.5, 3.5, .91, undefined, .1], gauge: [29.3, 22.4, Math.PI - .25, undefined, -.04], gaugeValve: [28.2, 28.6, -1.13, undefined, -.1], gaugeYard: [30, 35, 0, undefined, 0], chasm: [39.2, 22, 0, undefined, -.32], bridge: [44.5, -6, 0, undefined, -.5], bridgeSouth: [44.5, -6, Math.PI, undefined, -.42], cleft: [39.3, -82, 0, undefined, -.12], westEdge: [-81.6, 2, Math.PI / 2 + .2, undefined, -.22], liftTop: [21, 87.4, Math.PI, undefined, -.3], gallery: [21, 100, 0, -99.25, .62], galleryOut: [17, 103, Math.PI - .5, -99.25, -.05],
      // Phase 4: the Weatherside (Tether Yard, registry, garden, tower, waterworks), the Hangway and the Leads.
      leads: [9, 4.3, Math.PI / 2, 15.75, -.12], leadsNorth: [0, 4, 0, 15.75, -.22], leadsSouth: [0, 4.4, Math.PI, 15.75, -.3], finchTerrace: [-15, 6.6, 1.2, 16.2, -.08], roofSouth: [-22.4, 17.9, -1.92, 16.2, -.08], roofBlock: [-13.9, 11.3, -.35, 21.6, -.3], finchBlock: [-14.6, 15.6, -.5, 21.6, -.22], finchWest: [-16.5, 12, Math.PI / 2 + .5, 21.6, -.15], leadsStreet: [0, 22, 0, undefined, .42], backLane: [74.2, -55.2, Math.PI + .05, undefined, .1], backYard: [75.55, 8.5, Math.PI - .3, 8.35, -.52], backWalk: [74.2, 21.5, Math.PI + .1, 8.35, -.12], backCourt: [74.2, 9, Math.PI + .25, undefined, .05], backGallery: [74, 44, 0, 8.35, -.06], backGalleryS: [74, -38, Math.PI, 8.35, -.05], eastAlley: [61, 15.4, -Math.PI / 2, undefined, 0], tendingDoor: [42.4, -20, Math.PI / 2, -5.75, .06], tendingFromBridge: [41.2, -9, .15, undefined, -.5], tendingRoom: [40, -20, Math.PI / 2, -5.75, -.08], collar: [35.6, 21.4, -1.45, undefined, .02], survey: [-66.3, 17.6, .12, undefined, .02], gateClue: [-69.6, -52, Math.PI / 2, undefined, .22], studs: [-18, 8.2, 1.1, 16.2, -.02], studsUp: [-58.5, -27, 1.5, undefined, .95], sightRings: [59.6, -42.6, 1.5, 25.85, -.04], chainBridge: [37.2, 36.6, -1.75, undefined, .1], chainBridgeMid: [44.5, 34, 0, undefined, -.45], saltRow: [55.2, 46, .28, undefined, .08], saltStall: [58.2, 19.5, -1.2, undefined, .04], packetLight: [53.6, -36, -.45, undefined, .5], lightMid: [60.2, -41.2, 1.2, 13.85, -.2], lightTop: [60.2, -46.6, 1.15, 25.85, -.22], lightSouth: [55, -41.2, Math.PI, 25.85, -.25], canalGate: [50.6, -6, -Math.PI / 2, undefined, .05],
      alley: [-41, 38.9, Math.PI / 2, undefined, 0], tetherYard: [-60, 60, 2.6, undefined, .12], pier: [-67, 86, Math.PI, undefined, .18], craneTop: [-64, 98.6, -.75, 10.85, -.14], yardRoof: [-69, 56, Math.PI, 8.85, -.05], gantry: [-73.4, 70, Math.PI, 8.85, .05], registry: [-60.5, 33, .75, undefined, .12], registryOffice: [-65.6, 18.6, 1.9, undefined, .02], registryDoor: [-65.5, 20.5, 1.02, undefined, .06], bondedBay: [-66.4, 50, 1.45, undefined, .05], garden: [-67.5, 7.5, 1.25, undefined, .08], gardenEdge: [-70, 0, Math.PI / 2, undefined, -.05], hall: [-61.5, -18, Math.PI / 2, undefined, .05], archive: [-66.4, -18, Math.PI / 2, undefined, 0], hallRoof: [-70, -14, -2.6, 7.85, .1], aqueduct: [-66.5, -30, 0, 7.85, -.05], towerGallery: [-66.8, -31.2, -2.2, 19.85, -.18], towerTop: [-69.6, -26.4, -Math.PI / 2 - .25, 32.85, -.28], towerSouth: [-72.2, -26.6, Math.PI + .5, 32.85, -.3], towerWest: [-72.4, -28, Math.PI / 2, 32.85, -.2], waterworks: [-62, -48, 1.1, undefined, .12], cistern: [-66.5, -60, .35, 7.85, -.1], hangway: [41.6, 36, 0, -3.75, -.05], hangwayDrop: [42.3, -5.6, Math.PI / 2, -3.75, -.05], hangwayGate: [42.3, -18.4, 1.15, -5.75, .1], hangwayStair: [41.6, -8, 0, -3.75, -.28], keel: [43.6, -21.2, .75, -25.25, -.12], keelDown: [43.7, -23, -.9, -25.25, -.75], keelUp: [43.2, -21.4, 1.2, -25.25, .75], hangwayDown: [42.3, 6, -.35, -3.75, -.45], aqueductBreak: [-63, -39, .9, undefined, .32], hangwayCamp: [41.9, -28.6, .25, -5.75, -.08], hangwayNorth: [41.6, -50, 0, -3.75, .02], hangwayTop: [38.6, 30, -Math.PI / 2, undefined, -.25] }; const v = views[name]; if (v) { player.teleport(v[0],v[1],v[2],v[3]); player.pitch = v[4] ?? .05; } } }; Object.assign(window, { __TERRA__: api });
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
