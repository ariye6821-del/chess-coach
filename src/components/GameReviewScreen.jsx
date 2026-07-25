import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { formatEval } from '../lib/stockfishEngine';
import { MOVE_CLASSES } from '../lib/gameAnalysis';

function SummaryChips({ summary }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {Object.values(MOVE_CLASSES).map((cls) => (
        <span key={cls.key} className={`rounded-full px-3 py-1 text-xs font-bold ${cls.badge}`}>
          {cls.label}: {summary.counts[cls.key]}
        </span>
      ))}
      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
        אובדן ממוצע: {Math.round(summary.avgCpLoss)} מאיות
      </span>
    </div>
  );
}

export function GameReviewScreen({ records, summary, studentColor = 'w', onClose, title }) {
  const [selectedIndex, setSelectedIndex] = useState(records.length ? records.length - 1 : -1);
  const selected = selectedIndex >= 0 ? records[selectedIndex] : null;

  const pairs = [];
  for (let i = 0; i < records.length; i += 2) {
    pairs.push([records[i], records[i + 1]]);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">{title || 'סקירת משחק'}</h2>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          חזרה
        </button>
      </div>

      <div className="mb-4">
        <SummaryChips summary={summary} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
        <div className="w-full max-w-[420px] lg:flex-1">
          {selected ? (
            <Chessboard
              options={{
                position: selected.fenAfter,
                allowDragging: false,
                boardOrientation: 'white',
                darkSquareStyle: { backgroundColor: '#4f6f8f' },
                lightSquareStyle: { backgroundColor: '#dce6ec' },
              }}
            />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-slate-700 text-slate-500">
              בחר מהלך לתצוגה
            </div>
          )}
          {selected && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-sm">
              <p className={`font-bold ${selected.classification.color}`}>
                {selected.classification.label} ({selected.mover === 'w' ? 'לבן' : 'שחור'} שיחק {selected.san})
              </p>
              <p className="mt-1 text-slate-400">
                הערכה: {formatEval(selected.evalBeforeWhite)} ← {formatEval(selected.evalAfterWhite)} (אובדן:{' '}
                {Math.round(selected.cpLoss)} מאיות)
              </p>
              {selected.bestMoveSan && (
                <p className="mt-1 text-slate-400">
                  מהלך מומלץ: <span className="font-mono text-emerald-400">{selected.bestMoveSan}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 lg:w-[420px]">
          <h3 className="mb-2 text-sm font-bold text-slate-300">מהלכים</h3>
          <ol className="max-h-[520px] space-y-1 overflow-y-auto text-sm">
            {pairs.map((pair, pairIdx) => (
              <li key={pairIdx} className="flex items-center gap-2">
                <span className="w-6 text-slate-500">{pairIdx + 1}.</span>
                {pair.map((rec, subIdx) => {
                  if (!rec) return null;
                  const isStudent = rec.mover === studentColor;
                  return (
                    <button
                      key={subIdx}
                      onClick={() => setSelectedIndex(rec.index)}
                      className={`rounded px-2 py-0.5 font-mono transition ${
                        rec.index === selectedIndex ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
                      } ${isStudent ? '' : 'opacity-70'}`}
                    >
                      {rec.san}
                      <span className={`mr-1 text-xs ${rec.classification.color}`}>
                        {rec.classification.key === 'blunder'
                          ? '??'
                          : rec.classification.key === 'mistake'
                            ? '?'
                            : rec.classification.key === 'inaccuracy'
                              ? '?!'
                              : ''}
                      </span>
                    </button>
                  );
                })}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
