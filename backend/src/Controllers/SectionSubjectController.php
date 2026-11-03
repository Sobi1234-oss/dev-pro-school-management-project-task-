<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class SectionSubjectController extends BaseController
{
    private const RULES = [
        'section_id' => 'required|int',
        'subject_id' => 'required|int',
        'teacher_id' => 'required|int',
    ];

    public static function index(Request $req): array
    {
        return ['data' => Database::all(
            'SELECT ss.*, CONCAT(c.name, " ", s.name) AS section_name, y.name AS academic_year_name, su.name AS subject_name, t.name AS teacher_name FROM section_subjects ss JOIN sections s ON s.id = ss.section_id JOIN classes c ON c.id = s.class_id JOIN academic_years y ON y.id = s.academic_year_id JOIN subjects su ON su.id = ss.subject_id JOIN teachers t ON t.id = ss.teacher_id ORDER BY y.starts_on DESC, c.name, s.name, su.name'
        )];
    }

    public static function store(Request $req): array
    {
        $in = self::validated($req);
        $id = self::guard(fn () => Database::insert(
            'INSERT INTO section_subjects (section_id, subject_id, teacher_id) VALUES (?, ?, ?)',
            [$in['section_id'], $in['subject_id'], $in['teacher_id']]
        ), 'This subject is already assigned to the selected section.');
        return ['data' => self::find('section_subjects', $id, 'Subject assignment')];
    }

    public static function update(Request $req, array $p): array
    {
        self::find('section_subjects', $p['id'], 'Subject assignment');
        $in = self::validated($req);
        self::guard(fn () => Database::run(
            'UPDATE section_subjects SET section_id = ?, subject_id = ?, teacher_id = ? WHERE id = ?',
            [$in['section_id'], $in['subject_id'], $in['teacher_id'], $p['id']]
        ), 'This subject is already assigned to the selected section.');
        return ['data' => self::find('section_subjects', $p['id'], 'Subject assignment')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('section_subjects', $p['id'], 'Subject assignment');
        Database::run('DELETE FROM section_subjects WHERE id = ?', [$p['id']]);
        return ['message' => 'Subject assignment deleted.'];
    }

    private static function validated(Request $req): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        if (!Database::one('SELECT id FROM teachers WHERE id = ? AND status = "active"', [$in['teacher_id']])) {
            throw new HttpException(422, 'The selected teacher is not active.', ['teacher_id' => 'Select an active teacher.']);
        }
        if (!Database::one('SELECT id FROM subjects WHERE id = ? AND status = "active"', [$in['subject_id']])) {
            throw new HttpException(422, 'The selected subject is not active.', ['subject_id' => 'Select an active subject.']);
        }
        return $in;
    }
}
