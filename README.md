# WardGuard 科室管理系统

<div align="center">
  <img src="client/public/logo.png" alt="WardGuard Logo" width="200"/>
  
  <h3>现代化的科室综合管理系统</h3>
  
  [![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue.svg)](https://www.typescriptlang.org/)
  [![MySQL](https://img.shields.io/badge/MySQL-5.7+-orange.svg)](https://www.mysql.com/)
  [![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
</div>

## 📋 项目简介

WardGuard 是一个专为医疗科室设计的综合管理系统，提供员工管理、药品物资管理、体检记录管理、权限控制等功能。系统采用现代化的前后端分离架构，具有良好的用户体验和强大的功能扩展性。

## ✨ 主要功能

### 🏥 核心管理模块
- **员工管理** - 员工信息录入、编辑、查询，支持批量导入导出
- **药品管理** - 药品库存管理、过期提醒、自动计算有效期
- **物资管理** - 医疗物资管理、库存监控、过期预警
- **体检记录** - 员工体检数据管理、复查提醒、健康档案

### 🔐 权限与安全
- **用户权限管理** - 基于角色的权限控制（RBAC）
- **操作日志** - 完整的操作记录追踪
- **数据安全** - JWT 认证、密码加密、SQL 注入防护

### 📧 智能提醒
- **邮件提醒系统** - 药品/物资过期自动邮件通知
- **定时任务** - 支持每日、每周、每月定时提醒
- **SMTP 配置** - 灵活的邮件服务器配置

### 📊 数据分析
- **仪表盘** - 数据可视化展示
- **统计报表** - 多维度数据分析
- **导入导出** - Excel 格式数据处理

## 🛠️ 技术栈

### 前端技术
- **React 18** - 现代化前端框架
- **TypeScript** - 类型安全的 JavaScript
- **Ant Design** - 企业级 UI 组件库
- **React Router** - 前端路由管理
- **Axios** - HTTP 请求库

### 后端技术
- **Node.js** - JavaScript 运行时
- **Express.js** - Web 应用框架
- **MySQL** - 关系型数据库
- **JWT** - 身份认证
- **bcrypt** - 密码加密
- **nodemailer** - 邮件发送

### 开发工具
- **nodemon** - 开发环境热重载
- **cross-env** - 跨平台环境变量
- **dotenv** - 环境配置管理

## 🚀 快速开始

### 环境要求

- Node.js 16.x 或更高版本
- MySQL 5.7 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd WardGuard
   ```

2. **安装依赖**
   ```bash
   # 安装后端依赖
   cd express
   npm install
   
   # 安装前端依赖
   cd ../client
   npm install
   ```

3. **数据库配置**
   ```bash
   # 创建数据库
   mysql -u root -p
   CREATE DATABASE wardguard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   
   # 导入数据库结构
   cd express
   mysql -u root -p wardguard < migrations/database_init.sql
   ```

4. **环境配置**
   ```bash
   # 编辑配置文件，修改数据库连接信息
   # DB_HOST=localhost
   # DB_USER=your_username
   # DB_PASSWORD=your_password
   # DB_NAME=your_dbname
   ```

5. **启动服务**
   ```bash
   # 启动后端服务（开发模式）
   cd express
   npm run dev
   
   # 启动前端服务（新终端窗口）
   cd client
   npm start
   ```

6. **访问系统**
   - 前端地址：http://localhost:3001
   - 后端地址：http://localhost:3000
   - 默认管理员账号：admin / admin123

## 📁 项目结构

```
WardGuard/
├── client/                 # 前端项目
│   ├── public/            # 静态资源
│   ├── src/
│   │   ├── components/    # 通用组件
│   │   ├── pages/         # 页面组件
│   │   ├── config/        # 配置文件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── types/         # TypeScript 类型定义
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── tsconfig.json
├── express/               # 后端项目
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── models/           # 数据模型
│   ├── routes/           # 路由定义
│   ├── services/         # 业务服务
│   ├── utils/            # 工具函数
│   ├── migrations/       # 数据库迁移
│   ├── .env.development  # 开发环境配置
│   ├── .env.production   # 生产环境配置
│   └── package.json
└── README.md             # 项目说明文档
```

## 🔧 开发指南

### 开发环境启动

```bash
# 后端开发服务（支持热重载）
cd express
npm run dev

# 前端开发服务
cd client
npm start
```

### 生产环境部署

#### 1. 构建项目

```bash
# 构建前端
cd client
npm run build

# 启动生产环境后端
cd express
npm run prod
```

#### 2. Nginx 配置

##### 安装 Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
# 或者使用 dnf (较新版本)
sudo dnf install nginx
```

##### Nginx 配置文件
创建配置文件 `/etc/nginx/conf.d/wardguard.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /opt/WardGuard/client/build;
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
##### 配置PM2
```bash
# 全局安装 PM2
npm install -g pm2
# 创建 PM2 配置文件 ecosystem.config.js, 并配置日志路径
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'wardguard-backend',
    script: 'index.js',
    cwd: '/opt/WardGuard/express',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/log/pm2/wardguard-error.log',
    out_file: '/opt/log/pm2/wardguard-out.log',
    log_file: '/opt/log/pm2/wardguard.log',
    time: true
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup

### 数据库管理

```bash
# 运行数据库迁移
cd express
node migrations/run_migrations.js

# 数据库健康检查
node migrations/health_check.js

# 导出数据库结构
node migrations/export_db_structure.js
```

## 🔐 权限管理

### 用户角色
- **admin** - 系统管理员，拥有所有权限
- **user** - 普通用户，根据分配的权限访问功能

### 权限模块
- **medicines** - 药品管理权限
- **employees** - 员工管理权限
- **supplies** - 物资管理权限
- **medical_examinations** - 体检记录权限
- **users** - 用户管理权限（仅管理员）

### 权限操作
- **view** - 查看权限
- **create** - 创建权限
- **update** - 编辑权限
- **delete** - 删除权限
- **export** - 导出权限
- **import** - 导入权限

## 📧 邮件配置

### SMTP 设置
1. 进入系统 → 邮件提醒设置
2. 配置 SMTP 服务器信息
3. 设置提醒频率和时间
4. 测试邮件发送功能

### 系统维护
```bash
# 查看系统信息
node migrations/show_info.js

# 数据库诊断
node utils/dbDiagnostic.js

# 验证数据完整性
node migrations/validate_init_script.js
```

## 🐛 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否启动
   - 验证 .env 文件中的数据库配置
   - 确认数据库用户权限

2. **前端无法访问后端**
   - 检查后端服务是否正常启动（端口 3000）
   - 验证 CORS 配置
   - 检查防火墙设置

3. **邮件发送失败**
   - 验证 SMTP 配置信息
   - 检查邮箱服务商的安全设置
   - 确认网络连接正常

4. **权限问题**
   - 检查用户角色设置
   - 验证权限分配
   - 清除浏览器缓存重新登录

<div align="center">
  <p>如果这个项目对您有帮助，请给我们一个 ⭐️</p>
</div>