import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useClickToMove } from '../hooks/useClickToMove';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { REPERTOIRE_LINES } from '../lib/repertoire';
import { getLineProgress, isLineDue, markLineResult } from '../lib/repertoireProgress';
import { playMoveSound, playCaptureSound, playCheckSound, playMistakeSound, playGameOverSound } from '../lib/sounds';

function isStudentTurn(idx, studentColor) {
  return (idx % 2 === 0 ? 'w' : 'b') === studentColor;
}

function playMoveResultSound(chess, moveResult) {
  if (chess.inCheck()) playCheckSound();
  else if (moveResult?.captured) playCaptureSound();
  else playMoveSound();
}

export function RepertoireTrainer() {
  const [activeLine, setActiveLine] = useState(null);

  if (!activeLine) {
    return (
      <div dir="rtl" className="mx-auto max-w-3xl space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100">📖 אימון פתיחות</h2>
          <p className="mt-1 text-sm text-slate-400">
            בחרו קו פתיחה לתרגול - קווים שלא תרגלתם לאחרונה או שטעיתם בהם מסומנים "לתרגול".
          </p>
        </div>
        {['w', 'b'].map((color) => (
          <div key={color}>
            <h3 className="mb-2 text-sm font-bold text-slate-400">
              {color === 'w' ? '⚪ פתיחות בתור לבן' : '⚫ הגנות בתור שחור'}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {REPERTOIRE_LINES.filter((l) => l.studentColor === color).map((line) => {
                const progress = getLineProgress(line.id);
                const due = isLineDue(line.id);
                return (
                  <button
                    key={line.id}
                    onClick={() => setActiveLine(line)}
                    className="flex flex-col items-start gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-4 text-right shadow-lg transition hover:border-sky-600 hover:bg-slate-800"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-bold text-slate-100">{line.name}</span>
                      {due && progress.attempts > 0 && (
                        <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-bold text-amber-300">
                          לתרגול
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{line.description}</span>
                    {progress.attempts > 0 && (
                      <span className="text-xs text-slate-500">
                        קופסה {progress.box}/5 · {progress.attempts} ניסיונות
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <LineDrill key={activeLine.id} line={activeLine} onExit={() => setActiveLine(null)} />;
}

function LineDrill({ line, onExit }) {
  const [theme] = useBoardTheme();
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [stepIndex, setStepIndex] = useState(0);
  const [hadMistake, setHadMistake] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const [revealedMove, setRevealedMove] = useState(null);
  const [lastExplained, setLastExplained] = useState(null);

  const studentTurnNow = isStudentTurn(stepIndex, line.studentColor);

  // Auto-plays the opponent's scripted "book" replies whenever it's not the
  // student's turn, and records the result once the whole line has been played.
  useEffect(() => {
    if (done) return;
    if (stepIndex >= line.moves.length) {
      setDone(true);
      playGameOverSound();
      markLineResult(line.id, !hadMistake);
      return;
    }
    if (!isStudentTurn(stepIndex, line.studentColor)) {
      const t = setTimeout(() => {
        const entry = line.moves[stepIndex];
        const moveResult = chessRef.current.move(entry.san);
        playMoveResultSound(chessRef.current, moveResult);
        setFen(chessRef.current.fen());
        setLastExplained({ san: entry.san, explain: entry.explain, byStudent: false });
        setStepIndex((i) => i + 1);
      }, 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, done]);

  const onPieceDrop = ({ sourceSquare, targetSquare }) => {
    if (done || !studentTurnNow || revealedMove || !targetSquare) return false;
    const chess = chessRef.current;
    let moveResult;
    try {
      moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      moveResult = null;
    }
    if (!moveResult) return false;

    const entry = line.moves[stepIndex];
    if (moveResult.san === entry.san) {
      setFeedback(null);
      setFen(chess.fen());
      playMoveResultSound(chess, moveResult);
      setLastExplained({ san: entry.san, explain: entry.explain, byStudent: true });
      setStepIndex((i) => i + 1);
      return true;
    }

    chess.undo();
    setFen(chess.fen());
    setHadMistake(true);
    setFeedback('wrong');
    playMistakeSound();
    return false;
  };

  const reveal = () => {
    setRevealedMove(line.moves[stepIndex]);
    setHadMistake(true);
    setFeedback(null);
  };

  const continueAfterReveal = () => {
    const entry = line.moves[stepIndex];
    const moveResult = chessRef.current.move(entry.san);
    playMoveResultSound(chessRef.current, moveResult);
    setFen(chessRef.current.fen());
    setLastExplained({ san: entry.san, explain: entry.explain, byStudent: true });
    setStepIndex((i) => i + 1);
    setRevealedMove(null);
  };

  const restart = () => {
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    setStepIndex(0);
    setHadMistake(false);
    setFeedback(null);
    setDone(false);
    setRevealedMove(null);
    setLastExplained(null);
  };

  const boardDisabled = done || !studentTurnNow || !!revealedMove;

  const boardOrientation = line.studentColor === 'b' ? 'black' : 'white';
  const clickToMove = useClickToMove({
    getChess: () => chessRef.current,
    isOwnPiece: (piece) => piece.pieceType.startsWith(line.studentColor),
    disabled: boardDisabled,
    onMove: onPieceDrop,
    boardOrientation,
  });

  return (
    <div dir="rtl" className="mx-auto flex max-w-3xl flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <button onClick={onExit} className="text-sm text-slate-400 hover:text-slate-200">
          ⬅ חזרה לרשימה
        </button>
        <h2 className="text-lg font-bold text-slate-100">{line.name}</h2>
      </div>
      <p className="w-full rounded-lg bg-slate-800 p-3 text-sm text-slate-300">{line.description}</p>

      <div
        className="w-full max-w-[420px] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        dir="ltr"
        {...clickToMove.containerProps}
      >
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: boardDisabled ? () => false : onPieceDrop,
            onSquareClick: boardDisabled ? undefined : clickToMove.onSquareClick,
            squareStyles: clickToMove.squareStyles,
            boardOrientation,
            allowDragging: !boardDisabled,
            canDragPiece: ({ piece }) => !boardDisabled && piece.pieceType.startsWith(line.studentColor),
            showAnimations: false,
            darkSquareStyle: { backgroundColor: theme.dark },
            lightSquareStyle: { backgroundColor: theme.light },
          }}
        />
      </div>

      {feedback === 'wrong' && !revealedMove && (
        <p className="w-full rounded-lg bg-red-900/40 p-3 text-center text-sm text-red-200">
          לא בדיוק - נסו שוב, או בקשו רמז.
        </p>
      )}

      {revealedMove && (
        <div className="w-full space-y-2 rounded-lg bg-slate-800 p-3 text-center text-sm text-slate-300">
          <p>
            המהלך הנכון: <span className="font-mono font-bold text-sky-400">{revealedMove.san}</span>
          </p>
          {revealedMove.explain && (
            <p className="text-right text-xs leading-relaxed text-slate-400">{revealedMove.explain}</p>
          )}
          <button
            onClick={continueAfterReveal}
            className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white transition hover:from-sky-400 hover:to-indigo-400"
          >
            המשיכו
          </button>
        </div>
      )}

      {!revealedMove && lastExplained && (
        <div className="w-full rounded-lg border border-sky-900/50 bg-sky-950/30 p-3 text-right text-sm text-slate-300">
          <p className="mb-1 text-xs font-bold text-sky-400">
            🧑‍🏫 המאמן מסביר על {lastExplained.san} {lastExplained.byStudent ? '(המהלך שלכם)' : '(מהלך היריב)'}:
          </p>
          <p className="leading-relaxed">{lastExplained.explain}</p>
        </div>
      )}

      {done && (
        <div className={`w-full rounded-lg p-4 text-center ${hadMistake ? 'bg-amber-900/40' : 'bg-emerald-900/50'}`}>
          <p className="text-base font-bold text-slate-100">
            {hadMistake ? '👍 סיימתם את הקו - תרגלו שוב כדי לשפר' : '🎉 קו מושלם, ללא טעויות!'}
          </p>
        </div>
      )}

      <div className="flex w-full gap-2">
        {!done && !revealedMove && studentTurnNow && (
          <button
            onClick={reveal}
            className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            💡 הראו לי את המהלך
          </button>
        )}
        <button
          onClick={restart}
          className="flex-1 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-bold text-white transition hover:from-sky-400 hover:to-indigo-400"
        >
          🔄 התחילו מחדש
        </button>
      </div>
    </div>
  );
}
