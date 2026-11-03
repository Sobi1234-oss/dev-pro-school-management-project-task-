import { useMemo } from 'react';
import { Plus, School } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsync } from '../../hooks/useAsync';
import { money } from '../../lib/format';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import RowActions from '../../components/ui/RowActions';
import ResourceForm from '../../components/ui/ResourceForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { useCrud } from '../../components/ui/useCrud';
import { Select } from '../../components/ui/Field';

const FIELDS = [
  { name: 'name', label: 'Class name', required: true, placeholder: 'e.g. Grade 8', full: true },
  { name: 'teacher_id', label: 'Class teacher', type: 'select', required: true },
  { name: 'monthly_fee', label: 'Monthly fee (Rs)', type: 'number', required: true },
];

const COLUMNS = [
  { key: 'name', header: 'Class', primary: true },
  { key: 'teacher_name', header: 'Teacher' },
  { key: 'student_count', header: 'Active students' },
  { key: 'monthly_fee', header: 'Monthly fee', render: (r) => money(r.monthly_fee) },
];

export default function Classes() {
  const { data, loading, error, reload } = useAsync(() => api.get('/classes'), []);
  const teachers = useAsync(() => api.get('/teachers'), []);
  const crud = useCrud({ endpoint: '/classes', noun: 'Class', reload });
  const selectedTeacherId = String(crud.editing?.teacher_id ?? '');
  const fields = useMemo(() => FIELDS.map((field) => field.name === 'teacher_id'
    ? { ...field, options: (teachers.data?.data || []).filter((t) => t.status === 'active' || String(t.id) === selectedTeacherId).map((t) => ({ value: t.id, label: t.name })) }
    : field), [teachers.data, selectedTeacherId]);
  const hasTeachers = (teachers.data?.data || []).some((teacher) => teacher.status === 'active');
  const add = <Button icon={Plus} onClick={() => crud.setEditing({})} disabled={!hasTeachers} title={!hasTeachers ? 'Add an active teacher first' : undefined}>Add class</Button>;

  return (
    <>
      <PageHeader title="Classes" subtitle="Organize students, assign teachers and set fee plans.">{add}</PageHeader>
      {teachers.error && <div className="mb-4"><ErrorState error={teachers.error} onRetry={teachers.reload} /></div>}
      {!teachers.loading && !teachers.error && !hasTeachers && (
        <p className="mb-4 rounded-lg border border-chalk-300 bg-white p-4 text-sm text-ink/70">
          Add an active teacher on the <Link className="font-semibold text-board underline" to="/teachers">Teachers page</Link> before creating classes.
        </p>
      )}
      <Card pad={false}>
        <DataTable columns={COLUMNS} rows={data?.data} loading={loading} error={error} onRetry={reload}
          empty={<EmptyState icon={School} title="No classes yet" message="Create your first class to start admitting students." action={add} />}
          actions={(row) => <RowActions onEdit={() => crud.setEditing(row)} onDelete={() => crud.setDeleting(row)} />} />
      </Card>
      <ResourceForm open={!!crud.editing} title={crud.editing?.id ? 'Edit class' : 'Add class'} fields={fields} initial={crud.editing} onSubmit={crud.save} onClose={() => crud.setEditing(null)} />
      <ConfirmDialog open={!!crud.deleting} title="Delete class?" message={`“${crud.deleting?.name}” will be removed. Classes that still have students cannot be deleted.`} onConfirm={crud.remove} onClose={() => crud.setDeleting(null)} />
    </>
  );
}
