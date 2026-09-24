import {
  SfuProducerInfo,
  SfuStatsPayload,
  SfuProducerAddedPayload,
  SfuProducerClosedPayload,
  SfuPauseProducerPayload,
  SfuActiveSpeakerPayload,
} from '@meetdraw/shared';
import { signalingService } from '../signaling.service';
import { createLogger } from '../../utils/logger';

const log = createLogger('SfuCoordinator');

export interface SfuCoordinatorListener {
  onStatsUpdated?: (stats: SfuStatsPayload) => void;
  onActiveSpeakerChanged?: (peerId: string) => void;
  onProducerListChanged?: (producers: SfuProducerInfo[]) => void;
}

export class SfuCoordinator {
  private roomId: string | null = null;
  private selfPeerId: string | null = null;
  private producers: Map<string, SfuProducerInfo> = new Map();
  private listeners: SfuCoordinatorListener = {};
  private unsubscribers: Array<() => void> = [];

  // Audio Analyser for local Voice Activity Detection (VAD)
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private vadInterval: any = null;
  private isSpeaking = false;
  private lastSpeakerSentAt = 0;

  // Real-time SFU stats
  private currentStats: SfuStatsPayload = {
    activeProducers: 0,
    activeConsumers: 0,
    bandwidthSavedPercent: 0,
    topology: 'SFU',
    activeSpeakerId: null,
  };

  init(roomId: string, selfPeerId: string, listeners: SfuCoordinatorListener = {}) {
    this.roomId = roomId;
    this.selfPeerId = selfPeerId;
    this.listeners = listeners;

    this.bindSignaling();
    log.info(`Initialized SFU Coordinator for room ${roomId}, self: ${selfPeerId}`);
  }

  private bindSignaling() {
    // 1. New producer published in SFU
    const unsubProdAdded = signalingService.on<SfuProducerAddedPayload>(
      'SFU_PRODUCER_ADDED',
      (msg) => {
        if (!msg.payload?.producer) return;
        const prod = msg.payload.producer;
        this.producers.set(prod.producerId, prod);
        log.info(`SFU: Producer added ${prod.producerId} (${prod.kind}/${prod.mediaType}) from ${prod.username}`);

        // Automatically consume producer from SFU
        if (this.roomId && this.selfPeerId && prod.peerId !== this.selfPeerId) {
          signalingService.sendSfuConsume(this.roomId, prod.producerId, prod.peerId);
        }

        this.listeners.onProducerListChanged?.(Array.from(this.producers.values()));
      }
    );

    // 2. Producer closed
    const unsubProdClosed = signalingService.on<SfuProducerClosedPayload>(
      'SFU_PRODUCER_CLOSED',
      (msg) => {
        if (!msg.payload?.producerId) return;
        this.producers.delete(msg.payload.producerId);
        log.info(`SFU: Producer closed ${msg.payload.producerId}`);
        this.listeners.onProducerListChanged?.(Array.from(this.producers.values()));
      }
    );

    // 3. Producer paused / resumed (Selective Forwarding)
    const unsubProdPaused = signalingService.on<SfuPauseProducerPayload>(
      'SFU_PAUSE_PRODUCER',
      (msg) => {
        if (!msg.payload) return;
        const prod = this.producers.get(msg.payload.producerId);
        if (prod) {
          prod.paused = msg.payload.paused;
          log.info(`SFU: Producer ${prod.producerId} paused=${prod.paused}`);
          this.listeners.onProducerListChanged?.(Array.from(this.producers.values()));
        }
      }
    );

    // 4. Active Speaker notification from SFU
    const unsubActiveSpeaker = signalingService.on<SfuActiveSpeakerPayload>(
      'SFU_ACTIVE_SPEAKER',
      (msg) => {
        if (!msg.payload?.peerId) return;
        log.info(`SFU: Active speaker -> ${msg.payload.peerId}`);
        this.currentStats.activeSpeakerId = msg.payload.peerId;
        this.listeners.onActiveSpeakerChanged?.(msg.payload.peerId);
      }
    );

    // 5. SFU Bandwidth & Topology Stats
    const unsubStats = signalingService.on<SfuStatsPayload>('SFU_STATS', (msg) => {
      if (!msg.payload) return;
      this.currentStats = msg.payload;
      log.network(`SFU Stats: Bandwidth saved: ${msg.payload.bandwidthSavedPercent}%, Active producers: ${msg.payload.activeProducers}`);
      this.listeners.onStatsUpdated?.(this.currentStats);
    });

    this.unsubscribers.push(
      unsubProdAdded,
      unsubProdClosed,
      unsubProdPaused,
      unsubActiveSpeaker,
      unsubStats
    );
  }

  // Publish local media tracks to SFU
  publishTracks(stream: MediaStream) {
    if (!this.roomId || !this.selfPeerId) return;

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    if (audioTracks.length > 0) {
      signalingService.sendSfuProduce(this.roomId, 'audio', 'camera');
      this.setupVoiceActivityDetection(stream);
    }

    if (videoTracks.length > 0) {
      signalingService.sendSfuProduce(this.roomId, 'video', 'camera');
    }

    log.info(`Published tracks to SFU: ${audioTracks.length} audio, ${videoTracks.length} video`);
  }

  // Publish screen share track to SFU
  publishScreenTrack(screenStream: MediaStream) {
    if (!this.roomId || !this.selfPeerId) return;

    if (screenStream.getVideoTracks().length > 0) {
      signalingService.sendSfuProduce(this.roomId, 'video', 'screen');
      log.info('Published Screen Share track to SFU');
    }
  }

  // Voice Activity Detection (VAD) via AudioContext
  private setupVoiceActivityDetection(stream: MediaStream) {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      if (this.audioContext) {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }
      if (this.vadInterval) {
        clearInterval(this.vadInterval);
        this.vadInterval = null;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 512;
      this.analyserNode.smoothingTimeConstant = 0.3;
      source.connect(this.analyserNode);

      const bufferLength = this.analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Sample volume every 200ms
      this.vadInterval = setInterval(() => {
        if (!this.analyserNode || !this.roomId) return;
        this.analyserNode.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for human speech: average > 25
        const nowSpeaking = average > 25;
        const now = Date.now();

        if (nowSpeaking && (!this.isSpeaking || now - this.lastSpeakerSentAt > 2000)) {
          this.isSpeaking = true;
          this.lastSpeakerSentAt = now;
          signalingService.sendSfuActiveSpeaker(this.roomId, Math.round(average));
        } else if (!nowSpeaking && this.isSpeaking && now - this.lastSpeakerSentAt > 1500) {
          this.isSpeaking = false;
        }
      }, 200);
    } catch (err) {
      log.warn('Could not initialize AudioContext for Voice Activity Detection:', err);
    }
  }

  getStats(): SfuStatsPayload {
    return this.currentStats;
  }

  getProducers(): SfuProducerInfo[] {
    return Array.from(this.producers.values());
  }

  cleanup() {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.producers.clear();
    this.roomId = null;
    this.selfPeerId = null;
    log.info('Cleaned up SFU Coordinator');
  }
}

export const sfuCoordinator = new SfuCoordinator();
