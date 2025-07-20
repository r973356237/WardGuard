-- 为用户表添加status字段
-- 执行时间: 2024-12-23

-- 添加status字段，默认值为'active'
ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER role;

-- 更新现有用户的状态为激活
UPDATE users SET status = 'active' WHERE status IS NULL;

-- 添加注释
ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '用户状态：active-激活，inactive-未激活';

-- 查看表结构
DESCRIBE users;