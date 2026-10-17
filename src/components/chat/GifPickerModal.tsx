import React, { useState } from 'react';
import { Search, X, Flame } from 'lucide-react';

interface GifPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

interface GifItem {
  id: string;
  url: string;
  title: string;
  category: string;
}

const CURATED_GIFS: GifItem[] = [
  // Reactions & Funny
  {
    id: 'g1',
    category: 'Funny',
    title: 'Laughing hysterically',
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
  },
  {
    id: 'g2',
    category: 'Funny',
    title: 'Cat vibing to music',
    url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
  },
  {
    id: 'g3',
    category: 'Funny',
    title: 'Popcorn excitement',
    url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
  },
  {
    id: 'g4',
    category: 'Thumbs Up',
    title: 'Leonardo DiCaprio cheers',
    url: 'https://media.giphy.com/media/GCLlQnV7dXZ2E/giphy.gif',
  },
  {
    id: 'g5',
    category: 'Thumbs Up',
    title: 'Iron Man approval',
    url: 'https://media.giphy.com/media/mGK1g88HZRa2FlKGbz/giphy.gif',
  },
  {
    id: 'g6',
    category: 'Gaming',
    title: 'Gamer focus mode',
    url: 'https://media.giphy.com/media/A8Uo4MftHzSZvxV39R/giphy.gif',
  },
  {
    id: 'g7',
    category: 'Gaming',
    title: 'GG High five',
    url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif',
  },
  {
    id: 'g8',
    category: 'Mind Blown',
    title: 'Mind exploded galaxy',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  },
  {
    id: 'g9',
    category: 'Love',
    title: 'Heart sparkling sending love',
    url: 'https://media.giphy.com/media/26FLdm964upIslUZ2/giphy.gif',
  },
  {
    id: 'g10',
    category: 'Celebration',
    title: 'Confetti party celebration',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
  },
  {
    id: 'g11',
    category: 'Dancing',
    title: 'Happy dance groove',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
  },
  {
    id: 'g12',
    category: 'Bye',
    title: 'Homer disappearing into bushes',
    url: 'https://media.giphy.com/media/a93jwI0wkWTQs/giphy.gif',
  },
  {
    id: 'g13',
    category: 'Shock',
    title: 'Surprised Pikachu face',
    url: 'https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif',
  },
  {
    id: 'g14',
    category: 'Celebration',
    title: 'Kobe victory fist pump',
    url: 'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif',
  },
  {
    id: 'g15',
    category: 'Gaming',
    title: 'Victory Royale dance',
    url: 'https://media.giphy.com/media/elhmwUMsAUbScKAbcG/giphy.gif',
  },
  {
    id: 'g16',
    category: 'Love',
    title: 'Warm bear hug',
    url: 'https://media.giphy.com/media/llm4ykFcFCqm2APPOo/giphy.gif',
  },
];

const CATEGORIES = ['All', 'Funny', 'Thumbs Up', 'Gaming', 'Love', 'Celebration', 'Dancing', 'Shock', 'Bye'];

export const GifPickerModal: React.FC<GifPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectGif,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customUrl, setCustomUrl] = useState('');

  if (!isOpen) return null;

  const filteredGifs = CURATED_GIFS.filter((gif) => {
    const matchesCategory = activeCategory === 'All' || gif.category === activeCategory;
    const matchesSearch =
      searchTerm.trim() === '' ||
      gif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gif.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelectGif(customUrl.trim());
      setCustomUrl('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0b1428] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Trending GIFs</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search GIFs (e.g., funny, gaming, cheers, bye)..."
              className="w-full pl-10 pr-4 py-2 bg-[#070d1e] border border-slate-700/70 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Categories Tab Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-sky-500 text-white'
                    : 'bg-[#101c38] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* GIF Grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredGifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => {
                onSelectGif(gif.url);
                onClose();
              }}
              className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-slate-900 border border-slate-800/80 hover:border-sky-400 focus:outline-none transition-all cursor-pointer"
            >
              <img
                src={gif.url}
                alt={gif.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {gif.title}
              </div>
            </button>
          ))}

          {filteredGifs.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 text-sm">
              No matching GIFs found in this category.
            </div>
          )}
        </div>

        {/* Custom GIF URL footer */}
        <div className="px-4 py-3 bg-[#080f22] border-t border-slate-800/80">
          <form onSubmit={handleCustomSend} className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Or paste any direct GIF link here..."
              className="flex-1 px-3 py-1.5 bg-[#070d1e] border border-slate-700/60 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={!customUrl.trim()}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
            >
              Send Link
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
