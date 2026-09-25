import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Shield } from 'lucide-react';
import { useUser } from '../../stores/user.store';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useUser();

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="w-full max-w-lg bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-indigo-600/20">
              MD
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Đăng nhập MeetDraw</h2>
              <div className="text-[11px] text-emerald-600 flex items-center space-x-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Trực tuyến</span>
              </div>
            </div>
          </div>

          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
            Yêu cầu xác thực
          </span>
        </div>

        {/* Notice for required login */}
        {searchParams.get('redirect') && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-700 flex items-start space-x-2">
            <Shield size={16} className="flex-shrink-0 mt-0.5 text-indigo-600" />
            <span>
              <strong>Yêu cầu đăng nhập:</strong> Vui lòng đăng nhập tài khoản trước khi vào phòng họp.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
            {error}
          </div>
        )}

        {/* Custom Login Form */}
        <form onSubmit={handleCustomLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@vidu.com"
              className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-xs py-3 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2"
          >
            <LogIn size={15} />
            <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-1">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline font-semibold">
            Đăng ký tài khoản
          </Link>
        </div>
      </div>
    </div>
  );
};
