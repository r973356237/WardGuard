-- 添加 weekly_day 和 monthly_day 字段到 email_config 表

-- 检查 weekly_day 字段是否存在，如果不存在则添加
SELECT COUNT(*) INTO @weekly_day_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'email_config' 
AND COLUMN_NAME = 'weekly_day';

SET @add_weekly_day = IF(@weekly_day_exists = 0, 
    'ALTER TABLE email_config ADD COLUMN weekly_day VARCHAR(1) DEFAULT \'1\' COMMENT \'每周的哪一天（0-6，0表示星期日）\'', 
    'SELECT "weekly_day字段已存在，无需添加" AS message');

PREPARE stmt FROM @add_weekly_day;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查 monthly_day 字段是否存在，如果不存在则添加
SELECT COUNT(*) INTO @monthly_day_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'email_config' 
AND COLUMN_NAME = 'monthly_day';

SET @add_monthly_day = IF(@monthly_day_exists = 0, 
    'ALTER TABLE email_config ADD COLUMN monthly_day INT DEFAULT 1 COMMENT \'每月的哪一天（1-31）\'', 
    'SELECT "monthly_day字段已存在，无需添加" AS message');

PREPARE stmt FROM @add_monthly_day;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '邮件配置表更新完成' AS message;