# WardGuard 前端项目文档

## 项目概述
本项目是 WardGuard 系统的前端部分，使用 Create React App 搭建，基于 React 框架开发。主要用于展示和交互处理系统相关业务。

## 技术栈
- React：核心前端框架
- TypeScript：编程语言
- CSS：样式编写

## 项目结构
```plaintext
client/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── ...
├── src/
│   ├── components/
│   ├── pages/
│   ├── App.tsx
│   ├── index.tsx
│   └── ...
├── package.json
└── ...
```

## 环境准备
确保已安装 Node.js 和 npm，可通过以下命令检查版本：
```bash
node -v
npm -v
```

## 安装依赖
在项目根目录下运行以下命令安装项目依赖：
```bash
npm install
```

## 开发模式
在开发模式下运行项目，修改代码后会自动热更新：
```bash
npm start
```
打开 [http://localhost:3000](http://localhost:3000) 查看项目。

## 运行测试
运行测试用例：
```bash
npm test
```

## 构建项目
构建生产环境版本：
```bash
npm run build
```
构建后的文件会生成在 `build` 目录下。

## 部署
将 `build` 目录下的文件部署到静态文件服务器即可。
