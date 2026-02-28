import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export function ThemeToggler() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full cursor-pointer transition-colors duration-300 focus:outline-none"
      style={{
        backgroundColor: isDark ? 'var(--color-muted)' : '#e4e4e7',
      }}
      aria-label="Toggle theme"
    >
      {/* Track icons */}
      <Sun size={12} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-amber-400 opacity-50" />
      <Moon size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-300 opacity-50" />
      
      {/* Sliding knob */}
      <motion.div
        className="absolute top-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
        style={{
          backgroundColor: isDark ? 'var(--color-fg)' : '#ffffff',
        }}
        animate={{ left: isDark ? '30px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {isDark ? (
          <Moon size={12} className="text-blue-400" />
        ) : (
          <Sun size={12} className="text-amber-500" />
        )}
      </motion.div>
    </button>
  );
}
