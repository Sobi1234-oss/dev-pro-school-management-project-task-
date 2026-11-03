<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class AttendanceController extends BaseController
{
    public static function index(Request $req): array
    {
        $in = Validator::validate(['class_id' => $req->query('class_id'), 'date' => $req->query('date')], ['class_id' => 'required|int', 'date' => 'required|date']);
        return ['data' => Database::all(
            'SELECT s.id AS student_id, s.name, s.roll_no, a.status FROM students s LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ? WHERE s.class_id = ? AND s.status = "active" AND s.admission_status = "approved" ORDER BY s.roll_no',
            [$in['date'], $in['class_id']]
        )];
    }

    public static function save(Request $req): array
    {
        $body = $req->body();
        $in = Validator::validate($body, ['class_id' => 'required|int', 'date' => 'required|date']);
        $records = $body['records'] ?? null;
        if (!is_array($records) || !$records) {
            throw new HttpException(422, 'No attendance records were provided.');
        }
        if ($in['date'] > date('Y-m-d')) {
            throw new HttpException(422, 'Attendance cannot be marked for a future date.', ['date' => 'Pick today or an earlier date.']);
        }
        $valid = array_map('intval', array_column(Database::all('SELECT id FROM students WHERE class_id = ? AND status = "active" AND admission_status = "approved"', [$in['class_id']]), 'id'));

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $st = $pdo->prepare('INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)');
            foreach ($records as $r) {
                $sid = (int) ($r['student_id'] ?? 0);
                if (!in_array($sid, $valid, true) || !in_array($r['status'] ?? null, ['present', 'absent', 'leave'], true)) {
                    throw new HttpException(422, 'One of the attendance records is invalid.');
                }
                $st->execute([$sid, $in['date'], $r['status']]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['message' => 'Attendance saved.'];
    }
}
