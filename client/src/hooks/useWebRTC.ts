import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ChatMessage,
  WhiteboardEvent,
  PeerInfo,
  SfuStatsPayload,
} from '@meetdraw/shared';
import {
  peerManager,
} from '../services/webrtc.service';
import { signalingService } from '../services/signaling.service';
import { RemotePeerState, WebRTCConnectionState } from '../types';

export function useWebRTC(
  roomId: string,
  onRemoteWhiteboardEvent?: (event: WhiteboardEvent) => void,
  localStream?: MediaStream | null
) {
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeerState>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activePeersCount, setActivePeersCount] = useState(0);
  const [sfuStats, setSfuStats] = useState<SfuStatsPayload>({
    activeProducers: 0,
    activeConsumers: 0,
    bandwidthSavedPercent: 0,
    topology: 'SFU',
    activeSpeakerId: null,
  });
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  const onRemoteWhiteboardRef = useRef(onRemoteWhiteboardEvent);
  onRemoteWhiteboardRef.current = onRemoteWhiteboardEvent;

  // Whenever localStream updates, push to all active WebRTC peers
  useEffect(() => {
    if (localStream) {
      peerManager.updateLocalStream(localStream);
    }
  }, [localStream]);

  useEffect(() => {
    if (!roomId) return;

    // Initialize peerManager with listeners
    peerManager.init(roomId, {
      onPeersUpdated: (peerInfos) => {
        setActivePeersCount(peerInfos.length);
        setRemotePeers((prev) => {
          const next = new Map(prev);
          const peerIds = peerInfos.map((p) => p.id);
          // Remove peers no longer present
          for (const key of next.keys()) {
            if (!peerIds.includes(key)) {
              next.delete(key);
            }
          }
          // Add newly discovered peers / update usernames as they become known
          for (const info of peerInfos) {
            const existing = next.get(info.id);
            const username = info.username || existing?.username || `Peer-${info.id.substring(0, 4)}`;
            if (!existing) {
              next.set(info.id, {
                id: info.id,
                username,
                connectionState: 'connecting',
                isAudioMuted: false,
                isVideoMuted: false,
                dataChannelReady: false,
              });
            } else if (info.username && existing.username !== info.username) {
              next.set(info.id, { ...existing, username: info.username });
            }
          }
          return next;
        });
      },

      onRemoteStream: (peerId, stream) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(peerId, stream);
          return next;
        });
        setRemotePeers((prev) => {
          const next = new Map(prev);
          const peer = next.get(peerId);
          if (peer) {
            next.set(peerId, { ...peer, stream });
          }
          return next;
        });
      },

      onRemoteStreamRemoved: (peerId) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      },

      onPeerStateChange: (peerId, state) => {
        setRemotePeers((prev) => {
          const next = new Map(prev);
          const peer = next.get(peerId);
          if (peer) {
            next.set(peerId, { ...peer, connectionState: state as WebRTCConnectionState });
          }
          return next;
        });
      },

      onWhiteboardEvent: (peerId, event) => {
        if (onRemoteWhiteboardRef.current) {
          onRemoteWhiteboardRef.current(event);
        }
      },

      onChatMessage: (peerId, msg) => {
        setChatMessages((prev) => [...prev, msg]);
      },

      onSfuStats: (stats) => {
        setSfuStats(stats);
      },

      onActiveSpeaker: (speakerId) => {
        setActiveSpeakerId(speakerId);
      },
    });

    return () => {
      peerManager.cleanup();
    };
  }, [roomId]);

  const sendChatMessage = useCallback((text: string, senderName: string) => {
    if (!text.trim()) return;

    const msg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: signalingService.selfPeerId || 'self',
      senderName,
      text: text.trim(),
      timestamp: Date.now(),
    };

    // Add locally
    setChatMessages((prev) => [...prev, msg]);

    // Broadcast over P2P DataChannel (UDP)
    peerManager.broadcastChatMessage(msg);
  }, []);

  return {
    remotePeers,
    remoteStreams,
    chatMessages,
    activePeersCount,
    sendChatMessage,
    sfuStats,
    activeSpeakerId,
  };
}
