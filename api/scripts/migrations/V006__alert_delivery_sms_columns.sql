-- SMS delivery columns used by AlertUserDelivery / SmsDispatcherService.
-- The base schema created alert_user_deliveries earlier, so the
-- CREATE TABLE IF NOT EXISTS in "DB System/step5_7_sms_alerts_setup.sql" never added them.
ALTER TABLE alert_user_deliveries
    ADD COLUMN phone_number VARCHAR(20) NULL,
    ADD COLUMN sms_message TEXT NULL,
    ADD COLUMN sms_gateway_sid VARCHAR(100) NULL,
    ADD COLUMN sms_error_message TEXT NULL,
    ADD COLUMN attempt_count INT DEFAULT 0,
    ADD COLUMN sent_at DATETIME(6) NULL,
    MODIFY COLUMN sms_status ENUM('pending','sent','delivered','failed','skipped','disabled') DEFAULT 'pending';
