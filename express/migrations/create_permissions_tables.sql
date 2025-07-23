-- 创建权限表
CREATE TABLE IF NOT EXISTS permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '权限名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '权限代码',
  description VARCHAR(255) DEFAULT NULL COMMENT '权限描述',
  module VARCHAR(50) NOT NULL COMMENT '所属模块',
  operation_type VARCHAR(50) DEFAULT NULL COMMENT '操作类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建用户权限关联表
CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  permission_id INT NOT NULL COMMENT '权限ID',
  granted_by INT NOT NULL COMMENT '授权人ID',
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '授权时间',
  UNIQUE KEY uk_user_permission (user_id, permission_id),
  INDEX idx_user_id (user_id),
  INDEX idx_permission_id (permission_id),
  INDEX idx_granted_by (granted_by),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户权限关联表';

-- 插入基础权限数据
INSERT INTO permissions (code, name, description, module, operation_type) VALUES
-- 用户管理权限
('users:view', '查看用户', '查看用户列表和用户详情', 'users', 'view'),
('users:add', '添加用户', '创建新用户', 'users', 'add'),
('users:edit', '编辑用户', '修改用户信息', 'users', 'edit'),
('users:delete', '删除用户', '删除用户', 'users', 'delete'),

-- 员工管理权限
('employees:view', '查看员工', '查看员工列表和员工详情', 'employees', 'view'),
('employees:add', '添加员工', '创建新员工', 'employees', 'add'),
('employees:edit', '编辑员工', '修改员工信息', 'employees', 'edit'),
('employees:delete', '删除员工', '删除员工', 'employees', 'delete'),
('employees:import', '导入员工', '批量导入员工信息', 'employees', 'import'),
('employees:export', '导出员工', '导出员工信息', 'employees', 'export'),

-- 药品管理权限
('medicines:view', '查看药品', '查看药品列表和药品详情', 'medicines', 'view'),
('medicines:add', '添加药品', '创建新药品', 'medicines', 'add'),
('medicines:edit', '编辑药品', '修改药品信息', 'medicines', 'edit'),
('medicines:delete', '删除药品', '删除药品', 'medicines', 'delete'),
('medicines:import', '导入药品', '批量导入药品信息', 'medicines', 'import'),
('medicines:export', '导出药品', '导出药品信息', 'medicines', 'export'),

-- 物资管理权限
('supplies:view', '查看物资', '查看物资列表和物资详情', 'supplies', 'view'),
('supplies:add', '添加物资', '创建新物资', 'supplies', 'add'),
('supplies:edit', '编辑物资', '修改物资信息', 'supplies', 'edit'),
('supplies:delete', '删除物资', '删除物资', 'supplies', 'delete'),
('supplies:import', '导入物资', '批量导入物资信息', 'supplies', 'import'),
('supplies:export', '导出物资', '导出物资信息', 'supplies', 'export'),

-- 体检管理权限
('medical_examinations:view', '查看体检记录', '查看体检记录列表和详情', 'medical_examinations', 'view'),
('medical_examinations:add', '添加体检记录', '创建新体检记录', 'medical_examinations', 'add'),
('medical_examinations:edit', '编辑体检记录', '修改体检记录信息', 'medical_examinations', 'edit'),
('medical_examinations:delete', '删除体检记录', '删除体检记录', 'medical_examinations', 'delete'),
('medical_examinations:import', '导入体检记录', '批量导入体检记录', 'medical_examinations', 'import'),
('medical_examinations:export', '导出体检记录', '导出体检记录信息', 'medical_examinations', 'export');