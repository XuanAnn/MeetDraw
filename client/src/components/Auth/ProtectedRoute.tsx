import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../../stores/user.store';
import { Sparkles } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, currentUser } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-accent text-white flex items-center justify-center animate-bounce shadow-xl shadow-indigo-accent/40">
          <Sparkles size={24} />
        </div>
        <div className="text-center space-y-1">
          <div className="text-sm font-bold text-white">MeetDraw</div>
          <div className="text-xs text-slate-400">Đang kiểm tra phiên làm việc...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />;
  }

  return <>{children}</>;
};
