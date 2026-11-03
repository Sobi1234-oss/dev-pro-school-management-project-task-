<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class TimetableController extends BaseController
{
    private const RULES = [
        'section_subject_id' => 'required|int',
        'day_of_week' => 'required|int',
        'starts_at' => 'required|string',
        'ends_at' => 'required|string',
        'room' => 'nullable|string|max:40',
    ];

    public static function index(Request $req): array
    {
        return ['data' => Database::all(
            'SELECT tt.*, ss.section_id, CONCAT(c.name, " ", s.name) AS section_name, y.name AS academic_year_name, su.name AS subject_name, t.name AS teacher_name FROM timetable_entries tt JOIN section_subjects ss ON ss.id = tt.section_subject_id JOIN sections s ON s.id = ss.section_id JOIN classes c ON c.id = s.class_id JOIN academic_years y ON y.id = s.academic_year_id JOIN subjects su ON su.id = ss.subject_id JOIN teachers t ON t.id = ss.teacher_id ORDER BY tt.day_of_week, tt.starts_at, c.name, s.name'
        )];
    }

    public static function store(Request $req): array
    {
        $in = self::validated($req);
        $id = self::guard(fn () => Database::insert(
            'INSERT INTO timetable_entries (section_subject_id, day_of_week, starts_at, ends_at, room) VALUES (?, ?, ?, ?, ?)',
            [$in['section_subject_id'], $in['day_of_week'], $in['starts_at'], $in['ends_at'], $in['room']]
        ), 'A timetable slot already exists for that assignment and start time.');
        return ['data' => self::find('timetable_entries', $id, 'Timetable entry')];
    }

    public static function update(Request $req, array $p): array
    {
        self::find('timetable_entries', $p['id'], 'Timetable entry');
        $in = self::validated($req, (int) $p['id']);
        self::guard(fn () => Database::run(
            'UPDATE timetable_entries SET section_subject_id = ?, day_of_week = ?, starts_at = ?, ends_at = ?, room = ? WHERE id = ?',
            [$in['section_subject_id'], $in['day_of_week'], $in['starts_at'], $in['ends_at'], $in['room'], $p['id']]
        ), 'A timetable slot already exists for that assignment and start time.');
        return ['data' => self::find('timetable_entries', $p['id'], 'Timetable entry')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('timetable_entries', $p['id'], 'Timetable entry');
        Database::run('DELETE FROM timetable_entries WHERE id = ?', [$p['id']]);
        return ['message' => 'Timetable entry deleted.'];
    }

    private static function validated(Request $req, int $exceptId = 0): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        if ($in['day_of_week'] < 1 || $in['day_of_week'] > 7) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['day_of_week' => 'Choose a day from Monday to Sunday.']);
        }
        foreach (['starts_at', 'ends_at'] as $field) {
            if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $in[$field])) {
                throw new HttpException(422, 'Please correct the highlighted fields.', [$field => 'Use 24-hour time, such as 09:30.']);
            }
        }
        if ($in['starts_at'] >= $in['ends_at']) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['ends_at' => 'End time must be later than start time.']);
        }
        $assignment = Database::one(
            'SELECT ss.section_id, ss.teacher_id FROM section_subjects ss JOIN teachers t ON t.id = ss.teacher_id WHERE ss.id = ? AND t.status = "active"',
            [$in['section_subject_id']]
        );
        if (!$assignment) {
            throw new HttpException(422, 'The teaching assignment does not exist or is inactive.', ['section_subject_id' => 'Choose an active teaching assignment.']);
        }
        $overlap = Database::value(
            'SELECT COUNT(*) FROM timetable_entries tt JOIN section_subjects ss ON ss.id = tt.section_subject_id WHERE tt.day_of_week = ? AND tt.id <> ? AND tt.starts_at < ? AND tt.ends_at > ? AND (ss.section_id = ? OR ss.teacher_id = ?)',
            [$in['day_of_week'], $exceptId, $in['ends_at'], $in['starts_at'], $assignment['section_id'], $assignment['teacher_id']]
        );
        if ((int) $overlap > 0) {
            throw new HttpException(409, 'This time conflicts with another lesson for the same section or teacher.');
        }
        return $in;
    }
}
