import React, { useState, useRef } from 'react';
import { Image, FileText, Film, Music, X, Upload, AlertCircle, Send } from 'lucide-react';
import { api } from '../../services/api';
import { Message } from '../../types/chat';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendAttachment: (payload: {
    mediaUrl: string;
    mediaType: Message['mediaType'];
    fileName: string;
    fileSize: number;
    caption?: string;
  }) => void;
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({
  isOpen,
  onClose,
  onSendAttachment,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<Message['mediaType']>('file');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check 25MB limit
    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit. Please choose a smaller file.');
      return;
    }

    setSelectedFile(file);

    // Determine type
    if (file.type.startsWith('image/')) {
      setMediaType('image');
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setMediaType('video');
      setPreviewUrl(URL.createObjectURL(file));
    } else if (file.type.startsWith('audio/')) {
      setMediaType('audio');
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setMediaType('file');
      setPreviewUrl(null);
    }
  };

  const triggerPicker = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleSend = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          const uploadRes = await api.uploadFile(base64Data, selectedFile.name, selectedFile.type);

          onSendAttachment({
            mediaUrl: uploadRes.url,
            mediaType: mediaType,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            caption: caption.trim() || undefined,
          });

          handleReset();
          onClose();
        } catch (uploadErr: any) {
          setError(uploadErr.message || 'Failed to upload attachment');
          setUploading(false);
        }
      };
    } catch (err: any) {
      setError(err.message || 'Error processing attachment');
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setError(null);
    setUploading(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0b1428] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">
            {selectedFile ? 'Preview Attachment' : 'Share Files & Media'}
          </h3>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Content View */}
        <div className="p-5">
          {!selectedFile ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => triggerPicker('image/*')}
                className="p-4 rounded-xl bg-[#0e1933] border border-slate-800 hover:border-sky-500/60 hover:bg-[#122247] transition-all flex flex-col items-center justify-center text-center gap-2.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Photos &amp; Images</div>
                  <div className="text-[10px] text-slate-500">JPG, PNG, WebP</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerPicker('video/*')}
                className="p-4 rounded-xl bg-[#0e1933] border border-slate-800 hover:border-sky-500/60 hover:bg-[#122247] transition-all flex flex-col items-center justify-center text-center gap-2.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Film className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Videos</div>
                  <div className="text-[10px] text-slate-500">MP4, WebM</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerPicker('audio/*')}
                className="p-4 rounded-xl bg-[#0e1933] border border-slate-800 hover:border-sky-500/60 hover:bg-[#122247] transition-all flex flex-col items-center justify-center text-center gap-2.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Audio Files</div>
                  <div className="text-[10px] text-slate-500">MP3, WAV, OGG</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => triggerPicker('.pdf,.doc,.docx,.txt,.zip,.xlsx,.csv')}
                className="p-4 rounded-xl bg-[#0e1933] border border-slate-800 hover:border-sky-500/60 hover:bg-[#122247] transition-all flex flex-col items-center justify-center text-center gap-2.5 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200">Documents</div>
                  <div className="text-[10px] text-slate-500">PDF, DOC, ZIP</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Media preview */}
              <div className="rounded-xl overflow-hidden bg-[#070d1e] border border-slate-800 max-h-56 flex items-center justify-center relative">
                {mediaType === 'image' && previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-56 w-auto object-contain"
                  />
                )}
                {mediaType === 'video' && previewUrl && (
                  <video src={previewUrl} controls className="max-h-56 w-full object-contain" />
                )}
                {mediaType === 'audio' && (
                  <div className="p-6 text-center">
                    <Music className="w-12 h-12 text-indigo-400 mx-auto mb-2" />
                    <div className="text-xs font-medium text-slate-300 truncate max-w-xs">{selectedFile.name}</div>
                  </div>
                )}
                {mediaType === 'file' && (
                  <div className="p-6 text-center">
                    <FileText className="w-12 h-12 text-teal-400 mx-auto mb-2" />
                    <div className="text-xs font-medium text-slate-300 truncate max-w-xs">{selectedFile.name}</div>
                  </div>
                )}
              </div>

              {/* File details pill */}
              <div className="flex items-center justify-between text-xs text-slate-400 bg-[#070d1e] px-3.5 py-2 rounded-lg border border-slate-800">
                <span className="truncate max-w-[200px] font-medium text-slate-300">{selectedFile.name}</span>
                <span className="shrink-0 font-mono text-[11px]">{formatBytes(selectedFile.size)}</span>
              </div>

              {/* Caption input */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption (optional)..."
                className="w-full px-3.5 py-2 bg-[#070d1e] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Choose Different File
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={uploading}
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-xs flex items-center gap-2 glow-blue-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send File</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
