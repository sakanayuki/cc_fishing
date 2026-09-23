import { describe, expect, it } from 'vitest';
import { FIGHT, HOOK_MAX_Y } from '../src/config';
import { getSpecies, SPECIES } from '../src/fish';
import { createFight, fightTap, updateFight, type FightState } from '../src/logic/fight';
import { createRng } from '../src/rng';

const DT = 1 / 60;

/** テンションを中央付近に保つよう連打するボット。 */
function playBot(state: FightState, seed: number, maxSeconds = 60): number {
  const rng = createRng(seed);
  let cooldown = 0;
  let t = 0;
  while (state.result === 'ongoing' && t < maxSeconds) {
    cooldown -= DT;
    if (cooldown <= 0 && state.tension < 0.4) {
      fightTap(state);
      cooldown = 0.12; // 人間の連打の上限（約8回/秒）
    }
    updateFight(state, DT, rng);
    t += DT;
  }
  return t;
}

describe('fight', () => {
  it('食いついた時点でテンションは中央', () => {
    const s = createFight(getSpecies('aji'), 200, createRng(1));
    expect(s.tension).toBe(FIGHT.start);
  });

  it('連打しすぎると糸が切れる', () => {
    const s = createFight(getSpecies('ankou'), HOOK_MAX_Y, createRng(1));
    for (let i = 0; i < 10; i++) fightTap(s);
    expect(s.result).toBe('snapped');
  });

  it('放置すると逃げられる', () => {
    const s = createFight(getSpecies('aji'), 200, createRng(1));
    const rng = createRng(2);
    for (let t = 0; t < 10 && s.result === 'ongoing'; t += DT) updateFight(s, DT, rng);
    expect(s.result).toBe('escaped');
  });

  it('適度な連打なら最も難しい魚も最深部から釣り上げられる', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createFight(getSpecies('ankou'), HOOK_MAX_Y, createRng(seed));
      const t = playBot(s, seed + 100);
      expect(s.result).toBe('caught');
      expect(t).toBeLessThan(30);
    }
  });

  it('深い層の魚ほど暴れが強く引きも強い', () => {
    const rng = createRng(1);
    const fights = SPECIES.map((sp) => createFight(sp, 300, rng));
    for (let i = 1; i < fights.length; i++) {
      expect(fights[i].difficulty).toBeGreaterThanOrEqual(fights[i - 1].difficulty);
    }
  });
});
