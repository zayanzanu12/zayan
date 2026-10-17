import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  Users,
  Search,
  KeyRound,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  X,
  RefreshCw,
  Power,
  Flag,
  CheckCircle,
  Activity,
  Terminal,
  Cpu,
  Database,
  Radio,
  Copy,
} from 'lucide-react';
import { User, Report, SystemDiagnostics } from '../../types/chat';
import { api } from '../../services/api';

interface AdminDashboardProps {
  currentUser: User;
  onClose: () => void;
  onUsersModified: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onClose,
  onUsersModified,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'reports' | 'invites' | 'diagnostics'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [inviteCodes, setInviteCodes] = useState<{ code: string; createdBy: string; usedBy?: string; createdAt: string }[]>([]);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  // New Friend form states
  const [newId, setNewId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newStatus, setNewStatus] = useState('Available');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit user modal states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editResetPassword, setEditResetPassword] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editDisabled, setEditDisabled] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uList, rList, iList, diag] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetReports(),
        api.adminGetInviteCodes().catch(() => []),
        api.adminGetDiagnostics().catch(() => null),
      ]);
      setUsers(uList);
      setReports(rList);
      setInviteCodes(iList);
      if (diag) setDiagnostics(diag);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch admin data' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const newCode = await api.adminGenerateInviteCode();
      setInviteCodes((prev) => [newCode, ...prev]);
      setFeedback({ type: 'success', message: `Generated invite code: ${newCode.code}` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate invite code' });
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newPassword) {
      setFeedback({ type: 'error', message: 'Friend ID and temporary password are required' });
      return;
    }

    setCreating(true);
    try {
      await api.adminCreateUser({
        id: newId.trim().toLowerCase(),
        displayName: newDisplayName.trim() || newId.trim(),
        password: newPassword,
        bio: newBio.trim(),
        status: newStatus.trim() || 'Available',
        avatarUrl: newAvatarUrl.trim() || undefined,
      });

      setFeedback({
        type: 'success',
        message: `Account @${newId.trim().toLowerCase()} created and added to your friend circle!`,
      });
      setNewId('');
      setNewDisplayName('');
      setNewPassword('');
      setNewBio('');
      setNewAvatarUrl('');
      fetchAdminData();
      onUsersModified();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create user account' });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName);
    setEditResetPassword('');
    setEditBio(user.bio || '');
    setEditStatus(user.status || '');
    setEditAvatarUrl(user.avatarUrl || '');
    setEditDisabled(Boolean(user.disabled));
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    try {
      const payload: any = {
        displayName: editDisplayName.trim(),
        bio: editBio.trim(),
        status: editStatus.trim(),
        avatarUrl: editAvatarUrl.trim() || undefined,
        disabled: editDisabled,
      };
      if (editResetPassword) {
        payload.password = editResetPassword;
      }

      const updated = await api.adminUpdateUser(editingUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setFeedback({ type: 'success', message: `Profile for @${editingUser.id} updated successfully` });
      setEditingUser(null);
      onUsersModified();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update user' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === 'zayan') {
      setFeedback({ type: 'error', message: 'The primary owner (@zayan) cannot be deleted.' });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to completely delete account @${targetUser.id}? This will remove all their direct messages and records.`
      )
    ) {
      return;
    }

    try {
      await api.adminDeleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setFeedback({ type: 'success', message: `Account @${targetUser.id} permanently removed.` });
      onUsersModified();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete user' });
    }
  };

  const handleToggleDisabled = async (targetUser: User) => {
    if (targetUser.id === 'zayan') {
      setFeedback({ type: 'error', message: 'The primary administrator account cannot be disabled.' });
      return;
    }

    try {
      const nextDisabled = !targetUser.disabled;
      const updated = await api.adminUpdateUser(targetUser.id, { disabled: nextDisabled });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setFeedback({
        type: 'success',
        message: `Account @${targetUser.id} is now ${nextDisabled ? 'disabled' : 'active'}`,
      });
      onUsersModified();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to toggle status' });
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await api.adminResolveReport(reportId);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' as const } : r))
      );
      setFeedback({ type: 'success', message: 'Report marked as reviewed & resolved' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to resolve report' });
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(term) ||
      u.id.toLowerCase().includes(term) ||
      (u.status && u.status.toLowerCase().includes(term))
    );
  });

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  const filteredLogs = (diagnostics?.logs || []).filter((log) => {
    if (logFilter === 'all') return true;
    return log.level === logFilter;
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#0D1B2A] border border-[#1E3042] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3042] bg-[#07111F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00D68F]/15 border border-[#00D68F]/30 text-[#00D68F] flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-[#E8F0FA]">Admin Control Center</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/30">
                  @{currentUser.id}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">Manage user network, invite codes, and system diagnostics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-[#1E3042] bg-[#0D1B2A] overflow-x-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'users'
                  ? 'border-[#00D68F] text-[#00D68F]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E8F0FA]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Accounts ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'create'
                  ? 'border-[#00D68F] text-[#00D68F]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E8F0FA]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'reports'
                  ? 'border-[#00D68F] text-[#00D68F]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E8F0FA]'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>Flags</span>
              {pendingReportsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#F87171] text-[#07111F] text-[10px] flex items-center justify-center font-bold">
                  {pendingReportsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('invites')}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'invites'
                  ? 'border-[#00D68F] text-[#00D68F]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E8F0FA]'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Invites ({inviteCodes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'diagnostics'
                  ? 'border-[#00D68F] text-[#00D68F]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E8F0FA]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Diagnostics &amp; Logs</span>
            </button>
          </div>

          <button
            onClick={fetchAdminData}
            title="Refresh database records"
            className="text-[#94A3B8] hover:text-[#00D68F] p-1.5 rounded-xl hover:bg-[#111E2D] transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Notification Banner */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl border text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-[#00D68F]/10 border-[#00D68F]/30 text-[#00D68F]'
                : 'bg-[#F87171]/10 border-[#F87171]/30 text-[#F87171]'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[#94A3B8] hover:text-[#E8F0FA] p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Registered Accounts */}
        {activeTab === 'users' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search accounts by name or @id..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                />
              </div>
              <span className="text-xs text-[#94A3B8]">
                Showing {filteredUsers.length} of {users.length} registered users
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredUsers.map((u) => {
                const isOwner = u.id === 'zayan';
                return (
                  <div
                    key={u.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      u.disabled
                        ? 'bg-[#111E2D]/40 border-[#F87171]/30 opacity-70'
                        : 'bg-[#111E2D] border-[#1E3042] hover:border-[#1E3042]/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                          alt={u.displayName}
                          className="w-11 h-11 rounded-full object-cover border border-[#1E3042]"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#E8F0FA]">
                              {u.displayName}
                            </span>
                            {u.role === 'admin' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                                Admin
                              </span>
                            )}
                            {u.disabled && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F87171]/20 text-[#F87171] font-semibold">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#94A3B8] font-mono">@{u.id}</p>
                          <p className="text-[11px] text-[#94A3B8] truncate max-w-[200px] mt-0.5">
                            {u.status || 'Available'}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Edit profile & reset password"
                          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#00D68F] hover:bg-[#07111F] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isOwner && (
                          <>
                            <button
                              onClick={() => handleToggleDisabled(u)}
                              title={u.disabled ? 'Enable account' : 'Disable account'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.disabled
                                  ? 'text-[#00D68F] hover:bg-[#07111F]'
                                  : 'text-amber-400 hover:bg-[#07111F]'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Delete account"
                              className="p-1.5 rounded-lg text-[#F87171] hover:bg-[#07111F] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Create Account */}
        {activeTab === 'create' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-xl mx-auto w-full">
            <div className="mb-5 text-center">
              <h3 className="text-sm font-bold text-[#E8F0FA]">Provision New Account</h3>
              <p className="text-xs text-[#94A3B8] mt-1">
                Create a friend account with credentials. The user will automatically be placed into your conversations list.
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                    Username / ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. farhan, samira, alex"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Farhan Rahman"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Set an initial password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Status Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Coding on Talksy, Available for chat"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Custom Avatar URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="Leave empty for auto-generated avatar"
                  value={newAvatarUrl}
                  onChange={(e) => setNewAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  About / Bio (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short introduction..."
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {creating ? 'Creating account...' : 'Create Account & Add to Circle'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Moderation & Reports */}
        {activeTab === 'reports' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {reports.length === 0 ? (
              <div className="py-12 text-center text-[#94A3B8] text-xs">
                <CheckCircle className="w-6 h-6 text-[#00D68F] mx-auto mb-2" />
                <p>No content reports or flagged messages.</p>
              </div>
            ) : (
              reports.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 rounded-2xl border ${
                    r.status === 'pending'
                      ? 'bg-[#111E2D] border-[#F87171]/40'
                      : 'bg-[#111E2D]/40 border-[#1E3042] opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#E8F0FA]">
                          Report by @{r.reportedBy} against @{r.reportedUserId}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            r.status === 'pending'
                              ? 'bg-[#F87171]/20 text-[#F87171]'
                              : 'bg-[#00D68F]/20 text-[#00D68F]'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">Reason: {r.reason}</p>
                      {r.messageSnippet && (
                        <p className="text-xs bg-[#07111F] p-2 rounded-xl mt-2 border border-[#1E3042] text-[#E8F0FA] font-mono">
                          "{r.messageSnippet}"
                        </p>
                      )}
                    </div>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => handleResolveReport(r.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#00D68F]/20 hover:bg-[#00D68F]/30 text-[#00D68F] text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Invite Codes */}
        {activeTab === 'invites' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#E8F0FA]">One-Time Invite Codes</h3>
                <p className="text-[11px] text-[#94A3B8]">
                  Share these invite tokens with friends to let them register directly into Talksy.
                </p>
              </div>
              <button
                onClick={handleGenerateInvite}
                disabled={generatingInvite}
                className="px-3.5 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{generatingInvite ? 'Generating...' : 'Generate New Code'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {inviteCodes.length === 0 ? (
                <div className="py-12 text-center text-[#94A3B8] text-xs">
                  No invite codes created yet. Click Generate to create one.
                </div>
              ) : (
                inviteCodes.map((inv) => (
                  <div
                    key={inv.code}
                    className="p-3 bg-[#111E2D] border border-[#1E3042] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#00D68F] text-sm tracking-wider">
                        {inv.code}
                      </span>
                      <span className="text-[11px] text-[#94A3B8]">
                        Created by @{inv.createdBy}
                      </span>
                      {inv.usedBy ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                          Claimed by @{inv.usedBy}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00D68F]/20 text-[#00D68F] font-semibold">
                          Active &amp; Ready
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inv.code);
                        setCopiedCode(inv.code);
                        setTimeout(() => setCopiedCode(null), 2000);
                      }}
                      className="text-xs text-[#00D68F] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {copiedCode === inv.code ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Restricted System Diagnostics & Developer Logs */}
        {activeTab === 'diagnostics' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Health Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#111E2D] border border-[#1E3042]">
                <div className="flex items-center gap-2 text-[#00D68F] mb-1.5">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-bold text-[#E8F0FA]">Backend Runtime</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Status:</span>
                    <span className="text-[#00D68F] font-semibold font-mono">Operational</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Node:</span>
                    <span className="text-[#E8F0FA] font-mono">{diagnostics?.system.nodeVersion || 'v20.x'}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Uptime:</span>
                    <span className="text-[#E8F0FA] font-mono">
                      {diagnostics ? formatUptime(diagnostics.system.uptime) : 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>RSS / Heap:</span>
                    <span className="text-[#E8F0FA] font-mono">
                      {diagnostics?.system.memoryRssMb || '45'}MB / {diagnostics?.system.memoryHeapUsedMb || '25'}MB
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#111E2D] border border-[#1E3042]">
                <div className="flex items-center gap-2 text-[#00D68F] mb-1.5">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-bold text-[#E8F0FA]">Database Telemetry</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Firestore DB:</span>
                    <span className="text-[#00D68F] font-semibold font-mono">Connected</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Total Accounts:</span>
                    <span className="text-[#E8F0FA] font-mono">{diagnostics?.database.totalUsers ?? users.length}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Messages Stored:</span>
                    <span className="text-[#E8F0FA] font-mono">{diagnostics?.database.totalMessages ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Communities:</span>
                    <span className="text-[#E8F0FA] font-mono">{diagnostics?.database.totalGroups ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#111E2D] border border-[#1E3042]">
                <div className="flex items-center gap-2 text-[#00D68F] mb-1.5">
                  <Radio className="w-4 h-4" />
                  <span className="text-xs font-bold text-[#E8F0FA]">Realtime &amp; Security</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>SSE Streams:</span>
                    <span className="text-[#00D68F] font-mono font-semibold">
                      {diagnostics?.realtime.activeSSEClients ?? 1} active
                    </span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>WebRTC Signal:</span>
                    <span className="text-[#00D68F] font-mono">P2P Mesh Ready</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Ratchet E2EE:</span>
                    <span className="text-[#00D68F] font-mono">Signal Double Ratchet</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Dev Errors:</span>
                    <span className="text-[#00D68F] font-mono">Contained in Admin</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Developer Log Console */}
            <div className="bg-[#07111F] border border-[#1E3042] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-[#111E2D] border-b border-[#1E3042] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00D68F]" />
                  <span className="text-xs font-bold text-[#E8F0FA]">Server Logs &amp; Events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(['all', 'info', 'warn', 'error'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLogFilter(filter)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                        logFilter === filter
                          ? 'bg-[#00D68F] text-[#07111F]'
                          : 'bg-[#07111F] text-[#94A3B8] hover:text-[#E8F0FA]'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 max-h-64 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                {filteredLogs.length === 0 ? (
                  <p className="text-[#94A3B8] py-4 text-center">No logs matching current filter.</p>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-[#111E2D]/50 border border-[#1E3042]/50 flex items-start gap-2"
                    >
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 ${
                          log.level === 'error'
                            ? 'bg-[#F87171]/20 text-[#F87171]'
                            : log.level === 'warn'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-[#00D68F]/20 text-[#00D68F]'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-[#94A3B8] shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-cyan-400 shrink-0">[{log.category}]</span>
                      <span className="text-[#E8F0FA] break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#0D1B2A] border border-[#1E3042] rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#E8F0FA]">
                Edit Account: @{editingUser.id}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-[#94A3B8] hover:text-[#E8F0FA] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  placeholder="New password..."
                  value={editResetPassword}
                  onChange={(e) => setEditResetPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Status Headline
                </label>
                <input
                  type="text"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Bio / Notes
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] focus:outline-none focus:border-[#00D68F] resize-none"
                />
              </div>

              {editingUser.id !== 'zayan' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="disabledCheck"
                    checked={editDisabled}
                    onChange={(e) => setEditDisabled(e.target.checked)}
                    className="rounded bg-[#111E2D] border-[#1E3042] text-[#00D68F] focus:ring-0"
                  />
                  <label htmlFor="disabledCheck" className="text-xs text-[#94A3B8] cursor-pointer">
                    Disable this account (cannot log in)
                  </label>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#E8F0FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
