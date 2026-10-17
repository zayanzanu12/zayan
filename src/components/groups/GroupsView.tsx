import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Lock,
  Globe,
  Megaphone,
  MessageSquare,
  ShieldCheck,
  Search,
  Loader2,
  Send,
  X,
  LogOut,
} from 'lucide-react';
import { Group, Message, User } from '../../types/chat';
import { api } from '../../services/api';

interface GroupsViewProps {
  currentUser: User;
  onOpenDirectChat?: (friendId: string) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({ currentUser }) => {
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
    if (!activeGroup) return;
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

  // Handle SSE for group updates
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
      alert(err.message || 'Failed to create group');
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
      alert(err.message || 'Failed to join group');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm('Leave this group?')) return;
    try {
      const res = await api.leaveGroup(groupId);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? res.group : g)));
      if (activeGroup?.id === groupId) setActiveGroup(res.group);
    } catch (err: any) {
      alert(err.message || 'Failed to leave group');
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
      alert(err.message || 'Failed to send message');
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
      alert(err.message || 'Failed to post announcement');
    } finally {
      setPostingAnn(false);
    }
  };

  const isCurrentMember = activeGroup?.members.some(
    (m) => m.userId === currentUser.id
  );
  const myRole = activeGroup?.members.find((m) => m.userId === currentUser.id)?.role;
  const canPostAnnouncement = myRole === 'admin' || myRole === 'moderator';

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
    <div className="flex-1 h-full flex overflow-hidden bg-[#07111F]">
      {/* Left Column: Groups Directory & List */}
      <div className="w-full md:w-[340px] border-r border-[#1E3042] bg-[#0D1B2A] flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-[#1E3042] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00D68F]" />
            <h2 className="text-base font-bold text-[#E8F0FA]">Communities</h2>
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
        <div className="p-3 border-b border-[#1E3042]">
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
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto mb-2" />
              Loading communities...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs px-4">
              No groups found. Create the first community!
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = activeGroup?.id === group.id;
              const isMember = group.members.some((m) => m.userId === currentUser.id);

              return (
                <div
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 my-1 ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <img
                    src={group.avatarUrl}
                    alt={group.name}
                    className="w-11 h-11 rounded-2xl object-cover ring-1 ring-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-white truncate">
                        {group.name}
                      </h3>
                      {group.isPrivate ? (
                        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                      ) : (
                        <Globe className="w-3 h-3 text-sky-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {group.description || `${group.members.length} members`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {group.members.length} members
                      </span>
                      {isMember && (
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          Joined
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Group Details, Announcements & Chat */}
      <div className="hidden md:flex flex-1 flex-col h-full bg-[#030712] overflow-hidden">
        {activeGroup ? (
          <>
            {/* Group Banner & Top Header */}
            <div className="relative border-b border-slate-800/80 bg-[#070e20]">
              <div className="h-32 w-full overflow-hidden bg-slate-900">
                <img
                  src={activeGroup.bannerUrl}
                  alt={activeGroup.name}
                  className="w-full h-full object-cover opacity-60"
                />
              </div>

              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 -mt-10">
                  <img
                    src={activeGroup.avatarUrl}
                    alt={activeGroup.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-4 ring-[#070e20] shadow-xl"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold text-white">
                        {activeGroup.name}
                      </h1>
                      {activeGroup.isPrivate ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-semibold">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      ) : (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1 font-semibold">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      {activeGroup.description}
                    </p>
                  </div>
                </div>

                {/* Membership Action Button */}
                <div className="flex items-center gap-2">
                  {canPostAnnouncement && (
                    <button
                      onClick={() => setShowAnnounceModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-semibold transition-colors"
                    >
                      <Megaphone className="w-4 h-4" />
                      <span>Announcement</span>
                    </button>
                  )}

                  {isCurrentMember ? (
                    <button
                      onClick={() => handleLeaveGroup(activeGroup.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 text-xs font-semibold transition-colors"
                      title="Leave Group"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Leave</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinGroup(activeGroup.id)}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-transform hover:scale-105"
                    >
                      <span>Join Community</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Main Area: Split between Announcements & Group Chat */}
            <div className="flex-1 flex overflow-hidden">
              {/* Center: Live Group Discussion Chat */}
              <div className="flex-1 flex flex-col h-full border-r border-slate-800/80 bg-[#030712]">
                <div className="px-4 py-2.5 bg-[#070e20]/60 border-b border-slate-800/60 flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Discussion Room</span>
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {groupMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                      <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
                      <p>No messages yet in this community.</p>
                      <p className="text-slate-600 mt-0.5">
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
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                          <div
                            className={`p-3 rounded-2xl text-xs space-y-1 ${
                              isMe
                                ? 'bg-emerald-600/90 text-white'
                                : 'bg-[#0b1428] border border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[11px] text-emerald-300">
                                {senderMember?.displayName || msg.senderId}
                              </span>
                              {senderMember?.role === 'admin' && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                                  Admin
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 ml-auto font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input */}
                <div className="p-3 bg-[#070e20] border-t border-slate-800/80">
                  {isCurrentMember ? (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Message #${activeGroup.name}...`}
                        value={newMsgText}
                        onChange={(e) => setNewMsgText(e.target.value)}
                        className="flex-1 bg-[#030712] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingMsg || !newMsgText.trim()}
                        className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </form>
                  ) : (
                    <div className="text-center py-2 text-xs text-slate-500">
                      <span>You must join this community to send messages. </span>
                      <button
                        onClick={() => handleJoinGroup(activeGroup.id)}
                        className="text-emerald-400 font-semibold hover:underline ml-1"
                      >
                        Join now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Announcements & Members Sidebar */}
              <div className="w-72 lg:w-80 bg-[#070e20] flex flex-col overflow-y-auto divide-y divide-slate-800/80">
                {/* Announcements section */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                    <span>Announcements</span>
                  </div>

                  {(!activeGroup.announcements || activeGroup.announcements.length === 0) ? (
                    <p className="text-xs text-slate-500 italic">
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
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {ann.content}
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono pt-1">
                          By {ann.authorName} ·{' '}
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Members List section */}
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Members ({activeGroup.members.length})</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeGroup.members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={member.avatarUrl}
                            alt={member.displayName}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <p className="text-xs font-semibold text-white">
                              {member.displayName}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              @{member.userId}
                            </p>
                          </div>
                        </div>

                        {member.role === 'admin' ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Admin
                          </span>
                        ) : member.role === 'moderator' ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                            Mod
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Member</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Select a community from the left to view discussions.
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0b1428] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Create Community</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Community Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Talksy Tech Circle"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#070e20] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  placeholder="What is this community about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#070e20] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="tech, games, design"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-[#070e20] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="grpPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="grpPrivate" className="text-xs text-slate-300 cursor-pointer">
                  Make group private (invite or approval only)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs"
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
          <div className="w-full max-w-md bg-[#0b1428] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <span>Post Group Announcement</span>
              </h3>
              <button
                onClick={() => setShowAnnounceModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostAnnouncement} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Maintenance or Meetup"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  required
                  className="w-full bg-[#070e20] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Content
                </label>
                <textarea
                  placeholder="Details of the announcement..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  rows={3}
                  required
                  className="w-full bg-[#070e20] border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postingAnn || !annTitle.trim() || !annContent.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs"
                >
                  {postingAnn ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
