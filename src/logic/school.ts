import { LAYER_IDS, LAYERS, VIEW_W, type LayerId } from '../config';
import { speciesInLayer, type FishSpecies } from '../fish';
import { pickWeighted, range, type Rng } from '../rng';

export interface SwimmingFish {
  uid: number;
  species: FishSpecies;
  /** 体の中心座標。 */
  x: number;
  y: number;
  baseY: number;
  /** 1: 右向き、-1: 左向き。 */
  dir: 1 | -1;
  speed: number;
  phase: number;
}

/** 当たり判定は魚体の矩形をこの割合に縮めたもの。 */
export const HITBOX_SCALE = 0.8;
/** 針自体の大きさ（半径 px）。 */
export const HOOK_RADIUS = 3;

export function hitTest(fish: SwimmingFish, hx: number, hy: number): boolean {
  const hw = (fish.species.width * HITBOX_SCALE) / 2 + HOOK_RADIUS;
  const hh = (fish.species.height * HITBOX_SCALE) / 2 + HOOK_RADIUS;
  return Math.abs(fish.x - hx) <= hw && Math.abs(fish.y - hy) <= hh;
}

/** 針に触れている魚のうち最も近いもの。 */
export function findTouchingFish(
  fishes: readonly SwimmingFish[],
  hx: number,
  hy: number,
): SwimmingFish | undefined {
  let best: SwimmingFish | undefined;
  let bestD = Infinity;
  for (const f of fishes) {
    if (!hitTest(f, hx, hy)) continue;
    const d = (f.x - hx) ** 2 + (f.y - hy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

const SPAWN_DELAY: [number, number] = [0.8, 2.6];

/** 各層の魚の出現・移動・退場を管理する。 */
export class School {
  fishes: SwimmingFish[] = [];
  private nextUid = 1;
  private spawnTimers: Record<LayerId, number> = { shallow: 0, middle: 0, deep: 0 };

  constructor(private rng: Rng) {}

  /** 開始時に画面内へ魚をばらまく。 */
  populate(): void {
    for (const layer of LAYER_IDS) {
      while (this.countIn(layer) < LAYERS[layer].target) {
        this.spawnGroup(layer, true);
      }
      this.spawnTimers[layer] = range(this.rng, ...SPAWN_DELAY);
    }
  }

  countIn(layer: LayerId): number {
    return this.fishes.filter((f) => f.species.layer === layer).length;
  }

  remove(fish: SwimmingFish): void {
    this.fishes = this.fishes.filter((f) => f !== fish);
  }

  update(dt: number, exclude?: SwimmingFish): void {
    for (const f of this.fishes) {
      if (f === exclude) continue;
      f.phase += dt;
      f.x += f.dir * f.speed * dt;
      f.y = f.baseY + Math.sin(f.phase * 1.7) * 2.5;
    }
    this.fishes = this.fishes.filter((f) => {
      if (f === exclude) return true;
      const half = f.species.width / 2;
      return f.dir > 0 ? f.x - half < VIEW_W + 4 : f.x + half > -4;
    });

    for (const layer of LAYER_IDS) {
      if (this.countIn(layer) >= LAYERS[layer].target) continue;
      this.spawnTimers[layer] -= dt;
      if (this.spawnTimers[layer] <= 0) {
        this.spawnGroup(layer, false);
        this.spawnTimers[layer] = range(this.rng, ...SPAWN_DELAY);
      }
    }
  }

  private spawnGroup(layer: LayerId, onScreen: boolean): void {
    const rng = this.rng;
    const species = pickWeighted(rng, speciesInLayer(layer));
    const band = LAYERS[layer];
    const room = band.target - this.countIn(layer);
    const [minN, maxN] = species.school ?? [1, 1];
    const n = Math.max(1, Math.min(room + 1, Math.floor(range(rng, minN, maxN + 1))));

    const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const speed = species.speed * range(rng, 0.85, 1.15);
    const top = band.top + species.height / 2;
    const bottom = band.bottom - species.height / 2;
    // アンコウは海底付近に張り付く。
    const leaderY = species.id === 'ankou' ? range(rng, bottom - 16, bottom) : range(rng, top, bottom);
    const w = species.width;
    const leaderX = onScreen ? range(rng, w, VIEW_W - w) : dir > 0 ? -w / 2 : VIEW_W + w / 2;

    for (let i = 0; i < n; i++) {
      const y = Math.min(bottom, Math.max(top, leaderY + (i === 0 ? 0 : range(rng, -12, 12))));
      this.fishes.push({
        uid: this.nextUid++,
        species,
        x: leaderX - dir * i * (w + range(rng, 2, 10)),
        y,
        baseY: y,
        dir,
        speed,
        phase: rng() * 10,
      });
    }
  }
}
