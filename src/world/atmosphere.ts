import * as T from 'three';
import { palette as P } from './palette';
import { housingGlass } from './housing';
import { reducedMotion } from '../motion';
import { WeatherArt } from './weather-art';
import { tone } from './tone';
import { tintSkyline } from './architecture';
import { random, mats, windowGlass } from './assets';
import type { City } from './city';
const C = new T.Color();
type Key = { lit: [number, number, number]; shade: [number, number, number] };
const keys: Record<'clear' | 'overcast' | 'rain' | 'fog', Key> = {
  clear: { lit: [1.24, 1.06, .84], shade: [.36, .4, .55] },
  overcast: { lit: [1.0, .98, .92], shade: [.6, .64, .7] },
  fog: { lit: [.96, .94, .9], shade: [.64, .66, .7] },
  rain: { lit: [.82, .86, .92], shade: [.48, .54, .64] },
};
// Moonlit nights: the moon is the key light, so planes still read lit / shade. Clear is the
// crispest, overcast and fog are softer and closer in value, rain is darker and cooler.
const nightKeys: Record<'clear' | 'overcast' | 'rain' | 'fog', Key> = {
  clear: { lit: [.6, .7, .98], shade: [.26, .31, .52] },
  overcast: { lit: [.5, .56, .76], shade: [.34, .38, .54] },
  fog: { lit: [.52, .58, .74], shade: [.38, .42, .56] },
  rain: { lit: [.44, .52, .74], shade: [.26, .31, .48] },
};
// Kept below the lamp-pool threshold in tone.ts, so warm pools stay under the lamps.
const moonStrength = { clear: .75, overcast: .45, fog: .4, rain: .42 } as const;
const MOON = new T.Vector3(30, 52, -34);
export class Atmosphere {
  art: WeatherArt;
  sun: T.DirectionalLight; hemi: T.HemisphereLight; rain: T.LineSegments; smoke: T.Points; steam: T.Points; weather: 'rain' | 'overcast' | 'fog' | 'clear' = 'rain'; override: string | null = null;
  rainPositions = new Float32Array(1500 * 6); smokePositions = new Float32Array(220 * 3); steamPositions = new Float32Array(90 * 3); age = new Float32Array(220); steamAge = new Float32Array(90); steamAlpha = new Float32Array(90); sky = new T.Color();
  constructor(public scene: T.Scene, public city: City) {
    this.art=new WeatherArt(scene,city);
    scene.fog = new T.FogExp2('#68787b', .011); scene.background = new T.Color('#71858b');
    this.hemi = new T.HemisphereLight('#ffffff', '#e8e8e8', 1.6); scene.add(this.hemi); this.sun = new T.DirectionalLight('#f4cd9a', 2.3); this.sun.position.set(-35, 55, 20); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.camera.left = -65; this.sun.shadow.camera.right = 65; this.sun.shadow.camera.top = 85; this.sun.shadow.camera.bottom = -60; this.sun.shadow.camera.far = 190; this.sun.shadow.normalBias = .04; this.sun.shadow.bias = -.0003; scene.add(this.sun); scene.add(this.sun.target);
    for (let i = 0; i < 1500; i++) { const j=i*6;this.rainPositions[j] = (random() - .5) * 100; this.rainPositions[j + 1] = random() * 40; this.rainPositions[j + 2] = (random() - .5) * 100;this.rainPositions[j+3]=this.rainPositions[j]-.015;this.rainPositions[j+4]=this.rainPositions[j+1]+.26;this.rainPositions[j+5]=this.rainPositions[j+2]; }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(this.rainPositions, 3)); this.rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: '#b3cacf', transparent: true, opacity: .24, depthWrite: false })); this.rain.frustumCulled = false; scene.add(this.rain);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const c = canvas.getContext('2d')!; c.fillStyle = '#e0e8d9'; c.strokeStyle = '#526c6c80'; c.lineWidth = 1.4; c.beginPath(); for (let i=0;i<11;i++) { const a=i/11*Math.PI*2; const r=25+Math.sin(i*7)*4; const px=32+Math.cos(a)*r, py=32+Math.sin(a)*r; if(i===0)c.moveTo(px,py);else c.lineTo(px,py); } c.closePath(); c.fill(); c.stroke(); const texture = new T.CanvasTexture(canvas);
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(this.smokePositions, 3)); this.smoke = new T.Points(sg, new T.PointsMaterial({ color: '#3b3733', map: texture, size: 7.5, transparent: true, opacity: .4, depthWrite: false })); this.smoke.frustumCulled = false; scene.add(this.smoke); for (let i = 0; i < 220; i++) this.age[i] = random() * 15;
    const steamG = new T.BufferGeometry(); steamG.setAttribute('position', new T.BufferAttribute(this.steamPositions, 3)); this.steam = new T.Points(steamG, new T.PointsMaterial({ color: '#c7d9d6', map: texture, size: 1.4, transparent: true, opacity: .3, depthWrite: false })); steamG.setAttribute('plumeOpacity',new T.BufferAttribute(this.steamAlpha,1));
    const steamMaterial=this.steam.material as T.PointsMaterial;
    steamMaterial.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float plumeOpacity; varying float vPlumeOpacity;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPlumeOpacity=plumeOpacity;');
      shader.fragmentShader='varying float vPlumeOpacity;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vPlumeOpacity;');
    };
    steamMaterial.customProgramCacheKey=()=> 'terra-pressure-release';
    scene.add(this.steam); this.steam.frustumCulled = false; for (let i = 0; i < 90; i++) this.steamAge[i] = random() * 5;
  }
  update(dt: number, time: number, camera: T.Camera, preview = false) {
    const day = preview ? .42 : this.city.economy.state.day; const phase = Math.sin(day * Math.PI * 2 - Math.PI / 2); const daylight = T.MathUtils.smoothstep(phase, -.25, .7); const weather = this.override ?? (['overcast','rain','fog','overcast','clear','rain'][Math.floor(time/110)%6]); this.weather = weather as typeof this.weather; this.city.raining = weather === 'rain'; const stage = this.city.economy.stage;
    // Art-directed light keys: lit color, shadow color, sky and haze per weather and hour.
    const dusk = Math.max(0, 1 - Math.abs(day - .74) * 10) + Math.max(0, 1 - Math.abs(day - .26) * 14) * .6;
    const smog = Math.max(0, 1 - stage / 3.5) * (weather === 'clear' ? .75 : 1);
    const key = keys[weather as keyof typeof keys] ?? keys.overcast, night = nightKeys[weather as keyof typeof nightKeys] ?? nightKeys.overcast;
    tone.lit.value.setRGB(...night.lit).lerp(C.setRGB(...key.lit), daylight).lerp(C.setRGB(1.12, .8, .6), dusk * .7).lerp(C.setRGB(.95, .93, .88), smog * .2 * daylight);
    tone.shade.value.setRGB(...night.shade).lerp(C.setRGB(...key.shade), daylight).lerp(C.setRGB(.52, .45, .76), dusk * .6).lerp(C.setRGB(.66, .64, .7), smog * .3 * daylight);
    tone.rim.value.set(P.warm.lamp);
    this.hemi.intensity = .45 + daylight * 1.15; tone.ambient.value = this.hemi.intensity * .93 / Math.PI;
    // By day a backlit, raking sun ahead of the main view; by night a high moon from the
    // north-east, so façades, roofs and figures keep a lit and a shadow side.
    const moon = moonStrength[weather as keyof typeof moonStrength] ?? .55;
    this.sun.intensity = T.MathUtils.lerp(moon, weather === 'clear' ? 3.22 : weather === 'rain' ? 1.72 : 2.32, daylight); this.sun.color.set(daylight > .4 ? '#fff3e0' : '#c2d0f5');
    this.sun.position.set(-34 + Math.cos(day * Math.PI * 2) * 14, 17 + Math.max(0, phase) * 16, -46 + Math.sin(day * Math.PI * 2) * 10).lerp(MOON, 1 - T.MathUtils.smoothstep(daylight, .05, .45));
    this.art.update(time, daylight, weather === 'rain', weather, dusk, smog); this.art.follow(camera.position);
    // Fog at night is a moonlit mist, not a black veil.
    this.sky.copy(this.art.uniforms.skyHorizon.value); if (weather === 'fog') this.sky.lerp(C.set('#6c789c'), .4 * (1 - daylight)); tintSkyline(this.art.uniforms.skyHorizon.value, daylight); this.scene.background = this.sky; const fog = this.scene.fog as T.FogExp2; fog.color.copy(this.sky);
    fog.density = (weather === 'fog' ? .013 + (1 - daylight) * .007 : weather === 'rain' ? .0105 : .0078) + smog * .0022;
    // Cool glass only reflects the night sky; lit rooms glow warm.
    mats.glow.emissiveIntensity = 1.5 - daylight * .9; this.city.presentation.setNight(1 - daylight); this.city.presentation.setShafts(weather === 'clear' ? daylight * (1 - smog * .4) : weather === 'overcast' ? daylight * .25 : 0); windowGlass.forEach((m,i)=>m.emissiveIntensity=i===3?.04:i===2?.32-daylight*.05:(.9-daylight*.63));housingGlass.forEach((m,i)=>m.emissiveIntensity=i===0||i===3?.025:(.62-daylight*.36));
    this.city.lamps.forEach((lamp, i) => { lamp.intensity = (9 + this.city.economy.state.infrastructure.lamps * 14) * (1 - daylight * .65) * (stage === 0 && i === 0 && !reducedMotion(this.city.economy.state.settings.reducedMotion) ? .6 + Math.sin(time * 13) * .35 : 1); lamp.color.set(P.warm.lamp); });
    this.rain.visible = weather === 'rain'; this.rain.position.set(camera.position.x, 0, camera.position.z); if (this.rain.visible) { for (let i = 0; i < 1500; i++) { const j = i * 6; this.rainPositions[j + 1] -= dt * (13 + i % 4); this.rainPositions[j] += dt * .7; if (this.rainPositions[j + 1] < 0) this.rainPositions[j + 1] = 40;this.rainPositions[j+3]=this.rainPositions[j]-.015;this.rainPositions[j+4]=this.rainPositions[j+1]+.26;this.rainPositions[j+5]=this.rainPositions[j+2]; } this.rain.geometry.attributes.position.needsUpdate = true; }
    for (let i = 0; i < 220; i++) { this.age[i] = (this.age[i] + dt) % 15; const a = this.age[i]; const o = this.city.smokeOrigins[i % this.city.smokeOrigins.length]; this.smokePositions[i * 3] = o.x + a * .4 + Math.sin(i * 13 + a) * a * .1; this.smokePositions[i * 3 + 1] = o.y + a * .8; this.smokePositions[i * 3 + 2] = o.z + Math.cos(i * 9 + a * .5) * a * .12; } this.smoke.geometry.attributes.position.needsUpdate = true; (this.smoke.material as T.PointsMaterial).opacity = .38 - stage * .035;
    for (let i = 0; i < 90; i++) { this.steamAge[i] = (this.steamAge[i] + dt) % 5; const a = this.steamAge[i];const origins=this.city.presentation.steamOrigins,o=origins[i%origins.length];const pulse=i%origins.length===0?Math.pow(Math.max(0,Math.sin(time*.55)),4):.25;this.steamAlpha[i]=(i%origins.length===0?pulse:1)*Math.min(1,a*2)*Math.max(0,1-a/5);this.steamPositions[i*3]=o.x+Math.sin(i+a)*a*.15;this.steamPositions[i*3+1]=o.y+a*(i%2?.8:.4);this.steamPositions[i*3+2]=o.z+a*.15+pulse*.2;}this.steam.geometry.attributes.position.needsUpdate=true;this.steam.geometry.attributes.plumeOpacity.needsUpdate=true;(this.steam.material as T.PointsMaterial).opacity=(weather==='rain'?.28:.22)/(1+this.city.economy.state.infrastructure.steam*.65);

  }
}
