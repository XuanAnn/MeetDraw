import React from 'react';
import { Users, X, Shield, CircleDot } from 'lucide-react';
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
    <div className="bg-gray-900 border-l border-gray-800 flex flex-col w-72 sm:w-80 h-full z-20 select-none">
      {/* Header */}
      <div className="h-12 border-b border-gray-800 px-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users size={16} className="text-sky-400" />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Thành viên ({participants.length + 1})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Self */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-white text-xs">
              {selfName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-medium text-gray-100 flex items-center space-x-1">
                <span>{selfName}</span>
                <span className="text-[10px] text-sky-400 font-bold">(Bạn)</span>
              </div>
              <div className="text-[10px] text-gray-400">Thiết bị hiện tại</div>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
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
              className="flex items-center justify-between p-2.5 rounded-xl bg-gray-800/30 border border-gray-800 hover:bg-gray-800/60 transition"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-200 flex items-center space-x-1">
                    <span>{p.username}</span>
                    {p.isHost && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-medium flex items-center space-x-0.5">
                        <Shield size={10} />
                        <span>Chủ phòng</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500">ID: {p.id.substring(0, 8)}...</div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    state === 'connected'
                      ? 'bg-emerald-400'
                      : state === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-[10px] text-gray-400">
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
