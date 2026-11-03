<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Request;
use App\Validator;

final class SubjectController extends BaseController
{
    private const RULES = [
        'name' => 'required|string|max:100',
        'code' => 'nullable|string|max:20',
        'status' => 'required|in:active,inactive',
    ];

    public static function index(Request $req): array
    {
        return ['data' => Database::all(
            'SELECT s.*, COUNT(DISTINCT ss.section_id) AS section_count FROM subjects s LEFT JOIN section_subjects ss ON ss.subject_id = s.id GROUP BY s.id ORDER BY s.name'
        )];
    }

    public static function store(Request $req): array
    {
        $in = self::validated($req);
        $id = self::guard(fn () => Database::insert(
            'INSERT INTO subjects (name, code, status) VALUES (?, ?, ?)',
            [$in['name'], $in['code'], $in['status']]
        ), 'A subject with this name or code already exists.');
        return ['data' => self::find('subjects', $id, 'Subject')];
    }

    public static function update(Request $req, array $p): array
    {
        self::find('subjects', $p['id'], 'Subject');
        $in = self::validated($req);
        self::guard(fn () => Database::run(
            'UPDATE subjects SET name = ?, code = ?, status = ? WHERE id = ?',
            [$in['name'], $in['code'], $in['status'], $p['id']]
        ), 'A subject with this name or code already exists.');
        return ['data' => self::find('subjects', $p['id'], 'Subject')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('subjects', $p['id'], 'Subject');
        self::guard(fn () => Database::run('DELETE FROM subjects WHERE id = ?', [$p['id']]));
        return ['message' => 'Subject deleted.'];
    }

    private static function validated(Request $req): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        if ($in['code'] !== null) {
            $in['code'] = strtoupper($in['code']);
        }
        return $in;
    }
}
