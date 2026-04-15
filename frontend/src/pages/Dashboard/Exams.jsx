/**
 * Exams.jsx  ─  Lists exams for the chosen country
 * Two buttons per exam: Online MCQ and Descriptive modes.
*/

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { quizAPI } from '@/services/api';
import { ArrowLeft, Search, Clock, Zap, BookOpen } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

const DIFF_BADGE = { easy: 'badge-emerald', medium: 'badge-amber', hard: 'badge-rose' };

export default function Exams() {
  usePageTitle('Select Exam');
  const { countryId } = useParams();
  const [exams, setExams] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizAPI.getExams(countryId)
      .then(r => { setExams(r.data); setFiltered(r.data); })
      .finally(() => setLoading(false));
  }, [countryId]);

  useEffect(() => {
    setFiltered(exams.filter(e => e.name.toLowerCase().includes(search.toLowerCase())));
  }, [search, exams]);

  return (
    <Layout>
      <div className="page">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/countries" className="btn-ghost p-2">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold" style={{ color: 'var(--text)' }}>
              Select an Exam
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Choose MCQ online or descriptive offline mode.
            </p>
          </div>
        </div>

        <div className="relative mb-8 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input className="input pl-10" placeholder="Search exam…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={BookOpen} title="No exams found" desc={search ? `No results for "${search}"` : 'No exams available for this country yet.'} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(ex => (
              <div key={ex._id} className="glass p-6 flex flex-col gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-display font-bold" style={{ color: 'var(--text)' }}>{ex.name}</h3>
                    <span className={`badge ${DIFF_BADGE[ex.difficulty] || 'badge-grey'} shrink-0`}>
                      {ex.difficulty}
                    </span>
                  </div>
                  <p className="text-xs font-body line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    {ex.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-dim)' }}>
                  <span className="flex items-center gap-1"><Clock size={11} /> {ex.duration} min</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <Link to={`/test/${ex._id}?mode=mcq`} className="btn-primary text-xs py-2.5 justify-center">
                    <Zap size={12} /> Online MCQ
                  </Link>
                  <Link to={`/test/${ex._id}?mode=descriptive`} className="btn-secondary text-xs py-2.5 justify-center">
                    <BookOpen size={12} /> Descriptive
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
