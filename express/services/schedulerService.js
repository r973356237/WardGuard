const cron = require('node-cron');
const { getPool } = require('../db');
const emailService = require('./emailService');

class SchedulerService {
  constructor() {
    this.tasks = new Map();
    this.isInitialized = false;
  }

  // 初始化调度器
  async init() {
    if (this.isInitialized) {
      return;
    }

    try {
      // 启动时检查并创建邮件提醒任务
      await this.setupEmailReminderTask();
      this.isInitialized = true;
      console.log('定时任务调度器初始化成功');
    } catch (error) {
      console.error('定时任务调度器初始化失败:', error);
    }
  }

  // 设置邮件提醒任务
  async setupEmailReminderTask() {
    try {
      const pool = await getPool();
      if (!pool) {
        console.log('数据库连接池未初始化，跳过邮件提醒任务');
        return;
      }

      // 获取邮件配置（只需要提醒频率和时间）
      const [configRows] = await pool.query('SELECT reminder_frequency, reminder_time FROM email_config LIMIT 1');
      if (!configRows || configRows.length === 0) {
        console.log('未配置邮件设置，跳过邮件提醒任务');
        return;
      }

      const config = configRows[0];
      const { reminder_frequency, reminder_time } = config;

      // 验证配置数据
      if (!reminder_frequency || !reminder_time) {
        console.log('邮件配置不完整，跳过邮件提醒任务');
        return;
      }

      // 停止现有的邮件提醒任务
      this.stopTask('email_reminder');

      // 根据提醒频率生成cron表达式
      const cronExpression = this.generateCronExpression(reminder_frequency, reminder_time);
      
      if (!cronExpression) {
        console.log('无效的提醒频率配置');
        return;
      }

      // 创建新的定时任务
      const task = cron.schedule(cronExpression, async () => {
        console.log('执行邮件提醒任务...');
        try {
          const result = await emailService.checkAndSendReminder();
          console.log('邮件提醒任务执行结果:', result);
          
          // 更新任务执行记录
          await this.updateTaskRecord('email_reminder', 'email');
        } catch (error) {
          console.error('邮件提醒任务执行失败:', error);
        }
      }, {
        scheduled: true,
        timezone: 'Asia/Shanghai'
      });

      this.tasks.set('email_reminder', task);
      console.log(`邮件提醒任务已设置: ${cronExpression} (${reminder_frequency} at ${reminder_time})`);

    } catch (error) {
      console.error('设置邮件提醒任务失败:', error);
    }
  }

  // 生成cron表达式
  generateCronExpression(frequency, time) {
    if (!time) {
      return null;
    }

    // 解析时间 (HH:MM:SS 格式)
    const timeParts = time.split(':');
    if (timeParts.length < 2) {
      return null;
    }

    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    switch (frequency) {
      case 'daily':
        // 每天指定时间执行
        return `${minute} ${hour} * * *`;
      
      case 'weekly':
        // 每周一指定时间执行
        return `${minute} ${hour} * * 1`;
      
      case 'monthly':
        // 每月1号指定时间执行
        return `${minute} ${hour} 1 * *`;
      
      default:
        return null;
    }
  }

  // 停止指定任务
  stopTask(taskName) {
    const task = this.tasks.get(taskName);
    if (task) {
      task.stop();
      this.tasks.delete(taskName);
      console.log(`任务 ${taskName} 已停止`);
    }
  }

  // 重新启动邮件提醒任务
  async restartEmailReminderTask() {
    await this.setupEmailReminderTask();
  }

  // 更新任务执行记录
  async updateTaskRecord(taskName, taskType) {
    try {
      const pool = await getPool();
      const now = new Date();
      const query = `
        INSERT INTO scheduled_tasks (task_name, task_type, last_run_time, status)
        VALUES (?, ?, ?, 'active')
        ON DUPLICATE KEY UPDATE 
        last_run_time = VALUES(last_run_time),
        updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(query, [taskName, taskType, now]);
    } catch (error) {
      console.error('更新任务记录失败:', error);
    }
  }

  // 获取任务状态
  getTaskStatus(taskName) {
    const task = this.tasks.get(taskName);
    return {
      exists: !!task,
      running: task ? task.running : false
    };
  }

  // 手动执行邮件提醒任务
  async executeEmailReminderNow() {
    try {
      console.log('手动执行邮件提醒任务...');
      const result = await emailService.checkAndSendReminder();
      await this.updateTaskRecord('email_reminder_manual', 'email');
      return result;
    } catch (error) {
      console.error('手动执行邮件提醒任务失败:', error);
      return { success: false, message: error.message };
    }
  }

  // 停止所有任务
  stopAllTasks() {
    for (const [taskName, task] of this.tasks) {
      task.stop();
      console.log(`任务 ${taskName} 已停止`);
    }
    this.tasks.clear();
  }
}

module.exports = new SchedulerService();