import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarDays,
  PieChart,
  Notebook,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/records', icon: CalendarDays, label: 'Records' },
  { to: '/budgets', icon: PieChart, label: 'Budgets' },
  { to: '/notes', icon: Notebook, label: 'Notes' },
];

export function BottomNavBar() {
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-card border-t border-themed backdrop-blur-md"
    >
      <div className="flex items-center justify-around h-20 px-2 max-w-full overflow-hidden">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-col items-center justify-center w-16 h-16 flex-shrink-0"
            >
              {({ isActive: active }) => (
                <>
                  <motion.div
                    animate={{
                      scale: active ? 1.1 : 1,
                      y: active ? -2 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`p-2 rounded-xl transition-all ${
                      active
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-fg'
                    }`}
                  >
                    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                  </motion.div>
                  {active && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute bottom-1 h-1 w-6 bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </motion.nav>
  );
}
