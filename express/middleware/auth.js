const jwt = require('jsonwebtoken');
const db = require('../db');
const { dbPool } = require('../db');
const config = require('../config');

// 从配置中获取JWT密钥
const JWT_SECRET = config.getJWTSecret();

/**
 * JWT认证中间件
 */
const authenticate = async (req, res, next) => {
  // 认证中间件 - 仅在错误时输出日志
  try {
    // 获取Authorization头
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未授权访问，请先登录' });
    }

    // 提取并验证token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // 验证用户是否存在
    const pool = await db.getPool();
    const [users] = await pool.execute('SELECT id, username, role FROM users WHERE id = ? AND status = \'active\'', [decoded.userId]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: '用户不存在或已被禁用' });
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
  // 管理员权限验证
  if (req.user.role !== 'admin') {
    console.error('权限不足，用户ID:', req.user.id);
    return res.status(403).json({ success: false, message: '权限不足，需要管理员权限' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };