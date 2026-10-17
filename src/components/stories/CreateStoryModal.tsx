import React, { useState } from 'react';
import { X, Image, Zap, Send, Palette } from 'lucide-react';
import { User, Story } from '../../types/chat';
import { api } from '../../services/api';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onStoryCreated: (newStory: Story) => void;
}

const BG_GRADIENTS = [
  '#0f172a',
  '#064e3b',
  '#1e1b4b',
  '#4c0519',
  '#701a75',
  '#14532d',
  '#1e3a8a',
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  currentUser: _currentUser,
  onStoryCreated,
}) => {
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [bgColor, setBgColor] = useState(BG_GRADIENTS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await api.uploadFile(base64, file.name, file.type);
        setMediaUrl(res.url);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to upload photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !mediaUrl) {
      setError('Please enter a message or upload a photo');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const story = await api.createStory({
        text: text.trim() || undefined,
        mediaUrl: mediaUrl || undefined,
        bgColor,
      });
      onStoryCreated(story);
      onClose();
      setText('');
      setMediaUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to publish story');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#0b1428] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Add to Your Story</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Live Preview */}
        <div className="p-4 flex justify-center bg-[#070e20]">
          <div
            className="relative w-64 h-96 rounded-2xl overflow-hidden shadow-xl border border-slate-700/60 flex items-center justify-center p-6 text-center select-none"
            style={{ backgroundColor: bgColor }}
          >
            {mediaUrl ? (
              <>
                <img
                  src={mediaUrl}
                  alt="Story preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {text && (
                  <div className="absolute bottom-4 left-4 right-4 p-2 bg-black/60 rounded-xl backdrop-blur-sm">
                    <p className="text-xs text-white font-medium">{text}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <p className="text-white text-lg font-bold leading-relaxed">
                {text || 'Type your story message...'}
              </p>
            )}
            <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] text-emerald-300 font-mono">
              24h preview
            </span>
          </div>
        </div>

        {/* Composer Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          <div>
            <textarea
              placeholder="What's happening? Share a thought for 24 hours..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={280}
              rows={2}
              className="w-full bg-[#070e20] border border-slate-700/70 rounded-2xl p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none transition-colors"
            />
            <div className="text-right text-[11px] text-slate-500 mt-1">
              {text.length}/280
            </div>
          </div>

          {/* Color palette selector (if no media) */}
          {!mediaUrl && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <Palette className="w-3.5 h-3.5" />
                <span>Background Color</span>
              </div>
              <div className="flex items-center gap-2">
                {BG_GRADIENTS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setBgColor(bg)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      bgColor === bg
                        ? 'border-emerald-400 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: bg }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors text-xs font-medium">
              <Image className="w-4 h-4 text-emerald-400" />
              <span>{mediaUrl ? 'Change Photo' : 'Add Photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || (!text.trim() && !mediaUrl)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02]"
            >
              {submitting ? (
                <span>Posting...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Share to Story</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
