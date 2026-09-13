import {
  DEFAULT_RTC_CONFIGURATION,
  DATA_CHANNEL_LABEL,
  DATA_CHANNEL_CONFIG,
  DataChannelPacket,
} from '@meetdraw/shared';
import { ManagedDataChannel } from './data.channel';
import { PeerConnectionCallback } from './peer.types';
import { createLogger } from '../../utils/logger';

export class SinglePeerConnection {
  public readonly peerId: string;
  public readonly pc: RTCPeerConnection;
  private dataChannel: ManagedDataChannel | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private isSettingRemoteDescription = false;
  private callbacks: PeerConnectionCallback;
  private log = createLogger('PeerConnection');

  constructor(peerId: string, callbacks: PeerConnectionCallback, config?: RTCConfiguration) {
    this.peerId = peerId;
    this.callbacks = callbacks;
    this.pc = new RTCPeerConnection(config || DEFAULT_RTC_CONFIGURATION);

    // Pre-allocate audio & video transceivers to ensure SDP always includes m=audio and m=video
    try {
      this.pc.addTransceiver('audio', { direction: 'sendrecv' });
      this.pc.addTransceiver('video', { direction: 'sendrecv' });
    } catch (e) {
      this.log.warn('addTransceiver not supported or failed:', e);
    }

    this.bindEvents();
  }

  private bindEvents() {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.log.network(`Generated ICE Candidate for peer ${this.peerId}`);
        this.callbacks.onIceCandidate(this.peerId, event.candidate);
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.log.info(`Connection state with ${this.peerId}: ${this.pc.connectionState}`);
      this.callbacks.onConnectionStateChange(this.peerId, this.pc.connectionState);
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed') {
        this.log.info(`ICE_CONNECTED ${this.peerId}`);
      }
    };

    this.pc.ontrack = (event) => {
      this.log.info(`REMOTE_TRACK ${event.track.kind} from ${this.peerId}`);
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((track) => {
          if (!this.remoteStream.getTracks().some((t) => t.id === track.id)) {
            this.remoteStream.addTrack(track);
          }
        });
      }
      if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        this.remoteStream.addTrack(event.track);
      }
      event.track.onunmute = () => {
        this.callbacks.onTrack(this.peerId, this.remoteStream);
      };
      this.callbacks.onTrack(this.peerId, this.remoteStream);
    };

    this.pc.ondatachannel = (event) => {
      this.log.info(`Received remote DataChannel (${event.channel.label}) from ${this.peerId}`);
      this.dataChannel = new ManagedDataChannel(event.channel, this.peerId, {
        onWhiteboardEvent: this.callbacks.onWhiteboardEvent,
        onChatMessage: this.callbacks.onChatMessage,
        onOpen: () => this.callbacks.onDataChannelOpen(this.peerId),
        onClose: () => this.callbacks.onDataChannelClose(this.peerId),
      });
    };
  }

  // Caller creates data channel before creating offer
  initDataChannel(): ManagedDataChannel {
    const channel = this.pc.createDataChannel(DATA_CHANNEL_LABEL, DATA_CHANNEL_CONFIG);
    this.dataChannel = new ManagedDataChannel(channel, this.peerId, {
      onWhiteboardEvent: this.callbacks.onWhiteboardEvent,
      onChatMessage: this.callbacks.onChatMessage,
      onOpen: () => this.callbacks.onDataChannelOpen(this.peerId),
      onClose: () => this.callbacks.onDataChannelClose(this.peerId),
    });
    return this.dataChannel;
  }

  async addLocalStream(stream: MediaStream): Promise<boolean> {
    let changed = false;
    const transceivers = this.pc.getTransceivers ? this.pc.getTransceivers() : [];

    for (const track of stream.getTracks()) {
      try {
        const transceiver = transceivers.find(
          (t) => t.sender?.track?.kind === track.kind || t.receiver?.track?.kind === track.kind
        );
        if (transceiver && transceiver.sender) {
          if (transceiver.sender.track?.id === track.id) continue;
          await transceiver.sender.replaceTrack(track);
          changed = true;
          this.log.info(`ADD_LOCAL_TRACK ${track.kind} to transceiver for peer ${this.peerId}`);
          continue;
        }

        const sender = this.pc.getSenders().find((s) => s.track?.kind === track.kind);
        if (sender) {
          if (sender.track?.id === track.id) continue;
          await sender.replaceTrack(track);
          changed = true;
          this.log.info(`Replaced ${track.kind} track on sender for peer ${this.peerId}`);
          continue;
        }

        this.pc.addTrack(track, stream);
        changed = true;
        this.log.info(`ADD_LOCAL_TRACK ${track.kind} via addTrack for peer ${this.peerId}`);
      } catch (err) {
        this.log.warn(`Could not add/replace track ${track.kind}:`, err);
      }
    }
    return changed;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    this.log.info(`CREATE_OFFER for peer ${this.peerId}`);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(answer);
    this.log.info(`CREATE_ANSWER for peer ${this.peerId}`);
    return answer;
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    this.isSettingRemoteDescription = true;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } finally {
      this.isSettingRemoteDescription = false;
    }

    // Flush any ICE candidates queued while waiting for remote description
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) => {
          this.log.warn(`Error applying queued ICE candidate for ${this.peerId}:`, err);
        });
      }
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      this.pendingCandidates.push(candidate);
    }
  }

  sendData(packet: DataChannelPacket): boolean {
    if (this.dataChannel && this.dataChannel.isOpen()) {
      return this.dataChannel.send(packet);
    }
    return false;
  }

  getDataChannel(): ManagedDataChannel | null {
    return this.dataChannel;
  }

  getRemoteStream(): MediaStream {
    return this.remoteStream;
  }

  close() {
    this.dataChannel?.close();
    this.remoteStream.getTracks().forEach((t) => t.stop());
    this.pc.close();
  }
}
