import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './stores/user.store';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { SessionTerminatedModal } from './components/Modal/SessionTerminatedModal';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { GreenRoomPage } from './pages/GreenRoom/GreenRoomPage';
import { WhiteboardRoomPage } from './pages/WhiteboardRoom/WhiteboardRoomPage';
import { PostMeetingSummaryPage } from './pages/PostMeetingSummary/PostMeetingSummaryPage';
import { LoginPage } from './pages/Login/LoginPage';
import { RegisterPage } from './pages/Register/RegisterPage';
import { ProjectHistoryPage } from './pages/ProjectHistory/ProjectHistoryPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

const ServerMonitorEmbed: React.FC = () => {
  const monitorUrl =
    window.location.hostname === 'localhost'
      ? 'http://localhost:5000/monitor'
      : 'https://meetgold.onrender.com/monitor';

  useEffect(() => {
    window.location.href = monitorUrl;
  }, [monitorUrl]);

  return (
    <div className="h-screen w-screen bg-navy-950 flex flex-col items-center justify-center text-white">
      <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-semibold">Đang chuyển tiếp tới Server Room Monitor...</p>
      <a href={monitorUrl} className="mt-3 text-xs text-sky-400 underline font-mono">
        Bấm vào đây nếu trình duyệt không tự chuyển tiếp
      </a>
    </div>
  );
};

export const App: React.FC = () => {
  const [sessionTerminated, setSessionTerminated] = useState<{ isOpen: boolean; reason: string }>({
    isOpen: false,
    reason: '',
  });

  useEffect(() => {
    const handleTerminated = (e: any) => {
      setSessionTerminated({
        isOpen: true,
        reason: e.detail?.reason || 'Tài khoản của bạn đã được đăng nhập từ một thiết bị hoặc trình duyệt khác.',
      });
    };

    window.addEventListener('session-terminated', handleTerminated);
    return () => window.removeEventListener('session-terminated', handleTerminated);
  }, []);
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/green-room/:id"
            element={
              <ProtectedRoute>
                <GreenRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:id"
            element={
              <ProtectedRoute>
                <WhiteboardRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/summary/:id"
            element={
              <ProtectedRoute>
                <PostMeetingSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <ProjectHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monitor"
            element={<ServerMonitorEmbed />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Single-Session Kick Modal */}
        <SessionTerminatedModal
          isOpen={sessionTerminated.isOpen}
          reason={sessionTerminated.reason}
        />
      </BrowserRouter>
    </UserProvider>
  );
};

export default App;
