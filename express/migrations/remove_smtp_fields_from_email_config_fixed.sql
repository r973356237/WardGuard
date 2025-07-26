-- 从email_config表中删除SMTP相关字段（MySQL 5.7兼容版本）
-- 不使用存储过程，直接使用ALTER TABLE语句

-- 删除 smtp_host 字段（如果存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'email_config' 
     AND COLUMN_NAME = 'smtp_host') > 0,
    'ALTER TABLE email_config DROP COLUMN smtp_host',
    'SELECT "smtp_host字段不存在，无需删除" AS message'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除 smtp_port 字段（如果存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'email_config' 
     AND COLUMN_NAME = 'smtp_port') > 0,
    'ALTER TABLE email_config DROP COLUMN smtp_port',
    'SELECT "smtp_port字段不存在，无需删除" AS message'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除 smtp_user 字段（如果存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'email_config' 
     AND COLUMN_NAME = 'smtp_user') > 0,
    'ALTER TABLE email_config DROP COLUMN smtp_user',
    'SELECT "smtp_user字段不存在，无需删除" AS message'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除 smtp_password 字段（如果存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'email_config' 
     AND COLUMN_NAME = 'smtp_password') > 0,
    'ALTER TABLE email_config DROP COLUMN smtp_password',
    'SELECT "smtp_password字段不存在，无需删除" AS message'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 更新表注释
ALTER TABLE email_config COMMENT '邮件提醒配置表（不包含SMTP配置，SMTP配置已迁移至smtp_config表）';