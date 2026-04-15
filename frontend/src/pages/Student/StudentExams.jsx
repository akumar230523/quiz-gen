/**
 * StudentExams.jsx  ─  Search for institute exams by name or ID
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { studentAPI, getErrMsg } from '@/services/api';
import { Search, BookOpen, Clock, Trophy, ArrowRight, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

const DIFF = { easy: 'badge-emerald', medium: 'badge-amber', hard: 'badge-rose' };

export default function StudentExams() {
  usePageTitle('Find Exam');
  const navigate = useNavigate();
  const [query,    setQuery]    = useState('');
  const [exams,    setExams]    = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function search() {
    if (!query.trim()) { toast.error('Enter an institute name or exam ID'); return; }
    setLoading(true);
    try {
      const res = await studentAPI.searchExams(query.trim());
      setExams(res.data?.exams || res.data || []);
      setSearched(true);
    } catch (err) {
      toast.error(getErrMsg(err));
    } finally { setLoading(false); }
  }

  return (
    <Layout>
      <div className="page max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--text)' }}>Find Your Exam</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Search by institute name or paste the Exam ID your teacher shared.</p>
        </div>

        <div className="glass p-6 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
              <input className="input pl-10" placeholder="Institute name or Exam ID…"
                value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
            </div>
            <button onClick={search} disabled={loading} className="btn-primary shrink-0">
              {loading ? <Spinner size="sm" color="dark" /> : <><Search size={16} /> Search</>}
            </button>
          </div>
        </div>

        {loading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}

        {searched && !loading && exams.length === 0 && (
          <EmptyState icon={BookOpen} title="No exams found" desc="Check the institute name or exam ID and try again." />
        )}

        {exams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map(ex => (
              <div key={ex._id} className="glass p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold" style={{ color: 'var(--text)' }}>{ex.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Building2 size={11} /> {ex.institute_name}
                    </div>
                  </div>
                  <span className={`badge ${DIFF[ex.difficulty] || 'badge-grey'}`}>{ex.difficulty}</span>
                </div>
                {ex.description && <p className="text-xs line-clamp-2" style={{ color: 'var(--text-muted)' }}>{ex.description}</p>}
                <div className="flex gap-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                  <span className="flex items-center gap-1"><Clock size={11} /> {ex.duration} min</span>
                  <span className="flex items-center gap-1"><BookOpen size={11} /> {ex.questions?.length || 0} Questions</span>
                  {ex.total_marks && <span className="flex items-center gap-1"><Trophy size={11} /> {ex.total_marks} marks</span>}
                </div>
                <button onClick={() => navigate(`/exam/${ex.exam_id}`)} className="btn-primary text-sm justify-center mt-auto">
                  Attempt Exam <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 glass p-5">
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Note:</span> Each exam can only be attempted once. Ensure a stable internet connection before starting.
          </p>
        </div>
      </div>
    </Layout>
  );
}
