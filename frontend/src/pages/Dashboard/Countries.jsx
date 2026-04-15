/**
 * Countries.jsx  ─  Country selection page
 * Lists all countries; clicking one navigates to that country's exams.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/common/Layout';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/common/Spinner';
import { quizAPI } from '@/services/api';
import { Search, Globe, BookOpen } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Countries() {
  usePageTitle('Choose Country');
  const [countries, setCountries] = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    quizAPI.getCountries()
      .then(r => { setCountries(r.data); setFiltered(r.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(countries.filter(c => c.name.toLowerCase().includes(q)));
  }, [search, countries]);

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--text)' }}>
            Choose a Country
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Select the country whose competitive exams you want to practice.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input
            className="input pl-10"
            placeholder="Search country…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Globe} title="No countries found" desc={`No results for "${search}"`} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filtered.map(c => (
              <Link
                key={c._id}
                to={`/exams/${c._id}`}
                className="glass-hover p-5 text-center group"
              >
                <div className="text-4xl mb-3 transition-transform duration-200 group-hover:scale-110">
                  {c.flag}
                </div>
                <h3 className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>
                  {c.name}
                </h3>
                <span className="badge-grey text-xs">{c.code}</span>
                <div className="mt-2.5 flex items-center justify-center gap-1 text-xs transition-colors" style={{ color: 'var(--text-dim)' }}>
                  <BookOpen size={10} /> Exams
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
