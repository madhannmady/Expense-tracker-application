import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { formatCurrency } from '../lib/utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border px-3 py-2.5 text-sm shadow-xl"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <p className="font-medium text-muted-fg mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-fg">{p.name}</span>
            <span className="font-bold text-fg ml-auto tabular-nums">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function TrendAreaChart({ data = [], title = 'Income vs Expense Trend' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card p-6"
    >
      <h3 className="text-base font-semibold text-fg mb-1">{title}</h3>
      <p className="text-xs text-muted-fg mb-5">Showing income and expense trends over time</p>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-muted-fg text-sm">
          No trend data available
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.4}
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--color-muted-fg)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                tick={{ fill: 'var(--color-muted-fg)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="natural"
                dataKey="income"
                name="Income"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fill="url(#incomeGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--color-bg)' }}
              />
              <Area
                type="natural"
                dataKey="expense"
                name="Expense"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                fill="url(#expenseGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--color-bg)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
