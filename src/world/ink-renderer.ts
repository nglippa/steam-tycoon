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
        // Narrow band: MSAA-resolved alpha at a world/thin edge must not read as thin.
        float thin = step(.35, cls) * (1. - step(.65, cls));
        vec2 o = texel * weight * mix(1., .38, thin);
        float c0 = distanceAt(uv);
        float l = distanceAt(uv - vec2(o.x, 0.)), r = distanceAt(uv + vec2(o.x, 0.));
        float u = distanceAt(uv + vec2(0., o.y)), d = distanceAt(uv - vec2(0., o.y));
        float a1 = distanceAt(uv + o * vec2(.7, .7)), a2 = distanceAt(uv + o * vec2(-.7, .7));
        float a3 = distanceAt(uv - o * vec2(.7, .7)), a4 = distanceAt(uv - o * vec2(-.7, .7));
        float nearest = min(min(min(c0, l), min(r, u)), min(min(d, a1), min(min(a2, a3), a4)));
        // A flat surface is linear in 1/z at any viewing angle, so the second difference of inverse
        // distance is ~0 on a plane (even grazing ground) and large only at creases and silhouettes.
        float ic = 1. / c0;
        float e = max(max(abs(1. / l + 1. / r - 2. * ic), abs(1. / u + 1. / d - 2. * ic)),
                      max(abs(1. / a1 + 1. / a3 - 2. * ic), abs(1. / a2 + 1. / a4 - 2. * ic))) * c0;
        float silhouette = smoothstep(.07, .18, e);
        float crease = smoothstep(.012, .035, e);
        // Interior lines where color blocks meet (frames, trims, clothing panels) — not on sky.
        float lc = luma(texture2D(picture, uv).rgb);
        float gl = abs(luma(texture2D(picture, uv - vec2(o.x, 0.)).rgb) - luma(texture2D(picture, uv + vec2(o.x, 0.)).rgb))
                 + abs(luma(texture2D(picture, uv - vec2(0., o.y)).rgb) - luma(texture2D(picture, uv + vec2(0., o.y)).rgb));
        float solid = 1. - step(far * .9, nearest);
        // Texture contrast on grazing surfaces (distant ground) is aliasing, not a drawn line.
        float slope = (abs(l - r) + abs(u - d)) / (c0 * 2. * length(o / texel));
        float colorEdge = smoothstep(.16, .3, gl / max(lc, .18)) * solid * (1. - smoothstep(14., 42., nearest)) * (1. - smoothstep(0.004, 0.012, slope));
        // Far lines would break into flickering dashes: take them down early to a light steady line.
        float fade = 1. - smoothstep(60., 220., nearest) * .75;
        float ink = max(max(silhouette, crease * .85 * (1. - text)), colorEdge * .6 * (1. - text)) * fade;
        // Ink is a deep, color-aware navy-grey rather than black.
        vec3 inkColor = mix(vec3(.06, .05, .05), color * .25, .2);
        color = mix(color, inkColor, clamp(ink, 0., 1.) * .95);
        // Dreary grade: soot-tinted desaturation, crushed highlights, lifted smoky blacks and a
        // heavy vignette. Recovery (prosperity) gives back some colour, never the full candy.
        float gradeL = dot(color, vec3(.299, .587, .114));
        color = mix(vec3(gradeL), color, mix(.5, .72, recovery));
        color *= mix(vec3(.88, .93, 1.06), mix(vec3(.95, .93, .86), vec3(.99, .97, .93), recovery), smoothstep(.08, .45, gradeL));
        color = color / (1. + color * mix(.3, .18, recovery));
        color = max(color, vec3(.022, .026, .042)) + vec3(.008, .011, .022) * (1. - gradeL);
        vec2 vc = uvInk - .5; color *= 1. - dot(vc, vc) * mix(.95, .7, recovery);
        gl_FragColor = vec4(color, 1.);
        #include <colorspace_fragment>
      }`,
  });
  constructor(private renderer: T.WebGLRenderer) {
    renderer.info.autoReset = false;
    this.scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), this.material));
  }
  setRecovery(stage: number) { this.material.uniforms.recovery.value = Math.min(1, stage / 5); }
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
