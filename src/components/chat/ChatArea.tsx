import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Check,
  CheckCheck,
  X,
  CornerUpLeft,
  Edit2,
  Trash2,
  Flag,
  Download,
  FileText,
  Shield,
  ChevronDown,
  Info,
  Maximize2,
  Phone,
  Video,
} from 'lucide-react';
import { User, Message, Reaction, FriendContact } from '../../types/chat';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { GifPickerModal } from './GifPickerModal';
import { AttachmentModal } from './AttachmentModal';

interface ChatAreaProps {
  currentUser: User;
  activeFriend: FriendContact;
  onBackToSidebar: () => void;
  onOpenProfile: (user: User) => void;
  isTyping: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '👏', '🙏', '🎉', '💯'];
const REACTION_BAR = ['👍', '❤️', '🔥', '😂', '😮', '😢'];

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUser,
  activeFriend,
  onBackToSidebar,
  onOpenProfile,
  isTyping,
  onStartVoiceCall,
  onStartVideoCall,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Modals & Panels
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Message Context Menu state
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);

  // Report Modal
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Fetch conversation messages
  useEffect(() => {
    loadConversation();
  }, [activeFriend.id]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const msgs = await api.getMessages(activeFriend.id);
      const uniqueMsgs = Array.from(new Map(msgs.map((m) => [m.id, m])).values());
      setMessages(uniqueMsgs);
      // Mark messages as read
      await api.markAsRead(activeFriend.id);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom on initial load or new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle SSE live stream events
  useEffect(() => {
    const token = localStorage.getItem('zayan_chat_token');
    if (!token) return;

    const eventSource = new EventSource(`/api/events?token=${token}`);

    eventSource.addEventListener('new_message', (e) => {
      try {
        const newMsg: Message = JSON.parse(e.data);
        if (
          (newMsg.senderId === activeFriend.id && newMsg.receiverId === currentUser.id) ||
          (newMsg.senderId === currentUser.id && newMsg.receiverId === activeFriend.id)
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (newMsg.senderId === activeFriend.id) {
            sound.playReceive();
            api.markAsRead(activeFriend.id).catch(() => {});
          }
        }
      } catch (err) {
        console.error('SSE new_message parse error', err);
      }
    });

    eventSource.addEventListener('message_edited', (e) => {
      try {
        const editedMsg: Message = JSON.parse(e.data);
        setMessages((prev) => prev.map((m) => (m.id === editedMsg.id ? editedMsg : m)));
      } catch (err) {
        console.error('SSE edit error', err);
      }
    });

    eventSource.addEventListener('message_deleted', (e) => {
      try {
        const { messageId } = JSON.parse(e.data);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isDeleted: true,
                  text: 'This message was deleted',
                  mediaUrl: undefined,
                  mediaType: undefined,
                  fileName: undefined,
                  reactions: [],
                }
              : m
          )
        );
      } catch (err) {
        console.error('SSE delete error', err);
      }
    });

    eventSource.addEventListener('message_reaction', (e) => {
      try {
        const { messageId, reactions } = JSON.parse(e.data);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      } catch (err) {
        console.error('SSE reaction error', err);
      }
    });

    eventSource.addEventListener('messages_read', (e) => {
      try {
        const { readerId } = JSON.parse(e.data);
        if (readerId === activeFriend.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === currentUser.id ? { ...m, status: 'read' as const } : m
            )
          );
        }
      } catch (err) {
        console.error('SSE read error', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [activeFriend.id, currentUser.id]);

  // Typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    // Send typing notification
    api.sendTyping(activeFriend.id, true).catch(() => {});

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      api.sendTyping(activeFriend.id, false).catch(() => {});
    }, 2000);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);

    // If editing existing message
    if (editingMessage) {
      try {
        const updated = await api.editMessage(editingMessage.id, textToSend);
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMessage(null);
      } catch (err: any) {
        alert(err.message || 'Failed to edit message');
      }
      return;
    }

    const appendMessageSafely = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    // Normal message send
    const replyId = replyingTo?.id;
    setReplyingTo(null);

    try {
      const msg = await api.sendMessage({
        receiverId: activeFriend.id,
        text: textToSend,
        replyToId: replyId,
      });

      appendMessageSafely(msg);
      sound.playSend();
      api.sendTyping(activeFriend.id, false).catch(() => {});
    } catch (err: any) {
      console.error('Failed to send message:', err);
    }
  };

  // Send Voice Note
  const handleSendVoice = async (audioBase64: string, durationSeconds: number) => {
    setShowVoiceRecorder(false);
    try {
      // First upload audio file
      const upload = await api.uploadFile(audioBase64, `voice_${Date.now()}.webm`, 'audio/webm');
      const msg = await api.sendMessage({
        receiverId: activeFriend.id,
        mediaUrl: upload.url,
        mediaType: 'voice',
        voiceDuration: durationSeconds,
        replyToId: replyingTo?.id,
      });
      setReplyingTo(null);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      sound.playSend();
    } catch (err: any) {
      alert(err.message || 'Failed to send voice message');
    }
  };

  // Send GIF
  const handleSendGif = async (gifUrl: string) => {
    setShowGifPicker(false);
    try {
      const msg = await api.sendMessage({
        receiverId: activeFriend.id,
        mediaUrl: gifUrl,
        mediaType: 'gif',
        replyToId: replyingTo?.id,
      });
      setReplyingTo(null);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      sound.playSend();
    } catch (err: any) {
      alert(err.message || 'Failed to send GIF');
    }
  };

  // Send Attachment (Image, Video, Audio, File)
  const handleSendAttachment = async (payload: {
    mediaUrl: string;
    mediaType: Message['mediaType'];
    fileName: string;
    fileSize: number;
    caption?: string;
  }) => {
    try {
      const msg = await api.sendMessage({
        receiverId: activeFriend.id,
        mediaUrl: payload.mediaUrl,
        mediaType: payload.mediaType,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        text: payload.caption,
        replyToId: replyingTo?.id,
      });
      setReplyingTo(null);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      sound.playSend();
    } catch (err: any) {
      alert(err.message || 'Failed to send file');
    }
  };

  // Toggle Reaction
  const handleReact = async (messageId: string, emoji: string) => {
    setActiveMenuMessageId(null);
    try {
      const newReactions = await api.reactMessage(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions: newReactions } : m))
      );
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg: Message) => {
    setActiveMenuMessageId(null);
    const confirmed = window.confirm('Delete this message?');
    if (!confirmed) return;

    try {
      await api.deleteMessage(msg.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                isDeleted: true,
                text: 'This message was deleted',
                mediaUrl: undefined,
                mediaType: undefined,
                reactions: [],
              }
            : m
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  // Edit initiate
  const handleStartEdit = (msg: Message) => {
    setActiveMenuMessageId(null);
    setEditingMessage(msg);
    setInputText(msg.text);
  };

  // Submit report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMessage || !reportReason.trim()) return;

    try {
      await api.reportMessage(reportingMessage.id, reportReason.trim());
      setReportSent(true);
      setTimeout(() => {
        setReportingMessage(null);
        setReportReason('');
        setReportSent(false);
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    }
  };

  // Deduplicate and filter messages for search
  const displayedMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (!m || !m.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      if (!searchQuery.trim()) return true;
      return m.text?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [messages, searchQuery]);

  const formatMessageTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#07111F] relative select-none">
      {/* Subtle background motif */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#00D68F_1px,transparent_1px)] [background-size:24px_24px]"
      />

      {/* Top Conversation Header */}
      <div className="h-16 px-4 bg-[#0D1B2A] border-b border-[#1E3042] flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Back button for mobile */}
          <button
            type="button"
            onClick={onBackToSidebar}
            className="md:hidden p-2 -ml-2 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar and Details */}
          <button
            type="button"
            onClick={() => onOpenProfile(activeFriend)}
            className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity cursor-pointer group"
          >
            <div className="relative">
              <img
                src={activeFriend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeFriend.id}`}
                alt={activeFriend.displayName}
                className="w-10 h-10 rounded-full object-cover border border-[#1E3042] shadow-sm"
              />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#0D1B2A] ${
                  activeFriend.online ? 'bg-[#00D68F]' : 'bg-slate-600'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#E8F0FA] group-hover:text-[#00D68F] transition-colors">
                  {activeFriend.displayName}
                </span>
                {activeFriend.role === 'admin' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-[#94A3B8]">
                {isTyping ? (
                  <span className="text-[#00D68F] font-semibold animate-pulse">typing...</span>
                ) : activeFriend.online ? (
                  <span className="text-[#00D68F] font-medium">online</span>
                ) : (
                  <span>last seen {new Date(activeFriend.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Top Header Actions: Voice Call, Video Call, Search, Info */}
        <div className="flex items-center gap-1">
          {onStartVideoCall && (
            <button
              type="button"
              onClick={onStartVideoCall}
              title="Start Video Call"
              className="p-2 rounded-xl text-[#00D68F] hover:bg-[#00D68F]/15 transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {onStartVoiceCall && (
            <button
              type="button"
              onClick={onStartVoiceCall}
              title="Start Voice Call"
              className="p-2 rounded-xl text-[#00D68F] hover:bg-[#00D68F]/15 transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            title="Search in conversation"
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenProfile(activeFriend)}
            title="View contact info"
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar Dropdown */}
      {showSearch && (
        <div className="p-2.5 bg-[#0D1B2A] border-b border-[#1E3042] flex items-center gap-2 z-10 animate-in slide-in-from-top-2">
          <Search className="w-4 h-4 text-[#94A3B8] ml-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversation..."
            className="flex-1 bg-transparent border-none text-xs text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[#94A3B8] hover:text-[#E8F0FA] p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="text-xs text-[#94A3B8] hover:text-[#E8F0FA] px-2 py-1 rounded cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative z-10">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#00D68F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#94A3B8]">
            <div className="w-14 h-14 rounded-2xl bg-[#00D68F]/10 border border-[#00D68F]/20 flex items-center justify-center text-[#00D68F] mb-3">
              <Shield className="w-7 h-7" />
            </div>
            <h4 className="text-[#E8F0FA] font-semibold text-sm mb-1">
              End-to-End Encrypted Chat
            </h4>
            <p className="text-xs text-[#94A3B8] max-w-xs">
              Messages and calls are secured with end-to-end encryption. Say hello to {activeFriend.displayName}!
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isSelf = msg.senderId === currentUser.id;
            const hasReactions = msg.reactions && msg.reactions.length > 0;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} group relative`}
              >
                {/* Bubble Container */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md transition-all ${
                    isSelf
                      ? 'bg-[#073D32] text-[#E8F0FA] rounded-br-xs'
                      : 'bg-[#152435] text-[#E8F0FA] rounded-bl-xs border border-[#1E3042]'
                  }`}
                >
                  {/* Context menu toggle button */}
                  {!msg.isDeleted && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuMessageId(activeMenuMessageId === msg.id ? null : msg.id)
                      }
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/20 hover:bg-black/40 text-[#94A3B8] hover:text-[#E8F0FA] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Reply Quote Snippet */}
                  {msg.replyToSnippet && (
                    <div
                      className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${
                        isSelf
                          ? 'bg-[#052821] border-[#00D68F] text-[#E8F0FA]'
                          : 'bg-[#0D1B2A] border-[#00D68F] text-[#E8F0FA]'
                      }`}
                    >
                      <div className="font-bold text-[10px] text-[#00D68F] mb-0.5">
                        {msg.replyToSnippet.senderId === currentUser.id ? 'You' : activeFriend.displayName}
                      </div>
                      <div className="truncate text-[11px] opacity-90 text-[#E8F0FA]">
                        {msg.replyToSnippet.text || `[${msg.replyToSnippet.mediaType}]`}
                      </div>
                    </div>
                  )}

                  {/* Message Content: Voice Note */}
                  {msg.mediaType === 'voice' && msg.mediaUrl && (
                    <VoiceMessagePlayer
                      audioUrl={msg.mediaUrl}
                      durationSeconds={msg.voiceDuration}
                      isSelf={isSelf}
                    />
                  )}

                  {/* Message Content: Image */}
                  {msg.mediaType === 'image' && msg.mediaUrl && (
                    <div className="mb-1 rounded-xl overflow-hidden relative cursor-pointer group/img">
                      <img
                        src={msg.mediaUrl}
                        alt="Shared image"
                        onClick={() => setEnlargedImage(msg.mediaUrl!)}
                        className="max-h-80 w-auto rounded-xl object-cover hover:scale-[1.01] transition-transform"
                      />
                      <button
                        onClick={() => setEnlargedImage(msg.mediaUrl!)}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Message Content: GIF */}
                  {msg.mediaType === 'gif' && msg.mediaUrl && (
                    <div className="mb-1 rounded-xl overflow-hidden">
                      <img
                        src={msg.mediaUrl}
                        alt="Shared GIF"
                        className="max-h-72 w-auto rounded-xl object-contain"
                      />
                    </div>
                  )}

                  {/* Message Content: Video */}
                  {msg.mediaType === 'video' && msg.mediaUrl && (
                    <div className="mb-1 rounded-xl overflow-hidden max-w-sm">
                      <video src={msg.mediaUrl} controls className="w-full rounded-xl" />
                    </div>
                  )}

                  {/* Message Content: Audio file */}
                  {msg.mediaType === 'audio' && msg.mediaUrl && (
                    <div className="mb-1 p-2 bg-black/20 rounded-xl">
                      <audio src={msg.mediaUrl} controls className="w-full h-8" />
                    </div>
                  )}

                  {/* Message Content: Document file */}
                  {msg.mediaType === 'file' && msg.mediaUrl && (
                    <a
                      href={msg.mediaUrl}
                      download={msg.fileName || 'attachment'}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-3 p-2.5 rounded-xl mb-1 transition-colors ${
                        isSelf ? 'bg-[#052821] hover:bg-[#073D32]' : 'bg-[#0D1B2A] hover:bg-[#111E2D]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#00D68F]/20 text-[#00D68F] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate text-[#E8F0FA]">
                          {msg.fileName || 'Document Attachment'}
                        </div>
                        {msg.fileSize && (
                          <div className="text-[10px] text-[#94A3B8] font-mono">
                            {(msg.fileSize / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </div>
                      <Download className="w-4 h-4 text-[#94A3B8] shrink-0" />
                    </a>
                  )}

                  {/* Text body */}
                  {msg.text && (
                    <div
                      className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.isDeleted ? 'italic text-[#94A3B8] text-xs' : 'text-[#E8F0FA]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* Footer: timestamp + ticks */}
                  <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] select-none">
                    {msg.isEdited && (
                      <span className="text-[#94A3B8]">edited</span>
                    )}
                    <span className="text-[#94A3B8] font-mono">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                    {isSelf && !msg.isDeleted && (
                      <span className="shrink-0 inline-flex items-center">
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#00D68F]" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#94A3B8]" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-[#94A3B8]" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions badge row */}
                {hasReactions && (
                  <div className={`flex flex-wrap gap-1 -mt-2 z-10 ${isSelf ? 'mr-2' : 'ml-2'}`}>
                    {msg.reactions.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleReact(msg.id, r.emoji)}
                        className={`px-2 py-0.5 rounded-full text-xs border shadow-sm flex items-center gap-1 transition-transform active:scale-95 cursor-pointer ${
                          r.userId === currentUser.id
                            ? 'bg-[#073D32] border-[#00D68F] text-[#E8F0FA] font-bold'
                            : 'bg-[#111E2D] border-[#1E3042] text-[#E8F0FA]'
                        }`}
                      >
                        <span>{r.emoji}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Message Dropdown Actions Menu */}
                {activeMenuMessageId === msg.id && (
                  <div
                    className={`absolute z-30 mt-1 bg-[#0D1B2A] border border-[#1E3042] rounded-xl shadow-2xl p-1.5 text-xs text-[#E8F0FA] min-w-[170px] ${
                      isSelf ? 'right-0 top-10' : 'left-0 top-10'
                    }`}
                  >
                    {/* Quick Reactions Bar */}
                    <div className="flex items-center justify-around p-1.5 border-b border-[#1E3042] mb-1">
                      {REACTION_BAR.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReact(msg.id, emoji)}
                          className="hover:scale-125 transition-transform p-1 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(msg);
                        setActiveMenuMessageId(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-left cursor-pointer"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5 text-sky-400" />
                      <span>Reply</span>
                    </button>

                    {isSelf && !msg.isDeleted && msg.text && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(msg)}
                        className="w-full px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Edit message</span>
                      </button>
                    )}

                    {(isSelf || currentUser.role === 'admin') && !msg.isDeleted && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg)}
                        className="w-full px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete message</span>
                      </button>
                    )}

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => {
                          setReportingMessage(msg);
                          setActiveMenuMessageId(null);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-amber-400 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Report to Admin</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator bubble */}
        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
            <div className="bg-[#132247] px-3.5 py-2 rounded-2xl rounded-bl-xs flex items-center gap-1.5 border border-slate-700/40">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-[#0D1B2A] border-t border-[#1E3042] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <CornerUpLeft className="w-4 h-4 text-[#00D68F] shrink-0" />
            <div className="border-l-2 border-[#00D68F] pl-2 min-w-0">
              <span className="font-bold text-[#00D68F] block">
                Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : activeFriend.displayName}
              </span>
              <span className="text-[#94A3B8] truncate block text-[11px]">
                {replyingTo.text || `[${replyingTo.mediaType}]`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-full text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Banner */}
      {editingMessage && (
        <div className="px-4 py-2 bg-[#0D1B2A] border-t border-[#00D68F]/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-[#00D68F]" />
            <span className="text-[#00D68F] font-semibold">Editing message</span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="text-[#94A3B8] hover:text-[#E8F0FA] text-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Bottom Input Area */}
      <div className="p-3 sm:p-4 bg-[#0D1B2A] border-t border-[#1E3042] shrink-0 relative z-20">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onSend={handleSendVoice}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => setShowAttachmentModal(true)}
              title="Attach media or document"
              className="p-2.5 rounded-xl text-[#94A3B8] hover:text-[#00D68F] hover:bg-[#111E2D] transition-colors cursor-pointer"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* GIF Button */}
            <button
              type="button"
              onClick={() => setShowGifPicker(true)}
              title="Search and send GIFs"
              className="p-2.5 rounded-xl text-[#94A3B8] hover:text-[#00D68F] hover:bg-[#111E2D] transition-colors cursor-pointer text-xs font-bold"
            >
              GIF
            </button>

            {/* Emoji Picker Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Emoji picker"
                className="p-2.5 rounded-xl text-[#94A3B8] hover:text-[#00D68F] hover:bg-[#111E2D] transition-colors cursor-pointer"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Emoji Popover */}
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 p-3 bg-[#0D1B2A] border border-[#1E3042] rounded-2xl shadow-2xl grid grid-cols-5 gap-2 z-30">
                  {COMMON_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => prev + em);
                        setShowEmojiPicker(false);
                      }}
                      className="text-xl p-1.5 rounded-lg hover:bg-[#111E2D] transition-transform hover:scale-125 cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 py-2.5 px-4 bg-[#111E2D] border border-[#1E3042] rounded-xl text-sm text-[#E8F0FA] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D68F] transition-all"
            />

            {/* Send or Voice Button */}
            {inputText.trim() ? (
              <button
                type="submit"
                title="Send message"
                className="w-10 h-10 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                title="Record voice message"
                className="w-10 h-10 rounded-xl bg-[#111E2D] hover:bg-[#00D68F] text-[#00D68F] hover:text-[#07111F] flex items-center justify-center transition-all cursor-pointer border border-[#1E3042]"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* GIF Picker Modal */}
      <GifPickerModal
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleSendGif}
      />

      {/* Attachment Modal */}
      <AttachmentModal
        isOpen={showAttachmentModal}
        onClose={() => setShowAttachmentModal(false)}
        onSendAttachment={handleSendAttachment}
      />

      {/* Enlarge Image Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={enlargedImage}
              alt="Enlarged preview"
              className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Inappropriate Content Reporting Modal */}
      {reportingMessage && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0b1428] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-amber-400" />
                Report Message to Administrator
              </h3>
              <button
                onClick={() => setReportingMessage(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSent ? (
              <div className="py-6 text-center text-emerald-400 text-sm font-semibold">
                Thank you. Your report has been submitted to Admin Zayan for moderation.
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div className="bg-[#070d1e] p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <span className="text-slate-500 font-mono text-[10px] block mb-1">
                    REPORTED MESSAGE:
                  </span>
                  "{reportingMessage.text || `[${reportingMessage.mediaType}]`}"
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Why are you reporting this message?
                  </label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    rows={3}
                    placeholder="Describe inappropriate content, harassment, or spam..."
                    className="w-full px-3 py-2 bg-[#070d1e] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingMessage(null)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors cursor-pointer"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
