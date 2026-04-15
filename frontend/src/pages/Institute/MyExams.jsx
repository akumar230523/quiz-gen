/**
 * MyExams.jsx  ─  Institute's exam management list
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { instituteAPI, getErrMsg } from '@/services/api';
import { Plus, Trash2, BarChart3, Copy, Clock, BookOpen, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

const DIFF = { easy: 'badge-emerald', medium: 'badge-amber', hard: 'badge-rose' };

export default function MyExams() {
  usePageTitle('My Exams');
  const [exams,   setExams]   = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    instituteAPI.myExams()
      .then(r => setExams(r.data?.exams || []))
      .catch(() => toast.error('Failed to load exams'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function del(examId) {
    if (!confirm('Delete this exam? This cannot be undone.')) return;
    try {
      await instituteAPI.deleteExam(examId);
      toast.success('Exam deleted'); load();
    } catch (err) { toast.error(getErrMsg(err)); }
  }

  return (
    <Layout>
      <div className="page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold" style={{ color: 'var(--text)' }}>My Exams</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{exams.length} published exam{exams.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/institute/create" className="btn-primary"><Plus size={16} /> Create Exam</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : exams.length === 0 ? (
          <EmptyState icon={BookOpen} title="No exams yet" desc="Create your first exam and share it with students."
            action={<Link to="/institute/create" className="btn-primary inline-flex"><Plus size={16} /> Create First Exam</Link>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {exams.map(ex => (
              <div key={ex._id} className="glass p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold truncate" style={{ color: 'var(--text)' }}>{ex.name}</h3>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{ex.institute_name}</p>
                  </div>
                  <span className={`badge ${DIFF[ex.difficulty] || 'badge-grey'} shrink-0`}>{ex.difficulty}</span>
                </div>

                {ex.description && <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{ex.description}</p>}

                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                  <span className="flex items-center gap-1"><BookOpen size={11} /> {ex.questions?.length || 0} Qs</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {ex.duration} min</span>
                  <span className="flex items-center gap-1"><Users size={11} /> {ex.attempt_count || 0}</span>
                </div>

                {/* Exam ID */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
                  <span className="font-mono text-xs text-neon/80 flex-1 truncate">{ex.exam_id}</span>
                  <button onClick={() => { navigator.clipboard.writeText(ex.exam_id); toast.success('Copied!'); }} className="btn-ghost p-1 shrink-0" style={{ color: 'var(--text-dim)' }}>
                    <Copy size={13} />
                  </button>
                </div>

                <div className="flex gap-2 mt-auto">
                  <Link to={`/institute/analytics?examId=${ex.exam_id}`} className="btn-secondary flex-1 text-xs py-2 justify-center">
                    <BarChart3 size={12} /> Analytics
                  </Link>
                  <button onClick={() => del(ex.exam_id)} className="btn-danger text-xs py-2 px-3">
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
