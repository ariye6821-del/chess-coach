function storageKey(mode) {
  return `chess-coach-active-game-${mode}`;
}

export function saveActiveGame(mode, data) {
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(data));
  } catch {
    // localStorage unavailable - the game just won't persist across reloads
  }
}

export function loadActiveGame(mode) {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearActiveGame(mode) {
  try {
    localStorage.removeItem(storageKey(mode));
  } catch {
    // ignore
  }
}
