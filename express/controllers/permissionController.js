const { getPool } = require('../db');
const { addOperationRecord } = require('./operationRecordController');

/**
 * 获取所有权限列表
 */
exports.getAllPermissions = async (req, res) => {
  try {
    const pool = await getPool();
    const [permissions] = await pool.execute('SELECT * FROM permissions ORDER BY module, operation_type');
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (err) {
    console.error('获取权限列表错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 获取指定用户的权限
 */
exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 检查用户是否存在
    const pool = await getPool();
    const [users] = await pool.execute('SELECT id, username, name FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 获取用户的权限
    const [permissions] = await pool.execute(`
      SELECT p.*, up.granted_at, u.username as granted_by_username, u.name as granted_by_name
      FROM permissions p
      LEFT JOIN user_permissions up ON p.id = up.permission_id AND up.user_id = ?
      LEFT JOIN users u ON up.granted_by = u.id
      ORDER BY p.module, p.operation_type
    `, [userId]);
    
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
    
    res.json({
      success: true,
      data: {
        user: users[0],
        permissions: groupedPermissions
      }
    });
  } catch (err) {
    console.error('获取用户权限错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 更新用户权限
 */
exports.updateUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: '权限数据格式错误' });
    }
    
    const pool = await getPool();
    
    // 检查用户是否存在
    const [users] = await pool.execute('SELECT id, username, name FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 删除用户现有权限
      await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
      
      // 插入新的权限
      if (permissions.length > 0) {
        const values = permissions.map(permissionId => [userId, permissionId, req.user.id]);
        await connection.query(
          'INSERT INTO user_permissions (user_id, permission_id, granted_by) VALUES ?',
          [values]
        );
      }
      
      // 提交事务
      await connection.commit();
      
      // 添加操作记录
      const operationDetails = {
        userId,
        username: users[0].username,
        permissions
      };
      await addOperationRecord(
        req.user.id,
        'update',
        'user_permissions',
        userId,
        users[0].name,
        operationDetails
      );
      
      res.json({
        success: true,
        message: '用户权限更新成功'
      });
    } catch (err) {
      // 回滚事务
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('更新用户权限错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 获取所有模块的权限配置
 */
exports.getModulePermissions = async (req, res) => {
  try {
    const pool = await getPool();
    const [permissions] = await pool.execute('SELECT * FROM permissions ORDER BY module, operation_type');
    
    // 将权限按模块分组
    const modulePermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = {
          name: getModuleName(permission.module),
          permissions: []
        };
      }
      acc[permission.module].permissions.push(permission);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: modulePermissions
    });
  } catch (err) {
    console.error('获取模块权限错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 获取模块名称
 */
function getModuleName(moduleCode) {
  const moduleNames = {
    users: '用户管理',
    employees: '员工管理',
    medicines: '药品管理',
    supplies: '物资管理',
    medical_examinations: '体检管理'
  };
  return moduleNames[moduleCode] || moduleCode;
}