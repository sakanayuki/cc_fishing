const HIGH_SCORE_KEY = 'umizuri.highScore';
const MUTED_KEY = 'umizuri.muted';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 保存できない環境（プライベートモード等）では諦める
  }
}

export function loadHighScore(): number {
  const n = Number(read(HIGH_SCORE_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function saveHighScore(score: number): void {
  write(HIGH_SCORE_KEY, String(score));
}

export function loadMuted(): boolean {
  return read(MUTED_KEY) === '1';
}

export function saveMuted(muted: boolean): void {
  write(MUTED_KEY, muted ? '1' : '0');
}
