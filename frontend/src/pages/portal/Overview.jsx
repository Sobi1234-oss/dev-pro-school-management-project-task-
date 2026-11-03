import { api } from '../../lib/api';
import { useAsync } from '../../hooks/useAsync';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import { formatDate, formatMonth, money, percent } from '../../lib/format';
import { gradeTone } from '../admin/Results';
import AnnouncementFeed from '../../components/AnnouncementFeed';

function Ring({ value, label }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${label}: ${value}%`}>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-chalk-200" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className={value >= 75 ? 'stroke-ok' : value >= 60 ? 'stroke-bus' : 'stroke-bad'} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><p className="font-display text-3xl font-extrabold">{value}%</p><p className="text-xs text-ink/60">{label}</p></div></div>
    </div>
  );
}

const DOT = { present: 'bg-ok', absent: 'bg-bad', leave: 'bg-bus' };

export default function Overview() {
  const { data, loading, error, reload } = useAsync(() => api.get('/portal/overview'), []);
  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { student, attendance: a, subjects, results, fees, fee_payments: feePayments } = data;
  const rate = percent(a.present, a.total);
  const due = fees.filter((f) => f.status === 'unpaid').reduce((s, f) => s + +f.amount, 0);

  return (
    <>
      <PageHeader title={student.name} subtitle={`${student.class_name} · Roll ${student.roll_no} · Class teacher ${student.teacher}`} />

      <div className="mb-4"><AnnouncementFeed /></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Attendance">
          {a.total === 0 ? <p className="text-sm text-ink/60">No attendance has been recorded yet.</p> : (
            <>
              <div className="flex items-center gap-5">
                <Ring value={rate} label="present" />
                <dl className="space-y-1.5 text-sm">
                  <div><dt className="inline text-ink/60">Present </dt><dd className="inline font-bold text-ok">{a.present}</dd></div>
                  <div><dt className="inline text-ink/60">Absent </dt><dd className="inline font-bold text-bad">{a.absent}</dd></div>
                  <div><dt className="inline text-ink/60">Leave </dt><dd className="inline font-bold text-[#8a6500]">{a.leave}</dd></div>
                </dl>
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5" aria-label="Last 14 days">
                {[...a.recent].reverse().map((d) => <span key={d.date} title={`${formatDate(d.date)}: ${d.status}`} className={`h-5 w-5 rounded ${DOT[d.status]}`} />)}
              </div>
            </>
          )}
        </Card>

        <Card title="Subject averages" className="lg:col-span-2">
          {subjects.length === 0 ? <p className="text-sm text-ink/60">Results will appear after the first exam is recorded.</p> : (
            <ul className="space-y-4">
              {subjects.map((s) => (
                <li key={s.subject}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{s.subject}</span><Badge tone={gradeTone(+s.percentage)}>{+s.percentage}%</Badge></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-chalk-200"><div className={`h-full rounded-full ${+s.percentage >= 75 ? 'bg-ok' : +s.percentage >= 50 ? 'bg-bus' : 'bg-bad'}`} style={{ width: `${s.percentage}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent exams" className="lg:col-span-2" pad={false}>
          {results.length === 0 ? <EmptyState title="No exams yet" /> : (
            <ul className="divide-y divide-chalk-200">
              {results.slice(0, 8).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0"><p className="truncate font-semibold">{r.subject}</p><p className="text-xs text-ink/60">{r.exam} · {formatDate(r.exam_date)}</p></div>
                  <span className="shrink-0 font-semibold">{+r.marks_obtained}<span className="font-normal text-ink/60"> / {+r.total_marks}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Fees" pad={false}>
          <p className={`px-5 pt-1 text-sm ${due ? 'text-bad' : 'text-ok'}`}>{due ? `${money(due)} outstanding` : 'All fees are paid'}</p>
          {fees.length === 0 ? <EmptyState title="No fee records" /> : (
            <ul className="mt-2 divide-y divide-chalk-200">
              {fees.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0"><p className="truncate font-semibold">{formatMonth(f.month)}</p><p className="text-xs text-ink/60">{money(f.amount)}</p>
                    {feePayments.filter((payment) => Number(payment.fee_id) === Number(f.id)).map((payment) => <p key={payment.receipt_number} className="truncate text-[11px] text-ink/50">{payment.receipt_number} · {money(payment.amount)}</p>)}
                  </div>
                  <Badge tone={f.status === 'paid' ? 'ok' : 'bad'}>{f.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
