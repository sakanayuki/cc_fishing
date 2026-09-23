import { VIEW_H, VIEW_W } from '../config';
import type { Game, Scene } from '../game';
import { fishSprite } from '../gfx/fishArt';
import { getBackground } from '../gfx/scenery';
import { drawText } from '../gfx/text';
import { breakdown, totalScore, type Catches } from '../logic/score';

const BUTTONS = {
  retry: { x: 40, y: 532, w: 280, h: 40, label: 'もう一度' },
  title: { x: 40, y: 584, w: 280, h: 40, label: 'タイトルへ' },
} as const;

type ButtonId = keyof typeof BUTTONS;

export class ResultScene implements Scene {
  private time = 0;
  private readonly score: number;
  private readonly isRecord: boolean;
  private readonly rows;
  private pressed?: ButtonId;

  constructor(
    private game: Game,
    catches: Catches,
  ) {
    this.score = totalScore(catches);
    this.rows = breakdown(catches);
    this.isRecord = game.submitScore(this.score);
  }

  private hit(x: number, y: number): ButtonId | undefined {
    for (const id of Object.keys(BUTTONS) as ButtonId[]) {
      const b = BUTTONS[id];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return id;
    }
    return undefined;
  }

  pointerDown(x: number, y: number): void {
    if (this.time < 0.6) return; // 連打の勢いで押してしまうのを防ぐ
    this.pressed = this.hit(x, y);
  }

  pointerUp(): void {
    const id = this.pressed;
    this.pressed = undefined;
    if (!id) return;
    this.game.sfx.select();
    if (id === 'retry') this.game.startPlay();
    else this.game.toTitle();
  }

  update(dt: number): void {
    this.time += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(getBackground(), 0, 0);
    ctx.fillStyle = 'rgba(6,14,30,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawText(ctx, 'リザルト', VIEW_W / 2, 44, { size: 28, color: '#ffffff', outline: '#0c2a50', outlineWidth: 6 });

    // スコアはカウントアップ表示
    const shown = Math.round(this.score * Math.min(1, this.time / 1.0));
    drawText(ctx, `${shown} pt`, VIEW_W / 2, 100, { size: 44, color: '#ffe680', outline: '#402000', outlineWidth: 8 });
    if (this.isRecord && this.time > 1 && Math.floor(this.time * 3) % 2 === 0) {
      drawText(ctx, 'NEW RECORD!', VIEW_W / 2, 140, { size: 20, color: '#ff8a70', outline: '#301010', outlineWidth: 5 });
    } else if (!this.isRecord) {
      drawText(ctx, `ハイスコア ${this.game.highScore} pt`, VIEW_W / 2, 140, { size: 14, color: '#b8c8e0' });
    }

    // 内訳
    const top = 168;
    const rowH = 30;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(20, top - 6, VIEW_W - 40, Math.max(1, this.rows.length) * rowH + 12);
    if (this.rows.length === 0) {
      drawText(ctx, 'ボウズ…（1匹も釣れなかった）', VIEW_W / 2, top + 14, { size: 16, color: '#b8c8e0' });
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
      ctx.drawImage(sprite, 56 - w / 2, Math.round(y - h / 2), w, h);
      drawText(ctx, row.species.name, 90, y, { size: 16, align: 'left' });
      drawText(ctx, `×${row.count}`, 214, y, { size: 16, align: 'right', color: '#cfe0f4' });
      drawText(ctx, `${row.subtotal} pt`, VIEW_W - 34, y, { size: 16, align: 'right', color: '#ffe680' });
      ctx.globalAlpha = 1;
    });

    for (const id of Object.keys(BUTTONS) as ButtonId[]) {
      const b = BUTTONS[id];
      const down = this.pressed === id;
      ctx.fillStyle = '#081020';
      ctx.fillRect(b.x, b.y + 4, b.w, b.h);
      ctx.fillStyle = id === 'retry' ? (down ? '#1f5cb8' : '#2f7ae0') : down ? '#3a4a60' : '#56687e';
      ctx.fillRect(b.x, b.y + (down ? 3 : 0), b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(b.x, b.y + (down ? 3 : 0), b.w, 3);
      drawText(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + (down ? 3 : 0), { size: 18 });
    }
  }
}
