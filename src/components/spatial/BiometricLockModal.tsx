import React, { useState } from 'react';
import { Fingerprint, ScanFace, Lock, KeyRound, CheckCircle2, ShieldCheck } from 'lucide-react';
import { User } from '../../types/chat';

interface BiometricLockProps {
  isLocked?: boolean;
  isOpen?: boolean;
  userName?: string;
  userAvatar?: string;
  currentUser?: User | null;
  onUnlock: () => void;
}

export const BiometricLockModal: React.FC<BiometricLockProps> = ({
  isLocked,
  isOpen,
  userName,
  userAvatar,
  currentUser,
  onUnlock,
}) => {
  const [method, setMethod] = useState<'fingerprint' | 'face' | 'pin'>('fingerprint');
  const [pin, setPin] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const locked = isLocked !== undefined ? isLocked : Boolean(isOpen);
  if (!locked) return null;

  const displayName = userName || currentUser?.displayName || 'User';
  const displayAvatar = userAvatar || currentUser?.avatarUrl;

  const handleSimulateScan = () => {
    setScanning(true);
    setError(null);

    setTimeout(() => {
      setScanning(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onUnlock();
      }, 500);
    }, 900);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('Enter a 4-digit security PIN');
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onUnlock();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-99 bg-[#071310]/95 backdrop-blur-2xl flex items-center justify-center p-4 select-none">
      <div className="bg-[#0D1E18] border border-[#294438] rounded-3xl w-full max-w-sm p-6 shadow-2xl shadow-emerald-950/80 flex flex-col items-center text-center animate-in zoom-in-95 ring-1 ring-[#00C98D]/20">
        {/* User avatar & lock indicator */}
        <div className="relative mb-4">
          <img
            src={displayAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
            alt={displayName}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-[#00C98D]/40"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#142A22] border border-[#294438] text-[#00C98D] flex items-center justify-center">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <h3 className="text-base font-bold text-[#F4FFF9] tracking-wide font-heading">
          ZappChat Spatial Secured
        </h3>
        <p className="text-xs text-[#91A99C] mt-1 mb-6">
          Welcome back, <span className="text-[#F4FFF9] font-semibold">{displayName}</span>
        </p>

        {/* Biometric Scanner Section */}
        {method === 'fingerprint' && (
          <div className="flex flex-col items-center">
            <button
              onClick={handleSimulateScan}
              disabled={scanning || success}
              className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all cursor-pointer relative ${
                scanning
                  ? 'bg-[#00C98D]/25 border-2 border-[#00C98D] shadow-[0_0_30px_rgba(0,201,141,0.5)] animate-pulse'
                  : success
                  ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300'
                  : 'bg-[#142A22] border border-[#294438] hover:border-[#00C98D]/60 text-[#00C98D] hover:bg-[#142A22]/90'
              }`}
            >
              {success ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              ) : (
                <Fingerprint className="w-12 h-12 stroke-[1.8]" />
              )}
            </button>
            <p className="text-xs text-[#91A99C] mt-3 font-mono">
              {scanning ? 'Verifying biometric signature...' : success ? 'Biometrics matched!' : 'Touch sensor to unlock'}
            </p>
          </div>
        )}

        {method === 'face' && (
          <div className="flex flex-col items-center">
            <button
              onClick={handleSimulateScan}
              disabled={scanning || success}
              className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all cursor-pointer relative ${
                scanning
                  ? 'bg-[#00C98D]/25 border-2 border-[#00C98D] shadow-[0_0_30px_rgba(0,201,141,0.5)] animate-pulse'
                  : success
                  ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300'
                  : 'bg-[#142A22] border border-[#294438] hover:border-[#00C98D]/60 text-[#00C98D]'
              }`}
            >
              {success ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              ) : (
                <ScanFace className="w-12 h-12 stroke-[1.8]" />
              )}
            </button>
            <p className="text-xs text-[#91A99C] mt-3 font-mono">
              {scanning ? 'Scanning Face ID...' : success ? 'Face verified!' : 'Glance to verify Face ID'}
            </p>
          </div>
        )}

        {method === 'pin' && (
          <form onSubmit={handlePinSubmit} className="w-full space-y-3">
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter PIN (e.g. 1234)"
              className="w-full text-center tracking-widest text-lg font-mono px-4 py-2.5 bg-[#071310] border border-[#294438] rounded-xl text-[#F4FFF9] placeholder-[#91A99C] focus:outline-none focus:border-[#00C98D]"
              autoFocus
            />
            {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#00C98D] hover:bg-[#00C98D]/90 text-[#071310] font-bold text-xs transition-colors cursor-pointer"
            >
              Unlock Workspace
            </button>
          </form>
        )}

        {/* Method switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#294438] w-full justify-center">
          <button
            onClick={() => setMethod('fingerprint')}
            className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              method === 'fingerprint' ? 'bg-[#00C98D]/20 text-[#63F5C0]' : 'text-[#91A99C] hover:text-[#F4FFF9]'
            }`}
            title="Fingerprint Unlock"
          >
            <Fingerprint className="w-4 h-4" />
            <span className="text-[11px]">Touch</span>
          </button>
          <button
            onClick={() => setMethod('face')}
            className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              method === 'face' ? 'bg-[#00C98D]/20 text-[#63F5C0]' : 'text-[#91A99C] hover:text-[#F4FFF9]'
            }`}
            title="Face ID"
          >
            <ScanFace className="w-4 h-4" />
            <span className="text-[11px]">Face</span>
          </button>
          <button
            onClick={() => setMethod('pin')}
            className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              method === 'pin' ? 'bg-[#00C98D]/20 text-[#63F5C0]' : 'text-[#91A99C] hover:text-[#F4FFF9]'
            }`}
            title="PIN Unlock"
          >
            <KeyRound className="w-4 h-4" />
            <span className="text-[11px]">PIN</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-[#91A99C] mt-3 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00C98D]" />
          <span>Encrypted Keystore · Ratchet E2EE</span>
        </div>
      </div>
    </div>
  );
};
