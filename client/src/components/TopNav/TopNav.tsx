import React, { useState } from 'react';
import {
  Copy,
  Check,
  Wifi,
  PhoneOff,
  Palette,
  Monitor,
  Columns,
  Activity,
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
  isScreenSharingActive?: boolean;
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
  isScreenSharingActive,
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
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between select-none z-20 shadow-sm">
      {/* Left: Brand & Room Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            MD
          </div>
          <span className="font-extrabold text-slate-900 text-sm hidden sm:inline tracking-tight">
            MeetDraw
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[200px]">
            {roomName}
          </span>
          <button
            onClick={copyRoomLink}
            className="flex items-center space-x-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition border border-slate-200"
            title="Sao chép liên kết phòng họp"
          >
            <span>{roomId}</span>
            {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {/* Center: View Switcher Tabs [W] & [S] */}
      <div className="flex items-center bg-slate-100 border border-slate-200/90 p-1 rounded-xl space-x-1">
        <button
          onClick={() => setActiveView('whiteboard')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
            activeView === 'whiteboard'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          title="Bảng vẽ tương tác (Phím tắt: W)"
        >
          <Palette size={13} />
          <span>Bảng vẽ</span>
          <span className="text-[10px] opacity-70 bg-black/10 px-1 py-0.2 rounded font-mono">[W]</span>
        </button>

        <button
          onClick={() => setActiveView('screenshare')}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
            activeView === 'screenshare'
              ? 'bg-indigo-600 text-white shadow-sm'
              : isScreenSharingActive
              ? 'text-emerald-600 font-bold hover:bg-emerald-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          title="Chia sẻ màn hình (Phím tắt: S)"
        >
          <Monitor size={13} />
          <span>Màn hình</span>
          {isScreenSharingActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span className="text-[10px] opacity-70 bg-black/10 px-1 py-0.2 rounded font-mono">[S]</span>
        </button>

        <button
          onClick={() => setActiveView('split')}
          className={`hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
            activeView === 'split'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          title="Chế độ chia đôi màn hình"
        >
          <Columns size={13} />
          <span>Chia đôi</span>
        </button>
      </div>

      {/* Right: Peer Presence & End Call */}
      <div className="flex items-center space-x-2.5">
        {/* Network & Participant Presence Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 text-[11px]">
          <Wifi size={12} className={isWsConnected ? 'text-emerald-600' : 'text-amber-500'} />
          <span className="text-slate-700 font-medium">
            {isWsConnected ? 'Trực tuyến' : 'Đang kết nối'} •{' '}
            <span className="text-emerald-700 font-bold">
              {connectedPeersCount + 1} người
            </span>
          </span>
        </div>

        {/* User tag */}
        <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: userColor }}
          />
          <span className="text-xs text-slate-800 font-medium max-w-[90px] truncate">
            {displayName}
          </span>
        </div>

        {/* Server Room Monitor Button */}
        <a
          href={window.location.hostname === 'localhost' ? `http://localhost:5000/monitor?roomId=${roomId}` : `https://meetgold.onrender.com/monitor?roomId=${roomId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-indigo-700 hover:text-indigo-800 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition"
          title="Mở giao diện giám sát Server (Room Monitor)"
        >
          <Activity size={13} className="text-indigo-600" />
          <span>Monitor</span>
        </a>

        {/* End / Leave Meeting Action */}
        <button
          onClick={onLeaveRoom}
          className="flex items-center space-x-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl transition shadow-sm"
        >
          <PhoneOff size={13} />
          <span className="hidden sm:inline">Rời phòng</span>
        </button>
      </div>
    </header>
  );
};
