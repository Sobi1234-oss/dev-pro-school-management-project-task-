<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Request;
use App\Validator;

final class SectionController extends BaseController
{
    private const RULES = [
        'class_id' => 'required|int',
        'academic_year_id' => 'required|int',
        'teacher_id' => 'required|int',
        'name' => 'required|string|max:40',
    ];

    public static function index(Request $req): array
    {
        return ['data' => Database::all(
            'SELECT s.*, c.name AS class_name, y.name AS academic_year_name, t.name AS teacher_name, COUNT(DISTINCT st.id) AS student_count FROM sections s JOIN classes c ON c.id = s.class_id JOIN academic_years y ON y.id = s.academic_year_id JOIN teachers t ON t.id = s.teacher_id LEFT JOIN students st ON st.section_id = s.id GROUP BY s.id ORDER BY y.starts_on DESC, c.name, s.name'
        )];
    }

    public static function store(Request $req): array
    {
        $in = self::validated($req);
        $id = self::guard(fn () => Database::insert(
            'INSERT INTO sections (class_id, academic_year_id, teacher_id, name) VALUES (?, ?, ?, ?)',
            [$in['class_id'], $in['academic_year_id'], $in['teacher_id'], $in['name']]
        ), 'This section already exists for that class and academic year.');
        return ['data' => self::find('sections', $id, 'Section')];
    }

    public static function update(Request $req, array $p): array
    {
        $section = self::find('sections', $p['id'], 'Section');
        $in = self::validated($req);
        if ((int) Database::value('SELECT COUNT(*) FROM students WHERE section_id = ?', [$p['id']]) > 0
            && ((int) $section['class_id'] !== $in['class_id'] || (int) $section['academic_year_id'] !== $in['academic_year_id'])) {
            throw new \App\HttpException(409, 'A section with enrolled students cannot be moved to another class or academic year.');
        }
        self::guard(fn () => Database::run(
            'UPDATE sections SET class_id = ?, academic_year_id = ?, teacher_id = ?, name = ? WHERE id = ?',
            [$in['class_id'], $in['academic_year_id'], $in['teacher_id'], $in['name'], $p['id']]
        ), 'This section already exists for that class and academic year.');
        return ['data' => self::find('sections', $p['id'], 'Section')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('sections', $p['id'], 'Section');
        if ((int) Database::value('SELECT COUNT(*) FROM students WHERE section_id = ?', [$p['id']]) > 0) {
            throw new \App\HttpException(409, 'This section has enrolled students. Reassign them before deleting the section.');
        }
        self::guard(fn () => Database::run('DELETE FROM sections WHERE id = ?', [$p['id']]));
        return ['message' => 'Section deleted.'];
    }

    private static function validated(Request $req): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        if (!Database::one('SELECT id FROM teachers WHERE id = ? AND status = "active"', [$in['teacher_id']])) {
            throw new \App\HttpException(422, 'The selected teacher is not active.', ['teacher_id' => 'Select an active teacher.']);
        }
        return $in;
    }
}
