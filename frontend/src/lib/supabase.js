import { createClient } from '@supabase/supabase-js';
import { PREVIEW, PREVIEW_USER } from './preview.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!PREVIEW && (!url || !anon)) {
  console.warn('Supabase URL/anon key belum diisi di .env');
}

export const supabase = createClient(
  PREVIEW ? 'http://preview.invalid' : url || 'http://placeholder',
  PREVIEW ? 'preview-anon-key' : anon || 'placeholder'
);

export async function apiFetch(path, options = {}) {
  // Preview mode: return sample responses without a backend.
  if (PREVIEW) {
    return previewApi(path, options);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}${path}`, {
    ...options,
    headers,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || 'Permintaan gagal');
    err.status = res.status;
    err.details = body;
    throw err;
  }
  return body;
}

// ----- Preview API mock (for browsing the UI only) -----
import { SAMPLE_TASKS, SAMPLE_PLANS, SAMPLE_DRAFT } from './preview.js';

let previewTasks = [...SAMPLE_TASKS];

function previewApi(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;

  // GET /tasks
  if (method === 'GET' && path === '/tasks') {
    return Promise.resolve([...previewTasks]);
  }
  // GET /planner/history
  if (method === 'GET' && path === '/planner/history') {
    return Promise.resolve([...SAMPLE_PLANS]);
  }
  // POST /planner/generate
  if (method === 'POST' && path === '/planner/generate') {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ draft: SAMPLE_DRAFT, validation: { schedule_errors: [], conflicts: [] }, existing_task_count: 0 }), 1200)
    );
  }
  // POST /planner/approve
  if (method === 'POST' && path === '/planner/approve') {
    const tasks = (body?.tasks || []).map((t, i) => ({
      ...t,
      id: `preview-${Date.now()}-${i}`,
      status: 'todo',
    }));
    previewTasks = [...previewTasks, ...tasks];
    return Promise.resolve({ plan: { id: 'preview-plan' }, task_count: tasks.length });
  }
  // PATCH /tasks/:id/status
  const statusMatch = path.match(/^\/tasks\/(.+)\/status$/);
  if (method === 'PATCH' && statusMatch) {
    previewTasks = previewTasks.map((t) => (t.id === statusMatch[1] ? { ...t, status: body.status } : t));
    return Promise.resolve(previewTasks.find((t) => t.id === statusMatch[1]));
  }
  // DELETE /tasks/:id
  const deleteMatch = path.match(/^\/tasks\/(.+)$/);
  if (method === 'DELETE' && deleteMatch) {
    previewTasks = previewTasks.filter((t) => t.id !== deleteMatch[1]);
    return Promise.resolve(null);
  }

  return Promise.reject(new Error('Preview API tidak mengenali endpoint'));
}

export { PREVIEW_USER };
