import { WebSocket } from 'ws';
import {
  SignalMessage,
  SignalType,
  JoinRoomPayload,
  RoomJoinedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  SfuProducePayload,
  SfuProduceAckPayload,
  SfuConsumePayload,
  SfuConsumeAckPayload,
  SfuProducerAddedPayload,
  SfuProducerClosedPayload,
  SfuPauseProducerPayload,
  SfuActiveSpeakerPayload,
  SfuStatsPayload,
} from '@meetdraw/shared';
import { roomManager } from './room.manager';
import { sfuManager } from './sfu.manager';
import { RoomService } from '../services/room.service';

export class SignalingHandler {
  static handleMessage(ws: WebSocket, senderId: string, rawData: string): void {
    try {
      const message: SignalMessage = JSON.parse(rawData);
      const { type, roomId, targetId, payload } = message;

      if (!type || !roomId) {
        this.sendError(ws, roomId || 'unknown', senderId, 'Invalid signal format: missing type or roomId');
        return;
      }

      switch (type) {
        case 'JOIN_ROOM':
          this.handleJoinRoom(ws, roomId, senderId, payload as JoinRoomPayload);
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
          this.handleSfuProduce(ws, roomId, senderId, payload as SfuProducePayload);
          break;

        case 'SFU_CONSUME':
          this.handleSfuConsume(ws, roomId, senderId, payload as SfuConsumePayload);
          break;

        case 'SFU_PAUSE_PRODUCER':
          this.handleSfuPauseProducer(roomId, senderId, payload as SfuPauseProducerPayload);
          break;

        case 'SFU_ACTIVE_SPEAKER':
          this.handleSfuActiveSpeaker(roomId, senderId, payload as SfuActiveSpeakerPayload);
          break;

        default:
          console.warn(`[SignalingHandler] Unknown signal type: ${type}`);
          this.sendError(ws, roomId, senderId, `Unknown signal type: ${type}`);
      }
    } catch (err: any) {
      console.error('[SignalingHandler] Error handling message:', err);
      this.sendError(ws, 'unknown', senderId, 'Malformed JSON signal packet');
    }
  }

  private static async handleJoinRoom(
    ws: WebSocket,
    roomId: string,
    peerId: string,
    payload: JoinRoomPayload
  ): Promise<void> {
    const username = (payload && payload.username) ? payload.username.trim() : `User-${peerId.substring(0, 4)}`;
    const userId = payload && payload.userId ? payload.userId : undefined;

    // Verify or fetch room info
    const roomDetails = await RoomService.getRoomDetails(roomId);
    const roomName = roomDetails ? roomDetails.name : `Room ${roomId}`;

    // Join in roomManager
    const { peers, isHost } = roomManager.joinRoom(roomId, peerId, username, ws, userId);
    sfuManager.registerPeer(roomId, peerId);

    // 1. Send back confirmation with existing peers list
    const roomJoinedMsg: SignalMessage<RoomJoinedPayload> = {
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
    const existingProducers = sfuManager.getProducersInRoom(roomId);
    for (const prod of existingProducers) {
      if (prod.peerId !== peerId) {
        const prodAddedMsg: SignalMessage<SfuProducerAddedPayload> = {
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
    const userJoinedMsg: SignalMessage<UserJoinedPayload> = {
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
    roomManager.broadcastToRoom(roomId, userJoinedMsg, peerId);

    // 4. Broadcast updated SFU metrics
    this.broadcastSfuStats(roomId);
  }

  public static handleLeaveRoom(peerId: string): void {
    const result = roomManager.leaveRoom(peerId);
    if (result) {
      const { roomId } = result;

      // Clean up SFU state
      const sfuResult = sfuManager.removePeer(peerId);
      if (sfuResult && sfuResult.closedProducers.length > 0) {
        for (const closedProd of sfuResult.closedProducers) {
          const prodClosedMsg: SignalMessage<SfuProducerClosedPayload> = {
            type: 'SFU_PRODUCER_CLOSED',
            roomId,
            senderId: 'sfu-router',
            payload: {
              producerId: closedProd.id,
              peerId,
              kind: closedProd.kind,
            },
          };
          roomManager.broadcastToRoom(roomId, prodClosedMsg);
        }
      }

      const userLeftMsg: SignalMessage<UserLeftPayload> = {
        type: 'USER_LEFT',
        roomId,
        senderId: peerId,
        payload: {
          peerId,
          reason: 'User disconnected',
        },
      };
      roomManager.broadcastToRoom(roomId, userLeftMsg);

      // Broadcast updated SFU metrics
      this.broadcastSfuStats(roomId);
    }
  }

  private static handleSfuProduce(
    ws: WebSocket,
    roomId: string,
    peerId: string,
    payload: SfuProducePayload
  ): void {
    if (!payload || !payload.kind) return;

    // Find peer's username
    const peers = roomManager.getPeersInRoom(roomId);
    const peer = peers.find((p) => p.id === peerId);
    const username = peer ? peer.username : `User-${peerId.substring(0, 4)}`;

    const producer = sfuManager.createProducer(
      roomId,
      peerId,
      username,
      payload.kind,
      payload.mediaType || 'camera'
    );

    // 1. Send ACK back to the producing client
    const ackMsg: SignalMessage<SfuProduceAckPayload> = {
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
    const prodAddedMsg: SignalMessage<SfuProducerAddedPayload> = {
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
    roomManager.broadcastToRoom(roomId, prodAddedMsg, peerId);

    // 3. Broadcast updated SFU stats
    this.broadcastSfuStats(roomId);
  }

  private static handleSfuConsume(
    ws: WebSocket,
    roomId: string,
    peerId: string,
    payload: SfuConsumePayload
  ): void {
    if (!payload || !payload.producerId) return;

    const consumer = sfuManager.createConsumer(roomId, peerId, payload.producerId);
    if (!consumer) {
      this.sendError(ws, roomId, peerId, `Producer ${payload.producerId} not found`);
      return;
    }

    const ackMsg: SignalMessage<SfuConsumeAckPayload> = {
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

  private static handleSfuPauseProducer(
    roomId: string,
    peerId: string,
    payload: SfuPauseProducerPayload
  ): void {
    if (!payload || !payload.producerId) return;
    sfuManager.setProducerPaused(roomId, payload.producerId, payload.paused);

    const pauseMsg: SignalMessage<SfuPauseProducerPayload> = {
      type: 'SFU_PAUSE_PRODUCER',
      roomId,
      senderId: peerId,
      payload: {
        producerId: payload.producerId,
        paused: payload.paused,
      },
    };
    roomManager.broadcastToRoom(roomId, pauseMsg);
  }

  private static handleSfuActiveSpeaker(
    roomId: string,
    peerId: string,
    payload: SfuActiveSpeakerPayload
  ): void {
    const speakerId = payload && payload.peerId ? payload.peerId : peerId;
    sfuManager.setActiveSpeaker(roomId, speakerId);

    const speakerMsg: SignalMessage<SfuActiveSpeakerPayload> = {
      type: 'SFU_ACTIVE_SPEAKER',
      roomId,
      senderId: 'sfu-router',
      payload: {
        peerId: speakerId,
        volume: payload?.volume,
      },
    };
    roomManager.broadcastToRoom(roomId, speakerMsg);
  }

  private static broadcastSfuStats(roomId: string): void {
    const peers = roomManager.getPeersInRoom(roomId);
    const stats = sfuManager.getSfuStats(roomId, peers.length);

    const statsMsg: SignalMessage<SfuStatsPayload> = {
      type: 'SFU_STATS',
      roomId,
      senderId: 'sfu-router',
      payload: stats,
    };
    roomManager.broadcastToRoom(roomId, statsMsg);
  }

  private static handleP2PSignal(message: SignalMessage): void {
    const { roomId, senderId, targetId, type } = message;
    if (!targetId) {
      console.warn(`[SignalingHandler] ${type} message missing targetId from peer ${senderId}`);
      return;
    }

    const delivered = roomManager.sendToPeer(roomId, targetId, message);
    if (!delivered) {
      console.warn(`[SignalingHandler] Failed to route ${type} from ${senderId} to ${targetId} in room ${roomId}`);
    }
  }

  private static sendError(ws: WebSocket, roomId: string, senderId: string, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      const errorMsg: SignalMessage = {
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
