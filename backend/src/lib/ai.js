import { loadConfig } from './config.js';
import { admin } from './supabase.js';
import { validateDraft } from './schedule.js';

const config = loadConfig();

const SYSTEM_PROMPT = `Anda adalah AI Planner dalam aplikasi produktivitas "AI Smart Life Planner".
Tugas Anda: mengubah tujuan pengguna (bahasa sehari-hari) menjadi rencana aktivitas terstruktur.

Aturan wajib:
1. Jawab dalam bahasa Indonesia.
2. Pecah tujuan menjadi task-task yang konkret, realistis, dan berurutan.
3. Setiap task harus memiliki: title (singkat, jelas), description (opsional), priority (low/medium/high), duration_minutes (bilangan bulat > 0), start_time dan end_time (format HH:MM, 24 jam).
4. Susun jadwal sesuai rentang waktu yang tersedia. Jangan buat task di luar waktu yang diberikan tanpa alasan jelas.
5. Prioritaskan task berdasarkan deadline dan urgensi.
6. Gunakan tools yang tersedia (mis. get_tasks) untuk membaca task pengguna yang sudah ada agar tidak membuat jadwal yang bentrok atau duplikat.
7. TENTUKAN TANGGAL RENCANA (plan_date, format YYYY-MM-DD): kenali referensi tanggal relatif dalam instruksi pengguna — "hari ini", "besok", "lusa", "jumat minggu ini", "senin depan", "minggu depan", atau tanggal absolut seperti "30 Oktober". Gunakan konteks "Hari ini" yang diberikan. Jika pengguna menyebut tanggal/waktu tertentu yang berbeda dari field tanggal, UTAMAKAN tanggal yang disebut dalam teks.
8. JIKA pengguna meminta aktivitas berulang ("setiap hari", "tiap hari", "harian", "rutin", "tiap pagi/sore/malam", dst), maka susun SATU hari rutinitas sebagai template (task-task yang dilakukan dalam satu hari). Sistem akan menggandakan otomatis ke beberapa hari ke depan — jadi JANGAN buat sendiri beberapa tanggal.
9. Keluarkan hasil akhir HANYA sebagai JSON valid, tanpa teks lain, dengan struktur berikut:
{
  "plan_title": "judul rencana",
  "summary": "ringkasan 1-2 kalimat",
  "plan_date": "YYYY-MM-DD",
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "priority": "low|medium|high",
      "duration_minutes": 60,
      "start_time": "09:00",
      "end_time": "10:00"
    }
  ]
}`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description:
        'Ambil daftar task milik pengguna yang sedang login, dengan filter tanggal dan status.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Filter tanggal YYYY-MM-DD (opsional)' },
          status: {
            type: 'string',
            enum: ['todo', 'in_progress', 'done'],
            description: 'Filter status (opsional)',
          },
        },
      },
    },
  },
];

async function callModel(messages, { tools = undefined, timeoutMs = config.ai.timeoutMs } = {}) {
  const body = {
    model: config.ai.model,
    messages,
    stream: false,
  };
  if (tools) body.tools = tools;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.ai.apiKey ? { Authorization: `Bearer ${config.ai.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI API error ${res.status}: ${text.slice(0, 300)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute a tool call (currently only get_tasks) and return its result.
 */
async function executeTool(name, args, userId) {
  if (name === 'get_tasks') {
    const query = admin
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('task_date', { ascending: true });
    if (args?.date) query.eq('task_date', args.date);
    if (args?.status) query.eq('status', args.status);
    const { data, error } = await query;
    if (error) throw new Error(`get_tasks gagal: ${error.message}`);
    return data;
  }
  throw new Error(`Tool tidak dikenal: ${name}`);
}

/**
 * Compute today's date in Asia/Jakarta (WIB), plus its day name,
 * for relative date resolution in the AI prompt.
 */
function todayContext() {
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const isoFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = isoFmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return {
    iso: `${y}-${m}-${d}`,
    label: fmt.format(new Date()),
  };
}

/**
 * Generate a plan draft from the user's instruction.
 * Flow: call the model (optionally with tool calling to read task context),
 * then parse + validate the JSON output.
 *
 * @returns {Promise<{draft, existingTasks}>}
 */
export async function generatePlan({ userId, goal, plan_date, available_start, deadline }) {
  const today = todayContext();
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `Instruksi pengguna: ${goal}`,
        `Tanggal rencana (dari field form): ${plan_date}`,
        `Hari ini: ${today.label} (${today.iso})`,
        available_start ? `Waktu mulai tersedia: ${available_start}` : null,
        deadline ? `Batas waktu (deadline): ${deadline}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];

  // Fetch existing tasks ONCE up front (fast DB query). This decides
  // whether tool-calling is needed at all.
  const { data: existingTasks, error } = await admin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('task_date', { ascending: true });
  if (error) throw new Error(`get_tasks gagal: ${error.message}`);

  let draft;
  if (existingTasks.length === 0) {
    // No existing tasks → fast path: a single call without tools.
    // Avoids the get_tasks round-trip that adds ~10-12 seconds.
    const response = await callModel(messages);
    const message = response.choices?.[0]?.message;
    if (!message) throw new Error('Respons AI kosong');
    draft = parseDraftJson(message.content || '');
  } else {
    // Existing tasks → tool-calling loop so the model can read context.
    draft = await runAgentLoop(messages, userId, existingTasks);
  }

  // Ensure plan_date is set: prefer the AI result, fall back to the form field.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.plan_date || '')) {
    draft.plan_date = plan_date;
  }
  // Sync task_date: ensure every task shares the resolved plan_date
  // (common case). Recurring detection is handled below.
  for (const t of draft.tasks || []) {
    if (!t.task_date) t.task_date = draft.plan_date;
  }

  // Detect recurring activities ("setiap hari" / "harian" / "rutin")
  // → replicate the routine to the next 7 days.
  if (isRecurring(goal)) {
    draft.tasks = replicateDaily(draft.tasks, draft.plan_date, 7);
    draft.summary = `${draft.summary || ''} (rutinitas harian, 7 hari)`.trim();
  }

  return { draft, existingTasks };
}

/**
 * Detect whether the instruction asks for a daily recurring activity.
 */
function isRecurring(goal) {
  return /setiap\s*hari|tiap\s*hari|harian|rutin|setiap\s*pagi|setiap\s*sore|setiap\s*malam|setiap\s*minggu|setiap\s*senin|setiap\s*selasa|setiap\s*rabu|setiap\s*kamis|setiap\s*jumat|setiap\s*sabtu|setiap\s*minggu/i.test(
    goal || ''
  );
}

/**
 * Replicate a task list (one-day template) across `days` consecutive days.
 * Dates start from `startDate`. Each following day gets a new task_date.
 */
function replicateDaily(tasks, startDate, days) {
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(startDate)) return tasks;
  const start = new Date(`${startDate}T00:00:00`);
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISODate(d);
    for (const t of tasks || []) {
      out.push({ ...t, task_date: iso });
    }
  }
  return out;
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Agent loop: let the model call get_tasks several times until it produces
 * the final JSON output. Limit iterations to prevent an infinite loop.
 */
async function runAgentLoop(messages, userId, existingTasks, maxIterations = 4) {
  for (let i = 0; i < maxIterations; i++) {
    const response = await callModel(messages, { tools: TOOLS });
    const message = response.choices?.[0]?.message;
    if (!message) throw new Error('Respons AI kosong');

    // Model calls a tool → execute it, return the result, continue the loop.
    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      messages.push(message);
      for (const tc of message.tool_calls) {
        const args = JSON.parse(tc.function?.arguments || '{}');
        const result = await executeTool(tc.function?.name, args, userId);
        existingTasks.push(...result);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    // Model produced final text → parse JSON.
    const raw = message.content || '';
    const draft = parseDraftJson(raw);
    return draft;
  }
  throw new Error('AI tidak menghasilkan rencana dalam batas iterasi');
}

/**
 * Parse the model's JSON output. Tolerates ```json ... ``` fences that
 * models often add. Throws a clear error on invalid format (FR-020, 6.3).
 */
function parseDraftJson(raw) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI menghasilkan respons yang bukan JSON valid');
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) {
    throw new Error('Struktur draft AI tidak sesuai skema (missing tasks)');
  }
  return parsed;
}

export { validateDraft };
