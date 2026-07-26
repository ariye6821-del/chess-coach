const STORAGE_KEY = 'chess-coach-puzzle-bank-v1';
const MAX_PUZZLES = 300;

function loadPuzzles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePuzzles(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_PUZZLES)));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) - puzzles just won't persist
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Adds a single puzzle (a position right before a mistake, with the correct move
 * as the solution), skipping duplicates of the same position + wrong move.
 */
export function addPuzzle({
  fen,
  solutionSan,
  badMoveSan,
  classification,
  cpLoss,
  evalBeforeWhite,
  evalAfterWhite,
  source,
  difficultyElo,
}) {
  if (!fen || !solutionSan || !badMoveSan) return;
  const existing = loadPuzzles();
  const key = `${fen}|${badMoveSan}`;
  if (existing.some((p) => `${p.fen}|${p.badMoveSan}` === key)) return;

  existing.push({
    id: makeId(),
    fen,
    solutionSan,
    badMoveSan,
    classification,
    cpLoss,
    evalBeforeWhite,
    evalAfterWhite,
    source,
    difficultyElo: difficultyElo ?? null,
    createdAt: new Date().toISOString(),
    solved: false,
    attempts: 0,
  });
  savePuzzles(existing);
}

/**
 * Scans analyzed game records for the student's mistakes/blunders and adds each
 * as a puzzle. Used after any review (free-play, single Chess.com game, or the
 * bulk multi-game weakness scan) so puzzles accumulate automatically.
 */
export function addPuzzlesFromRecords(records, studentColor, source, difficultyElo = null) {
  for (const rec of records) {
    if (rec.mover !== studentColor) continue;
    if (rec.classification.key !== 'mistake' && rec.classification.key !== 'blunder') continue;
    if (!rec.bestMoveSan) continue;
    addPuzzle({
      fen: rec.fenBefore,
      solutionSan: rec.bestMoveSan,
      badMoveSan: rec.san,
      classification: rec.classification.key,
      cpLoss: rec.cpLoss,
      evalBeforeWhite: rec.evalBeforeWhite,
      evalAfterWhite: rec.evalAfterWhite,
      source,
      difficultyElo,
    });
  }
}

export function getAllPuzzles() {
  return loadPuzzles();
}

export function getUnsolvedPuzzles() {
  return loadPuzzles()
    .filter((p) => !p.solved)
    .sort((a, b) => b.cpLoss - a.cpLoss);
}

export function markPuzzleSolved(id) {
  const list = loadPuzzles();
  const puzzle = list.find((p) => p.id === id);
  if (puzzle) puzzle.solved = true;
  savePuzzles(list);
}

export function markPuzzleAttempt(id) {
  const list = loadPuzzles();
  const puzzle = list.find((p) => p.id === id);
  if (puzzle) puzzle.attempts = (puzzle.attempts || 0) + 1;
  savePuzzles(list);
}

export function clearSolvedPuzzles() {
  savePuzzles(loadPuzzles().filter((p) => !p.solved));
}
