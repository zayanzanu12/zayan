import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  UserCheck,
  Check,
  X,
  Search,
  Compass,
  ShieldAlert,
  MessageSquare,
  Users,
  Shield,
  Ban,
  UserMinus,
} from 'lucide-react';
import { FriendContact, FriendRequest, User } from '../../types/chat';
import { api } from '../../services/api';

interface FriendsViewProps {
  currentUser: User;
  onSelectChatFriend: (friendId: string) => void;
  onOpenProfile: (user: User) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  onSelectChatFriend,
  onOpenProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'suggestions' | 'friends' | 'blocked'>('requests');
  const [incomingRequests, setIncomingRequests] = useState<(FriendRequest & { fromUser?: User })[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendContact[]>([]);
  const [friendsList, setFriendsList] = useState<FriendContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [reqData, suggData, friends] = await Promise.all([
        api.getFriendRequests(),
        api.getFriendSuggestions(),
        api.getFriends(),
      ]);
      setIncomingRequests(reqData.incoming);
      setOutgoingRequests(reqData.outgoing);
      setSuggestions(suggData);
      setFriendsList(friends);
    } catch (err) {
      console.error('Failed to load friends data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.acceptFriendRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setActionFeedback('Friend request accepted!');
      setTimeout(() => setActionFeedback(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await api.declineFriendRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      alert(err.message || 'Failed to decline request');
    }
  };

  const handleSendRequest = async (toUserId: string) => {
    try {
      await api.sendFriendRequest(toUserId);
      setActionFeedback(`Friend request sent to @${toUserId}!`);
      setTimeout(() => setActionFeedback(null), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    }
  };

  const handleToggleFollow = async (userId: string) => {
    try {
      const res = await api.toggleFollow(userId);
      setSuggestions((prev) =>
        prev.map((s) => (s.id === userId ? { ...s, isFollowing: res.isFollowing } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update follow status');
    }
  };

  const handleToggleBlock = async (userId: string) => {
    if (!confirm('Are you sure you want to change block status for this user?')) return;
    try {
      await api.toggleBlock(userId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to block/unblock user');
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#07111F] p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-[#E8F0FA] flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#00D68F]" />
              <span>Friends & Community Network</span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Connect with authorized Talksy members, manage requests, and explore mutual connections.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111E2D] border border-[#1E3042] rounded-2xl pl-9 pr-3 py-2 text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F]"
            />
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {actionFeedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 font-medium flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'requests'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Friend Requests</span>
            {incomingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'suggestions'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Suggestions & Discover</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'friends'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>My Friends ({friendsList.length})</span>
          </button>
        </div>

        {/* Tab 1: Incoming & Outgoing Friend Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Incoming Requests ({incomingRequests.length})
              </h2>

              {incomingRequests.length === 0 ? (
                <div className="bg-[#070e20] border border-slate-800/80 rounded-3xl p-8 text-center text-slate-400 text-xs">
                  <UserPlus className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">No pending friend requests</p>
                  <p className="text-slate-500 mt-1">When someone sends you a friend request, it will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-[#070e20] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg"
                    >
                      <div
                        onClick={() => req.fromUser && onOpenProfile(req.fromUser)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <img
                          src={req.fromUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fromUserId}`}
                          alt={req.fromUser?.displayName || req.fromUserId}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/30 group-hover:scale-105 transition-transform"
                        />
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {req.fromUser?.displayName || req.fromUserId}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">@{req.fromUserId}</p>
                          <span className="text-[10px] text-slate-500">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-all hover:scale-105 shadow"
                          title="Accept Request"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Sent Requests ({outgoingRequests.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-[#070e20] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="text-white font-semibold">@{req.toUserId}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Sent on {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold text-[11px]">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Suggestions & Discover */}
        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Suggested People in Talksy
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {suggestions
                .filter(
                  (s) =>
                    !searchQuery ||
                    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    s.id.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((person) => {
                  const hasSent = outgoingRequests.some((r) => r.toUserId === person.id);

                  return (
                    <div
                      key={person.id}
                      className="bg-[#070e20] border border-slate-800/80 rounded-3xl p-5 flex flex-col items-center text-center shadow-xl hover:border-slate-700 transition-all"
                    >
                      <img
                        src={person.avatarUrl}
                        alt={person.displayName}
                        onClick={() => onOpenProfile(person)}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500/30 cursor-pointer hover:scale-105 transition-transform mb-3"
                      />
                      <h3
                        onClick={() => onOpenProfile(person)}
                        className="text-sm font-bold text-white hover:text-emerald-400 cursor-pointer"
                      >
                        {person.displayName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">@{person.id}</p>

                      <div className="mt-2 text-[11px] text-emerald-400 font-medium">
                        {person.mutualFriendsCount || 1} mutual connection
                      </div>

                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 max-w-[200px]">
                        {person.bio || 'Talksy community member'}
                      </p>

                      <div className="w-full flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-800">
                        {hasSent ? (
                          <span className="text-xs text-amber-400 font-medium">
                            Request Sent
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(person.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-all hover:scale-105"
                          >
                            <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Add Friend</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleFollow(person.id)}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                            person.isFollowing
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-transparent text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
                          }`}
                        >
                          {person.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 3: My Friends List */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Friends ({friendsList.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {friendsList
                .filter(
                  (f) =>
                    !searchQuery ||
                    f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    f.id.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-[#070e20] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg"
                  >
                    <div
                      onClick={() => onOpenProfile(friend)}
                      className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={friend.avatarUrl}
                          alt={friend.displayName}
                          className="w-12 h-12 rounded-full object-cover ring-1 ring-slate-700 group-hover:scale-105 transition-transform"
                        />
                        {friend.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#070e20]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {friend.displayName}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">@{friend.id}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {friend.status}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onSelectChatFriend(friend.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-all hover:scale-105"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>

                      <button
                        onClick={() => handleToggleBlock(friend.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Block user"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
