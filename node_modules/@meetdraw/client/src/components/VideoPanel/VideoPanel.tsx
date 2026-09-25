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
    <div className="bg-gray-900 border-l border-gray-800 flex flex-col transition-all duration-300 w-72 sm:w-80 h-full z-10 select-none">
      {/* Header */}
      <div className="h-12 border-b border-gray-800 px-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Video & Audio ({peerList.length + 1})
        </span>

        {/* Media Quick Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded-lg transition ${
              isAudioMuted
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
            title={isAudioMuted ? 'Bật Micro' : 'Tắt Micro'}
          >
            {isAudioMuted ? <MicOff size={15} /> : <Mic size={15} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-1.5 rounded-lg transition ${
              isVideoMuted
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
            title={isVideoMuted ? 'Bật Camera' : 'Tắt Camera'}
          >
            {isVideoMuted ? <VideoOff size={15} /> : <Video size={15} />}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition"
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Video Streams Container */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
            <div className="text-center py-6 px-2 text-xs text-gray-500">
              Chưa có người tham gia nào khác trong phòng. Hãy chia sẻ mã hoặc liên kết phòng để mời mọi người!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
