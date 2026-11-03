import { Bell, CalendarCheck, CalendarDays, Clock3, School, Users, Wallet, UserRound, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import Card, { Stat } from '../../components/ui/Card';
import { ErrorState, Spinner, EmptyState } from '../../components/ui/States';
import { Input } from '../../components/ui/Field';
import { formatDate, formatMonth, money, percent, todayISO } from '../../lib/format';

function daysAgo(days, end = todayISO()) {
  const date = new Date(`${end}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function RegisterChart({ days, from, to }) {
  if (!days.length) return <EmptyState title="No attendance yet" message="Mark attendance to see the selected period here." icon={CalendarCheck} />;
  const max = Math.max(...days.map((d) => +d.present + +d.absent + +d.on_leave), 1);
  const labelEvery = days.length <= 14 ? 1 : days.length <= 30 ? 5 : 10;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-ink/60">
        <span>{formatDate(from)}</span><span>{formatDate(to)}</span>
      </div>
      <div className="ruled overflow-x-auto rounded-xl border border-chalk-200 px-3 pt-4">
        <div className="flex h-48 min-w-full items-end gap-2" style={{ minWidth: `${days.length * (days.length > 30 ? 12 : 24)}px` }}>
          {days.map((d, index) => {
            const present = +d.present;
            const absent = +d.absent;
            const leave = +d.on_leave;
            const total = present + absent + leave;
            const label = index % labelEvery === 0 || index === days.length - 1;
            return (
              <div key={d.date} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${formatDate(d.date)}: ${present} present, ${absent} absent, ${leave} on leave`}>
                <span className="mb-1 text-center text-[10px] font-semibold text-ink/60">{total || ''}</span>
                <div style={{ height: `${(total / max) * 78}%` }} className="flex min-h-1 flex-col-reverse overflow-hidden rounded-t-md bg-chalk-200 transition-opacity group-hover:opacity-80">
                  {present > 0 && <div style={{ flex: present }} className="bg-ok" />}
                  {leave > 0 && <div style={{ flex: leave }} className="bg-bus" />}
                  {absent > 0 && <div style={{ flex: absent }} className="bg-bad" />}
                </div>
                <span className="mt-1 h-4 text-center text-[10px] text-ink/60">{label ? new Date(`${d.date}T00:00:00`).getDate() : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AcademicProgressChart({ months }) {
  const scored = months.filter((month) => month.average !== null);
  if (!scored.length) return <EmptyState title="No academic results yet" message="Recorded exam results will appear here by month." icon={TrendingUp} />;
  const points = scored.map((month) => {
    const index = months.indexOf(month);
    const x = months.length <= 1 ? 300 : 40 + (index / (months.length - 1)) * 520;
    const y = 160 - (Math.min(100, Math.max(0, +month.average)) / 100) * 130;
    return { ...month, x, y };
  });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-ink/60"><span>Average marks</span><span>{scored.at(-1).average}% latest</span></div>
      <svg viewBox="0 0 600 200" role="img" aria-label="Monthly average exam score" className="h-52 w-full overflow-visible">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = 160 - (value / 100) * 130;
          return <g key={value}><line x1="40" x2="560" y1={y} y2={y} stroke="#e4e6df" strokeDasharray="4 5" /><text x="32" y={y + 4} textAnchor="end" fill="#68736f" fontSize="10">{value}</text></g>;
        })}
        <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#226b57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <g key={point.month}><title>{point.label}: {point.average}% average across {point.results} results</title><circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#226b57" strokeWidth="3" /></g>)}
        {months.map((month, index) => {
          const x = months.length <= 1 ? 300 : 40 + (index / (months.length - 1)) * 520;
          return <text key={month.month} x={x} y="188" textAnchor="middle" fill="#68736f" fontSize="10">{month.label}</text>;
        })}
      </svg>
    </div>
  );
}

function YearlyFeesChart({ months }) {
  const max = Math.max(...months.map((month) => +month.collected + +month.pending), 1);
  if (!months.some((month) => +month.collected + +month.pending > 0)) {
    return <EmptyState title="No fee records yet" message="Monthly collected and pending fees will appear here." icon={Wallet} />;
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-ink/70">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-ok" />Collected</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-bus" />Pending</span>
      </div>
      <div className="flex h-52 items-end gap-1 overflow-x-auto rounded-xl border border-chalk-200 bg-chalk-50 px-3 pt-3 sm:gap-2">
        {months.map((month) => {
          const collectedHeight = (+month.collected / max) * 100;
          const pendingHeight = (+month.pending / max) * 100;
          return (
            <div key={month.month} className="group flex h-full min-w-5 flex-1 flex-col justify-end" title={`${month.label}: ${money(month.collected)} collected, ${money(month.pending)} pending`}>
              <div className="flex h-[82%] items-end justify-center gap-0.5">
                <div style={{ height: `${collectedHeight}%` }} className="w-1/2 min-w-1 rounded-t bg-ok transition-opacity group-hover:opacity-80" />
                <div style={{ height: `${pendingHeight}%` }} className="w-1/2 min-w-1 rounded-t bg-bus transition-opacity group-hover:opacity-80" />
              </div>
              <span className="mt-1 h-5 truncate text-center text-[10px] text-ink/60">{month.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentFeesChart({ months }) {
  const recent = months.slice(-6);
  const max = Math.max(...recent.map((month) => +month.collected + +month.pending), 1);
  return (
    <div className="mt-auto pt-7" role="img" aria-label="Recent monthly fee collection, comparing collected and pending amounts">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink/70">Monthly fee trend</p>
        <div className="flex gap-3 text-[10px] text-ink/60">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-ok" />Collected</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-bus" />Pending</span>
        </div>
      </div>
      <div className="flex h-32 items-end gap-2 rounded-lg bg-chalk-50 px-3 pt-2">
        {recent.map((month) => {
          const collectedHeight = (+month.collected / max) * 100;
          const pendingHeight = (+month.pending / max) * 100;
          return (
            <div key={month.month} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${formatMonth(month.month)}: ${money(month.collected)} collected, ${money(month.pending)} pending`}>
              <div className="flex h-[82%] items-end justify-center gap-0.5">
                <div style={{ height: `${collectedHeight}%` }} className="w-1/2 min-w-1 rounded-t bg-ok transition-opacity group-hover:opacity-80" />
                <div style={{ height: `${pendingHeight}%` }} className="w-1/2 min-w-1 rounded-t bg-bus transition-opacity group-hover:opacity-80" />
              </div>
              <span className="mt-1 h-4 text-center text-[10px] text-ink/60">{month.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeacherStatusChart({ teachers }) {
  const total = teachers.active + teachers.inactive;
  const activePercent = total ? (teachers.active / total) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-5 py-3 sm:flex-row sm:justify-center">
      <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: total ? `conic-gradient(#226b57 0% ${activePercent}%, #e9b837 ${activePercent}% 100%)` : '#e5e7eb' }}>
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
          <div><p className="font-display text-3xl font-bold">{teachers.active}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-ink/60">Active</p></div>
        </div>
      </div>
      <div className="w-full max-w-48 space-y-3">
        <div className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-board" />Active</span><strong>{teachers.active}</strong></div>
        <div className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-bus" />Inactive</span><strong>{teachers.inactive}</strong></div>
        <p className="border-t border-chalk-200 pt-2 text-xs text-ink/60">{total} teachers in total</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const today = todayISO();
  const [now, setNow] = useState(() => new Date());
  const [range, setRange] = useState({ from: daysAgo(13, today), to: today });
  const [draftRange, setDraftRange] = useState(range);
  const [academicYearId, setAcademicYearId] = useState('');
  const { data, loading, error, reload } = useAsync(
    () => api.get('/dashboard', { ...range, ...(academicYearId ? { academic_year_id: academicYearId } : {}) }),
    [range.from, range.to, academicYearId],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { totals, fees, attendance_trend: trend, attendance_range: activeRange, classes, recent_students: recent, unpaid_fees: unpaid, yearly_progress: yearlyProgress, teacher_status: teacherStatus, academic_years: academicYears, selected_academic_year: selectedAcademicYear } = data;
  const rate = percent(totals.today_present, totals.today_marked);
  const billed = fees.collected + fees.pending;
  const maxClass = Math.max(...classes.map((c) => +c.students), 1);
  const rangeValid = draftRange.from <= draftRange.to && draftRange.from <= today && draftRange.to <= today
    && (new Date(`${draftRange.to}T00:00:00`) - new Date(`${draftRange.from}T00:00:00`)) / 86400000 < 90;
  const selectPreset = (days) => {
    const next = { from: daysAgo(days - 1, today), to: today };
    setDraftRange(next);
    setRange(next);
  };

  return (
    <>
      <header className="relative -top-2 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-chalk-300 pb-5">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-ink/60">Good day, {user.name.split(' ')[0]}. Here is how the academy is doing today.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-sm font-semibold"><Clock3 size={15} className="text-ink/60" />{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p className="mt-0.5 text-xs text-ink/60">{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <Link to="/announcements" aria-label="View announcements" title="View announcements" className="relative grid h-11 w-11 place-items-center rounded-xl border border-chalk-300 bg-white text-ink transition-colors hover:bg-chalk-100">
            <Bell size={19} />
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Active students" value={totals.students} icon={Users} tone="bg-board-100 text-board" />
        <Stat label="Classes" value={totals.classes} icon={School} tone="bg-bus-100 text-[#8a6500]" />
        <Stat label="Active teachers" value={totals.teachers} icon={UserRound} tone="bg-board-100 text-board" />
        <Stat label="Pending admissions" value={totals.pending_admissions} icon={Users} tone="bg-bus-100 text-[#8a6500]" />
        <Stat label="Present today" value={totals.today_marked ? `${rate}%` : '—'} sub={totals.today_marked ? `${totals.today_present} of ${totals.today_marked} marked` : 'Not marked yet'} icon={CalendarCheck} tone="bg-ok-100 text-ok" />
        <Stat label="Fees pending" value={money(fees.pending)} sub={formatMonth(fees.month)} icon={Wallet} tone="bg-bad-100 text-bad" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Attendance trend" className="lg:col-span-2"
          action={<div className="flex gap-3 text-xs text-ink/70"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-ok" />Present</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-bus" />Leave</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-bad" />Absent</span></div>}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold"><TrendingUp size={16} className="text-board" />Daily attendance</p>
              <p className="mt-1 text-xs text-ink/60">Showing {formatDate(activeRange.from)} – {formatDate(activeRange.to)}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Input aria-label="Attendance start date" type="date" value={draftRange.from} max={today} onChange={(event) => setDraftRange((current) => ({ ...current, from: event.target.value }))} className="h-9 text-xs" wrapperClass="w-36" />
              <Input aria-label="Attendance end date" type="date" value={draftRange.to} min={draftRange.from} max={today} onChange={(event) => setDraftRange((current) => ({ ...current, to: event.target.value }))} className="h-9 text-xs" wrapperClass="w-36" />
              <button type="button" disabled={!rangeValid} onClick={() => setRange(draftRange)} className="h-9 rounded-lg bg-board px-3 text-xs font-semibold text-white transition-colors hover:bg-board/90 disabled:cursor-not-allowed disabled:opacity-50">Apply</button>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {[7, 14, 30].map((days) => {
              const active = range.from === daysAgo(days - 1, today) && range.to === today;
              return <button key={days} type="button" onClick={() => selectPreset(days)} className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${active ? 'bg-board text-white' : 'bg-chalk-100 text-ink/70 hover:bg-chalk-200'}`}>Last {days} days</button>;
            })}
            <span className="ml-auto flex items-center gap-1 text-[11px] text-ink/50"><CalendarDays size={13} />Up to 90 days</span>
          </div>
          <RegisterChart days={trend} from={activeRange.from} to={activeRange.to} />
        </Card>

        <Card title={`Fee collection · ${formatMonth(fees.month)}`} className="flex flex-col" contentClassName="flex flex-1 flex-col">
          <div>
            <p className="font-display text-3xl font-bold">{billed ? `${percent(fees.collected, billed)}%` : '—'}</p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-chalk-200"><div className="h-full rounded-full bg-ok" style={{ width: `${percent(fees.collected, billed)}%` }} /></div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink/60">Collected</dt><dd className="font-semibold">{money(fees.collected)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/60">Pending</dt><dd className="font-semibold text-bad">{money(fees.pending)}</dd></div>
            </dl>
          </div>
          <RecentFeesChart months={yearlyProgress} />
        </Card>

        <div className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Yearly progress</h2>
              <p className="mt-0.5 text-sm text-ink/60">Academic performance and fee collection across the school year.</p>
            </div>
            {academicYears.length > 0 && (
              <label className="text-xs font-semibold text-ink/70">
                Academic year
                <select value={academicYearId || selectedAcademicYear?.id || ''} onChange={(event) => setAcademicYearId(event.target.value)} className="ml-2 h-10 rounded-lg border border-chalk-300 bg-white px-3 text-sm text-ink focus:border-board focus:outline-none focus:ring-2 focus:ring-board/20">
                  {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}{year.status === 'current' ? ' · Current' : ''}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Academic results" className="lg:col-span-1">
              <AcademicProgressChart months={yearlyProgress} />
            </Card>
            <Card title="Fees by month" className="lg:col-span-1">
              <YearlyFeesChart months={yearlyProgress} />
            </Card>
            <Card title="Teacher activity">
              <TeacherStatusChart teachers={teacherStatus} />
            </Card>
          </div>
        </div>

        <Card title="Students per class">
          {classes.length === 0 ? <p className="text-sm text-ink/60">No classes yet.</p> : (
            <ul className="space-y-3">
              {classes.map((c) => (
                <li key={c.name}>
                  <div className="mb-1 flex justify-between gap-2 text-sm"><span className="truncate font-medium">{c.name}</span><span className="text-ink/60">{c.students}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-chalk-200"><div className="h-full rounded-full bg-board" style={{ width: `${(+c.students / maxClass) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recently admitted">
          {recent.length === 0 ? <p className="text-sm text-ink/60">No students yet.</p> : (
            <ul className="divide-y divide-chalk-200">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="text-xs text-ink/60">{s.class_name}</p></div>
                  <span className="shrink-0 text-xs text-ink/60">{formatDate(s.admitted_on)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Oldest unpaid fees">
          {unpaid.length === 0 ? <p className="text-sm text-ink/60">Everything is paid up. Nice.</p> : (
            <ul className="divide-y divide-chalk-200">
              {unpaid.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0"><p className="truncate font-semibold">{f.student_name}</p><p className="text-xs text-ink/60">{formatMonth(f.month)}</p></div>
                  <span className="shrink-0 font-semibold text-bad">{money(f.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
