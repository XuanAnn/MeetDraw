import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ExternalLink, Users, FolderOpen, Video } from 'lucide-react';
import { apiService } from '../../services/api';
import { RoomDetails } from '@meetdraw/shared';

export const ProjectHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getMyRooms()
      .then((data) => {
        if (Array.isArray(data)) {
          setRooms(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load history rooms:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col p-6">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={14} />
          <span>Về trang chủ</span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Lịch sử phòng họp & Bản vẽ</h1>
          <p className="text-xs text-slate-400">
            Xem lại danh sách các phòng họp và bản vẽ đã được lưu.
          </p>
        </div>

        {loading ? (
          <div className="p-8 bg-navy-900 border border-navy-800 rounded-2xl text-center text-xs text-slate-400">
            Đang tải dữ liệu lịch sử...
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className="glass-card hover:border-indigo-light/60 p-5 rounded-2xl border border-navy-800 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-white group-hover:text-indigo-light transition">
                    {room.name}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span>Mã: <code className="font-mono text-slate-300">{room.id}</code></span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Users size={11} />
                      <span>{room.memberCount || 1} người tham gia</span>
                    </span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-navy-900 flex items-center justify-center text-slate-400 group-hover:text-white transition">
                  <ExternalLink size={14} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-8 text-center text-slate-400 text-xs space-y-3">
            <FolderOpen size={36} className="mx-auto text-slate-500" />
            <p className="text-sm font-semibold text-slate-300">Chưa có phòng họp nào</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Các phòng họp và bản vẽ bạn tạo sẽ tự động được lưu và xuất hiện tại đây.
            </p>
            <Link
              to="/"
              className="inline-flex items-center space-x-1.5 mt-2 bg-indigo-accent hover:bg-indigo-light text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-indigo-accent/30"
            >
              <Video size={14} />
              <span>Tạo phòng họp mới</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
