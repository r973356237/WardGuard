#!/bin/bash

# WardGuard 生产环境启动脚本
# 用于在 Ubuntu 22.04.4 LTS + 宝塔面板环境下启动应用

# 设置错误时退出
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在正确的目录
check_directory() {
    if [ ! -f "express/package.json" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    log_success "目录检查通过"
}

# 检查 Node.js 版本
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        log_error "Node.js 版本过低，需要 16.x 或更高版本"
        exit 1
    fi
    
    log_success "Node.js 版本检查通过: $(node --version)"
}

# 检查环境配置
check_environment() {
    cd express
    
    if [ ! -f ".env.production" ]; then
        log_error "缺少 .env.production 配置文件"
        exit 1
    fi
    
    # 检查必要的环境变量
    source .env.production
    
    if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
        log_error "数据库配置不完整"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "default_jwt_secret" ]; then
        log_error "JWT_SECRET 未设置或使用默认值"
        exit 1
    fi
    
    log_success "环境配置检查通过"
    cd ..
}

# 测试数据库连接
test_database() {
    log_info "测试数据库连接..."
    
    cd express
    node -e "
    const mysql = require('mysql2/promise');
    require('dotenv').config({ path: '.env.production' });
    
    async function testConnection() {
      try {
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          port: parseInt(process.env.DB_PORT) || 3306
        });
        await connection.ping();
        await connection.end();
        console.log('数据库连接测试成功');
      } catch (error) {
        console.error('数据库连接测试失败:', error.message);
        process.exit(1);
      }
    }
    
    testConnection();
    "
    
    log_success "数据库连接测试通过"
    cd ..
}

# 检查端口是否被占用
check_port() {
    PORT=${1:-3000}
    
    if netstat -tlnp 2>/dev/null | grep -q ":$PORT "; then
        log_warning "端口 $PORT 已被占用"
        
        # 尝试找到占用端口的进程
        PID=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 | head -1)
        if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
            log_warning "占用端口的进程 PID: $PID"
            
            # 询问是否杀死进程
            read -p "是否杀死占用端口的进程? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                kill -9 $PID 2>/dev/null || true
                log_success "已杀死进程 $PID"
                sleep 2
            else
                log_error "端口被占用，无法启动应用"
                exit 1
            fi
        fi
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    mkdir -p logs
    mkdir -p express/logs
    
    log_success "目录创建完成"
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."
    
    # 设置配置文件权限
    chmod 600 express/.env.production
    
    # 设置执行权限
    chmod +x express/index.js
    
    # 设置日志目录权限
    chmod 755 logs
    chmod 755 express/logs
    
    log_success "文件权限设置完成"
}

# 启动应用
start_application() {
    log_info "启动 WardGuard 应用..."
    
    cd express
    
    # 设置环境变量
    export NODE_ENV=production
    export PORT=${PORT:-3000}
    
    # 启动应用
    if command -v pm2 &> /dev/null; then
        log_info "使用 PM2 启动应用..."
        pm2 start ../ecosystem.config.json
        log_success "应用已通过 PM2 启动"
        
        # 显示状态
        pm2 status
        
        log_info "查看日志: pm2 logs wardguard"
        log_info "重启应用: pm2 restart wardguard"
        log_info "停止应用: pm2 stop wardguard"
    else
        log_info "使用 nohup 启动应用..."
        nohup node index.js > ../logs/app.log 2>&1 &
        APP_PID=$!
        echo $APP_PID > ../logs/app.pid
        
        log_success "应用已启动，PID: $APP_PID"
        log_info "查看日志: tail -f logs/app.log"
        log_info "停止应用: kill $APP_PID"
    fi
    
    cd ..
}

# 验证启动
verify_startup() {
    log_info "验证应用启动..."
    
    # 等待应用启动
    sleep 5
    
    PORT=${PORT:-3000}
    
    # 检查健康状态
    if curl -s "http://localhost:$PORT/health" > /dev/null; then
        log_success "应用启动成功！"
        log_success "访问地址: http://localhost:$PORT"
        log_success "健康检查: http://localhost:$PORT/health"
        log_success "API 接口: http://localhost:$PORT/api"
    else
        log_error "应用启动失败，请检查日志"
        
        if [ -f "logs/app.log" ]; then
            log_info "最近的日志:"
            tail -20 logs/app.log
        fi
        
        exit 1
    fi
}

# 主函数
main() {
    echo "========================================"
    echo "    WardGuard 科室管理系统启动脚本"
    echo "========================================"
    echo ""
    
    log_info "开始启动流程..."
    
    # 执行检查和启动步骤
    check_directory
    check_nodejs
    check_environment
    test_database
    check_port 3000
    create_directories
    set_permissions
    start_application
    verify_startup
    
    echo ""
    echo "========================================"
    log_success "WardGuard 应用启动完成！"
    echo "========================================"
    echo ""
    echo "📋 管理命令:"
    if command -v pm2 &> /dev/null; then
        echo "  查看状态: pm2 status"
        echo "  查看日志: pm2 logs wardguard"
        echo "  重启应用: pm2 restart wardguard"
        echo "  停止应用: pm2 stop wardguard"
        echo "  删除应用: pm2 delete wardguard"
    else
        echo "  查看日志: tail -f logs/app.log"
        echo "  停止应用: kill \$(cat logs/app.pid)"
    fi
    echo ""
    echo "🌐 访问地址:"
    echo "  前端界面: http://localhost:3000"
    echo "  API 接口: http://localhost:3000/api"
    echo "  健康检查: http://localhost:3000/health"
    echo ""
}

# 执行主函数
main "$@"