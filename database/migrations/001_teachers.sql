USE prodev_academy;

CREATE TABLE IF NOT EXISTS teachers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NULL UNIQUE,
  phone VARCHAR(30) NULL,
  specialization VARCHAR(120) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE classes ADD COLUMN teacher_id INT UNSIGNED NULL AFTER name;

INSERT INTO teachers (name)
SELECT DISTINCT TRIM(c.teacher)
FROM classes c
WHERE TRIM(c.teacher) <> ''
  AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.name = TRIM(c.teacher));

UPDATE classes c
JOIN teachers t ON t.name = TRIM(c.teacher)
SET c.teacher_id = t.id;

ALTER TABLE classes
  ADD CONSTRAINT fk_classes_teacher
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT;

ALTER TABLE classes
  MODIFY teacher_id INT UNSIGNED NOT NULL,
  DROP COLUMN teacher;
