import { useCallback, useState } from 'react';

const SELECTED_SQUARE_STYLE = { boxShadow: 'inset 0 0 0 3px rgba(56,189,248,0.9)' };
const LEGAL_TARGET_STYLE = { background: 'radial-gradient(circle, rgba(56,189,248,0.55) 24%, transparent 26%)' };
const LEGAL_CAPTURE_STYLE = { boxShadow: 'inset 0 0 0 3px rgba(56,189,248,0.75)' };
const CURSOR_SQUARE_STYLE = { boxShadow: 'inset 0 0 0 5px rgba(250,204,21,0.95)' };

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function pieceDataFromChessJs(piece) {
  return piece ? { pieceType: `${piece.color}${piece.type.toUpperCase()}` } : null;
}

/**
 * Click-to-move for react-chessboard, layered alongside its existing drag-and-drop.
 * Click a piece to see its legal destinations highlighted, click a destination to
 * play it (via the same onMove callback drag already uses), or click elsewhere to
 * deselect.
 *
 * Also drives keyboard navigation for accessibility: `containerProps` should be
 * spread onto the element wrapping the <Chessboard> so arrow keys move a visible
 * cursor square, and Enter/Space selects the piece under the cursor (or, if a piece
 * is already selected, moves it there) - mirroring onSquareClick's behavior.
 */
export function useClickToMove({ getChess, isOwnPiece, disabled, onMove, boardOrientation = 'white' }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [cursorSquare, setCursorSquare] = useState(null);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const trySelect = useCallback(
    (square) => {
      const chess = getChess();
      const moves = chess.moves({ square, verbose: true });
      // Select the square even with zero legal moves (e.g. a blocked pawn) - the
      // player should see their click registered rather than nothing happening.
      setSelectedSquare(square);
      setLegalMoves(moves);
    },
    [getChess]
  );

  const onSquareClick = useCallback(
    ({ piece, square }) => {
      if (disabled) return;

      if (!selectedSquare) {
        if (piece && isOwnPiece(piece)) trySelect(square);
        return;
      }

      if (square === selectedSquare) {
        clearSelection();
        return;
      }

      if (piece && isOwnPiece(piece)) {
        trySelect(square);
        return;
      }

      const target = legalMoves.find((m) => m.to === square);
      clearSelection();
      if (target) onMove({ sourceSquare: selectedSquare, targetSquare: square });
    },
    [disabled, selectedSquare, legalMoves, isOwnPiece, trySelect, clearSelection, onMove]
  );

  const moveCursor = useCallback((deltaFile, deltaRank) => {
    setCursorSquare((current) => {
      const base = current ?? selectedSquare ?? 'e4';
      const fileIdx = FILES.indexOf(base[0]);
      const rank = parseInt(base[1], 10);
      const nextFile = Math.max(0, Math.min(7, fileIdx + deltaFile));
      const nextRank = Math.max(1, Math.min(8, rank + deltaRank));
      return FILES[nextFile] + nextRank;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSquare]);

  const activateCursor = useCallback(() => {
    if (disabled) return;
    const square = cursorSquare ?? 'e4';
    const piece = pieceDataFromChessJs(getChess().get(square));
    onSquareClick({ piece, square });
  }, [disabled, cursorSquare, getChess, onSquareClick]);

  const onBoardKeyDown = useCallback(
    (e) => {
      if (disabled) return;
      // Board is always rendered dir="ltr" internally; when flipped for a black
      // orientation, visual right/up correspond to decreasing file/rank.
      const flip = boardOrientation === 'black' ? -1 : 1;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          moveCursor(flip, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveCursor(-flip, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveCursor(0, flip);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveCursor(0, -flip);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          activateCursor();
          break;
        case 'Escape':
          e.preventDefault();
          clearSelection();
          break;
        default:
          break;
      }
    },
    [disabled, boardOrientation, moveCursor, activateCursor, clearSelection]
  );

  const squareStyles = {};
  if (selectedSquare) {
    squareStyles[selectedSquare] = SELECTED_SQUARE_STYLE;
    for (const move of legalMoves) {
      squareStyles[move.to] = move.captured ? LEGAL_CAPTURE_STYLE : LEGAL_TARGET_STYLE;
    }
  }
  if (cursorSquare) {
    const existing = squareStyles[cursorSquare];
    squareStyles[cursorSquare] = {
      ...existing,
      boxShadow: existing?.boxShadow
        ? `${existing.boxShadow}, ${CURSOR_SQUARE_STYLE.boxShadow}`
        : CURSOR_SQUARE_STYLE.boxShadow,
    };
  }

  const containerProps = {
    tabIndex: 0,
    role: 'group',
    'aria-label': 'לוח שחמט. נווטו עם החצים, Enter או רווח לבחירת כלי ולביצוע מהלך, Escape לביטול בחירה.',
    onKeyDown: onBoardKeyDown,
  };

  return { onSquareClick, squareStyles, clearSelection, containerProps, cursorSquare };
}
