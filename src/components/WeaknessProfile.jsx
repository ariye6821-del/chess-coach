import { MOVE_CLASSES } from '../lib/gameAnalysis';

const PHASE_LABELS = { opening: 'פתיחה', middlegame: 'אמצע משחק', endgame: 'סיום' };

export function WeaknessProfile({ profile, onClose }) {
  const { counts, byPhase, avgCpLoss, gamesAnalyzed, llmSummary } = profile;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">פרופיל חולשות</h2>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          חזרה
        </button>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <p className="text-sm text-slate-400">
          מבוסס על ניתוח {gamesAnalyzed} משחקים אחרונים · אובדן מאיות ממוצע למהלך: {Math.round(avgCpLoss)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.values(MOVE_CLASSES).map((cls) => (
            <span key={cls.key} className={`rounded-full px-3 py-1 text-xs font-bold ${cls.badge}`}>
              {cls.label}: {counts[cls.key]}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <h3 className="mb-3 text-sm font-bold text-slate-300">טעויות לפי שלב משחק</h3>
        <div className="space-y-2">
          {Object.entries(byPhase).map(([phase, data]) => (
            <div key={phase} className="flex items-center gap-3">
              <span className="w-24 text-sm text-slate-400">{PHASE_LABELS[phase]}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-orange-500"
                  style={{
                    width: `${Math.min(100, (data.count / Math.max(1, counts.mistake + counts.blunder)) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-10 text-left text-sm text-slate-400">{data.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-sky-700 bg-sky-950/30 p-4">
        <h3 className="mb-2 text-sm font-bold text-sky-300">מה המאמן חושב</h3>
        <p className="text-sm leading-relaxed text-slate-200">{llmSummary.summary}</p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-300">
          {llmSummary.recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
        {llmSummary.isFallback && (
          <p className="mt-3 text-center text-xs text-slate-500">
            (הסבר מקומי בסיסי - הגדר מפתח API לקבלת ניתוח מותאם אישית)
          </p>
        )}
      </div>
    </div>
  );
}
