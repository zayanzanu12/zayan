import React from 'react';
import { X, CheckCheck, Bell, UserPlus, Heart, MessageSquare, Users, Radio } from 'lucide-react';
import { NotificationItem, User } from '../../types/chat';
import { api } from '../../services/api';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  currentUser: User;
  onNotificationsUpdated: (updated: NotificationItem[]) => void;
  onNavigateToTab?: (tab: 'chats' | 'feed' | 'groups' | 'friends') => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  currentUser: _currentUser,
  onNotificationsUpdated,
  onNavigateToTab,
}) => {
  if (!isOpen) return null;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      onNotificationsUpdated(updated);
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      const updated = notifications.map((n) => ({ ...n, read: true }));
      onNotificationsUpdated(updated);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus className="w-4 h-4 text-[#00D68F]" />;
      case 'like':
        return <Heart className="w-4 h-4 text-[#F87171] fill-[#F87171]" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case 'group_invite':
      case 'group_announcement':
        return <Users className="w-4 h-4 text-amber-400" />;
      default:
        return <Radio className="w-4 h-4 text-[#00D68F]" />;
    }
  };

  const uniqueNotifications = notifications.filter(
    (n, idx, self) => idx === self.findIndex((item) => item.id === n.id)
  );
  const unreadCount = uniqueNotifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0D1B2A] border-l border-[#1E3042] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#1E3042] flex items-center justify-between bg-[#07111F]">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#00D68F]" />
              <h2 className="font-bold text-[#E8F0FA] text-base">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#00D68F]/20 text-[#00D68F] text-xs font-mono font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#00D68F] hover:bg-[#111E2D] transition-colors text-xs flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Read all</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1E3042]/50 p-2">
            {notifications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#94A3B8]">
                <Bell className="w-10 h-10 stroke-[1.5] mb-3 text-[#94A3B8]/60" />
                <p className="text-sm font-semibold text-[#E8F0FA]">No notifications yet</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Friend requests, likes, comments, and group notices will appear here.
                </p>
              </div>
            ) : (
              uniqueNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.read) handleMarkAsRead(item.id);
                    if (item.type === 'friend_request' || item.type === 'friend_accepted') {
                      onNavigateToTab?.('friends');
                      onClose();
                    } else if (item.type === 'like' || item.type === 'comment') {
                      onNavigateToTab?.('feed');
                      onClose();
                    } else if (item.type === 'group_announcement' || item.type === 'group_invite') {
                      onNavigateToTab?.('groups');
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 my-1 ${
                    item.read
                      ? 'bg-transparent hover:bg-[#111E2D]/50 text-[#94A3B8]'
                      : 'bg-[#111E2D] border border-[#00D68F]/30 text-[#E8F0FA]'
                  }`}
                >
                  {/* Actor Avatar + Type Icon Badge */}
                  <div className="relative shrink-0">
                    <img
                      src={item.actorAvatar}
                      alt={item.actorName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-[#1E3042]"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#07111F] ring-1 ring-[#1E3042] shadow">
                      {getIcon(item.type)}
                    </div>
                  </div>

                  {/* Body text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug">
                      <span className="text-[#E8F0FA]">{item.actorName}</span>{' '}
                      <span className="text-[#94A3B8] font-normal">{item.title.toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-2">{item.body}</p>
                    <span className="text-[10px] text-[#94A3B8] mt-1.5 block font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} · {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-[#00D68F] shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
