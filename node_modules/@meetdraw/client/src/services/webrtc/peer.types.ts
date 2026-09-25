import { DataChannelPacket, WhiteboardEvent, ChatMessage, ScreenShareStatePayload } from '@meetdraw/shared';

export type PeerConnectionCallback = {
  onIceCandidate: (peerId: string, candidate: RTCIceCandidate) => void;
  onConnectionStateChange: (peerId: string, state: RTCPeerConnectionState) => void;
  onTrack: (peerId: string, stream: MediaStream) => void;
  onScreenTrack?: (peerId: string, stream: MediaStream | null) => void;
  onDataChannelOpen: (peerId: string) => void;
  onDataChannelClose: (peerId: string) => void;
  onWhiteboardEvent: (peerId: string, event: WhiteboardEvent) => void;
  onChatMessage: (peerId: string, message: ChatMessage) => void;
  onScreenShareEvent?: (peerId: string, payload: ScreenShareStatePayload) => void;
};
