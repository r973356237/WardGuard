# 服务器部署问题诊断和解决方案

## 问题分析

根据你提供的启动日志，系统在加载环境配置后启动失败。可能的原因包括：

1. **数据库连接问题**
2. **缺少必要的数据库表**
3. **调度器初始化失败**
4. **邮件配置表为空**

## 解决步骤

### 步骤 1: 运行诊断脚本

在服务器上运行诊断脚本来检查具体问题：

```bash
cd /www/wwwroot/WardGuard/express
node diagnose-and-fix.js
```

这个脚本会：
- 测试数据库连接
- 检查必要的表是否存在
- 创建缺少的表
- 插入默认配置

### 步骤 2: 检查数据库连接

确认 `.env.production` 文件中的数据库配置是否正确：

```bash
# 检查配置文件
cat .env.production

# 测试数据库连接
mysql -h117.72.123.17 -ufanjk-ward -pxiaokai123 -P3306 ward
```

### 步骤 3: 使用安全启动模式

如果诊断脚本修复了问题，可以使用更健壮的启动脚本：

```bash
# 使用安全启动脚本
node index-safe.js
```

或者修改 `package.json` 中的启动命令：

```json
{
  "scripts": {
    "prod": "cross-env NODE_ENV=production node index-safe.js"
  }
}
```

### 步骤 4: 检查具体错误

如果问题仍然存在，查看完整的错误日志：

```bash
# 查看详细启动日志
npm run prod 2>&1 | tee startup.log

# 或者使用 PM2 查看日志
pm2 logs wardguard
```

## 常见问题和解决方案

### 1. 数据库连接失败

**错误特征**: `ENOTFOUND`, `ER_ACCESS_DENIED_ERROR`, `ER_BAD_DB_ERROR`

**解决方案**:
```bash
# 检查数据库服务状态
systemctl status mysql

# 检查防火墙设置
ufw status

# 测试网络连接
telnet 117.72.123.17 3306
```

### 2. 缺少数据库表

**错误特征**: `Table 'ward.email_config' doesn't exist`

**解决方案**:
```bash
# 运行数据库迁移
node migrate-email.js

# 或手动创建表
mysql -h117.72.123.17 -ufanjk-ward -pxiaokai123 -P3306 ward < migrations/create_email_tables.sql
```

### 3. 调度器初始化失败

**错误特征**: 在"初始化定时任务调度器"步骤失败

**解决方案**:
- 确保 `email_config` 表存在且有数据
- 使用 `index-safe.js` 启动脚本
- 检查邮件配置是否完整

### 4. 端口被占用

**错误特征**: `EADDRINUSE`

**解决方案**:
```bash
# 查看端口占用
netstat -tlnp | grep :3000

# 杀死占用进程
kill -9 <PID>

# 或使用不同端口
export PORT=3001
npm run prod
```

## 生产环境优化建议

### 1. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'wardguard',
    script: 'index-safe.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 设置日志轮转

```bash
# 创建日志目录
mkdir -p logs

# 配置 logrotate
sudo tee /etc/logrotate.d/wardguard << 'EOF'
/www/wwwroot/WardGuard/express/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## 监控和维护

### 1. 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/health

# 检查 API 状态
curl http://localhost:3000/api/health
```

### 2. 数据库维护

```bash
# 定期备份数据库
mysqldump -h117.72.123.17 -ufanjk-ward -pxiaokai123 ward > backup_$(date +%Y%m%d).sql

# 检查数据库连接
node -e "require('./db').healthCheck().then(console.log)"
```

### 3. 性能监控

```bash
# 查看 PM2 状态
pm2 status
pm2 monit

# 查看系统资源
htop
df -h
free -h
```

## 紧急恢复

如果服务完全无法启动，可以尝试以下步骤：

1. **回滚到最小配置**:
   ```bash
   # 备份当前配置
   cp .env.production .env.production.backup
   
   # 使用最小配置
   cat > .env.production << 'EOF'
   NODE_ENV=production
   DB_HOST=117.72.123.17
   DB_USER=fanjk-ward
   DB_PASSWORD=xiaokai123
   DB_NAME=ward
   DB_PORT=3306
   PORT=3000
   JWT_SECRET=your_jwt_secret_key
   CORS_ORIGIN=*
   EOF
   ```

2. **跳过邮件功能启动**:
   ```bash
   # 临时禁用调度器
   mv services/schedulerService.js services/schedulerService.js.backup
   echo "module.exports = { init: () => Promise.resolve(), stopAllTasks: () => {} };" > services/schedulerService.js
   
   # 启动服务
   npm run prod
   
   # 恢复调度器
   mv services/schedulerService.js.backup services/schedulerService.js
   ```

3. **联系技术支持**:
   如果以上步骤都无法解决问题，请提供：
   - 完整的错误日志
   - 数据库连接测试结果
   - 服务器系统信息 (`uname -a`, `node -v`, `npm -v`)

## 预防措施

1. **定期备份**: 设置自动数据库备份
2. **监控告警**: 配置服务状态监控
3. **版本控制**: 记录每次部署的版本
4. **测试环境**: 在测试环境验证后再部署到生产环境