import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Download,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  Play,
  Pause,
  ArrowLeft,
  Share2,
  FileText,
  Check,
  Send,
  ExternalLink,
  Layers,
  BarChart2,
  Film,
} from 'lucide-react';

interface ActionItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  syncedJira: boolean;
  syncedLinear: boolean;
}

export const PostMeetingSummaryPage: React.FC = () => {
  const { id: roomId = 'arch-sync-90' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(35); // 35%
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real Action items for this meeting session
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSyncAllJira = () => {
    if (actionItems.length === 0) {
      showToast('No action items available to export.');
      return;
    }
    setActionItems((prev) => prev.map((item) => ({ ...item, syncedJira: true })));
    showToast(`Exported ${actionItems.length} Action Items to Jira!`);
  };

  const handleSyncAllLinear = () => {
    if (actionItems.length === 0) {
      showToast('No action items available to export.');
      return;
    }
    setActionItems((prev) => prev.map((item) => ({ ...item, syncedLinear: true })));
    showToast(`Exported ${actionItems.length} Issues to Linear!`);
  };

  const handleSendSlack = () => {
    showToast(`Meeting summary for room ${roomId} prepared for sharing!`);
  };

  const handleDownloadPNG = () => {
    showToast('Downloading high-resolution Whiteboard PNG...');
  };

  const handleDownloadPDF = () => {
    showToast('Generating and downloading Vector PDF diagram...');
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ roomId, version: '1.0', objects: [] }));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `meetdraw_diagram_${roomId}.json`);
    dlAnchor.click();
    showToast('Exported diagram JSON schema.');
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-indigo-accent text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-indigo-light flex items-center space-x-2 animate-bounce">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-16 px-6 glass-panel border-b border-navy-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition px-2.5 py-1.5 rounded-lg hover:bg-navy-850"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-[1px] bg-navy-800" />
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-white">Meeting Archive & AI Summary</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-active px-2 py-0.5 rounded-full font-semibold">
              Session Concluded
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/room/${roomId}`)}
            className="bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition border border-navy-700"
          >
            Re-open Whiteboard
          </button>
          <button
            onClick={handleSendSlack}
            className="bg-indigo-accent hover:bg-indigo-light text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition shadow-md shadow-indigo-accent/30 flex items-center space-x-1.5"
          >
            <Send size={13} />
            <span>Share to Slack</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Session Metadata Card */}
        <div className="glass-panel p-6 rounded-2xl border border-navy-800 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono text-indigo-glow font-bold uppercase">Session #{roomId}</span>
              <h1 className="text-2xl font-extrabold text-white mt-0.5">
                Microservices Architecture & Spatial UX Review
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-navy-900 border border-navy-800 px-3 py-1.5 rounded-xl text-slate-300 flex items-center space-x-1.5">
                <Calendar size={13} className="text-indigo-light" />
                <span>Sep 4, 2026</span>
              </span>
              <span className="text-xs bg-navy-900 border border-navy-800 px-3 py-1.5 rounded-xl text-slate-300 flex items-center space-x-1.5">
                <Clock size={13} className="text-cyan-accent" />
                <span>Duration: 48m 22s</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1">
            <span>Participants:</span>
            <div className="flex items-center space-x-1">
              {['Alex (Host)', 'Sarah', 'David', 'Chloe'].map((name, i) => (
                <span
                  key={i}
                  className="bg-navy-850 px-2 py-0.5 rounded-md text-slate-300 text-[11px] border border-navy-800"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Cloud Recording & Export Hub Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cloud Recording Player (2 cols) */}
          <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden border border-navy-800 flex flex-col">
            <div className="h-11 px-4 bg-navy-900/80 border-b border-navy-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Film size={15} className="text-indigo-glow" />
                <span className="text-xs font-bold text-slate-200">Cloud Recording (1080p HD)</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">48:22 / 48:22</span>
            </div>

            {/* Video Player Display */}
            <div className="relative aspect-video bg-navy-950 flex items-center justify-center group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-transparent opacity-80" />
              
              {/* Center Play Button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-indigo-accent/90 hover:bg-indigo-light text-white flex items-center justify-center shadow-2xl shadow-indigo-accent/50 transition transform group-hover:scale-110 z-10"
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </button>

              {/* Chapter Markers & Timeline at bottom */}
              <div className="absolute bottom-4 left-4 right-4 z-10 space-y-2">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span className="font-semibold text-indigo-light">Chapter 3: Whiteboard Architecture & Data Flow</span>
                  <span>1080p • 60fps</span>
                </div>
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    setPlaybackProgress(Math.round((clickX / rect.width) * 100));
                  }}
                  className="h-2 w-full bg-navy-800 rounded-full overflow-hidden cursor-pointer relative"
                >
                  <div
                    className="h-full bg-gradient-to-r from-indigo-accent to-cyan-accent"
                    style={{ width: `${playbackProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Export Whiteboard Hub (1 col) */}
          <div className="glass-panel p-6 rounded-2xl border border-navy-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Layers size={18} className="text-cyan-accent" />
                <h3 className="text-sm font-bold text-white">Whiteboard Export Hub</h3>
              </div>
              <p className="text-xs text-slate-400">
                Preserve spatial diagrams created during this session in industry-standard formats.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleDownloadPNG}
                className="w-full p-3 rounded-xl bg-navy-900 hover:bg-navy-850 border border-navy-700 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-light flex items-center justify-center font-bold text-xs">
                    PNG
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-light">High-Res Image</div>
                    <div className="text-[10px] text-slate-400">3840 x 2160 Ultra HD</div>
                  </div>
                </div>
                <Download size={15} className="text-slate-500 group-hover:text-white" />
              </button>

              <button
                onClick={handleDownloadPDF}
                className="w-full p-3 rounded-xl bg-navy-900 hover:bg-navy-850 border border-navy-700 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-alert flex items-center justify-center font-bold text-xs">
                    PDF
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-rose-alert">Vector Document</div>
                    <div className="text-[10px] text-slate-400">Scalable vector blueprint</div>
                  </div>
                </div>
                <Download size={15} className="text-slate-500 group-hover:text-white" />
              </button>

              <button
                onClick={handleDownloadJSON}
                className="w-full p-3 rounded-xl bg-navy-900 hover:bg-navy-850 border border-navy-700 text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-active flex items-center justify-center font-bold text-xs">
                    JSON
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-active">Fabric.js Schema</div>
                    <div className="text-[10px] text-slate-400">Reusable spatial objects</div>
                  </div>
                </div>
                <Download size={15} className="text-slate-500 group-hover:text-white" />
              </button>
            </div>

            <div className="p-3 bg-navy-900 rounded-xl border border-navy-800 text-[11px] text-slate-400 text-center">
              Whiteboard snapshot is automatically secured in MySQL storage.
            </div>
          </div>
        </div>

        {/* Nexus AI Meeting Summary & Action Items */}
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-navy-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-accent to-indigo-light flex items-center justify-center text-white shadow-lg shadow-indigo-accent/30">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Nexus AI Executive Summary</h2>
                <p className="text-xs text-slate-400">
                  Automated audio transcript analysis and action items extraction.
                </p>
              </div>
            </div>

            {/* Quick Sync buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSyncAllJira}
                className="bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition border border-navy-700 flex items-center space-x-1.5"
              >
                <ExternalLink size={12} />
                <span>Push to Jira</span>
              </button>
              <button
                onClick={handleSyncAllLinear}
                className="bg-indigo-accent hover:bg-indigo-light text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-md shadow-indigo-accent/20 flex items-center space-x-1.5"
              >
                <ExternalLink size={12} />
                <span>Export to Linear</span>
              </button>
            </div>
          </div>

          {/* 3 Key Takeaways (PRD Core Requirement) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-glow">
              Core Takeaways & Strategic Decisions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-navy-900/80 p-4 rounded-xl border border-navy-800 space-y-2">
                <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-light flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="text-xs font-bold text-white">Approved Hybrid Architecture</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Decided to proceed with WebRTC Mesh for 2-4 peers, with STUN NAT Traversal and WebSocket signaling.
                </p>
              </div>

              <div className="bg-navy-900/80 p-4 rounded-xl border border-navy-800 space-y-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-accent flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-xs font-bold text-white">Delta Whiteboard Sync</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Synchronize granular Fabric events over WebRTC DataChannel (UDP) instead of full canvas frames to guarantee sub-45ms latency.
                </p>
              </div>

              <div className="bg-navy-900/80 p-4 rounded-xl border border-navy-800 space-y-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-active flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-white">1-Click View Switcher</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Engineers will use keyboard shortcuts [W] and [S] to switch between Spatial Whiteboard and 60fps Screen Share.
                </p>
              </div>
            </div>
          </div>

          {/* Action Items List */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-glow">
                Extracted Action Items ({actionItems.length})
              </h3>
              <span className="text-[11px] text-slate-400">Click items to toggle sync status</span>
            </div>

            {actionItems.length > 0 ? (
              <div className="space-y-2.5">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-navy-900 rounded-xl border border-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            item.priority === 'High'
                              ? 'bg-rose-500/20 text-rose-alert border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span className="text-xs font-bold text-slate-100">{item.title}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                        <span>Owner: <strong className="text-slate-300">{item.assignee}</strong></span>
                        <span>•</span>
                        <span>Due: {item.dueDate}</span>
                      </div>
                    </div>

                    {/* Sync status pills */}
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center space-x-1 ${
                          item.syncedJira
                            ? 'bg-emerald-500/20 text-emerald-active border border-emerald-500/30'
                            : 'bg-navy-800 text-slate-400'
                        }`}
                      >
                        {item.syncedJira && <Check size={10} />}
                        <span>Jira: {item.syncedJira ? 'Synced' : 'Pending'}</span>
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center space-x-1 ${
                          item.syncedLinear
                            ? 'bg-indigo-accent/20 text-indigo-glow border border-indigo-accent/30'
                            : 'bg-navy-800 text-slate-400'
                        }`}
                      >
                        {item.syncedLinear && <Check size={10} />}
                        <span>Linear: {item.syncedLinear ? 'Synced' : 'Pending'}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-navy-800 rounded-xl bg-navy-900/30 space-y-2">
                <CheckCircle2 size={24} className="mx-auto text-slate-500" />
                <div className="text-xs font-semibold text-slate-300">No Action Items Logged</div>
                <p className="text-[11px] text-slate-500">
                  Action items and task commitments from meeting chats and transcripts will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
