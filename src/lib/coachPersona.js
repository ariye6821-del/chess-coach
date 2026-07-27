/**
 * Mirrors the persona tiers in netlify/functions/lib/coachLogic.js (kept in sync
 * manually - the two run in separate bundles) so the UI can show the same
 * coach's name/avatar that actually wrote the explanation.
 */
export const COACH_PERSONAS = {
  beginner: {
    id: 'beginner',
    name: 'מאמן דני',
    avatar: '🐥',
    tagline: 'מסביר הכל צעד-צעד, בלי מילים קשות',
  },
  intermediate: {
    id: 'intermediate',
    name: 'מאמנת מיכל',
    avatar: '📘',
    tagline: 'מסבירה עקרונות בבהירות, שלב אחר שלב',
  },
  advanced: {
    id: 'advanced',
    name: 'רב-אמן עומר',
    avatar: '♞',
    tagline: 'ניתוח מדויק ומעמיק לשחקנים רציניים',
  },
};

export function getPersonaForElo(elo) {
  if (elo != null && elo <= 900) return COACH_PERSONAS.beginner;
  if (elo != null && elo <= 1400) return COACH_PERSONAS.intermediate;
  return COACH_PERSONAS.advanced;
}
