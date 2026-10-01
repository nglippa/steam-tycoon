import * as T from 'three';

/** Small things far away are a draw call each and a dozen pixels between them. Frustum culling
 * keeps them because they are in view; this drops them when they are too small on screen to read.
 *
 * It uses the layer mask, not `visible`, so it never fights the code that stages the world.
 * Lit things (lamps, windows, glows) are left alone: a far light is the point of a far light. */
const LIT = new WeakMap<T.Material, boolean>(), centre = new T.Vector3(), scale = new T.Vector3();
const lit = (m: T.Material) => { let v = LIT.get(m); if (v === undefined) { const e = (m as T.MeshStandardMaterial).emissive; v = m instanceof T.MeshBasicMaterial || m instanceof T.ShaderMaterial || !!(e && e.r + e.g + e.b > 0) || m.transparent; LIT.set(m, v); } return v; };

export class DetailCull {
  private elapsed = 1;
  /** `ratio` is radius over distance: .01 is about fourteen pixels across on a 1000-pixel-high view. */
  constructor(private scene: T.Scene, private ratio = .01, private maxRadius = 4) {}
  update(dt: number, eye: T.Vector3) {
    this.elapsed += dt; if (this.elapsed < .2) return; this.elapsed = 0;
    const visit = (o: T.Object3D) => {
      if (!o.visible) return;
      if (o instanceof T.Mesh && o.frustumCulled && !(o instanceof T.InstancedMesh) && !(o instanceof T.BatchedMesh) && !Array.isArray(o.material) && !lit(o.material)) {
        const g = o.geometry as T.BufferGeometry; if (!g.boundingSphere) g.computeBoundingSphere();
        const s = g.boundingSphere!, r = s.radius * scale.setFromMatrixScale(o.matrixWorld).x;
        if (r < this.maxRadius) {
          const d = centre.copy(s.center).applyMatrix4(o.matrixWorld).distanceTo(eye), shown = o.layers.isEnabled(0);
          // A little slack either side of the line so nothing flickers at the threshold.
          if (shown ? r < d * this.ratio * .9 : r > d * this.ratio * 1.1) o.layers.toggle(0);
        }
      }
      for (const c of o.children) visit(c);
    };
    visit(this.scene);
  }
}
