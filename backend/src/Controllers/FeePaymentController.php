<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\HttpException;
use App\Request;
use App\Validator;

final class FeePaymentController extends BaseController
{
    public static function index(Request $req, array $p): array
    {
        self::find('fees', $p['id'], 'Fee');
        return ['data' => Database::all(
            'SELECT p.*, u.name AS received_by_name FROM fee_payments p LEFT JOIN users u ON u.id = p.received_by WHERE p.fee_id = ? ORDER BY p.paid_on DESC, p.id DESC',
            [$p['id']]
        )];
    }

    public static function store(Request $req, array $p, array $user): array
    {
        $in = Validator::validate($req->body(), [
            'amount' => 'required|numeric',
            'payment_method' => 'required|in:cash,bank_transfer,card,online,other',
            'reference' => 'nullable|string|max:100',
            'paid_on' => 'required|date',
        ]);
        if ((float) $in['amount'] <= 0) {
            throw new HttpException(422, 'Please correct the highlighted fields.', ['amount' => 'Payment amount must be greater than zero.']);
        }

        $pdo = Database::pdo();
        $pdo->beginTransaction();
        try {
            $fee = Database::one('SELECT id, amount FROM fees WHERE id = ? FOR UPDATE', [$p['id']]);
            if (!$fee) {
                throw new HttpException(404, 'Fee not found.');
            }
            $paidCents = (int) round((float) Database::value('SELECT COALESCE(SUM(amount),0) FROM fee_payments WHERE fee_id = ?', [$p['id']]) * 100);
            $feeCents = (int) round((float) $fee['amount'] * 100);
            $paymentCents = (int) round((float) $in['amount'] * 100);
            if ($paymentCents > $feeCents - $paidCents) {
                throw new HttpException(422, 'Payment exceeds the outstanding balance.', ['amount' => 'Maximum outstanding balance: ' . number_format(max(0, $feeCents - $paidCents) / 100, 2, '.', '')]);
            }

            $receipt = 'RCPT-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));
            $id = self::guard(fn () => Database::insert(
                'INSERT INTO fee_payments (fee_id, receipt_number, amount, payment_method, reference, paid_on, received_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$p['id'], $receipt, $paymentCents / 100, $in['payment_method'], $in['reference'], $in['paid_on'], $user['id']]
            ), 'Could not create a unique receipt. Please retry.');

            $nowPaid = $paidCents + $paymentCents >= $feeCents;
            Database::run(
                'UPDATE fees SET status = ?, paid_on = ? WHERE id = ?',
                [$nowPaid ? 'paid' : 'unpaid', $nowPaid ? $in['paid_on'] : null, $p['id']]
            );
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
        return ['data' => Database::one('SELECT * FROM fee_payments WHERE id = ?', [$id])];
    }
}
