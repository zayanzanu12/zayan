import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Heart, Send } from 'lucide-react';
import { Story, User } from '../../types/chat';
import { api } from '../../services/api';

interface StoryViewerModalProps {
  stories: Story[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onStoryReact?: (story: Story, emoji: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex = 0,
  isOpen,
  onClose,
  currentUser,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
  }, [initialIndex, isOpen]);

  const currentStory = stories[currentIndex];

  // Mark story as viewed
  useEffect(() => {
    if (isOpen && currentStory && currentStory.authorId !== currentUser.id) {
      api.viewStory(currentStory.id).catch(() => {});
    }
  }, [isOpen, currentStory, currentUser.id]);

  // Timer loop for auto-advance (5s per story)
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    const interval = 50; // update every 50ms
    const step = (interval / 5000) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, currentIndex, stories.length, currentStory, onClose]);

  if (!isOpen || !currentStory) return null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || currentStory.authorId === currentUser.id) return;

    try {
      await api.sendMessage({
        receiverId: currentStory.authorId,
        text: `Replied to your story: "${replyText.trim()}"`,
        mediaUrl: currentStory.mediaUrl,
        mediaType: currentStory.mediaUrl ? 'image' : undefined,
      });
      setReplyText('');
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2500);
    } catch (err) {
      console.error('Failed to reply to story:', err);
    }
  };

  const isMyStory = currentStory.authorId === currentUser.id;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition-colors"
        title="Close story"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation arrows (desktop) */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white transition-all shadow-lg hover:scale-105"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/70 hover:bg-slate-800 text-white transition-all shadow-lg hover:scale-105"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Story Stage Container */}
      <div className="relative w-full h-full md:h-[84vh] md:max-w-md bg-slate-950 md:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
        {/* Progress bars header */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex gap-1.5 mb-3">
            {stories.map((s, idx) => (
              <div
                key={s.id}
                className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{
                    width:
                      idx < currentIndex
                        ? '100%'
                        : idx === currentIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentStory.authorAvatar}
                alt={currentStory.authorName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/80"
              />
              <div>
                <p className="text-sm font-semibold text-white leading-tight">
                  {currentStory.authorName}
                </p>
                <p className="text-xs text-slate-300">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {isMyStory && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm text-xs text-emerald-400 border border-emerald-500/30">
                <Eye className="w-3.5 h-3.5" />
                <span>{currentStory.viewers?.length || 0} viewed</span>
              </div>
            )}
          </div>
        </div>

        {/* Story Content Area */}
        <div
          className="relative flex-1 w-full h-full flex items-center justify-center select-none"
          style={{ backgroundColor: currentStory.bgColor || '#0f172a' }}
        >
          {currentStory.mediaUrl ? (
            <img
              src={currentStory.mediaUrl}
              alt="Story media"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="px-8 text-center max-w-sm">
              <p className="text-xl md:text-2xl font-bold text-white leading-relaxed drop-shadow-md">
                {currentStory.text}
              </p>
            </div>
          )}

          {/* Caption overlay for media */}
          {currentStory.mediaUrl && currentStory.text && (
            <div className="absolute bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center">
              <p className="text-base font-medium text-white drop-shadow">
                {currentStory.text}
              </p>
            </div>
          )}

          {/* Touch zones for tapping left/right */}
          <div
            className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* Footer / Reply input for friends */}
        {!isMyStory && (
          <div className="p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-20">
            {replySent ? (
              <div className="py-2 px-4 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm text-center font-medium">
                Reply sent to {currentStory.authorName}!
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Reply to ${currentStory.authorName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  className="flex-1 bg-slate-900/80 border border-slate-700/80 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    api.sendMessage({
                      receiverId: currentStory.authorId,
                      text: `❤️ Reacted to your story`,
                    });
                    setReplySent(true);
                    setTimeout(() => setReplySent(false), 2000);
                  }}
                  className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-rose-400 hover:scale-110 transition-transform"
                  title="Quick love"
                >
                  <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                </button>
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold transition-all hover:scale-105"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
