import { vibrate } from '../audio';
import {
  CUTIN_DURATION,
  FAIL_MESSAGE_DURATION,
  FIGHT,
  LINE_X,
  PANEL_Y,
  TIME_LIMIT,
  TIME_UP_DURATION,
  VIEW_H,
  VIEW_W,
} from '../config';
import { rarityOf, type FishSpecies } from '../fish';
import type { Game, Scene } from '../game';
import { fishSprite } from '../gfx/fishArt';
import { drawHook, drawLine, getFace } from '../gfx/scenery';
import { drawText } from '../gfx/text';
import { createFight, fightTap, isThrashing, updateFight, type FightState } from '../logic/fight';
import { createHook, pressHook, releaseHook, updateHook, type HookState } from '../logic/hook';
import { findTouchingFish, School, type SwimmingFish } from '../logic/school';
import { addCatch, totalScore, type Catches } from '../logic/score';
import { createRng } from '../rng';
import { Bubbles, drawOcean } from './ocean';

/** 糸の結び目から針先までの距離。 */
const HOOK_POINT = 9;
export const REEL_BUTTON = { x: VIEW_W / 2, y: PANEL_Y + (VIEW_H - PANEL_Y) / 2 + 2, r: 32 } as const;

type Phase =
  | { kind: 'fishing' }
  | { kind: 'fighting'; fight: FightState; fish: SwimmingFish; sway: number }
  | { kind: 'cutin'; species: FishSpecies; t: number; lines: number[] }
  | { kind: 'fail'; reason: 'snapped' | 'escaped'; t: number; x: number; y: number }
  | { kind: 'timeup'; t: number };

export class PlayScene implements Scene {
  private rng = createRng(Date.now() >>> 0);
  private school = new School(this.rng);
  private bubbles = new Bubbles();
  private hook: HookState = createHook();
  private phase: Phase = { kind: 'fishing' };
  private catches: Catches = {};
  private timeLeft = TIME_LIMIT;
  private time = 0;
  private pressed = false;
  private dangerTimer = 0;
  private lastSecond = TIME_LIMIT;

  constructor(private game: Game) {
    this.school.populate();
  }

  // ---- 入力 ----

  pointerDown(): void {
    const p = this.phase;
    if (p.kind === 'cutin') {
      if (p.t > 0.5) p.t = CUTIN_DURATION;
      return;
    }
    // 画面のどこを押しても下の丸ボタンと同じ操作になる
    this.pressed = true;

    if (p.kind === 'fishing') {
      const target = findTouchingFish(this.school.fishes, LINE_X, this.hook.y + HOOK_POINT);
      if (target) {
        this.startFight(target);
        return;
      }
      pressHook(this.hook);
      this.game.sfx.reel();
    } else if (p.kind === 'fighting') {
      fightTap(p.fight);
      this.game.sfx.reel();
    }
  }

  pointerUp(): void {
    this.pressed = false;
    releaseHook(this.hook);
  }

  private startFight(fish: SwimmingFish): void {
    this.school.remove(fish);
    const fight = createFight(fish.species, this.hook.y + HOOK_POINT, this.rng);
    this.phase = { kind: 'fighting', fight, fish, sway: 0 };
    this.bubbles.spawn(LINE_X, fight.fishY, 8);
    this.game.sfx.hook();
    vibrate(40);
  }

  // ---- 更新 ----

  update(dt: number): void {
    this.time += dt;
    const p = this.phase;

    if (p.kind !== 'cutin' && p.kind !== 'timeup' && this.timeLeft > 0) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      const sec = Math.ceil(this.timeLeft);
      if (sec !== this.lastSecond) {
        this.lastSecond = sec;
        if (sec <= 5 && sec > 0) this.game.sfx.tick();
      }
      if (this.timeLeft === 0 && p.kind === 'fishing') this.enterTimeUp();
    }

    this.bubbles.update(dt);

    switch (p.kind) {
      case 'fishing':
        updateHook(this.hook, dt);
        this.school.update(dt);
        break;
      case 'fighting':
        this.updateFighting(p, dt);
        break;
      case 'cutin':
        p.t += dt;
        if (Math.floor(p.t * 20) !== Math.floor((p.t - dt) * 20)) p.lines = randomLines();
        if (p.t >= CUTIN_DURATION) this.afterRound();
        break;
      case 'fail':
        p.t += dt;
        this.school.update(dt);
        if (p.t >= FAIL_MESSAGE_DURATION) this.afterRound();
        break;
      case 'timeup':
        p.t += dt;
        this.school.update(dt);
        if (p.t >= TIME_UP_DURATION) this.game.showResult(this.catches);
        break;
    }
  }

  private updateFighting(p: Extract<Phase, { kind: 'fighting' }>, dt: number): void {
    const fight = p.fight;
    updateFight(fight, dt, this.rng);
    this.school.update(dt);

    // 暴れている間は左右に振られる
    const target = isThrashing(fight) ? Math.sin(fight.elapsed * 14) * (6 + 10 * fight.difficulty) : 0;
    p.sway += (target - p.sway) * Math.min(1, dt * 8);

    const danger = fight.tension > 1 - FIGHT.dangerZone || fight.tension < FIGHT.dangerZone;
    this.dangerTimer -= dt;
    if (danger && this.dangerTimer <= 0) {
      this.dangerTimer = 0.3;
      this.game.sfx.danger();
      vibrate(25);
    }

    if (fight.result === 'caught') {
      addCatch(this.catches, fight.species.id);
      this.phase = { kind: 'cutin', species: fight.species, t: 0, lines: randomLines() };
      this.game.sfx.catch(rarityOf(fight.species));
      vibrate(80);
    } else if (fight.result === 'snapped' || fight.result === 'escaped') {
      this.phase = { kind: 'fail', reason: fight.result, t: 0, x: LINE_X + p.sway, y: fight.fishY };
      if (fight.result === 'snapped') {
        this.game.sfx.snap();
        vibrate(150);
      } else {
        this.game.sfx.escape();
      }
      // 逃げた魚は泳ぎ去る
      if (fight.result === 'escaped') {
        const f = p.fish;
        f.x = LINE_X + p.sway;
        f.baseY = Math.min(Math.max(fight.fishY, 130), 470);
        f.speed *= 2.2;
        this.school.fishes.push(f);
      }
    }
  }

  /** 1匹の勝負が終わった後：時間が残っていれば海面から再投入。 */
  private afterRound(): void {
    if (this.timeLeft <= 0) {
      this.enterTimeUp();
      return;
    }
    this.hook = createHook();
    this.phase = { kind: 'fishing' };
  }

  private enterTimeUp(): void {
    this.phase = { kind: 'timeup', t: 0 };
    this.game.sfx.timeUp();
  }

  // ---- 描画 ----

  render(ctx: CanvasRenderingContext2D): void {
    const p = this.phase;
    const fighting = p.kind === 'fighting' ? p : undefined;
    const bend = fighting ? 0.5 + fighting.fight.tension * 0.5 : 0;
    const tip = drawOcean(ctx, this.time, this.school.fishes, this.bubbles, bend);

    if (p.kind === 'fishing') {
      const hy = Math.round(this.hook.y);
      drawLine(ctx, tip, { x: LINE_X, y: hy });
      drawHook(ctx, LINE_X, hy);
      const touching = findTouchingFish(this.school.fishes, LINE_X, this.hook.y + HOOK_POINT);
      if (touching && Math.floor(this.time * 6) % 2 === 0) {
        drawText(ctx, '！', LINE_X + 12, hy - 4, { size: 16, color: '#ffe060', outline: '#402000', outlineWidth: 3 });
      }
    } else if (fighting) {
      this.renderFight(ctx, fighting, tip);
    } else if (p.kind === 'fail') {
      this.renderFail(ctx, p, tip);
    }

    this.renderHud(ctx);
    this.renderButton(ctx);

    if (p.kind === 'cutin') renderCutin(ctx, p);
    if (p.kind === 'timeup') {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.5, p.t)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawText(ctx, 'しゅうりょう！', VIEW_W / 2, 280, { size: 36, color: '#ffffff', outline: '#10304a', outlineWidth: 8 });
    }
  }

  private renderFight(ctx: CanvasRenderingContext2D, p: Extract<Phase, { kind: 'fighting' }>, tip: { x: number; y: number }): void {
    const fight = p.fight;
    const mx = Math.round(LINE_X + p.sway);
    const my = Math.round(fight.fishY);
    drawLine(ctx, tip, { x: mx, y: my });

    // 頭を上に向けて針にかかった魚
    const sprite = fishSprite(fight.species.id).right;
    const wiggle = Math.sin(fight.elapsed * (isThrashing(fight) ? 22 : 6)) * (isThrashing(fight) ? 0.3 : 0.08);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-Math.PI / 2 + 0.35 + wiggle);
    ctx.drawImage(sprite, -sprite.width + 2, -Math.round(sprite.height / 2));
    ctx.restore();

    // テンションゲージ（魚の右側）
    const barH = 120;
    const barW = 12;
    const fishLen = sprite.width;
    let bx = mx + 26;
    if (bx + barW + 20 > VIEW_W) bx = mx - 26 - barW - fishLen / 2;
    const centerY = my + fishLen / 2 - 10;
    const by = Math.round(Math.min(PANEL_Y - barH - 8, Math.max(40, centerY - barH / 2)));
    renderTensionBar(ctx, bx, by, barW, barH, fight, this.time);
  }

  private renderFail(ctx: CanvasRenderingContext2D, p: Extract<Phase, { kind: 'fail' }>, tip: { x: number; y: number }): void {
    if (p.reason === 'snapped') {
      // 切れた糸がひらひら落ちる
      const len = 40;
      drawLine(ctx, tip, { x: tip.x + Math.sin(p.t * 8) * 4, y: tip.y + len });
    } else {
      drawLine(ctx, tip, { x: LINE_X, y: p.y });
      drawHook(ctx, LINE_X, Math.round(p.y), false);
    }
    const text = p.reason === 'snapped' ? '糸が切れた！' : '逃げられた…';
    const color = p.reason === 'snapped' ? '#ff6b5a' : '#9fd8ff';
    const y = Math.max(160, Math.min(440, p.y)) - p.t * 12;
    drawText(ctx, text, VIEW_W / 2, y, { size: 28, color, outline: '#101828', outlineWidth: 6 });
  }

  private renderHud(ctx: CanvasRenderingContext2D): void {
    const sec = Math.ceil(this.timeLeft);
    const low = sec <= 10;
    ctx.fillStyle = 'rgba(10,20,40,0.55)';
    ctx.fillRect(6, 6, 92, 24);
    drawText(ctx, `のこり ${sec}`, 12, 19, {
      size: 16,
      align: 'left',
      color: low && Math.floor(this.time * 4) % 2 === 0 ? '#ff7a6a' : '#ffffff',
    });
    const score = totalScore(this.catches);
    ctx.fillStyle = 'rgba(10,20,40,0.55)';
    ctx.fillRect(VIEW_W - 150, 6, 116, 24);
    drawText(ctx, `${score} pt`, VIEW_W - 40, 19, { size: 16, align: 'right', color: '#ffe680' });
  }

  private renderButton(ctx: CanvasRenderingContext2D): void {
    const p = this.phase;
    const hint =
      p.kind === 'fighting'
        ? '連打で巻き上げ！'
        : p.kind === 'fishing'
          ? '魚に針が重なったらタップ！'
          : '';
    if (hint) drawText(ctx, hint, VIEW_W / 2, PANEL_Y + 12, { size: 12, color: '#9fb4d8' });
    renderReelButton(ctx, this.pressed && (p.kind === 'fishing' || p.kind === 'fighting'), p.kind === 'fighting' ? this.time : 0);
  }
}

// ---- 描画部品 ----

export function renderReelButton(ctx: CanvasRenderingContext2D, pressed: boolean, pulse: number): void {
  const { x, y, r } = REEL_BUTTON;
  const off = pressed ? 2 : 0;
  ctx.fillStyle = '#081020';
  circle(ctx, x, y + 4, r + 3);
  ctx.fillStyle = '#b8c4d8';
  circle(ctx, x, y + off, r + 3);
  const grow = pulse ? Math.sin(pulse * 10) * 1 : 0;
  ctx.fillStyle = pressed ? '#1f5cb8' : '#2f7ae0';
  circle(ctx, x, y + off, r + grow);
  ctx.fillStyle = pressed ? '#2a6cd0' : '#5aa0f0';
  circle(ctx, x - 4, y - 6 + off, r - 10);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  circle(ctx, x - 12, y - 14 + off, 5);
  // 釣り針アイコン
  ctx.fillStyle = '#ffffff';
  const hx = x + 2;
  const hy = y - 16 + off;
  ctx.fillRect(hx - 3, hy - 3, 7, 2);
  ctx.fillRect(hx - 3, hy - 3, 2, 6);
  ctx.fillRect(hx + 2, hy - 3, 2, 6);
  ctx.fillRect(hx, hy + 2, 3, 22);
  ctx.fillRect(hx - 10, hy + 22, 12, 3);
  ctx.fillRect(hx - 12, hy + 14, 3, 10);
  ctx.fillRect(hx - 14, hy + 13, 3, 3);
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function renderTensionBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fight: FightState,
  time: number,
): void {
  const dz = FIGHT.dangerZone;
  ctx.fillStyle = '#101828';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#b8c4d8';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  const zones: [number, number, string][] = [
    [0, dz, '#e03030'],
    [dz, dz * 2, '#f0d030'],
    [dz * 2, 1 - dz * 2, '#40c850'],
    [1 - dz * 2, 1 - dz, '#f0d030'],
    [1 - dz, 1, '#e03030'],
  ];
  for (const [a, b, c] of zones) {
    ctx.fillStyle = c;
    ctx.fillRect(x, Math.round(y + a * h), w, Math.ceil((b - a) * h));
  }
  // 目盛り
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 1; i < 10; i++) ctx.fillRect(x, Math.round(y + (i * h) / 10), 3, 1);

  const shake = isThrashing(fight) ? Math.round(Math.sin(time * 60) * 1.5) : 0;
  const my = Math.round(y + (1 - fight.tension) * h);
  ctx.fillStyle = '#101828';
  ctx.fillRect(x - 6 + shake, my - 4, w + 12, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 5 + shake, my - 3, w + 10, 6);
  ctx.fillStyle = '#c8d0dc';
  ctx.fillRect(x - 5 + shake, my + 1, w + 10, 2);

  drawText(ctx, 'テンション', x + w / 2, y - 12, { size: 10, color: '#ffffff', outline: '#101828', outlineWidth: 3 });

  const blink = Math.floor(time * 6) % 2 === 0;
  if (fight.tension > 1 - dz && blink) {
    drawText(ctx, '切れる！', x + w / 2, y + h + 14, { size: 12, color: '#ff6b5a', outline: '#101828', outlineWidth: 3 });
  } else if (fight.tension < dz && blink) {
    drawText(ctx, '逃げる！', x + w / 2, y + h + 14, { size: 12, color: '#9fd8ff', outline: '#101828', outlineWidth: 3 });
  }
}

function randomLines(): number[] {
  return Array.from({ length: 36 }, () => Math.random());
}

function renderCutin(ctx: CanvasRenderingContext2D, p: Extract<Phase, { kind: 'cutin' }>): void {
  const { species, t } = p;
  const rarity = rarityOf(species);
  const cx = VIEW_W / 2;
  const cy = 320;

  // 背景＋集中線
  ctx.fillStyle = rarity === 3 ? '#1a1040' : '#0c3060';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 300);
  grad.addColorStop(0, rarity === 3 ? '#e0a040' : '#4ab8e8');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < p.lines.length; i++) {
    const a = (i / p.lines.length) * Math.PI * 2 + p.lines[i] * 0.15;
    const r0 = 90 + p.lines[i] * 70;
    const r1 = 520;
    const wdt = 0.012 + p.lines[i] * 0.01;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - wdt) * r1, cy + Math.sin(a - wdt) * r1);
    ctx.lineTo(cx + Math.cos(a + wdt) * r1, cy + Math.sin(a + wdt) * r1);
    ctx.fill();
  }

  // 水しぶき
  const splashT = Math.min(1, t / 0.8);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (i / 26 - 0.5) * 2.6;
    const d = 30 + splashT * (80 + (i % 5) * 18);
    const x = cx + Math.cos(a) * d;
    const y = cy + 110 + Math.sin(a) * d + splashT * splashT * 60;
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#8fdcff';
    const s = 3 + (i % 3);
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }

  // 大きい絵の魚が跳ね上がる
  const art = fishSprite(species.id);
  const rise = t < 0.35 ? easeOutBack(t / 0.35) : 1;
  const fy = VIEW_H + 160 - (VIEW_H + 160 - cy) * rise + Math.sin(t * 4) * 4;
  // 横長の絵は頭が上がるように傾ける
  const tilt = art.largePose === 'left' ? 0.3 : art.largePose === 'right' ? -0.3 : -0.08;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, fy);
  ctx.rotate(tilt + Math.sin(t * 3) * 0.05);
  ctx.drawImage(art.large, -Math.round(art.large.width / 2), -Math.round(art.large.height / 2));
  ctx.restore();

  // 右下の斜めパネルに釣り人の笑顔
  const panelIn = Math.min(1, Math.max(0, (t - 0.25) / 0.25));
  const slide = (1 - panelIn) * 220;
  ctx.save();
  ctx.translate(slide, 0);
  ctx.beginPath();
  ctx.moveTo(130, VIEW_H);
  ctx.lineTo(VIEW_W, 400);
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.closePath();
  ctx.fillStyle = '#8fd4f4';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.clip();
  const face = getFace();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(face, 204, 476, face.width * 3, face.height * 3);
  ctx.restore();

  // フラッシュ
  if (t < 0.25) {
    ctx.fillStyle = `rgba(255,255,255,${(1 - t / 0.25) * (rarity === 3 ? 1 : 0.7)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // 文字
  const textIn = Math.min(1, Math.max(0, (t - 0.3) / 0.2));
  if (textIn > 0) {
    const size = 34 + (1 - textIn) * 30;
    drawText(ctx, `${species.name} GET!!`, cx, 78, { size, color: '#fff27a', outline: '#802010', outlineWidth: 8 });
    drawText(ctx, `+${species.points}pt`, cx, 124, { size: 26, color: '#ffffff', outline: '#10304a', outlineWidth: 6 });
    if (rarity > 1) {
      const stars = '★'.repeat(rarity);
      drawText(ctx, stars, cx, 156, { size: 20, color: rarity === 3 ? '#ffd040' : '#c0e8ff', outline: '#302000', outlineWidth: 4 });
    }
  }
  if (t > 0.6) {
    drawText(ctx, 'タップでスキップ', 70, VIEW_H - 16, { size: 11, color: 'rgba(255,255,255,0.8)' });
  }

  // 深層魚はキラキラ
  if (rarity === 3) {
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + t * 2;
      const d = 90 + ((i * 37) % 60);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d * 0.8;
      if ((Math.floor(t * 10) + i) % 3 === 0) continue;
      ctx.fillStyle = '#fff6b0';
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 4, 2, 9);
      ctx.fillRect(Math.round(x) - 4, Math.round(y) - 1, 9, 2);
    }
  }
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

