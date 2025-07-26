-- 数据库索引优化脚本
-- 用于提升仪表盘查询性能

-- 检查并创建用户表索引
-- 邮箱索引（用于用户名查询）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 员工表索引
-- 状态索引（如果有状态字段）
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status) WHERE status IS NOT NULL;

-- 药品表索引
-- 过期日期索引（用于过期药品查询）
CREATE INDEX IF NOT EXISTS idx_medicines_expiration ON medicines(expiration_date);
-- 有效期索引
CREATE INDEX IF NOT EXISTS idx_medicines_validity ON medicines(validity_period_days);
-- 复合索引（过期日期 + 有效期）
CREATE INDEX IF NOT EXISTS idx_medicines_expiry_check ON medicines(expiration_date, validity_period_days);

-- 物资表索引
-- 过期日期索引（用于过期物资查询）
CREATE INDEX IF NOT EXISTS idx_supplies_expiration ON supplies(expiration_date);
-- 有效期索引
CREATE INDEX IF NOT EXISTS idx_supplies_validity ON supplies(validity_period_days);
-- 复合索引（过期日期 + 有效期）
CREATE INDEX IF NOT EXISTS idx_supplies_expiry_check ON supplies(expiration_date, validity_period_days);

-- 体检记录表索引
-- 创建时间索引（如果有的话）
CREATE INDEX IF NOT EXISTS idx_medical_examinations_created ON medical_examinations(created_at) WHERE created_at IS NOT NULL;

-- 邮件日志表索引
-- 发送时间索引（用于最近邮件查询）
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);
-- 状态索引
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- SMTP配置表索引
-- 活跃状态索引
CREATE INDEX IF NOT EXISTS idx_smtp_config_active ON smtp_config(is_active);

-- 显示索引创建结果
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    INDEX_TYPE
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN ('users', 'employees', 'medicines', 'supplies', 'medical_examinations', 'email_logs', 'smtp_config')
ORDER BY 
    TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;