<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Request;
use App\Validator;

final class AuthController extends BaseController
{
    public static function login(Request $req): array
    {
        $in = Validator::validate($req->body(), ['email' => 'required|email|max:190', 'password' => 'required|string|max:200']);
        return Auth::login(strtolower($in['email']), $in['password'], $req->ip());
    }

    public static function logout(Request $req): array
    {
        if ($t = $req->bearerToken()) {
            Auth::logout($t);
        }
        return ['message' => 'Signed out.'];
    }

    public static function me(Request $req, array $p, array $user): array
    {
        return ['user' => $user];
    }
}
