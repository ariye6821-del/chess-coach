import { CoachExplanationBox } from './CoachExplanationBox';
import { CoachChat } from './CoachChat';
import { getPersonaForElo } from '../lib/coachPersona';

const STATUS_MESSAGES = {
  loading: 'טוען את מנוע השחמט...',
  'player-turn': 'תורך לשחק. גרור כלי כדי לבצע מהלך.',
  evaluating: 'בודק את המהלך שלך...',
  'computer-thinking': 'היריב חושב על המהלך הבא...',
  'game-over': null,
  mistake: null,
};

export function CoachPanel({
  status,
  mistake,
  gameOverMessage,
  hasMoves,
  onRetry,
  onNewGame,
  onRequestReview,
  onResign,
  onPreviewFen,
  playerElo,
  hintLevel = 0,
  onHint,
  hintSan,
  fen,
  moveHistorySan,
  studentColor,
}) {
  const persona = getPersonaForElo(playerElo);
  return (
    <aside className="flex h-full min-h-[420px] w-full flex-col rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-700 pb-3">
        <span className="text-2xl">{persona.avatar}</span>
        <div>
          <h2 className="text-lg font-bold text-slate-100">{persona.name}</h2>
          <p className="text-xs text-slate-500">{persona.tagline}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {status === 'game-over' && (
          <div className="space-y-3">
            <div className="rounded-lg bg-indigo-900/50 p-4 text-center">
              <p className="text-base font-bold text-indigo-200">המשחק הסתיים</p>
              <p className="mt-1 text-sm text-slate-300">{gameOverMessage}</p>
            </div>
            {hasMoves && onRequestReview && (
              <button
                onClick={onRequestReview}
                className="w-full rounded-lg bg-sky-600 px-4 py-2 font-bold text-white transition hover:bg-sky-500"
              >
                📋 קבלו סיכום מ{persona.name}
              </button>
            )}
          </div>
        )}

        {status === 'reviewing' && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-sm text-slate-400">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
            {persona.name} מכין/ה סיכום, זה עשוי לקחת קצת זמן...
          </div>
        )}

        {STATUS_MESSAGES[status] && (
          <div className="rounded-lg bg-slate-800 p-3 text-sm text-slate-300">{STATUS_MESSAGES[status]}</div>
        )}

        {status === 'player-turn' && hasMoves && onResign && (
          <button
            onClick={onResign}
            className="w-full rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/40"
          >
            🏳️ התפטרות
          </button>
        )}

        {status === 'player-turn' && onHint && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
            <button
              onClick={onHint}
              disabled={hintLevel >= 2}
              className="w-full rounded-md bg-slate-700 px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              💡 {hintLevel === 0 ? 'תנו לי רמז' : hintLevel === 1 ? 'עוד רמז' : 'רמז'}
            </button>
            {hintLevel === 1 && (
              <p className="mt-2 text-xs text-slate-400">הזיזו את הכלי שמסומן בירוק על הלוח.</p>
            )}
            {hintLevel >= 2 && hintSan && (
              <p className="mt-2 text-xs text-slate-400">
                המהלך המומלץ: <span className="font-mono font-bold text-emerald-400">{hintSan}</span>
              </p>
            )}
          </div>
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
              persona={persona}
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
        {fen && status !== 'reviewing' && (
          <CoachChat fen={fen} moveHistorySan={moveHistorySan} studentColor={studentColor} playerElo={playerElo} persona={persona} />
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
