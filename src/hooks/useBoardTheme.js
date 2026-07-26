import { useEffect, useState } from 'react';
import { loadBoardTheme, saveBoardTheme, subscribeBoardTheme } from '../lib/boardTheme';

/**
 * Board color theme is a global preference stored in localStorage. Multiple boards
 * (play screen, puzzle trainer, game review) each hold their own copy via this hook,
 * so changing it from one selector needs to broadcast to the others - see
 * subscribeBoardTheme in lib/boardTheme.js.
 */
export function useBoardTheme() {
  const [theme, setThemeState] = useState(loadBoardTheme);

  useEffect(() => subscribeBoardTheme(setThemeState), []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    saveBoardTheme(newTheme);
  };

  return [theme, setTheme];
}
