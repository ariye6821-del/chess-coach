import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { StockfishEngine } from '../lib/stockfishEngine';
import { getCoachExplanation } from '../lib/coachApi';
import { isWeakTier, pickWeightedMove } from '../lib/difficulty';
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

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moveHistory, setMoveHistory] = useState([]);
  const [status, setStatus] = useState('loading');
  const [mode, setModeState] = useState(initialMode);
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
      moverColor: 'w',
      classification: mistakeData.classification,
    });
    setMistake((prev) => (prev ? { ...prev, explanation, loadingExplanation: false } : prev));
  }, []);

  const playComputerReply = useCallback(
    async (bestMoveUciForBlack) => {
      const chess = chessRef.current;
      const elo = difficultyRef.current;

      let blackMoveUci = bestMoveUciForBlack;
      if (isWeakTier(elo) || !blackMoveUci) {
        blackMoveUci = await selectComputerMove(opponentEngineRef.current, chess.fen(), elo);
      }
      if (!blackMoveUci) {
        finishIfGameOver();
        return;
      }

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
        const delta = evalBeforeCp - evalAfterCp;

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
      if (chess.turn() !== 'w') return false;

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
    (newMode) => {
      chessRef.current = new Chess();
      modeRef.current = newMode ?? modeRef.current;
      setModeState(modeRef.current);
      analysisEngineRef.current?.newGame();
      opponentEngineRef.current?.newGame();
      setMistake(null);
      setGameOverMessage(null);
      setReviewData(null);
      setReviewProgress(null);
      syncFromChess();
      setStatus('loading');

      if (modeRef.current === 'coached') {
        analysisEngineRef.current
          ?.analyze(chessRef.current.fen(), { depth: PLAYER_ANALYSIS_DEPTH })
          .then((baseline) => {
            baselineRef.current = { evalCp: baseline.evalCp, bestMoveUci: baseline.bestMoveUci };
            setCurrentEvalCp(baseline.evalCp);
            setStatus('player-turn');
          });
      } else {
        setCurrentEvalCp(0);
        setStatus('player-turn');
      }
    },
    [syncFromChess]
  );

  const setMode = useCallback(
    (newMode) => {
      resetGame(newMode);
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
    const summary = summarizeGame(records, { color: 'w' });
    addPuzzlesFromRecords(records, 'w', 'free-play');
    setReviewData({ records, summary });
    setReviewProgress(null);
    setStatus(chessRef.current.isGameOver() ? 'game-over' : 'player-turn');
  }, []);

  return {
    fen,
    moveHistory,
    status,
    mode,
    setMode,
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
  };
}
