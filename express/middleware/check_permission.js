const { getPool } = require('../db');

/**
 * 检查用户是否有指定权限的中间件
 * @param {string} requiredPermission - 需要的权限代码
 * @returns {Function} Express中间件函数
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // 如果用户是管理员，直接放行
      if (req.user.role === 'admin') {
        return next();
      }

      // 普通用户默认无权访问用户管理和系统设置页面
      if (requiredPermission.startsWith('users:') || requiredPermission === 'settings:access') {
        return res.status(403).json({
          success: false,
          message: '您没有访问此页面的权限'
        });
      }

      const pool = await getPool();
      
      // 查询用户是否有指定权限
      const [permissions] = await pool.execute(`
        SELECT p.code
        FROM permissions p
        INNER JOIN user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = ? AND p.code = ?
      `, [req.user.id, requiredPermission]);

      if (permissions.length === 0) {
        return res.status(403).json({
          success: false,
          message: '您没有执行此操作的权限'
        });
      }

      next();
    } catch (err) {
      console.error('权限检查错误:', err);
      res.status(500).json({
        success: false,
        message: '权限检查失败',
        error: err.message
      });
    }
  };
};

module.exports = checkPermission;