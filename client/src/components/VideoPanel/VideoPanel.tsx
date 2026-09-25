import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, ChevronDown, ChevronUp } from 'lucide-react';
import { VideoTile } from './VideoTile';
import { RemotePeerState } from '../../types';

interface VideoPanelProps {
  localStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  localUsername: string;
  localUserColor: string;
  remotePeers: Map<string, RemotePeerState>;
  remoteStreams: Map<string, MediaStream>;
}

export const VideoPanel: React.FC<VideoPanelProps> = ({
  localStream,
  isAudioMuted,
  isVideoMuted,
  toggleAudio,
  toggleVideo,
  localUsername,
  localUserColor,
  remotePeers,
  remoteStreams,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const peerList = Array.from(remotePeers.values());

  return (
    <div className="bg-white border-l border-slate-200 shadow-sm flex flex-col transition-all duration-300 w-72 sm:w-80 h-full z-10 select-none">
      {/* Header */}
      <div className="h-12 border-b border-slate-200 px-3 flex items-center justify-between bg-white">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Video & Audio ({peerList.length + 1})
        </span>

        {/* Media Quick Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded-lg transition ${
              isAudioMuted
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={isAudioMuted ? 'Bật Micro' : 'Tắt Micro'}
          >
            {isAudioMuted ? <MicOff size={15} /> : <Mic size={15} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-1.5 rounded-lg transition ${
              isVideoMuted
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={isVideoMuted ? 'Bật Camera' : 'Tắt Camera'}
          >
            {isVideoMuted ? <VideoOff size={15} /> : <Video size={15} />}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Video Streams Container */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
          {/* Local User Tile */}
          <VideoTile
            stream={localStream}
            username={localUsername}
            isLocal={true}
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            userColor={localUserColor}
          />

          {/* Remote Peers Tiles */}
          {peerList.map((peer) => {
            const stream = remoteStreams.get(peer.id) || peer.stream;
            return (
              <VideoTile
                key={peer.id}
                stream={stream}
                username={peer.username}
                isLocal={false}
                isAudioMuted={peer.isAudioMuted}
                isVideoMuted={peer.isVideoMuted}
                userColor="#818cf8"
              />
            );
          })}

          {peerList.length === 0 && (
            <div className="text-center py-6 px-2 text-xs text-slate-400">
              Chưa có người tham gia nào khác trong phòng. Hãy chia sẻ mã hoặc liên kết phòng để mời mọi người!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
