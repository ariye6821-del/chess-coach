import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getUnsolvedPuzzles, getAllPuzzles, markPuzzleSolved, markPuzzleAttempt } from '../lib/puzzleBank';
import { getCoachExplanation } from '../lib/coachApi';
import { CoachExplanationBox } from './CoachExplanationBox';
import { formatEval } from '../lib/stockfishEngine';
import { ELO_PRESETS } from '../lib/difficulty';
import { useClickToMove } from '../hooks/useClickToMove';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { getPersonaForElo } from '../lib/coachPersona';
import { TACTIC_LABELS } from '../lib/tacticTags';

const SOURCE_LABELS = {
  coached: 'מהמשחק עם המאמן',
  'free-play': 'ממשחק חופשי',
  friend: 'ממשחק מול חבר',
  endgame: 'ממאמן הסיומים',
  chesscom: 'מ-Chess.com',
  lichess: 'מ-Lichess',
  'pgn-paste': 'ממשחק מודבק',
};

function tierKey(difficultyElo) {
  return difficultyElo == null ? 'unrated' : String(difficultyElo);
}

function tierLabel(difficultyElo) {
  if (difficultyElo == null) return 'ללא רמת קושי מוגדרת';
  const preset = ELO_PRESETS.find((p) => p.elo === difficultyElo);
  return preset ? preset.label : String(difficultyElo);
}

export function PuzzleTrainer() {
  const [theme] = useBoardTheme();
  const [tierFilter, setTierFilter] = useState('all');
  const [tacticFilter, setTacticFilter] = useState('all');
  const [queue, setQueue] = useState(() => getUnsolvedPuzzles());
  const [index, setIndex] = useState(0);
  const [displayFen, setDisplayFen] = useState(null);
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'
  const [revealed, setRevealed] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const chessRef = useRef(null);
  const boardSectionRef = useRef(null);

  const availableTiers = Array.from(new Set(queue.map((p) => tierKey(p.difficultyElo)))).sort((a, b) => {
    if (a === 'unrated') return 1;
    if (b === 'unrated') return -1;
    return Number(a) - Number(b);
  });
  const availableTactics = Array.from(new Set(queue.flatMap((p) => p.tacticTags || [])));
  const filteredQueue = queue
    .filter((p) => tierFilter === 'all' || tierKey(p.difficultyElo) === tierFilter)
    .filter((p) => tacticFilter === 'all' || (p.tacticTags || []).includes(tacticFilter));
  const puzzle = filteredQueue[index] ?? null;
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

  const changeTierFilter = (value) => {
    setTierFilter(value);
    setIndex(0);
  };

  const changeTacticFilter = (value) => {
    setTacticFilter(value);
    setIndex(0);
  };

  const goNext = () => {
    setIndex((i) => Math.min(i + 1, filteredQueue.length - 1));
  };

  const mover = puzzle ? puzzle.fen.split(' ')[1] : 'w';
  const boardOrientation = mover === 'b' ? 'black' : 'white';
  const boardDisabled = result === 'correct' || revealed;

  const requestExplanation = () => {
    if (!puzzle || loadingExplanation || explanation) return;
    boardSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      playerElo: puzzle.difficultyElo,
    }).then((exp) => {
      setExplanation(exp);
      setLoadingExplanation(false);
    });
  };

  const onPieceDrop = ({ sourceSquare, targetSquare }) => {
    if (!puzzle || !targetSquare || boardDisabled) return false;
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
    if (!puzzle) return;
    if (!chessRef.current) chessRef.current = new Chess(puzzle.fen);
    const chess = chessRef.current;
    chess.move(puzzle.solutionSan);
    setDisplayFen(chess.fen());
    setRevealed(true);
  };

  const clickToMove = useClickToMove({
    getChess: () => chessRef.current ?? (puzzle ? new Chess(puzzle.fen) : new Chess()),
    isOwnPiece: (piece) => piece.pieceType.startsWith(mover),
    disabled: boardDisabled || !puzzle,
    onMove: onPieceDrop,
    boardOrientation,
  });

  useEffect(() => {
    clickToMove.clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id, boardDisabled]);

  const tierFilterSelect = (
    <select
      value={tierFilter}
      onChange={(e) => changeTierFilter(e.target.value)}
      className="min-h-9 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
    >
      <option value="all">כל הרמות</option>
      {availableTiers.map((key) => (
        <option key={key} value={key}>
          {key === 'unrated' ? 'ללא רמת קושי' : tierLabel(Number(key))}
        </option>
      ))}
    </select>
  );

  const tacticFilterSelect = availableTactics.length > 1 && (
    <select
      value={tacticFilter}
      onChange={(e) => changeTacticFilter(e.target.value)}
      className="min-h-9 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
    >
      <option value="all">כל הנושאים</option>
      {availableTactics.map((key) => (
        <option key={key} value={key}>
          {TACTIC_LABELS[key]?.icon} {TACTIC_LABELS[key]?.label || key}
        </option>
      ))}
    </select>
  );

  if (!queue.length) {
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

  if (!puzzle) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-700 bg-slate-900/80 p-6 text-center">
        <h2 className="mb-2 text-xl font-bold text-slate-100">🧩 תרגילים אישיים</h2>
        <div className="mb-3 flex justify-center gap-2">
          {tierFilterSelect}
          {tacticFilterSelect}
        </div>
        <p className="text-slate-400">אין תרגילים בסינון הזה כרגע. נסו סינון אחר, או בחרו "כל הרמות"/"כל הנושאים".</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-slate-100">🧩 תרגילים אישיים</h2>
        <div className="flex flex-wrap items-center gap-2">
          {tierFilterSelect}
          {tacticFilterSelect}
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
            תרגיל {index + 1} מתוך {filteredQueue.length} · נפתרו בסה"כ {totalSolved}
          </span>
        </div>
      </div>
      <p className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>רמת קושי: {tierLabel(puzzle.difficultyElo)}</span>
        {(puzzle.tacticTags || []).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 font-bold text-slate-300">
            {TACTIC_LABELS[tag]?.icon} {TACTIC_LABELS[tag]?.label || tag}
          </span>
        ))}
      </p>

      <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
        <div ref={boardSectionRef} className="w-full max-w-[420px] lg:flex-1">
          <div
            className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            dir="ltr"
            {...clickToMove.containerProps}
          >
            <Chessboard
              options={{
                position: displayFen ?? puzzle.fen,
                onPieceDrop: boardDisabled ? () => false : onPieceDrop,
                onSquareClick: boardDisabled ? undefined : clickToMove.onSquareClick,
                squareStyles: clickToMove.squareStyles,
                boardOrientation,
                allowDragging: !boardDisabled,
                showAnimations: false,
                darkSquareStyle: { backgroundColor: theme.dark },
                lightSquareStyle: { backgroundColor: theme.light },
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
                disabled={index >= filteredQueue.length - 1}
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
                headerText={`${getPersonaForElo(puzzle.difficultyElo).avatar} ${getPersonaForElo(puzzle.difficultyElo).name} מסביר:`}
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
