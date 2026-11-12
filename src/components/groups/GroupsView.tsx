import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Lock,
  Globe,
  Megaphone,
  MessageSquare,
  Search,
  Loader2,
  Send,
  X,
  LogOut,
  Trash2,
  ArrowLeft,
  ShieldAlert,
  Shield,
  UserPlus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Group, Message, User } from '../../types/chat';
import { api } from '../../services/api';

interface GroupsViewProps {
  currentUser: User;
  onOpenDirectChat?: (friendId: string) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({ currentUser, onOpenDirectChat }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  // Group Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState('community, discussion');
  const [creating, setCreating] = useState(false);

  // Group Chat State
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [newMsgText, setNewMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Group Announcement State
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [postingAnn, setPostingAnn] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add Member by ID state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberMsg, setAddMemberMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAddMemberById = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !targetMemberId.trim()) return;
    setAddingMember(true);
    setAddMemberMsg(null);
    try {
      const res = await api.addGroupMember(activeGroup.id, targetMemberId.trim());
      setActiveGroup(res.group);
      setGroups((prev) => prev.map((g) => (g.id === res.group.id ? res.group : g)));
      setAddMemberMsg({ type: 'success', text: `Successfully added @${targetMemberId.trim()} to ${activeGroup.name}!` });
      setTimeout(() => {
        setShowAddMemberModal(false);
        setTargetMemberId('');
        setAddMemberMsg(null);
      }, 1500);
    } catch (err: any) {
      setAddMemberMsg({ type: 'error', text: err.message || 'Failed to add member' });
    } finally {
      setAddingMember(false);
    }
  };

  const loadGroups = async () => {
    try {
      const list = await api.getGroups();
      setGroups(list);
      if (list.length > 0 && !activeGroup) {
        setActiveGroup(list[0]);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Load group messages when active group changes
  useEffect(() => {
    if (!activeGroup) {
      setGroupMessages([]);
      return;
    }
    const fetchMsgs = async () => {
      try {
        const msgs = await api.getGroupMessages(activeGroup.id);
        setGroupMessages(msgs);
      } catch (err) {
        console.error('Failed to load group messages:', err);
      }
    };
    fetchMsgs();
  }, [activeGroup?.id]);

  // Handle SSE for group updates & deletion
  useEffect(() => {
    const handleSse = (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'group_created') {
          setGroups((prev) => [data.payload, ...prev]);
        } else if (data.type === 'group_updated') {
          setGroups((prev) =>
            prev.map((g) => (g.id === data.payload.id ? data.payload : g))
          );
          if (activeGroup?.id === data.payload.id) {
            setActiveGroup(data.payload);
          }
        } else if (data.type === 'group_deleted') {
          setGroups((prev) => prev.filter((g) => g.id !== data.payload.groupId));
          if (activeGroup?.id === data.payload.groupId) {
            setActiveGroup(null);
          }
        } else if (data.type === 'new_group_message') {
          if (activeGroup?.id === data.payload.groupId) {
            setGroupMessages((prev) => {
              if (prev.some((m) => m.id === data.payload.message.id)) return prev;
              return [...prev, data.payload.message];
            });
          }
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('talksy_sse_event', handleSse as any);
    return () => window.removeEventListener('talksy_sse_event', handleSse as any);
  }, [activeGroup?.id]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    try {
      const parsedTags = tags.split(/[\s,]+/).filter(Boolean);
      const newGrp = await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        isPrivate,
        tags: parsedTags,
      });
      setGroups((prev) => [newGrp, ...prev]);
      setActiveGroup(newGrp);
      setShowCreateModal(false);
      setName('');
      setDescription('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to create group');
      setTimeout(() => setActionError(null), 3500);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const res = await api.joinGroup(groupId);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? res.group : g)));
      if (activeGroup?.id === groupId) setActiveGroup(res.group);
    } catch (err: any) {
      setActionError(err.message || 'Failed to join group');
      setTimeout(() => setActionError(null), 3500);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const res = await api.leaveGroup(groupId);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? res.group : g)));
      if (activeGroup?.id === groupId) setActiveGroup(res.group);
    } catch (err: any) {
      setActionError(err.message || 'Failed to leave group');
      setTimeout(() => setActionError(null), 3000);
    }
  };

  const promptDeleteGroup = (groupId: string, groupName: string) => {
    setGroupToDelete({ id: groupId, name: groupName });
  };

  const confirmExecuteDelete = async () => {
    if (!groupToDelete) return;
    const { id: groupId } = groupToDelete;
    setDeletingId(groupId);
    try {
      await api.deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (activeGroup?.id === groupId) {
        setActiveGroup(null);
      }
      setGroupToDelete(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete group');
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !newMsgText.trim()) return;

    setSendingMsg(true);
    try {
      const msg = await api.sendGroupMessage(activeGroup.id, {
        text: newMsgText.trim(),
      });
      setGroupMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setNewMsgText('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to send message');
      setTimeout(() => setActionError(null), 3500);
    } finally {
      setSendingMsg(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !annTitle.trim() || !annContent.trim()) return;

    setPostingAnn(true);
    try {
      const res = await api.postGroupAnnouncement(
        activeGroup.id,
        annTitle.trim(),
        annContent.trim()
      );
      setActiveGroup(res.group);
      setShowAnnounceModal(false);
      setAnnTitle('');
      setAnnContent('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to post announcement');
      setTimeout(() => setActionError(null), 3500);
    } finally {
      setPostingAnn(false);
    }
  };

  const isCurrentMember = activeGroup?.members.some(
    (m) => m.userId === currentUser.id
  );
  const myRole = activeGroup?.members.find((m) => m.userId === currentUser.id)?.role;
  const canPostAnnouncement = myRole === 'admin' || myRole === 'moderator';
  const canDeleteActiveGroup =
    activeGroup &&
    (activeGroup.createdBy === currentUser.id || currentUser.role === 'admin');

  const filteredGroups = groups.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const uniqueGroupMessages = useMemo(() => {
    const seen = new Set<string>();
    return groupMessages.filter((m) => {
      if (!m || !m.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [groupMessages]);

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-[#07111F] select-none">
      {/* Left Column: Groups Directory & List */}
      <div
        className={`w-full md:w-[340px] border-r border-[#1E3042] bg-[#0D1B2A] flex flex-col shrink-0 ${
          activeGroup ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="h-16 px-4 border-b border-[#1E3042] flex items-center justify-between bg-[#0D1B2A]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00D68F]" />
            <h2 className="text-sm font-bold text-[#E8F0FA]">Communities</h2>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-transform active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#1E3042] bg-[#0D1B2A]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111E2D] border border-[#1E3042] rounded-xl pl-9 pr-3 py-2 text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1E3042]/50 p-2">
          {loading ? (
            <div className="py-12 text-center text-[#94A3B8] text-xs">
              <Loader2 className="w-5 h-5 text-[#00D68F] animate-spin mx-auto mb-2" />
              Loading communities...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-16 text-center text-[#94A3B8] text-xs px-4">
              <div className="w-12 h-12 rounded-full bg-[#111E2D] border border-[#1E3042] flex items-center justify-center text-[#00D68F] mx-auto mb-3">
                <Users className="w-6 h-6" />
              </div>
              <p className="font-semibold text-[#E8F0FA] mb-1">No groups available</p>
              <p className="text-[11px] max-w-xs mx-auto mb-4 leading-relaxed">
                Start a discussion group for your circle or community.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = activeGroup?.id === group.id;
              const isMember = group.members.some((m) => m.userId === currentUser.id);
              const isThisGroupAdmin = group.members.some(
                (m) => m.userId === currentUser.id && (m.role === 'admin' || m.role === 'moderator')
              );
              const canDeleteThis =
                group.createdBy === currentUser.id || currentUser.role === 'admin' || isThisGroupAdmin;

              return (
                <div
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 my-1 relative group ${
                    isSelected
                      ? 'bg-[#111E2D] border border-[#00D68F]/40'
                      : 'hover:bg-[#111E2D]/60 border border-transparent text-[#94A3B8]'
                  }`}
                >
                  <img
                    src={group.avatarUrl}
                    alt={group.name}
                    className="w-11 h-11 rounded-2xl object-cover border border-[#1E3042]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-[#E8F0FA] truncate">
                        {group.name}
                      </h3>
                      {group.isPrivate ? (
                        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                      ) : (
                        <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                      {group.description || `${group.members.length} members`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#94A3B8] font-mono">
                        {group.members.length} members
                      </span>
                      {isMember && (
                        <span className="text-[10px] text-[#00D68F] font-semibold">
                          Joined
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Delete Button for Creator / Admin */}
                  {canDeleteThis && (
                    <button
                      type="button"
                      disabled={deletingId === group.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        promptDeleteGroup(group.id, group.name);
                      }}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F87171] hover:bg-[#F87171]/15 transition-all opacity-70 group-hover:opacity-100 cursor-pointer shrink-0"
                      title={`Delete "${group.name}"`}
                    >
                      {deletingId === group.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F87171]" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Group Details, Announcements & Chat */}
      <div
        className={`flex-1 flex-col h-full bg-[#07111F] overflow-hidden ${
          activeGroup ? 'flex' : 'hidden md:flex'
        }`}
      >
        {activeGroup ? (
          <>
            {/* Group Banner & Top Header */}
            <div className="relative border-b border-[#1E3042] bg-[#0D1B2A]">
              <div className="h-28 w-full overflow-hidden bg-[#111E2D]">
                <img
                  src={activeGroup.bannerUrl}
                  alt={activeGroup.name}
                  className="w-full h-full object-cover opacity-50"
                />
              </div>

              <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4 -mt-10 sm:-mt-10">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setActiveGroup(null)}
                    className="md:hidden p-2 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] bg-[#0D1B2A] border border-[#1E3042] cursor-pointer shadow"
                    title="Back to group list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <img
                    src={activeGroup.avatarUrl}
                    alt={activeGroup.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-4 ring-[#0D1B2A] shadow-xl"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-base font-bold text-[#E8F0FA]">
                        {activeGroup.name}
                      </h1>
                      {activeGroup.isPrivate ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-semibold">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-semibold">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-0.5 max-w-xl truncate">
                      {activeGroup.description || 'Welcome to this group.'}
                    </p>
                  </div>
                </div>

                {/* Membership & Management Actions */}
                <div className="flex items-center gap-2">
                  {canPostAnnouncement && (
                    <button
                      onClick={() => setShowAnnounceModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Announcement</span>
                    </button>
                  )}

                  {(isCurrentMember || currentUser.role === 'admin') && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00D68F]/15 hover:bg-[#00D68F]/25 border border-[#00D68F]/30 text-[#00D68F] text-xs font-semibold transition-colors cursor-pointer"
                      title="Add Member by User ID"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  )}

                  {isCurrentMember ? (
                    <button
                      onClick={() => handleLeaveGroup(activeGroup.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111E2D] hover:bg-red-500/15 text-[#94A3B8] hover:text-[#F87171] border border-[#1E3042] text-xs font-semibold transition-colors cursor-pointer"
                      title="Leave Group"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinGroup(activeGroup.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      <span>Join Community</span>
                    </button>
                  )}

                  {/* DELETE GROUP ACTION */}
                  {canDeleteActiveGroup && (
                    <button
                      onClick={() => promptDeleteGroup(activeGroup.id, activeGroup.name)}
                      disabled={deletingId === activeGroup.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F87171]/15 hover:bg-[#F87171]/25 text-[#F87171] border border-[#F87171]/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      title="Permanently Delete Group"
                    >
                      {deletingId === activeGroup.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete Group</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Main Area: Split between Announcements & Group Chat */}
            <div className="flex-1 flex overflow-hidden">
              {/* Center: Live Group Discussion Chat */}
              <div className="flex-1 flex flex-col h-full border-r border-[#1E3042] bg-[#07111F]">
                <div className="px-4 py-2.5 bg-[#0D1B2A] border-b border-[#1E3042] flex items-center gap-2 text-xs font-semibold text-[#E8F0FA]">
                  <MessageSquare className="w-4 h-4 text-[#00D68F]" />
                  <span>Discussion Room</span>
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {currentUser.role === 'admin' ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                        <Shield className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-[#E8F0FA] mb-1">
                        Group Chat Privacy Protected
                      </h4>
                      <p className="text-xs text-[#94A3B8] max-w-sm mb-4 leading-relaxed">
                        Administrators cannot see group chatting. Conversation messages are private to group members. You can manage members, roles, and community settings.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddMemberModal(true)}
                        className="px-4 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 stroke-[2.5]" />
                        <span>Add Member to Group</span>
                      </button>
                    </div>
                  ) : uniqueGroupMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] text-xs">
                      <MessageSquare className="w-8 h-8 text-[#94A3B8]/40 mb-2" />
                      <p>No messages yet in this community.</p>
                      <p className="text-[#94A3B8]/70 mt-0.5">
                        {isCurrentMember
                          ? 'Say hello to your fellow members!'
                          : 'Join the community to participate.'}
                      </p>
                    </div>
                  ) : (
                    uniqueGroupMessages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const senderMember = activeGroup.members.find(
                        (m) => m.userId === msg.senderId
                      );

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 max-w-lg ${
                            isMe ? 'ml-auto flex-row-reverse' : ''
                          }`}
                        >
                          <img
                            src={senderMember?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`}
                            alt={senderMember?.displayName || msg.senderId}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#1E3042]"
                          />
                          <div
                            className={`p-3 rounded-2xl text-xs space-y-1 ${
                              isMe
                                ? 'bg-[#073D32] text-[#E8F0FA] border border-[#00D68F]/30'
                                : 'bg-[#152435] border border-[#1E3042] text-[#E8F0FA]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[11px] text-[#00D68F]">
                                {senderMember?.displayName || msg.senderId}
                              </span>
                              {senderMember?.role === 'admin' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                  Admin
                                </span>
                              )}
                              <span className="text-[10px] text-[#94A3B8] ml-auto font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input vs Admin Privacy Bar */}
                <div className="p-3 bg-[#0D1B2A] border-t border-[#1E3042]">
                  {currentUser.role === 'admin' ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#07111F] border border-[#1E3042] text-xs">
                      <div className="flex items-center gap-2 text-[#94A3B8]">
                        <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">Admin Governance Mode // Group messaging is private to members</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddMemberModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#00D68F]/20 hover:bg-[#00D68F]/30 text-[#00D68F] text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Member</span>
                      </button>
                    </div>
                  ) : isCurrentMember ? (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Message #${activeGroup.name}...`}
                        value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                        className="flex-1 bg-[#111E2D] border border-[#1E3042] rounded-xl px-4 py-2.5 text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                      />
                      <button
                        type="submit"
                        disabled={sendingMsg || !newMsgText.trim()}
                        className="px-4 py-2.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] disabled:opacity-40 text-[#07111F] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  ) : (
                    <div className="text-center py-2 text-xs text-[#94A3B8]">
                      <span>You must join this community to send messages. </span>
                      <button
                        onClick={() => handleJoinGroup(activeGroup.id)}
                        className="text-[#00D68F] font-semibold hover:underline ml-1 cursor-pointer"
                      >
                        Join now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Announcements & Members Sidebar */}
              <div className="hidden lg:flex w-72 lg:w-80 bg-[#0D1B2A] flex-col overflow-y-auto divide-y divide-[#1E3042]">
                {/* Announcements section */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#E8F0FA]">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <span>Announcements</span>
                  </div>

                  {!activeGroup.announcements || activeGroup.announcements.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] italic">
                      No announcements posted yet.
                    </p>
                  ) : (
                    activeGroup.announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1"
                      >
                        <h4 className="text-xs font-bold text-amber-300">
                          {ann.title}
                        </h4>
                        <p className="text-xs text-[#E8F0FA] leading-relaxed">
                          {ann.content}
                        </p>
                        <div className="text-[10px] text-[#94A3B8] font-mono pt-1">
                          By {ann.authorName} ·{' '}
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Members List section */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#E8F0FA]">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#00D68F]" />
                      <span>Members ({activeGroup.members.length})</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeGroup.members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-[#111E2D] transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={member.avatarUrl}
                            alt={member.displayName}
                            className="w-7 h-7 rounded-full object-cover border border-[#1E3042]"
                          />
                          <div>
                            <p className="text-xs font-semibold text-[#E8F0FA]">
                              {member.displayName}
                            </p>
                            <p className="text-[10px] text-[#94A3B8] font-mono">
                              @{member.userId}
                            </p>
                          </div>
                        </div>

                        {member.role === 'admin' ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Admin
                          </span>
                        ) : member.role === 'moderator' ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Mod
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#94A3B8]">Member</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone: Group Deletion */}
                {canDeleteActiveGroup && (
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#F87171]">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Group Administration</span>
                    </div>
                    <button
                      onClick={() => promptDeleteGroup(activeGroup.id, activeGroup.name)}
                      disabled={deletingId === activeGroup.id}
                      className="w-full py-2 px-3 rounded-xl bg-[#F87171]/15 hover:bg-[#F87171]/25 text-[#F87171] border border-[#F87171]/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingId === activeGroup.id ? 'Deleting...' : 'Delete Community'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] text-xs p-6 text-center">
            <Users className="w-12 h-12 text-[#94A3B8]/40 mb-3" />
            <p className="font-semibold text-[#E8F0FA] text-sm mb-1">Select a community</p>
            <p className="text-[11px] max-w-xs leading-relaxed">
              Choose a group from the left sidebar to read announcements and chat with members.
            </p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1B2A] border border-[#1E3042] rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1E3042] pb-3">
              <h3 className="text-sm font-bold text-[#E8F0FA] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00D68F]" />
                Create New Community
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#94A3B8] hover:text-[#E8F0FA] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Community Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Photography Club, Tech Talks..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What is this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Hashtags / Topics
                </label>
                <input
                  type="text"
                  placeholder="e.g. tech, design, gaming"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrivateCheck"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded bg-[#111E2D] border-[#1E3042] text-[#00D68F] focus:ring-0"
                />
                <label
                  htmlFor="isPrivateCheck"
                  className="text-xs text-[#94A3B8] cursor-pointer"
                >
                  Make this group private (Invite-only)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#E8F0FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Announcement Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1B2A] border border-[#1E3042] rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1E3042] pb-3">
              <h3 className="text-sm font-bold text-[#E8F0FA] flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" />
                Post Community Announcement
              </h3>
              <button
                onClick={() => setShowAnnounceModal(false)}
                className="text-[#94A3B8] hover:text-[#E8F0FA] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePostAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Update, New Rules..."
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1">
                  Content / Details *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the full announcement..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#E8F0FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postingAnn}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#07111F] font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {postingAnn ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Group In-App Confirmation Modal */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0D1B2A] border border-[#1E3042] rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#E8F0FA]">Delete Group</h3>
                <p className="text-xs text-[#94A3B8]">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#E8F0FA]">"{groupToDelete.name}"</strong>? All chat messages and announcements will be erased.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E3042]">
              <button
                type="button"
                onClick={() => setGroupToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#E8F0FA] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === groupToDelete.id}
                onClick={confirmExecuteDelete}
                className="px-4 py-2 rounded-xl bg-[#F87171] hover:bg-[#ef4444] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {deletingId === groupToDelete.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member By ID Modal */}
      {showAddMemberModal && activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1B2A] border border-[#1E3042] rounded-3xl p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3042] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00D68F]/15 border border-[#00D68F]/30 text-[#00D68F] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#E8F0FA]">Add Member to Group</h3>
                  <p className="text-[11px] text-[#94A3B8]">Adding to {activeGroup.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setAddMemberMsg(null);
                }}
                className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addMemberMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  addMemberMsg.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/15 border border-red-500/30 text-red-300'
                }`}
              >
                {addMemberMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{addMemberMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddMemberById} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#E8F0FA] mb-1.5">
                  Member User ID / Handle *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. zayam or user ID"
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] transition-colors"
                />
                <p className="text-[10px] text-[#94A3B8] mt-1">
                  Enter the exact user handle or ID registered in the database.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#1E3042]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setAddMemberMsg(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#E8F0FA] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember || !targetMemberId.trim()}
                  className="px-5 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {addingMember ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add to Group</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Error Toast */}
      {actionError && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F87171]/20 border border-[#F87171]/40 text-[#F87171] text-xs px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
          {actionError}
        </div>
      )}
    </div>
  );
};
