import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import { instituteAPI } from '@/services/api';
import { Plus, Trash2, BarChart3, Copy, Clock, BookOpen, Users, ExternalLink } from 'lucide-react';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const DIFF = { easy: 'badge-emerald', medium: 'badge-amber', hard: 'badge-rose' };

export default function MyExams() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        instituteAPI.myExams()
            .then(r => setExams(r.data.exams || []))
            .catch(() => toast.error('Failed to load exams'))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const del = async (examId) => {
        if (!confirm('Delete this exam? This cannot be undone.')) return;
        try {
            await instituteAPI.deleteExam(examId);
            toast.success('Exam deleted');
            load();
        } catch { toast.error('Delete failed'); }
    };

    const copy = (id) => { navigator.clipboard.writeText(id); toast.success('Exam ID copied!'); };

    return (
        <Layout>
            <div className="page">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-display font-bold">My Exams</h1>
                        <p className="text-white/40 mt-1">{exams.length} published exam{exams.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Link to="/institute/create" className="btn-primary">
                        <Plus size={16} /> Create Exam
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
                ) : exams.length === 0 ? (
                    <div className="glass p-16 text-center">
                        <BookOpen size={48} className="text-white/20 mx-auto mb-4" />
                        <h2 className="font-display font-semibold text-white mb-2">No exams yet</h2>
                        <p className="text-white/40 text-sm mb-6">Create your first exam and share it with students.</p>
                        <Link to="/institute/create" className="btn-primary mx-auto inline-flex">
                            <Plus size={16} /> Create First Exam
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {exams.map(ex => (
                            <div key={ex._id} className="glass p-6 flex flex-col gap-4 group">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-display font-bold text-white truncate">{ex.name}</h3>
                                        <p className="text-xs text-white/40 mt-0.5 truncate">{ex.institute_name}</p>
                                    </div>
                                    <span className={DIFF[ex.difficulty] || 'badge-grey'}>{ex.difficulty}</span>
                                </div>

                                {/* Description */}
                                {ex.description && (
                                    <p className="text-xs text-white/50 font-body line-clamp-2">{ex.description}</p>
                                )}

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-xs text-white/40">
                                    <span className="flex items-center gap-1"><BookOpen size={11} /> {ex.questions?.length || 0} Qs</span>
                                    <span className="flex items-center gap-1"><Clock size={11} /> {ex.duration} min</span>
                                    <span className="flex items-center gap-1"><Users size={11} /> {ex.attempt_count || 0} attempts</span>
                                </div>

                                {/* Exam ID */}
                                <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg">
                                    <span className="font-mono text-xs text-neon/80 flex-1 truncate">{ex.exam_id}</span>
                                    <button onClick={() => copy(ex.exam_id)} className="btn-ghost p-1 text-white/30 hover:text-white/70 shrink-0">
                                        <Copy size={13} />
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-auto">
                                    <Link to={`/institute/analytics?examId=${ex.exam_id}`} className="btn-secondary flex-1 text-xs py-2 justify-center">
                                        <BarChart3 size={12} /> Analytics
                                    </Link>
                                    <button onClick={() => del(ex.exam_id)}
                                        className="btn-danger text-xs py-2 px-3">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}