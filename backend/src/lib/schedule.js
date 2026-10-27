// Schedule validation logic: duration, time, and conflict detection.
// These functions are pure, so they are easy to test independently (NFR-018).

/**
 * Normalize "HH:MM" / "HH:MM:SS" into minutes since midnight.
 * Returns null if the input is null/undefined/invalid.
 */
export function toMinutes(time) {
  if (time == null) return null;
  const m = String(time).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Validate a single task: positive duration and a consistent time range.
 * Returns an array of error messages (empty = valid).
 */
export function validateTaskSchedule(task) {
  const errors = [];
  const duration = Number(task.duration_minutes);
  if (!Number.isFinite(duration) || duration <= 0) {
    errors.push('Durasi task harus lebih dari 0');
  }

  const start = toMinutes(task.start_time);
  const end = toMinutes(task.end_time);

  if (start != null && end != null) {
    if (end <= start) {
      errors.push(`Waktu selesai (${task.end_time}) harus setelah waktu mulai (${task.start_time})`);
    } else if (duration > 0 && end - start !== duration) {
      errors.push(
        `Durasi (${duration} menit) tidak sesuai rentang waktu (${end - start} menit)`
      );
    }
  }
  return errors;
}

/**
 * Detect overlaps between scheduled tasks on the same date.
 * Two tasks conflict if their time ranges overlap.
 * Returns an array of [taskA, taskB] pairs that conflict.
 */
export function findConflicts(tasks) {
  const scheduled = tasks
    .filter((t) => t.start_time != null && t.end_time != null)
    .map((t) => ({
      task: t,
      start: toMinutes(t.start_time),
      end: toMinutes(t.end_time),
    }))
    .filter((x) => x.start != null && x.end != null);

  const conflicts = [];
  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      const a = scheduled[i];
      const b = scheduled[j];
      // Only compare tasks on the same date (cross-date tasks never conflict).
      if (a.task.task_date !== b.task.task_date) continue;
      // Overlap: a.start < b.end AND b.start < a.end
      if (a.start < b.end && b.start < a.end) {
        conflicts.push([a.task, b.task]);
      }
    }
  }
  return conflicts;
}

/**
 * Validate an entire plan draft.
 * Returns { valid, errors: [{task, errors}], conflicts: [[a,b]] }.
 */
export function validateDraft(tasks) {
  const errors = [];
  for (const task of tasks) {
    const taskErrors = validateTaskSchedule(task);
    if (taskErrors.length > 0) {
      errors.push({ task: task.title, errors: taskErrors });
    }
  }
  const conflicts = findConflicts(tasks);
  return { valid: errors.length === 0, errors, conflicts };
}
