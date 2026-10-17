import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Story, User } from '../../types/chat';
import { StoryViewerModal } from './StoryViewerModal';
import { CreateStoryModal } from './CreateStoryModal';

interface StoryTrayProps {
  stories: Story[];
  currentUser: User;
  onStoryCreated: (story: Story) => void;
}

export const StoryTray: React.FC<StoryTrayProps> = ({
  stories,
  currentUser,
  onStoryCreated,
}) => {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Group stories or display newest per author
  const myStories = stories.filter((s) => s.authorId === currentUser.id);

  return (
    <>
      <div className="w-full overflow-x-auto scrollbar-none py-3 px-4 bg-[#070e20]/80 backdrop-blur-md border-b border-slate-800/60">
        <div className="flex items-center gap-3.5 min-w-max">
          {/* Add story / My story button */}
          <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div
              onClick={() => {
                if (myStories.length > 0) {
                  // View my stories first, or click + to add
                  setSelectedStoryIndex(stories.findIndex((s) => s.authorId === currentUser.id));
                } else {
                  setShowCreateModal(true);
                }
              }}
              className="relative"
            >
              <div
                className={`w-14 h-14 rounded-full p-0.5 ${
                  myStories.length > 0
                    ? 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-sky-400'
                    : 'border-2 border-dashed border-slate-700'
                } group-hover:scale-105 transition-transform`}
              >
                <img
                  src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.id}`}
                  alt={currentUser.displayName}
                  className="w-full h-full rounded-full object-cover border-2 border-[#070e20]"
                />
              </div>

              {/* Plus badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(true);
                }}
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center ring-2 ring-[#070e20] hover:bg-emerald-400 hover:scale-110 transition-all shadow-md"
                title="Add new story"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
            <span className="text-[11px] font-medium text-slate-300 max-w-[64px] truncate text-center">
              Your Story
            </span>
          </div>

          {/* Friends Stories */}
          {stories
            .filter((s) => s.authorId !== currentUser.id)
            .map((story, idx) => {
              const actualIndex = stories.findIndex((item) => item.id === story.id);
              const isViewed = story.viewers?.includes(currentUser.id);

              return (
                <div
                  key={story.id}
                  onClick={() => setSelectedStoryIndex(actualIndex)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                >
                  <div
                    className={`w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                      isViewed
                        ? 'bg-slate-700/60'
                        : 'bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-400 animate-pulse'
                    }`}
                  >
                    <img
                      src={story.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.authorId}`}
                      alt={story.authorName}
                      className="w-full h-full rounded-full object-cover border-2 border-[#070e20]"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 max-w-[64px] truncate text-center group-hover:text-emerald-300 transition-colors">
                    {story.authorName}
                  </span>
                </div>
              );
            })}

          {stories.length === 0 && (
            <div className="flex items-center gap-2 pl-2 text-xs text-slate-500 italic">
              <span>No stories yet. Be the first to share one!</span>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {selectedStoryIndex !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={selectedStoryIndex}
          isOpen={selectedStoryIndex !== null}
          onClose={() => setSelectedStoryIndex(null)}
          currentUser={currentUser}
        />
      )}

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
        onStoryCreated={onStoryCreated}
      />
    </>
  );
};
