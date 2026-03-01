import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveBudget, getBudgetByMonth } from '../services/api';
import { MONTH_NAMES, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateBudget() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editMonth = searchParams.get('month');
  const editYear = searchParams.get('year');
  const isEdit = Boolean(editMonth && editYear);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  const currentDate = new Date();
  const [month, setMonth] = useState(editMonth ? parseInt(editMonth) : currentDate.getMonth() + 1);
  const [year, setYear] = useState(editYear ? parseInt(editYear) : currentDate.getFullYear());

  const [input, setInput] = useState({ category: '', allocated_amount: '' });
  const [allocations, setAllocations] = useState([]);

  useEffect(() => {
    if (isEdit) {
      setFetchLoading(true);
      getBudgetByMonth(editMonth, editYear)
        .then((res) => {
          const items = res.data.filter((d) => d.allocated_amount > 0);
          setAllocations(items.map((d) => ({ category: d.category, allocated_amount: String(d.allocated_amount) })));
        })
        .catch(console.error)
        .finally(() => setFetchLoading(false));
    }
  }, [editMonth, editYear, isEdit]);

  const addAllocation = () => {
    if (!input.category || !input.allocated_amount) return;
    setAllocations([...allocations, { ...input }]);
    setInput({ category: '', allocated_amount: '' });
  };

  const removeAllocation = (i) => setAllocations(allocations.filter((_, idx) => idx !== i));

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addAllocation(); } };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let allItems = [...allocations];
    if (input.category && input.allocated_amount) {
      allItems.push({ ...input });
    }

    if (allItems.length === 0) {
      return toast.error('Please add at least one budget category');
    }

    setLoading(true);
    try {
      await saveBudget({
        month,
        year,
        allocations: allItems.map((a) => ({ category: a.category, allocated_amount: Number(a.allocated_amount) })),
      });
      toast.success('Budget saved successfully!');
      navigate(`/budgets/${month}/${year}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  const years = [];
  for (let y = 2020; y <= 2030; y++) years.push(y);

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate('/budgets')}
          className="flex items-center gap-2 text-sm mb-4 text-muted-fg hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to budgets
        </button>
        <h1 className="text-2xl font-bold text-fg tracking-tight">
          {isEdit ? 'Edit Budget' : 'Create Budget'}
        </h1>
        <p className="text-sm text-muted-fg mt-1">
          Set your budget allocations for each expense category
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Period */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-[15px] font-semibold text-fg mb-4 sm:mb-5">Period</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-muted-fg">Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-base w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm cursor-pointer">
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-muted-fg">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-base w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm cursor-pointer">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Budget Categories */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-[15px] font-semibold text-fg mb-4 sm:mb-5">Budget Allocations</h2>

          {/* Fixed input bar - responsive layout */}
          <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-start gap-2 mb-4">
            <input
              type="text"
              value={input.category}
              onChange={(e) => setInput({ ...input, category: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Rent, Groceries"
              className="input-base w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm"
            />
            <input
              type="number"
              value={input.allocated_amount}
              onChange={(e) => setInput({ ...input, allocated_amount: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Amount"
              min="0"
              className="input-base w-full sm:w-32 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={addAllocation}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-blue-950 text-blue-100 border border-blue-900 cursor-pointer hover:opacity-80 transition-opacity w-full sm:w-auto sm:shrink-0"
            >
              <Plus size={14} /> <span className="sm:inline">Add</span>
            </button>
          </div>

          {/* Added allocations */}
          <AnimatePresence>
            {allocations.map((a, i) => (
              <motion.div
                key={`alloc-${i}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-2"
                style={{ backgroundColor: 'rgba(23, 37, 84, 0.4)', border: '1px solid rgba(30, 58, 138, 0.4)' }}
              >
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <span className="text-sm font-medium text-fg truncate">{a.category}</span>
                  <span className="text-sm font-bold tabular-nums shrink-0 text-blue-400">
                    {formatCurrency(a.allocated_amount)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAllocation(i)}
                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive-soft transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {allocations.length > 0 && (
            <p className="text-xs text-muted-fg mt-2">
              {allocations.length} categor{allocations.length > 1 ? 'ies' : 'y'} • Total: {formatCurrency(allocations.reduce((s, a) => s + Number(a.allocated_amount || 0), 0))}
            </p>
          )}
        </motion.div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 sm:py-4 rounded-xl text-sm sm:text-[15px] flex items-center justify-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> {isEdit ? 'Update Budget' : 'Save Budget'}</>}
        </button>
      </form>
    </div>
  );
}
