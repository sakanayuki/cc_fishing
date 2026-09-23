import { FIGHT, HOOK_MAX_Y, SURFACE_Y } from '../config';
import { difficultyOf, type FishSpecies } from '../fish';
import { range, type Rng } from '../rng';

export type FightResult = 'ongoing' | 'caught' | 'snapped' | 'escaped';

export interface FightState {
  species: FishSpecies;
  difficulty: number;
  /** 表示・判定に使うテンション。0(最小=逃げられる)〜1(最大=糸が切れる)。base + swing。 */
  tension: number;
  /** プレイヤーの操作で決まる基準値。 */
  base: number;
  /** 魚の暴れによる一時的な振れ（バネで0に戻る）。 */
  swing: number;
  swingVel: number;
  /** 魚の口（針）の y 座標。 */
  fishY: number;
  elapsed: number;
  nextThrash: number;
  result: FightResult;
}

const SWING_OMEGA = Math.sqrt(FIGHT.swingStiffness);
const SWING_ZETA = FIGHT.swingDamping / (2 * SWING_OMEGA);
/** 初速 v に対する減衰振動の最初のピーク高さは v/ω·exp(-ζ·atan(√(1-ζ²)/ζ)/√(1-ζ²))。その逆数。 */
const SWING_IMPULSE =
  SWING_OMEGA /
  Math.exp((-SWING_ZETA * Math.atan(Math.sqrt(1 - SWING_ZETA ** 2) / SWING_ZETA)) / Math.sqrt(1 - SWING_ZETA ** 2));

export function fightParams(difficulty: number) {
  return {
    decay: FIGHT.decayBase + FIGHT.decayExtra * difficulty,
    pull: FIGHT.pullBase + FIGHT.pullExtra * difficulty,
    thrashInterval: FIGHT.thrashIntervalBase - FIGHT.thrashIntervalMinus * difficulty,
    thrashAmp: FIGHT.thrashAmpBase + FIGHT.thrashAmpExtra * difficulty,
  };
}

function scheduleThrash(state: FightState, rng: Rng): void {
  const { thrashInterval } = fightParams(state.difficulty);
  state.nextThrash = state.elapsed + range(rng, thrashInterval * 0.6, thrashInterval * 1.4);
}

export function createFight(species: FishSpecies, fishY: number, rng: Rng): FightState {
  const state: FightState = {
    species,
    difficulty: difficultyOf(species),
    tension: FIGHT.start,
    base: FIGHT.start,
    swing: 0,
    swingVel: 0,
    fishY,
    elapsed: 0,
    nextThrash: 0,
    result: 'ongoing',
  };
  scheduleThrash(state, rng);
  state.nextThrash += FIGHT.grace;
  return state;
}

export function fightTap(state: FightState): void {
  if (state.result !== 'ongoing') return;
  state.base += FIGHT.tapTension;
  state.tension = state.base + state.swing;
  state.fishY -= FIGHT.reelStep;
  resolve(state);
}

export function updateFight(state: FightState, dt: number, rng: Rng): void {
  if (state.result !== 'ongoing') return;
  const p = fightParams(state.difficulty);
  state.elapsed += dt;

  if (state.elapsed >= state.nextThrash) {
    const dir = rng() < 0.5 ? 1 : -1;
    const amp = p.thrashAmp * range(rng, 0.7, 1.3);
    // 減衰振動のピークがおよそ amp になる初速を与える。
    state.swingVel += dir * amp * SWING_IMPULSE;
    scheduleThrash(state, rng);
  }

  // 減衰バネ（半陰的オイラー）。
  state.swingVel += (-FIGHT.swingStiffness * state.swing - FIGHT.swingDamping * state.swingVel) * dt;
  state.swing += state.swingVel * dt;

  state.base -= p.decay * dt;
  state.tension = state.base + state.swing;
  state.fishY = Math.min(HOOK_MAX_Y, state.fishY + p.pull * dt);
  resolve(state);
}

/** 暴れている最中か（演出用）。 */
export function isThrashing(state: FightState): boolean {
  return Math.abs(state.swingVel) > 0.4;
}

function resolve(state: FightState): void {
  if (state.tension >= 1) {
    state.tension = 1;
    state.result = 'snapped';
  } else if (state.tension <= 0) {
    state.tension = 0;
    state.result = 'escaped';
  } else if (state.fishY <= SURFACE_Y) {
    state.fishY = SURFACE_Y;
    state.result = 'caught';
  }
}
