-- 药品表结构迁移脚本
-- 将现有的药品表结构迁移到新的结构

-- 1. 备份现有数据（如果表存在）
CREATE TABLE IF NOT EXISTS medicines_backup AS SELECT * FROM medicines;

-- 2. 删除现有的药品表
DROP TABLE IF EXISTS medicines;

-- 3. 创建新的药品表结构
CREATE TABLE medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_name VARCHAR(200) NOT NULL COMMENT '药品名称',
  storage_location VARCHAR(100) NOT NULL COMMENT '存储位置',
  production_date DATE NOT NULL COMMENT '生产日期',
  validity_period_days INT NOT NULL COMMENT '有效期天数',
  quantity INT NOT NULL DEFAULT 0 COMMENT '数量',
  expiration_date DATE NOT NULL COMMENT '过期日期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='药品表';

-- 4. 创建索引
CREATE INDEX idx_medicines_medicine_name ON medicines(medicine_name);
CREATE INDEX idx_medicines_expiration ON medicines(expiration_date);

-- 5. 如果需要从备份表恢复数据，可以使用以下语句（根据实际情况调整字段映射）
-- INSERT INTO medicines (medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date)
-- SELECT 
--   name as medicine_name,
--   '默认位置' as storage_location,
--   CURDATE() as production_date,
--   365 as validity_period_days,
--   current_stock as quantity,
--   IFNULL(expiry_date, DATE_ADD(CURDATE(), INTERVAL 365 DAY)) as expiration_date
-- FROM medicines_backup;

-- 6. 清理备份表（可选，建议保留一段时间）
-- DROP TABLE medicines_backup;

COMMIT;