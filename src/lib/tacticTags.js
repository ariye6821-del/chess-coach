import { Chess } from 'chess.js';

const KNIGHT_DELTAS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

export const TACTIC_LABELS = {
  fork: { label: 'מזלג', icon: '🔱' },
  capture: { label: 'רווח חומרי', icon: '⚔️' },
  check: { label: 'שח', icon: '♚' },
  tactic: { label: 'הזדמנות טקטית', icon: '💡' },
};

function squareAt(file, rank) {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return String.fromCharCode(97 + file) + (rank + 1);
}

function knightAttackSquares(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10) - 1;
  return KNIGHT_DELTAS.map(([df, dr]) => squareAt(file + df, rank + dr)).filter(Boolean);
}

/**
 * Lightweight heuristic tagging of a puzzle's solution move - not a full tactics
 * detector, just enough to group puzzles by common beginner-relevant motifs
 * (knight forks, captures, checks) for filtering practice by theme.
 */
export function tagTacticMotifs({ fenBefore, solutionSan }) {
  const chess = new Chess(fenBefore);
  let move;
  try {
    move = chess.move(solutionSan);
  } catch {
    return [];
  }
  if (!move) return [];

  const tags = [];
  if (chess.inCheck()) tags.push('check');
  if (move.captured) tags.push('capture');

  if (move.piece === 'n') {
    // Count the king too (a check + an attacked piece is the classic "royal fork"),
    // just not pawns - forking two pawns isn't the kind of tactic worth flagging.
    const targets = knightAttackSquares(move.to)
      .map((sq) => chess.get(sq))
      .filter((p) => p && p.color !== move.color && p.type !== 'p');
    if (targets.length >= 2) tags.push('fork');
  }

  return tags.length ? tags : ['tactic'];
}
