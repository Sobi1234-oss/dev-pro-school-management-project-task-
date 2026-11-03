import { Plus, UserRound } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../hooks/useAsync';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import RowActions from '../../components/ui/RowActions';
import ResourceForm from '../../components/ui/ResourceForm';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/States';
import { useCrud } from '../../components/ui/useCrud';

const COLUMNS = [
  { key: 'name', header: 'Teacher', primary: true },
  { key: 'specialization', header: 'Specialization' },
  { key: 'email', header: 'Contact', render: (row) => <><span>{row.email || '—'}</span><span className="block text-xs font-normal text-ink/60">{row.phone || ''}</span></> },
  { key: 'user_id', header: 'Portal access', render: (row) => <Badge tone={row.user_id ? 'ok' : 'neutral'}>{row.user_id ? 'Enabled' : 'Not set up'}</Badge> },
  { key: 'class_count', header: 'Classes' },
  { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'active' ? 'ok' : 'neutral'}>{row.status}</Badge> },
];

export default function Teachers() {
  const { data, loading, error, reload } = useAsync(() => api.get('/teachers'), []);
  const crud = useCrud({ endpoint: '/teachers', noun: 'Teacher', reload });
  const editingExisting = Boolean(crud.editing?.id);
  const hasLogin = Boolean(crud.editing?.user_id);
  const fields = [
    { name: 'name', label: 'Full name', required: true, full: true },
    { name: 'specialization', label: 'Subject / specialization', placeholder: 'e.g. Mathematics' },
    { name: 'phone', label: 'Phone', type: 'tel', placeholder: '03XX XXXXXXX' },
    { name: 'email', label: 'Login email', type: 'email', required: hasLogin, hint: hasLogin ? 'This email is used to sign in.' : 'Optional; add a password to enable teacher sign-in.', full: true },
    { name: 'password', label: editingExisting ? (hasLogin ? 'Reset login password' : 'Create login password') : 'Initial login password', type: 'password', hint: 'Leave blank for profile-only access; minimum 8 characters to enable or reset sign-in.', full: true },
    { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], default: 'active', required: true },
  ];
  const add = <Button icon={Plus} onClick={() => crud.setEditing({})}>Add teacher</Button>;

  return (
    <>
      <PageHeader title="Teachers" subtitle="Manage teacher profiles and optional portal sign-in.">{add}</PageHeader>
      <Card pad={false}>
        <DataTable columns={COLUMNS} rows={data?.data} loading={loading} error={error} onRetry={reload}
          empty={<EmptyState icon={UserRound} title="No teachers yet" message="Add teachers here, then assign them to classes." action={add} />}
          actions={(row) => <RowActions onEdit={() => crud.setEditing(row)} onDelete={() => crud.setDeleting(row)} />} />
      </Card>
      <ResourceForm open={!!crud.editing} title={crud.editing?.id ? 'Edit teacher' : 'Add teacher'} fields={fields} initial={crud.editing} onSubmit={crud.save} onClose={() => crud.setEditing(null)} />
      <ConfirmDialog open={!!crud.deleting} title="Delete teacher?" message={crud.deleting?.class_count > 0
        ? `${crud.deleting?.name} is assigned to ${crud.deleting.class_count} class(es). Reassign those classes before deleting this teacher.`
        : `${crud.deleting?.name} will be removed. This cannot be undone.`} onConfirm={crud.remove} onClose={() => crud.setDeleting(null)} />
    </>
  );
}
