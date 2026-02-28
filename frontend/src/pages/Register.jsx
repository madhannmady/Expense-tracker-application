import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, Wallet, Loader2 } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) return setError('Please fill in all fields');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    setError('');

    try {
      const res = await registerUser(username, password);
      // Automatically log in the user after successful registration
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-page relative overflow-hidden">
      {/* Left Panel — Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(145deg, #052e16 0%, #09090b 50%, #0c1f0f 100%)',
          }}
        />

        {/* Glowing orbs */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)', top: '-100px', right: '-100px' }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #16a34a, transparent 70%)', bottom: '-80px', left: '-80px' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8 border border-white/10">
              <Wallet size={30} className="text-green-400" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight tracking-tight">
              Start your financial<br />journey today
            </h2>
            <p className="text-lg text-green-200/60 leading-relaxed">
              Create an account to securely track your monthly expenses, budget intelligently, and watch your savings grow.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3 mt-10">
              {['Secure Registration', 'Private Data', 'Custom Budgets', 'Scalable'].map((feat) => (
                <span key={feat} className="px-4 py-2 rounded-full text-sm font-medium bg-white/5 text-green-300/80 border border-white/10">
                  {feat}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel — Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo (hidden on desktop since left panel has it) */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
              <Wallet size={22} className="text-primary-fg" />
            </div>
            <span className="text-xl font-bold text-fg tracking-tight">Expense Tracker</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-fg tracking-tight mb-2">
              Create an account
            </h1>
            <p className="text-base text-muted-fg">
              Enter your details to get started
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-fg">
                Username
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none"
                />
                <input
                  type="text"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  autoComplete="username"
                  className="input-base w-full pl-12 pr-4 py-3.5 rounded-xl text-[15px]"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-fg">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none"
                />
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  className="input-base w-full pl-12 pr-4 py-3.5 rounded-xl text-[15px]"
                />
              </div>
            </div>

            {/* Confirm Password field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-fg">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className="input-base w-full pl-12 pr-4 py-3.5 rounded-xl text-[15px]"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-destructive-soft text-destructive text-sm px-4 py-3 rounded-xl border border-[var(--color-destructive)]/15"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 rounded-xl text-[15px] flex items-center justify-center gap-2.5 mt-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Sign Up
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-10 space-y-3">
            <p className="text-sm text-muted-fg mt-4">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-primary hover:text-primary-focus font-medium underline-offset-4 hover:underline"
              >
                Sign in
              </button>
            </p>
            <p className="text-xs text-muted-fg/60">
              Smart Finance · Track every rupee
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
