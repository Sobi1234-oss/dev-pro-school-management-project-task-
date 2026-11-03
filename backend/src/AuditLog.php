<?php
declare(strict_types=1);

namespace App;

final class AuditLog
{
    public static function record(array $actor, Request $request): void
    {
        Database::run(
            'INSERT INTO audit_logs (actor_id, method, path, ip) VALUES (?, ?, ?, ?)',
            [$actor['id'], $request->method, substr($request->path, 0, 255), $request->ip()]
        );
    }
}
