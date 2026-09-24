"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalingHandler = void 0;
const ws_1 = require("ws");
const room_manager_1 = require("./room.manager");
const sfu_manager_1 = require("./sfu.manager");
const room_service_1 = require("../services/room.service");
class SignalingHandler {
    static handleMessage(ws, senderId, rawData) {
        try {
            const message = JSON.parse(rawData);
            const { type, roomId, targetId, payload } = message;
            if (!type || !roomId) {
                this.sendError(ws, roomId || 'unknown', senderId, 'Invalid signal format: missing type or roomId');
                return;
            }
            switch (type) {
                case 'JOIN_ROOM':
                    this.handleJoinRoom(ws, roomId, senderId, payload);
                    break;
                case 'LEAVE_ROOM':
                    this.handleLeaveRoom(senderId);
                    break;
                case 'OFFER':
                case 'ANSWER':
                case 'ICE_CANDIDATE':
                    this.handleP2PSignal(message);
                    break;
                // SFU Specific Signaling
                case 'SFU_PRODUCE':
                    this.handleSfuProduce(ws, roomId, senderId, payload);
                    break;
                case 'SFU_CONSUME':
                    this.handleSfuConsume(ws, roomId, senderId, payload);
                    break;
                case 'SFU_PAUSE_PRODUCER':
                    this.handleSfuPauseProducer(roomId, senderId, payload);
                    break;
                case 'SFU_ACTIVE_SPEAKER':
                    this.handleSfuActiveSpeaker(roomId, senderId, payload);
                    break;
                default:
                    console.warn(`[SignalingHandler] Unknown signal type: ${type}`);
                    this.sendError(ws, roomId, senderId, `Unknown signal type: ${type}`);
            }
        }
        catch (err) {
            console.error('[SignalingHandler] Error handling message:', err);
            this.sendError(ws, 'unknown', senderId, 'Malformed JSON signal packet');
        }
    }
    static async handleJoinRoom(ws, roomId, peerId, payload) {
        const username = (payload && payload.username) ? payload.username.trim() : `User-${peerId.substring(0, 4)}`;
        const userId = payload && payload.userId ? payload.userId : undefined;
        // Verify or fetch room info
        const roomDetails = await room_service_1.RoomService.getRoomDetails(roomId);
        const roomName = roomDetails ? roomDetails.name : `Room ${roomId}`;
        // Join in roomManager
        const { peers, isHost } = room_manager_1.roomManager.joinRoom(roomId, peerId, username, ws, userId);
        sfu_manager_1.sfuManager.registerPeer(roomId, peerId);
        // 1. Send back confirmation with existing peers list
        const roomJoinedMsg = {
            type: 'ROOM_JOINED',
            roomId,
            senderId: 'server',
            targetId: peerId,
            payload: {
                selfId: peerId,
                roomId,
                roomName,
                peers,
            },
        };
        ws.send(JSON.stringify(roomJoinedMsg));
        // 2. Inform the newly joined peer of all existing active producers in the room
        const existingProducers = sfu_manager_1.sfuManager.getProducersInRoom(roomId);
        for (const prod of existingProducers) {
            if (prod.peerId !== peerId) {
                const prodAddedMsg = {
                    type: 'SFU_PRODUCER_ADDED',
                    roomId,
                    senderId: 'sfu-router',
                    targetId: peerId,
                    payload: {
                        producer: {
                            producerId: prod.id,
                            peerId: prod.peerId,
                            kind: prod.kind,
                            mediaType: prod.mediaType,
                            paused: prod.paused,
                            username: prod.username,
                        },
                    },
                };
                ws.send(JSON.stringify(prodAddedMsg));
            }
        }
        // 3. Broadcast to other peers that a new user joined
        const userJoinedMsg = {
            type: 'USER_JOINED',
            roomId,
            senderId: peerId,
            payload: {
                peerId,
                username,
                userId,
                joinedAt: Date.now(),
            },
        };
        room_manager_1.roomManager.broadcastToRoom(roomId, userJoinedMsg, peerId);
        // 4. Broadcast updated SFU metrics
        this.broadcastSfuStats(roomId);
    }
    static handleLeaveRoom(peerId) {
        const result = room_manager_1.roomManager.leaveRoom(peerId);
        if (result) {
            const { roomId } = result;
            // Clean up SFU state
            const sfuResult = sfu_manager_1.sfuManager.removePeer(peerId);
            if (sfuResult && sfuResult.closedProducers.length > 0) {
                for (const closedProd of sfuResult.closedProducers) {
                    const prodClosedMsg = {
                        type: 'SFU_PRODUCER_CLOSED',
                        roomId,
                        senderId: 'sfu-router',
                        payload: {
                            producerId: closedProd.id,
                            peerId,
                            kind: closedProd.kind,
                        },
                    };
                    room_manager_1.roomManager.broadcastToRoom(roomId, prodClosedMsg);
                }
            }
            const userLeftMsg = {
                type: 'USER_LEFT',
                roomId,
                senderId: peerId,
                payload: {
                    peerId,
                    reason: 'User disconnected',
                },
            };
            room_manager_1.roomManager.broadcastToRoom(roomId, userLeftMsg);
            // Broadcast updated SFU metrics
            this.broadcastSfuStats(roomId);
        }
    }
    static handleSfuProduce(ws, roomId, peerId, payload) {
        if (!payload || !payload.kind)
            return;
        // Find peer's username
        const peers = room_manager_1.roomManager.getPeersInRoom(roomId);
        const peer = peers.find((p) => p.id === peerId);
        const username = peer ? peer.username : `User-${peerId.substring(0, 4)}`;
        const producer = sfu_manager_1.sfuManager.createProducer(roomId, peerId, username, payload.kind, payload.mediaType || 'camera');
        // 1. Send ACK back to the producing client
        const ackMsg = {
            type: 'SFU_PRODUCE_ACK',
            roomId,
            senderId: 'sfu-router',
            targetId: peerId,
            payload: {
                producerId: producer.id,
                kind: producer.kind,
                mediaType: producer.mediaType,
            },
        };
        ws.send(JSON.stringify(ackMsg));
        // 2. Broadcast to all other peers in the room that a new producer is available
        const prodAddedMsg = {
            type: 'SFU_PRODUCER_ADDED',
            roomId,
            senderId: 'sfu-router',
            payload: {
                producer: {
                    producerId: producer.id,
                    peerId,
                    kind: producer.kind,
                    mediaType: producer.mediaType,
                    paused: producer.paused,
                    username,
                },
            },
        };
        room_manager_1.roomManager.broadcastToRoom(roomId, prodAddedMsg, peerId);
        // 3. Broadcast updated SFU stats
        this.broadcastSfuStats(roomId);
    }
    static handleSfuConsume(ws, roomId, peerId, payload) {
        if (!payload || !payload.producerId)
            return;
        const consumer = sfu_manager_1.sfuManager.createConsumer(roomId, peerId, payload.producerId);
        if (!consumer) {
            this.sendError(ws, roomId, peerId, `Producer ${payload.producerId} not found`);
            return;
        }
        const ackMsg = {
            type: 'SFU_CONSUME_ACK',
            roomId,
            senderId: 'sfu-router',
            targetId: peerId,
            payload: {
                consumerId: consumer.id,
                producerId: consumer.producerId,
                kind: consumer.kind,
            },
        };
        ws.send(JSON.stringify(ackMsg));
        this.broadcastSfuStats(roomId);
    }
    static handleSfuPauseProducer(roomId, peerId, payload) {
        if (!payload || !payload.producerId)
            return;
        sfu_manager_1.sfuManager.setProducerPaused(roomId, payload.producerId, payload.paused);
        const pauseMsg = {
            type: 'SFU_PAUSE_PRODUCER',
            roomId,
            senderId: peerId,
            payload: {
                producerId: payload.producerId,
                paused: payload.paused,
            },
        };
        room_manager_1.roomManager.broadcastToRoom(roomId, pauseMsg);
    }
    static handleSfuActiveSpeaker(roomId, peerId, payload) {
        const speakerId = payload && payload.peerId ? payload.peerId : peerId;
        sfu_manager_1.sfuManager.setActiveSpeaker(roomId, speakerId);
        const speakerMsg = {
            type: 'SFU_ACTIVE_SPEAKER',
            roomId,
            senderId: 'sfu-router',
            payload: {
                peerId: speakerId,
                volume: payload?.volume,
            },
        };
        room_manager_1.roomManager.broadcastToRoom(roomId, speakerMsg);
    }
    static broadcastSfuStats(roomId) {
        const peers = room_manager_1.roomManager.getPeersInRoom(roomId);
        const stats = sfu_manager_1.sfuManager.getSfuStats(roomId, peers.length);
        const statsMsg = {
            type: 'SFU_STATS',
            roomId,
            senderId: 'sfu-router',
            payload: stats,
        };
        room_manager_1.roomManager.broadcastToRoom(roomId, statsMsg);
    }
    static handleP2PSignal(message) {
        const { roomId, senderId, targetId, type } = message;
        if (!targetId) {
            console.warn(`[SignalingHandler] ${type} message missing targetId from peer ${senderId}`);
            return;
        }
        const delivered = room_manager_1.roomManager.sendToPeer(roomId, targetId, message);
        if (!delivered) {
            console.warn(`[SignalingHandler] Failed to route ${type} from ${senderId} to ${targetId} in room ${roomId}`);
        }
    }
    static sendError(ws, roomId, senderId, message) {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            const errorMsg = {
                type: 'ERROR',
                roomId,
                senderId: 'server',
                targetId: senderId,
                payload: { message },
            };
            ws.send(JSON.stringify(errorMsg));
        }
    }
}
exports.SignalingHandler = SignalingHandler;
