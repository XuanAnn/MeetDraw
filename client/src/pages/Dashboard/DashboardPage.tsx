import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Video,
  Calendar,
  Plus,
  ArrowRight,
  Sparkles,
  Clock,
  Layers,
  Users,
  CheckCircle2,
  TrendingUp,
  Search,
  Bell,
  MoreVertical,
  ExternalLink,
  Shield,
  Palette,
  LogOut,
  Database,
  Zap,
  Activity,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useUserStore } from '../../stores/user.store';
import { RoomDetails } from '@meetdraw/shared';

interface ScheduledMeeting {
  id: string;
  title: string;
  time: string;
  duration: string;
  tags: string[];
  attendees: string[];
  isNow?: boolean;
}

interface RecentBoard {
  id: string;
  title: string;
  updatedAt: string;
  collaborators: number;
  thumbnailColor: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { displayName, userColor, currentUser, logout } = useUserStore();

  const [realRooms, setRealRooms] = useState<RoomDetails[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isStartingInstant, setIsStartingInstant] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDate, setScheduleDate] = useState('2026-09-05');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  // Fetch real rooms from MySQL on mount
  useEffect(() => {
    apiService
      .getMyRooms()
      .then((rooms) => {
        if (Array.isArray(rooms)) {
          setRealRooms(rooms);
        }
      })
      .catch((err) => {
        console.warn('Could not load user rooms from MySQL:', err);
      })
      .finally(() => {
        setIsLoadingRooms(false);
      });
  }, []);

  // Scheduled meetings list
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);

  // Start Instant Meeting -> redirects through Green Room
  const handleStartInstant = async () => {
    setIsStartingInstant(true);
    try {
      const room = await apiService.createRoom({
        name: `${displayName}'s Meeting Room`,
      });
      navigate(`/green-room/${room.id}`);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to create room. Please try again.');
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
      setJoinError(err.message || 'Room not found. Please check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Create Standalone Whiteboard
  const handleNewWhiteboard = async () => {
    const boardId = 'wb-' + Math.random().toString(36).substring(2, 8);
    navigate(`/room/${boardId}`);
  };

  // Schedule modal submit
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newMeeting: ScheduledMeeting = {
      id: 'meet-' + Math.random().toString(36).substring(2, 6),
      title: scheduleTitle.trim() || 'Scheduled Project Discussion',
      time: `${scheduleTime} (${scheduleDate})`,
      duration: '45 min',
      tags: ['Calendar', 'Google Sync'],
      attendees: [displayName, 'Team'],
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    setScheduledSuccess(true);
    setTimeout(() => {
      setScheduledSuccess(false);
      setIsScheduleOpen(false);
      setScheduleTitle('');
    }, 1800);
  };

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
            placeholder="Search meetings, whiteboards, notes..."
            className="bg-transparent text-xs text-slate-200 focus:outline-none w-full placeholder-slate-500"
          />
        </div>

        {/* Right User & Actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] text-emerald-active font-medium">
            <Database size={12} />
            <span>MySQL Docker</span>
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-navy-850 transition"
            title="Diagnostics & Settings"
          >
            <Shield size={18} />
          </button>

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
                {currentUser?.email || 'Logged in'}
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="ml-2 p-2 text-slate-400 hover:text-rose-alert hover:bg-navy-850 rounded-xl transition"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome & Productivity Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-navy-800/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Executive Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Seamless bridge between real-time low-latency video and spatial whiteboard brainstorming.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs bg-navy-900 border border-navy-800 px-3 py-1.5 rounded-xl text-slate-300">
            <Clock size={14} className="text-indigo-glow" />
            <span>Local Time: {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* 4 Quick Action Cards (Screen 1 Core Requirement) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <h3 className="text-sm font-bold text-white mb-1">Start Instant Meeting</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Launch an immediate video session with collaborative whiteboard.
            </p>
            <div className="mt-4 flex items-center text-xs text-indigo-light font-semibold group-hover:translate-x-1 transition">
              <span>{isStartingInstant ? 'Launching...' : 'Launch Now'}</span>
              <ArrowRight size={13} className="ml-1" />
            </div>
          </div>

          {/* Action 2: Schedule Meeting */}
          <div
            onClick={() => setIsScheduleOpen(true)}
            className="glass-card hover:border-cyan-accent/80 p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-accent/10 rounded-full blur-2xl group-hover:bg-cyan-accent/20 transition" />
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-accent flex items-center justify-center shadow-lg shadow-cyan-accent/10 mb-4 group-hover:scale-110 transition border border-cyan-500/30">
              <Calendar size={22} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Schedule Meeting</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plan ahead with Google & Outlook calendar agenda sync.
            </p>
            <div className="mt-4 flex items-center text-xs text-cyan-accent font-semibold group-hover:translate-x-1 transition">
              <span>Set Up Agenda</span>
              <ArrowRight size={13} className="ml-1" />
            </div>
          </div>

          {/* Action 3: Join with Code */}
          <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-active flex items-center justify-center shadow-lg shadow-emerald-active/10 mb-4 border border-emerald-500/30">
                <Users size={22} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Join with Code / Link</h3>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Enter Room ID to access the Green Room device check.
              </p>
            </div>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="e.g. arch-sync-90"
                className="w-full bg-navy-900 border border-navy-700 text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-active"
              />
              <button
                type="submit"
                disabled={!joinInput.trim() || isJoining}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs py-2 rounded-xl transition"
              >
                {isJoining ? 'Joining...' : 'Join via Green Room'}
              </button>
              {joinError && <p className="text-[11px] text-rose-alert">{joinError}</p>}
            </form>
          </div>

          {/* Action 4: New Spatial Whiteboard */}
          <div
            onClick={handleNewWhiteboard}
            className="glass-card hover:border-purple-500/80 p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition" />
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/10 mb-4 group-hover:scale-110 transition border border-purple-500/30">
              <Palette size={22} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">New Whiteboard</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Open a blank infinite spatial canvas for standalone sketching.
            </p>
            <div className="mt-4 flex items-center text-xs text-purple-400 font-semibold group-hover:translate-x-1 transition">
              <span>Open Canvas</span>
              <ArrowRight size={13} className="ml-1" />
            </div>
          </div>
        </div>

        {/* Middle Section: Today's Schedule & Weekly Productivity Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule (2 cols) */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-navy-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar size={18} className="text-indigo-glow" />
                <h2 className="text-base font-bold text-white">Today's Meeting Schedule</h2>
              </div>
              <span className="text-xs bg-navy-850 text-slate-400 px-2.5 py-1 rounded-lg border border-navy-800 font-medium">
                {meetings.length} Sessions Planned
              </span>
            </div>

            {meetings.length > 0 ? (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      m.isNow
                        ? 'bg-indigo-accent/10 border-indigo-accent/50 shadow-md shadow-indigo-accent/10'
                        : 'bg-navy-900/60 border-navy-800 hover:border-navy-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        {m.isNow && (
                          <span className="text-[10px] bg-rose-alert text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                            Live Now
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-white">{m.title}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{m.time}</span>
                        </span>
                        <span>•</span>
                        <span>{m.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:self-center">
                      <button
                        onClick={() => navigate(`/green-room/${m.id}`)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-accent hover:bg-indigo-light text-white transition flex items-center space-x-1.5 shadow-md shadow-indigo-accent/30"
                      >
                        <Video size={14} />
                        <span>Join Meeting</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-navy-800 rounded-xl space-y-3 bg-navy-900/30">
                <Calendar size={32} className="mx-auto text-slate-500" />
                <div className="text-sm font-semibold text-slate-300">No Scheduled Meetings Today</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Plan ahead by scheduling a video call with collaborative whiteboard agenda.
                </p>
                <button
                  onClick={() => setIsScheduleOpen(true)}
                  className="mt-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-accent hover:bg-cyan-500/30 text-xs font-semibold border border-cyan-500/30 transition inline-flex items-center space-x-1.5"
                >
                  <Calendar size={13} />
                  <span>Schedule a Meeting</span>
                </button>
              </div>
            )}
          </div>

          {/* Weekly Productivity Metrics Widget (1 col) */}
          <div className="glass-panel p-6 rounded-2xl border border-navy-800 space-y-6">
            <div className="flex items-center space-x-2">
              <TrendingUp size={18} className="text-emerald-active" />
              <h2 className="text-base font-bold text-white">Productivity Impact</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-navy-900/80 p-4 rounded-xl border border-navy-800 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-white">{realRooms.length}</div>
                  <div className="text-xs text-slate-400">Persistent MySQL Rooms</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-active flex items-center justify-center font-bold text-sm">
                  <Database size={18} />
                </div>
              </div>

              <div className="bg-navy-900/80 p-4 rounded-xl border border-navy-800 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-white">SFU Router</div>
                  <div className="text-xs text-slate-400">Camera Stream Orchestration</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-accent/20 text-indigo-light flex items-center justify-center font-bold text-sm">
                  <Zap size={18} />
                </div>
              </div>

              <div className="bg-navy-900/80 p-4 rounded-xl border border-navy-800 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-white">Ultra-low</div>
                  <div className="text-xs text-slate-400">WebRTC Video & Canvas Latency</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-accent/20 text-cyan-accent flex items-center justify-center font-bold text-sm">
                  <Activity size={18} />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-accent/10 border border-indigo-accent/30 rounded-xl text-xs text-indigo-glow flex items-start space-x-2.5">
              <Sparkles size={16} className="flex-shrink-0 mt-0.5 text-indigo-light" />
              <span>
                <strong>SFU Media Engine:</strong> Orchestrates up to 50 concurrent participants with single-stream upload.
              </span>
            </div>
          </div>
        </div>

        {/* Recent Whiteboards Library */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers size={18} className="text-indigo-light" />
              <h2 className="text-base font-bold text-white">Recent Spatial Whiteboards</h2>
              {realRooms.length > 0 && (
                <span className="text-[11px] bg-emerald-500/20 text-emerald-active border border-emerald-500/40 px-2 py-0.5 rounded-full font-medium flex items-center space-x-1">
                  <Database size={10} />
                  <span>{realRooms.length} Synced to MySQL</span>
                </span>
              )}
            </div>
            <button
              onClick={handleNewWhiteboard}
              className="text-xs text-indigo-light hover:text-white font-semibold flex items-center space-x-1"
            >
              <span>View All Library</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {realRooms.length > 0 ? (
              realRooms.map((room, idx) => (
                <div
                  key={room.id}
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="glass-card hover:border-indigo-light/60 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 group hover:-translate-y-1 relative"
                >
                  <div
                    className={`h-32 bg-gradient-to-br ${
                      idx % 3 === 0
                        ? 'from-indigo-900/60 to-navy-900'
                        : idx % 3 === 1
                        ? 'from-cyan-900/60 to-navy-900'
                        : 'from-purple-900/60 to-navy-900'
                    } p-4 flex flex-col justify-between relative border-b border-navy-800`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-navy-950/80 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                        <Database size={9} />
                        <span>Live MySQL</span>
                      </span>
                      <div className="w-6 h-6 rounded-lg bg-navy-950/60 flex items-center justify-center text-slate-400 group-hover:text-white">
                        <ExternalLink size={12} />
                      </div>
                    </div>

                    {/* Wireframe diagram preview graphic */}
                    <div className="opacity-30 group-hover:opacity-60 transition flex items-center space-x-3">
                      <div className="w-12 h-8 rounded border border-white/60" />
                      <div className="h-[1px] w-6 bg-white/60" />
                      <div className="w-8 h-8 rounded-full border border-white/60" />
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-light transition">
                      {room.name}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Room: <code className="font-mono text-slate-300">{room.id}</code></span>
                      <span className="flex items-center space-x-1">
                        <Users size={11} />
                        <span>{room.memberCount || 1} peer{room.memberCount !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center border border-dashed border-navy-800 rounded-2xl bg-navy-900/30 space-y-3">
                <Layers size={36} className="mx-auto text-slate-500" />
                <div className="text-sm font-semibold text-slate-300">No Whiteboard Sessions Yet</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your spatial whiteboard rooms will appear here once created. Every room is persistently saved in MySQL storage.
                </p>
                <button
                  onClick={handleNewWhiteboard}
                  className="mt-2 px-4 py-2 rounded-xl bg-indigo-accent hover:bg-indigo-light text-white text-xs font-semibold shadow-md shadow-indigo-accent/30 transition inline-flex items-center space-x-1.5"
                >
                  <Palette size={14} />
                  <span>Create First Whiteboard</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Schedule Meeting Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Schedule Video & Whiteboard Call</h3>
            <p className="text-xs text-slate-400">
              Sync automatically with your team's Google Calendar and Slack channels.
            </p>

            {scheduledSuccess ? (
              <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-emerald-active text-xs font-semibold">
                Meeting scheduled and invitation link generated!
              </div>
            ) : (
              <form onSubmit={handleScheduleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Session Title</label>
                  <input
                    type="text"
                    required
                    value={scheduleTitle}
                    onChange={(e) => setScheduleTitle(e.target.value)}
                    placeholder="e.g. Q4 System Architecture Sync"
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-light"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-light"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-light"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsScheduleOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-accent hover:bg-indigo-light text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-indigo-accent/30"
                  >
                    Confirm & Sync Calendar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
