"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomManager = exports.RoomManager = void 0;
const ws_1 = require("ws");
class RoomManager {
    // roomId -> Map<peerId, ConnectedPeer>
    rooms = new Map();
    // peerId -> roomId
    peerToRoom = new Map();
    joinRoom(roomId, peerId, username, ws, userId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map());
        }
        const room = this.rooms.get(roomId);
        const isHost = room.size === 0;
        const existingPeers = Array.from(room.values()).map((p) => ({
            id: p.id,
            username: p.username,
            userId: p.userId,
            joinedAt: p.joinedAt,
            isHost: p.isHost,
        }));
        const newPeer = {
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
    leaveRoom(peerId) {
        const roomId = this.peerToRoom.get(peerId);
        if (!roomId)
            return null;
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
    getPeersInRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return [];
        return Array.from(room.values()).map((p) => ({
            id: p.id,
            username: p.username,
            userId: p.userId,
            joinedAt: p.joinedAt,
            isHost: p.isHost,
        }));
    }
    getPeerSocket(roomId, targetPeerId) {
        let room = this.rooms.get(roomId);
        if (!room) {
            const actualRoomId = this.peerToRoom.get(targetPeerId);
            if (actualRoomId) {
                room = this.rooms.get(actualRoomId);
            }
        }
        if (!room)
            return null;
        const peer = room.get(targetPeerId);
        return peer ? peer.ws : null;
    }
    getRoomIdByPeer(peerId) {
        return this.peerToRoom.get(peerId);
    }
    broadcastToRoom(roomId, message, excludePeerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        const payload = JSON.stringify(message);
        for (const [peerId, peer] of room.entries()) {
            if (excludePeerId && peerId === excludePeerId)
                continue;
            if (peer.ws.readyState === ws_1.WebSocket.OPEN) {
                peer.ws.send(payload);
            }
        }
    }
    sendToPeer(roomId, targetPeerId, message) {
        const targetWs = this.getPeerSocket(roomId, targetPeerId);
        if (targetWs && targetWs.readyState === ws_1.WebSocket.OPEN) {
            targetWs.send(JSON.stringify(message));
            return true;
        }
        return false;
    }
}
exports.RoomManager = RoomManager;
exports.roomManager = new RoomManager();
