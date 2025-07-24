#!/bin/bash

# WardGuard 应用停止脚本

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

# 停止 PM2 管理的应用
stop_pm2() {
    if command -v pm2 &> /dev/null; then
        log_info "检查 PM2 管理的应用..."
        
        if pm2 list | grep -q "wardguard"; then
            log_info "停止 PM2 管理的 WardGuard 应用..."
            pm2 stop wardguard
            pm2 delete wardguard
            log_success "PM2 应用已停止并删除"
            return 0
        else
            log_warning "未找到 PM2 管理的 WardGuard 应用"
        fi
    else
        log_info "PM2 未安装，跳过 PM2 检查"
    fi
    return 1
}

# 停止 PID 文件记录的进程
stop_pid_file() {
    if [ -f "logs/app.pid" ]; then
        PID=$(cat logs/app.pid)
        log_info "从 PID 文件读取到进程 ID: $PID"
        
        if kill -0 $PID 2>/dev/null; then
            log_info "停止进程 $PID..."
            kill $PID
            
            # 等待进程结束
            for i in {1..10}; do
                if ! kill -0 $PID 2>/dev/null; then
                    break
                fi
                sleep 1
            done
            
            # 如果进程仍在运行，强制杀死
            if kill -0 $PID 2>/dev/null; then
                log_warning "进程未正常结束，强制杀死..."
                kill -9 $PID
            fi
            
            rm -f logs/app.pid
            log_success "应用进程已停止"
            return 0
        else
            log_warning "PID 文件中的进程不存在，清理 PID 文件"
            rm -f logs/app.pid
        fi
    else
        log_info "未找到 PID 文件"
    fi
    return 1
}

# 通过端口查找并停止进程
stop_by_port() {
    PORT=${1:-3000}
    log_info "查找占用端口 $PORT 的进程..."
    
    # 查找占用端口的进程
    PIDS=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 | grep -v '-' | sort -u)
    
    if [ ! -z "$PIDS" ]; then
        for PID in $PIDS; do
            if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
                # 检查进程是否是 Node.js 进程
                PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "")
                if [[ "$PROCESS_NAME" == *"node"* ]]; then
                    log_info "停止 Node.js 进程 $PID (占用端口 $PORT)..."
                    kill $PID
                    
                    # 等待进程结束
                    for i in {1..5}; do
                        if ! kill -0 $PID 2>/dev/null; then
                            break
                        fi
                        sleep 1
                    done
                    
                    # 如果进程仍在运行，强制杀死
                    if kill -0 $PID 2>/dev/null; then
                        log_warning "强制杀死进程 $PID..."
                        kill -9 $PID
                    fi
                    
                    log_success "进程 $PID 已停止"
                    return 0
                fi
            fi
        done
    else
        log_info "端口 $PORT 未被占用"
    fi
    return 1
}

# 查找并停止所有相关的 Node.js 进程
stop_all_node_processes() {
    log_info "查找所有相关的 WardGuard Node.js 进程..."
    
    # 查找包含 wardguard 或 index.js 的 Node.js 进程
    PIDS=$(ps aux | grep -E "(wardguard|express.*index\.js)" | grep -v grep | awk '{print $2}')
    
    if [ ! -z "$PIDS" ]; then
        log_info "找到相关进程: $PIDS"
        for PID in $PIDS; do
            if kill -0 $PID 2>/dev/null; then
                log_info "停止进程 $PID..."
                kill $PID
                sleep 1
                
                # 如果进程仍在运行，强制杀死
                if kill -0 $PID 2>/dev/null; then
                    kill -9 $PID
                fi
            fi
        done
        log_success "所有相关进程已停止"
        return 0
    else
        log_info "未找到相关的 Node.js 进程"
    fi
    return 1
}

# 清理临时文件
cleanup() {
    log_info "清理临时文件..."
    
    # 清理 PID 文件
    rm -f logs/app.pid
    rm -f express/logs/app.pid
    
    # 清理临时日志文件（保留最近的日志）
    if [ -d "logs" ]; then
        find logs -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
    fi
    
    log_success "临时文件清理完成"
}

# 主函数
main() {
    echo "========================================"
    echo "    WardGuard 应用停止脚本"
    echo "========================================"
    echo ""
    
    log_info "开始停止 WardGuard 应用..."
    
    STOPPED=false
    
    # 尝试不同的停止方法
    if stop_pm2; then
        STOPPED=true
    elif stop_pid_file; then
        STOPPED=true
    elif stop_by_port 3000; then
        STOPPED=true
    elif stop_all_node_processes; then
        STOPPED=true
    fi
    
    if [ "$STOPPED" = true ]; then
        log_success "WardGuard 应用已成功停止"
    else
        log_warning "未找到运行中的 WardGuard 应用"
    fi
    
    # 清理临时文件
    cleanup
    
    # 验证停止结果
    log_info "验证停止结果..."
    sleep 2
    
    if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
        log_warning "端口 3000 仍被占用，可能有其他进程在使用"
    else
        log_success "端口 3000 已释放"
    fi
    
    echo ""
    echo "========================================"
    log_success "停止操作完成！"
    echo "========================================"
    echo ""
    echo "💡 提示:"
    echo "  重新启动: ./start.sh"
    echo "  查看日志: tail -f logs/app.log"
    echo "  检查端口: netstat -tlnp | grep :3000"
    echo ""
}

# 执行主函数
main "$@"