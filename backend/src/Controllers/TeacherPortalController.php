<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class TeacherPortalController extends BaseController
{
    public static function overview(Request $req, array $p, array $user): array
    {
        $teacher = Database::one('SELECT id, name, email FROM teachers WHERE user_id = ? AND status = "active"', [$user['id']]);
        if (!$teacher) {
            throw new HttpException(403, 'An active teacher profile is required.');
        }
        $assignments = Database::all(
            'SELECT ss.id, ss.section_id, ss.subject_id, ss.teacher_id, c.name AS class_name, s.name AS section_name, y.name AS academic_year_name, su.name AS subject_name, COUNT(DISTINCT st.id) AS student_count FROM section_subjects ss JOIN sections s ON s.id = ss.section_id JOIN classes c ON c.id = s.class_id JOIN academic_years y ON y.id = s.academic_year_id JOIN subjects su ON su.id = ss.subject_id LEFT JOIN students st ON st.section_id = s.id AND st.status = "active" WHERE ss.teacher_id = ? GROUP BY ss.id ORDER BY y.starts_on DESC, c.name, s.name, su.name',
            [$teacher['id']]
        );
        $schedule = Database::all(
            'SELECT tt.id, tt.day_of_week, tt.starts_at, tt.ends_at, tt.room, c.name AS class_name, s.name AS section_name, y.name AS academic_year_name, su.name AS subject_name FROM timetable_entries tt JOIN section_subjects ss ON ss.id = tt.section_subject_id JOIN sections s ON s.id = ss.section_id JOIN classes c ON c.id = s.class_id JOIN academic_years y ON y.id = s.academic_year_id JOIN subjects su ON su.id = ss.subject_id WHERE ss.teacher_id = ? ORDER BY tt.day_of_week, tt.starts_at',
            [$teacher['id']]
        );
        $studentCount = (int) Database::value(
            'SELECT COUNT(DISTINCT st.id) FROM section_subjects ss JOIN students st ON st.section_id = ss.section_id AND st.status = "active" WHERE ss.teacher_id = ?',
            [$teacher['id']]
        );
        return ['teacher' => $teacher, 'assignments' => $assignments, 'schedule' => $schedule, 'student_count' => $studentCount];
    }

    public static function attendanceRoster(Request $req, array $p, array $user): array
    {
        $in = Validator::validate(
            ['section_id' => $req->query('section_id'), 'date' => $req->query('date', date('Y-m-d'))],
            ['section_id' => 'required|int', 'date' => 'required|date']
        );
        $teacher = self::teacherForUser($user['id']);
        self::assertSectionAccess($in['section_id'], $teacher['id']);
        return ['data' => Database::all(
            'SELECT s.id AS student_id, s.name, s.roll_no, a.status FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ? WHERE s.section_id = ? AND s.status = "active" AND s.admission_status = "approved" ORDER BY s.roll_no',
            [$in['date'], $in['section_id']]
        )];
    }

    public static function saveAttendance(Request $req, array $p, array $user): array
    {
        $body = $req->body();
        $in = Validator::validate($body, ['section_id' => 'required|int', 'date' => 'required|date']);
        if ($in['date'] > date('Y-m-d')) {
            throw new HttpException(422, 'Attendance cannot be marked for a future date.', ['date' => 'Pick today or an earlier date.']);
        }
        $teacher = self::teacherForUser($user['id']);
        self::assertSectionAccess($in['section_id'], $teacher['id']);
        $records = $body['records'] ?? null;
        if (!is_array($records) || !$records) {
            throw new HttpException(422, 'No attendance records were provided.');
        }
        $valid = array_map('intval', array_column(Database::all(
            'SELECT id FROM students WHERE section_id = ? AND status = "active" AND admission_status = "approved"',
            [$in['section_id']]
        ), 'id'));
        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare('INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)');
            $seen = [];
            foreach ($records as $record) {
                if (!is_array($record)) {
                    throw new HttpException(422, 'One of the attendance records is invalid.');
                }
                $studentId = (int) ($record['student_id'] ?? 0);
                $status = $record['status'] ?? null;
                if (!in_array($studentId, $valid, true) || isset($seen[$studentId]) || !in_array($status, ['present', 'absent', 'leave'], true)) {
                    throw new HttpException(422, 'One of the attendance records is invalid.');
                }
                $seen[$studentId] = true;
                $st->execute([$studentId, $in['date'], $status]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['message' => 'Section attendance saved.'];
    }

    public static function saveResults(Request $req, array $p, array $user): array
    {
        $body = $req->body();
        $in = Validator::validate($body, [
            'assignment_id' => 'required|int',
            'exam' => 'required|string|max:80',
            'total_marks' => 'required|numeric',
            'exam_date' => 'required|date',
        ]);
        if ($in['total_marks'] <= 0 || $in['exam_date'] > date('Y-m-d')) {
            throw new HttpException(422, 'Please correct the exam details.', ['total_marks' => 'Total marks must be positive and the exam date cannot be in the future.']);
        }
        $teacher = self::teacherForUser($user['id']);
        $assignment = Database::one(
            'SELECT ss.id, ss.section_id, su.name AS subject_name FROM section_subjects ss JOIN subjects su ON su.id = ss.subject_id WHERE ss.id = ? AND ss.teacher_id = ? AND su.status = "active"',
            [$in['assignment_id'], $teacher['id']]
        );
        if (!$assignment) {
            throw new HttpException(403, 'You can only enter results for your assigned subjects.');
        }
        $marks = $body['marks'] ?? null;
        if (!is_array($marks) || !$marks) {
            throw new HttpException(422, 'No student marks were provided.');
        }
        $valid = array_map('intval', array_column(Database::all(
            'SELECT id FROM students WHERE section_id = ? AND status = "active" AND admission_status = "approved"',
            [$assignment['section_id']]
        ), 'id'));
        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $insert = $pdo->prepare('INSERT INTO results (student_id, subject, exam, marks_obtained, total_marks, exam_date) VALUES (?, ?, ?, ?, ?, ?)');
            $update = $pdo->prepare('UPDATE results SET marks_obtained = ?, total_marks = ?, exam_date = ? WHERE id = ?');
            $seen = [];
            foreach ($marks as $mark) {
                if (!is_array($mark)) {
                    throw new HttpException(422, 'One of the student scores is invalid.');
                }
                $studentId = (int) ($mark['student_id'] ?? 0);
                $score = $mark['marks_obtained'] ?? null;
                if (!in_array($studentId, $valid, true) || isset($seen[$studentId]) || !is_numeric($score) || (float) $score < 0 || (float) $score > (float) $in['total_marks']) {
                    throw new HttpException(422, 'One of the student scores is invalid.');
                }
                $seen[$studentId] = true;
                $existing = Database::one(
                    'SELECT id FROM results WHERE student_id = ? AND subject = ? AND exam = ? ORDER BY id DESC LIMIT 1',
                    [$studentId, $assignment['subject_name'], $in['exam']]
                );
                if ($existing) {
                    $update->execute([$score, $in['total_marks'], $in['exam_date'], $existing['id']]);
                } else {
                    $insert->execute([$studentId, $assignment['subject_name'], $in['exam'], $score, $in['total_marks'], $in['exam_date']]);
                }
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['message' => count($marks) . ' result record(s) saved.'];
    }

    private static function teacherForUser(int $userId): array
    {
        return Database::one('SELECT id, name FROM teachers WHERE user_id = ? AND status = "active"', [$userId])
            ?? throw new HttpException(403, 'An active teacher profile is required.');
    }

    private static function assertSectionAccess(int $sectionId, int $teacherId): void
    {
        if (!Database::one(
            'SELECT id FROM sections WHERE id = ? AND (teacher_id = ? OR id IN (SELECT section_id FROM section_subjects WHERE teacher_id = ?))',
            [$sectionId, $teacherId, $teacherId]
        )) {
            throw new HttpException(403, 'You are not assigned to this section.');
        }
    }
}
