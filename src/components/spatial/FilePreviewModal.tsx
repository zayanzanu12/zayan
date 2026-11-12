import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  FileText,
  Music,
  Video,
} from 'lucide-react';

interface FilePreviewModalProps {
  isOpen?: boolean;
  file?: {
    url: string;
    name: string;
    type?: string;
    size?: number;
  } | null;
  onClose: () => void;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  file,
  onClose,
  mediaUrl,
  mediaType,
  fileName,
  fileSize,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const activeUrl = file?.url || mediaUrl;
  const activeType = file?.type || mediaType || 'file';
  const activeName = file?.name || fileName || 'Attachment';
  const activeSize = file?.size || fileSize;
  const isVisible = file ? Boolean(file.url) : Boolean(isOpen && mediaUrl);

  if (!isVisible || !activeUrl) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-99 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 select-none animate-in fade-in">
      {/* Top action toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between px-4 py-3 rounded-2xl bg-[#0D1E18]/80 border border-[#294438] backdrop-blur-md text-[#F4FFF9] z-10">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[#00C98D] shrink-0" />
          <span className="text-xs font-semibold truncate max-w-xs">{activeName}</span>
          {activeSize && (
            <span className="text-[10px] text-[#91A99C] font-mono">
              ({Math.round(activeSize / 1024)} KB)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeType === 'image' && (
            <>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-xl hover:bg-[#142A22] text-[#91A99C] hover:text-[#F4FFF9] transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-xl hover:bg-[#142A22] text-[#91A99C] hover:text-[#F4FFF9] transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotate}
                className="p-1.5 rounded-xl hover:bg-[#142A22] text-[#91A99C] hover:text-[#F4FFF9] transition-colors"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          <a
            href={activeUrl}
            download={activeName}
            className="p-1.5 rounded-xl hover:bg-[#142A22] text-[#00C98D] transition-colors flex items-center gap-1 text-xs"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#142A22] text-[#91A99C] hover:text-[#F4FFF9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 w-full max-w-4xl flex items-center justify-center p-4 overflow-hidden relative">
        {activeType === 'image' && (
          <div className="overflow-auto max-h-[75vh] flex items-center justify-center transition-all">
            <img
              src={activeUrl}
              alt={activeName}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
              className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        )}

        {activeType === 'video' && (
          <video
            src={activeUrl}
            controls
            autoPlay
            className="max-h-[70vh] max-w-full rounded-2xl shadow-2xl bg-black"
          />
        )}

        {(activeType === 'audio' || activeType === 'voice') && (
          <div className="p-8 rounded-3xl bg-[#0D1E18] border border-[#294438] w-full max-w-md flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-[#00C98D]/20 border border-[#00C98D]/40 text-[#00C98D] flex items-center justify-center">
              <Music className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#F4FFF9]">{activeName}</h4>
              <p className="text-xs text-[#91A99C] mt-0.5">High Definition Audio Playback</p>
            </div>
            <audio src={activeUrl} controls autoPlay className="w-full mt-2" />
          </div>
        )}

        {activeType === 'file' && (
          <div className="p-8 rounded-3xl bg-[#0D1E18] border border-[#294438] w-full max-w-md flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#F4FFF9]">{activeName}</h4>
              <p className="text-xs text-[#91A99C] mt-0.5">
                {activeSize ? `${Math.round(activeSize / 1024)} KB` : 'Binary document'}
              </p>
            </div>
            <a
              href={activeUrl}
              download={activeName}
              className="px-6 py-2.5 rounded-2xl bg-[#00C98D] hover:bg-[#00C98D]/90 text-[#071310] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-[#00C98D]/20"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </a>
          </div>
        )}
      </div>

      {/* Footer footnote */}
      <div className="text-[11px] text-[#91A99C] font-mono pb-2">
        ZappChat 2.0 Spatial File Viewer
      </div>
    </div>
  );
};
