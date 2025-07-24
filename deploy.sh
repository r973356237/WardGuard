#!/bin/bash

# WardGuard 生产环境部署脚本
# 适用于 Ubuntu 22.04.4 LTS + 宝塔面板

echo "🚀 开始部署 WardGuard 科室管理系统..."

# 检查当前目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 1. 安装后端依赖
echo "📦 步骤 1: 安装后端依赖..."
cd express
npm install --production
if [ $? -ne 0 ]; then
    echo "❌ 后端依赖安装失败"
    exit 1
fi
echo "✅ 后端依赖安装完成"

# 2. 构建前端
echo "🏗️ 步骤 2: 构建前端..."
cd ../client
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi
echo "✅ 前端构建完成"

# 3. 检查环境配置
echo "⚙️ 步骤 3: 检查环境配置..."
cd ../express
if [ ! -f ".env.production" ]; then
    echo "❌ 错误：缺少 .env.production 配置文件"
    exit 1
fi

# 检查必要的环境变量
source .env.production
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "❌ 错误：数据库配置不完整"
    exit 1
fi
echo "✅ 环境配置检查通过"

# 4. 测试数据库连接
echo "🗄️ 步骤 4: 测试数据库连接..."
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
    console.log('✅ 数据库连接测试成功');
  } catch (error) {
    console.log('❌ 数据库连接测试失败:', error.message);
    process.exit(1);
  }
}

testConnection();
"

# 5. 创建启动脚本
echo "📝 步骤 5: 创建启动脚本..."
cat > start.sh << 'EOF'
#!/bin/bash
cd /www/wwwroot/wardguard/express
export NODE_ENV=production
nohup node index.js > ../logs/app.log 2>&1 &
echo $! > ../logs/app.pid
echo "✅ 应用已启动，PID: $(cat ../logs/app.pid)"
EOF

cat > stop.sh << 'EOF'
#!/bin/bash
if [ -f "../logs/app.pid" ]; then
    PID=$(cat ../logs/app.pid)
    kill $PID
    rm ../logs/app.pid
    echo "✅ 应用已停止"
else
    echo "❌ 未找到运行中的应用"
fi
EOF

chmod +x start.sh stop.sh
echo "✅ 启动脚本创建完成"

# 6. 创建日志目录
echo "📁 步骤 6: 创建日志目录..."
mkdir -p ../logs
echo "✅ 日志目录创建完成"

# 7. 设置文件权限
echo "🔐 步骤 7: 设置文件权限..."
chmod 644 .env.production
chmod 755 index.js
echo "✅ 文件权限设置完成"

echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 后续步骤："
echo "1. 启动应用: ./start.sh"
echo "2. 检查日志: tail -f ../logs/app.log"
echo "3. 停止应用: ./stop.sh"
echo ""
echo "🌐 访问地址："
echo "- 前端: http://您的服务器IP:3000"
echo "- API: http://您的服务器IP:3000/api"
echo "- 健康检查: http://您的服务器IP:3000/health"