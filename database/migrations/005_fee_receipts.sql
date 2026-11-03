USE prodev_academy;

CREATE TABLE IF NOT EXISTS fee_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fee_id INT UNSIGNED NOT NULL,
  receipt_number VARCHAR(40) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash','bank_transfer','card','online','other') NOT NULL,
  reference VARCHAR(100) NULL,
  paid_on DATE NOT NULL,
  received_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fee_payment_date (paid_on),
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE RESTRICT,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO fee_payments (fee_id, receipt_number, amount, payment_method, reference, paid_on)
SELECT id, CONCAT('LEGACY-', LPAD(id, 8, '0')), amount, 'other', 'Imported from existing paid fee', COALESCE(paid_on, CURRENT_DATE)
FROM fees
WHERE status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM fee_payments p WHERE p.fee_id = fees.id);
