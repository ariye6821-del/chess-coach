import { fetchRecentGames, describeGame, pgnToSanMoves } from './chesscom';
import { analyzeGameFromMoves, summarizeGame, movePhase } from './gameAnalysis';
import { getWeaknessSummary } from './coachApi';
import { addPuzzlesFromRecords } from './puzzleBank';
import { nearestEloTier } from './difficulty';

const GAME_LIMIT = 10;
const ANALYSIS_DEPTH = 8;
const PHASE_NAMES = { opening: 'בפתיחה', middlegame: 'באמצע המשחק', endgame: 'בסיום' };

function studentRating(game) {
  return game.studentColor === 'w' ? game.white.rating : game.black.rating;
}

function buildActions({ byPhase, counts, suggestedDifficultyElo }) {
  const worstPhase = Object.entries(byPhase).sort((a, b) => b[1].count - a[1].count)[0][0];
  const actions = [];

  if (worstPhase === 'endgame') {
    actions.push({
      label: '🏁 תרגלו במאמן הסיומים',
      tab: 'endgames',
      reason: `רוב הטעויות שלכם קרו ${PHASE_NAMES.endgame} - תרגול ממוקד על טכניקות בסיסיות יעזור.`,
    });
  } else if (worstPhase === 'opening') {
    actions.push({
      label: '♟️ שחקו עם מאמן חי',
      tab: 'coached',
      reason: `רוב הטעויות שלכם קרו ${PHASE_NAMES.opening} - מאמן חי יעצור אתכם ברגע האמת ויסביר מה עדיף.`,
    });
  } else {
    actions.push({
      label: '🧩 פתרו תרגילים אישיים',
      tab: 'puzzles',
      reason: `רוב הטעויות שלכם קרו ${PHASE_NAMES.middlegame} - הטעויות מהמשחקים שנותחו כבר הפכו לתרגילים בשבילכם.`,
    });
  }

  if (counts.blunder > 0) {
    actions.push({
      label: '🧩 פתרו תרגילים אישיים',
      tab: 'puzzles',
      reason: `זיהינו ${counts.blunder} טעויות חמורות במשחקים שלכם - כל אחת הפכה לתרגיל בבנק החידות האישי.`,
    });
  }

  actions.push({
    label: '♟️ שחקו עם מאמן ברמה המתאימה',
    tab: 'coached',
    reason:
      suggestedDifficultyElo != null
        ? `בהתאם לדירוג שלכם ב-Chess.com, מומלץ להתחיל ברמת קושי ${suggestedDifficultyElo}.`
        : 'שחקו עם מאמן חי כדי לקבל הסבר מיידי על כל טעות.',
  });

  const seen = new Set();
  return actions.filter((a) => {
    const key = a.tab + a.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Fetches a Chess.com player's last 10 games, analyzes each with the given
 * (already-initialized) Stockfish engine, aggregates the results, harvests
 * puzzles from every mistake/blunder found (same as the bulk weakness-profile
 * flow), and asks the LLM for a weakness summary - then wraps it all into a
 * concrete, clickable training plan.
 */
export async function buildTrainingPlan(username, engine, { onProgress } = {}) {
  const rawGames = await fetchRecentGames(username, GAME_LIMIT);
  if (!rawGames.length) throw new Error('לא נמצאו משחקים עבור המשתמש הזה ב-Chess.com.');

  const games = rawGames.map((g) => describeGame(g, username));
  const rating = studentRating(games[0]) ?? null;
  const suggestedDifficultyElo = nearestEloTier(rating);

  const aggregate = {
    counts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    byPhase: {
      opening: { count: 0, cpLoss: 0 },
      middlegame: { count: 0, cpLoss: 0 },
      endgame: { count: 0, cpLoss: 0 },
    },
    totalCpLoss: 0,
    totalMoves: 0,
  };
  const sampleMistakes = [];

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    try {
      const sanMoves = pgnToSanMoves(game.pgn);
      const records = await analyzeGameFromMoves(engine, sanMoves, { depth: ANALYSIS_DEPTH });
      const summary = summarizeGame(records, { color: game.studentColor });
      for (const key of Object.keys(aggregate.counts)) aggregate.counts[key] += summary.counts[key];
      for (const phase of Object.keys(aggregate.byPhase)) {
        aggregate.byPhase[phase].count += summary.byPhase[phase].count;
        aggregate.byPhase[phase].cpLoss += summary.byPhase[phase].cpLoss;
      }
      aggregate.totalMoves += summary.totalMoves;
      aggregate.totalCpLoss += summary.avgCpLoss * summary.totalMoves;
      addPuzzlesFromRecords(records, game.studentColor, 'chesscom', suggestedDifficultyElo);

      for (const rec of records) {
        if (rec.mover !== game.studentColor) continue;
        if (rec.classification.key !== 'mistake' && rec.classification.key !== 'blunder') continue;
        sampleMistakes.push({
          san: rec.san,
          classification: rec.classification.key,
          moveNumber: rec.moveNumber,
          phase: PHASE_NAMES[movePhase(rec.moveNumber)],
          cpLoss: rec.cpLoss,
          bestMoveSan: rec.bestMoveSan,
        });
      }
    } catch {
      // skip a game that fails to parse/analyze, continue with the rest
    }
    onProgress?.(i + 1, games.length);
  }

  const avgCpLoss = aggregate.totalMoves ? aggregate.totalCpLoss / aggregate.totalMoves : 0;
  const topMistakes = sampleMistakes.sort((a, b) => b.cpLoss - a.cpLoss).slice(0, 20);
  const { summary, recommendations } = await getWeaknessSummary({
    gamesAnalyzed: games.length,
    counts: aggregate.counts,
    avgCpLoss,
    byPhase: aggregate.byPhase,
    sampleMistakes: topMistakes,
  });

  return {
    username,
    rating,
    gamesAnalyzed: games.length,
    generatedAt: new Date().toISOString(),
    counts: aggregate.counts,
    byPhase: aggregate.byPhase,
    avgCpLoss,
    summary,
    recommendations,
    suggestedDifficultyElo,
    actions: buildActions({ byPhase: aggregate.byPhase, counts: aggregate.counts, suggestedDifficultyElo }),
  };
}
