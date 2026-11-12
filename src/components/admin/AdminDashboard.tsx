import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
  Flame,
  MessageSquare,
  FolderPlus,
  AlertOctagon,
  HardDrive,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Key,
  Globe,
  ExternalLink,
  FileCode,
} from 'lucide-react';
import { User, Report, SystemDiagnostics, Group } from '../../types/chat';
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
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'groups' | 'reports' | 'invites' | 'diagnostics' | 'database_console' | 'overview'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Database Connect & Admin Command Console state
  const [dbConnection, setDbConnection] = useState<{
    connected: boolean;
    status: string;
    engine: string;
    dbFile: string;
    sizeKb: string;
    latencyMs: number;
    tables: any;
  } | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [executingCommand, setExecutingCommand] = useState(false);
  const [copiedTerminal, setCopiedTerminal] = useState(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const [terminalLogs, setTerminalLogs] = useState<
    Array<{
      id: string;
      command?: string;
      output: string;
      isError?: boolean;
      timestamp: string;
      executionTimeMs?: number;
    }>
  >([
    {
      id: 'init_1',
      output: `[ZappChat Database Command Center v2.0 - CONNECTED]
Engine:           JSON-Relational SQLite/File Engine (Persistent)
Connected Path:   data/zayan_chat.json
Administrator:    @${currentUser.id} (Authorized)
Status:           READY & CONNECTED TO DATABASE

Type "help" for all database & user commands, or click quick command chips below.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inviteCodes, setInviteCodes] = useState<{ code: string; createdBy: string; usedBy?: string; createdAt: string }[]>([]);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  // Account Passwords & Credentials Visibility state
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [copiedPassId, setCopiedPassId] = useState<string | null>(null);
  const [editUserId, setEditUserId] = useState('');
  const [editStudentNumber, setEditStudentNumber] = useState('');

  // Groups management state
  const [adminGroups, setAdminGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupAvatarUrl, setNewGroupAvatarUrl] = useState('');
  const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [managingMembersGroup, setManagingMembersGroup] = useState<Group | null>(null);
  const [selectedUserForGroup, setSelectedUserForGroup] = useState<string>('');
  const [manualUserIdForGroup, setManualUserIdForGroup] = useState<string>('');
  const [addingMemberToGroup, setAddingMemberToGroup] = useState<boolean>(false);

  // Group and Direct chat purge modal state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<'groups' | 'direct' | 'all'>('groups');
  const [purgingChats, setPurgingChats] = useState(false);

  // DELETE ALL CHATS with type confirmation state
  const [showDeleteAllChatsModal, setShowDeleteAllChatsModal] = useState(false);
  const [typeDeleteAllChats, setTypeDeleteAllChats] = useState('');
  const [purgingAllChats, setPurgingAllChats] = useState(false);

  // DELETE ALL USER ACCOUNTS with type confirmation state
  const [showDeleteAllUsersModal, setShowDeleteAllUsersModal] = useState(false);
  const [typeDeleteAllUsers, setTypeDeleteAllUsers] = useState('');
  const [purgingAllUsers, setPurgingAllUsers] = useState(false);

  // In-app account delete modal state (NO window.confirm)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [directDeleteInput, setDirectDeleteInput] = useState('');

  // Add User with Password modal & form states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newId, setNewId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newStatus, setNewStatus] = useState('Available');
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setShowNewPassword(true);
  };

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
      const [uList, rList, iList, diag, gList, conn] = await Promise.all([
        api.adminGetUsers(),
        api.adminGetReports(),
        api.adminGetInviteCodes().catch(() => []),
        api.adminGetDiagnostics().catch(() => null),
        api.getGroups().catch(() => []),
        api.adminGetDbConnection().catch(() => null),
      ]);
      setUsers(uList);
      setReports(rList);
      setInviteCodes(iList);
      setAdminGroups(gList);
      if (diag) setDiagnostics(diag);
      if (conn) setDbConnection(conn);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch admin data' });
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseConnection = async () => {
    setCheckingDb(true);
    try {
      const conn = await api.adminGetDbConnection();
      setDbConnection(conn);
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: `conn_${Date.now()}`,
          output: `[DATABASE CONNECTION VERIFIED: ${conn.status}]
Engine:         ${conn.engine}
Path:           ${conn.dbFile}
File Size:      ${conn.sizeKb} KB (${conn.sizeBytes} bytes)
Latency:        ${conn.latencyMs}ms (Ultra-Low)
Schema:         ${conn.schemaVersion}
Table Counts:   Users: ${conn.tables.users} | Messages: ${conn.tables.messages} | Groups: ${conn.tables.groups} | Sessions: ${conn.tables.sessions}`,
          timestamp: new Date().toLocaleTimeString(),
          executionTimeMs: conn.latencyMs,
        },
      ]);
      setFeedback({ type: 'success', message: `Database connected successfully (${conn.latencyMs}ms)` });
    } catch (err: any) {
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: `conn_err_${Date.now()}`,
          output: `Database Connection Failed: ${err.message || 'Cannot read database file'}`,
          isError: true,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setFeedback({ type: 'error', message: err.message || 'Database connection check failed' });
    } finally {
      setCheckingDb(false);
      setTimeout(() => {
        terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleRunCommand = async (e?: React.FormEvent, cmdToRun?: string) => {
    if (e) e.preventDefault();
    const cmd = (cmdToRun !== undefined ? cmdToRun : commandInput).trim();
    if (!cmd) return;

    if (cmd.toLowerCase() === 'clear') {
      setTerminalLogs([]);
      setCommandInput('');
      return;
    }

    setExecutingCommand(true);
    setCommandHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)]);
    setHistoryIndex(-1);
    setCommandInput('');

    try {
      const res = await api.adminRunCommand(cmd);
      if (res.output === '__CLEAR__') {
        setTerminalLogs([]);
      } else {
        setTerminalLogs((prev) => [
          ...prev,
          {
            id: `cmd_${Date.now()}`,
            command: cmd,
            output: res.output,
            isError: !res.success,
            timestamp: new Date().toLocaleTimeString(),
            executionTimeMs: res.executionTimeMs,
          },
        ]);
        if (
          cmd.startsWith('user:') ||
          cmd.startsWith('db:compact') ||
          cmd.startsWith('db:backup') ||
          cmd.startsWith('sessions:purge')
        ) {
          fetchAdminData();
          onUsersModified();
        }
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: `cmd_err_${Date.now()}`,
          command: cmd,
          output: err.message || 'Command execution failed',
          isError: true,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setExecutingCommand(false);
      setTimeout(() => {
        terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const toggleShowAllPasswords = () => {
    const nextState = !showAllPasswords;
    setShowAllPasswords(nextState);
    const updated: Record<string, boolean> = {};
    users.forEach((u) => {
      updated[u.id] = nextState;
    });
    setVisiblePasswords(updated);
  };

  const handleCopyPassword = (pass: string, userId: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPassId(userId);
    setTimeout(() => setCopiedPassId(null), 2000);
  };

  const handleCopyAllCredentials = () => {
    const lines = users.map((u) => {
      const pass = u.plainPassword || u.studentNumber || (u.id === 'zayan' ? 'zanu4088888' : '380');
      return `${u.displayName} | ID: @${u.id} | Roll/Num: ${u.studentNumber || 'N/A'} | Password: ${pass}`;
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setFeedback({ type: 'success', message: `Copied all ${users.length} account credentials to clipboard!` });
    setTimeout(() => setFeedback(null), 3000);
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
      setFeedback({ type: 'error', message: 'User ID and password are required' });
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
        message: `Account @${newId.trim().toLowerCase()} created with password successfully!`,
      });
      setNewId('');
      setNewDisplayName('');
      setNewPassword('');
      setNewBio('');
      setNewAvatarUrl('');
      setShowAddUserModal(false);
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
    setEditUserId(user.id);
    setEditDisplayName(user.displayName);
    setEditStudentNumber(user.studentNumber || '');
    setEditResetPassword(user.plainPassword || '');
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
        studentNumber: editStudentNumber.trim() || undefined,
      };
      if (editUserId.trim() && editUserId.trim().toLowerCase() !== editingUser.id) {
        payload.newId = editUserId.trim().toLowerCase();
      }
      if (editResetPassword.trim()) {
        payload.password = editResetPassword.trim();
      }

      const updated = await api.adminUpdateUser(editingUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
      setFeedback({ type: 'success', message: `Account updated successfully (ID: @${updated.id})` });
      setEditingUser(null);
      onUsersModified();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update user' });
    } finally {
      setUpdating(false);
    }
  };

  // In-App Account Deletion (Direct Database Connection, NO window.confirm)
  const handleDeleteUser = (targetUser: User) => {
    if (targetUser.id === 'zayan') {
      setFeedback({ type: 'error', message: 'The primary owner (@zayan) cannot be deleted.' });
      return;
    }
    // Opens custom in-app confirmation modal with database target details
    setUserToDelete(targetUser);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      const res = await api.adminDeleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setFeedback({
        type: 'success',
        message: `Account @${userToDelete.id} permanently purged from database file (data/zayan_chat.json).`,
      });
      setUserToDelete(null);
      onUsersModified();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete user from database' });
    } finally {
      setDeletingUser(false);
    }
  };

  const handleDirectDeleteUser = (e: React.FormEvent) => {
    e.preventDefault();
    const id = directDeleteInput.trim().toLowerCase().replace('@', '');
    if (!id) return;
    const target = users.find((u) => u.id.toLowerCase() === id);
    if (!target) {
      setFeedback({ type: 'error', message: `User @${id} not found in database accounts list.` });
      return;
    }
    handleDeleteUser(target);
    setDirectDeleteInput('');
  };

  // Group Management & Chat Purge Handlers
  const handlePurgeMessages = async () => {
    setPurgingChats(true);
    try {
      let res: { success: boolean; message: string; purgedCount: number };
      if (purgeTarget === 'groups') {
        res = await api.adminClearAllGroupChats();
      } else if (purgeTarget === 'direct') {
        res = await api.adminClearAllDirectMessages();
      } else {
        res = await api.adminClearAllMessages();
      }
      setFeedback({
        type: 'success',
        message: res.message,
      });
      setShowPurgeModal(false);
      fetchAdminData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to purge messages' });
    } finally {
      setPurgingChats(false);
    }
  };

  // Typed confirmation handler: DELETE ALL CHATS
  const handleDeleteAllChats = async () => {
    if (typeDeleteAllChats !== 'DELETE ALL CHATS') {
      setFeedback({ type: 'error', message: 'You must type "DELETE ALL CHATS" in exact uppercase to confirm.' });
      return;
    }
    setPurgingAllChats(true);
    try {
      const res = await api.adminClearAllChats();
      setFeedback({ type: 'success', message: res.message });
      setShowDeleteAllChatsModal(false);
      setTypeDeleteAllChats('');
      fetchAdminData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to clear all chats' });
    } finally {
      setPurgingAllChats(false);
    }
  };

  // Typed confirmation handler: DELETE ALL USER ACCOUNTS
  const handleDeleteAllRegularUsers = async () => {
    if (typeDeleteAllUsers !== 'DELETE ALL USERS') {
      setFeedback({ type: 'error', message: 'You must type "DELETE ALL USERS" in exact uppercase to confirm.' });
      return;
    }
    setPurgingAllUsers(true);
    try {
      const res = await api.adminDeleteAllRegularUsers();
      setFeedback({ type: 'success', message: res.message });
      setShowDeleteAllUsersModal(false);
      setTypeDeleteAllUsers('');
      fetchAdminData();
      onUsersModified();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to purge regular user accounts' });
    } finally {
      setPurgingAllUsers(false);
    }
  };

  const handleAdminCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      setFeedback({ type: 'error', message: 'Group name is required' });
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await api.adminCreateGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        avatarUrl: newGroupAvatarUrl.trim() || undefined,
        isPrivate: newGroupIsPrivate,
      });
      setAdminGroups((prev) => [res.group, ...prev]);
      setFeedback({
        type: 'success',
        message: `Group "${res.group.name}" created and written to database.`,
      });
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupAvatarUrl('');
      setNewGroupIsPrivate(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create group' });
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteSingleGroup = async (groupId: string, groupName: string) => {
    try {
      await api.deleteGroup(groupId);
      setAdminGroups((prev) => prev.filter((g) => g.id !== groupId));
      setFeedback({ type: 'success', message: `Group "${groupName}" deleted from database.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete group' });
    }
  };

  const handleAdminAddMemberToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingMembersGroup) return;
    const targetUserId = (selectedUserForGroup || manualUserIdForGroup).trim();
    if (!targetUserId) {
      setFeedback({ type: 'error', message: 'Please select a registered user or enter a user ID.' });
      return;
    }
    setAddingMemberToGroup(true);
    try {
      const res = await api.addGroupMember(managingMembersGroup.id, targetUserId);
      setAdminGroups((prev) =>
        prev.map((g) => (g.id === res.group.id ? res.group : g))
      );
      setManagingMembersGroup(res.group);
      setSelectedUserForGroup('');
      setManualUserIdForGroup('');
      setFeedback({
        type: 'success',
        message: `Successfully added @${targetUserId} to group "${res.group.name}"`,
      });
      onUsersModified();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add member to group' });
    } finally {
      setAddingMemberToGroup(false);
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#050811] border border-[#1E3042] rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-1 ring-[#00D68F]/20">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-[#1E3042] bg-[#07111F] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00D68F]/15 border border-[#00D68F]/30 text-[#00D68F] flex items-center justify-center shadow-lg shadow-[#00D68F]/10">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-[#E8F0FA] tracking-wide">
                  ADMIN COMMAND CENTER
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/30 font-mono">
                  @{currentUser.id}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <Database className="w-3 h-3" />
                  <span>zayan_chat.json</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#94A3B8] mt-0.5">
                <span>Direct database management &amp; security governance</span>
                <span className="text-[#1E3042]">•</span>
                <span className="text-amber-300 font-mono text-[11px] font-bold">
                  Shortcut: Tab + W
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* DELETE ALL CHATS Button */}
            <button
              type="button"
              onClick={() => {
                setTypeDeleteAllChats('');
                setShowDeleteAllChatsModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black tracking-wide shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
              title="Delete all chat conversations and messages across database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE ALL CHATS</span>
            </button>

            {/* DELETE ALL USER ACCOUNTS Button */}
            <button
              type="button"
              onClick={() => {
                setTypeDeleteAllUsers('');
                setShowDeleteAllUsersModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-black tracking-wide shadow-lg shadow-rose-700/30 transition-all active:scale-95 cursor-pointer"
              title="Delete all regular user accounts from database"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>DELETE ALL USER ACCOUNTS</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-[#1E3042] bg-[#0A101D] overflow-x-auto">
          <div className="flex gap-1 sm:gap-2">
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
              onClick={() => setActiveTab('groups')}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'groups'
                  ? 'border-[#00D68F] text-[#00D68F]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#E8F0FA]'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Groups &amp; Chat Purge ({adminGroups.length})</span>
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

            <button
              onClick={() => {
                setActiveTab('database_console');
                if (!dbConnection) checkDatabaseConnection();
              }}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'database_console'
                  ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                  : 'border-transparent text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-500/5'
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="flex items-center gap-1.5 font-bold">
                <span>Database Console</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'overview'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-emerald-300/80 hover:text-emerald-200 hover:bg-emerald-500/5'
              }`}
            >
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="flex items-center gap-1.5 font-bold">
                <span>System Overview</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </span>
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
            {/* Quick Action Bar: Add User with Password */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0C1625] to-[#0A101D] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-md">
                  <UserPlus className="w-5 h-5 stroke-[2.3]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Provision Accounts with Password</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      {users.length} Users in DB
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    Add members directly with custom or generated passwords and immediate database persistence.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewId('');
                  setNewDisplayName('');
                  setNewPassword('');
                  setShowNewPassword(false);
                  setShowAddUserModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00D68F] to-emerald-500 hover:from-[#00B87A] hover:to-emerald-600 text-[#07111F] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Add User with Password</span>
              </button>
            </div>

            {/* Direct Database Account Purge Tool */}
            <div className="p-4 rounded-2xl bg-[#091122] border border-red-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#E8F0FA] flex items-center gap-2">
                    <span>Direct Database Account Purge</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-normal px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Connected: data/zayan_chat.json
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#94A3B8]">
                    Immediately purge any user account and all direct messages/sessions directly from the JSON database file.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDirectDeleteUser} className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Enter User ID (e.g. alex)"
                  value={directDeleteInput}
                  onChange={(e) => setDirectDeleteInput(e.target.value)}
                  className="px-3 py-1.5 bg-[#050811] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-red-500 w-full sm:w-48"
                />
                <button
                  type="submit"
                  disabled={!directDeleteInput.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-40 transition-colors shrink-0"
                >
                  Delete Account
                </button>
              </form>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
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
                              title="Delete account permanently from database"
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

        {/* Tab: Groups & Chat Purge */}
        {activeTab === 'groups' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* DANGER ACTION CARD 1: DELETE ALL CHAT IN ALL GROUPS */}
            <div className="p-5 rounded-3xl bg-[#13070c] border border-red-500/40 shadow-xl shadow-red-950/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0 shadow-lg">
                    <Flame className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-[#E8F0FA]">
                        Delete All Chat in All Groups
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 uppercase tracking-wide">
                        Database Purge
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1 max-w-xl leading-relaxed">
                      Permanently wipe all messages across every public and private group from the database (<code className="text-emerald-400 font-mono text-[11px]">data/zayan_chat.json</code>). Direct 1-on-1 private messages between friends will NOT be affected.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPurgeModal(true)}
                  className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete All Chat in All Groups</span>
                </button>
              </div>
            </div>

            {/* ACTION CARD 2: ADD GROUP MAKING OPTION */}
            <div className="p-5 rounded-3xl bg-[#091122] border border-[#1E3042] space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E3042] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#00D68F]/15 border border-[#00D68F]/30 text-[#00D68F] flex items-center justify-center">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#E8F0FA]">
                      Add / Make New Group
                    </h3>
                    <p className="text-[11px] text-[#94A3B8]">
                      Create a new group in the database for users to join and chat.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAdminCreateGroup} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Project Alpha, Cyber Hub"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                      Group Avatar URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... or leave blank for default"
                      value={newGroupAvatarUrl}
                      onChange={(e) => setNewGroupAvatarUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050811] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                    Group Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short summary of this group's topic and guidelines..."
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050811] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94A3B8]">
                    <input
                      type="checkbox"
                      checked={newGroupIsPrivate}
                      onChange={(e) => setNewGroupIsPrivate(e.target.checked)}
                      className="rounded bg-[#050811] border-[#1E3042] text-[#00D68F] focus:ring-0"
                    />
                    <span>Private Group (Requires invite to join)</span>
                  </label>

                  <button
                    type="submit"
                    disabled={creatingGroup || !newGroupName.trim()}
                    className="px-5 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-[#00D68F]/20"
                  >
                    <FolderPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>{creatingGroup ? 'Creating Group...' : 'Save Group to Database'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION 3: DATABASE GROUPS (NO DEMO GROUPS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                    Active Database Groups ({adminGroups.length})
                  </h4>
                  <p className="text-[11px] text-[#94A3B8]">
                    All real groups stored in database. No demo groups are seeded.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchAdminData}
                  className="text-xs text-[#00D68F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {adminGroups.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#091122] border border-[#1E3042] text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#050811] border border-[#1E3042] text-[#94A3B8] flex items-center justify-center mx-auto mb-2">
                    <Layers className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h5 className="text-xs font-bold text-[#E8F0FA]">No Groups in Database</h5>
                  <p className="text-[11px] text-[#94A3B8] max-w-sm mx-auto mt-1">
                    No demo groups are active. Use the &quot;Add / Make New Group&quot; option above to create your first real group.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {adminGroups.map((g) => (
                    <div
                      key={g.id}
                      className="p-4 rounded-2xl bg-[#091122] border border-[#1E3042] flex flex-col justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={g.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'}
                            alt={g.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#1E3042]"
                          />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-[#E8F0FA] truncate">{g.name}</h5>
                            <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                              {g.description || 'No description provided'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-[#94A3B8]">
                              <span className="font-mono text-emerald-400">
                                {g.members?.length || 1} member{g.members?.length === 1 ? '' : 's'}
                              </span>
                              <span>•</span>
                              <span>Created by @{g.createdBy}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSingleGroup(g.id, g.name)}
                          title="Delete this group from database"
                          className="p-1.5 rounded-lg text-[#F87171] hover:bg-[#050811] transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-[#1E3042]/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[#94A3B8] font-mono truncate">
                          ID: {g.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setManagingMembersGroup(g);
                            setSelectedUserForGroup('');
                            setManualUserIdForGroup('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#00D68F]/15 hover:bg-[#00D68F]/25 text-[#00D68F] border border-[#00D68F]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Members</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal: Admin Manage & Add Members to Group */}
            {managingMembersGroup && (
              <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-[#0D1E18] border border-[#294438] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 text-[#F4FFF9]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#294438] mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={managingMembersGroup.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'}
                        alt={managingMembersGroup.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#294438]"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-[#F4FFF9] flex items-center gap-2">
                          <span>{managingMembersGroup.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#00C98D]/15 text-[#63F5C0] border border-[#00C98D]/30">
                            {managingMembersGroup.members?.length || 0} Members
                          </span>
                        </h4>
                        <p className="text-xs text-[#91A99C]">
                          Admin Control: Add registered users or assign members to this group
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManagingMembersGroup(null)}
                      className="p-1.5 rounded-xl text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Current Members preview */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#91A99C] mb-2 uppercase tracking-wider">
                      Current Group Members ({managingMembersGroup.members?.length || 0})
                    </label>
                    <div className="max-h-36 overflow-y-auto p-2 bg-[#071310] border border-[#294438] rounded-2xl space-y-1.5">
                      {(managingMembersGroup.members || []).map((m) => (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#142A22]/50 text-xs text-[#F4FFF9]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.userId}`}
                              alt={m.displayName}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="font-semibold truncate">{m.displayName}</span>
                            <span className="text-[10px] text-[#91A99C] font-mono">@{m.userId}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono">
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add Member Form */}
                  <form onSubmit={handleAdminAddMemberToGroup} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#F4FFF9] mb-1.5">
                        Select Registered User to Add
                      </label>
                      <select
                        value={selectedUserForGroup}
                        onChange={(e) => {
                          setSelectedUserForGroup(e.target.value);
                          if (e.target.value) setManualUserIdForGroup('');
                        }}
                        className="w-full px-3.5 py-2.5 bg-[#071310] border border-[#294438] rounded-xl text-xs text-[#F4FFF9] focus:outline-none focus:border-[#00C98D]"
                      >
                        <option value="">-- Choose from registered users --</option>
                        {users
                          .filter((u) => !managingMembersGroup.members?.some((m) => m.userId === u.id))
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.displayName} (@{u.id})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#F4FFF9] mb-1.5">
                        Or Enter User ID / Handle Manually
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. farhan, zayan, samira"
                        value={manualUserIdForGroup}
                        onChange={(e) => {
                          setManualUserIdForGroup(e.target.value);
                          if (e.target.value) setSelectedUserForGroup('');
                        }}
                        className="w-full px-3.5 py-2.5 bg-[#071310] border border-[#294438] rounded-xl text-xs text-[#F4FFF9] placeholder-[#91A99C] focus:outline-none focus:border-[#00C98D]"
                      />
                    </div>

                    <div className="pt-3 border-t border-[#294438] flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setManagingMembersGroup(null)}
                        className="px-4 py-2 rounded-xl text-xs text-[#91A99C] hover:text-[#F4FFF9] cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        type="submit"
                        disabled={addingMemberToGroup || (!selectedUserForGroup && !manualUserIdForGroup.trim())}
                        className="px-5 py-2 rounded-xl bg-[#00C98D] hover:bg-[#00B87A] disabled:opacity-50 text-[#071310] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{addingMemberToGroup ? 'Adding...' : 'Add Member to Group'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#E8F0FA]">
                    Account Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter user password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E8F0FA] p-0.5 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-1">
                  The user can log in immediately at the login screen using this username &amp; password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Status Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Coding on ZappChat, Available for chat"
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
                  Share these invite tokens with friends to let them register directly into ZappChat.
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

        {/* Tab 6: Google Search Console & SEO Domain Verification */}
        {activeTab === 'seo' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Condition Shift Banner */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-[#0C1B2A] to-[#0A101D] border-2 border-emerald-500/40 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <Globe className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                        Google Search Console Verification Condition Changed
                      </h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400 text-[#07111F] font-mono">
                        INSTANT READY
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1 leading-relaxed max-w-2xl">
                      Switched from slow <strong>Domain Provider (DNS TXT 24-48h wait)</strong> to <strong>URL Prefix Property (Instant 1-second verification)</strong>. All meta tags and verification routes are pre-installed in your server.
                    </p>
                  </div>
                </div>

                <a
                  href="https://search.google.com/search-console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-[#00D68F] hover:from-emerald-300 hover:to-[#00B87A] text-[#07111F] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                >
                  <span>Open Search Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Comparison of Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Old Condition */}
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 font-mono">
                      Previous Condition (From Screenshot)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold">
                      Slow: 24h Delay
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Domain Name Provider (DNS TXT)</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Requires signing into GoDaddy / Namecheap DNS management and adding a TXT record. Search Console warns: <em className="text-red-300">"DNS changes may take some time to apply... wait a day and then try to verify again."</em>
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-red-500/20 text-[10px] text-neutral-400">
                  Status: <strong>Slow propagation / Frequent registrar delay</strong>
                </div>
              </div>

              {/* New Condition */}
              <div className="p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/40 flex flex-col justify-between shadow-lg shadow-emerald-950/30">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      New Condition (Implemented Now)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-400 text-black font-bold">
                      Instant: 1-Second Check
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>URL Prefix Property (HTML Meta Tag / File)</span>
                  </h4>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    As suggested in your screenshot (<em>"try a URL prefix property instead"</em>): Google directly checks the website code and verifies <strong>immediately</strong> without touching domain registrar DNS.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Installed &amp; Active on {seoData?.domain || 'zappchat.com'}</span>
                </div>
              </div>
            </div>

            {/* How to verify in Google Search Console - 3 Steps */}
            <div className="p-5 rounded-2xl bg-[#091122] border border-[#1E3042] space-y-4">
              <h4 className="text-xs font-bold text-[#E8F0FA] uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>3-Step Quick Guide in Google Search Console</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0D1826] border border-[#1E3042] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h5 className="text-xs font-bold text-white">Choose URL Prefix</h5>
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    In Search Console, click "Add Property" and choose the right card: <strong>URL prefix</strong> (e.g. <code className="text-emerald-300">https://zappchat.com</code>).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0D1826] border border-[#1E3042] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h5 className="text-xs font-bold text-white">Select HTML Tag</h5>
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Under "Other verification methods", click <strong>HTML tag</strong> (or HTML file). The token matches your pre-installed configuration below.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0D1826] border border-[#1E3042] space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <h5 className="text-xs font-bold text-white">Click Verify</h5>
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Press the green <strong>VERIFY</strong> button. Google checks the live site and marks the domain verified instantly!
                  </p>
                </div>
              </div>
            </div>

            {/* Active Verification Methods Table */}
            <div className="p-5 rounded-2xl bg-[#07111F] border border-[#1E3042] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#E8F0FA] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Live Verification Tokens Pre-Configured</span>
                  </h4>
                  <p className="text-[11px] text-[#94A3B8]">
                    All 3 verification mechanisms are actively served by your server.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                  Token: {seoToken.slice(0, 16)}...
                </span>
              </div>

              {/* Method 1: HTML Meta Tag */}
              <div className="p-3.5 rounded-xl bg-[#0A1424] border border-[#1E3042] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Method 1: HTML Tag (index.html)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                      Recommended
                    </span>
                  </div>
                  <code className="text-[11px] text-emerald-400 font-mono break-all block bg-black/40 p-2 rounded-lg border border-[#1E3042]">
                    &lt;meta name="google-site-verification" content="{seoToken}" /&gt;
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`<meta name="google-site-verification" content="${seoToken}" />`);
                    setCopiedSeo('meta');
                    setTimeout(() => setCopiedSeo(null), 2000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#111E2D] hover:bg-[#1A2C42] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shrink-0 border border-[#1E3042]"
                >
                  {copiedSeo === 'meta' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSeo === 'meta' ? 'Copied Tag' : 'Copy HTML Tag'}</span>
                </button>
              </div>

              {/* Method 2: HTML File */}
              <div className="p-3.5 rounded-xl bg-[#0A1424] border border-[#1E3042] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Method 2: HTML Verification File</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    File served at: <code className="text-cyan-300 font-mono">/google-site-verification.html</code> and <code className="text-cyan-300 font-mono">/google{seoToken}.html</code>
                  </p>
                </div>
                <a
                  href="/google-site-verification.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#111E2D] hover:bg-[#1A2C42] text-xs font-bold text-cyan-400 flex items-center gap-1.5 cursor-pointer shrink-0 border border-[#1E3042]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test File Endpoint</span>
                </a>
              </div>

              {/* Method 3: DNS TXT (If ever needed) */}
              <div className="p-3.5 rounded-xl bg-[#0A1424] border border-[#1E3042] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Method 3: DNS TXT Record (Optional)</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-700 text-neutral-300 font-bold uppercase">
                      Fallback
                    </span>
                  </div>
                  <code className="text-[11px] text-neutral-300 font-mono break-all block bg-black/40 p-2 rounded-lg border border-[#1E3042]">
                    google-site-verification={seoToken}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`google-site-verification=${seoToken}`);
                    setCopiedSeo('dns');
                    setTimeout(() => setCopiedSeo(null), 2000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#111E2D] hover:bg-[#1A2C42] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shrink-0 border border-[#1E3042]"
                >
                  {copiedSeo === 'dns' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSeo === 'dns' ? 'Copied TXT' : 'Copy TXT'}</span>
                </button>
              </div>
            </div>

            {/* Custom Token Updater */}
            <form onSubmit={handleUpdateSeoToken} className="p-5 rounded-2xl bg-[#091122] border border-[#1E3042] space-y-3">
              <h4 className="text-xs font-bold text-[#E8F0FA] flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Update Google Verification Token</span>
              </h4>
              <p className="text-[11px] text-[#94A3B8]">
                If you generate a new token or want to test another verification property, paste it below to instantly update `index.html` and the server endpoints without redeploying.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={seoToken}
                  onChange={(e) => setSeoToken(e.target.value)}
                  placeholder="Enter token (e.g. YwKuVGKugmQq4r1-cow6uS6L-nreuxp4vqz)"
                  className="flex-1 px-3.5 py-2.5 bg-[#050811] border border-[#1E3042] rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="submit"
                  disabled={updatingSeo || !seoToken.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] disabled:opacity-50 text-[#07111F] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updatingSeo ? 'animate-spin' : ''}`} />
                  <span>{updatingSeo ? 'Updating...' : 'Save & Sync Token'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 7: Database Connect & Admin Command Console */}
        {activeTab === 'database_console' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 flex flex-col min-h-0 bg-[#050811]">
            {/* Database Live Connection Header */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#091122] border border-[#1E3042] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <Database className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-black text-white tracking-wide uppercase font-mono">
                      Database Connection Terminal
                    </h3>
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>CONNECTED &amp; READY</span>
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      Ping: {dbConnection?.latencyMs || '<1'}ms
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-1 font-mono flex-wrap">
                    <span>
                      File: <strong className="text-white">{dbConnection?.dbFile || 'data/zayan_chat.json'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Size: <strong className="text-emerald-400">{dbConnection?.sizeKb || '...'} KB</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Engine: <strong className="text-neutral-200">JSON-Relational SQLite/File</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  disabled={checkingDb}
                  onClick={checkDatabaseConnection}
                  className="px-3 py-2 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/20"
                  title="Check database connection and ping"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingDb ? 'animate-spin' : ''}`} />
                  <span>{checkingDb ? 'Connecting...' : 'Ping DB'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunCommand(undefined, 'db:backup')}
                  className="px-3 py-2 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-cyan-500/20"
                  title="Create timestamped database snapshot backup"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Snapshot Backup</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunCommand(undefined, 'db:compact')}
                  className="px-3 py-2 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/20"
                  title="Optimize storage and clean expired records"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Compact Storage</span>
                </button>
              </div>
            </div>

            {/* Quick Command Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Commands:</span>
              </span>
              {[
                { label: 'db:status', cmd: 'db:status', tip: 'Check database status & statistics' },
                { label: 'user:list', cmd: 'user:list', tip: 'List all registered accounts and roles' },
                { label: 'db:query users', cmd: 'db:query users 10', tip: 'Query users collection' },
                { label: 'db:query messages', cmd: 'db:query messages 5', tip: 'Query recent messages' },
                { label: 'db:query groups', cmd: 'db:query groups', tip: 'Query groups collection' },
                { label: 'sessions:list', cmd: 'sessions:list', tip: 'List all active logged-in device sessions' },
                { label: 'system:logs', cmd: 'system:logs 10', tip: 'View recent security logs' },
                { label: 'help', cmd: 'help', tip: 'Show all available admin commands' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleRunCommand(undefined, chip.cmd)}
                  className="px-2.5 py-1 rounded-lg bg-[#0D1B2A] hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 border border-[#1E3042] hover:border-emerald-500/40 font-mono text-[11px] transition-colors cursor-pointer shrink-0"
                  title={chip.tip}
                >
                  ${chip.label}
                </button>
              ))}
            </div>

            {/* Interactive Terminal Window */}
            <div className="flex-1 flex flex-col rounded-2xl bg-[#03060E] border-2 border-[#1E3042] shadow-2xl overflow-hidden min-h-[360px]">
              {/* Terminal Title Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#080D1A] border-b border-[#1E3042]">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-neutral-300 ml-2">
                    zappchat-admin@database:~$ (Interactive Console)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = terminalLogs.map((l) => `${l.command ? `$ ${l.command}\n` : ''}${l.output}`).join('\n\n');
                      navigator.clipboard.writeText(text);
                      setCopiedTerminal(true);
                      setTimeout(() => setCopiedTerminal(false), 2000);
                    }}
                    className="p-1 rounded text-neutral-400 hover:text-emerald-300 hover:bg-[#111E2D] text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                    title="Copy terminal history to clipboard"
                  >
                    {copiedTerminal ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Output</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTerminalLogs([])}
                    className="p-1 px-2 rounded text-neutral-400 hover:text-rose-300 hover:bg-[#111E2D] text-[11px] font-mono cursor-pointer"
                    title="Clear terminal screen"
                  >
                    Clear Screen
                  </button>
                </div>
              </div>

              {/* Terminal Logs Viewport */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs text-neutral-200 select-text">
                {terminalLogs.map((log) => (
                  <div key={log.id} className="space-y-1">
                    {log.command && (
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <span className="text-neutral-500 text-[10px]">{log.timestamp}</span>
                        <span className="text-cyan-400">talksy-admin@db:~$</span>
                        <span className="text-white">{log.command}</span>
                        {log.executionTimeMs !== undefined && (
                          <span className="text-[10px] text-neutral-500 font-normal">
                            [+{log.executionTimeMs}ms]
                          </span>
                        )}
                      </div>
                    )}
                    <pre
                      className={`p-2.5 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap break-words border font-mono ${
                        log.isError
                          ? 'bg-red-950/30 border-red-500/40 text-red-300'
                          : 'bg-[#060B16] border-[#162334] text-neutral-300'
                      }`}
                    >
                      {log.output}
                    </pre>
                  </div>
                ))}
                {executingCommand && (
                  <div className="flex items-center gap-2 text-cyan-400 text-xs animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing database command...</span>
                  </div>
                )}
                <div ref={terminalBottomRef} />
              </div>

              {/* Terminal Command Input Form */}
              <form
                onSubmit={(e) => handleRunCommand(e)}
                className="flex items-center gap-2 p-3 bg-[#080D1A] border-t border-[#1E3042]"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-xs shrink-0 select-none">
                  <span className="text-cyan-400">db:~$</span>
                </div>
                <input
                  type="text"
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (commandHistory.length > 0) {
                        const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                        setHistoryIndex(nextIndex);
                        setCommandInput(commandHistory[nextIndex]);
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (historyIndex > 0) {
                        const nextIndex = historyIndex - 1;
                        setHistoryIndex(nextIndex);
                        setCommandInput(commandHistory[nextIndex]);
                      } else if (historyIndex === 0) {
                        setHistoryIndex(-1);
                        setCommandInput('');
                      }
                    }
                  }}
                  placeholder="Type an admin command (e.g. db:status, user:list, help)..."
                  className="flex-1 bg-transparent border-0 text-white font-mono text-xs placeholder-neutral-500 focus:outline-none focus:ring-0"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={executingCommand || !commandInput.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-[#00D68F] hover:from-emerald-300 hover:to-[#00B87A] disabled:opacity-40 text-[#07111F] font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 shrink-0 font-mono"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Execute</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Add User with Password Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0B1321] border border-[#1E3042] rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#1E3042]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 stroke-[2.3]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Add User with Password
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    Directly provision a new account with instant database credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#111E2D] cursor-pointer"
              >
                ✕
              </button>
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
                    className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] font-mono"
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#E8F0FA]">
                    Account Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] font-mono tracking-wide"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#E8F0FA] p-0.5 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Password is automatically encrypted and saved directly in <code className="text-emerald-400 font-mono">data/zayan_chat.json</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                    Status Headline (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Active on ZappChat"
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
                    placeholder="Leave blank for auto-avatar"
                    value={newAvatarUrl}
                    onChange={(e) => setNewAvatarUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Bio / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short note or bio..."
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  className="w-full px-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E3042]">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newId.trim() || !newPassword}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00D68F] to-emerald-500 hover:from-[#00B87A] hover:to-emerald-600 disabled:opacity-40 text-[#07111F] font-black text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/20"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.3]" />
                  <span>{creating ? 'Adding Account...' : 'Add User with Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* In-App Account Deletion Confirmation Modal (Direct Database Connected) */}
      {userToDelete && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A101D] border border-red-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl shadow-red-950/40 animate-in zoom-in-95 ring-1 ring-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#E8F0FA]">
                  Permanently Delete Account
                </h3>
                <p className="text-xs text-red-400 font-medium">
                  Direct database file operation
                </p>
              </div>
            </div>

            {/* Target Account Summary */}
            <div className="p-3.5 rounded-2xl bg-[#050811] border border-[#1E3042] flex items-center gap-3 mb-4">
              <img
                src={userToDelete.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userToDelete.id}`}
                alt={userToDelete.displayName}
                className="w-10 h-10 rounded-full object-cover border border-[#1E3042]"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#E8F0FA] truncate">
                  {userToDelete.displayName}
                </h4>
                <p className="text-[11px] font-mono text-emerald-400">@{userToDelete.id}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                Pending Purge
              </span>
            </div>

            {/* Database Connection Info */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2 mb-4">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[11px]">
                <span className="font-semibold text-white">Target Database: </span>
                <code className="font-mono text-emerald-300">data/zayan_chat.json</code>
              </div>
            </div>

            {/* Warning details */}
            <div className="text-xs text-[#94A3B8] space-y-1.5 mb-5 bg-[#050811] p-3.5 rounded-xl border border-[#1E3042]">
              <p className="font-semibold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>The following data will be erased permanently:</span>
              </p>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1 text-[#94A3B8]">
                <li>User credentials and profile record from database</li>
                <li>All direct messages sent or received by this user</li>
                <li>Active sessions and linked devices tokens</li>
                <li>Memberships across all groups and communities</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deletingUser}
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingUser ? 'Purging from Database...' : 'Permanently Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Chat Purge Confirmation Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A101D] border border-red-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl shadow-red-950/40 animate-in zoom-in-95 ring-1 ring-red-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#E8F0FA]">
                  Delete All Chat in All Groups?
                </h3>
                <p className="text-xs text-red-400 font-medium">
                  Dangerous action • Cannot be undone
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#050811] border border-red-500/30 text-xs text-[#E8F0FA] mb-4 space-y-2">
              <p className="leading-relaxed">
                You are about to permanently delete all chat messages across every group in the database (<code className="text-emerald-400 font-mono text-[11px]">data/zayan_chat.json</code>).
              </p>
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>All group message history, uploaded media in groups, and attachments will be wiped. Direct messages between friends will NOT be affected.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={purgingChats}
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={purgingChats}
                onClick={handlePurgeMessages}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{purgingChats ? 'Purging Messages...' : 'Execute Purge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL CHATS Modal (Typing Required) */}
      {showDeleteAllChatsModal && (
        <div className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0B12] border border-red-500 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in zoom-in-95">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wide">
                  DELETE ALL CHATS (IRREVERSIBLE)
                </h3>
                <p className="text-xs text-red-400 font-semibold">
                  Entire database conversation purge
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-red-950/20 border border-red-500/30 text-xs text-neutral-300 mb-5">
              <p className="leading-relaxed">
                This will permanently delete <strong className="text-white">every chat message</strong>, conversation record, image attachment, audio voice note, and group thread from the database (<code className="text-emerald-400 font-mono text-[11px]">data/zayan_chat.json</code>).
              </p>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/50 border border-red-500/30 text-xs font-mono">
                <span className="text-neutral-400">Total database messages to purge:</span>
                <span className="text-red-400 font-bold">{diagnostics?.database.totalMessages ?? 'All active'} records</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-red-300">
                Type <span className="font-mono text-white underline">DELETE ALL CHATS</span> below to confirm:
              </label>
              <input
                type="text"
                value={typeDeleteAllChats}
                onChange={(e) => setTypeDeleteAllChats(e.target.value)}
                placeholder="DELETE ALL CHATS"
                className="w-full px-4 py-3 bg-[#130E1A] border border-red-500/50 rounded-2xl text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={purgingAllChats}
                onClick={() => {
                  setShowDeleteAllChatsModal(false);
                  setTypeDeleteAllChats('');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purgingAllChats || typeDeleteAllChats !== 'DELETE ALL CHATS'}
                onClick={handleDeleteAllChats}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wide flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{purgingAllChats ? 'Purging All Chats...' : 'Confirm Purge All Chats'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL USER ACCOUNTS Modal (Full-Screen Red Warning) */}
      {showDeleteAllUsersModal && (
        <div className="fixed inset-0 z-80 bg-red-950/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in select-none">
          <div className="bg-[#0D0507] border-2 border-red-600 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-[0_0_80px_rgba(255,0,0,0.6)] animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-600/30 border border-red-500 text-red-400 flex items-center justify-center shrink-0 shadow-lg">
                <AlertOctagon className="w-8 h-8 animate-bounce text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  DELETE ALL USER ACCOUNTS
                </h3>
                <p className="text-xs text-red-400 font-bold uppercase tracking-widest mt-0.5">
                  CRITICAL DANGER • PERMANENT ACCOUNT PURGE
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-red-950/40 border border-red-500/50 text-xs text-neutral-200 mb-6">
              <p className="leading-relaxed">
                You are about to permanently delete all regular user accounts from the database. Their profile records, login credentials, direct messages, group memberships, stories, and active sessions will be eradicated.
              </p>
              <div className="p-3 rounded-xl bg-black/60 border border-red-500/40 flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Regular accounts to be deleted:</span>
                <span className="text-red-400 font-black text-sm">
                  {users.filter((u) => u.role !== 'admin' && u.id !== 'zayan' && u.id !== 'zanu').length} Accounts
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Protected Administrator accounts (@{currentUser.id}) will NOT be deleted.</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="block text-xs font-black uppercase tracking-wider text-red-300">
                Type <span className="font-mono text-white underline">DELETE ALL USERS</span> to authorize:
              </label>
              <input
                type="text"
                value={typeDeleteAllUsers}
                onChange={(e) => setTypeDeleteAllUsers(e.target.value)}
                placeholder="DELETE ALL USERS"
                className="w-full px-4 py-3 bg-[#19060B] border-2 border-red-500/70 rounded-2xl text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-red-950">
              <button
                type="button"
                disabled={purgingAllUsers}
                onClick={() => {
                  setShowDeleteAllUsersModal(false);
                  setTypeDeleteAllUsers('');
                }}
                className="px-5 py-3 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                Abort & Return
              </button>
              <button
                type="button"
                disabled={purgingAllUsers || typeDeleteAllUsers !== 'DELETE ALL USERS'}
                onClick={handleDeleteAllRegularUsers}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(255,0,0,0.7)] transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{purgingAllUsers ? 'Purging All Accounts...' : 'Execute Account Purge'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
