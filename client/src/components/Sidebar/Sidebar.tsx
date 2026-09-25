import React from 'react';
import {
  Video,
  MessageSquare,
  Users,
  BarChart3,
  Download,
  Save,
} from 'lucide-react';

interface SidebarProps {
  isVideoOpen: boolean;
  setIsVideoOpen: (open: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isParticipantsOpen: boolean;
  setIsParticipantsOpen: (open: boolean) => void;
  isPollsOpen: boolean;
  setIsPollsOpen: (open: boolean) => void;
  onSaveSnapshot: () => void;
  onExportImage: () => void;
  unreadChatCount?: number;
  activePollsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isVideoOpen,
  setIsVideoOpen,
  isChatOpen,
  setIsChatOpen,
  isParticipantsOpen,
  setIsParticipantsOpen,
  isPollsOpen,
  setIsPollsOpen,
  onSaveSnapshot,
  onExportImage,
  unreadChatCount = 0,
  activePollsCount = 0,
}) => {
  return (
    <aside className="w-14 bg-white border-l border-slate-200 flex flex-col items-center py-3 justify-between z-20 select-none shadow-sm">
      {/* Top panel toggles */}
      <div className="flex flex-col space-y-2.5">
        {/* Video Grid Button */}
        <button
          onClick={() => setIsVideoOpen(!isVideoOpen)}
          className={`p-2.5 rounded-xl transition relative group ${
            isVideoOpen
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Bật/Tắt khung Video"
        >
          <Video size={18} />
          <span className="absolute right-14 bg-slate-900 text-[11px] text-white px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30 font-medium">
            Video & Audio
          </span>
        </button>

        {/* Live Chat Button */}
        <button
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            if (!isChatOpen) {
              setIsPollsOpen(false);
              setIsParticipantsOpen(false);
            }
          }}
          className={`p-2.5 rounded-xl transition relative group ${
            isChatOpen
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Mở trò chuyện"
        >
          <MessageSquare size={18} />
          {unreadChatCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
              {unreadChatCount}
            </span>
          )}
          <span className="absolute right-14 bg-slate-900 text-[11px] text-white px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30 font-medium">
            Trò chuyện
          </span>
        </button>

        {/* Live Polls Button */}
        <button
          onClick={() => {
            setIsPollsOpen(!isPollsOpen);
            if (!isPollsOpen) {
              setIsChatOpen(false);
              setIsParticipantsOpen(false);
            }
          }}
          className={`p-2.5 rounded-xl transition relative group ${
            isPollsOpen
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Mở khảo sát"
        >
          <BarChart3 size={18} />
          {activePollsCount > 0 && !isPollsOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
              {activePollsCount}
            </span>
          )}
          <span className="absolute right-14 bg-slate-900 text-[11px] text-white px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30 font-medium">
            Khảo sát
          </span>
        </button>

        {/* Participants Button */}
        <button
          onClick={() => {
            setIsParticipantsOpen(!isParticipantsOpen);
            if (!isParticipantsOpen) {
              setIsChatOpen(false);
              setIsPollsOpen(false);
            }
          }}
          className={`p-2.5 rounded-xl transition relative group ${
            isParticipantsOpen
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Danh sách người tham gia"
        >
          <Users size={18} />
          <span className="absolute right-14 bg-slate-900 text-[11px] text-white px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30 font-medium">
            Thành viên
          </span>
        </button>
      </div>

      {/* Bottom actions (Snapshot, Export) */}
      <div className="flex flex-col space-y-2.5">
        <button
          onClick={onSaveSnapshot}
          className="p-2.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition relative group"
          title="Lưu bản vẽ"
        >
          <Save size={18} />
          <span className="absolute right-14 bg-slate-900 text-[11px] text-white px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30 font-medium">
            Lưu bản vẽ
          </span>
        </button>

        <button
          onClick={onExportImage}
          className="p-2.5 rounded-xl text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition relative group"
          title="Xuất ảnh PNG"
        >
          <Download size={18} />
          <span className="absolute right-14 bg-slate-900 text-[11px] text-white px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition whitespace-nowrap shadow-md z-30 font-medium">
            Xuất PNG
          </span>
        </button>
      </div>
    </aside>
  );
};
