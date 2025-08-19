const { getPool } = require('../db');
const os = require('os');

class DistributedLockService {
  constructor() {
    // 生成唯一的实例标识符
    this.instanceId = `${os.hostname()}-${process.pid}-${Date.now()}`;
    console.log(`分布式锁服务初始化，实例ID: ${this.instanceId}`);
  }

  /**
   * 尝试获取任务锁
   * @param {string} taskName 任务名称
   * @param {number} lockDurationMinutes 锁持续时间（分钟）
   * @returns {Promise<boolean>} 是否成功获取锁
   */
  async acquireLock(taskName, lockDurationMinutes = 30) {
    try {
      const pool = await getPool();
      if (!pool) {
        console.error('数据库连接池未初始化，无法获取任务锁');
        return false;
      }

      // 首先清理过期的锁
      await this.cleanExpiredLocks();

      const expiresAt = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
      
      // 尝试插入新锁或更新已过期的锁
      const query = `
        INSERT INTO task_locks (task_name, locked_by, expires_at)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          locked_by = CASE 
            WHEN expires_at < NOW() THEN VALUES(locked_by)
            ELSE locked_by
          END,
          expires_at = CASE 
            WHEN expires_at < NOW() THEN VALUES(expires_at)
            ELSE expires_at
          END,
          locked_at = CASE 
            WHEN expires_at < NOW() THEN CURRENT_TIMESTAMP
            ELSE locked_at
          END
      `;

      const [result] = await pool.query(query, [taskName, this.instanceId, expiresAt]);
      
      // 检查是否成功获取锁
      const [lockCheck] = await pool.query(
        'SELECT locked_by FROM task_locks WHERE task_name = ? AND expires_at > NOW()',
        [taskName]
      );

      if (lockCheck.length > 0 && lockCheck[0].locked_by === this.instanceId) {
        console.log(`✅ 成功获取任务锁: ${taskName}`);
        return true;
      } else {
        console.log(`❌ 任务锁已被其他实例占用: ${taskName}`);
        return false;
      }
    } catch (error) {
      console.error(`获取任务锁失败 [${taskName}]:`, error);
      return false;
    }
  }

  /**
   * 释放任务锁
   * @param {string} taskName 任务名称
   * @returns {Promise<boolean>} 是否成功释放锁
   */
  async releaseLock(taskName) {
    try {
      const pool = await getPool();
      if (!pool) {
        console.error('数据库连接池未初始化，无法释放任务锁');
        return false;
      }

      const [result] = await pool.query(
        'DELETE FROM task_locks WHERE task_name = ? AND locked_by = ?',
        [taskName, this.instanceId]
      );

      if (result.affectedRows > 0) {
        console.log(`✅ 成功释放任务锁: ${taskName}`);
        return true;
      } else {
        console.log(`⚠️ 任务锁不存在或不属于当前实例: ${taskName}`);
        return false;
      }
    } catch (error) {
      console.error(`释放任务锁失败 [${taskName}]:`, error);
      return false;
    }
  }

  /**
   * 检查任务锁状态
   * @param {string} taskName 任务名称
   * @returns {Promise<Object>} 锁状态信息
   */
  async checkLockStatus(taskName) {
    try {
      const pool = await getPool();
      if (!pool) {
        return { locked: false, error: '数据库连接失败' };
      }

      const [result] = await pool.query(
        'SELECT locked_by, locked_at, expires_at FROM task_locks WHERE task_name = ? AND expires_at > NOW()',
        [taskName]
      );

      if (result.length > 0) {
        const lock = result[0];
        return {
          locked: true,
          lockedBy: lock.locked_by,
          lockedAt: lock.locked_at,
          expiresAt: lock.expires_at,
          isOwnedByMe: lock.locked_by === this.instanceId
        };
      } else {
        return { locked: false };
      }
    } catch (error) {
      console.error(`检查任务锁状态失败 [${taskName}]:`, error);
      return { locked: false, error: error.message };
    }
  }

  /**
   * 清理过期的锁
   * @returns {Promise<number>} 清理的锁数量
   */
  async cleanExpiredLocks() {
    try {
      const pool = await getPool();
      if (!pool) {
        return 0;
      }

      const [result] = await pool.query('DELETE FROM task_locks WHERE expires_at < NOW()');
      
      if (result.affectedRows > 0) {
        console.log(`🧹 清理了 ${result.affectedRows} 个过期的任务锁`);
      }
      
      return result.affectedRows;
    } catch (error) {
      console.error('清理过期任务锁失败:', error);
      return 0;
    }
  }

  /**
   * 续期任务锁
   * @param {string} taskName 任务名称
   * @param {number} lockDurationMinutes 续期时间（分钟）
   * @returns {Promise<boolean>} 是否成功续期
   */
  async renewLock(taskName, lockDurationMinutes = 30) {
    try {
      const pool = await getPool();
      if (!pool) {
        return false;
      }

      const expiresAt = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
      
      const [result] = await pool.query(
        'UPDATE task_locks SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE task_name = ? AND locked_by = ? AND expires_at > NOW()',
        [expiresAt, taskName, this.instanceId]
      );

      if (result.affectedRows > 0) {
        console.log(`🔄 成功续期任务锁: ${taskName}`);
        return true;
      } else {
        console.log(`❌ 任务锁续期失败，锁不存在或已过期: ${taskName}`);
        return false;
      }
    } catch (error) {
      console.error(`任务锁续期失败 [${taskName}]:`, error);
      return false;
    }
  }

  /**
   * 获取实例ID
   * @returns {string} 当前实例ID
   */
  getInstanceId() {
    return this.instanceId;
  }
}

module.exports = new DistributedLockService();