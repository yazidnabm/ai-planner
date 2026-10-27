import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { apiFetch } from '../lib/supabase.js';
import {
  todayISO,
  toLocalISO,
  formatTime,
  fmtDate,
  priorityMeta,
  deriveStatus,
  statusMeta,
} from '../lib/format.js';

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

// Start of week (Monday) from a local YYYY-MM-DD date
function startOfWeek(dateISO) {
  const d = new Date(`${dateISO}T00:00:00`);
  const day = (d.getDay() + 6) % 7; // Senin=0
  d.setDate(d.getDate() - day);
  return toLocalISO(d);
}

function addDays(dateISO, n) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
}

export default function Calendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayISO()));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null); // YYYY-MM-DD

  useEffect(() => {
    apiFetch('/tasks')
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const tasksByDay = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      (map[t.task_date] ||= []).push(t);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));
    }
    return map;
  }, [tasks]);

  const today = todayISO();
  const selectedTasks = selectedDay ? tasksByDay[selectedDay] || [] : [];

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft dark:bg-accent-soft-dark text-accent">
              <CalendarDays size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
              <p className="text-sm text-muted dark:text-muted-dark">
                {fmtDate(days[0])} — {fmtDate(days[6])}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart((w) => addDays(w, -7))} className="btn-ghost" aria-label="Minggu sebelumnya">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setWeekStart(startOfWeek(today))} className="btn-ghost text-sm">
              Hari ini
            </button>
            <button onClick={() => setWeekStart((w) => addDays(w, 7))} className="btn-ghost" aria-label="Minggu berikutnya">
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-muted dark:text-muted-dark">Memuat…</p>
        ) : error ? (
          <p className="card p-4 text-sm text-prio-high">{error}</p>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="grid grid-cols-7 divide-x divide-line dark:divide-line-dark">
              {days.map((day, i) => {
                const isToday = day === today;
                const dayTasks = tasksByDay[day] || [];
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`min-w-0 flex flex-col text-left transition-colors ${
                      isToday ? 'bg-accent-soft/50 dark:bg-accent-soft-dark/30' : ''
                    } hover:bg-line/30 dark:hover:bg-line-dark/30 ${
                      selectedDay === day ? 'ring-2 ring-inset ring-accent/50' : ''
                    }`}
                  >
                    {/* Header hari */}
                    <div className="border-b border-line dark:border-line-dark px-3 py-3 text-center">
                      <p className={`text-xs font-semibold uppercase ${isToday ? 'text-accent-hover dark:text-accent' : 'text-muted dark:text-muted-dark'}`}>
                        {DAY_NAMES[i]}
                      </p>
                      <p className={`font-mono text-xl font-semibold tabular ${isToday ? 'text-accent-hover dark:text-accent' : 'text-ink dark:text-ink-dark'}`}>
                        {Number(day.slice(8))}
                      </p>
                      {isToday && (
                        <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Hari ini
                        </span>
                      )}
                    </div>
                    {/* Isi hari */}
                    <div className="flex-1 space-y-1.5 p-2">
                      {dayTasks.length === 0 ? (
                        <div
                          className={`rounded-lg border border-dashed p-3 text-center text-xs ${
                            isToday
                              ? 'border-accent/40 text-accent'
                              : 'border-line dark:border-line-dark text-muted dark:text-muted-dark'
                          }`}
                        >
                          {isToday ? 'Belum ada jadwal' : '—'}
                        </div>
                      ) : (
                        dayTasks.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            className={`rounded-lg border p-2 ${
                              t.status === 'done'
                                ? 'border-line dark:border-line-dark bg-surface dark:bg-surface-dark opacity-60'
                                : 'border-line dark:border-line-dark bg-surface dark:bg-surface-dark'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityMeta(t.priority).dot}`} />
                              <p className={`truncate text-xs font-semibold ${t.status === 'done' ? 'line-through text-muted' : ''}`}>
                                {t.title}
                              </p>
                            </div>
                            {t.start_time && (
                              <p className="mt-1 font-mono text-[10px] tabular text-muted dark:text-muted-dark">
                                {formatTime(t.start_time)}
                                {t.end_time ? `–${formatTime(t.end_time)}` : ''}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                      {dayTasks.length > 3 && (
                        <p className="px-1 text-[10px] font-semibold text-muted dark:text-muted-dark">
                          +{dayTasks.length - 3} lagi
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Popup detail hari */}
        {selectedDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDay(null)} aria-hidden="true" />
            <div className="card relative w-full max-w-md p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
                    {selectedDay === today ? 'Hari ini' : 'Jadwal'}
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold tracking-tight">{fmtDate(selectedDay)}</h2>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  aria-label="Tutup"
                  className="rounded-lg p-1.5 text-muted dark:text-muted-dark hover:bg-line/40 dark:hover:bg-line-dark/40"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedTasks.length === 0 ? (
                <div className="mt-6 flex flex-col items-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-soft-dark text-accent">
                    <Sparkles size={20} />
                  </div>
                  <p className="mt-4 text-sm font-semibold">Tidak ada kegiatan</p>
                  <p className="mt-1 text-xs text-muted dark:text-muted-dark">
                    Hari ini kosong. Mau susun rencana dengan AI?
                  </p>
                  <Link to="/planner" onClick={() => setSelectedDay(null)} className="btn-primary mt-4">
                    <Sparkles size={16} />
                    Buat rencana
                  </Link>
                </div>
              ) : (
                <ul className="mt-5 space-y-2.5">
                  {selectedTasks.map((t) => {
                    const eff = deriveStatus(t);
                    const st = statusMeta(eff);
                    return (
                      <li key={t.id} className="rounded-xl border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${priorityMeta(t.priority).dot}`} />
                          <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${eff === 'done' ? 'line-through text-muted' : ''}`}>
                            {t.title}
                          </p>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.chip}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted dark:text-muted-dark">
                          {t.start_time && (
                            <span className="inline-flex items-center gap-1 font-mono tabular">
                              <Clock size={12} />
                              {formatTime(t.start_time)}
                              {t.end_time ? `–${formatTime(t.end_time)}` : ''}
                            </span>
                          )}
                          <span className="font-mono tabular">{t.duration_minutes} menit</span>
                          <span className="font-semibold">{priorityMeta(t.priority).label}</span>
                        </div>
                        {t.description && (
                          <p className="mt-1.5 text-xs text-muted dark:text-muted-dark">{t.description}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
