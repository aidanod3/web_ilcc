import { useState, useEffect } from 'react';

export const THEMES = [
  { id: 'dark',     label: 'Dark' },
  { id: 'light',    label: 'Light' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'dracula',  label: 'Dracula' },
  { id: 'monokai',  label: 'Monokai' },
];

const STORAGE_KEY = 'ilcc-theme';
const DEFAULT_THEME = 'dark';

export default function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Apply on first mount in case localStorage had a saved value
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { theme, setTheme: setThemeState, themes: THEMES };
}
