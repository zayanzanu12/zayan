import React, { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Image as ImageIcon,
  Send,
  Trash2,
  Tag,
  Hash,
  Loader2,
  Rss,
  Search,
  Check,
} from 'lucide-react';
import { Post, Story, User } from '../../types/chat';
import { api } from '../../services/api';
import { StoryTray } from '../stories/StoryTray';

interface SocialFeedViewProps {
  currentUser: User;
  onOpenUserProfile: (user: User) => void;
}

export const SocialFeedView: React.FC<SocialFeedViewProps> = ({
  currentUser,
  onOpenUserProfile: _onOpenUserProfile,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Post Creator State
  const [postText, setPostText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Active Comment Drawer
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Load feed and stories
  const loadFeedData = async () => {
    try {
      const [fetchedPosts, fetchedStories] = await Promise.all([
        api.getPosts({
          tag: selectedTag || undefined,
          savedOnly: activeTab === 'saved' ? true : undefined,
        }),
        api.getStories(),
      ]);
      setPosts(fetchedPosts);
      setStories(fetchedStories);
    } catch (err) {
      console.error('Failed to load feed data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedData();
  }, [activeTab, selectedTag]);

  // Real-time SSE listener for posts and stories
  useEffect(() => {
    const handleSsePost = (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'new_post') {
          setPosts((prev) => [data.payload, ...prev]);
        } else if (data.type === 'post_updated') {
          setPosts((prev) =>
            prev.map((p) => (p.id === data.payload.id ? data.payload : p))
          );
        } else if (data.type === 'post_deleted') {
          setPosts((prev) => prev.filter((p) => p.id !== data.payload.postId));
        } else if (data.type === 'new_story') {
          setStories((prev) => [data.payload, ...prev]);
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('talksy_sse_event', handleSsePost as any);
    return () => window.removeEventListener('talksy_sse_event', handleSsePost as any);
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !mediaUrl) return;

    setSubmitting(true);
    setCreateError(null);

    const parsedTags = tagsInput
      .split(/[\s,]+/)
      .map((t) => t.replace('#', '').trim())
      .filter(Boolean);

    try {
      const newPost = await api.createPost({
        text: postText.trim() || undefined,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaUrl ? 'image' : undefined,
        tags: parsedTags,
      });
      setPosts((prev) => [newPost, ...prev]);
      setPostText('');
      setMediaUrl('');
      setTagsInput('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await api.uploadFile(base64, file.name, file.type);
        setMediaUrl(res.url);
      } catch (err: any) {
        setCreateError(err.message || 'Failed to upload photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await api.likePost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const handleSave = async (postId: string) => {
    try {
      const res = await api.savePost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
    } catch (err) {
      console.error('Failed to save post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      const res = await api.commentPost(postId, commentText);
      setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
      setCommentText('');
    } catch (err) {
      console.error('Failed to comment:', err);
    } finally {
      setCommenting(false);
    }
  };

  const handleSharePost = (post: Post) => {
    const shareText = `Check out this post by ${post.authorName} on Talksy: "${post.text.slice(0, 80)}"`;
    navigator.clipboard.writeText(shareText);
    setCopiedPostId(post.id);
    setTimeout(() => setCopiedPostId(null), 2000);
  };

  // Filter posts by search query if any
  const filteredPosts = posts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.text.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Extract all unique trending tags
  const allTags = Array.from(
    new Set(posts.flatMap((p) => p.tags || []))
  ).slice(0, 8);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#07111F] flex flex-col">
      {/* 24-Hour Stories Horizontal Tray */}
      <StoryTray
        stories={stories}
        currentUser={currentUser}
        onStoryCreated={(newStory) => setStories((prev) => [newStory, ...prev])}
      />

      <div className="max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Post Creation Composer */}
        <div className="bg-[#111E2D] border border-[#1E3042] rounded-3xl p-5 shadow-xl">
          <div className="flex gap-3">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[#00D68F]/30 shrink-0"
            />
            <div className="flex-1">
              <form onSubmit={handleCreatePost} className="space-y-3">
                <textarea
                  placeholder="What's happening in your circle? Share thoughts, links, or media..."
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  rows={3}
                  className="w-full bg-[#07111F] border border-[#1E3042] rounded-2xl p-3.5 text-sm text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] transition-colors resize-none"
                />

                {/* Media Preview if attached */}
                {mediaUrl && (
                  <div className="relative rounded-2xl overflow-hidden max-h-72 border border-slate-700/60">
                    <img
                      src={mediaUrl}
                      alt="Attachment preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaUrl('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Tags input row */}
                <div className="flex items-center gap-2 bg-[#030712]/40 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <input
                    type="text"
                    placeholder="Add hashtags separated by spaces (e.g. news tech project)"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {createError && (
                  <p className="text-xs text-rose-400">{createError}</p>
                )}

                {/* Bottom toolbar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer text-xs font-medium transition-colors">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>{mediaUrl ? 'Photo Added' : 'Add Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMediaUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || (!postText.trim() && !mediaUrl)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold text-xs md:text-sm transition-all hover:scale-105"
                  >
                    {submitting ? (
                      <span>Publishing...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Post</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Filter Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Feed Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#070e20] border border-slate-800/80 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab('all');
                setSelectedTag(null);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'all' && !selectedTag
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => {
                setActiveTab('saved');
                setSelectedTag(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'saved'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved</span>
            </button>
          </div>

          {/* Quick search in feed */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search posts or authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070e20] border border-slate-800/80 rounded-2xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Trending Tags pills */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0 font-medium">
              <Tag className="w-3.5 h-3.5" /> Trending:
            </span>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                  selectedTag === t
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-[#070e20] text-slate-300 border border-slate-800 hover:border-emerald-500/40 hover:text-emerald-300'
                }`}
              >
                #{t}
              </button>
            ))}
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="text-xs text-rose-400 hover:underline shrink-0"
              >
                Clear tag
              </button>
            )}
          </div>
        )}

        {/* Posts Stream */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <span>Loading feed...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-[#070e20] border border-slate-800/80 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <Rss className="w-10 h-10 stroke-[1.5] text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No posts found</p>
            <p className="text-xs text-slate-500">
              {activeTab === 'saved'
                ? "You haven't saved any posts for later yet."
                : 'Be the first in your community to post!'}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const hasLiked = post.likes?.includes(currentUser.id);
            const isSaved = post.savedBy?.includes(currentUser.id);
            const isCommentsOpen = openCommentsPostId === post.id;
            const canDelete = post.authorId === currentUser.id || currentUser.role === 'admin';

            return (
              <article
                key={post.id}
                className="bg-[#070e20] border border-slate-800/80 rounded-3xl p-5 shadow-xl space-y-4 hover:border-slate-700/80 transition-all"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-emerald-500/30"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {post.authorName}
                        </span>
                        {post.authorRole === 'admin' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(post.createdAt).toLocaleDateString()} ·{' '}
                        {new Date(post.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Post Content */}
                {post.text && (
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {post.text}
                  </p>
                )}

                {/* Post Media */}
                {post.mediaUrl && (
                  <div className="rounded-2xl overflow-hidden max-h-[460px] border border-slate-800/80 bg-black/40">
                    <img
                      src={post.mediaUrl}
                      alt="Post media"
                      className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-200"
                    />
                  </div>
                )}

                {/* Post Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className="text-xs font-medium text-emerald-400 hover:underline cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Post Stats & Actions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/70 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    {/* Like button */}
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 py-1 px-2.5 rounded-xl transition-all ${
                        hasLiked
                          ? 'text-rose-400 bg-rose-500/10 font-semibold'
                          : 'hover:text-rose-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`}
                      />
                      <span>{post.likes?.length || 0}</span>
                    </button>

                    {/* Comments toggle button */}
                    <button
                      onClick={() =>
                        setOpenCommentsPostId(isCommentsOpen ? null : post.id)
                      }
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl hover:text-sky-400 hover:bg-slate-800/60 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments?.length || 0}</span>
                    </button>

                    {/* Share button */}
                    <button
                      onClick={() => handleSharePost(post)}
                      className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl hover:text-emerald-400 hover:bg-slate-800/60 transition-colors"
                      title="Share link"
                    >
                      {copiedPostId === post.id ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Bookmark / Save button */}
                  <button
                    onClick={() => handleSave(post.id)}
                    className={`p-1.5 rounded-xl transition-colors ${
                      isSaved
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60'
                    }`}
                    title={isSaved ? 'Remove from saved' : 'Save post'}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isSaved ? 'fill-emerald-400' : ''}`}
                    />
                  </button>
                </div>

                {/* Collapsible Comments Drawer */}
                {isCommentsOpen && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                    {/* Comments list */}
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {(!post.comments || post.comments.length === 0) && (
                        <p className="text-xs text-slate-500 italic py-2">
                          No comments yet. Start the conversation!
                        </p>
                      )}
                      {post.comments?.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex items-start gap-2.5 bg-[#030712]/50 p-2.5 rounded-2xl border border-slate-800/50"
                        >
                          <img
                            src={comment.authorAvatar}
                            alt={comment.authorName}
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">
                                {comment.authorName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(comment.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5 whitespace-pre-wrap">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add comment input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post.id);
                        }}
                        className="flex-1 bg-[#030712] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={commenting || !commentText.trim()}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
