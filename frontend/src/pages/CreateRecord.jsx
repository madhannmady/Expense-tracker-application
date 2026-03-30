import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createRecord, updateRecord, getRecordById } from '../services/api';
import { MONTH_NAMES, formatCurrency, toTitleCase } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowLeft, Save, Loader2, ChevronDown, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export default function CreateRecord() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEdit = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [savingsGoal, setSavingsGoal] = useState('');
  const [notes, setNotes] = useState('');

  // Separate "current input" from "added items"
  const [incomeInput, setIncomeInput] = useState({ source: '', amount: '' });
  const [addedIncomes, setAddedIncomes] = useState([]);

  const [expenseInput, setExpenseInput] = useState({ name: '', amount: '', category: 'other' });
  const [addedExpenses, setAddedExpenses] = useState([]);

  // Categories
  const [categories, setCategories] = useState(() => {
    try {
      const stored = localStorage.getItem('expense_categories');
      return stored ? JSON.parse(stored) : ['other'];
    } catch { return ['other']; }
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryDraft, setCustomCategoryDraft] = useState('');
  const [editingCategoryIdx, setEditingCategoryIdx] = useState(null);
  const [showExpenseCategoryDropdown, setShowExpenseCategoryDropdown] = useState(null);
  const [expensePage, setExpensePage] = useState(0);
  const EXPENSES_PER_PAGE = 5;

  const categoryDropdownRef = useRef(null);
  const expenseCategoryDropdownRef = useRef(null);

  // GPay state
  const [gpayEnabled, setGpayEnabled] = useState(false);
  const [gpayPending, setGpayPending] = useState(false);
  const [showGPayConfirmModal, setShowGPayConfirmModal] = useState(false);
  const [pendingGPayExpense, setPendingGPayExpense] = useState(null);
  const gpayListenerRef = useRef(null);

  // Duplicate expense merge state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [pendingExpense, setPendingExpense] = useState(null);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
      if (expenseCategoryDropdownRef.current && !expenseCategoryDropdownRef.current.contains(e.target)) {
        setShowExpenseCategoryDropdown(null);
      }
    };
    if (showCategoryDropdown || showExpenseCategoryDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryDropdown, showExpenseCategoryDropdown]);

  // Fetch record data if editing
  useEffect(() => {
    if (isEdit) {
      setFetchLoading(true);
      getRecordById(editId)
        .then((res) => {
          const r = res.data;
          setMonth(r.month);
          setYear(r.year);
          setSavingsGoal(r.savings_goal || '');
          setNotes(r.notes || '');
          setAddedIncomes((r.incomes || []).map((i) => ({ source: i.source, amount: String(i.amount) })));
          setAddedExpenses((r.expenses || []).map((e) => ({
            name: e.name,
            amount: String(e.amount),
            category: e.category || 'other',
            created_at: e.created_at || null,
          })));
        })
        .catch(() => navigate('/records'))
        .finally(() => setFetchLoading(false));
    }
  }, [editId, isEdit, navigate]);

  const addIncome = () => {
    if (!incomeInput.source || !incomeInput.amount) return;
    setAddedIncomes([...addedIncomes, { ...incomeInput }]);
    setIncomeInput({ source: '', amount: '' });
  };

  const removeIncome = (i) => setAddedIncomes(addedIncomes.filter((_, idx) => idx !== i));

  const cleanupGPayListener = () => {
    if (gpayListenerRef.current) {
      document.removeEventListener('visibilitychange', gpayListenerRef.current);
      gpayListenerRef.current = null;
    }
  };

  useEffect(() => cleanupGPayListener, []);

  const openGPay = () => {
    let appOpened = false;
    let timeoutId;

    const handler = () => {
      if (document.visibilityState === 'hidden') {
        appOpened = true;
        clearTimeout(timeoutId);
      } else if (document.visibilityState === 'visible' && appOpened) {
        cleanupGPayListener();
        setGpayPending(false);
        setTimeout(() => setShowGPayConfirmModal(true), 300);
      }
    };

    cleanupGPayListener();
    gpayListenerRef.current = handler;
    document.addEventListener('visibilitychange', handler);

    toast.info('Opening Google Pay... Come back here after payment.', { duration: 3000 });

    if (/android/i.test(navigator.userAgent)) {
      window.location.href = 'intent://upi/scanqr#Intent;scheme=tez;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.google.android.apps.nbu.paisa.user;end';
    } else {
      window.location.href = 'tez://upi/scanqr';
    }

    timeoutId = setTimeout(() => {
      if (!appOpened) {
        cleanupGPayListener();
        setGpayPending(false);
        setPendingGPayExpense(null);
        toast.error('Could not open Google Pay. Make sure it is installed on your device.');
      }
    }, 3000);
  };

  const addCustomCategory = (cat) => {
    const normalized = cat.trim().toLowerCase();
    if (!normalized || categories.includes(normalized)) return normalized;
    const idx = categories.indexOf('other');
    const newCats = [...categories];
    newCats.splice(idx === -1 ? newCats.length : idx, 0, normalized);
    setCategories(newCats);
    localStorage.setItem('expense_categories', JSON.stringify(newCats));
    return normalized;
  };

  const deleteCategory = (cat) => {
    if (cat === 'other') return;
    const newCats = categories.filter((c) => c !== cat);
    setCategories(newCats);
    localStorage.setItem('expense_categories', JSON.stringify(newCats));
    if (expenseInput.category === cat) {
      setExpenseInput((prev) => ({ ...prev, category: 'other' }));
    }
  };

  const handleCategoryChange = (val) => {
    setShowCustomCategoryInput(false);
    setExpenseInput((prev) => ({ ...prev, category: val }));
  };

  const confirmCustomCategory = () => {
    const trimmed = customCategoryDraft.trim().toLowerCase();
    if (!trimmed) return;
    addCustomCategory(trimmed);
    setExpenseInput((prev) => ({ ...prev, category: trimmed }));
    setCustomCategoryDraft('');
    setShowCustomCategoryInput(false);
  };

  const addExpense = () => {
    if (!expenseInput.name || !expenseInput.amount) return;
    const normalizedName = expenseInput.name.toLowerCase();

    if (gpayEnabled) {
      setPendingGPayExpense({ name: normalizedName, amount: expenseInput.amount, category: expenseInput.category });
      setGpayPending(true);
      openGPay();
    } else {
      const existingIndex = addedExpenses.findIndex(
        (e) => e.name.toLowerCase() === normalizedName
      );
      if (existingIndex !== -1) {
        setPendingExpense({ name: normalizedName, amount: expenseInput.amount, category: expenseInput.category });
        setShowMergeModal(true);
      } else {
        setAddedExpenses([...addedExpenses, {
          name: normalizedName,
          amount: expenseInput.amount,
          category: expenseInput.category,
          created_at: new Date().toISOString(),
        }]);
        setExpenseInput((prev) => ({ ...prev, name: '', amount: '' }));
        setExpensePage(0);
      }
    }
  };

  const handleGPayConfirm = () => {
    if (!pendingGPayExpense) return;
    const { name, amount, category } = pendingGPayExpense;
    const existingIndex = addedExpenses.findIndex(
      (e) => e.name.toLowerCase() === name
    );
    if (existingIndex !== -1) {
      setPendingExpense({ name, amount, category });
      setShowGPayConfirmModal(false);
      setPendingGPayExpense(null);
      setShowMergeModal(true);
    } else {
      setAddedExpenses([...addedExpenses, {
        name,
        amount,
        category,
        created_at: new Date().toISOString(),
      }]);
      setExpenseInput((prev) => ({ ...prev, name: '', amount: '' }));
      setExpensePage(0);
      setPendingGPayExpense(null);
      setShowGPayConfirmModal(false);
      toast.success('Payment confirmed! Expense added.');
    }
  };

  const handleGPayCancel = () => {
    setPendingGPayExpense(null);
    setShowGPayConfirmModal(false);
    toast.info('Payment not completed. Expense not added.');
  };

  const handleMergeConfirm = () => {
    setAddedExpenses(addedExpenses.map((e) =>
      e.name.toLowerCase() === pendingExpense.name
        ? { ...e, amount: String(Number(e.amount) + Number(pendingExpense.amount)) }
        : e
    ));
    setExpenseInput((prev) => ({ ...prev, name: '', amount: '' }));
    setPendingExpense(null);
    setShowMergeModal(false);
    toast.success('Expense amount merged successfully');
  };

  const handleMergeCancel = () => {
    setPendingExpense(null);
    setShowMergeModal(false);
  };

  const removeExpense = (i) => setAddedExpenses(addedExpenses.filter((_, idx) => idx !== i));

  // Compute valid items from the added lists
  const validIncomes = addedIncomes.filter((i) => i.source && Number(i.amount) > 0);
  const validExpenses = addedExpenses.filter((e) => e.name && Number(e.amount) > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validIncomes.length === 0) {
      return toast.error('Please add at least one income source');
    }

    setLoading(true);
    try {
      const payload = {
        month, year, incomes: validIncomes, expenses: validExpenses,
        savingsGoal: Number(savingsGoal) || 0, notes,
      };
      if (isEdit) {
        await updateRecord(editId, payload);
        toast.success('Record updated successfully!');
        navigate(`/records/${editId}`);
      } else {
        await createRecord(payload);
        toast.success('Record created successfully!');
        navigate('/records');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} record`);
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addIncome(); } };
  const handleExpenseKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addExpense(); } };

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
    <div className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          onClick={() => navigate(isEdit ? `/records/${editId}` : '/records')}
          className="flex items-center gap-2 text-sm mb-4 text-muted-fg hover:text-fg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          {isEdit ? 'Back to record' : 'Back to records'}
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg tracking-tight">
          {isEdit ? 'Edit Record' : 'Create Monthly Record'}
        </h1>
        <p className="text-sm text-muted-fg mt-1">
          {isEdit ? 'Update your income and expense details' : 'Add your income and expense details for a specific month'}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Period */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-[15px] font-semibold text-fg mb-4 sm:mb-5">Period</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-muted-fg">Month</label>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input-base w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm cursor-pointer">
                {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-muted-fg">Year</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input-base w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm cursor-pointer">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Income Sources */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-[15px] font-semibold text-fg mb-4 sm:mb-5">Income Sources</h2>

          {/* Fixed input bar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-start mb-4">
            <input
              type="text"
              value={incomeInput.source}
              onChange={(e) => setIncomeInput({ ...incomeInput, source: e.target.value })}
              onKeyDown={handleIncomeKeyDown}
              placeholder="e.g., Salary, Freelance"
              className="input-base flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm"
            />
            <input
              type="number"
              value={incomeInput.amount}
              onChange={(e) => setIncomeInput({ ...incomeInput, amount: e.target.value })}
              onKeyDown={handleIncomeKeyDown}
              placeholder="Amount"
              min="0"
              className="input-base w-full sm:w-36 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={addIncome}
              className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#0f3424] text-slate-200 border border-[#166534] cursor-pointer hover:opacity-80 transition-opacity w-full sm:w-auto"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Added incomes */}
          <AnimatePresence>
            {addedIncomes.map((inc, i) => (
              <motion.div
                key={`inc-${i}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-2"
                style={{ backgroundColor: 'rgba(15, 52, 36, 0.4)', border: '1px solid rgba(22, 101, 52, 0.4)' }}
              >
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <span className="text-sm font-medium text-fg truncate">{inc.source}</span>
                  <span className="text-sm font-bold text-success tabular-nums shrink-0">{formatCurrency(inc.amount)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeIncome(i)}
                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive-soft transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {addedIncomes.length > 0 && (
            <p className="text-xs text-muted-fg mt-2">{addedIncomes.length} income source{addedIncomes.length > 1 ? 's' : ''} added</p>
          )}
        </motion.div>

        {/* Expenses */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-[15px] font-semibold text-fg mb-4 sm:mb-5">Expenses</h2>

          {/* Fixed input bar — 3-row layout */}
          <div className="flex flex-col gap-2 mb-4">
            {/* Row 1: Expense name + Amount */}
            <div className="flex gap-2">
              <input
                type="text"
                value={expenseInput.name}
                onChange={(e) => setExpenseInput((prev) => ({ ...prev, name: e.target.value }))}
                onKeyDown={handleExpenseKeyDown}
                placeholder="Expense name"
                className="input-base flex-1 px-4 py-3 rounded-xl text-sm"
                disabled={gpayPending}
              />
              <input
                type="number"
                value={expenseInput.amount}
                onChange={(e) => setExpenseInput((prev) => ({ ...prev, amount: e.target.value }))}
                onKeyDown={handleExpenseKeyDown}
                placeholder="Amount"
                min="0"
                className="input-base w-[90px] sm:w-28 px-3 py-3 rounded-xl text-sm"
                disabled={gpayPending}
              />
            </div>

            {/* Row 2: Custom category dropdown + (conditional) custom input + save */}
            <div className="flex gap-2 items-stretch">
              {/* Custom dropdown */}
              <div className="relative flex-1 min-w-0" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => !gpayPending && setShowCategoryDropdown((v) => !v)}
                  className="input-base w-full px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between gap-2 disabled:opacity-50"
                  disabled={gpayPending}
                >
                  <span className="capitalize truncate text-fg">
                    {expenseInput.category.charAt(0).toUpperCase() + expenseInput.category.slice(1)}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-muted-fg transition-transform duration-150 ${showCategoryDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown panel */}
                {showCategoryDropdown && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl shadow-xl overflow-hidden border border-[var(--color-border)]" style={{ backgroundColor: 'var(--color-card)' }}>
                    <div className="max-h-44 overflow-y-auto">
                      {categories.map((cat) => (
                        <div
                          key={cat}
                          className={`group flex items-center justify-between px-4 py-2.5 transition-colors ${
                            expenseInput.category === cat
                              ? 'bg-primary/10 text-primary'
                              : 'text-fg hover:bg-[var(--color-input)]'
                          }`}
                        >
                          <span
                            className="flex-1 text-sm capitalize cursor-pointer"
                            onClick={() => {
                              handleCategoryChange(cat);
                              setShowCategoryDropdown(false);
                            }}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </span>
                          {cat !== 'other' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCategory(cat);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-destructive hover:bg-destructive/10 transition-all cursor-pointer shrink-0"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryDropdown(false);
                          setShowCustomCategoryInput(true);
                        }}
                        className="w-full px-4 py-2.5 text-sm text-left text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Plus size={13} /> Add custom category...
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom category input (shown when adding custom) */}
              {showCustomCategoryInput && (
                <>
                  <input
                    type="text"
                    value={customCategoryDraft}
                    onChange={(e) => setCustomCategoryDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmCustomCategory(); } }}
                    placeholder="Category name..."
                    className="input-base flex-1 min-w-0 px-3 py-3 rounded-xl text-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={confirmCustomCategory}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-3 rounded-xl bg-[#0f3424] text-slate-200 border border-[#166534] cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  >
                    <Plus size={13} /> Save
                  </button>
                </>
              )}
            </div>

            {/* Row 3: GPay toggle (mobile only) + Add expense button */}
            <div className="flex gap-2 items-stretch">
              {/* GPay Toggle — mobile only */}
              <button
                type="button"
                onClick={() => !gpayPending && setGpayEnabled(!gpayEnabled)}
                className={`md:hidden flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer transition-all border select-none shrink-0 ${
                  gpayEnabled
                    ? 'bg-[#1a73e8]/15 border-[#1a73e8]/40'
                    : 'bg-[#1a1a2e]/50 border-[#2a2a3e] hover:border-[#3a3a4e]'
                }`}
                disabled={gpayPending}
              >
                <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${gpayEnabled ? 'bg-[#1a73e8]' : 'bg-gray-600'}`}>
                  <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 shadow-sm ${gpayEnabled ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
                </div>
                <span className={`text-xs font-bold whitespace-nowrap transition-colors ${gpayEnabled ? 'text-[#4285f4]' : 'text-muted-fg'}`}>
                  GPay
                </span>
              </button>
              {/* Add expense button */}
              <button
                type="button"
                onClick={addExpense}
                disabled={gpayPending}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl bg-[#0f3424] text-slate-200 border border-[#166534] cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gpayPending ? (
                  <><Loader2 size={15} className="animate-spin" /> Paying via GPay...</>
                ) : (
                  <><Plus size={15} /> Add</>
                )}
              </button>
            </div>
          </div>

          {/* Added expenses — paginated, newest first */}
          {(() => {
            const reversedWithIdx = addedExpenses.map((exp, i) => ({ exp, i })).reverse();
            const totalExpensePages = Math.ceil(reversedWithIdx.length / EXPENSES_PER_PAGE);
            const pageItems = reversedWithIdx.slice(expensePage * EXPENSES_PER_PAGE, (expensePage + 1) * EXPENSES_PER_PAGE);
            return (
              <>
                {/* Header row with count + pagination */}
                {addedExpenses.length > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-fg">{addedExpenses.length} expense{addedExpenses.length > 1 ? 's' : ''} added</p>
                    {totalExpensePages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpensePage((p) => Math.max(0, p - 1))}
                          disabled={expensePage === 0}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={14} className="text-slate-400" />
                        </button>
                        <span className="text-[11px] text-muted-fg tabular-nums">{expensePage + 1}/{totalExpensePages}</span>
                        <button
                          type="button"
                          onClick={() => setExpensePage((p) => Math.min(totalExpensePages - 1, p + 1))}
                          disabled={expensePage === totalExpensePages - 1}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <ChevronRight size={14} className="text-slate-400" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Page-level animation — smooth slide on page change */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`page-${expensePage}`}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                  >
                    {pageItems.map(({ exp, i }) => (
                      <div
                        key={`exp-${i}`}
                        className="px-4 py-3 rounded-xl mb-2 bg-destructive-soft border border-[var(--color-destructive)]/15"
                      >
                        {/* Top row: name + amount + delete */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-fg truncate flex-1">{toTitleCase(exp.name)}</span>
                          <span className="text-sm font-bold text-destructive tabular-nums shrink-0">-{formatCurrency(exp.amount)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              removeExpense(i);
                              const newTotal = addedExpenses.length - 1;
                              const newPages = Math.ceil(newTotal / EXPENSES_PER_PAGE);
                              if (expensePage >= newPages) setExpensePage(Math.max(0, newPages - 1));
                            }}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive-soft transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Bottom row: category tag + date */}
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          {editingCategoryIdx === i ? (
                            <div className="relative" ref={expenseCategoryDropdownRef}>
                              <button
                                type="button"
                                onClick={() => setShowExpenseCategoryDropdown(showExpenseCategoryDropdown === i ? null : i)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize cursor-pointer bg-orange-500/15 border border-orange-500/30 text-orange-400"
                              >
                                <span className="whitespace-nowrap">{exp.category || 'other'}</span>
                                <ChevronDown
                                  size={11}
                                  className={`shrink-0 transition-transform ${showExpenseCategoryDropdown === i ? 'rotate-180' : ''}`}
                                />
                              </button>

                              {showExpenseCategoryDropdown === i && (
                                <div className="absolute z-50 top-full mt-1 left-0 rounded-lg shadow-2xl overflow-hidden min-w-[160px]" style={{ backgroundColor: '#000000', border: '1px solid #333333' }}>
                                  <div className="max-h-48 overflow-y-auto">
                                    {categories.map((cat) => (
                                      <div
                                        key={cat}
                                        className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[#111111] transition-colors group cursor-pointer"
                                        onClick={() => {
                                          setAddedExpenses(addedExpenses.map((item, idx) =>
                                            idx === i ? { ...item, category: cat } : item
                                          ));
                                          setEditingCategoryIdx(null);
                                          setShowExpenseCategoryDropdown(null);
                                        }}
                                      >
                                        <span
                                          className={`capitalize whitespace-nowrap ${
                                            exp.category === cat ? 'text-success font-semibold' : 'text-fg'
                                          }`}
                                        >
                                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </span>
                                        {cat !== 'other' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteCategory(cat);
                                              setShowExpenseCategoryDropdown(null);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 text-destructive hover:text-red-400 transition-opacity cursor-pointer shrink-0 ml-2"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ borderTop: '1px solid #333333' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowExpenseCategoryDropdown(null);
                                        setShowCustomCategoryInput(true);
                                      }}
                                      className="w-full px-3 py-2 text-xs text-left transition-colors cursor-pointer flex items-center gap-1.5 hover:bg-[#111111] whitespace-nowrap"
                                      style={{ color: '#4ade80' }}
                                    >
                                      <Plus size={12} />
                                      <span>Add custom category...</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingCategoryIdx(i)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[10px] font-medium capitalize hover:bg-orange-500/25 transition-colors cursor-pointer max-w-[140px]"
                              title="Click to edit category"
                            >
                              <Pencil size={9} className="text-orange-400 shrink-0" />
                              <span className="truncate">{exp.category || 'other'}</span>
                            </button>
                          )}
                          <span className="text-[10px] text-muted-fg tabular-nums shrink-0">
                            {exp.created_at && exp.created_at !== ''
                              ? new Date(exp.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })
                              : '(not applicable)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </>
            );
          })()}
        </motion.div>

        {/* Savings & Notes */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-4 sm:p-6">
          <h2 className="text-sm sm:text-[15px] font-semibold text-fg mb-4 sm:mb-5">Additional Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-muted-fg">Savings Goal (₹)</label>
              <input type="number" value={savingsGoal} onChange={(e) => setSavingsGoal(e.target.value)} placeholder="e.g., 10000" min="0" className="input-base w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-medium text-muted-fg">Notes</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for this month" maxLength={500} className="input-base w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm" />
            </div>
          </div>
        </motion.div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 sm:py-4 rounded-xl text-sm sm:text-[15px] flex items-center justify-center gap-2">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> {isEdit ? 'Update Record' : 'Save Record'}</>}
        </button>
      </form>

      <ConfirmModal
        isOpen={showMergeModal}
        onClose={handleMergeCancel}
        onConfirm={handleMergeConfirm}
        title="Duplicate Expense Found"
        description={pendingExpense ? `"${toTitleCase(pendingExpense.name)}" already exists with ${formatCurrency(addedExpenses.find(e => e.name.toLowerCase() === pendingExpense.name)?.amount || 0)}. Do you want to add ${formatCurrency(pendingExpense.amount)} on top of that?` : ''}
        confirmText="Yes, Merge"
        cancelText="No, Cancel"
      />

      <ConfirmModal
        isOpen={showGPayConfirmModal}
        onClose={handleGPayCancel}
        onConfirm={handleGPayConfirm}
        title="Confirm Payment"
        description={pendingGPayExpense ? (
          <>
            Did you complete the{' '}
            <span className="text-green-500 font-semibold">{formatCurrency(pendingGPayExpense.amount)}</span>
            {' '}payment for{' '}
            <span className="text-blue-500 font-semibold">{toTitleCase(pendingGPayExpense.name)}</span>
            {' '}in Google Pay?
          </>
        ) : ''}
        confirmText="Yes, I paid"
        cancelText="No, cancel"
      />
    </div>
  );
}
