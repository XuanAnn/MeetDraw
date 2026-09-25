import React from 'react';
import { Users, X, Shield } from 'lucide-react';
import { PeerInfo } from '@meetdraw/shared';
import { RemotePeerState } from '../../types';

interface ParticipantsPanelProps {
  participants: PeerInfo[];
  remotePeers: Map<string, RemotePeerState>;
  selfName: string;
  selfPeerId: string;
  onClose: () => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  participants,
  remotePeers,
  selfName,
  selfPeerId,
  onClose,
}) => {
  return (
    <div className="bg-white border-l border-slate-200 flex flex-col w-72 sm:w-80 h-full z-20 select-none shadow-sm font-sans">
      {/* Header */}
      <div className="h-12 border-b border-slate-200 px-3.5 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <Users size={16} className="text-indigo-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Thành viên ({participants.length + 1})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
        {/* Self */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
              {selfName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                <span>{selfName}</span>
                <span className="text-[10px] text-indigo-600 font-bold">(Bạn)</span>
              </div>
              <div className="text-[10px] text-slate-500">Thiết bị hiện tại</div>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
            Đang hoạt động
          </span>
        </div>

        {/* Remote Peers */}
        {participants.map((p) => {
          const peerState = remotePeers.get(p.id);
          const state = peerState?.connectionState || 'connecting';

          return (
            <div
              key={p.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-xs">
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                    <span>{p.username}</span>
                    {(p.isHost || p.isManage) && (
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-semibold flex items-center space-x-0.5">
                        <Shield size={10} className="text-amber-600" />
                        <span>Manage</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">ID: {p.id.substring(0, 8)}...</div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    state === 'connected'
                      ? 'bg-emerald-500'
                      : state === 'connecting'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-[10px] font-medium text-slate-500">
                  {state === 'connected'
                    ? 'Đã kết nối'
                    : state === 'connecting'
                    ? 'Đang kết nối'
                    : 'Mất kết nối'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
