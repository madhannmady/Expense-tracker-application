import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggler } from '../ThemeToggler';
import {
  LayoutDashboard,
  CalendarDays,
  LogOut,
  Wallet,
  PieChart,
  Notebook,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/records', icon: CalendarDays, label: 'Monthly Records' },
  { to: '/budgets', icon: PieChart, label: 'Budget' },
  { to: '/notes', icon: Notebook, label: 'Notes & Lending' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="sidebar fixed left-0 top-0 bottom-0 w-[260px] flex flex-col z-50">
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
            <p className="text-[11px] text-muted-fg">Smart Finance</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <p className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider px-3 mb-3">
          Menu
        </p>
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={to}
              className={`sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-4 pb-6 space-y-4">
        {/* Theme toggle */}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[13px] text-muted-fg font-medium">Theme</span>
          <ThemeToggler />
        </div>

        {/* Divider */}
        <div className="border-t border-themed" />

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
              <p className="text-[11px] text-muted-fg">Online</p>
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
  );
}
