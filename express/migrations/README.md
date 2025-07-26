# 数据库迁移工具使用指南

## 概述

本目录包含了科室管理系统的数据库迁移脚本和管理工具，确保数据库结构的版本控制和一致性。

## 文件说明

### 核心文件

- `migration_manager.js` - 数据库迁移管理器核心类
- `run_migrations.js` - 迁移执行脚本
- `health_check.js` - 数据库健康检查工具
- `show_info.js` - 数据库信息查看工具
- `fix_permissions.js` - 权限修复工具
- `validate_init_script.js` - 数据库初始化脚本验证工具
- `export_db_structure.js` - 数据库结构导出工具

### 迁移脚本（按执行顺序）
1. `create_permissions_tables.sql` - 创建权限表和用户权限关联表
2. `add_name_to_users.sql` - 为用户表添加姓名字段
3. `add_status_to_users.sql` - 为用户表添加状态字段
4. `create_smtp_config_table.sql` - 创建SMTP配置表
5. `create_email_tables.sql` - 创建邮件配置和日志表
6. `create_operation_records_table.sql` - 创建操作记录表
7. `add_weekly_monthly_day_fields_fixed.sql` - 为邮件配置表添加周期字段
8. `remove_smtp_fields_from_email_config_fixed.sql` - 从邮件配置表移除SMTP字段
9. `init_default_data.sql` - 初始化默认数据

### 废弃文件（保留用于参考）
- `add_weekly_monthly_day_fields.sql` - 原版本（使用存储过程）
- `remove_smtp_fields_from_email_config.sql` - 原版本（使用存储过程）

## 使用方法

### 1. 执行所有迁移

```bash
# 在 express 目录下执行
cd c:\VibeCoding\WardGuard\express\migrations
node run_migrations.js run
```

这将按顺序执行所有迁移脚本，包括：
- 创建所有必要的表结构
- 添加基础权限数据
- 创建默认管理员用户（用户名：admin，密码：password）
- 初始化邮件配置

### 2. 检查数据库状态

```bash
node run_migrations.js status
```

显示关键表的存在状态。

### 3. 数据库健康检查

```bash
node health_check.js
```

执行完整的数据库健康检查，包括：
- 数据库连接测试
- 表结构完整性检查
- 权限系统检查
- 用户数据验证
- 邮件配置检查
- 迁移历史验证
- 数据完整性检查

### 4. 查看数据库信息

```bash
node show_info.js
```

### 5. 权限管理

```bash
# 修复所有管理员权限
node fix_permissions.js fix-admin

# 为指定用户分配权限
node fix_permissions.js assign <username> <permission1> <permission2> ...
```

### 6. 验证数据库初始化脚本

```bash
node validate_init_script.js
```

### 7. 导出数据库结构

```bash
node export_db_structure.js
```

## 默认数据

### 管理员用户
- **用户名**: `admin`
- **密码**: `password`
- **角色**: `admin`
- **状态**: `active`

> ⚠️ **安全提醒**: 首次登录后请立即修改默认密码！

### 权限系统
系统会自动创建以下模块的权限：
- 用户管理 (users)
- 员工管理 (employees)
- 药品管理 (medicines)
- 物资管理 (supplies)
- 体检管理 (medical_examinations)

每个模块包含：view、add、edit、delete、import、export 权限

## 环境要求

- **数据库**: MySQL 5.7.43+
- **Node.js**: 14.0+
- **环境变量**: 确保 `.env.development` 或 `.env.production` 配置正确

## 故障排除

### 常见问题

1. **连接失败**
   - 检查数据库服务是否运行
   - 验证环境变量配置
   - 确认网络连接

2. **权限错误**
   - 确保数据库用户有足够权限
   - 检查 CREATE、ALTER、INSERT 权限

3. **表已存在**
   - 迁移脚本使用 `IF NOT EXISTS`，重复执行是安全的
   - 检查迁移记录表确认执行状态

4. **外键约束错误**
   - 确保按正确顺序执行迁移
   - 检查依赖表是否存在

### 重置数据库

如果需要完全重置数据库：

```sql
-- 谨慎操作！这将删除所有数据
DROP DATABASE IF EXISTS ward;
CREATE DATABASE ward CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ward;

-- 然后重新执行迁移
```

## 开发指南

### 添加新迁移

1. 创建新的 SQL 文件，命名格式：`功能描述.sql`
2. 在 `run_migrations.js` 中添加迁移配置
3. 使用 `IF NOT EXISTS` 或条件检查确保幂等性
4. 测试迁移脚本

### 最佳实践

- 所有迁移必须是幂等的（可重复执行）
- 使用事务确保原子性
- 添加适当的注释和文档
- 在生产环境前充分测试

## 监控和维护

定期执行健康检查：
```bash
# 建议每周执行一次
node health_check.js
```

检查迁移历史：
```bash
node run_migrations.js status
```

## 技术细节

### 迁移记录表结构
```sql
CREATE TABLE migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_migration_name (migration_name)
);
```

### MySQL 5.7 兼容性
- 避免使用存储过程
- 使用条件 ALTER TABLE 语句
- 兼容旧版本的语法特性