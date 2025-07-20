-- 为用户表添加name字段
-- 执行时间: 2024-12-23

-- 添加name字段，在username字段之后
ALTER TABLE users ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '' AFTER username;

-- 添加注释
ALTER TABLE users MODIFY COLUMN name VARCHAR(100) NOT NULL DEFAULT '' COMMENT '用户姓名';

-- 查看表结构
DESCRIBE users;