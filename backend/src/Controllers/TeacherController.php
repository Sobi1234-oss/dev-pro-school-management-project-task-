<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class TeacherController extends BaseController
{
    private const RULES = [
        'name' => 'required|string|max:120',
        'email' => 'nullable|email|max:190',
        'phone' => 'nullable|string|max:30',
        'specialization' => 'nullable|string|max:120',
        'status' => 'required|in:active,inactive',
    ];

    public static function index(Request $req): array
    {
        return ['data' => Database::all(
            'SELECT t.*, COALESCE(t.email, u.email) AS email, COUNT(DISTINCT c.id) AS class_count FROM teachers t LEFT JOIN users u ON u.id = t.user_id LEFT JOIN classes c ON c.teacher_id = t.id GROUP BY t.id ORDER BY t.name'
        )];
    }

    public static function store(Request $req): array
    {
        $body = $req->body();
        $in = self::validated($body);
        $login = self::loginInput($body);
        if ($login['password'] !== null && $in['email'] === null) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['email' => 'An email is required to create a teacher login.']);
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $id = self::guard(fn () => Database::insert(
                'INSERT INTO teachers (name, email, phone, specialization, status) VALUES (?, ?, ?, ?, ?)',
                [$in['name'], $in['email'], $in['phone'], $in['specialization'], $in['status']]
            ), 'A teacher with this email already exists.');
            if ($login['password'] !== null) {
                $userId = self::guard(fn () => Database::insert(
                    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "teacher")',
                    [$in['name'], $in['email'], password_hash($login['password'], PASSWORD_DEFAULT)]
                ), 'An account with this email already exists.');
                Database::run('UPDATE teachers SET user_id = ? WHERE id = ?', [$userId, $id]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['data' => self::find('teachers', $id, 'Teacher')];
    }

    public static function update(Request $req, array $p): array
    {
        $teacher = self::find('teachers', $p['id'], 'Teacher');
        $body = $req->body();
        $in = self::validated($body);
        $login = self::loginInput($body);
        if ($login['password'] !== null && $in['email'] === null) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['email' => 'An email is required to create a teacher login.']);
        }
        if ($teacher['user_id'] && $in['email'] === null) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['email' => 'A teacher login requires an email address.']);
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            self::guard(fn () => Database::run(
                'UPDATE teachers SET name = ?, email = ?, phone = ?, specialization = ?, status = ? WHERE id = ?',
                [$in['name'], $in['email'], $in['phone'], $in['specialization'], $in['status'], $p['id']]
            ), 'A teacher with this email already exists.');
            if ($teacher['user_id']) {
                if ($login['password'] !== null) {
                    self::guard(fn () => Database::run(
                        'UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?',
                        [$in['name'], $in['email'], password_hash($login['password'], PASSWORD_DEFAULT), $teacher['user_id']]
                    ), 'An account with this email already exists.');
                } else {
                    self::guard(fn () => Database::run(
                        'UPDATE users SET name = ?, email = ? WHERE id = ?',
                        [$in['name'], $in['email'], $teacher['user_id']]
                    ), 'An account with this email already exists.');
                }
            } elseif ($login['password'] !== null) {
                $userId = self::guard(fn () => Database::insert(
                    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "teacher")',
                    [$in['name'], $in['email'], password_hash($login['password'], PASSWORD_DEFAULT)]
                ), 'An account with this email already exists.');
                Database::run('UPDATE teachers SET user_id = ? WHERE id = ?', [$userId, $p['id']]);
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['data' => self::find('teachers', $p['id'], 'Teacher')];
    }

    public static function destroy(Request $req, array $p): array
    {
        $teacher = self::find('teachers', $p['id'], 'Teacher');
        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            if ($teacher['user_id']) {
                Database::run('DELETE FROM users WHERE id = ?', [$teacher['user_id']]);
            }
            self::guard(fn () => Database::run('DELETE FROM teachers WHERE id = ?', [$p['id']]));
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['message' => 'Teacher deleted.'];
    }

    private static function validated(array $body): array
    {
        $in = Validator::validate($body, self::RULES);
        if ($in['email'] !== null) {
            $in['email'] = strtolower($in['email']);
        }
        return $in;
    }

    private static function loginInput(array $body): array
    {
        return Validator::validate($body, ['password' => 'nullable|string|min:8|max:100']);
    }
}
