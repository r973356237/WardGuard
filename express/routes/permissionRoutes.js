const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/check_permission');
const { getPool } = require('../db');

// 获取所有权限列表
router.get('/permissions', authenticate, async (req, res) => {
  console.log('=== 开始获取所有权限列表 ===');
  console.log('请求用户:', req.user ? `${req.user.username}(ID:${req.user.id})` : '未知');
  
  try {
    const pool = await getPool();
    console.log('✅ 数据库连接获取成功');
    
    console.log('🔍 查询所有权限...');
    const [permissions] = await pool.execute('SELECT * FROM permissions ORDER BY module, name');
    console.log(`✅ 查询到 ${permissions.length} 个权限`);
    
    // 按模块统计权限数量
    const moduleStats = permissions.reduce((acc, perm) => {
      acc[perm.module] = (acc[perm.module] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 权限模块统计:', moduleStats);
    
    console.log('🎉 权限列表获取成功！');
    res.json({
      success: true,
      permissions
    });
  } catch (err) {
    console.error('❌ 获取权限列表失败:', err);
    console.log('错误详情:');
    console.log('  - 错误消息:', err.message);
    console.log('  - 错误代码:', err.code);
    console.log('  - SQL状态:', err.sqlState);
    
    res.status(500).json({
      success: false,
      message: '获取权限列表失败',
      error: err.message,
      debug: {
        errorCode: err.code,
        sqlState: err.sqlState
      }
    });
  } finally {
    console.log('=== 权限列表查询流程结束 ===\n');
  }
});

// 获取指定用户的权限
router.get('/permissions/user/:userId', authenticate, async (req, res) => {
  console.log('=== 开始获取用户权限 ===');
  console.log('请求用户ID:', req.params.userId);
  console.log('请求用户:', req.user ? `${req.user.username}(ID:${req.user.id})` : '未知');
  
  try {
    const pool = await getPool();
    console.log('✅ 数据库连接获取成功');

    // 检查用户是否存在
    console.log('🔍 检查目标用户是否存在...');
    const [users] = await pool.execute('SELECT id, username, name FROM users WHERE id = ?', [req.params.userId]);
    console.log('查询用户结果:', users);

    if (users.length === 0) {
      console.log('❌ 用户不存在:', req.params.userId);
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    console.log('✅ 目标用户存在:', users[0]);

    // 获取用户的权限
    console.log('🔍 开始查询用户权限...');
    const [permissions] = await pool.execute(`
      SELECT p.*, up.granted_at, u.username as granted_by_username, u.name as granted_by_name
      FROM permissions p
      LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
      LEFT JOIN users u ON up.granted_by = u.id
      ORDER BY p.module, p.name
    `, [req.params.userId]);
    console.log(`✅ 查询到 ${permissions.length} 个权限记录`);

    // 统计已授权的权限
    const grantedPermissions = permissions.filter(p => p.granted_at);
    console.log(`📊 权限统计: 总计 ${permissions.length} 个权限，已授权 ${grantedPermissions.length} 个`);

    // 将权限按模块分组
    console.log('📋 开始权限分组...');
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
    
    // 打印每个模块的权限统计
    Object.keys(groupedPermissions).forEach(module => {
      const modulePerms = groupedPermissions[module];
      const grantedCount = modulePerms.filter(p => p.granted).length;
      console.log(`  - ${module}: ${grantedCount}/${modulePerms.length} 个权限已授权`);
    });

    console.log('🎉 用户权限查询成功！');
    res.json({
      success: true,
      data: {
        user: users[0],
        permissions: groupedPermissions
      }
    });
  } catch (err) {
    console.error('❌ 获取用户权限错误:', err);
    console.log('错误详情:');
    console.log('  - 错误消息:', err.message);
    console.log('  - 错误代码:', err.code);
    console.log('  - SQL状态:', err.sqlState);
    console.log('  - 堆栈跟踪:', err.stack);
    
    res.status(500).json({
      success: false,
      message: '获取用户权限失败',
      error: err.message,
      debug: {
        userId: req.params.userId,
        errorCode: err.code,
        sqlState: err.sqlState
      }
    });
  } finally {
    console.log('=== 用户权限查询流程结束 ===\n');
  }
});

// 添加用户权限查询的别名路由
router.get('/user-permissions/:userId', authenticate, async (req, res) => {
  console.log('通过别名路由请求获取用户权限，用户ID:', req.params.userId);
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
      permissions: groupedPermissions,
      user: users[0]
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

// 添加前端权限设置组件使用的POST路由
router.post('/user-permissions', authenticate, checkPermission('users:manage'), async (req, res) => {
  const { userId, permissions } = req.body;

  console.log('=== POST /user-permissions 权限更新开始 ===');
  console.log('请求用户ID:', userId);
  console.log('操作用户:', req.user ? `${req.user.username}(ID:${req.user.id})` : '未知');
  console.log('请求权限数据:', permissions);
  console.log('权限数据类型:', typeof permissions);
  console.log('权限数组长度:', Array.isArray(permissions) ? permissions.length : 'N/A');

  if (!userId) {
    console.log('❌ 缺少用户ID');
    return res.status(400).json({
      success: false,
      message: '缺少用户ID'
    });
  }

  if (!Array.isArray(permissions)) {
    console.log('❌ 权限数据格式错误 - 不是数组');
    return res.status(400).json({
      success: false,
      message: '权限数据格式错误'
    });
  }

  let connection;
  try {
    console.log('🔗 正在获取数据库连接...');
    const pool = await getPool();
    connection = await pool.getConnection();
    console.log('✅ 数据库连接获取成功');

    // 检查用户是否存在
    console.log('🔍 检查目标用户是否存在...');
    const [userCheck] = await connection.execute('SELECT id, username, name FROM users WHERE id = ?', [userId]);
    if (userCheck.length === 0) {
      console.log('❌ 目标用户不存在:', userId);
      return res.status(404).json({
        success: false,
        message: '目标用户不存在'
      });
    }
    console.log('✅ 目标用户存在:', userCheck[0]);

    console.log('🚀 开始数据库事务...');
    await connection.beginTransaction();

    // 删除用户现有权限
    console.log('🗑️ 删除用户现有权限...');
    const [deleteResult] = await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
    console.log('✅ 删除现有权限完成，影响行数:', deleteResult.affectedRows);

    // 如果有新权限，则添加
    if (permissions.length > 0) {
      console.log('📝 开始添加新权限...');
      console.log('原始权限ID列表:', permissions);
      
      // 过滤掉null值和无效值，确保都是有效的数字ID
      const validPermissionIds = permissions
        .filter(id => id !== null && id !== undefined && !isNaN(parseInt(id)))
        .map(id => parseInt(id));
      
      console.log('过滤后的权限ID列表:', validPermissionIds);
      
      if (validPermissionIds.length === 0) {
        console.log('⚠️ 没有有效的权限ID需要处理');
      } else {
        // 验证权限ID是否存在 - 使用MySQL 5.7兼容的语法
        console.log('🔍 验证权限ID...');
        const placeholders = validPermissionIds.map(() => '?').join(',');
        const [permissionRows] = await connection.execute(
          `SELECT id FROM permissions WHERE id IN (${placeholders})`,
          validPermissionIds
        );
        console.log('✅ 查询到的有效权限:', permissionRows);
        console.log('权限验证情况:');
        validPermissionIds.forEach(id => {
          const found = permissionRows.find(p => p.id === id);
          console.log(`  - ID ${id}: ${found ? '✅ 有效' : '❌ 无效'}`);
        });

        // 插入新的权限关联
        const finalValidIds = permissionRows.map(p => p.id);
        console.log('最终有效的权限ID列表:', finalValidIds);
        
        if (finalValidIds.length > 0) {
          console.log('💾 插入权限关联...');
          
          // 使用逐个插入的方式，确保兼容性
          for (const permissionId of finalValidIds) {
            await connection.execute(
              'INSERT INTO user_permissions (user_id, permission_id, granted_by, granted_at) VALUES (?, ?, ?, ?)',
              [userId, permissionId, req.user.id, new Date()]
            );
            console.log(`✅ 成功插入权限关联: 用户${userId} -> 权限${permissionId}`);
          }
          
          console.log(`✅ 成功插入 ${finalValidIds.length} 个权限关联`);
        } else {
          console.log('⚠️ 没有有效的权限需要插入');
        }
      }
    } else {
      console.log('⚠️ 没有权限需要添加');
    }

    console.log('✅ 提交事务...');
    await connection.commit();
    console.log('🎉 用户权限更新成功！');

    res.json({
      success: true,
      message: '用户权限更新成功',
      debug: {
        userId,
        permissionsCount: permissions.length,
        operatedBy: req.user.username
      }
    });
  } catch (err) {
    console.log('❌ 更新用户权限过程中发生错误:', err);
    console.log('错误详情:');
    console.log('  - 错误消息:', err.message);
    console.log('  - 错误代码:', err.code);
    console.log('  - SQL状态:', err.sqlState);
    console.log('  - SQL消息:', err.sqlMessage);
    console.log('  - 堆栈跟踪:', err.stack);
    
    if (connection) {
      console.log('🔄 回滚事务...');
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
      debug: {
        userId,
        permissionsRequested: permissions,
        errorCode: err.code,
        sqlState: err.sqlState
      }
    });
  } finally {
    if (connection) {
      console.log('🔌 释放数据库连接...');
      connection.release();
      console.log('✅ 数据库连接已释放');
    }
    console.log('=== POST /user-permissions 权限更新流程结束 ===\n');
  }
});

// 获取所有模块权限配置 - 前端期望的路由
router.get('/modules/permissions', authenticate, async (req, res) => {
  console.log('请求获取模块权限配置 - 前端路由');
  try {
    const pool = await getPool();
    console.log('成功获取数据库连接');
    
    // 获取所有权限，按模块分组
    const [permissions] = await pool.execute(`
      SELECT id, code, name, description, module 
      FROM permissions 
      ORDER BY module, id
    `);
    console.log(`查询到 ${permissions.length} 个权限`);
    
    // 按模块分组
    const moduleGroups = {};
    permissions.forEach(permission => {
      if (!moduleGroups[permission.module]) {
        moduleGroups[permission.module] = [];
      }
      moduleGroups[permission.module].push({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description
      });
    });
    
    // 转换为数组格式
    const modules = Object.keys(moduleGroups).map(module => ({
      module,
      permissions: moduleGroups[module]
    }));

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

// 获取所有模块的权限配置 - 备用路由
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

module.exports = router;