import React, { useState, useEffect } from 'react';
import {
  CircleDot,
  Plus,
  Clock,
  Shield,
  Eye,
  Camera,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Trash2,
  Image,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Story, User } from '../../types/chat';
import { api } from '../../services/api';
import { StoryViewerModal } from '../stories/StoryViewerModal';
import { CreateStoryModal } from '../stories/CreateStoryModal';

interface StatusViewProps {
  currentUser: User;
}

export const StatusView: React.FC<StatusViewProps> = ({ currentUser }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [viewerStoryIndex, setViewerStoryIndex] = useState<number | null>(null);

  // Status deletion confirmation state
  const [statusToDelete, setStatusToDelete] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const list = await api.getStories();
      const uniqueList = (list || []).filter(
        (s: Story, idx: number, arr: Story[]) => s && arr.findIndex((x) => x.id === s.id) === idx
      );
      setStories(uniqueList);
    } catch (err) {
      console.error('Failed to load status updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();

    // SSE listener for real-time status updates
    const handleSse = (e: any) => {
      try {
        const detail = e.detail;
        if (detail?.type === 'new_story' && detail.payload?.id) {
          setStories((prev) => {
            const filtered = prev.filter((s) => s.id !== detail.payload.id);
            return [detail.payload, ...filtered];
          });
        } else if (detail?.type === 'story_deleted') {
          setStories((prev) => prev.filter((s) => s.id !== detail.payload.id));
        }
      } catch (err) {
        console.error('SSE status error', err);
      }
    };
    window.addEventListener('talksy_sse_event', handleSse as any);
    return () => window.removeEventListener('talksy_sse_event', handleSse as any);
  }, []);

  const myStories = stories.filter((s) => s.authorId === currentUser.id);
  const otherStories = stories.filter((s) => s.authorId !== currentUser.id);

  // Group other stories by author
  const groupedByAuthor: Record<string, Story[]> = {};
  otherStories.forEach((s) => {
    if (!groupedByAuthor[s.authorId]) {
      groupedByAuthor[s.authorId] = [];
    }
    groupedByAuthor[s.authorId].push(s);
  });

  const authorIds = Object.keys(groupedByAuthor);
  const recentAuthors = authorIds.filter((id) =>
    groupedByAuthor[id].some((s) => !s.viewers?.includes(currentUser.id))
  );
  const viewedAuthors = authorIds.filter((id) =>
    groupedByAuthor[id].every((s) => s.viewers?.includes(currentUser.id))
  );

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return 'Yesterday';
    } catch {
      return '';
    }
  };

  const handleDeleteStatus = async () => {
    if (!statusToDelete) return;
    setDeleting(true);
    try {
      await api.deleteStory(statusToDelete.id);
      setStories((prev) => prev.filter((s) => s.id !== statusToDelete.id));
      setFeedback('Status update deleted successfully');
      setTimeout(() => setFeedback(null), 3000);
      setStatusToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete status', err);
      setFeedback('Failed to delete status: ' + (err.message || 'Error'));
    } finally {
      setDeleting(false);
    }
  };

  const openCreateModal = (withCamera: boolean = false) => {
    setCameraMode(withCamera);
    setShowCreateModal(true);
  };

  return (
    <div className="h-full w-full flex bg-[#07111F] text-[#E8F0FA] overflow-hidden select-none">
      {/* Left Sidebar: Status List (WhatsApp style) */}
      <div className="w-full md:w-[380px] h-full flex flex-col bg-[#0D1B2A] border-r border-[#1E3042] shrink-0">
        {/* Status Header */}
        <div className="h-16 px-4 md:px-5 flex items-center justify-between border-b border-[#1E3042] bg-[#07111F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00D68F]/15 border border-[#00D68F]/30 text-[#00D68F] flex items-center justify-center">
              <CircleDot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#E8F0FA]">Status</h2>
              <p className="text-[10px] text-[#94A3B8]">WhatsApp-style 24h updates</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Take Photo Camera Button */}
            <button
              onClick={() => openCreateModal(true)}
              className="p-2 rounded-xl text-emerald-400 hover:text-white hover:bg-emerald-500/20 transition-all cursor-pointer"
              title="Take Photo with Camera"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Connect Media Button */}
            <button
              onClick={() => openCreateModal(false)}
              className="p-2 rounded-xl text-sky-400 hover:text-white hover:bg-sky-500/20 transition-all cursor-pointer"
              title="Connect Media (Photo/Video)"
            >
              <Image className="w-4 h-4" />
            </button>

            <button
              onClick={fetchStories}
              disabled={loading}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00D68F]' : ''}`} />
            </button>

            <button
              onClick={() => openCreateModal(false)}
              className="p-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] transition-all cursor-pointer shadow-sm"
              title="Add Status"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="m-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-emerald-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Status List Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Section 1: My Status */}
          <div className="p-3 rounded-2xl bg-[#111E2D] border border-[#1E3042] transition-colors">
            <div className="flex items-center gap-3">
              <div
                onClick={() => {
                  if (myStories.length > 0) {
                    const idx = stories.findIndex((s) => s.authorId === currentUser.id);
                    setViewerStoryIndex(idx >= 0 ? idx : 0);
                  } else {
                    openCreateModal(false);
                  }
                }}
                className="relative cursor-pointer group"
              >
                <div
                  className={`w-12 h-12 rounded-full p-0.5 ${
                    myStories.length > 0
                      ? 'ring-2 ring-[#00D68F] ring-offset-2 ring-offset-[#111E2D]'
                      : 'border-2 border-dashed border-[#1E3042]'
                  } transition-all group-hover:scale-105`}
                >
                  <img
                    src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`}
                    alt={currentUser.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateModal(false);
                  }}
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#00D68F] text-[#07111F] flex items-center justify-center ring-2 ring-[#111E2D] hover:scale-110 transition-transform shadow-md"
                  title="Add update"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                </button>
              </div>

              <div
                onClick={() => {
                  if (myStories.length > 0) {
                    const idx = stories.findIndex((s) => s.authorId === currentUser.id);
                    setViewerStoryIndex(idx >= 0 ? idx : 0);
                  } else {
                    openCreateModal(false);
                  }
                }}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <h3 className="text-xs font-bold text-[#E8F0FA]">My Status</h3>
                <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                  {myStories.length > 0
                    ? `${myStories.length} update${myStories.length > 1 ? 's' : ''} • ${formatTimeAgo(myStories[0].createdAt)}`
                    : 'Tap to add status, take photo, or connect media'}
                </p>
              </div>

              {myStories.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const idx = stories.findIndex((s) => s.authorId === currentUser.id);
                      setViewerStoryIndex(idx >= 0 ? idx : 0);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#00D68F]/25"
                    title="View Status"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => setStatusToDelete(myStories[0])}
                    className="p-1.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                    title="Delete Current Status"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openCreateModal(true)}
                    className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Take Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openCreateModal(false)}
                    className="p-1.5 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-all text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Connect Media"
                  >
                    <Image className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Recent Updates */}
          {recentAuthors.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] px-2">
                Recent Updates
              </h4>
              <div className="space-y-1">
                {recentAuthors.map((authorId) => {
                  const authorStories = groupedByAuthor[authorId];
                  const latest = authorStories[0];
                  const firstUnviewedIndex = stories.findIndex(
                    (s) => s.authorId === authorId && !s.viewers?.includes(currentUser.id)
                  );

                  return (
                    <div
                      key={authorId}
                      onClick={() =>
                        setViewerStoryIndex(
                          firstUnviewedIndex >= 0
                            ? firstUnviewedIndex
                            : stories.findIndex((s) => s.id === latest.id)
                        )
                      }
                      className="p-2.5 rounded-2xl hover:bg-[#111E2D] border border-transparent hover:border-[#1E3042] transition-colors cursor-pointer flex items-center gap-3"
                    >
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full p-0.5 ring-2 ring-[#00D68F] ring-offset-2 ring-offset-[#0D1B2A]">
                          <img
                            src={latest.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${latest.authorId}`}
                            alt={latest.authorName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-[#E8F0FA] truncate">
                          {latest.authorName}
                        </h5>
                        <p className="text-[11px] text-[#00D68F] font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(latest.createdAt)}</span>
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Viewed Updates */}
          {viewedAuthors.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]/70 px-2">
                Viewed Updates
              </h4>
              <div className="space-y-1">
                {viewedAuthors.map((authorId) => {
                  const authorStories = groupedByAuthor[authorId];
                  const latest = authorStories[0];
                  const idx = stories.findIndex((s) => s.id === latest.id);

                  return (
                    <div
                      key={authorId}
                      onClick={() => setViewerStoryIndex(idx >= 0 ? idx : 0)}
                      className="p-2.5 rounded-2xl hover:bg-[#111E2D] border border-transparent hover:border-[#1E3042] opacity-75 hover:opacity-100 transition-all cursor-pointer flex items-center gap-3"
                    >
                      <div className="relative">
                        <div className="w-11 h-11 rounded-full p-0.5 ring-2 ring-[#1E3042] ring-offset-2 ring-offset-[#0D1B2A]">
                          <img
                            src={latest.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${latest.authorId}`}
                            alt={latest.authorName}
                            className="w-full h-full rounded-full object-cover grayscale"
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-[#E8F0FA] truncate">
                          {latest.authorName}
                        </h5>
                        <p className="text-[11px] text-[#94A3B8] font-medium flex items-center gap-1 mt-0.5">
                          <span>{formatTimeAgo(latest.createdAt)}</span>
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[#94A3B8]/50" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {stories.length === 0 && !loading && (
            <div className="py-12 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#111E2D] border border-[#1E3042] text-[#94A3B8] flex items-center justify-center mx-auto mb-3">
                <CircleDot className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-[#E8F0FA]">No Status Updates</p>
              <p className="text-[11px] text-[#94A3B8] mt-1 max-w-xs mx-auto">
                Connect media, take photos, or write thoughts. Updates stay live for 24 hours.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => openCreateModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-emerald-500/30"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take Photo</span>
                </button>
                <button
                  onClick={() => openCreateModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  Connect Media
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Stage Area: WhatsApp Web style preview placeholder */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#07111F] p-8 text-center relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,214,143,0.04)_0%,transparent_70%)] pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-[#0D1B2A] border border-[#1E3042] text-[#00D68F] flex items-center justify-center shadow-2xl mb-5">
          <CircleDot className="w-10 h-10" />
        </div>

        <h3 className="text-lg font-bold text-[#E8F0FA] tracking-tight">
          Click on a contact to view their status update
        </h3>
        <p className="text-xs text-[#94A3B8] mt-2 max-w-md leading-relaxed">
          Status updates disappear after 24 hours. Connect high-resolution media, capture snapshots with camera, and share thoughts with your friends.
        </p>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => openCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Take Photo</span>
          </button>
          <button
            onClick={() => openCreateModal(false)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-all shadow-lg hover:shadow-[#00D68F]/20 cursor-pointer"
          >
            <Image className="w-4 h-4" />
            <span>Connect Media</span>
          </button>
        </div>

        <div className="absolute bottom-6 flex items-center gap-2 text-[11px] text-[#94A3B8]/60 font-mono">
          <Shield className="w-3.5 h-3.5 text-[#00D68F]" />
          <span>Status updates are private & encrypted</span>
        </div>
      </div>

      {/* Delete Status Confirmation Modal */}
      {statusToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in">
          <div className="relative w-full max-w-sm bg-[#0D1B2A] border border-red-500/40 rounded-3xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-center text-[#E8F0FA]">
              Delete Current Status?
            </h4>
            <p className="text-xs text-center text-[#94A3B8] mt-2">
              Are you sure you want to permanently delete your current status update? It will be removed immediately for all contacts.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStatusToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] text-[#E8F0FA] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStatus}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleting ? 'Deleting...' : 'Delete Status'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {viewerStoryIndex !== null && stories[viewerStoryIndex] && (
        <StoryViewerModal
          stories={stories}
          initialIndex={viewerStoryIndex}
          isOpen={viewerStoryIndex !== null}
          onClose={() => setViewerStoryIndex(null)}
          currentUser={currentUser}
          onStoryDeleted={(deletedId) => {
            setStories((prev) => prev.filter((s) => s.id !== deletedId));
            setFeedback('Status deleted successfully');
            setTimeout(() => setFeedback(null), 3000);
          }}
        />
      )}

      {/* Create Story / Status Modal */}
      {showCreateModal && (
        <CreateStoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          currentUser={currentUser}
          initialCameraMode={cameraMode}
          onStoryCreated={(newStory) => {
            setStories((prev) => {
              const filtered = prev.filter((s) => s.id !== newStory.id);
              return [newStory, ...filtered];
            });
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};
