<?php
declare(strict_types=1);

namespace App;

final class Auth
{
    private const MAX_ATTEMPTS = 5;
    private const WINDOW_MINUTES = 15;

    /** @return array{token:string,user:array} */
    public static function login(string $email, string $password, string $ip): array
    {
        $recent = (int) Database::value(
            'SELECT COUNT(*) FROM login_attempts WHERE (email = ? OR ip = ?) AND attempted_at > (NOW() - INTERVAL ' . self::WINDOW_MINUTES . ' MINUTE)',
            [$email, $ip]
        );
        if ($recent >= self::MAX_ATTEMPTS) {
            throw new HttpException(429, 'Too many failed attempts. Please try again in a few minutes.');
        }

        $user = Database::one(
            'SELECT u.id, u.name, u.email, u.role, u.password_hash, teacher_profile.status AS teacher_status, student_profile.status AS student_status, student_profile.admission_status FROM users u LEFT JOIN teachers teacher_profile ON teacher_profile.user_id = u.id LEFT JOIN students student_profile ON student_profile.user_id = u.id WHERE u.email = ?',
            [$email]
        );
        if (!$user || !password_verify($password, $user['password_hash'])) {
            Database::run('INSERT INTO login_attempts (email, ip) VALUES (?, ?)', [$email, $ip]);
            throw new HttpException(401, 'Incorrect email or password.');
        }
        if ($user['role'] === 'teacher' && $user['teacher_status'] !== 'active') {
            throw new HttpException(403, 'This teacher account is inactive. Contact an administrator.');
        }
        if ($user['role'] === 'student' && ($user['student_status'] !== 'active' || $user['admission_status'] !== 'approved')) {
            throw new HttpException(403, 'This student account is not currently approved for portal access. Contact the academy office.');
        }
        Database::run('DELETE FROM login_attempts WHERE email = ?', [$email]);
        unset($user['teacher_status']);
        unset($user['student_status'], $user['admission_status']);
        unset($user['password_hash']);

        $token = bin2hex(random_bytes(32));
        $ttl = (int) env('TOKEN_TTL_HOURS', '168');
        Database::run(
            'INSERT INTO api_tokens (user_id, token_hash, expires_at) VALUES (?, ?, NOW() + INTERVAL ' . $ttl . ' HOUR)',
            [$user['id'], hash('sha256', $token)]
        );
        return ['token' => $token, 'user' => $user];
    }

    public static function logout(string $token): void
    {
        Database::run('DELETE FROM api_tokens WHERE token_hash = ?', [hash('sha256', $token)]);
    }

    /** @return array<string,mixed> */
    public static function authenticate(Request $req): array
    {
        $token = $req->bearerToken();
        if (!$token) {
            throw new HttpException(401, 'Authentication required.');
        }
        $hash = hash('sha256', $token);
        $user = Database::one(
            'SELECT u.id, u.name, u.email, u.role FROM api_tokens t JOIN users u ON u.id = t.user_id LEFT JOIN teachers teacher_profile ON teacher_profile.user_id = u.id LEFT JOIN students student_profile ON student_profile.user_id = u.id WHERE t.token_hash = ? AND t.expires_at > NOW() AND (u.role <> "teacher" OR teacher_profile.status = "active") AND (u.role <> "student" OR (student_profile.status = "active" AND student_profile.admission_status = "approved"))',
            [$hash]
        );
        if (!$user) {
            throw new HttpException(401, 'Your session has expired. Please sign in again.');
        }
        Database::run('UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = ?', [$hash]);
        return $user;
    }
}
