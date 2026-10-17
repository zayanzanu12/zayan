import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { User } from '../../types/chat';
import { api } from '../../services/api';
import { sound } from '../../services/sound';

export interface CallSession {
  callId: string;
  callType: 'voice' | 'video';
  isIncoming: boolean;
  peerUser: User;
  status: 'ringing' | 'connected' | 'ended';
}

interface CallOverlayProps {
  currentUser: User;
  session: CallSession;
  onEndCall: () => void;
  incomingSignal?: {
    type: 'offer' | 'answer' | 'ice-candidate';
    signalData: any;
  } | null;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  currentUser,
  session,
  onEndCall,
  incomingSignal,
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(
    session.status === 'connected' ? 'connected' : 'ringing'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(session.callType === 'video');
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Sound effects
  useEffect(() => {
    if (callStatus === 'ringing') {
      if (session.isIncoming) {
        sound.startRingtone();
      } else {
        sound.startCallingTone();
      }
    } else {
      sound.stopRingtone();
      sound.stopCallingTone();
    }

    return () => {
      sound.stopRingtone();
      sound.stopCallingTone();
    };
  }, [callStatus, session.isIncoming]);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      timerIntervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [callStatus]);

  // Initialize WebRTC
  const initWebRTC = async () => {
    try {
      setCallStatus('connecting');
      const iceServers = await api.getIceServers();

      const pc = new RTCPeerConnection({
        iceServers: iceServers.length > 0 ? iceServers : [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          api.sendCallSignal(session.callId, session.peerUser.id, 'ice-candidate', event.candidate).catch(() => {});
        }
      };

      // Handle Remote Stream Tracks
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        if (session.callType === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          handleTerminate();
        }
      };

      // Capture Local Audio & Video with resilient device fallback
      let localStream: MediaStream | null = null;
      try {
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          // Attempt 1: Full requested constraints
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: session.callType === 'video' ? { facingMode } : false,
            });
          } catch (firstErr) {
            console.warn('Requested device constraints not met, trying simplified device constraints:', firstErr);
            if (session.callType === 'video') {
              // Attempt 2: Try basic video without facingMode constraint
              try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
              } catch (vidErr) {
                console.warn('Camera device not found, falling back to audio-only stream:', vidErr);
                // Attempt 3: Try audio only
                try {
                  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                } catch (audErr) {
                  console.warn('Microphone device not found:', audErr);
                }
              }
            } else {
              // Attempt 2 for voice call: standard audio
              try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              } catch (audErr) {
                console.warn('Microphone device not found:', audErr);
              }
            }
          }
        }
      } catch (mediaErr) {
        console.warn('navigator.mediaDevices error:', mediaErr);
      }

      // If no physical hardware devices are attached (e.g. headless/container/no-mic environment),
      // generate a virtual audio track so WebRTC offer/answer negotiation never crashes with "Requested device not found"
      if (!localStream || localStream.getTracks().length === 0) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            gain.gain.value = 0; // Silent carrier
            osc.connect(gain);
            const dst = audioCtx.createMediaStreamDestination();
            gain.connect(dst);
            osc.start();
            localStream = dst.stream;
          }
        } catch (synthErr) {
          console.warn('Could not generate synthetic media stream:', synthErr);
        }
      }

      if (!localStream) {
        localStream = new MediaStream();
      }

      localStreamRef.current = localStream;

      if (localVideoRef.current && session.callType === 'video') {
        localVideoRef.current.srcObject = localStream;
      }

      // Add tracks to peer connection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream!);
      });

      // If caller, create SDP Offer
      if (!session.isIncoming) {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: session.callType === 'video',
        });
        await pc.setLocalDescription(offer);
        await api.sendCallSignal(session.callId, session.peerUser.id, 'offer', offer);
      }

      return pc;
    } catch (err: any) {
      console.error('WebRTC initialization failed:', err);
      setErrorMsg('Microphone or Camera access failed. Please ensure permissions are granted.');
      setTimeout(() => handleTerminate(), 3000);
    }
  };

  // Start outgoing call on mount
  useEffect(() => {
    if (!session.isIncoming) {
      initWebRTC();
    }
  }, []);

  // Handle incoming signaling messages
  useEffect(() => {
    if (!incomingSignal || !peerConnectionRef.current) return;
    const pc = peerConnectionRef.current;

    const handleSignal = async () => {
      try {
        if (incomingSignal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal.signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await api.sendCallSignal(session.callId, session.peerUser.id, 'answer', answer);
        } else if (incomingSignal.type === 'answer') {
          if (pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(incomingSignal.signalData));
          }
        } else if (incomingSignal.type === 'ice-candidate') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(incomingSignal.signalData));
          } catch (e) {
            console.warn('ICE candidate addition failed:', e);
          }
        }
      } catch (err) {
        console.error('Signaling processing error:', err);
      }
    };

    handleSignal();
  }, [incomingSignal]);

  // Accept incoming call
  const handleAcceptCall = async () => {
    await api.acceptCall(session.callId);
    await initWebRTC();
  };

  // Decline incoming call
  const handleRejectCall = async () => {
    await api.rejectCall(session.callId, 'declined');
    cleanup();
    onEndCall();
  };

  // End active call
  const handleTerminate = async () => {
    setCallStatus('ended');
    try {
      await api.endCall(session.callId, duration);
    } catch {
      // Ignored
    }
    cleanup();
    setTimeout(() => {
      onEndCall();
    }, 600);
  };

  const cleanup = () => {
    sound.stopRingtone();
    sound.stopCallingTone();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Switch Camera for mobile
  const switchCamera = async () => {
    if (session.callType !== 'video' || !localStreamRef.current) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
        audio: !isMuted,
      });

      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (peerConnectionRef.current && oldVideoTrack) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      if (oldVideoTrack) oldVideoTrack.stop();
      localStreamRef.current.removeTrack(oldVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (err) {
      console.warn('Switch camera failed:', err);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#030712]/95 backdrop-blur-xl flex flex-col justify-between text-white selection:bg-emerald-500 overflow-hidden ${
        isFullscreen ? 'p-0' : 'p-4 sm:p-6'
      }`}
    >
      {/* Hidden audio element for remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={isSpeakerMuted} />

      {/* Top Bar Status */}
      <div className="flex items-center justify-between z-20 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
            {session.callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">
              {session.peerUser.displayName}
            </h3>
            <span className="text-xs text-emerald-400 font-mono">
              {callStatus === 'connected'
                ? `In call · ${formatDuration(duration)}`
                : callStatus === 'ringing'
                ? session.isIncoming
                  ? `Incoming ${session.callType} call...`
                  : `Calling ${session.peerUser.displayName}...`
                : callStatus === 'connecting'
                ? 'Connecting encrypted channel...'
                : 'Call Ended'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Center Stage */}
      <div className="flex-1 flex items-center justify-center relative my-2 overflow-hidden rounded-3xl bg-[#060b17] border border-slate-800">
        {errorMsg && (
          <div className="absolute top-6 px-4 py-2 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs z-30">
            {errorMsg}
          </div>
        )}

        {/* Video Mode */}
        {session.callType === 'video' ? (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            {/* Remote Peer Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-2xl"
            />

            {/* If video not yet connected, show placeholder */}
            {callStatus !== 'connected' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070e22]/90">
                <div className="relative mb-4">
                  <img
                    src={session.peerUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.peerUser.id}`}
                    alt={session.peerUser.displayName}
                    className="w-28 h-28 rounded-full object-cover border-4 border-emerald-500/50 shadow-2xl"
                  />
                  <div className="absolute -inset-2 rounded-full border-2 border-emerald-400/40 animate-ping pointer-events-none" />
                </div>
                <h4 className="text-xl font-bold text-white mb-1">{session.peerUser.displayName}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  {callStatus === 'ringing' ? 'Ringing...' : 'Securing WebRTC stream...'}
                </p>
              </div>
            )}

            {/* Floating Local Camera Preview (Picture-in-Picture) */}
            <div className="absolute bottom-4 right-4 w-32 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-emerald-400/60 shadow-2xl bg-slate-900 z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
              />
              {!isVideoEnabled && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs p-2 text-center">
                  <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                  <span>Camera Off</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Voice Call Mode Stage */
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-6">
              <img
                src={session.peerUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.peerUser.id}`}
                alt={session.peerUser.displayName}
                className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500/60 shadow-2xl"
              />
              {callStatus === 'connected' ? (
                <div className="absolute -bottom-2 inset-x-0 flex justify-center items-center gap-1">
                  <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-10 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  <span className="w-1.5 h-8 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-bounce" />
                </div>
              ) : (
                <div className="absolute -inset-3 rounded-full border-2 border-emerald-400/40 animate-ping pointer-events-none" />
              )}
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">{session.peerUser.displayName}</h3>
            <p className="text-xs text-emerald-400 font-mono tracking-wider uppercase mb-1">
              Encrypted Voice Call
            </p>
            <div className="text-sm font-mono text-slate-300">
              {callStatus === 'connected' ? formatDuration(duration) : 'Ringing...'}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-4 z-20 flex items-center justify-center gap-4">
        {/* If incoming call and still ringing, show Accept & Decline buttons */}
        {session.isIncoming && callStatus === 'ringing' ? (
          <div className="flex items-center gap-8">
            <button
              onClick={handleRejectCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 transition-transform active:scale-95">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-slate-300 group-hover:text-red-400">Decline</span>
            </button>

            <button
              onClick={handleAcceptCall}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-pulse transition-transform active:scale-95">
                <Phone className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-slate-300 group-hover:text-emerald-400">Accept</span>
            </button>
          </div>
        ) : (
          /* Active call controls */
          <div className="flex items-center gap-3 sm:gap-4 p-3 bg-[#0a1226]/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl">
            {/* Mute Mic */}
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Toggle */}
            {session.callType === 'video' && (
              <button
                onClick={toggleVideo}
                title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                  !isVideoEnabled
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-white'
                }`}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            )}

            {/* Flip Camera */}
            {session.callType === 'video' && (
              <button
                onClick={switchCamera}
                title="Switch Camera (Front/Back)"
                className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white transition-all cursor-pointer"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}

            {/* Speaker Mute */}
            <button
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
              className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                isSpeakerMuted
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-white'
              }`}
            >
              {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleTerminate}
              title="End call"
              className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-red-600/40 transition-transform active:scale-95 cursor-pointer ml-2"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-xs sm:text-sm">End</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
