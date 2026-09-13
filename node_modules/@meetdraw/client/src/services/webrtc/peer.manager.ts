import {
  DataChannelPacket,
  WhiteboardEvent,
  ChatMessage,
  PeerInfo,
  OfferPayload,
  AnswerPayload,
  IceCandidatePayload,
  UserJoinedPayload,
  UserLeftPayload,
  RoomJoinedPayload,
} from '@meetdraw/shared';
import { SinglePeerConnection } from './peer.connection';
import { PeerConnectionCallback } from './peer.types';
import { signalingService } from '../signaling.service';
import { mediaStreamManager } from './media.stream';
import { createLogger } from '../../utils/logger';

const log = createLogger('PeerManager');

export interface ConnectedPeerInfo {
  id: string;
  username: string;
}

export type PeerManagerListener = {
  onPeersUpdated?: (peers: ConnectedPeerInfo[]) => void;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved?: (peerId: string) => void;
  onWhiteboardEvent?: (peerId: string, event: WhiteboardEvent) => void;
  onChatMessage?: (peerId: string, message: ChatMessage) => void;
  onPeerStateChange?: (peerId: string, state: RTCPeerConnectionState) => void;
};

export class PeerManager {
  private peers: Map<string, SinglePeerConnection> = new Map();
  private peerUsernames: Map<string, string> = new Map();
  private roomId: string | null = null;
  private listeners: PeerManagerListener = {};
  private unsubscribers: Array<() => void> = [];
  private localStream: MediaStream | null = null;
  private pendingInitialOffers = new Set<string>();
  private negotiatingPeers = new Set<string>();

  constructor() {}

  init(roomId: string, listeners: PeerManagerListener) {
    this.roomId = roomId;
    this.listeners = listeners;
    this.bindSignaling();

    // Automatically push tracks to peers whenever local stream is acquired or updated
    const unsubStream = mediaStreamManager.onStreamUpdated((stream) => {
      this.updateLocalStream(stream);
    });
    this.unsubscribers.push(unsubStream);
  }

  private bindSignaling() {
    // 1. When we join room and receive list of existing peers
    const unsubRoomJoined = signalingService.on<RoomJoinedPayload>('ROOM_JOINED', async (msg) => {
      if (!msg.payload) return;
      log.info(`Joined room ${msg.roomId}. Initiating connection to existing peers:`, msg.payload.peers);
      const existingPeers = msg.payload.peers;

      // As the new joiner, connect to existing peers by creating offers
      for (const peer of existingPeers) {
        this.peerUsernames.set(peer.id, peer.username);
        await this.connectToPeer(peer.id, true);
      }
    });

    // 2. When another user joins the room
    const unsubUserJoined = signalingService.on<UserJoinedPayload>('USER_JOINED', async (msg) => {
      if (!msg.payload) return;
      log.info(`New user joined room: ${msg.payload.username} (${msg.payload.peerId})`);
      this.peerUsernames.set(msg.payload.peerId, msg.payload.username);
      // The newly joined peer will send an offer to us, so we create our connection entry and await their offer
      this.getOrCreatePeer(msg.payload.peerId);
    });

    // 3. Offer received from a peer
    const unsubOffer = signalingService.on<OfferPayload>('OFFER', async (msg) => {
      if (!msg.payload) return;
      log.info(`Received OFFER from peer ${msg.senderId}`);
      const peer = this.getOrCreatePeer(msg.senderId);

      try {
        log.info('RECEIVE_OFFER', msg.senderId);
        const localStream = this.localStream || mediaStreamManager.getStream();
        if (localStream) {
          await peer.addLocalStream(localStream);
        }

        await peer.setRemoteDescription(msg.payload.sdp);
        const answer = await peer.createAnswer();
        signalingService.sendAnswer(this.roomId!, msg.senderId, answer);
      } catch (err) {
        log.warn(`Could not accept offer from ${msg.senderId}:`, err);
      }
    });

    // 4. Answer received from a peer
    const unsubAnswer = signalingService.on<AnswerPayload>('ANSWER', async (msg) => {
      if (!msg.payload) return;
      log.info(`Received ANSWER from peer ${msg.senderId}`);
      const peer = this.peers.get(msg.senderId);
      if (peer) {
        try {
          log.info('RECEIVE_ANSWER', msg.senderId);
          await peer.setRemoteDescription(msg.payload.sdp);
        } catch (err) {
          log.warn(`Could not accept answer from ${msg.senderId}:`, err);
        }
      }
    });

    // 5. ICE candidate received
    const unsubIce = signalingService.on<IceCandidatePayload>('ICE_CANDIDATE', async (msg) => {
      if (!msg.payload) return;
      log.network(`Received ICE_CANDIDATE from peer ${msg.senderId}`);
      const peer = this.peers.get(msg.senderId);
      if (peer) {
        await peer.addIceCandidate(msg.payload.candidate);
      }
    });

    // 6. User left room
    const unsubUserLeft = signalingService.on<UserLeftPayload>('USER_LEFT', (msg) => {
      log.info(`Peer ${msg.senderId} left room. Cleaning up connection.`);
      this.removePeer(msg.senderId);
    });

    this.unsubscribers.push(
      unsubRoomJoined,
      unsubUserJoined,
      unsubOffer,
      unsubAnswer,
      unsubIce,
      unsubUserLeft
    );
  }

  private async connectToPeer(peerId: string, isInitiator: boolean) {
    const peer = this.getOrCreatePeer(peerId);

    const localStream = this.localStream || mediaStreamManager.getStream();
    if (isInitiator && !localStream) {
      this.pendingInitialOffers.add(peerId);
      log.info(`Waiting for LOCAL_STREAM_READY before creating offer for ${peerId}`);
      return;
    }
    if (localStream) {
      await peer.addLocalStream(localStream);
    }

    if (isInitiator) {
      peer.initDataChannel();
      await this.createAndSendOffer(peerId, peer);
    }
  }

  private async createAndSendOffer(peerId: string, peer: SinglePeerConnection) {
    if (this.negotiatingPeers.has(peerId) || peer.pc.signalingState !== 'stable' || !this.roomId) return;
    this.negotiatingPeers.add(peerId);
    try {
      const offer = await peer.createOffer();
      signalingService.sendOffer(this.roomId, peerId, offer);
    } catch (err) {
      log.warn(`Could not negotiate offer with ${peerId}:`, err);
    } finally {
      this.negotiatingPeers.delete(peerId);
    }
  }

  private getOrCreatePeer(peerId: string): SinglePeerConnection {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    const callbacks: PeerConnectionCallback = {
      onIceCandidate: (pId, candidate) => {
        if (this.roomId) {
          signalingService.sendIceCandidate(this.roomId, pId, candidate.toJSON());
        }
      },
      onConnectionStateChange: (pId, state) => {
        if (state === 'connected') log.info(`ICE_CONNECTED ${pId}`);
        if (this.listeners.onPeerStateChange) {
          this.listeners.onPeerStateChange(pId, state);
        }
        if (state === 'failed' || state === 'closed') {
          this.removePeer(pId);
        }
      },
      onTrack: (pId, stream) => {
        if (this.listeners.onRemoteStream) {
          this.listeners.onRemoteStream(pId, stream);
        }
      },
      onDataChannelOpen: (pId) => {
        log.info(`DataChannel ready with ${pId}`);
      },
      onDataChannelClose: (pId) => {
        log.info(`DataChannel closed with ${pId}`);
      },
      onWhiteboardEvent: (pId, event) => {
        if (this.listeners.onWhiteboardEvent) {
          this.listeners.onWhiteboardEvent(pId, event);
        }
      },
      onChatMessage: (pId, msg) => {
        if (this.listeners.onChatMessage) {
          this.listeners.onChatMessage(pId, msg);
        }
      },
    };

    const newPeer = new SinglePeerConnection(peerId, callbacks);
    this.peers.set(peerId, newPeer);

    this.notifyPeersUpdated();

    return newPeer;
  }

  private notifyPeersUpdated() {
    if (this.listeners.onPeersUpdated) {
      const peerInfos: ConnectedPeerInfo[] = Array.from(this.peers.keys()).map((id) => ({
        id,
        username: this.peerUsernames.get(id) || '',
      }));
      this.listeners.onPeersUpdated(peerInfos);
    }
  }

  removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
      this.peerUsernames.delete(peerId);
      if (this.listeners.onRemoteStreamRemoved) {
        this.listeners.onRemoteStreamRemoved(peerId);
      }
      this.notifyPeersUpdated();
    }
  }

  // Broadcast data packet to all peers in the mesh
  broadcastData(packet: DataChannelPacket): number {
    let sentCount = 0;
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.sendData(packet)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  broadcastWhiteboardEvent(event: WhiteboardEvent) {
    const packet: DataChannelPacket = {
      type: 'WHITEBOARD',
      payload: event,
    };
    this.broadcastData(packet);
  }

  broadcastChatMessage(msg: ChatMessage) {
    const packet: DataChannelPacket = {
      type: 'CHAT',
      payload: msg,
    };
    this.broadcastData(packet);
  }

  broadcastCursor(cursor: WhiteboardEvent) {
    const packet: DataChannelPacket = {
      type: 'CURSOR',
      payload: cursor,
    };
    this.broadcastData(packet);
  }

  // Attach new local media stream (e.g. after user grants permission or screen share)
  updateLocalStream(stream: MediaStream) {
    this.localStream = stream;
    log.info('LOCAL_STREAM_READY', {
      audio: stream.getAudioTracks().length,
      video: stream.getVideoTracks().length,
    });
    for (const peerId of this.pendingInitialOffers) {
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.initDataChannel();
        void this.attachStreamAndNegotiate(peerId, peer, stream, true);
      }
    }
    this.pendingInitialOffers.clear();
    for (const peer of this.peers.values()) {
      void this.attachStreamAndNegotiate(peer.peerId, peer, stream);
    }
  }

  private async attachStreamAndNegotiate(
    peerId: string,
    peer: SinglePeerConnection,
    stream: MediaStream,
    forceOffer = false
  ) {
    const changed = await peer.addLocalStream(stream);
    if ((changed || forceOffer) && (forceOffer || peer.pc.remoteDescription) && peer.pc.signalingState === 'stable') {
      await this.createAndSendOffer(peerId, peer);
    }
  }

  getConnectedPeerCount(): number {
    return this.peers.size;
  }

  cleanup() {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    for (const peer of this.peers.values()) {
      peer.close();
    }
    this.peers.clear();
    this.peerUsernames.clear();
    this.localStream = null;
    this.pendingInitialOffers.clear();
    this.negotiatingPeers.clear();
    this.roomId = null;
  }
}

export const peerManager = new PeerManager();
