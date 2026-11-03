USE prodev_academy;

ALTER TABLE students
  ADD COLUMN admission_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER status,
  ADD COLUMN date_of_birth DATE NULL AFTER admission_status,
  ADD COLUMN gender ENUM('female','male','other') NULL AFTER date_of_birth,
  ADD COLUMN address VARCHAR(255) NULL AFTER gender,
  ADD COLUMN guardian_email VARCHAR(190) NULL AFTER address,
  ADD COLUMN emergency_contact VARCHAR(30) NULL AFTER guardian_email,
  ADD INDEX idx_admission_status (admission_status);
