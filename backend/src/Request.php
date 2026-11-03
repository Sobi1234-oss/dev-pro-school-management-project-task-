<?php
declare(strict_types=1);

namespace App;

final class Request
{
    private ?array $json = null;

    public function __construct(public readonly string $method, public readonly string $path) {}

    public static function capture(): self
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        // Strip the script (/backend/api/index.php/...) or its folder (/backend/api/...) on shared hosting.
        $script = $_SERVER['SCRIPT_NAME'] ?? '';
        $base = rtrim(str_replace('\\', '/', dirname($script ?: '/')), '/');
        if ($script !== '' && ($path === $script || str_starts_with($path, $script . '/'))) {
            $path = substr($path, strlen($script));
        } elseif ($base !== '' && str_starts_with($path, $base . '/')) {
            $path = substr($path, strlen($base));
        }
        $path = '/' . trim((string) preg_replace('#^/api(?=/|$)#', '', $path), '/');
        return new self(strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'), $path);
    }

    public function query(string $key, ?string $default = null): ?string
    {
        $v = $_GET[$key] ?? null;
        return is_string($v) && $v !== '' ? $v : $default;
    }

    public function body(): array
    {
        if ($this->json !== null) {
            return $this->json;
        }
        $raw = file_get_contents('php://input') ?: '';
        if ($raw === '') {
            return $this->json = [];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new HttpException(400, 'Request body must be valid JSON.');
        }
        return $this->json = $data;
    }

    public function bearerToken(): ?string
    {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        if ($h === '' && function_exists('getallheaders')) {
            $h = getallheaders()['Authorization'] ?? '';
        }
        return preg_match('/^Bearer\s+(\S+)$/i', $h, $m) ? $m[1] : null;
    }

    public function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
