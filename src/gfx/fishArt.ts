import { SPECIES, type FishId, type FishSpecies } from '../fish';
import { mix, PixelGrid, shade } from './pixel';

interface Fin {
  from: number;
  to: number;
  height: number;
  spiky?: boolean;
  color?: string;
}

type Pattern = 'aji' | 'saba' | 'spots' | 'mottle' | 'katsuo' | 'dots' | 'none';

interface Look {
  back: string;
  belly: string;
  fin: string;
  outline: string;
  /** 尾びれの長さ（全長に対する割合）。 */
  tail: number;
  tailShape: 'fork' | 'round';
  /** 体高が最大になる位置（0=尾側, 1=頭側）。 */
  peak: number;
  /** 大きいほど紡錘形に尖る。 */
  pointy: number;
  /** 頭側の最小の太さ（割合）。 */
  blunt?: number;
  /** 尾の付け根の太さ（割合）。 */
  ped?: number;
  /** 背と腹の色の境目（0=上端, 1=下端）。 */
  bellyLine: number;
  dorsal?: Fin[];
  anal?: Fin[];
  pattern?: Pattern;
  patternColor?: string;
  eye: { r: 1 | 2 | 3; iris?: string; t?: number };
  mouth?: 'normal' | 'big';
  lure?: boolean;
  finlets?: string;
}

const LOOKS: Record<FishId, Look> = {
  aji: {
    back: '#6f9a9a', belly: '#dfe8ec', fin: '#c9d27a', outline: '#243240',
    tail: 0.2, tailShape: 'fork', peak: 0.55, pointy: 1.1, blunt: 0.28, bellyLine: 0.45,
    dorsal: [{ from: 0.25, to: 0.6, height: 2 }], anal: [{ from: 0.2, to: 0.45, height: 1 }],
    pattern: 'aji', patternColor: '#7d8a6a', eye: { r: 1 },
  },
  saba: {
    back: '#3f7d95', belly: '#e4ecf0', fin: '#6d8fa0', outline: '#1c2c3c',
    tail: 0.18, tailShape: 'fork', peak: 0.55, pointy: 1.2, bellyLine: 0.5,
    dorsal: [{ from: 0.2, to: 0.5, height: 2 }], anal: [{ from: 0.2, to: 0.35, height: 1 }],
    pattern: 'saba', patternColor: '#1e3f55', eye: { r: 1 },
  },
  kawahagi: {
    back: '#9a9a8a', belly: '#c8c6b4', fin: '#8a8a78', outline: '#33332c',
    tail: 0.18, tailShape: 'round', peak: 0.5, pointy: 1.0, blunt: 0.12, bellyLine: 0.7,
    dorsal: [{ from: 0.1, to: 0.55, height: 2 }, { from: 0.72, to: 0.76, height: 3, spiky: true }],
    anal: [{ from: 0.1, to: 0.5, height: 2 }],
    pattern: 'dots', patternColor: '#6c6c5e', eye: { r: 1, t: 0.8 },
  },
  madai: {
    back: '#e0525a', belly: '#f6d6d2', fin: '#e8787a', outline: '#5a1c24',
    tail: 0.17, tailShape: 'fork', peak: 0.62, pointy: 0.9, blunt: 0.3, bellyLine: 0.62,
    dorsal: [{ from: 0.15, to: 0.72, height: 4, spiky: true }], anal: [{ from: 0.18, to: 0.4, height: 2 }],
    pattern: 'spots', patternColor: '#9fd8f0', eye: { r: 2, iris: '#c85030' },
  },
  hirame: {
    back: '#7a6446', belly: '#8a7454', fin: '#6a563c', outline: '#2c2418',
    tail: 0.14, tailShape: 'round', peak: 0.5, pointy: 0.7, blunt: 0.35, bellyLine: 1,
    dorsal: [{ from: 0.02, to: 0.86, height: 2 }], anal: [{ from: 0.02, to: 0.78, height: 2 }],
    pattern: 'mottle', patternColor: '#5a4630', eye: { r: 1, t: 0.84 },
  },
  katsuo: {
    back: '#2c4a78', belly: '#d6dfe8', fin: '#3a5a86', outline: '#141e32',
    tail: 0.17, tailShape: 'fork', peak: 0.55, pointy: 1.3, blunt: 0.3, bellyLine: 0.42,
    dorsal: [{ from: 0.45, to: 0.7, height: 3 }, { from: 0.25, to: 0.35, height: 2 }],
    anal: [{ from: 0.25, to: 0.35, height: 2 }],
    pattern: 'katsuo', patternColor: '#4a5a78', eye: { r: 1 },
  },
  maguro: {
    back: '#1f3563', belly: '#dce4ec', fin: '#2c4478', outline: '#0e1830',
    tail: 0.17, tailShape: 'fork', peak: 0.52, pointy: 1.3, blunt: 0.32, bellyLine: 0.45,
    dorsal: [{ from: 0.5, to: 0.7, height: 3 }, { from: 0.32, to: 0.42, height: 3, color: '#e8c040' }],
    anal: [{ from: 0.3, to: 0.4, height: 3, color: '#e8c040' }],
    pattern: 'none', eye: { r: 2, iris: '#e0c070' }, finlets: '#f0d040',
  },
  mehikari: {
    back: '#7c8894', belly: '#d8dde2', fin: '#9aa4ae', outline: '#262c34',
    tail: 0.2, tailShape: 'fork', peak: 0.6, pointy: 0.9, blunt: 0.4, bellyLine: 0.5,
    dorsal: [{ from: 0.4, to: 0.55, height: 2 }], anal: [{ from: 0.2, to: 0.35, height: 1 }],
    eye: { r: 3, iris: '#3ae08a', t: 0.82 },
  },
  yumekasago: {
    back: '#d8482e', belly: '#f0a070', fin: '#e06040', outline: '#4a160e',
    tail: 0.16, tailShape: 'round', peak: 0.68, pointy: 0.8, blunt: 0.45, bellyLine: 0.62,
    dorsal: [{ from: 0.25, to: 0.78, height: 4, spiky: true }], anal: [{ from: 0.2, to: 0.38, height: 2 }],
    pattern: 'dots', patternColor: '#a02818', eye: { r: 2, iris: '#f0d060', t: 0.82 },
  },
  gindara: {
    back: '#3a4048', belly: '#6a7280', fin: '#2e3440', outline: '#101418',
    tail: 0.14, tailShape: 'round', peak: 0.62, pointy: 0.8, blunt: 0.35, ped: 0.2, bellyLine: 0.65,
    dorsal: [{ from: 0.55, to: 0.75, height: 3 }, { from: 0.15, to: 0.4, height: 2 }],
    anal: [{ from: 0.15, to: 0.4, height: 2 }],
    eye: { r: 1, iris: '#e08030' },
  },
  ankou: {
    back: '#5e5a4c', belly: '#8a8470', fin: '#4a463a', outline: '#1c1a14',
    tail: 0.14, tailShape: 'round', peak: 0.72, pointy: 0.9, blunt: 0.6, ped: 0.16, bellyLine: 0.72,
    dorsal: [{ from: 0.18, to: 0.38, height: 3 }], anal: [{ from: 0.15, to: 0.3, height: 2 }],
    pattern: 'mottle', patternColor: '#3c382e', eye: { r: 2, iris: '#d8a040', t: 0.72 },
    mouth: 'big', lure: true,
  },
};

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 右向きの魚のドット絵を生成する。グリッドは縁取り用に上下左右1pxずつ大きい。 */
export function paintFish(species: FishSpecies): PixelGrid {
  const look = LOOKS[species.id];
  const { width: w, height: h } = species;
  const g = new PixelGrid(w + 2, h + 2);
  const seed = species.points;

  const finTop = Math.max(0, ...(look.dorsal ?? []).map((f) => f.height));
  const finBottom = Math.max(0, ...(look.anal ?? []).map((f) => f.height));
  const bodyHalf = (h - finTop - finBottom) / 2;
  const cy = 1 + finTop + bodyHalf;
  const tailW = Math.round(w * look.tail);
  const bx0 = 1 + tailW;
  const bx1 = w;
  const k = Math.log(0.5) / Math.log(look.peak);
  const ped = look.ped ?? 0.28;
  const blunt = look.blunt ?? 0.18;

  const halfAt = (t: number) => {
    const p = Math.sin(Math.PI * Math.pow(Math.min(Math.max(t, 0), 1), k)) ** look.pointy;
    const floor = t < look.peak ? ped : blunt;
    return bodyHalf * Math.max(p, floor);
  };
  const tAt = (x: number) => (x + 0.5 - bx0) / (bx1 - bx0 + 1);

  // 尾びれ
  const tailHalf = bodyHalf * 0.95;
  for (let x = 1; x < bx0; x++) {
    const s = (bx0 - x) / tailW;
    const half =
      look.tailShape === 'fork'
        ? bodyHalf * ped + (tailHalf - bodyHalf * ped) * Math.pow(s, 0.8)
        : bodyHalf * ped + (tailHalf * 0.7 - bodyHalf * ped) * Math.sin((s * Math.PI) / 2);
    for (let y = 0; y < g.h; y++) {
      const dy = y + 0.5 - cy;
      if (Math.abs(dy) > half) continue;
      if (look.tailShape === 'fork' && s > 0.45 && Math.abs(dy) < ((s - 0.45) / 0.55) * tailHalf * 0.8) continue;
      g.set(x, y, Math.abs(dy) > half - 1 ? shade(look.fin, -0.15) : look.fin);
    }
  }

  // 背びれ・しりびれ
  const drawFins = (fins: Fin[] | undefined, up: boolean) => {
    for (const fin of fins ?? []) {
      for (let x = bx0; x <= bx1; x++) {
        const t = tAt(x);
        if (t < fin.from || t > fin.to) continue;
        const local = (t - fin.from) / (fin.to - fin.from);
        const shapeH = fin.spiky ? (x % 2 === 0 ? 1 : 0.55) : Math.sqrt(Math.sin(local * Math.PI));
        const fh = Math.max(1, Math.round(fin.height * shapeH));
        const edge = up ? Math.floor(cy - halfAt(t)) : Math.ceil(cy + halfAt(t)) - 1;
        for (let i = 1; i <= fh; i++) g.set(x, up ? edge - i + 1 : edge + i - 1, fin.color ?? look.fin);
      }
    }
  };
  drawFins(look.dorsal, true);
  drawFins(look.anal, false);

  // 胴体
  for (let x = bx0; x <= bx1; x++) {
    const t = tAt(x);
    const half = halfAt(t);
    for (let y = 0; y < g.h; y++) {
      const dy = y + 0.5 - cy;
      if (Math.abs(dy) > half) continue;
      const v = (dy + half) / (2 * half);
      let c = v < look.bellyLine ? look.back : look.belly;
      if (Math.abs(v - look.bellyLine) < 0.5 / half) c = mix(look.back, look.belly, 0.5);
      if (v < 0.5 / half) c = shade(look.back, 0.18);
      c = applyPattern(look, c, x, y, t, v, seed) ?? c;
      g.set(x, y, c);
    }
  }

  // エラ
  const gillT = (look.eye.t ?? 0.86) - 0.12;
  const gx = Math.round(bx0 + gillT * (bx1 - bx0));
  const gHalf = halfAt(gillT);
  for (let y = Math.ceil(cy - gHalf * 0.6); y < cy + gHalf * 0.6; y++) {
    const c = g.get(gx, y);
    if (c) g.set(gx, y, shade(c, -0.22));
  }

  // 胸びれ
  const px = gx - 2;
  const py = Math.round(cy + gHalf * 0.15);
  for (let i = 0; i < 3; i++) g.set(px - i, py + Math.floor(i / 2), shade(look.fin, -0.1));

  // マグロの小離鰭
  if (look.finlets) {
    for (let x = bx0 + 1; x < bx0 + (bx1 - bx0) * 0.28; x += 2) {
      const t = tAt(x);
      g.set(x, Math.floor(cy - halfAt(t)) - 1, look.finlets);
      g.set(x, Math.ceil(cy + halfAt(t)), look.finlets);
    }
  }

  // 口
  if (look.mouth === 'big') {
    const my = Math.round(cy + bodyHalf * 0.15);
    const len = Math.round((bx1 - bx0) * 0.3);
    for (let i = 0; i < len; i++) {
      g.set(bx1 - i, my, '#2a1010');
      if (i % 2 === 0 && i < len - 1) g.set(bx1 - i, my - 1, '#f0ece0');
    }
    g.set(bx1 + 1, my - 1, look.back);
  } else {
    g.set(bx1, Math.round(cy + halfAt(1) * 0.3), shade(look.outline, 0.2));
  }

  // 目
  const et = look.eye.t ?? 0.86;
  const ex = Math.round(bx0 + et * (bx1 - bx0));
  const ey = Math.round(cy - halfAt(et) * 0.35) - 1;
  if (look.eye.r === 1) {
    g.set(ex, ey, '#101010');
    g.set(ex - 1, ey, look.eye.iris ?? '#f0f0f0');
  } else if (look.eye.r === 2) {
    g.fillRect(ex - 1, ey - 1, 3, 3, look.eye.iris ?? '#f0f0f0');
    g.set(ex, ey, '#101010');
    g.set(ex - 1, ey - 1, '#ffffff');
  } else {
    g.fillEllipse(ex, ey + 0.5, 2.6, 2.6, look.eye.iris ?? '#f0f0f0');
    g.fillRect(ex - 1, ey - 1, 2, 2, '#081810');
    g.set(ex - 2, ey - 1, '#e8fff0');
  }

  // アンコウの誘引突起
  if (look.lure) {
    const sx = Math.round(bx0 + 0.82 * (bx1 - bx0));
    const top = Math.floor(cy - halfAt(0.82));
    for (let i = 1; i <= 3; i++) g.set(sx + Math.floor(i / 2), top - i, look.fin);
    g.set(sx + 2, top - 4, '#f0e070');
    g.set(sx + 3, top - 4, '#f0e070');
  }

  g.outline(look.outline);
  return g;
}

function applyPattern(look: Look, c: string, x: number, y: number, t: number, v: number, seed: number): string | undefined {
  const pc = look.patternColor ?? c;
  switch (look.pattern) {
    case 'aji':
      if (t < 0.6 && Math.abs(v - (look.bellyLine - 0.02)) < 0.09) return pc;
      if (t > 0.3 && Math.abs(v - (look.bellyLine - 0.12)) < 0.06) return '#d8cc70';
      return undefined;
    case 'saba':
      if (v < look.bellyLine - 0.05 && (x + Math.round(Math.sin(y * 1.4) * 1.5) + y) % 4 === 0) return pc;
      return undefined;
    case 'spots':
      if (v < 0.6 && hash(x, y, seed) < 0.1) return pc;
      return undefined;
    case 'mottle': {
      const n = hash(x >> 1, y >> 1, seed);
      if (n < 0.3) return pc;
      if (n > 0.9) return shade(c, 0.2);
      return undefined;
    }
    case 'dots':
      if (hash(x, y, seed) < 0.12) return pc;
      return undefined;
    case 'katsuo':
      if (v > look.bellyLine + 0.12 && t < 0.8 && Math.floor(v * 14) % 3 === 0) return pc;
      return undefined;
    default:
      return undefined;
  }
}

export interface FishSprite {
  /** 右向き */
  right: HTMLCanvasElement;
  /** 左向き */
  left: HTMLCanvasElement;
}

const sprites = new Map<FishId, FishSprite>();

export function fishSprite(id: FishId): FishSprite {
  let s = sprites.get(id);
  if (!s) {
    const species = SPECIES.find((sp) => sp.id === id)!;
    const right = paintFish(species).toCanvas();
    const left = document.createElement('canvas');
    left.width = right.width;
    left.height = right.height;
    const ctx = left.getContext('2d')!;
    ctx.scale(-1, 1);
    ctx.drawImage(right, -right.width, 0);
    s = { right, left };
    sprites.set(id, s);
  }
  return s;
}
