import { WebSocket } from 'ws';
import { PeerInfo, SignalMessage, SessionTerminatedPayload } from '@meetdraw/shared';

export interface ConnectedPeer {
  id: string;
  username: string;
  userId?: string;
  email?: string;
  ws: WebSocket;
  joinedAt: number;
  isHost: boolean;
}

export class RoomManager {
  // roomId -> Map<peerId, ConnectedPeer>
  private rooms: Map<string, Map<string, ConnectedPeer>> = new Map();
  // peerId -> roomId
  private peerToRoom: Map<string, string> = new Map();
  // userKey (userId or email) -> peerId for enforcing single active session per account
  private userToPeer: Map<string, string> = new Map();

  joinRoom(
    roomId: string,
    peerId: string,
    username: string,
    ws: WebSocket,
    userId?: string,
    email?: string
  ): { peers: PeerInfo[]; isHost: boolean; kickedPeer?: ConnectedPeer } {
    const userKey = userId ? `id:${userId}` : (email ? `email:${email.trim().toLowerCase()}` : null);
    let kickedPeer: ConnectedPeer | null = null;

    // Detect if this account already has an active session in any room/browser
    if (userKey && this.userToPeer.has(userKey)) {
      const existingPeerId = this.userToPeer.get(userKey)!;
      if (existingPeerId !== peerId) {
        const oldRoomId = this.peerToRoom.get(existingPeerId);
        if (oldRoomId) {
          const oldRoom = this.rooms.get(oldRoomId);
          const oldPeer = oldRoom?.get(existingPeerId);
          if (oldPeer) {
            console.log(`[RoomManager] DUPLICATE_SESSION: User '${username}' (${userKey}) opened in a new browser (${peerId}). Terminating old session (${existingPeerId}) in room '${oldRoomId}'.`);

            // 1. Send SESSION_TERMINATED to old session
            const termMsg: SignalMessage<SessionTerminatedPayload> = {
              type: 'SESSION_TERMINATED',
              roomId: oldRoomId,
              senderId: 'server',
              targetId: existingPeerId,
              payload: {
                reason: 'Tài khoản của bạn đã được đăng nhập từ một thiết bị hoặc trình duyệt khác.',
                code: 'DUPLICATE_LOGIN',
              },
            };

            if (oldPeer.ws.readyState === WebSocket.OPEN) {
              try {
                oldPeer.ws.send(JSON.stringify(termMsg));
                setTimeout(() => {
                  try {
                    oldPeer.ws.close(4001, 'Concurrent session terminated');
                  } catch (e) {}
                }, 80);
              } catch (e) {}
            }

            // 2. Remove old peer from its room
            this.leaveRoom(existingPeerId);
            kickedPeer = oldPeer;
          }
        }
      }
    }

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }

    const room = this.rooms.get(roomId)!;
    const isHost = room.size === 0;

    const existingPeers: PeerInfo[] = Array.from(room.values()).map((p) => ({
      id: p.id,
      username: p.username,
      userId: p.userId,
      joinedAt: p.joinedAt,
      isHost: p.isHost,
    }));

    const newPeer: ConnectedPeer = {
      id: peerId,
      username,
      userId,
      email,
      ws,
      joinedAt: Date.now(),
      isHost,
    };

    room.set(peerId, newPeer);
    this.peerToRoom.set(peerId, roomId);
    if (userKey) {
      this.userToPeer.set(userKey, peerId);
    }

    console.log(`[RoomManager] Peer ${username} (${peerId}) joined room ${roomId}. Total peers in room: ${room.size}`);

    return { peers: existingPeers, isHost, kickedPeer: kickedPeer || undefined };
  }

  leaveRoom(peerId: string): { roomId: string; peer: ConnectedPeer } | null {
    const roomId = this.peerToRoom.get(peerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.peerToRoom.delete(peerId);
      return null;
    }

    const peer = room.get(peerId);
    room.delete(peerId);
    this.peerToRoom.delete(peerId);

    // Clean up userToPeer mapping for single session
    for (const [uKey, pId] of this.userToPeer.entries()) {
      if (pId === peerId) {
        this.userToPeer.delete(uKey);
        break;
      }
    }

    console.log(`[RoomManager] Peer ${peerId} left room ${roomId}. Remaining: ${room.size}`);

    if (room.size === 0) {
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Room ${roomId} is empty and was cleaned up.`);
    }

    return peer ? { roomId, peer } : null;
  }

  getPeersInRoom(roomId: string): PeerInfo[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.values()).map((p) => ({
      id: p.id,
      username: p.username,
      userId: p.userId,
      joinedAt: p.joinedAt,
      isHost: p.isHost,
    }));
  }

  getPeerSocket(roomId: string, targetPeerId: string): WebSocket | null {
    let room = this.rooms.get(roomId);
    if (!room) {
      const actualRoomId = this.peerToRoom.get(targetPeerId);
      if (actualRoomId) {
        room = this.rooms.get(actualRoomId);
      }
    }
    if (!room) return null;
    const peer = room.get(targetPeerId);
    return peer ? peer.ws : null;
  }

  getRoomIdByPeer(peerId: string): string | undefined {
    return this.peerToRoom.get(peerId);
  }

  broadcastToRoom(roomId: string, message: SignalMessage, excludePeerId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const payload = JSON.stringify(message);
    for (const [peerId, peer] of room.entries()) {
      if (excludePeerId && peerId === excludePeerId) continue;
      if (peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(payload);
      }
    }
  }

  sendToPeer(roomId: string, targetPeerId: string, message: SignalMessage): boolean {
    const targetWs = this.getPeerSocket(roomId, targetPeerId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  getAllRooms(): Map<string, Map<string, ConnectedPeer>> {
    return this.rooms;
  }
}

export const roomManager = new RoomManager();
