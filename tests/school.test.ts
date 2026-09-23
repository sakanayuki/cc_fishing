import { describe, expect, it } from 'vitest';
import { LAYER_IDS, LAYERS, VIEW_W } from '../src/config';
import { getSpecies } from '../src/fish';
import { findTouchingFish, School, type SwimmingFish } from '../src/logic/school';
import { createRng } from '../src/rng';
import { addCatch, breakdown, totalScore } from '../src/logic/score';

function fish(id: Parameters<typeof getSpecies>[0], x: number, y: number): SwimmingFish {
  return { uid: 0, species: getSpecies(id), x, y, baseY: y, dir: 1, speed: 0, phase: 0 };
}

describe('school', () => {
  it('各層の魚はその層の帯の中にいて、層に合った魚種だけが出る', () => {
    const school = new School(createRng(3));
    school.populate();
    for (let i = 0; i < 60 * 60; i++) school.update(1 / 60);
    for (const f of school.fishes) {
      const band = LAYERS[f.species.layer];
      expect(f.y).toBeGreaterThanOrEqual(band.top - 3);
      expect(f.y).toBeLessThanOrEqual(band.bottom + 3);
      expect(f.x).toBeGreaterThan(-f.species.width * 6);
      expect(f.x).toBeLessThan(VIEW_W + f.species.width * 6);
    }
    for (const layer of LAYER_IDS) {
      expect(school.countIn(layer)).toBeGreaterThan(0);
    }
  });

  it('針に触れている魚のうち最も近い魚を選ぶ', () => {
    const a = fish('aji', 100, 150);
    const b = fish('saba', 104, 150);
    expect(findTouchingFish([a, b], 105, 151)).toBe(b);
    expect(findTouchingFish([a, b], 200, 150)).toBeUndefined();
  });

  it('当たり判定は魚体より少し小さい', () => {
    const m = fish('maguro', 100, 300);
    expect(findTouchingFish([m], 100 + 20, 300)).toBe(m);
    expect(findTouchingFish([m], 100 + 28 + 1, 300)).toBeUndefined();
  });
});

describe('score', () => {
  it('魚ごとの得点を合計する', () => {
    const c = {};
    addCatch(c, 'aji');
    addCatch(c, 'aji');
    addCatch(c, 'ankou');
    expect(totalScore(c)).toBe(270);
    expect(breakdown(c).map((b) => [b.species.id, b.count])).toEqual([
      ['aji', 2],
      ['ankou', 1],
    ]);
  });
});
