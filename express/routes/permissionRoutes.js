const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/check_permission');
const { getPool } = require('../db');

// 获取所有权限列表
router.get('/permissions', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    const [permissions] = await pool.execute('SELECT * FROM permissions ORDER BY module, name');
    res.json({
      success: true,
      permissions
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '获取权限列表失败',
      error: err.message
    });
  }
});

// 获取指定用户的权限
router.get('/permissions/user/:userId', authenticate, async (req, res) => {
  console.log('请求获取用户权限，用户ID:', req.params.userId);
  try {
    const pool = await getPool();
    console.log('成功获取数据库连接');

    // 检查用户是否存在
    const [users] = await pool.execute('SELECT id, username, name FROM users WHERE id = ?', [req.params.userId]);
    console.log('查询用户结果:', users);

    if (users.length === 0) {
      console.log('用户不存在:', req.params.userId);
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 获取用户的权限
    console.log('开始查询用户权限');
    const [permissions] = await pool.execute(`
      SELECT p.*, up.granted_at, u.username as granted_by_username, u.name as granted_by_name
      FROM permissions p
      LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
      LEFT JOIN users u ON up.granted_by = u.id
      ORDER BY p.module, p.name
    `, [req.params.userId]);
    console.log(`查询到 ${permissions.length} 个权限`);

    // 将权限按模块分组
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push({
        ...permission,
        granted: !!permission.granted_at
      });
      return acc;
    }, {});
    console.log('权限分组完成，模块数:', Object.keys(groupedPermissions).length);

    res.json({
      success: true,
      data: {
        user: users[0],
        permissions: groupedPermissions
      }
    });
  } catch (err) {
    console.error('获取用户权限错误:', err);
    res.status(500).json({
      success: false,
      message: '获取用户权限失败',
      error: err.message
    });
  }
});

// 更新用户权限（需要管理员权限）
router.post('/permissions/user/:userId', authenticate, checkPermission('users:manage'), async (req, res) => {
  const { permissions } = req.body;
  const userId = req.params.userId;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      message: '权限数据格式错误'
    });
  }

  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 删除用户现有权限
    await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);

    // 如果有新权限，则添加
    if (permissions.length > 0) {
      // 获取权限ID
      const [permissionRows] = await connection.execute(
        'SELECT id, code FROM permissions WHERE code IN (?)',
        [permissions]
      );

      // 插入新的权限关联
      const values = permissionRows.map(p => [userId, p.id]);
      if (values.length > 0) {
        await connection.query(
          'INSERT INTO user_permissions (user_id, permission_id) VALUES ?',
          [values]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: '用户权限更新成功'
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({
      success: false,
      message: '更新用户权限失败',
      error: err.message
    });
  } finally {
    connection.release();
  }
});

// 获取所有模块的权限配置
router.get('/permissions/modules', authenticate, async (req, res) => {
  console.log('请求获取模块权限配置');
  try {
    const pool = await getPool();
    console.log('成功获取数据库连接');
    
    const [permissions] = await pool.execute('SELECT DISTINCT module FROM permissions ORDER BY module');
    console.log(`查询到 ${permissions.length} 个不同的模块`);
    
    const modules = [];
    for (const { module } of permissions) {
      console.log(`正在获取模块 ${module} 的权限`);
      const [modulePermissions] = await pool.execute(
        'SELECT * FROM permissions WHERE module = ? ORDER BY name',
        [module]
      );
      console.log(`模块 ${module} 有 ${modulePermissions.length} 个权限`);
      modules.push({
        module,
        permissions: modulePermissions
      });
    }

    console.log('成功构建模块权限数据，准备返回');
    res.json({
      success: true,
      modules
    });
  } catch (err) {
    console.error('获取模块权限配置失败:', err);
    res.status(500).json({
      success: false,
      message: '获取模块权限配置失败',
      error: err.message
    });
  }
});

// 添加一个别名路由，兼容前端调用
router.get('/modules/permissions', authenticate, async (req, res) => {
  console.log('通过别名路由请求获取模块权限配置');
  try {
    const pool = await getPool();
    console.log('成功获取数据库连接');
    
    const [permissions] = await pool.execute('SELECT DISTINCT module FROM permissions ORDER BY module');
    console.log(`查询到 ${permissions.length} 个不同的模块`);
    
    const modules = [];
    for (const { module } of permissions) {
      console.log(`正在获取模块 ${module} 的权限`);
      const [modulePermissions] = await pool.execute(
        'SELECT * FROM permissions WHERE module = ? ORDER BY name',
        [module]
      );
      console.log(`模块 ${module} 有 ${modulePermissions.length} 个权限`);
      modules.push({
        module,
        permissions: modulePermissions
      });
    }

    console.log('成功构建模块权限数据，准备返回');
    res.json({
      success: true,
      modules
    });
  } catch (err) {
    console.error('获取模块权限配置失败:', err);
    res.status(500).json({
      success: false,
      message: '获取模块权限配置失败',
      error: err.message
    });
  }
});

module.exports = router;