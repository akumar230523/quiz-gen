/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                display: ['Syne', 'sans-serif'],
                body: ['DM Sans', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                ink: { DEFAULT: '#0a0f1e', 50: '#f0f1f8', 100: '#d8dbef', 200: '#b0b6df', 300: '#7f89cc', 400: '#5563b8', 500: '#3d4fa4', 600: '#2e3d8f', 700: '#232e72', 800: '#18205a', 900: '#0a0f1e' },
                neon: { DEFAULT: '#00f5d4', 50: '#e6fff9', 100: '#b3fff1', 200: '#66ffe3', 300: '#00f5d4', 400: '#00d4b8', 500: '#00b39c', 600: '#009280', 700: '#007164', 800: '#005048', 900: '#002f2c' },
                violet: { DEFAULT: '#7c3aed', 50: '#f5f0ff', 100: '#ede8ff', 200: '#d6d0ff', 300: '#b8aaff', 400: '#9578ff', 500: '#7c3aed', 600: '#6d28d9', 700: '#5b21b6', 800: '#4c1d95', 900: '#2e1065' },
                amber: { DEFAULT: '#f59e0b' },
                rose: { DEFAULT: '#f43f5e' },
                emerald: { DEFAULT: '#10b981' },
            },
            backgroundImage: {
                'grid': "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.04)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
                'glow-neon': 'radial-gradient(ellipse at center, rgba(0,245,212,0.15) 0%, transparent 70%)',
                'glow-violet': 'radial-gradient(ellipse at center, rgba(124,58,237,0.2) 0%, transparent 70%)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease forwards',
                'slide-up': 'slideUp 0.4s ease forwards',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
                slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
                float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
            },
            boxShadow: {
                'neon': '0 0 30px rgba(0,245,212,0.3), 0 0 60px rgba(0,245,212,0.1)',
                'violet': '0 0 30px rgba(124,58,237,0.4), 0 0 60px rgba(124,58,237,0.15)',
                'glass': '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                'card': '0 4px 24px rgba(0,0,0,0.4)',
            },
        },
    },
    plugins: [],
}