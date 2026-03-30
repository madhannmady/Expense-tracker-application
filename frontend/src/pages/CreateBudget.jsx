import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveBudget, getBudgetByMonth, getCategories, createCategory as createCategoryApi } from '../services/api';
import { MONTH_NAMES, formatCurrency, toTitleCase } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowLeft, Save, Loader2, ChevronDown, X } from 'lucide-react';
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

  // Categories from shared API
  const [categories, setCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryDraft, setNewCategoryDraft] = useState('');
  const categoryDropdownRef = useRef(null);

  // Categories not yet allocated
  const availableCategories = categories.filter(
    (cat) => !allocations.find((a) => a.category.trim().toLowerCase() === cat.trim().toLowerCase())
  );

  // Fetch shared categories
  useEffect(() => {
    getCategories()
      .then((res) => {
        setCategories([...res.data.map((c) => c.name), 'other']);
      })
      .catch(() => setCategories(['other']));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
    };
    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryDropdown]);

  // Fetch existing budget when editing
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

  const confirmNewCategory = async () => {
    const trimmed = newCategoryDraft.trim().toLowerCase();
    if (!trimmed || trimmed === 'other') {
      toast.error('Please enter a valid category name');
      return;
    }
    if (!categories.includes(trimmed)) {
      try {
        await createCategoryApi(trimmed);
      } catch {
        // Continue even if API fails — add locally
      }
      setCategories((prev) => {
        const withoutOther = prev.filter((c) => c !== 'other');
        return [...withoutOther, trimmed, 'other'];
      });
    }
    setInput({ ...input, category: trimmed });
    setNewCategoryDraft('');
    setShowNewCategoryInput(false);
  };

  const addAllocation = () => {
    if (!input.category || !input.allocated_amount) return;
    if (allocations.find((a) => a.category.trim().toLowerCase() === input.category.trim().toLowerCase())) {
      toast.error(`Budget for "${toTitleCase(input.category)}" is already added`);
      return;
    }
    setAllocations([...allocations, { ...input }]);
    setInput({ category: '', allocated_amount: '' });
  };

  const removeAllocation = (i) => setAllocations(allocations.filter((_, idx) => idx !== i));

  const handleAmountKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addAllocation(); } };

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
        isNew: !isEdit,
      });
      toast.success(isEdit ? 'Budget updated successfully!' : 'Budget saved successfully!');
      navigate(`/budgets/${month}/${year}`);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 409) {
        toast.error(message || 'Budget for this month already exists', {
          description: 'Use the Edit option from the budget page to modify it.',
          duration: 5000,
        });
      } else {
        toast.error(message || 'Failed to save budget');
      }
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
          Allocate a spending limit for each category
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Period */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-[15px] font-semibold text-fg mb-4 sm:mb-5">Period</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-muted-fg">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                disabled={isEdit}
                className="input-base w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-muted-fg">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={isEdit}
                className="input-base w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {isEdit && (
            <p className="text-xs text-muted-fg mt-3">Period is locked while editing an existing budget.</p>
          )}
        </motion.div>

        {/* Budget Allocations */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-[15px] font-semibold text-fg mb-1">Budget Allocations</h2>
          <p className="text-xs text-muted-fg mb-4 sm:mb-5">
            Categories are shared with your monthly records — create once, use everywhere.
          </p>

          {/* Input row */}
          <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-start gap-2 mb-4">

            {/* Category picker */}
            {showNewCategoryInput ? (
              <div className="flex gap-2 sm:flex-1 items-stretch">
                <input
                  type="text"
                  value={newCategoryDraft}
                  onChange={(e) => setNewCategoryDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewCategory(); } }}
                  placeholder="New category name..."
                  className="input-base flex-1 px-3 py-2.5 rounded-xl text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={confirmNewCategory}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-2.5 rounded-xl bg-blue-950 text-blue-100 border border-blue-900 cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewCategoryInput(false); setNewCategoryDraft(''); }}
                  className="flex items-center justify-center p-2.5 rounded-xl text-muted-fg hover:text-fg hover:bg-[var(--color-input)] transition-colors cursor-pointer shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative sm:flex-1" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown((v) => !v)}
                  className="input-base w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className={input.category ? 'text-fg' : 'text-muted-fg'}>
                    {input.category ? toTitleCase(input.category) : 'Select category...'}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-muted-fg transition-transform duration-150 ${showCategoryDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showCategoryDropdown && (
                  <div
                    className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl shadow-xl overflow-hidden border border-[var(--color-border)]"
                    style={{ backgroundColor: 'var(--color-card)' }}
                  >
                    <div className="max-h-48 overflow-y-auto">
                      {availableCategories.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-fg text-center italic">
                          All categories have been allocated
                        </div>
                      ) : (
                        availableCategories.map((cat) => (
                          <div
                            key={cat}
                            className={`px-4 py-2.5 text-sm capitalize cursor-pointer transition-colors ${
                              input.category === cat
                                ? 'bg-primary/10 text-primary'
                                : 'text-fg hover:bg-[var(--color-input)]'
                            }`}
                            onClick={() => {
                              setInput({ ...input, category: cat });
                              setShowCategoryDropdown(false);
                            }}
                          >
                            {toTitleCase(cat)}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryDropdown(false);
                          setShowNewCategoryInput(true);
                        }}
                        className="w-full px-4 py-2.5 text-sm text-left text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="6.5" y1="1.5" x2="6.5" y2="11.5" />
                          <line x1="1.5" y1="6.5" x2="11.5" y2="6.5" />
                        </svg>
                        Add new category...
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <input
              type="number"
              value={input.allocated_amount}
              onChange={(e) => setInput({ ...input, allocated_amount: e.target.value })}
              onKeyDown={handleAmountKeyDown}
              placeholder="Amount"
              min="0"
              className="input-base w-full sm:w-32 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={addAllocation}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-blue-950 text-blue-100 border border-blue-900 cursor-pointer hover:opacity-80 transition-opacity w-full sm:w-auto sm:shrink-0"
            >
              <Plus size={14} /> Add
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
                  <span className="text-sm font-medium text-fg truncate">{toTitleCase(a.category)}</span>
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
              {allocations.length} categor{allocations.length > 1 ? 'ies' : 'y'} · Total:{' '}
              {formatCurrency(allocations.reduce((s, a) => s + Number(a.allocated_amount || 0), 0))}
            </p>
          )}
        </motion.div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 sm:py-4 rounded-xl text-sm sm:text-[15px] flex items-center justify-center gap-2"
        >
          {loading
            ? <Loader2 size={18} className="animate-spin" />
            : <><Save size={18} /> {isEdit ? 'Update Budget' : 'Save Budget'}</>
          }
        </button>
      </form>
    </div>
  );
}
