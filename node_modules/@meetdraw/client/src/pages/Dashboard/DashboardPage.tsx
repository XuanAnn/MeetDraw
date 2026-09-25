import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  ArrowRight,
  Clock,
  Layers,
  Users,
  Search,
  ExternalLink,
  Shield,
  Palette,
  LogOut,
  FolderOpen,
  Activity,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useUserStore } from '../../stores/user.store';
import { RoomDetails } from '@meetdraw/shared';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { displayName, userColor, currentUser, logout } = useUserStore();

  const [realRooms, setRealRooms] = useState<RoomDetails[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isStartingInstant, setIsStartingInstant] = useState(false);

  // Fetch real rooms on mount
  useEffect(() => {
    apiService
      .getMyRooms()
      .then((rooms) => {
        if (Array.isArray(rooms)) {
          setRealRooms(rooms);
        }
      })
      .catch((err) => {
        console.warn('Could not load user rooms:', err);
      })
      .finally(() => {
        setIsLoadingRooms(false);
      });
  }, []);

  // Start Instant Meeting -> redirects through Green Room
  const handleStartInstant = async () => {
    setIsStartingInstant(true);
    try {
      const room = await apiService.createRoom({
        name: `Phòng họp của ${displayName}`,
      });
      navigate(`/green-room/${room.id}`);
    } catch (err: any) {
      setJoinError(err.message || 'Không thể tạo phòng họp. Vui lòng thử lại.');
    } finally {
      setIsStartingInstant(false);
    }
  };

  // Join by code or URL
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim()) return;
    let cleanId = joinInput.trim();
    if (cleanId.includes('/room/')) {
      cleanId = cleanId.split('/room/')[1].split('?')[0];
    } else if (cleanId.includes('/green-room/')) {
      cleanId = cleanId.split('/green-room/')[1].split('?')[0];
    }

    setIsJoining(true);
    setJoinError(null);
    try {
      await apiService.joinRoom(cleanId);
      navigate(`/green-room/${cleanId}`);
    } catch (err: any) {
      setJoinError(err.message || 'Không tìm thấy phòng họp. Vui lòng kiểm tra lại mã phòng.');
    } finally {
      setIsJoining(false);
    }
  };

  // Create Standalone Whiteboard
  const handleNewWhiteboard = async () => {
    const boardId = 'wb-' + Math.random().toString(36).substring(2, 8);
    navigate(`/room/${boardId}`);
  };

  const filteredRooms = realRooms.filter((room) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      room.name.toLowerCase().includes(query) ||
      room.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <header className="h-16 px-6 glass-panel border-b border-navy-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-accent to-indigo-light flex items-center justify-center font-extrabold text-white shadow-lg shadow-indigo-accent/30">
              MD
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight">MeetDraw</span>
              <span className="ml-2 text-[10px] bg-indigo-accent/20 text-indigo-glow px-2 py-0.5 rounded-full border border-indigo-accent/30 font-semibold uppercase">
                Spatial Pro
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center pl-6 border-l border-navy-800 text-xs text-slate-400">
            <span>Enterprise Hybrid Suite</span>
          </div>
        </div>

        {/* Center Search bar */}
        <div className="hidden lg:flex items-center w-80 bg-navy-900 border border-navy-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-light transition">
          <Search size={15} className="text-slate-500 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm phòng họp, bản vẽ..."
            className="bg-transparent text-xs text-slate-200 focus:outline-none w-full placeholder-slate-500"
          />
        </div>

        {/* Right User & Actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] text-emerald-active font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Trực tuyến</span>
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-navy-850 transition"
            title="Cài đặt & Thiết bị"
          >
            <Shield size={18} />
          </button>

          <a
            href={window.location.hostname === 'localhost' ? 'http://localhost:5000/monitor' : 'https://meetgold.onrender.com/monitor'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 bg-navy-850 hover:bg-navy-800 text-sky-400 hover:text-sky-300 border border-navy-700/80 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition"
            title="Mở giao diện giám sát Server (Room Monitor)"
          >
            <Activity size={14} className="text-sky-400" />
            <span>Room Monitor</span>
          </a>

          <div className="flex items-center space-x-2.5 pl-2 border-l border-navy-800">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-md ring-1 ring-white/20"
              style={{ backgroundColor: userColor }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-slate-200 leading-tight flex items-center space-x-1.5">
                <span>{displayName}</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {currentUser?.email || 'Đã đăng nhập'}
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="ml-2 p-2 text-slate-400 hover:text-rose-alert hover:bg-navy-850 rounded-xl transition"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-navy-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Không gian làm việc
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Phòng họp trực tuyến với video độ trễ thấp và bảng vẽ tương tác thời gian thực.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs bg-navy-900 border border-navy-800 px-3 py-1.5 rounded-xl text-slate-300">
            <Clock size={14} className="text-indigo-glow" />
            <span>
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* 3 Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Action 1: Instant Meeting */}
          <div
            onClick={isStartingInstant ? undefined : handleStartInstant}
            className={`glass-card hover:border-indigo-accent/80 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-1 group relative overflow-hidden ${
              isStartingInstant ? 'opacity-60 cursor-wait' : 'cursor-pointer'
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-accent/10 rounded-full blur-2xl group-hover:bg-indigo-accent/20 transition" />
            <div className="w-11 h-11 rounded-xl bg-indigo-accent text-white flex items-center justify-center shadow-lg shadow-indigo-accent/40 mb-4 group-hover:scale-110 transition">
              <Video size={22} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Bắt đầu cuộc họp mới</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tạo phòng họp trực tuyến tức thì có hỗ trợ camera, microphone và bảng vẽ chia sẻ.
            </p>
            <div className="mt-4 flex items-center text-xs text-indigo-light font-semibold group-hover:translate-x-1 transition">
              <span>{isStartingInstant ? 'Đang tạo phòng...' : 'Bắt đầu ngay'}</span>
              <ArrowRight size={13} className="ml-1" />
            </div>
          </div>

          {/* Action 2: Join with Code */}
          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-active flex items-center justify-center shadow-lg shadow-emerald-active/10 mb-4 border border-emerald-500/30">
                <Users size={22} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Tham gia bằng mã</h3>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Nhập mã phòng hoặc liên kết phòng họp để tham gia ngay.
              </p>
            </div>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Nhập mã phòng..."
                className="w-full bg-navy-900 border border-navy-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-active"
              />
              <button
                type="submit"
                disabled={!joinInput.trim() || isJoining}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs py-2 rounded-xl transition"
              >
                {isJoining ? 'Đang kiểm tra...' : 'Vào phòng họp'}
              </button>
              {joinError && <p className="text-[11px] text-rose-alert">{joinError}</p>}
            </form>
          </div>

          {/* Action 3: New Whiteboard */}
          <div
            onClick={handleNewWhiteboard}
            className="glass-card hover:border-purple-500/80 p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition" />
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10 mb-4 group-hover:scale-110 transition border border-purple-500/30">
              <Palette size={22} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Bảng vẽ độc lập</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mở không gian bảng vẽ vô cực để phác thảo ý tưởng và lưu trữ sơ đồ.
            </p>
            <div className="mt-4 flex items-center text-xs text-purple-400 font-semibold group-hover:translate-x-1 transition">
              <span>Mở bảng vẽ</span>
              <ArrowRight size={13} className="ml-1" />
            </div>
          </div>
        </div>

        {/* Recent Whiteboards Library */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers size={18} className="text-indigo-light" />
              <h2 className="text-base font-bold text-white">Bảng vẽ & Phòng họp gần đây</h2>
              {realRooms.length > 0 && (
                <span className="text-[11px] bg-emerald-500/20 text-emerald-active border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium">
                  {realRooms.length} phòng
                </span>
              )}
            </div>
          </div>

          {isLoadingRooms ? (
            <div className="p-8 text-center border border-dashed border-navy-800 rounded-2xl bg-navy-900/30">
              <div className="text-xs text-slate-400">Đang tải danh sách phòng họp...</div>
            </div>
          ) : filteredRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredRooms.map((room, idx) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="glass-card hover:border-indigo-light/60 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 group hover:-translate-y-1 relative"
                >
                  <div
                    className={`h-28 bg-gradient-to-br ${
                      idx % 3 === 0
                        ? 'from-indigo-900/60 to-navy-900'
                        : idx % 3 === 1
                        ? 'from-cyan-900/60 to-navy-900'
                        : 'from-purple-900/60 to-navy-900'
                    } p-4 flex flex-col justify-between relative border-b border-navy-800`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-navy-950/80 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Đã lưu
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-navy-950/60 flex items-center justify-center text-slate-400 group-hover:text-white">
                        <ExternalLink size={12} />
                      </div>
                    </div>

                    <div className="opacity-30 group-hover:opacity-60 transition flex items-center space-x-3">
                      <div className="w-12 h-6 rounded border border-white/60" />
                      <div className="h-[1px] w-6 bg-white/60" />
                      <div className="w-6 h-6 rounded-full border border-white/60" />
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-light transition">
                      {room.name}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Mã: <code className="font-mono text-slate-300">{room.id}</code></span>
                      <span className="flex items-center space-x-1">
                        <Users size={11} />
                        <span>{room.memberCount || 1} người</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-navy-800 rounded-2xl bg-navy-900/30 space-y-3">
              <FolderOpen size={36} className="mx-auto text-slate-500" />
              <div className="text-sm font-semibold text-slate-300">
                {searchQuery ? 'Không tìm thấy phòng họp phù hợp' : 'Chưa có phòng họp nào'}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery
                  ? 'Hãy thử tìm kiếm với từ khóa khác.'
                  : 'Các phòng họp và bản vẽ bạn tạo sẽ tự động được lưu và hiển thị tại đây.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleStartInstant}
                  className="mt-2 px-4 py-2 rounded-xl bg-indigo-accent hover:bg-indigo-light text-white text-xs font-semibold shadow-md shadow-indigo-accent/30 transition inline-flex items-center space-x-1.5"
                >
                  <Video size={14} />
                  <span>Tạo phòng họp đầu tiên</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
