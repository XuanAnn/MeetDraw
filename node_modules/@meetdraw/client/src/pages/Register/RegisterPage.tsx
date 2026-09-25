import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-xl space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft size={14} />
          <span>Quay lại Đăng nhập</span>
        </Link>

        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-indigo-600/20">
            MD
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Đăng ký tài khoản</h2>
            <p className="text-xs text-slate-500">Tạo tài khoản để tham gia phòng họp và vẽ tương tác</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (tối thiểu 6 ký tự)"
              className="w-full bg-slate-50 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-xs py-3 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2"
          >
            <UserPlus size={15} />
            <span>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-semibold">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};
