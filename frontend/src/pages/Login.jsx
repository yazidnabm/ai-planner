import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email atau kata sandi salah.'
          : err.message
      );
      return;
    }
    navigate('/');
  };

  return (
    <AuthLayout>
      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Masuk</h1>
          <p className="mt-1.5 text-sm text-muted dark:text-muted-dark">
            Lanjutkan rencana yang sudah kamu susun.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Kata sandi
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl bg-prio-high/10 px-3.5 py-2.5 text-sm text-prio-high">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Memproses…' : 'Masuk'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted dark:text-muted-dark">
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-accent hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
