<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class AnnouncementController extends BaseController
{
    private const RULES = [
        'title' => 'required|string|max:160',
        'body' => 'required|string|max:5000',
        'audience' => 'required|in:all,teachers,students',
        'starts_on' => 'required|date',
        'ends_on' => 'nullable|date',
    ];

    public static function index(Request $req): array
    {
        return ['data' => Database::all(
            'SELECT a.*, u.name AS author_name FROM announcements a LEFT JOIN users u ON u.id = a.created_by ORDER BY a.starts_on DESC, a.id DESC'
        )];
    }

    public static function visible(Request $req, array $p, array $user): array
    {
        $audience = match ($user['role']) {
            'teacher' => 'teachers',
            'student' => 'students',
            default => null,
        };
        if ($audience === null) {
            return ['data' => Database::all(
                'SELECT id, title, body, audience, starts_on, ends_on FROM announcements WHERE starts_on <= CURRENT_DATE AND (ends_on IS NULL OR ends_on >= CURRENT_DATE) ORDER BY starts_on DESC, id DESC'
            )];
        }
        return ['data' => Database::all(
            'SELECT id, title, body, audience, starts_on, ends_on FROM announcements WHERE (audience = "all" OR audience = ?) AND starts_on <= CURRENT_DATE AND (ends_on IS NULL OR ends_on >= CURRENT_DATE) ORDER BY starts_on DESC, id DESC',
            [$audience]
        )];
    }

    public static function store(Request $req, array $p, array $user): array
    {
        $in = self::validated($req);
        $id = Database::insert(
            'INSERT INTO announcements (title, body, audience, starts_on, ends_on, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [$in['title'], $in['body'], $in['audience'], $in['starts_on'], $in['ends_on'], $user['id']]
        );
        return ['data' => self::find('announcements', $id, 'Announcement')];
    }

    public static function update(Request $req, array $p): array
    {
        self::find('announcements', $p['id'], 'Announcement');
        $in = self::validated($req);
        Database::run(
            'UPDATE announcements SET title = ?, body = ?, audience = ?, starts_on = ?, ends_on = ? WHERE id = ?',
            [$in['title'], $in['body'], $in['audience'], $in['starts_on'], $in['ends_on'], $p['id']]
        );
        return ['data' => self::find('announcements', $p['id'], 'Announcement')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('announcements', $p['id'], 'Announcement');
        Database::run('DELETE FROM announcements WHERE id = ?', [$p['id']]);
        return ['message' => 'Announcement deleted.'];
    }

    private static function validated(Request $req): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        if ($in['ends_on'] !== null && $in['ends_on'] < $in['starts_on']) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['ends_on' => 'End date must be on or after the start date.']);
        }
        return $in;
    }
}
