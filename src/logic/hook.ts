import { HOOK, HOOK_MAX_Y, HOOK_MIN_Y } from '../config';

export interface HookState {
  y: number;
  /** タップで上げる残り距離（数フレームかけて滑らかに消化する）。 */
  pendingLift: number;
  /** ボタンを押し続けている時間（秒）。押していなければ -1。 */
  holdTime: number;
}

export function createHook(): HookState {
  return { y: HOOK_MIN_Y, pendingLift: 0, holdTime: -1 };
}

/** ボタンを押した瞬間。 */
export function pressHook(hook: HookState): void {
  hook.pendingLift += HOOK.tapStep;
  hook.holdTime = 0;
}

export function releaseHook(hook: HookState): void {
  hook.holdTime = -1;
}

export function isReeling(hook: HookState): boolean {
  return hook.holdTime >= HOOK.holdDelay;
}

export function updateHook(hook: HookState, dt: number): void {
  const held = hook.holdTime >= 0;
  if (held) hook.holdTime += dt;

  if (hook.pendingLift > 0) {
    const lift = Math.min(hook.pendingLift, HOOK.reelSpeed * 1.5 * dt);
    hook.pendingLift -= lift;
    hook.y -= lift;
  }

  if (isReeling(hook)) {
    hook.y -= HOOK.reelSpeed * dt;
  } else if (!held && hook.pendingLift <= 0) {
    hook.y += HOOK.sinkSpeed * dt;
  }

  if (hook.y <= HOOK_MIN_Y) {
    hook.y = HOOK_MIN_Y;
    hook.pendingLift = 0;
  }
  if (hook.y > HOOK_MAX_Y) hook.y = HOOK_MAX_Y;
}
