import { Chess } from 'chess.js';

export const MOVE_CLASSES = {
  best: { key: 'best', label: 'מהלך מיטבי', color: 'text-emerald-400', badge: 'bg-emerald-900/60 text-emerald-300' },
  good: { key: 'good', label: 'מהלך טוב', color: 'text-teal-400', badge: 'bg-teal-900/60 text-teal-300' },
  inaccuracy: { key: 'inaccuracy', label: 'לא מדויק', color: 'text-yellow-400', badge: 'bg-yellow-900/60 text-yellow-300' },
  mistake: { key: 'mistake', label: 'טעות', color: 'text-orange-400', badge: 'bg-orange-900/60 text-orange-300' },
  blunder: { key: 'blunder', label: 'טעות חמורה', color: 'text-red-400', badge: 'bg-red-900/60 text-red-300' },
};

export function classifyMove(cpLoss) {
  if (cpLoss <= 10) return MOVE_CLASSES.best;
  if (cpLoss <= 50) return MOVE_CLASSES.good;
  if (cpLoss <= 100) return MOVE_CLASSES.inaccuracy;
  if (cpLoss <= 300) return MOVE_CLASSES.mistake;
  return MOVE_CLASSES.blunder;
}

export function movePhase(moveNumber) {
  if (moveNumber <= 10) return 'opening';
  if (moveNumber <= 30) return 'middlegame';
  return 'endgame';
}

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material balance in pawns-equivalent, positive = White ahead. */
export function materialDiff(fen) {
  const board = fen.split(' ')[0];
  let diff = 0;
  for (const ch of board) {
    if (ch === '/' || /\d/.test(ch)) continue;
    const value = PIECE_VALUES[ch.toLowerCase()] || 0;
    diff += ch === ch.toUpperCase() ? value : -value;
  }
  return diff;
}

/** Square of the king currently in check, or null if nobody is in check. */
export function kingInCheckSquare(chess) {
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === turn) return cell.square;
    }
  }
  return null;
}

export function uciToMoveInput(uci) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  };
}

export function sanForUci(fen, uci) {
  if (!uci) return null;
  try {
    const temp = new Chess(fen);
    const move = temp.move(uciToMoveInput(uci));
    return move?.san ?? null;
  } catch {
    return null;
  }
}

/**
 * Builds a short human-readable continuation (SAN moves + resulting FENs) starting
 * from `fromFen`, following the engine's principal variation (list of UCI moves).
 * Used both to describe "what happens next" in coach explanations and to drive a
 * visual step-through replay on the board.
 */
export function buildContinuation(fromFen, pvUci, maxPlies = 6) {
  const chess = new Chess(fromFen);
  const sans = [];
  const fens = [];
  const limit = Math.min(maxPlies, pvUci.length);
  for (let i = 0; i < limit; i++) {
    let move;
    try {
      move = chess.move(uciToMoveInput(pvUci[i]));
    } catch {
      move = null;
    }
    if (!move) break;
    sans.push(move.san);
    fens.push(chess.fen());
  }
  return { sans, fens, startFen: fromFen };
}

/**
 * Replays a sequence of SAN moves from startFen, evaluating every position once
 * with the given (always full-strength) analysis engine, and classifies each move
 * by centipawn loss from the mover's own perspective.
 */
export async function analyzeGameFromMoves(engine, sanMoves, { startFen, depth = 11, onProgress } = {}) {
  const chess = startFen ? new Chess(startFen) : new Chess();
  const records = [];

  let current = await engine.analyze(chess.fen(), { depth });

  for (let i = 0; i < sanMoves.length; i++) {
    const fenBefore = chess.fen();
    const mover = chess.turn();
    const evalBeforeWhite = current.evalCp;
    const bestMoveSan = sanForUci(fenBefore, current.bestMoveUci);

    let moveResult;
    try {
      moveResult = chess.move(sanMoves[i]);
    } catch {
      moveResult = null;
    }
    if (!moveResult) break;

    const fenAfter = chess.fen();
    const after = await engine.analyze(fenAfter, { depth });
    const evalAfterWhite = after.evalCp;

    const sign = mover === 'w' ? 1 : -1;
    const cpLoss = Math.max(0, (evalBeforeWhite - evalAfterWhite) * sign);

    records.push({
      index: i,
      moveNumber: Math.floor(i / 2) + 1,
      mover,
      san: moveResult.san,
      fenBefore,
      fenAfter,
      evalBeforeWhite,
      evalAfterWhite,
      cpLoss,
      classification: classifyMove(cpLoss),
      bestMoveSan: bestMoveSan && bestMoveSan !== moveResult.san ? bestMoveSan : null,
      punishingLine: buildContinuation(fenAfter, after.pvUci, 6),
    });

    current = after;
    onProgress?.(i + 1, sanMoves.length);
  }

  return records;
}

export function summarizeGame(records, { color } = {}) {
  const relevant = color ? records.filter((r) => r.mover === color) : records;
  const counts = { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  const byPhase = {
    opening: { count: 0, cpLoss: 0 },
    middlegame: { count: 0, cpLoss: 0 },
    endgame: { count: 0, cpLoss: 0 },
  };
  let totalCpLoss = 0;
  for (const r of relevant) {
    counts[r.classification.key]++;
    totalCpLoss += r.cpLoss;
    if (r.classification.key === 'mistake' || r.classification.key === 'blunder') {
      const phase = movePhase(r.moveNumber);
      byPhase[phase].count++;
      byPhase[phase].cpLoss += r.cpLoss;
    }
  }
  return {
    counts,
    byPhase,
    avgCpLoss: relevant.length ? totalCpLoss / relevant.length : 0,
    totalMoves: relevant.length,
  };
}
