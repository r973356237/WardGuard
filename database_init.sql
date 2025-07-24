-- WardGuard 科室管理系统数据库初始化脚本
-- 适用于 MySQL 5.7.43+

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS wardguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wardguard;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  name VARCHAR(100) NOT NULL COMMENT '真实姓名',
  role ENUM('admin', 'user') DEFAULT 'user' COMMENT '用户角色',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '用户状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 员工表
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '员工姓名',
  employee_id VARCHAR(50) UNIQUE COMMENT '员工编号',
  department VARCHAR(100) COMMENT '部门',
  position VARCHAR(100) COMMENT '职位',
  phone VARCHAR(20) COMMENT '电话',
  email VARCHAR(100) COMMENT '邮箱',
  hire_date DATE COMMENT '入职日期',
  status ENUM('active', 'inactive', 'resigned') DEFAULT 'active' COMMENT '员工状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工表';

-- 物资表
CREATE TABLE IF NOT EXISTS supplies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL COMMENT '物资名称',
  category VARCHAR(100) COMMENT '物资类别',
  specification VARCHAR(200) COMMENT '规格型号',
  unit VARCHAR(20) COMMENT '单位',
  current_stock INT DEFAULT 0 COMMENT '当前库存',
  min_stock INT DEFAULT 0 COMMENT '最低库存',
  max_stock INT DEFAULT 0 COMMENT '最高库存',
  unit_price DECIMAL(10,2) COMMENT '单价',
  supplier VARCHAR(200) COMMENT '供应商',
  storage_location VARCHAR(100) COMMENT '存放位置',
  status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active' COMMENT '物资状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物资表';

-- 药品表
CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL COMMENT '药品名称',
  generic_name VARCHAR(200) COMMENT '通用名',
  dosage_form VARCHAR(50) COMMENT '剂型',
  specification VARCHAR(100) COMMENT '规格',
  manufacturer VARCHAR(200) COMMENT '生产厂家',
  approval_number VARCHAR(100) COMMENT '批准文号',
  current_stock INT DEFAULT 0 COMMENT '当前库存',
  min_stock INT DEFAULT 0 COMMENT '最低库存',
  unit_price DECIMAL(10,2) COMMENT '单价',
  expiry_date DATE COMMENT '有效期',
  storage_condition VARCHAR(200) COMMENT '储存条件',
  status ENUM('active', 'inactive', 'expired') DEFAULT 'active' COMMENT '药品状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='药品表';

-- 体检表
CREATE TABLE IF NOT EXISTS medical_examinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL COMMENT '员工ID',
  exam_date DATE NOT NULL COMMENT '体检日期',
  exam_type VARCHAR(100) COMMENT '体检类型',
  exam_items TEXT COMMENT '体检项目',
  results TEXT COMMENT '体检结果',
  doctor VARCHAR(100) COMMENT '体检医生',
  hospital VARCHAR(200) COMMENT '体检医院',
  status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled' COMMENT '体检状态',
  notes TEXT COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='体检表';

-- 操作记录表
CREATE TABLE IF NOT EXISTS operation_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '操作用户ID',
  operation_type VARCHAR(50) NOT NULL COMMENT '操作类型',
  table_name VARCHAR(50) COMMENT '操作表名',
  record_id INT COMMENT '记录ID',
  operation_description TEXT COMMENT '操作描述',
  old_data JSON COMMENT '操作前数据',
  new_data JSON COMMENT '操作后数据',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作记录表';

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE COMMENT '权限名称',
  description VARCHAR(200) COMMENT '权限描述',
  resource VARCHAR(100) NOT NULL COMMENT '资源',
  action VARCHAR(50) NOT NULL COMMENT '操作',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50) NOT NULL COMMENT '角色',
  permission_id INT NOT NULL COMMENT '权限ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 邮件配置表
CREATE TABLE IF NOT EXISTS email_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_name VARCHAR(100) NOT NULL COMMENT '配置名称',
  sender_name VARCHAR(100) NOT NULL COMMENT '发件人名称',
  sender_email VARCHAR(255) NOT NULL COMMENT '发件人邮箱',
  is_active BOOLEAN DEFAULT FALSE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件配置表';

-- SMTP配置表
CREATE TABLE IF NOT EXISTS smtp_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  smtp_host VARCHAR(255) NOT NULL COMMENT 'SMTP服务器地址',
  smtp_port INT NOT NULL COMMENT 'SMTP端口',
  smtp_user VARCHAR(255) NOT NULL COMMENT '发件人邮箱',
  smtp_pass VARCHAR(255) NOT NULL COMMENT 'SMTP密码',
  smtp_secure BOOLEAN DEFAULT TRUE COMMENT '是否使用SSL/TLS',
  is_active BOOLEAN DEFAULT FALSE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SMTP配置表';

-- 邮件日志表
CREATE TABLE IF NOT EXISTS email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL COMMENT '收件人邮箱',
  subject VARCHAR(500) NOT NULL COMMENT '邮件主题',
  content TEXT COMMENT '邮件内容',
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending' COMMENT '发送状态',
  error_message TEXT COMMENT '错误信息',
  sent_at TIMESTAMP NULL COMMENT '发送时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件日志表';

-- 插入默认管理员用户（密码：admin123）
INSERT IGNORE INTO users (username, password, name, role, status) VALUES 
('admin', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', '系统管理员', 'admin', 'active');

-- 插入基础权限数据
INSERT IGNORE INTO permissions (name, description, resource, action) VALUES
('用户管理', '管理系统用户', 'users', 'manage'),
('员工查看', '查看员工信息', 'employees', 'read'),
('员工管理', '管理员工信息', 'employees', 'manage'),
('物资查看', '查看物资信息', 'supplies', 'read'),
('物资管理', '管理物资信息', 'supplies', 'manage'),
('药品查看', '查看药品信息', 'medicines', 'read'),
('药品管理', '管理药品信息', 'medicines', 'manage'),
('体检查看', '查看体检信息', 'medical_examinations', 'read'),
('体检管理', '管理体检信息', 'medical_examinations', 'manage'),
('系统设置', '系统配置管理', 'system', 'manage'),
('操作记录查看', '查看操作记录', 'operation_records', 'read');

-- 为管理员角色分配所有权限
INSERT IGNORE INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions;

-- 为普通用户角色分配基础权限
INSERT IGNORE INTO role_permissions (role, permission_id) 
SELECT 'user', id FROM permissions WHERE action = 'read';

-- 创建索引以提高查询性能
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_supplies_category ON supplies(category);
CREATE INDEX idx_supplies_status ON supplies(status);
CREATE INDEX idx_medicines_status ON medicines(status);
CREATE INDEX idx_medicines_expiry ON medicines(expiry_date);
CREATE INDEX idx_medical_examinations_employee ON medical_examinations(employee_id);
CREATE INDEX idx_medical_examinations_date ON medical_examinations(exam_date);
CREATE INDEX idx_operation_records_user ON operation_records(user_id);
CREATE INDEX idx_operation_records_created ON operation_records(created_at);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at);

-- 显示初始化完成信息
SELECT '数据库初始化完成！' AS message;
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS permission_count FROM permissions;