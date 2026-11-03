import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync, useDebounced } from '../../hooks/useAsync';
import { formatDate, todayISO } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBox from '../../components/ui/SearchBox';
import { Select } from '../../components/ui/Field';
import DataTable from '../../components/ui/DataTable';
import RowActions from '../../components/ui/RowActions';
import ResourceForm from '../../components/ui/ResourceForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/States';
import { useCrud } from '../../components/ui/useCrud';

const COLUMNS = [
  { key: 'name', header: 'Student', primary: true, render: (r) => <><span>{r.name}</span><span className="block text-xs font-normal text-ink/60">Roll {r.roll_no}</span></> },
  { key: 'class_name', header: 'Class' },
  { key: 'section_name', header: 'Section', render: (row) => row.section_name || '—' },
  { key: 'parent_name', header: 'Parent', render: (r) => <><span>{r.parent_name}</span><span className="block text-xs text-ink/60">{r.phone}</span></> },
  { key: 'admitted_on', header: 'Admitted', render: (r) => formatDate(r.admitted_on) },
  { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'ok' : 'neutral'}>{r.status}</Badge> },
  { key: 'admission_status', header: 'Admission', render: (r) => <Badge tone={r.admission_status === 'approved' ? 'ok' : r.admission_status === 'pending' ? 'warn' : 'bad'}>{r.admission_status}</Badge> },
];

export default function Students() {
  const [q, setQ] = useState('');
  const [classId, setClassId] = useState('');
  const [admissionStatus, setAdmissionStatus] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);

  const classes = useAsync(() => api.get('/classes'), []);
  const sections = useAsync(() => api.get('/sections'), []);
  const list = useAsync(() => api.get('/students', { q: dq, class_id: classId, admission_status: admissionStatus, page }), [dq, classId, admissionStatus, page]);
  const crud = useCrud({ endpoint: '/students', noun: 'Student', reload: list.reload });

  const classOptions = useMemo(() => (classes.data?.data || []).map((c) => ({ value: c.id, label: c.name })), [classes.data]);
  const sectionOptions = useMemo(() => (sections.data?.data || []).map((s) => ({ value: s.id, label: `${s.class_name} ${s.name} · ${s.academic_year_name}` })), [sections.data]);
  const isEdit = Boolean(crud.editing?.id);

  const fields = [
    { name: 'name', label: 'Student name', required: true, full: true },
    { name: 'class_id', label: 'Class', type: 'select', options: classOptions, required: true },
    { name: 'section_id', label: 'Section', type: 'select', options: sectionOptions, placeholder: 'No section assigned' },
    { name: 'roll_no', label: 'Roll number', required: true },
    { name: 'parent_name', label: 'Parent / guardian', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '03XX XXXXXXX' },
    { name: 'date_of_birth', label: 'Date of birth', type: 'date' },
    { name: 'gender', label: 'Gender', type: 'select', placeholder: 'Not specified', options: [{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'other', label: 'Other' }] },
    { name: 'guardian_email', label: 'Guardian contact email', type: 'email' },
    { name: 'emergency_contact', label: 'Emergency contact', type: 'tel' },
    { name: 'address', label: 'Home address', full: true },
    { name: 'admitted_on', label: 'Admission date', type: 'date', required: true, default: todayISO() },
    { name: 'admission_status', label: 'Admission decision', type: 'select', options: [{ value: 'pending', label: 'Pending review' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }], default: 'approved', required: true },
    { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], default: 'active', required: true },
    ...(isEdit
      ? [{ name: 'password', label: 'Reset portal password', type: 'password', hint: 'Leave blank to keep the current one.', full: true }]
      : [
          { name: 'email', label: 'Parent portal email', type: 'email', hint: 'Optional. Lets the parent sign in.', full: true },
          { name: 'password', label: 'Portal password', type: 'password', hint: 'Minimum 8 characters.', full: true },
        ]),
  ];

  const add = <Button icon={Plus} onClick={() => crud.setEditing({})} disabled={!classOptions.length} title={!classOptions.length ? 'Create a class first' : undefined}>Add student</Button>;

  return (
    <>
      <PageHeader title="Students" subtitle="Admissions, guardians and portal access.">{add}</PageHeader>
      <Card pad={false}>
        <div className="flex flex-col gap-3 border-b border-chalk-200 p-4 sm:flex-row">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, roll no or parent" />
          <Select aria-label="Filter by class" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} options={classOptions} placeholder="All classes" wrapperClass="sm:w-48" />
          <Select aria-label="Filter by admission decision" value={admissionStatus} onChange={(e) => { setAdmissionStatus(e.target.value); setPage(1); }} options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} placeholder="All admissions" wrapperClass="sm:w-44" />
        </div>
        <DataTable columns={COLUMNS} rows={list.data?.data} meta={list.data?.meta} onPage={setPage} loading={list.loading} error={list.error} onRetry={list.reload}
          empty={<EmptyState icon={Users} title={dq || classId || admissionStatus ? 'No matching students' : 'No students yet'} message={dq || classId || admissionStatus ? 'Try a different search or filter.' : 'Add your first student to get started.'} action={!dq && !classId && !admissionStatus ? add : null} />}
          actions={(row) => <RowActions onEdit={() => crud.setEditing(row)} onDelete={() => crud.setDeleting(row)} />} />
      </Card>
      <ResourceForm open={!!crud.editing} title={isEdit ? 'Edit student' : 'Add student'} fields={fields} initial={crud.editing} onSubmit={crud.save} onClose={() => crud.setEditing(null)} />
      <ConfirmDialog open={!!crud.deleting} title="Remove student?" message={`${crud.deleting?.name} and their attendance, results, and fee records will be removed. Students with payment receipts must be deactivated instead.`} onConfirm={crud.remove} onClose={() => crud.setDeleting(null)} />
    </>
  );
}
