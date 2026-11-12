import React, { useState, useRef, useEffect } from 'react';
import { X, Image, Zap, Send, Palette, Camera, RefreshCw, Check } from 'lucide-react';
import { User, Story } from '../../types/chat';
import { api } from '../../services/api';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onStoryCreated: (newStory: Story) => void;
  initialCameraMode?: boolean;
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
  initialCameraMode = false,
}) => {
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [bgColor, setBgColor] = useState(BG_GRADIENTS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Camera Mode state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen && initialCameraMode) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, initialCameraMode]);

  const startCamera = async () => {
    setError(null);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please allow camera permissions or upload a media file.');
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 960;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setMediaUrl(dataUrl);
        stopCamera();
      }
    } catch (err: any) {
      setError('Failed to capture snapshot from camera.');
    }
  };

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please select an image or video file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await api.uploadFile(base64, file.name, file.type);
        setMediaUrl(res.url);
        setError(null);
        stopCamera();
      } catch (err: any) {
        setError(err.message || 'Failed to connect media file');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !mediaUrl) {
      setError('Please enter a message, connect media, or take a photo');
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
      stopCamera();
      onClose();
      setText('');
      setMediaUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to publish status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-lg bg-[#0b1428] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-[#070e20]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">New Status Update</h3>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera View OR Story Preview */}
        <div className="p-4 flex justify-center bg-[#070e20] relative">
          {isCameraActive ? (
            <div className="relative w-64 h-96 rounded-2xl overflow-hidden bg-black border border-emerald-500/50 shadow-2xl flex flex-col items-center justify-between p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover mirror"
              />
              <div className="relative z-10 w-full flex justify-between items-center text-xs text-white bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Camera
                </span>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="text-slate-300 hover:text-white text-[11px]"
                >
                  Cancel
                </button>
              </div>

              {/* Shutter Button */}
              <div className="relative z-10 pb-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-400 shadow-xl flex items-center justify-center text-slate-950 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Take Photo"
                >
                  <Camera className="w-7 h-7" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="relative w-64 h-96 rounded-2xl overflow-hidden shadow-xl border border-slate-700/60 flex items-center justify-center p-6 text-center select-none"
              style={{ backgroundColor: bgColor }}
            >
              {mediaUrl ? (
                <>
                  <img
                    src={mediaUrl}
                    alt="Status preview"
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
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                    title="Remove media"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <p className="text-white text-lg font-bold leading-relaxed">
                  {text || 'Type your status or take a photo...'}
                </p>
              )}
              <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] text-emerald-300 font-mono">
                24h status
              </span>
            </div>
          )}
        </div>

        {/* Composer Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}

          <div>
            <textarea
              placeholder="Add a caption or thought..."
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
          {!mediaUrl && !isCameraActive && (
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
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
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
            <div className="flex items-center gap-2">
              {/* Connect Media File */}
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors text-xs font-semibold">
                <Image className="w-4 h-4 text-emerald-400" />
                <span>Connect Media</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Take Photo Camera Button */}
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white cursor-pointer transition-colors text-xs font-semibold"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>{cameraLoading ? 'Opening...' : 'Take Photo'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || (!text.trim() && !mediaUrl)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] cursor-pointer"
            >
              {submitting ? (
                <span>Posting...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Status</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
