import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotes } from '../services/api';
import { MONTH_NAMES } from '../lib/utils';
import { motion } from 'framer-motion';
import { Plus, Search, Notebook } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';

export default function MonthlyNotes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getNotes()
      .then((res) => setNotes(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = notes.filter((n) => {
    const label = `${MONTH_NAMES[n.month - 1]} ${n.year}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
          <div className="w-full">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-full sm:w-[140px] rounded-xl flex-shrink-0" />
        </div>
        <Skeleton className="h-12 w-full max-w-md rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">Monthly Notes</h1>
          <p className="text-sm text-muted-fg mt-1">{notes.length} note set{notes.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => navigate('/notes/create')}
          className="btn-primary px-5 py-3 rounded-xl text-sm flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto"
        >
          <Plus size={18} /> New Notes
        </button>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative w-full max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-fg" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by month, year..."
          className="input-base w-full pl-11 pr-4 py-3 rounded-xl text-sm"
        />
      </motion.div>

      {/* Notes Cards */}
      {filtered.length === 0 ? (
        <div className="text-center text-muted-fg py-16 text-sm">
          {notes.length === 0 ? 'No notes yet. Create your first notes for a month!' : 'No matching notes found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full">
          {filtered.map((n, i) => (
            <motion.div
              key={`${n.month}-${n.year}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="card p-5 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                    <Notebook size={18} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-fg">{MONTH_NAMES[n.month - 1]}</h3>
                    <p className="text-xs text-muted-fg">{n.year}</p>
                  </div>
                </div>

              </div>

              <div onClick={() => navigate(`/notes/${n.id}`)}>
                <p className="text-xs text-muted-fg mb-3">
                  {n.note_entries?.length || 0} note{(n.note_entries?.length || 0) !== 1 ? 's' : ''}
                </p>
                {n.note_entries && n.note_entries.length > 0 && (
                  <div className="space-y-2">
                    {n.note_entries.slice(0, 2).map((entry, idx) => (
                      <div key={idx} className="text-xs text-fg/70 line-clamp-2 bg-muted/30 p-2 rounded">
                        <span className="font-semibold">{entry.title}</span>
                        {entry.type === 'lending' && entry.person_name && (
                          <span className="text-muted-fg ml-1">({entry.person_name})</span>
                        )}
                      </div>
                    ))}
                    {n.note_entries.length > 2 && (
                      <p className="text-xs text-muted-fg italic">+{n.note_entries.length - 2} more...</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
