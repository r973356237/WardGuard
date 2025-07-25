const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/check_permission');
const { getPool } = require('../db');

// 用户注册
router.post('/register', userController.register);
console.log('注册路由已加载');

// 用户登录
router.post('/login', userController.login);
console.log('登录路由已加载');

// 获取当前用户信息（需认证）
router.get('/me', authenticate, userController.getMe);
console.log('获取用户信息路由已加载');

// 获取所有用户（需认证）
router.get('/', authenticate, userController.getAllUsers);
console.log('获取所有用户路由已加载');

// 创建用户（需认证）
router.post('/', authenticate, userController.createUser);
console.log('创建用户路由已加载');

// 更新用户（需认证）
router.put('/:id', authenticate, userController.updateUser);
console.log('更新用户路由已加载');

// 删除用户（需认证）
router.delete('/:id', authenticate, userController.deleteUser);
console.log('删除用户路由已加载');

// 获取用户权限
router.get('/:userId/permissions', authenticate, async (req, res) => {
  const userId = req.params.userId;
  
  console.log('=== 获取用户权限 ===');
  console.log('请求用户ID:', userId);
  console.log('操作用户:', req.user ? `${req.user.username}(ID:${req.user.id})` : '未知');

  try {
    const pool = await getPool();
    console.log('✅ 数据库连接获取成功');

    // 检查用户是否存在
    const [users] = await pool.execute('SELECT id, username, name FROM users WHERE id = ?', [userId]);
    console.log('查询用户结果:', users);

    if (users.length === 0) {
      console.log('❌ 用户不存在:', userId);
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
    `, [userId]);
    console.log(`✅ 查询到 ${permissions.length} 个权限`);

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
    console.log('✅ 权限分组完成，模块数:', Object.keys(groupedPermissions).length);

    res.json({
      success: true,
      permissions: groupedPermissions,
      user: users[0]
    });
  } catch (err) {
    console.error('❌ 获取用户权限错误:', err);
    res.status(500).json({
      success: false,
      message: '获取用户权限失败',
      error: err.message
    });
  }
});

// 更新用户权限
router.put('/:userId/permissions', authenticate, checkPermission('users:manage'), async (req, res) => {
  const { permissions } = req.body;
  const userId = req.params.userId;

  console.log('=== 更新用户权限 ===');
  console.log('请求用户ID:', userId);
  console.log('操作用户:', req.user ? `${req.user.username}(ID:${req.user.id})` : '未知');
  console.log('请求权限数据:', permissions);
  console.log('权限数据类型:', typeof permissions);
  console.log('是否为数组:', Array.isArray(permissions));

  if (!Array.isArray(permissions)) {
    console.log('❌ 权限数据格式错误 - 不是数组');
    return res.status(400).json({
      success: false,
      message: '权限数据格式错误，必须是数组'
    });
  }

  let connection;
  try {
    const pool = await getPool();
    connection = await pool.getConnection();
    console.log('✅ 数据库连接获取成功');

    // 检查用户是否存在
    const [userCheck] = await connection.execute('SELECT id, username, name FROM users WHERE id = ?', [userId]);
    if (userCheck.length === 0) {
      console.log('❌ 目标用户不存在:', userId);
      return res.status(404).json({
        success: false,
        message: '目标用户不存在'
      });
    }
    console.log('✅ 目标用户存在:', userCheck[0]);

    await connection.beginTransaction();
    console.log('✅ 事务开始');

    // 删除用户现有权限
    const [deleteResult] = await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
    console.log('✅ 删除现有权限完成，影响行数:', deleteResult.affectedRows);

    // 如果有新权限，则添加
    if (permissions.length > 0) {
      console.log('开始处理新权限，权限ID:', permissions);
      
      // 验证权限ID是否有效
      const placeholders = permissions.map(() => '?').join(',');
      const query = `SELECT id, code FROM permissions WHERE id IN (${placeholders})`;
      console.log('权限验证SQL:', query);
      console.log('权限验证参数:', permissions);
      
      const [permissionRows] = await connection.execute(query, permissions);
      console.log('✅ 查询到的有效权限:', permissionRows);

      if (permissionRows.length === 0) {
        console.log('❌ 没有找到有效的权限');
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: '没有找到有效的权限'
        });
      }

      if (permissionRows.length !== permissions.length) {
        console.log('⚠️ 部分权限ID无效');
        console.log('请求的权限ID:', permissions);
        console.log('有效的权限ID:', permissionRows.map(p => p.id));
      }

      // 插入新的权限关联
      const values = permissionRows.map(p => [userId, p.id, req.user.id, new Date()]);
      console.log('准备插入的权限数据:', values);
      
      if (values.length > 0) {
        const [insertResult] = await connection.query(
          'INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at) VALUES ?',
          [values]
        );
        console.log('✅ 权限插入完成，影响行数:', insertResult.affectedRows);
      }
    } else {
      console.log('ℹ️ 没有新权限需要添加');
    }

    await connection.commit();
    console.log('🎉 用户权限更新成功！');

    res.json({
      success: true,
      message: '用户权限更新成功'
    });
  } catch (err) {
    console.log('❌ 更新用户权限过程中发生错误:', err);
    console.log('错误详情:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    
    if (connection) {
      try {
        await connection.rollback();
        console.log('✅ 事务回滚成功');
      } catch (rollbackErr) {
        console.log('❌ 事务回滚失败:', rollbackErr);
      }
    }
    
    res.status(500).json({
      success: false,
      message: '更新用户权限失败',
      error: err.message,
      details: {
        code: err.code,
        errno: err.errno
      }
    });
  } finally {
    if (connection) {
      connection.release();
      console.log('✅ 数据库连接已释放');
    }
    console.log('=== 权限更新流程结束 ===\n');
  }
});

console.log('用户权限路由已加载');

module.exports = router;