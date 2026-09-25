export interface RoomOverviewStats {
  roomId: string;
  manage: string; // Đã đổi từ host sang manage theo yêu cầu
  status: 'LIVE' | 'ENDED' | 'CLOSED';
  createdAt: number;
  duration: number; // seconds
  totalUsers: number;
  onlineUsers: number;
  activeConnections: number;
  activeScreenShares: number;
  whiteboardObjectsCount: number;
}

export interface MonitoredUser {
  userId: string;
  username: string;
  peerId: string;
  socketId: string;
  isManage: boolean; // Đã đổi từ isHost sang isManage
  status: 'ONLINE' | 'OFFLINE' | 'LEFT';
  ip: string; // IP server quan sát được
  port: number; // Port server quan sát được
  joinedAt: number;
  leftAt: number | null;
  lastActive: number;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
}

export interface MonitoredCandidate {
  peerId: string;
  type: 'host' | 'srflx' | 'relay';
  ip: string;
  port: number;
  protocol: 'udp' | 'tcp';
  priority: number;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface SelectedCandidatePair {
  localCandidateType: 'host' | 'srflx' | 'relay' | string;
  localIp: string;
  localPort: number;
  remoteCandidateType: 'host' | 'srflx' | 'relay' | string;
  remoteIp: string;
  remotePort: number;
  protocol: string;
  state: 'waiting' | 'in-progress' | 'succeeded' | 'failed';
  nominated: boolean;
  rtt?: number; // ms
  bytesSent?: number;
  bytesReceived?: number;
  packetsSent?: number;
  packetsReceived?: number;
  packetsLost?: number;
}

export interface MonitoredConnection {
  connectionId: string;
  peerA: { id: string; username: string };
  peerB: { id: string; username: string };
  connectionState: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
  iceState: 'new' | 'checking' | 'connected' | 'completed' | 'disconnected' | 'failed' | 'closed';
  signalingState: string;
  createdAt: number;
  connectedAt: number | null;
  disconnectedAt: number | null;
  selectedCandidatePair: SelectedCandidatePair | null;
}

export interface MediaSharingHistoryItem {
  id: string;
  timestamp: number;
  peerId: string;
  username: string;
  mediaType: 'CAMERA' | 'MICROPHONE' | 'SCREEN';
  action: 'STARTED' | 'STOPPED';
}

export interface MonitoredWhiteboardObject {
  id: string;
  type: string; // Pen, Line, Rectangle, Circle, Text...
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  deletedBy?: string;
  status: 'ACTIVE' | 'DELETED';
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  category: 'ROOM' | 'USER' | 'WEBRTC' | 'ICE' | 'MEDIA' | 'SCREEN' | 'WHITEBOARD';
  icon: string;
  color: string;
  title: string;
  details?: string;
  peerId?: string;
  username?: string;
}

export interface RoomMonitorSnapshot {
  overview: RoomOverviewStats;
  users: MonitoredUser[];
  connections: MonitoredConnection[];
  candidates: MonitoredCandidate[];
  mediaHistory: MediaSharingHistoryItem[];
  whiteboardObjects: MonitoredWhiteboardObject[];
  timeline: TimelineEvent[];
}

export interface TelemetryReportPayload {
  roomId: string;
  peerId: string;
  username: string;
  connectionStats?: Array<{
    targetPeerId: string;
    connectionState: string;
    iceState: string;
    selectedCandidatePair?: SelectedCandidatePair;
  }>;
  mediaState?: {
    isMicOn: boolean;
    isCamOn: boolean;
    isScreenSharing: boolean;
  };
  whiteboardAction?: {
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'CLEAR';
    object?: {
      id: string;
      type: string;
      left?: number;
      top?: number;
      width?: number;
      height?: number;
    };
    objectIds?: string[];
  };
}
