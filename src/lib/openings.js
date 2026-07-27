// A small curated set of common openings, matched by SAN move-sequence prefix.
// Not exhaustive - covers the openings a beginner-to-intermediate player is most
// likely to actually reach, in order to name what's happening on the board.
export const OPENINGS = [
  { moves: 'e4 e5 Nf3 Nc6 Bb5', name: 'פתיחה ספרדית (רואי לופז)' },
  { moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5', name: "פתיחה איטלקית - ג'וקו פיאנו" },
  { moves: 'e4 e5 Nf3 Nc6 Bc4', name: 'פתיחה איטלקית' },
  { moves: 'e4 e5 Nf3 Nc6 d4', name: 'פתיחה סקוטית' },
  { moves: 'e4 e5 Nf3 Nf6', name: 'הגנת פטרוב' },
  { moves: 'e4 e5 Nf3 Nc6', name: 'משחק פתוח' },
  { moves: 'e4 e5 Bc4', name: 'פתיחת הבישוף' },
  { moves: 'e4 e5 f4', name: 'גמביט המלך' },
  { moves: 'e4 e5 Nf3', name: 'משחק פתוח' },
  { moves: 'e4 e5', name: 'משחק פתוח' },
  { moves: 'e4 c5 Nf3 d6', name: "הגנה סיציליאנית (נג'דורף/קלאסית)" },
  { moves: 'e4 c5 Nf3 Nc6', name: 'הגנה סיציליאנית' },
  { moves: 'e4 c5 Nf3', name: 'הגנה סיציליאנית' },
  { moves: 'e4 c5', name: 'הגנה סיציליאנית' },
  { moves: 'e4 e6', name: 'הגנה צרפתית' },
  { moves: 'e4 c6', name: 'הגנת קארו-קאן' },
  { moves: 'e4 d5', name: 'הגנה סקנדינבית' },
  { moves: 'e4 Nf6', name: 'הגנת אלכין' },
  { moves: 'e4 g6', name: 'הגנה מודרנית' },
  { moves: 'e4', name: 'פתיחת המלך' },
  { moves: 'd4 d5 c4 e6', name: 'גמביט המלכה מסורב' },
  { moves: 'd4 d5 c4 c6', name: 'גמביט המלכה סלאבי' },
  { moves: 'd4 d5 c4', name: 'גמביט המלכה' },
  { moves: 'd4 d5', name: 'משחק המלכה סגור' },
  { moves: 'd4 Nf6 c4 g6', name: "הגנה הודית מלכותית (קינגס אינדיאן)" },
  { moves: 'd4 Nf6 c4 e6', name: 'הגנה נימצו-הודית' },
  { moves: 'd4 Nf6 c4', name: 'הגנה הודית' },
  { moves: 'd4 Nf6', name: 'הגנה הודית' },
  { moves: 'd4 f5', name: 'הגנה הולנדית' },
  { moves: 'd4', name: 'פתיחת המלכה' },
  { moves: 'c4', name: 'פתיחה אנגלית' },
  { moves: 'Nf3', name: 'פתיחת רטי' },
  { moves: 'g3', name: "פתיחת בנוני" },
  { moves: 'b3', name: 'פתיחת לארסן' },
  { moves: 'f4', name: 'פתיחת בירד' },
];

/** Longest-prefix opening match for a SAN move list (e.g. ["e4", "e5", "Nf3"]). */
export function identifyOpening(sanMoves) {
  let bestName = null;
  let bestLength = 0;
  for (const entry of OPENINGS) {
    const seq = entry.moves.split(' ');
    if (seq.length > sanMoves.length || seq.length <= bestLength) continue;
    if (seq.every((m, i) => sanMoves[i] === m)) {
      bestName = entry.name;
      bestLength = seq.length;
    }
  }
  return bestName;
}
