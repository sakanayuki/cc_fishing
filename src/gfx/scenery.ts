import { HOOK_MAX_Y, PANEL_Y, ROD_TIP, SEABED_Y, SURFACE_Y, VIEW_H, VIEW_W } from '../config';
import { createRng, range } from '../rng';
import { makeCanvas, mix, PixelGrid } from './pixel';

export const COLORS = {
  skyTop: '#7cc4ee',
  skyBottom: '#d4eefa',
  farSea: '#2f86c4',
  panel: '#0e1828',
  panelEdge: '#2a3c5c',
  line: '#e8f4f8',
} as const;

/** 水平線（遠くの海面）の y。 */
export const HORIZON_Y = 90;

/** 水深ごとの海の色（上から下へ）。 */
const SEA_STOPS: [number, string][] = [
  [0, '#48c0e0'],
  [0.18, '#2a96c8'],
  [0.45, '#1a64a0'],
  [0.75, '#123c74'],
  [1, '#0a1e44'],
];

function seaColor(t: number): string {
  for (let i = 1; i < SEA_STOPS.length; i++) {
    const [t1, c1] = SEA_STOPS[i];
    const [t0, c0] = SEA_STOPS[i - 1];
    if (t <= t1) return mix(c0, c1, (t - t0) / (t1 - t0));
  }
  return SEA_STOPS[SEA_STOPS.length - 1][1];
}

/** 岩場の上端の高さ（x ごと）。中央は低く、両端は崖のように高い。 */
function rockProfile(): number[] {
  const rng = createRng(7);
  const tops: number[] = [];
  let jag = 0;
  for (let x = 0; x < VIEW_W; x++) {
    const u = (x - VIEW_W / 2) / (VIEW_W / 2);
    const cliff = Math.pow(Math.abs(u), 3) * 110;
    if (x % 6 === 0) jag = range(rng, -8, 8);
    const base = HOOK_MAX_Y + 22 - cliff + Math.sin(x * 0.07) * 6 + Math.sin(x * 0.19 + 1) * 4 + jag;
    tops.push(Math.round(Math.min(base, SEABED_Y + 30)));
  }
  return tops;
}

let background: HTMLCanvasElement | undefined;

/** 動かない背景（空・海・光・岩・操作パネル）を一度だけ描く。 */
export function getBackground(): HTMLCanvasElement {
  if (background) return background;
  const [canvas, ctx] = makeCanvas(VIEW_W, VIEW_H);
  const rng = createRng(3);

  // 空（4px 刻みの帯でドット感を出す）
  for (let y = 0; y < HORIZON_Y; y += 4) {
    ctx.fillStyle = mix(COLORS.skyTop, COLORS.skyBottom, y / HORIZON_Y);
    ctx.fillRect(0, y, VIEW_W, 4);
  }
  // 雲
  const cloud = new PixelGrid(VIEW_W, HORIZON_Y);
  for (const [cx, cy, s] of [
    [40, 26, 1],
    [120, 14, 0.7],
    [300, 30, 1.2],
    [230, 60, 0.6],
    [70, 70, 0.5],
  ]) {
    for (let i = 0; i < 5; i++) {
      cloud.fillEllipse(cx + (i - 2) * 9 * s, cy - (i % 2) * 4 * s, 10 * s, 5 * s, '#ffffff');
    }
    for (let x = cx - 26 * s; x < cx + 26 * s; x++) cloud.set(x, cy + 4 * s, '#e2f2fb');
  }
  ctx.drawImage(cloud.toCanvas(), 0, 0);

  // 遠くの海面
  for (let y = HORIZON_Y; y < SURFACE_Y; y += 2) {
    ctx.fillStyle = mix('#1d6fb0', COLORS.farSea, (y - HORIZON_Y) / (SURFACE_Y - HORIZON_Y));
    ctx.fillRect(0, y, VIEW_W, 2);
  }
  ctx.fillStyle = '#a8dcf4';
  for (let i = 0; i < 70; i++) {
    const y = HORIZON_Y + Math.floor(rng() * (SURFACE_Y - HORIZON_Y - 2));
    ctx.fillRect(Math.floor(rng() * VIEW_W), y, 2 + Math.floor(rng() * 5), 1);
  }

  // 海中：深さに応じて水色→紺色。帯の境目はディザで混ぜる。
  const seaBottom = PANEL_Y;
  for (let y = SURFACE_Y; y < seaBottom; y++) {
    const t = (y - SURFACE_Y) / (seaBottom - SURFACE_Y);
    const band = Math.floor(t * 24) / 24;
    const next = Math.min(1, band + 1 / 24);
    const f = (t - band) * 24;
    for (let x = 0; x < VIEW_W; x++) {
      const dither = ((x + y) % 2 === 0 ? 0.25 : 0.75) < f;
      ctx.fillStyle = seaColor(dither ? next : band);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // 差し込む光
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const x0 = 60 + i * 50 + range(rng, -10, 10);
    const w0 = range(rng, 8, 18);
    const grad = ctx.createLinearGradient(0, SURFACE_Y, 0, SURFACE_Y + 260);
    grad.addColorStop(0, 'rgba(200,240,255,0.16)');
    grad.addColorStop(1, 'rgba(200,240,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x0, SURFACE_Y);
    ctx.lineTo(x0 + w0, SURFACE_Y);
    ctx.lineTo(x0 + w0 * 3 - 40, SURFACE_Y + 260);
    ctx.lineTo(x0 - 60, SURFACE_Y + 260);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 岩場
  const tops = rockProfile();
  const rock = new PixelGrid(VIEW_W, PANEL_Y);
  const stones = ['#1c3048', '#223a56', '#182a40', '#28425f'];
  for (let x = 0; x < VIEW_W; x++) {
    const cx = Math.floor(x / 9);
    const shift = (cx % 2) * 4;
    for (let y = tops[x]; y < PANEL_Y; y++) {
      const depth = y - tops[x];
      const cyy = Math.floor((y + shift) / 8);
      let c = stones[Math.floor(hashNoise(cx, cyy) * stones.length)];
      if ((y + shift) % 8 === 0 || x % 9 === 0) c = '#101e30';
      else if ((y + shift) % 8 === 1) c = mix(c, '#4a6a8c', 0.35);
      if (depth < 2) c = '#46688c';
      else if (depth < 4) c = '#2e4c6c';
      // 下ほど暗く
      c = mix(c, '#08121e', Math.min(0.6, Math.max(0, (y - 470) / 120)));
      rock.set(x, y, c);
    }
  }
  // 岩の割れ目
  for (let i = 0; i < 40; i++) {
    let x = Math.floor(rng() * VIEW_W);
    let y = tops[x] + 6 + Math.floor(rng() * 30);
    for (let j = 0; j < 8; j++) {
      rock.set(x, y, '#0e1a2c');
      x += rng() < 0.5 ? -1 : 1;
      y += 1;
    }
  }
  ctx.drawImage(rock.toCanvas(), 0, 0);

  // 操作パネル
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(0, PANEL_Y, VIEW_W, VIEW_H - PANEL_Y);
  ctx.fillStyle = COLORS.panelEdge;
  ctx.fillRect(0, PANEL_Y, VIEW_W, 2);

  background = canvas;
  return canvas;
}

function hashNoise(x: number, y: number): number {
  let h = (x * 73856093) ^ (y * 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 海面のきらめき・波線（毎フレーム）。 */
export function drawSurface(ctx: CanvasRenderingContext2D, time: number): void {
  for (let x = 0; x < VIEW_W; x += 2) {
    const y = SURFACE_Y + Math.round(Math.sin(x * 0.08 + time * 2) * 1.5);
    ctx.fillStyle = 'rgba(210,245,255,0.85)';
    ctx.fillRect(x, y, 2, 1);
    ctx.fillStyle = 'rgba(120,210,240,0.5)';
    ctx.fillRect(x, y + 1, 2, 2);
  }
  const phase = Math.floor(time * 3);
  ctx.fillStyle = '#e8f8ff';
  for (let i = 0; i < 12; i++) {
    const h = hashNoise(i, phase);
    if (h < 0.5) continue;
    ctx.fillRect(Math.floor(hashNoise(i, 99) * VIEW_W), HORIZON_Y + 3 + Math.floor(h * 16), 3, 1);
  }
}

// ---- 船と釣り人 ----

export const BOAT = { x: 116, y: SURFACE_Y - 22, w: 196, h: 30 } as const;
const FISHER_X = 236;

let boatSprite: HTMLCanvasElement | undefined;
function getBoat(): HTMLCanvasElement {
  if (boatSprite) return boatSprite;
  const g = new PixelGrid(BOAT.w, BOAT.h + 30);
  const top = 30;
  // 船体（台形）
  for (let y = 0; y < BOAT.h - 8; y++) {
    const inset = Math.round((y / (BOAT.h - 8)) ** 1.6 * 22);
    const bowRise = 0;
    for (let x = inset + 2; x < BOAT.w - Math.round(inset * 0.6); x++) {
      let c = y < 3 ? '#c08850' : y % 5 === 0 ? '#7a4a28' : '#9a6038';
      if (y >= 3 && x % 23 === 0) c = '#7a4a28';
      g.set(x, top + y + bowRise, c);
    }
  }
  // 船首を少し上げる
  for (let i = 0; i < 6; i++) g.fillRect(0, top - 1 - i, 8 - i, 1, '#c08850');
  // 操舵室とエンジン
  g.fillRect(150, top - 12, 22, 12, '#5a6470');
  g.fillRect(152, top - 10, 18, 4, '#8a96a2');
  g.fillRect(176, top - 9, 12, 9, '#3c444e');
  g.fillRect(162, top - 30, 2, 18, '#b0b8c0');
  g.outline('#2a1a10');
  boatSprite = g.toCanvas();
  return boatSprite;
}

let fisherSprite: HTMLCanvasElement | undefined;
function getFisher(): HTMLCanvasElement {
  if (fisherSprite) return fisherSprite;
  const g = new PixelGrid(20, 34);
  // 足
  g.fillRect(6, 24, 3, 9, '#2c2c34');
  g.fillRect(11, 24, 3, 9, '#2c2c34');
  // 体（青いジャケット）
  g.fillRect(4, 12, 12, 13, '#2f5fa8');
  g.fillRect(4, 12, 2, 13, '#244c88');
  g.fillRect(9, 13, 1, 11, '#d8dde8');
  // 腕（前へ伸ばす）
  g.fillRect(1, 15, 6, 3, '#2f5fa8');
  g.fillRect(0, 15, 2, 3, '#e8b088');
  // 頭
  g.fillRect(6, 4, 8, 8, '#e8b088');
  g.set(7, 7, '#1a1a1a');
  g.fillRect(6, 10, 3, 1, '#c89070');
  // 帽子
  g.fillRect(5, 1, 10, 4, '#3c4652');
  g.fillRect(2, 4, 6, 1, '#2c343e');
  g.fillRect(12, 4, 3, 4, '#3c4652');
  g.outline('#141820');
  fisherSprite = g.toCanvas();
  return fisherSprite;
}

/** 竿を握る手の位置。 */
const HANDS = { x: FISHER_X - 10 + 1, y: BOAT.y + 7 + 16 } as const;

/**
 * 船・釣り人・竿を描く。bend は竿のしなり（0〜1）。
 * 戻り値は竿先の位置。
 */
export function drawBoat(ctx: CanvasRenderingContext2D, time: number, bend: number): { x: number; y: number } {
  const bob = Math.round(Math.sin(time * 1.6) * 1);
  ctx.drawImage(getBoat(), BOAT.x, BOAT.y - 30 + bob + 8);
  ctx.drawImage(getFisher(), FISHER_X - 10, BOAT.y - 18 + bob);

  const hx = HANDS.x;
  const hy = HANDS.y - 12 + bob;
  const tip = { x: ROD_TIP.x + bend * 8, y: ROD_TIP.y + bend * 26 + bob };
  const cx = hx - 30;
  const cy = ROD_TIP.y - 12 + bend * 6;
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * hx + 2 * (1 - t) * t * cx + t * t * tip.x;
    const y = (1 - t) ** 2 * hy + 2 * (1 - t) * t * cy + t * t * tip.y;
    ctx.fillStyle = t < 0.2 ? '#2a2a2a' : '#6a3a1a';
    const s = t < 0.6 ? 2 : 1;
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  // リール
  ctx.fillStyle = '#a0a8b0';
  ctx.fillRect(hx - 3, hy + 2, 4, 3);
  return { x: Math.round(tip.x), y: Math.round(tip.y) };
}

/** 釣り糸。 */
export function drawLine(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }): void {
  ctx.fillStyle = 'rgba(235,245,250,0.75)';
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const n = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(Math.round(from.x + (dx * i) / n), Math.round(from.y + (dy * i) / n), 1, 1);
  }
}

let hookSprite: HTMLCanvasElement | undefined;
/** 針とエサ。(x, y) は糸の結び目。 */
export function drawHook(ctx: CanvasRenderingContext2D, x: number, y: number, withBait = true): void {
  if (!hookSprite) {
    const g = new PixelGrid(9, 13);
    const metal = '#d8e0e8';
    g.set(4, 0, metal);
    g.set(4, 1, '#8898a8');
    for (let i = 2; i <= 9; i++) g.set(4, i, metal);
    g.set(3, 10, metal);
    g.set(2, 10, metal);
    g.set(1, 9, metal);
    g.set(1, 8, metal);
    g.set(1, 7, '#ffffff');
    hookSprite = g.toCanvas();
  }
  ctx.drawImage(hookSprite, x - 4, y);
  if (withBait) {
    ctx.fillStyle = '#e07a8a';
    ctx.fillRect(x, y + 4, 2, 5);
    ctx.fillRect(x - 1, y + 8, 2, 2);
    ctx.fillStyle = '#b85868';
    ctx.fillRect(x + 1, y + 6, 1, 2);
  }
}

// ---- カットイン用の釣り人の顔 ----

let faceSprite: HTMLCanvasElement | undefined;
export function getFace(): HTMLCanvasElement {
  if (faceSprite) return faceSprite;
  const g = new PixelGrid(48, 50);
  const skin = '#eab08a';
  const skinShade = '#cc8c68';
  // フード付きの上着
  g.fillEllipse(24, 50, 24, 10, '#2f4f88');
  g.fillEllipse(24, 49, 12, 5, '#3a3a44');
  // 顔
  g.fillEllipse(24, 28, 15, 16, skin);
  g.fillEllipse(24, 36, 13, 8, skin);
  for (let y = 18; y < 44; y++) g.set(9 + Math.floor((y - 18) / 6), y, skinShade);
  // 耳
  g.fillEllipse(8, 29, 3, 4, skin);
  g.fillEllipse(40, 29, 3, 4, skin);
  // 帽子
  g.fillEllipse(24, 16, 17, 11, '#3c4652');
  g.fillRect(6, 16, 36, 5, '#3c4652');
  g.fillRect(4, 20, 40, 3, '#2a323c');
  g.fillRect(14, 8, 12, 2, '#56626e');
  // 眉と笑った目（^ ^）
  for (const ex of [16, 32]) {
    g.fillRect(ex - 4, 23, 8, 2, '#3a2418');
    g.set(ex - 3, 29, '#2a1810');
    g.set(ex - 2, 28, '#2a1810');
    g.set(ex - 1, 27, '#2a1810');
    g.set(ex, 27, '#2a1810');
    g.set(ex + 1, 27, '#2a1810');
    g.set(ex + 2, 28, '#2a1810');
    g.set(ex + 3, 29, '#2a1810');
  }
  // 鼻
  g.set(24, 32, skinShade);
  g.set(25, 33, skinShade);
  // 大きく開けた口
  for (let y = 35; y <= 44; y++) {
    const half = Math.round(Math.sqrt(Math.max(0, 1 - ((y - 35) / 10) ** 2)) * 10);
    for (let x = 24 - half; x <= 24 + half; x++) g.set(x, y, '#7a1822');
  }
  g.fillRect(16, 35, 17, 2, '#ffffff');
  g.fillEllipse(24, 43, 5, 2.5, '#e0606a');
  // 汗
  for (const [sx, sy] of [
    [6, 18],
    [42, 22],
    [40, 36],
  ]) {
    g.set(sx, sy, '#bfe8ff');
    g.set(sx, sy + 1, '#8fd0f8');
    g.set(sx - 1, sy + 1, '#8fd0f8');
    g.set(sx, sy + 2, '#8fd0f8');
  }
  g.outline('#1a1010');
  faceSprite = g.toCanvas();
  return faceSprite;
}

