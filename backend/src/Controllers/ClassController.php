<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Request;
use App\Validator;

final class ClassController extends BaseController
{
    private const RULES = ['name' => 'required|string|max:80', 'teacher_id' => 'required|int', 'monthly_fee' => 'required|numeric'];

    public static function index(Request $req): array
    {
        return ['data' => Database::all(
            'SELECT c.*, COALESCE(t.name, "Unassigned") AS teacher_name, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = "active") AS student_count FROM classes c LEFT JOIN teachers t ON t.id = c.teacher_id ORDER BY c.name'
        )];
    }

    public static function store(Request $req): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        $id = self::guard(
            fn () => Database::insert('INSERT INTO classes (name, teacher_id, monthly_fee) VALUES (?, ?, ?)', [$in['name'], $in['teacher_id'], $in['monthly_fee']])
        );
        return ['data' => self::find('classes', $id, 'Class')];
    }

    public static function update(Request $req, array $p): array
    {
        self::find('classes', $p['id'], 'Class');
        $in = Validator::validate($req->body(), self::RULES);
        self::guard(fn () => Database::run(
            'UPDATE classes SET name = ?, teacher_id = ?, monthly_fee = ? WHERE id = ?',
            [$in['name'], $in['teacher_id'], $in['monthly_fee'], $p['id']]
        ));
        return ['data' => self::find('classes', $p['id'], 'Class')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('classes', $p['id'], 'Class');
        self::guard(fn () => Database::run('DELETE FROM classes WHERE id = ?', [$p['id']]));
        return ['message' => 'Class deleted.'];
    }
}
