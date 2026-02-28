import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatCurrency, MONTH_NAMES } from '../lib/utils';
import { CalendarDays, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

export function MonthCard({ record, index = 0 }) {
  const navigate = useNavigate();

  const totalIncome = (record.incomes || []).reduce((s, i) => s + Number(i.amount), 0);
  const totalExpense = (record.expenses || []).reduce((s, e) => s + Number(e.amount), 0);
  const savings = totalIncome - totalExpense;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => navigate(`/records/${record.id}`)}
      className="card p-5 cursor-pointer group hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
            <CalendarDays size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-fg">{MONTH_NAMES[record.month - 1]}</h3>
            <p className="text-[12px] text-muted-fg">{record.year}</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-muted-fg group-hover:text-primary transition-colors" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-fg"><TrendingUp size={14} className="text-success" />Income</span>
          <span className="font-semibold text-fg tabular-nums">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-fg"><TrendingDown size={14} className="text-destructive" />Expense</span>
          <span className="font-semibold text-fg tabular-nums">{formatCurrency(totalExpense)}</span>
        </div>
        <div className="border-t border-themed my-1" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-fg font-medium">Savings</span>
          <span className={`font-bold tabular-nums ${savings >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(savings)}</span>
        </div>
      </div>
    </motion.div>
  );
}
