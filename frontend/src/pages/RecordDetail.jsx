import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecordById, deleteRecord } from '../services/api';
import { StatCard } from '../components/StatCard';
import { ExpensePieChart } from '../components/ExpensePieChart';
import { TrendAreaChart } from '../components/TrendAreaChart';
import { formatCurrency, MONTH_NAMES } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft, TrendingDown, PiggyBank, Target,
  Trash2, Loader2, CalendarDays, Pencil, TrendingUp, BadgeIndianRupee
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
  const savings = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;

  // Build pie chart data
  const nameMap = {};
  (record.expenses || []).forEach((e) => {
    nameMap[e.name] = (nameMap[e.name] || 0) + Number(e.amount);
  });
  const categoryBreakdown = Object.entries(nameMap)
    .map(([category, amount]) => ({ category, amount }))
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
        <StatCard title="Savings" value={savings} icon={PiggyBank} index={2} />
        <StatCard
          title={record.savings_goal > 0 ? 'Goal Progress' : 'Saving Rate'}
          value={record.savings_goal > 0 ? Math.min(((savings / record.savings_goal) * 100).toFixed(1), 100) : savingRate}
          icon={record.savings_goal > 0 ? Target : PiggyBank}
          isCurrency={false} suffix="%" index={3}
        />
      </div>

      {/* New Layout: Pie Chart (top-left) + Income (bottom-left) | Expenses (right full-height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column: Pie Chart + Income Sources */}
        <div className="space-y-5">
          {/* Pie Chart */}
          {categoryBreakdown.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <ExpensePieChart data={categoryBreakdown} title="Expense Split" />
            </motion.div>
          )}

          {/* Income Sources */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
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

        {/* Right column: Expenses (full height) */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card p-6 h-fit lg:row-span-2">
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown size={16} className="text-destructive" />
            <h3 className="text-base font-semibold text-fg">Expenses</h3>
          </div>
          {(record.expenses || []).length === 0 ? (
            <p className="text-sm text-muted-fg text-center py-8">No expenses recorded</p>
          ) : (
            <div className="space-y-3">
              {(record.expenses || []).map((exp, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-destructive-soft border border-[var(--color-destructive)]/15">
                  <span className="text-sm font-medium text-fg">{exp.name}</span>
                  <span className="text-sm font-bold text-destructive tabular-nums">-{formatCurrency(exp.amount)}</span>
                </div>
              ))}
              <div className="border-t border-themed pt-3 mt-1 flex justify-between">
                <span className="text-sm font-semibold text-fg">Total Expenses</span>
                <span className="text-sm font-bold text-destructive tabular-nums">-{formatCurrency(totalExpense)}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
