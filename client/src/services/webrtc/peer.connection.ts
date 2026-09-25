import {
  DEFAULT_RTC_CONFIGURATION,
  DATA_CHANNEL_LABEL,
  DATA_CHANNEL_CONFIG,
  DataChannelPacket,
  SelectedCandidatePair,
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

  // Track dedicated RTP Senders
  private audioSender: RTCRtpSender | null = null;
  private cameraSender: RTCRtpSender | null = null;
  private screenSender: RTCRtpSender | null = null;

  constructor(peerId: string, callbacks: PeerConnectionCallback, config?: RTCConfiguration) {
    this.peerId = peerId;
    this.callbacks = callbacks;
    this.pc = new RTCPeerConnection(config || DEFAULT_RTC_CONFIGURATION);

    this.bindEvents();
  }

  private handleIncomingTrack(track: MediaStreamTrack, eventStream?: MediaStream) {
    if (!track) return;

    if (track.kind === 'audio') {
      if (!this.remoteStream.getAudioTracks().some((t) => t.id === track.id)) {
        this.remoteStream.addTrack(track);
      }
      this.callbacks.onTrack(this.peerId, this.remoteStream);
      return;
    }

    // Video classification: Detect whether track is Camera or Screen Share
    const existingCameraTracks = this.remoteStream.getVideoTracks();
    const isDetail = track.contentHint === 'detail';
    const isScreenById = eventStream && eventStream.id && eventStream.id.toLowerCase().includes('screen');
    const isSecondaryVideo = existingCameraTracks.length > 0 && !existingCameraTracks.some((t) => t.id === track.id);

    const isScreen = isDetail || isScreenById || isSecondaryVideo;

    if (isScreen) {
      this.log.info(`Received SCREEN track from ${this.peerId} (${track.id})`);
      if (!this.remoteScreenStream.getVideoTracks().some((t) => t.id === track.id)) {
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
        this.remoteScreenStream.removeTrack(track);
        this.callbacks.onScreenTrack?.(this.peerId, null);
      };

      notifyScreen();
    } else {
      // Camera Track
      this.log.info(`Received CAMERA track from ${this.peerId} (${track.id})`);
      if (!this.remoteStream.getVideoTracks().some((t) => t.id === track.id)) {
        this.remoteStream.addTrack(track);
      }

      const notifyCamera = () => {
        const tracks = this.remoteStream.getTracks();
        if (tracks.length > 0) {
          this.callbacks.onTrack(this.peerId, this.remoteStream);
        }
      };

      track.onunmute = () => {
        this.log.info(`Camera track onunmute from ${this.peerId}`);
        notifyCamera();
      };
      track.onmute = () => {
        this.log.info(`Camera track onmute from ${this.peerId}`);
        notifyCamera();
      };
      track.onended = () => {
        this.log.info(`Camera track onended from ${this.peerId}`);
        this.remoteStream.removeTrack(track);
        notifyCamera();
      };

      notifyCamera();
    }
  }

  public syncRemoteTracks() {
    const receivers = this.pc.getReceivers();
    for (const r of receivers) {
      if (r.track) {
        this.handleIncomingTrack(r.track);
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
        onScreenShareEvent: (pId, payload) => this.callbacks.onScreenShareEvent?.(pId, payload),
        onOpen: () => this.callbacks.onDataChannelOpen(this.peerId),
        onClose: () => this.callbacks.onDataChannelClose(this.peerId),
      });
    };
  }

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

    // 1. Audio track
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      if (this.audioSender && this.audioSender.track) {
        if (this.audioSender.track.id !== audioTrack.id) {
          await this.audioSender.replaceTrack(audioTrack);
          changed = true;
        }
      } else {
        const existingAudio = this.pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (existingAudio) {
          this.audioSender = existingAudio;
          await existingAudio.replaceTrack(audioTrack);
        } else {
          this.audioSender = this.pc.addTrack(audioTrack, stream);
          changed = true;
        }
      }
    }

    // 2. Camera Video track
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      if (this.cameraSender && this.cameraSender.track) {
        if (this.cameraSender.track.id !== videoTrack.id) {
          await this.cameraSender.replaceTrack(videoTrack);
          changed = true;
        }
      } else {
        const existingCam = this.pc.getSenders().find((s) => s.track?.kind === 'video' && s !== this.screenSender);
        if (existingCam) {
          this.cameraSender = existingCam;
          await existingCam.replaceTrack(videoTrack);
        } else {
          this.cameraSender = this.pc.addTrack(videoTrack, stream);
          changed = true;
        }
      }
    }

    return changed;
  }

  async setScreenTrack(screenTrack: MediaStreamTrack | null, screenStream?: MediaStream): Promise<boolean> {
    try {
      if (screenTrack && screenStream) {
        screenTrack.contentHint = 'detail';
        if (this.screenSender) {
          await this.screenSender.replaceTrack(screenTrack);
          return false;
        } else {
          this.screenSender = this.pc.addTrack(screenTrack, screenStream);
          this.log.info(`Added screen track for peer ${this.peerId} (Renegotiation needed)`);
          return true; // Renegotiation required!
        }
      } else {
        if (this.screenSender) {
          this.pc.removeTrack(this.screenSender);
          this.screenSender = null;
          this.log.info(`Removed screen track for peer ${this.peerId} (Renegotiation needed)`);
          return true; // Renegotiation required!
        }
      }
    } catch (err) {
      this.log.warn(`setScreenTrack error on ${this.peerId}:`, err);
    }
    return false;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
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

  // Extract real-time WebRTC stats for Room Monitor Telemetry
  async getTelemetryStats(): Promise<{
    connectionState: string;
    iceState: string;
    selectedCandidatePair?: SelectedCandidatePair;
  }> {
    const res: {
      connectionState: string;
      iceState: string;
      selectedCandidatePair?: SelectedCandidatePair;
    } = {
      connectionState: this.pc.connectionState,
      iceState: this.pc.iceConnectionState,
    };

    try {
      const stats = await this.pc.getStats();
      let activeCandidatePair: any = null;
      const candidates = new Map<string, any>();

      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && (report.nominated || report.state === 'succeeded')) {
          activeCandidatePair = report;
        } else if (report.type === 'local-candidate' || report.type === 'remote-candidate') {
          candidates.set(report.id, report);
        }
      });

      if (activeCandidatePair) {
        const localCand = candidates.get(activeCandidatePair.localCandidateId);
        const remoteCand = candidates.get(activeCandidatePair.remoteCandidateId);

        res.selectedCandidatePair = {
          localCandidateType: localCand?.candidateType || localCand?.protocol || 'host',
          localIp: localCand?.ip || localCand?.address || '127.0.0.1',
          localPort: localCand?.port || 0,
          remoteCandidateType: remoteCand?.candidateType || remoteCand?.protocol || 'host',
          remoteIp: remoteCand?.ip || remoteCand?.address || '127.0.0.1',
          remotePort: remoteCand?.port || 0,
          protocol: activeCandidatePair.protocol || localCand?.protocol || 'udp',
          state: activeCandidatePair.state || 'succeeded',
          nominated: !!activeCandidatePair.nominated,
          rtt: activeCandidatePair.currentRoundTripTime ? Math.round(activeCandidatePair.currentRoundTripTime * 1000) : 0,
          bytesSent: activeCandidatePair.bytesSent || 0,
          bytesReceived: activeCandidatePair.bytesReceived || 0,
          packetsSent: activeCandidatePair.packetsSent || 0,
          packetsReceived: activeCandidatePair.packetsReceived || 0,
        };
      }
    } catch (e) {
      // Ignore stats error
    }

    return res;
  }

  close() {
    this.dataChannel?.close();
    this.remoteStream.getTracks().forEach((t) => t.stop());
    this.remoteScreenStream.getTracks().forEach((t) => t.stop());
    this.pc.close();
  }
}
