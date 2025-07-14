# WardGuard 项目文档

## 项目概述
WardGuard 是一个综合性的项目，结合了前端和后端功能，用于管理员工信息、体检信息、物资信息和药品信息等。项目采用前后端分离架构，前端使用 React 框架，后端使用 Express 框架。

## 项目结构
```
├── README.md
├── client\
│   ├── .gitignore
│   ├── README.md
│   ├── package-lock.json
│   ├── package.json
│   ├── public\
│   ├── src\
│   └── tsconfig.json
├── express\
│   ├── .gitignore
│   ├── README.md
│   ├── controllers\
│   ├── db.js
│   ├── index.js
│   ├── middleware\
│   ├── node_modules.rar
│   ├── package-lock.json
│   ├── package.json
│   └── routes\
├── 员工信息.csv
├── 员工对应体检信息.csv
├── 开发说明文档.md
├── 物资信息.csv
└── 药品信息.csv
```

## 前端项目
### 环境要求
- Node.js (版本建议 >= 16)
- npm (版本建议 >= 8)

### 安装依赖
在 `client` 目录下运行以下命令：
```bash
npm install
```

### 开发模式运行
```bash
npm start
```

### 构建生产版本
```bash
npm run build
```

## 后端项目
### 环境要求
- Node.js (版本建议 >= 16)
- npm (版本建议 >= 8)

### 安装依赖
在 `express` 目录下运行以下命令：
```bash
npm install
```

### 开发模式运行
在项目根目录下运行以下命令，支持文件修改自动重启：
```bash
npm run dev
```

### 生产模式运行
```bash
npm start
```

## 数据库
项目使用数据库存储相关信息，数据库连接配置在 `express/db.js` 文件中。

## 托管前端静态文件
后端已配置托管前端构建后的静态文件，将 `client/build` 目录下的静态文件进行托管，并支持前端路由。

## 数据文件
项目包含以下数据文件：
- `员工信息.csv`：员工基本信息
- `员工对应体检信息.csv`：员工体检相关信息
- `物资信息.csv`：物资相关信息
- `药品信息.csv`：药品相关信息

## 注意事项
- 请确保 Node.js 和 npm 已正确安装
- 运行项目前，请先安装依赖
- 修改后端代码后，开发模式下会自动重启服务