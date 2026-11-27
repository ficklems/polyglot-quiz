import { useCallback, useEffect, useState } from 'react';
import { readStored, writeStored } from '../../shared/storage';
import { resolveInitialTheme, THEME_STORAGE_KEY, toggleTheme, type Theme } from './theme';

function initialTheme(): Theme {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  return resolveInitialTheme(readStored(THEME_STORAGE_KEY), prefersDark);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStored(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(toggleTheme), []);

  return { theme, toggle };
}
