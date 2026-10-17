import React, { useState, useRef, useEffect } from 'react';
import { Mic, Trash2, Send, Square, Play, Pause } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (audioBase64: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [waveformBars, setWaveformBars] = useState<number[]>([15, 25, 40, 20, 50, 30, 60, 25, 45, 15]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    setDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio analysis for real-time waveform bars
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        analyserRef.current = analyser;

        const updateBars = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          const sample: number[] = [];
          for (let i = 0; i < 12; i++) {
            const val = dataArray[i] || 0;
            // Map 0-255 to 10-85% height
            sample.push(Math.max(10, Math.min(90, Math.round((val / 255) * 85))));
          }
          setWaveformBars(sample);
          animationFrameRef.current = requestAnimationFrame(updateBars);
        };
        updateBars();
      } catch (err) {
        console.warn('Audio visualization unavailable:', err);
      }

      // Determine supported mime type
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(audioBlob);
        setIsRecording(false);
      };

      recorder.start(100);
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setPermissionError('Microphone access was denied or is not available. Please allow microphone permission.');
    }
  };

  const stopAndPreview = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleTogglePreviewPlay = () => {
    if (!audioPreviewRef.current && recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const audio = new Audio(url);
      audioPreviewRef.current = audio;
      audio.onended = () => setIsPreviewing(false);
    }

    if (audioPreviewRef.current) {
      if (isPreviewing) {
        audioPreviewRef.current.pause();
        setIsPreviewing(false);
      } else {
        audioPreviewRef.current.play().then(() => setIsPreviewing(true)).catch(() => {});
      }
    }
  };

  const handleSend = () => {
    if (!recordedBlob) {
      stopAndPreview();
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(recordedBlob);
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      onSend(base64Data, Math.max(1, duration));
      cleanup();
    };
  };

  const handleCancelClick = () => {
    cleanup();
    onCancel();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (permissionError) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs gap-3">
        <span>{permissionError}</span>
        <button
          onClick={handleCancelClick}
          className="px-3 py-1 bg-red-900/80 hover:bg-red-800 rounded-lg text-white font-medium cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#0b1428] border border-sky-500/30 rounded-2xl w-full shadow-lg">
      {/* Cancel button */}
      <button
        type="button"
        onClick={handleCancelClick}
        title="Discard voice recording"
        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Recording status & Waveform */}
      <div className="flex-1 flex items-center gap-3">
        {isRecording ? (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono font-medium text-red-400">{formatTime(duration)}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleTogglePreviewPlay}
            className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center hover:bg-sky-400 transition-colors cursor-pointer"
          >
            {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
        )}

        {/* Dynamic audio waves */}
        <div className="flex-1 h-6 flex items-center gap-1">
          {waveformBars.map((height, idx) => (
            <div
              key={idx}
              style={{ height: `${height}%` }}
              className={`w-1 rounded-full transition-all duration-75 ${
                isRecording ? 'bg-sky-400' : 'bg-slate-500'
              }`}
            />
          ))}
        </div>

        <span className="text-xs text-slate-400 font-mono">
          {isRecording ? 'Recording...' : `${formatTime(duration)}`}
        </span>
      </div>

      {/* Action: Stop/Preview or Send */}
      {isRecording ? (
        <button
          type="button"
          onClick={stopAndPreview}
          title="Pause and review recording"
          className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-sky-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Square className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          title="Send voice note"
          className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white flex items-center justify-center hover:from-sky-400 hover:to-blue-500 glow-blue-sm transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
