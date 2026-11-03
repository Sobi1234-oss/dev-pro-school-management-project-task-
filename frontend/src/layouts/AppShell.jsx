import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarCheck, ClipboardList, LayoutDashboard, LogOut, Menu, School, Users, Wallet, X, GraduationCap, UserRound, BookOpen, Bell, ScrollText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../lib/format';

const ADMIN_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/classes', label: 'Classes', icon: School },
  { to: '/teachers', label: 'Teachers', icon: UserRound },
  { to: '/academics', label: 'Academics', icon: BookOpen },
  { to: '/announcements', label: 'Announcements', icon: Bell },
  { to: '/audit-logs', label: 'Audit log', icon: ScrollText },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/results', label: 'Results', icon: ClipboardList },
  { to: '/fees', label: 'Fees', icon: Wallet },
];
const STUDENT_NAV = [{ to: '/portal', label: 'Progress', icon: GraduationCap, end: true }];
const TEACHER_NAV = [{ to: '/teacher', label: 'My teaching', icon: BookOpen, end: true }];

function Brand({ className }) {
  return (
    <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="ProDev Academy" className={`max-w-full object-contain object-left ${className}`} />
  );
}

function SideNav({ items, onNavigate }) {
  return (
    <nav className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-ink-800 text-white before:absolute before:-left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-1 before:rounded-r before:bg-bus' : 'text-ink-300 hover:bg-ink-800/60 hover:text-white'}`}>
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const items = user.role === 'admin' ? ADMIN_NAV : user.role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;

  const sidebar = (onNavigate) => (
    <div className="flex h-full flex-col px-4 pb-4 pt-3">
      <Brand className="h-20 w-full" />
      <SideNav items={items} onNavigate={onNavigate} />
      <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-700 text-xs font-bold text-white">{initials(user.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs text-ink-300">{user.role === 'admin' ? 'Administrator' : user.role === 'teacher' ? 'Teacher' : 'Parent / Student'}</p>
        </div>
        <button onClick={logout} aria-label="Sign out" className="rounded-lg p-2 text-ink-300 hover:bg-ink-800 hover:text-white"><LogOut size={18} /></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="ruled-light fixed inset-y-0 left-0 z-30 hidden w-60 bg-ink lg:block">{sidebar()}</aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-4 lg:hidden">
        <Brand className="h-12 w-[72px]" />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-white hover:bg-ink-800"><Menu size={22} /></button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="anim-fade absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="ruled-light absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-ink">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-2 text-ink-300 hover:text-white"><X size={20} /></button>
            {sidebar(() => setOpen(false))}
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
