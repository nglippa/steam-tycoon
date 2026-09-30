import * as T from 'three';
import { palette as P } from './palette';
import { seeded,mats } from './assets';
import type { City } from './city';

const duskShade=new T.Color('#b9718a'),rainCloud=new T.Color('#8a8f8e'),greyCloud=new T.Color('#c7c4b8');
export class WeatherArt {
  colors=Object.fromEntries(Object.entries(P.sky).map(([key,color])=>[key,new T.Color(color)])) as Record<keyof typeof P.sky,T.Color>;
  sky:T.Mesh; sea:T.Mesh; skirt:T.Mesh; banks:T.Mesh; splashes:T.Points; runoff:T.LineSegments; sparks:T.Points;
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
    // Drawn after the city (renderOrder > 0) so the depth test skips every pixel the city covers:
    // the noise shaders only run where Terra actually ends.
    // Below Terra: a painted cloud sea far down, Locke's fields in its gaps, and a skirt of
    // distant cloud banks and hazy ridges carrying it to the horizon. Both share the sky's
    // uniforms, so weather, dusk and night reach them without extra bookkeeping.
    const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.07+vec2(17.1,9.3);a*=.5;}return s;}`;
    const seaUniforms={...this.uniforms,eye:{value:new T.Vector3()}};
    this.sea=new T.Mesh(new T.PlaneGeometry(1000,1000),new T.ShaderMaterial({uniforms:seaUniforms,fog:false,
      vertexShader:'varying vec3 vWorld; void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader:`varying vec3 vWorld;uniform float daylight,time,cover;uniform vec3 skyHorizon,cloudTint,cloudShade,eye;${noise}
      void main(){vec2 p=vWorld.xz*.0072+vec2(time*.0035,time*.0012);
        float n=fbm(p),thr=mix(.47,.33,cover),e=.012;
        float cloud=smoothstep(thr,thr+e,n);
        float lit=smoothstep(thr+.09,thr+.09+e,fbm(p+vec2(-.035,.05)));
        float lip=cloud*(1.-smoothstep(thr,thr+e,fbm(p+vec2(0.,.07))));
        vec3 land=mix(vec3(.3,.42,.29),vec3(.52,.5,.33),smoothstep(.42,.58,fbm(p*3.1+4.)));
        land=mix(land,vec3(.24,.4,.46),smoothstep(.6,.63,fbm(p*1.3+11.)));
        vec3 bounce=vec3(.5,.63,.72)*(.3+.7*daylight);
        land=mix(land*(.25+.75*daylight),bounce,.32);
        vec3 body=mix(mix(cloudShade,bounce,.45),cloudTint,.35),cc=mix(body,cloudTint*1.04,lit);cc=mix(cc,bounce*.82,lip*.7);
        vec3 col=mix(land,cc,cloud);
        col=mix(col,skyHorizon,smoothstep(200.,470.,length(vWorld.xz-eye.xz))*.8);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>}`}));
    this.sea.rotation.x=-Math.PI/2;this.sea.position.y=-240;this.sea.frustumCulled=false;this.sea.renderOrder=1;scene.add(this.sea);
    this.skirt=new T.Mesh(new T.CylinderGeometry(470,470,240,64,1,true),new T.ShaderMaterial({uniforms:seaUniforms,fog:false,side:T.BackSide,depthWrite:false,
      vertexShader:'varying vec2 vSk; varying vec3 vDir; void main(){vSk=uv;vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vSk;varying vec3 vDir;uniform float daylight,time,cover;uniform vec3 skyHorizon,cloudTint,cloudShade;${noise}
      void main(){vec2 a=vDir.xz*3.;float v=vSk.y;
        float ridge=.5+.22*fbm(a*1.6+2.)-.1*fbm(a*6.);
        float bank=.3+.2*fbm(a*2.4+time*.002)+.06*sin(atan(vDir.z,vDir.x)*9.);
        vec3 col=skyHorizon;
        vec3 bounce=vec3(.5,.63,.72)*(.3+.7*daylight);
        col=mix(col,mix(skyHorizon,bounce*.85,.45),step(v,ridge)*step(.18,v));
        float cl=step(v,bank),top=smoothstep(bank-.06,bank-.01,v);
        col=mix(col,mix(mix(cloudShade,bounce,.5),cloudTint,top),cl*.78);
        col=mix(col,skyHorizon,smoothstep(.2,0.,v)*.55);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>}`}));
    this.skirt.position.y=-142;this.skirt.frustumCulled=false;this.skirt.renderOrder=2;scene.add(this.skirt);
    // Cumulus banks between the terrace and the sea: painted cards facing the city, one draw.
    // They give the drop its middle distance: you look down past them, not just at haze.
    const cc=document.createElement('canvas');cc.width=512;cc.height=256;const cx=cc.getContext('2d')!;const cr=seeded(88),puffs:number[][]=[];
    for(let i=0;i<9;i++){const r=38+cr()*46;puffs.push([70+i*42+cr()*20,200-r*.55-cr()*30,r]);}
    cx.save();cx.beginPath();cx.rect(0,0,512,212);cx.clip();cx.fillStyle='rgb(60,60,60)';for(const [x,y,r] of puffs){cx.beginPath();cx.arc(x,y,r,0,Math.PI*2);cx.fill();}
    cx.fillStyle='#fff';for(const [x,y,r] of puffs){cx.beginPath();cx.arc(x-r*.14,y-r*.2,r*.8,0,Math.PI*2);cx.fill();}cx.restore();
    const shape=new T.CanvasTexture(cc);const pos:number[]=[],uv:number[]=[];
    // Low banks for the view over the rail, then a few towers whose tops clear the balustrade
    // from the arrival terrace: the first thing that says the ground is far below.
    const cards:number[][]=[];for(let i=0;i<14;i++){const w=70+cr()*70;cards.push([-170+i*26+cr()*20,-70-cr()*70,150+cr()*190,w,w*.5]);}
    for(const [x,z,w] of [[-120,300,170],[40,340,210],[150,270,150],[-10,420,240]])cards.push([x,-5-w*.62,z,w,w*.62]);
    for(const [i,[x,y,z,w,h]] of cards.entries()){const f=i%2?1:0;
      pos.push(x-w/2,y,z,x+w/2,y,z,x+w/2,y+h,z,x-w/2,y,z,x+w/2,y+h,z,x-w/2,y+h,z);uv.push(f,0,1-f,0,1-f,1,f,0,1-f,1,f,1);}
    const bg=new T.BufferGeometry();bg.setAttribute('position',new T.Float32BufferAttribute(pos,3));bg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    this.banks=new T.Mesh(bg,new T.ShaderMaterial({uniforms:{...seaUniforms,shape:{value:shape}},fog:false,transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:'varying vec2 vUv; varying vec3 vWorld; void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader:`varying vec2 vUv;varying vec3 vWorld;uniform sampler2D shape;uniform float daylight;uniform vec3 skyHorizon,cloudTint,cloudShade,eye;
      void main(){vec4 t=texture2D(shape,vUv);if(t.a<.5)discard;vec3 bounce=vec3(.5,.63,.72)*(.3+.7*daylight);
        vec3 col=mix(mix(cloudShade,bounce,.72),cloudTint*1.05,step(.5,t.r));
        col=mix(col,skyHorizon,smoothstep(140.,480.,length(vWorld-eye))*.6);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>}`}));
    this.banks.frustumCulled=false;scene.add(this.banks);
    const water=city.water.material as T.MeshStandardMaterial;
    water.onBeforeCompile=shader=>{shader.uniforms.waterTime=this.waterTime;shader.vertexShader='uniform float waterTime;varying vec2 waterCoord;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterCoord=position.xy;transformed.z+=sin(position.x*3.+waterTime)*.022+sin(position.y*2.+waterTime*1.4)*.018;');shader.fragmentShader='uniform float waterTime;varying vec2 waterCoord;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat crestLine=smoothstep(.88,.97,sin(waterCoord.x*8.+sin(waterCoord.y*2.+waterTime)));diffuseColor.rgb+=vec3(.05,.09,.1)*crestLine;');};
    water.customProgramCacheKey=()=> 'terra-canal-ripples';
    const r=seeded(400);for(let i=0;i<160;i++){this.splashPositions[i*3]=(r()-.5)*19;this.splashPositions[i*3+1]=.12;this.splashPositions[i*3+2]=r()*130-57;}
    const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d')!;ctx.strokeStyle='#c7d9e2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(16,16,13,5,0,0,Math.PI*2);ctx.stroke();const texture=new T.CanvasTexture(c);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(this.splashPositions,3));this.splashes=new T.Points(geo,new T.PointsMaterial({map:texture,color:'#c0cdd2',size:.25,transparent:true,opacity:.3,depthWrite:false}));scene.add(this.splashes);
    const drip=new T.BufferGeometry();drip.setAttribute('position',new T.BufferAttribute(this.dripPositions,3));this.runoff=new T.LineSegments(drip,new T.LineBasicMaterial({color:'#b9d2df',transparent:true,opacity:.3,depthWrite:false}));this.runoff.frustumCulled=false;scene.add(this.runoff);
    const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(this.sparkPositions,3));this.sparks=new T.Points(sg,new T.PointsMaterial({color:'#ffc173',size:.07,transparent:true,opacity:.8,depthWrite:false}));this.sparks.frustumCulled=false;scene.add(this.sparks);
  }
  /** The sea and skirt travel with the eye; their noise stays pinned to the world. */
  follow(eye:T.Vector3){this.sea.position.x=eye.x;this.sea.position.z=eye.z;this.skirt.position.x=eye.x;this.skirt.position.z=eye.z;((this.sea.material as T.ShaderMaterial).uniforms.eye.value as T.Vector3).copy(eye);}
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
    // Sparks belong to the coal furnace; once the Armillary runs there is no coal furnace.
    this.sparks.visible=this.city.economy.state.sites.foundry<5;
    const level=this.city.properties.get('foundry')!.level;for(let i=0;i<65;i++){const t=(time*(.7+level*.12)+i*.127)%2;this.sparkPositions[i*3]=31+Math.sin(i*11)*t*.8;this.sparkPositions[i*3+1]=.8+t*3-t*t;this.sparkPositions[i*3+2]=14+Math.cos(i*7)*t;}this.sparks.geometry.attributes.position.needsUpdate=true;
    mats.road.roughness=rain?.32:.78;mats.dirt.roughness=rain?.52:.94;
  }
}
