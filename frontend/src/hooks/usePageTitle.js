/**
 * usePageTitle.js
 * Sets the browser tab title for the current page.
 * Usage:  usePageTitle('Dashboard')  →  "Dashboard – QuizGen"
*/
import { useEffect } from 'react';

export function usePageTitle(title) {
    useEffect(() => {
        document.title = title ? `${title} – QuizGen` : 'QuizGen';
        return () => { document.title = 'QuizGen'; };
    }, [title]);
}
