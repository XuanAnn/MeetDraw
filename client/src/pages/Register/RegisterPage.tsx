import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useUser } from '../../stores/user.store';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useUser();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({ username, email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-center items-center px-4 font-sans">
      <div className="w-full max-w-md glass-panel border border-navy-800 p-8 rounded-3xl shadow-2xl space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={14} />
          <span>Quay lại Đăng nhập</span>
        </Link>

        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-accent to-indigo-light flex items-center justify-center font-black text-white shadow-lg shadow-indigo-accent/30">
            MD
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Đăng ký tài khoản</h2>
            <p className="text-xs text-slate-400">Tạo tài khoản để tham gia phòng họp và vẽ tương tác</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-alert/15 border border-rose-alert/30 rounded-xl text-xs text-rose-alert font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Họ và tên</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full bg-navy-900 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-navy-700 focus:outline-none focus:border-indigo-light"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (tối thiểu 6 ký tự)"
              className="w-full bg-navy-900 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-navy-700 focus:outline-none focus:border-indigo-light"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-accent hover:bg-indigo-light font-bold text-white text-xs py-3 rounded-xl transition shadow-xl shadow-indigo-accent/30 flex items-center justify-center space-x-2"
          >
            <UserPlus size={15} />
            <span>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-indigo-light hover:underline font-semibold">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};
