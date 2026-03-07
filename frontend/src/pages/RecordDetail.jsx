import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecordById, deleteRecord } from '../services/api';
import { StatCard } from '../components/StatCard';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { TrendAreaChart } from '../components/TrendAreaChart';
import { formatCurrency, MONTH_NAMES, toTitleCase } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft, TrendingDown, PiggyBank,
  Trash2, Loader2, CalendarDays, Pencil, TrendingUp, BadgeIndianRupee, Wallet,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export default function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expensePage, setExpensePage] = useState(0);
  const EXPENSES_PER_PAGE = 9;

  useEffect(() => {
    getRecordById(id)
      .then((res) => setRecord(res.data))
      .catch(() => navigate('/records'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRecord(id);
      navigate('/records');
    } catch (err) {
      console.error(err);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="w-full">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-12 w-64" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Skeleton className="h-10 flex-1 sm:flex-none sm:w-32 rounded-xl" />
            <Skeleton className="h-10 flex-1 sm:flex-none sm:w-32 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <Skeleton className="h-60 sm:h-64 rounded-2xl" />
          <Skeleton className="h-60 sm:h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!record) return null;

  const totalIncome = (record.incomes || []).reduce((s, i) => s + Number(i.amount), 0);
  const totalExpense = (record.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
  const netSurplus = totalIncome - totalExpense;   // actual leftover after expenses
  const plannedSavings = Number(record.savings_goal) || 0;  // what user deliberately saved
  const amountLeft = netSurplus - plannedSavings;  // free money after expenses + savings
  const savings = netSurplus;  // keep alias for the progress bar below
  const savingRate = totalIncome > 0 ? ((netSurplus / totalIncome) * 100).toFixed(1) : 0;

  // Build pie chart data — normalize names to avoid duplicates
  const nameMap = {};
  (record.expenses || []).forEach((e) => {
    const key = e.name.toLowerCase();
    nameMap[key] = (nameMap[key] || 0) + Number(e.amount);
  });
  const categoryBreakdown = Object.entries(nameMap)
    .map(([category, amount]) => ({ category: toTitleCase(category), amount }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="w-full">
          <button onClick={() => navigate('/records')} className="flex items-center gap-2 text-sm mb-4 text-muted-fg hover:text-fg transition-colors cursor-pointer">
            <ArrowLeft size={16} /> Back to records
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
              <CalendarDays size={18} sm:size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">{MONTH_NAMES[record.month - 1]} {record.year}</h1>
              {record.notes && <p className="text-xs sm:text-sm text-muted-fg line-clamp-1">{record.notes}</p>}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/records/${id}/edit`)}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer bg-primary-soft text-primary hover:opacity-80 transition-opacity order-2 sm:order-1"
          >
            <Pencil size={16} /> Edit
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer bg-destructive-soft text-destructive hover:opacity-80 transition-opacity disabled:opacity-60 order-1 sm:order-2"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
          </button>
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Record?"
        description="Are you sure you want to delete this monthly record? This action cannot be undone and will remove all associated incomes and expenses."
        isLoading={deleting}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <StatCard title="Total Income" value={totalIncome} icon={BadgeIndianRupee} index={0} />
        <StatCard title="Total Expenses" value={totalExpense} icon={TrendingDown} index={1} />
        <StatCard title="Savings" value={plannedSavings} icon={PiggyBank} index={2} />

        {/* Amount Left — custom revamped card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 * 0.08, duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl w-full h-full p-4 sm:p-5 flex flex-col"
          style={{
            background: amountLeft >= 0
              ? 'linear-gradient(135deg, #052e16 0%, #0a3728 50%, #052e16 100%)'
              : 'linear-gradient(135deg, #2d0a0a 0%, #3d1010 50%, #2d0a0a 100%)',
            border: `1px solid ${amountLeft >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            boxShadow: amountLeft >= 0
              ? '0 0 32px -8px rgba(22,163,74,0.3)'
              : '0 0 32px -8px rgba(239,68,68,0.3)',
          }}
        >
          {/* Glow orb */}
          <div
            className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-25"
            style={{ backgroundColor: amountLeft >= 0 ? '#16a34a' : '#ef4444' }}
          />

          {/* Icon row */}
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div
              className="w-10 sm:w-11 h-10 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: amountLeft >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}
            >
              <Wallet size={18} style={{ color: amountLeft >= 0 ? '#4ade80' : '#f87171' }} />
            </div>
            {/* Status pill */}
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: amountLeft >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                color: amountLeft >= 0 ? '#4ade80' : '#f87171',
              }}
            >
              {amountLeft >= 0 ? 'Healthy' : 'Deficit'}
            </span>
          </div>

          {/* Label */}
          <p className="text-xs sm:text-[13px] font-medium mb-1" style={{ color: amountLeft >= 0 ? 'rgba(134,239,172,0.8)' : 'rgba(252,165,165,0.8)' }}>
            Amount Left
          </p>

          {/* Value */}
          <p
            className="text-lg sm:text-2xl font-bold tracking-tight tabular-nums"
            style={{ color: amountLeft >= 0 ? '#4ade80' : '#f87171' }}
          >
            {amountLeft < 0 ? '-' : ''}₹{Math.abs(amountLeft).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>

          {/* Sub-label */}
          <p className="text-[10px] mt-1 opacity-50" style={{ color: amountLeft >= 0 ? '#bbf7d0' : '#fecaca' }}>
            After expenses {plannedSavings > 0 ? '& savings' : ''}
          </p>
        </motion.div>
      </div>

      {/* New Layout: Pie Chart (top-left) + Income (bottom-left) | Expenses (right full-height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column: Pie Chart + Income Sources equally stacked */}
        <div className="grid grid-rows-2 gap-5" style={{ gridTemplateRows: '1fr 1fr' }}>
          {/* Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="h-full">
            {categoryBreakdown.length > 0 ? (
              <ExpensePieChart data={categoryBreakdown} title="Expense Split" />
            ) : (
              <div className="card p-6 h-full flex items-center justify-center">
                <p className="text-sm text-muted-fg">No expense data</p>
              </div>
            )}
          </motion.div>

          {/* Income Sources */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6 h-full overflow-auto">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-success" />
              <h3 className="text-base font-semibold text-fg">Income Sources</h3>
            </div>
            {(record.incomes || []).length === 0 ? (
              <p className="text-sm text-muted-fg text-center py-8">No incomes recorded</p>
            ) : (
              <div className="space-y-3">
                {(record.incomes || []).map((inc, i) => {
                  const pct = totalIncome > 0 ? ((Number(inc.amount) / totalIncome) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary-soft border border-[var(--color-primary)]/15">
                      <span className="text-sm font-medium text-fg">{inc.source}</span>
                      <span className="text-sm font-bold text-success tabular-nums">{formatCurrency(inc.amount)} <span className="text-xs text-muted-fg font-normal">({pct}%)</span></span>
                    </div>
                  );
                })}
                <div className="border-t border-themed pt-3 mt-1 flex justify-between">
                  <span className="text-sm font-semibold text-fg">Total Income</span>
                  <span className="text-sm font-bold text-success tabular-nums">{formatCurrency(totalIncome)}</span>
                </div>
              </div>
            )}
            {record.savings_goal > 0 && (
              <div className="mt-5 pt-4 border-t border-themed">
                <h4 className="text-sm font-medium text-muted-fg mb-2">Savings Goal: {formatCurrency(record.savings_goal)}</h4>
                <div className="h-2.5 rounded-full overflow-hidden bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: savings >= record.savings_goal ? '#22c55e' : '#eab308' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((savings / record.savings_goal) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <p className="text-xs text-muted-fg mt-1.5">
                  {formatCurrency(Math.max(savings, 0))} of {formatCurrency(record.savings_goal)} saved{savings >= record.savings_goal && ' 🎉'}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right column: Expenses with pagination */}
        {(() => {
          const allExpenses = record.expenses || [];
          const totalPages = Math.ceil(allExpenses.length / EXPENSES_PER_PAGE);
          const pageExpenses = allExpenses.slice(expensePage * EXPENSES_PER_PAGE, (expensePage + 1) * EXPENSES_PER_PAGE);
          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <TrendingDown size={16} className="text-destructive" />
                  <h3 className="text-base font-semibold text-fg">Expenses</h3>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setExpensePage((p) => Math.max(0, p - 1))}
                      disabled={expensePage === 0}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => setExpensePage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={expensePage === totalPages - 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  </div>
                )}
              </div>
              {allExpenses.length === 0 ? (
                <p className="text-sm text-muted-fg text-center py-8">No expenses recorded</p>
              ) : (
                <div className="flex flex-col flex-1">
                  <div className="space-y-3">
                    {pageExpenses.map((exp, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
                        <span className="text-sm font-medium text-fg">{toTitleCase(exp.name)}</span>
                        <span className="text-sm font-bold text-destructive tabular-nums">-{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                    {totalPages > 1 && (
                      <p className="text-[11px] text-muted-fg text-center pt-1">
                        Page {expensePage + 1} of {totalPages} · {allExpenses.length} expenses total
                      </p>
                    )}
                  </div>
                  <div className="border-t border-themed pt-3 mt-auto flex justify-between">
                    <span className="text-sm font-semibold text-fg">Total Expenses</span>
                    <span className="text-sm font-bold text-destructive tabular-nums">-{formatCurrency(totalExpense)}</span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })()}
      </div>
    </div>
  );
}
