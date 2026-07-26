export const NATIVE_ELO_FLOOR = 1320;

export const ELO_PRESETS = [
  { elo: 400, label: '400 (מתחיל מוחלט)' },
  { elo: 600, label: '600' },
  { elo: 800, label: '800 (מתחיל)' },
  { elo: 1000, label: '1000' },
  { elo: 1200, label: '1200' },
  { elo: 1400, label: '1400' },
  { elo: 1600, label: '1600' },
  { elo: 2000, label: '2000' },
  { elo: 2400, label: '2400 (מאסטר)' },
  { elo: null, label: 'מקסימלי (ללא הגבלה)' },
];

export function isWeakTier(elo) {
  return elo != null && elo < NATIVE_ELO_FLOOR;
}

/**
 * Finds the ELO_PRESETS tier numerically closest to an arbitrary rating (e.g. a
 * Chess.com opponent rating), for tagging puzzles by difficulty. Returns null for
 * "max strength" only when rating itself is null/undefined.
 */
export function nearestEloTier(rating) {
  if (rating == null) return null;
  const tiers = ELO_PRESETS.map((p) => p.elo).filter((e) => e != null);
  return tiers.reduce((closest, val) => (Math.abs(val - rating) < Math.abs(closest - rating) ? val : closest));
}

/**
 * Stockfish's own top-N candidate moves are never true blunders (a real blunder
 * - hanging a piece, missing a simple tactic - ranks far outside the top 5-10
 * moves by evaluation, so weighting only among top candidates can't reproduce it).
 * To simulate genuinely weak/beginner play below the engine's native 1320 floor,
 * we occasionally play a uniformly random legal move instead of an engine
 * suggestion at all - this probability is what actually separates 400 from 1200.
 */
export function randomMoveProbability(elo) {
  if (elo == null) return 0;
  if (elo <= 400) return 0.55;
  if (elo <= 600) return 0.38;
  if (elo <= 800) return 0.22;
  if (elo <= 1000) return 0.1;
  return 0.04; // 1200
}

/**
 * For the remaining (non-random-move) fraction of moves at each weak tier, pick
 * among the engine's top candidates with a bias toward worse ones - lower elo ->
 * flatter distribution -> more likely to pick a worse-but-still-plausible move.
 */
export function pickWeightedMove(candidates, elo) {
  if (!candidates.length) return null;
  const n = candidates.length;
  const temperature = elo <= 400 ? 1.0 : elo <= 600 ? 0.9 : elo <= 800 ? 0.75 : elo <= 1000 ? 0.55 : 0.35;
  const weights = candidates.map((_, i) => Math.exp(-i / (n * (1 - temperature + 0.15))));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
