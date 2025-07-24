-- 修正员工表结构的迁移脚本
-- 将字段名从 employee_id, department 修改为 employee_number, gender, workshop 等

-- 备份现有数据
CREATE TABLE IF NOT EXISTS employees_backup AS SELECT * FROM employees;

-- 删除现有表
DROP TABLE IF EXISTS employees;

-- 创建新的员工表结构
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '员工姓名',
  employee_number VARCHAR(50) UNIQUE COMMENT '员工编号',
  gender ENUM('男', '女') COMMENT '性别',
  workshop VARCHAR(100) COMMENT '车间',
  position VARCHAR(100) COMMENT '职位',
  birth_date DATE COMMENT '出生日期',
  hire_date DATE COMMENT '入职日期',
  work_start_date DATE COMMENT '开始工作日期',
  original_company VARCHAR(200) COMMENT '原工作单位',
  total_exposure_time DECIMAL(5,1) DEFAULT 0 COMMENT '总接害时间（年）',
  pre_hire_exposure_time DECIMAL(5,1) DEFAULT 0 COMMENT '入职前接害时间（年）',
  id_number VARCHAR(18) COMMENT '身份证号',
  phone VARCHAR(20) COMMENT '电话',
  email VARCHAR(100) COMMENT '邮箱',
  status VARCHAR(20) DEFAULT '在职' COMMENT '员工状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工表';

-- 创建索引
CREATE INDEX idx_employees_employee_number ON employees(employee_number);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_workshop ON employees(workshop);

-- 从备份表恢复数据（如果有的话）
-- 注意：由于字段结构变化较大，这里只恢复基本字段
INSERT INTO employees (name, employee_number, position, hire_date, phone, email, status, created_at, updated_at)
SELECT 
  name, 
  employee_id as employee_number, 
  position, 
  hire_date, 
  phone, 
  email, 
  CASE 
    WHEN status = 'active' THEN '在职'
    WHEN status = 'inactive' THEN '离职'
    WHEN status = 'resigned' THEN '离职'
    ELSE '在职'
  END as status,
  created_at, 
  updated_at
FROM employees_backup
WHERE employee_id IS NOT NULL;

-- 清理备份表（可选，如果确认迁移成功可以执行）
-- DROP TABLE employees_backup;