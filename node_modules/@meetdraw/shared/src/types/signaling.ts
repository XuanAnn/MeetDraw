export type SignalType =
  | 'JOIN_ROOM'
  | 'LEAVE_ROOM'
  | 'ROOM_JOINED'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'OFFER'
  | 'ANSWER'
  | 'ICE_CANDIDATE'
  | 'ROOM_USERS'
  | 'ERROR'
  | 'SESSION_TERMINATED'
  | 'SFU_PRODUCE'
  | 'SFU_PRODUCE_ACK'
  | 'SFU_CONSUME'
  | 'SFU_CONSUME_ACK'
  | 'SFU_PRODUCER_ADDED'
  | 'SFU_PRODUCER_CLOSED'
  | 'SFU_CLOSE_PRODUCER'
  | 'SFU_PAUSE_PRODUCER'
  | 'SFU_RESUME_PRODUCER'
  | 'SFU_ACTIVE_SPEAKER'
  | 'SFU_STATS';

export interface PeerInfo {
  id: string;
  username: string;
  userId?: string;
  joinedAt: number;
  isHost?: boolean;
}

export interface SignalMessage<T = unknown> {
  type: SignalType;
  roomId: string;
  senderId: string;
  targetId?: string;
  payload?: T;
}

export interface JoinRoomPayload {
  username: string;
  userId?: string;
  email?: string;
}

export interface RoomJoinedPayload {
  selfId: string;
  roomId: string;
  roomName: string;
  peers: PeerInfo[];
}

export interface UserJoinedPayload {
  peerId: string;
  username: string;
  userId?: string;
  joinedAt: number;
}

export interface UserLeftPayload {
  peerId: string;
  reason?: string;
}

export interface OfferPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

export interface SessionTerminatedPayload {
  reason: string;
  code?: 'DUPLICATE_LOGIN' | 'CONCURRENT_SESSION';
}

export interface SfuProducerInfo {
  producerId: string;
  peerId: string;
  kind: 'audio' | 'video';
  mediaType: 'camera' | 'screen';
  paused: boolean;
  username: string;
}

export interface SfuProducePayload {
  kind: 'audio' | 'video';
  mediaType: 'camera' | 'screen';
}

export interface SfuProduceAckPayload {
  producerId: string;
  kind: 'audio' | 'video';
  mediaType: 'camera' | 'screen';
}

export interface SfuConsumePayload {
  producerId: string;
  peerId: string;
}

export interface SfuConsumeAckPayload {
  consumerId: string;
  producerId: string;
  kind: 'audio' | 'video';
}

export interface SfuProducerAddedPayload {
  producer: SfuProducerInfo;
}

export interface SfuProducerClosedPayload {
  producerId: string;
  peerId: string;
  kind: 'audio' | 'video';
}

export interface SfuCloseProducerPayload {
  producerId?: string;
  mediaType?: 'camera' | 'screen';
}

export interface SfuPauseProducerPayload {
  producerId: string;
  paused: boolean;
}

export interface SfuActiveSpeakerPayload {
  peerId: string;
  volume?: number;
}

export interface SfuStatsPayload {
  activeProducers: number;
  activeConsumers: number;
  bandwidthSavedPercent: number;
  topology: 'SFU';
  activeSpeakerId: string | null;
}
