import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  CircleDot,
  Users,
  User as UserIcon,
  Bell,
  Shield,
  Laptop,
  LogOut,
  ChevronDown,
  Layers,
  Bookmark,
  Lock,
  Search,
  Sparkles,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { User } from '../../types/chat';

export type NavTab = 'chats' | 'status' | 'groups' | 'feed' | 'friends' | 'profile';

interface TopNavBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User;
  unreadNotificationsCount: number;
  pendingRequestsCount: number;
  unreadMessagesCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onOpenLinkedDevices: () => void;
  onLogout: () => void;
  onOpenQuickSwitcher?: () => void;
  onOpenBookmarks?: () => void;
  onLockApp?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  unreadNotificationsCount,
  pendingRequestsCount,
  unreadMessagesCount,
  onOpenNotifications,
  onOpenProfile,
  onOpenAdmin,
  onOpenLinkedDevices,
  onLogout,
  onOpenQuickSwitcher,
  onOpenBookmarks,
  onLockApp,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      id: 'chats' as NavTab,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null,
    },
    {
      id: 'status' as NavTab,
      label: 'Status',
      icon: CircleDot,
    },
    {
      id: 'groups' as NavTab,
      label: 'Groups',
      icon: Users,
    },
  ];

  return (
    <header className="h-16 w-full bg-[#0D1E18] border-b border-[#294438] px-3 md:px-6 flex items-center justify-between shrink-0 select-none z-30 shadow-md">
      {/* Brand Zone */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => onSelectTab('chats')}
          className="cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Logo size="sm" showText={true} glow={false} />
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#00C98D]/15 text-[#63F5C0] border border-[#00C98D]/30 text-[10px] font-mono font-bold">
            v2.0 PRO
          </span>
        </div>
      </div>

      {/* Navigation Zone */}
      <nav className="flex items-center gap-1 md:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#00C98D]/15 text-[#63F5C0] border border-[#00C98D]/40 shadow-sm'
                  : 'text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#00C98D]' : 'text-[#91A99C]'}`} />
              <span className="hidden sm:inline">{item.label}</span>

              {item.badge && (
                <span className="w-4 h-4 rounded-full bg-[#00C98D] text-[#071310] text-[10px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Action Zone */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Quick Switcher Trigger */}
        {onOpenQuickSwitcher && (
          <button
            onClick={onOpenQuickSwitcher}
            className="hidden sm:flex items-center gap-1.5 p-2 rounded-xl text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22] transition-colors cursor-pointer text-xs"
            title="Open Quick Switcher"
          >
            <Search className="w-4 h-4 text-[#00C98D]" />
            <span className="hidden md:inline text-xs">Search</span>
          </button>
        )}

        {/* Saved Bookmarks */}
        {onOpenBookmarks && (
          <button
            onClick={onOpenBookmarks}
            className="p-2 rounded-xl text-[#91A99C] hover:text-[#00C98D] hover:bg-[#142A22] transition-colors cursor-pointer"
            title="Saved & Bookmarked Messages"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        )}

        {/* Biometric App Lock */}
        {onLockApp && (
          <button
            onClick={onLockApp}
            className="p-2 rounded-xl text-[#91A99C] hover:text-amber-400 hover:bg-[#142A22] transition-colors cursor-pointer"
            title="Lock Workspace (Biometrics / PIN)"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22] transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F87171] text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#0D1E18]">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* Quick User Avatar & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#142A22] transition-colors cursor-pointer"
          >
            <img
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`}
              alt={currentUser.displayName}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-[#00C98D]/40"
            />
            <span className="hidden lg:inline text-xs font-semibold text-[#F4FFF9] max-w-[90px] truncate">
              {currentUser.displayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#91A99C]" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0D1B2A] border border-[#1E3042] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-[#1E3042] mb-1">
                <p className="text-xs font-semibold text-[#E8F0FA] truncate">
                  {currentUser.displayName}
                </p>
                <p className="text-[11px] text-[#94A3B8] font-mono">@{currentUser.id}</p>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenProfile();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-[#00D68F]" />
                <span>My Profile & Settings</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenLinkedDevices();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
              >
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>Linked Devices</span>
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Admin Console</span>
                </button>
              )}

              <div className="my-1 border-t border-[#1E3042]" />

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#F87171] hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
