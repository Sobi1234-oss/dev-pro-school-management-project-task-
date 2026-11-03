<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class FeeController extends BaseController
{
    public static function index(Request $req): array
    {
        [$page, $per, $off] = self::paging($req);
        $where = ['1=1'];
        $args = [];
        if ($q = $req->query('q')) {
            $where[] = '(s.name LIKE ? OR s.roll_no LIKE ?)';
            array_push($args, "%$q%", "%$q%");
        }
        if (($m = $req->query('month')) && preg_match('/^\d{4}-\d{2}$/', $m)) {
            $where[] = 'f.month = ?';
            $args[] = $m;
        }
        if (in_array($st = $req->query('status'), ['paid', 'unpaid'], true)) {
            $where[] = 'f.status = ?';
            $args[] = $st;
        }
        $w = implode(' AND ', $where);
        $total = (int) Database::value("SELECT COUNT(*) FROM fees f JOIN students s ON s.id = f.student_id WHERE $w", $args);
        $sum = Database::one(
            "SELECT COALESCE(SUM(COALESCE(p.paid_amount,0)),0) AS collected, COALESCE(SUM(GREATEST(f.amount - COALESCE(p.paid_amount,0),0)),0) AS pending FROM fees f JOIN students s ON s.id = f.student_id LEFT JOIN (SELECT fee_id, SUM(amount) AS paid_amount FROM fee_payments GROUP BY fee_id) p ON p.fee_id = f.id WHERE $w",
            $args
        );
        $rows = Database::all(
            "SELECT f.*, COALESCE(p.paid_amount,0) AS paid_amount, GREATEST(f.amount - COALESCE(p.paid_amount,0),0) AS balance_amount, s.name AS student_name, s.roll_no, c.name AS class_name FROM fees f JOIN students s ON s.id = f.student_id JOIN classes c ON c.id = s.class_id LEFT JOIN (SELECT fee_id, SUM(amount) AS paid_amount FROM fee_payments GROUP BY fee_id) p ON p.fee_id = f.id WHERE $w ORDER BY f.month DESC, s.name LIMIT $per OFFSET $off",
            $args
        );
        return self::paged($rows, $total, $page, $per) + ['summary' => $sum];
    }

    public static function store(Request $req): array
    {
        $in = Validator::validate($req->body(), ['student_id' => 'required|int', 'month' => 'required|month', 'amount' => 'required|numeric']);
        $id = self::guard(fn () => Database::insert('INSERT INTO fees (student_id, month, amount) VALUES (?, ?, ?)', [$in['student_id'], $in['month'], $in['amount']]), 'A fee record already exists for this student and month.');
        return ['data' => self::find('fees', $id, 'Fee')];
    }

    /** Creates an unpaid fee record for every active student that does not have one for the month. */
    public static function generate(Request $req): array
    {
        $in = Validator::validate($req->body(), ['month' => 'required|month']);
        $created = Database::run(
            'INSERT IGNORE INTO fees (student_id, month, amount) SELECT s.id, ?, c.monthly_fee FROM students s JOIN classes c ON c.id = s.class_id WHERE s.status = "active" AND s.admission_status = "approved"',
            [$in['month']]
        );
        return ['message' => $created > 0 ? "$created fee record(s) generated." : 'All fee records for this month already exist.', 'created' => $created];
    }

    public static function setStatus(Request $req, array $p): array
    {
        $fee = self::find('fees', $p['id'], 'Fee');
        $in = Validator::validate($req->body(), ['status' => 'required|in:paid,unpaid']);
        $paidCents = (int) round((float) Database::value('SELECT COALESCE(SUM(amount),0) FROM fee_payments WHERE fee_id = ?', [$p['id']]) * 100);
        $feeCents = (int) round((float) $fee['amount'] * 100);
        if ($in['status'] === 'unpaid' && $paidCents > 0) {
            throw new HttpException(409, 'A fee with payment history cannot be marked unpaid. Use the payment records to reconcile it.');
        }
        if ($in['status'] === 'paid' && $paidCents < $feeCents) {
            $receipt = 'RCPT-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
            Database::run(
                'INSERT INTO fee_payments (fee_id, receipt_number, amount, payment_method, reference, paid_on) VALUES (?, ?, ?, "other", "Manual paid status update", ?)',
                [$p['id'], $receipt, ($feeCents - $paidCents) / 100, date('Y-m-d')]
            );
        }
        Database::run('UPDATE fees SET status = ?, paid_on = ? WHERE id = ?', [$in['status'], $in['status'] === 'paid' ? date('Y-m-d') : null, $p['id']]);
        return ['data' => self::find('fees', $p['id'], 'Fee')];
    }

    public static function destroy(Request $req, array $p): array
    {
        self::find('fees', $p['id'], 'Fee');
        if ((int) Database::value('SELECT COUNT(*) FROM fee_payments WHERE fee_id = ?', [$p['id']]) > 0) {
            throw new HttpException(409, 'This fee has receipts and cannot be deleted. Keep the financial record for auditing.');
        }
        Database::run('DELETE FROM fees WHERE id = ?', [$p['id']]);
        return ['message' => 'Fee record deleted.'];
    }
}
