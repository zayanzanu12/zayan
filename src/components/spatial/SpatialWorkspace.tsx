import React, { useState, useRef, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  Plus,
  LayoutGrid,
  Layers,
  Smartphone,
  Sparkles,
  Move,
  MessageSquare,
  Bookmark,
  Bell,
  Search,
  Shield,
  Laptop,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { User, Message, FriendContact, Group } from '../../types/chat';
import { ChatArea } from '../chat/ChatArea';

export type WorkspaceLayoutMode = 'spatial' | 'grid' | 'focus' | 'mobile';

export interface FloatingWindow {
  id: string; // userId or groupId or 'zapp_ai'
  title: string;
  avatarUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

export interface SpatialWorkspaceProps {
  currentUser: User;
  friends: FriendContact[];
  groups?: Group[];
  activeFriendId: string | null;
  onSelectFriend: (id: string | null) => void;
  onOpenProfile?: (user: User) => void;
  onStartVoiceCall?: (targetUser: User) => void;
  onStartVideoCall?: (targetUser: User) => void;
  onStartCall?: (type: 'voice' | 'video', targetUser: User) => void;
  layoutMode?: WorkspaceLayoutMode;
  onChangeLayoutMode?: (mode: WorkspaceLayoutMode) => void;
  onOpenQuickSwitcher?: () => void;
  onOpenBookmarks?: () => void;
  onOpenMiniMode?: () => void;
  onOpenAiTopics?: (convId: string, convName: string) => void;
  onOpenMediaCollection?: (convId: string, title: string) => void;
  onOpenFilePreview?: (file: { url: string; name: string; type?: string; size?: number }) => void;
  onToggleMiniMode?: () => void;
}

export const SpatialWorkspace: React.FC<SpatialWorkspaceProps> = ({
  currentUser,
  friends,
  groups = [],
  activeFriendId,
  onSelectFriend,
  onOpenProfile,
  onStartVoiceCall,
  onStartVideoCall,
  onStartCall,
  layoutMode: initialLayoutMode,
  onChangeLayoutMode,
  onOpenQuickSwitcher,
  onOpenBookmarks,
  onOpenMiniMode,
  onOpenAiTopics,
  onOpenMediaCollection,
  onOpenFilePreview,
  onToggleMiniMode,
}) => {
  const [internalLayoutMode, setInternalLayoutMode] = useState<WorkspaceLayoutMode>(initialLayoutMode || 'spatial');
  const layoutMode = initialLayoutMode || internalLayoutMode;

  const handleLayoutChange = (mode: WorkspaceLayoutMode) => {
    setInternalLayoutMode(mode);
    onChangeLayoutMode?.(mode);
  };

  const handleStartCall = (type: 'voice' | 'video', targetUser: User) => {
    if (onStartCall) {
      onStartCall(type, targetUser);
    } else if (type === 'voice' && onStartVoiceCall) {
      onStartVoiceCall(targetUser);
    } else if (type === 'video' && onStartVideoCall) {
      onStartVideoCall(targetUser);
    }
  };

  // Floating Windows State
  const [windows, setWindows] = useState<FloatingWindow[]>([]);
  const [highestZ, setHighestZ] = useState(10);
  const [draggingWindowId, setDraggingWindowId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [syncStatus, setSyncStatus] = useState('Synchronised');
  const [syncing, setSyncing] = useState(false);

  // Initialize or add active friend to floating windows when selected
  useEffect(() => {
    if (!activeFriendId) return;

    setWindows((prev) => {
      const exists = prev.find((w) => w.id === activeFriendId);
      if (exists) {
        // Bring to front
        return prev.map((w) =>
          w.id === activeFriendId ? { ...w, zIndex: highestZ + 1, isMinimized: false } : w
        );
      }

      // Find user info
      const friend = friends.find((f) => f.id === activeFriendId);
      const title = friend ? friend.displayName : activeFriendId === 'zapp_ai' ? 'Zapp AI 2.0' : activeFriendId;
      const avatar = friend?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeFriendId}`;

      // Default positioning with cascade offset
      const cascadeOffset = (prev.length % 5) * 35;
      const newWin: FloatingWindow = {
        id: activeFriendId,
        title,
        avatarUrl: avatar,
        x: Math.max(20, 80 + cascadeOffset),
        y: Math.max(20, 50 + cascadeOffset),
        width: 580,
        height: 620,
        isMinimized: false,
        isMaximized: false,
        zIndex: highestZ + 1,
      };

      setHighestZ((z) => z + 1);
      return [...prev, newWin];
    });
  }, [activeFriendId, friends]);

  // Window drag handlers
  const handleStartDrag = (e: React.MouseEvent, winId: string) => {
    e.stopPropagation();
    const win = windows.find((w) => w.id === winId);
    if (!win || win.isMaximized) return;

    setDraggingWindowId(winId);
    setDragOffset({
      x: e.clientX - win.x,
      y: e.clientY - win.y,
    });
    bringToFront(winId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingWindowId) return;

    setWindows((prev) =>
      prev.map((w) => {
        if (w.id === draggingWindowId) {
          const newX = Math.max(0, e.clientX - dragOffset.x);
          const newY = Math.max(0, e.clientY - dragOffset.y);
          return { ...w, x: newX, y: newY };
        }
        return w;
      })
    );
  };

  const handleMouseUp = () => {
    setDraggingWindowId(null);
  };

  const bringToFront = (winId: string) => {
    setHighestZ((prev) => {
      const nextZ = prev + 1;
      setWindows((wins) =>
        wins.map((w) => (w.id === winId ? { ...w, zIndex: nextZ } : w))
      );
      return nextZ;
    });
  };

  const toggleMinimize = (winId: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === winId ? { ...w, isMinimized: !w.isMinimized } : w))
    );
  };

  const toggleMaximize = (winId: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === winId ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  const closeWindow = (winId: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== winId));
    if (activeFriendId === winId) {
      onSelectFriend(null);
    }
  };

  // Cross-device manual sync trigger
  const handleManualSync = () => {
    setSyncing(true);
    setSyncStatus('Mesh syncing...');
    setTimeout(() => {
      setSyncing(false);
      setSyncStatus('Synchronised');
    }, 800);
  };

  const activeFriend = friends.find((f) => f.id === activeFriendId) || null;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="flex-1 h-full w-full bg-[#071310] flex flex-col overflow-hidden relative select-none font-sans"
    >
      {/* Spatial Top Bar */}
      <div className="h-12 w-full bg-[#0D1E18] border-b border-[#294438] px-4 flex items-center justify-between z-20 shrink-0">
        {/* Layout Presets Switcher */}
        <div className="flex items-center gap-1 bg-[#071310] p-1 rounded-2xl border border-[#294438]">
          <button
            onClick={() => handleLayoutChange('spatial')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === 'spatial'
                ? 'bg-[#00C98D] text-[#071310] shadow-md shadow-[#00C98D]/20'
                : 'text-[#91A99C] hover:text-[#F4FFF9]'
            }`}
            title="Spatial Floating Windows (Draggable & Resizable)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Spatial Canvas</span>
          </button>

          <button
            onClick={() => handleLayoutChange('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === 'grid'
                ? 'bg-[#00C98D] text-[#071310] shadow-md shadow-[#00C98D]/20'
                : 'text-[#91A99C] hover:text-[#F4FFF9]'
            }`}
            title="Tiled 2x2 Multi-Window Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2x2 Grid</span>
          </button>

          <button
            onClick={() => handleLayoutChange('focus')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === 'focus'
                ? 'bg-[#00C98D] text-[#071310] shadow-md shadow-[#00C98D]/20'
                : 'text-[#91A99C] hover:text-[#F4FFF9]'
            }`}
            title="Focus Split View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Focus Split</span>
          </button>

          <button
            onClick={() => handleLayoutChange('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              layoutMode === 'mobile'
                ? 'bg-[#00C98D] text-[#071310] shadow-md shadow-[#00C98D]/20'
                : 'text-[#91A99C] hover:text-[#F4FFF9]'
            }`}
            title="Android Mobile Frame Simulation"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Android Frame</span>
          </button>
        </div>

        {/* Center: Quick Switcher Button */}
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#142A22] border border-[#294438] hover:border-[#00C98D]/50 cursor-pointer transition-all text-xs text-[#91A99C] group"
        >
          <Search className="w-3.5 h-3.5 text-[#00C98D] group-hover:scale-110 transition-transform" />
          <span>Quick Switcher</span>
        </button>

        {/* Right: Sync Status & Mini Mode Trigger */}
        <div className="flex items-center gap-2">
          {/* Cross-Device Synchronisation status */}
          <button
            onClick={handleManualSync}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#142A22] border border-[#294438] text-xs font-mono text-[#63F5C0] hover:border-[#00C98D]/40 transition-colors cursor-pointer"
            title="Cross-device Ratchet E2EE Synchronization"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin text-[#00C98D]' : ''}`} />
            <span className="hidden lg:inline">{syncStatus}</span>
          </button>

          {/* Mini Mode launcher */}
          <button
            onClick={() => (onToggleMiniMode ? onToggleMiniMode() : onOpenMiniMode?.())}
            className="p-1.5 rounded-xl bg-[#142A22] hover:bg-[#294438] text-[#91A99C] hover:text-[#F4FFF9] transition-colors cursor-pointer"
            title="Enter Compact Mini Mode (Picture-in-Picture)"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        {/* Subtle Spatial Mesh Background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#00C98D 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* MODE 1: FOCUS SPLIT VIEW (Standard view) */}
        {layoutMode === 'focus' && (
          <div className="w-full h-full flex overflow-hidden">
            {activeFriend ? (
              <ChatArea
                activeFriend={activeFriend}
                currentUser={currentUser}
                onBackToSidebar={() => onSelectFriend(null)}
                onOpenProfile={onOpenProfile || (() => {})}
                isTyping={false}
                onStartVoiceCall={() => handleStartCall('voice', activeFriend)}
                onStartVideoCall={() => handleStartCall('video', activeFriend)}
                onOpenAiTopics={onOpenAiTopics}
                onOpenMediaCollection={onOpenMediaCollection}
                onOpenFilePreview={onOpenFilePreview}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#91A99C]">
                <MessageSquare className="w-12 h-12 text-[#294438] mb-3" />
                <h3 className="text-sm font-bold text-[#F4FFF9] font-heading">No Chat Active</h3>
                <p className="text-xs text-[#91A99C] max-w-sm mt-1">
                  Select a contact from the sidebar or launch a conversation from the Quick Switcher.
                </p>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: ANDROID MOBILE FRAME */}
        {layoutMode === 'mobile' && (
          <div className="w-full h-full flex items-center justify-center p-4 bg-[#050C0A]">
            <div className="w-[380px] h-[720px] max-h-[92vh] rounded-[48px] bg-[#071310] border-[6px] border-[#294438] shadow-[0_0_60px_rgba(0,201,141,0.2)] flex flex-col overflow-hidden relative ring-1 ring-[#00C98D]/30">
              {/* Android Notch / Camera Pill */}
              <div className="h-6 w-full bg-[#0D1E18] flex items-center justify-between px-6 pt-1 text-[10px] text-[#91A99C] font-mono z-30 select-none">
                <span>9:41</span>
                <div className="w-16 h-3 rounded-full bg-black/60 mx-auto" />
                <span>5G · 100%</span>
              </div>

              {/* Chat Content */}
              <div className="flex-1 w-full overflow-hidden flex flex-col">
                {activeFriend ? (
                  <ChatArea
                    activeFriend={activeFriend}
                    currentUser={currentUser}
                    onBackToSidebar={() => onSelectFriend(null)}
                    onOpenProfile={onOpenProfile || (() => {})}
                    isTyping={false}
                    onStartVoiceCall={() => handleStartCall('voice', activeFriend)}
                    onStartVideoCall={() => handleStartCall('video', activeFriend)}
                    onOpenAiTopics={onOpenAiTopics}
                    onOpenMediaCollection={onOpenMediaCollection}
                    onOpenFilePreview={onOpenFilePreview}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#91A99C]">
                    <Smartphone className="w-10 h-10 text-[#294438] mb-2" />
                    <p className="text-xs text-[#F4FFF9] font-semibold">Android Touch Layout</p>
                    <p className="text-[11px] text-[#91A99C] mt-1">Select a contact to begin</p>
                  </div>
                )}
              </div>

              {/* Android Home Navigation Bar */}
              <div className="h-5 w-full bg-[#0D1E18] flex items-center justify-center z-30">
                <div className="w-28 h-1 rounded-full bg-[#91A99C]/50" />
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: 2x2 GRID TILED WORKSPACE */}
        {layoutMode === 'grid' && (
          <div className="w-full h-full p-3 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden">
            {windows.slice(0, 4).map((win) => {
              const friend = friends.find((f) => f.id === win.id);
              if (!friend && win.id !== 'zapp_ai') return null;

              const friendTarget: FriendContact = friend || {
                id: 'zapp_ai',
                displayName: 'Zapp AI 2.0',
                role: 'friend',
                avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                bio: 'ZappChat Spatial AI Assistant',
                status: 'Online',
                disabled: false,
                online: true,
                lastSeen: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                unreadCount: 0,
                lastMessage: null,
              };

              return (
                <div
                  key={win.id}
                  className="rounded-3xl bg-[#0D1E18] border border-[#294438] shadow-xl flex flex-col overflow-hidden"
                >
                  {/* Grid Window Header */}
                  <div className="px-4 py-2.5 bg-[#142A22] border-b border-[#294438] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={win.avatarUrl} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-bold text-[#F4FFF9] truncate">{win.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenAiTopics?.(win.id, win.title)}
                        className="p-1 rounded text-[#91A99C] hover:text-[#00C98D]"
                        title="AI Topics"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => closeWindow(win.id)}
                        className="p-1 rounded text-[#91A99C] hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 w-full overflow-hidden">
                    <ChatArea
                      activeFriend={friendTarget}
                      currentUser={currentUser}
                      onBackToSidebar={() => onSelectFriend(null)}
                      onOpenProfile={onOpenProfile || (() => {})}
                      isTyping={false}
                      onStartVoiceCall={() => handleStartCall('voice', friendTarget)}
                      onStartVideoCall={() => handleStartCall('video', friendTarget)}
                      onOpenAiTopics={onOpenAiTopics}
                      onOpenMediaCollection={onOpenMediaCollection}
                      onOpenFilePreview={onOpenFilePreview}
                    />
                  </div>
                </div>
              );
            })}

            {windows.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center text-center p-8 text-[#91A99C]">
                <LayoutGrid className="w-12 h-12 text-[#294438] mb-2" />
                <h3 className="text-sm font-bold text-[#F4FFF9]">Grid Workspace Empty</h3>
                <p className="text-xs text-[#91A99C] mt-1">
                  Click on conversations in the left sidebar to tile them into this 2x2 grid.
                </p>
              </div>
            )}
          </div>
        )}

        {/* MODE 4: SPATIAL CANVAS (Floating Draggable Windows) */}
        {layoutMode === 'spatial' && (
          <div className="w-full h-full relative overflow-hidden">
            {windows.map((win) => {
              if (win.isMinimized) return null;

              const friend = friends.find((f) => f.id === win.id);
              const friendTarget: FriendContact = friend || {
                id: 'zapp_ai',
                displayName: 'Zapp AI 2.0',
                role: 'friend',
                avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                bio: 'ZappChat Spatial AI Assistant',
                status: 'Online',
                disabled: false,
                online: true,
                lastSeen: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                unreadCount: 0,
                lastMessage: null,
              };

              const style: React.CSSProperties = win.isMaximized
                ? {
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    right: 8,
                    bottom: 8,
                    zIndex: win.zIndex,
                  }
                : {
                    position: 'absolute',
                    top: `${win.y}px`,
                    left: `${win.x}px`,
                    width: `${win.width}px`,
                    height: `${win.height}px`,
                    zIndex: win.zIndex,
                  };

              return (
                <div
                  key={win.id}
                  style={style}
                  onMouseDown={() => bringToFront(win.id)}
                  className="rounded-3xl bg-[#0D1E18] border border-[#294438] shadow-2xl shadow-emerald-950/70 flex flex-col overflow-hidden ring-1 ring-[#00C98D]/30 transition-shadow animate-in zoom-in-95"
                >
                  {/* Floating Window Title Bar (Draggable) */}
                  <div
                    onMouseDown={(e) => handleStartDrag(e, win.id)}
                    className="px-4 py-3 bg-[#142A22] border-b border-[#294438] flex items-center justify-between cursor-move select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center gap-1.5 mr-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeWindow(win.id);
                          }}
                          className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMinimize(win.id);
                          }}
                          className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMaximize(win.id);
                          }}
                          className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors"
                        />
                      </div>

                      <img src={win.avatarUrl} alt="avatar" className="w-5 h-5 rounded-full object-cover" />
                      <span className="text-xs font-bold text-[#F4FFF9] truncate max-w-[160px]">
                        {win.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAiTopics?.(win.id, win.title);
                        }}
                        className="p-1 rounded-lg text-[#91A99C] hover:text-[#00C98D] hover:bg-[#071310] transition-colors"
                        title="AI Conversation Insights"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMaximize(win.id);
                        }}
                        className="p-1 rounded-lg text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#071310] transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeWindow(win.id);
                        }}
                        className="p-1 rounded-lg text-[#91A99C] hover:text-rose-400 hover:bg-[#071310] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Window Content */}
                  <div className="flex-1 w-full overflow-hidden">
                    <ChatArea
                      activeFriend={friendTarget}
                      currentUser={currentUser}
                      onBackToSidebar={() => onSelectFriend(null)}
                      onOpenProfile={onOpenProfile || (() => {})}
                      isTyping={false}
                      onStartVoiceCall={() => handleStartCall('voice', friendTarget)}
                      onStartVideoCall={() => handleStartCall('video', friendTarget)}
                      onOpenAiTopics={onOpenAiTopics}
                      onOpenMediaCollection={onOpenMediaCollection}
                      onOpenFilePreview={onOpenFilePreview}
                    />
                  </div>
                </div>
              );
            })}

            {windows.filter((w) => !w.isMinimized).length === 0 && (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-[#91A99C]">
                <Layers className="w-14 h-14 text-[#294438] mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-[#F4FFF9] font-heading">
                  Spatial Workspace Ready
                </h3>
                <p className="text-xs text-[#91A99C] max-w-sm mt-1">
                  Click any conversation in the left sidebar to open a floating spatial window. You can drag, resize, and stack multiple windows side-by-side.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spatial Window Dock (Bottom Dock Bar) */}
      {windows.length > 0 && layoutMode === 'spatial' && (
        <div className="h-12 w-full bg-[#0D1E18]/90 border-t border-[#294438] px-4 flex items-center justify-center gap-2 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {windows.map((win) => (
              <button
                key={win.id}
                onClick={() => {
                  if (win.isMinimized) toggleMinimize(win.id);
                  bringToFront(win.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  !win.isMinimized
                    ? 'bg-[#142A22] text-[#F4FFF9] border border-[#00C98D]/40 shadow-sm'
                    : 'bg-[#071310] text-[#91A99C] border border-[#294438] hover:text-[#F4FFF9]'
                }`}
              >
                <img src={win.avatarUrl} alt="avatar" className="w-4 h-4 rounded-full object-cover" />
                <span className="truncate max-w-[120px]">{win.title}</span>
                {!win.isMinimized && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C98D]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
