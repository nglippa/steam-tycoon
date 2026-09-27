import * as T from 'three';
import { palette as P } from './palette';
import { seeded,mats } from './assets';
import type { City } from './city';

const duskShade=new T.Color('#b9718a'),rainCloud=new T.Color('#8a8f8e'),greyCloud=new T.Color('#c7c4b8');
export class WeatherArt {
  colors=Object.fromEntries(Object.entries(P.sky).map(([key,color])=>[key,new T.Color(color)])) as Record<keyof typeof P.sky,T.Color>;
  sky:T.Mesh; splashes:T.Points; runoff:T.LineSegments; sparks:T.Points;
  waterTime={value:0};
  uniforms={daylight:{value:1},time:{value:0},sunset:{value:0},skyTop:{value:new T.Color(P.sky.overcast)},skyHorizon:{value:new T.Color(P.sky.lavender)},cloudTint:{value:new T.Color(P.sky.cloud)},cloudShade:{value:new T.Color(P.sky.cloudShade)},cover:{value:0}};
  splashPositions=new Float32Array(160*3);dripPositions=new Float32Array(120*6);sparkPositions=new Float32Array(65*3);
  constructor(public scene:T.Scene,public city:City){
    this.sky=new T.Mesh(new T.SphereGeometry(420,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:this.uniforms,
      vertexShader:'varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec3 vSky;uniform float daylight,time,sunset,cover;uniform vec3 skyTop,skyHorizon,cloudTint,cloudShade;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.3);a*=.5;}return s;}
      // Torn painted cloud mass: flat shapes with hard ragged edges and a single tone step.
      float mass(vec2 p,float h){float band=smoothstep(.02,.16,h)*(1.-smoothstep(.55,.95,h));return fbm(p)*.9+band*.28-(1.-band)*.2;}
      void main(){vec3 dir=normalize(vSky);float h=max(dir.y,0.);
        vec3 col=mix(skyHorizon,skyTop,smoothstep(0.,.6,pow(h,.75)));
        vec2 p=vec2(atan(dir.z,dir.x)*2.6+time*.003,h*5.2)*vec2(1.,1.9);
        float thr=mix(.64,.47,cover),m=mass(p,h),e=.006;
        float cloud=smoothstep(thr,thr+e,m);
        float lit=smoothstep(thr+.1,thr+.1+e,mass(p+vec2(.05,.09),h));
        float under=cloud*(1.-smoothstep(thr,thr+e,mass(p+vec2(0.,.16),h)));
        vec3 body=mix(cloudShade,cloudTint,.55);
        vec3 cc=mix(body,cloudTint,lit);cc=mix(cc,cloudShade*.92,under*.8);
        col=mix(col,cc,cloud);
        // Small torn wisps high up, one tone lighter than the sky.
        float wisp=smoothstep(.62,.625,fbm(p*vec2(.6,2.4)+13.))*smoothstep(.35,.6,h)*(1.-cover*.7);
        col=mix(col,mix(col,cloudTint,.5),wisp);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>}`
    }));this.sky.renderOrder=-10;this.sky.frustumCulled=false;scene.add(this.sky);
    const water=city.water.material as T.MeshStandardMaterial;
    water.onBeforeCompile=shader=>{shader.uniforms.waterTime=this.waterTime;shader.vertexShader='uniform float waterTime;varying vec2 waterCoord;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterCoord=position.xy;transformed.z+=sin(position.x*3.+waterTime)*.022+sin(position.y*2.+waterTime*1.4)*.018;');shader.fragmentShader='uniform float waterTime;varying vec2 waterCoord;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat crestLine=smoothstep(.88,.97,sin(waterCoord.x*8.+sin(waterCoord.y*2.+waterTime)));diffuseColor.rgb+=vec3(.05,.09,.1)*crestLine;');};
    water.customProgramCacheKey=()=> 'terra-canal-ripples';
    const r=seeded(400);for(let i=0;i<160;i++){this.splashPositions[i*3]=(r()-.5)*19;this.splashPositions[i*3+1]=.12;this.splashPositions[i*3+2]=r()*130-57;}
    const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d')!;ctx.strokeStyle='#c7d9e2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(16,16,13,5,0,0,Math.PI*2);ctx.stroke();const texture=new T.CanvasTexture(c);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(this.splashPositions,3));this.splashes=new T.Points(geo,new T.PointsMaterial({map:texture,color:'#c0cdd2',size:.25,transparent:true,opacity:.3,depthWrite:false}));scene.add(this.splashes);
    const drip=new T.BufferGeometry();drip.setAttribute('position',new T.BufferAttribute(this.dripPositions,3));this.runoff=new T.LineSegments(drip,new T.LineBasicMaterial({color:'#b9d2df',transparent:true,opacity:.3,depthWrite:false}));this.runoff.frustumCulled=false;scene.add(this.runoff);
    const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(this.sparkPositions,3));this.sparks=new T.Points(sg,new T.PointsMaterial({color:'#ffc173',size:.07,transparent:true,opacity:.8,depthWrite:false}));this.sparks.frustumCulled=false;scene.add(this.sparks);
  }
  update(time:number,daylight:number,rain:boolean,weather='overcast',dusk=0,smog=0){
    this.waterTime.value=time;const c=this.colors;
    const top=weather==='clear'?c.clear:rain?c.rain:c.overcast,horizon=weather==='clear'?c.horizon:c.lavender;
    this.uniforms.skyTop.value.copy(c.night).lerp(top,daylight).lerp(c.rose,dusk*.55).lerp(c.smog,smog*.3*daylight);
    this.uniforms.skyHorizon.value.copy(c.haze).lerp(horizon,daylight).lerp(c.dusk,dusk*.85).lerp(c.smog,smog*.5*daylight);
    this.uniforms.cloudTint.value.set('#1e2640').lerp(rain?rainCloud:weather==='clear'?c.cloud:greyCloud,daylight).lerp(c.dusk,dusk*.8).lerp(c.smog,smog*.25*daylight);
    this.uniforms.cloudShade.value.set('#0c1020').lerp(weather==='clear'?c.cloudShade:c.overcast,daylight).lerp(duskShade,dusk*.8);
    this.uniforms.cover.value=weather==='clear'?0:rain?1:.6;
    this.uniforms.sunset.value=dusk;this.uniforms.daylight.value=daylight;this.uniforms.time.value=time;
    this.splashes.visible=this.runoff.visible=rain;
    if(rain){for(let i=0;i<160;i++)this.splashPositions[i*3+1]=.11+Math.max(0,Math.sin(time*7+i*17))*.025;this.splashes.geometry.attributes.position.needsUpdate=true;
      const origins=this.city.presentation.runoff;for(let i=0;i<120;i++){const o=origins[i%origins.length];const y=o.y-((time*5+i*.27)%3);const j=i*6;this.dripPositions[j]=this.dripPositions[j+3]=o.x;this.dripPositions[j+1]=y;this.dripPositions[j+4]=y-.25;this.dripPositions[j+2]=this.dripPositions[j+5]=o.z;}this.runoff.geometry.attributes.position.needsUpdate=true;}
    const level=this.city.properties.get('foundry')!.level;for(let i=0;i<65;i++){const t=(time*(.7+level*.12)+i*.127)%2;this.sparkPositions[i*3]=31+Math.sin(i*11)*t*.8;this.sparkPositions[i*3+1]=.8+t*3-t*t;this.sparkPositions[i*3+2]=14+Math.cos(i*7)*t;}this.sparks.geometry.attributes.position.needsUpdate=true;
    mats.road.roughness=rain?.32:.78;mats.dirt.roughness=rain?.52:.94;
  }
}
