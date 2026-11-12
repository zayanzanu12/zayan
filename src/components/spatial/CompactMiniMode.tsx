import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  X,
  Send,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { User, Message, FriendContact } from '../../types/chat';
import { api } from '../../services/api';

interface CompactMiniModeProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentUser: User;
  activeFriend?: FriendContact | null;
  messages?: Message[];
  onSendMessage?: (text: string) => void;
  onExpandToFull?: () => void;
  onCloseMini?: () => void;
  friends?: FriendContact[];
  onSelectFriend?: (id: string) => void;
}

export const CompactMiniMode: React.FC<CompactMiniModeProps> = ({
  isOpen = true,
  onClose,
  currentUser,
  activeFriend,
  messages: externalMessages,
  onSendMessage,
  onExpandToFull = () => {},
  onCloseMini,
  friends = [],
  onSelectFriend,
}) => {
  const [inputText, setInputText] = useState('');
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!externalMessages && activeFriend?.id) {
      api.getMessages(activeFriend.id).then(setLocalMessages).catch(() => {});
    }
  }, [externalMessages, activeFriend?.id]);

  if (!isOpen) return null;

  const messages = externalMessages || localMessages;
  const handleClose = onClose || onCloseMini || (() => {});

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');

    if (onSendMessage) {
      onSendMessage(textToSend);
    } else if (activeFriend?.id) {
      try {
        const msg = await api.sendMessage({
          receiverId: activeFriend.id,
          text: textToSend,
        });
        setLocalMessages((prev) => [...prev, msg]);
      } catch (err) {
        console.error('Failed to send mini message:', err);
      }
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-80 w-80 sm:w-96 rounded-3xl bg-[#0D1E18] border border-[#294438] shadow-2xl shadow-emerald-950/90 flex flex-col overflow-hidden animate-in zoom-in-90 ring-1 ring-[#00C98D]/30 select-none">
      {/* Top Bar */}
      <div className="px-4 py-3 bg-[#142A22] border-b border-[#294438] flex items-center justify-between text-[#F4FFF9]">
        <div
          onClick={() => setShowFriendPicker(!showFriendPicker)}
          className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity min-w-0"
        >
          <div className="relative">
            <img
              src={activeFriend?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=chat`}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-[#00C98D]/50"
            />
            {activeFriend?.online && (
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#00C98D] ring-1 ring-[#0D1E18]" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold truncate flex items-center gap-1">
              <span>{activeFriend?.displayName || 'Select conversation'}</span>
              <ChevronDown className="w-3 h-3 text-[#91A99C]" />
            </h4>
            <span className="text-[10px] text-[#00C98D] font-mono">Mini Mode</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onExpandToFull}
            className="p-1.5 rounded-lg hover:bg-[#071310] text-[#91A99C] hover:text-[#00C98D] transition-colors"
            title="Expand to Full Workspace"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[#071310] text-[#91A99C] hover:text-[#F4FFF9] transition-colors"
            title="Close Mini Window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Switcher dropdown */}
      {showFriendPicker && (
        <div className="max-h-40 overflow-y-auto bg-[#071310] border-b border-[#294438] p-1.5 space-y-1">
          {friends.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                onSelectFriend?.(f.id);
                setShowFriendPicker(false);
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-[#142A22] text-xs transition-colors"
            >
              <span className="text-[#F4FFF9] font-medium truncate">{f.displayName}</span>
              {f.unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#00C98D] text-[#071310] text-[10px] font-bold flex items-center justify-center">
                  {f.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Mini Messages Viewport */}
      <div className="h-56 overflow-y-auto p-3 space-y-2 bg-[#071310]/60 text-xs">
        {messages.slice(-10).map((m) => {
          const isMe = m.senderId === currentUser.id;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`p-2.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  isMe
                    ? 'bg-[#00C98D] text-[#071310] font-medium rounded-br-none'
                    : 'bg-[#142A22] text-[#F4FFF9] rounded-bl-none border border-[#294438]'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[9px] text-[#91A99C] mt-0.5 px-1 font-mono">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mini Input Box vs Admin Supervision */}
      {currentUser.role === 'admin' ? (
        <div className="p-3 bg-[#0D1E18] border-t border-[#294438] flex items-center gap-2 text-xs text-[#91A99C]">
          <Shield className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">Admin Supervision // Cannot send messages</span>
        </div>
      ) : (
        <form onSubmit={handleSend} className="p-2.5 bg-[#0D1E18] border-t border-[#294438] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Reply in mini mode..."
            className="flex-1 bg-[#142A22] border border-[#294438] rounded-xl px-3 py-2 text-xs text-[#F4FFF9] placeholder-[#91A99C] focus:outline-none focus:border-[#00C98D]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-[#00C98D] hover:bg-[#00C98D]/90 disabled:opacity-40 text-[#071310] transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
