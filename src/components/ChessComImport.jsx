import { useEffect, useRef, useState } from 'react';
import { StockfishEngine } from '../lib/stockfishEngine';
import { fetchRecentGames, pgnToSanMoves, describeGame } from '../lib/chesscom';
import { analyzeGameFromMoves, summarizeGame, movePhase } from '../lib/gameAnalysis';
import { getWeaknessSummary } from '../lib/coachApi';
import { addPuzzlesFromRecords } from '../lib/puzzleBank';
import { nearestEloTier } from '../lib/difficulty';
import { GameReviewScreen } from './GameReviewScreen';
import { WeaknessProfile } from './WeaknessProfile';

const SINGLE_GAME_DEPTH = 11;
const BULK_DEPTH = 8;
const BULK_GAME_LIMIT = 8;
const USERNAME_STORAGE_KEY = 'chess-coach-chesscom-username';

function loadSavedUsername() {
  try {
    return localStorage.getItem(USERNAME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveUsername(username) {
  try {
    localStorage.setItem(USERNAME_STORAGE_KEY, username);
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) - just won't persist
  }
}

function studentRating(game) {
  return game.studentColor === 'w' ? game.white.rating : game.black.rating;
}

function emptyAggregate() {
  return {
    counts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    byPhase: {
      opening: { count: 0, cpLoss: 0 },
      middlegame: { count: 0, cpLoss: 0 },
      endgame: { count: 0, cpLoss: 0 },
    },
    totalCpLoss: 0,
    totalMoves: 0,
  };
}

export function ChessComImport() {
  const engineRef = useRef(null);
  const [engineReady, setEngineReady] = useState(false);
  const [username, setUsername] = useState(loadSavedUsername);
  const [loadingGames, setLoadingGames] = useState(false);
  const [error, setError] = useState(null);
  const [games, setGames] = useState([]);
  const [analyzingUrl, setAnalyzingUrl] = useState(null);
  const [singleReview, setSingleReview] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileProgress, setProfileProgress] = useState(null);

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;
    engine.init().then(() => setEngineReady(true));
    return () => engine.terminate();
  }, []);

  const loadGames = async () => {
    if (!username.trim()) return;
    saveUsername(username.trim());
    setLoadingGames(true);
    setError(null);
    setGames([]);
    try {
      const raw = await fetchRecentGames(username, 20);
      if (!raw.length) setError('לא נמצאו משחקים עבור המשתמש הזה.');
      setGames(raw.map((g) => describeGame(g, username)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingGames(false);
    }
  };

  const analyzeGame = async (game) => {
    setAnalyzingUrl(game.url);
    setError(null);
    try {
      const sanMoves = pgnToSanMoves(game.pgn);
      const records = await analyzeGameFromMoves(engineRef.current, sanMoves, { depth: SINGLE_GAME_DEPTH });
      const summary = summarizeGame(records, { color: game.studentColor });
      const playerElo = nearestEloTier(studentRating(game));
      addPuzzlesFromRecords(records, game.studentColor, 'chesscom', playerElo);
      setSingleReview({
        records,
        summary,
        studentColor: game.studentColor,
        title: `${game.white.username} (${game.white.rating}) נגד ${game.black.username} (${game.black.rating})`,
        playerElo,
      });
    } catch (err) {
      setError('שגיאה בניתוח המשחק: ' + err.message);
    } finally {
      setAnalyzingUrl(null);
    }
  };

  const analyzeProfile = async () => {
    const subset = games.slice(0, BULK_GAME_LIMIT);
    setError(null);
    setProfileProgress({ done: 0, total: subset.length });
    const aggregate = emptyAggregate();
    const sampleMistakes = [];

    for (let i = 0; i < subset.length; i++) {
      const game = subset[i];
      try {
        const sanMoves = pgnToSanMoves(game.pgn);
        const records = await analyzeGameFromMoves(engineRef.current, sanMoves, { depth: BULK_DEPTH });
        const summary = summarizeGame(records, { color: game.studentColor });
        for (const key of Object.keys(aggregate.counts)) aggregate.counts[key] += summary.counts[key];
        for (const phase of Object.keys(aggregate.byPhase)) {
          aggregate.byPhase[phase].count += summary.byPhase[phase].count;
          aggregate.byPhase[phase].cpLoss += summary.byPhase[phase].cpLoss;
        }
        aggregate.totalMoves += summary.totalMoves;
        aggregate.totalCpLoss += summary.avgCpLoss * summary.totalMoves;
        addPuzzlesFromRecords(records, game.studentColor, 'chesscom', nearestEloTier(studentRating(game)));

        for (const rec of records) {
          if (rec.mover !== game.studentColor) continue;
          if (rec.classification.key !== 'mistake' && rec.classification.key !== 'blunder') continue;
          sampleMistakes.push({
            san: rec.san,
            classification: rec.classification.key,
            moveNumber: rec.moveNumber,
            phase: { opening: 'פתיחה', middlegame: 'אמצע משחק', endgame: 'סיום' }[movePhase(rec.moveNumber)],
            cpLoss: rec.cpLoss,
            bestMoveSan: rec.bestMoveSan,
          });
        }
      } catch {
        // skip a game that fails to parse or analyze and continue with the rest
      }
      setProfileProgress({ done: i + 1, total: subset.length });
    }

    const avgCpLoss = aggregate.totalMoves ? aggregate.totalCpLoss / aggregate.totalMoves : 0;
    const topMistakes = sampleMistakes.sort((a, b) => b.cpLoss - a.cpLoss).slice(0, 25);
    const llmSummary = await getWeaknessSummary({
      gamesAnalyzed: subset.length,
      counts: aggregate.counts,
      avgCpLoss,
      byPhase: aggregate.byPhase,
      sampleMistakes: topMistakes,
    });
    setProfile({ counts: aggregate.counts, byPhase: aggregate.byPhase, avgCpLoss, gamesAnalyzed: subset.length, llmSummary });
    setProfileProgress(null);
  };

  if (singleReview) {
    return <GameReviewScreen {...singleReview} onClose={() => setSingleReview(null)} />;
  }

  if (profile) {
    return <WeaknessProfile profile={profile} onClose={() => setProfile(null)} />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="mb-2 text-lg font-bold text-slate-100">ייבוא משחקים מ-Chess.com</h2>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="שם משתמש ב-Chess.com"
            className="min-h-11 flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
            onKeyDown={(e) => e.key === 'Enter' && loadGames()}
          />
          <button
            onClick={loadGames}
            disabled={loadingGames || !engineReady}
            className="min-h-11 rounded-md bg-sky-600 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {loadingGames ? 'טוען...' : 'טען משחקים'}
          </button>
        </div>
        {!engineReady && <p className="mt-2 text-xs text-slate-500">טוען מנוע ניתוח...</p>}
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      {games.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-300">{games.length} משחקים אחרונים</h3>
            <button
              onClick={analyzeProfile}
              disabled={!!profileProgress}
              className="min-h-11 rounded-md bg-purple-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              נתח {Math.min(games.length, BULK_GAME_LIMIT)} משחקים ומצא נקודות תורפה
            </button>
          </div>
          {profileProgress && (
            <p className="mb-2 text-xs text-slate-400">
              מנתח משחק {profileProgress.done} מתוך {profileProgress.total}...
            </p>
          )}
          <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
            {games.map((g) => (
              <li key={g.url} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-800/60 px-3 py-2">
                <span className="text-slate-300">
                  {g.white.username} ({g.white.rating}) נגד {g.black.username} ({g.black.rating})
                  <span className="mr-2 text-xs text-slate-500">
                    {g.timeClass} · {g.endTime?.toLocaleDateString('he-IL')}
                  </span>
                </span>
                <button
                  onClick={() => analyzeGame(g)}
                  disabled={analyzingUrl === g.url}
                  className="min-h-9 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {analyzingUrl === g.url ? 'מנתח...' : 'נתח משחק זה'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
