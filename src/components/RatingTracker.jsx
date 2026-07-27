import { useEffect, useState } from 'react';
import { getRatingHistory, DEFAULT_RATING } from '../lib/rating';

const RESULT_LABELS = {
  win: { text: 'ניצחון', color: 'text-emerald-400' },
  draw: { text: 'תיקו', color: 'text-slate-400' },
  loss: { text: 'הפסד', color: 'text-red-400' },
};

const RESULT_DOT_COLOR = {
  win: 'rgb(52, 211, 153)',
  draw: 'rgb(148, 163, 184)',
  loss: 'rgb(248, 113, 113)',
};

function RatingChart({ history }) {
  if (history.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-slate-800 text-sm text-slate-500">
        שחקו כמה משחקים כדי לראות את גרף ההתקדמות
      </div>
    );
  }

  const width = 600;
  const height = 180;
  const pad = 12;
  const ratings = history.map((h) => h.rating);
  const min = Math.min(...ratings) - 20;
  const max = Math.max(...ratings) + 20;
  const span = max - min || 1;

  const coords = history.map((h, i) => {
    const x = (i / (history.length - 1)) * (width - pad * 2) + pad;
    const y = height - ((h.rating - min) / span) * (height - pad * 2) - pad;
    return { x, y, result: h.result };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} dir="ltr" className="w-full rounded-lg bg-slate-800">
      <polyline points={coords.map((c) => `${c.x},${c.y}`).join(' ')} fill="none" stroke="rgb(56,189,248)" strokeWidth="2" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3.5" fill={RESULT_DOT_COLOR[c.result] ?? 'rgb(56,189,248)'} />
      ))}
    </svg>
  );
}

export function RatingTracker() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getRatingHistory());
  }, []);

  const currentRating = history.length ? history[history.length - 1].rating : DEFAULT_RATING;
  const wins = history.filter((h) => h.result === 'win').length;
  const draws = history.filter((h) => h.result === 'draw').length;
  const losses = history.filter((h) => h.result === 'loss').length;

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-100">📈 מעקב דירוג</h2>
        <p className="mt-1 text-sm text-slate-400">
          הדירוג מתעדכן אוטומטית בסיום כל משחק במצב "עם מאמן" או "משחק חופשי"
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-4 text-center shadow-lg">
        <p className="text-4xl font-extrabold text-sky-400">{currentRating}</p>
        <p className="mt-1 text-sm text-slate-400">דירוג נוכחי</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-800 p-3">
          <p className="text-lg font-bold text-emerald-400">{wins}</p>
          <p className="text-xs text-slate-400">ניצחונות</p>
        </div>
        <div className="rounded-lg bg-slate-800 p-3">
          <p className="text-lg font-bold text-slate-300">{draws}</p>
          <p className="text-xs text-slate-400">תיקו</p>
        </div>
        <div className="rounded-lg bg-slate-800 p-3">
          <p className="text-lg font-bold text-red-400">{losses}</p>
          <p className="text-xs text-slate-400">הפסדים</p>
        </div>
      </div>

      <RatingChart history={history} />

      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-4 shadow-lg">
          <h3 className="mb-2 text-sm font-bold text-slate-300">היסטוריית משחקים אחרונים</h3>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {[...history].reverse().map((h, i) => (
              <li key={history.length - i} className="flex items-center justify-between gap-2 border-b border-slate-800 py-1.5">
                <span className="text-xs text-slate-500">{new Date(h.ts).toLocaleDateString('he-IL')}</span>
                <span className={`font-bold ${RESULT_LABELS[h.result]?.color ?? 'text-slate-300'}`}>
                  {RESULT_LABELS[h.result]?.text ?? h.result}
                </span>
                <span className="text-xs text-slate-400">מול {h.opponentElo}</span>
                <span className="font-mono text-slate-300">{h.rating}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
