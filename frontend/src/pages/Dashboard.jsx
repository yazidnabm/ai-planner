import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Plus,
  ListTodo,
  CheckCircle2,
  Clock,
  Flame,
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../lib/supabase.js';
import { todayISO, fmtDate, formatTime, priorityMeta, statusMeta } from '../lib/format.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function Stat({ icon: Icon, tint, label, value, hint }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted dark:text-muted-dark">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tint}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tabular">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted dark:text-muted-dark">{hint}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/tasks')
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const today = todayISO();
  const todaysTasks = tasks.filter((t) => t.task_date === today);
  const doneToday = todaysTasks.filter((t) => t.status === 'done').length;
  const totalMinutes = todaysTasks.reduce((s, t) => s + (t.duration_minutes || 0), 0);
  const highToday = todaysTasks.filter((t) => t.priority === 'high').length;
  const upcoming = tasks
    .filter((t) => t.task_date >= today && t.status !== 'done')
    .sort((a, b) => (a.task_date + a.start_time || '').localeCompare(b.task_date + b.start_time || ''))
    .slice(0, 5);

  const progress = todaysTasks.length
    ? Math.round((doneToday / todaysTasks.length) * 100)
    : 0;

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {greeting()}
                {name ? `, ${name}` : ''}
              </h1>
              <p className="text-sm text-muted dark:text-muted-dark">{fmtDate(today)}</p>
            </div>
          </div>
          <Link to="/planner" className="btn-primary">
            <Sparkles size={18} />
            <span className="hidden sm:inline">Buat rencana AI</span>
            <span className="sm:hidden">Rencana</span>
          </Link>
        </header>

        {loading ? (
          <p className="text-sm text-muted dark:text-muted-dark">Memuat…</p>
        ) : error ? (
          <p className="card p-4 text-sm text-prio-high">{error}</p>
        ) : tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Ringkasan hari ini — satu blok terpadu */}
            <section className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-line px-5 py-3 dark:border-line-dark">
                <h2 className="text-sm font-bold tracking-tight">Ringkasan hari ini</h2>
                <span className="font-mono text-xs tabular text-muted dark:text-muted-dark">
                  {doneToday}/{todaysTasks.length} task selesai
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-line dark:divide-line-dark md:grid-cols-4">
                <Stat
                  icon={ListTodo}
                  tint="bg-accent-soft dark:bg-accent-soft-dark text-accent-hover dark:text-accent"
                  label="Task hari ini"
                  value={todaysTasks.length}
                />
                <Stat
                  icon={CheckCircle2}
                  tint="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  label="Selesai"
                  value={doneToday}
                  hint={`${progress}% dari hari ini`}
                />
                <Stat
                  icon={Clock}
                  tint="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  label="Total durasi"
                  value={`${Math.round(totalMinutes / 60)}j`}
                  hint={`${totalMinutes} menit`}
                />
                <Stat
                  icon={Flame}
                  tint="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                  label="Prioritas tinggi"
                  value={highToday}
                />
              </div>
              <div className="border-t border-line px-5 py-4 dark:border-line-dark">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">Progres hari ini</span>
                  <span className="font-mono tabular text-muted dark:text-muted-dark">{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-line dark:bg-line-dark overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Agenda berikutnya */}
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">Agenda berikutnya</h2>
                <Link to="/tasks" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
                  Semua task <ArrowRight size={16} />
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <div className="card p-6 text-center text-sm text-muted dark:text-muted-dark">
                  Tidak ada task terjadwal.
                </div>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((t) => (
                    <li key={t.id} className="card flex items-center gap-4 p-4">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityMeta(t.priority).dot}`}
                        title={priorityMeta(t.priority).label}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${t.status === 'done' ? 'line-through text-muted' : ''}`}>
                          {t.title}
                        </p>
                        <p className="text-xs text-muted dark:text-muted-dark">
                          {fmtDate(t.task_date)}
                          {t.start_time ? ` · ${formatTime(t.start_time)}` : ''}
                        </p>
                      </div>
                      <span className="font-mono text-xs tabular text-muted dark:text-muted-dark">
                        {statusMeta(t.status).label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

function EmptyState() {
  const examples = [
    'Besok saya ada meeting jam 9 pagi, sisakan waktu olahraga',
    'Siapkan presentasi untuk Jumat: riset, draft, dan latihan',
    'Rencanakan minggu belajar: 1 jam bahasa Inggris tiap hari',
  ];
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-soft-dark text-accent">
        <Sparkles size={24} />
      </div>
      <h2 className="mt-5 text-xl font-bold tracking-tight">Belum ada rencana</h2>
      <p className="mt-2 max-w-md text-sm text-muted dark:text-muted-dark">
        Tulis tujuanmu dengan bahasa sehari-hari, dan AI akan menyusun jadwalnya untukmu.
      </p>

      <div className="mt-6 w-full max-w-md">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
          Coba salah satu contoh
        </p>
        <div className="flex flex-col gap-2">
          {examples.map((ex) => (
            <Link
              key={ex}
              to={`/planner?goal=${encodeURIComponent(ex)}`}
              className="group flex items-center gap-2 rounded-xl border border-line dark:border-line-dark bg-surface dark:bg-surface-dark px-4 py-3 text-left text-sm text-muted dark:text-muted-dark transition-colors hover:border-accent hover:text-ink dark:hover:text-ink-dark"
            >
              <span className="truncate">{ex}</span>
              <ArrowRight size={16} className="shrink-0 text-accent opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>

      <Link to="/planner" className="btn-primary mt-6">
        <Plus size={18} />
        Buat rencana pertamamu
      </Link>
    </div>
  );
}
