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
} from '../lib/gameAnalysis';
import { addPuzzle, addPuzzlesFromRecords } from '../lib/puzzleBank';

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

export function useChessGame(initialMode = 'coached') {
  const chessRef = useRef(new Chess());
  const analysisEngineRef = useRef(null); // always full strength - objective truth
  const opponentEngineRef = useRef(null); // configured to the chosen difficulty
  const baselineRef = useRef({ evalCp: 0, bestMoveUci: null });
  const difficultyRef = useRef(null); // null = max strength
  const modeRef = useRef(initialMode);
  const studentColorRef = useRef('w');

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moveHistory, setMoveHistory] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [status, setStatus] = useState('loading');
  const [mode, setModeState] = useState(initialMode);
  const [studentColor, setStudentColorState] = useState('w');
  const [difficultyElo, setDifficultyEloState] = useState(null);
  const [currentEvalCp, setCurrentEvalCp] = useState(0);
  const [mistake, setMistake] = useState(null);
  const [gameOverMessage, setGameOverMessage] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [reviewProgress, setReviewProgress] = useState(null);

  useEffect(() => {
    const analysisEngine = new StockfishEngine();
    const opponentEngine = new StockfishEngine();
    analysisEngineRef.current = analysisEngine;
    opponentEngineRef.current = opponentEngine;

    Promise.all([analysisEngine.init(), opponentEngine.init()]).then(async () => {
      opponentEngine.setStrength(difficultyRef.current);
      const baseline = await analysisEngine.analyze(chessRef.current.fen(), { depth: PLAYER_ANALYSIS_DEPTH });
      baselineRef.current = { evalCp: baseline.evalCp, bestMoveUci: baseline.bestMoveUci };
      setCurrentEvalCp(baseline.evalCp);
      setStatus('player-turn');
    });

    return () => {
      analysisEngine.terminate();
      opponentEngine.terminate();
    };
  }, []);

  const syncFromChess = useCallback(() => {
    setFen(chessRef.current.fen());
    setMoveHistory(chessRef.current.history());
    const verboseHistory = chessRef.current.history({ verbose: true });
    const last = verboseHistory[verboseHistory.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
  }, []);

  const finishIfGameOver = useCallback(() => {
    if (chessRef.current.isGameOver()) {
      setGameOverMessage(gameOverReason(chessRef.current));
      setStatus('game-over');
      return true;
    }
    return false;
  }, []);

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

      chess.move(uciToMoveInput(blackMoveUci));
      syncFromChess();

      if (finishIfGameOver()) return;

      if (modeRef.current === 'coached') {
        const nextBaseline = await analysisEngineRef.current.analyze(chess.fen(), { depth: PLAYER_ANALYSIS_DEPTH });
        baselineRef.current = { evalCp: nextBaseline.evalCp, bestMoveUci: nextBaseline.bestMoveUci };
        setCurrentEvalCp(nextBaseline.evalCp);
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

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }) => {
      if (status !== 'player-turn') return false;
      if (!targetSquare) return false;

      const chess = chessRef.current;
      if (chess.turn() !== studentColorRef.current) return false;

      const fenBeforeMove = chess.fen();
      const moveNumber = chess.moveNumber();
      let moveResult;
      try {
        moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      } catch {
        moveResult = null;
      }
      if (!moveResult) return false;

      syncFromChess();

      if (mode === 'coached') {
        handlePieceDropCoached(chess, fenBeforeMove, moveNumber, moveResult.san);
      } else {
        handlePieceDropFree(chess);
      }

      return true;
    },
    [status, mode, syncFromChess, handlePieceDropCoached, handlePieceDropFree]
  );

  const retryAfterMistake = useCallback(() => {
    setMistake(null);
    setStatus('player-turn');
  }, []);

  const resetGame = useCallback(
    (newMode, newColor) => {
      chessRef.current = new Chess();
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
      syncFromChess();
      setStatus('loading');

      (async () => {
        if (studentColorRef.current === 'b') {
          // Computer plays White's opening move before the student gets a turn.
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
    addPuzzlesFromRecords(records, studentColorRef.current, 'free-play', difficultyRef.current);
    setReviewData({ records, summary });
    setReviewProgress(null);
    setStatus(chessRef.current.isGameOver() ? 'game-over' : 'player-turn');
  }, []);

  return {
    fen,
    moveHistory,
    lastMove,
    status,
    mode,
    setMode,
    studentColor,
    setStudentColor,
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
    turn: chessRef.current.turn(),
    getChess: () => chessRef.current,
  };
}
