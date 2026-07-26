import { CoachExplanationBox } from './CoachExplanationBox';

const STATUS_MESSAGES = {
  loading: 'טוען את מנוע השחמט...',
  'player-turn': 'תורך לשחק. גרור כלי כדי לבצע מהלך.',
  evaluating: 'בודק את המהלך שלך...',
  'computer-thinking': 'היריב חושב על המהלך הבא...',
  'game-over': null,
  mistake: null,
};

export function CoachPanel({ status, mistake, gameOverMessage, onRetry, onNewGame, onPreviewFen }) {
  return (
    <aside className="flex h-full min-h-[420px] w-full flex-col rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-700 pb-3">
        <span className="text-2xl">♟️</span>
        <h2 className="text-lg font-bold text-slate-100">המאמן</h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {status === 'game-over' && (
          <div className="rounded-lg bg-indigo-900/50 p-4 text-center">
            <p className="text-base font-bold text-indigo-200">המשחק הסתיים</p>
            <p className="mt-1 text-sm text-slate-300">{gameOverMessage}</p>
          </div>
        )}

        {STATUS_MESSAGES[status] && (
          <div className="rounded-lg bg-slate-800 p-3 text-sm text-slate-300">{STATUS_MESSAGES[status]}</div>
        )}

        {status === 'mistake' && mistake && (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-amber-500 bg-amber-950/40 p-3 text-center">
              <p className="text-sm font-bold text-amber-300">
                הלוח נעול כרגע. לחצו על "נסה שוב את המהלך" למטה 👇 כדי לבחור מהלך אחר.
              </p>
            </div>

            <CoachExplanationBox
              classification={mistake.classification}
              badMoveSan={mistake.badMoveSan}
              bestMoveSan={mistake.bestMoveSan}
              punishingLine={mistake.punishingLine}
              loadingExplanation={mistake.loadingExplanation}
              explanation={mistake.explanation}
              onPreviewFen={onPreviewFen}
            />

            <button
              onClick={onRetry}
              disabled={mistake.loadingExplanation}
              className="w-full animate-pulse rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white ring-2 ring-emerald-400 transition hover:bg-emerald-500 hover:animate-none disabled:cursor-not-allowed disabled:animate-none disabled:opacity-50"
            >
              🔄 נסה שוב את המהלך
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onNewGame}
        className="mt-3 w-full rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
      >
        משחק חדש
      </button>
    </aside>
  );
}
