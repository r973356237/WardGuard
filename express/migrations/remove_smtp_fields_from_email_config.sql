-- 从email_config表中删除SMTP相关字段

-- 检查email_config表是否存在
SET @table_exists = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_config');

DELIMITER //

CREATE PROCEDURE remove_smtp_fields()
BEGIN
    -- 检查各个字段是否存在
    SET @smtp_host_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
                            WHERE TABLE_SCHEMA = DATABASE() 
                            AND TABLE_NAME = 'email_config' 
                            AND COLUMN_NAME = 'smtp_host');
    
    SET @smtp_port_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
                            WHERE TABLE_SCHEMA = DATABASE() 
                            AND TABLE_NAME = 'email_config' 
                            AND COLUMN_NAME = 'smtp_port');
    
    SET @smtp_user_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
                            WHERE TABLE_SCHEMA = DATABASE() 
                            AND TABLE_NAME = 'email_config' 
                            AND COLUMN_NAME = 'smtp_user');
    
    SET @smtp_password_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
                                WHERE TABLE_SCHEMA = DATABASE() 
                                AND TABLE_NAME = 'email_config' 
                                AND COLUMN_NAME = 'smtp_password');
    
    -- 如果字段存在，则删除
    IF @smtp_host_exists > 0 THEN
        ALTER TABLE email_config DROP COLUMN smtp_host;
        SELECT 'smtp_host字段已删除' AS message;
    ELSE
        SELECT 'smtp_host字段不存在，无需删除' AS message;
    END IF;
    
    IF @smtp_port_exists > 0 THEN
        ALTER TABLE email_config DROP COLUMN smtp_port;
        SELECT 'smtp_port字段已删除' AS message;
    ELSE
        SELECT 'smtp_port字段不存在，无需删除' AS message;
    END IF;
    
    IF @smtp_user_exists > 0 THEN
        ALTER TABLE email_config DROP COLUMN smtp_user;
        SELECT 'smtp_user字段已删除' AS message;
    ELSE
        SELECT 'smtp_user字段不存在，无需删除' AS message;
    END IF;
    
    IF @smtp_password_exists > 0 THEN
        ALTER TABLE email_config DROP COLUMN smtp_password;
        SELECT 'smtp_password字段已删除' AS message;
    ELSE
        SELECT 'smtp_password字段不存在，无需删除' AS message;
    END IF;
    
    -- 更新表注释
    ALTER TABLE email_config COMMENT '邮件提醒配置表（不包含SMTP配置，SMTP配置已迁移至smtp_config表）';
    
    SELECT '邮件配置表更新完成' AS message;
END //

DELIMITER ;

-- 如果表存在，则执行存储过程
SET @sql = IF(@table_exists > 0, 'CALL remove_smtp_fields()', 'SELECT "email_config表不存在，无需修改" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 删除存储过程
DROP PROCEDURE IF EXISTS remove_smtp_fields;