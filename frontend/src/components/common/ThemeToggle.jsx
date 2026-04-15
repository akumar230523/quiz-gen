/**
 * ThemeToggle.jsx  ─  Dark / Light mode button
 * Shows a sun icon in dark mode and a moon icon in light mode.
 * Clicking it calls ThemeContext.toggleTheme().
*/

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 ${className}`}
            style={{ color: 'var(--text-muted)' }}
        >
            {isDark
                ? <Sun size={17} className="text-amber" />
                : <Moon size={17} className="text-violet-400" />
            }
        </button>
    );
}
