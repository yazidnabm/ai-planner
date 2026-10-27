// Preview mode: sample data so every page is viewable without backend/Supabase.
// Active only when VITE_PREVIEW=1. Never used in production.

export const PREVIEW = import.meta.env.VITE_PREVIEW === '1';

const today = new Date().toISOString().slice(0, 10);
const plusDays = (n) => {
  const d = new Date(`${today}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const PREVIEW_USER = {
  id: 'preview-user',
  email: 'demo@example.com',
  user_metadata: { full_name: 'Demo User' },
};

export const SAMPLE_TASKS = [
  {
    id: 't1',
    title: 'Rapat pagi dengan tim produk',
    description: 'Bahasan roadmap sprint berikutnya.',
    task_date: today,
    start_time: '09:00',
    end_time: '10:00',
    duration_minutes: 60,
    priority: 'high',
    status: 'done',
  },
  {
    id: 't2',
    title: 'Olahraga (gym)',
    description: 'Fokus upper body.',
    task_date: today,
    start_time: '10:30',
    end_time: '11:30',
    duration_minutes: 60,
    priority: 'medium',
    status: 'in_progress',
  },
  {
    id: 't3',
    title: 'Makan siang',
    task_date: today,
    start_time: '12:00',
    end_time: '12:30',
    duration_minutes: 30,
    priority: 'low',
    status: 'todo',
  },
  {
    id: 't4',
    title: 'Review PR frontend',
    task_date: today,
    start_time: '13:00',
    end_time: '14:00',
    duration_minutes: 60,
    priority: 'high',
    status: 'todo',
  },
  {
    id: 't5',
    title: 'Belajar bahasa Inggris',
    task_date: plusDays(1),
    start_time: '19:00',
    end_time: '20:00',
    duration_minutes: 60,
    priority: 'medium',
    status: 'todo',
  },
  {
    id: 't6',
    title: 'Siapkan materi presentasi Jumat',
    task_date: plusDays(2),
    start_time: '09:00',
    end_time: '11:00',
    duration_minutes: 120,
    priority: 'high',
    status: 'todo',
  },
];

export const SAMPLE_PLANS = [
  {
    id: 'p1',
    title: 'Hari kerja produktif',
    goal_description: 'Meeting pagi, sisakan waktu olahraga dan istirahat',
    plan_date: today,
    status: 'approved',
  },
  {
    id: 'p2',
    title: 'Persiapan presentasi Jumat',
    goal_description: 'Riset, draft, dan latihan presentasi',
    plan_date: plusDays(2),
    status: 'approved',
  },
];

export const SAMPLE_DRAFT = {
  plan_title: 'Hari kerja yang seimbang',
  summary: 'Jadwal disusun agar meeting pagi tidak mengorbankan olahraga dan istirahat.',
  tasks: [
    {
      title: 'Rapat pagi dengan tim produk',
      description: 'Bahasan roadmap sprint berikutnya.',
      priority: 'high',
      duration_minutes: 60,
      start_time: '09:00',
      end_time: '10:00',
    },
    {
      title: 'Olahraga (gym)',
      description: 'Fokus upper body.',
      priority: 'medium',
      duration_minutes: 60,
      start_time: '10:30',
      end_time: '11:30',
    },
    {
      title: 'Makan siang',
      priority: 'low',
      duration_minutes: 30,
      start_time: '12:00',
      end_time: '12:30',
    },
  ],
};
