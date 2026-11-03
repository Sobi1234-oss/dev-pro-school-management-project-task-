<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;

final class PortalController extends BaseController
{
    public static function overview(Request $req, array $p, array $user): array
    {
        $student = Database::one(
            'SELECT s.id, s.name, s.roll_no, s.parent_name, s.phone, s.admitted_on, c.name AS class_name, t.name AS teacher FROM students s JOIN classes c ON c.id = s.class_id JOIN teachers t ON t.id = c.teacher_id WHERE s.user_id = ?',
            [$user['id']]
        );
        if (!$student) {
            throw new HttpException(404, 'No student profile is linked to this account. Please contact the academy office.');
        }
        $id = $student['id'];
        $att = Database::one(
            'SELECT COALESCE(SUM(status="present"),0) AS present, COALESCE(SUM(status="absent"),0) AS absent, COALESCE(SUM(status="leave"),0) AS on_leave, COUNT(*) AS total FROM attendance WHERE student_id = ?',
            [$id]
        );
        $results = Database::all('SELECT id, subject, exam, marks_obtained, total_marks, exam_date FROM results WHERE student_id = ? ORDER BY exam_date DESC, id DESC', [$id]);
        $subjects = Database::all(
            'SELECT subject, ROUND(SUM(marks_obtained) / SUM(total_marks) * 100, 1) AS percentage, COUNT(*) AS exams FROM results WHERE student_id = ? GROUP BY subject ORDER BY subject',
            [$id]
        );
        return [
            'student' => $student,
            'attendance' => [
                'present' => (int) $att['present'], 'absent' => (int) $att['absent'], 'leave' => (int) $att['on_leave'], 'total' => (int) $att['total'],
                'recent' => Database::all('SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 14', [$id]),
            ],
            'results' => $results,
            'subjects' => $subjects,
            'fees' => Database::all('SELECT id, month, amount, status, paid_on FROM fees WHERE student_id = ? ORDER BY month DESC LIMIT 12', [$id]),
            'fee_payments' => Database::all(
                'SELECT p.fee_id, p.receipt_number, p.amount, p.payment_method, p.paid_on FROM fee_payments p JOIN fees f ON f.id = p.fee_id WHERE f.student_id = ? ORDER BY p.paid_on DESC, p.id DESC',
                [$id]
            ),
        ];
    }
}
