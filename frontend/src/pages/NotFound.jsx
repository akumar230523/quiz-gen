/**
 * NotFound.jsx  ─  404 page with auto-redirect countdown
*/

import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Search, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function NotFound() {
    usePageTitle('Page Not Found');
    const navigate = useNavigate();
    const [count, setCount] = useState(10);

    useEffect(() => {
        const id = setInterval(() => {
            setCount(c => {
                if (c <= 1) { clearInterval(id); navigate('/'); }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg)' }}>
            <div className="orb w-96 h-96 bg-neon/10 -top-24 -left-24 pointer-events-none" />
            <div className="orb w-72 h-72 bg-violet/15 bottom-0 right-0 pointer-events-none" style={{ animationDelay: '2s' }} />

            <div className="relative z-10 text-center max-w-md animate-fade-in">
                <Link to="/" className="flex items-center justify-center gap-2 mb-12">
                    <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center">
                        <Zap size={16} className="text-ink fill-ink" />
                    </div>
                    <span className="font-display font-bold text-lg" style={{ color: 'var(--text)' }}>
                        Quiz<span className="text-neon">Gen</span>
                    </span>
                </Link>

                <div className="relative mb-8">
                    <div className="text-[140px] font-display font-black leading-none text-gradient-neon opacity-15 select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="glass p-5 text-center">
                            <Search size={28} className="mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
                            <p className="font-display font-bold" style={{ color: 'var(--text)' }}>Page not found</p>
                        </div>
                    </div>
                </div>

                <p className="font-body mb-2" style={{ color: 'var(--text-muted)' }}>
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <p className="text-xs mb-8" style={{ color: 'var(--text-dim)' }}>
                    Redirecting to home in <span className="text-neon font-mono font-bold">{count}s</span>…
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => navigate(-1)} className="btn-secondary">
                        <ArrowLeft size={15} /> Go Back
                    </button>
                    <Link to="/" className="btn-primary justify-center">
                        <Home size={15} /> Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
