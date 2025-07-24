# 服务器部署问题解决指南

## 问题描述
项目在本地开发环境运行正常，但部署到服务器后启动失败，出现应用崩溃的情况。

## 快速解决方案

### 1. 立即执行快速修复
```bash
# 运行快速修复脚本
node quick-fix.js

# 检查启动前环境
node check-startup.js

# 尝试简化启动
npm run start:simple
```

### 2. 如果简化启动成功
```bash
# 访问健康检查
curl http://localhost:3000/health

# 尝试完整启动
npm run start:server
```

## 详细分析

### 环境差异问题
1. **配置文件差异**: 本地使用 `.env.development`，服务器应使用 `.env.production`
2. **平台差异**: 本地可能是Windows，服务器通常是Linux
3. **依赖版本**: 服务器上的Node.js或npm包版本可能不同

### 常见失败原因

#### 1. 环境变量配置问题
- 数据库连接信息不正确
- JWT密钥未设置
- 端口配置冲突

#### 2. 数据库连接问题
- 数据库服务未启动
- 连接权限不足
- 网络连接问题

#### 3. 文件权限问题
- 配置文件读取权限
- 日志文件写入权限
- 临时文件创建权限

#### 4. 依赖模块问题
- 某些模块在服务器环境下不兼容
- 缺少系统级依赖

## 解决步骤

### 步骤1: 环境检查
```bash
# 检查Node.js版本
node --version

# 检查npm版本
npm --version

# 检查当前目录
pwd
ls -la
```

### 步骤2: 依赖安装
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 或使用yarn
rm -rf node_modules yarn.lock
yarn install
```

### 步骤3: 配置文件设置
```bash
# 复制并编辑服务器配置
cp .env.development .env.server

# 编辑配置文件
nano .env.server
```

**重要配置项**:
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=wardguard
JWT_SECRET=your_secure_jwt_secret
```

### 步骤4: 渐进式启动

#### 4.1 最简启动测试
```bash
node index-simple.js
```

#### 4.2 健壮启动测试
```bash
node index-server.js
```

#### 4.3 原始启动测试
```bash
npm run dev
```

### 步骤5: 问题诊断

#### 检查端口占用
```bash
# Linux/Mac
netstat -tulpn | grep :3000
lsof -i :3000

# 或使用ss命令
ss -tulpn | grep :3000
```

#### 检查进程
```bash
ps aux | grep node
```

#### 检查日志
```bash
# 查看系统日志
tail -f /var/log/syslog

# 查看应用日志
tail -f logs/app.log
```

## 生产环境优化

### 1. 使用PM2管理进程
```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'wardguard',
    script: 'index-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. 设置反向代理（Nginx）
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
# 创建logrotate配置
sudo cat > /etc/logrotate.d/wardguard << EOF
/path/to/your/app/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload wardguard
    endscript
}
EOF
```

## 监控和维护

### 1. 健康检查
```bash
# 创建健康检查脚本
cat > health-check.sh << EOF
#!/bin/bash
response=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ \$response -eq 200 ]; then
    echo "✅ 服务正常"
else
    echo "❌ 服务异常，状态码: \$response"
    pm2 restart wardguard
fi
EOF

chmod +x health-check.sh

# 添加到crontab
echo "*/5 * * * * /path/to/health-check.sh" | crontab -
```

### 2. 性能监控
```bash
# 使用PM2监控
pm2 monit

# 查看详细信息
pm2 info wardguard
pm2 logs wardguard
```

## 故障排除清单

### ✅ 启动前检查
- [ ] Node.js版本兼容 (建议v14+)
- [ ] 所有依赖已安装
- [ ] 配置文件存在且正确
- [ ] 端口未被占用
- [ ] 数据库服务运行正常
- [ ] 文件权限正确

### ✅ 运行时检查
- [ ] 进程正常运行
- [ ] 内存使用正常
- [ ] 日志无错误
- [ ] API响应正常
- [ ] 数据库连接正常

### ✅ 网络检查
- [ ] 端口可访问
- [ ] 防火墙配置正确
- [ ] 域名解析正常
- [ ] SSL证书有效（如果使用HTTPS）

## 紧急恢复

如果所有方法都失败，使用最小化启动：

```javascript
// emergency-start.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ status: 'emergency mode', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Emergency server running on port ${PORT}`);
});
```

```bash
node emergency-start.js
```

## 联系支持

如果问题仍然存在，请提供以下信息：
1. 服务器操作系统和版本
2. Node.js版本
3. 完整的错误日志
4. 配置文件内容（隐藏敏感信息）
5. 网络环境信息

---

**记住**: 生产环境部署需要谨慎，建议先在测试环境验证所有配置。