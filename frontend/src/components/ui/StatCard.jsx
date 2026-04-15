/**
 * StatCard.jsx  ─  A single metric card (used on Dashboard, Performance, etc.)
 *
 * Props:
 *   icon      LucideIcon component
 *   label     string   — metric label
 *   value     string | number
 *   color     string   — Tailwind color class e.g. "text-neon"
 *   loading   boolean  — shows shimmer skeleton
 */
export default function StatCard({ icon: Icon, label, value, color = 'text-neon', loading = false }) {
    if (loading) {
        return (
            <div className="glass p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg shimmer" />
                <div className="h-7 w-24 rounded shimmer" />
                <div className="h-3 w-16 rounded shimmer" />
            </div>
        );
    }

    return (
        <div className="glass p-5">
            {Icon && <Icon size={20} className={`${color} mb-3`} />}
            <p className="text-2xl font-display font-bold" style={{ color: 'var(--text)' }}>
                {value ?? '—'}
            </p>
            <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {label}
            </p>
        </div>
    );
}
