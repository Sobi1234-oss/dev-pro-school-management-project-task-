<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class AcademicYearController extends BaseController
{
    private const RULES = [
        'name' => 'required|string|max:40',
        'starts_on' => 'required|date',
        'ends_on' => 'required|date',
        'status' => 'required|in:upcoming,current,closed',
    ];

    public static function index(Request $req): array
    {
        return ['data' => Database::all('SELECT * FROM academic_years ORDER BY starts_on DESC, id DESC')];
    }

    public static function store(Request $req): array
    {
        $in = self::validated($req);
        $id = self::guard(fn () => Database::insert(
            'INSERT INTO academic_years (name, starts_on, ends_on, status) VALUES (?, ?, ?, ?)',
            [$in['name'], $in['starts_on'], $in['ends_on'], $in['status']]
        ));
        return ['data' => self::find('academic_years', $id, 'Academic year')];
    }

    public static function update(Request $req, array $p): array
    {
        self::find('academic_years', $p['id'], 'Academic year');
        $in = self::validated($req, (int) $p['id']);
        self::guard(fn () => Database::run(
            'UPDATE academic_years SET name = ?, starts_on = ?, ends_on = ?, status = ? WHERE id = ?',
            [$in['name'], $in['starts_on'], $in['ends_on'], $in['status'], $p['id']]
        ));
        return ['data' => self::find('academic_years', $p['id'], 'Academic year')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('academic_years', $p['id'], 'Academic year');
        self::guard(fn () => Database::run('DELETE FROM academic_years WHERE id = ?', [$p['id']]));
        return ['message' => 'Academic year deleted.'];
    }

    private static function validated(Request $req, int $exceptId = 0): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        if ($in['starts_on'] > $in['ends_on']) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['ends_on' => 'End date must be on or after the start date.']);
        }
        if ($in['status'] === 'current' && Database::one(
            'SELECT id FROM academic_years WHERE status = "current" AND id <> ? LIMIT 1',
            [$exceptId]
        )) {
            throw new HttpException(422, 'Only one academic year can be current.', ['status' => 'Close the current year before selecting another.']);
        }
        return $in;
    }
}
