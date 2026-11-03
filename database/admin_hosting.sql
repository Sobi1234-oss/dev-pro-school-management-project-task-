-- Creates the first admin login: admin@prodev.pk / Admin@12345 (change after first login)
INSERT IGNORE INTO users (name, email, password_hash, role) VALUES ('Academy Admin', 'admin@prodev.pk', '$2y$10$f5ybGEUITXRtLYVBparBoeTaud5SFmZC.hkHpqrviTqmZeJTdP2jm', 'admin');
