import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, ArrowLeft, Shield, Sparkles, UserCheck, ArrowRight } from 'lucide-react';
import { useUser } from '../../stores/user.store';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, quickLogin } = useUser();

  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="w-full max-w-lg glass-panel border border-navy-800 p-8 rounded-3xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-accent to-indigo-light flex items-center justify-center font-black text-white shadow-lg shadow-indigo-accent/30">
              MD
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">Đăng nhập MeetDraw</h2>
              <div className="text-[11px] text-emerald-active flex items-center space-x-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-active animate-pulse" />
                <span>Trực tuyến</span>
              </div>
            </div>
          </div>

          <span className="text-[11px] bg-navy-900 text-slate-400 px-2.5 py-1 rounded-lg border border-navy-800">
            Yêu cầu xác thực
          </span>
        </div>

        {/* Notice for required login */}
        {searchParams.get('redirect') && (
          <div className="p-3 bg-indigo-accent/15 border border-indigo-accent/30 rounded-xl text-xs text-indigo-glow flex items-start space-x-2">
            <Shield size={16} className="flex-shrink-0 mt-0.5 text-indigo-light" />
            <span>
              <strong>Yêu cầu đăng nhập:</strong> Vui lòng đăng nhập tài khoản trước khi vào phòng họp.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-alert/15 border border-rose-alert/30 rounded-xl text-xs text-rose-alert font-medium">
            {error}
          </div>
        )}

        {/* Custom Login Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Địa chỉ Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@vidu.com"
              className="w-full bg-navy-900 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-navy-700 focus:outline-none focus:border-indigo-light"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-navy-900 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-navy-700 focus:outline-none focus:border-indigo-light"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-accent hover:bg-indigo-light font-bold text-white text-xs py-3 rounded-xl transition shadow-xl shadow-indigo-accent/30 flex items-center justify-center space-x-2"
          >
            <LogIn size={15} />
            <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-1">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-indigo-light hover:underline font-semibold">
            Đăng ký tài khoản
          </Link>
        </div>
      </div>
    </div>
  );
};
