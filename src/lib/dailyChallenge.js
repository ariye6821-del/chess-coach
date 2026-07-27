import { getAllPuzzles } from './puzzleBank';
import { TACTIC_LABELS } from './tacticTags';

const MIN_PERSONAL_POOL = 5;

export const DAILY_PUZZLES = [
  {
    id: 'back-rank-rook',
    fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1',
    solutionSan: 'Rd8#',
    description: 'מלכם היריב תקוע מאחורי החיילים שלו - מצאו את המט בשורה האחרונה.',
  },
  {
    id: 'back-rank-queen',
    fen: '6k1/6pp/8/8/8/8/8/4Q1K1 w - - 0 1',
    solutionSan: 'Qe8#',
    description: 'המלכה שלכם יכולה לסיים את המשחק במהלך אחד - איך?',
  },
  {
    id: 'rook-trade-mate',
    fen: '3r2k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1',
    solutionSan: 'Rxd8#',
    description: 'חילוף צריחים שמסתיים במט - מצאו את המהלך המדויק.',
  },
  {
    id: 'close-rook-mate',
    fen: '6k1/4Rppp/8/8/8/8/8/6K1 w - - 0 1',
    solutionSan: 'Re8#',
    description: 'הצריח שלכם כבר קרוב - מהלך אחד מפריד ביניכם לניצחון.',
  },
  {
    id: 'corner-rook-mate',
    fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
    solutionSan: 'Rh8#',
    description: 'המלך שלכם חוסם את כל דרכי המילוט - הביאו את הצריח למט.',
  },
];

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

/**
 * Looks at the student's own puzzle bank for a recurring tactical weakness (the
 * most frequent tactic tag among puzzles harvested from their real mistakes) and
 * returns a pool of puzzles matching it - only once there's enough data to trust
 * the pattern, otherwise null so the caller falls back to the curated set.
 */
function personalWeaknessPool() {
  const puzzles = getAllPuzzles().filter((p) => p.fen && p.solutionSan && p.tacticTags?.length);
  if (puzzles.length < MIN_PERSONAL_POOL) return null;

  const tagCounts = {};
  for (const p of puzzles) {
    for (const tag of p.tacticTags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [worstTag] = sorted[0];

  const pool = puzzles.filter((p) => p.tacticTags.includes(worstTag));
  return pool.length ? { pool, tag: worstTag } : null;
}

export function getDailyPuzzle(date = new Date()) {
  const personal = personalWeaknessPool();
  if (personal) {
    const chosen = personal.pool[dayOfYear(date) % personal.pool.length];
    const label = TACTIC_LABELS[personal.tag]?.label || personal.tag;
    return {
      id: `personal-${chosen.id}`,
      fen: chosen.fen,
      solutionSan: chosen.solutionSan,
      description: `חידה מותאמת אישית: הנושא שהכי חוזר בטעויות שלכם הוא "${label}" - הנה הזדמנות לתרגל בדיוק את זה.`,
      personalized: true,
    };
  }
  const index = dayOfYear(date) % DAILY_PUZZLES.length;
  return DAILY_PUZZLES[index];
}

export function getTodayKey() {
  return dateKey(new Date());
}

const STREAK_KEY = 'chess-coach-daily-streak';

function loadStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastSolvedDate: null, currentStreak: 0, longestStreak: 0 };
    return JSON.parse(raw);
  } catch {
    return { lastSolvedDate: null, currentStreak: 0, longestStreak: 0 };
  }
}

function saveStreak(streak) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } catch {
    // storage unavailable/full - streak just won't persist this update
  }
}

function isYesterday(dateStr, todayDate) {
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === dateKey(yesterday);
}

export function getStreak() {
  return loadStreak();
}

export function hasSolvedToday() {
  return loadStreak().lastSolvedDate === getTodayKey();
}

/** Records today's puzzle as solved, extending the streak if it continues from yesterday. */
export function recordDailySolve() {
  const today = getTodayKey();
  const streak = loadStreak();
  if (streak.lastSolvedDate === today) return streak;
  const continued = streak.lastSolvedDate && isYesterday(streak.lastSolvedDate, new Date());
  const currentStreak = continued ? streak.currentStreak + 1 : 1;
  const updated = {
    lastSolvedDate: today,
    currentStreak,
    longestStreak: Math.max(currentStreak, streak.longestStreak || 0),
  };
  saveStreak(updated);
  return updated;
}
