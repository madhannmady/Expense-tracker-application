import { motion } from 'framer-motion';
import { formatCurrency } from '../lib/utils';

export function StatCard({ title, value, icon: Icon, index = 0, isCurrency = true, suffix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-primary-soft flex items-center justify-center">
          <Icon size={20} className="text-primary" />
        </div>
      </div>
      <p className="text-[13px] text-muted-fg font-medium mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold text-fg tracking-tight">
        {isCurrency ? formatCurrency(value) : value}{suffix}
      </p>
    </motion.div>
  );
}
