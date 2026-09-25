import { HOOK_MIN_Y, VIEW_H } from '../config';
import type { Game, Scene } from '../game';
import { drawHook, drawLine } from '../gfx/scenery';
import { drawText } from '../gfx/text';
import { School } from '../logic/school';
import { createRng } from '../rng';
import { Bubbles, drawOcean } from './ocean';
import { lineX, view } from '../viewport';

export class TitleScene implements Scene {
  private school = new School(createRng(Date.now() >>> 0));
  private bubbles = new Bubbles();
  private time = 0;

  constructor(private game: Game) {
    this.school.populate();
  }

  pointerDown(): void {
    this.game.sfx.start();
    this.game.startPlay();
  }

  pointerUp(): void {}

  update(dt: number): void {
    this.time += dt;
    this.school.update(dt);
    this.bubbles.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    const tip = drawOcean(ctx, this.time, this.school.fishes, this.bubbles);
    const hy = Math.round(HOOK_MIN_Y + 120 + Math.sin(this.time * 0.8) * 60);
    drawLine(ctx, tip, { x: lineX(), y: hy });
    drawHook(ctx, lineX(), hy);

    ctx.fillStyle = 'rgba(6,16,36,0.35)';
    ctx.fillRect(0, 0, view.w, VIEW_H);

    const bob = Math.sin(this.time * 2) * 3;
    drawText(ctx, 'うみづり', view.w / 2, 200 + bob, { size: 64, color: '#ffffff', outline: '#0c2a50', outlineWidth: 12 });
    drawText(ctx, 'うみづり', view.w / 2, 196 + bob, { size: 64, color: '#fff4b0', outline: '#1a5a98', outlineWidth: 5 });
    drawText(ctx, '〜 深海までねらえ！ 〜', view.w / 2, 250, { size: 16, color: '#cfeaff', outline: '#0c2a50', outlineWidth: 4 });

    if (Math.floor(this.time * 2) % 2 === 0) {
      drawText(ctx, 'TAP TO START', view.w / 2, 400, { size: 24, color: '#ffffff', outline: '#0c2a50', outlineWidth: 6 });
    }
    drawText(ctx, `ハイスコア  ${this.game.highScore} pt`, view.w / 2, 450, { size: 16, color: '#ffe680', outline: '#0c2a50', outlineWidth: 4 });

    drawText(ctx, 'タップ：少し巻く　長押し：巻き続ける', view.w / 2, 578, { size: 12, color: '#cfe0f4' });
    drawText(ctx, '魚に針が重なった瞬間にタップで食いつく', view.w / 2, 598, { size: 12, color: '#cfe0f4' });
    drawText(ctx, 'テンションを赤にしないよう連打で釣り上げ！', view.w / 2, 618, { size: 12, color: '#cfe0f4' });
  }
}
