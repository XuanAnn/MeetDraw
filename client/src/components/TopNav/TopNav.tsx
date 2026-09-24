import React, { useState } from 'react';
import {
  Copy,
  Check,
  Wifi,
  Zap,
  PhoneOff,
  Palette,
  Monitor,
  Columns,
} from 'lucide-react';
import { SfuStatsPayload } from '@meetdraw/shared';

export type ActiveMeetingView = 'whiteboard' | 'screenshare' | 'split';

interface TopNavProps {
  roomId: string;
  roomName: string;
  connectedPeersCount: number;
  isWsConnected: boolean;
  displayName: string;
  userColor: string;
  activeView: ActiveMeetingView;
  setActiveView: (view: ActiveMeetingView) => void;
  sfuStats?: SfuStatsPayload;
  onLeaveRoom: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  roomId,
  roomName,
  connectedPeersCount,
  isWsConnected,
  displayName,
  userColor,
  activeView,
  setActiveView,
  sfuStats,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 bg-navy-950/90 backdrop-blur-md border-b border-navy-800 px-4 flex items-center justify-between select-none z-20">
      {/* Left: Brand & Room Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-accent to-indigo-light flex items-center justify-center font-bold text-white shadow-md shadow-indigo-accent/30">
            MD
          </div>
          <span className="font-bold text-slate-100 text-sm hidden sm:inline tracking-tight">
            MeetDraw
          </span>
        </div>

        <div className="h-4 w-[1px] bg-navy-800 hidden sm:block" />

        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-200 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[200px]">
            {roomName}
          </span>
          <button
            onClick={copyRoomLink}
            className="flex items-center space-x-1 text-[11px] bg-navy-900 hover:bg-navy-800 text-slate-300 px-2 py-1 rounded-lg transition border border-navy-700"
            title="Copy room invitation link"
          >
            <span>{roomId}</span>
            {copied ? <Check size={11} className="text-emerald-active" /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {/* Center: View Switcher Tabs [W] & [S] (FR-05 Core Requirement) */}
      <div className="flex items-center bg-navy-900 border border-navy-700/80 p-1 rounded-xl shadow-inner space-x-1">
        <button
          onClick={() => setActiveView('whiteboard')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
            activeView === 'whiteboard'
              ? 'bg-indigo-accent text-white shadow-md shadow-indigo-accent/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Switch to Whiteboard (Shortcut: W)"
        >
          <Palette size={13} />
          <span>Whiteboard</span>
          <span className="text-[10px] opacity-70 bg-black/20 px-1 py-0.2 rounded font-mono">[W]</span>
        </button>

        <button
          onClick={() => setActiveView('screenshare')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
            activeView === 'screenshare'
              ? 'bg-indigo-accent text-white shadow-md shadow-indigo-accent/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Switch to Screen Share (Shortcut: S)"
        >
          <Monitor size={13} />
          <span>Screen Share</span>
          <span className="text-[10px] opacity-70 bg-black/20 px-1 py-0.2 rounded font-mono">[S]</span>
        </button>

        <button
          onClick={() => setActiveView('split')}
          className={`hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
            activeView === 'split'
              ? 'bg-indigo-accent text-white shadow-md shadow-indigo-accent/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Side-by-side Split View"
        >
          <Columns size={13} />
          <span>Split View</span>
        </button>
      </div>

      {/* Right: Peer Presence & End Call */}
      <div className="flex items-center space-x-3">
        {/* WebRTC SFU Router Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 bg-navy-900 px-2.5 py-1 rounded-full border border-indigo-500/30 text-[11px] shadow-sm">
          <Zap size={12} className={connectedPeersCount > 0 ? 'text-indigo-glow' : 'text-slate-500'} />
          <span className="text-slate-300 font-medium">
            SFU Router:{' '}
            <span className="text-indigo-glow font-bold">
              {sfuStats && sfuStats.bandwidthSavedPercent > 0
                ? `${sfuStats.bandwidthSavedPercent}% upload saved`
                : `${connectedPeersCount} Peer${connectedPeersCount !== 1 ? 's' : ''}`}
            </span>
          </span>
        </div>

        {/* User tag */}
        <div className="flex items-center space-x-1.5 bg-navy-900 px-2.5 py-1 rounded-full border border-navy-800">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: userColor }}
          />
          <span className="text-xs text-slate-200 font-medium max-w-[90px] truncate">
            {displayName}
          </span>
        </div>

        {/* End / Leave Meeting Action */}
        <button
          onClick={onLeaveRoom}
          className="flex items-center space-x-1.5 text-xs bg-rose-alert/90 hover:bg-rose-alert text-white font-bold px-3 py-1.5 rounded-xl transition shadow-md shadow-rose-alert/20"
        >
          <PhoneOff size={13} />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
};
