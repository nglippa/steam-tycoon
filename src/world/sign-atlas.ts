import * as T from 'three';

/** Every sign, stencil and plaque used to be its own canvas, its own material and so its own
 * draw call. An atlas packs a family of them onto shared pages: one material per page, so a
 * baked group merges all its signs into one mesh, and loose ones at least share state.
 *
 * Build-time only. Adding to a page after it has been drawn re-uploads the whole page. */
export type Rect = [u0: number, v0: number, u1: number, v1: number];
export type Placed<M extends T.Material> = { material: M; rect: Rect };
type Page<M> = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: T.CanvasTexture; material: M; x: number; y: number; row: number };

export class Atlas<M extends T.Material> {
  private pages: Page<M>[] = [];
  /** `make` builds the page's material from its texture. `pad` is the gutter that keeps mipmaps from bleeding. */
  constructor(private make: (map: T.CanvasTexture) => M, private size = 4096, private pad = 8) {}
  private page(): Page<M> {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = this.size;
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 16; texture.minFilter = T.LinearMipmapLinearFilter;
    const page = { canvas, ctx: canvas.getContext('2d')!, texture, material: this.make(texture), x: 0, y: 0, row: 0 }; this.pages.push(page); return page;
  }
  add(source: HTMLCanvasElement): Placed<M> {
    const pad = this.pad, limit = this.size - pad * 2, k = Math.min(1, limit / source.width, limit / source.height), w = Math.floor(source.width * k), h = Math.floor(source.height * k);
    let page = this.pages[this.pages.length - 1] ?? this.page();
    // Shelf packing: fill a row left to right, start a new row under the tallest thing in it, a new page when rows run out.
    if (page.x + w + pad * 2 > this.size) { page.x = 0; page.y += page.row; page.row = 0; }
    if (page.y + h + pad * 2 > this.size) page = this.page();
    const x = page.x + pad, y = page.y + pad;
    // Stretched underlay first, so the gutter carries the sign's own edge colour into the low mips.
    page.ctx.drawImage(source, x - pad, y - pad, w + pad * 2, h + pad * 2); page.ctx.clearRect(x, y, w, h); page.ctx.drawImage(source, x, y, w, h);
    page.x += w + pad * 2; page.row = Math.max(page.row, h + pad * 2); page.texture.needsUpdate = true;
    const S = this.size; return { material: page.material, rect: [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S] };
  }
}
/** Move a geometry's 0..1 UVs into its rectangle on the page. */
export function place<G extends T.BufferGeometry>(geometry: G, [u0, v0, u1, v1]: Rect): G {
  const uv = geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0)); uv.needsUpdate = true; return geometry;
}
