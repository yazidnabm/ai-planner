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
 * Menghitung status efektif task berdasarkan waktu sekarang (status "hidup").
 * Aturan:
 * - "Selesai" manual (task.status === 'done') SELALU menang — tidak kembali ke Berjalan.
 * - Lewat end_time  → Selesai (otomatis).
 * - Dalam rentang start..end → Berjalan.
 * - Sebelum start → Belum mulai.
 * - Task tanpa jadwal lengkap → fallback ke status DB.
 */
export function deriveStatus(task, now = new Date()) {
  // Selesai manual dihormati.
  if (task.status === 'done') return 'done';

  const start = task.task_date && task.start_time
    ? new Date(`${task.task_date}T${task.start_time}:00`)
    : null;
  const end = task.task_date && task.end_time
    ? new Date(`${task.task_date}T${task.end_time}:00`)
    : null;
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
  // Tanggal LOKAL (bukan UTC). toISOString() bergeser hari untuk zona waktu
  // di belakang UTC (mis. WIB/UTC+7), sehingga "hari ini" bisa jadi kemarin.
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
