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

    this.bindEvents();
  }

  private handleIncomingTrack(track: MediaStreamTrack, stream?: MediaStream) {
    if (!track) return;

    if (stream) {
      stream.getTracks().forEach((t) => {
        if (!this.remoteStream.getTracks().some((existing) => existing.id === t.id)) {
          this.remoteStream.addTrack(t);
        }
      });
    }

    if (!this.remoteStream.getTracks().some((existing) => existing.id === track.id)) {
      this.remoteStream.addTrack(track);
    }

    const notify = () => {
      const tracks = this.remoteStream.getTracks();
      if (tracks.length > 0) {
        const updatedStream = new MediaStream(tracks);
        this.callbacks.onTrack(this.peerId, updatedStream);
      }
    };

    if (!(track as any).__hasListeners) {
      (track as any).__hasListeners = true;
      track.onunmute = () => {
        this.log.info(`Track onunmute (${track.kind}) from ${this.peerId}`);
        notify();
      };
      track.onmute = () => {
        this.log.info(`Track onmute (${track.kind}) from ${this.peerId}`);
        notify();
      };
      track.onended = () => {
        this.log.info(`Track onended (${track.kind}) from ${this.peerId}`);
        notify();
      };
    }

    notify();
  }

  public syncRemoteTracks() {
    const receivers = this.pc.getReceivers ? this.pc.getReceivers() : [];
    for (const receiver of receivers) {
      if (receiver.track) {
        this.handleIncomingTrack(receiver.track);
      }
    }

    const transceivers = this.pc.getTransceivers ? this.pc.getTransceivers() : [];
    for (const transceiver of transceivers) {
      if (transceiver.receiver?.track) {
        this.handleIncomingTrack(transceiver.receiver.track);
      }
    }
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
      if (this.pc.connectionState === 'connected') {
        this.syncRemoteTracks();
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed') {
        this.log.info(`ICE_CONNECTED ${this.peerId}`);
        this.syncRemoteTracks();
      }
    };

    this.pc.ontrack = (event) => {
      this.log.info(`REMOTE_TRACK ${event.track.kind} from ${this.peerId} (state: ${event.track.readyState}, muted: ${event.track.muted})`);
      this.handleIncomingTrack(event.track, event.streams?.[0]);
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

    for (const track of stream.getTracks()) {
      try {
        // 1. Check if a sender already exists for this track kind
        const sender = this.pc.getSenders().find((s) => s.track?.kind === track.kind || (s as any).kind === track.kind);
        if (sender) {
          if (sender.track?.id !== track.id) {
            await sender.replaceTrack(track);
            changed = true;
            this.log.info(`Replaced ${track.kind} track on sender for peer ${this.peerId}`);
          }
          // Ensure associated transceiver direction is sendrecv
          const transceiver = this.pc.getTransceivers?.().find((t) => t.sender === sender);
          if (transceiver && transceiver.direction !== 'sendrecv') {
            transceiver.direction = 'sendrecv';
            changed = true;
          }
          continue;
        }

        // 2. Check if an existing transceiver without a sender track can be used
        const transceivers = this.pc.getTransceivers ? this.pc.getTransceivers() : [];
        const transceiver = transceivers.find(
          (t) => !t.sender?.track && t.receiver?.track?.kind === track.kind
        );
        if (transceiver) {
          transceiver.direction = 'sendrecv';
          await transceiver.sender.replaceTrack(track);
          changed = true;
          this.log.info(`Associated ${track.kind} track with existing transceiver for peer ${this.peerId}`);
          continue;
        }

        // 3. Otherwise add new track directly bound to stream
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
    const hasAudioSender = this.pc.getSenders().some((s) => s.track?.kind === 'audio');
    const hasVideoSender = this.pc.getSenders().some((s) => s.track?.kind === 'video');
    if (!hasAudioSender) {
      try {
        this.pc.addTransceiver('audio', { direction: 'recvonly' });
      } catch (e) {}
    }
    if (!hasVideoSender) {
      try {
        this.pc.addTransceiver('video', { direction: 'recvonly' });
      } catch (e) {}
    }

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc.setLocalDescription(offer);
    this.log.info(`CREATE_OFFER for peer ${this.peerId}`);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.log.info(`CREATE_ANSWER for peer ${this.peerId}`);
    return answer;
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit): Promise<void> {
    this.isSettingRemoteDescription = true;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      this.syncRemoteTracks();
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

    this.syncRemoteTracks();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        this.pendingCandidates.push(candidate);
      }
    } catch (err) {
      this.log.warn(`Error adding ICE candidate for ${this.peerId}:`, err);
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
