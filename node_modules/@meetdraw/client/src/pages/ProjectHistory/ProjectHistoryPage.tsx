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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col p-6 font-sans">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft size={14} />
          <span>Về trang chủ</span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Lịch sử phòng họp & Bản vẽ</h1>
          <p className="text-xs text-slate-500">
            Xem lại danh sách các phòng họp và bản vẽ đã được lưu.
          </p>
        </div>

        {loading ? (
          <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500 shadow-sm">
            Đang tải dữ liệu lịch sử...
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(`/room/${room.id}`)}
                className="bg-white hover:border-indigo-400 p-5 rounded-2xl border border-slate-200 cursor-pointer transition flex items-center justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {room.name}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span>Mã: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">{room.id}</code></span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Users size={11} />
                      <span>{room.memberCount || 1} người tham gia</span>
                    </span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition">
                  <ExternalLink size={14} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500 text-xs space-y-3 shadow-sm">
            <FolderOpen size={36} className="mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Chưa có phòng họp nào</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Các phòng họp và bản vẽ bạn tạo sẽ tự động được lưu và xuất hiện tại đây.
            </p>
            <Link
              to="/"
              className="inline-flex items-center space-x-1.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-indigo-600/20"
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
