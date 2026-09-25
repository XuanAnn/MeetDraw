import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, ArrowRight, Video, Sparkles, UserCheck, History, Settings as SettingsIcon } from 'lucide-react';
import { apiService } from '../../services/api';
import { useUserStore } from '../../stores/user.store';

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { displayName, updateGuestName, userColor, currentUser } = useUserStore();

  const [nameInput, setNameInput] = useState(displayName);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
    updateGuestName(e.target.value);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const room = await apiService.createRoom({
        name: newRoomTitle.trim() || 'Collaborative Whiteboard Room',
      });
      navigate(`/room/${room.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;

    // Extract ID if full URL pasted
    let cleanId = joinRoomId.trim();
    if (cleanId.includes('/room/')) {
      cleanId = cleanId.split('/room/')[1].split('?')[0];
    }

    setIsJoining(true);
    setError(null);
    try {
      await apiService.joinRoom(cleanId);
      navigate(`/room/${cleanId}`);
    } catch (err: any) {
      setError(err.message || 'Room not found. Please check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-gray-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center font-black text-white shadow-lg shadow-sky-500/20">
            ND
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center space-x-1.5">
              <span>MeetDraw</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Trực tuyến
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <Link
            to="/history"
            className="flex items-center space-x-1 text-gray-400 hover:text-gray-200 py-1.5 px-3 rounded-lg hover:bg-gray-900 transition"
          >
            <History size={14} />
            <span>History</span>
          </Link>
          <Link
            to="/settings"
            className="flex items-center space-x-1 text-gray-400 hover:text-gray-200 py-1.5 px-3 rounded-lg hover:bg-gray-900 transition"
          >
            <SettingsIcon size={14} />
            <span>Settings</span>
          </Link>

          {currentUser ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-gray-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-gray-300 font-medium">{currentUser.username}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 pl-2 border-l border-gray-800">
              <Link
                to="/login"
                className="text-gray-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-gray-800 transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow-md shadow-sky-500/20"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Họp trực tuyến & Bảng vẽ cộng tác
          </h2>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Kết nối âm thanh, hình ảnh và tương tác vẽ bảng trắng mượt mà trong thời gian thực.
          </p>
        </div>

        {/* User Identity Card */}
        <div className="max-w-md mx-auto w-full bg-gray-900/90 border border-gray-800 rounded-2xl p-4 mb-8 shadow-xl">
          <label className="block text-xs font-semibold text-gray-400 mb-2">
            Your In-Room Display Name
          </label>
          <div className="flex items-center space-x-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-inner flex-shrink-0"
              style={{ backgroundColor: userColor }}
            >
              {nameInput.charAt(0).toUpperCase()}
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={handleNameChange}
              placeholder="Enter your name..."
              className="flex-1 bg-gray-800 text-gray-100 text-sm px-3.5 py-2 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Action Cards: Create vs Join */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto w-full">
          {/* Create Room */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between hover:border-gray-700 transition">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4">
                <Plus size={22} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">New Meeting Room</h3>
              <p className="text-xs text-gray-400 mb-4">
                Start a private room with collaborative whiteboard, voice, and video.
              </p>

              <form onSubmit={handleCreateRoom} className="space-y-3">
                <input
                  type="text"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="Room Title (e.g. Design Sync)"
                  className="w-full bg-gray-800 text-gray-100 text-xs px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-sky-500 hover:bg-sky-600 font-semibold text-white text-xs py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 flex items-center justify-center space-x-1.5"
                >
                  <Sparkles size={15} />
                  <span>{isCreating ? 'Creating Room...' : 'Create & Launch'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Join Room */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col justify-between hover:border-gray-700 transition">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Video size={22} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Join with Room Code</h3>
              <p className="text-xs text-gray-400 mb-4">
                Enter an invitation code or paste the full meeting link.
              </p>

              <form onSubmit={handleJoinRoom} className="space-y-3">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="e.g. abcd-efgh or full URL"
                  className="w-full bg-gray-800 text-gray-100 text-xs px-3.5 py-2.5 rounded-xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!joinRoomId.trim() || isJoining}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 font-semibold text-white text-xs py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-1.5"
                >
                  <span>{isJoining ? 'Joining...' : 'Join Meeting'}</span>
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto w-full mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 text-center">
            {error}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-600 border-t border-gray-900">
        MeetDraw • Không gian họp trực tuyến & Bảng vẽ cộng tác
      </footer>
    </div>
  );
};
