# WardGuard 后端项目文档

## 项目概述
本项目是 WardGuard 系统的后端部分，主要负责业务逻辑处理、数据存储和接口提供。后端使用 Node.js 构建，结合 Express 框架搭建 RESTful API。

## 技术栈
- Node.js：JavaScript 运行时环境
- Express：Web 应用框架
- MySQL：关系型数据库（推测，可根据实际情况调整）

## 项目结构
```plaintext
WardGuard/
├── controllers/
│   ├── employeeController.js
│   ├── medicalExaminationController.js
│   ├── medicineController.js
│   ├── operationRecordController.js
│   ├── supplyController.js
│   └── userController.js
├── db.js
├── index.js
├── middleware/
│   └── auth.js
├── routes/
│   ├── employeeRoutes.js
│   ├── medicalExaminationRoutes.js
│   ├── medicineRoutes.js
│   ├── operationRecordRoutes.js
│   ├── supplyRoutes.js
│   └── userRoutes.js
├── package.json
├── package-lock.json
└── .env
```

## 环境准备
1. 确保已安装 Node.js 和 npm，可通过以下命令检查版本：
```bash
node -v
npm -v
```
2. 安装 MySQL 数据库，并创建相应的数据库和表。
3. 在项目根目录下创建 `.env` 文件，配置数据库连接信息和其他环境变量，示例如下：
```plaintext
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=wardguard_db
PORT=3001
```

## 安装依赖
在项目根目录下运行以下命令安装项目依赖：
```bash
npm install
```

## 开发模式
在开发模式下运行项目，修改代码后会自动重启：
```bash
npm run dev
```
项目将在 `http://localhost:3001` 启动。

## 生产模式
在生产环境中运行项目：
```bash
npm start
```

## API 文档
各模块的 API 路由定义在 `routes` 目录下，具体接口说明如下：

### 员工管理
- 文件：`routes/employeeRoutes.js`
- 接口：包含员工信息的增删改查等接口

### 体检信息管理
- 文件：`routes/medicalExaminationRoutes.js`
- 接口：包含体检信息的管理接口

### 药品管理
- 文件：`routes/medicineRoutes.js`
- 接口：包含药品信息的管理接口

### 操作记录管理
- 文件：`routes/operationRecordRoutes.js`
- 接口：包含手术记录的管理接口

### 物资管理
- 文件：`routes/supplyRoutes.js`
- 接口：包含物资信息的管理接口

### 用户管理
- 文件：`routes/userRoutes.js`
- 接口：包含用户信息的管理接口

## 数据文件
项目根目录下包含以下 CSV 数据文件：
- `员工信息.csv`：员工相关数据
- `员工对应体检信息.csv`：员工与体检信息的关联数据
- `物资信息.csv`：物资相关数据
- `药品信息.csv`：药品相关数据

## 运行测试
暂未提供测试用例，可后续添加单元测试和集成测试。

## 部署
1. 在生产服务器上安装 Node.js 和 MySQL。
2. 将项目代码上传到服务器。
3. 安装项目依赖：`npm install --production`
4. 配置 `.env` 文件。
5. 启动项目：`npm start`