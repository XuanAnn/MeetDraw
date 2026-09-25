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
  private remoteScreenStream: MediaStream = new MediaStream();
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private isSettingRemoteDescription = false;
  private callbacks: PeerConnectionCallback;
  private log = createLogger('PeerConnection');

  constructor(peerId: string, callbacks: PeerConnectionCallback, config?: RTCConfiguration) {
    this.peerId = peerId;
    this.callbacks = callbacks;
    this.pc = new RTCPeerConnection(config || DEFAULT_RTC_CONFIGURATION);

    // Pre-initialize transceivers: 1 audio, 1 camera video, 1 screen video
    try {
      this.pc.addTransceiver('audio', { direction: 'sendrecv' });
      this.pc.addTransceiver('video', { direction: 'sendrecv' }); // Camera
      this.pc.addTransceiver('video', { direction: 'sendrecv' }); // Screen Share
    } catch (e) {
      this.log.warn('Could not pre-initialize transceivers:', e);
    }

    this.bindEvents();
  }

  private handleIncomingTrack(track: MediaStreamTrack, transceiver?: RTCRtpTransceiver) {
    if (!track) return;

    const videoTransceivers = this.pc.getTransceivers().filter(
      (t) => t.receiver?.track?.kind === 'video'
    );
    // Transceiver index 1 in video transceivers is reserved for Screen Share
    const isScreenVideo =
      track.kind === 'video' &&
      ((transceiver && videoTransceivers.length > 1 && transceiver === videoTransceivers[1]) ||
        (videoTransceivers.length > 1 && videoTransceivers[1]?.receiver?.track?.id === track.id));

    if (isScreenVideo) {
      if (!this.remoteScreenStream.getTracks().some((t) => t.id === track.id)) {
        this.remoteScreenStream.getTracks().forEach((t) => this.remoteScreenStream.removeTrack(t));
        this.remoteScreenStream.addTrack(track);
      }

      const notifyScreen = () => {
        const liveTracks = this.remoteScreenStream.getVideoTracks().filter((t) => t.readyState === 'live');
        if (liveTracks.length > 0) {
          this.callbacks.onScreenTrack?.(this.peerId, this.remoteScreenStream);
        } else {
          this.callbacks.onScreenTrack?.(this.peerId, null);
        }
      };

      if (!(track as any).__hasScreenListeners) {
        (track as any).__hasScreenListeners = true;
        track.onunmute = () => {
          this.log.info(`Screen track onunmute from ${this.peerId}`);
          notifyScreen();
        };
        track.onmute = () => {
          this.log.info(`Screen track onmute from ${this.peerId}`);
          notifyScreen();
        };
        track.onended = () => {
          this.log.info(`Screen track onended from ${this.peerId}`);
          this.callbacks.onScreenTrack?.(this.peerId, null);
        };
      }

      notifyScreen();
    } else {
      // Camera or Audio track
      if (!this.remoteStream.getTracks().some((existing) => existing.id === track.id)) {
        this.remoteStream.addTrack(track);
      }

      const notifyCamera = () => {
        const tracks = this.remoteStream.getTracks();
        if (tracks.length > 0) {
          const updatedStream = new MediaStream(tracks);
          this.callbacks.onTrack(this.peerId, updatedStream);
        }
      };

      if (!(track as any).__hasCameraListeners) {
        (track as any).__hasCameraListeners = true;
        track.onunmute = () => {
          this.log.info(`Camera/Audio track onunmute (${track.kind}) from ${this.peerId}`);
          notifyCamera();
        };
        track.onmute = () => {
          this.log.info(`Camera/Audio track onmute (${track.kind}) from ${this.peerId}`);
          notifyCamera();
        };
        track.onended = () => {
          this.log.info(`Camera/Audio track onended (${track.kind}) from ${this.peerId}`);
          notifyCamera();
        };
      }

      notifyCamera();
    }
  }

  public syncRemoteTracks() {
    const transceivers = this.pc.getTransceivers ? this.pc.getTransceivers() : [];
    for (const transceiver of transceivers) {
      if (transceiver.receiver?.track) {
        this.handleIncomingTrack(transceiver.receiver.track, transceiver);
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
      this.handleIncomingTrack(event.track, event.transceiver);
    };

    this.pc.ondatachannel = (event) => {
      this.log.info(`Received remote DataChannel (${event.channel.label}) from ${this.peerId}`);
      this.dataChannel = new ManagedDataChannel(event.channel, this.peerId, {
        onWhiteboardEvent: this.callbacks.onWhiteboardEvent,
        onChatMessage: this.callbacks.onChatMessage,
        onScreenShareEvent: (pId, payload) => this.callbacks.onScreenShareEvent?.(pId, payload),
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
      onScreenShareEvent: (pId, payload) => this.callbacks.onScreenShareEvent?.(pId, payload),
      onOpen: () => this.callbacks.onDataChannelOpen(this.peerId),
      onClose: () => this.callbacks.onDataChannelClose(this.peerId),
    });
    return this.dataChannel;
  }

  async addLocalStream(stream: MediaStream): Promise<boolean> {
    let changed = false;

    // 1. Audio track -> audio transceiver
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const audioTransceivers = this.pc.getTransceivers().filter(
        (t) => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio'
      );
      const audioSender = audioTransceivers[0]?.sender || this.pc.getSenders().find((s) => s.track?.kind === 'audio');
      if (audioSender) {
        if (audioSender.track?.id !== audioTrack.id) {
          await audioSender.replaceTrack(audioTrack);
          changed = true;
          this.log.info(`Attached audio track for peer ${this.peerId}`);
        }
      } else {
        this.pc.addTrack(audioTrack, stream);
        changed = true;
      }
    }

    // 2. Camera Video track (Dedicated Camera Transceiver - NEVER overwrites Screen Share)
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const videoTransceivers = this.pc.getTransceivers().filter(
        (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
      );
      // Index 0 in video transceivers is exclusively reserved for Camera
      const cameraTransceiver = videoTransceivers[0];
      const cameraSender = cameraTransceiver?.sender || this.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (cameraSender) {
        if (cameraSender.track?.id !== videoTrack.id) {
          await cameraSender.replaceTrack(videoTrack);
          changed = true;
          this.log.info(`Attached CAMERA track on peer ${this.peerId}`);
        }
      } else {
        this.pc.addTrack(videoTrack, stream);
        changed = true;
      }
    }

    return changed;
  }

  async setScreenTrack(screenTrack: MediaStreamTrack | null): Promise<boolean> {
    try {
      const videoTransceivers = this.pc.getTransceivers().filter(
        (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
      );
      // Index 1 in video transceivers is exclusively reserved for Screen Share
      let screenSender = videoTransceivers[1]?.sender;

      if (!screenSender && screenTrack) {
        const newTransceiver = this.pc.addTransceiver(screenTrack, { direction: 'sendrecv' });
        screenSender = newTransceiver.sender;
      }

      if (screenSender) {
        await screenSender.replaceTrack(screenTrack);
        this.log.info(`setScreenTrack on peer ${this.peerId} to track ${screenTrack?.id || 'null'}`);
        return true;
      }
    } catch (err) {
      this.log.warn(`setScreenTrack failed for peer ${this.peerId}:`, err);
    }
    return false;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const audioTransceivers = this.pc.getTransceivers().filter(
      (t) => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio'
    );
    const videoTransceivers = this.pc.getTransceivers().filter(
      (t) => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video'
    );

    if (audioTransceivers.length === 0) {
      try {
        this.pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch (e) {}
    }
    while (videoTransceivers.length < 2) {
      try {
        const t = this.pc.addTransceiver('video', { direction: 'sendrecv' });
        videoTransceivers.push(t);
      } catch (e) {
        break;
      }
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
    const transceivers = this.pc.getTransceivers ? this.pc.getTransceivers() : [];
    for (const t of transceivers) {
      if (t.direction === 'recvonly') {
        t.direction = 'sendrecv';
      }
    }
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

  getRemoteScreenStream(): MediaStream {
    return this.remoteScreenStream;
  }

  close() {
    this.dataChannel?.close();
    this.remoteStream.getTracks().forEach((t) => t.stop());
    this.remoteScreenStream.getTracks().forEach((t) => t.stop());
    this.pc.close();
  }
}
