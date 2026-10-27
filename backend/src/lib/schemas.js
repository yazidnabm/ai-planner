import { z } from 'zod';

// --- Domain enums (must stay in sync with the SQL enums) ---
export const PRIORITIES = ['low', 'medium', 'high'];
export const TASK_STATUSES = ['todo', 'in_progress', 'done'];
export const PLAN_STATUSES = ['draft', 'approved', 'archived'];

// --- Input validation schemas ---
export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(200),
  description: z.string().trim().max(2000).optional().default(''),
  task_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format waktu harus HH:MM').nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format waktu harus HH:MM').nullable().optional(),
  duration_minutes: z.number().int().min(1, 'Durasi harus lebih dari 0').max(1440).default(30),
  priority: z.enum(PRIORITIES).default('medium'),
  status: z.enum(TASK_STATUSES).default('todo'),
  plan_id: z.string().uuid().nullable().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const plannerRequestSchema = z.object({
  goal: z.string().trim().min(5, 'Tuliskan tujuan dengan lebih lengkap').max(2000),
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  available_start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  deadline: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
});

export const approvePlanSchema = z.object({
  plan_id: z.string().uuid().optional(),
  plan_title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(2000).optional().default(''),
  tasks: z.array(taskCreateSchema).min(1, 'Rencana harus memiliki minimal satu task'),
});
