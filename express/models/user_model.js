/**
 * 数据库模型层 - 用户模型
 * 提供统一的数据库操作接口，提高代码复用性和可维护性
 */
const db = require('../db');

class UserModel {
  /**
   * 获取所有用户
   * @param {Object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.limit - 每页数量
   * @param {string} options.search - 搜索关键词
   * @returns {Promise<Object>} 用户列表和分页信息
   */
  static async getAllUsers(options = {}) {
    const { page = 1, limit = 10, search = '' } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (search) {
      whereClause = 'WHERE username LIKE ? OR name LIKE ? OR email LIKE ?';
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }
    
    // 获取总数
    const countSQL = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countResult] = await db.execute(countSQL, params);
    const total = countResult[0].total;
    
    // 获取数据
    const dataSQL = `
      SELECT id, username, name, email, role, status, created_at, updated_at 
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [users] = await db.execute(dataSQL, [...params, limit, offset]);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 根据ID获取用户
   */
  static async getUserById(id) {
    const [rows] = await db.execute(
      'SELECT id, username, name, email, role, status, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * 根据用户名获取用户（包含密码，用于登录验证）
   */
  static async getUserByUsername(username) {
    const [rows] = await db.execute(
      'SELECT id, username, name, email, role, status, password FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  }

  /**
   * 创建用户
   */
  static async createUser(userData) {
    const { username, name, email, password, role = 'user', status = 'active' } = userData;
    
    const [result] = await db.execute(
      'INSERT INTO users (username, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [username, name, email, password, role, status]
    );
    
    return this.getUserById(result.insertId);
  }

  /**
   * 更新用户
   */
  static async updateUser(id, userData) {
    const allowedFields = ['username', 'name', 'email', 'role', 'status'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(userData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) {
      throw new Error('没有有效的更新字段');
    }
    
    values.push(id);
    
    await db.execute(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    return this.getUserById(id);
  }

  /**
   * 删除用户
   */
  static async deleteUser(id) {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * 检查用户名是否存在
   */
  static async usernameExists(username, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
    let params = [username];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await db.execute(sql, params);
    return rows[0].count > 0;
  }

  /**
   * 检查邮箱是否存在
   */
  static async emailExists(email, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
    let params = [email];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [rows] = await db.execute(sql, params);
    return rows[0].count > 0;
  }
}

module.exports = UserModel;