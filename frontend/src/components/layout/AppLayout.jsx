import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { motion } from 'framer-motion';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 w-full ml-0 lg:ml-[260px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 overflow-auto transition-all duration-300"
      >
        <div className="max-w-full lg:max-w-[1200px] mx-auto pt-12 lg:pt-0">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}
