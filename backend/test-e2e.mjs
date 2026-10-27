import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || 'https://your-project.supabase.co';

function readEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trimStart().startsWith('#')) {
      out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return out;
}

const env = readEnv(new URL('./.env', import.meta.url).pathname);
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.SUPABASE_ANON_KEY;

const admin = createClient(url, SERVICE, { auth: { persistSession: false } });
const anon = createClient(url, ANON);

const email = `e2e-${Date.now()}@example.com`;
const password = 'e2e-password-123';

function ok(label, cond) {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
}

async function main() {
  // 1) Buat user via service role
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Test' },
  });
  if (createErr) throw new Error('createUser: ' + createErr.message);
  ok('Buat user (service role)', true);
  const userId = created.user.id;

  // 2) Login via anon key
  const { data: login, error: loginErr } = await anon.auth.signInWithPassword({ email, password });
  ok('Login via anon key', !loginErr);
  if (loginErr) throw new Error('login: ' + loginErr.message);
  const token = login.session.access_token;

  // 3) RLS: task user baru harus kosong
  const { data: ownTasks } = await anon.from('tasks').select('*').eq('user_id', userId);
  ok('RLS: query task sendiri (harus kosong)', Array.isArray(ownTasks) && ownTasks.length === 0);

  // 4) Trigger profil otomatis
  const { data: profile } = await anon.from('profiles').select('*').eq('id', userId).single();
  ok('Trigger profil otomatis', !!profile && profile.full_name === 'E2E Test');

  // 5) Generate plan via backend AI (live)
  const genRes = await fetch('http://localhost:4000/api/planner/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      goal: 'Besok meeting jam 9 pagi, sisakan olahraga dan makan siang',
      plan_date: '2026-10-28',
      available_start: '08:00',
      deadline: '15:00',
    }),
  });
  const gen = await genRes.json();
  ok(`Generate plan (HTTP ${genRes.status})`, genRes.status === 200 && !!gen.draft?.tasks?.length);
  if (genRes.status !== 200) console.log('   →', JSON.stringify(gen).slice(0, 400));

  // 6) Approve & simpan
  if (gen.draft?.tasks?.length) {
    const approveRes = await fetch('http://localhost:4000/api/planner/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        plan_title: gen.draft.plan_title,
        summary: gen.draft.summary,
        tasks: gen.draft.tasks.map((t) => ({
          ...t,
          task_date: '2026-10-28',
          duration_minutes: Number(t.duration_minutes),
        })),
      }),
    });
    const approve = await approveRes.json();
    ok(`Approve & simpan (HTTP ${approveRes.status})`, approveRes.status === 201);
    if (approveRes.status !== 201) console.log('   →', JSON.stringify(approve).slice(0, 400));

    // 7) Task tersimpan & terlihat
    const { data: saved } = await anon.from('tasks').select('*').eq('user_id', userId);
    ok(`Task tersimpan & terlihat (${saved?.length} baris)`, Array.isArray(saved) && saved.length > 0);
  }

  console.log('\n=== RINGKASAN ===');
  console.log('user_id:', userId);
}

main()
  .then(() => {
    console.log('E2E SELESAI');
    process.exit(0);
  })
  .catch((e) => {
    console.error('E2E GAGAL:', e.message);
    process.exit(1);
  });
