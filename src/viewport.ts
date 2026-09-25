import { LINE_X, VIEW_H, VIEW_W } from './config';

/** 横長画面の上限（16:9）。これより横長な画面では左右に帯が出る。 */
export const MAX_VIEW_W = Math.round((VIEW_H * 16) / 9);

/**
 * 論理画面の大きさ。縦は常に 640。
 * 縦長のスマホでは幅 360、横長の PC・タブレットでは画面の縦横比に合わせて海を横に広げる。
 */
export const view = { w: VIEW_W, h: VIEW_H };

/** 画面の縦横比（幅/高さ）に合わせて論理画面の幅を決める。 */
export function fitViewWidth(aspect: number): number {
  view.w = Math.min(MAX_VIEW_W, Math.max(VIEW_W, Math.round(VIEW_H * aspect)));
  return view.w;
}

/** 幅 360 を基準にした配置（船・釣り糸など）を画面中央に寄せるためのずらし量。 */
export function centerOffset(): number {
  return Math.round((view.w - VIEW_W) / 2);
}

/** 釣り糸が垂れる x 座標。 */
export function lineX(): number {
  return LINE_X + centerOffset();
}

/** 幅 360 の時と魚の密度が同じになるよう、層ごとの魚の数を幅に比例させる。 */
export function scaledCount(base: number): number {
  return Math.round((base * view.w) / VIEW_W);
}
