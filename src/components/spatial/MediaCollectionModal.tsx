import React, { useState, useEffect } from 'react';
import {
  Image,
  Video,
  Music,
  FileText,
  Link2,
  X,
  ExternalLink,
  Download,
  FolderOpen,
} from 'lucide-react';
import { Message } from '../../types/chat';
import { api } from '../../services/api';

interface MediaCollectionModalProps {
  conversationId: string;
  conversationName?: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  onPreviewFile?: ((file: { url: string; name: string; type?: string; size?: number }) => void) | ((mediaUrl: string, mediaType: string, fileName?: string) => void);
}

export const MediaCollectionModal: React.FC<MediaCollectionModalProps> = ({
  conversationId,
  conversationName,
  title,
  isOpen,
  onClose,
  onPreviewFile,
}) => {
  const displayName = title || conversationName || 'Shared Media';
  const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'audio' | 'documents' | 'links'>('images');
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<{
    images: Message[];
    videos: Message[];
    audio: Message[];
    documents: Message[];
    links: Message[];
    totalCount: number;
  }>({
    images: [],
    videos: [],
    audio: [],
    documents: [],
    links: [],
    totalCount: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .getMediaCollection(conversationId)
        .then((res) => setCollection(res))
        .catch((err) => console.error('Failed to get media collection:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, conversationId]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'images' as const, label: 'Photos', icon: Image, count: collection.images.length },
    { id: 'videos' as const, label: 'Videos', icon: Video, count: collection.videos.length },
    { id: 'audio' as const, label: 'Audio', icon: Music, count: collection.audio.length },
    { id: 'documents' as const, label: 'Docs', icon: FileText, count: collection.documents.length },
    { id: 'links' as const, label: 'Links', icon: Link2, count: collection.links.length },
  ];

  return (
    <div className="fixed inset-0 z-80 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#0D1E18] border border-[#294438] rounded-3xl w-full max-w-2xl shadow-2xl shadow-emerald-950/80 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 ring-1 ring-[#00C98D]/20">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#294438] bg-[#142A22]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00C98D]/15 border border-[#00C98D]/30 text-[#00C98D] flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F4FFF9] tracking-wide font-heading">
                Shared Media Library
              </h3>
              <p className="text-xs text-[#91A99C]">
                {displayName} · {collection.totalCount} item{collection.totalCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#91A99C] hover:text-[#F4FFF9] hover:bg-[#142A22] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-[#294438] bg-[#071310] overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-[#00C98D] text-[#00C98D] bg-[#142A22]/30'
                    : 'border-transparent text-[#91A99C] hover:text-[#F4FFF9]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#142A22] text-[#91A99C] font-mono">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gallery Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 text-center text-xs text-[#91A99C]">Loading shared media...</div>
          ) : (
            <>
              {activeTab === 'images' && (
                collection.images.length === 0 ? (
                  <p className="text-center py-12 text-xs text-[#91A99C]">No photos shared yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {collection.images.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => {
                          if (!onPreviewFile) return;
                          if (onPreviewFile.length <= 1) {
                            (onPreviewFile as any)({ url: img.mediaUrl!, name: img.fileName || 'Photo', type: 'image' });
                          } else {
                            (onPreviewFile as any)(img.mediaUrl!, 'image', img.fileName);
                          }
                        }}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-[#071310] border border-[#294438] cursor-pointer hover:border-[#00C98D]/60 transition-all shadow-sm"
                      >
                        <img src={img.mediaUrl} alt="media" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <ExternalLink className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'videos' && (
                collection.videos.length === 0 ? (
                  <p className="text-center py-12 text-xs text-[#91A99C]">No videos shared yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {collection.videos.map((vid) => (
                      <div key={vid.id} className="rounded-2xl overflow-hidden bg-[#071310] border border-[#294438] p-2 space-y-2">
                        <video src={vid.mediaUrl} controls className="w-full rounded-xl max-h-44 object-cover" />
                        <p className="text-[11px] text-[#91A99C] font-mono">{new Date(vid.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'audio' && (
                collection.audio.length === 0 ? (
                  <p className="text-center py-12 text-xs text-[#91A99C]">No voice notes or audio recordings found.</p>
                ) : (
                  <div className="space-y-2">
                    {collection.audio.map((aud) => (
                      <div key={aud.id} className="p-3 rounded-2xl bg-[#142A22]/70 border border-[#294438] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Music className="w-4 h-4 text-[#00C98D] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#F4FFF9] truncate">{aud.fileName || 'Voice Message'}</p>
                            <p className="text-[10px] text-[#91A99C] font-mono">{new Date(aud.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <audio src={aud.mediaUrl} controls className="h-8 max-w-[200px]" />
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'documents' && (
                collection.documents.length === 0 ? (
                  <p className="text-center py-12 text-xs text-[#91A99C]">No documents or files shared yet.</p>
                ) : (
                  <div className="space-y-2">
                    {collection.documents.map((doc) => (
                      <div key={doc.id} className="p-3 rounded-2xl bg-[#142A22]/70 border border-[#294438] flex items-center justify-between gap-3 hover:border-[#00C98D]/40 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#F4FFF9] truncate">{doc.fileName || 'Document File'}</p>
                            <p className="text-[10px] text-[#91A99C] font-mono">
                              {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'File'} · {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <a
                          href={doc.mediaUrl}
                          download={doc.fileName || 'file'}
                          className="p-2 rounded-xl bg-[#071310] hover:bg-[#00C98D] text-[#91A99C] hover:text-[#071310] transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'links' && (
                collection.links.length === 0 ? (
                  <p className="text-center py-12 text-xs text-[#91A99C]">No shared links found.</p>
                ) : (
                  <div className="space-y-2">
                    {collection.links.map((lnk) => {
                      const match = lnk.text.match(/(https?:\/\/[^\s]+)/);
                      const url = match ? match[0] : '#';
                      return (
                        <div key={lnk.id} className="p-3 rounded-2xl bg-[#142A22]/70 border border-[#294438] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Link2 className="w-4 h-4 text-[#00C98D] shrink-0" />
                            <div className="min-w-0">
                              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#63F5C0] hover:underline truncate block">
                                {url}
                              </a>
                              <p className="text-[10px] text-[#91A99C]">Sent by @{lnk.senderId}</p>
                            </div>
                          </div>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#91A99C] hover:text-[#F4FFF9]">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
