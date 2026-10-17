import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  durationSeconds?: number;
  isSelf: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  durationSeconds = 0,
  isSelf,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Audio playback error:', err);
      });
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const speeds = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const formatSeconds = (secs: number) => {
    const safe = Math.max(0, Math.round(secs));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Deterministic bars for waveform look
  const barHeights = [20, 45, 60, 30, 80, 50, 90, 70, 40, 60, 85, 35, 75, 45, 95, 30, 55, 70, 40, 25];

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[240px] sm:min-w-[280px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
          isSelf
            ? 'bg-white text-blue-700 hover:bg-slate-100'
            : 'bg-sky-500 text-white hover:bg-sky-400'
        }`}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="relative flex items-center h-7 group">
          {/* Simulated waveform bars */}
          <div className="absolute inset-0 flex items-center gap-[3px] pointer-events-none">
            {barHeights.map((h, i) => {
              const barPercent = (i / barHeights.length) * 100;
              const isPast = barPercent <= progressPercent;
              return (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`w-1 rounded-full transition-colors ${
                    isPast
                      ? isSelf ? 'bg-white' : 'bg-sky-400'
                      : isSelf ? 'bg-blue-300/50' : 'bg-slate-600'
                  }`}
                />
              );
            })}
          </div>

          {/* Hidden range input over bars for scrubbing */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Time display & Speed toggle */}
        <div className="flex items-center justify-between text-[11px] mt-0.5 font-mono">
          <span className={isSelf ? 'text-blue-100' : 'text-slate-400'}>
            {isPlaying ? formatSeconds(currentTime) : formatSeconds(duration || durationSeconds)}
          </span>

          <button
            type="button"
            onClick={cycleSpeed}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-colors cursor-pointer ${
              isSelf
                ? 'bg-blue-800/80 hover:bg-blue-900 text-sky-200'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
