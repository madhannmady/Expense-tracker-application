import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '../lib/utils';

const COLORS = [
  'hsl(142, 76%, 36%)', 'hsl(142, 71%, 45%)', 'hsl(143, 64%, 24%)', 'hsl(141, 84%, 53%)',
  'hsl(142, 60%, 30%)', 'hsl(140, 49%, 51%)', 'hsl(143, 85%, 65%)', 'hsl(144, 50%, 42%)',
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const { category, amount } = payload[0].payload;
    const total = payload[0].payload._total;
    const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
    return (
      <div className="rounded-lg border px-3 py-2.5 text-sm shadow-xl"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <p className="font-medium text-fg">{category}</p>
        <p className="text-muted-fg">{formatCurrency(amount)} ({pct}%)</p>
      </div>
    );
  }
  return null;
};

export function ExpensePieChart({ data = [], title = 'Expense Breakdown' }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  const chartData = data.map((d) => ({ ...d, _total: total }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="card p-6 h-full flex flex-col"
    >
      <h3 className="text-base font-semibold text-fg mb-1">{title}</h3>
      <p className="text-xs text-muted-fg mb-4">Hover for details</p>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-fg text-sm">
          No expense data available
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-[160px] h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Compact legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 justify-center">
            {data.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-fg">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {item.category}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
