import * as T from 'three';
import { palette as P } from './palette';
import { housingGlass } from './housing';
import { reducedMotion } from '../motion';
import { WeatherArt } from './weather-art';
import { random, mats, windowGlass } from './assets';
import type { City } from './city';
export class Atmosphere {
  art: WeatherArt;
  sun: T.DirectionalLight; hemi: T.HemisphereLight; rain: T.LineSegments; smoke: T.Points; steam: T.Points; weather: 'rain' | 'overcast' | 'fog' | 'clear' = 'rain'; override: string | null = null;
  rainPositions = new Float32Array(1500 * 6); smokePositions = new Float32Array(220 * 3); steamPositions = new Float32Array(90 * 3); age = new Float32Array(220); steamAge = new Float32Array(90); steamAlpha = new Float32Array(90); sky = new T.Color();
  constructor(public scene: T.Scene, public city: City) {
    this.art=new WeatherArt(scene,city);
    scene.fog = new T.FogExp2('#68787b', .011); scene.background = new T.Color('#71858b');
    this.hemi = new T.HemisphereLight('#c4ccec', '#92849b', 2); scene.add(this.hemi); this.sun = new T.DirectionalLight('#f4cd9a', 2.3); this.sun.position.set(-35, 55, 20); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.camera.left = -65; this.sun.shadow.camera.right = 65; this.sun.shadow.camera.top = 85; this.sun.shadow.camera.bottom = -60; this.sun.shadow.camera.far = 190; this.sun.shadow.normalBias = .04; this.sun.shadow.bias = -.0003; scene.add(this.sun); scene.add(this.sun.target);
    for (let i = 0; i < 1500; i++) { const j=i*6;this.rainPositions[j] = (random() - .5) * 100; this.rainPositions[j + 1] = random() * 40; this.rainPositions[j + 2] = (random() - .5) * 100;this.rainPositions[j+3]=this.rainPositions[j]-.015;this.rainPositions[j+4]=this.rainPositions[j+1]+.26;this.rainPositions[j+5]=this.rainPositions[j+2]; }
    const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(this.rainPositions, 3)); this.rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: '#b3cacf', transparent: true, opacity: .24, depthWrite: false })); this.rain.frustumCulled = false; scene.add(this.rain);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const c = canvas.getContext('2d')!; c.fillStyle = '#e0e8d9'; c.strokeStyle = '#526c6c80'; c.lineWidth = 1.4; c.beginPath(); for (let i=0;i<11;i++) { const a=i/11*Math.PI*2; const r=25+Math.sin(i*7)*4; const px=32+Math.cos(a)*r, py=32+Math.sin(a)*r; if(i===0)c.moveTo(px,py);else c.lineTo(px,py); } c.closePath(); c.fill(); c.stroke(); const texture = new T.CanvasTexture(canvas);
    const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(this.smokePositions, 3)); this.smoke = new T.Points(sg, new T.PointsMaterial({ color: '#5f6967', map: texture, size: 4.2, transparent: true, opacity: .4, depthWrite: false })); this.smoke.frustumCulled = false; scene.add(this.smoke); for (let i = 0; i < 220; i++) this.age[i] = random() * 15;
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
    const day = preview ? .42 : this.city.economy.state.day; const phase = Math.sin(day * Math.PI * 2 - Math.PI / 2); const daylight = T.MathUtils.smoothstep(phase, -.25, .7); const weather = this.override ?? (['rain','overcast','clear','fog'][Math.floor(time/110)%4]); this.weather = weather as typeof this.weather; this.art.update(time,daylight,weather==='rain',weather); const stage = this.city.economy.stage;
    this.sky.set(P.sky.haze).lerp(new T.Color(weather==='clear'?P.sky.horizon:P.sky.lavender),daylight); this.scene.background = this.sky; const fog = this.scene.fog as T.FogExp2; fog.color.copy(this.sky); fog.density = (weather === 'fog' ? .0075 : .0048) - stage * .00035; this.hemi.intensity = 1.05 + daylight * 1.2; this.sun.intensity = .40 + daylight * (weather==='clear'?3.0:2.5); this.sun.color.set(daylight > .4 ? '#ffe5c5' : '#b1c3ef'); this.sun.position.set(Math.cos(day * Math.PI * 2) * 55, 25 + Math.max(0, phase) * 55, 20); mats.glow.emissiveIntensity = 1.1 - daylight * .55; windowGlass.forEach((m,i)=>m.emissiveIntensity=i===3?.04:(.72-daylight*.45));housingGlass.forEach((m,i)=>m.emissiveIntensity=i===0||i===3?.025:(.62-daylight*.36));
    this.city.lamps.forEach((lamp, i) => { lamp.intensity = (5 + this.city.economy.state.infrastructure.lamps * 12) * (1 - daylight * .65) * (stage === 0 && i === 0 && !reducedMotion(this.city.economy.state.settings.reducedMotion) ? .6 + Math.sin(time * 13) * .35 : 1); lamp.color.set(P.warm.lamp); });
    this.rain.visible = weather === 'rain'; this.rain.position.set(camera.position.x, 0, camera.position.z); if (this.rain.visible) { for (let i = 0; i < 1500; i++) { const j = i * 6; this.rainPositions[j + 1] -= dt * (13 + i % 4); this.rainPositions[j] += dt * .7; if (this.rainPositions[j + 1] < 0) this.rainPositions[j + 1] = 40;this.rainPositions[j+3]=this.rainPositions[j]-.015;this.rainPositions[j+4]=this.rainPositions[j+1]+.26;this.rainPositions[j+5]=this.rainPositions[j+2]; } this.rain.geometry.attributes.position.needsUpdate = true; }
    for (let i = 0; i < 220; i++) { this.age[i] = (this.age[i] + dt) % 15; const a = this.age[i]; const o = this.city.smokeOrigins[i % this.city.smokeOrigins.length]; this.smokePositions[i * 3] = o.x + a * .4 + Math.sin(i * 13 + a) * a * .1; this.smokePositions[i * 3 + 1] = o.y + a * .8; this.smokePositions[i * 3 + 2] = o.z + Math.cos(i * 9 + a * .5) * a * .12; } this.smoke.geometry.attributes.position.needsUpdate = true; (this.smoke.material as T.PointsMaterial).opacity = .15 - stage * .017;
    for (let i = 0; i < 90; i++) { this.steamAge[i] = (this.steamAge[i] + dt) % 5; const a = this.steamAge[i];const o=this.city.presentation.steamOrigins[i%6];const pulse=i%6===0?Math.pow(Math.max(0,Math.sin(time*.55)),4):.25;this.steamAlpha[i]=(i%6===0?pulse:1)*Math.min(1,a*2)*Math.max(0,1-a/5);this.steamPositions[i*3]=o.x+Math.sin(i+a)*a*.15;this.steamPositions[i*3+1]=o.y+a*(i%2?.8:.4);this.steamPositions[i*3+2]=o.z+a*.15+pulse*.2;}this.steam.geometry.attributes.position.needsUpdate=true;this.steam.geometry.attributes.plumeOpacity.needsUpdate=true;(this.steam.material as T.PointsMaterial).opacity=(weather==='rain'?.28:.22)/(1+this.city.economy.state.infrastructure.steam*.65);

  }
}
