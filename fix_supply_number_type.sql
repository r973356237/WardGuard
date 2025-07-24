-- 修正物资表supply_number字段类型
-- 将supply_number从INT改为VARCHAR

ALTER TABLE supplies MODIFY COLUMN supply_number VARCHAR(50) NOT NULL COMMENT '编号';