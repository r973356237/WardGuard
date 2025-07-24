#!/bin/bash

# WardGuard 数据库备份脚本
# 在部署前备份现有数据

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ $# -lt 3 ]; then
    echo "用法: $0 <数据库主机> <用户名> <数据库名> [备份目录]"
    echo "示例: $0 localhost root wardguard /backup"
    exit 1
fi

DB_HOST=$1
DB_USER=$2
DB_NAME=$3
BACKUP_DIR=${4:-./backups}

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/wardguard_backup_$TIMESTAMP.sql"

log_info "开始备份数据库..."
log_info "数据库: $DB_NAME"
log_info "备份文件: $BACKUP_FILE"

# 执行备份
if mysqldump -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" > "$BACKUP_FILE"; then
    log_success "数据库备份完成: $BACKUP_FILE"
    
    # 显示备份文件大小
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "备份文件大小: $BACKUP_SIZE"
    
    # 压缩备份文件
    log_info "压缩备份文件..."
    if gzip "$BACKUP_FILE"; then
        COMPRESSED_FILE="$BACKUP_FILE.gz"
        COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        log_success "备份文件已压缩: $COMPRESSED_FILE"
        log_info "压缩后大小: $COMPRESSED_SIZE"
    fi
else
    log_error "数据库备份失败"
    exit 1
fi

echo ""
echo "========================================"
log_success "备份操作完成！"
echo "========================================"
echo ""
echo "📁 备份文件位置: $BACKUP_DIR"
echo "🔄 恢复命令: mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < $BACKUP_FILE"
echo ""