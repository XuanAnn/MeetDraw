import { WebSocket } from 'ws';
import { PeerInfo, SignalMessage } from '@meetdraw/shared';

export interface ConnectedPeer {
  id: string;
  username: string;
  userId?: string;
  ws: WebSocket;
  joinedAt: number;
  isHost: boolean;
}

export class RoomManager {
  // roomId -> Map<peerId, ConnectedPeer>
  private rooms: Map<string, Map<string, ConnectedPeer>> = new Map();
  // peerId -> roomId
  private peerToRoom: Map<string, string> = new Map();

  joinRoom(
    roomId: string,
    peerId: string,
    username: string,
    ws: WebSocket,
    userId?: string
  ): { peers: PeerInfo[]; isHost: boolean } {
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
      ws,
      joinedAt: Date.now(),
      isHost,
    };

    room.set(peerId, newPeer);
    this.peerToRoom.set(peerId, roomId);

    console.log(`[RoomManager] Peer ${username} (${peerId}) joined room ${roomId}. Total peers in room: ${room.size}`);

    return { peers: existingPeers, isHost };
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
}

export const roomManager = new RoomManager();
