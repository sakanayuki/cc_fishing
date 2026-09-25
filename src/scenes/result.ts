import { VIEW_H, VIEW_W } from '../config';
import type { Game, Scene } from '../game';
import { fishSprite } from '../gfx/fishArt';
import { getBackground } from '../gfx/scenery';
import { drawText } from '../gfx/text';
import { breakdown, totalScore, type Catches } from '../logic/score';
import { centerOffset, view } from '../viewport';

/** 連打の勢いで押してしまわないよう、表示直後はタップを受け付けない。 */
const INPUT_DELAY = 1.0;

export class ResultScene implements Scene {
  private time = 0;
  private readonly score: number;
  private readonly isRecord: boolean;
  private readonly rows;
  private pressed = false;

  constructor(
    private game: Game,
    catches: Catches,
  ) {
    this.score = totalScore(catches);
    this.rows = breakdown(catches);
    this.isRecord = game.submitScore(this.score);
  }

  /** どこを押してもタイトルへ戻る（離した瞬間に遷移）。 */
  pointerDown(): void {
    if (this.time >= INPUT_DELAY) this.pressed = true;
  }

  pointerUp(): void {
    if (!this.pressed) return;
    this.pressed = false;
    this.game.sfx.select();
    this.game.toTitle();
  }

  update(dt: number): void {
    this.time += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(getBackground(), 0, 0);
    ctx.fillStyle = 'rgba(6,14,30,0.72)';
    ctx.fillRect(0, 0, view.w, VIEW_H);

    drawText(ctx, 'リザルト', view.w / 2, 44, { size: 28, color: '#ffffff', outline: '#0c2a50', outlineWidth: 6 });

    // スコアはカウントアップ表示
    const shown = Math.round(this.score * Math.min(1, this.time / 1.0));
    drawText(ctx, `${shown} pt`, view.w / 2, 100, { size: 44, color: '#ffe680', outline: '#402000', outlineWidth: 8 });
    if (this.isRecord && this.time > 1 && Math.floor(this.time * 3) % 2 === 0) {
      drawText(ctx, 'NEW RECORD!', view.w / 2, 140, { size: 20, color: '#ff8a70', outline: '#301010', outlineWidth: 5 });
    } else if (!this.isRecord) {
      drawText(ctx, `ハイスコア ${this.game.highScore} pt`, view.w / 2, 140, { size: 14, color: '#b8c8e0' });
    }

    // 内訳
    const top = 168;
    const rowH = 30;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    // 一覧は幅 360 基準の配置を中央に寄せる
    const ox = centerOffset();
    ctx.fillRect(ox + 20, top - 6, VIEW_W - 40, Math.max(1, this.rows.length) * rowH + 12);
    if (this.rows.length === 0) {
      drawText(ctx, 'ボウズ…（1匹も釣れなかった）', view.w / 2, top + 14, { size: 16, color: '#b8c8e0' });
    }
    this.rows.forEach((row, i) => {
      const appear = Math.min(1, Math.max(0, (this.time - 0.2 - i * 0.08) / 0.2));
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      const y = top + i * rowH + rowH / 2;
      const sprite = fishSprite(row.species.id).right;
      const scale = Math.min(1, 44 / sprite.width, 24 / sprite.height);
      const w = Math.round(sprite.width * scale);
      const h = Math.round(sprite.height * scale);
      ctx.drawImage(sprite, ox + 56 - w / 2, Math.round(y - h / 2), w, h);
      drawText(ctx, row.species.name, ox + 90, y, { size: 16, align: 'left' });
      drawText(ctx, `×${row.count}`, ox + 214, y, { size: 16, align: 'right', color: '#cfe0f4' });
      drawText(ctx, `${row.subtotal} pt`, ox + VIEW_W - 34, y, { size: 16, align: 'right', color: '#ffe680' });
      ctx.globalAlpha = 1;
    });

    if (this.time >= INPUT_DELAY && Math.floor(this.time * 2) % 2 === 0) {
      drawText(ctx, 'タップでタイトルへ', view.w / 2, 580, { size: 20, color: '#ffffff', outline: '#0c2a50', outlineWidth: 5 });
    }
  }
}
