const ONBOARDING_KEY = 'chess-coach-onboarding-done';
const PLAN_KEY = 'chess-coach-training-plan';
const CHESSCOM_USERNAME_KEY = 'chess-coach-chesscom-username';

export function hasOnboarded() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboarded() {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // localStorage unavailable - onboarding will just show again next visit
  }
}

export function getSavedPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePlan(plan) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    // localStorage unavailable - plan just won't persist across reloads
  }
}

/** Prefills the analysis form from whichever chess.com username was saved elsewhere in the app. */
export function getDefaultUsername() {
  try {
    return localStorage.getItem(CHESSCOM_USERNAME_KEY) || '';
  } catch {
    return '';
  }
}
