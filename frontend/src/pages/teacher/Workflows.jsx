import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Save } from 'lucide-react';
import { api } from '../../lib/api';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../context/ToastContext';
import { todayISO } from '../../lib/format';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Field';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/States';

const ATTENDANCE_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'Leave' },
];

export default function TeacherWorkflows({ assignments }) {
  const toast = useToast();
  const sections = useMemo(() => {
    const unique = new Map();
    assignments.forEach((item) => unique.set(String(item.section_id), {
      value: item.section_id,
      label: `${item.class_name} ${item.section_name} · ${item.academic_year_name}`,
    }));
    return [...unique.values()];
  }, [assignments]);
  const assignmentOptions = assignments.map((item) => ({
    value: item.id,
    label: `${item.subject_name} · ${item.class_name} ${item.section_name}`,
  }));
  const sectionForAssignment = new Map(assignments.map((item) => [String(item.id), item.section_id]));

  const [sectionId, setSectionId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(todayISO());
  const [attendanceMarks, setAttendanceMarks] = useState({});
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const attendance = useAsync(
    () => sectionId ? api.get('/teacher/attendance', { section_id: sectionId, date: attendanceDate }) : Promise.resolve({ data: [] }),
    [sectionId, attendanceDate],
  );
  const attendanceRows = attendance.data?.data || [];

  useEffect(() => {
    if (attendance.data) {
      setAttendanceMarks(Object.fromEntries(attendance.data.data.map((row) => [row.student_id, row.status || 'present'])));
    }
  }, [attendance.data]);

  const saveAttendance = async () => {
    setAttendanceBusy(true);
    try {
      await api.post('/teacher/attendance', {
        section_id: Number(sectionId),
        date: attendanceDate,
        records: attendanceRows.map((row) => ({ student_id: row.student_id, status: attendanceMarks[row.student_id] })),
      });
      toast.success('Section attendance saved.');
      attendance.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAttendanceBusy(false);
    }
  };

  const [assignmentId, setAssignmentId] = useState('');
  const [exam, setExam] = useState('');
  const [examDate, setExamDate] = useState(todayISO());
  const [totalMarks, setTotalMarks] = useState('100');
  const [scores, setScores] = useState({});
  const [resultsBusy, setResultsBusy] = useState(false);
  const resultSectionId = sectionForAssignment.get(String(assignmentId)) || '';
  const resultRoster = useAsync(
    () => resultSectionId ? api.get('/teacher/attendance', { section_id: resultSectionId, date: examDate }) : Promise.resolve({ data: [] }),
    [resultSectionId, examDate],
  );
  const resultRows = resultRoster.data?.data || [];

  useEffect(() => {
    if (resultRoster.data) {
      setScores(Object.fromEntries(resultRoster.data.data.map((row) => [row.student_id, ''])));
    }
  }, [resultRoster.data]);

  const saveResults = async (event) => {
    event.preventDefault();
    if (!exam.trim() || !resultRows.length || resultRows.some((row) => scores[row.student_id] === '')) {
      toast.error('Enter an exam name and a score for every student.');
      return;
    }
    setResultsBusy(true);
    try {
      const response = await api.post('/teacher/results', {
        assignment_id: Number(assignmentId),
        exam: exam.trim(),
        total_marks: Number(totalMarks),
        exam_date: examDate,
        marks: resultRows.map((row) => ({ student_id: row.student_id, marks_obtained: Number(scores[row.student_id]) })),
      });
      toast.success(response.message);
      setScores(Object.fromEntries(resultRows.map((row) => [row.student_id, ''])));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResultsBusy(false);
    }
  };

  if (!assignments.length) {
    return <EmptyState icon={CalendarCheck} title="Teaching assignments required" message="An administrator must assign you to a section and subject before you can record attendance or results." />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Take attendance" pad={false}>
        <div className="grid gap-3 border-b border-chalk-200 p-4 sm:grid-cols-2">
          <Select label="Section" value={sectionId} onChange={(event) => setSectionId(event.target.value)} options={sections} placeholder="Choose a section" />
          <Input label="Date" type="date" max={todayISO()} value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value || todayISO())} />
        </div>
        {!sectionId ? <EmptyState title="Choose a section" message="Select one of your assigned sections to open the register." />
          : attendance.loading && !attendance.data ? <Spinner variant="inline" />
          : attendance.error ? <ErrorState error={attendance.error} onRetry={attendance.reload} />
          : !attendanceRows.length ? <EmptyState title="No approved students" message="There are no active, approved students in this section." />
          : <>
            <ul className="divide-y divide-chalk-200">
              {attendanceRows.map((row) => (
                <li key={row.student_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{row.name}</p><p className="text-xs text-ink/60">Roll {row.roll_no}</p></div>
                  <Select aria-label={`Attendance for ${row.name}`} value={attendanceMarks[row.student_id] || 'present'} options={ATTENDANCE_OPTIONS} onChange={(event) => setAttendanceMarks((current) => ({ ...current, [row.student_id]: event.target.value }))} wrapperClass="w-32" />
                </li>
              ))}
            </ul>
            <div className="flex justify-end border-t border-chalk-200 p-4"><Button icon={Save} loading={attendanceBusy} onClick={saveAttendance}>Save attendance</Button></div>
          </>}
      </Card>

      <Card title="Enter exam results">
        <form onSubmit={saveResults} className="space-y-4">
          <Select label="Subject / section" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} options={assignmentOptions} placeholder="Choose an assignment" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Exam name" value={exam} onChange={(event) => setExam(event.target.value)} placeholder="e.g. Term 1 exam" required />
            <Input label="Exam date" type="date" max={todayISO()} value={examDate} onChange={(event) => setExamDate(event.target.value || todayISO())} required />
            <Input label="Total marks" type="number" min="1" value={totalMarks} onChange={(event) => setTotalMarks(event.target.value)} required />
          </div>
          {!assignmentId ? <p className="text-sm text-ink/60">Select one of your subjects to load its approved students.</p>
            : resultRoster.loading && !resultRoster.data ? <Spinner variant="inline" />
            : resultRoster.error ? <ErrorState error={resultRoster.error} onRetry={resultRoster.reload} />
            : !resultRows.length ? <p className="text-sm text-ink/60">No active, approved students in this section.</p>
            : <ul className="max-h-72 divide-y divide-chalk-200 overflow-y-auto rounded-lg border border-chalk-200">
              {resultRows.map((row) => (
                <li key={row.student_id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{row.name}</p><p className="text-xs text-ink/60">Roll {row.roll_no}</p></div>
                  <Input aria-label={`Marks for ${row.name}`} type="number" min="0" max={totalMarks} step="any" value={scores[row.student_id] ?? ''} onChange={(event) => setScores((current) => ({ ...current, [row.student_id]: event.target.value }))} placeholder="Score" wrapperClass="w-28" />
                </li>
              ))}
            </ul>}
          <div className="flex justify-end"><Button type="submit" icon={Save} loading={resultsBusy} disabled={!assignmentId || !resultRows.length}>Save results</Button></div>
        </form>
      </Card>
    </div>
  );
}
