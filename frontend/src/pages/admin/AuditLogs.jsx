import { ScrollText } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../hooks/useAsync';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/States';

const COLUMNS = [
  { key: 'created_at', header: 'Time', primary: true, render: (row) => new Date(row.created_at.replace(' ', 'T')).toLocaleString() },
  { key: 'actor_name', header: 'Staff member', render: (row) => row.actor_name || 'Deleted account' },
  { key: 'method', header: 'Action' },
  { key: 'path', header: 'API route' },
  { key: 'ip', header: 'IP address' },
];

export default function AuditLogs() {
  const { data, loading, error, reload } = useAsync(() => api.get('/audit-logs'), []);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Successful create, update, and delete requests by authenticated users." />
      <Card pad={false}>
        <DataTable columns={COLUMNS} rows={data?.data} meta={data?.meta} loading={loading} error={error} onRetry={reload}
          empty={<EmptyState icon={ScrollText} title="No audit entries" message="Changes will be recorded here." />} />
      </Card>
    </>
  );
}
