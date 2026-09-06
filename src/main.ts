import * as T from 'three';
import { Economy, SAVE_KEY, PROPERTIES, INFRA } from './simulation/economy';
import { City } from './world/city';
import { Atmosphere } from './world/atmosphere';
import { Player } from './player/controller';
import { Soundscape } from './audio/sound';
import { Interface } from './ui/interface';
import './ui/style.css';
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2; renderer.outputColorSpace = T.SRGBColorSpace;
const scene = new T.Scene(); const camera = new T.PerspectiveCamera(68, innerWidth / innerHeight, .08, 500);
const saveKey = SAVE_KEY + (new URLSearchParams(location.search).has('dev') ? '.qa' : '');
const economy = new Economy({ read: () => { try { return localStorage.getItem(saveKey); } catch { return null; } }, write: s => localStorage.setItem(saveKey, s), clear: () => localStorage.removeItem(saveKey) });
const city = new City(scene, economy); const atmosphere = new Atmosphere(scene, city); const player = new Player(camera, canvas, city); const sound = new Soundscape(() => economy.state.settings); const ui = new Interface(economy, player, city, sound);
let time = economy.state.playtime; let last = performance.now(); let autosave = 0; let hud = 0; let hammer = 0; let fps = 60; let debug = false; let previousConstructionCount = 0;
const query = new URLSearchParams(location.search); const dev = query.has('dev');
function quality() { const high = economy.state.settings.quality === 'high'; renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 2 : 1)); renderer.shadowMap.enabled = high; atmosphere.rain.geometry.setDrawRange(0, high ? 1500 : 550); }
ui.onQuality = quality; quality();
economy.onChange = (kind, id) => { if (kind === 'save-error') { ui.toast('City records could not be saved. Check this browser’s storage permissions.'); return; } const oldStage = city.stage; city.construct(kind, id); if (economy.stage > oldStage) ui.toast(`Terra enters ${['The Lowworks', 'Recovery', 'Industry', 'Commerce', 'Innovation', 'Grand Terra'][economy.stage]}. Look what your city is becoming.`, 7000); else if (['property', 'infrastructure', 'research'].includes(kind)) ui.toast('Commission approved. The civic engineers are on their way.'); };
player.onStep = () => sound.step(); ui.onStart = () => { if (economy.state.playtime < 1) time = 0; }; ui.onReset = () => { for (const c of city.constructions) city.root.remove(c.group); city.constructions = []; city.sync(true); player.teleport(0, 73); player.pitch = -.025; ui.tracked = 'scrap'; time = 0; sound.apply(); quality(); };
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
window.addEventListener('pagehide', () => economy.save()); document.addEventListener('visibilitychange', () => { if (document.hidden) economy.save(); });
document.addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); debug = !debug; } });
function frame(now: number) { requestAnimationFrame(frame); const raw = (now - last) / 1000; const dt = Math.min(.05, raw); last = now; fps = T.MathUtils.lerp(fps, 1 / Math.max(.001, raw), .035); time += dt;
  if (ui.started) { economy.tick(raw); autosave += dt; if (autosave >= 10) { autosave = 0; economy.save(); } }
  player.update(dt, time); city.update(dt, time); atmosphere.update(dt, time, camera); sound.update(player.position.x, player.position.z, player.yaw, atmosphere.weather === 'rain', time); if (city.constructions.length) { hammer += dt; if (hammer > .35) { hammer = 0; sound.hammer(); } }
  hud += dt; if (hud > .1) { hud = 0; ui.update(atmosphere.weather, fps, debug); } if (previousConstructionCount > city.constructions.length && ui.panel) ui.render(); previousConstructionCount = city.constructions.length;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
// Explicit opt-in QA hooks. Normal gameplay has no treasury cheats or teleport controls.
if (dev) {
  const api = { economy, city, player, atmosphere, ui, renderer, scene, camera, status: () => ({ crowns: economy.state.crowns, rate: economy.rate, stage: economy.stage, draws: renderer.info.render.calls, triangles: renderer.info.render.triangles, fps, locked: player.locked, position: player.position.toArray(), constructions: city.constructions.length }), stage: (level: number) => { for (const p of PROPERTIES) { economy.state.properties[p.id].level = level; economy.state.properties[p.id].automated = level > 1; } for (const i of INFRA) economy.state.infrastructure[i.id] = Math.min(3, Math.max(0, level - 1)); economy.state.crowns = 10000; if (level >= 3) economy.state.districts = ['canal', 'heights']; else economy.state.districts = []; city.sync(true); ui.render(); }, view: (name: string) => { const views: Record<string, [number, number, number, number?]> = { spawn: [0, 73, 0], street: [0, 26, 0], scrap: [-8, 37, Math.PI / 2], boiler: [7, 43, -Math.PI / 2], market: [1, -9, -.9], square: [0, -22, 0], roof: [-34, -56, Math.PI, 8.15], canal: [56, -6, -Math.PI / 2] }; const v = views[name]; if (v) player.teleport(...v); player.pitch = .05; } }; Object.assign(window, { __TERRA__: api });
}
