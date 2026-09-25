import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, LogOut, Home } from 'lucide-react';
import { useUser } from '../../stores/user.store';

interface SessionTerminatedModalProps {
  isOpen: boolean;
  reason?: string;
}

export const SessionTerminatedModal: React.FC<SessionTerminatedModalProps> = ({
  isOpen,
  reason = 'Tài khoản của bạn đã được đăng nhập từ một thiết bị hoặc trình duyệt khác.',
}) => {
  const navigate = useNavigate();
  const { logout } = useUser();

  if (!isOpen) return null;

  const handleReload = () => {
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Amber accent glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
          <ShieldAlert size={34} />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-wide">
            Phiên đăng nhập đã kết thúc
          </h2>
          <p className="text-sm text-gray-300 font-medium leading-relaxed">
            {reason}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed pt-1">
            Để đảm bảo an toàn tài khoản và băng thông phòng họp, hệ thống chỉ cho phép một tài khoản hoạt động trên một trình duyệt tại một thời điểm.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col space-y-2.5">
          <button
            onClick={handleReload}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/30"
          >
            <RefreshCw size={14} />
            <span>Tiếp tục trên trình duyệt này (Lấy lại phiên)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleGoHome}
              className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition border border-gray-700"
            >
              <Home size={13} />
              <span>Về Trang chủ</span>
            </button>

            <button
              onClick={handleLogout}
              className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-rose-950/60 hover:text-rose-300 text-gray-400 text-xs font-medium flex items-center justify-center space-x-1.5 transition border border-gray-700 hover:border-rose-800/60"
            >
              <LogOut size={13} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
