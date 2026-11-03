<?php
declare(strict_types=1);

namespace App;

final class Router
{
    /** @var array<int,array{0:string,1:string,2:callable,3:?string}> */
    private array $routes = [];

    /** $role: null = public, 'any' = any signed-in user, otherwise the exact role required. */
    public function add(string $method, string $pattern, callable $handler, ?string $role = 'admin'): void
    {
        $regex = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '$#';
        $this->routes[] = [$method, $regex, $handler, $role];
    }

    public function dispatch(Request $req): never
    {
        $pathMatched = false;
        foreach ($this->routes as [$method, $regex, $handler, $role]) {
            if (!preg_match($regex, $req->path, $m)) {
                continue;
            }
            $pathMatched = true;
            if ($method !== $req->method) {
                continue;
            }
            $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            $user = null;
            if ($role !== null) {
                $user = Auth::authenticate($req);
                if ($role !== 'any' && $user['role'] !== $role) {
                    throw new HttpException(403, 'You do not have permission to do that.');
                }
            }
            $result = $handler($req, $params, $user);
            if ($user && in_array($req->method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                AuditLog::record($user, $req);
            }
            Response::json($result);
        }
        throw $pathMatched ? new HttpException(405, 'Method not allowed.') : new HttpException(404, 'Endpoint not found.');
    }
}
