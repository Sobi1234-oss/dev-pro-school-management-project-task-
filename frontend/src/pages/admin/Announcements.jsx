import { Bell, Plus } from 'lucide-react';
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
import { formatDate, todayISO } from '../../lib/format';

const FIELDS = [
  { name: 'title', label: 'Announcement title', required: true, maxLength: 160, full: true },
  { name: 'body', label: 'Message', type: 'textarea', required: true, maxLength: 5000, full: true },
  { name: 'audience', label: 'Audience', type: 'select', required: true, options: [{ value: 'all', label: 'Everyone' }, { value: 'teachers', label: 'Teachers' }, { value: 'students', label: 'Students / parents' }], default: 'all' },
  { name: 'starts_on', label: 'Publish date', type: 'date', required: true },
  { name: 'ends_on', label: 'End date', type: 'date', hint: 'Optional; leave empty to keep it visible.' },
];

const COLUMNS = [
  { key: 'title', header: 'Announcement', primary: true, render: (row) => <><span>{row.title}</span><span className="block max-w-md truncate text-xs font-normal text-ink/60">{row.body}</span></> },
  { key: 'audience', header: 'Audience', render: (row) => <Badge tone="info">{row.audience === 'students' ? 'Students / parents' : row.audience}</Badge> },
  { key: 'starts_on', header: 'Publish date', render: (row) => formatDate(row.starts_on) },
  { key: 'ends_on', header: 'Ends', render: (row) => row.ends_on ? formatDate(row.ends_on) : 'No end date' },
  { key: 'author_name', header: 'Created by' },
];

export default function Announcements() {
  const { data, loading, error, reload } = useAsync(() => api.get('/announcements'), []);
  const crud = useCrud({ endpoint: '/announcements', noun: 'Announcement', reload });
  const add = <Button icon={Plus} onClick={() => crud.setEditing({ starts_on: todayISO(), audience: 'all' })}>New announcement</Button>;
  return (
    <>
      <PageHeader title="Announcements" subtitle="Publish dated updates for everyone, teachers, or students and parents.">{add}</PageHeader>
      <Card pad={false}>
        <DataTable columns={COLUMNS} rows={data?.data} loading={loading} error={error} onRetry={reload}
          empty={<EmptyState icon={Bell} title="No announcements" message="Create the first school update." action={add} />}
          actions={(row) => <RowActions onEdit={() => crud.setEditing(row)} onDelete={() => crud.setDeleting(row)} />} />
      </Card>
      <ResourceForm open={!!crud.editing} title={crud.editing?.id ? 'Edit announcement' : 'New announcement'} fields={FIELDS} initial={crud.editing} onSubmit={crud.save} onClose={() => crud.setEditing(null)} />
      <ConfirmDialog open={!!crud.deleting} title="Delete announcement?" message={`“${crud.deleting?.title}” will be deleted.`} onConfirm={crud.remove} onClose={() => crud.setDeleting(null)} />
    </>
  );
}
