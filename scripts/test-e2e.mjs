// Test end-to-end: signup → login → RLS check → generate plan (AI live) → approve/save.
// Dibaca key dari env (di-set shell). Tidak mencetak key.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_KEY = process.env.AI_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY wajib di-set');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const anon = createClient(URL, ANON);

const email = `e2e-${Date.now()}@example.com`;
const password = 'e2e-password-123';

function ok(label, cond) {
  console.log(`${cond ? '✅' : '❌'} ${label}`);
}

async function main() {
  // 1) Buat user via service role (email_confirm true = langsung aktif)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Test' },
  });
  if (createErr) throw new Error('createUser: ' + createErr.message);
  ok('Buat user', true);
  const userId = created.user.id;

  // 2) Login via anon key (alur seperti user asli)
  const { data: login, error: loginErr } = await anon.auth.signInWithPassword({ email, password });
  ok('Login via anon key', !loginErr);
  if (loginErr) throw new Error('login: ' + loginErr.message);
  const token = login.session.access_token;

  // 3) RLS: user baru harusnya TIDAK melihat task milik user lain
  const { data: ownTasks } = await anon
    .from('tasks')
    .select('*')
    .eq('user_id', userId);
  ok('RLS: query task milik sendiri (harus kosong)', Array.isArray(ownTasks) && ownTasks.length === 0);

  // 4) Profil otomatis dibuat trigger
  const { data: profile } = await anon.from('profiles').select('*').eq('id', userId).single();
  ok('Trigger profil otomatis', !!profile && profile.full_name === 'E2E Test');

  // 5) Generate plan via backend AI (panggil endpoint /api/planner/generate)
  //    Backend harus jalan dengan env SUPABASE + AI terisi.
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
  if (genRes.status !== 200) console.log('   →', JSON.stringify(gen).slice(0, 300));

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
