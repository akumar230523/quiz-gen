import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import { instituteAPI } from '@/services/api';
import {
    Search, Users, TrendingUp, Trophy, AlertTriangle,
    BarChart3, CheckCircle, XCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import Spinner from '@/components/common/Spinner';
import toast from 'react-hot-toast';

const COLORS = ['#00f5d4', '#f43f5e', '#7c3aed', '#f59e0b', '#10b981'];

const TT = ({ active, payload, label }) => active && payload?.length ? (
    <div className="glass px-3 py-2 text-xs">
        <p className="text-white/50 mb-1">{label}</p>
        <p className="text-neon font-semibold">{payload[0]?.value}</p>
    </div>
) : null;

export default function Analytics() {
    const [params] = useSearchParams();
    const [examId, setExamId] = useState(params.get('examId') || '');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exists, setExists] = useState(null);

    // Auto-check exam existence
    useEffect(() => {
        if (!examId.trim()) { setExists(null); return; }
        const t = setTimeout(() => {
            instituteAPI.checkExamId(examId)
                .then(r => setExists(r.data.exists))
                .catch(() => setExists(false));
        }, 500);
        return () => clearTimeout(t);
    }, [examId]);

    const fetch = async () => {
        if (!examId.trim()) { toast.error('Enter exam ID'); return; }
        setLoading(true);
        try {
            const res = await instituteAPI.getAnalytics(examId);
            if (res.data.status === 'success') setData(res.data.analytics);
            else toast.error(res.data.message || 'Failed');
        } catch { toast.error('Could not fetch analytics'); }
        finally { setLoading(false); }
    };

    const a = data;

    return (
        <Layout>
            <div className="page">
                <h1 className="text-3xl font-display font-bold mb-1">Exam Analytics</h1>
                <p className="text-white/40 mb-8">View class performance and insights for any published exam.</p>

                {/* Search */}
                <div className="glass p-6 mb-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                            <input className="input pl-10 pr-10" placeholder="Enter Exam ID..."
                                value={examId} onChange={e => setExamId(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && fetch()} />
                            {exists !== null && (
                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${exists ? 'text-neon' : 'text-rose'}`}>
                                    {exists ? '✓' : '✗'}
                                </span>
                            )}
                        </div>
                        <button onClick={fetch} disabled={loading || exists === false} className="btn-primary shrink-0">
                            {loading ? <Spinner size="sm" /> : <><BarChart3 size={16} /> Analyse</>}
                        </button>
                    </div>
                    {exists === false && <p className="text-rose text-xs mt-2">Exam not found. Check the ID.</p>}
                </div>

                {loading && <div className="flex justify-center py-20"><Spinner size="lg" /></div>}

                {a && !loading && (
                    <div className="space-y-5 animate-fade-in">

                        {/* Overview */}
                        <div>
                            <h2 className="font-display font-semibold text-white mb-1">{a.exam_name}</h2>
                            <p className="text-white/40 text-sm">{a.institute_name} · {a.subject}</p>
                        </div>

                        {/* KPI cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { icon: Users, label: 'Students', value: a.total_students, color: 'text-neon' },
                                { icon: TrendingUp, label: 'Avg Score', value: `${a.average_score?.toFixed(1)}%`, color: 'text-violet-300' },
                                { icon: Trophy, label: 'Highest', value: `${a.highest_score?.toFixed(1)}%`, color: 'text-amber' },
                                { icon: CheckCircle, label: 'Pass Rate', value: `${a.pass_percentage?.toFixed(1)}%`, color: 'text-emerald' },
                            ].map(s => (
                                <div key={s.label} className="glass p-5">
                                    <s.icon size={18} className={`${s.color} mb-3`} />
                                    <div className="text-2xl font-display font-bold text-white">{s.value}</div>
                                    <div className="text-xs text-white/40 font-body mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Charts row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                            {/* Score Distribution */}
                            <div className="glass p-6">
                                <h3 className="font-display font-semibold text-white mb-4">Score Distribution</h3>
                                {a.score_distribution?.length ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={a.score_distribution} margin={{ left: -20, right: 0 }}>
                                            <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<TT />} />
                                            <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p className="text-white/30 text-sm text-center py-10">No data</p>}
                            </div>

                            {/* Pass/Fail Pie */}
                            <div className="glass p-6">
                                <h3 className="font-display font-semibold text-white mb-4">Pass / Fail</h3>
                                {a.total_students > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={[
                                                { name: 'Pass', value: a.pass_count },
                                                { name: 'Fail', value: a.fail_count },
                                            ]} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                <Cell fill="#00f5d4" />
                                                <Cell fill="#f43f5e" />
                                            </Pie>
                                            <Tooltip contentStyle={{ background: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <p className="text-white/30 text-sm text-center py-10">No attempts yet</p>}
                            </div>
                        </div>

                        {/* Student Results Table */}
                        {a.student_results?.length > 0 && (
                            <div className="glass p-6">
                                <h3 className="font-display font-semibold text-white mb-4">
                                    Student Results
                                    <span className="ml-2 badge-grey">{a.student_results.length}</span>
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm font-body">
                                        <thead>
                                            <tr className="border-b border-white/8">
                                                {['Rank', 'Student', 'Score', 'Marks', 'Status', 'Time'].map(h => (
                                                    <th key={h} className="text-left px-3 py-2 text-xs text-white/40 uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {a.student_results.map((s, i) => (
                                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="px-3 py-3 text-white/40">#{i + 1}</td>
                                                    <td className="px-3 py-3">
                                                        <div className="font-semibold text-white">{s.student_name}</div>
                                                        <div className="text-xs text-white/30">{s.student_id}</div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className={`font-display font-bold ${s.score >= 70 ? 'text-neon' : s.score >= 40 ? 'text-amber' : 'text-rose'}`}>
                                                            {s.score}%
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-white/60">{s.obtained_marks}/{a.total_marks || '—'}</td>
                                                    <td className="px-3 py-3">
                                                        <span className={s.status === 'pass' ? 'badge-emerald' : 'badge-rose'}>
                                                            {s.status === 'pass' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-white/40">{s.time_taken ? `${s.time_taken}m` : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {a.total_students === 0 && (
                            <div className="glass p-12 text-center">
                                <Users size={40} className="text-white/20 mx-auto mb-3" />
                                <p className="text-white/40 font-body">No students have attempted this exam yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}