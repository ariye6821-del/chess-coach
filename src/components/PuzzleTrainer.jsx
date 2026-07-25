import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getUnsolvedPuzzles, getAllPuzzles, markPuzzleSolved, markPuzzleAttempt } from '../lib/puzzleBank';
import { getCoachExplanation } from '../lib/coachApi';
import { CoachExplanationBox } from './CoachExplanationBox';
import { formatEval } from '../lib/stockfishEngine';

const SOURCE_LABELS = { coached: 'מהמשחק עם המאמן', 'free-play': 'ממשחק חופשי', chesscom: 'מ-Chess.com' };

export function PuzzleTrainer() {
  const [queue, setQueue] = useState(() => getUnsolvedPuzzles());
  const [index, setIndex] = useState(0);
  const [displayFen, setDisplayFen] = useState(null);
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
  const [revealed, setRevealed] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const chessRef = useRef(null);

  const puzzle = queue[index] ?? null;
  const totalSolved = getAllPuzzles().filter((p) => p.solved).length;

  useEffect(() => {
    if (!puzzle) return;
    chessRef.current = new Chess(puzzle.fen);
    setDisplayFen(chessRef.current.fen());
    setResult(null);
    setRevealed(false);
    setExplanation(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id]);

  const restart = () => {
    setQueue(getUnsolvedPuzzles());
    setIndex(0);
  };

  const goNext = () => {
    setIndex((i) => Math.min(i + 1, queue.length - 1));
  };

  const requestExplanation = () => {
    if (!puzzle || loadingExplanation || explanation) return;
    setLoadingExplanation(true);
    getCoachExplanation({
      fenBefore: puzzle.fen,
      badMoveSan: puzzle.badMoveSan,
      bestMoveSan: puzzle.solutionSan,
      evalBeforeStr: formatEval(puzzle.evalBeforeWhite ?? 0),
      evalAfterStr: formatEval(puzzle.evalAfterWhite ?? 0),
      moveNumber: 0,
      continuationSans: [],
      moverColor: mover,
      classification: puzzle.classification,
    }).then((exp) => {
      setExplanation(exp);
      setLoadingExplanation(false);
    });
  };

  if (!puzzle) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-700 bg-slate-900/80 p-6 text-center">
        <h2 className="mb-2 text-xl font-bold text-slate-100">🧩 תרגילים אישיים</h2>
        <p className="text-slate-400">
          עדיין אין לכם תרגילים. שחקו משחק (במצב "עם מאמן" או "משחק חופשי"), או ייבאו וסקרו משחקים מ-Chess.com - המאמן
          יוצר תרגיל אוטומטית מכל טעות שלכם, כדי שתוכלו לתרגל אותה שוב.
        </p>
        {totalSolved > 0 && <p className="mt-3 text-sm text-emerald-400">פתרתם עד כה {totalSolved} תרגילים 🎉</p>}
      </div>
    );
  }

  const mover = puzzle.fen.split(' ')[1];
  const boardOrientation = mover === 'b' ? 'black' : 'white';
  const boardDisabled = result === 'correct' || revealed;

  const onPieceDrop = ({ sourceSquare, targetSquare }) => {
    if (!targetSquare || boardDisabled) return false;
    if (!chessRef.current) chessRef.current = new Chess(puzzle.fen);
    const chess = chessRef.current;
    let moveResult;
    try {
      moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      moveResult = null;
    }
    if (!moveResult) return false;

    if (moveResult.san === puzzle.solutionSan) {
      setResult('correct');
      markPuzzleSolved(puzzle.id);
      setDisplayFen(chess.fen());
      return true;
    }

    markPuzzleAttempt(puzzle.id);
    setResult('wrong');
    chess.undo();
    setDisplayFen(chess.fen());
    return false;
  };

  const showSolutionMove = () => {
    if (!chessRef.current) chessRef.current = new Chess(puzzle.fen);
    const chess = chessRef.current;
    chess.move(puzzle.solutionSan);
    setDisplayFen(chess.fen());
    setRevealed(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-slate-100">🧩 תרגילים אישיים</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
          תרגיל {index + 1} מתוך {queue.length} · נפתרו בסה"כ {totalSolved}
        </span>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
        <div className="w-full max-w-[420px] lg:flex-1">
          <div dir="ltr">
            <Chessboard
              options={{
                position: displayFen ?? puzzle.fen,
                onPieceDrop: boardDisabled ? () => false : onPieceDrop,
                boardOrientation,
                allowDragging: !boardDisabled,
                showAnimations: false,
                darkSquareStyle: { backgroundColor: '#4f6f8f' },
                lightSquareStyle: { backgroundColor: '#dce6ec' },
              }}
            />
          </div>

          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-sm">
            <p className="text-slate-300">
              מצאו את המהלך הטוב ביותר עבור {mover === 'b' ? 'שחור' : 'לבן'}. תרגיל זה נוצר מטעות אמיתית{' '}
              {SOURCE_LABELS[puzzle.source] || ''}.
            </p>

            {result === 'correct' && <p className="mt-2 font-bold text-emerald-400">✅ נכון! זה בדיוק המהלך הנכון.</p>}
            {result === 'wrong' && !revealed && (
              <p className="mt-2 font-bold text-red-400">❌ לא בדיוק - נסו שוב, או בקשו לראות את הפתרון.</p>
            )}
            {revealed && (
              <p className="mt-2 font-bold text-sky-400">
                הפתרון: <span className="font-mono">{puzzle.solutionSan}</span>
              </p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {!boardDisabled && (
              <button
                onClick={showSolutionMove}
                className="min-h-11 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                הראה לי את הפתרון
              </button>
            )}
            <button
              onClick={requestExplanation}
              disabled={loadingExplanation || !!explanation}
              className="min-h-11 rounded-md border border-sky-700 bg-sky-950/40 px-3 py-2 text-sm font-bold text-sky-300 hover:bg-sky-900/50 disabled:opacity-50"
            >
              🎓 הסבירו לי למה
            </button>
            {boardDisabled && (
              <button
                onClick={goNext}
                disabled={index >= queue.length - 1}
                className="min-h-11 rounded-md bg-sky-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                תרגיל הבא ▶
              </button>
            )}
            <button
              onClick={restart}
              className="min-h-11 rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              רענן רשימת תרגילים
            </button>
          </div>

          {(loadingExplanation || explanation) && (
            <div className="mt-3">
              <CoachExplanationBox
                headerText="🎓 הסבר"
                classification={puzzle.classification}
                badMoveSan={puzzle.badMoveSan}
                bestMoveSan={puzzle.solutionSan}
                punishingLine={null}
                loadingExplanation={loadingExplanation}
                explanation={explanation}
                onPreviewFen={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
