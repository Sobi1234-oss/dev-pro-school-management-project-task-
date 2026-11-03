<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;

abstract class BaseController
{
    /** @return array{0:int,1:int,2:int} page, perPage, offset */
    protected static function paging(Request $req): array
    {
        $page = max(1, (int) $req->query('page', '1'));
        $per = min(100, max(1, (int) $req->query('per_page', '10')));
        return [$page, $per, ($page - 1) * $per];
    }

    protected static function paged(array $rows, int $total, int $page, int $per): array
    {
        return ['data' => $rows, 'meta' => ['page' => $page, 'per_page' => $per, 'total' => $total, 'last_page' => max(1, (int) ceil($total / $per))]];
    }

    protected static function find(string $table, int|string $id, string $label): array
    {
        $row = Database::one("SELECT * FROM `$table` WHERE id = ?", [(int) $id]);
        return $row ?? throw new HttpException(404, "$label not found.");
    }

    /** Runs a write and converts duplicate-key violations into friendly 409 errors. */
    protected static function guard(callable $fn, string $duplicateMessage = 'This record already exists.'): mixed
    {
        try {
            return $fn();
        } catch (\PDOException $e) {
            $code = $e->errorInfo[1] ?? 0;
            if ($code === 1062) {
                throw new HttpException(409, $duplicateMessage);
            }
            if ($code === 1451) {
                throw new HttpException(409, 'This record is in use and cannot be deleted.');
            }
            if ($code === 1452) {
                throw new HttpException(422, 'A referenced record does not exist.');
            }
            throw $e;
        }
    }
}
