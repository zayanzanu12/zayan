import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Terminal,
  AlertCircle,
  CheckCircle2,
  X,
  Radio,
} from 'lucide-react';
import { api } from '../../services/api';
import { User } from '../../types/chat';

interface AdminLoginPageProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLoginSuccess: (adminUser: User) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  isOpen,
  onClose,
  onAdminLoginSuccess,
}) => {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || !password) {
      setError('Administrative ID and security password are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.login(handle.trim(), password);
      if (res.user.role !== 'admin') {
        setError('Access Denied: Account lacks administrator privileges.');
        setLoading(false);
        return;
      }

      setSuccess(`Security clearance verified. Welcome, Administrator ${res.user.displayName}.`);
      setTimeout(() => {
        onAdminLoginSuccess(res.user);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Authentication rejected. Verify administrative credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      {/* Background Neon Red Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-rose-900/10 rounded-full blur-[100px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 30, 68, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 30, 68, 0.1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Main Glassmorphic Red Card */}
      <div className="relative w-full max-w-md bg-[#0A0A0E]/95 border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(225,29,72,0.25)] overflow-hidden">
        {/* Glowing Top Accent Line */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#FF1E44]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-500 hover:text-white hover:bg-neutral-900/80 transition-colors cursor-pointer"
          title="Exit Admin Gateway"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)] mb-3">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/50 text-[10px] font-mono tracking-widest text-red-400 uppercase mb-2">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span>Restricted Gateway // Tab + W</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white uppercase">
            Administrative Portal
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs">
            Enter authorized administrator credentials to manage databases, users, and server configurations.
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Admin Handle or Email
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-red-400 transition-colors">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="Admin user handle"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-[#121218] border border-neutral-800 rounded-2xl text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Master Security Key
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-red-400 transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-12 py-3 bg-[#121218] border border-neutral-800 rounded-2xl text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(225,29,72,0.4)] hover:shadow-[0_0_30px_rgba(225,29,72,0.6)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Clearance...</span>
              </span>
            ) : (
              <>
                <span>Access Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Watermark */}
        <div className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-red-500" />
            <span>SECURE GATEWAY v3.2</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Back to User Login
          </button>
        </div>
      </div>
    </div>
  );
};
