/**
 * Card.jsx  ─  Reusable glass card component
 *
 * Props:
 *   className  string   — additional Tailwind classes
 *   hover      boolean  — adds hover lift effect
 *   onClick    fn       — makes it clickable
 *   children   ReactNode
*/
export default function Card({ className = '', hover = false, onClick, children }) {
    const base = hover ? 'glass-hover cursor-pointer' : 'glass';
    return (
        <div
            className={`${base} ${className}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}
