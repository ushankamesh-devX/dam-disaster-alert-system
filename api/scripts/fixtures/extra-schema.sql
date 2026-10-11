CREATE TABLE IF NOT EXISTS alert_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alert_id BIGINT,
    admin_id BIGINT,
    admin_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    detail TEXT,
    performed_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
