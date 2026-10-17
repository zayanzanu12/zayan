import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Check,
  CheckCheck,
  Mic,
  Image,
  FileText,
  UserPlus,
} from 'lucide-react';
import { User, FriendContact } from '../../types/chat';

interface SidebarProps {
  currentUser: User;
  friends: FriendContact[];
  activeFriendId: string | null;
  onSelectFriend: (friendId: string) => void;
  onOpenProfile: () => void;
  onOpenNewChat: () => void;
  typingUsers: Record<string, boolean>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  friends,
  activeFriendId,
  onSelectFriend,
  onOpenProfile,
  onOpenNewChat,
  typingUsers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFriends = friends.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.displayName.toLowerCase().includes(term) ||
      f.id.toLowerCase().includes(term) ||
      (f.status && f.status.toLowerCase().includes(term))
    );
  });

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full md:w-[340px] h-full flex flex-col bg-[#0D1B2A] border-r border-[#1E3042] shrink-0 select-none">
      {/* Search Input Bar with New Chat (+) Button beside it */}
      <div className="p-3 bg-[#0D1B2A] border-b border-[#1E3042] flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 bg-[#111E2D] border border-[#1E3042] rounded-xl text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] transition-colors"
          />
        </div>

        {/* New Chat / Add Friend (+) Action Button */}
        <button
          type="button"
          onClick={onOpenNewChat}
          title="Start new conversation / Add friend"
          className="w-9 h-9 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E3042]/50">
        {filteredFriends.map((friend) => {
          const isActive = friend.id === activeFriendId;
          const isTyping = Boolean(typingUsers[friend.id]);
          const lastMsg = friend.lastMessage;
          const isSelfSender = lastMsg?.senderId === currentUser.id;

          return (
            <button
              key={friend.id}
              type="button"
              onClick={() => onSelectFriend(friend.id)}
              className={`w-full p-3 flex items-center gap-3 text-left transition-colors cursor-pointer relative ${
                isActive
                  ? 'bg-[#111E2D] border-l-2 border-[#00D68F]'
                  : 'hover:bg-[#111E2D]/60 border-l-2 border-transparent'
              }`}
            >
              {/* Avatar + Online Indicator */}
              <div className="relative shrink-0">
                <img
                  src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`}
                  alt={friend.displayName}
                  className="w-11 h-11 rounded-full object-cover border border-[#1E3042] shadow-sm"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#0D1B2A] ${
                    friend.online ? 'bg-[#00D68F]' : 'bg-slate-600'
                  }`}
                />
              </div>

              {/* Chat details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-[#E8F0FA] truncate">
                    {friend.displayName}
                  </span>
                  {lastMsg && (
                    <span className="text-[10px] text-[#94A3B8] shrink-0 font-mono">
                      {formatMessageTime(lastMsg.createdAt)}
                    </span>
                  )}
                </div>

                {/* Subtitle / Last message preview */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[#94A3B8] truncate flex items-center gap-1">
                    {isTyping ? (
                      <span className="text-[#00D68F] font-semibold animate-pulse">
                        typing...
                      </span>
                    ) : lastMsg ? (
                      <>
                        {isSelfSender && (
                          <span className="shrink-0 inline-flex items-center">
                            {lastMsg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#00D68F]" />
                            ) : lastMsg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#94A3B8]" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-[#94A3B8]" />
                            )}
                          </span>
                        )}

                        {lastMsg.mediaType === 'voice' ? (
                          <span className="inline-flex items-center gap-1 text-[#E8F0FA]">
                            <Mic className="w-3 h-3 text-[#00D68F]" />
                            Voice Note ({lastMsg.voiceDuration || 0}s)
                          </span>
                        ) : lastMsg.mediaType === 'image' ? (
                          <span className="inline-flex items-center gap-1 text-[#E8F0FA]">
                            <Image className="w-3 h-3 text-[#00D68F]" />
                            Photo {lastMsg.text ? `· ${lastMsg.text}` : ''}
                          </span>
                        ) : lastMsg.mediaType === 'gif' ? (
                          <span className="inline-flex items-center gap-1 text-[#E8F0FA]">
                            <Image className="w-3 h-3 text-[#00D68F]" />
                            GIF animation
                          </span>
                        ) : lastMsg.mediaType === 'file' ? (
                          <span className="inline-flex items-center gap-1 text-[#E8F0FA]">
                            <FileText className="w-3 h-3 text-[#00D68F]" />
                            Document
                          </span>
                        ) : (
                          <span className="truncate">{lastMsg.text}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[#94A3B8] italic truncate">
                        {friend.status || 'Tap to start conversation'}
                      </span>
                    )}
                  </div>

                  {/* Unread Message Badge */}
                  {friend.unreadCount > 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-[#00D68F] text-[#07111F] font-bold text-[10px] min-w-[18px] text-center">
                      {friend.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Compact Empty State */}
        {filteredFriends.length === 0 && (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#111E2D] border border-[#1E3042] flex items-center justify-center text-[#94A3B8] mb-2.5">
              <MessageSquare className="w-4 h-4 text-[#00D68F]" />
            </div>
            <p className="text-xs font-semibold text-[#E8F0FA] mb-1">
              {searchTerm ? `No matches for "${searchTerm}"` : 'No conversations yet'}
            </p>
            <p className="text-[11px] text-[#94A3B8] max-w-[200px] mb-3 leading-relaxed">
              {searchTerm ? 'Check your spelling or try another name.' : 'Start a new conversation or add friends to begin.'}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={onOpenNewChat}
                className="px-3.5 py-1.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Friend</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Status Bar Bottom Footer */}
      <div className="p-3 bg-[#0D1B2A] border-t border-[#1E3042] flex items-center justify-between text-xs text-[#94A3B8]">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-[#00D68F]" />
          <span className="truncate font-medium text-[#E8F0FA]">
            {currentUser.displayName} <span className="font-mono text-[#94A3B8]">(@{currentUser.id})</span>
          </span>
        </div>
        <button
          onClick={onOpenProfile}
          className="text-[#00D68F] hover:text-[#00B87A] text-[11px] font-semibold shrink-0 cursor-pointer"
        >
          My Profile
        </button>
      </div>
    </div>
  );
};
