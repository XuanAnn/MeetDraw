import { WhiteboardEvent } from './whiteboard';

export type DataChannelPacketType =
  | 'WHITEBOARD'
  | 'CHAT'
  | 'CURSOR'
  | 'POLL'
  | 'SCREEN_SHARE';

export interface ScreenShareStatePayload {
  isSharing: boolean;
  peerId: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  creatorName: string;
  isActive: boolean;
  votedUserIds?: string[];
}

export interface DataChannelPacket {
  type: DataChannelPacketType;
  payload: WhiteboardEvent | ChatMessage | PollData | unknown;
}
