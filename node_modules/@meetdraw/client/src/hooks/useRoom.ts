import { useEffect, useState, useCallback } from 'react';
import {
  RoomDetails,
  PeerInfo,
  RoomJoinedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  SessionTerminatedPayload,
} from '@meetdraw/shared';
import { signalingService } from '../services/signaling.service';
import { apiService } from '../services/api';

export function useRoom(roomId: string, username: string, userId?: string, email?: string) {
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [participants, setParticipants] = useState<PeerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionTerminated, setIsSessionTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string>('');

  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    // 1. Fetch Room metadata from REST API
    apiService
      .getRoomDetails(roomId)
      .then((data) => {
        if (isMounted) setRoomDetails(data);
      })
      .catch((err) => {
        console.warn('Could not fetch room metadata via REST API, fallback to default:', err);
        if (isMounted) {
          setRoomDetails({
            id: roomId,
            name: `Room ${roomId}`,
            ownerId: 'host',
            createdAt: new Date().toISOString(),
            memberCount: 1,
          });
        }
      });

    // 2. Connect WebSocket & Join Room
    signalingService
      .connect()
      .then(() => {
        signalingService.joinRoom(roomId, username, userId, email);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to connect to signaling');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Listen for room join confirmation
    const unsubJoined = signalingService.on<RoomJoinedPayload>('ROOM_JOINED', (msg) => {
      if (isMounted && msg.payload) {
        setParticipants(msg.payload.peers);
      }
    });

    // Listen for new users joining
    const unsubUserJoined = signalingService.on<UserJoinedPayload>('USER_JOINED', (msg) => {
      if (isMounted && msg.payload) {
        const payload = msg.payload;
        setParticipants((prev) => {
          if (prev.some((p) => p.id === payload.peerId)) return prev;
          return [
            ...prev,
            {
              id: payload.peerId,
              username: payload.username,
              joinedAt: payload.joinedAt,
            },
          ];
        });
      }
    });

    // Listen for users leaving
    const unsubUserLeft = signalingService.on<UserLeftPayload>('USER_LEFT', (msg) => {
      if (isMounted && msg.payload) {
        const peerId = msg.payload.peerId;
        setParticipants((prev) => prev.filter((p) => p.id !== peerId));
      }
    });

    // Listen for session terminated (e.g. account opened in another browser)
    const unsubTerminated = signalingService.on<SessionTerminatedPayload>('SESSION_TERMINATED', (msg) => {
      if (isMounted) {
        setIsSessionTerminated(true);
        if (msg.payload?.reason) {
          setTerminationReason(msg.payload.reason);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubJoined();
      unsubUserJoined();
      unsubUserLeft();
      unsubTerminated();
      signalingService.leaveRoom(roomId);
    };
  }, [roomId, username, userId, email]);

  const leave = useCallback(() => {
    signalingService.leaveRoom(roomId);
  }, [roomId]);

  return {
    roomDetails,
    participants,
    isLoading,
    error,
    isSessionTerminated,
    terminationReason,
    leave,
  };
}
