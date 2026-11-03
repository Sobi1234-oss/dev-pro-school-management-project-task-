<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class StudentController extends BaseController
{
    private const RULES = [
        'name' => 'required|string|max:120',
        'class_id' => 'required|int',
        'section_id' => 'nullable|int',
        'roll_no' => 'required|string|max:30',
        'parent_name' => 'required|string|max:120',
        'phone' => 'required|string|min:7|max:30',
        'status' => 'required|in:active,inactive',
        'admission_status' => 'required|in:pending,approved,rejected',
        'date_of_birth' => 'nullable|date',
        'gender' => 'nullable|in:female,male,other',
        'address' => 'nullable|string|max:255',
        'guardian_email' => 'nullable|email|max:190',
        'emergency_contact' => 'nullable|string|max:30',
        'admitted_on' => 'required|date',
    ];

    public static function index(Request $req): array
    {
        [$page, $per, $off] = self::paging($req);
        $where = ['1=1'];
        $args = [];
        if ($q = $req->query('q')) {
            $where[] = '(s.name LIKE ? OR s.roll_no LIKE ? OR s.parent_name LIKE ? OR s.guardian_email LIKE ?)';
            array_push($args, "%$q%", "%$q%", "%$q%", "%$q%");
        }
        if ($c = $req->query('class_id')) {
            $where[] = 's.class_id = ?';
            $args[] = (int) $c;
        }
        if (in_array($admission = $req->query('admission_status'), ['pending', 'approved', 'rejected'], true)) {
            $where[] = 's.admission_status = ?';
            $args[] = $admission;
        }
        $w = implode(' AND ', $where);
        $total = (int) Database::value("SELECT COUNT(*) FROM students s WHERE $w", $args);
        $rows = Database::all(
            "SELECT s.*, c.name AS class_name, sec.name AS section_name, u.email FROM students s JOIN classes c ON c.id = s.class_id LEFT JOIN sections sec ON sec.id = s.section_id LEFT JOIN users u ON u.id = s.user_id WHERE $w ORDER BY s.created_at DESC, s.id DESC LIMIT $per OFFSET $off",
            $args
        );
        return self::paged($rows, $total, $page, $per);
    }

    /** Lightweight list for dropdowns. */
    public static function options(): array
    {
        return ['data' => Database::all('SELECT s.id, s.name, s.roll_no, c.name AS class_name, sec.name AS section_name FROM students s JOIN classes c ON c.id = s.class_id LEFT JOIN sections sec ON sec.id = s.section_id WHERE s.status = "active" AND s.admission_status = "approved" ORDER BY c.name, sec.name, s.roll_no')];
    }

    public static function store(Request $req): array
    {
        $body = $req->body();
        $in = Validator::validate($body, self::RULES);
        self::validateSection($in['class_id'], $in['section_id']);
        $login = Validator::validate($body, ['email' => 'nullable|email|max:190', 'password' => 'nullable|string|min:8|max:100']);
        if (!empty($login['email']) && empty($login['password'])) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['password' => 'A password (8+ characters) is required to create a portal login.']);
        }

        $pdo = \App\Database::pdo();
        $pdo->beginTransaction();
        try {
            $userId = null;
            if (!empty($login['email'])) {
                $userId = self::guard(
                    fn () => Database::insert('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "student")', [$in['parent_name'], strtolower($login['email']), password_hash($login['password'], PASSWORD_DEFAULT)]),
                    'A portal account with this email already exists.'
                );
            }
            $id = self::guard(
                fn () => Database::insert(
                    'INSERT INTO students (user_id, class_id, section_id, roll_no, name, parent_name, phone, status, admission_status, date_of_birth, gender, address, guardian_email, emergency_contact, admitted_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [$userId, $in['class_id'], $in['section_id'], $in['roll_no'], $in['name'], $in['parent_name'], $in['phone'], $in['status'], $in['admission_status'], $in['date_of_birth'], $in['gender'], $in['address'], $in['guardian_email'], $in['emergency_contact'], $in['admitted_on']]
                ),
                'This roll number is already taken in the selected class.'
            );
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['data' => self::find('students', $id, 'Student')];
    }

    public static function update(Request $req, array $p): array
    {
        $student = self::find('students', $p['id'], 'Student');
        $body = $req->body();
        $in = Validator::validate($body, self::RULES);
        self::validateSection($in['class_id'], $in['section_id']);
        $pw = Validator::validate($body, ['password' => 'nullable|string|min:8|max:100']);

        self::guard(fn () => Database::run(
            'UPDATE students SET class_id = ?, section_id = ?, roll_no = ?, name = ?, parent_name = ?, phone = ?, status = ?, admission_status = ?, date_of_birth = ?, gender = ?, address = ?, guardian_email = ?, emergency_contact = ?, admitted_on = ? WHERE id = ?',
            [$in['class_id'], $in['section_id'], $in['roll_no'], $in['name'], $in['parent_name'], $in['phone'], $in['status'], $in['admission_status'], $in['date_of_birth'], $in['gender'], $in['address'], $in['guardian_email'], $in['emergency_contact'], $in['admitted_on'], $p['id']]
        ), 'This roll number is already taken in the selected class.');

        if ($student['user_id'] && !empty($pw['password'])) {
            Database::run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($pw['password'], PASSWORD_DEFAULT), $student['user_id']]);
        }
        return ['data' => self::find('students', $p['id'], 'Student')];
    }

    public static function destroy(Request $req, array $p): array
    {
        $student = self::find('students', $p['id'], 'Student');
        if ((int) Database::value('SELECT COUNT(*) FROM fee_payments p JOIN fees f ON f.id = p.fee_id WHERE f.student_id = ?', [$p['id']]) > 0) {
            throw new HttpException(409, 'This student has payment history and cannot be removed. Mark the student inactive instead.');
        }
        Database::run('DELETE FROM students WHERE id = ?', [$p['id']]);
        if ($student['user_id']) {
            Database::run('DELETE FROM users WHERE id = ?', [$student['user_id']]);
        }
        return ['message' => 'Student removed.'];
    }

    private static function validateSection(int $classId, ?int $sectionId): void
    {
        if ($sectionId !== null && !Database::one('SELECT id FROM sections WHERE id = ? AND class_id = ?', [$sectionId, $classId])) {
            throw new HttpException(422, 'The selected section does not belong to this class.', ['section_id' => 'Select a section for the selected class.']);
        }
    }
}
