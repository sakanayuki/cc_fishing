import { Sfx } from './audio';
import { VIEW_W } from './config';
import { drawText } from './gfx/text';
import type { Catches } from './logic/score';
import { loadHighScore, loadMuted, saveHighScore, saveMuted } from './storage';

export interface Scene {
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  pointerDown(x: number, y: number): void;
  pointerUp(): void;
}

/** 画面右上のミュートボタン。 */
export const MUTE_BUTTON = { x: VIEW_W - 30, y: 6, w: 24, h: 24 } as const;

export interface SceneFactory {
  title(game: Game): Scene;
  play(game: Game): Scene;
  result(game: Game, catches: Catches): Scene;
}

export class Game {
  scene: Scene;
  highScore = loadHighScore();
  readonly sfx = new Sfx(loadMuted());

  constructor(private factory: SceneFactory) {
    this.scene = factory.title(this);
  }

  toTitle(): void {
    this.scene = this.factory.title(this);
  }

  startPlay(): void {
    this.scene = this.factory.play(this);
  }

  showResult(catches: Catches): void {
    this.scene = this.factory.result(this, catches);
  }

  /** ハイスコアを更新したら true。 */
  submitScore(score: number): boolean {
    if (score <= this.highScore) return false;
    this.highScore = score;
    saveHighScore(score);
    return true;
  }

  pointerDown(x: number, y: number): void {
    this.sfx.unlock();
    const m = MUTE_BUTTON;
    if (x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) {
      this.sfx.muted = !this.sfx.muted;
      saveMuted(this.sfx.muted);
      return;
    }
    this.scene.pointerDown(x, y);
  }

  pointerUp(): void {
    this.scene.pointerUp();
  }

  update(dt: number): void {
    this.scene.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.scene.render(ctx);
    this.renderMute(ctx);
  }

  private renderMute(ctx: CanvasRenderingContext2D): void {
    const m = MUTE_BUTTON;
    ctx.fillStyle = 'rgba(10,20,40,0.55)';
    ctx.fillRect(m.x, m.y, m.w, m.h);
    // スピーカー
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(m.x + 5, m.y + 9, 4, 6);
    ctx.beginPath();
    ctx.moveTo(m.x + 9, m.y + 9);
    ctx.lineTo(m.x + 14, m.y + 5);
    ctx.lineTo(m.x + 14, m.y + 19);
    ctx.lineTo(m.x + 9, m.y + 15);
    ctx.fill();
    if (this.sfx.muted) {
      drawText(ctx, '×', m.x + 19, m.y + 12, { size: 12, color: '#ff7070' });
    } else {
      ctx.fillRect(m.x + 16, m.y + 10, 1, 4);
      ctx.fillRect(m.x + 18, m.y + 8, 1, 8);
    }
  }
}
