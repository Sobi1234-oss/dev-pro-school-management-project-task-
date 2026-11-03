<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Request;

final class AuditLogController extends BaseController
{
    public static function index(Request $req): array
    {
        [$page, $per, $off] = self::paging($req);
        $total = (int) Database::value('SELECT COUNT(*) FROM audit_logs');
        $rows = Database::all(
            "SELECT l.id, l.method, l.path, l.ip, l.created_at, u.name AS actor_name, u.email AS actor_email FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_id ORDER BY l.id DESC LIMIT $per OFFSET $off"
        );
        return self::paged($rows, $total, $page, $per);
    }
}
