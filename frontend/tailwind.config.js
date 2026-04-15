// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
    // Tell Tailwind which files to scan for class names (for tree-shaking)
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],

    // darkMode: 'class' means dark theme is applied when the <html> element
    // has the class "dark" — we toggle this in ThemeContext
    darkMode: 'class',

    theme: {
        extend: {
            // ── Custom color palette ─────────────────────────────────────────────
            colors: {
                // Dark (default) theme base
                ink: '#0a0f1e',   // deepest background
                surface: '#111827',   // card backgrounds
                border: '#1f2937',   // subtle borders

                // Brand accent colours
                neon: '#00f5d4',   // primary CTA — teal/cyan
                violet: '#7c3aed',   // secondary accent — purple
                amber: '#f59e0b',   // warning / highlight
                rose: '#f43f5e',   // error / danger
                emerald: '#10b981',   // success / positive

                // Light theme surfaces
                light: {
                    bg: '#f8fafc',
                    surface: '#ffffff',
                    border: '#e2e8f0',
                    text: '#0f172a',
                    muted: '#64748b',
                },
            },

            // ── Typography ───────────────────────────────────────────────────────
            fontFamily: {
                // Display font: used for headings, nav, buttons (bold, characterful)
                display: ['Syne', 'sans-serif'],
                // Body font: used for paragraphs, labels (readable, clean)
                body: ['DM Sans', 'sans-serif'],
                // Mono font: used for exam IDs, code snippets
                mono: ['JetBrains Mono', 'monospace'],
            },

            // ── Animations ───────────────────────────────────────────────────────
            keyframes: {
                // Smooth fade in from slight offset (used on page mounts)
                'fade-in': {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                // Slide up (used on modal / card appearances)
                'slide-up': {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                // Floating orb background decoration
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-12px)' },
                },
                // Skeleton loading shimmer
                shimmer: {
                    '0%': { backgroundPosition: '200% 0' },
                    '100%': { backgroundPosition: '-200% 0' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.4s ease-out forwards',
                'slide-up': 'slide-up 0.4s ease-out forwards',
                float: 'float 6s ease-in-out infinite',
                shimmer: 'shimmer 2s linear infinite',
            },
        },
    },

    plugins: [],
};
