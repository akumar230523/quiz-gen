// ── Spinner ────────────────────────────────────────────────────
export default function Spinner({ size = 'md', color = 'neon' }) {
    const sz = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-14 h-14' }[size];
    const col = color === 'neon' ? 'border-neon' : color === 'violet' ? 'border-violet-400' : 'border-white';
    return (
        <div className={`${sz} rounded-full border-2 border-white/10 ${col} border-t-transparent animate-spin`} />
    );
}