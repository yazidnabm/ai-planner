import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, Clock, Trash2, ListTodo } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { apiFetch } from '../lib/supabase.js';
import { formatTime, formatMinutes, priorityMeta, statusMeta, deriveStatus, fmtDate, todayISO } from '../lib/format.js';

const FILTERS = ['all', 'todo', 'in_progress', 'done'];

function dateGroupLabel(dateISO) {
  const today = todayISO();
  if (dateISO === today) return 'Hari ini';
  const d = new Date(`${dateISO}T00:00:00`);
  const t = new Date(`${today}T00:00:00`);
  const diff = Math.round((d - t) / 86400000);
  if (diff === 1) return 'Besok';
  if (diff > 1) return 'Mendatang';
  return 'Terlewat';
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null); // { type: 'single'|'all', task?, }
  const [now, setNow] = useState(() => new Date());

  const load = () => {
    setLoading(true);
    apiFetch('/tasks')
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Tick every 30s so auto status ("Belum mulai" → "Berjalan" → "Selesai")
  // updates without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Toggle manual hanya menandai "Selesai" / membatalkan "Selesai".
  // Status "Berjalan" ditentukan otomatis dari jam (lihat deriveStatus).
  const toggleStatus = async (task) => {
    const eff = deriveStatus(task, now);
    const next = eff === 'done' ? 'todo' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    try {
      await apiFetch(`/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  const deleteTask = async (task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await apiFetch(`/tasks/${task.id}`, { method: 'DELETE' });
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  const deleteAll = async () => {
    try {
      await apiFetch('/tasks', { method: 'DELETE' });
      setTasks([]);
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  const confirmAction = async () => {
    if (!confirm) return;
    const { type, task } = confirm;
    if (type === 'single') await deleteTask(task);
    else if (type === 'all') await deleteAll();
    setConfirm(null);
  };

  const visible = filter === 'all' ? tasks : tasks.filter((t) => deriveStatus(t, now) === filter);

  // Group by date, sorted by date + time
  const groups = useMemo(() => {
    const sorted = [...visible].sort(
      (a, b) => (a.task_date + (a.start_time || '99:99')).localeCompare(b.task_date + (b.start_time || '99:99'))
    );
    const map = new Map();
    for (const t of sorted) {
      if (!map.has(t.task_date)) map.set(t.task_date, []);
      map.get(t.task_date).push(t);
    }
    return map;
  }, [visible]);

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft dark:bg-accent-soft-dark text-accent">
              <ListTodo size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
              <p className="text-sm text-muted dark:text-muted-dark">
                {tasks.length} task total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {tasks.length > 0 && (
              <button
                onClick={() => setConfirm({ type: 'all' })}
                aria-label="Hapus semua task"
                title="Hapus semua task"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-prio-high hover:bg-prio-high hover:text-white dark:border-line-dark transition-colors"
              >
                <Trash2 size={16} />
                Hapus semua
              </button>
            )}
            <Link to="/planner" className="btn-primary">
              <Plus size={18} />
              Rencana baru
            </Link>
          </div>
        </header>

        {/* Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                filter === f
                  ? 'bg-accent text-white'
                  : 'border border-line dark:border-line-dark text-muted dark:text-muted-dark hover:bg-line/40 dark:hover:bg-line-dark/40'
              }`}
            >
              {f === 'all' ? 'Semua' : statusMeta(f).label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted dark:text-muted-dark">Memuat…</p>
        ) : error ? (
          <p className="card p-4 text-sm text-prio-high">{error}</p>
        ) : groups.size === 0 ? (
          <div className="card p-10 text-center text-sm text-muted dark:text-muted-dark">
            Tidak ada task. <Link to="/planner" className="font-semibold text-accent">Buat rencana</Link>.
          </div>
        ) : (
          <div className="space-y-6">
            {[...groups.entries()].map(([dateISO, dayTasks]) => (
              <section key={dateISO}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted dark:text-muted-dark">
                    {dateGroupLabel(dateISO)}
                  </h2>
                  <span className="text-xs text-muted dark:text-muted-dark">
                    {fmtDate(dateISO)} · {dayTasks.length} task
                  </span>
                </div>
                <ul className="space-y-2">
                  {dayTasks.map((t) => {
                    const effStatus = deriveStatus(t, now);
                    const status = statusMeta(effStatus);
                    return (
                    <li key={t.id} className="card flex items-center gap-4 p-4">
                      <button
                        onClick={() => toggleStatus(t)}
                        aria-label="Ubah status"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          effStatus === 'done'
                            ? 'border-accent bg-accent text-white'
                            : 'border-line dark:border-line-dark hover:border-accent'
                        }`}
                      >
                        {effStatus === 'done' && <Check size={14} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${effStatus === 'done' ? 'line-through text-muted dark:text-muted-dark' : ''}`}>
                          {t.title}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted dark:text-muted-dark">
                          {t.start_time && (
                            <span className="inline-flex items-center gap-1 font-mono tabular">
                              <Clock size={12} /> {formatTime(t.start_time)}
                              {t.end_time ? `–${formatTime(t.end_time)}` : ''}
                            </span>
                          )}
                          <span className="font-mono tabular">{formatMinutes(t.duration_minutes)}</span>
                        </p>
                      </div>

                      <span
                        className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.chip}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>

                      <span
                        className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${priorityMeta(t.priority).text} bg-line/50 dark:bg-line-dark/50`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${priorityMeta(t.priority).dot}`} />
                        {priorityMeta(t.priority).label}
                      </span>

                      <button
                        onClick={() => setConfirm({ type: 'single', task: t })}
                        aria-label="Hapus"
                        className="text-muted dark:text-muted-dark hover:text-prio-high"
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'all' ? 'Hapus semua task?' : 'Hapus task?'}
        message={
          confirm?.type === 'all'
            ? `Semua ${tasks.length} task akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : `"${confirm?.task?.title}" akan dihapus permanen.`
        }
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={confirmAction}
        onCancel={() => setConfirm(null)}
      />
    </Layout>
  );
}
