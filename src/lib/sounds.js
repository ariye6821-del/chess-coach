const STORAGE_KEY = 'chess-coach-sound-enabled';
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtor();
  }
  return audioCtx;
}

export function isSoundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore
  }
}

function beep({ freq, duration = 0.08, type = 'sine', gain = 0.15 }) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.value = gain;
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // WebAudio unavailable (older browser, autoplay policy, etc.) - fail silently
  }
}

export function playMoveSound() {
  beep({ freq: 480, duration: 0.06 });
}

export function playCaptureSound() {
  beep({ freq: 300, duration: 0.09, type: 'square' });
}

export function playCheckSound() {
  beep({ freq: 700, duration: 0.12, type: 'triangle' });
}

export function playMistakeSound() {
  beep({ freq: 160, duration: 0.25, type: 'sawtooth', gain: 0.12 });
}

export function playGameOverSound() {
  beep({ freq: 520, duration: 0.15 });
  setTimeout(() => beep({ freq: 660, duration: 0.2 }), 140);
}
