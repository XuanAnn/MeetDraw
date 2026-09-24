"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sfuManager = exports.SfuManager = void 0;
class SfuManager {
    // roomId -> SfuRoomState
    rooms = new Map();
    // peerId -> roomId
    peerToRoom = new Map();
    getOrCreateRoom(roomId) {
        let state = this.rooms.get(roomId);
        if (!state) {
            state = {
                roomId,
                producers: new Map(),
                consumers: new Map(),
                activeSpeakerId: null,
                pinnedProducerId: null,
                maxVideoSlots: 4, // Up to 4 active video streams routed concurrently
            };
            this.rooms.set(roomId, state);
        }
        return state;
    }
    registerPeer(roomId, peerId) {
        this.peerToRoom.set(peerId, roomId);
        this.getOrCreateRoom(roomId);
    }
    createProducer(roomId, peerId, username, kind, mediaType) {
        const room = this.getOrCreateRoom(roomId);
        this.peerToRoom.set(peerId, roomId);
        // If producer of same kind and mediaType already exists for this peer, replace it
        for (const [existingId, p] of room.producers.entries()) {
            if (p.peerId === peerId && p.kind === kind && p.mediaType === mediaType) {
                room.producers.delete(existingId);
                break;
            }
        }
        const producerId = `prod_${peerId}_${kind}_${mediaType}_${Date.now()}`;
        const producer = {
            id: producerId,
            peerId,
            username,
            kind,
            mediaType,
            paused: false,
            createdAt: Date.now(),
        };
        room.producers.set(producerId, producer);
        console.log(`[SFU] Producer registered: ${producerId} (${kind}/${mediaType}) by ${username} (${peerId}) in room ${roomId}`);
        return producer;
    }
    getProducer(roomId, producerId) {
        const room = this.rooms.get(roomId);
        return room?.producers.get(producerId);
    }
    getProducersInRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return [];
        return Array.from(room.producers.values());
    }
    closeProducer(roomId, producerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        const producer = room.producers.get(producerId);
        if (producer) {
            room.producers.delete(producerId);
            // Clean up any consumers attached to this producer
            for (const [cId, c] of room.consumers.entries()) {
                if (c.producerId === producerId) {
                    room.consumers.delete(cId);
                }
            }
            console.log(`[SFU] Producer closed: ${producerId} in room ${roomId}`);
            return producer;
        }
        return null;
    }
    setProducerPaused(roomId, producerId, paused) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        const producer = room.producers.get(producerId);
        if (producer) {
            producer.paused = paused;
            console.log(`[SFU] Producer ${producerId} set paused=${paused}`);
            return true;
        }
        return false;
    }
    createConsumer(roomId, peerId, producerId) {
        const room = this.getOrCreateRoom(roomId);
        const producer = room.producers.get(producerId);
        if (!producer)
            return null;
        const consumerId = `cons_${peerId}_${producerId}`;
        const consumer = {
            id: consumerId,
            peerId,
            producerId,
            kind: producer.kind,
            paused: producer.paused,
            createdAt: Date.now(),
        };
        room.consumers.set(consumerId, consumer);
        return consumer;
    }
    closeConsumer(roomId, consumerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return false;
        return room.consumers.delete(consumerId);
    }
    setActiveSpeaker(roomId, peerId) {
        const room = this.getOrCreateRoom(roomId);
        room.activeSpeakerId = peerId;
        console.log(`[SFU] Room ${roomId} Active Speaker updated -> ${peerId}`);
    }
    getActiveSpeaker(roomId) {
        return this.rooms.get(roomId)?.activeSpeakerId || null;
    }
    setPinnedProducer(roomId, producerId) {
        const room = this.getOrCreateRoom(roomId);
        room.pinnedProducerId = producerId;
    }
    // Remove peer completely from SFU state
    removePeer(peerId) {
        const roomId = this.peerToRoom.get(peerId);
        if (!roomId)
            return null;
        this.peerToRoom.delete(peerId);
        const room = this.rooms.get(roomId);
        if (!room)
            return null;
        const closedProducers = [];
        // Remove all producers owned by this peer
        for (const [pId, producer] of Array.from(room.producers.entries())) {
            if (producer.peerId === peerId) {
                room.producers.delete(pId);
                closedProducers.push(producer);
            }
        }
        // Remove all consumers owned by this peer
        for (const [cId, consumer] of Array.from(room.consumers.entries())) {
            if (consumer.peerId === peerId) {
                room.consumers.delete(cId);
            }
        }
        if (room.activeSpeakerId === peerId) {
            room.activeSpeakerId = null;
        }
        // Clean up empty room
        if (room.producers.size === 0 && room.consumers.size === 0) {
            this.rooms.delete(roomId);
        }
        return { roomId, closedProducers };
    }
    // Calculate real-time SFU bandwidth savings & routing statistics
    getSfuStats(roomId, peerCount) {
        const room = this.rooms.get(roomId);
        const activeProducers = room ? room.producers.size : 0;
        const activeConsumers = room ? room.consumers.size : 0;
        // Full Mesh upload cost = N * (N - 1)
        // SFU upload cost = N * 1
        // Bandwidth saved = ((N - 1) - 1) / (N - 1) * 100%
        let bandwidthSavedPercent = 0;
        if (peerCount > 1) {
            const meshUploads = peerCount * (peerCount - 1);
            const sfuUploads = peerCount;
            bandwidthSavedPercent = Math.round(((meshUploads - sfuUploads) / meshUploads) * 100);
        }
        return {
            activeProducers,
            activeConsumers,
            bandwidthSavedPercent,
            topology: 'SFU',
            activeSpeakerId: room?.activeSpeakerId || null,
        };
    }
    // Selective Forwarding: computes which video producers should be actively forwarded to targetPeerId
    getSelectiveForwardingPlan(roomId, targetPeerId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { activeProducerIds: [], pausedProducerIds: [] };
        }
        const videoProducers = Array.from(room.producers.values()).filter((p) => p.kind === 'video' && p.peerId !== targetPeerId);
        // Sort priority:
        // 1. Screen share (always top priority)
        // 2. Active speaker
        // 3. Pinned producer
        // 4. Most recently published
        videoProducers.sort((a, b) => {
            if (a.mediaType === 'screen' && b.mediaType !== 'screen')
                return -1;
            if (b.mediaType === 'screen' && a.mediaType !== 'screen')
                return 1;
            if (a.peerId === room.activeSpeakerId)
                return -1;
            if (b.peerId === room.activeSpeakerId)
                return 1;
            if (a.id === room.pinnedProducerId)
                return -1;
            if (b.id === room.pinnedProducerId)
                return 1;
            return b.createdAt - a.createdAt;
        });
        const activeList = videoProducers.slice(0, room.maxVideoSlots).map((p) => p.id);
        const pausedList = videoProducers.slice(room.maxVideoSlots).map((p) => p.id);
        return {
            activeProducerIds: activeList,
            pausedProducerIds: pausedList,
        };
    }
}
exports.SfuManager = SfuManager;
exports.sfuManager = new SfuManager();
