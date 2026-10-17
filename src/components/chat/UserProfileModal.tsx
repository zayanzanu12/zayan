import React, { useState } from 'react';
import { User, X, Camera, Lock, Check, AlertCircle, LogOut, Shield, Clock, Laptop } from 'lucide-react';
import { User as UserType } from '../../types/chat';
import { api } from '../../services/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  currentUser: UserType;
  onUserUpdated: (updated: UserType) => void;
  onLogout: () => void;
  onOpenLinkedDevices?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
];

const PRESET_STATUSES = [
  'Available',
  'Busy',
  'At School / Work',
  'Coding & Building',
  'Listening to Music',
  'Gaming with Friends',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  onUserUpdated,
  onLogout,
  onOpenLinkedDevices,
}) => {
  const isSelf = user.id === currentUser.id;

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [status, setStatus] = useState(user.status || 'Available');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSelf) return;

    setSaving(true);
    setFeedback(null);

    try {
      const updated = await api.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        status: status.trim(),
        avatarUrl,
      });
      onUserUpdated(updated);
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSelf) return;

    if (!currentPassword || !newPassword) {
      setFeedback({ type: 'error', message: 'Please fill in both current and new passwords' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New password and confirmation do not match' });
      return;
    }

    if (newPassword.length < 5) {
      setFeedback({ type: 'error', message: 'New password must be at least 5 characters long' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await api.changePassword(currentPassword, newPassword);
      setFeedback({ type: 'success', message: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please choose an image file' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await api.uploadFile(base64, file.name, file.type);
        setAvatarUrl(res.url);
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Failed to upload photo' });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#0D1B2A] border border-[#1E3042] rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E3042] bg-[#07111F]">
          <h3 className="text-sm font-bold text-[#E8F0FA] flex items-center gap-2">
            <User className="w-4 h-4 text-[#00D68F]" />
            {isSelf ? 'My Profile & Account' : 'Contact Profile'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch for Self */}
        {isSelf && (
          <div className="flex border-b border-[#1E3042] bg-[#0D1B2A] px-4 pt-2 gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-[#00D68F] text-[#00D68F]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E8F0FA]'
              }`}
            >
              Edit Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'border-[#00D68F] text-[#00D68F]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E8F0FA]'
              }`}
            >
              Security &amp; Password
            </button>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {feedback && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-[#00D68F]/10 border-[#00D68F]/30 text-[#00D68F]'
                  : 'bg-[#F87171]/10 border-[#F87171]/30 text-[#F87171]'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-[#00D68F] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Read-Only Profile View for other friends */}
          {!isSelf && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                    alt={user.displayName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#00D68F]/40 shadow-xl"
                  />
                  <span
                    className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#0D1B2A] ${
                      user.online ? 'bg-[#00D68F]' : 'bg-slate-600'
                    }`}
                  />
                </div>
                <h4 className="text-base font-bold text-[#E8F0FA]">{user.displayName}</h4>
                <div className="text-xs font-mono text-[#00D68F]">@{user.id}</div>
                {user.role === 'admin' && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Shield className="w-3 h-3 text-amber-400" />
                    Administrator
                  </span>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-[#1E3042]">
                <div className="bg-[#111E2D] p-3 rounded-2xl border border-[#1E3042]">
                  <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                    Status
                  </div>
                  <div className="text-xs text-[#E8F0FA] font-medium">{user.status || 'Available'}</div>
                </div>

                <div className="bg-[#111E2D] p-3 rounded-2xl border border-[#1E3042]">
                  <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
                    Bio / About
                  </div>
                  <div className="text-xs text-[#94A3B8] leading-relaxed whitespace-pre-line">
                    {user.bio || 'No bio provided yet.'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#94A3B8] px-1 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                    Last Active:
                  </span>
                  <span className="text-[#E8F0FA] font-medium">
                    {user.online ? 'Online now' : new Date(user.lastSeen).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Self Edit Profile Tab */}
          {isSelf && activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Selector */}
              <div className="flex flex-col items-center">
                <div className="relative mb-3 group">
                  <img
                    src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                    alt={displayName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#00D68F]/40 shadow-md"
                  />
                  <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                    <Camera className="w-6 h-6" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="text-xs text-[#94A3B8]">Tap photo to upload or pick a preset:</div>

                {/* Preset Avatars */}
                <div className="flex items-center gap-2 mt-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-7 h-7 rounded-full overflow-hidden border transition-all cursor-pointer ${
                        avatarUrl === url ? 'border-[#00D68F] ring-2 ring-[#00D68F]/30' : 'border-[#1E3042] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  className="w-full px-3.5 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F]"
                  required
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  Current Status
                </label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. Available, At gym..."
                  className="w-full px-3.5 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F] mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_STATUSES.map((pst) => (
                    <button
                      key={pst}
                      type="button"
                      onClick={() => setStatus(pst)}
                      className="px-2 py-0.5 rounded-lg bg-[#111E2D] hover:bg-[#1E3042] border border-[#1E3042] text-[11px] text-[#E8F0FA] transition-colors cursor-pointer"
                    >
                      {pst}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  About Me / Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="Add a short bio for your friends..."
                  className="w-full px-3.5 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs text-[#F87171] hover:text-red-300 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Self Security & Password Tab */}
          {isSelf && activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Linked Devices Access */}
              <div className="p-3.5 rounded-2xl bg-[#111E2D] border border-[#1E3042] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-[#E8F0FA] flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Linked Devices</span>
                  </h4>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">Manage and revoke active multi-device sessions</p>
                </div>
                {onOpenLinkedDevices && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLinkedDevices();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#00D68F]/15 hover:bg-[#00D68F]/25 text-[#00D68F] border border-[#00D68F]/30 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Manage
                  </button>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-[#111E2D] border border-[#1E3042] text-xs text-[#94A3B8] leading-relaxed">
                Update your account password securely. All passwords are encrypted on the server with salted cryptographic hashing.
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    className="w-full pl-10 pr-4 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 5 characters"
                    className="w-full pl-10 pr-4 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
