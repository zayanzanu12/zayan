import React, { useState, useEffect, useCallback } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/chat/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { UserProfileModal } from './components/chat/UserProfileModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LinkedDevicesModal } from './components/chat/LinkedDevicesModal';
import { CallOverlay, CallSession } from './components/chat/CallOverlay';
import { TopNavBar, NavTab } from './components/navigation/TopNavBar';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';
import { SocialFeedView } from './components/feed/SocialFeedView';
import { GroupsView } from './components/groups/GroupsView';
import { FriendsView } from './components/friends/FriendsView';
import { ProfileView } from './components/profile/ProfileView';
import { User, FriendContact, NotificationItem } from './types/chat';
import { api, getStoredToken } from './services/api';
import { Shield, UserPlus, MessageSquare, Users } from 'lucide-react';
import { Logo } from './components/common/Logo';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<FriendContact[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<NavTab>('chats');

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [inspectUser, setInspectUser] = useState<User | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showLinkedDevicesModal, setShowLinkedDevicesModal] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  // Notifications & Friend Requests State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Real-time tracking
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // WebRTC Calling state
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [incomingSignal, setIncomingSignal] = useState<{
    type: 'offer' | 'answer' | 'ice-candidate';
    signalData: any;
  } | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Check stored session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setLoadingInitial(false);
        return;
      }

      try {
        const user = await api.getMe();
        setCurrentUser(user);
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        localStorage.removeItem('zayan_chat_token');
      } finally {
        setLoadingInitial(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch friends list
  const loadFriends = useCallback(async () => {
    if (!currentUser) return;
    try {
      const list = await api.getFriends();
      setFriends(list);

      // Default select first friend on desktop if none selected
      if (!activeFriendId && list.length > 0 && window.innerWidth >= 768) {
        setActiveFriendId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  }, [currentUser, activeFriendId]);

  // Load notifications and pending requests
  const loadNotificationsAndRequests = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [notifs, reqData] = await Promise.all([
        api.getNotifications().catch(() => []),
        api.getFriendRequests().catch(() => ({ incoming: [], outgoing: [] })),
      ]);
      setNotifications(notifs);
      setPendingRequestsCount(reqData.incoming.length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadFriends();
      loadNotificationsAndRequests();
    }
  }, [currentUser, loadFriends, loadNotificationsAndRequests]);

  // Presence heartbeat
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      api.sendHeartbeat().catch(() => {});
    }, 45000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Global SSE listener
  useEffect(() => {
    if (!currentUser) return;
    const token = getStoredToken();
    if (!token) return;

    const eventSource = new EventSource(`/api/events?token=${token}`);

    eventSource.addEventListener('presence_update', (e) => {
      try {
        const { userId, online, lastSeen } = JSON.parse(e.data);
        setFriends((prev) =>
          prev.map((f) => (f.id === userId ? { ...f, online, lastSeen } : f))
        );
      } catch (err) {
        console.error('SSE presence_update error', err);
      }
    });

    eventSource.addEventListener('typing_indicator', (e) => {
      try {
        const { fromUserId, isTyping } = JSON.parse(e.data);
        setTypingUsers((prev) => ({
          ...prev,
          [fromUserId]: isTyping,
        }));
      } catch (err) {
        console.error('SSE typing error', err);
      }
    });

    eventSource.addEventListener('friend_added', (e) => {
      try {
        const newUser: User = JSON.parse(e.data);
        if (newUser.id !== currentUser.id) {
          setFriends((prev) => {
            if (prev.some((f) => f.id === newUser.id)) return prev;
            return [
              ...prev,
              {
                ...newUser,
                unreadCount: 0,
                lastMessage: null,
              },
            ];
          });
        }
      } catch (err) {
        console.error('SSE friend_added error', err);
      }
    });

    eventSource.addEventListener('user_updated', (e) => {
      try {
        const updated: User = JSON.parse(e.data);
        if (updated.id === currentUser.id) {
          setCurrentUser(updated);
        }
        setFriends((prev) =>
          prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))
        );
      } catch (err) {
        console.error('SSE user_updated error', err);
      }
    });

    eventSource.addEventListener('user_deleted', (e) => {
      try {
        const { userId } = JSON.parse(e.data);
        setFriends((prev) => prev.filter((f) => f.id !== userId));
        if (activeFriendId === userId) {
          setActiveFriendId(null);
        }
      } catch (err) {
        console.error('SSE user_deleted error', err);
      }
    });

    eventSource.addEventListener('new_message', () => {
      loadFriends();
    });

    // Notifications and Community SSE events
    eventSource.addEventListener('new_notification', (e) => {
      try {
        const notif: NotificationItem = JSON.parse(e.data);
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notif.id)) return prev;
          return [notif, ...prev];
        });
        setToastNotification(`${notif.title}: ${notif.body}`);
        setTimeout(() => setToastNotification(null), 3500);
      } catch (err) {
        console.error('SSE new_notification error', err);
      }
    });

    eventSource.addEventListener('friend_request_received', () => {
      setPendingRequestsCount((prev) => prev + 1);
    });

    // Broadcast community events locally
    const relayEvent = (type: string, dataStr: string) => {
      try {
        const payload = JSON.parse(dataStr);
        window.dispatchEvent(
          new CustomEvent('talksy_sse_event', { detail: { type, payload } })
        );
      } catch (e) {
        // ignore
      }
    };

    eventSource.addEventListener('new_post', (e) => relayEvent('new_post', e.data));
    eventSource.addEventListener('post_updated', (e) => relayEvent('post_updated', e.data));
    eventSource.addEventListener('post_deleted', (e) => relayEvent('post_deleted', e.data));
    eventSource.addEventListener('new_story', (e) => relayEvent('new_story', e.data));
    eventSource.addEventListener('group_created', (e) => relayEvent('group_created', e.data));
    eventSource.addEventListener('group_updated', (e) => relayEvent('group_updated', e.data));
    eventSource.addEventListener('new_group_message', (e) => relayEvent('new_group_message', e.data));

    // WebRTC Calling Listeners
    eventSource.addEventListener('incoming_call', (e) => {
      try {
        const { callId, callType, caller } = JSON.parse(e.data);
        setCallSession({
          callId,
          callType,
          isIncoming: true,
          peerUser: caller,
          status: 'ringing',
        });
      } catch (err) {
        console.error('SSE incoming_call error', err);
      }
    });

    eventSource.addEventListener('call_accepted', (e) => {
      try {
        const { callId } = JSON.parse(e.data);
        setCallSession((prev) => (prev && prev.callId === callId ? { ...prev, status: 'connected' } : prev));
      } catch (err) {
        console.error('SSE call_accepted error', err);
      }
    });

    eventSource.addEventListener('call_rejected', (e) => {
      try {
        const { reason } = JSON.parse(e.data);
        setToastNotification(`Call declined (${reason})`);
        setTimeout(() => setToastNotification(null), 3500);
        setCallSession(null);
      } catch (err) {
        console.error('SSE call_rejected error', err);
      }
    });

    eventSource.addEventListener('call_ended', () => {
      setCallSession(null);
    });

    eventSource.addEventListener('call_signal', (e) => {
      try {
        const signal = JSON.parse(e.data);
        setIncomingSignal(signal);
      } catch (err) {
        console.error('SSE call_signal error', err);
      }
    });

    eventSource.addEventListener('device_revoked', (e) => {
      try {
        const data = JSON.parse(e.data);
        const myToken = getStoredToken();
        if (data.token === myToken) {
          handleLogout();
        }
      } catch (err) {
        console.error('SSE device_revoked error', err);
      }
    });

    eventSource.addEventListener('device_linked', (e) => {
      try {
        const { device } = JSON.parse(e.data);
        setToastNotification(`Connected to ${device.deviceName}`);
        setTimeout(() => setToastNotification(null), 3500);
      } catch (err) {
        console.error('SSE device_linked error', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [currentUser, activeFriendId, loadFriends]);

  const handleStartCall = async (receiver: User, callType: 'voice' | 'video') => {
    try {
      const res = await api.initiateCall(receiver.id, callType);
      setCallSession({
        callId: res.callId,
        callType,
        isIncoming: false,
        peerUser: receiver,
        status: 'ringing',
      });
    } catch (err: any) {
      setToastNotification(err.message || 'Could not initiate call');
      setTimeout(() => setToastNotification(null), 3500);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveFriendId(null);
    setShowProfileModal(false);
    setShowAdminDashboard(false);
  };

  const handleOpenMyProfile = () => {
    if (currentUser) {
      setInspectUser(currentUser);
      setActiveTab('profile');
    }
  };

  const handleInspectFriend = (friend: User) => {
    setInspectUser(friend);
    setShowProfileModal(true);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen w-full bg-[#060b17] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" showText={false} glow={true} />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 animate-pulse">
            Loading Talksy...
          </span>
        </div>
      </div>
    );
  }

  // If not logged in, render the login page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const activeFriend = friends.find((f) => f.id === activeFriendId);
  const totalUnreadMessages = friends.reduce((acc, f) => acc + (f.unreadCount || 0), 0);

  return (
    <div className="h-screen w-full bg-[#030712] flex flex-col overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <TopNavBar
        currentTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'profile') {
            setInspectUser(currentUser);
          }
        }}
        currentUser={currentUser}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        pendingRequestsCount={pendingRequestsCount}
        unreadMessagesCount={totalUnreadMessages}
        onOpenNotifications={() => setShowNotificationDrawer(true)}
        onOpenProfile={handleOpenMyProfile}
        onOpenAdmin={() => setShowAdminDashboard(true)}
        onOpenLinkedDevices={() => setShowLinkedDevicesModal(true)}
        onLogout={handleLogout}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full overflow-hidden flex relative">
        {/* VIEW 1: Chats (1:1 and Direct Messaging) */}
        {activeTab === 'chats' && (
          <div className="h-full w-full flex overflow-hidden">
            {/* Sidebar: Visible on desktop, or on mobile when no conversation is active */}
            <div
              className={`h-full ${
                activeFriendId ? 'hidden md:flex' : 'flex'
              } w-full md:w-auto shrink-0`}
            >
              <Sidebar
                currentUser={currentUser}
                friends={friends}
                activeFriendId={activeFriendId}
                onSelectFriend={(id) => setActiveFriendId(id)}
                onOpenProfile={handleOpenMyProfile}
                onOpenNewChat={() => setActiveTab('friends')}
                typingUsers={typingUsers}
              />
            </div>

            {/* Chat Area: Visible on desktop, or on mobile when a chat is selected */}
            <div
              className={`h-full flex-1 ${
                !activeFriendId ? 'hidden md:flex' : 'flex'
              } flex-col`}
            >
              {activeFriend ? (
                <ChatArea
                  currentUser={currentUser}
                  activeFriend={activeFriend}
                  onBackToSidebar={() => setActiveFriendId(null)}
                  onOpenProfile={handleInspectFriend}
                  isTyping={Boolean(typingUsers[activeFriend.id])}
                  onStartVoiceCall={() => handleStartCall(activeFriend, 'voice')}
                  onStartVideoCall={() => handleStartCall(activeFriend, 'video')}
                />
              ) : (
                /* Compact, Elegant Welcome Screen */
                <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-[#07111F] select-none relative">
                  {/* Subtle, soft green ambient aura */}
                  <div className="absolute w-72 h-72 bg-[#00D68F]/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Compact ~64px logo with subtle green glow */}
                  <div className="mb-4 relative z-10">
                    <Logo size="lg" showText={false} glow={true} animated={false} />
                  </div>

                  <h2 className="text-2xl font-bold text-[#E8F0FA] tracking-tight relative z-10 mb-1.5">
                    Welcome to Talksy
                  </h2>
                  <p className="text-xs text-[#94A3B8] max-w-sm leading-relaxed relative z-10 mb-6">
                    Connect privately with end-to-end encryption. Start a conversation or select a chat from the sidebar.
                  </p>

                  {/* Normal Start Chat Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (friends.length > 0) {
                        setActiveFriendId(friends[0].id);
                      } else {
                        setActiveTab('friends');
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-semibold text-xs flex items-center gap-2 shadow-lg shadow-[#00D68F]/20 transition-all cursor-pointer relative z-10 mb-5 active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Start a conversation</span>
                  </button>

                  {/* Helpful Quick Links: Friends, Groups, Settings */}
                  <div className="flex items-center gap-2 relative z-10 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('friends')}
                      className="px-3 py-1.5 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] border border-[#1E3042] text-[#E8F0FA] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#00D68F]" />
                      <span>Friends</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('groups')}
                      className="px-3 py-1.5 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] border border-[#1E3042] text-[#E8F0FA] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-[#00D68F]" />
                      <span>Groups</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="px-3 py-1.5 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] border border-[#1E3042] text-[#E8F0FA] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-[#00D68F]" />
                      <span>Privacy &amp; Security</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: Social Feed & Stories */}
        {activeTab === 'feed' && (
          <SocialFeedView
            currentUser={currentUser}
            onOpenUserProfile={handleInspectFriend}
          />
        )}

        {/* VIEW 3: Groups & Communities */}
        {activeTab === 'groups' && (
          <GroupsView
            currentUser={currentUser}
            onOpenDirectChat={(friendId) => {
              setActiveFriendId(friendId);
              setActiveTab('chats');
            }}
          />
        )}

        {/* VIEW 4: Friends System */}
        {activeTab === 'friends' && (
          <FriendsView
            currentUser={currentUser}
            onSelectChatFriend={(friendId) => {
              setActiveFriendId(friendId);
              setActiveTab('chats');
            }}
            onOpenProfile={handleInspectFriend}
          />
        )}

        {/* VIEW 5: Enhanced Profile & Privacy */}
        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            inspectedUserId={inspectUser?.id || currentUser.id}
            onUserUpdated={(updated) => {
              if (updated.id === currentUser.id) {
                setCurrentUser(updated);
              }
              setFriends((prev) =>
                prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))
              );
            }}
            onOpenLinkedDevices={() => setShowLinkedDevicesModal(true)}
            onSelectChatFriend={(friendId) => {
              setActiveFriendId(friendId);
              setActiveTab('chats');
            }}
          />
        )}
      </main>

      {/* Slide-Over Notification Drawer */}
      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
        notifications={notifications}
        currentUser={currentUser}
        onNotificationsUpdated={(updated) => setNotifications(updated)}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setShowNotificationDrawer(false);
        }}
      />

      {/* WebRTC Voice & Video Call Overlay */}
      {callSession && (
        <CallOverlay
          currentUser={currentUser}
          session={callSession}
          onEndCall={() => setCallSession(null)}
          incomingSignal={incomingSignal}
        />
      )}

      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0b1428] border border-emerald-500/40 text-emerald-300 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* User Profile Modal (Quick Inspector) */}
      {showProfileModal && inspectUser && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setInspectUser(null);
          }}
          user={inspectUser}
          currentUser={currentUser}
          onOpenLinkedDevices={() => setShowLinkedDevicesModal(true)}
          onUserUpdated={(updated) => {
            if (updated.id === currentUser.id) {
              setCurrentUser(updated);
            }
            setFriends((prev) =>
              prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))
            );
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Linked Devices Modal */}
      {showLinkedDevicesModal && (
        <LinkedDevicesModal
          isOpen={showLinkedDevicesModal}
          onClose={() => setShowLinkedDevicesModal(false)}
          onDeviceRevoked={(isCurrent) => {
            if (isCurrent) {
              handleLogout();
            }
          }}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdminDashboard && currentUser.role === 'admin' && (
        <AdminDashboard
          currentUser={currentUser}
          onClose={() => setShowAdminDashboard(false)}
          onUsersModified={() => loadFriends()}
        />
      )}
    </div>
  );
}
