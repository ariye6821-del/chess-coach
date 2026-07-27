import { useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { formatEval } from '../lib/stockfishEngine';
import { MOVE_CLASSES, movePhase } from '../lib/gameAnalysis';
import { getCoachExplanation, getGameSummary } from '../lib/coachApi';
import { CoachExplanationBox } from './CoachExplanationBox';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { getPersonaForElo } from '../lib/coachPersona';
import { identifyOpening } from '../lib/openings';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const MOVE_ICONS = {
  best: '⭐',
  good: '✓',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

function SummaryChips({ summary }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {Object.values(MOVE_CLASSES).map((cls) => (
        <span key={cls.key} className={`rounded-full px-3 py-1 text-xs font-bold ${cls.badge}`}>
          {MOVE_ICONS[cls.key]} {cls.label}: {summary.counts[cls.key]}
        </span>
      ))}
      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
        אובדן ממוצע: {Math.round(summary.avgCpLoss)} מאיות
      </span>
    </div>
  );
}

function isStudentMove(record, studentColor) {
  return !!record && record.mover === studentColor;
}

function CoachSummaryCard({ loading, gameSummary, playerElo }) {
  const persona = getPersonaForElo(playerElo);
  return (
    <div className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-3">
        <span className="text-2xl">{persona.avatar}</span>
        <h3 className="text-base font-bold text-slate-100">סיכום {persona.name}</h3>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
          המאמן מכין סיכום למשחק...
        </div>
      ) : (
        <div className="space-y-3">
          {gameSummary?.overallSummary && <p className="text-sm text-slate-200">{gameSummary.overallSummary}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-emerald-950/30 p-3">
              <p className="mb-1 text-xs font-bold text-emerald-400">👍 נקודות טובות</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                {(gameSummary?.strengths || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-amber-950/30 p-3">
              <p className="mb-1 text-xs font-bold text-amber-400">📈 נקודות לשיפור</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                {(gameSummary?.improvements || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const HEADER_TEXT_BY_CLASS = {
  best: '⭐ מהלך מיטבי',
  good: '✅ מהלך טוב',
  inaccuracy: '🤔 אפשר היה יותר מדויק',
  mistake: '⚠️ כאן הייתה טעות',
  blunder: '🚨 כאן הייתה טעות חמורה',
};

export function GameReviewScreen({ records, summary, studentColor = 'w', onClose, title, playerElo = null, resultLabel = null }) {
  const [theme] = useBoardTheme();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [previewFen, setPreviewFen] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [gameSummary, setGameSummary] = useState(null);
  const [loadingGameSummary, setLoadingGameSummary] = useState(true);
  const boardSectionRef = useRef(null);

  useEffect(() => {
    const studentMistakes = records
      .filter((r) => r.mover === studentColor && (r.classification.key === 'mistake' || r.classification.key === 'blunder'))
      .sort((a, b) => b.cpLoss - a.cpLoss)
      .slice(0, 8)
      .map((r) => ({
        san: r.san,
        classification: r.classification.key,
        moveNumber: r.moveNumber,
        phase: { opening: 'פתיחה', middlegame: 'אמצע משחק', endgame: 'סיום' }[movePhase(r.moveNumber)],
        bestMoveSan: r.bestMoveSan,
      }));

    setLoadingGameSummary(true);
    getGameSummary({
      counts: summary.counts,
      avgCpLoss: summary.avgCpLoss,
      byPhase: summary.byPhase,
      sampleMistakes: studentMistakes,
      resultLabel,
      playerElo,
    }).then((result) => {
      setGameSummary(result);
      setLoadingGameSummary(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreviewFen = (previewedFen) => {
    setPreviewFen(previewedFen);
    if (previewedFen) boardSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const selected = selectedIndex >= 0 ? records[selectedIndex] : null;
  const startFen = records[0]?.fenBefore ?? START_FEN;

  useEffect(() => {
    setPreviewFen(null);
  }, [selectedIndex]);

  useEffect(() => {
    if (!isStudentMove(selected, studentColor)) return;
    if (explanations[selectedIndex]) return;

    setExplanations((prev) => ({ ...prev, [selectedIndex]: { loadingExplanation: true, explanation: null } }));
    getCoachExplanation({
      fenBefore: selected.fenBefore,
      badMoveSan: selected.san,
      bestMoveSan: selected.bestMoveSan,
      evalBeforeStr: formatEval(selected.evalBeforeWhite),
      evalAfterStr: formatEval(selected.evalAfterWhite),
      moveNumber: selected.moveNumber,
      continuationSans: selected.punishingLine?.sans ?? [],
      moverColor: selected.mover,
      classification: selected.classification.key,
      playerElo,
    }).then((explanation) => {
      setExplanations((prev) => ({ ...prev, [selectedIndex]: { loadingExplanation: false, explanation } }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const pairs = [];
  for (let i = 0; i < records.length; i += 2) {
    pairs.push([records[i], records[i + 1]]);
  }

  const currentExplanationState = explanations[selectedIndex];
  const boardFen = previewFen ?? (selected ? selected.fenAfter : startFen);
  const boardOrientation = studentColor === 'b' ? 'black' : 'white';
  const openingName = identifyOpening(records.map((r) => r.san));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">{title || 'סקירת משחק'}</h2>
          <span
            className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
              studentColor === 'b' ? 'bg-slate-950 text-slate-100 ring-1 ring-slate-500' : 'bg-slate-100 text-slate-900'
            }`}
          >
            {studentColor === 'b' ? '⚫' : '⚪'} שיחקת בתור {studentColor === 'b' ? 'שחור' : 'לבן'}
          </span>
          <span className="mr-2 mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300">
            {getPersonaForElo(playerElo).avatar} {getPersonaForElo(playerElo).name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="min-h-11 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          חזרה
        </button>
      </div>

      {openingName && <p className="mb-2 text-sm text-slate-500">פתיחה: <span className="font-bold text-slate-400">{openingName}</span></p>}

      <CoachSummaryCard loading={loadingGameSummary} gameSummary={gameSummary} playerElo={playerElo} />

      <div className="mb-4">
        <SummaryChips summary={summary} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
        <div ref={boardSectionRef} className="w-full max-w-[420px] lg:flex-1">
          <Chessboard
            options={{
              position: boardFen,
              allowDragging: false,
              boardOrientation,
              showAnimations: false,
              darkSquareStyle: { backgroundColor: theme.dark },
              lightSquareStyle: { backgroundColor: theme.light },
            }}
          />

          <div className="mt-3 grid grid-cols-4 gap-2">
            <button
              onClick={() => setSelectedIndex(-1)}
              disabled={selectedIndex === -1}
              className="min-h-11 rounded-md bg-slate-700 px-2 py-2 text-xs text-slate-200 disabled:opacity-30 sm:text-sm"
            >
              ⏮ להתחלה
            </button>
            <button
              onClick={() => setSelectedIndex((i) => Math.max(-1, i - 1))}
              disabled={selectedIndex <= -1}
              className="min-h-11 rounded-md bg-slate-700 px-2 py-2 text-xs text-slate-200 disabled:opacity-30 sm:text-sm"
            >
              ◀ הקודם
            </button>
            <button
              onClick={() => setSelectedIndex((i) => Math.min(records.length - 1, i + 1))}
              disabled={selectedIndex >= records.length - 1}
              className="min-h-11 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 px-2 py-2 text-xs font-bold text-white disabled:opacity-30 sm:text-sm"
            >
              הבא ▶
            </button>
            <button
              onClick={() => setSelectedIndex(records.length - 1)}
              disabled={selectedIndex === records.length - 1 || records.length === 0}
              className="min-h-11 rounded-md bg-slate-700 px-2 py-2 text-xs text-slate-200 disabled:opacity-30 sm:text-sm"
            >
              לסוף ⏭
            </button>
          </div>

          {selected ? (
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
          ) : (
            <p className="mt-3 text-center text-sm text-slate-500">עמדת פתיחה - לחצו "הבא" כדי לעבור מהלך-מהלך</p>
          )}

          {isStudentMove(selected, studentColor) && (
            <div className="mt-3">
              <CoachExplanationBox
                headerText={HEADER_TEXT_BY_CLASS[selected.classification.key]}
                classification={selected.classification.key}
                badMoveSan={selected.san}
                bestMoveSan={selected.bestMoveSan}
                punishingLine={selected.punishingLine}
                loadingExplanation={currentExplanationState?.loadingExplanation}
                explanation={currentExplanationState?.explanation}
                onPreviewFen={handlePreviewFen}
                persona={getPersonaForElo(playerElo)}
              />
            </div>
          )}
        </div>

        <div className="w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-3 lg:w-[420px]">
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
                      className={`min-h-9 rounded px-2 py-1.5 font-mono transition ${
                        rec.index === selectedIndex ? 'bg-sky-600 text-white' : 'hover:bg-slate-800'
                      } ${isStudent ? '' : 'opacity-70'}`}
                    >
                      {rec.san}
                      <span
                        className={`mr-1 rounded px-1 text-xs font-bold ${
                          rec.index === selectedIndex ? 'text-white' : rec.classification.badge
                        }`}
                        title={rec.classification.label}
                      >
                        {MOVE_ICONS[rec.classification.key]}
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
