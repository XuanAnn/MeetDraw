import {
  RoomOverviewStats,
  MonitoredUser,
  MonitoredCandidate,
  MonitoredConnection,
  SelectedCandidatePair,
  MediaSharingHistoryItem,
  MonitoredWhiteboardObject,
  TimelineEvent,
  RoomMonitorSnapshot,
} from '@meetdraw/shared';
import { roomManager } from '../websocket/room.manager';

interface RoomInternalData {
  overview: RoomOverviewStats;
  users: Map<string, MonitoredUser>; // peerId -> MonitoredUser
  connections: Map<string, MonitoredConnection>; // connectionId -> MonitoredConnection
  candidates: MonitoredCandidate[];
  mediaHistory: MediaSharingHistoryItem[];
  whiteboardObjects: Map<string, MonitoredWhiteboardObject>; // objectId -> Object
  timeline: TimelineEvent[];
}

export class RoomMonitorStore {
  // roomId -> RoomInternalData
  private rooms: Map<string, RoomInternalData> = new Map();

  private getOrCreateRoom(roomId: string, manageUsername = 'Chưa xác định'): RoomInternalData {
    let room = this.rooms.get(roomId);
    if (!room) {
      const now = Date.now();
      room = {
        overview: {
          roomId,
          manage: manageUsername, // Đổi tên Host thành Manage theo yêu cầu
          status: 'LIVE',
          createdAt: now,
          duration: 0,
          totalUsers: 0,
          onlineUsers: 0,
          activeConnections: 0,
          activeScreenShares: 0,
          whiteboardObjectsCount: 0,
        },
        users: new Map(),
        connections: new Map(),
        candidates: [],
        mediaHistory: [],
        whiteboardObjects: new Map(),
        timeline: [],
      };
      this.rooms.set(roomId, room);

      this.addTimelineEvent(room, {
        category: 'ROOM',
        icon: '🏠',
        color: 'emerald',
        title: `Phòng ${roomId} được khởi tạo`,
        details: `Quản lý (Manage): ${manageUsername}`,
      });
    } else if (manageUsername && room.overview.manage === 'Chưa xác định') {
      room.overview.manage = manageUsername;
    }
    return room;
  }

  private addTimelineEvent(room: RoomInternalData, event: Omit<TimelineEvent, 'id' | 'timestamp'>) {
    const fullEvent: TimelineEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      ...event,
    };
    room.timeline.unshift(fullEvent);
    if (room.timeline.length > 300) {
      room.timeline.pop();
    }
  }

  // Parse standard WebRTC candidate SDP string
  // Format: candidate:foundation component protocol priority ip port typ type [raddr rport] [generation]
  private parseCandidateSdp(
    candidateStr: string,
    peerId: string,
    sdpMid: string | null = null,
    sdpMLineIndex: number | null = null
  ): MonitoredCandidate | null {
    if (!candidateStr || typeof candidateStr !== 'string') return null;

    try {
      const parts = candidateStr.trim().split(/\s+/);
      const typIndex = parts.indexOf('typ');
      if (typIndex !== -1 && typIndex + 1 < parts.length) {
        const typeRaw = parts[typIndex + 1].toLowerCase();
        const type: 'host' | 'srflx' | 'relay' =
          typeRaw === 'host' ? 'host' : typeRaw === 'srflx' ? 'srflx' : typeRaw === 'relay' ? 'relay' : 'host';

        const protocolRaw = parts[2]?.toLowerCase();
        const protocol: 'udp' | 'tcp' = protocolRaw === 'tcp' ? 'tcp' : 'udp';
        const priority = parseInt(parts[3], 10) || 0;
        const ip = parts[4] || '';
        const port = parseInt(parts[5], 10) || 0;

        return {
          peerId,
          type,
          ip,
          port,
          protocol,
          priority,
          sdpMid,
          sdpMLineIndex,
        };
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }

  // 1. Record User Join
  recordUserJoin(
    roomId: string,
    data: {
      peerId: string;
      username: string;
      userId?: string;
      socketId?: string;
      ip: string;
      port: number;
      isManage: boolean;
    }
  ) {
    const room = this.getOrCreateRoom(roomId, data.isManage ? data.username : undefined);
    const now = Date.now();

    const existingUser = room.users.get(data.peerId);
    if (existingUser) {
      existingUser.status = 'ONLINE';
      existingUser.ip = data.ip;
      existingUser.port = data.port;
      existingUser.lastActive = now;
      existingUser.leftAt = null;
      if (data.isManage) {
        existingUser.isManage = true;
        room.overview.manage = data.username;
      }
    } else {
      const newUser: MonitoredUser = {
        userId: data.userId || `user_${data.peerId.substring(0, 5)}`,
        username: data.username,
        peerId: data.peerId,
        socketId: data.socketId || data.peerId,
        isManage: data.isManage,
        status: 'ONLINE',
        ip: data.ip,
        port: data.port,
        joinedAt: now,
        leftAt: null,
        lastActive: now,
        isMicOn: true,
        isCamOn: true,
        isScreenSharing: false,
      };
      room.users.set(data.peerId, newUser);
      room.overview.totalUsers = room.users.size;
    }

    if (data.isManage) {
      room.overview.manage = data.username;
    }

    this.recalculateOverview(room);

    this.addTimelineEvent(room, {
      category: 'USER',
      icon: '🟢',
      color: 'emerald',
      title: `${data.username} tham gia phòng`,
      details: `IP: ${data.ip}:${data.port} | Vai trò: ${data.isManage ? 'Quản lý (Manage)' : 'Thành viên'}`,
      peerId: data.peerId,
      username: data.username,
    });
  }

  // 2. Record User Leave
  recordUserLeave(roomId: string, peerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(peerId);
    if (user) {
      user.status = 'LEFT';
      user.leftAt = Date.now();
      user.lastActive = Date.now();
      user.isScreenSharing = false;

      // Mark associated WebRTC connections as closed/disconnected
      for (const conn of room.connections.values()) {
        if (conn.peerA.id === peerId || conn.peerB.id === peerId) {
          conn.connectionState = 'closed';
          conn.iceState = 'closed';
          conn.disconnectedAt = Date.now();

          this.addTimelineEvent(room, {
            category: 'WEBRTC',
            icon: '🔗',
            color: 'rose',
            title: `Kết nối P2P ${conn.peerA.username} ↔ ${conn.peerB.username} đã đóng`,
            details: `Do ${user.username} đã rời phòng`,
          });
        }
      }

      this.addTimelineEvent(room, {
        category: 'USER',
        icon: '🔴',
        color: 'rose',
        title: `${user.username} đã rời phòng`,
        details: `Thời điểm vào: ${new Date(user.joinedAt).toLocaleTimeString('vi-VN')}`,
        peerId,
        username: user.username,
      });

      this.recalculateOverview(room);
    }
  }

  // 3. Record Candidate Received
  recordCandidate(
    roomId: string,
    peerId: string,
    candidateStr: string,
    sdpMid: string | null = null,
    sdpMLineIndex: number | null = null
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const candidate = this.parseCandidateSdp(candidateStr, peerId, sdpMid, sdpMLineIndex);
    if (candidate) {
      // Avoid duplicate candidates
      const exists = room.candidates.some(
        (c) => c.peerId === peerId && c.ip === candidate.ip && c.port === candidate.port && c.type === candidate.type
      );
      if (!exists) {
        room.candidates.push(candidate);
        const user = room.users.get(peerId);
        const username = user?.username || peerId.substring(0, 4);

        this.addTimelineEvent(room, {
          category: 'ICE',
          icon: '🧊',
          color: 'sky',
          title: `Phát hiện candidate (${candidate.type.toUpperCase()}) từ ${username}`,
          details: `${candidate.protocol.toUpperCase()} ${candidate.ip}:${candidate.port} (Priority: ${candidate.priority})`,
          peerId,
          username,
        });
      }
    }
  }

  // 4. Record P2P Signaling Offer / Answer
  recordP2POfferAnswer(roomId: string, senderId: string, targetId: string, type: 'OFFER' | 'ANSWER') {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const connId = senderId < targetId ? `${senderId}_${targetId}` : `${targetId}_${senderId}`;
    let conn = room.connections.get(connId);

    const userSender = room.users.get(senderId);
    const userTarget = room.users.get(targetId);

    if (!conn) {
      conn = {
        connectionId: connId,
        peerA: { id: senderId, username: userSender?.username || senderId.substring(0, 4) },
        peerB: { id: targetId, username: userTarget?.username || targetId.substring(0, 4) },
        connectionState: 'connecting',
        iceState: 'checking',
        signalingState: type === 'OFFER' ? 'have-local-offer' : 'stable',
        createdAt: Date.now(),
        connectedAt: null,
        disconnectedAt: null,
        selectedCandidatePair: null,
      };
      room.connections.set(connId, conn);
    } else {
      conn.signalingState = type === 'OFFER' ? 'have-local-offer' : 'stable';
    }

    this.recalculateOverview(room);
  }

  // 5. Record Client Telemetry (Connection states, selected candidate pair, stats)
  recordTelemetry(roomId: string, peerId: string, data: {
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
  }) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(peerId);
    if (user) {
      user.lastActive = Date.now();
    }

    // A. Update WebRTC Connection stats
    if (data.connectionStats) {
      for (const stat of data.connectionStats) {
        const connId = peerId < stat.targetPeerId ? `${peerId}_${stat.targetPeerId}` : `${stat.targetPeerId}_${peerId}`;
        const conn = room.connections.get(connId);
        if (conn) {
          const prevState = conn.connectionState;
          conn.connectionState = (stat.connectionState || conn.connectionState) as any;
          conn.iceState = (stat.iceState || conn.iceState) as any;

          if (stat.selectedCandidatePair) {
            conn.selectedCandidatePair = stat.selectedCandidatePair;
          }

          if (prevState !== 'connected' && conn.connectionState === 'connected') {
            conn.connectedAt = Date.now();
            this.addTimelineEvent(room, {
              category: 'WEBRTC',
              icon: '🔗',
              color: 'emerald',
              title: `WebRTC CONNECTED: ${conn.peerA.username} ↔ ${conn.peerB.username}`,
              details: conn.selectedCandidatePair
                ? `Đường truyền: ${conn.selectedCandidatePair.protocol.toUpperCase()} ${conn.selectedCandidatePair.localCandidateType} ↔ ${conn.selectedCandidatePair.remoteCandidateType} (RTT: ${conn.selectedCandidatePair.rtt || 0}ms)`
                : 'Kết nối P2P đã sẵn sàng',
            });
          }
        }
      }
    }

    // B. Update Media state
    if (data.mediaState && user) {
      if (user.isMicOn !== data.mediaState.isMicOn) {
        user.isMicOn = data.mediaState.isMicOn;
        this.recordMediaChange(roomId, peerId, 'MICROPHONE', user.isMicOn ? 'STARTED' : 'STOPPED');
      }
      if (user.isCamOn !== data.mediaState.isCamOn) {
        user.isCamOn = data.mediaState.isCamOn;
        this.recordMediaChange(roomId, peerId, 'CAMERA', user.isCamOn ? 'STARTED' : 'STOPPED');
      }
      if (user.isScreenSharing !== data.mediaState.isScreenSharing) {
        user.isScreenSharing = data.mediaState.isScreenSharing;
        this.recordMediaChange(roomId, peerId, 'SCREEN', user.isScreenSharing ? 'STARTED' : 'STOPPED');
      }
    }

    // C. Update Whiteboard Action
    if (data.whiteboardAction) {
      this.recordWhiteboardAction(
        roomId,
        peerId,
        user?.username || peerId.substring(0, 4),
        data.whiteboardAction
      );
    }

    this.recalculateOverview(room);
  }

  // 6. Record Media Change (Camera / Mic / Screen)
  recordMediaChange(
    roomId: string,
    peerId: string,
    mediaType: 'CAMERA' | 'MICROPHONE' | 'SCREEN',
    action: 'STARTED' | 'STOPPED'
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(peerId);
    const username = user?.username || peerId.substring(0, 4);

    const historyItem: MediaSharingHistoryItem = {
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: Date.now(),
      peerId,
      username,
      mediaType,
      action,
    };
    room.mediaHistory.unshift(historyItem);
    if (room.mediaHistory.length > 200) {
      room.mediaHistory.pop();
    }

    // Icons and titles
    let icon = '📹';
    let title = `${username} ${action === 'STARTED' ? 'bật' : 'tắt'} Camera`;
    let category: TimelineEvent['category'] = 'MEDIA';

    if (mediaType === 'MICROPHONE') {
      icon = '🎤';
      title = `${username} ${action === 'STARTED' ? 'bật' : 'tắt'} Microphone`;
    } else if (mediaType === 'SCREEN') {
      icon = '🖥️';
      title = `${username} ${action === 'STARTED' ? 'bắt đầu' : 'dừng'} Chia sẻ màn hình`;
      category = 'SCREEN';
      if (user) {
        user.isScreenSharing = action === 'STARTED';
      }
    }

    this.addTimelineEvent(room, {
      category,
      icon,
      color: action === 'STARTED' ? 'emerald' : 'slate',
      title,
      peerId,
      username,
    });

    this.recalculateOverview(room);
  }

  // 7. Record Whiteboard Actions
  recordWhiteboardAction(
    roomId: string,
    peerId: string,
    username: string,
    wbAction: {
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
    }
  ) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const now = Date.now();

    if (wbAction.action === 'CREATE' && wbAction.object) {
      const obj = wbAction.object;
      const monitoredObj: MonitoredWhiteboardObject = {
        id: obj.id,
        type: obj.type || 'Object',
        createdBy: username,
        createdAt: now,
        updatedAt: now,
        status: 'ACTIVE',
        position: { x: Math.round(obj.left || 0), y: Math.round(obj.top || 0) },
        size: { width: Math.round(obj.width || 0), height: Math.round(obj.height || 0) },
      };
      room.whiteboardObjects.set(obj.id, monitoredObj);

      this.addTimelineEvent(room, {
        category: 'WHITEBOARD',
        icon: '✏️',
        color: 'indigo',
        title: `${username} đã tạo ${obj.type || 'đối tượng'} #${obj.id.substring(0, 6)}`,
        details: `Vị trí: (${monitoredObj.position.x}, ${monitoredObj.position.y}), Kích thước: ${monitoredObj.size.width}×${monitoredObj.size.height}`,
        peerId,
        username,
      });
    } else if (wbAction.action === 'UPDATE' && wbAction.object) {
      const existing = room.whiteboardObjects.get(wbAction.object.id);
      if (existing) {
        existing.updatedAt = now;
        if (wbAction.object.left !== undefined) existing.position.x = Math.round(wbAction.object.left);
        if (wbAction.object.top !== undefined) existing.position.y = Math.round(wbAction.object.top);
        if (wbAction.object.width !== undefined) existing.size.width = Math.round(wbAction.object.width);
        if (wbAction.object.height !== undefined) existing.size.height = Math.round(wbAction.object.height);

        this.addTimelineEvent(room, {
          category: 'WHITEBOARD',
          icon: '✏️',
          color: 'sky',
          title: `${username} cập nhật ${existing.type} #${existing.id.substring(0, 6)}`,
          details: `Tọa độ mới: (${existing.position.x}, ${existing.position.y})`,
          peerId,
          username,
        });
      }
    } else if (wbAction.action === 'DELETE' && wbAction.objectIds) {
      for (const id of wbAction.objectIds) {
        const existing = room.whiteboardObjects.get(id);
        if (existing) {
          existing.status = 'DELETED';
          existing.deletedBy = username;
          existing.updatedAt = now;

          this.addTimelineEvent(room, {
            category: 'WHITEBOARD',
            icon: '🗑️',
            color: 'rose',
            title: `${username} xóa ${existing.type} #${existing.id.substring(0, 6)}`,
            peerId,
            username,
          });
        }
      }
    } else if (wbAction.action === 'CLEAR') {
      for (const obj of room.whiteboardObjects.values()) {
        obj.status = 'DELETED';
        obj.deletedBy = username;
        obj.updatedAt = now;
      }
      this.addTimelineEvent(room, {
        category: 'WHITEBOARD',
        icon: '🧹',
        color: 'rose',
        title: `${username} đã xóa toàn bộ bảng vẽ (CLEAR)`,
        peerId,
        username,
      });
    }

    this.recalculateOverview(room);
  }

  // Recalculate KPIs
  private recalculateOverview(room: RoomInternalData) {
    let onlineCount = 0;
    let screenShareCount = 0;

    for (const u of room.users.values()) {
      if (u.status === 'ONLINE') {
        onlineCount++;
        if (u.isScreenSharing) {
          screenShareCount++;
        }
      }
    }

    let activeConnectionsCount = 0;
    for (const c of room.connections.values()) {
      if (c.connectionState === 'connected') {
        activeConnectionsCount++;
      }
    }

    let activeWhiteboardCount = 0;
    for (const obj of room.whiteboardObjects.values()) {
      if (obj.status === 'ACTIVE') {
        activeWhiteboardCount++;
      }
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - room.overview.createdAt) / 1000));

    room.overview.onlineUsers = onlineCount;
    room.overview.activeConnections = activeConnectionsCount;
    room.overview.activeScreenShares = screenShareCount;
    room.overview.whiteboardObjectsCount = activeWhiteboardCount;
    room.overview.duration = elapsedSeconds;
    room.overview.status = onlineCount > 0 ? 'LIVE' : 'ENDED';
  }

  private syncActiveRooms() {
    try {
      const activeRooms = roomManager.getAllRooms();
      for (const [rId, peersMap] of activeRooms.entries()) {
        const room = this.getOrCreateRoom(rId);
        for (const peer of peersMap.values()) {
          if (!room.users.has(peer.id)) {
            const extWs = peer.ws as any;
            this.recordUserJoin(rId, {
              peerId: peer.id,
              username: peer.username,
              userId: peer.userId,
              socketId: peer.id,
              ip: extWs?.clientIp || '127.0.0.1',
              port: extWs?.clientPort || 0,
              isManage: peer.isHost,
            });
          }
        }
      }
    } catch (e) {
      // Ignore sync error
    }
  }

  // 8. Get Room Snapshot for Dashboard
  getRoomSnapshot(roomId: string): RoomMonitorSnapshot | null {
    this.syncActiveRooms();
    const room = this.rooms.get(roomId);
    if (!room) return null;

    this.recalculateOverview(room);

    return {
      overview: { ...room.overview },
      users: Array.from(room.users.values()),
      connections: Array.from(room.connections.values()),
      candidates: [...room.candidates],
      mediaHistory: [...room.mediaHistory],
      whiteboardObjects: Array.from(room.whiteboardObjects.values()),
      timeline: [...room.timeline],
    };
  }

  // 9. Get Overview of All Rooms
  getAllRoomsOverview(): RoomOverviewStats[] {
    this.syncActiveRooms();
    const list: RoomOverviewStats[] = [];
    for (const room of this.rooms.values()) {
      this.recalculateOverview(room);
      list.push({ ...room.overview });
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }
}

export const roomMonitorStore = new RoomMonitorStore();
