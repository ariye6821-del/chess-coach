import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getAllPuzzles } from '../lib/puzzleBank';
import { getBestScore, saveBestScore, shuffled } from '../lib/puzzleRush';
import { useClickToMove } from '../hooks/useClickToMove';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { playMoveSound, playMistakeSound, playGameOverSound } from '../lib/sounds';

const DURATION_SEC = 180;
const MAX_MISSES = 3;

export function PuzzleRush() {
  const [theme] = useBoardTheme();
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [displayFen, setDisplayFen] = useState(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState(null); // 'correct' | 'wrong' | null
  const [timeLeft, setTimeLeft] = useState(DURATION_SEC);
  const [bestScore, setBestScore] = useState(getBestScore);
  const chessRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  const puzzle = phase === 'running' ? queue[index] : null;
  const totalPuzzles = getAllPuzzles().length;

  useEffect(() => {
    if (phase !== 'running') return;
    if (timeLeft <= 0) {
      finish();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  useEffect(() => {
    if (!puzzle) return;
    chessRef.current = new Chess(puzzle.fen);
    setDisplayFen(chessRef.current.fen());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id]);

  useEffect(() => () => clearTimeout(flashTimeoutRef.current), []);

  const start = () => {
    const pool = shuffled(getAllPuzzles());
    if (!pool.length) return;
    setQueue(pool);
    setIndex(0);
    setScore(0);
    setMisses(0);
    setTimeLeft(DURATION_SEC);
    setFlash(null);
    setPhase('running');
  };

  const finish = () => {
    setPhase('done');
    playGameOverSound();
    setBestScore((prev) => {
      saveBestScore(score);
      return Math.max(prev, score);
    });
  };

  const advance = () => {
    setIndex((i) => (i + 1) % Math.max(1, queue.length));
  };

  const showFlash = (kind) => {
    clearTimeout(flashTimeoutRef.current);
    setFlash(kind);
    flashTimeoutRef.current = setTimeout(() => setFlash(null), 500);
  };

  const onPieceDrop = ({ sourceSquare, targetSquare }) => {
    if (!puzzle || !targetSquare || phase !== 'running') return false;
    const chess = chessRef.current;
    let moveResult;
    try {
      moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      moveResult = null;
    }
    if (!moveResult) return false;

    if (moveResult.san === puzzle.solutionSan) {
      showFlash('correct');
      playMoveSound();
      setScore((s) => s + 1);
      advance();
      return true;
    }

    chess.undo();
    setDisplayFen(chess.fen());
    showFlash('wrong');
    playMistakeSound();
    setMisses((m) => {
      const next = m + 1;
      if (next >= MAX_MISSES) {
        setTimeout(finish, 500);
      } else {
        setTimeout(advance, 400);
      }
      return next;
    });
    return false;
  };

  const mover = puzzle ? puzzle.fen.split(' ')[1] : 'w';
  const boardOrientation = mover === 'b' ? 'black' : 'white';
  const boardDisabled = phase !== 'running';

  const clickToMove = useClickToMove({
    getChess: () => chessRef.current ?? (puzzle ? new Chess(puzzle.fen) : new Chess()),
    isOwnPiece: (piece) => piece.pieceType.startsWith(mover),
    disabled: boardDisabled,
    onMove: onPieceDrop,
    boardOrientation,
  });

  useEffect(() => {
    clickToMove.clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle?.id]);

  if (phase === 'idle') {
    return (
      <div dir="rtl" className="mx-auto max-w-2xl space-y-4 text-center">
        <h2 className="text-xl font-bold text-slate-100">⚡ Puzzle Rush</h2>
        <p className="text-sm text-slate-400">
          פתרו כמה שיותר תרגילים ב-3 דקות. 3 טעויות מסיימות את הריצה מוקדם. משך הזמן חשוב - חשבו מהר!
        </p>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-4">
          <p className="text-3xl font-extrabold text-sky-400">{bestScore}</p>
          <p className="text-xs text-slate-400">השיא שלכם</p>
        </div>
        {totalPuzzles === 0 ? (
          <p className="text-slate-500">
            עדיין אין לכם תרגילים בבנק. שחקו משחק (במצב "עם מאמן" או "משחק חופשי") כדי לצבור תרגילים, ואז חזרו לכאן.
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-500">{totalPuzzles} תרגילים זמינים בבנק שלכם</p>
            <button
              onClick={start}
              className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-lg font-bold text-white transition hover:from-sky-400 hover:to-indigo-400"
            >
              ▶ התחילו ריצה
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === 'done') {
    const isNewBest = score >= bestScore && score > 0;
    return (
      <div dir="rtl" className="mx-auto max-w-2xl space-y-4 text-center">
        <h2 className="text-xl font-bold text-slate-100">⚡ Puzzle Rush - סיום!</h2>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-6">
          <p className="text-5xl font-extrabold text-sky-400">{score}</p>
          <p className="mt-1 text-sm text-slate-400">תרגילים נפתרו</p>
          {isNewBest && <p className="mt-2 font-bold text-emerald-400">🎉 שיא חדש!</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-slate-800 p-3">
            <p className="text-lg font-bold text-slate-300">{bestScore}</p>
            <p className="text-xs text-slate-400">השיא הטוב ביותר</p>
          </div>
          <div className="rounded-lg bg-slate-800 p-3">
            <p className="text-lg font-bold text-red-400">{misses}</p>
            <p className="text-xs text-slate-400">טעויות</p>
          </div>
        </div>
        <button
          onClick={start}
          className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-lg font-bold text-white transition hover:from-sky-400 hover:to-indigo-400"
        >
          🔄 ריצה נוספת
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 px-4 py-2">
        <span className="font-mono text-lg font-bold text-slate-100">
          ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </span>
        <span className="text-sm font-bold text-emerald-400">✓ {score}</span>
        <span className="text-sm font-bold text-red-400">
          {'✗'.repeat(misses)}
          {'·'.repeat(Math.max(0, MAX_MISSES - misses))}
        </span>
      </div>

      <div
        className="relative mx-auto w-full max-w-[420px] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        dir="ltr"
        {...clickToMove.containerProps}
      >
        <Chessboard
          options={{
            position: displayFen ?? puzzle?.fen,
            onPieceDrop: boardDisabled ? () => false : onPieceDrop,
            onSquareClick: boardDisabled ? undefined : clickToMove.onSquareClick,
            squareStyles: clickToMove.squareStyles,
            boardOrientation,
            allowDragging: !boardDisabled,
            canDragPiece: ({ piece }) => !boardDisabled && piece.pieceType.startsWith(mover),
            showAnimations: false,
            darkSquareStyle: { backgroundColor: theme.dark },
            lightSquareStyle: { backgroundColor: theme.light },
          }}
        />
        {flash && (
          <div
            className={`pointer-events-none absolute inset-0 rounded-md ring-8 ${
              flash === 'correct' ? 'ring-emerald-500/70' : 'ring-red-500/70'
            }`}
          />
        )}
      </div>

      <p className="text-center text-sm text-slate-400">
        מצאו את המהלך הטוב ביותר עבור {mover === 'b' ? 'שחור' : 'לבן'}.
      </p>
    </div>
  );
}
