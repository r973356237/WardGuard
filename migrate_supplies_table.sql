-- 物资表结构迁移脚本
-- 将现有的物资表结构迁移到新的结构

-- 1. 备份现有数据（如果表存在）
CREATE TABLE IF NOT EXISTS supplies_backup AS SELECT * FROM supplies;

-- 2. 删除现有的物资表
DROP TABLE IF EXISTS supplies;

-- 3. 创建新的物资表结构
CREATE TABLE supplies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supply_name VARCHAR(200) NOT NULL COMMENT '物资名称',
  storage_location VARCHAR(100) NOT NULL COMMENT '存储位置',
  production_date DATE NOT NULL COMMENT '生产日期',
  validity_period_days INT NOT NULL COMMENT '有效期天数',
  supply_number INT NOT NULL DEFAULT 0 COMMENT '编号',
  expiration_date DATE NOT NULL COMMENT '过期日期',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物资表';

-- 4. 创建索引
CREATE INDEX idx_supplies_supply_name ON supplies(supply_name);
CREATE INDEX idx_supplies_expiration ON supplies(expiration_date);

-- 5. 如果需要从备份表恢复数据，可以使用以下语句（根据实际情况调整字段映射）
-- INSERT INTO supplies (supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date)
-- SELECT 
--   name as supply_name,
--   storage_location,
--   CURDATE() as production_date,
--   365 as validity_period_days,
--   1 as supply_number,
--   DATE_ADD(CURDATE(), INTERVAL 365 DAY) as expiration_date
-- FROM supplies_backup;

-- 6. 清理备份表（可选，建议保留一段时间）
-- DROP TABLE supplies_backup;

COMMIT;