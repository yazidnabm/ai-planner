const PRIORITY = {
  low: { label: 'Rendah', dot: 'bg-prio-low', text: 'text-prio-low' },
  medium: { label: 'Sedang', dot: 'bg-prio-medium', text: 'text-prio-medium' },
  high: { label: 'Tinggi', dot: 'bg-prio-high', text: 'text-prio-high' },
};

const STATUS = {
  todo: { label: 'Belum mulai', dot: 'bg-prio-low', chip: 'bg-line/50 dark:bg-line-dark/50 text-muted dark:text-muted-dark' },
  in_progress: { label: 'Berjalan', dot: 'bg-prio-medium', chip: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  done: { label: 'Selesai', dot: 'bg-accent', chip: 'bg-accent-soft dark:bg-accent-soft-dark text-accent-hover dark:text-accent' },
};

export function priorityMeta(p) {
  return PRIORITY[p] || PRIORITY.medium;
}

export function statusMeta(s) {
  return STATUS[s] || STATUS.todo;
}

/**
 * Parse a task's local wall-clock time into an absolute Date.
 * - Tolerates "HH:MM" and "HH:MM:SS" (AI/DB store both shapes).
 * - Anchored to WIB (UTC+7), the app's canonical timezone, so status is
 *   correct regardless of the viewer's device timezone.
 * Returns null when either part is missing or malformed.
 */
function parseTaskTime(dateISO, time) {
  if (!dateISO || !time) return null;
  const m = String(time).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = String(m[1]).padStart(2, '0');
  const mm = m[2];
  const ss = m[3] || '00';
  const d = new Date(`${dateISO}T${hh}:${mm}:${ss}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Compute a task's effective status from the current time ("live" status).
 * Rules:
 * - Manual "Selesai" (task.status === 'done') ALWAYS wins — never reverts to in progress.
 * - Past end_time  → Done (automatic).
 * - Within start..end → In progress.
 * - Before start → Not started.
 * - Task without a full schedule → fall back to DB status.
 */
export function deriveStatus(task, now = new Date()) {
  // Manual "Selesai" is respected.
  if (task.status === 'done') return 'done';

  const start = parseTaskTime(task.task_date, task.start_time);
  const end = parseTaskTime(task.task_date, task.end_time);
  const t = now.getTime();

  if (start && end) {
    if (t >= end.getTime()) return 'done';               // past end time
    if (t >= start.getTime()) return 'in_progress';       // within range
    return 'todo';                                         // before start
  }
  if (start && !end && t >= start.getTime()) return 'in_progress';

  // No schedule → fall back to DB status (only distinguish done vs the rest).
  return task.status === 'in_progress' ? 'in_progress' : 'todo';
}

export function formatTime(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatMinutes(mins) {
  const m = Number(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}j ${r}m` : `${h}j`;
}

export function todayISO() {
  // LOCAL date (not UTC). toISOString() shifts the day for timezones behind
  // UTC (e.g. WIB/UTC+7), which would turn "today" into "yesterday".
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toLocalISO(d) {
  const tz = new Date(d).getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

export function fmtDate(d) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function fmtDateShort(d) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}
