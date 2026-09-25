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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Soft accent glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert size={34} />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Phiên đăng nhập đã kết thúc
          </h2>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            {reason}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed pt-1">
            Để đảm bảo an toàn tài khoản và băng thông phòng họp, hệ thống chỉ cho phép một tài khoản hoạt động trên một trình duyệt tại một thời điểm.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col space-y-2.5">
          <button
            onClick={handleReload}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-sm"
          >
            <RefreshCw size={14} />
            <span>Tiếp tục trên trình duyệt này (Lấy lại phiên)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleGoHome}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition border border-slate-200"
            >
              <Home size={13} />
              <span>Về Trang chủ</span>
            </button>

            <button
              onClick={handleLogout}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-medium flex items-center justify-center space-x-1.5 transition border border-slate-200 hover:border-rose-200"
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
