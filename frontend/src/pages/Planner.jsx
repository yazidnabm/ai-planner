import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, Check, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { apiFetch } from '../lib/supabase.js';
import { todayISO, fmtDate, formatTime, formatMinutes, priorityMeta } from '../lib/format.js';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const EXAMPLES = [
  'Besok saya ada meeting jam 9 pagi, sisakan waktu olahraga dan makan siang',
  'Siapkan presentasi untuk Jumat: riset, draft, dan latihan',
  'Rencanakan minggu belajar: 1 jam bahasa Inggris tiap hari setelah kerja',
];

export default function Planner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [goal, setGoal] = useState(() => searchParams.get('goal') || '');
  const [planDate, setPlanDate] = useState(todayISO());
  const [availableStart, setAvailableStart] = useState('');
  const [deadline, setDeadline] = useState('');
  const [phase, setPhase] = useState('input'); // input | loading | review
  const [draft, setDraft] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onGenerate = async (e) => {
    e?.preventDefault();
    setError('');
    setPhase('loading');
    try {
      const res = await apiFetch('/planner/generate', {
        method: 'POST',
        body: JSON.stringify({
          goal,
          plan_date: planDate,
          available_start: availableStart || null,
          deadline: deadline || null,
        }),
      });
      setDraft(res.draft);
      setTasks(res.draft.tasks || []);
      setValidation(res.validation);
      // Sync the AI-resolved date (the goal text may change the date).
      if (res.draft?.plan_date) setPlanDate(res.draft.plan_date);
      setPhase('review');
    } catch (err) {
      setError(err.message);
      setPhase('input');
    }
  };

  const updateTask = (idx, field, value) => {
    setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const removeTask = (idx) => setTasks((prev) => prev.filter((_, i) => i !== idx));

  const addEmptyTask = () => {
    setTasks((prev) => [
      ...prev,
      {
        title: '',
        description: '',
        priority: 'medium',
        duration_minutes: 30,
        start_time: '',
        end_time: '',
        task_date: planDate,
      },
    ]);
  };

  const onApprove = async () => {
    setSaving(true);
    setError('');
    try {
      await apiFetch('/planner/approve', {
        method: 'POST',
        body: JSON.stringify({
          plan_title: draft?.plan_title || 'Rencana tanpa judul',
          summary: draft?.summary || '',
          tasks: tasks.map((t) => ({
            ...t,
            task_date: t.task_date || planDate,
            duration_minutes: Number(t.duration_minutes) || 30,
            start_time: t.start_time || null,
            end_time: t.end_time || null,
          })),
        }),
      });
      navigate('/tasks');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <header className="mb-8 flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Planner</h1>
            <p className="text-sm text-muted dark:text-muted-dark">
              Tulis tujuanmu, AI menyusun jadwalnya.
            </p>
          </div>
        </header>

        {phase === 'input' && (
          <form onSubmit={onGenerate}>
            {/* Command input */}
            <div className="card p-6">
              <label htmlFor="goal" className="label text-base">
                Apa yang ingin kamu capai?
              </label>
              <textarea
                id="goal"
                rows={4}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="input resize-none leading-relaxed"
                placeholder="Contoh: besok saya ada meeting jam 9 pagi, sisakan waktu olahraga dan makan siang"
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="planDate" className="label">
                    Tanggal
                  </label>
                  <input
                    id="planDate"
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="availableStart" className="label">
                    Mulai tersedia
                  </label>
                  <input
                    id="availableStart"
                    type="time"
                    value={availableStart}
                    onChange={(e) => setAvailableStart(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="deadline" className="label">
                    Batas waktu
                  </label>
                  <input
                    id="deadline"
                    type="time"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <button type="submit" disabled={goal.trim().length < 5} className="btn-primary mt-5 w-full">
                <Sparkles size={18} />
                Susun rencanaku
              </button>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-muted-dark">
                Coba contoh
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setGoal(ex)}
                    className="rounded-xl border border-line dark:border-line-dark px-3 py-2 text-left text-xs text-muted dark:text-muted-dark hover:border-accent hover:text-ink dark:hover:text-ink-dark transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {error && <ErrorBox message={error} />}
          </form>
        )}

        {phase === 'loading' && (
          <div className="card flex flex-col items-center px-6 py-20 text-center">
            <Loader2 className="animate-spin text-accent" size={32} />
            <h2 className="mt-5 text-lg font-bold">Menyusun rencanamu…</h2>
            <p className="mt-1.5 text-sm text-muted dark:text-muted-dark">
              AI sedang memecah tujuanmu menjadi task dan jadwal.
            </p>
          </div>
        )}

        {phase === 'review' && (
          <ReviewView
            draft={draft}
            tasks={tasks}
            validation={validation}
            planDate={planDate}
            saving={saving}
            error={error}
            updateTask={updateTask}
            removeTask={removeTask}
            addEmptyTask={addEmptyTask}
            onApprove={onApprove}
            onBack={() => setPhase('input')}
          />
        )}
      </div>
    </Layout>
  );
}

function ErrorBox({ message }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-prio-high/10 px-4 py-3 text-sm text-prio-high">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}

function ReviewView({
  draft,
  tasks,
  validation,
  planDate,
  saving,
  error,
  updateTask,
  removeTask,
  addEmptyTask,
  onApprove,
  onBack,
}) {
  const sorted = [...tasks].sort(
    (a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99')
  );
  const conflictTitles = new Set((validation?.conflicts || []).flat());

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{draft?.plan_title}</h2>
            {draft?.plan_date && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-accent">
                {fmtDate(draft.plan_date)}
              </p>
            )}
            {draft?.summary && (
              <p className="mt-2 text-sm text-muted dark:text-muted-dark">{draft.summary}</p>
            )}
          </div>
          <button onClick={onBack} className="btn-ghost shrink-0">
            <Pencil size={16} />
            Ubah
          </button>
        </div>

        {validation?.schedule_errors?.length > 0 && (
          <div className="mt-4 rounded-xl bg-prio-high/10 px-4 py-3 text-sm text-prio-high">
            {validation.schedule_errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight">Draft task</h3>
        <button onClick={addEmptyTask} className="btn-ghost text-sm">
          + Tambah task
        </button>
      </div>

      <ul className="space-y-3">
        {sorted.map((t, i) => {
          const originalIdx = tasks.indexOf(t);
          const isConflict = conflictTitles.has(t.title);
          return (
            <li key={`${originalIdx}-${t.title}`} className="card p-4">
              <div className="flex items-start gap-3">
                <input
                  type="text"
                  value={t.title}
                  onChange={(e) => updateTask(originalIdx, 'title', e.target.value)}
                  className="input font-semibold"
                  placeholder="Judul task"
                />
                <button
                  onClick={() => removeTask(originalIdx)}
                  aria-label="Hapus task"
                  className="mt-1 shrink-0 text-muted dark:text-muted-dark hover:text-prio-high"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div>
                  <label className="text-xs font-semibold text-muted dark:text-muted-dark">Tanggal</label>
                  <input
                    type="date"
                    value={t.task_date || ''}
                    onChange={(e) => updateTask(originalIdx, 'task_date', e.target.value)}
                    className="input mt-1 font-mono tabular"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted dark:text-muted-dark">Mulai</label>
                  <input
                    type="time"
                    value={t.start_time || ''}
                    onChange={(e) => updateTask(originalIdx, 'start_time', e.target.value)}
                    className="input mt-1 font-mono tabular"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted dark:text-muted-dark">Selesai</label>
                  <input
                    type="time"
                    value={t.end_time || ''}
                    onChange={(e) => updateTask(originalIdx, 'end_time', e.target.value)}
                    className="input mt-1 font-mono tabular"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted dark:text-muted-dark">Durasi</label>
                  <input
                    type="number"
                    min="1"
                    value={t.duration_minutes}
                    onChange={(e) => updateTask(originalIdx, 'duration_minutes', e.target.value)}
                    className="input mt-1 font-mono tabular"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted dark:text-muted-dark">Prioritas</label>
                  <select
                    value={t.priority}
                    onChange={(e) => updateTask(originalIdx, 'priority', e.target.value)}
                    className="input mt-1"
                  >
                    <option value="high">Tinggi</option>
                    <option value="medium">Sedang</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
              </div>

              {isConflict && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-prio-high">
                  <AlertTriangle size={14} /> Jadwal bentrok dengan task lain
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {error && <ErrorBox message={error} />}

      <div className="sticky bottom-0 -mx-4 border-t border-line dark:border-line-dark bg-canvas/90 dark:bg-canvas-dark/90 p-4 backdrop-blur md:-mx-8">
        <button onClick={onApprove} disabled={saving || tasks.length === 0} className="btn-primary w-full">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          {saving ? 'Menyimpan…' : 'Setujui & simpan'}
        </button>
      </div>
    </div>
  );
}
