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
