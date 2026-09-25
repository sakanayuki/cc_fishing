import { PANEL_Y, SURFACE_Y } from '../config';
import { fishSprite } from '../gfx/fishArt';
import { drawBoat, drawSurface, getBackground } from '../gfx/scenery';
import type { SwimmingFish } from '../logic/school';
import { view } from '../viewport';

export function drawSwimmingFish(ctx: CanvasRenderingContext2D, f: SwimmingFish): void {
  const s = fishSprite(f.species.id);
  const img = f.dir > 0 ? s.right : s.left;
  ctx.drawImage(img, Math.round(f.x - img.width / 2), Math.round(f.y - img.height / 2));
}

interface Bubble {
  x: number;
  y: number;
  speed: number;
  size: number;
}

/** 海の底から上がってくる泡。 */
export class Bubbles {
  private items: Bubble[] = [];
  private timer = 0;

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.3 + Math.random() * 0.6;
      this.items.push({
        x: Math.random() * view.w,
        y: PANEL_Y - 40 - Math.random() * 60,
        speed: 14 + Math.random() * 16,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
    for (const b of this.items) {
      b.y -= b.speed * dt;
      b.x += Math.sin(b.y * 0.1) * 0.2;
    }
    this.items = this.items.filter((b) => b.y > SURFACE_Y + 2);
  }

  /** 任意の位置から泡を出す（釣り上げ時など）。 */
  spawn(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.items.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 10,
        speed: 30 + Math.random() * 40,
        size: Math.random() < 0.5 ? 2 : 1,
      });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const b of this.items) {
      ctx.fillStyle = 'rgba(200,240,255,0.6)';
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.size, b.size);
    }
  }
}

/** 背景・魚・海面・船をまとめて描く。戻り値は竿先の位置。 */
export function drawOcean(
  ctx: CanvasRenderingContext2D,
  time: number,
  fishes: readonly SwimmingFish[],
  bubbles: Bubbles,
  bend = 0,
): { x: number; y: number } {
  ctx.drawImage(getBackground(), 0, 0);
  bubbles.render(ctx);
  for (const f of fishes) drawSwimmingFish(ctx, f);
  drawSurface(ctx, time);
  return drawBoat(ctx, time, bend);
}
