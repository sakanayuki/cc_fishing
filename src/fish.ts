import type { LayerId } from './config';

export type FishId =
  | 'aji'
  | 'saba'
  | 'kawahagi'
  | 'madai'
  | 'hirame'
  | 'katsuo'
  | 'maguro'
  | 'mehikari'
  | 'yumekasago'
  | 'gindara'
  | 'ankou';

export interface FishSpecies {
  id: FishId;
  name: string;
  layer: LayerId;
  points: number;
  /** 出現しやすさ（同じ層の中での相対値）。高得点ほど低い。 */
  weight: number;
  /** 泳ぐ速さ（px/秒）。 */
  speed: number;
  /** スプライトの大きさ（px）。 */
  width: number;
  height: number;
  /** 群れで出現する場合の匹数範囲。 */
  school?: [number, number];
}

export const SPECIES: readonly FishSpecies[] = [
  { id: 'aji', name: 'アジ', layer: 'shallow', points: 10, weight: 5, speed: 30, width: 22, height: 9, school: [3, 4] },
  { id: 'saba', name: 'サバ', layer: 'shallow', points: 15, weight: 4, speed: 36, width: 26, height: 10, school: [2, 4] },
  { id: 'kawahagi', name: 'カワハギ', layer: 'shallow', points: 20, weight: 3, speed: 22, width: 20, height: 15, school: [1, 3] },
  { id: 'madai', name: 'マダイ', layer: 'middle', points: 50, weight: 4, speed: 30, width: 34, height: 20 },
  { id: 'hirame', name: 'ヒラメ', layer: 'middle', points: 60, weight: 3.5, speed: 24, width: 34, height: 18 },
  { id: 'katsuo', name: 'カツオ', layer: 'middle', points: 70, weight: 3, speed: 48, width: 40, height: 16 },
  { id: 'maguro', name: 'マグロ', layer: 'middle', points: 100, weight: 1.5, speed: 60, width: 56, height: 22 },
  { id: 'mehikari', name: 'メヒカリ', layer: 'deep', points: 120, weight: 4, speed: 26, width: 22, height: 10 },
  { id: 'yumekasago', name: 'ユメカサゴ', layer: 'deep', points: 150, weight: 3, speed: 24, width: 28, height: 16 },
  { id: 'gindara', name: 'ギンダラ', layer: 'deep', points: 180, weight: 2.5, speed: 34, width: 38, height: 16 },
  { id: 'ankou', name: 'アンコウ', layer: 'deep', points: 250, weight: 1.2, speed: 18, width: 44, height: 28 },
];

const byId = new Map(SPECIES.map((s) => [s.id, s]));

export function getSpecies(id: FishId): FishSpecies {
  const s = byId.get(id);
  if (!s) throw new Error(`unknown fish: ${id}`);
  return s;
}

export function speciesInLayer(layer: LayerId): FishSpecies[] {
  return SPECIES.filter((s) => s.layer === layer);
}

const MIN_POINTS = Math.min(...SPECIES.map((s) => s.points));
const MAX_POINTS = Math.max(...SPECIES.map((s) => s.points));

/** 難易度 0〜1。得点に比例（深い層・高得点ほど難しい）。 */
export function difficultyOf(species: FishSpecies): number {
  return (species.points - MIN_POINTS) / (MAX_POINTS - MIN_POINTS);
}

/** レア度（カットイン表示用）。 */
export function rarityOf(species: FishSpecies): 1 | 2 | 3 {
  if (species.layer === 'deep') return 3;
  if (species.layer === 'middle') return 2;
  return 1;
}
