<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class AcademicTermController extends BaseController
{
    private const RULES = [
        'academic_year_id' => 'required|int',
        'name' => 'required|string|max:80',
        'starts_on' => 'required|date',
        'ends_on' => 'required|date',
    ];

    public static function index(Request $req): array
    {
        $yearId = $req->query('academic_year_id');
        $rows = $yearId
            ? Database::all('SELECT t.*, y.name AS academic_year_name FROM academic_terms t JOIN academic_years y ON y.id = t.academic_year_id WHERE t.academic_year_id = ? ORDER BY t.starts_on', [(int) $yearId])
            : Database::all('SELECT t.*, y.name AS academic_year_name FROM academic_terms t JOIN academic_years y ON y.id = t.academic_year_id ORDER BY y.starts_on DESC, t.starts_on');
        return ['data' => $rows];
    }

    public static function store(Request $req): array
    {
        $in = self::validated($req);
        $id = self::guard(fn () => Database::insert(
            'INSERT INTO academic_terms (academic_year_id, name, starts_on, ends_on) VALUES (?, ?, ?, ?)',
            [$in['academic_year_id'], $in['name'], $in['starts_on'], $in['ends_on']]
        ), 'A term with this name already exists for the selected academic year.');
        return ['data' => self::find('academic_terms', $id, 'Academic term')];
    }

    public static function update(Request $req, array $p): array
    {
        self::find('academic_terms', $p['id'], 'Academic term');
        $in = self::validated($req);
        self::guard(fn () => Database::run(
            'UPDATE academic_terms SET academic_year_id = ?, name = ?, starts_on = ?, ends_on = ? WHERE id = ?',
            [$in['academic_year_id'], $in['name'], $in['starts_on'], $in['ends_on'], $p['id']]
        ), 'A term with this name already exists for the selected academic year.');
        return ['data' => self::find('academic_terms', $p['id'], 'Academic term')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('academic_terms', $p['id'], 'Academic term');
        self::guard(fn () => Database::run('DELETE FROM academic_terms WHERE id = ?', [$p['id']]));
        return ['message' => 'Academic term deleted.'];
    }

    private static function validated(Request $req): array
    {
        $in = Validator::validate($req->body(), self::RULES);
        if ($in['starts_on'] > $in['ends_on']) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['ends_on' => 'End date must be on or after the start date.']);
        }
        $year = Database::one('SELECT starts_on, ends_on FROM academic_years WHERE id = ?', [$in['academic_year_id']]);
        if (!$year) {
            throw new HttpException(422, 'The selected academic year does not exist.', ['academic_year_id' => 'Select a valid academic year.']);
        }
        if ($in['starts_on'] < $year['starts_on'] || $in['ends_on'] > $year['ends_on']) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['starts_on' => 'Term dates must fall within the academic year.']);
        }
        return $in;
    }
}
