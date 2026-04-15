/**
 * Spinner.jsx  ─  Loading indicator
 *
 * Props:
 *   size   "sm" | "md" | "lg"  (default: "md")
 *   color  "neon" | "white" | "violet"  (default: "neon")
*/

export default function Spinner({ size = 'md', color = 'neon' }) {
    const sizes = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-2', lg: 'w-12 h-12 border-[3px]' };
    const colors = {
        neon: 'border-neon border-t-transparent',
        white: 'border-white border-t-transparent',
        violet: 'border-violet border-t-transparent',
    };
    return (
        <div
            role="status"
            aria-label="Loading"
            className={`${sizes[size]} ${colors[color]} rounded-full animate-spin`}
        />
    );
}
