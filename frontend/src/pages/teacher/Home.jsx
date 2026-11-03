import { CalendarDays, ClipboardList, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../hooks/useAsync';
import PageHeader from '../../components/ui/PageHeader';
import Card, { Stat } from '../../components/ui/Card';
import DataTable from '../../components/ui/DataTable';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';
import AnnouncementFeed from '../../components/AnnouncementFeed';
import TeacherWorkflows from './Workflows';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TeacherHome() {
  const { data, loading, error, reload } = useAsync(() => api.get('/teacher/overview'), []);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const scheduleColumns = [
    { key: 'day_of_week', header: 'Day', primary: true, render: (row) => DAYS[Number(row.day_of_week) - 1] || '—' },
    { key: 'starts_at', header: 'Time', render: (row) => `${String(row.starts_at).slice(0, 5)}–${String(row.ends_at).slice(0, 5)}` },
    { key: 'subject_name', header: 'Subject' },
    { key: 'class_name', header: 'Class' },
    { key: 'section_name', header: 'Section' },
    { key: 'room', header: 'Room' },
  ];
  const assignmentColumns = [
    { key: 'subject_name', header: 'Subject', primary: true },
    { key: 'class_name', header: 'Class' },
    { key: 'section_name', header: 'Section' },
    { key: 'academic_year_name', header: 'Academic year' },
    { key: 'student_count', header: 'Students' },
  ];

  return (
    <>
      <PageHeader title={`Welcome, ${data.teacher.name.split(' ')[0]}`} subtitle="Your teaching assignments and weekly timetable." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Subject assignments" value={data.assignments.length} icon={ClipboardList} tone="bg-board-100 text-board" />
        <Stat label="Scheduled lessons" value={data.schedule.length} icon={CalendarDays} tone="bg-bus-100 text-[#8a6500]" />
        <Stat label="Assigned students" value={data.student_count} icon={Users} tone="bg-ok-100 text-ok" />
      </div>
      <div className="mt-5 space-y-5">
        <AnnouncementFeed />
        <Card title="Weekly timetable" pad={false}>
          <DataTable columns={scheduleColumns} rows={data.schedule} empty={<EmptyState icon={CalendarDays} title="No lessons scheduled" message="Ask an administrator to add your timetable." />} />
        </Card>
        <Card title="My teaching assignments" pad={false}>
          <DataTable columns={assignmentColumns} rows={data.assignments} empty={<EmptyState icon={ClipboardList} title="No assignments yet" message="Ask an administrator to assign you a subject and section." />} />
        </Card>
        <TeacherWorkflows assignments={data.assignments} />
      </div>
    </>
  );
}
