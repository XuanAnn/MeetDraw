import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoTileProps {
  stream?: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
  userColor?: string;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  username,
  isLocal,
  isAudioMuted,
  isVideoMuted,
  userColor = '#38bdf8',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasLiveVideo, setHasLiveVideo] = useState(false);

  // Callback ref guarantees srcObject is attached as soon as the video element mounts or stream updates
  const setVideoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && stream) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        el.play().catch(() => {});
      }
    },
    [stream]
  );

  // Re-sync srcObject whenever stream reference changes
  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Monitor live state of video tracks in the stream
  useEffect(() => {
    if (!stream) {
      setHasLiveVideo(false);
      return;
    }

    const evaluateVideoTracks = () => {
      const vTracks = stream.getVideoTracks();
      const hasActive = vTracks.some((t) => t.enabled && t.readyState === 'live');
      setHasLiveVideo(hasActive);
      if (hasActive && videoRef.current) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        videoRef.current.play().catch(() => {});
      }
    };

    evaluateVideoTracks();

    const vTracks = stream.getVideoTracks();
    vTracks.forEach((t) => {
      t.addEventListener('unmute', evaluateVideoTracks);
      t.addEventListener('mute', evaluateVideoTracks);
      t.addEventListener('ended', evaluateVideoTracks);
    });

    stream.addEventListener('addtrack', evaluateVideoTracks);
    stream.addEventListener('removetrack', evaluateVideoTracks);

    return () => {
      vTracks.forEach((t) => {
        t.removeEventListener('unmute', evaluateVideoTracks);
        t.removeEventListener('mute', evaluateVideoTracks);
        t.removeEventListener('ended', evaluateVideoTracks);
      });
      stream.removeEventListener('addtrack', evaluateVideoTracks);
      stream.removeEventListener('removetrack', evaluateVideoTracks);
    };
  }, [stream]);

  const showVideo = hasLiveVideo && !isVideoMuted;

  return (
    <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-md flex items-center justify-center group">
      {/* Permanent video element: keeps WebRTC rendering pipeline alive without unmounting */}
      <video
        ref={setVideoRef}
        autoPlay
        playsInline
        muted={true} // Muted because global audio elements handle voice output cleanly without echo
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLocal ? 'scale-x-[-1]' : ''
        } ${showVideo ? 'opacity-100 block' : 'opacity-0 hidden'}`}
      />

      {/* Avatar fallback when video is not live or is muted */}
      {!showVideo && (
        <div className="flex flex-col items-center justify-center space-y-2">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-inner transition-all ${
              !isAudioMuted ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900' : ''
            }`}
            style={{ backgroundColor: userColor }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-gray-400 font-medium">{username}</span>
        </div>
      )}

      {/* User tag and status overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="bg-gray-950/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-[11px] text-gray-200 font-medium flex items-center space-x-1.5 border border-gray-800">
          <span>{username}</span>
          {isLocal && <span className="text-[9px] text-sky-400 uppercase font-bold">(You)</span>}
          {!isAudioMuted && (
            <span className="flex items-center space-x-0.5 ml-1">
              <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse delay-75" />
              <span className="w-1 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <div
            className={`p-1 rounded-md text-white backdrop-blur-sm ${
              isAudioMuted ? 'bg-rose-500/80' : 'bg-emerald-500/80'
            }`}
          >
            {isAudioMuted ? <MicOff size={12} /> : <Mic size={12} />}
          </div>

          <div
            className={`p-1 rounded-md text-white backdrop-blur-sm ${
              isVideoMuted ? 'bg-rose-500/80' : 'bg-gray-950/60'
            }`}
          >
            {isVideoMuted ? <VideoOff size={12} /> : <Video size={12} />}
          </div>
        </div>
      </div>
    </div>
  );
};
