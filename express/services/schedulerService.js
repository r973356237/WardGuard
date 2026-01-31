const cron = require('node-cron');
const { getPool } = require('../db');
const emailService = require('./emailService');
const distributedLockService = require('./distributedLockService');

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

      // 获取邮件配置（需要所有配置字段）
      const [configRows] = await pool.query('SELECT reminder_frequency, reminder_time, weekly_day, monthly_day FROM email_config LIMIT 1');
      if (!configRows || configRows.length === 0) {
        console.log('未配置邮件设置，跳过邮件提醒任务');
        return;
      }

      const config = configRows[0];
      const { reminder_frequency, reminder_time, weekly_day, monthly_day } = config;

      // 验证配置数据
      if (!reminder_frequency || !reminder_time) {
        console.log('邮件配置不完整，跳过邮件提醒任务');
        return;
      }

      // 停止现有的邮件提醒任务
      this.stopTask('email_reminder');

      // 根据提醒频率生成cron表达式
      const cronExpression = this.generateCronExpression(reminder_frequency, reminder_time, weekly_day, monthly_day);
      
      if (!cronExpression) {
        console.log('无效的提醒频率配置');
        return;
      }

      // 创建新的定时任务（使用分布式锁防止重复执行）
      const task = cron.schedule(cronExpression, async () => {
        console.log('尝试执行邮件提醒任务...');
        
        // 尝试获取分布式锁（锁定30分钟）
        const lockAcquired = await distributedLockService.acquireLock('email_reminder_task', 30);
        
        if (!lockAcquired) {
          console.log('其他实例正在执行邮件提醒任务，跳过本次执行');
          return;
        }
        
        try {
          console.log('开始执行邮件提醒任务（已获取分布式锁）...');

          // === 新增：运行时配置检查 ===
          // 在多实例环境中，可能存在当前实例的定时任务未更新的情况
          // 再次从数据库获取最新配置，确保当前时间确实应该执行
          const pool = await getPool();
          const [latestConfigRows] = await pool.query('SELECT reminder_frequency, reminder_time, weekly_day, monthly_day FROM email_config LIMIT 1');
          
          if (latestConfigRows && latestConfigRows.length > 0) {
            const latestConfig = latestConfigRows[0];
            const shouldRun = this.checkIfShouldRun(latestConfig);
            
            if (!shouldRun) {
              console.log('检测到配置已变更，当前时间不符合最新配置，跳过执行并更新本地调度任务');
              // 触发自我更新，修复当前实例的过时配置
              this.setupEmailReminderTask();
              return;
            }
          }
          // === 检查结束 ===

          const result = await emailService.checkAndSendReminder();
          console.log('邮件提醒任务执行结果:', result);
          
          // 更新任务执行记录
          await this.updateTaskRecord('email_reminder', 'email');
        } catch (error) {
          console.error('邮件提醒任务执行失败:', error);
        } finally {
          // 释放分布式锁
          await distributedLockService.releaseLock('email_reminder_task');
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
  generateCronExpression(frequency, time, weeklyDay, monthlyDay) {
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
        // 每周指定时间执行
        // 如果未配置具体的周几，默认周一 (1)
        const dayOfWeek = (weeklyDay !== undefined && weeklyDay !== null) ? weeklyDay : 1;
        return `${minute} ${hour} * * ${dayOfWeek}`;
      
      case 'monthly':
        // 每月指定日期执行
        // 如果未配置具体的日期，默认1号
        const dayOfMonth = (monthlyDay !== undefined && monthlyDay !== null) ? monthlyDay : 1;
        return `${minute} ${hour} ${dayOfMonth} * *`;
      
      default:
        return null;
    }
  }

  // 检查当前时间是否应该运行任务（用于运行时配置检查）
  checkIfShouldRun(config) {
    const { reminder_frequency, reminder_time, weekly_day, monthly_day } = config;
    
    // 获取当前上海时间
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const shanghaiTime = new Date(utc + (3600000 * 8));
    
    const currentHour = shanghaiTime.getHours();
    const currentMinute = shanghaiTime.getMinutes();
    const currentDay = shanghaiTime.getDay(); // 0-6 (Sun-Sat)
    const currentDate = shanghaiTime.getDate(); // 1-31

    // 解析配置时间
    const [configHour, configMinute] = reminder_time.split(':').map(Number);
    
    // 检查时间 (允许 2 分钟内的误差，防止执行延迟导致判定失效)
    // 注意：如果 cron 是准点触发，这里误差应该很小。
    const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (configHour * 60 + configMinute));
    if (timeDiff > 2) {
      console.log(`时间不匹配: 当前 ${currentHour}:${currentMinute}, 配置 ${configHour}:${configMinute}`);
      return false;
    }

    if (reminder_frequency === 'daily') {
      return true;
    }
    
    if (reminder_frequency === 'weekly') {
      const targetDay = (weekly_day !== undefined && weekly_day !== null) ? parseInt(weekly_day) : 1;
      // 检查星期几是否匹配
      if (currentDay !== targetDay) {
        console.log(`星期不匹配: 当前周${currentDay}, 配置周${targetDay}`);
        return false;
      }
      return true;
    }

    if (reminder_frequency === 'monthly') {
      const targetDate = (monthly_day !== undefined && monthly_day !== null) ? parseInt(monthly_day) : 1;
      // 检查日期是否匹配
      if (currentDate !== targetDate) {
        console.log(`日期不匹配: 当前${currentDate}号, 配置${targetDate}号`);
        return false;
      }
      return true;
    }

    return false;
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
    console.log('尝试手动执行邮件提醒任务...');
    
    // 尝试获取分布式锁（锁定10分钟，手动执行时间较短）
    const lockAcquired = await distributedLockService.acquireLock('email_reminder_manual', 10);
    
    if (!lockAcquired) {
      console.log('其他实例正在执行邮件提醒任务，无法手动执行');
      return { success: false, message: '其他实例正在执行邮件提醒任务，请稍后再试' };
    }
    
    try {
      console.log('开始手动执行邮件提醒任务（已获取分布式锁）...');
      const result = await emailService.checkAndSendReminder();
      await this.updateTaskRecord('email_reminder_manual', 'email');
      return result;
    } catch (error) {
      console.error('手动执行邮件提醒任务失败:', error);
      return { success: false, message: error.message };
    } finally {
      // 释放分布式锁
      await distributedLockService.releaseLock('email_reminder_manual');
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