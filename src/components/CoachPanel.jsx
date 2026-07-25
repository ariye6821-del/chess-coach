import { useEffect, useRef, useState } from 'react';

const STATUS_MESSAGES = {
  loading: 'טוען את מנוע השחמט...',
  'player-turn': 'תורך לשחק. גרור כלי כדי לבצע מהלך.',
  evaluating: 'בודק את המהלך שלך...',
  'computer-thinking': 'היריב חושב על המהלך הבא...',
  'game-over': null,
  mistake: null,
};

function ExplanationBlock({ title, text, accent }) {
  return (
    <div className="rounded-lg bg-slate-800/70 p-3">
      <h4 className={`mb-1 text-sm font-bold ${accent}`}>{title}</h4>
      <p className="text-sm leading-relaxed text-slate-200">{text}</p>
    </div>
  );
}

function PunishingLinePreview({ punishingLine, onPreviewFen }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1); // -1 = position right after the mistake, before the punishment
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  const total = punishingLine.fens.length;

  useEffect(() => {
    if (!open) return;
    onPreviewFen(step === -1 ? punishingLine.startFen : punishingLine.fens[step]);
  }, [open, step, punishingLine, onPreviewFen]);

  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setStep((s) => {
        if (s + 1 >= total) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 900);
    return () => clearInterval(intervalRef.current);
  }, [playing, total]);

  if (!punishingLine.sans.length) return null;

  const close = () => {
    setOpen(false);
    setPlaying(false);
    setStep(-1);
    onPreviewFen(null);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-sky-700 bg-sky-950/40 px-3 py-2 text-sm font-bold text-sky-300 transition hover:bg-sky-900/50"
      >
        🎬 הראה לי מה היה קורה על הלוח
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-sky-700 bg-sky-950/30 p-3">
      <p className="text-sm font-bold text-sky-300">ההמשך הצפוי:</p>
      <div className="flex flex-wrap gap-1 text-sm">
        {punishingLine.sans.map((san, i) => (
          <span
            key={i}
            className={`rounded px-1.5 py-0.5 font-mono ${
              i === step ? 'bg-sky-600 text-white' : 'text-slate-400'
            }`}
          >
            {san}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setStep((s) => Math.max(-1, s - 1))}
          disabled={step <= -1}
          className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-200 disabled:opacity-30"
        >
          ⏮ הקודם
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded-md bg-sky-600 px-3 py-1 text-xs font-bold text-white"
        >
          {playing ? '⏸ עצור' : '▶ הפעל'}
        </button>
        <button
          onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
          disabled={step >= total - 1}
          className="rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-200 disabled:opacity-30"
        >
          הבא ⏭
        </button>
      </div>
      <button onClick={close} className="w-full rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800">
        סגור תצוגה וחזור למשחק
      </button>
    </div>
  );
}

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
            <div className="rounded-lg border border-amber-600/50 bg-amber-950/40 p-3">
              <p className="text-sm font-bold text-amber-400">⚠️ נראה שזו הייתה טעות</p>
              <p className="mt-1 text-sm text-slate-300">
                שיחקת <span className="font-mono font-bold text-amber-300">{mistake.badMoveSan}</span>, וזה הרע את
                העמדה שלך.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                המהלך המומלץ היה:{' '}
                <span className="font-mono font-bold text-emerald-400">{mistake.bestMoveSan}</span>
              </p>
            </div>

            {mistake.punishingLine && <PunishingLinePreview punishingLine={mistake.punishingLine} onPreviewFen={onPreviewFen} />}

            {mistake.loadingExplanation && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-sm text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                המאמן מכין הסבר...
              </div>
            )}

            {mistake.explanation && (
              <>
                <ExplanationBlock
                  title="1. מה קרה על הלוח (ולאן זה מוביל)"
                  text={mistake.explanation.mistake}
                  accent="text-amber-400"
                />
                <ExplanationBlock
                  title="2. העיקרון האסטרטגי"
                  text={mistake.explanation.strategy}
                  accent="text-sky-400"
                />
                <ExplanationBlock
                  title="3. איך לחשוב להבא"
                  text={mistake.explanation.howToThink}
                  accent="text-emerald-400"
                />
                {mistake.explanation.isFallback && (
                  <p className="text-center text-xs text-slate-500">
                    (הסבר מקומי בסיסי - הגדר מפתח API לקבלת הסברים מותאמים אישית)
                  </p>
                )}
              </>
            )}

            <button
              onClick={onRetry}
              disabled={mistake.loadingExplanation}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              נסה שוב את המהלך
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
