import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Peer from 'peerjs';
import { Chessboard } from 'react-chessboard';
import { useClickToMove } from '../hooks/useClickToMove';
import { useBoardTheme } from '../hooks/useBoardTheme';
import { playMoveSound, playCheckSound, playGameOverSound } from '../lib/sounds';

const LAST_MOVE_STYLE = { backgroundColor: 'rgba(250, 204, 21, 0.35)' };
const CHECK_STYLE = { boxShadow: 'inset 0 0 0 4px rgba(239, 68, 68, 0.85)', backgroundColor: 'rgba(239, 68, 68, 0.35)' };

function outcomeMessage(chess) {
  if (!chess.isGameOver()) return null;
  if (chess.isCheckmate()) return `שח-מט! ${chess.turn() === 'w' ? 'שחור' : 'לבן'} ניצח/ה`;
  if (chess.isStalemate()) return 'תיקו - פט';
  if (chess.isThreefoldRepetition()) return 'תיקו - חזרה משולשת';
  if (chess.isInsufficientMaterial()) return 'תיקו - אין מספיק חומר';
  if (chess.isDraw()) return 'תיקו';
  return 'המשחק הסתיים';
}

/**
 * Real-time online play against a remote friend, peer-to-peer via PeerJS - no
 * game server of our own, just the public PeerJS broker for the initial
 * handshake. One player creates a room (gets a short code), the other joins
 * with that code; moves are exchanged directly between the two browsers from
 * then on.
 */
export function OnlineMultiplayer() {
  const [theme] = useBoardTheme();
  const [phase, setPhase] = useState('idle'); // idle | hosting | joining | connected | ended
  const [roomCode, setRoomCode] = useState(null);
  const [joinInput, setJoinInput] = useState('');
  const [myColor, setMyColor] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [lastMove, setLastMove] = useState(null);
  const [gameOverMessage, setGameOverMessage] = useState(null);
  const [peerLeft, setPeerLeft] = useState(false);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const chessRef = useRef(new Chess());

  const cleanupPeer = () => {
    connRef.current?.close();
    peerRef.current?.destroy();
    peerRef.current = null;
    connRef.current = null;
  };

  useEffect(() => cleanupPeer, []);

  const wireConnection = (conn, colorForMe) => {
    connRef.current = conn;
    conn.on('open', () => {
      setMyColor(colorForMe);
      setPhase('connected');
    });
    conn.on('data', (data) => {
      if (data?.type === 'move') {
        try {
          const move = chessRef.current.move({ from: data.from, to: data.to, promotion: data.promotion });
          if (move) {
            setFen(chessRef.current.fen());
            setLastMove({ from: move.from, to: move.to });
            if (chessRef.current.isCheck()) playCheckSound();
            else playMoveSound();
            const outcome = outcomeMessage(chessRef.current);
            if (outcome) {
              setGameOverMessage(outcome);
              playGameOverSound();
            }
          }
        } catch {
          // malformed/out-of-sync move from the peer - ignore rather than crash
        }
      }
    });
    conn.on('close', () => setPeerLeft(true));
    conn.on('error', (err) => setErrorMessage(`שגיאת חיבור: ${err?.message || err}`));
  };

  const createRoom = () => {
    setErrorMessage(null);
    setPhase('hosting');
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    const peer = new Peer();
    peerRef.current = peer;
    peer.on('open', (id) => setRoomCode(id));
    peer.on('connection', (conn) => wireConnection(conn, 'w'));
    peer.on('error', (err) => setErrorMessage(`שגיאת חיבור: ${err?.message || err}`));
  };

  const joinRoom = () => {
    const code = joinInput.trim();
    if (!code) return;
    setErrorMessage(null);
    setPhase('joining');
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    const peer = new Peer();
    peerRef.current = peer;
    peer.on('open', () => {
      const conn = peer.connect(code);
      wireConnection(conn, 'b');
    });
    peer.on('error', (err) => setErrorMessage(`שגיאת חיבור: ${err?.message || err}`));
  };

  const leaveRoom = () => {
    cleanupPeer();
    chessRef.current = new Chess();
    setFen(chessRef.current.fen());
    setPhase('idle');
    setRoomCode(null);
    setJoinInput('');
    setMyColor(null);
    setErrorMessage(null);
    setLastMove(null);
    setGameOverMessage(null);
    setPeerLeft(false);
  };

  const boardDisabled = phase !== 'connected' || !!gameOverMessage || chessRef.current.turn() !== myColor;

  const handlePieceDrop = ({ sourceSquare, targetSquare }) => {
    if (boardDisabled || !targetSquare) return false;
    let move;
    try {
      move = chessRef.current.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      move = null;
    }
    if (!move) return false;
    setFen(chessRef.current.fen());
    setLastMove({ from: move.from, to: move.to });
    if (chessRef.current.isCheck()) playCheckSound();
    else playMoveSound();
    connRef.current?.send({ type: 'move', from: move.from, to: move.to, promotion: 'q' });
    const outcome = outcomeMessage(chessRef.current);
    if (outcome) {
      setGameOverMessage(outcome);
      playGameOverSound();
    }
    return true;
  };

  const clickToMove = useClickToMove({
    getChess: () => chessRef.current,
    isOwnPiece: (piece) => myColor && piece.pieceType.startsWith(myColor),
    disabled: boardDisabled,
    onMove: handlePieceDrop,
    boardOrientation: myColor === 'b' ? 'black' : 'white',
  });

  const findCheckedKingSquare = () => {
    if (!chessRef.current.isCheck()) return null;
    const turn = chessRef.current.turn();
    for (const row of chessRef.current.board()) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === turn) return cell.square;
      }
    }
    return null;
  };

  const checkSquareForStyle = findCheckedKingSquare();
  const lastMoveSquareStyles = lastMove ? { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE } : {};
  const checkSquareStyles = checkSquareForStyle ? { [checkSquareForStyle]: CHECK_STYLE } : {};

  if (phase === 'idle') {
    return (
      <div dir="rtl" className="mx-auto max-w-md space-y-5 text-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">🌐 משחק מקוון מול חבר</h2>
          <p className="mt-1 text-sm text-slate-400">
            שחקו בזמן אמת מול חבר במכשיר אחר - חיבור ישיר בין הדפדפנים, בלי שרת משחקים משלנו.
          </p>
        </div>
        <button
          onClick={createRoom}
          className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 font-bold text-white transition hover:from-sky-400 hover:to-indigo-400"
        >
          🆕 צרו חדר חדש
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-700" />
          או
          <span className="h-px flex-1 bg-slate-700" />
        </div>
        <div className="space-y-2">
          <input
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            placeholder="הדביקו כאן קוד חדר"
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-center font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
          <button
            onClick={joinRoom}
            disabled={!joinInput.trim()}
            className="w-full rounded-lg border border-slate-600 px-4 py-2 font-bold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            🔗 הצטרפו לחדר
          </button>
        </div>
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
      </div>
    );
  }

  if (phase === 'hosting' || phase === 'joining') {
    return (
      <div dir="rtl" className="mx-auto max-w-md space-y-4 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
          {phase === 'hosting' ? 'מחכים שהחבר יצטרף...' : 'מתחברים לחדר...'}
        </div>
        {phase === 'hosting' && roomCode && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <p className="mb-1 text-xs text-slate-400">שלחו לחבר את הקוד הזה:</p>
            <p className="select-all font-mono text-lg font-bold text-sky-400">{roomCode}</p>
          </div>
        )}
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
        <button onClick={leaveRoom} className="text-sm text-slate-400 hover:text-slate-200">
          ⬅ ביטול
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto flex max-w-3xl flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <button onClick={leaveRoom} className="text-sm text-slate-400 hover:text-slate-200">
          ⬅ עזבו את החדר
        </button>
        <span className="text-sm text-slate-400">אתם משחקים בתור {myColor === 'b' ? '⚫ שחור' : '⚪ לבן'}</span>
      </div>

      {peerLeft && !gameOverMessage && (
        <div className="w-full rounded-lg bg-amber-900/40 p-3 text-center text-sm text-amber-200">
          החבר התנתק מהמשחק.
        </div>
      )}

      <div
        className="relative w-full max-w-[420px] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        dir="ltr"
        {...clickToMove.containerProps}
      >
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: boardDisabled ? () => false : handlePieceDrop,
            onSquareClick: boardDisabled ? undefined : clickToMove.onSquareClick,
            squareStyles: { ...lastMoveSquareStyles, ...checkSquareStyles, ...clickToMove.squareStyles },
            boardOrientation: myColor === 'b' ? 'black' : 'white',
            allowDragging: !boardDisabled,
            canDragPiece: ({ piece }) => !boardDisabled && myColor && piece.pieceType.startsWith(myColor),
            showAnimations: false,
            darkSquareStyle: { backgroundColor: theme.dark },
            lightSquareStyle: { backgroundColor: theme.light },
          }}
        />
      </div>

      <p className="text-sm text-slate-400">
        {gameOverMessage
          ? gameOverMessage
          : chessRef.current.turn() === myColor
            ? 'תורכם לשחק'
            : 'ממתינים למהלך של החבר...'}
      </p>
    </div>
  );
}
