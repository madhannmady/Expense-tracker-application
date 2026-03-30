import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBudgetByMonth, deleteBudgetByMonth } from '../services/api';
import { MONTH_NAMES, formatCurrency, toTitleCase } from '../lib/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Pencil, Wallet } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { VoiceButton } from '../components/VoiceButton';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border px-3 py-2.5 text-sm shadow-xl"
        style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
      >
        <p className="font-medium text-fg mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
            <span className="text-muted-fg">{p.name}:</span>
            <span className="font-bold text-fg ml-auto tabular-nums">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function BudgetDetail() {
  const { month, year } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchBudget = useCallback(() => {
    getBudgetByMonth(month, year)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => { fetchBudget(); }, [fetchBudget]);

  const handleVoiceAction = useCallback((transcript, actions) => {
    const hasCRUD = (actions || []).some(
      (a) => a.success && !['ASK_QUESTION', 'UNKNOWN'].includes(a.type)
    );
    if (hasCRUD) {
      fetchBudget();
      toast.success('Budget updated via voice');
    }
  }, [fetchBudget]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBudgetByMonth(month, year);
      toast.success('Budget deleted successfully');
      navigate('/budgets');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete budget');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
          <div className="w-full">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-12 w-64" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Skeleton className="h-10 flex-1 sm:flex-none sm:w-32 rounded-xl" />
            <Skeleton className="h-10 flex-1 sm:flex-none sm:w-32 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl w-full" />)}
        </div>
        <Skeleton className="h-[280px] sm:h-[300px] rounded-2xl w-full" />
      </div>
    );
  }

  const totalAllocated = data
    .filter((d) => Number(d.allocated_amount) > 0)
    .reduce((s, d) => s + Number(d.allocated_amount), 0);
  const totalActual = data
    .filter((d) => Number(d.allocated_amount) > 0)
    .reduce((s, d) => s + Number(d.actual_amount), 0);
  const totalDiff = totalAllocated - totalActual;

  // Chart only shows categories with budget allocations
  const chartData = data
    .filter((d) => Number(d.allocated_amount) > 0)
    .map((d) => ({
      name: toTitleCase(d.category),
      Budget: Number(d.allocated_amount),
      Actual: Number(d.actual_amount),
    }));

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
        <div className="w-full">
          <button onClick={() => navigate('/budgets')} className="flex items-center gap-2 text-sm mb-4 text-muted-fg hover:text-fg transition-colors cursor-pointer">
            <ArrowLeft size={16} /> Back to budgets
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
              <Wallet size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight truncate">{MONTH_NAMES[parseInt(month) - 1]} {year} Budget</h1>
              <p className="text-sm text-muted-fg">{data.length} categories</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/budgets/create?month=${month}&year=${year}`)}
            className="w-full sm:w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer bg-primary-soft text-primary hover:opacity-80 transition-opacity sm:flex-shrink-0"
            title="Edit budget"
          >
            <Pencil size={16} />
          </button>
          {data.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer bg-destructive-soft text-destructive hover:opacity-80 transition-opacity disabled:opacity-60 whitespace-nowrap"
            >
              <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete Budget'}
            </button>
          )}
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Budget?"
        description={`Are you sure you want to delete the budget for ${MONTH_NAMES[parseInt(month) - 1]} ${year}? This action cannot be undone.`}
        isLoading={deleting}
      />

      {/* Summary Cards - 2 cards only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-3 sm:p-5 flex flex-col w-full">
          <p className="text-xs sm:text-sm text-muted-fg mb-1 sm:mb-2 line-clamp-2">Total Budget</p>
          <p className="text-lg sm:text-2xl font-bold text-fg tabular-nums">{formatCurrency(totalAllocated)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-3 sm:p-5 flex flex-col w-full">
          <p className="text-xs sm:text-sm text-muted-fg mb-1 sm:mb-2 line-clamp-2">Total Actual Expense</p>
          <p className="text-lg sm:text-2xl font-bold text-fg tabular-nums">{formatCurrency(totalActual)}</p>
        </motion.div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-4 sm:p-6 w-full">
          <h3 className="text-base sm:text-lg font-semibold text-fg mb-1">Budget vs Actual</h3>
          <p className="text-xs sm:text-sm text-muted-fg mb-4 sm:mb-5">Allocated budget vs actual expenses per category</p>
          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <pattern id="actualStripe" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                    <rect width="8" height="8" fill="#052e16" />
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#16a34a" strokeWidth="4" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-fg)', fontSize: 11 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-muted-fg)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="Budget" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="url(#actualStripe)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Category breakdown */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-4 sm:p-6 w-full">
        <h3 className="text-base sm:text-lg font-semibold text-fg mb-4 sm:mb-5">Category Breakdown</h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-fg text-center py-8">No budget allocations yet</p>
        ) : (
          <div className="space-y-3 w-full">
            {data
              .filter((item) => Number(item.allocated_amount) > 0)
              .map((item, i) => {
                const allocated = Number(item.allocated_amount);
                const actual = Number(item.actual_amount);
                const diff = allocated - actual;
                const isUnder = diff >= 0;
                const isOver = diff < 0;
                const pct = Math.min((actual / allocated) * 100, 150);

                // Color scheme: green = under budget, red = over budget
                const bgColor = isUnder ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)';
                const borderColor = isUnder ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)';
                const barColor = isUnder ? '#16a34a' : '#9f1239';
                const textClass = isUnder ? 'text-success' : 'text-destructive';

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="p-3 sm:p-4 rounded-xl w-full"
                    style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
                  >
                    {/* Header: name + status badge */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <span className="text-sm sm:text-[15px] font-semibold text-fg truncate flex-1">
                        {toTitleCase(item.category)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        isOver
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-success/15 text-success'
                      }`}>
                        {isOver ? 'Over Budget' : 'Under Budget'}
                      </span>
                    </div>

                    {/* Spent amount */}
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-base sm:text-lg font-bold tabular-nums text-fg">
                        {formatCurrency(actual)}
                      </span>
                      <span className="text-xs text-muted-fg">of {formatCurrency(allocated)} budget</span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 rounded-full overflow-hidden bg-muted w-full mb-2">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * i }}
                      />
                    </div>

                    {/* Bottom: usage % + remaining / exceeded */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-fg tabular-nums">
                        {`${Math.round((actual / allocated) * 100)}% used`}
                      </span>
                      <span className={`font-semibold tabular-nums ${textClass}`}>
                        {isUnder
                          ? `${formatCurrency(diff)} remaining`
                          : `Exceeded by ${formatCurrency(Math.abs(diff))}`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </motion.div>

      {/* Voice Assistant FAB */}
      <VoiceButton
        pageType="budget"
        pageContext={{
          month: month,
          year: year,
          month_name: MONTH_NAMES[parseInt(month) - 1],
          categories: data || [],
        }}
        onActionComplete={handleVoiceAction}
      />
    </div>
  );
}
