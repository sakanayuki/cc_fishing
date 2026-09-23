/** Web Audio API で 8bit 風の効果音を合成する。 */
export class Sfx {
  private ctx?: AudioContext;
  private noise?: AudioBuffer;
  private lastReel = 0;

  constructor(public muted: boolean) {}

  /** ユーザー操作の中で呼び、AudioContext を起こす。 */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(type: OscillatorType, from: number, to: number, dur: number, vol = 0.15, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private burst(dur: number, vol: number, freq: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || !this.noise) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur);
  }

  /** リールを巻くカリカリ音（連続呼び出しは間引く）。 */
  reel(): void {
    const now = performance.now();
    if (now - this.lastReel < 60) return;
    this.lastReel = now;
    this.tone('square', 1400, 900, 0.03, 0.05);
  }

  hook(): void {
    this.tone('square', 300, 900, 0.12, 0.14);
    this.burst(0.15, 0.2, 1200, 0.02);
  }

  snap(): void {
    this.tone('sawtooth', 1800, 80, 0.25, 0.12);
    this.burst(0.2, 0.3, 3000);
  }

  escape(): void {
    this.tone('triangle', 600, 150, 0.4, 0.18);
  }

  splash(): void {
    this.burst(0.35, 0.35, 900);
  }

  catch(rarity: number): void {
    const notes = rarity >= 3 ? [523, 659, 784, 1047, 1319] : rarity === 2 ? [523, 659, 784, 1047] : [659, 784, 1047];
    notes.forEach((f, i) => this.tone('square', f, f, 0.16, 0.12, i * 0.09));
    this.splash();
  }

  danger(): void {
    this.tone('square', 880, 880, 0.05, 0.06);
  }

  tick(): void {
    this.tone('square', 1000, 1000, 0.04, 0.06);
  }

  start(): void {
    this.tone('square', 440, 880, 0.15, 0.12);
  }

  timeUp(): void {
    [784, 659, 523].forEach((f, i) => this.tone('square', f, f, 0.2, 0.12, i * 0.14));
  }

  select(): void {
    this.tone('square', 660, 990, 0.08, 0.1);
  }
}

export function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // 非対応
  }
}
