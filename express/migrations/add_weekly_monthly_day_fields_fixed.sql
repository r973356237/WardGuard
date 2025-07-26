-- 为邮件配置表添加周期字段（MySQL 5.7兼容版本）
-- 不使用存储过程，直接使用ALTER TABLE语句

-- 添加 weekly_day 字段（如果不存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'email_config' 
     AND COLUMN_NAME = 'weekly_day') = 0,
    'ALTER TABLE email_config ADD COLUMN weekly_day VARCHAR(1) DEFAULT \'1\' COMMENT \'每周的哪一天（0-6，0表示星期日）\'',
    'SELECT "weekly_day字段已存在，无需添加" AS message'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 monthly_day 字段（如果不存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'email_config' 
     AND COLUMN_NAME = 'monthly_day') = 0,
    'ALTER TABLE email_config ADD COLUMN monthly_day INT DEFAULT 1 COMMENT \'每月的哪一天（1-31）\'',
    'SELECT "monthly_day字段已存在，无需添加" AS message'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;