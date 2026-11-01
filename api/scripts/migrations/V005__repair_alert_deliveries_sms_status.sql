-- Step 1: Expand enum to accept 'skipped' alongside legacy 'disabled'
ALTER TABLE alert_user_deliveries 
    MODIFY sms_status ENUM('pending','sent','delivered','failed','skipped','disabled') NOT NULL DEFAULT 'pending';

-- Step 2: Map legacy 'disabled' values to 'skipped'
UPDATE alert_user_deliveries SET sms_status = 'skipped' WHERE sms_status = 'disabled';

-- Step 3: Shrink enum to remove legacy 'disabled' value
ALTER TABLE alert_user_deliveries 
    MODIFY sms_status ENUM('pending','sent','delivered','failed','skipped') NOT NULL DEFAULT 'pending';

