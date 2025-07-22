-- 创建邮件配置表（不包含SMTP配置，SMTP配置在smtp_config表中）
CREATE TABLE IF NOT EXISTS email_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL COMMENT '收件人邮箱',
  reminder_frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily' COMMENT '提醒频率',
  reminder_time TIME DEFAULT '09:00:00' COMMENT '提醒时间',
  email_subject VARCHAR(255) DEFAULT '【系统提醒】物资/药品过期通知' COMMENT '邮件主题',
  email_template TEXT COMMENT '邮件模板',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮件提醒配置表（不包含SMTP配置，SMTP配置在smtp_config表中）';

-- 创建邮件发送日志表
CREATE TABLE IF NOT EXISTS email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL COMMENT '收件人',
  subject VARCHAR(255) NOT NULL COMMENT '邮件主题',
  content TEXT COMMENT '邮件内容',
  status ENUM('success', 'failed') NOT NULL COMMENT '发送状态',
  error_message TEXT COMMENT '错误信息',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邮件发送日志表';

-- 创建定时任务记录表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_name VARCHAR(100) NOT NULL COMMENT '任务名称',
  task_type VARCHAR(50) NOT NULL COMMENT '任务类型',
  last_run_time TIMESTAMP NULL COMMENT '上次运行时间',
  next_run_time TIMESTAMP NULL COMMENT '下次运行时间',
  status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '任务状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='定时任务记录表';

-- 插入默认的邮件提醒任务记录
INSERT INTO scheduled_tasks (task_name, task_type, status) 
VALUES ('email_reminder', 'email', 'active')
ON DUPLICATE KEY UPDATE task_name = task_name;