export const FONT_FAMILY = '"DotGothic16", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';

export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  outline?: string;
  outlineWidth?: number;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: TextOptions = {}): void {
  const { size = 16, color = '#ffffff', align = 'center', baseline = 'middle', outline, outlineWidth = 4 } = opts;
  ctx.font = `${size}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
