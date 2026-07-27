import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessGame } from '../hooks/useChessGame';
import { useClickToMove } from '../hooks/useClickToMove';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { MoveHistory } from './MoveHistory';
import { ENDGAME_LESSONS } from '../lib/endgames';

const LAST_MOVE_STYLE = { backgroundColor: 'rgba(250, 204, 21, 0.35)' };
const CHECK_STYLE = { boxShadow: 'inset 0 0 0 4px rgba(239, 68, 68, 0.85)', backgroundColor: 'rgba(239, 68, 68, 0.35)' };
const PROMOTION_CHOICES = [
  { code: 'q', label: '♛' },
  { code: 'r', label: '♜' },
  { code: 'b', label: '♝' },
  { code: 'n', label: '♞' },
];

function outcomeForLesson(chess, studentColor, objective) {
  if (chess.isCheckmate()) {
    return chess.turn() !== studentColor ? 'success' : 'fail';
  }
  if (chess.isDraw()) {
    return objective === 'not-lose' ? 'success' : 'fail';
  }
  return null;
}

export function EndgameTrainer() {
  const [activeLesson, setActiveLesson] = useState(null);

  if (!activeLesson) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100">🏁 מאמן סיומים</h2>
          <p className="mt-1 text-sm text-slate-400">בחרו תרגיל כדי לתרגל טכניקת סיום בסיסית מול היריב</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ENDGAME_LESSONS.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => setActiveLesson(lesson)}
              className="flex flex-col items-start gap-2 rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-right shadow-lg transition hover:border-sky-600 hover:bg-slate-800"
            >
              <span className="text-2xl">{lesson.icon}</span>
              <span className="font-bold text-slate-100">{lesson.name}</span>
              <span className="text-xs text-slate-400">{lesson.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <EndgameLessonPlay key={activeLesson.id} lesson={activeLesson} onExit={() => setActiveLesson(null)} />;
}

function EndgameLessonPlay({ lesson, onExit }) {
  const {
    fen,
    moveHistory,
    lastMove,
    checkSquare,
    status,
    gameOverMessage,
    handlePieceDrop,
    resolvePromotion,
    cancelPromotion,
    pendingPromotion,
    undoLastMove,
    resetGame,
    setDifficultyElo,
    getChess,
  } = useChessGame('endgame', { fen: lesson.fen, studentColor: lesson.studentColor, difficultyElo: lesson.difficultyElo });
  const [theme] = useBoardTheme();
  const [outcome, setOutcome] = useState(null);

  const tryAgain = () => {
    setDifficultyElo(lesson.difficultyElo);
    resetGame('endgame', lesson.studentColor, lesson.fen);
    setOutcome(null);
  };

  useEffect(() => {
    if (status === 'game-over') {
      setOutcome(outcomeForLesson(getChess(), lesson.studentColor, lesson.objective));
    }
  }, [status, getChess, lesson.studentColor, lesson.objective]);

  const boardDisabled = status !== 'player-turn';
  const clickToMove = useClickToMove({
    getChess,
    isOwnPiece: (piece) => piece.pieceType.startsWith(lesson.studentColor),
    disabled: boardDisabled,
    onMove: handlePieceDrop,
  });

  const lastMoveSquareStyles = lastMove ? { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE } : {};
  const checkSquareStyles = checkSquare ? { [checkSquare]: CHECK_STYLE } : {};

  return (
    <div dir="rtl" className="mx-auto flex max-w-3xl flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between gap-2">
        <button onClick={onExit} className="text-sm text-slate-400 hover:text-slate-200">
          ⬅ חזרה לרשימת התרגילים
        </button>
        <h2 className="text-lg font-bold text-slate-100">
          {lesson.icon} {lesson.name}
        </h2>
      </div>
      <p className="w-full rounded-lg bg-slate-800 p-3 text-sm text-slate-300">{lesson.description}</p>

      <div className="relative w-full max-w-[420px]" dir="ltr">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: boardDisabled ? () => false : handlePieceDrop,
            onSquareClick: boardDisabled ? undefined : clickToMove.onSquareClick,
            squareStyles: { ...lastMoveSquareStyles, ...checkSquareStyles, ...clickToMove.squareStyles },
            boardOrientation: lesson.studentColor === 'b' ? 'black' : 'white',
            allowDragging: !boardDisabled,
            canDragPiece: ({ piece }) => !boardDisabled && piece.pieceType.startsWith(lesson.studentColor),
            showAnimations: false,
            darkSquareStyle: { backgroundColor: theme.dark },
            lightSquareStyle: { backgroundColor: theme.light },
          }}
        />
        {pendingPromotion && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-slate-950/80 backdrop-blur-sm">
            <div dir="rtl" className="rounded-xl border border-slate-600 bg-slate-900 p-4 text-center shadow-xl">
              <p className="mb-3 text-sm font-bold text-slate-200">בחרו כלי לקידום החייל:</p>
              <div className="flex gap-2">
                {PROMOTION_CHOICES.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => resolvePromotion(p.code)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-2xl text-slate-100 hover:bg-slate-700"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <button onClick={cancelPromotion} className="mt-3 text-xs text-slate-400 hover:text-slate-200">
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {status === 'game-over' && (
        <div className={`w-full rounded-lg p-4 text-center ${outcome === 'success' ? 'bg-emerald-900/50' : 'bg-red-900/50'}`}>
          <p className="text-base font-bold text-slate-100">
            {outcome === 'success' ? '🎉 השלמתם את התרגיל בהצלחה!' : '❌ לא הפעם - נסו שוב'}
          </p>
          <p className="mt-1 text-sm text-slate-300">{gameOverMessage}</p>
        </div>
      )}

      <div className="flex w-full gap-2">
        {moveHistory.length >= 2 && status === 'player-turn' && (
          <button
            onClick={undoLastMove}
            className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            ↩️ בטל מהלך
          </button>
        )}
        <button
          onClick={tryAgain}
          className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-500"
        >
          🔄 נסו שוב מההתחלה
        </button>
      </div>

      <div className="w-full">
        <MoveHistory moves={moveHistory} />
      </div>
    </div>
  );
}
