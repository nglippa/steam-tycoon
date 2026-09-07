import * as T from 'three';
import { palette as P } from './palette';
import { seeded,mats } from './assets';
import type { City } from './city';

export class WeatherArt {
  colors=Object.fromEntries(Object.entries(P.sky).map(([key,color])=>[key,new T.Color(color)])) as Record<keyof typeof P.sky,T.Color>;
  sky:T.Mesh; splashes:T.Points; runoff:T.LineSegments; sparks:T.Points;
  waterTime={value:0};
  uniforms={daylight:{value:1},time:{value:0},sunset:{value:0},skyTop:{value:new T.Color(P.sky.overcast)},skyHorizon:{value:new T.Color(P.sky.lavender)},cloudTint:{value:new T.Color(P.sky.cloud)}};
  splashPositions=new Float32Array(160*3);dripPositions=new Float32Array(120*6);sparkPositions=new Float32Array(65*3);
  constructor(public scene:T.Scene,public city:City){
    this.sky=new T.Mesh(new T.SphereGeometry(420,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:this.uniforms,
      vertexShader:'varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec3 vSky;uniform float daylight,time,sunset;uniform vec3 skyTop,skyHorizon,cloudTint;
      float bank(vec2 p,vec2 center,vec2 scale){vec2 q=(p-center)/scale;
        float d=min(length((q-vec2(-1.,0.))/vec2(1.3,.34)),length((q-vec2(-.45,.24))/vec2(.85,.63)));
        d=min(d,length((q-vec2(.4,.16))/vec2(.95,.49)));d=min(d,length((q-vec2(1.1,-.015))/vec2(1.0,.29)));return 1.-smoothstep(.97,1.02,d);}
      void main(){vec3 dir=normalize(vSky);float h=max(dir.y,0.);vec3 top=skyTop;
        vec3 horizon=skyHorizon;
        vec3 col=mix(horizon,top,smoothstep(0.,.72,h));vec2 p=vec2(atan(dir.z,dir.x)*3.,h*8.);p.x+=time*.0015;
        float cloud=max(bank(p,vec2(-7.,3.5),vec2(1.,1.3)),bank(p,vec2(-2.2,2.3),vec2(.8,.95)));
        cloud=max(cloud,bank(p,vec2(3.,4.5),vec2(1.2,1.5)));cloud=max(cloud,bank(p,vec2(7.,1.3),vec2(.9,.85)));
        float lower=max(bank(p,vec2(-4.8,.7),vec2(1.2,.7)),bank(p,vec2(1.,.8),vec2(1.25,.55)));
        col=mix(col,mix(skyTop,skyHorizon,.66),lower*.48);
        vec3 cream=cloudTint;
        col=mix(col,cream,cloud*.93);gl_FragColor=vec4(col,1.);
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
  update(time:number,daylight:number,rain:boolean,weather='overcast'){
    this.waterTime.value=time;
    const dusk=Math.max(0,1-Math.abs(this.city.economy.state.day-.74)*12);
    this.uniforms.skyTop.value.set(P.sky.night).lerp(weather==='clear'?this.colors.clear:rain?this.colors.rain:this.colors.overcast,daylight).lerp(this.colors.rose,dusk*.35);
    this.uniforms.skyHorizon.value.set(P.sky.haze).lerp(weather==='clear'?this.colors.horizon:this.colors.lavender,daylight).lerp(this.colors.dusk,dusk*.85);
    this.uniforms.cloudTint.value.set('#4b6688').lerp(this.colors.cloud,daylight).lerp(this.colors.dusk,dusk*.45);
    this.uniforms.sunset.value=Math.max(0,1-Math.abs(this.city.economy.state.day-.74)*12);this.uniforms.daylight.value=daylight;this.uniforms.time.value=time;
    this.splashes.visible=this.runoff.visible=rain;
    if(rain){for(let i=0;i<160;i++)this.splashPositions[i*3+1]=.11+Math.max(0,Math.sin(time*7+i*17))*.025;this.splashes.geometry.attributes.position.needsUpdate=true;
      const origins=this.city.presentation.runoff;for(let i=0;i<120;i++){const o=origins[i%origins.length];const y=o.y-((time*5+i*.27)%3);const j=i*6;this.dripPositions[j]=this.dripPositions[j+3]=o.x;this.dripPositions[j+1]=y;this.dripPositions[j+4]=y-.25;this.dripPositions[j+2]=this.dripPositions[j+5]=o.z;}this.runoff.geometry.attributes.position.needsUpdate=true;}
    const level=this.city.properties.get('foundry')!.level;for(let i=0;i<65;i++){const t=(time*(.7+level*.12)+i*.127)%2;this.sparkPositions[i*3]=31+Math.sin(i*11)*t*.8;this.sparkPositions[i*3+1]=.8+t*3-t*t;this.sparkPositions[i*3+2]=14+Math.cos(i*7)*t;}this.sparks.geometry.attributes.position.needsUpdate=true;
    mats.road.roughness=rain?.32:.78;mats.dirt.roughness=rain?.52:.94;
  }
}
