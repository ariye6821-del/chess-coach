const STORAGE_KEY = 'chess-coach-rating-history';
const K_FACTOR = 32;
const MAX_STRENGTH_REFERENCE_ELO = 2400;

export const DEFAULT_RATING = 800;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // storage unavailable/full - rating just won't persist this update
  }
}

export function getRatingHistory() {
  return loadHistory();
}

export function getCurrentRating() {
  const history = loadHistory();
  return history.length ? history[history.length - 1].rating : DEFAULT_RATING;
}

/**
 * Determines the student's result from a finished game. Mirrors the same
 * game-over conditions used for the on-screen message (checkmate, flag-fall,
 * chess.js draw detection) but resolved from the student's point of view.
 */
export function studentResultFromGame(chess, studentColor, gameOverMessage) {
  if (chess.isCheckmate()) {
    return chess.turn() === studentColor ? 'loss' : 'win';
  }
  if (gameOverMessage?.includes('הפסיד על הזמן')) {
    const loserColor = gameOverMessage.startsWith('לבן') ? 'w' : 'b';
    return loserColor === studentColor ? 'loss' : 'win';
  }
  if (chess.isDraw()) return 'draw';
  return null;
}

/**
 * Simple Elo update against the configured engine difficulty (or a fixed
 * high reference rating when playing at unrestricted max strength).
 */
export function recordGameResult({ result, opponentElo }) {
  if (!result) return getCurrentRating();
  const history = loadHistory();
  const currentRating = history.length ? history[history.length - 1].rating : DEFAULT_RATING;
  const opponentRating = opponentElo ?? MAX_STRENGTH_REFERENCE_ELO;
  const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  const expected = 1 / (1 + 10 ** ((opponentRating - currentRating) / 400));
  const newRating = Math.max(100, Math.round(currentRating + K_FACTOR * (actual - expected)));
  history.push({ ts: Date.now(), rating: newRating, result, opponentElo: opponentRating });
  saveHistory(history);
  return newRating;
}
