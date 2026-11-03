<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Request;

final class DashboardController extends BaseController
{
    public static function stats(Request $req): array
    {
        $month = date('Y-m');
        $today = date('Y-m-d');
        $from = $req->query('from', date('Y-m-d', strtotime('-13 days')));
        $to = $req->query('to', $today);
        foreach (['from' => $from, 'to' => $to] as $field => $date) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !checkdate((int) substr($date, 5, 2), (int) substr($date, 8, 2), (int) substr($date, 0, 4))) {
                throw new \App\HttpException(422, 'Please choose a valid date range.', [$field => 'Use a valid date in YYYY-MM-DD format.']);
            }
        }
        $startDate = new \DateTimeImmutable($from);
        $endDate = new \DateTimeImmutable($to);
        if ($endDate < $startDate) {
            throw new \App\HttpException(422, 'Please choose a valid date range.', ['to' => 'The end date must be on or after the start date.']);
        }
        if ($startDate->diff($endDate)->days > 89) {
            throw new \App\HttpException(422, 'Please choose a valid date range.', ['to' => 'The date range cannot exceed 90 days.']);
        }
        $academicYears = Database::all('SELECT id, name, starts_on, ends_on, status FROM academic_years ORDER BY (status = "current") DESC, starts_on DESC');
        $selectedYear = null;
        $yearId = $req->query('academic_year_id');
        if ($yearId !== null) {
            if (!ctype_digit($yearId) || (int) $yearId < 1) {
                throw new \App\HttpException(422, 'Please choose a valid academic year.', ['academic_year_id' => 'Select an available academic year.']);
            }
            foreach ($academicYears as $academicYear) {
                if ((int) $academicYear['id'] === (int) $yearId) {
                    $selectedYear = $academicYear;
                    break;
                }
            }
            if ($selectedYear === null) {
                throw new \App\HttpException(422, 'Please choose a valid academic year.', ['academic_year_id' => 'Select an available academic year.']);
            }
        } elseif ($academicYears) {
            $selectedYear = $academicYears[0];
        }
        $yearStart = $selectedYear['starts_on'] ?? date('Y-01-01');
        $yearEnd = $selectedYear['ends_on'] ?? date('Y-12-31');
        $periodStart = new \DateTimeImmutable(substr($yearStart, 0, 7) . '-01');
        $periodEnd = new \DateTimeImmutable(substr($yearEnd, 0, 7) . '-01');
        $periods = [];
        for ($period = $periodStart; $period <= $periodEnd; $period = $period->modify('+1 month')) {
            $key = $period->format('Y-m');
            $periods[$key] = [
                'month' => $key,
                'label' => $period->format('M'),
                'average' => null,
                'results' => 0,
                'collected' => 0.0,
                'pending' => 0.0,
            ];
        }
        $yearAcademicProgress = Database::all(
            'SELECT DATE_FORMAT(exam_date, "%Y-%m") AS month, ROUND(AVG(marks_obtained / NULLIF(total_marks, 0) * 100), 1) AS average, COUNT(*) AS results_count FROM results WHERE exam_date BETWEEN ? AND ? GROUP BY DATE_FORMAT(exam_date, "%Y-%m") ORDER BY month',
            [$yearStart, $yearEnd]
        );
        foreach ($yearAcademicProgress as $progress) {
            if (isset($periods[$progress['month']])) {
                $periods[$progress['month']]['average'] = (float) $progress['average'];
                $periods[$progress['month']]['results'] = (int) $progress['results_count'];
            }
        }
        $yearFeeProgress = Database::all(
            'SELECT f.month, COALESCE(SUM(p.paid_amount), 0) AS collected, COALESCE(SUM(GREATEST(f.amount - COALESCE(p.paid_amount, 0), 0)), 0) AS pending FROM fees f LEFT JOIN (SELECT fee_id, SUM(amount) AS paid_amount FROM fee_payments GROUP BY fee_id) p ON p.fee_id = f.id WHERE f.month BETWEEN ? AND ? GROUP BY f.month ORDER BY f.month',
            [substr($yearStart, 0, 7), substr($yearEnd, 0, 7)]
        );
        foreach ($yearFeeProgress as $progress) {
            if (isset($periods[$progress['month']])) {
                $periods[$progress['month']]['collected'] = (float) $progress['collected'];
                $periods[$progress['month']]['pending'] = (float) $progress['pending'];
            }
        }
        $att = Database::one(
            'SELECT SUM(status="present") AS present, COUNT(*) AS marked FROM attendance WHERE date = ?',
            [$today]
        );
        $fees = Database::one(
            'SELECT COALESCE(SUM(COALESCE(p.paid_amount,0)),0) AS collected, COALESCE(SUM(GREATEST(f.amount - COALESCE(p.paid_amount,0),0)),0) AS pending FROM fees f LEFT JOIN (SELECT fee_id, SUM(amount) AS paid_amount FROM fee_payments GROUP BY fee_id) p ON p.fee_id = f.id WHERE f.month = ?',
            [$month]
        );
        $trend = Database::all(
            'SELECT date, SUM(status="present") AS present, SUM(status="absent") AS absent, SUM(status="leave") AS on_leave FROM attendance WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date',
            [$from, $to]
        );
        $attendanceByDate = [];
        foreach ($trend as $day) {
            $attendanceByDate[$day['date']] = $day;
        }
        $completeTrend = [];
        for ($date = $startDate; $date <= $endDate; $date = $date->modify('+1 day')) {
            $key = $date->format('Y-m-d');
            $completeTrend[] = $attendanceByDate[$key] ?? [
                'date' => $key,
                'present' => 0,
                'absent' => 0,
                'on_leave' => 0,
            ];
        }
        return [
            'totals' => [
                'students' => (int) Database::value('SELECT COUNT(*) FROM students WHERE status = "active"'),
                'classes' => (int) Database::value('SELECT COUNT(*) FROM classes'),
                'teachers' => (int) Database::value('SELECT COUNT(*) FROM teachers WHERE status = "active"'),
                'pending_admissions' => (int) Database::value('SELECT COUNT(*) FROM students WHERE admission_status = "pending"'),
                'today_present' => (int) ($att['present'] ?? 0),
                'today_marked' => (int) ($att['marked'] ?? 0),
            ],
            'fees' => ['month' => $month, 'collected' => (float) $fees['collected'], 'pending' => (float) $fees['pending']],
            'attendance_trend' => $completeTrend,
            'attendance_range' => ['from' => $from, 'to' => $to],
            'academic_years' => array_map(static fn(array $year): array => [
                'id' => (int) $year['id'],
                'name' => $year['name'],
                'status' => $year['status'],
            ], $academicYears),
            'selected_academic_year' => $selectedYear === null ? null : [
                'id' => (int) $selectedYear['id'],
                'name' => $selectedYear['name'],
                'starts_on' => $yearStart,
                'ends_on' => $yearEnd,
            ],
            'yearly_progress' => array_values($periods),
            'teacher_status' => [
                'active' => (int) Database::value('SELECT COUNT(*) FROM teachers WHERE status = "active"'),
                'inactive' => (int) Database::value('SELECT COUNT(*) FROM teachers WHERE status = "inactive"'),
            ],
            'classes' => Database::all('SELECT c.name, COUNT(s.id) AS students FROM classes c LEFT JOIN students s ON s.class_id = c.id AND s.status = "active" GROUP BY c.id ORDER BY c.name'),
            'recent_students' => Database::all('SELECT s.id, s.name, s.admitted_on, c.name AS class_name FROM students s JOIN classes c ON c.id = s.class_id ORDER BY s.id DESC LIMIT 5'),
            'unpaid_fees' => Database::all('SELECT f.id, f.month, f.amount, s.name AS student_name FROM fees f JOIN students s ON s.id = f.student_id WHERE f.status = "unpaid" ORDER BY f.month, s.name LIMIT 5'),
        ];
    }
}
