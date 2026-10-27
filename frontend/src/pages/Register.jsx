import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordInput from '../components/PasswordInput.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }
    // Jika konfirmasi email aktif, session null
    if (!data.session) {
      setError('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.');
      return;
    }
    navigate('/');
  };

  return (
    <AuthLayout>
      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Buat akun</h1>
          <p className="mt-1.5 text-sm text-muted dark:text-muted-dark">
            Tulis tujuanmu, biar AI yang menyusun jadwalnya.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">
              Nama
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Nama lengkap"
            />
          </div>
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
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              required
            />
          </div>

          {error && (
            <p className="rounded-xl bg-prio-high/10 px-3.5 py-2.5 text-sm text-prio-high">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Memproses…' : 'Daftar'}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted dark:text-muted-dark">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
