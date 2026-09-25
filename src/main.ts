import { VIEW_H } from './config';
import { Game } from './game';
import { makeCanvas } from './gfx/pixel';
import { loadFishArt } from './gfx/fishArt';
import { FONT_FAMILY } from './gfx/text';
import { PlayScene } from './scenes/play';
import { ResultScene } from './scenes/result';
import { TitleScene } from './scenes/title';
import { fitViewWidth, view } from './viewport';

const screen = document.getElementById('screen') as HTMLCanvasElement;
const screenCtx = screen.getContext('2d')!;
// 最初のシーンを作る前に、画面の縦横比から論理画面の幅を決めておく
fitViewWidth(window.innerWidth / window.innerHeight);
const [canvas, viewCtx] = makeCanvas(view.w, VIEW_H);

const game = new Game({
  title: (g) => new TitleScene(g),
  play: (g) => new PlayScene(g),
  result: (g, catches) => new ResultScene(g, catches),
});

/** 論理画面を実画面に写すときの拡大率と位置。 */
let layout = { scale: 1, ox: 0, oy: 0, dpr: 1 };

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  screen.width = Math.round(w * dpr);
  screen.height = Math.round(h * dpr);
  screen.style.width = `${w}px`;
  screen.style.height = `${h}px`;
  // 横長の画面では海を横に広げ、縦は 640 のまま拡大する
  if (fitViewWidth(w / h) !== canvas.width) {
    canvas.width = view.w;
    viewCtx.imageSmoothingEnabled = false;
  }
  const scale = Math.min(screen.width / view.w, screen.height / VIEW_H);
  layout = {
    scale,
    ox: Math.round((screen.width - view.w * scale) / 2),
    oy: Math.round((screen.height - VIEW_H * scale) / 2),
    dpr,
  };
}

function toView(e: PointerEvent): { x: number; y: number } {
  const rect = screen.getBoundingClientRect();
  const px = (e.clientX - rect.left) * layout.dpr;
  const py = (e.clientY - rect.top) * layout.dpr;
  return { x: (px - layout.ox) / layout.scale, y: (py - layout.oy) / layout.scale };
}

const activePointers = new Set<number>();
screen.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  activePointers.add(e.pointerId);
  const { x, y } = toView(e);
  game.pointerDown(x, y);
});
const onPointerEnd = (e: PointerEvent) => {
  if (!activePointers.delete(e.pointerId)) return;
  if (activePointers.size === 0) game.pointerUp();
};
screen.addEventListener('pointerup', onPointerEnd);
screen.addEventListener('pointercancel', onPointerEnd);
screen.addEventListener('pointerleave', onPointerEnd);
screen.addEventListener('contextmenu', (e) => e.preventDefault());

// PC 用：スペースキー / Enter でボタン操作
let keyDown = false;
window.addEventListener('keydown', (e) => {
  if ((e.code !== 'Space' && e.code !== 'Enter') || e.repeat) return;
  e.preventDefault();
  keyDown = true;
  game.pointerDown(view.w / 2, 560);
});
window.addEventListener('keyup', (e) => {
  if ((e.code !== 'Space' && e.code !== 'Enter') || !keyDown) return;
  keyDown = false;
  game.pointerUp();
});

function present(): void {
  const { scale, ox, oy } = layout;
  const drawnH = VIEW_H * scale;
  screenCtx.imageSmoothingEnabled = false;
  // 縦横比の余りは、画面の最上段・最下段のピクセルを引き伸ばして延長する
  if (oy > 0) {
    screenCtx.drawImage(canvas, 0, 0, view.w, 1, ox, 0, view.w * scale, oy + 1);
    screenCtx.drawImage(canvas, 0, VIEW_H - 1, view.w, 1, ox, oy + drawnH - 1, view.w * scale, screen.height - oy - drawnH + 1);
  }
  screenCtx.drawImage(canvas, ox, oy, view.w * scale, drawnH);
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.render(viewCtx);
  present();
  requestAnimationFrame(frame);
}

async function boot(): Promise<void> {
  resize();
  window.addEventListener('resize', resize);
  const fonts = Promise.race([document.fonts.load(`16px ${FONT_FAMILY}`), new Promise((r) => setTimeout(r, 2000))]).catch(
    // フォントが読めなくてもシステムフォントで続行
    () => undefined,
  );
  await Promise.all([loadFishArt(), fonts]);
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
}

void boot();

if (import.meta.env.DEV) {
  (window as unknown as { __game: Game }).__game = game;
}
