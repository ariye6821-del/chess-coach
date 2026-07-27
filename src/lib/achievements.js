import { getAllPuzzles } from './puzzleBank';
import { getRatingHistory, getCurrentRating } from './rating';
import { getStreak } from './dailyChallenge';

export const ACHIEVEMENTS = [
  {
    id: 'first-puzzle',
    icon: '🧩',
    name: 'פותר חידות מתחיל',
    description: 'פתרו חידה אחת מבנק החידות האישי שלכם',
    check: (s) => s.puzzlesSolved >= 1,
  },
  {
    id: 'ten-puzzles',
    icon: '🧠',
    name: 'חד המחשבה',
    description: 'פתרו 10 חידות',
    check: (s) => s.puzzlesSolved >= 10,
  },
  {
    id: 'fifty-puzzles',
    icon: '🏅',
    name: 'אלוף הטקטיקה',
    description: 'פתרו 50 חידות',
    check: (s) => s.puzzlesSolved >= 50,
  },
  {
    id: 'first-win',
    icon: '⚔️',
    name: 'ניצחון ראשון',
    description: 'נצחו במשחק אחד לפחות נגד המחשב',
    check: (s) => s.wins >= 1,
  },
  {
    id: 'five-wins',
    icon: '🎯',
    name: 'רצף ניצחונות',
    description: 'נצחו ב-5 משחקים נגד המחשב',
    check: (s) => s.wins >= 5,
  },
  {
    id: 'streak-3',
    icon: '🔥',
    name: 'שלושה ימים ברצף',
    description: 'פתרו את חידת היום שלושה ימים ברצף',
    check: (s) => s.longestDailyStreak >= 3,
  },
  {
    id: 'streak-7',
    icon: '🌟',
    name: 'שבוע מושלם',
    description: 'פתרו את חידת היום שבעה ימים ברצף',
    check: (s) => s.longestDailyStreak >= 7,
  },
  {
    id: 'rating-1000',
    icon: '📈',
    name: 'דירוג 1000',
    description: 'הגיעו לדירוג פנימי של 1000 ומעלה',
    check: (s) => s.currentRating >= 1000,
  },
  {
    id: 'rating-1500',
    icon: '👑',
    name: 'דירוג 1500',
    description: 'הגיעו לדירוג פנימי של 1500 ומעלה',
    check: (s) => s.currentRating >= 1500,
  },
  {
    id: 'daily-first',
    icon: '🗓️',
    name: 'חידת היום הראשונה',
    description: 'פתרו את חידת היום בפעם הראשונה',
    check: (s) => s.dailySolvedEver,
  },
];

export function computeStats() {
  const puzzles = getAllPuzzles();
  const puzzlesSolved = puzzles.filter((p) => p.solved).length;
  const wins = getRatingHistory().filter((h) => h.result === 'win').length;
  const streak = getStreak();
  return {
    puzzlesSolved,
    wins,
    currentRating: getCurrentRating(),
    longestDailyStreak: streak.longestStreak || 0,
    dailySolvedEver: !!streak.lastSolvedDate,
  };
}

export function getAchievementsStatus() {
  const stats = computeStats();
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.check(stats) }));
}
