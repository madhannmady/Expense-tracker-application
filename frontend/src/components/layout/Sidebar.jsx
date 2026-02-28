import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { ThemeToggler } from '../ThemeToggler';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarDays,
  LogOut,
  Wallet,
  PieChart,
  Notebook,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/records', icon: CalendarDays, label: 'Monthly Records' },
  { to: '/budgets', icon: PieChart, label: 'Budgets' },
  { to: '/notes', icon: Notebook, label: 'Notes & Lending' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar();

  const handleNavClick = () => {
    closeSidebar();
  };

  return (
    <>
      {/* Mobile Menu Button - Shown only on small screens */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-6 left-6 z-50 p-2 rounded-xl bg-primary-soft text-primary hover:opacity-80 transition-colors cursor-pointer"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`sidebar fixed left-0 top-0 bottom-0 w-[260px] flex flex-col z-50 bg-card border-r border-themed transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="px-7 pt-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-fg tracking-tight leading-tight">
                Expense Tracker
              </h1>
              <p className="text-[11px] text-muted-fg mt-0.5">Smart Finance</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider px-3 mb-3 shrink-0">
            Menu
          </p>
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <NavLink
                key={to}
                to={to}
                onClick={handleNavClick}
                className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                  isActive 
                    ? 'active bg-primary-soft text-primary' 
                    : 'text-muted-fg hover:bg-muted/50 hover:text-fg'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-4 pb-6 space-y-4 pt-4 mt-auto">
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[13px] text-muted-fg font-medium">Theme</span>
            <ThemeToggler />
          </div>

          {/* Divider */}
          <div className="border-t border-themed my-2" />

          {/* User & Logout */}
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                <span className="text-primary text-sm font-bold">
                  {(user?.username || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-fg truncate">{user?.username || 'User'}</p>
                <p className="text-[11px] text-muted-fg mt-0.5">Online</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-muted-fg hover:text-destructive hover:bg-destructive-soft transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
