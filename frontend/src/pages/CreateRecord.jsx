import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createRecord, updateRecord, getRecordById } from '../services/api';
import { MONTH_NAMES, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  const [expenseInput, setExpenseInput] = useState({ name: '', amount: '' });
  const [addedExpenses, setAddedExpenses] = useState([]);

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
          setAddedExpenses((r.expenses || []).map((e) => ({ name: e.name, amount: String(e.amount) })));
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

  const addExpense = () => {
    if (!expenseInput.name || !expenseInput.amount) return;
    setAddedExpenses([...addedExpenses, { ...expenseInput }]);
    setExpenseInput({ name: '', amount: '' });
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

          {/* Added incomes — green-tinted banners */}
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

          {/* Fixed input bar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-start mb-4">
            <input
              type="text"
              value={expenseInput.name}
              onChange={(e) => setExpenseInput({ ...expenseInput, name: e.target.value })}
              onKeyDown={handleExpenseKeyDown}
              placeholder="e.g., Rent, Groceries, Netflix"
              className="input-base flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm"
            />
            <input
              type="number"
              value={expenseInput.amount}
              onChange={(e) => setExpenseInput({ ...expenseInput, amount: e.target.value })}
              onKeyDown={handleExpenseKeyDown}
              placeholder="Amount"
              min="0"
              className="input-base w-full sm:w-36 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm"
            />
            <button
              type="button"
              onClick={addExpense}
              className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#0f3424] text-slate-200 border border-[#166534] cursor-pointer hover:opacity-80 transition-opacity w-full sm:w-auto"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Added expenses — red-tinted banners */}
          <AnimatePresence>
            {addedExpenses.map((exp, i) => (
              <motion.div
                key={`exp-${i}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-2 bg-destructive-soft border border-[var(--color-destructive)]/15"
              >
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <span className="text-sm font-medium text-fg truncate">{exp.name}</span>
                  <span className="text-sm font-bold text-destructive tabular-nums shrink-0">-{formatCurrency(exp.amount)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeExpense(i)}
                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive-soft transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {addedExpenses.length > 0 && (
            <p className="text-xs text-muted-fg mt-2">{addedExpenses.length} expense{addedExpenses.length > 1 ? 's' : ''} added</p>
          )}
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
    </div>
  );
}
