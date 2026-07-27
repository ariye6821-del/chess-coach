const STORAGE_KEY = 'chess-coach-repertoire-progress';
const LEITNER_INTERVAL_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 };

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage unavailable - progress just won't persist this update
  }
}

export function getLineProgress(id) {
  const progress = loadProgress();
  return progress[id] || { box: 1, nextReviewAt: null, attempts: 0 };
}

export function isLineDue(id) {
  const entry = getLineProgress(id);
  return !entry.nextReviewAt || new Date(entry.nextReviewAt).getTime() <= Date.now();
}

/** Records a completed drill attempt - a flawless run promotes the line, any mistake resets it to box 1 (due again immediately). */
export function markLineResult(id, wasFlawless) {
  const progress = loadProgress();
  const entry = progress[id] || { box: 1, nextReviewAt: null, attempts: 0 };
  entry.attempts = (entry.attempts || 0) + 1;
  if (wasFlawless) {
    entry.box = Math.min(5, (entry.box || 1) + 1);
    const days = LEITNER_INTERVAL_DAYS[entry.box] ?? 16;
    entry.nextReviewAt = new Date(Date.now() + days * 86400000).toISOString();
  } else {
    entry.box = 1;
    entry.nextReviewAt = new Date().toISOString();
  }
  progress[id] = entry;
  saveProgress(progress);
  return entry;
}
