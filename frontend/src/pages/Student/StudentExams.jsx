import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import { studentAPI } from '@/services/api';
import { Search, BookOpen, Clock, Trophy, ArrowRight, Building2 } from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const DIFF = { easy: 'badge-emerald', medium: 'badge-amber', hard: 'badge-rose' };

export default function StudentExams() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [exams, setExams] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    const search = async () => {
        if (!query.trim()) { toast.error('Enter an institute name or exam ID'); return; }
        setLoading(true);
        try {
            const res = await studentAPI.searchExams(query.trim());
            setExams(res.data);
            setSearched(true);
            if (!res.data.length) toast('No exams found for that query.', { icon: '🔍' });
        } catch { toast.error('Search failed'); }
        finally { setLoading(false); }
    };

    return (
        <Layout>
            <div className="page max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold mb-1">Find Your Exam</h1>
                    <p className="text-white/40 font-body">Search by institute name or paste the Exam ID your teacher shared.</p>
                </div>

                {/* Search box */}
                <div className="glass p-6 mb-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input className="input pl-10" placeholder="Institute name or Exam ID..."
                                value={query} onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && search()} />
                        </div>
                        <button onClick={search} disabled={loading} className="btn-primary shrink-0">
                            {loading ? <Spinner size="sm" /> : <><Search size={16} /> Search</>}
                        </button>
                    </div>
                </div>

                {loading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}

                {searched && !loading && exams.length === 0 && (
                    <div className="glass p-12 text-center">
                        <BookOpen size={40} className="text-white/20 mx-auto mb-3" />
                        <p className="text-white/40">No exams found. Check the ID or institute name.</p>
                    </div>
                )}

                {exams.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {exams.map(ex => (
                            <div key={ex._id} className="glass p-6 flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-display font-bold text-white">{ex.name}</h3>
                                        <div className="flex items-center gap-1 mt-0.5 text-xs text-white/40">
                                            <Building2 size={11} /> {ex.institute_name}
                                        </div>
                                    </div>
                                    <span className={DIFF[ex.difficulty] || 'badge-grey'}>{ex.difficulty}</span>
                                </div>
                                {ex.description && <p className="text-xs text-white/50 line-clamp-2">{ex.description}</p>}
                                <div className="flex gap-4 text-xs text-white/40">
                                    <span className="flex items-center gap-1"><Clock size={11} /> {ex.duration} min</span>
                                    <span className="flex items-center gap-1"><BookOpen size={11} /> {ex.questions?.length || 0} Questions</span>
                                    {ex.total_marks && <span className="flex items-center gap-1"><Trophy size={11} /> {ex.total_marks} marks</span>}
                                </div>
                                <button onClick={() => navigate(`/exam/${ex.exam_id}`)}
                                    className="btn-primary text-sm justify-center mt-auto">
                                    Attempt Exam <ArrowRight size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 glass p-5">
                    <p className="text-sm font-body text-white/40">
                        <span className="text-white/60 font-semibold">Note:</span> Each exam can only be attempted once. Make sure you have a stable internet connection and sufficient time before starting.
                    </p>
                </div>
            </div>
        </Layout>
    );
}