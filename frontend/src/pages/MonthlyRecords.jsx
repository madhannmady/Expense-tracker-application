import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecords } from '../services/api';
import { MonthCard } from '../components/MonthCard';
import { motion } from 'framer-motion';
import { Plus, Search, CalendarDays } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';

export default function MonthlyRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getRecords()
      .then((res) => setRecords(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return months[r.month - 1].includes(q) || String(r.year).includes(q) || (r.notes && r.notes.toLowerCase().includes(q));
  });

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="w-full">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-12 w-full sm:w-[140px] rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full max-w-md rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">Monthly Records</h1>
          <p className="text-sm text-muted-fg mt-1">{records.length} {records.length === 1 ? 'record' : 'records'} total</p>
        </div>
        <button onClick={() => navigate('/records/create')} className="btn-primary flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto px-5 py-3 rounded-xl text-sm">
          <Plus size={18} /> New Record
        </button>
      </motion.div>

      {records.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="relative w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by month, year, or notes..." className="input-base w-full pl-12 pr-4 py-3 rounded-xl text-sm" />
          </div>
        </motion.div>
      )}

      {records.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-soft flex items-center justify-center mx-auto mb-5">
            <CalendarDays size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-fg mb-2">No records yet</h3>
          <p className="text-sm text-muted-fg mb-6 max-w-sm mx-auto">Start tracking your finances by creating your first monthly record.</p>
          <button onClick={() => navigate('/records/create')} className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm">
            <Plus size={18} /> Create First Record
          </button>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-sm text-muted-fg">No records match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((record, i) => (
            <MonthCard key={record.id} record={record} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
