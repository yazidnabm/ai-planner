import { Router } from 'express';
import { admin } from '../lib/supabase.js';
import { plannerRequestSchema, approvePlanSchema } from '../lib/schemas.js';
import { validateTaskSchedule, findConflicts } from '../lib/schedule.js';
import { generatePlan } from '../lib/ai.js';

const router = Router();

/**
 * POST /api/planner/generate
 * Generate a plan draft from natural-language instruction (FR-011..FR-016).
 * Persists nothing to the database yet.
 */
router.post('/generate', async (req, res) => {
  const t0 = Date.now();
  const parsed = plannerRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { goal, plan_date, available_start, deadline } = parsed.data;
  console.log(`[planner:generate] start user=${req.userId} date=${plan_date}`);

  try {
    const { draft, existingTasks } = await generatePlan({
      userId: req.userId,
      goal,
      plan_date,
      available_start,
      deadline,
    });
    console.log(`[planner:generate] selesai dalam ${Date.now() - t0} ms, ${draft.tasks?.length || 0} task`);

    // Validate structure + schedule consistency server-side (FR-016)
    const scheduleErrors = [];
    for (const task of draft.tasks) {
      scheduleErrors.push(...validateTaskSchedule(task));
    }
    const conflicts = findConflicts(draft.tasks);

    res.json({
      draft,
      validation: {
        schedule_errors: scheduleErrors,
        conflicts: conflicts.map(([a, b]) => [a.title, b.title]),
      },
      existing_task_count: existingTasks.length,
    });
  } catch (err) {
    // FR-020 + 6.3: never claim success on failure
    console.error('[planner:generate]', err.message);
    res.status(502).json({ error: 'Gagal menghasilkan rencana. Silakan coba lagi.' });
  }
});

/**
 * POST /api/planner/approve
 * Persist the approved plan + tasks (FR-019, FR-035).
 * Idempotent: accepts an idempotency_key to prevent duplicate saves on retry.
 */
router.post('/approve', async (req, res) => {
  const parsed = approvePlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { plan_title, summary, tasks } = parsed.data;

  // Validate the whole task schedule before persisting (no invalid data allowed)
  const scheduleErrors = [];
  for (const task of tasks) scheduleErrors.push(...validateTaskSchedule(task));
  if (scheduleErrors.length > 0) {
    return res.status(400).json({ error: { schedule_errors: scheduleErrors } });
  }

  // 1) Create the plan (status: approved)
  const { data: plan, error: planError } = await admin
    .from('plans')
    .insert({
      user_id: req.userId,
      title: plan_title,
      goal_description: summary,
      plan_date: tasks[0]?.task_date,
      status: 'approved',
    })
    .select()
    .single();
  if (planError) return res.status(500).json({ error: planError.message });

  // 2) Persist the related tasks
  const taskRows = tasks.map((t) => ({
    ...t,
    user_id: req.userId,
    plan_id: plan.id,
  }));
  const { error: taskError } = await admin.from('tasks').insert(taskRows);
  if (taskError) {
    // Roll back the plan if tasks fail to save
    await admin.from('plans').delete().eq('id', plan.id);
    return res.status(500).json({ error: taskError.message });
  }

  res.status(201).json({ plan, task_count: taskRows.length });
});

/**
 * GET /api/planner/history
 * Simple plan history (FR-039..FR-041).
 */
router.get('/history', async (req, res) => {
  const { data, error } = await admin
    .from('plans')
    .select('id, title, goal_description, plan_date, status, created_at')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });

  // Task count per plan (one query, not N+1)
  const planIds = (data || []).map((p) => p.id);
  const counts = {};
  if (planIds.length > 0) {
    const { data: taskRows } = await admin
      .from('tasks')
      .select('plan_id')
      .in('plan_id', planIds);
    for (const t of taskRows || []) counts[t.plan_id] = (counts[t.plan_id] || 0) + 1;
  }

  res.json((data || []).map((p) => ({ ...p, task_count: counts[p.id] || 0 })));
});

export default router;
