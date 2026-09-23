/** 論理解像度（ドット単位）。 */
export const VIEW_W = 360;
export const VIEW_H = 640;

/** 海面と海底。 */
export const SURFACE_Y = 112;
export const SEABED_Y = 500;
/** 操作パネル（画面下部）の上端。 */
export const PANEL_Y = 548;

/** 釣り糸が垂れる x 座標（竿先の真下）。 */
export const LINE_X = 176;
/** 竿先の位置。 */
export const ROD_TIP = { x: LINE_X, y: 46 };

/** 針の可動範囲。最深部は岩から少し浮いた位置。 */
export const HOOK_MIN_Y = SURFACE_Y + 10;
export const HOOK_MAX_Y = 468;
const HOOK_RANGE = HOOK_MAX_Y - HOOK_MIN_Y;

export const HOOK = {
  /** 海面→最深部まで約10秒。 */
  sinkSpeed: HOOK_RANGE / 10,
  /** 長押しで最深部→海面まで約3秒。 */
  reelSpeed: HOOK_RANGE / 3,
  /** タップ1回で全深度の約4%。 */
  tapStep: HOOK_RANGE * 0.04,
  /** この時間以上押し続けると「長押し」として巻き続ける。 */
  holdDelay: 0.15,
} as const;

/** 層の縦方向の帯（魚が泳ぐ範囲）。 */
export const LAYERS = {
  shallow: { top: SURFACE_Y + 14, bottom: 214, target: 8 },
  middle: { top: 226, bottom: 350, target: 4 },
  deep: { top: 362, bottom: 478, target: 3 },
} as const;
export type LayerId = keyof typeof LAYERS;
export const LAYER_IDS: LayerId[] = ['shallow', 'middle', 'deep'];

/** 制限時間（秒）。 */
export const TIME_LIMIT = 90;

/** 対決（テンションゲージ）の調整値。テンションは 0(最小)〜1(最大)。 */
export const FIGHT = {
  start: 0.5,
  /** タップ1回で上がるテンション。 */
  tapTension: 0.075,
  /** タップ1回で魚が上がる距離（px）。 */
  reelStep: 16,
  /** 放置時のテンション下降（/秒）。difficulty 0→1 で base→base+extra。 */
  decayBase: 0.14,
  decayExtra: 0.08,
  /** 放置時に魚が沈む速さ（px/秒）。 */
  pullBase: 4,
  pullExtra: 10,
  /** 暴れの平均間隔（秒）。 */
  thrashIntervalBase: 1.8,
  thrashIntervalMinus: 1.1,
  /** 暴れ1回での目盛りの振れ幅（最大値の目安）。 */
  thrashAmpBase: 0.08,
  thrashAmpExtra: 0.2,
  /** 振れを戻すバネの強さと減衰。 */
  swingStiffness: 40,
  swingDamping: 6,
  /** 食いついた直後は暴れない猶予（秒）。 */
  grace: 0.8,
  /** 赤ゾーン（危険域）の幅。 */
  dangerZone: 0.14,
} as const;

/** 演出時間（秒）。 */
export const CUTIN_DURATION = 2.5;
export const FAIL_MESSAGE_DURATION = 1.1;
export const TIME_UP_DURATION = 1.4;
