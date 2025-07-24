# WardGuard 科室管理系统 - 部署指南

## 系统要求

- **操作系统**: Ubuntu 22.04.4 LTS
- **Node.js**: 18.x 或更高版本
- **MySQL**: 8.0 或更高版本
- **内存**: 最少 2GB RAM
- **存储**: 最少 10GB 可用空间

## 快速部署

### 1. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2 (可选，推荐)
sudo npm install -g pm2

# 验证安装
node --version
npm --version
```

### 2. 数据库配置

确保 MySQL 服务正在运行，并创建数据库：

```sql
CREATE DATABASE wardguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wardguard_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON wardguard.* TO 'wardguard_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 项目部署

```bash
# 上传项目文件到服务器
# 假设项目位于 /www/wwwroot/wardguard

cd /www/wwwroot/wardguard

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 4. 配置环境变量

编辑 `express/.env.production` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_USER=wardguard_user
DB_PASSWORD=your_secure_password
DB_NAME=wardguard
DB_PORT=3306

# JWT 密钥 (请使用强密码)
JWT_SECRET=your_very_secure_jwt_secret_key_here

# 服务器配置
PORT=3000
NODE_ENV=production

# CORS 配置 (根据实际域名修改)
CORS_ORIGIN=https://yourdomain.com

# 日志级别
LOG_LEVEL=error
```

### 5. 启动应用

#### 方式一：使用 PM2 (推荐)

```bash
# 启动应用
pm2 start ecosystem.config.json

# 查看状态
pm2 status

# 查看日志
pm2 logs wardguard

# 重启应用
pm2 restart wardguard

# 停止应用
pm2 stop wardguard
```

#### 方式二：使用脚本

```bash
# 启动
cd express
./start.sh

# 停止
./stop.sh

# 查看日志
tail -f ../logs/app.log
```

## 验证部署

### 1. 健康检查

```bash
curl http://localhost:3000/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### 2. 访问应用

- **前端界面**: http://your-server-ip:3000
- **API 接口**: http://your-server-ip:3000/api
- **健康检查**: http://your-server-ip:3000/health

## 常见问题

### 1. 数据库连接失败

检查数据库配置和网络连接：

```bash
# 测试数据库连接
mysql -h localhost -u wardguard_user -p wardguard
```

### 2. 端口被占用

```bash
# 查看端口占用
sudo netstat -tlnp | grep :3000

# 杀死占用进程
sudo kill -9 <PID>
```

### 3. 权限问题

```bash
# 设置正确的文件权限
sudo chown -R www-data:www-data /www/wwwroot/wardguard
sudo chmod -R 755 /www/wwwroot/wardguard
```

### 4. 内存不足

```bash
# 查看内存使用
free -h

# 如果需要，创建交换文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 维护操作

### 更新应用

```bash
# 停止应用
pm2 stop wardguard

# 备份数据库
mysqldump -u wardguard_user -p wardguard > backup_$(date +%Y%m%d_%H%M%S).sql

# 更新代码
git pull origin main

# 重新构建
cd client && npm run build

# 重启应用
pm2 restart wardguard
```

### 日志管理

```bash
# 查看 PM2 日志
pm2 logs wardguard

# 清理日志
pm2 flush

# 轮转日志
pm2 install pm2-logrotate
```

### 监控

```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 show wardguard
```

## 安全建议

1. **定期更新系统和依赖包**
2. **使用强密码和密钥**
3. **配置防火墙规则**
4. **启用 HTTPS (使用 Nginx 反向代理)**
5. **定期备份数据库**
6. **监控系统资源使用情况**

## 技术支持

如遇到问题，请检查：

1. 系统日志: `/var/log/syslog`
2. 应用日志: `./logs/app.log`
3. PM2 日志: `pm2 logs`
4. 数据库日志: `/var/log/mysql/error.log`