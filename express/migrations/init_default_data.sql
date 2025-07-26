-- 初始化基础数据脚本
-- 创建默认管理员用户和基础配置

-- 插入默认管理员用户（如果不存在）
INSERT IGNORE INTO users (username, password, name, role, status) 
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '系统管理员', 'admin', 'active');

-- 获取管理员用户ID
SET @admin_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1);

-- 为管理员分配所有权限（如果管理员用户存在且权限表有数据）
INSERT IGNORE INTO user_permissions (user_id, permission_id, granted_by)
SELECT @admin_id, p.id, @admin_id
FROM permissions p
WHERE @admin_id IS NOT NULL;

-- 插入默认SMTP配置（如果不存在）
INSERT IGNORE INTO smtp_config (smtp_host, smtp_port, smtp_user, smtp_password, is_active) 
VALUES ('smtp.qq.com', 587, 'your-email@qq.com', 'your-password', FALSE);

-- 插入默认邮件配置（如果不存在）
INSERT IGNORE INTO email_config (recipient_email, reminder_frequency, reminder_time, email_subject, weekly_day, monthly_day) 
VALUES ('admin@example.com', 'daily', '09:00:00', '【系统提醒】物资/药品过期通知', '1', 1);

-- 显示初始化结果
SELECT 
  (SELECT COUNT(*) FROM users WHERE username = 'admin') as admin_user_created,
  (SELECT COUNT(*) FROM user_permissions WHERE user_id = @admin_id) as admin_permissions_count,
  (SELECT COUNT(*) FROM smtp_config) as smtp_configs_count,
  (SELECT COUNT(*) FROM email_config) as email_configs_count;