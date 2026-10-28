import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, Clock, Trash2, ListTodo, ChevronDown, ChevronUp, MousePointerClick } from 'lucide-react';
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
  const [confirm, setConfirm] = useState(null); // { type: 'single'|'all'|'selected', task? }
  const [now, setNow] = useState(() => new Date());
  const [showOverdue, setShowOverdue] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [selectMode, setSelectMode] = useState(false);

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

  // Manual toggle only marks "Selesai" / cancels "Selesai".
  // "Berjalan" is derived automatically from the clock (see deriveStatus).
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

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteTask = async (task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
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
      setSelected(new Set());
    } catch (e) {
      setError(e.message);
      load();
    }
  };

  const deleteSelected = async (ids) => {
    setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
    exitSelectMode();
    try {
      await apiFetch('/tasks/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });
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
    else if (type === 'selected') await deleteSelected([...selected]);
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

  // Split visible tasks into three buckets:
  //   active  — pending tasks on today/upcoming dates (always shown)
  //   overdue — pending tasks on past dates (collapsed by default)
  //   done    — completed tasks (collapsed by default)
  // Keeps the top of the page focused on what still needs doing.
  const { active, overdue, overdueCount, done, doneCount } = useMemo(() => {
    const active = [];
    const overdue = [];
    const done = [];
    for (const [dateISO, dayTasks] of groups.entries()) {
      const pending = [];
      for (const t of dayTasks) {
        (deriveStatus(t, now) === 'done' ? done : pending).push(t);
      }
      if (pending.length === 0) continue;
      (dateGroupLabel(dateISO) === 'Terlewat' ? overdue : active).push([dateISO, pending]);
    }
    const overdueCount = overdue.reduce((n, [, t]) => n + t.length, 0);
    return { active, overdue, overdueCount, done, doneCount: done.length };
  }, [groups, now]);

  // Group completed tasks by date for consistent rendering.
  const doneGroups = useMemo(() => {
    const m = new Map();
    for (const t of done) {
      if (!m.has(t.task_date)) m.set(t.task_date, []);
      m.get(t.task_date).push(t);
    }
    return [...m.entries()];
  }, [done]);

  const renderGroup = (dateISO, dayTasks) => (
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
          const isSelected = selected.has(t.id);
          const isManualDone = t.status === 'done';
          return (
            <li key={t.id} className="card flex items-center gap-4 p-4">
              {selectMode ? (
                <button
                  onClick={() => toggleSelect(t.id)}
                  aria-label="Pilih task"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    isSelected
                      ? 'border-accent bg-accent text-white'
                      : 'border-line dark:border-line-dark hover:border-accent'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                </button>
              ) : effStatus === 'done' && !isManualDone ? (
                <span
                  aria-label="Selesai otomatis"
                  title="Selesai otomatis (jadwal selesai)"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-accent bg-accent text-white"
                >
                  <Check size={14} />
                </span>
              ) : effStatus === 'done' ? (
                <button
                  onClick={() => toggleStatus(t)}
                  aria-label="Batal selesai"
                  title="Batal selesai"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-accent bg-accent text-white transition-colors hover:opacity-80"
                >
                  <Check size={14} />
                </button>
              ) : (
                <button
                  onClick={() => toggleStatus(t)}
                  aria-label="Tandai selesai"
                  title="Tandai selesai"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line transition-colors hover:border-accent dark:border-line-dark"
                />
              )}

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
  );

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
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
            {selectMode ? (
              <>
                <button onClick={exitSelectMode} className="btn-ghost text-sm">
                  Batal
                </button>
                <button
                  onClick={() => selected.size > 0 && setConfirm({ type: 'selected' })}
                  disabled={selected.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-prio-high px-3 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={16} />
                  Hapus ({selected.size})
                </button>
              </>
            ) : (
              <>
                {tasks.length > 0 && (
                  <>
                    <button
                      onClick={() => setConfirm({ type: 'all' })}
                      aria-label="Hapus semua task"
                      title="Hapus semua task"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-prio-high hover:bg-prio-high hover:text-white dark:border-line-dark transition-colors"
                    >
                      <Trash2 size={16} />
                      Hapus semua
                    </button>
                    <button
                      onClick={() => setSelectMode(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted dark:text-muted-dark hover:bg-line/40 dark:hover:bg-line-dark/40 transition-colors"
                    >
                      <MousePointerClick size={16} />
                      Pilih
                    </button>
                  </>
                )}
                <Link to="/planner" className="btn-primary">
                  <Plus size={18} />
                  Rencana baru
                </Link>
              </>
            )}
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
            {active.map(([dateISO, dayTasks]) => renderGroup(dateISO, dayTasks))}

            {overdue.length > 0 && (
              <div className="border-t border-line pt-4 dark:border-line-dark">
                <button
                  onClick={() => setShowOverdue((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted dark:text-muted-dark transition-colors hover:bg-line/40 dark:hover:bg-line-dark/40"
                >
                  {showOverdue ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showOverdue ? 'Sembunyikan' : 'Lihat'} task terlewat ({overdueCount})
                </button>
                {showOverdue && (
                  <div className="mt-4 space-y-6">
                    {overdue.map(([dateISO, dayTasks]) => renderGroup(dateISO, dayTasks))}
                  </div>
                )}
              </div>
            )}

            {filter === 'done' ? (
              <div className="space-y-6">
                {doneGroups.map(([dateISO, dayTasks]) => renderGroup(dateISO, dayTasks))}
              </div>
            ) : (
              done.length > 0 && (
                <div className="border-t border-line pt-4 dark:border-line-dark">
                  <button
                    onClick={() => setShowDone((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted dark:text-muted-dark transition-colors hover:bg-line/40 dark:hover:bg-line-dark/40"
                  >
                    {showDone ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showDone ? 'Sembunyikan' : 'Lihat'} yang selesai ({doneCount})
                  </button>
                  {showDone && (
                    <div className="mt-4 space-y-6">
                      {doneGroups.map(([dateISO, dayTasks]) => renderGroup(dateISO, dayTasks))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.type === 'all'
            ? 'Hapus semua task?'
            : confirm?.type === 'selected'
              ? `Hapus ${selected.size} task terpilih?`
              : 'Hapus task?'
        }
        message={
          confirm?.type === 'all'
            ? `Semua ${tasks.length} task akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : confirm?.type === 'selected'
              ? `${selected.size} task yang kamu pilih akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
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
