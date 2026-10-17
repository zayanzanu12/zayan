import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Trash2,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Clock,
  QrCode,
} from 'lucide-react';
import { LinkedDevice, PairingCodeResponse } from '../../types/chat';
import { api } from '../../services/api';

interface LinkedDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceRevoked?: (isCurrent: boolean) => void;
}

export const LinkedDevicesModal: React.FC<LinkedDevicesModalProps> = ({
  isOpen,
  onClose,
  onDeviceRevoked,
}) => {
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'link'>('list');
  const [pairingData, setPairingData] = useState<PairingCodeResponse | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [pairingSubmitting, setPairingSubmitting] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [unlinkingAll, setUnlinkingAll] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const list = await api.getLinkedDevices();
      setDevices(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load linked devices' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLinkView = async () => {
    setView('link');
    setPairingLoading(true);
    try {
      const data = await api.getPairingCode();
      setPairingData(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate link code' });
      setView('list');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleUnlink = async (deviceId: string, isCurrent: boolean) => {
    if (isCurrent) {
      if (!confirm('Logging out this device will end your current session. Continue?')) {
        return;
      }
    }

    setUnlinkingId(deviceId);
    try {
      await api.unlinkDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      setFeedback({ type: 'success', message: 'Device logged out successfully' });
      setTimeout(() => setFeedback(null), 3000);

      if (isCurrent && onDeviceRevoked) {
        onDeviceRevoked(true);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to logout device' });
    } finally {
      setUnlinkingId(null);
    }
  };

  const handleUnlinkAllOther = async () => {
    if (!confirm('Log out all other linked devices? You will remain logged in on this screen only.')) {
      return;
    }

    setUnlinkingAll(true);
    try {
      await api.unlinkAllOtherDevices();
      setDevices((prev) => prev.filter((d) => d.isCurrent));
      setFeedback({ type: 'success', message: 'All other companion devices were logged out' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to unlink other devices' });
    } finally {
      setUnlinkingAll(false);
    }
  };

  const handleConfirmManualPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setPairingSubmitting(true);
    try {
      await api.confirmPairing(manualCode.trim());
      setFeedback({ type: 'success', message: 'Device paired and synchronized successfully!' });
      setManualCode('');
      setView('list');
      loadDevices();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Invalid or expired pairing code' });
    } finally {
      setPairingSubmitting(false);
    }
  };

  const handleSimulateLink = async (preset: 'iphone' | 'macbook' | 'ipad' | 'windows') => {
    setSimulating(preset);
    try {
      const res = await api.linkSimulatedDevice(preset);
      setDevices((prev) => [res.device, ...prev]);
      setFeedback({ type: 'success', message: `Linked ${res.device.deviceName} via end-to-end sync` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to pair companion device' });
    } finally {
      setSimulating(null);
    }
  };

  const copyCodeToClipboard = () => {
    if (!pairingData?.code) return;
    navigator.clipboard.writeText(pairingData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getDeviceIcon = (type: LinkedDevice['deviceType']) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-[#00D68F]" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-teal-400" />;
      case 'desktop':
        return <Laptop className="w-5 h-5 text-cyan-400" />;
      default:
        return <Globe className="w-5 h-5 text-blue-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0D1B2A] border border-[#1E3042] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E3042] flex items-center justify-between bg-[#07111F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00D68F]/15 border border-[#00D68F]/30 flex items-center justify-center text-[#00D68F]">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#E8F0FA] flex items-center gap-2">
                Linked Devices
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/30">
                  {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
                </span>
              </h2>
              <p className="text-xs text-[#94A3B8]">Multi-device encrypted session manager</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`mx-4 mt-4 p-3 rounded-2xl text-xs flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-[#00D68F]/10 border border-[#00D68F]/30 text-[#00D68F]'
                : 'bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#00D68F] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {view === 'list' ? (
            <>
              {/* Hero Banner */}
              <div className="p-4 rounded-2xl bg-[#111E2D] border border-[#1E3042] relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D68F]/15 text-[#00D68F] flex items-center justify-center shrink-0 border border-[#00D68F]/30">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#E8F0FA] mb-0.5">Use Talksy across all your devices</h3>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Connect your phone, desktop, or tablet with real-time end-to-end encrypted synchronization.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E3042] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#00D68F]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Protected with end-to-end encryption</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenLinkView}
                    className="px-3.5 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link a Device</span>
                  </button>
                </div>
              </div>

              {/* Devices List Section */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                    Active Devices ({devices.length})
                  </span>
                  {devices.filter((d) => !d.isCurrent).length > 0 && (
                    <button
                      type="button"
                      disabled={unlinkingAll}
                      onClick={handleUnlinkAllOther}
                      className="text-xs text-[#F87171] hover:underline font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {unlinkingAll ? 'Logging out...' : 'Log out all other devices'}
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#00D68F]" />
                    <span className="text-xs">Loading active sessions...</span>
                  </div>
                ) : devices.length === 0 ? (
                  <div className="py-10 text-center text-[#94A3B8] text-xs bg-[#111E2D] rounded-2xl border border-[#1E3042]">
                    No active sessions found.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          device.isCurrent
                            ? 'bg-[#111E2D] border-[#00D68F]/40'
                            : 'bg-[#111E2D]/60 border-[#1E3042] hover:border-[#1E3042]/80'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#07111F] border border-[#1E3042] flex items-center justify-center shrink-0">
                            {getDeviceIcon(device.deviceType)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-[#E8F0FA] truncate">
                                {device.deviceName}
                              </h4>
                              {device.isCurrent && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/30 shrink-0">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] mt-0.5">
                              <span>{device.browser} • {device.os}</span>
                              {device.location && <span>• {device.location}</span>}
                            </div>
                            <div className="text-[10px] text-[#94A3B8] mt-0.5">
                              Last active: {new Date(device.lastActive).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={unlinkingId === device.id}
                          onClick={() => handleUnlink(device.id, device.isCurrent)}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#F87171] hover:bg-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                          title="Log out session"
                        >
                          {unlinkingId === device.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-[#F87171]" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline">Log out</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Instant Companion Connection Bar */}
              <div className="p-3.5 rounded-2xl bg-[#111E2D] border border-[#1E3042]">
                <span className="block text-xs font-bold text-[#E8F0FA] mb-1">
                  Connect Companion App
                </span>
                <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">
                  Select a companion platform to link and synchronize your messages:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={Boolean(simulating)}
                    onClick={() => handleSimulateLink('iphone')}
                    className="p-2.5 rounded-xl bg-[#07111F] border border-[#1E3042] hover:border-[#00D68F]/40 text-[#E8F0FA] text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-[#00D68F]" />
                    <span>+ iPhone</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(simulating)}
                    onClick={() => handleSimulateLink('macbook')}
                    className="p-2.5 rounded-xl bg-[#07111F] border border-[#1E3042] hover:border-[#00D68F]/40 text-[#E8F0FA] text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    <Laptop className="w-4 h-4 text-cyan-400" />
                    <span>+ MacBook</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(simulating)}
                    onClick={() => handleSimulateLink('ipad')}
                    className="p-2.5 rounded-xl bg-[#07111F] border border-[#1E3042] hover:border-[#00D68F]/40 text-[#E8F0FA] text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    <Tablet className="w-4 h-4 text-teal-400" />
                    <span>+ iPad</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(simulating)}
                    onClick={() => handleSimulateLink('windows')}
                    className="p-2.5 rounded-xl bg-[#07111F] border border-[#1E3042] hover:border-[#00D68F]/40 text-[#E8F0FA] text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    <Laptop className="w-4 h-4 text-blue-400" />
                    <span>+ Windows</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* LINK NEW DEVICE VIEW (QR Code & Pairing Code) */
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E3042]">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="text-xs text-[#00D68F] hover:text-[#00B87A] font-semibold cursor-pointer"
                >
                  ← Back to Devices
                </button>
                <span className="text-xs text-[#94A3B8] font-mono">E2EE Pairing</span>
              </div>

              {/* QR Code Presentation */}
              <div className="flex flex-col items-center text-center">
                <div className="relative p-5 bg-white rounded-3xl shadow-xl mb-4 group overflow-hidden">
                  <svg className="w-48 h-48 sm:w-52 sm:h-52" viewBox="0 0 200 200" fill="none">
                    <rect width="200" height="200" fill="#ffffff" />
                    <rect x="15" y="15" width="45" height="45" rx="8" fill="#000000" />
                    <rect x="22" y="22" width="31" height="31" rx="4" fill="#ffffff" />
                    <rect x="28" y="28" width="19" height="19" rx="2" fill="#000000" />

                    <rect x="140" y="15" width="45" height="45" rx="8" fill="#000000" />
                    <rect x="147" y="22" width="31" height="31" rx="4" fill="#ffffff" />
                    <rect x="153" y="28" width="19" height="19" rx="2" fill="#000000" />

                    <rect x="15" y="140" width="45" height="45" rx="8" fill="#000000" />
                    <rect x="22" y="147" width="31" height="31" rx="4" fill="#ffffff" />
                    <rect x="28" y="153" width="19" height="19" rx="2" fill="#000000" />

                    <rect x="75" y="20" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="95" y="20" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="115" y="20" width="12" height="12" fill="#000000" rx="2" />

                    <rect x="75" y="40" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="115" y="40" width="12" height="12" fill="#000000" rx="2" />

                    <rect x="20" y="75" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="40" y="75" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="65" y="75" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="85" y="75" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="105" y="75" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="135" y="75" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="165" y="75" width="12" height="12" fill="#000000" rx="2" />

                    <rect x="20" y="95" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="50" y="95" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="95" y="95" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="125" y="95" width="12" height="12" fill="#000000" rx="2" />
                    <rect x="150" y="95" width="12" height="12" fill="#000000" rx="2" />

                    <circle cx="100" cy="100" r="16" fill="#00D68F" />
                    <path
                      d="M93 100 L98 105 L108 94"
                      stroke="#07111F"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <h3 className="text-sm font-bold text-[#E8F0FA] mb-1">Scan this QR Code</h3>
                <p className="text-xs text-[#94A3B8] max-w-xs leading-relaxed">
                  Open Talksy on your mobile device or tablet camera to instantly authorize this session.
                </p>
              </div>

              {/* Or Pair with 6-digit Code */}
              <div className="p-4 rounded-2xl bg-[#111E2D] border border-[#1E3042] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#E8F0FA]">Or Link with 6-Digit Code</span>
                  <button
                    type="button"
                    onClick={copyCodeToClipboard}
                    className="text-xs text-[#00D68F] hover:text-[#00B87A] flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                {pairingLoading ? (
                  <div className="h-10 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#00D68F]" />
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#07111F] border border-[#1E3042] text-center font-mono text-lg font-bold text-[#00D68F] tracking-widest">
                    {pairingData?.code || 'TK-4829'}
                  </div>
                )}

                <form onSubmit={handleConfirmManualPair} className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Enter code from other screen (e.g. TK-8392)"
                    className="flex-1 px-3 py-2 bg-[#07111F] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] font-mono uppercase"
                  />
                  <button
                    type="submit"
                    disabled={pairingSubmitting || !manualCode.trim()}
                    className="px-3 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {pairingSubmitting ? 'Pairing...' : 'Pair'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1E3042] bg-[#07111F] flex items-center justify-between text-xs text-[#94A3B8]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Encrypted sessions expire after 30 days of inactivity</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] border border-[#1E3042] text-[#E8F0FA] font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
