import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, ArrowLeft, Lock } from 'lucide-react';

export default function VerifyOtp() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const email = location.state?.email;

  useEffect(() => {
    if (!email) navigate('/login');
    else inputRefs.current[0]?.focus();
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pasted)) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length < 6) return setError('Please enter the full 6-digit OTP');

    setLoading(true);
    setError('');

    try {
      const res = await verifyOtp(email, otpStr);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, hsl(142 76% 36% / 0.06), transparent 70%)',
            top: '-180px',
            left: '-180px',
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, hsl(155 50% 50% / 0.04), transparent 70%)',
            bottom: '-100px',
            right: '-100px',
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[440px] relative z-10"
      >
        {/* Back button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-sm mb-8 transition-colors cursor-pointer group"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
        >
          <ArrowLeft size={16} />
          Back to login
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, hsl(142 76% 36%), hsl(155 60% 42%))',
              boxShadow: '0 12px 40px hsl(142 76% 36% / 0.35)',
            }}
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ShieldCheck size={36} color="white" strokeWidth={1.8} />
          </motion.div>

          <h1
            className="text-3xl font-bold tracking-tight mb-3"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            Verify Your Identity
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Enter the 6-digit code sent to
          </p>
          <p className="text-base font-semibold mt-1" style={{ color: 'hsl(var(--primary))' }}>
            {email}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-10"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 8px 40px hsl(0 0% 0% / 0.12), 0 0 0 1px hsl(var(--border) / 0.5)',
          }}
        >
          <div className="flex items-center gap-2 mb-8">
            <Lock size={15} style={{ color: 'hsl(var(--primary))' }} />
            <span className="text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
              One-Time Password
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* OTP Inputs */}
            <div className="flex justify-center gap-3.5" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <motion.input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-14 h-16 text-center text-2xl font-bold rounded-xl outline-none transition-all duration-200"
                  style={{
                    background: digit ? 'hsl(var(--background))' : 'hsl(var(--muted))',
                    color: 'hsl(var(--foreground))',
                    border: digit
                      ? '2px solid hsl(var(--primary))'
                      : '2px solid hsl(var(--border))',
                    boxShadow: digit ? '0 0 0 4px hsl(var(--primary) / 0.1)' : 'none',
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.06 }}
                />
              ))}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-center px-4 py-3 rounded-xl"
                style={{
                  background: 'hsl(0 84% 60% / 0.1)',
                  color: 'hsl(0 84% 60%)',
                  border: '1px solid hsl(0 84% 60% / 0.15)',
                }}
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, hsl(142 76% 36%), hsl(155 55% 42%))',
                color: 'white',
                boxShadow: '0 6px 24px hsl(142 76% 36% / 0.35)',
                fontSize: '15px',
              }}
              whileHover={{ scale: 1.015, boxShadow: '0 8px 32px hsl(142 76% 36% / 0.45)' }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                'Verify & Login'
              )}
            </motion.button>
          </form>

          <div
            className="mt-8 pt-6 text-center"
            style={{ borderTop: '1px solid hsl(var(--border))' }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Code expires in 5 minutes · Check your spam folder
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
