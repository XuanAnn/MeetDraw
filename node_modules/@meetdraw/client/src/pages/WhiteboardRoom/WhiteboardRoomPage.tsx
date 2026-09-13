import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopNav, ActiveMeetingView } from '../../components/TopNav/TopNav';
import { Toolbar } from '../../components/Toolbar/Toolbar';
import { Canvas } from '../../components/Canvas/Canvas';
import { VideoPanel } from '../../components/VideoPanel/VideoPanel';
import { ChatPanel } from '../../components/ChatPanel/ChatPanel';
import { ParticipantsPanel } from '../../components/Participants/ParticipantsPanel';
import { LivePollsPanel } from '../../components/LivePolls/LivePollsPanel';
import { Sidebar } from '../../components/Sidebar/Sidebar';

import { useWhiteboard } from '../../hooks/useWhiteboard';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useRoom } from '../../hooks/useRoom';
import { useMediaStream } from '../../hooks/useMediaStream';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useUserStore } from '../../stores/user.store';
import { apiService } from '../../services/api';
import { peerManager } from '../../services/webrtc.service';
import { PollData, PollOption } from '@meetdraw/shared';
import { Monitor, Share2, Sparkles, Maximize2 } from 'lucide-react';

export const WhiteboardRoomPage: React.FC = () => {
  const { id: roomId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { displayName, userColor, currentUser } = useUserStore();

  const actualUsername = currentUser?.username || displayName;
  const actualColor = userColor;
  const actualUserId = currentUser?.id || 'local-user';

  // Active View: Whiteboard [W], Screen Share [S], or Split View
  const [activeView, setActiveView] = useState<ActiveMeetingView>('whiteboard');

  // Drawers visibility state
  const [isVideoOpen, setIsVideoOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isPollsOpen, setIsPollsOpen] = useState(false);
  const [snapshotSaved, setSnapshotSaved] = useState(false);

  // Live Polls state
  const [polls, setPolls] = useState<PollData[]>([
    {
      id: 'poll-init-1',
      question: 'Should we adopt WebRTC SFU for >50 participants in Phase 2?',
      options: [
        { id: 'opt-1', text: 'Yes, migrate to mediasoup SFU', votes: 3 },
        { id: 'opt-2', text: 'Keep P2P Mesh for privacy', votes: 1 },
      ],
      totalVotes: 4,
      creatorName: 'Alex',
      isActive: true,
      votedUserIds: [],
    },
  ]);

  // Record user joining room in MySQL
  useEffect(() => {
    if (roomId) {
      apiService.joinRoom(roomId).catch(() => {});
    }
  }, [roomId]);

  // 1. WebSocket Signaling status
  const { isConnected: isWsConnected, selfPeerId } = useWebSocket();

  // 2. Room membership and presence
  const { roomDetails, participants, leave } = useRoom(roomId, actualUsername, currentUser?.id, currentUser?.email);

  // 3. Local Camera, Microphone & Screen Share
  const {
    stream: localStream,
    screenStream,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    mediaError,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useMediaStream(true);

  // 4. Collaborative Spatial Whiteboard (Fabric.js)
  const {
    canvasRef,
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    fillColor,
    setFillColor,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    undo,
    redo,
    clearCanvas,
    deleteSelected,
    canUndo,
    canRedo,
    applyRemoteEvent,
    remoteCursors,
    getCanvasData,
    loadCanvasData,
  } = useWhiteboard({
    canvasElementId: 'meetdraw-canvas',
    userId: actualUserId,
    username: actualUsername,
    userColor: actualColor,
  });

  // 5. WebRTC Mesh (P2P DataChannel & MediaStream)
  const {
    remotePeers,
    remoteStreams,
    chatMessages,
    activePeersCount,
    sendChatMessage,
  } = useWebRTC(roomId, applyRemoteEvent, localStream);

  // Auto-unlock browser audio autoplay policies on first click or keypress
  useEffect(() => {
    const unlockAudio = () => {
      document.querySelectorAll('audio').forEach((el) => {
        if (el.paused && el.srcObject) {
          el.play().catch(() => {});
        }
      });
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Global Keyboard Shortcuts [W] and [S] (FR-05)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'w' || e.key === 'W') {
        setActiveView('whiteboard');
      } else if (e.key === 's' || e.key === 'S') {
        setActiveView('screenshare');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load latest whiteboard snapshot from MySQL on mount
  useEffect(() => {
    if (roomId) {
      apiService
        .getSnapshot(roomId)
        .then((res) => {
          if (res.data) {
            loadCanvasData(res.data);
          }
        })
        .catch(() => {
          // No previous snapshot
        });
    }
  }, [roomId, loadCanvasData]);

  // Handle Save Snapshot
  const handleSaveSnapshot = async () => {
    const json = getCanvasData();
    if (!json) return;
    try {
      await apiService.saveSnapshot(roomId, json);
      setSnapshotSaved(true);
      setTimeout(() => setSnapshotSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
  };

  // Handle Export Image
  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
    const link = document.createElement('a');
    link.download = `${roomDetails?.name || 'meetdraw'}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Live Polls Actions
  const handleCreatePoll = (question: string, options: string[]) => {
    const newPoll: PollData = {
      id: `poll_${Date.now()}`,
      question,
      options: options.map((opt, i) => ({ id: `opt_${i}`, text: opt, votes: 0 })),
      totalVotes: 0,
      creatorName: actualUsername,
      isActive: true,
      votedUserIds: [],
    };
    setPolls((prev) => [newPoll, ...prev]);

    // Broadcast poll over WebRTC DataChannel
    peerManager.broadcastData({
      type: 'POLL',
      payload: newPoll,
    });
  };

  const handleVote = (pollId: string, optionId: string) => {
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const currentVoted = poll.votedUserIds || [];
        if (currentVoted.includes(selfPeerId || 'local')) return poll;

        return {
          ...poll,
          totalVotes: poll.totalVotes + 1,
          votedUserIds: [...currentVoted, selfPeerId || 'local'],
          options: poll.options.map((opt) =>
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
          ),
        };
      })
    );
  };

  // Leave room -> Transition to Post-Meeting Archive & AI Summary (Màn hình 5)
  const handleLeave = () => {
    leave();
    navigate(`/summary/${roomId}`);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-navy-950 overflow-hidden select-none font-sans">
      {/* Top Navigation with View Switcher [W] / [S] */}
      <TopNav
        roomId={roomId}
        roomName={roomDetails?.name || `Room ${roomId}`}
        connectedPeersCount={activePeersCount}
        isWsConnected={isWsConnected}
        displayName={actualUsername}
        userColor={actualColor}
        activeView={activeView}
        setActiveView={setActiveView}
        onLeaveRoom={handleLeave}
      />

      {/* Snapshot Toast notification */}
      {snapshotSaved && (
        <div className="absolute top-16 right-20 z-50 bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xl animate-fade-in flex items-center space-x-1.5 border border-emerald-400/30">
          <Sparkles size={14} />
          <span>Spatial Whiteboard snapshot secured to MySQL!</span>
        </div>
      )}

      {/* Center Meeting Workspace */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Workspace Canvas & Screen Share Viewport */}
        <div className="flex-1 relative h-full w-full flex overflow-hidden">
          {/* VIEW 1: WHITEBOARD CANVAS (Visible in 'whiteboard' and 'split' mode) */}
          <div
            className={`relative h-full transition-all duration-300 ${
              activeView === 'whiteboard'
                ? 'w-full'
                : activeView === 'split'
                ? 'w-1/2 border-r border-navy-800'
                : 'hidden'
            }`}
          >
            {/* Floating Spatial Toolbar */}
            <Toolbar
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              strokeColor={strokeColor}
              setStrokeColor={setStrokeColor}
              strokeWidth={strokeWidth}
              setStrokeWidth={setStrokeWidth}
              fillColor={fillColor}
              setFillColor={setFillColor}
              zoomLevel={zoomLevel}
              zoomIn={zoomIn}
              zoomOut={zoomOut}
              resetZoom={resetZoom}
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              clearCanvas={clearCanvas}
              deleteSelected={deleteSelected}
            />

            {/* Fabric.js Canvas */}
            <Canvas canvasId="meetdraw-canvas" remoteCursors={remoteCursors} />
          </div>

          {/* VIEW 2: SCREEN SHARE & DISCUSSION MODE (Visible in 'screenshare' and 'split' mode) */}
          <div
            className={`relative h-full bg-navy-950 flex flex-col items-center justify-center p-4 transition-all duration-300 ${
              activeView === 'screenshare'
                ? 'w-full'
                : activeView === 'split'
                ? 'w-1/2'
                : 'hidden'
            }`}
          >
            {isScreenSharing && screenStream ? (
              <div className="relative w-full h-full max-h-[85vh] bg-navy-900 rounded-2xl overflow-hidden border border-navy-800 shadow-2xl flex items-center justify-center">
                <video
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el && screenStream) el.srcObject = screenStream;
                  }}
                  className="w-full h-full object-contain"
                />

                {/* 60fps Presentation Badge */}
                <div className="absolute top-4 left-4 bg-navy-950/80 backdrop-blur-md px-3 py-1 rounded-xl text-xs text-white border border-navy-700 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-active animate-pulse" />
                  <span className="font-bold">Screen Share (1080p 60fps)</span>
                </div>

                <button
                  onClick={stopScreenShare}
                  className="absolute top-4 right-4 bg-rose-alert/90 hover:bg-rose-alert text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
                >
                  Stop Sharing
                </button>
              </div>
            ) : (
              <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-navy-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-accent/20 text-indigo-light flex items-center justify-center mx-auto border border-indigo-accent/30 shadow-lg shadow-indigo-accent/20">
                  <Monitor size={32} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Presentation Mode (Screen Share)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Broadcast your screen, architecture slides, or IDE directly to peers at 60fps crystal clear.
                  </p>
                </div>
                <button
                  onClick={startScreenShare}
                  className="bg-indigo-accent hover:bg-indigo-light text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-xl shadow-indigo-accent/30 flex items-center justify-center space-x-2 mx-auto"
                >
                  <Share2 size={15} />
                  <span>Start Sharing Screen</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Video Drawer / Grid Panel */}
        {isVideoOpen && (
          <VideoPanel
            localStream={localStream}
            isAudioMuted={isAudioMuted}
            isVideoMuted={isVideoMuted}
            toggleAudio={toggleAudio}
            toggleVideo={toggleVideo}
            localUsername={displayName}
            localUserColor={userColor}
            remotePeers={remotePeers}
            remoteStreams={remoteStreams}
          />
        )}

        {mediaError && (
          <div className="absolute left-4 bottom-4 z-30 max-w-sm rounded-lg border border-rose-400/40 bg-rose-950/90 px-3 py-2 text-xs text-rose-100 shadow-lg">
            {mediaError}
          </div>
        )}

        {/* Live Chat Drawer */}
        {isChatOpen && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={(txt) => sendChatMessage(txt, displayName)}
            onClose={() => setIsChatOpen(false)}
            selfPeerId={selfPeerId || ''}
          />
        )}

        {/* Live Polls Drawer */}
        {isPollsOpen && (
          <LivePollsPanel
            polls={polls}
            onCreatePoll={handleCreatePoll}
            onVote={handleVote}
            onClose={() => setIsPollsOpen(false)}
            currentUserId={selfPeerId || 'local'}
          />
        )}

        {/* Participants Drawer */}
        {isParticipantsOpen && (
          <ParticipantsPanel
            participants={participants}
            remotePeers={remotePeers}
            selfName={displayName}
            selfPeerId={selfPeerId || ''}
            onClose={() => setIsParticipantsOpen(false)}
          />
        )}

        {/* Action Sidebar on far right */}
        <Sidebar
          isVideoOpen={isVideoOpen}
          setIsVideoOpen={setIsVideoOpen}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isParticipantsOpen={isParticipantsOpen}
          setIsParticipantsOpen={setIsParticipantsOpen}
          isPollsOpen={isPollsOpen}
          setIsPollsOpen={setIsPollsOpen}
          onSaveSnapshot={handleSaveSnapshot}
          onExportImage={handleExportImage}
          activePollsCount={polls.length}
        />
      </div>

      {/* Persistent Global Remote Audio Pool (Guarantees voice transmission regardless of drawer/view state) */}
      <div className="hidden pointer-events-none" aria-hidden="true">
        {Array.from(remoteStreams.entries()).map(([peerId, rStream]) => (
          <audio
            key={peerId}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && el.srcObject !== rStream) {
                el.srcObject = rStream;
                el.play().catch((err) => {
                  console.warn(`[Audio] Autoplay for peer ${peerId} waiting for gesture:`, err);
                });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};
