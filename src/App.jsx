import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessGame } from './hooks/useChessGame';
import { CoachPanel } from './components/CoachPanel';
import { EvalBar } from './components/EvalBar';
import { MoveHistory } from './components/MoveHistory';
import { DifficultySelector } from './components/DifficultySelector';
import { ModeTabs } from './components/ModeTabs';
import { GameReviewScreen } from './components/GameReviewScreen';
import { ChessComImport } from './components/ChessComImport';
import { GoogleAd } from './components/GoogleAd';
import { formatEval } from './lib/stockfishEngine';

const ADSENSE_SLOT_BANNER = import.meta.env.VITE_ADSENSE_SLOT_BANNER;
const ADSENSE_SLOT_SIDEBAR = import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR;

function StatusBadge({ status }) {
  const map = {
    loading: { text: 'טוען...', color: 'bg-slate-700 text-slate-300' },
    'player-turn': { text: 'תורך', color: 'bg-emerald-700 text-emerald-100' },
    evaluating: { text: 'בודק מהלך...', color: 'bg-amber-700 text-amber-100' },
    'computer-thinking': { text: 'המחשב חושב...', color: 'bg-sky-700 text-sky-100' },
    mistake: { text: 'טעות זוהתה', color: 'bg-red-800 text-red-100' },
    'game-over': { text: 'המשחק הסתיים', color: 'bg-indigo-800 text-indigo-100' },
    reviewing: { text: 'מנתח משחק...', color: 'bg-purple-800 text-purple-100' },
  };
  const item = map[status] ?? map.loading;
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.color}`}>{item.text}</span>;
}

function FreePlayPanel({ status, gameOverMessage, hasMoves, onReview, onNewGame }) {
  return (
    <aside className="flex h-full min-h-[420px] w-full flex-col rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-700 pb-3">
        <span className="text-2xl">🎯</span>
        <h2 className="text-lg font-bold text-slate-100">משחק חופשי</h2>
      </div>

      <div className="flex-1 space-y-3">
        <p className="rounded-lg bg-slate-800 p-3 text-sm text-slate-300">
          במצב הזה שחקו את המשחק כולו בלי עזרה. בסיום (או בכל שלב) תוכלו לבקש סקירה מלאה עם ניתוח כל מהלך.
        </p>

        {status === 'game-over' && (
          <div className="rounded-lg bg-indigo-900/50 p-4 text-center">
            <p className="text-base font-bold text-indigo-200">המשחק הסתיים</p>
            <p className="mt-1 text-sm text-slate-300">{gameOverMessage}</p>
          </div>
        )}

        {status === 'reviewing' && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-sm text-slate-400">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
            מנתח את המשחק, זה עשוי לקחת קצת זמן...
          </div>
        )}

        {hasMoves && status !== 'reviewing' && (
          <button
            onClick={onReview}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 font-bold text-white transition hover:bg-sky-500"
          >
            סיים משחק וקבל סקירה
          </button>
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

function PlayScreen({ mode }) {
  const {
    fen,
    moveHistory,
    status,
    difficultyElo,
    setDifficultyElo,
    currentEvalCp,
    mistake,
    gameOverMessage,
    reviewData,
    reviewProgress,
    handlePieceDrop,
    retryAfterMistake,
    resetGame,
    requestGameReview,
  } = useChessGame(mode);

  const [previewFen, setPreviewFen] = useState(null);

  if (reviewData) {
    return (
      <GameReviewScreen
        records={reviewData.records}
        summary={reviewData.summary}
        studentColor="w"
        onClose={() => resetGame(mode)}
        title="סקירת המשחק שלך"
      />
    );
  }

  const boardDisabled = status !== 'player-turn' || previewFen !== null;
  const displayFen = previewFen ?? fen;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row-reverse lg:items-start">
      <div className="flex flex-col items-center gap-3 lg:flex-1">
        <div className="flex w-full max-w-[560px] items-center justify-center gap-3">
          {mode === 'coached' && <EvalBar evalCp={currentEvalCp} />}
          <div className="relative w-full" dir="ltr">
            <Chessboard
              options={{
                position: displayFen,
                onPieceDrop: boardDisabled ? () => false : handlePieceDrop,
                boardOrientation: 'white',
                allowDragging: !boardDisabled,
                canDragPiece: ({ piece }) => !boardDisabled && piece.pieceType.startsWith('w'),
                darkSquareStyle: { backgroundColor: '#4f6f8f' },
                lightSquareStyle: { backgroundColor: '#dce6ec' },
              }}
            />
            {boardDisabled && status !== 'mistake' && status !== 'game-over' && !previewFen && (
              <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-sky-500/40" />
            )}
            {previewFen && (
              <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950" />
            )}
          </div>
        </div>

        <div className="flex w-full max-w-[560px] flex-wrap items-center justify-between gap-3">
          <StatusBadge status={status} />
          <DifficultySelector value={difficultyElo} onChange={setDifficultyElo} disabled={status === 'reviewing'} />
          {mode === 'coached' && (
            <span className="font-mono text-sm text-slate-400">הערכת עמדה: {formatEval(currentEvalCp, null)}</span>
          )}
        </div>

        {status === 'reviewing' && reviewProgress && (
          <p className="text-xs text-slate-500">
            מנתח מהלך {reviewProgress.done} מתוך {reviewProgress.total}...
          </p>
        )}

        <div className="w-full max-w-[560px]">
          <MoveHistory moves={moveHistory} />
        </div>
      </div>

      <div className="w-full lg:w-[380px]">
        {mode === 'coached' ? (
          <CoachPanel
            status={status}
            mistake={mistake}
            gameOverMessage={gameOverMessage}
            onRetry={retryAfterMistake}
            onNewGame={() => resetGame(mode)}
            onPreviewFen={setPreviewFen}
          />
        ) : (
          <FreePlayPanel
            status={status}
            gameOverMessage={gameOverMessage}
            hasMoves={moveHistory.length > 0}
            onReview={requestGameReview}
            onNewGame={() => resetGame(mode)}
          />
        )}

        <div className="mt-4 hidden sm:block">
          <GoogleAd slot={ADSENSE_SLOT_SIDEBAR} className="min-h-[250px]" />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState('coached');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-3 py-4 sm:px-4 sm:py-6" dir="rtl">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 text-center sm:mb-6">
          <h1 className="text-2xl font-extrabold text-slate-100 sm:text-3xl lg:text-4xl">מאמן השחמט שלי</h1>
          <p className="mt-1 text-sm text-slate-400 sm:text-base">
            שפרו את דירוג האלו שלכם באמצעות ניתוח טעויות בזמן אמת
          </p>
        </header>

        <div className="mb-4">
          <GoogleAd slot={ADSENSE_SLOT_BANNER} className="min-h-[50px] sm:min-h-[90px]" />
        </div>

        <ModeTabs active={mode} onChange={setMode} />

        {mode === 'import' ? <ChessComImport /> : <PlayScreen key={mode} mode={mode} />}
      </div>
    </div>
  );
}

export default App;
