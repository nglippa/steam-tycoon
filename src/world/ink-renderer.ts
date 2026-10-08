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
      fogColor: { value: new T.Color() }, fogDensity: { value: 0 }, lineScale: { value: 1 }, pxAngle: { value: .002 },
    },
    vertexShader: 'varying vec2 uvInk; void main(){uvInk=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `
      varying vec2 uvInk;
      uniform sampler2D picture, depth;
      uniform vec2 texel;
      uniform float near, far, recovery;
      uniform vec3 fogColor; uniform float fogDensity, lineScale, pxAngle;
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
        // Calm: past ~15 m the pen stops wandering, so far lines hold still while the view turns. Taken at the nearest of
        // four taps, so the outer half of a near silhouette against the sky keeps the near hand.
        vec2 reach = texel * 3.;
        float calm = smoothstep(15., 60., min(min(centerDist, min(distanceAt(uvInk + vec2(reach.x, 0.)), distanceAt(uvInk - vec2(reach.x, 0.)))),
                                                    min(distanceAt(uvInk + vec2(0., reach.y)), distanceAt(uvInk - vec2(0., reach.y)))));
        // Line weight: heavy near the eye, thinning with distance, modulated along its length (near lines only). lineScale
        // keeps the width in CSS pixels when the resolution steps down; one buffer pixel is the least a line can be.
        // Wobble: sample points drift a little, so straight edges read hand-drawn. Once the pen is calm neither the weight
        // noise nor the wobble is drawn, so the noise is not computed there (the sky and everything past 60 m).
        float pen = 1.; vec2 wob = vec2(0.);
        if (calm < 1.) { pen = mix(.8 + .45 * vnoise(px * .045), 1., calm); wob = (vec2(vnoise(px * .02), vnoise(px * .02 + 17.3)) - .5) * 1.6 * (1. - calm); }
        float weight = max(1., mix(3.0, 1.2, smoothstep(6., 80., centerDist)) * lineScale * pen);
        vec2 uv = uvInk + wob * texel;
        // Line class: printed (a<.25) / thin people+props (a~.5) / world (a=1). Neighbours decide,
        // so both sides of a character's silhouette get the thin line.
        vec2 p0 = texel * weight;
        float cls = min(min(texture2D(picture, uv + vec2(p0.x, 0.)).a, texture2D(picture, uv - vec2(p0.x, 0.)).a), min(texture2D(picture, uv + vec2(0., p0.y)).a, texture2D(picture, uv - vec2(0., p0.y)).a));
        cls = min(cls, sample0.a);
        // Narrow band: MSAA-resolved alpha at a world/thin edge must not read as thin. Foliage (a=.75) and wires (a=.9) are
        // classes of their own (a wire's partly covered pixel resolves between .9 and 1, still under .995).
        float thin = step(.35, cls) * (1. - step(.65, cls)), leafy = step(.65, cls) * (1. - step(.85, cls)), wire = step(.85, cls) * (1. - step(.995, cls));
        vec2 o = texel * weight * mix(1., .38, thin);
        float c0 = distanceAt(uv);
        float l = distanceAt(uv - vec2(o.x, 0.)), r = distanceAt(uv + vec2(o.x, 0.));
        float u = distanceAt(uv + vec2(0., o.y)), d = distanceAt(uv - vec2(0., o.y));
        float a1 = distanceAt(uv + o * vec2(.7, .7)), a2 = distanceAt(uv + o * vec2(-.7, .7));
        float a3 = distanceAt(uv - o * vec2(.7, .7)), a4 = distanceAt(uv - o * vec2(-.7, .7));
        float nearest = min(min(min(c0, l), min(r, u)), min(min(d, a1), min(min(a2, a3), a4)));
        float farthest = max(max(max(c0, l), max(r, u)), max(max(d, a1), max(max(a2, a3), a4)));
        // Outer edges: against the sky, or with the background well behind. Inner edges (a cornice, a chimney on its own
        // roof) are a small depth ratio. Bands: mid thins the creases, far keeps outer silhouettes only.
        float outer = max(step(far * .9, farthest), smoothstep(1.3, 1.8, farthest / nearest));
        float tMid = smoothstep(30., 90., nearest), tFar = smoothstep(90., 160., nearest);
        // Mid cut: past 30 m (full by 50 m) inner creases need twice the step, so a third fewer of them draw, and foliage
        // keeps only its outer silhouette. Silhouettes keep their strength.
        float tCut = smoothstep(30., 50., nearest);
        // A flat surface is linear in 1/z at any viewing angle, so the second difference of inverse
        // distance is ~0 on a plane (even grazing ground) and large only at creases and silhouettes.
        float ic = 1. / c0;
        float e = max(max(abs(1. / l + 1. / r - 2. * ic), abs(1. / u + 1. / d - 2. * ic)),
                      max(abs(1. / a1 + 1. / a3 - 2. * ic), abs(1. / a2 + 1. / a4 - 2. * ic))) * c0;
        float silhouette = smoothstep(.07, .18, e) * mix(1., outer, max(tFar, leafy * tCut));
        // (The raised step is for inner creases only: along an outer edge the crease term fills the gaps of an aliased
        // silhouette, and taking it away there leaves a dotted outline.)
        float cut = mix(1., 2., tCut * (1. - outer));
        float crease = smoothstep(mix(.02, .035, tMid) * cut, mix(.05, .09, tMid) * cut, e) * (1. - tFar) * (1. - leafy * tCut);
        // Interior lines where color blocks meet (frames, trims, clothing panels) — not on sky.
        float lc = luma(texture2D(picture, uv).rgb);
        float lL = luma(texture2D(picture, uv - vec2(o.x, 0.)).rgb), lR = luma(texture2D(picture, uv + vec2(o.x, 0.)).rgb);
        float lU = luma(texture2D(picture, uv + vec2(0., o.y)).rgb), lD = luma(texture2D(picture, uv - vec2(0., o.y)).rgb);
        float gl = abs(lL - lR) + abs(lD - lU);
        float solid = 1. - step(far * .9, nearest);
        // Texture contrast on grazing surfaces (distant ground) is aliasing, not a drawn line.
        float slope = (abs(l - r) + abs(u - d)) / (c0 * 2. * length(o / texel));
        float colorEdge = smoothstep(.16, .3, gl / max(lc, .18)) * solid * (1. - smoothstep(14., 42., nearest)) * (1. - smoothstep(.0012, .0025, slope)) * (1. - leafy * tCut);
        // Strength and tone, only where there is a line to draw (most of the screen has none and skips the work).
        float ink = 0.;
        vec3 inkColor = color;
        if (max(max(silhouette, crease), colorEdge) > 0.) {
          // Wires (a=.9; cables and trolley wires, 3.6 cm across): past the distance where one is narrower than a pixel the
          // depth target, one sample a pixel, holds it only here and there, and its outline breaks into dashes that crawl as
          // the view turns; its own multisampled colour is a steady faint line. So a wire's ink fades with its projected
          // width, from 1.8 px to .9 px (about 10-20 m), and the haze takes all of what is left. By distance, not by pixel
          // tests, so it cannot flicker.
          float sub = wire * (1. - smoothstep(.9, 1.8, .036 / (nearest * pxAngle)));
          // Dark on dark (a chimney on its own smoke, a tree on the iron gantry behind): value cannot separate them, and a
          // fog-toned line is lighter than both (ink only darkens, so it vanishes). Where the two sides differ by under ~.1
          // (in a perceptual, square-root scale) and both are dark, up to ~120 m, the silhouette keeps its full strength and
          // its dark, untinted line.
          float lo = sqrt(min(min(min(lL, lR), min(lU, lD)), lc)), range = sqrt(max(max(max(lL, lR), max(lU, lD)), lc)) - lo;
          float low = (1. - smoothstep(.06, .12, range)) * (1. - smoothstep(.3, .5, lo)) * (1. - smoothstep(90., 120., nearest)) * (1. - wire);
          // Far lines would break into flickering dashes: take them down to a light steady line. The scene's own FogExp2 at
          // the line's nearer side does the rest, so lines thin out in the haze with the geometry under them.
          float fade = 1. - smoothstep(40., 140., nearest) * .6;
          float fogF = 1. - exp(-fogDensity * fogDensity * nearest * nearest);
          fade *= 1. - mix(.75, 1., wire) * fogF; // a wire's ink takes the whole of the haze
          // Far shapes against the sky (the skyline planes and isles are tinted, not fogged) keep a faint outline.
          fade = max(fade, .3 * step(far * .9, farthest) * tFar * (1. - wire));
          ink = max(silhouette * mix(fade, 1., low), max(crease * .85, colorEdge * .6) * (1. - text) * fade) * (1. - sub);
          // Ink is a deep, color-aware navy-grey rather than black.
          vec3 dark = mix(vec3(.06, .05, .05), color * .25, .2);
          // In haze the pen takes a darker tone of the fog, not black (fog colour is linear, like the target). Far away
          // (80-120 m on) the line itself is 40% the haze, so far shapes part by value as well as by line.
          inkColor = mix(mix(mix(dark, fogColor * .45, fogF), fogColor, .4 * smoothstep(80., 120., nearest)), dark, low);
        }
        // Ink only ever darkens: a fog-toned line must not show up light across smoke or a dark wall.
        color = min(color, mix(color, inkColor, clamp(ink, 0., 1.) * .95));
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
  /** Rendered pixel ratio over the unstrained one: lines keep their width on screen when the resolution steps down. */
  set lineScale(scale: number) { this.material.uniforms.lineScale.value = scale; }
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
    this.material.uniforms.pxAngle.value = 2 * Math.tan(camera.fov * Math.PI / 360) / (camera.zoom * this.size.y); // radians per buffer pixel
    const fog = scene.fog as T.FogExp2 | null;
    this.material.uniforms.fogDensity.value = fog?.density ?? 0;
    if (fog) this.material.uniforms.fogColor.value.copy(fog.color);
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}
