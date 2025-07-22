-- 创建操作记录表
CREATE TABLE IF NOT EXISTS operation_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '操作用户ID',
  operation_type VARCHAR(50) NOT NULL COMMENT '操作类型：add-添加，update-更新，delete-删除',
  operation_details TEXT COMMENT '操作详情，JSON格式存储',
  operation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  target_type VARCHAR(50) NOT NULL COMMENT '操作对象类型：user, employee, medicine, supply, medical_examination',
  target_id INT COMMENT '操作对象ID',
  target_name VARCHAR(255) COMMENT '操作对象名称',
  INDEX idx_user_id (user_id),
  INDEX idx_operation_time (operation_time),
  INDEX idx_target_type (target_type),
  INDEX idx_target_id (target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户操作记录表';