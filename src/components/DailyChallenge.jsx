import { useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useClickToMove } from '../hooks/useClickToMove';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { getDailyPuzzle, getStreak, hasSolvedToday, recordDailySolve } from '../lib/dailyChallenge';
import { playMoveSound, playGameOverSound, playMistakeSound } from '../lib/sounds';

export function DailyChallenge() {
  const puzzle = useRef(getDailyPuzzle()).current;
  const chessRef = useRef(new Chess(puzzle.fen));
  const [displayFen, setDisplayFen] = useState(puzzle.fen);
  const [result, setResult] = useState(hasSolvedToday() ? 'correct' : null);
  const [revealed, setRevealed] = useState(false);
  const [streak, setStreak] = useState(getStreak());
  const [theme] = useBoardTheme();

  const mover = puzzle.fen.split(' ')[1];
  const boardOrientation = mover === 'b' ? 'black' : 'white';
  const boardDisabled = result === 'correct' || revealed;

  const onPieceDrop = ({ sourceSquare, targetSquare }) => {
    if (!targetSquare || boardDisabled) return false;
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
      setDisplayFen(chess.fen());
      playGameOverSound();
      setStreak(recordDailySolve());
      return true;
    }

    playMistakeSound();
    setResult('wrong');
    chess.undo();
    setDisplayFen(chess.fen());
    return false;
  };

  const showSolution = () => {
    chessRef.current.move(puzzle.solutionSan);
    setDisplayFen(chessRef.current.fen());
    playMoveSound();
    setRevealed(true);
  };

  const clickToMove = useClickToMove({
    getChess: () => chessRef.current,
    isOwnPiece: (piece) => piece.pieceType.startsWith(mover),
    disabled: boardDisabled,
    onMove: onPieceDrop,
    boardOrientation,
  });

  return (
    <div dir="rtl" className="mx-auto flex max-w-3xl flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-100">🗓️ חידת היום</h2>
        <p className="mt-1 text-sm text-slate-400">{puzzle.description}</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-slate-800 p-3">
          <p className="text-2xl font-bold text-amber-400">🔥 {streak.currentStreak}</p>
          <p className="text-xs text-slate-400">רצף ימים נוכחי</p>
        </div>
        <div className="rounded-lg bg-slate-800 p-3">
          <p className="text-2xl font-bold text-slate-300">🏆 {streak.longestStreak}</p>
          <p className="text-xs text-slate-400">השיא שלכם</p>
        </div>
      </div>

      <div
        className="relative w-full max-w-[420px] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        dir="ltr"
        {...clickToMove.containerProps}
      >
        <Chessboard
          options={{
            position: displayFen,
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
      </div>

      {result === 'correct' && (
        <div className="w-full rounded-lg bg-emerald-900/50 p-4 text-center">
          <p className="text-base font-bold text-emerald-200">🎉 פתרתם את חידת היום!</p>
          <p className="mt-1 text-sm text-slate-300">
            הפתרון: <span className="font-mono">{puzzle.solutionSan}</span> - חזרו מחר לחידה חדשה כדי לשמור על הרצף.
          </p>
        </div>
      )}

      {result === 'wrong' && !revealed && (
        <div className="w-full rounded-lg bg-red-900/40 p-3 text-center text-sm text-red-200">
          לא בדיוק - נסו מהלך אחר.
        </div>
      )}

      {revealed && result !== 'correct' && (
        <div className="w-full rounded-lg bg-slate-800 p-3 text-center text-sm text-slate-300">
          הפתרון: <span className="font-mono font-bold text-sky-400">{puzzle.solutionSan}</span>
        </div>
      )}

      {result !== 'correct' && !revealed && (
        <button
          onClick={showSolution}
          className="w-full max-w-[420px] rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
        >
          💡 גלו את הפתרון
        </button>
      )}
    </div>
  );
}
