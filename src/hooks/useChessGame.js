import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { StockfishEngine } from '../lib/stockfishEngine';
import { getCoachExplanation } from '../lib/coachApi';
import { isWeakTier, pickWeightedMove, randomMoveProbability } from '../lib/difficulty';
import {
  buildContinuation,
  sanForUci,
  uciToMoveInput,
  analyzeGameFromMoves,
  summarizeGame,
  classifyMove,
  materialDiff,
  kingInCheckSquare,
} from '../lib/gameAnalysis';
import { addPuzzle, addPuzzlesFromRecords } from '../lib/puzzleBank';
import { saveActiveGame, loadActiveGame, clearActiveGame } from '../lib/gameSave';
import { playMoveSound, playCaptureSound, playCheckSound, playMistakeSound, playGameOverSound } from '../lib/sounds';
import { recordGameResult, studentResultFromGame } from '../lib/rating';

const MISTAKE_THRESHOLD_CP = 150; // 1.5 pawns
const PLAYER_ANALYSIS_DEPTH = 14;
const COMPUTER_MOVE_DEPTH = 12;
const WEAK_MOVE_DEPTH = 6;
const REVIEW_DEPTH = 11;
const CONTINUATION_PLIES = 6;

function formatCp(cp) {
  const pawns = (cp / 100).toFixed(2);
  return cp >= 0 ? `+${pawns}` : pawns;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A minimum "thinking" pause before the computer's move lands on the board -
 * without this, low-depth/weak-tier replies can resolve near-instantly, which
 * feels robotic rather than like an actual opponent considering the position.
 */
function minThinkTimeMs(elo) {
  const base = elo == null || elo >= 1600 ? 900 : elo >= 1000 ? 700 : 500;
  return base + Math.random() * 500;
}

function gameOverReason(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? 'שחור ניצח בשח-מט' : 'לבן ניצח בשח-מט';
  if (chess.isStalemate()) return 'תיקו - פט';
  if (chess.isThreefoldRepetition()) return 'תיקו - שלוש חזרות על אותה עמדה';
  if (chess.isDrawByFiftyMoves()) return 'תיקו - חוק 50 המהלכים';
  if (chess.isInsufficientMaterial()) return 'תיקו - אין מספיק כלים למט';
  if (chess.isDraw()) return 'תיקו';
  return null;
}

function playMoveResultSound(chess, moveResult) {
  if (chess.inCheck()) playCheckSound();
  else if (moveResult?.captured) playCaptureSound();
  else playMoveSound();
}

async function selectComputerMove(opponentEngine, fen, elo) {
  if (isWeakTier(elo)) {
    if (Math.random() < randomMoveProbability(elo)) {
      const chess = new Chess(fen);
      const legalMoves = chess.moves({ verbose: true });
      if (legalMoves.length) {
        const mv = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        return `${mv.from}${mv.to}${mv.promotion || ''}`;
      }
    }
    const candidates = await opponentEngine.analyzeMultiPv(fen, { depth: WEAK_MOVE_DEPTH, multiPv: 5 });
    const picked = pickWeightedMove(candidates, elo);
    return picked?.moveUci ?? null;
  }
  const result = await opponentEngine.analyze(fen, { depth: COMPUTER_MOVE_DEPTH });
  return result.bestMoveUci;
}

export function useChessGame(initialMode = 'coached', initialOptions = {}) {
  const { fen: initialFen, studentColor: initialStudentColor, difficultyElo: initialDifficultyElo } = initialOptions;
  const chessRef = useRef(initialFen ? new Chess(initialFen) : new Chess());
  const analysisEngineRef = useRef(null); // always full strength - objective truth
  const opponentEngineRef = useRef(null); // configured to the chosen difficulty
  const baselineRef = useRef({ evalCp: 0, bestMoveUci: null });
  const difficultyRef = useRef(initialDifficultyElo ?? null); // null = max strength
  const modeRef = useRef(initialMode);
  const studentColorRef = useRef(initialStudentColor ?? 'w');
  // A custom starting position (e.g. a specific endgame lesson) needs its own
  // save slot - otherwise every position sharing the same mode (all endgame
  // drills use mode 'endgame') would clobber each other's in-progress save.
  const saveKeyRef = useRef(initialFen ? `${initialMode}::${initialFen}` : initialMode);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moveHistory, setMoveHistory] = useState([]);
  const [plyFens, setPlyFens] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [checkSquare, setCheckSquare] = useState(null);
  const [materialBalance, setMaterialBalance] = useState(0);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [status, setStatus] = useState('loading');
  const [mode, setModeState] = useState(initialMode);
  const [studentColor, setStudentColorState] = useState(studentColorRef.current);
  const [difficultyElo, setDifficultyEloState] = useState(difficultyRef.current);
  const [currentEvalCp, setCurrentEvalCp] = useState(0);
  const [bestMoveUci, setBestMoveUci] = useState(null);
  const [mistake, setMistake] = useState(null);
  const [gameOverMessage, setGameOverMessage] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [reviewProgress, setReviewProgress] = useState(null);
  const [wasResumed, setWasResumed] = useState(false);
  const timeControlRef = useRef(null); // null = no clock, or { initialMs }
  const [timeControl, setTimeControlState] = useState(null);
  const [whiteTimeMs, setWhiteTimeMs] = useState(null);
  const [blackTimeMs, setBlackTimeMs] = useState(null);

  useEffect(() => {
    const analysisEngine = new StockfishEngine();
    const opponentEngine = new StockfishEngine();
    analysisEngineRef.current = analysisEngine;
    opponentEngineRef.current = opponentEngine;

    const saved = loadActiveGame(saveKeyRef.current);
    if (saved?.pgn) {
      try {
        const restored = new Chess();
        restored.loadPgn(saved.pgn);
        if (restored.history().length) {
          chessRef.current = restored;
          studentColorRef.current = saved.studentColor ?? 'w';
          setStudentColorState(studentColorRef.current);
          difficultyRef.current = saved.difficultyElo ?? null;
          setDifficultyEloState(difficultyRef.current);
          setWasResumed(true);
        }
      } catch {
        // corrupt/incompatible save - just start a fresh game
      }
    }

    Promise.all([analysisEngine.init(), opponentEngine.init()]).then(async () => {
      opponentEngine.setStrength(difficultyRef.current);
      syncFromChess();
      const baseline = await analysisEngine.analyze(chessRef.current.fen(), { depth: PLAYER_ANALYSIS_DEPTH });
      baselineRef.current = { evalCp: baseline.evalCp, bestMoveUci: baseline.bestMoveUci };
      setCurrentEvalCp(baseline.evalCp);
      setBestMoveUci(baseline.bestMoveUci);
      setStatus('player-turn');
    });

    return () => {
      analysisEngine.terminate();
      opponentEngine.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the in-progress game whenever it's safely the student's turn, so it
  // can be resumed after closing the tab/app; cleared once the game ends or resets.
  useEffect(() => {
    if (status === 'player-turn' && chessRef.current.history().length) {
      saveActiveGame(saveKeyRef.current, {
        pgn: chessRef.current.pgn(),
        studentColor: studentColorRef.current,
        difficultyElo: difficultyRef.current,
      });
    } else if (status === 'game-over') {
      clearActiveGame(saveKeyRef.current);
    }
  }, [status, fen]);

  const setTimeControl = useCallback((tc) => {
    timeControlRef.current = tc;
    setTimeControlState(tc);
    setWhiteTimeMs(tc?.initialMs ?? null);
    setBlackTimeMs(tc?.initialMs ?? null);
  }, []);

  // Ticks down whichever side is currently to move while the clock is running -
  // only while a live decision is actually in progress (not mid-mistake/review).
  useEffect(() => {
    if (!timeControl) return;
    if (!['player-turn', 'computer-thinking', 'evaluating'].includes(status)) return;
    let lastTick = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      lastTick = now;
      if (chessRef.current.turn() === 'w') {
        setWhiteTimeMs((t) => (t == null ? t : Math.max(0, t - elapsed)));
      } else {
        setBlackTimeMs((t) => (t == null ? t : Math.max(0, t - elapsed)));
      }
    }, 250);
    return () => clearInterval(interval);
  }, [timeControl, status]);

  // Flag-fall: either side hitting zero ends the game immediately.
  useEffect(() => {
    if (!timeControl || status === 'game-over') return;
    if (whiteTimeMs === 0) {
      const message = 'לבן הפסיד על הזמן';
      setGameOverMessage(message);
      setStatus('game-over');
      playGameOverSound();
      recordRatingIfApplicable(message);
    } else if (blackTimeMs === 0) {
      const message = 'שחור הפסיד על הזמן';
      setGameOverMessage(message);
      setStatus('game-over');
      playGameOverSound();
      recordRatingIfApplicable(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteTimeMs, blackTimeMs, timeControl, status]);

  const syncFromChess = useCallback(() => {
    setFen(chessRef.current.fen());
    setMoveHistory(chessRef.current.history());
    const verboseHistory = chessRef.current.history({ verbose: true });
    const last = verboseHistory[verboseHistory.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
    setPlyFens(verboseHistory.map((m) => m.after));
    setCheckSquare(kingInCheckSquare(chessRef.current));
    setMaterialBalance(materialDiff(chessRef.current.fen()));
  }, []);

  // Rating only reflects real games against the engine, not pass-and-play or drills.
  const recordRatingIfApplicable = useCallback((reason) => {
    if (modeRef.current !== 'coached' && modeRef.current !== 'free') return;
    const result = studentResultFromGame(chessRef.current, studentColorRef.current, reason);
    if (result) recordGameResult({ result, opponentElo: difficultyRef.current });
  }, []);

  const finishIfGameOver = useCallback(() => {
    if (chessRef.current.isGameOver()) {
      const reason = gameOverReason(chessRef.current);
      setGameOverMessage(reason);
      setStatus('game-over');
      playGameOverSound();
      recordRatingIfApplicable(reason);
      return true;
    }
    return false;
  }, [recordRatingIfApplicable]);

  const setDifficultyElo = useCallback((elo) => {
    difficultyRef.current = elo;
    setDifficultyEloState(elo);
    opponentEngineRef.current?.setStrength(elo);
  }, []);

  const requestExplanation = useCallback(async (mistakeData) => {
    const explanation = await getCoachExplanation({
      fenBefore: mistakeData.fenBefore,
      badMoveSan: mistakeData.badMoveSan,
      bestMoveSan: mistakeData.bestMoveSan,
      evalBeforeStr: formatCp(mistakeData.evalBeforeCp),
      evalAfterStr: formatCp(mistakeData.evalAfterCp),
      moveNumber: mistakeData.moveNumber,
      continuationSans: mistakeData.punishingLine?.sans ?? [],
      moverColor: studentColorRef.current,
      classification: mistakeData.classification,
      playerElo: difficultyRef.current,
    });
    setMistake((prev) => (prev ? { ...prev, explanation, loadingExplanation: false } : prev));
  }, []);

  const playComputerReply = useCallback(
    async (bestMoveUciForBlack) => {
      const chess = chessRef.current;
      const elo = difficultyRef.current;
      const thinkStart = Date.now();

      let blackMoveUci = bestMoveUciForBlack;
      if (isWeakTier(elo) || !blackMoveUci) {
        blackMoveUci = await selectComputerMove(opponentEngineRef.current, chess.fen(), elo);
      }
      if (!blackMoveUci) {
        // The engine genuinely has no move (checkmate/stalemate) or failed to
        // produce one in time - either way, don't leave the UI stuck waiting.
        if (!finishIfGameOver()) setStatus('player-turn');
        return;
      }

      const elapsed = Date.now() - thinkStart;
      const minThink = minThinkTimeMs(elo);
      if (elapsed < minThink) await sleep(minThink - elapsed);

      const computerMoveResult = chess.move(uciToMoveInput(blackMoveUci));
      playMoveResultSound(chess, computerMoveResult);
      syncFromChess();

      if (finishIfGameOver()) return;

      if (modeRef.current === 'coached') {
        const nextBaseline = await analysisEngineRef.current.analyze(chess.fen(), { depth: PLAYER_ANALYSIS_DEPTH });
        baselineRef.current = { evalCp: nextBaseline.evalCp, bestMoveUci: nextBaseline.bestMoveUci };
        setCurrentEvalCp(nextBaseline.evalCp);
        setBestMoveUci(nextBaseline.bestMoveUci);
      }
      setStatus('player-turn');
    },
    [finishIfGameOver, syncFromChess]
  );

  const handlePieceDropCoached = useCallback(
    (chess, fenBeforeMove, moveNumber, badMoveSan) => {
      setStatus('evaluating');
      (async () => {
        const analysisEngine = analysisEngineRef.current;
        const fenAfter = chess.fen();
        const afterAnalysis = await analysisEngine.analyze(fenAfter, { depth: PLAYER_ANALYSIS_DEPTH });
        const evalBeforeCp = baselineRef.current.evalCp;
        const evalAfterCp = afterAnalysis.evalCp;
        // evalCp is always in White's perspective, so a move's cost to the mover
        // needs the sign flipped when the student is playing Black.
        const sign = studentColorRef.current === 'w' ? 1 : -1;
        const delta = (evalBeforeCp - evalAfterCp) * sign;

        if (delta > MISTAKE_THRESHOLD_CP) {
          chess.undo();
          syncFromChess();
          const bestMoveSan = sanForUci(fenBeforeMove, baselineRef.current.bestMoveUci);
          const punishingLine = buildContinuation(fenAfter, afterAnalysis.pvUci, CONTINUATION_PLIES);
          const mistakeData = {
            fenBefore: fenBeforeMove,
            badMoveSan,
            bestMoveSan: bestMoveSan || '(לא זמין)',
            evalBeforeCp,
            evalAfterCp,
            moveNumber,
            punishingLine,
            classification: classifyMove(delta).key,
            explanation: null,
            loadingExplanation: true,
          };
          setMistake(mistakeData);
          setStatus('mistake');
          playMistakeSound();
          requestExplanation(mistakeData);
          addPuzzle({
            fen: fenBeforeMove,
            solutionSan: bestMoveSan,
            badMoveSan,
            classification: mistakeData.classification,
            cpLoss: delta,
            evalBeforeWhite: evalBeforeCp,
            evalAfterWhite: evalAfterCp,
            source: 'coached',
            difficultyElo: difficultyRef.current,
          });
          return;
        }

        setCurrentEvalCp(evalAfterCp);
        if (finishIfGameOver()) return;

        setStatus('computer-thinking');
        await playComputerReply(afterAnalysis.bestMoveUci);
      })();
    },
    [syncFromChess, finishIfGameOver, playComputerReply, requestExplanation]
  );

  const handlePieceDropFree = useCallback(
    (chess) => {
      syncFromChess();
      if (finishIfGameOver()) return;
      setStatus('computer-thinking');
      (async () => {
        await playComputerReply(null);
      })();
    },
    [syncFromChess, finishIfGameOver, playComputerReply]
  );

  // Pass-and-play: both sides are human, on the same device - there's no engine
  // opponent to reply, just hand the turn straight back.
  const handlePieceDropFriend = useCallback(
    (chess) => {
      syncFromChess();
      if (finishIfGameOver()) return;
      setStatus('player-turn');
    },
    [syncFromChess, finishIfGameOver]
  );

  const completeMove = useCallback(
    (sourceSquare, targetSquare, promotionPiece = 'q') => {
      const chess = chessRef.current;
      const fenBeforeMove = chess.fen();
      const moveNumber = chess.moveNumber();
      let moveResult;
      try {
        moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: promotionPiece });
      } catch {
        moveResult = null;
      }
      if (!moveResult) return false;

      playMoveResultSound(chess, moveResult);
      syncFromChess();

      if (mode === 'coached') {
        handlePieceDropCoached(chess, fenBeforeMove, moveNumber, moveResult.san);
      } else if (mode === 'friend') {
        handlePieceDropFriend(chess);
      } else {
        handlePieceDropFree(chess);
      }

      return true;
    },
    [mode, syncFromChess, handlePieceDropCoached, handlePieceDropFree, handlePieceDropFriend]
  );

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      if (status !== 'player-turn') return false;
      if (!targetSquare) return false;

      const chess = chessRef.current;
      // In pass-and-play both sides are human, so either color may move on its turn.
      if (mode !== 'friend' && chess.turn() !== studentColorRef.current) return false;

      const piece = chess.get(sourceSquare);
      const targetRank = targetSquare[1];
      const needsPromotionChoice =
        piece?.type === 'p' && ((piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1'));

      if (needsPromotionChoice) {
        // Don't commit the move yet - let the piece revert and show a picker;
        // resolvePromotion() completes the actual move once the student chooses.
        setPendingPromotion({ sourceSquare, targetSquare });
        return false;
      }

      return completeMove(sourceSquare, targetSquare, 'q');
    },
    [status, mode, completeMove]
  );

  const resolvePromotion = useCallback(
    (promotionPiece) => {
      if (!pendingPromotion) return;
      const { sourceSquare, targetSquare } = pendingPromotion;
      setPendingPromotion(null);
      completeMove(sourceSquare, targetSquare, promotionPiece);
    },
    [pendingPromotion, completeMove]
  );

  const cancelPromotion = useCallback(() => setPendingPromotion(null), []);

  const undoLastMove = useCallback(() => {
    if (status !== 'player-turn') return;
    const chess = chessRef.current;
    const historyLength = chess.history().length;
    if (mode === 'friend') {
      // Pass-and-play: every ply is a real decision by whoever is at the board,
      // so undo just the single last move.
      if (!historyLength) return;
      chess.undo();
    } else {
      // Undo the student's move together with the engine's reply. If the student
      // plays Black, the engine's un-replied opening move sits alone in history
      // (length 1) - there's nothing of the student's to undo yet, so bail out
      // rather than undoing past it and leaving the game with no one to move.
      if (historyLength < 2) return;
      chess.undo();
      chess.undo();
    }
    syncFromChess();
    setGameOverMessage(null);
    setStatus('player-turn');
  }, [status, mode, syncFromChess]);

  const retryAfterMistake = useCallback(() => {
    setMistake(null);
    setStatus('player-turn');
  }, []);

  const resetGame = useCallback(
    (newMode, newColor, newFen) => {
      clearActiveGame(saveKeyRef.current);
      setWasResumed(false);
      chessRef.current = newFen ? new Chess(newFen) : new Chess();
      modeRef.current = newMode ?? modeRef.current;
      setModeState(modeRef.current);
      if (newColor) {
        studentColorRef.current = newColor;
        setStudentColorState(newColor);
      }
      analysisEngineRef.current?.newGame();
      opponentEngineRef.current?.newGame();
      setMistake(null);
      setGameOverMessage(null);
      setReviewData(null);
      setReviewProgress(null);
      setWhiteTimeMs(timeControlRef.current?.initialMs ?? null);
      setBlackTimeMs(timeControlRef.current?.initialMs ?? null);
      syncFromChess();
      setStatus('loading');

      (async () => {
        if (chessRef.current.turn() !== studentColorRef.current) {
          // Whoever isn't the student moves first (either a fresh game where the
          // student plays Black, or a custom starting position like an endgame drill).
          setStatus('computer-thinking');
          await playComputerReply(null);
          return;
        }
        if (modeRef.current === 'coached') {
          const baseline = await analysisEngineRef.current.analyze(chessRef.current.fen(), {
            depth: PLAYER_ANALYSIS_DEPTH,
          });
          baselineRef.current = { evalCp: baseline.evalCp, bestMoveUci: baseline.bestMoveUci };
          setCurrentEvalCp(baseline.evalCp);
          setBestMoveUci(baseline.bestMoveUci);
        } else {
          setCurrentEvalCp(0);
        }
        setStatus('player-turn');
      })();
    },
    [syncFromChess, playComputerReply]
  );

  const setMode = useCallback(
    (newMode) => {
      resetGame(newMode);
    },
    [resetGame]
  );

  const setStudentColor = useCallback(
    (newColor) => {
      resetGame(modeRef.current, newColor);
    },
    [resetGame]
  );

  const requestGameReview = useCallback(async () => {
    const history = chessRef.current.history();
    if (!history.length) return;
    setStatus('reviewing');
    setReviewProgress({ done: 0, total: history.length });
    const records = await analyzeGameFromMoves(analysisEngineRef.current, history, {
      depth: REVIEW_DEPTH,
      onProgress: (done, total) => setReviewProgress({ done, total }),
    });
    const summary = summarizeGame(records, { color: studentColorRef.current });
    // The 'free' mode's puzzles have historically been labeled 'free-play' (a
    // separate string from the mode key itself) - keep that mapping intact.
    const reviewSource = modeRef.current === 'free' ? 'free-play' : modeRef.current;
    addPuzzlesFromRecords(records, studentColorRef.current, reviewSource, difficultyRef.current);
    setReviewData({ records, summary });
    setReviewProgress(null);
    setStatus(chessRef.current.isGameOver() ? 'game-over' : 'player-turn');
  }, []);

  return {
    fen,
    moveHistory,
    plyFens,
    lastMove,
    checkSquare,
    materialBalance,
    pendingPromotion,
    status,
    mode,
    setMode,
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
    dismissResumeNotice: () => setWasResumed(false),
    mistake,
    gameOverMessage,
    reviewData,
    reviewProgress,
    handlePieceDrop,
    resolvePromotion,
    cancelPromotion,
    undoLastMove,
    retryAfterMistake,
    resetGame,
    requestGameReview,
    turn: chessRef.current.turn(),
    getChess: () => chessRef.current,
  };
}
