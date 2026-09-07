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
      texel: { value: new T.Vector2(1, 1) }, near: { value: .08 }, far: { value: 500 },
    },
    vertexShader: 'varying vec2 uvInk; void main(){uvInk=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `
      varying vec2 uvInk;
      uniform sampler2D picture, depth;
      uniform vec2 texel;
      uniform float near, far;
      float distanceAt(vec2 uv) {
        float d = texture2D(depth, uv).r;
        return (near * far) / (far - d * (far - near));
      }
      void main() {
        vec3 color = texture2D(picture, uvInk).rgb;
        float center = distanceAt(uvInk);
        float l = distanceAt(uvInk - vec2(texel.x, 0.));
        float r = distanceAt(uvInk + vec2(texel.x, 0.));
        float u = distanceAt(uvInk + vec2(0., texel.y));
        float d = distanceAt(uvInk - vec2(0., texel.y));
        float crease = max(abs(l + r - 2. * center), abs(u + d - 2. * center)) / max(center, 1.);
        float ink = smoothstep(.012, .038, crease) * (1. - smoothstep(24., 105., center));
        // A tiny stable paper tooth, never animated grain or flickering outlines.
        float paper = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453);
        color = mix(color, vec3(.035, .062, .065), ink * .69);
        color += (paper - .5) * .002;
        gl_FragColor = vec4(color, 1.);
        #include <colorspace_fragment>
      }`,
  });
  constructor(private renderer: T.WebGLRenderer) {
    renderer.info.autoReset = false;
    this.scene.add(new T.Mesh(new T.PlaneGeometry(2, 2), this.material));
  }
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
      this.material.uniforms.texel.value.set(1.15 / this.size.x, 1.15 / this.size.y);
    }
    this.material.uniforms.near.value = camera.near;
    this.material.uniforms.far.value = camera.far;
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}
