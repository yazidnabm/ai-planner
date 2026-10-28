import { Router } from 'express';
import { z } from 'zod';
import { admin } from '../lib/supabase.js';
import { taskCreateSchema, taskUpdateSchema } from '../lib/schemas.js';
import { validateTaskSchedule, findConflicts } from '../lib/schedule.js';

const router = Router();

const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
});

// List tasks (optional date/status filters)
router.get('/', async (req, res) => {
  const parsed = dateQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { date, status } = parsed.data;

  let query = admin.from('tasks').select('*').eq('user_id', req.userId).order('task_date');
  if (date) query = query.eq('task_date', date);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create a task manually
router.post('/', async (req, res) => {
  const parsed = taskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const task = parsed.data;

  const scheduleErrors = validateTaskSchedule(task);
  if (scheduleErrors.length > 0) {
    return res.status(400).json({ error: scheduleErrors });
  }

  const { data, error } = await admin
    .from('tasks')
    .insert({ ...task, user_id: req.userId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Task detail (ownership checked)
router.get('/:id', async (req, res) => {
  const { data, error } = await admin
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();
  if (error) return res.status(404).json({ error: 'Task tidak ditemukan' });
  res.json(data);
});

// Update task
router.put('/:id', async (req, res) => {
  const parsed = taskUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }

  // Fetch the existing task to validate the merged schedule
  const { data: existing } = await admin
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();
  if (!existing) return res.status(404).json({ error: 'Task tidak ditemukan' });

  const merged = { ...existing, ...parsed.data };
  const scheduleErrors = validateTaskSchedule(merged);
  if (scheduleErrors.length > 0) {
    return res.status(400).json({ error: scheduleErrors });
  }

  const { data, error } = await admin
    .from('tasks')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Change task status
router.patch('/:id/status', async (req, res) => {
  const parsed = z.object({ status: z.enum(['todo', 'in_progress', 'done']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Status tidak valid' });

  const { data, error } = await admin
    .from('tasks')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete ALL tasks owned by the user (bulk delete). Must be declared before
// /:id so the "/" path is not captured as an id parameter.
router.delete('/', async (req, res) => {
  const { error } = await admin
    .from('tasks')
    .delete()
    .eq('user_id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Delete selected tasks (bulk delete by ids). Only user-owned tasks are removed.
router.delete('/bulk', async (req, res) => {
  const parsed = z.object({ ids: z.array(z.string().min(1)).min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Daftar id task tidak valid' });

  const { error } = await admin
    .from('tasks')
    .delete()
    .in('id', parsed.data.ids)
    .eq('user_id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Delete a single task
router.delete('/:id', async (req, res) => {
  const { error } = await admin
    .from('tasks')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Conflict detection: submit the list of tasks to check
router.post('/check-conflicts', async (req, res) => {
  const parsed = z.array(taskCreateSchema).safeParse(req.body?.tasks);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const conflicts = findConflicts(parsed.data);
  res.json({ conflicts: conflicts.map(([a, b]) => [a.title, b.title]) });
});

export default router;
