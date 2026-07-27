import { useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessGame } from './hooks/useChessGame';
import { useClickToMove } from './hooks/useClickToMove';
import { CoachPanel } from './components/CoachPanel';
import { EvalBar } from './components/EvalBar';
import { MoveHistory } from './components/MoveHistory';
import { DifficultySelector } from './components/DifficultySelector';
import { PlayerColorSelector } from './components/PlayerColorSelector';
import { ModeTabs } from './components/ModeTabs';
import { GameReviewScreen } from './components/GameReviewScreen';
import { ChessComImport } from './components/ChessComImport';
import { PuzzleTrainer } from './components/PuzzleTrainer';
import { EndgameTrainer } from './components/EndgameTrainer';
import { RatingTracker } from './components/RatingTracker';
import { DailyChallenge } from './components/DailyChallenge';
import { Achievements } from './components/Achievements';
import { GoogleAd } from './components/GoogleAd';
import { BoardThemeSelector } from './components/BoardThemeSelector';
import { SoundToggle } from './components/SoundToggle';
import { LiveCoachTip } from './components/LiveCoachTip';
import { TrainingPlanScreen } from './components/TrainingPlanScreen';
import { Onboarding } from './components/Onboarding';
import { PuzzleRush } from './components/PuzzleRush';
import { BackupScreen } from './components/BackupScreen';
import { RepertoireTrainer } from './components/RepertoireTrainer';
import { PositionAnalysis } from './components/PositionAnalysis';
import { OnlineMultiplayer } from './components/OnlineMultiplayer';
import { hasOnboarded } from './lib/trainingPlan';
import { useBoardTheme } from './hooks/useBoardTheme';
import { formatEval } from './lib/stockfishEngine';
import { sanForUci } from './lib/gameAnalysis';
import { downloadPgn } from './lib/pgnExport';
import { identifyOpening } from './lib/openings';
import { TimeControlSelector, formatClock } from './components/TimeControlSelector';

const ADSENSE_SLOT_BANNER = import.meta.env.VITE_ADSENSE_SLOT_BANNER;
const ADSENSE_SLOT_SIDEBAR = import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR;
const LAST_MOVE_STYLE = { backgroundColor: 'rgba(250, 204, 21, 0.35)' };
const CHECK_STYLE = { boxShadow: 'inset 0 0 0 4px rgba(239, 68, 68, 0.85)', backgroundColor: 'rgba(239, 68, 68, 0.35)' };
const HINT_STYLE = { boxShadow: 'inset 0 0 0 4px rgba(34, 197, 94, 0.85)' };
const BUSY_STATUSES = ['loading', 'evaluating', 'computer-thinking', 'reviewing'];
const PROMOTION_PIECES = [
  { code: 'q', label: 'מלכה', white: '♕', black: '♛' },
  { code: 'r', label: 'צריח', white: '♖', black: '♜' },
  { code: 'b', label: 'רץ', white: '♗', black: '♝' },
  { code: 'n', label: 'פרש', white: '♘', black: '♞' },
];

function materialLabel(materialBalance, studentColor) {
  const studentDiff = studentColor === 'w' ? materialBalance : -materialBalance;
  if (studentDiff === 0) return 'יתרון חומרי: שווה';
  return `יתרון חומרי: ${studentDiff > 0 ? '+' : ''}${studentDiff}`;
}

function PromotionPicker({ studentColor, onChoose, onCancel }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-slate-950/80 backdrop-blur-sm">
      <div dir="rtl" className="rounded-xl border border-slate-600 bg-slate-900 p-4 text-center shadow-xl">
        <p className="mb-3 text-sm font-bold text-slate-200">בחרו כלי לקידום החייל:</p>
        <div className="flex gap-2">
          {PROMOTION_PIECES.map((p) => (
            <button
              key={p.code}
              onClick={() => onChoose(p.code)}
              className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-3xl text-slate-100 hover:bg-slate-700"
              title={p.label}
            >
              {studentColor === 'b' ? p.black : p.white}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-3 text-xs text-slate-400 hover:text-slate-200">
          ביטול
        </button>
      </div>
    </div>
  );
}

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

function FreePlayPanel({ status, gameOverMessage, hasMoves, canUndo, onReview, onNewGame, onUndo, onResign, onOfferDraw, mode }) {
  const isFriend = mode === 'friend';
  return (
    <aside className="flex h-full min-h-[420px] w-full flex-col rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm ring-1 ring-white/5 p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-700 pb-3">
        <span className="text-2xl">{isFriend ? '🧑‍🤝‍🧑' : '🎯'}</span>
        <h2 className="text-lg font-bold text-slate-100">{isFriend ? 'מול חבר' : 'משחק חופשי'}</h2>
      </div>

      <div className="flex-1 space-y-3">
        <p className="rounded-lg bg-slate-800 p-3 text-sm text-slate-300">
          {isFriend
            ? 'שני שחקנים על אותו מכשיר, בלי מנוע יריב - העבירו את המכשיר ביניכם בכל תור. בסיום תוכלו לבקש סקירה.'
            : 'במצב הזה שחקו את המשחק כולו בלי עזרה. בסיום (או בכל שלב) תוכלו לבקש סקירה מלאה עם ניתוח כל מהלך.'}
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

        {canUndo && status === 'player-turn' && (
          <button
            onClick={onUndo}
            className="w-full rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            ↩️ בטל מהלך
          </button>
        )}

        {hasMoves && status === 'player-turn' && (
          <div className="flex gap-2">
            <button
              onClick={onResign}
              className="flex-1 rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-950/40"
            >
              🏳️ התפטרות
            </button>
            {isFriend && (
              <button
                onClick={onOfferDraw}
                className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
              >
                🤝 הצע תיקו
              </button>
            )}
          </div>
        )}

        {hasMoves && status !== 'reviewing' && (
          <button
            onClick={onReview}
            className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white transition hover:from-sky-400 hover:to-indigo-400"
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
    plyFens,
    lastMove,
    checkSquare,
    materialBalance,
    pendingPromotion,
    status,
    studentColor,
    setStudentColor,
    difficultyElo,
    setDifficultyElo,
    currentEvalCp,
    bestMoveUci,
    timeControl,
    setTimeControl,
    whiteTimeMs,
    blackTimeMs,
    wasResumed,
    dismissResumeNotice,
    mistake,
    gameOverMessage,
    reviewData,
    reviewProgress,
    handlePieceDrop,
    resolvePromotion,
    cancelPromotion,
    undoLastMove,
    retryAfterMistake,
    resign,
    offerDraw,
    resetGame,
    requestGameReview,
    getChess,
  } = useChessGame(mode);

  const [theme] = useBoardTheme();
  const [previewFen, setPreviewFen] = useState(null);
  const [selectedPly, setSelectedPly] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const boardDisabled = status !== 'player-turn' || previewFen !== null;
  const boardSectionRef = useRef(null);
  const requestHint = () => setHintLevel((l) => Math.min(2, l + 1));

  const handlePreviewFen = (previewedFen) => {
    setPreviewFen(previewedFen);
    if (previewedFen) boardSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSelectPly = (ply) => {
    setSelectedPly(ply);
    handlePreviewFen(ply == null ? null : plyFens[ply]);
  };

  const boardOrientation = (mode === 'friend' ? fen.split(' ')[1] : studentColor) === 'b' ? 'black' : 'white';
  const clickToMove = useClickToMove({
    getChess,
    isOwnPiece: (piece) => piece.pieceType.startsWith(mode === 'friend' ? fen.split(' ')[1] : studentColor),
    disabled: boardDisabled,
    onMove: handlePieceDrop,
    boardOrientation,
  });

  useEffect(() => {
    clickToMove.clearSelection();
    setSelectedPly(null);
    setHintLevel(0);
    setPreviewFen(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  if (reviewData) {
    return (
      <GameReviewScreen
        records={reviewData.records}
        summary={reviewData.summary}
        studentColor={studentColor}
        onClose={() => resetGame(mode)}
        title="סקירת המשחק שלך"
        playerElo={difficultyElo}
        resultLabel={gameOverMessage}
      />
    );
  }

  const displayFen = previewFen ?? fen;
  const lastMoveSquareStyles = lastMove
    ? { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE }
    : {};
  const checkSquareStyles = checkSquare ? { [checkSquare]: CHECK_STYLE } : {};
  const hintSource = bestMoveUci ? bestMoveUci.slice(0, 2) : null;
  const hintTarget = bestMoveUci ? bestMoveUci.slice(2, 4) : null;
  const hintSquareStyles = {};
  if (hintLevel >= 1 && hintSource) hintSquareStyles[hintSource] = HINT_STYLE;
  if (hintLevel >= 2 && hintTarget) hintSquareStyles[hintTarget] = HINT_STYLE;
  const hintSan = hintLevel >= 2 && bestMoveUci ? sanForUci(fen, bestMoveUci) : null;
  const openingName = identifyOpening(moveHistory);
  const currentTurn = fen.split(' ')[1];
  const opponentColor = studentColor === 'w' ? 'b' : 'w';
  const studentTimeMs = studentColor === 'w' ? whiteTimeMs : blackTimeMs;
  const opponentTimeMs = studentColor === 'w' ? blackTimeMs : whiteTimeMs;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row-reverse lg:items-start">
      <div ref={boardSectionRef} className="flex flex-col items-center gap-3 lg:flex-1">
        {wasResumed && (
          <div className="flex w-full max-w-[560px] items-center justify-between gap-2 rounded-lg border border-sky-700 bg-sky-950/40 px-3 py-2 text-sm text-sky-200">
            <span>🔄 המשך המשחק שהתחלתם קודם</span>
            <button onClick={dismissResumeNotice} className="text-xs font-bold text-sky-400 hover:text-sky-300">
              סגור
            </button>
          </div>
        )}
        {mode === 'coached' && (
          <LiveCoachTip playerElo={difficultyElo} plyCount={moveHistory.length} fen={fen} studentColor={studentColor} />
        )}
        <div className="flex w-full max-w-[560px] items-center justify-center gap-3">
          {mode === 'coached' && <EvalBar evalCp={currentEvalCp} perspective={studentColor} />}
          <div
            className="relative w-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            dir="ltr"
            {...clickToMove.containerProps}
          >
            <Chessboard
              options={{
                position: displayFen,
                onPieceDrop: boardDisabled ? () => false : handlePieceDrop,
                onSquareClick: boardDisabled ? undefined : clickToMove.onSquareClick,
                squareStyles: { ...lastMoveSquareStyles, ...checkSquareStyles, ...hintSquareStyles, ...clickToMove.squareStyles },
                boardOrientation,
                allowDragging: !boardDisabled,
                canDragPiece: ({ piece }) =>
                  !boardDisabled && piece.pieceType.startsWith(mode === 'friend' ? currentTurn : studentColor),
                showAnimations: false,
                darkSquareStyle: { backgroundColor: theme.dark },
                lightSquareStyle: { backgroundColor: theme.light },
              }}
            />
            {boardDisabled && status !== 'mistake' && status !== 'game-over' && !previewFen && (
              <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-sky-500/40" />
            )}
            {status === 'mistake' && !previewFen && (
              <div
                dir="rtl"
                className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-md ring-2 ring-amber-500/60"
              >
                <span className="mb-2 rounded-full bg-amber-950/90 px-3 py-1 text-xs font-bold text-amber-300 shadow-lg">
                  🔒 לחצו "נסה שוב" בפאנל המאמן כדי להמשיך
                </span>
              </div>
            )}
            {previewFen && (
              <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950" />
            )}
            {pendingPromotion && (
              <PromotionPicker studentColor={studentColor} onChoose={resolvePromotion} onCancel={cancelPromotion} />
            )}
          </div>
        </div>

        <div className="flex w-full max-w-[560px] flex-wrap items-center justify-between gap-3">
          <StatusBadge status={status} />
          {mode !== 'friend' && (
            <>
              <PlayerColorSelector value={studentColor} onChange={setStudentColor} disabled={BUSY_STATUSES.includes(status)} />
              <DifficultySelector value={difficultyElo} onChange={setDifficultyElo} disabled={BUSY_STATUSES.includes(status)} />
            </>
          )}
          <TimeControlSelector value={timeControl} onChange={setTimeControl} disabled={moveHistory.length > 0} />
          <span className="text-sm text-slate-400">{materialLabel(materialBalance, studentColor)}</span>
          {mode === 'coached' && (
            <span className="font-mono text-sm text-slate-400">הערכת עמדה: {formatEval(currentEvalCp, null)}</span>
          )}
        </div>

        {timeControl && mode === 'friend' && (
          <div className="flex w-full max-w-[560px] items-center justify-between gap-3 font-mono text-sm">
            <span className={`rounded-md px-2 py-1 ${currentTurn === 'b' ? 'bg-sky-800 text-sky-100' : 'text-slate-400'}`}>
              ⏱ שחור: {formatClock(blackTimeMs)}
            </span>
            <span className={`rounded-md px-2 py-1 ${currentTurn === 'w' ? 'bg-emerald-800 text-emerald-100' : 'text-slate-400'}`}>
              ⏱ לבן: {formatClock(whiteTimeMs)}
            </span>
          </div>
        )}
        {timeControl && mode !== 'friend' && (
          <div className="flex w-full max-w-[560px] items-center justify-between gap-3 font-mono text-sm">
            <span
              className={`rounded-md px-2 py-1 ${currentTurn === opponentColor ? 'bg-sky-800 text-sky-100' : 'text-slate-400'}`}
            >
              ⏱ יריב: {formatClock(opponentTimeMs)}
            </span>
            <span
              className={`rounded-md px-2 py-1 ${currentTurn === studentColor ? 'bg-emerald-800 text-emerald-100' : 'text-slate-400'}`}
            >
              ⏱ אתה: {formatClock(studentTimeMs)}
            </span>
          </div>
        )}

        {status === 'reviewing' && reviewProgress && (
          <p className="text-xs text-slate-500">
            מנתח מהלך {reviewProgress.done} מתוך {reviewProgress.total}...
          </p>
        )}

        {openingName && (
          <p className="w-full max-w-[560px] text-xs text-slate-500">
            פתיחה: <span className="font-bold text-slate-400">{openingName}</span>
          </p>
        )}

        <div className="w-full max-w-[560px]">
          <MoveHistory moves={moveHistory} onSelectPly={handleSelectPly} selectedPly={selectedPly} />
        </div>

        {moveHistory.length > 0 && (
          <button
            onClick={() => downloadPgn(getChess().pgn(), 'chess-coach-game.pgn')}
            className="w-full max-w-[560px] rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800"
          >
            ⬇️ הורד את המשחק כקובץ PGN
          </button>
        )}
      </div>

      <div className="w-full lg:w-[380px]">
        {mode === 'coached' ? (
          <CoachPanel
            status={status}
            mistake={mistake}
            gameOverMessage={gameOverMessage}
            hasMoves={moveHistory.length > 0}
            onRetry={() => {
              setPreviewFen(null);
              retryAfterMistake();
            }}
            onNewGame={() => {
              setPreviewFen(null);
              resetGame(mode);
            }}
            onRequestReview={requestGameReview}
            onResign={resign}
            onPreviewFen={handlePreviewFen}
            playerElo={difficultyElo}
            hintLevel={hintLevel}
            onHint={bestMoveUci ? requestHint : undefined}
            hintSan={hintSan}
            fen={fen}
            moveHistorySan={moveHistory}
            studentColor={studentColor}
          />
        ) : (
          <FreePlayPanel
            status={status}
            gameOverMessage={gameOverMessage}
            hasMoves={moveHistory.length > 0}
            canUndo={mode === 'friend' ? moveHistory.length > 0 : moveHistory.length >= 2}
            onReview={requestGameReview}
            onNewGame={() => {
              setPreviewFen(null);
              resetGame(mode);
            }}
            onUndo={undoLastMove}
            onResign={resign}
            onOfferDraw={offerDraw}
            mode={mode}
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
  const [showOnboarding, setShowOnboarding] = useState(() => !hasOnboarded());

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 px-3 py-4 sm:px-4 sm:py-6" dir="rtl">
      {showOnboarding && (
        <Onboarding
          onClose={() => setShowOnboarding(false)}
          onNavigate={(tab) => {
            setMode(tab);
            setShowOnboarding(false);
          }}
        />
      )}
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-xl shadow-lg shadow-sky-900/40 sm:h-11 sm:w-11 sm:text-2xl lg:h-12 lg:w-12">
                ♞
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-extrabold leading-tight text-slate-100 sm:text-xl lg:text-2xl">
                  מאמן השחמט שלי
                </h1>
                <p className="hidden text-xs text-slate-400 sm:block sm:text-sm">שפרו את דירוג האלו שלכם בזמן אמת</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <SoundToggle />
              <BoardThemeSelector />
            </div>
          </div>
        </header>

        <div className="mb-4">
          <GoogleAd slot={ADSENSE_SLOT_BANNER} className="min-h-[50px] sm:min-h-[90px]" />
        </div>

        <ModeTabs active={mode} onChange={setMode} />

        <div key={mode} className="animate-fade-in-up">
          {mode === 'daily' ? (
            <DailyChallenge key="daily" />
          ) : mode === 'import' ? (
            <ChessComImport />
          ) : mode === 'puzzles' ? (
            <PuzzleTrainer key="puzzles" />
          ) : mode === 'rush' ? (
            <PuzzleRush key="rush" />
          ) : mode === 'backup' ? (
            <BackupScreen key="backup" />
          ) : mode === 'analysis' ? (
            <PositionAnalysis key="analysis" />
          ) : mode === 'online' ? (
            <OnlineMultiplayer key="online" />
          ) : mode === 'endgames' ? (
            <EndgameTrainer key="endgames" />
          ) : mode === 'repertoire' ? (
            <RepertoireTrainer key="repertoire" />
          ) : mode === 'rating' ? (
            <RatingTracker key="rating" />
          ) : mode === 'achievements' ? (
            <Achievements key="achievements" />
          ) : mode === 'plan' ? (
            <TrainingPlanScreen key="plan" onNavigate={setMode} />
          ) : (
            <PlayScreen key={mode} mode={mode} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
