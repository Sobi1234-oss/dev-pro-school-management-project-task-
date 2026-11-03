import { useMemo, useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { formatDate, percent, todayISO } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBox from '../../components/ui/SearchBox';
import DataTable from '../../components/ui/DataTable';
import RowActions from '../../components/ui/RowActions';
import ResourceForm from '../../components/ui/ResourceForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/States';
import { useCrud } from '../../components/ui/useCrud';

export const gradeTone = (p) => (p >= 75 ? 'ok' : p >= 50 ? 'warn' : 'bad');

const COLUMNS = [
  { key: 'student_name', header: 'Student', primary: true, render: (r) => <><span>{r.student_name}</span><span className="block text-xs font-normal text-ink/60">{r.class_name}</span></> },
  { key: 'subject', header: 'Subject' },
  { key: 'exam', header: 'Exam', render: (r) => <><span>{r.exam}</span><span className="block text-xs text-ink/60">{formatDate(r.exam_date)}</span></> },
  { key: 'marks', header: 'Marks', render: (r) => <>{+r.marks_obtained} / {+r.total_marks}</> },
  { key: 'pct', header: 'Score', render: (r) => { const p = percent(r.marks_obtained, r.total_marks); return <Badge tone={gradeTone(p)}>{p}%</Badge>; } },
];

export default function Results() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const students = useAsync(() => api.get('/students/options'), []);
  const list = useAsync(() => api.get('/results', { q: dq, page }), [dq, page]);
  const crud = useCrud({ endpoint: '/results', noun: 'Result', reload: list.reload });

  const fields = useMemo(() => [
    { name: 'student_id', label: 'Student', type: 'select', required: true, full: true, options: (students.data?.data || []).map((s) => ({ value: s.id, label: `${s.name} · ${s.class_name}` })) },
    { name: 'subject', label: 'Subject', required: true },
    { name: 'exam', label: 'Exam', required: true, placeholder: 'e.g. Mid-Term' },
    { name: 'marks_obtained', label: 'Marks obtained', type: 'number', required: true },
    { name: 'total_marks', label: 'Total marks', type: 'number', required: true, default: 100 },
    { name: 'exam_date', label: 'Exam date', type: 'date', required: true, default: todayISO(), full: true },
  ], [students.data]);

  const add = <Button icon={Plus} onClick={() => crud.setEditing({})}>Add result</Button>;

  return (
    <>
      <PageHeader title="Results" subtitle="Exam marks that parents see on their portal.">{add}</PageHeader>
      <Card pad={false}>
        <div className="border-b border-chalk-200 p-4"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search student, subject or exam" /></div>
        <DataTable columns={COLUMNS} rows={list.data?.data} meta={list.data?.meta} onPage={setPage} loading={list.loading} error={list.error} onRetry={list.reload}
          empty={<EmptyState icon={ClipboardList} title={dq ? 'No matching results' : 'No results recorded'} message={dq ? 'Try a different search.' : 'Add exam marks and they will show up here.'} action={!dq ? add : null} />}
          actions={(row) => <RowActions onEdit={() => crud.setEditing(row)} onDelete={() => crud.setDeleting(row)} />} />
      </Card>
      <ResourceForm open={!!crud.editing} title={crud.editing?.id ? 'Edit result' : 'Add result'} fields={fields} initial={crud.editing} onSubmit={crud.save} onClose={() => crud.setEditing(null)} />
      <ConfirmDialog open={!!crud.deleting} title="Delete result?" message={`${crud.deleting?.subject} (${crud.deleting?.exam}) for ${crud.deleting?.student_name} will be deleted.`} onConfirm={crud.remove} onClose={() => crud.setDeleting(null)} />
    </>
  );
}
