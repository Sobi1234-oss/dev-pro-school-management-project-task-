import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { todayISO } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';

const OPTIONS = [
  { value: 'present', label: 'P', full: 'Present', on: 'bg-ok text-white' },
  { value: 'absent', label: 'A', full: 'Absent', on: 'bg-bad text-white' },
  { value: 'leave', label: 'L', full: 'Leave', on: 'bg-bus text-ink' },
];

function Segmented({ value, onChange, name }) {
  return (
    <div role="radiogroup" aria-label={`Attendance for ${name}`} className="inline-flex overflow-hidden rounded-lg border border-chalk-300">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} aria-label={o.full} title={o.full} onClick={() => onChange(o.value)}
          className={`h-10 w-11 text-sm font-bold transition-colors ${value === o.value ? o.on : 'bg-white text-ink/60 hover:bg-chalk-200'}`}>{o.label}</button>
      ))}
    </div>
  );
}

export default function Attendance() {
  const toast = useToast();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const classes = useAsync(() => api.get('/classes'), []);
  const roster = useAsync(() => (classId ? api.get('/attendance', { class_id: classId, date }) : Promise.resolve({ data: [] })), [classId, date]);

  useEffect(() => {
    if (roster.data) setMarks(Object.fromEntries(roster.data.data.map((s) => [s.student_id, s.status || 'present'])));
  }, [roster.data]);

  const rows = roster.data?.data || [];
  const counts = useMemo(() => Object.values(marks).reduce((a, s) => ({ ...a, [s]: (a[s] || 0) + 1 }), {}), [marks]);
  const alreadySaved = rows.some((r) => r.status);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/attendance', { class_id: Number(classId), date, records: rows.map((r) => ({ student_id: r.student_id, status: marks[r.student_id] })) });
      toast.success('Attendance saved.');
      roster.reload();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader title="Attendance" subtitle="Take the daily register in a few taps." />
      <Card pad={false}>
        <div className="grid gap-3 border-b border-chalk-200 p-4 sm:grid-cols-2">
          <Select label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Choose a class" options={(classes.data?.data || []).map((c) => ({ value: c.id, label: c.name }))} />
          <Input label="Date" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
        </div>

        {!classId ? <EmptyState icon={CalendarCheck} title="Pick a class" message="Choose a class and date to open its register." />
          : roster.loading && !rows.length ? <Spinner variant="inline" />
          : roster.error ? <ErrorState error={roster.error} onRetry={roster.reload} />
          : !rows.length ? <EmptyState title="No active students" message="This class has no active students to mark." />
          : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-chalk-200 px-4 py-3 text-sm">
                <p className="text-ink/70">
                  <b className="text-ok">{counts.present || 0}</b> present · <b className="text-bad">{counts.absent || 0}</b> absent · <b className="text-[#8a6500]">{counts.leave || 0}</b> leave
                  {alreadySaved && <span className="ml-2 text-xs text-ink/50">(previously saved)</span>}
                </p>
                <Button size="sm" variant="secondary" onClick={() => setMarks(Object.fromEntries(rows.map((r) => [r.student_id, 'present'])))}>Mark all present</Button>
              </div>
              <ul className="divide-y divide-chalk-200">
                {rows.map((r) => (
                  <li key={r.student_id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0"><p className="truncate font-semibold">{r.name}</p><p className="text-xs text-ink/60">Roll {r.roll_no}</p></div>
                    <Segmented name={r.name} value={marks[r.student_id]} onChange={(v) => setMarks((m) => ({ ...m, [r.student_id]: v }))} />
                  </li>
                ))}
              </ul>
              <div className="sticky bottom-0 flex justify-end rounded-b-xl border-t border-chalk-200 bg-white p-4">
                <Button icon={Save} loading={saving} onClick={save} className="w-full sm:w-auto">Save attendance</Button>
              </div>
            </>
          )}
      </Card>
    </>
  );
}
