import { useEffect, useRef, useState } from 'react';
import { StockfishEngine } from '../lib/stockfishEngine';
import { buildTrainingPlan } from '../lib/buildTrainingPlan';
import { getSavedPlan, savePlan, getDefaultUsername, setOnboarded } from '../lib/trainingPlan';

const PHASE_LABELS = { opening: 'פתיחה', middlegame: 'אמצע משחק', endgame: 'סיום' };

export function TrainingPlanScreen({ onNavigate, showSkip = false, onSkip, onFinish }) {
  const engineRef = useRef(null);
  const [engineReady, setEngineReady] = useState(false);
  const [username, setUsername] = useState(() => getSavedPlan()?.username || getDefaultUsername());
  const [plan, setPlan] = useState(() => getSavedPlan());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;
    engine.init().then(() => setEngineReady(true));
    return () => engine.terminate();
  }, []);

  const analyze = async () => {
    if (!username.trim() || loading) return;
    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: 10 });
    try {
      const result = await buildTrainingPlan(username.trim(), engineRef.current, {
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setPlan(result);
      savePlan(result);
      setOnboarded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const worstPhaseKey = plan ? Object.entries(plan.byPhase).sort((a, b) => b[1].count - a[1].count)[0][0] : null;

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-100">📋 תוכנית אימונים אישית</h2>
        <p className="mt-1 text-sm text-slate-400">
          הזינו את שם המשתמש שלכם ב-Chess.com - ננתח את 10 המשחקים האחרונים שלכם ונבנה תוכנית לפי החוזקות והחולשות שלכם.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="שם משתמש ב-Chess.com"
          className="min-h-11 flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-100"
          onKeyDown={(e) => e.key === 'Enter' && analyze()}
        />
        <button
          onClick={analyze}
          disabled={loading || !engineReady || !username.trim()}
          className="min-h-11 rounded-md bg-sky-600 px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          {loading ? 'מנתח...' : 'נתח ובנה תוכנית'}
        </button>
      </div>
      {!engineReady && <p className="text-xs text-slate-500">טוען מנוע ניתוח...</p>}
      {progress && <p className="text-xs text-slate-400">מנתח משחק {progress.done} מתוך {progress.total}...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {showSkip && !plan && !loading && (
        <button onClick={onSkip} className="w-full text-center text-sm text-slate-500 hover:text-slate-300">
          דלגו לעכשיו - תוכלו לבנות תוכנית בכל שלב מהתפריט
        </button>
      )}

      {plan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div>
              <p className="text-xs text-slate-500">
                {plan.username} · {plan.gamesAnalyzed} משחקים נותחו
              </p>
              <p className="text-2xl font-bold text-sky-400">{plan.rating ?? '—'}</p>
              <p className="text-xs text-slate-500">דירוג ב-Chess.com</p>
            </div>
            {worstPhaseKey && (
              <span className="rounded-full bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-300">
                הכי הרבה טעויות: {PHASE_LABELS[worstPhaseKey]}
              </span>
            )}
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-200">{plan.summary}</p>
            {plan.recommendations?.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-300">
                {plan.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-300">הצעדים הבאים שלכם</h3>
            {plan.actions.map((a, i) => (
              <button
                key={i}
                onClick={() => onNavigate?.(a.tab)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-right transition hover:bg-slate-800"
              >
                <span className="text-sm text-slate-300">{a.reason}</span>
                <span className="whitespace-nowrap font-bold text-sky-400">{a.label} ←</span>
              </button>
            ))}
          </div>

          {onFinish && (
            <button
              onClick={onFinish}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500"
            >
              המשך לאפליקציה
            </button>
          )}
        </div>
      )}
    </div>
  );
}
