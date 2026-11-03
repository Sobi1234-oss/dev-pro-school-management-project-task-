import { Plus, BookOpen, CalendarDays, Layers3, Link2, NotebookTabs, Clock3 } from 'lucide-react';
import { useState } from 'react';
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

function ResourcePanel({ title, endpoint, icon: Icon, fields, columns, emptyMessage, onChanged }) {
  const { data, loading, error, reload } = useAsync(() => api.get(endpoint), [endpoint]);
  const crud = useCrud({
    endpoint,
    noun: title.slice(0, -1),
    reload: () => {
      reload();
      onChanged?.();
    },
  });
  const add = <Button icon={Plus} onClick={() => crud.setEditing({})}>Add {title.slice(0, -1).toLowerCase()}</Button>;

  return (
    <Card title={title} pad={false}>
      <div className="flex justify-end border-b border-chalk-200 p-3">{add}</div>
      <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload}
        empty={<EmptyState icon={Icon} title={`No ${title.toLowerCase()} yet`} message={emptyMessage} action={add} />}
        actions={(row) => <RowActions onEdit={() => crud.setEditing(row)} onDelete={() => crud.setDeleting(row)} />} />
      <ResourceForm open={!!crud.editing} title={`${crud.editing?.id ? 'Edit' : 'Add'} ${title.slice(0, -1).toLowerCase()}`} fields={fields} initial={crud.editing} onSubmit={crud.save} onClose={() => crud.setEditing(null)} />
      <ConfirmDialog open={!!crud.deleting} title={`Delete ${title.slice(0, -1).toLowerCase()}?`} message={`“${crud.deleting?.name || crud.deleting?.subject_name || crud.deleting?.section_name || title}” will be removed. Records that are in use cannot be deleted.`} onConfirm={crud.remove} onClose={() => crud.setDeleting(null)} />
    </Card>
  );
}

export default function Academics() {
  const [revision, setRevision] = useState(0);
  const changed = () => setRevision((value) => value + 1);
  const years = useAsync(() => api.get('/academic-years'), [revision]);
  const subjects = useAsync(() => api.get('/subjects'), [revision]);
  const sections = useAsync(() => api.get('/sections'), [revision]);
  const classes = useAsync(() => api.get('/classes'), [revision]);
  const teachers = useAsync(() => api.get('/teachers'), [revision]);
  const assignments = useAsync(() => api.get('/section-subjects'), [revision]);

  const yearOptions = (years.data?.data || []).map((row) => ({ value: row.id, label: row.name }));
  const subjectOptions = (subjects.data?.data || []).filter((row) => row.status === 'active').map((row) => ({ value: row.id, label: row.name }));
  const sectionOptions = (sections.data?.data || []).map((row) => ({ value: row.id, label: `${row.class_name} ${row.name} · ${row.academic_year_name}` }));
  const classOptions = (classes.data?.data || []).map((row) => ({ value: row.id, label: row.name }));
  const teacherOptions = (teachers.data?.data || []).filter((row) => row.status === 'active').map((row) => ({ value: row.id, label: row.name }));
  const assignmentOptions = (assignments.data?.data || []).map((row) => ({ value: row.id, label: `${row.section_name} · ${row.subject_name} · ${row.teacher_name}` }));

  return (
    <>
      <PageHeader title="Academic setup" subtitle="Set school years, terms, subjects, sections, and teaching assignments." />
      <nav aria-label="Academic sections" className="mb-5 flex flex-wrap gap-2 text-sm">
        {[['years', 'Academic years'], ['terms', 'Terms'], ['subjects', 'Subjects'], ['sections', 'Sections'], ['assignments', 'Teaching assignments'], ['timetable', 'Timetable']].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-chalk-300 bg-white px-3 py-1.5 font-semibold text-ink/70 hover:border-board hover:text-board">{label}</a>
        ))}
      </nav>
      <div className="space-y-5">
        <section id="years" className="scroll-mt-20">
          <ResourcePanel title="Academic years" endpoint="/academic-years" icon={CalendarDays} onChanged={changed}
            fields={[
              { name: 'name', label: 'Year name', required: true, placeholder: '2026–2027', full: true },
              { name: 'starts_on', label: 'Start date', type: 'date', required: true },
              { name: 'ends_on', label: 'End date', type: 'date', required: true },
              { name: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'upcoming', label: 'Upcoming' }, { value: 'current', label: 'Current' }, { value: 'closed', label: 'Closed' }], default: 'upcoming', full: true },
            ]}
            columns={[
              { key: 'name', header: 'Academic year', primary: true },
              { key: 'starts_on', header: 'Starts' },
              { key: 'ends_on', header: 'Ends' },
              { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'current' ? 'ok' : row.status === 'closed' ? 'neutral' : 'warn'}>{row.status}</Badge> },
            ]}
            emptyMessage="Create an academic year before setting up terms or sections." />
        </section>
        <section id="terms" className="scroll-mt-20">
          <ResourcePanel title="Terms" endpoint="/academic-terms" icon={NotebookTabs} onChanged={changed}
            fields={[
              { name: 'academic_year_id', label: 'Academic year', type: 'select', options: yearOptions, required: true },
              { name: 'name', label: 'Term name', required: true, placeholder: 'Term 1' },
              { name: 'starts_on', label: 'Start date', type: 'date', required: true },
              { name: 'ends_on', label: 'End date', type: 'date', required: true },
            ]}
            columns={[
              { key: 'name', header: 'Term', primary: true },
              { key: 'academic_year_name', header: 'Academic year' },
              { key: 'starts_on', header: 'Starts' },
              { key: 'ends_on', header: 'Ends' },
            ]}
            emptyMessage="Add terms within the dates of an academic year." />
        </section>
        <section id="subjects" className="scroll-mt-20">
          <ResourcePanel title="Subjects" endpoint="/subjects" icon={BookOpen} onChanged={changed}
            fields={[
              { name: 'name', label: 'Subject name', required: true, full: true },
              { name: 'code', label: 'Subject code', placeholder: 'Optional' },
              { name: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], default: 'active' },
            ]}
            columns={[
              { key: 'name', header: 'Subject', primary: true },
              { key: 'code', header: 'Code' },
              { key: 'section_count', header: 'Assigned sections' },
              { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'active' ? 'ok' : 'neutral'}>{row.status}</Badge> },
            ]}
            emptyMessage="Create subjects, then assign them to class sections." />
        </section>
        <section id="sections" className="scroll-mt-20">
          <ResourcePanel title="Sections" endpoint="/sections" icon={Layers3} onChanged={changed}
            fields={[
              { name: 'class_id', label: 'Class / grade', type: 'select', options: classOptions, required: true },
              { name: 'academic_year_id', label: 'Academic year', type: 'select', options: yearOptions, required: true },
              { name: 'name', label: 'Section name', required: true, placeholder: 'A' },
              { name: 'teacher_id', label: 'Class teacher', type: 'select', options: teacherOptions, required: true },
            ]}
            columns={[
              { key: 'class_name', header: 'Class', primary: true },
              { key: 'name', header: 'Section' },
              { key: 'academic_year_name', header: 'Year' },
              { key: 'teacher_name', header: 'Class teacher' },
              { key: 'student_count', header: 'Students' },
            ]}
            emptyMessage="Create sections for each class and academic year." />
        </section>
        <section id="assignments" className="scroll-mt-20">
          <ResourcePanel title="Teaching assignments" endpoint="/section-subjects" icon={Link2} onChanged={changed}
            fields={[
              { name: 'section_id', label: 'Section', type: 'select', options: sectionOptions, required: true, full: true },
              { name: 'subject_id', label: 'Subject', type: 'select', options: subjectOptions, required: true },
              { name: 'teacher_id', label: 'Subject teacher', type: 'select', options: teacherOptions, required: true },
            ]}
            columns={[
              { key: 'section_name', header: 'Section', primary: true },
              { key: 'academic_year_name', header: 'Academic year' },
              { key: 'subject_name', header: 'Subject' },
              { key: 'teacher_name', header: 'Teacher' },
            ]}
            emptyMessage="Assign active subjects and teachers to sections." />
        </section>
        <section id="timetable" className="scroll-mt-20">
          <ResourcePanel title="Timetable entries" endpoint="/timetable" icon={Clock3} onChanged={changed}
            fields={[
              { name: 'section_subject_id', label: 'Teaching assignment', type: 'select', options: assignmentOptions, required: true, full: true },
              { name: 'day_of_week', label: 'Day', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((label, index) => ({ value: index + 1, label })), required: true },
              { name: 'room', label: 'Room', placeholder: 'Optional' },
              { name: 'starts_at', label: 'Starts at', type: 'time', required: true },
              { name: 'ends_at', label: 'Ends at', type: 'time', required: true },
            ]}
            columns={[
              { key: 'day_of_week', header: 'Day', primary: true, render: (row) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][Number(row.day_of_week) - 1] || '—' },
              { key: 'starts_at', header: 'Time', render: (row) => `${String(row.starts_at).slice(0, 5)}–${String(row.ends_at).slice(0, 5)}` },
              { key: 'section_name', header: 'Section' },
              { key: 'subject_name', header: 'Subject' },
              { key: 'teacher_name', header: 'Teacher' },
              { key: 'room', header: 'Room' },
            ]}
            emptyMessage="Schedule assigned lessons. Conflicting section or teacher times are rejected." />
        </section>
      </div>
    </>
  );
}
