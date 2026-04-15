/**
 * EmptyState.jsx  ─  Shown when a list or data section is empty
 *
 * Props:
 *   icon     LucideIcon
 *   title    string
 *   desc     string
 *   action   ReactNode  — optional CTA button
 */
export default function EmptyState({ icon: Icon, title, desc, action }) {
    return (
        <div className="glass p-12 text-center flex flex-col items-center gap-3">
            {Icon && <Icon size={40} style={{ color: 'var(--text-dim)' }} className="mb-1" />}
            {title && (
                <p className="font-display font-semibold" style={{ color: 'var(--text)' }}>
                    {title}
                </p>
            )}
            {desc && (
                <p className="text-sm font-body max-w-xs" style={{ color: 'var(--text-muted)' }}>
                    {desc}
                </p>
            )}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}
