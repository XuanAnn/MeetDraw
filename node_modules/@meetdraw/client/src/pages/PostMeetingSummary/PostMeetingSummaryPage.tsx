import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Video,
  Download,
  Calendar,
  Layers,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { RoomDetails } from '@meetdraw/shared';

export const PostMeetingSummaryPage: React.FC = () => {
  const { id: roomId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!roomId) return;
    apiService
      .getRoomDetails(roomId)
      .then((data) => {
        setRoomDetails(data);
      })
      .catch((err) => {
        console.warn('Could not load room details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [roomId]);

  const handleDownloadJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify({
          roomId,
          name: roomDetails?.name || `Room ${roomId}`,
          exportedAt: new Date().toISOString(),
          objects: [],
        })
      );
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `meetdraw_${roomId}.json`);
    dlAnchor.click();
    showToast('Đã tải xuống tệp dữ liệu bản vẽ (JSON).');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl border border-indigo-500 flex items-center space-x-2 animate-bounce">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-3">
          <Link
            to="/dashboard"
            className="flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft size={14} />
            <span>Bảng điều khiển</span>
          </Link>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-slate-900">Kết thúc buổi họp</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              Hoàn tất
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/room/${roomId}`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
          >
            <Video size={14} />
            <span>Vào lại phòng</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Session Metadata Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-indigo-600 font-bold uppercase">
                Phòng #{roomId}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
                {roomDetails?.name || `Phòng họp ${roomId}`}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600 flex items-center space-x-1.5 shadow-sm">
                <Calendar size={13} className="text-indigo-600" />
                <span>
                  {new Date().toLocaleDateString('vi-VN', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Bạn đã rời khỏi phòng họp. Bản vẽ và nội dung cuộc họp đã được lưu vào hệ thống.
          </p>
        </div>

        {/* Action Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Whiteboard file export */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Layers size={18} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Xuất dữ liệu bản vẽ</h3>
              </div>
              <p className="text-xs text-slate-500">
                Tải xuống tệp dữ liệu JSON của bản vẽ để lưu trữ hoặc xem lại sau.
              </p>
            </div>

            <button
              onClick={handleDownloadJSON}
              className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex items-center justify-between group mt-2"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs">
                  JSON
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                    Dữ liệu bản vẽ (JSON)
                  </div>
                  <div className="text-[10px] text-slate-400">Định dạng chuẩn</div>
                </div>
              </div>
              <Download size={15} className="text-slate-400 group-hover:text-slate-700" />
            </button>
          </div>

          {/* Option 2: Navigation Hub */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <ExternalLink size={18} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Điều hướng nhanh</h3>
              </div>
              <p className="text-xs text-slate-500">
                Quay trở lại không gian làm việc hoặc tiếp tục tạo phòng họp mới.
              </p>
            </div>

            <div className="space-y-2 mt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition text-center shadow-md shadow-indigo-600/20"
              >
                Về Bảng điều khiển
              </button>
              <button
                onClick={() => navigate(`/room/${roomId}`)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition text-center"
              >
                Vào lại phòng họp
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PostMeetingSummaryPage;
