-- 创建任务锁表，用于防止PM2集群模式下的重复任务执行
CREATE TABLE IF NOT EXISTS task_locks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_name VARCHAR(100) NOT NULL UNIQUE COMMENT '任务名称',
  locked_by VARCHAR(255) NOT NULL COMMENT '锁定者标识（进程ID+实例ID）',
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '锁定时间',
  expires_at TIMESTAMP NOT NULL COMMENT '锁过期时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_task_name (task_name),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务锁表，防止集群模式下重复执行任务'