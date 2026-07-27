const BEST_SCORE_KEY = 'chess-coach-puzzle-rush-best';

export function getBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  try {
    const current = getBestScore();
    if (score > current) localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // localStorage unavailable - best score just won't persist
  }
}

/** Fisher-Yates shuffle, returns a new array. */
export function shuffled(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
