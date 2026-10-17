import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Shield,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import { User as UserType } from '../../types/chat';
import { Logo } from '../common/Logo';

interface LoginPageProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Cinematic Animation Stage: 'orb' -> 'logo' -> 'glass' -> 'exiting'
  const [animStage, setAnimStage] = useState<'orb' | 'logo' | 'glass' | 'exiting'>('orb');

  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Form Fields
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryInfo, setRecoveryInfo] = useState<{ adminEmail: string; message: string } | null>(null);

  // Multi-tier Cinematic Animation Timeline
  useEffect(() => {
    // Step 1: Glowing emerald orb emerges
    const timer1 = setTimeout(() => {
      // Step 2: Talksy logo fades in with scale and soft aura
      setAnimStage('logo');
    }, 700);

    // Step 3: Glass panels smoothly slide into place
    const timer2 = setTimeout(() => {
      setAnimStage('glass');
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const data = await api.login(username.trim(), password);
        setSuccessMsg(`Welcome back, ${data.user.displayName}!`);
        setAnimStage('exiting');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 500);
      } else {
        const nameToUse = displayName.trim() || username.trim();
        const data = await api.register(username.trim(), nameToUse, password);
        setSuccessMsg(`Account created! Welcome to Talksy, ${data.user.displayName}!`);
        setAnimStage('exiting');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const openForgotPassword = async () => {
    setShowForgotModal(true);
    try {
      const info = await api.getRecoverInfo();
      setRecoveryInfo(info);
    } catch {
      setRecoveryInfo({
        adminEmail: 'zayanzanu30408@gmail.com',
        message: 'Please contact Administrator Zayan to reset your password.',
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#07111F] text-[#E8F0FA] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* ---------------------------------------------------- */}
      {/* CINEMATIC LAYER 1: Deep Dark Space & Ambient Nebula */}
      {/* ---------------------------------------------------- */}
      <div className="absolute inset-0 bg-[#07111F]" />

      {/* ---------------------------------------------------- */}
      {/* CINEMATIC LAYER 2: GLOWING EMERALD ORB (Blur, Glow, Scale) */}
      {/* ---------------------------------------------------- */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-all duration-1000 ease-out ${
          animStage === 'orb'
            ? 'w-48 h-48 bg-[#00D68F] opacity-90 blur-3xl scale-125'
            : animStage === 'logo'
            ? 'w-80 h-80 bg-[#00D68F] opacity-60 blur-[90px] scale-100'
            : 'w-[480px] h-[480px] bg-[#00D68F]/25 opacity-40 blur-[130px] scale-90'
        }`}
      />

      {/* Secondary accent orb for cinematic depth */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-emerald-400 opacity-20 blur-2xl pointer-events-none transition-all duration-1000 ${
          animStage === 'orb' ? 'scale-150 animate-pulse' : 'scale-100 opacity-15'
        }`}
      />

      {/* ---------------------------------------------------- */}
      {/* CINEMATIC STAGE: SPLASH & LOGO FADE-IN */}
      {/* ---------------------------------------------------- */}
      {(animStage === 'orb' || animStage === 'logo') && (
        <div
          className={`flex flex-col items-center justify-center text-center z-30 transition-all duration-700 ease-out ${
            animStage === 'logo'
              ? 'opacity-100 scale-100 blur-none translate-y-0'
              : 'opacity-0 scale-75 blur-md translate-y-4'
          }`}
        >
          {/* Glowing Talksy Emblem */}
          <div className="relative mb-5 transform transition-transform duration-700 hover:scale-105">
            <Logo size="hero" showText={false} glow={true} animated={true} />
            {/* Soft radiant bloom behind logo */}
            <div className="absolute -inset-6 rounded-full bg-[#00D68F]/30 blur-2xl pointer-events-none animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#E8F0FA] mb-2 drop-shadow-[0_4px_16px_rgba(0,214,143,0.4)]">
            Talksy
          </h1>
          <p className="text-sm text-[#00D68F] font-semibold tracking-wider uppercase">
            Your world · Your conversations
          </p>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* CINEMATIC STAGE: GLASS PANELS SMOOTHLY SLIDE INTO PLACE */}
      {/* ---------------------------------------------------- */}
      {(animStage === 'glass' || animStage === 'exiting') && (
        <div
          className={`w-full max-w-md relative z-10 transition-all duration-700 ease-out ${
            animStage === 'exiting'
              ? 'opacity-0 scale-95 -translate-y-8 blur-sm pointer-events-none'
              : 'opacity-100 scale-100 translate-y-0 blur-none'
          }`}
        >
          {/* Header Brand Mark (Compact & Glowing) */}
          <div className="flex flex-col items-center text-center mb-5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="mb-2.5 transform hover:scale-105 transition-transform">
              <Logo size="lg" showText={false} glow={true} animated={false} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#E8F0FA]">
              Talksy
            </h2>
            <p className="text-[#00D68F] text-xs font-semibold tracking-wider mt-0.5 uppercase">
              Your world · Your conversations
            </p>
          </div>

          {/* Premium Glass Panel Card */}
          <div className="bg-[#0D1B2A]/90 backdrop-blur-2xl border border-[#1E3042] rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden transition-all duration-300">
            {/* Top Emerald Accent Glow Line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#00D68F] to-transparent opacity-80" />

            {/* Login / Signup Segmented Control */}
            <div className="flex p-1 bg-[#111E2D] border border-[#1E3042] rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#00D68F] text-[#07111F] shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#E8F0FA]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[#00D68F] text-[#07111F] shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#E8F0FA]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[#F87171]/15 border border-[#F87171]/40 text-[#F87171] text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-[#00D68F]/15 border border-[#00D68F]/40 text-[#00D68F] text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-[#00D68F] shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User ID / Username */}
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  User ID / Handle
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8] group-focus-within:text-[#00D68F] transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. zayan"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#111E2D] border border-[#1E3042] rounded-xl text-sm text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] transition-all"
                    required
                  />
                </div>
              </div>

              {/* Display Name (Only in Signup Mode) */}
              {mode === 'signup' && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                    Your Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8] group-focus-within:text-[#00D68F] transition-colors">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Zayan Khan"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#111E2D] border border-[#1E3042] rounded-xl text-sm text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-xs text-[#00D68F] hover:text-[#00B87A] transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8] group-focus-within:text-[#00D68F] transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full pl-10 pr-11 py-2.5 bg-[#111E2D] border border-[#1E3042] rounded-xl text-sm text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#94A3B8] hover:text-[#00D68F] transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-[#00D68F]/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-[#07111F]/30 border-t-[#07111F] rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Enter Talksy' : 'Create Account & Enter'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom footnote */}
            <div className="mt-6 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#00D68F]" />
              <span>Encrypted peer communications · Protected credentials</span>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1B2A] border border-[#1E3042] rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 mb-3 text-[#00D68F]">
              <HelpCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-[#E8F0FA]">Password Recovery</h3>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              {recoveryInfo?.message || 'Contact Administrator Zayan for an account password reset.'}
            </p>
            {recoveryInfo?.adminEmail && (
              <div className="bg-[#111E2D] border border-[#1E3042] p-2.5 rounded-xl text-xs font-mono text-[#00D68F] mb-4 text-center">
                {recoveryInfo.adminEmail}
              </div>
            )}
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] text-[#E8F0FA] text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
