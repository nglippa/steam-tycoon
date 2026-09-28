import * as T from 'three';

/** One scene submission plus a screen-space ink pass, including animated crowds.
 * Depth curvature finds silhouettes and creases without outlining texture noise. */
export class InkRenderer {
  private target = new T.WebGLRenderTarget(1, 1, { depthTexture: new T.DepthTexture(1, 1), samples: 4 });
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private size = new T.Vector2();
  private material = new T.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: {
      picture: { value: this.target.texture }, depth: { value: this.target.depthTexture },
      texel: { value: new T.Vector2(1, 1) }, near: { value: .08 }, far: { value: 500 }, recovery: { value: 0 },
    },
    vertexShader: 'varying vec2 uvInk; void main(){uvInk=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `
      varying vec2 uvInk;
      uniform sampler2D picture, depth;
      uniform vec2 texel;
      uniform float near, far, recovery;
      float distanceAt(vec2 uv) {
        float d = texture2D(depth, uv).r;
        return (near * far) / (far - d * (far - near));
      }
      // Stable screen-space value noise: the pen wanders, but never flickers.
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
      float luma(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
      void main() {
        vec2 px = gl_FragCoord.xy;
        vec4 sample0 = texture2D(picture, uvInk); vec3 color = sample0.rgb;
        float text = 1. - step(.25, sample0.a); // printed surfaces: keep silhouettes, skip interior ink
        float centerDist = distanceAt(uvInk);
        // Line weight: heavy near the eye, thinning with distance, modulated along its length.
        float weight = mix(3.0, 1.2, smoothstep(6., 80., centerDist)) * (.8 + .45 * vnoise(px * .045));
        // Wobble: sample points drift a little, so straight edges read hand-drawn.
        vec2 wob = (vec2(vnoise(px * .02), vnoise(px * .02 + 17.3)) - .5) * 1.6;
        vec2 uv = uvInk + wob * texel;
        // Line class: printed (a<.25) / thin people+props (a~.5) / world (a=1). Neighbours decide,
        // so both sides of a character's silhouette get the thin line.
        vec2 p0 = texel * weight;
        float cls = min(min(texture2D(picture, uv + vec2(p0.x, 0.)).a, texture2D(picture, uv - vec2(p0.x, 0.)).a), min(texture2D(picture, uv + vec2(0., p0.y)).a, texture2D(picture, uv - vec2(0., p0.y)).a));
        cls = min(cls, sample0.a);
        float thin = step(.25, cls) * (1. - step(.75, cls));
        // Ground (a~.8): a little interior definition near the eye, broad masses beyond.
        float ground = step(.75, cls) * (1. - step(.9, cls)), groundInk = 1. - ground * mix(.55, 1., smoothstep(4., 20., centerDist));
        vec2 o = texel * weight * mix(1., .38, thin);
        float c0 = distanceAt(uv);
        float l = distanceAt(uv - vec2(o.x, 0.)), r = distanceAt(uv + vec2(o.x, 0.));
        float u = distanceAt(uv + vec2(0., o.y)), d = distanceAt(uv - vec2(0., o.y));
        float a1 = distanceAt(uv + o * vec2(.7, .7)), a2 = distanceAt(uv + o * vec2(-.7, .7));
        float a3 = distanceAt(uv - o * vec2(.7, .7)), a4 = distanceAt(uv - o * vec2(-.7, .7));
        float nearest = min(min(min(c0, l), min(r, u)), min(min(d, a1), min(min(a2, a3), a4)));
        float farthest = max(max(max(c0, l), max(r, u)), max(max(d, a1), max(max(a2, a3), a4)));
        float jump = (farthest - nearest) / max(nearest, .5);
        float crease = max(max(abs(l + r - 2. * c0), abs(u + d - 2. * c0)), max(abs(a1 + a3 - 2. * c0), abs(a2 + a4 - 2. * c0))) / max(c0, 1.);
        // Interior lines where color blocks meet (frames, trims, clothing panels) — not on sky.
        float lc = luma(texture2D(picture, uv).rgb);
        float gl = abs(luma(texture2D(picture, uv - vec2(o.x, 0.)).rgb) - luma(texture2D(picture, uv + vec2(o.x, 0.)).rgb))
                 + abs(luma(texture2D(picture, uv - vec2(0., o.y)).rgb) - luma(texture2D(picture, uv + vec2(0., o.y)).rgb));
        float solid = 1. - step(far * .9, nearest);
        float colorEdge = smoothstep(.16, .3, gl / max(lc, .18)) * solid * (1. - smoothstep(18., 60., nearest));
        float fade = 1. - smoothstep(90., 320., nearest) * .65;
        // People keep a clean silhouette but no colour-block interior ink: faces are already painted.
        float ink = max(max(smoothstep(.07, .18, jump), smoothstep(.012, .035, crease) * .85 * (1. - text) * (1. - .7 * thin) * groundInk), colorEdge * .6 * (1. - text) * (1. - thin) * groundInk) * fade;
        // Ink is a deep, color-aware navy-grey rather than black.
        // Never lighter than the surface it darkens: a fixed ink value glowed as a pale halo at night.
        vec3 inkColor = min(mix(vec3(.03, .026, .03), color * .25, .2), color * .4);
        color = mix(color, inkColor, clamp(ink, 0., 1.) * .95);
        // Condition grade: the Lowworks sit cool, sooty and restrained; prosperity brings back
        // warm mids and the full authored colour. Lows stay dark, highlights roll off softly.
        float gradeL = dot(color, vec3(.299, .587, .114));
        color = mix(vec3(gradeL), color, mix(.8, 1.1, recovery));
        color *= mix(mix(vec3(.9, .95, 1.06), vec3(.97, .99, 1.03), recovery), mix(vec3(.97, .97, .96), vec3(1.04, 1.01, .95), recovery), smoothstep(.04, .35, gradeL));
        color *= mix(.92, 1.06, recovery);
        vec3 over = max(color - .7, 0.); color = min(color, vec3(.7)) + over / (1. + over * 1.4);
        vec2 vc = uvInk - .5; color *= 1. - dot(vc, vc) * mix(.42, .22, recovery);
        gl_FragColor = vec4(color, 1.);
        #include <colorspace_fragment>
      }`,
  });
  constructor(private renderer: T.WebGLRenderer) {
    renderer.info.autoReset = false;
    this.scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), this.material));
  }
  // Eased so Grand Terra keeps a visible step beyond Innovation.
  setRecovery(stage: number) { const t = Math.min(1, stage / 5); this.material.uniforms.recovery.value = t * t * (1.6 - .6 * t); }
  setQuality(high: boolean) {
    const samples = high ? Math.min(4, this.renderer.capabilities.maxSamples) : 0;
    if (this.target.samples === samples) return;
    this.target.samples = samples;
    this.target.dispose(); // Reallocate the framebuffer with the selected sample count.
  }
  render(scene: T.Scene, camera: T.PerspectiveCamera) {
    this.renderer.info.reset();
    this.renderer.getDrawingBufferSize(this.size);
    if (this.target.width !== this.size.x || this.target.height !== this.size.y) {
      this.target.setSize(this.size.x, this.size.y);
      this.material.uniforms.texel.value.set(1 / this.size.x, 1 / this.size.y);
    }
    this.material.uniforms.near.value = camera.near;
    this.material.uniforms.far.value = camera.far;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}
