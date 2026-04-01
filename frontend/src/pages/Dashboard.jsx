import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getRecords } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { TrendAreaChart } from '../components/TrendAreaChart';
import { formatCurrency, toTitleCase } from '../lib/utils';
import { motion } from 'framer-motion';
import { BadgeIndianRupee, TrendingDown, PiggyBank, Activity, LogOut } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleAddExpense = async () => {
    try {
      const res = await getRecords();
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const existing = res.data.find(r => r.month === currentMonth && r.year === currentYear);
      if (existing) {
        navigate(`/records/${existing.id}/edit`);
      } else {
        navigate('/records/create');
      }
    } catch {
      navigate('/records/create');
    }
  };

  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-7 w-40 sm:h-8" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px] rounded-2xl w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-5">
          <Skeleton className="lg:col-span-1 h-[280px] sm:h-[320px] lg:h-[340px] rounded-2xl w-full" />
          <Skeleton className="lg:col-span-3 h-[280px] sm:h-[320px] lg:h-[340px] rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  const d = stats || { totalIncome: 0, totalExpense: 0, totalSavings: 0, savingRate: 0, categoryBreakdown: [], monthlyTrend: [], recentExpenses: [] };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-fg">Hi, {user?.username || 'User'}</h2>
          <button
            onClick={logout}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-full bg-destructive-soft text-destructive hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-fg mt-1 sm:mt-2">Your complete financial overview</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-5">
        <StatCard title="Total Income" value={d.totalIncome} icon={BadgeIndianRupee} index={0} />
        <StatCard title="Total Expenses" value={d.totalExpense} icon={TrendingDown} index={1} />
        <StatCard title="Total Savings" value={d.totalSavings} icon={PiggyBank} index={2} />
        <StatCard title="Saving Rate" value={d.savingRate} icon={Activity} index={3} isCurrency={false} suffix="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="lg:col-span-1">
          <ExpensePieChart data={d.categoryBreakdown} />
        </div>
        <div className="lg:col-span-3">
          <TrendAreaChart data={d.monthlyTrend} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Top Categories */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
          <h3 className="text-base font-semibold text-fg mb-5">Top Expenses</h3>
          {d.categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-fg py-8 text-center">No expense data yet</p>
          ) : (
            <div className="space-y-4">
              {d.categoryBreakdown.slice(0, 5).map((cat, i) => {
                const maxAmt = d.categoryBreakdown[0]?.amount || 1;
                const pct = ((cat.amount / maxAmt) * 100).toFixed(0);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-fg font-medium">{toTitleCase(cat.category)}</span>
                      <span className="text-muted-fg tabular-nums">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent Expenses */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card p-6">
          <h3 className="text-base font-semibold text-fg mb-5">Recent Expenses</h3>
          {d.recentExpenses.length === 0 ? (
            <p className="text-sm text-muted-fg py-8 text-center">No expenses recorded yet</p>
          ) : (
            <div className="space-y-3">
              {d.recentExpenses.slice(0, 6).map((exp, i) => (
                <div key={i} className="py-2 border-b border-themed last:border-b-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-fg truncate">{toTitleCase(exp.name)}</p>
                    <span className="text-sm font-semibold text-destructive tabular-nums shrink-0">-{formatCurrency(exp.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium text-orange-400 capitalize">{exp.category || 'other'}</span>
                    <span className="text-[10px] text-muted-fg tabular-nums shrink-0">
                      {exp.created_at && exp.created_at !== ''
                        ? new Date(exp.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : '(not applicable)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Floating Add Expense — mobile circle FAB above bottom navbar */}
      <motion.button
        onClick={handleAddExpense}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="lg:hidden fixed bottom-[88px] right-4 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer z-40"
        style={{
          backgroundColor: '#0d2b1e',
          border: '1.5px solid #166534',
          color: '#4ade80',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="11" y1="5" x2="11" y2="17" />
          <line x1="5" y1="11" x2="17" y2="11" />
        </svg>
      </motion.button>

      {/* Floating Add Expense — desktop pill button */}
      <motion.button
        onClick={handleAddExpense}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="hidden lg:flex fixed bottom-6 right-6 items-center gap-2 px-5 py-3 rounded-full text-sm font-bold cursor-pointer z-40"
        style={{
          backgroundColor: '#0d2b1e',
          border: '1.5px solid #166534',
          color: '#4ade80',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="3" x2="8" y2="13" />
          <line x1="3" y1="8" x2="13" y2="8" />
        </svg>
        Add Expense
      </motion.button>
    </div>
  );
}
