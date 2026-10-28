import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { apiFetch } from '../lib/supabase.js';
import { fmtDate } from '../lib/format.js';

export default function History() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/planner/history')
      .then(setPlans)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft dark:bg-accent-soft-dark text-accent">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Riwayat AI</h1>
            <p className="text-sm text-muted dark:text-muted-dark">
              Rencana yang pernah disusun AI.
            </p>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-muted dark:text-muted-dark">Memuat…</p>
        ) : error ? (
          <p className="card p-4 text-sm text-prio-high">{error}</p>
        ) : plans.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft dark:bg-accent-soft-dark text-accent">
              <Sparkles size={24} />
            </div>
            <h2 className="mt-5 text-xl font-bold">Belum ada riwayat</h2>
            <p className="mt-2 max-w-sm text-sm text-muted dark:text-muted-dark">
              Rencana yang kamu setujui akan tersimpan di sini.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id} className="card flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft dark:bg-accent-soft-dark text-accent">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="truncate text-xs text-muted dark:text-muted-dark">
                    {fmtDate(p.plan_date)}
                    {p.goal_description ? ` · ${p.goal_description}` : ''}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-accent-soft dark:bg-accent-soft-dark px-2.5 py-1 text-xs font-semibold text-accent-hover dark:text-accent">
                  {p.task_count} task
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
