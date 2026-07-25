export const NATIVE_ELO_FLOOR = 1320;

export const ELO_PRESETS = [
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
 * Stockfish's own strength limiter only goes down to 1320 ELO. For presets below
 * that we simulate weaker play on top of a shallow, floored search by randomly
 * picking among the engine's top candidate moves instead of always the best one -
 * lower elo -> flatter distribution -> more likely to pick a worse move.
 */
export function pickWeightedMove(candidates, elo) {
  if (!candidates.length) return null;
  const n = candidates.length;
  const temperature = elo <= 800 ? 1.0 : elo <= 1000 ? 0.7 : 0.4;
  const weights = candidates.map((_, i) => Math.exp(-i / (n * (1 - temperature + 0.15))));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
