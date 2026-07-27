import { Chess } from 'chess.js';

// Curated "how to think" tips shown above the board during coached play - not
// analysis of the actual position (that's the mistake-detection/hint system),
// just general thinking-process guidance, phrased at three levels of complexity
// matching the coach persona tiers, and grouped by game phase.
const TIPS = {
  beginner: {
    opening: [
      'פתחו קודם את חיילי המרכז (e ו-d) - הם נותנים לכלים שלכם הכי הרבה מקום.',
      'הוציאו את הפרשים והרצים החוצה לפני שאתם מזיזים את המלכה.',
      'שחקו הצרחה (רוקדה) מוקדם - ככה המלך שלכם בטוח יותר.',
      'נסו לא להזיז את אותו כלי פעמיים בהתחלה - כל מהלך שיפתח כלי חדש עדיף.',
    ],
    middlegame: [
      'לפני כל מהלך, שאלו: האם יש כלי שלי שהיריב יכול לתפוס בחינם?',
      'חפשו מהלכים ששמים לחץ על כלי של היריב - זה מכריח אותו להגיב.',
      'תסתכלו על כל הלוח, לא רק על האזור שבו שיחקתם לאחרונה.',
      'לפני שאתם מקדמים חייל, בדקו אם המלך שלכם נשאר מוגן.',
    ],
    endgame: [
      'בסיום, קרבו את המלך שלכם למרכז הלוח - הוא הופך לכלי חזק.',
      'חיילים שווים הרבה יותר בסיום - נסו לקדם אותם לעבר ההכתרה.',
      'לפני שאתם נותנים שח, ודאו שזה באמת עוזר לכם ולא רק "בשביל השח".',
      'ספרו כמה מהלכים לוקח לכל צד להכתיר חייל - זה עוזר להחליט מה לעשות.',
    ],
  },
  intermediate: {
    opening: [
      'שאלו את עצמכם אחרי כל מהלך יריב: מה השתנה בעמדה?',
      'השתדלו לפתח כלי חדש בכל מהלך, ולא להזיז שוב כלי שכבר יצא.',
      'ודאו שהמלך שלכם מוגן (הצרחה) לפני שאתם פותחים בהתקפה.',
      'שימו לב לקווים ואלכסונים פתוחים - הם לרוב חשובים יותר מכלי בודד.',
    ],
    middlegame: [
      'חפשו מזלגות, שיפודים והתקפות גילוי - הם המקור השכיח ביותר לטעויות יריב.',
      'לפני שממשיכים בתוכנית שלכם, בדקו את כל האיומים המיידיים של היריב.',
      'שקלו אילו חילופי כלים משפרים את מבנה החיילים שלכם.',
      'כלי לא פעיל שווה פחות ממה שהוא נראה - נסו למצוא לו תפקיד.',
    ],
    endgame: [
      'בסיומי צריחים, צריח פעיל מאחורי חייל עובר שווה יותר מחייל נוסף.',
      'חשבו על "אופוזיציה" - מי שיש לו אותה לרוב שולט בעמדה.',
      'אל תמהרו - כל מהלך בסיום עלול להיות קריטי, בדקו פעמיים.',
      'העריכו אילו חילופי כלים מקרבים אתכם לניצחון, ואילו רק מפשטים לתיקו.',
    ],
  },
  advanced: {
    opening: [
      'התמקדו בשליטה בקווים ובריבועים מרכזיים, לא רק בפיתוח מהיר כשלעצמו.',
      'שקלו כבר עכשיו את מבנה החיילים שסביר שיתפתח באמצע המשחק.',
      'בדקו אם סדר המהלכים שלכם מאפשר ליריב תגובת ביניים לא נעימה.',
      'העריכו את התוכניות המועדפות של שני הצדדים לפני שאתם מתחייבים למבנה.',
    ],
    middlegame: [
      'חפשו חולשות סטטיות בעמדת היריב - חיילים מבודדים, ריבועים חלשים, קווים פתוחים.',
      'שקלו דינמיקה מול חומר - לעיתים יתרון זמני שווה הקרבה קטנה.',
      'זהו את הכלי הכי פחות פעיל שלכם ומצאו לו תוכנית שיפור.',
      'לפני מהלך מכריע, חשבו על התגובה הכי חזקה של היריב, לא רק על התגובה הסבירה.',
    ],
    endgame: [
      'חשבו במונחי זוגיות מהלכים וזמן, במיוחד בסיומי חיילים.',
      'העריכו האם החלפת כלים משרתת אתכם - "החלף כשאתה מוביל, הימנע כשאתה מפגר".',
      'חפשו ריבועים מפתח (key squares) שהמלך שלכם צריך לשלוט בהם.',
      'בדקו תמיד את המהלך המדויק ביותר - בסיום אין מקום לחוסר דיוק.',
    ],
  },
};

/**
 * Picks a tip for the given persona tier + game phase, rotating through the
 * available options deterministically based on a seed (so the same phase/tier
 * doesn't always show the exact same tip, but the choice is reproducible for a
 * given ply count rather than random on every render).
 */
export function getLiveTip(tier, phase, seed = 0) {
  const list = TIPS[tier]?.[phase] || TIPS.intermediate.middlegame;
  return list[seed % list.length];
}

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NAMES_HE = { p: 'החייל', n: 'הפרש', b: 'הרץ', r: 'הצריח', q: 'המלכה' };

/**
 * Finds the single worst "free" capture the opponent could make right now
 * against the student - i.e. taking a piece with something worth less, which
 * is bad regardless of whether the square is otherwise defended (at best it's
 * an unfavorable trade). Checked by relabeling the FEN's side-to-move as the
 * opponent and asking chess.js for their legal captures, since chess.js only
 * generates moves for whoever's turn a position claims it is.
 */
function findUnsafeHang(fen, studentColor) {
  try {
    const parts = fen.split(' ');
    const opponentColor = studentColor === 'w' ? 'b' : 'w';
    const flippedFen = [parts[0], opponentColor, ...parts.slice(2)].join(' ');
    const opponentView = new Chess(flippedFen);
    const captures = opponentView.moves({ verbose: true }).filter((m) => m.captured);
    let worst = null;
    for (const m of captures) {
      const diff = (PIECE_VALUES[m.captured] ?? 0) - (PIECE_VALUES[m.piece] ?? 0);
      if (diff > 0 && (!worst || diff > worst.diff)) {
        worst = { square: m.to, targetType: m.captured, diff };
      }
    }
    return worst;
  } catch {
    return null;
  }
}

/**
 * Prefers a tip that's actually about what's happening on the board right now
 * (check, or a piece hanging to a bad trade) over the generic phase-based bank,
 * falling back to the latter when nothing urgent stands out.
 */
export function getPositionAwareTip({ fen, studentColor, tier, phase, seed }) {
  try {
    const chess = new Chess(fen);
    if (chess.turn() === studentColor && chess.inCheck()) {
      return 'המלך שלכם בשח! מצאו מהלך שמסלק את האיום - חסימה, בריחה, או תפיסת הכלי המאיים.';
    }
  } catch {
    // malformed fen - fall through to the generic tip bank
  }

  const hang = findUnsafeHang(fen, studentColor);
  if (hang) {
    const pieceName = PIECE_NAMES_HE[hang.targetType] || 'כלי';
    return `⚠️ שימו לב! ${pieceName} שלכם על ${hang.square} נתון בסכנה - בדקו את זה לפני שממשיכים.`;
  }

  return getLiveTip(tier, phase, seed);
}
