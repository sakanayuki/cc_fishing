/** 1ピクセルずつ色を置いてから Canvas に焼き込むためのグリッド。 */
export class PixelGrid {
  readonly data: (string | null)[];

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Array(w * h).fill(null);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): string | null {
    return this.inBounds(x, y) ? this.data[y * this.w + x] : null;
  }

  set(x: number, y: number, color: string | null): void {
    x = Math.round(x);
    y = Math.round(y);
    if (this.inBounds(x, y)) this.data[y * this.w + x] = color;
  }

  /** 空きピクセルのうち、塗られたピクセルに上下左右で接するものを縁取る。 */
  outline(color: string): void {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) {
          add.push(y * this.w + x);
        }
      }
    }
    for (const i of add) this.data[i] = color;
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: string): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, color);
      }
    }
  }

  fillRect(x0: number, y0: number, w: number, h: number, color: string): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, color);
  }

  toCanvas(): HTMLCanvasElement {
    const [canvas, ctx] = makeCanvas(this.w, this.h);
    const img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data[i];
      if (!c) continue;
      const [r, g, b, a] = parseColor(c);
      img.data.set([r, g, b, a], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

/** #rgb / #rrggbb / #rrggbbaa を [r,g,b,a] に。 */
export function parseColor(hex: string): [number, number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

/** 色を明るく(amount>0)／暗く(amount<0)する。 */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parseColor(hex);
  const f = (v: number) => {
    const out = amount >= 0 ? v + (255 - v) * amount : v * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(out)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(r)}${f(g)}${f(b)}`;
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseColor(a);
  const [r2, g2, b2] = parseColor(b);
  const f = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`;
}
