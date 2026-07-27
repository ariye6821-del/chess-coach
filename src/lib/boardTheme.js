const STORAGE_KEY = 'chess-coach-board-theme-v1';
const EVENT_NAME = 'chess-coach-board-theme-change';

export const BOARD_THEME_PRESETS = [
  { id: 'classic', name: 'קלאסי (כחול)', light: '#dce6ec', dark: '#4f6f8f' },
  { id: 'wood', name: 'עץ', light: '#f0d9b5', dark: '#b58863' },
  { id: 'green', name: 'ירוק', light: '#eeeed2', dark: '#769656' },
  { id: 'gray', name: 'אפור', light: '#e8e8e8', dark: '#7a7a7a' },
  { id: 'purple', name: 'סגול', light: '#e8e0f5', dark: '#8877b8' },
  { id: 'dark', name: 'כהה', light: '#4a4a4a', dark: '#1e1e1e' },
  { id: 'colorblind', name: 'ידידותי לעיוורי צבעים', light: '#f5e6c8', dark: '#2f6690' },
];

export const DEFAULT_BOARD_THEME = BOARD_THEME_PRESETS[0];

function isValidTheme(t) {
  return !!t && typeof t.light === 'string' && typeof t.dark === 'string';
}

export function loadBoardTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BOARD_THEME;
    const parsed = JSON.parse(raw);
    return isValidTheme(parsed) ? parsed : DEFAULT_BOARD_THEME;
  } catch {
    return DEFAULT_BOARD_THEME;
  }
}

/**
 * Persists the theme and broadcasts it to every other mounted board on the page
 * (they each hold their own copy of the theme via useBoardTheme), since this is a
 * global preference that can be changed from a selector far from the boards
 * currently on screen.
 */
export function saveBoardTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) - just won't persist
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: theme }));
}

export function subscribeBoardTheme(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
