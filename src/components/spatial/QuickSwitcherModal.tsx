import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MessageSquare,
  Users,
  Sparkles,
  Bookmark,
  Bell,
  Shield,
  Laptop,
  Command,
  ArrowRight,
  X,
} from 'lucide-react';
import { User, FriendContact, Group } from '../../types/chat';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  friends: FriendContact[];
  groups?: Group[];
  currentUser?: User;
  onSelectChat?: (userId: string) => void;
  onSelectFriend?: (userId: string) => void;
  onSelectGroup?: (groupId: string) => void;
  onOpenZappAi?: () => void;
  onOpenAi?: () => void;
  onOpenBookmarks?: () => void;
  onOpenReminders?: () => void;
  onOpenAdmin?: () => void;
  onOpenLinkedDevices?: () => void;
  onSwitchLayout?: (preset: 'spatial' | 'grid' | 'focus' | 'mobile') => void;
  onSelectTab?: (tab: string) => void;
}

export const QuickSwitcherModal: React.FC<QuickSwitcherProps> = ({
  isOpen,
  onClose,
  friends,
  groups = [],
  currentUser,
  onSelectChat,
  onSelectFriend,
  onSelectGroup,
  onOpenZappAi,
  onOpenAi,
  onOpenBookmarks,
  onOpenReminders,
  onOpenAdmin,
  onOpenLinkedDevices,
  onSwitchLayout,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSelectFriend = onSelectFriend || onSelectChat || (() => {});
  const handleOpenAi = onOpenAi || onOpenZappAi || (() => {});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const lowerQuery = query.toLowerCase().trim();

  // Search items list
  interface SwitcherItem {
    id: string;
    type: 'chat' | 'group' | 'action' | 'ai';
    title: string;
    subtitle?: string;
    icon: any;
    badge?: string;
    action: () => void;
  }

  const items: SwitcherItem[] = [
    {
      id: 'zapp_ai',
      type: 'ai',
      title: 'Zapp AI 2.0 Assistant',
      subtitle: 'Ask questions, summarize conversations, rewrite messages',
      icon: Sparkles,
      badge: 'AI Engine',
      action: () => {
        handleOpenAi();
        onClose();
      },
    },
    ...friends
      .filter((f) => currentUser?.role === 'admin' || (f.role !== 'admin' && f.id !== 'admin'))
      .map((f) => ({
        id: `chat_${f.id}`,
        type: 'chat' as const,
        title: f.displayName,
        subtitle: `@${f.id} · ${f.online ? 'Online' : 'Offline'}`,
        icon: MessageSquare,
        badge: f.unreadCount > 0 ? `${f.unreadCount} unread` : undefined,
        action: () => {
          handleSelectFriend(f.id);
          onClose();
        },
      })),
    ...groups.map((g) => ({
      id: `group_${g.id}`,
      type: 'group' as const,
      title: g.name,
      subtitle: `${g.members?.length || 0} members · Group`,
      icon: Users,
      badge: 'Group',
      action: () => {
        if (onSelectGroup) {
          onSelectGroup(g.id);
        } else {
          handleSelectFriend(g.id);
        }
        onClose();
      },
    })),
    {
      id: 'bookmarks',
      type: 'action',
      title: 'Saved & Bookmarked Messages',
      subtitle: 'Jump to starred notes and bookmarks',
      icon: Bookmark,
      action: () => {
        onOpenBookmarks?.();
        onClose();
      },
    },
    {
      id: 'reminders',
      type: 'action',
      title: 'Message Reminders & Alarms',
      subtitle: 'Scheduled message notifications',
      icon: Bell,
      action: () => {
        onOpenReminders?.();
        onClose();
      },
    },
    {
      id: 'devices',
      type: 'action',
      title: 'Linked Devices & Sessions',
      subtitle: 'Manage active Windows, Android, and Web sessions',
      icon: Laptop,
      action: () => {
        onOpenLinkedDevices?.();
        onClose();
      },
    },
  ];

  if (currentUser?.role === 'admin' && onOpenAdmin) {
    items.push({
      id: 'admin',
      type: 'action',
      title: 'Admin Command Console',
      subtitle: 'Direct database management & system security',
      icon: Shield,
      badge: 'Admin',
      action: () => {
        onOpenAdmin();
        onClose();
      },
    });
  }

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(lowerQuery)) ||
      (item.badge && item.badge.toLowerCase().includes(lowerQuery))
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-90 bg-black/80 backdrop-blur-md flex items-start justify-center pt-20 px-4 animate-in fade-in select-none">
      <div className="bg-[#0D1E18] border border-[#294438] rounded-3xl w-full max-w-xl shadow-2xl shadow-emerald-950/60 overflow-hidden animate-in zoom-in-95 ring-1 ring-[#00C98D]/20">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#294438] bg-[#142A22]/50">
          <Search className="w-5 h-5 text-[#00C98D] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type to jump to chats, groups, Zapp AI, actions..."
            className="flex-1 bg-transparent border-0 text-[#F4FFF9] text-sm placeholder-[#91A99C] focus:outline-none focus:ring-0"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-[#071310] border border-[#294438] text-[10px] font-mono text-[#91A99C]">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#91A99C]">
              No chats, groups or actions found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#142A22] text-[#F4FFF9] border border-[#00C98D]/30 shadow-sm'
                      : 'text-[#91A99C] hover:bg-[#142A22]/60 hover:text-[#F4FFF9]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'ai'
                          ? 'bg-[#00C98D]/20 text-[#63F5C0] border border-[#00C98D]/40'
                          : isSelected
                          ? 'bg-[#00C98D]/15 text-[#00C98D]'
                          : 'bg-[#071310] text-[#91A99C]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#F4FFF9] truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#00C98D]/15 text-[#63F5C0] border border-[#00C98D]/30 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-[#91A99C] truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-opacity shrink-0 ${
                      isSelected ? 'opacity-100 text-[#00C98D]' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#071310] border-t border-[#294438] flex items-center justify-between text-[11px] text-[#91A99C] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-[#00C98D]">ZappChat 2.0 Quick Switcher</span>
        </div>
      </div>
    </div>
  );
};
