-- WardGuard 科室管理系统数据库初始化脚本
-- 适用于 MySQL 5.7.43+
-- 根据实际数据库结构生成

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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  email VARCHAR(255) DEFAULT NULL COMMENT '邮箱地址'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 员工表（根据实际结构）
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT COMMENT '自增主键',
  name VARCHAR(50) NOT NULL COMMENT '员工姓名',
  employee_number VARCHAR(20) NOT NULL COMMENT '工号（唯一标识）',
  gender VARCHAR(10) NOT NULL COMMENT '性别（男/女/其他）',
  workshop VARCHAR(50) NOT NULL COMMENT '所属车间',
  position VARCHAR(50) NOT NULL COMMENT '职位',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  birth_date DATE DEFAULT NULL COMMENT '出生日期',
  hire_date DATE DEFAULT NULL COMMENT '入职时间',
  work_start_date DATE DEFAULT NULL COMMENT '参加工作时间',
  original_company VARCHAR(200) DEFAULT NULL COMMENT '原单位',
  total_exposure_time FLOAT DEFAULT 0 COMMENT '总接害时间（年）',
  pre_hire_exposure_time FLOAT DEFAULT 0 COMMENT '入职前接害时间（年）',
  id_number VARCHAR(20) DEFAULT NULL COMMENT '身份证号',
  status VARCHAR(20) NOT NULL DEFAULT '在职' COMMENT '员工状态：在职、离职、调岗等',
  PRIMARY KEY (id, employee_number) USING BTREE,
  UNIQUE KEY employee_number (employee_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工信息表';

-- 体检表（根据实际结构）
CREATE TABLE IF NOT EXISTS medical_examinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_number VARCHAR(255) NOT NULL COMMENT '员工工号',
  examination_date DATE NOT NULL COMMENT '体检日期',
  audiometry_result VARCHAR(255) NOT NULL COMMENT '听力检查结果',
  dust_examination_result VARCHAR(255) NOT NULL COMMENT '粉尘检查结果',
  need_recheck TINYINT(4) DEFAULT 0 COMMENT '是否需要复查',
  recheck_date DATE DEFAULT NULL COMMENT '复查日期',
  audiometry_recheck_result VARCHAR(255) DEFAULT NULL COMMENT '听力复查结果',
  dust_recheck_result VARCHAR(255) DEFAULT NULL COMMENT '粉尘复查结果',
  KEY FK_medical_examinations_employees (employee_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='体检表';

-- 药品表（根据实际结构）
CREATE TABLE IF NOT EXISTS medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_name VARCHAR(255) NOT NULL COMMENT '药品名称',
  storage_location VARCHAR(255) NOT NULL COMMENT '存储位置',
  production_date DATE NOT NULL COMMENT '生产日期',
  validity_period_days INT NOT NULL COMMENT '有效期天数',
  quantity INT NOT NULL COMMENT '数量',
  expiration_date DATE COMMENT '过期日期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='药品表';

-- 操作记录表（根据实际结构）
CREATE TABLE IF NOT EXISTS operation_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '操作用户ID',
  operation_type VARCHAR(50) NOT NULL COMMENT '操作类型',
  operation_details TEXT COMMENT '操作详情',
  operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  target_type VARCHAR(50) NOT NULL COMMENT '目标类型',
  target_id INT DEFAULT NULL COMMENT '目标ID',
  target_name VARCHAR(255) DEFAULT NULL COMMENT '目标名称',
  KEY idx_user_id (user_id),
  KEY idx_operation_time (operation_time),
  KEY idx_target_type (target_type),
  KEY idx_target_id (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作记录表';

-- 权限表（根据实际结构）
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '权限名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '权限代码',
  description VARCHAR(200) DEFAULT NULL COMMENT '权限描述',
  module VARCHAR(50) NOT NULL COMMENT '所属模块',
  operation_type VARCHAR(50) DEFAULT NULL COMMENT '操作类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';

-- 用户权限关联表（根据实际结构）
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  permission_id INT NOT NULL COMMENT '权限ID',
  granted_by INT NOT NULL COMMENT '授权人ID',
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  KEY idx_user_id (user_id),
  KEY idx_permission_id (permission_id),
  KEY idx_granted_by (granted_by),
  UNIQUE KEY uk_user_permission (user_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户权限关联表';

-- 物资表（根据实际结构）
CREATE TABLE IF NOT EXISTS supplies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supply_name VARCHAR(255) NOT NULL COMMENT '物资名称',
  storage_location VARCHAR(255) NOT NULL COMMENT '存储位置',
  production_date DATE NOT NULL COMMENT '生产日期',
  validity_period_days INT NOT NULL COMMENT '有效期天数',
  supply_number VARCHAR(50) NOT NULL COMMENT '物资编号',
  expiration_date DATE COMMENT '过期日期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_supplies_expiration (expiration_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='物资表';

-- 邮件配置表（根据实际结构）
CREATE TABLE IF NOT EXISTS email_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL COMMENT '收件人邮箱',
  reminder_frequency ENUM('daily','weekly','monthly') DEFAULT 'daily' COMMENT '提醒频率',
  reminder_time TIME DEFAULT '09:00:00' COMMENT '提醒时间',
  email_subject VARCHAR(255) DEFAULT '【系统提醒】物资/药品过期通知' COMMENT '邮件主题',
  email_template TEXT COMMENT '邮件模板',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  weekly_day VARCHAR(1) DEFAULT '1' COMMENT '每周的哪一天（0-6，0表示星期日）',
  monthly_day INT DEFAULT 1 COMMENT '每月的哪一天（1-31）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮件提醒配置表（不包含SMTP配置，SMTP配置已迁移至smtp_config表）';

-- SMTP配置表（根据实际结构）
CREATE TABLE IF NOT EXISTS smtp_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  smtp_host VARCHAR(255) NOT NULL COMMENT 'SMTP服务器地址',
  smtp_port INT NOT NULL COMMENT 'SMTP端口',
  smtp_user VARCHAR(255) NOT NULL COMMENT '发件人邮箱',
  smtp_password VARCHAR(255) NOT NULL COMMENT 'SMTP密码',
  is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SMTP配置表';

-- 邮件日志表（根据实际结构）
CREATE TABLE IF NOT EXISTS email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL COMMENT '收件人',
  subject VARCHAR(255) NOT NULL COMMENT '邮件主题',
  content TEXT COMMENT '邮件内容',
  status ENUM('success','failed') NOT NULL COMMENT '发送状态',
  error_message TEXT COMMENT '错误信息',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮件发送日志表';

-- 定时任务表（根据实际结构）
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_name VARCHAR(100) NOT NULL COMMENT '任务名称',
  task_type VARCHAR(50) NOT NULL COMMENT '任务类型',
  last_run_time TIMESTAMP NULL COMMENT '上次运行时间',
  next_run_time TIMESTAMP NULL COMMENT '下次运行时间',
  status ENUM('active','inactive') DEFAULT 'active' COMMENT '任务状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='定时任务表';

-- 系统配置表（根据实际结构）
CREATE TABLE IF NOT EXISTS system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  system_name VARCHAR(255) NOT NULL COMMENT '系统名称',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 插入默认管理员用户（密码：admin123）
INSERT IGNORE INTO users (username, password, name, role, status) VALUES 
('admin', '$2b$10$rOzKqKqKqKqKqKqKqKqKqOzKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqK', '系统管理员', 'admin', 'active');

-- 插入默认权限数据
INSERT IGNORE INTO permissions (code, name, module, description) VALUES
-- 药品管理权限
('medicines.view', '查看药品', 'medicines', '查看药品列表和详情'),
('medicines.create', '添加药品', 'medicines', '添加新的药品记录'),
('medicines.update', '编辑药品', 'medicines', '修改药品信息'),
('medicines.delete', '删除药品', 'medicines', '删除药品记录'),
('medicines.export', '导出药品', 'medicines', '导出药品数据'),
('medicines.import', '导入药品', 'medicines', '批量导入药品数据'),

-- 员工管理权限
('employees.view', '查看员工', 'employees', '查看员工列表和详情'),
('employees.create', '添加员工', 'employees', '添加新的员工记录'),
('employees.update', '编辑员工', 'employees', '修改员工信息'),
('employees.delete', '删除员工', 'employees', '删除员工记录'),
('employees.export', '导出员工', 'employees', '导出员工数据'),
('employees.import', '导入员工', 'employees', '批量导入员工数据'),

-- 体检管理权限
('medical_examinations.view', '查看体检', 'medical_examinations', '查看体检记录和详情'),
('medical_examinations.create', '添加体检', 'medical_examinations', '添加新的体检记录'),
('medical_examinations.update', '编辑体检', 'medical_examinations', '修改体检信息'),
('medical_examinations.delete', '删除体检', 'medical_examinations', '删除体检记录'),
('medical_examinations.export', '导出体检', 'medical_examinations', '导出体检数据'),

-- 物资管理权限
('supplies.view', '查看物资', 'supplies', '查看物资列表和详情'),
('supplies.create', '添加物资', 'supplies', '添加新的物资记录'),
('supplies.update', '编辑物资', 'supplies', '修改物资信息'),
('supplies.delete', '删除物资', 'supplies', '删除物资记录'),
('supplies.export', '导出物资', 'supplies', '导出物资数据'),
('supplies.import', '导入物资', 'supplies', '批量导入物资数据'),

-- 用户管理权限
('users.view', '查看用户', 'users', '查看用户列表和详情'),
('users.create', '添加用户', 'users', '添加新的用户'),
('users.update', '编辑用户', 'users', '修改用户信息'),
('users.delete', '删除用户', 'users', '删除用户'),
('users.permissions', '管理权限', 'users', '管理用户权限分配'),
('users.export', '导出用户', 'users', '导出用户数据'),

-- 系统管理权限
('system.config', '系统配置', 'system', '管理系统配置'),
('system.logs', '查看日志', 'system', '查看系统操作日志'),
('system.backup', '数据备份', 'system', '执行数据备份操作');

-- 插入默认邮件配置
INSERT IGNORE INTO email_config (recipient_email, reminder_frequency, reminder_time, email_subject, email_template, weekly_day, monthly_day) VALUES
('admin@example.com', 'daily', '09:00:00', '【系统提醒】物资/药品过期通知', '系统检测到以下物资/药品即将过期或已过期，请及时处理：\n\n{content}\n\n请登录系统查看详细信息。', '1', 1);

-- 插入默认SMTP配置（需要根据实际情况修改）
INSERT IGNORE INTO smtp_config (smtp_host, smtp_port, smtp_user, smtp_password, is_active) VALUES
('smtp.example.com', 587, 'noreply@example.com', 'your_password_here', 0);

-- 创建数据库迁移记录表（用于跟踪迁移状态）
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE COMMENT '迁移文件名',
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
  INDEX idx_migration_name (migration_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数据库迁移记录表';

-- 插入初始化迁移记录
INSERT IGNORE INTO migrations (migration_name) VALUES
('database_init.sql');

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_employees_number ON employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_workshop ON employees(workshop);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_medicines_expiration ON medicines(expiration_date);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(medicine_name);
CREATE INDEX IF NOT EXISTS idx_medical_examinations_employee ON medical_examinations(employee_number);
CREATE INDEX IF NOT EXISTS idx_medical_examinations_date ON medical_examinations(exam_date);
CREATE INDEX IF NOT EXISTS idx_supplies_name ON supplies(name);
CREATE INDEX IF NOT EXISTS idx_supplies_category ON supplies(category);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- 数据库初始化完成
SELECT 'WardGuard 数据库初始化完成！' AS message;