const jwt = require('jsonwebtoken');
const db = require('../db');
const { dbPool } = require('../db');

// JWT密钥（实际生产环境应使用环境变量）
const JWT_SECRET = 'your_jwt_secret_key';

/**
 * JWT认证中间件
 */
const authenticate = async (req, res, next) => {
  console.log('执行JWT认证中间件');
  try {
    // 获取Authorization头
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('未提供有效的Authorization头');
      return res.status(401).json({ success: false, message: '未授权访问，请先登录' });
    }

    // 提取并验证token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('JWT验证成功，用户ID:', decoded.userId);

    // 验证用户是否存在
    const pool = await db.getPool();
    const [users] = await pool.execute('SELECT id, username, role FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) {
      console.log('用户不存在，ID:', decoded.userId);
      return res.status(401).json({ success: false, message: '用户不存在或已被删除' });
    }

    // 将用户信息添加到请求对象
    req.user = users[0];
    next();
  } catch (err) {
    console.error('JWT认证错误:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    }
    res.status(401).json({ success: false, message: '认证失败，请检查token' });
  }
};

/**
 * 管理员权限验证中间件
 */
const requireAdmin = (req, res, next) => {
  console.log('执行管理员权限验证中间件，用户角色:', req.user.role);
  if (req.user.role !== 'admin') {
    console.log('权限不足，需要管理员权限');
    return res.status(403).json({ success: false, message: '权限不足，需要管理员权限' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };