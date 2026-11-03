<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/autoload.php';

use App\Controllers\{AcademicTermController, AcademicYearController, AnnouncementController, AuditLogController, AttendanceController, AuthController, ClassController, DashboardController, FeeController, FeePaymentController, PortalController, ResultController, SectionController, SectionSubjectController, StudentController, SubjectController, TeacherController, TeacherPortalController, TimetableController};
use App\HttpException;
use App\Request;
use App\Response;
use App\Router;

$debug = filter_var(env('APP_DEBUG', 'false'), FILTER_VALIDATE_BOOLEAN);
ini_set('display_errors', '0');
error_reporting(E_ALL);
date_default_timezone_set('Asia/Karachi');

// --- CORS -------------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = array_map('trim', explode(',', env('ALLOWED_ORIGINS', 'http://localhost:5173')));
if ($origin !== '' && in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}
header('X-Content-Type-Options: nosniff');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    Response::json(null, 204);
}

// --- Routes -----------------------------------------------------------
$router = new Router();
$router->add('POST', '/auth/login', [AuthController::class, 'login'], null);
$router->add('POST', '/auth/logout', [AuthController::class, 'logout'], 'any');
$router->add('GET', '/auth/me', [AuthController::class, 'me'], 'any');

$router->add('GET', '/dashboard', [DashboardController::class, 'stats']);

$router->add('GET', '/classes', [ClassController::class, 'index']);
$router->add('POST', '/classes', [ClassController::class, 'store']);
$router->add('PUT', '/classes/{id}', [ClassController::class, 'update']);
$router->add('DELETE', '/classes/{id}', [ClassController::class, 'destroy']);

$router->add('GET', '/teachers', [TeacherController::class, 'index']);
$router->add('POST', '/teachers', [TeacherController::class, 'store']);
$router->add('PUT', '/teachers/{id}', [TeacherController::class, 'update']);
$router->add('DELETE', '/teachers/{id}', [TeacherController::class, 'destroy']);

$router->add('GET', '/academic-years', [AcademicYearController::class, 'index']);
$router->add('POST', '/academic-years', [AcademicYearController::class, 'store']);
$router->add('PUT', '/academic-years/{id}', [AcademicYearController::class, 'update']);
$router->add('DELETE', '/academic-years/{id}', [AcademicYearController::class, 'destroy']);
$router->add('GET', '/academic-terms', [AcademicTermController::class, 'index']);
$router->add('POST', '/academic-terms', [AcademicTermController::class, 'store']);
$router->add('PUT', '/academic-terms/{id}', [AcademicTermController::class, 'update']);
$router->add('DELETE', '/academic-terms/{id}', [AcademicTermController::class, 'destroy']);
$router->add('GET', '/subjects', [SubjectController::class, 'index']);
$router->add('POST', '/subjects', [SubjectController::class, 'store']);
$router->add('PUT', '/subjects/{id}', [SubjectController::class, 'update']);
$router->add('DELETE', '/subjects/{id}', [SubjectController::class, 'destroy']);
$router->add('GET', '/sections', [SectionController::class, 'index']);
$router->add('POST', '/sections', [SectionController::class, 'store']);
$router->add('PUT', '/sections/{id}', [SectionController::class, 'update']);
$router->add('DELETE', '/sections/{id}', [SectionController::class, 'destroy']);
$router->add('GET', '/section-subjects', [SectionSubjectController::class, 'index']);
$router->add('POST', '/section-subjects', [SectionSubjectController::class, 'store']);
$router->add('PUT', '/section-subjects/{id}', [SectionSubjectController::class, 'update']);
$router->add('DELETE', '/section-subjects/{id}', [SectionSubjectController::class, 'destroy']);
$router->add('GET', '/timetable', [TimetableController::class, 'index']);
$router->add('POST', '/timetable', [TimetableController::class, 'store']);
$router->add('PUT', '/timetable/{id}', [TimetableController::class, 'update']);
$router->add('DELETE', '/timetable/{id}', [TimetableController::class, 'destroy']);
$router->add('GET', '/announcements', [AnnouncementController::class, 'index']);
$router->add('POST', '/announcements', [AnnouncementController::class, 'store']);
$router->add('PUT', '/announcements/{id}', [AnnouncementController::class, 'update']);
$router->add('DELETE', '/announcements/{id}', [AnnouncementController::class, 'destroy']);
$router->add('GET', '/announcements/visible', [AnnouncementController::class, 'visible'], 'any');
$router->add('GET', '/audit-logs', [AuditLogController::class, 'index']);

$router->add('GET', '/students/options', [StudentController::class, 'options']);
$router->add('GET', '/students', [StudentController::class, 'index']);
$router->add('POST', '/students', [StudentController::class, 'store']);
$router->add('PUT', '/students/{id}', [StudentController::class, 'update']);
$router->add('DELETE', '/students/{id}', [StudentController::class, 'destroy']);

$router->add('GET', '/attendance', [AttendanceController::class, 'index']);
$router->add('POST', '/attendance', [AttendanceController::class, 'save']);

$router->add('GET', '/results', [ResultController::class, 'index']);
$router->add('POST', '/results', [ResultController::class, 'store']);
$router->add('PUT', '/results/{id}', [ResultController::class, 'update']);
$router->add('DELETE', '/results/{id}', [ResultController::class, 'destroy']);

$router->add('GET', '/fees', [FeeController::class, 'index']);
$router->add('POST', '/fees', [FeeController::class, 'store']);
$router->add('POST', '/fees/generate', [FeeController::class, 'generate']);
$router->add('PATCH', '/fees/{id}', [FeeController::class, 'setStatus']);
$router->add('GET', '/fees/{id}/payments', [FeePaymentController::class, 'index']);
$router->add('POST', '/fees/{id}/payments', [FeePaymentController::class, 'store']);
$router->add('DELETE', '/fees/{id}', [FeeController::class, 'destroy']);

$router->add('GET', '/portal/overview', [PortalController::class, 'overview'], 'student');
$router->add('GET', '/teacher/overview', [TeacherPortalController::class, 'overview'], 'teacher');
$router->add('GET', '/teacher/attendance', [TeacherPortalController::class, 'attendanceRoster'], 'teacher');
$router->add('POST', '/teacher/attendance', [TeacherPortalController::class, 'saveAttendance'], 'teacher');
$router->add('POST', '/teacher/results', [TeacherPortalController::class, 'saveResults'], 'teacher');

// --- Dispatch with centralised error handling -------------------------
try {
    $router->dispatch(Request::capture());
} catch (HttpException $e) {
    $body = ['error' => ['message' => $e->getMessage()]];
    if ($e->errors) {
        $body['error']['fields'] = $e->errors;
    }
    Response::json($body, $e->status);
} catch (PDOException $e) {
    error_log('[db] ' . $e->getMessage());
    Response::json(['error' => ['message' => $debug ? $e->getMessage() : 'A database error occurred. Please try again.']], 500);
} catch (Throwable $e) {
    error_log('[app] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Response::json(['error' => ['message' => $debug ? $e->getMessage() : 'Something went wrong on our side.']], 500);
}
