USE prodev_academy;

ALTER TABLE users
  MODIFY role ENUM('admin','teacher','student') NOT NULL DEFAULT 'student';

ALTER TABLE teachers
  ADD COLUMN user_id INT UNSIGNED NULL UNIQUE AFTER id,
  ADD CONSTRAINT fk_teachers_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS timetable_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  section_subject_id INT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  room VARCHAR(40) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_timetable_slot (section_subject_id, day_of_week, starts_at),
  INDEX idx_timetable_day (day_of_week, starts_at),
  FOREIGN KEY (section_subject_id) REFERENCES section_subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB;
