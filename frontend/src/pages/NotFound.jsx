// FILE: frontend/src/pages/NotFound.jsx

import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Search, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotFound() {
    const navigate = useNavigate();
    const [count, setCount] = useState(10);

    // Auto-redirect after 10s
    useEffect(() => {
        const id = setInterval(() => {
            setCount(c => { if (c <= 1) { clearInterval(id); navigate('/'); } return c - 1; });
        }, 1000);
        return () => clearInterval(id);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-ink flex items-center justify-center px-4">
            <div className="orb w-96 h-96 bg-neon/10 top-0 left-0 pointer-events-none fixed" />
            <div className="orb w-72 h-72 bg-violet/15 bottom-0 right-0 pointer-events-none fixed" />

            <div className="relative z-10 text-center max-w-md animate-fade-in">
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-2 mb-12">
                    <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center">
                        <Zap size={16} className="text-ink fill-ink" />
                    </div>
                    <span className="font-display font-bold text-lg">Quiz<span className="text-neon">Gen</span></span>
                </Link>

                {/* 404 */}
                <div className="relative mb-8">
                    <div className="text-[160px] font-display font-black leading-none text-gradient-neon opacity-20 select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="glass p-6">
                            <Search size={32} className="text-neon/60 mx-auto mb-2" />
                            <p className="text-white font-display font-bold text-lg">Page not found</p>
                        </div>
                    </div>
                </div>

                <p className="text-white/50 font-body mb-2 leading-relaxed">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <p className="text-xs text-white/30 mb-8">
                    Redirecting to home in <span className="text-neon font-mono font-bold">{count}s</span>…
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => navigate(-1)} className="btn-secondary">
                        <ArrowLeft size={15} />Go Back
                    </button>
                    <Link to="/" className="btn-primary justify-center">
                        <Home size={15} />Home
                    </Link>
                </div>
            </div>
        </div>
    );
}