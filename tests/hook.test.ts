import { describe, expect, it } from 'vitest';
import { HOOK, HOOK_MAX_Y, HOOK_MIN_Y } from '../src/config';
import { createHook, pressHook, releaseHook, updateHook } from '../src/logic/hook';

function run(fn: (dt: number) => void, seconds: number, dt = 1 / 60) {
  for (let t = 0; t < seconds; t += dt) fn(dt);
}

describe('hook', () => {
  it('放置すると約10秒で最深部に届き、それ以上は沈まない', () => {
    const hook = createHook();
    run((dt) => updateHook(hook, dt), 9.5);
    expect(hook.y).toBeLessThan(HOOK_MAX_Y);
    run((dt) => updateHook(hook, dt), 5);
    expect(hook.y).toBe(HOOK_MAX_Y);
  });

  it('タップで全深度の約4%だけ上がる', () => {
    const hook = createHook();
    hook.y = 300;
    pressHook(hook);
    run((dt) => updateHook(hook, dt), 0.1);
    releaseHook(hook);
    expect(300 - hook.y).toBeCloseTo(HOOK.tapStep, 0);
  });

  it('長押しで最深部から約3秒で海面まで戻り、海面より上には行かない', () => {
    const hook = createHook();
    hook.y = HOOK_MAX_Y;
    pressHook(hook);
    run((dt) => updateHook(hook, dt), 2.6);
    expect(hook.y).toBeGreaterThan(HOOK_MIN_Y);
    run((dt) => updateHook(hook, dt), 1);
    expect(hook.y).toBe(HOOK_MIN_Y);
  });
});
