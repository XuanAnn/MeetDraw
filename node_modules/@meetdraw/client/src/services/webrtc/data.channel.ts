import { DataChannelPacket, WhiteboardEvent, ChatMessage, ScreenShareStatePayload } from '@meetdraw/shared';
import { createLogger } from '../../utils/logger';

const log = createLogger('DataChannel');

export class ManagedDataChannel {
  private channel: RTCDataChannel;
  private peerId: string;
  private onWhiteboardEvent: (peerId: string, event: WhiteboardEvent) => void;
  private onChatMessage: (peerId: string, msg: ChatMessage) => void;
  private onScreenShareEvent?: (peerId: string, payload: ScreenShareStatePayload) => void;
  private onOpen?: () => void;
  private onClose?: () => void;

  constructor(
    channel: RTCDataChannel,
    peerId: string,
    callbacks: {
      onWhiteboardEvent: (peerId: string, event: WhiteboardEvent) => void;
      onChatMessage: (peerId: string, msg: ChatMessage) => void;
      onScreenShareEvent?: (peerId: string, payload: ScreenShareStatePayload) => void;
      onOpen?: () => void;
      onClose?: () => void;
    }
  ) {
    this.channel = channel;
    this.peerId = peerId;
    this.onWhiteboardEvent = callbacks.onWhiteboardEvent;
    this.onChatMessage = callbacks.onChatMessage;
    this.onScreenShareEvent = callbacks.onScreenShareEvent;
    this.onOpen = callbacks.onOpen;
    this.onClose = callbacks.onClose;

    this.bindEvents();
  }

  private bindEvents() {
    this.channel.onopen = () => {
      log.info(`DataChannel opened with peer: ${this.peerId}`);
      if (this.onOpen) this.onOpen();
    };

    this.channel.onclose = () => {
      log.warn(`DataChannel closed with peer: ${this.peerId}`);
      if (this.onClose) this.onClose();
    };

    this.channel.onerror = (err) => {
      log.error(`DataChannel error with peer ${this.peerId}:`, err);
    };

    this.channel.onmessage = (event: MessageEvent) => {
      try {
        const packet: DataChannelPacket = JSON.parse(event.data);
        log.network(`DataChannel packet [${packet.type}] from ${this.peerId}`);

        switch (packet.type) {
          case 'WHITEBOARD':
          case 'CURSOR':
            this.onWhiteboardEvent(this.peerId, packet.payload as WhiteboardEvent);
            break;
          case 'CHAT':
            this.onChatMessage(this.peerId, packet.payload as ChatMessage);
            break;
          case 'SCREEN_SHARE':
            this.onScreenShareEvent?.(this.peerId, packet.payload as ScreenShareStatePayload);
            break;
          default:
            log.warn(`Unknown data channel packet type: ${packet.type}`);
        }
      } catch (err) {
        log.error('Failed to parse incoming DataChannel packet:', err);
      }
    };
  }

  send(packet: DataChannelPacket): boolean {
    if (this.channel.readyState === 'open') {
      try {
        this.channel.send(JSON.stringify(packet));
        return true;
      } catch (err) {
        log.error(`Failed to send packet to peer ${this.peerId}:`, err);
        return false;
      }
    } else {
      log.warn(`Cannot send packet, DataChannel state with ${this.peerId} is ${this.channel.readyState}`);
      return false;
    }
  }

  isOpen(): boolean {
    return this.channel.readyState === 'open';
  }

  close() {
    try {
      this.channel.close();
    } catch {
      // ignore
    }
  }
}
