import ThemeToggle from './ThemeToggle.jsx';
import { Sparkles, CheckCircle2, CalendarDays } from 'lucide-react';

const FEATURES = [
  { icon: Sparkles, text: 'AI menyusun jadwal dari kalimat sehari-hari' },
  { icon: CheckCircle2, text: 'Review & edit sebelum disimpan' },
  { icon: CalendarDays, text: 'Kelola dari dashboard & kalender mingguan' },
];

const TASKS = [
  { time: '09:00', title: 'Meeting tim', priority: 'high' },
  { time: '11:30', title: 'Olahraga pagi', priority: 'medium' },
  { time: '13:00', title: 'Kerja fokus', priority: 'low' },
];

const PRIORITY = {
  high: { dot: 'bg-red-500', label: 'Tinggi' },
  medium: { dot: 'bg-amber-500', label: 'Sedang' },
  low: { dot: 'bg-slate-400', label: 'Rendah' },
};

function Brand() {
  return (
    <span className="text-xl font-extrabold tracking-tight">
      AI <span className="text-accent">Planner</span>
    </span>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel visual produk — hanya desktop */}
      <aside className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-[#0D9488] via-[#0F766E] to-[#134E4A] p-12 lg:flex">
        {/* grid halus */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* glow dekoratif */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

        <div className="relative z-10">
          <span className="text-xl font-extrabold tracking-tight text-white">
            AI <span className="text-emerald-200">Planner</span>
          </span>

          <h2 className="mt-8 max-w-md text-3xl font-bold leading-tight tracking-tight text-white">
            Tulis tujuanmu, AI yang menyusun jadwalnya.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-50/80">
            Ubah instruksi bahasa sehari-hari menjadi rencana harian yang rapi —
            lalu review, setujui, dan kelola dari satu dashboard.
          </p>

          {/* Mockup produk */}
          <div className="mt-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Rencana hari ini
                </p>
                <p className="text-sm font-bold text-slate-900">Rabu, 28 Oktober</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
                <Sparkles size={12} /> 3 task
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {TASKS.map((t) => (
                <div
                  key={t.time}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                >
                  <span className="font-mono text-xs font-semibold tabular text-slate-500">
                    {t.time}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-800">
                    {t.title}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <span className={`h-2 w-2 rounded-full ${PRIORITY[t.priority].dot}`} />
                    {PRIORITY[t.priority].label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fitur */}
          <div className="mt-10 space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-emerald-50/90">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={15} className="text-white" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Sisi form */}
      <div className="relative flex items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden">
            <Brand />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
