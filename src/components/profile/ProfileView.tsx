import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Camera,
  Shield,
  Key,
  Lock,
  Globe,
  MapPin,
  Tag,
  Check,
  AlertCircle,
  Clock,
  Activity,
  Users,
  Loader2,
  Laptop,
  Heart,
  MessageCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Post, User } from '../../types/chat';
import { api } from '../../services/api';

interface ProfileViewProps {
  currentUser: User;
  inspectedUserId?: string;
  onUserUpdated: (updated: User) => void;
  onOpenLinkedDevices: () => void;
  onSelectChatFriend?: (friendId: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  inspectedUserId,
  onUserUpdated,
  onOpenLinkedDevices,
  onSelectChatFriend: _onSelectChatFriend,
}) => {
  const targetUserId = inspectedUserId || currentUser.id;
  const isSelf = targetUserId === currentUser.id;

  const [userProfile, setUserProfile] = useState<User>(currentUser);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [mutualsCount, setMutualsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit fields for self
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [status, setStatus] = useState(currentUser.status || 'Available');
  const [location, setLocation] = useState(currentUser.location || 'Dhaka, Bangladesh');
  const [interestsInput, setInterestsInput] = useState(
    currentUser.interests ? currentUser.interests.join(', ') : 'Tech, Gaming, Coding'
  );
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(
    currentUser.coverUrl ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'
  );

  // Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>(
    currentUser.privacySettings?.profileVisibility || 'public'
  );
  const [allowMessagesFrom, setAllowMessagesFrom] = useState<'everyone' | 'friends'>(
    currentUser.privacySettings?.allowMessagesFrom || 'everyone'
  );
  const [showOnlineStatus, setShowOnlineStatus] = useState(
    currentUser.privacySettings?.showOnlineStatus !== false
  );

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(currentUser.twoFactorEnabled));
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load target user profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.getUserProfile(targetUserId);
        setUserProfile(res.user);
        setUserPosts(res.posts);
        setMutualsCount(res.mutualsCount);

        if (isSelf) {
          setDisplayName(res.user.displayName);
          setBio(res.user.bio || '');
          setStatus(res.user.status || 'Available');
          setLocation(res.user.location || 'Dhaka, Bangladesh');
          setAvatarUrl(res.user.avatarUrl);
          setCoverUrl(
            res.user.coverUrl ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80'
          );
          if (res.user.privacySettings) {
            setProfileVisibility(res.user.privacySettings.profileVisibility || 'public');
            setAllowMessagesFrom(res.user.privacySettings.allowMessagesFrom || 'everyone');
            setShowOnlineStatus(res.user.privacySettings.showOnlineStatus !== false);
          }
          setTwoFactorEnabled(Boolean(res.user.twoFactorEnabled));
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUserId, isSelf]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSelf) return;

    setSaving(true);
    setFeedback(null);

    const parsedInterests = interestsInput
      .split(/[\s,]+/)
      .map((i) => i.trim())
      .filter(Boolean);

    try {
      const updated = await api.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        status: status.trim(),
        avatarUrl,
      });

      // Update privacy settings
      await api.updatePrivacySettings({
        profileVisibility,
        allowMessagesFrom,
        showOnlineStatus,
      });

      const fullUpdated = {
        ...updated,
        coverUrl,
        location,
        interests: parsedInterests,
        privacySettings: {
          profileVisibility,
          allowMessagesFrom,
          showOnlineStatus,
        },
      };

      setUserProfile(fullUpdated);
      onUserUpdated(fullUpdated);
      setIsEditing(false);
      setFeedback('Profile and privacy settings saved successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      const res = await api.toggle2FA();
      setTwoFactorEnabled(res.twoFactorEnabled);
      setBackupCodes(res.backupCodes);
      setFeedback(
        res.twoFactorEnabled
          ? 'Two-Factor Authentication activated! Save your backup codes.'
          : 'Two-Factor Authentication deactivated.'
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle 2FA');
    }
  };

  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await api.uploadFile(base64, file.name, file.type);
        setCoverUrl(res.url);
      } catch (err: any) {
        alert(err.message || 'Failed to upload cover');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await api.uploadFile(base64, file.name, file.type);
        setAvatarUrl(res.url);
      } catch (err: any) {
        alert(err.message || 'Failed to upload avatar');
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-[#07111F] text-[#94A3B8] text-xs">
        <Loader2 className="w-6 h-6 text-[#00D68F] animate-spin mr-2" />
        <span>Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#07111F]">
      <div className="max-w-4xl mx-auto pb-12">
        {/* Cover Photo */}
        <div className="relative h-48 md:h-64 w-full bg-[#0D1B2A] overflow-hidden">
          <img
            src={coverUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-transparent to-transparent" />

          {isSelf && (
            <label className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold cursor-pointer border border-white/20 transition-all hover:scale-105">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Change Cover</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadCover}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Profile Card Header */}
        <div className="px-4 md:px-8 -mt-16 md:-mt-20 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            {/* Avatar & Identifiers */}
            <div className="flex items-end gap-4">
              <div className="relative group">
                <img
                  src={avatarUrl}
                  alt={userProfile.displayName}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-3xl object-cover ring-4 ring-[#030712] shadow-2xl bg-[#070e20]"
                />
                {isSelf && (
                  <label className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadAvatar}
                      className="hidden"
                    />
                  </label>
                )}
                {userProfile.online && (
                  <span
                    className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-[#030712]"
                    title="Online Now"
                  />
                )}
              </div>

              <div className="mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-black text-white">
                    {userProfile.displayName}
                  </h1>
                  {userProfile.role === 'admin' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono">@{userProfile.id}</p>
                <p className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{userProfile.status || 'Available'}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {isSelf && (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isEditing
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:scale-105'
                  }`}
                >
                  {isEditing ? 'Cancel Edit' : 'Edit Profile & Privacy'}
                </button>

                <button
                  onClick={onOpenLinkedDevices}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
                  title="Manage Linked Devices"
                >
                  <Laptop className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Linked Devices</span>
                </button>
              </div>
            )}
          </div>

          {/* Feedback message banner */}
          {feedback && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Edit Profile Form (When Active) */}
          {isEditing && isSelf && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-6 p-6 bg-[#070e20] border border-slate-800 rounded-3xl space-y-4 shadow-xl"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span>Edit Profile Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full bg-[#030712] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Status Message
                  </label>
                  <input
                    type="text"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#030712] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Interests (comma separated)
                  </label>
                  <input
                    type="text"
                    value={interestsInput}
                    onChange={(e) => setInterestsInput(e.target.value)}
                    placeholder="TypeScript, WebRTC, Photography, Coffee, Design"
                    className="w-full bg-[#030712] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Bio / About Me
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-[#030712] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Privacy Controls Section */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Profile Privacy Settings</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Profile Visibility
                    </label>
                    <select
                      value={profileVisibility}
                      onChange={(e: any) => setProfileVisibility(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="public">Public (All Talksy)</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private (Only Me)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Allow Direct Messages From
                    </label>
                    <select
                      value={allowMessagesFrom}
                      onChange={(e: any) => setAllowMessagesFrom(e.target.value)}
                      className="w-full bg-[#030712] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="friends">Friends Only</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Online Presence
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={showOnlineStatus}
                        onChange={(e) => setShowOnlineStatus(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Show online status</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Profile Details & Bio Card */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bio & Details Column */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-[#070e20] border border-slate-800/80 rounded-3xl p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  About
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {userProfile.bio || 'No bio provided yet.'}
                </p>

                <div className="pt-2 border-t border-slate-800/60 space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{userProfile.location || 'Dhaka, Bangladesh'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Joined {new Date(userProfile.createdAt).toLocaleDateString()}</span>
                  </div>
                  {!isSelf && mutualsCount > 0 && (
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <Users className="w-3.5 h-3.5" />
                      <span>{mutualsCount} mutual connections</span>
                    </div>
                  )}
                </div>

                {/* Interests */}
                <div className="pt-3 border-t border-slate-800/60">
                  <h4 className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-emerald-400" />
                    <span>Interests</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(userProfile.interests && userProfile.interests.length > 0
                      ? userProfile.interests
                      : ['Technology', 'Messaging', 'Privacy', 'Social']
                    ).map((item) => (
                      <span
                        key={item}
                        className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700/60 text-[11px] text-slate-300 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* End-to-End Encryption Architecture Card */}
              <div className="bg-[#111E2D] border border-[#1E3042] rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#00D68F]" />
                    <h3 className="text-xs font-bold text-[#E8F0FA]">End-to-End Encryption</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00D68F] animate-pulse" />
                    Talksy v2.4 E2EE
                  </span>
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  All messages, media attachments, and voice notes are cryptographically protected. Calls use DTLS-SRTP peer-to-peer tunnels.
                </p>

                <div className="space-y-1.5 pt-1 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-[#1E3042]/60 text-[#94A3B8]">
                    <span>Ratchet Protocol</span>
                    <span className="font-mono text-[#E8F0FA]">Signal-compatible Double Ratchet</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1E3042]/60 text-[#94A3B8]">
                    <span>Cipher Standard</span>
                    <span className="font-mono text-[#E8F0FA]">AES-256-GCM + Curve25519</span>
                  </div>
                  <div className="flex justify-between py-1 text-[#94A3B8]">
                    <span>WebRTC Media Tunnels</span>
                    <span className="font-mono text-[#00D68F]">Encrypted P2P HD Audio/Video</span>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication Security Card */}
              {isSelf && (
                <div className="bg-[#111E2D] border border-[#1E3042] rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-white">Two-Factor Authentication</h3>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        twoFactorEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {twoFactorEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Protect your Talksy account and conversations with 2FA code verification.
                  </p>

                  <button
                    onClick={handleToggle2FA}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      twoFactorEnabled
                        ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                    }`}
                  >
                    {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA Protection'}
                  </button>

                  {/* Backup codes if generated */}
                  {backupCodes.length > 0 && (
                    <div className="p-3 bg-[#030712] rounded-xl border border-slate-800 space-y-1.5 animate-in fade-in">
                      <p className="text-[10px] font-bold text-emerald-400">
                        Emergency Backup Codes (Save these safely):
                      </p>
                      <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-slate-300">
                        {backupCodes.map((code) => (
                          <div key={code} className="bg-slate-900 px-2 py-0.5 rounded">
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Activity & Posts Timeline Column */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Posts & Activity Timeline ({userPosts.length})</span>
              </h3>

              {userPosts.length === 0 ? (
                <div className="bg-[#070e20] border border-slate-800/80 rounded-3xl p-8 text-center text-slate-500 text-xs">
                  <p>No posts published yet by {userProfile.displayName}.</p>
                </div>
              ) : (
                userPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-[#070e20] border border-slate-800/80 rounded-3xl p-5 shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={userProfile.avatarUrl}
                          alt={userProfile.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">
                            {userProfile.displayName}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {post.text && (
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {post.text}
                      </p>
                    )}

                    {post.mediaUrl && (
                      <div className="rounded-2xl overflow-hidden max-h-64 border border-slate-800">
                        <img
                          src={post.mediaUrl}
                          alt="Post media"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        {post.likes?.length || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                        {post.comments?.length || 0}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
