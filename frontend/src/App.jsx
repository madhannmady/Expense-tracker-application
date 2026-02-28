import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MonthlyRecords from './pages/MonthlyRecords';
import CreateRecord from './pages/CreateRecord';
import RecordDetail from './pages/RecordDetail';
import BudgetManagement from './pages/BudgetManagement';
import BudgetDetail from './pages/BudgetDetail';
import CreateBudget from './pages/CreateBudget';
import MonthlyNotesList from './pages/MonthlyNotesList';
import CreateNotes from './pages/CreateNotes';
import NoteDetail from './pages/NoteDetail';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'hsl(var(--background))' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'hsl(var(--background))' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/records" element={<MonthlyRecords />} />
        <Route path="/records/create" element={<CreateRecord />} />
        <Route path="/records/:id/edit" element={<CreateRecord />} />
        <Route path="/records/:id" element={<RecordDetail />} />
        <Route path="/budgets" element={<BudgetManagement />} />
        <Route path="/budgets/create" element={<CreateBudget />} />
        <Route path="/budgets/:month/:year" element={<BudgetDetail />} />
        <Route path="/notes" element={<MonthlyNotesList />} />
        <Route path="/notes/create" element={<CreateNotes />} />
        <Route path="/notes/:id/edit" element={<CreateNotes />} />
        <Route path="/notes/:id" element={<NoteDetail />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="bottom-right" theme="dark" richColors />
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
