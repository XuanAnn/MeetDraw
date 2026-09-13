import { createLogger } from '../../utils/logger';

const log = createLogger('MediaStreamManager');

export type StreamUpdateListener = (stream: MediaStream) => void;

export class MediaStreamManager {
  private localStream: MediaStream | null = null;
  private isAudioMuted = false;
  private isVideoMuted = false;
  private listeners: Set<StreamUpdateListener> = new Set();

  onStreamUpdated(callback: StreamUpdateListener): () => void {
    this.listeners.add(callback);
    if (this.localStream) {
      callback(this.localStream);
    }
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(stream: MediaStream) {
    for (const listener of this.listeners) {
      try {
        listener(stream);
      } catch (err) {
        log.warn('Error in stream update listener:', err);
      }
    }
  }

  async getLocalMedia(video = true, audio = true): Promise<MediaStream> {
    // Check if existing localStream has live tracks
    const hasLiveAudio = !audio || (this.localStream && this.localStream.getAudioTracks().some((t) => t.readyState === 'live'));
    const hasLiveVideo = !video || (this.localStream && this.localStream.getVideoTracks().some((t) => t.readyState === 'live'));

    if (this.localStream && hasLiveAudio && hasLiveVideo) {
      return this.localStream;
    }

    // Stop any stale or ended tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => {
        if (t.readyState === 'ended') t.stop();
      });
    }

    try {
      log.info(`Requesting user media (video: ${video}, audio: ${audio})...`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      });

      this.localStream = stream;
      this.isAudioMuted = false;
      this.isVideoMuted = false;
      log.info(`User media acquired: ${stream.getAudioTracks().length} audio, ${stream.getVideoTracks().length} video.`);
      this.notifyListeners(stream);
      return stream;
    } catch (err: any) {
      log.error(`Camera/microphone permission error (${err.name}: ${err.message})`);
      throw err;
    }
  }

  toggleAudio(): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    this.isAudioMuted = !this.isAudioMuted;
    audioTracks.forEach((t) => {
      t.enabled = !this.isAudioMuted;
    });

    log.info(`Audio toggled: ${this.isAudioMuted ? 'MUTED' : 'UNMUTED'}`);
    return !this.isAudioMuted;
  }

  toggleVideo(): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    this.isVideoMuted = !this.isVideoMuted;
    videoTracks.forEach((t) => {
      t.enabled = !this.isVideoMuted;
    });

    log.info(`Video toggled: ${this.isVideoMuted ? 'DISABLED' : 'ENABLED'}`);
    return !this.isVideoMuted;
  }

  getStream(): MediaStream | null {
    return this.localStream;
  }

  isAudioEnabled(): boolean {
    return !this.isAudioMuted;
  }

  isVideoEnabled(): boolean {
    return !this.isVideoMuted;
  }

  stopAll() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }
}

export const mediaStreamManager = new MediaStreamManager();
