import { FISH_ART, SPECIES, type FishId, type LargePose } from '../fish';

/**
 * 魚の画像は tools/extract_fish.py が art/fish/*.jpg から生成したもの。
 * <id>.png は泳いでいる時の絵（右向き）、<id>-large.png は釣り上げカットイン用の大きい絵。
 */
const urls = import.meta.glob<string>('../assets/fish/*.png', { eager: true, query: '?url', import: 'default' });

export interface FishSprite {
  /** 右向き */
  right: HTMLCanvasElement;
  /** 左向き */
  left: HTMLCanvasElement;
  /** カットイン用の大きい絵 */
  large: HTMLImageElement;
  largePose: LargePose;
}

const sprites = new Map<FishId, FishSprite>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${url}`));
    img.src = url;
  });
}

function toCanvas(img: HTMLImageElement, flip: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  if (flip) {
    ctx.scale(-1, 1);
    ctx.drawImage(img, -img.width, 0);
  } else {
    ctx.drawImage(img, 0, 0);
  }
  return canvas;
}

function urlOf(name: string): string {
  const url = urls[`../assets/fish/${name}.png`];
  if (!url) throw new Error(`missing fish image: ${name}.png`);
  return url;
}

/** 起動時に全魚種の画像を読み込む。 */
export async function loadFishArt(): Promise<void> {
  await Promise.all(
    SPECIES.map(async ({ id }) => {
      const [swim, large] = await Promise.all([loadImage(urlOf(id)), loadImage(urlOf(`${id}-large`))]);
      sprites.set(id, {
        right: toCanvas(swim, false),
        left: toCanvas(swim, true),
        large,
        largePose: FISH_ART[id].large.pose,
      });
    }),
  );
}

export function fishSprite(id: FishId): FishSprite {
  const s = sprites.get(id);
  if (!s) throw new Error(`fish art not loaded: ${id}`);
  return s;
}
