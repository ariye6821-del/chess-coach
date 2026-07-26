import { useCallback, useState } from 'react';

const SELECTED_SQUARE_STYLE = { boxShadow: 'inset 0 0 0 3px rgba(56,189,248,0.9)' };
const LEGAL_TARGET_STYLE = { background: 'radial-gradient(circle, rgba(56,189,248,0.55) 24%, transparent 26%)' };
const LEGAL_CAPTURE_STYLE = { boxShadow: 'inset 0 0 0 3px rgba(56,189,248,0.75)' };

/**
 * Click-to-move for react-chessboard, layered alongside its existing drag-and-drop.
 * Click a piece to see its legal destinations highlighted, click a destination to
 * play it (via the same onMove callback drag already uses), or click elsewhere to
 * deselect.
 */
export function useClickToMove({ getChess, isOwnPiece, disabled, onMove }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const trySelect = useCallback(
    (square) => {
      const chess = getChess();
      const moves = chess.moves({ square, verbose: true });
      if (!moves.length) {
        clearSelection();
        return;
      }
      setSelectedSquare(square);
      setLegalMoves(moves);
    },
    [getChess, clearSelection]
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

  const squareStyles = {};
  if (selectedSquare) {
    squareStyles[selectedSquare] = SELECTED_SQUARE_STYLE;
    for (const move of legalMoves) {
      squareStyles[move.to] = move.captured ? LEGAL_CAPTURE_STYLE : LEGAL_TARGET_STYLE;
    }
  }

  return { onSquareClick, squareStyles, clearSelection };
}
