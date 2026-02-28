import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBudgetSummary } from '../services/api';
import { MONTH_NAMES, formatCurrency } from '../lib/utils';
import { motion } from 'framer-motion';
import { Plus, Search, Wallet, TrendingUp, TrendingDown, BadgeIndianRupee } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';

export default function BudgetManagement() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getBudgetSummary()
      .then((res) => setBudgets(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = budgets.filter((b) => {
    const label = `${MONTH_NAMES[b.month - 1]} ${b.year}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-[140px] rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full max-w-md rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">Budget Management</h1>
          <p className="text-sm text-muted-fg mt-1">{budgets.length} budget{budgets.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => navigate('/budgets/create')}
          className="btn-primary px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
        >
          <Plus size={16} /> New Budget
        </button>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-fg" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by month, year..."
          className="input-base w-full pl-11 pr-4 py-3 rounded-xl text-sm"
        />
      </motion.div>

      {/* Budget Cards */}
      {filtered.length === 0 ? (
        <div className="text-center text-muted-fg py-16 text-sm">
          {budgets.length === 0 ? 'No budgets yet. Create one to get started!' : 'No matching budgets found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((b, i) => {
            const isUnder = b.difference >= 0;
            return (
              <motion.div
                key={`${b.month}-${b.year}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => navigate(`/budgets/${b.month}/${b.year}`)}
                className="card p-5 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
                      <Wallet size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-fg">{MONTH_NAMES[b.month - 1]}</h3>
                      <p className="text-xs text-muted-fg">{b.year}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-fg">{b.categories} categories</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-fg"><BadgeIndianRupee size={14} /> Budget</span>
                    <span className="font-semibold text-fg tabular-nums">{formatCurrency(b.total_allocated)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-fg"><TrendingDown size={14} /> Actual</span>
                    <span className="font-semibold text-fg tabular-nums">{formatCurrency(b.total_actual)}</span>
                  </div>
                  <div className="border-t border-themed pt-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-fg">
                        {isUnder ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-destructive" />}
                        Difference
                      </span>
                      <span className={`font-bold tabular-nums ${isUnder ? 'text-success' : 'text-destructive'}`}>
                        {isUnder ? '+' : ''}{formatCurrency(b.difference)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
