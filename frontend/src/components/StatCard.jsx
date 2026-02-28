import { motion } from 'framer-motion';
import { formatCurrency } from '../lib/utils';

export function StatCard({ title, value, icon: Icon, index = 0, isCurrency = true, suffix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="card p-4 sm:p-6 flex flex-col w-full h-full"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="w-10 sm:w-11 h-10 sm:h-11 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="sm:size-[20px] text-primary" />
        </div>
      </div>
      <p className="text-xs sm:text-[13px] text-muted-fg font-medium mb-1">
        {title}
      </p>
      <p className="text-lg sm:text-2xl font-bold text-fg tracking-tight line-clamp-2">
        {isCurrency ? formatCurrency(value) : value}{suffix}
      </p>
    </motion.div>
  );
}
