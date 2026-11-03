import { Bell } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../hooks/useAsync';
import Card from './ui/Card';
import { EmptyState, ErrorState, Spinner } from './ui/States';
import { formatDate } from '../lib/format';

export default function AnnouncementFeed() {
  const { data, loading, error, reload } = useAsync(() => api.get('/announcements/visible'), []);
  return (
    <Card title="School announcements" pad={false}>
      {loading && !data ? <Spinner variant="inline" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : !data?.data?.length
        ? <EmptyState icon={Bell} title="No current announcements" />
        : <ul className="divide-y divide-chalk-200">{data.data.map((item) => (
          <li key={item.id} className="px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{item.title}</h3>
              <time className="text-xs text-ink/60">{formatDate(item.starts_on)}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink/75">{item.body}</p>
          </li>
        ))}</ul>}
    </Card>
  );
}
