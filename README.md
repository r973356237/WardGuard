# WardGuard 科室管理系统

## 项目概述
WardGuard 是一个现代化的科室管理系统，专为医疗机构设计，提供全面的科室运营管理解决方案。系统采用前后端分离架构，前端使用 React + TypeScript + Ant Design，后端使用 Node.js + Express + MySQL，具有良好的可扩展性和维护性。

## 功能特性
- 🏠 **主页仪表盘** - 数据概览、过期提醒、快速统计
- 👥 **员工信息管理** - 员工档案、信息维护、权限管理
- 🏥 **体检信息管理** - 体检记录、健康档案、到期提醒
- 📦 **物资信息管理** - 库存管理、过期监控、采购提醒
- 💊 **药品信息管理** - 药品库存、有效期管理、用药记录
- 📅 **倒班日历系统** - 排班管理、班次查看、日程安排
- 👤 **用户认证与授权** - 安全登录、权限控制、会话管理
- 🔧 **系统设置管理** - 系统配置、参数设置、环境切换
- 📊 **数据可视化** - 图表展示、趋势分析、统计报表
- 🔔 **智能提醒** - 过期预警、到期通知、异常提醒

## 项目结构
```
WardGuard/
├── README.md                    # 项目说明文档
├── 部署指南.md                  # 详细部署文档
├── client/                      # 前端项目
│   ├── build/                   # 前端构建产物
│   ├── public/                  # 静态资源
│   ├── src/                     # 前端源码
│   │   ├── components/          # 公共组件
│   │   │   ├── Sidebar/         # 侧边栏组件
│   │   │   └── ShiftCalendar/   # 倒班日历组件
│   │   ├── config/              # 配置文件
│   │   │   └── api.ts           # API 配置
│   │   ├── pages/               # 页面组件
│   │   │   ├── Login/           # 登录页面
│   │   │   ├── Register/        # 注册页面
│   │   │   ├── Dashboard.tsx    # 主页仪表盘
│   │   │   ├── Employees/       # 员工管理
│   │   │   ├── Medicines/       # 药品管理
│   │   │   ├── Supplies/        # 物资管理
│   │   │   └── MedicalExams/    # 体检管理
│   │   └── App.tsx              # 主应用组件
│   └── package.json             # 前端依赖配置
├── express/                     # 后端项目
│   ├── .env                     # 环境配置文件
│   ├── .env.development         # 开发环境配置
│   ├── .env.production          # 生产环境配置
│   ├── config.js                # 配置管理模块
│   ├── controllers/             # 控制器层
│   ├── routes/                  # 路由层
│   ├── middleware/              # 中间件
│   ├── index.js                 # 应用入口
│   └── package.json             # 后端依赖配置
├── start-production.bat         # Windows生产环境启动脚本
├── start-production.sh          # Linux生产环境启动脚本
└── 数据文件/                    # 示例数据文件
    ├── 员工信息.csv
    ├── 员工对应体检信息.csv
    ├── 物资信息.csv
    └── 药品信息.csv
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- MySQL >= 5.7

### 开发环境部署

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

3. **配置数据库**
   - 创建 MySQL 数据库
   - 修改 `express/.env.development` 文件中的数据库配置：
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=wardguard
   ```

4. **启动开发环境**
```bash
# 启动后端（开发模式，支持热重载）
cd express
npm run dev

# 启动前端（新终端窗口）
cd client
npm start
```

5. **访问应用**
   - 前端地址：http://localhost:3001
   - 后端地址：http://localhost:3000
   - API 文档：http://localhost:3000/api

### 生产环境部署

详细的生产环境部署指南请参考 [部署指南.md](./部署指南.md)

#### 快速部署命令
```bash
# 1. 构建前端
cd client
npm run build

# 2. 启动生产环境后端
cd ../express
npm run prod

# 或使用启动脚本
# Windows: start-production.bat
# Linux: ./start-production.sh
```

## 环境配置

### 开发环境
- 自动重载
- 详细日志输出
- 允许所有域名跨域
- 前端由开发服务器托管

### 生产环境
- 性能优化
- 错误日志输出
- 限制跨域域名
- 前端静态文件由后端托管

## API 接口

### 系统接口
```
GET /api/health          # 健康检查
GET /api                 # 基础信息
GET /api/system-name     # 获取系统名称
POST /api/system-name    # 设置系统名称
```

### 用户管理
```
POST /api/users/login    # 用户登录
POST /api/users/register # 用户注册
GET /api/users/me        # 获取当前用户信息
GET /api/users           # 获取用户列表
```

### 员工管理
```
GET /api/employees       # 获取员工列表
POST /api/employees      # 创建员工
PUT /api/employees/:id   # 更新员工信息
DELETE /api/employees/:id # 删除员工
```

### 药品管理
```
GET /api/medicines       # 获取药品列表
POST /api/medicines      # 添加药品
PUT /api/medicines/:id   # 更新药品信息
DELETE /api/medicines/:id # 删除药品
```

### 物资管理
```
GET /api/supplies        # 获取物资列表
POST /api/supplies       # 添加物资
PUT /api/supplies/:id    # 更新物资信息
DELETE /api/supplies/:id # 删除物资
```

### 体检管理
```
GET /api/medical-examinations    # 获取体检记录
POST /api/medical-examinations   # 添加体检记录
PUT /api/medical-examinations/:id # 更新体检记录
DELETE /api/medical-examinations/:id # 删除体检记录
```

### 倒班日历
```
GET /api/shift-calendar  # 获取排班信息
POST /api/shift-calendar # 创建排班
PUT /api/shift-calendar/:id # 更新排班
```

### 操作记录
```
GET /api/operation-records # 获取操作记录
```

## 技术栈

### 前端技术
- **React 18.3.1** - 用户界面构建
- **TypeScript 4.9.5** - 类型安全的 JavaScript
- **Ant Design 5.17.4** - 企业级 UI 设计语言
- **Ant Design Icons 6.0.0** - 图标库
- **Ant Design Plots 2.6.0** - 数据可视化图表
- **React Router DOM 6.23.1** - 前端路由管理
- **Axios 1.7.2** - HTTP 客户端
- **Moment.js 2.30.1** - 日期时间处理

### 后端技术
- **Node.js** - JavaScript 运行时环境
- **Express 4.18.2** - Web 应用框架
- **MySQL2 3.14.2** - MySQL 数据库驱动
- **JWT (jsonwebtoken 9.0.2)** - 身份验证
- **bcrypt 6.0.0** - 密码加密
- **CORS 2.8.5** - 跨域资源共享
- **dotenv 17.2.0** - 环境变量管理
- **csv-parser 3.2.0** - CSV 文件解析

### 开发工具
- **Nodemon 3.1.10** - 开发时自动重启
- **cross-env 7.0.3** - 跨平台环境变量设置
- **React Scripts 5.0.1** - React 开发工具链
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化

## 开发指南

### 代码规范
- **TypeScript** - 使用 TypeScript 进行类型检查，提高代码质量
- **ESLint** - 遵循 ESLint 规则，保持代码一致性
- **Prettier** - 使用 Prettier 自动格式化代码
- **组件化** - 采用组件化开发，提高代码复用性
- **模块化** - 合理划分模块，保持代码结构清晰

### 项目特性
- **响应式设计** - 支持多种设备屏幕尺寸
- **国际化支持** - 预留国际化接口
- **主题定制** - 支持 Ant Design 主题定制
- **懒加载** - 路由级别的代码分割和懒加载
- **错误边界** - 完善的错误处理机制

### 环境变量配置
项目支持多环境配置，通过不同的 `.env` 文件管理：

#### 开发环境 (`.env.development`)
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wardguard

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3000
NODE_ENV=development

# CORS 配置
CORS_ORIGIN=http://localhost:3001
```

#### 生产环境 (`.env.production`)
```env
# 数据库配置
DB_HOST=your_production_host
DB_PORT=3306
DB_USER=your_production_user
DB_PASSWORD=your_production_password
DB_NAME=wardguard

# JWT 配置
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3000
NODE_ENV=production

# CORS 配置
CORS_ORIGIN=https://your-domain.com
```

### API 配置
前端通过 `src/config/api.ts` 文件统一管理 API 配置：
- **开发环境**：自动使用 `http://localhost:3000`
- **生产环境**：自动使用当前域名 `window.location.origin`
- **动态切换**：根据 `NODE_ENV` 自动选择合适的 API 地址

## 故障排除

### 常见问题及解决方案

#### 1. 数据库连接失败
**问题**：后端启动时提示数据库连接错误
**解决方案**：
- 检查 MySQL 服务是否正在运行
- 验证 `.env` 文件中的数据库配置信息
- 确认数据库用户权限是否正确
- 检查防火墙设置

#### 2. 前端页面无法访问
**问题**：浏览器显示"无法访问此网站"
**解决方案**：
- 确认前端已正确构建：`npm run build`
- 检查后端服务是否正常运行
- 验证端口配置（默认 3000）
- 清除浏览器缓存

#### 3. API 请求失败
**问题**：前端显示网络错误或 API 调用失败
**解决方案**：
- 检查后端服务状态
- 验证 API 端点配置
- 查看浏览器开发者工具的网络面板
- 检查 CORS 配置

#### 4. 登录失败
**问题**：用户无法登录系统
**解决方案**：
- 检查用户名和密码是否正确
- 验证 JWT 密钥配置
- 查看后端日志错误信息
- 确认数据库用户表数据

#### 5. 前端构建失败
**问题**：`npm run build` 命令执行失败
**解决方案**：
- 删除 `node_modules` 文件夹，重新安装依赖
- 检查 Node.js 版本是否符合要求
- 解决 TypeScript 类型错误
- 检查 ESLint 警告

#### 6. 端口冲突
**问题**：启动时提示端口已被占用
**解决方案**：
- 查找占用端口的进程：`netstat -ano | findstr :3000`
- 终止占用进程或更改端口配置
- 修改 `.env` 文件中的 `PORT` 配置

### 日志查看
- **开发环境**：控制台输出详细日志，包括请求信息和错误堆栈
- **生产环境**：只输出错误日志，减少性能影响
- **数据库日志**：查看 MySQL 错误日志定位数据库问题

### 性能优化建议
- 定期清理过期数据
- 优化数据库查询索引
- 启用前端资源压缩
- 使用 CDN 加速静态资源
- 监控系统资源使用情况

## 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

### 贡献类型
- 🐛 **Bug 修复** - 修复系统中的错误和问题
- ✨ **新功能** - 添加新的功能特性
- 📚 **文档改进** - 完善项目文档和注释
- 🎨 **UI/UX 优化** - 改进用户界面和体验
- ⚡ **性能优化** - 提升系统性能和响应速度
- 🧪 **测试用例** - 添加或改进测试覆盖率

### 贡献流程
1. **Fork 项目** - 在 GitHub 上 Fork 本项目
2. **创建分支** - 基于 `main` 分支创建功能分支
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **开发功能** - 在本地进行开发和测试
4. **提交代码** - 遵循提交信息规范
   ```bash
   git commit -m "feat: add new feature description"
   ```
5. **推送分支** - 推送到你的 Fork 仓库
   ```bash
   git push origin feature/your-feature-name
   ```
6. **创建 PR** - 在 GitHub 上创建 Pull Request

### 提交信息规范
使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建过程或辅助工具的变动

### 代码审查
- 所有 PR 都需要经过代码审查
- 确保代码符合项目规范
- 添加必要的测试用例
- 更新相关文档

## 版本历史

### v1.0.0 (当前版本)
- ✅ 完整的科室管理功能
- ✅ 用户认证和权限管理
- ✅ 响应式 UI 设计
- ✅ 多环境配置支持
- ✅ API 统一管理
- ✅ 倒班日历系统

### 未来规划
- 🔄 数据导入导出功能
- 📱 移动端适配优化
- 🔔 消息推送系统
- 📊 高级数据分析
- 🌐 多语言国际化
- 🔐 更细粒度的权限控制

## 许可证
本项目采用 [MIT 许可证](LICENSE)，详情请查看 LICENSE 文件。

## 联系方式
- 📧 **邮箱**：请通过 GitHub Issues 联系
- 🐛 **Bug 报告**：[GitHub Issues](https://github.com/your-repo/WardGuard/issues)
- 💡 **功能建议**：[GitHub Discussions](https://github.com/your-repo/WardGuard/discussions)
- 📖 **文档问题**：欢迎提交 PR 改进文档

## 致谢
感谢所有为 WardGuard 项目做出贡献的开发者和用户！

---

**WardGuard** - 让科室管理更简单、更高效！