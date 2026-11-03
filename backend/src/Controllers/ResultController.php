<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class ResultController extends BaseController
{
    private const RULES = [
        'student_id' => 'required|int', 'subject' => 'required|string|max:80', 'exam' => 'required|string|max:80',
        'marks_obtained' => 'required|numeric', 'total_marks' => 'required|numeric', 'exam_date' => 'required|date',
    ];

    public static function index(Request $req): array
    {
        [$page, $per, $off] = self::paging($req);
        $where = ['1=1'];
        $args = [];
        if ($q = $req->query('q')) {
            $where[] = '(s.name LIKE ? OR r.subject LIKE ? OR r.exam LIKE ?)';
            array_push($args, "%$q%", "%$q%", "%$q%");
        }
        if ($c = $req->query('class_id')) {
            $where[] = 's.class_id = ?';
            $args[] = (int) $c;
        }
        $w = implode(' AND ', $where);
        $total = (int) Database::value("SELECT COUNT(*) FROM results r JOIN students s ON s.id = r.student_id WHERE $w", $args);
        $rows = Database::all(
            "SELECT r.*, s.name AS student_name, c.name AS class_name FROM results r JOIN students s ON s.id = r.student_id JOIN classes c ON c.id = s.class_id WHERE $w ORDER BY r.exam_date DESC, r.id DESC LIMIT $per OFFSET $off",
            $args
        );
        return self::paged($rows, $total, $page, $per);
    }

    private static function checked(Request $req): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        if ($in['total_marks'] <= 0 || $in['marks_obtained'] > $in['total_marks']) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['marks_obtained' => 'Marks obtained cannot exceed total marks.']);
        }
        return $in;
    }

    public static function store(Request $req): array
    {
        $in = self::checked($req);
        $id = self::guard(fn () => Database::insert(
            'INSERT INTO results (student_id, subject, exam, marks_obtained, total_marks, exam_date) VALUES (?, ?, ?, ?, ?, ?)',
            array_values($in)
        ));
        return ['data' => self::find('results', $id, 'Result')];
    }

    public static function update(Request $req, array $p): array
    {
        self::find('results', $p['id'], 'Result');
        $in = self::checked($req);
        self::guard(fn () => Database::run(
            'UPDATE results SET student_id = ?, subject = ?, exam = ?, marks_obtained = ?, total_marks = ?, exam_date = ? WHERE id = ?',
            [...array_values($in), $p['id']]
        ));
        return ['data' => self::find('results', $p['id'], 'Result')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('results', $p['id'], 'Result');
        Database::run('DELETE FROM results WHERE id = ?', [$p['id']]);
        return ['message' => 'Result deleted.'];
    }
}
