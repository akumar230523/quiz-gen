import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import { quizAPI } from '@/services/api';
import { Search, Globe, ArrowRight, BookOpen } from 'lucide-react';
import Spinner from '@/components/common/Spinner';

export default function Countries() {
    const [countries, setCountries] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        quizAPI.getCountries()
            .then(r => { setCountries(r.data); setFiltered(r.data); })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setFiltered(countries.filter(c => c.name.toLowerCase().includes(search.toLowerCase())));
    }, [search, countries]);

    return (
        <Layout>
            <div className="page">
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold mb-1">Choose a Country</h1>
                    <p className="text-white/40 font-body">Select the country whose exams you want to attempt.</p>
                </div>

                {/* Search */}
                <div className="relative mb-8 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input className="input pl-10" placeholder="Search country..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filtered.map(c => (
                            <Link key={c._id} to={`/exams/${c._id}`}
                                className="glass-hover p-6 text-center group cursor-pointer">
                                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-200">{c.flag}</div>
                                <h3 className="font-display font-semibold text-white text-sm mb-1">{c.name}</h3>
                                <span className="badge-grey text-xs">{c.code}</span>
                                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-white/30 group-hover:text-neon transition-colors">
                                    <BookOpen size={11} /> View Exams
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}