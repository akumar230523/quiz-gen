/**
 * ThemeContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the dark / light theme toggle for the whole app.
 *
 * How it works:
 *  - Theme is stored in localStorage so it persists across browser sessions.
 *  - Toggling adds/removes the class "light" on the <html> element.
 *    CSS in index.css reads this class to swap all CSS variables.
 *  - Any component can call useTheme() to get current theme and a toggle fn.
 *
 * Usage:
 *   const { theme, toggleTheme, isDark } = useTheme();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useEffect } from 'react';

// Create context with a sensible default so it's safe without a Provider
const ThemeCtx = createContext({ theme: 'dark', isDark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  // Read saved preference, default to 'dark'
  const [theme, setTheme] = useState(() => localStorage.getItem('qg-theme') || 'dark');

  // Keep <html> class in sync whenever theme changes
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.classList.add('light');
    } else {
      html.classList.remove('light');
    }
    localStorage.setItem('qg-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeCtx.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// Convenience hook
export const useTheme = () => useContext(ThemeCtx);
