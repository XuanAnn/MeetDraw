import {
  SignalMessage,
  SignalType,
  RoomJoinedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  OfferPayload,
  AnswerPayload,
  IceCandidatePayload,
  ErrorPayload,
} from '@meetdraw/shared';
import { createLogger } from '../utils/logger';

const log = createLogger('SignalingService');

export type SignalHandler<T = any> = (message: SignalMessage<T>) => void;

class SignalingService {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<SignalType, Set<SignalHandler>> = new Map();
  private isConnecting = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;
  private messageQueue: SignalMessage[] = [];
  private lastMessages: Map<SignalType, SignalMessage> = new Map();
  public selfPeerId: string | null = null;
  public currentRoomId: string | null = null;

  constructor() {
    if (import.meta.env.VITE_SIGNALING_URL) {
      this.url = import.meta.env.VITE_SIGNALING_URL;
    } else {
      this.url = 'wss://meetgold.onrender.com/signaling';
    }
  }

  connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    return new Promise((resolve, reject) => {
      log.info(`Connecting to signaling server at: ${this.url}`);
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          log.info('WebSocket connection established.');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const message: SignalMessage = JSON.parse(event.data);
            log.network(`RECEIVED [${message.type}] from ${message.senderId}`, message);

            if (message.type === 'ROOM_JOINED') {
              const payload = message.payload as RoomJoinedPayload;
              this.selfPeerId = payload.selfId;
              this.currentRoomId = payload.roomId;
              this.lastMessages.set(message.type, message);
            }

            this.dispatch(message);
          } catch (err) {
            log.error('Failed to parse incoming signal message:', err);
          }
        };

        this.ws.onclose = (event) => {
          log.warn(`WebSocket connection closed (Code: ${event.code})`);
          this.isConnecting = false;
          this.ws = null;
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            log.info(`Attempting reconnect in ${delay}ms (Attempt ${this.reconnectAttempts})`);
            this.reconnectTimeout = setTimeout(() => this.connect(), delay);
          }
        };

        this.ws.onerror = (err) => {
          log.error('WebSocket encountered an error:', err);
          if (this.isConnecting) {
            reject(err);
          }
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }

  disconnect() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.selfPeerId = null;
    this.currentRoomId = null;
    this.messageQueue = [];
    this.lastMessages.clear();
  }

  send<T>(message: SignalMessage<T>) {
    log.network(`SENDING [${message.type}] to ${message.targetId || 'ROOM'}`, message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      log.warn(`WebSocket not open (state: ${this.ws?.readyState}). Queueing message.`);
      this.messageQueue.push(message as SignalMessage<unknown>);
      if (!this.isConnecting) {
        this.connect();
      }
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift();
      if (msg) {
        this.send(msg);
      }
    }
  }

  joinRoom(roomId: string, username: string, userId?: string, email?: string) {
    this.currentRoomId = roomId;
    this.lastMessages.delete('ROOM_JOINED');
    this.send({
      type: 'JOIN_ROOM',
      roomId,
      senderId: this.selfPeerId || 'pending',
      payload: { username, userId, email },
    });
  }

  leaveRoom(roomId: string) {
    this.send({
      type: 'LEAVE_ROOM',
      roomId,
      senderId: this.selfPeerId || 'unknown',
    });
    this.currentRoomId = null;
  }

  sendOffer(roomId: string, targetId: string, sdp: RTCSessionDescriptionInit) {
    this.send<OfferPayload>({
      type: 'OFFER',
      roomId,
      senderId: this.selfPeerId!,
      targetId,
      payload: { sdp },
    });
  }

  sendAnswer(roomId: string, targetId: string, sdp: RTCSessionDescriptionInit) {
    this.send<AnswerPayload>({
      type: 'ANSWER',
      roomId,
      senderId: this.selfPeerId!,
      targetId,
      payload: { sdp },
    });
  }

  sendIceCandidate(roomId: string, targetId: string, candidate: RTCIceCandidateInit) {
    this.send<IceCandidatePayload>({
      type: 'ICE_CANDIDATE',
      roomId,
      senderId: this.selfPeerId!,
      targetId,
      payload: { candidate },
    });
  }

  on<T>(type: SignalType, handler: SignalHandler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(handler as SignalHandler);

    // ROOM_JOINED can arrive while another hook is still mounting. Replay the
    // latest room confirmation so peer negotiation is never lost.
    if (type === 'ROOM_JOINED') {
      const lastMessage = this.lastMessages.get(type);
      if (lastMessage) {
        queueMicrotask(() => handler(lastMessage as SignalMessage<T>));
      }
    }

    return () => {
      set.delete(handler as SignalHandler);
    };
  }

  private dispatch(message: SignalMessage) {
    const handlers = this.listeners.get(message.type);
    if (handlers) {
      handlers.forEach((fn) => fn(message));
    }
  }
}

export const signalingService = new SignalingService();
