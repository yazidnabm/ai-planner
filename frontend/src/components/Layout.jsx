import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  CalendarDays,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/planner', label: 'AI Planner', icon: Sparkles },
  { to: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { to: '/calendar', label: 'Kalender', icon: CalendarDays },
  { to: '/history', label: 'Riwayat AI', icon: History },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-accent-soft dark:bg-accent-soft-dark text-accent-hover dark:text-accent'
                : 'text-muted dark:text-muted-dark hover:bg-line/40 dark:hover:bg-line-dark/40 hover:text-ink dark:hover:text-ink-dark'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate('/login');
  };

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pengguna';

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-line dark:border-line-dark p-4 md:flex">
        <div className="mb-6 px-2">
          <span className="text-lg font-extrabold tracking-tight">
            AI <span className="text-accent">Planner</span>
          </span>
        </div>
        <NavItems />
        <div className="mt-auto flex items-center gap-2 border-t border-line dark:border-line-dark pt-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted dark:text-muted-dark">{user?.email}</p>
          </div>
          <ThemeToggle />
          <button
            onClick={() => setSignOutOpen(true)}
            aria-label="Keluar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line dark:border-line-dark text-muted dark:text-muted-dark hover:bg-line/40 dark:hover:bg-line-dark/40"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col border-r border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-4">
            <div className="mb-6 flex items-center justify-between px-2">
              <span className="text-lg font-extrabold tracking-tight">
                AI <span className="text-accent">Planner</span>
              </span>
              <button onClick={() => setDrawerOpen(false)} aria-label="Tutup menu">
                <X size={20} />
              </button>
            </div>
            <NavItems onNavigate={() => setDrawerOpen(false)} />
            <div className="mt-auto flex items-center gap-2 border-t border-line dark:border-line-dark pt-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="truncate text-xs text-muted dark:text-muted-dark">{user?.email}</p>
              </div>
              <ThemeToggle />
              <button
                onClick={() => setSignOutOpen(true)}
                aria-label="Keluar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line dark:border-line-dark text-muted dark:text-muted-dark"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konten */}
      <div className="md:pl-64">
        {/* Top bar mobile */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line dark:border-line-dark bg-canvas/90 dark:bg-canvas-dark/90 px-4 py-3 backdrop-blur md:hidden">
          <span className="text-lg font-extrabold tracking-tight">
            AI <span className="text-accent">Planner</span>
          </span>
          <button onClick={() => setDrawerOpen(true)} aria-label="Buka menu">
            <Menu size={22} />
          </button>
        </div>
        <main className="min-w-0">{children}</main>
      </div>

      <ConfirmDialog
        open={signOutOpen}
        title="Keluar dari akun?"
        message="Kamu akan keluar dari sesi ini dan perlu login kembali untuk melanjutkan."
        confirmLabel="Keluar"
        variant="primary"
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setSignOutOpen(false)}
      />
    </div>
  );
}
