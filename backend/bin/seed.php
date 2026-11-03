<?php
declare(strict_types=1);
/**
 * Usage: php bin/seed.php          -> admin account only
 *        php bin/seed.php --demo   -> fill missing school demo data (safe to rerun)
 */
require dirname(__DIR__) . '/src/autoload.php';

use App\Database;

$demo = in_array('--demo', $argv, true);
$hash = static fn (string $password): string => password_hash($password, PASSWORD_DEFAULT);

Database::run(
    'INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "admin")',
    ['Academy Admin', 'admin@prodev.pk', $hash('Admin@12345')]
);
echo "Admin ready: admin@prodev.pk / Admin@12345 (change this after first login)\n";

if (!$demo) {
    exit(0);
}

$pdo = Database::pdo();
$pdo->beginTransaction();

try {
    $teacherSpecs = [
        ['Ms. Ayesha Khan', 'ayesha.khan@demo.prodev.pk', '03001234567', 'Mathematics'],
        ['Mr. Bilal Ahmed', 'bilal.ahmed@demo.prodev.pk', '03002345678', 'English'],
        ['Dr. Sana Malik', 'sana.malik@demo.prodev.pk', '03003456789', 'Science'],
    ];
    $teacherIds = [];
    foreach ($teacherSpecs as [$name, $email, $phone, $specialization]) {
        $teacher = Database::one('SELECT id, email, user_id FROM teachers WHERE name = ? ORDER BY id LIMIT 1', [$name]);
        if (!$teacher) {
            $teacherId = Database::insert(
                'INSERT INTO teachers (name, email, phone, specialization, status) VALUES (?, ?, ?, ?, "active")',
                [$name, $email, $phone, $specialization]
            );
            $teacher = ['id' => $teacherId, 'email' => $email, 'user_id' => null];
        } else {
            $teacherId = (int) $teacher['id'];
            if ($teacher['email'] === null) {
                Database::run(
                    'UPDATE teachers SET email = ?, phone = COALESCE(phone, ?), specialization = COALESCE(specialization, ?) WHERE id = ?',
                    [$email, $phone, $specialization, $teacherId]
                );
            }
        }

        $teacherEmail = $teacher['email'] ?: $email;
        $teacherUser = $teacher['user_id']
            ? Database::one('SELECT id, role FROM users WHERE id = ?', [$teacher['user_id']])
            : Database::one('SELECT id, role FROM users WHERE email = ?', [$teacherEmail]);
        if ($teacherUser && $teacherUser['role'] !== 'teacher') {
            throw new RuntimeException("Cannot create demo teacher login: $teacherEmail is already used by another role.");
        }
        if (!$teacherUser) {
            $teacherUserId = Database::insert(
                'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "teacher")',
                [$name, $teacherEmail, $hash('Teacher@12345')]
            );
            Database::run('UPDATE teachers SET user_id = ? WHERE id = ?', [$teacherUserId, $teacherId]);
        } elseif (!$teacher['user_id']) {
            Database::run('UPDATE teachers SET user_id = ? WHERE id = ?', [$teacherUser['id'], $teacherId]);
        }
        $teacherIds[$name] = $teacherId;
    }

    $classSpecs = [
        ['Grade 6', 'Ms. Ayesha Khan', 4500.00],
        ['Grade 8', 'Mr. Bilal Ahmed', 5500.00],
        ['Matric Science', 'Dr. Sana Malik', 7000.00],
    ];
    $classIds = [];
    foreach ($classSpecs as [$name, $teacherName, $monthlyFee]) {
        $class = Database::one('SELECT id FROM classes WHERE name = ? ORDER BY id LIMIT 1', [$name]);
        if ($class) {
            $classIds[$name] = (int) $class['id'];
            Database::run(
                'UPDATE classes SET teacher_id = ?, monthly_fee = ? WHERE id = ?',
                [$teacherIds[$teacherName], $monthlyFee, $classIds[$name]]
            );
        } else {
            $classIds[$name] = Database::insert(
                'INSERT INTO classes (name, teacher_id, monthly_fee) VALUES (?, ?, ?)',
                [$name, $teacherIds[$teacherName], $monthlyFee]
            );
        }
    }

    $now = new DateTimeImmutable('today');
    $yearStart = (int) $now->format('n') >= 7 ? (int) $now->format('Y') : (int) $now->format('Y') - 1;
    $yearEnd = $yearStart + 1;
    $yearName = "$yearStart-$yearEnd";
    $year = Database::one('SELECT id FROM academic_years WHERE name = ?', [$yearName]);
    $yearId = $year
        ? (int) $year['id']
        : Database::insert(
            'INSERT INTO academic_years (name, starts_on, ends_on, status) VALUES (?, ?, ?, "current")',
            [$yearName, sprintf('%04d-07-01', $yearStart), sprintf('%04d-06-30', $yearEnd)]
        );

    $termSpecs = [
        ['Term 1', sprintf('%04d-07-01', $yearStart), sprintf('%04d-11-30', $yearStart)],
        ['Term 2', sprintf('%04d-12-01', $yearStart), sprintf('%04d-03-31', $yearEnd)],
        ['Term 3', sprintf('%04d-04-01', $yearEnd), sprintf('%04d-06-30', $yearEnd)],
    ];
    foreach ($termSpecs as [$termName, $startsOn, $endsOn]) {
        if (!Database::one('SELECT id FROM academic_terms WHERE academic_year_id = ? AND name = ?', [$yearId, $termName])) {
            Database::run(
                'INSERT INTO academic_terms (academic_year_id, name, starts_on, ends_on) VALUES (?, ?, ?, ?)',
                [$yearId, $termName, $startsOn, $endsOn]
            );
        }
    }

    $subjectSpecs = [
        ['Mathematics', 'MATH'],
        ['English', 'ENG'],
        ['Science', 'SCI'],
        ['Urdu', 'URD'],
        ['Computer Studies', 'CS'],
        ['Social Studies', 'SOC'],
    ];
    $subjectIds = [];
    foreach ($subjectSpecs as [$name, $code]) {
        $subject = Database::one('SELECT id FROM subjects WHERE name = ?', [$name]);
        $subjectIds[$name] = $subject
            ? (int) $subject['id']
            : Database::insert('INSERT INTO subjects (name, code, status) VALUES (?, ?, "active")', [$name, $code]);
    }

    $sectionIds = [];
    foreach ($classSpecs as [$className, $teacherName]) {
        $section = Database::one(
            'SELECT id FROM sections WHERE class_id = ? AND academic_year_id = ? AND name = ?',
            [$classIds[$className], $yearId, 'A']
        );
        $sectionIds[$className] = $section
            ? (int) $section['id']
            : Database::insert(
                'INSERT INTO sections (class_id, academic_year_id, teacher_id, name) VALUES (?, ?, ?, "A")',
                [$classIds[$className], $yearId, $teacherIds[$teacherName]]
            );
        Database::run('UPDATE sections SET teacher_id = ? WHERE id = ?', [$teacherIds[$teacherName], $sectionIds[$className]]);

        foreach ($subjectSpecs as $subjectIndex => [$subjectName]) {
            $assignment = Database::one(
                'SELECT id FROM section_subjects WHERE section_id = ? AND subject_id = ?',
                [$sectionIds[$className], $subjectIds[$subjectName]]
            );
            $assignmentId = $assignment
                ? (int) $assignment['id']
                : Database::insert(
                    'INSERT INTO section_subjects (section_id, subject_id, teacher_id) VALUES (?, ?, ?)',
                    [$sectionIds[$className], $subjectIds[$subjectName], $teacherIds[$teacherName]]
                );
            Database::run('UPDATE section_subjects SET teacher_id = ? WHERE id = ?', [$teacherIds[$teacherName], $assignmentId]);

            foreach ([1, 3] as $day) {
                $startHour = 8 + $subjectIndex;
                $startsAt = sprintf('%02d:00:00', $startHour);
                $endsAt = sprintf('%02d:00:00', $startHour + 1);
                if (!Database::one(
                    'SELECT id FROM timetable_entries WHERE section_subject_id = ? AND day_of_week = ? AND starts_at = ?',
                    [$assignmentId, $day, $startsAt]
                )) {
                    Database::run(
                        'INSERT INTO timetable_entries (section_subject_id, day_of_week, starts_at, ends_at, room) VALUES (?, ?, ?, ?, ?)',
                        [$assignmentId, $day, $startsAt, $endsAt, 'Room ' . (1 + ($subjectIndex % 3))]
                    );
                }
            }
        }
    }

    $studentSpecs = [
        ['Hamza Tariq', 'Tariq Mehmood', 'parent@prodev.pk', 'Grade 6'],
        ['Fatima Noor', 'Noor Hussain', 'parent.fatima@demo.prodev.pk', 'Grade 8'],
        ['Ali Raza', 'Raza Abbas', 'parent.ali@demo.prodev.pk', 'Matric Science'],
        ['Zainab Iqbal', 'Iqbal Hussain', 'parent.zainab@demo.prodev.pk', 'Grade 6'],
        ['Usman Farooq', 'Farooq Ahmed', 'parent.usman@demo.prodev.pk', 'Grade 8'],
        ['Maryam Siddiqui', 'Siddiqui Anwar', 'parent.maryam@demo.prodev.pk', 'Matric Science'],
        ['Ahmad Shah', 'Shah Nawaz', 'parent.ahmad@demo.prodev.pk', 'Grade 6'],
        ['Hira Aslam', 'Aslam Javed', 'parent.hira@demo.prodev.pk', 'Grade 8'],
        ['Daniyal Butt', 'Butt Rashid', 'parent.daniyal@demo.prodev.pk', 'Matric Science'],
        ['Areeba Chaudhry', 'Chaudhry Saeed', 'parent.areeba@demo.prodev.pk', 'Grade 6'],
        ['Saad Qureshi', 'Qureshi Imran', 'parent.saad@demo.prodev.pk', 'Grade 8'],
        ['Noor Fatima', 'Ghulam Mustafa', 'parent.noor@demo.prodev.pk', 'Matric Science'],
    ];
    $demoStudentIds = [];
    foreach ($studentSpecs as $index => [$studentName, $guardianName, $guardianEmail, $className]) {
        $classId = $classIds[$className];
        $sectionId = $sectionIds[$className];
        $rollNo = 'R-' . str_pad((string) (intdiv($index, 3) + 1), 3, '0', STR_PAD_LEFT);
        $student = Database::one('SELECT id, user_id FROM students WHERE name = ? AND class_id = ? ORDER BY id LIMIT 1', [$studentName, $classId]);

        if ($index === 0) {
            $guardianUser = Database::one('SELECT id, role FROM users WHERE email = ?', [$guardianEmail]);
        } else {
            $guardianUser = Database::one('SELECT id, role FROM users WHERE email = ?', [$guardianEmail]);
            if ($guardianUser && $guardianUser['role'] !== 'student') {
                throw new RuntimeException("Cannot create demo parent login: $guardianEmail is already used by another role.");
            }
            if (!$guardianUser) {
                $guardianUserId = Database::insert(
                    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "student")',
                    [$guardianName, $guardianEmail, $hash('Parent@12345')]
                );
                $guardianUser = ['id' => $guardianUserId, 'role' => 'student'];
            }
        }

        $guardianUserId = $guardianUser['id'] ?? null;
        if ($student) {
            $studentId = (int) $student['id'];
            Database::run(
                'UPDATE students SET section_id = ?, admission_status = "approved", status = "active", user_id = COALESCE(user_id, ?) WHERE id = ?',
                [$sectionId, $guardianUserId, $studentId]
            );
        } else {
            $studentId = Database::insert(
                'INSERT INTO students (user_id, class_id, section_id, roll_no, name, parent_name, phone, status, admission_status, admitted_on) VALUES (?, ?, ?, ?, ?, ?, ?, "active", "approved", ?)',
                [$guardianUserId, $classId, $sectionId, $rollNo, $studentName, $guardianName, '0300' . (1000000 + $index * 7919), date('Y-m-d', strtotime('-' . (20 + $index * 13) . ' days'))]
            );
        }
        $demoStudentIds[] = [$studentId, $classId, $index];
    }

    $subjectNames = array_column($subjectSpecs, 0);
    foreach ($demoStudentIds as [$studentId, $classId, $index]) {
        for ($daysAgo = 1; $daysAgo <= 28; $daysAgo++) {
            $stamp = strtotime("-$daysAgo days");
            if ((int) date('N', $stamp) >= 6) {
                continue;
            }
            $date = date('Y-m-d', $stamp);
            if (!Database::one('SELECT id FROM attendance WHERE student_id = ? AND date = ?', [$studentId, $date])) {
                $roll = ($index * 17 + $daysAgo * 13) % 100;
                $status = $roll < 7 ? 'leave' : ($roll < 17 ? 'absent' : 'present');
                Database::run('INSERT INTO attendance (student_id, date, status) VALUES (?, ?, ?)', [$studentId, $date, $status]);
            }
        }

        foreach ($subjectNames as $subjectIndex => $subjectName) {
            foreach ([['Mid-Term', '-45 days'], ['Monthly Test', '-10 days']] as [$examName, $dateOffset]) {
                if (!Database::one(
                    'SELECT id FROM results WHERE student_id = ? AND subject = ? AND exam = ?',
                    [$studentId, $subjectName, $examName]
                )) {
                    $marks = 52 + (($index * 11 + $subjectIndex * 7 + ($examName === 'Mid-Term' ? 3 : 15)) % 46);
                    Database::run(
                        'INSERT INTO results (student_id, subject, exam, marks_obtained, total_marks, exam_date) VALUES (?, ?, ?, ?, 100, ?)',
                        [$studentId, $subjectName, $examName, $marks, date('Y-m-d', strtotime($dateOffset))]
                    );
                }
            }
        }

        foreach ([date('Y-m', strtotime('-1 month')), date('Y-m')] as $monthIndex => $month) {
            $fee = Database::one('SELECT id, amount, status FROM fees WHERE student_id = ? AND month = ?', [$studentId, $month]);
            if (!$fee) {
                $feeId = Database::insert(
                    'INSERT INTO fees (student_id, month, amount, status, paid_on) VALUES (?, ?, (SELECT monthly_fee FROM classes WHERE id = ?), ?, ?)',
                    [$studentId, $month, $classId, $monthIndex === 0 ? 'paid' : 'unpaid', $monthIndex === 0 ? date('Y-m-d', strtotime($month . '-10')) : null]
                );
                $fee = Database::one('SELECT id, amount, status FROM fees WHERE id = ?', [$feeId]);
            }
            if ($fee['status'] === 'paid' && (int) Database::value('SELECT COUNT(*) FROM fee_payments WHERE fee_id = ?', [$fee['id']]) === 0) {
                Database::run(
                    'INSERT INTO fee_payments (fee_id, receipt_number, amount, payment_method, reference, paid_on) VALUES (?, ?, ?, "cash", ?, ?)',
                    [$fee['id'], 'DEMO-' . str_pad((string) $fee['id'], 8, '0', STR_PAD_LEFT), $fee['amount'], 'Demo monthly fee', $monthIndex === 0 ? date('Y-m-d', strtotime($month . '-10')) : date('Y-m-d')]
                );
            }
        }
    }

    $announcements = [
        ['Welcome to the new academic year', 'Welcome back! Please review your timetable and contact the academy office if your details need updating.', 'all', date('Y-m-d'), null],
        ['Teacher planning meeting', 'Teachers: please review your class assignments and prepare your first-term plans.', 'teachers', date('Y-m-d'), date('Y-m-d', strtotime('+30 days'))],
        ['Parent-teacher meeting', 'Parents and students are invited to meet teachers on the last Friday of this month.', 'students', date('Y-m-d'), date('Y-m-d', strtotime('+30 days'))],
    ];
    $adminId = (int) Database::value('SELECT id FROM users WHERE email = ?', ['admin@prodev.pk']);
    foreach ($announcements as [$title, $body, $audience, $startsOn, $endsOn]) {
        if (!Database::one('SELECT id FROM announcements WHERE title = ?', [$title])) {
            Database::run(
                'INSERT INTO announcements (title, body, audience, starts_on, ends_on, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                [$title, $body, $audience, $startsOn, $endsOn, $adminId]
            );
        }
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

echo "Demo data is ready (safe to rerun).\n";
echo "Teacher login: ayesha.khan@demo.prodev.pk / Teacher@12345\n";
echo "Teacher login: bilal.ahmed@demo.prodev.pk / Teacher@12345\n";
echo "Teacher login: sana.malik@demo.prodev.pk / Teacher@12345\n";
echo "Parent login: parent@prodev.pk / Parent@12345\n";
echo "Other demo parent logins: parent.<student>@demo.prodev.pk / Parent@12345\n";

$counts = [
    'teachers' => 'SELECT COUNT(*) FROM teachers',
    'classes' => 'SELECT COUNT(*) FROM classes',
    'academic years' => 'SELECT COUNT(*) FROM academic_years',
    'terms' => 'SELECT COUNT(*) FROM academic_terms',
    'subjects' => 'SELECT COUNT(*) FROM subjects',
    'sections' => 'SELECT COUNT(*) FROM sections',
    'subject assignments' => 'SELECT COUNT(*) FROM section_subjects',
    'timetable entries' => 'SELECT COUNT(*) FROM timetable_entries',
    'students' => 'SELECT COUNT(*) FROM students',
    'attendance records' => 'SELECT COUNT(*) FROM attendance',
    'exam results' => 'SELECT COUNT(*) FROM results',
    'fees' => 'SELECT COUNT(*) FROM fees',
    'fee payments/receipts' => 'SELECT COUNT(*) FROM fee_payments',
    'announcements' => 'SELECT COUNT(*) FROM announcements',
];
foreach ($counts as $label => $sql) {
    echo ucfirst($label) . ': ' . Database::value($sql) . "\n";
}
