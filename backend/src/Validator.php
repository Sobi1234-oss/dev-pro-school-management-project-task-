<?php
declare(strict_types=1);

namespace App;

/**
 * Rules: required|string|email|int|numeric|date|month|max:N|min:N|in:a,b,c|nullable
 * Returns only the keys that have rules, cast to proper types.
 */
final class Validator
{
    public static function validate(array $data, array $rules, bool $partial = false): array
    {
        $errors = [];
        $clean = [];
        foreach ($rules as $field => $ruleString) {
            $rs = explode('|', $ruleString);
            $present = array_key_exists($field, $data);
            $value = $present && is_string($data[$field]) ? trim($data[$field]) : ($data[$field] ?? null);
            $empty = $value === null || $value === '';

            if ($partial && !$present) {
                continue;
            }
            if ($empty) {
                if (in_array('required', $rs, true)) {
                    $errors[$field] = 'This field is required.';
                } elseif (in_array('nullable', $rs, true)) {
                    $clean[$field] = null;
                }
                continue;
            }
            foreach ($rs as $rule) {
                [$name, $arg] = array_pad(explode(':', $rule, 2), 2, null);
                $err = self::check($name, $arg, $value);
                if ($err) {
                    $errors[$field] = $err;
                    break;
                }
            }
            if (!isset($errors[$field])) {
                $clean[$field] = in_array('int', $rs, true) ? (int) $value : (in_array('numeric', $rs, true) ? (float) $value : $value);
            }
        }
        if ($errors) {
            throw new HttpException(422, 'Please correct the highlighted fields.', $errors);
        }
        return $clean;
    }

    private static function check(string $rule, ?string $arg, mixed $v): ?string
    {
        return match ($rule) {
            'string' => is_string($v) ? null : 'Must be text.',
            'email' => filter_var($v, FILTER_VALIDATE_EMAIL) ? null : 'Enter a valid email address.',
            'int' => filter_var($v, FILTER_VALIDATE_INT) !== false ? null : 'Must be a whole number.',
            'numeric' => is_numeric($v) && (float) $v >= 0 ? null : 'Must be a positive number.',
            'date' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $v) && strtotime((string) $v) !== false ? null : 'Use the format YYYY-MM-DD.',
            'month' => preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) $v) ? null : 'Use the format YYYY-MM.',
            'max' => mb_strlen((string) $v) <= (int) $arg ? null : "Must be at most $arg characters.",
            'min' => mb_strlen((string) $v) >= (int) $arg ? null : "Must be at least $arg characters.",
            'in' => in_array($v, explode(',', (string) $arg), true) ? null : 'Invalid option selected.',
            default => null,
        };
    }
}
