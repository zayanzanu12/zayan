import React, { useState, useEffect } from 'react';
import { Bookmark, X, MessageSquare, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { Message } from '../../types/chat';
import { api } from '../../services/api';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToMessage?: (senderOrReceiverId: string, messageId: string) => void;
  onSelectMessage?: (messageId: string) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  onJumpToMessage,
  onSelectMessage,
}) => {
  const [bookmarks, setBookmarks] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const res = await api.getBookmarks();
      setBookmarks(res.bookmarks || []);
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBookmarks();
    }
  }, [isOpen]);

  const handleRemoveBookmark = async (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    try {
      await api.toggleBookmark(messageId);
      setBookmarks((prev) => prev.filter((b) => b.id !== messageId));
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-80 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in select-none">
      <div className="w-full max-w-md bg-[#0D1E18] border-l border-[#294438] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#294438] bg-[#142A22]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00C98D]/20 border border-[#00C98D]/40 text-[#00C98D] flex items-center justify-center">
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F4FFF9] tracking-wide font-heading">
                Saved &amp; Bookmarked
              </h3>
              <p className="text-[11px] text-[#91A99C]">
                {bookmarks.length} saved message{bookmarks.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={loadBookmarks}
              className="p-1.5 rounded-xl text-[#91A99C] hover:text-[#00C98D] hover:bg-[#142A22] transition-colors cursor-pointer"
              title="Refresh bookmarks"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bookmarks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#00C98D]/30 border-t-[#00C98D] animate-spin mb-3" />
              <p className="text-xs text-[#91A99C]">Loading bookmarks...</p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#91A99C] space-y-2">
              <Bookmark className="w-8 h-8 text-[#294438] mx-auto" />
              <p className="text-[#F4FFF9] font-medium">No saved messages yet</p>
              <p className="text-[11px] text-[#91A99C] max-w-xs mx-auto">
                Hover over any chat message and click the bookmark icon to save it here for fast retrieval.
              </p>
            </div>
          ) : (
            bookmarks.map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  if (onJumpToMessage) {
                    onJumpToMessage(b.senderId, b.id);
                  } else if (onSelectMessage) {
                    onSelectMessage(b.id);
                  }
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-[#142A22]/70 hover:bg-[#142A22] border border-[#294438] hover:border-[#00C98D]/40 transition-all cursor-pointer group space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-[#91A99C]">
                  <span className="font-mono font-medium text-[#63F5C0]">@{b.senderId}</span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveBookmark(e, b.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#91A99C] hover:text-rose-400 transition-opacity cursor-pointer"
                      title="Remove bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {b.text && (
                  <p className="text-xs text-[#F4FFF9] leading-relaxed line-clamp-3">
                    {b.text}
                  </p>
                )}

                {b.mediaUrl && (
                  <div className="rounded-xl overflow-hidden max-h-32 bg-[#071310] border border-[#294438]">
                    {b.mediaType === 'image' && (
                      <img src={b.mediaUrl} alt="media" className="w-full h-28 object-cover" />
                    )}
                    {b.mediaType === 'video' && (
                      <video src={b.mediaUrl} className="w-full h-28 object-cover" controls />
                    )}
                    {(b.mediaType === 'audio' || b.mediaType === 'voice') && (
                      <audio src={b.mediaUrl} className="w-full p-1" controls />
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-[#91A99C] pt-1">
                  <span className="font-mono">ID: {b.id.slice(0, 10)}...</span>
                  <span className="text-[#00C98D] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Jump to chat</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
