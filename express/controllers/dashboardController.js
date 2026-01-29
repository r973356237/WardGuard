const { getPool } = require('../db');
const emailService = require('../services/emailService');

// 缓存配置
const CACHE_TTL = 30 * 1000; // 缓存30秒
let dashboardCache = {
  data: null,
  timestamp: 0,
  isLoading: false
};

// 用户名缓存，避免重复查询
let userNameCache = new Map();
let userNameCacheTimestamp = 0;
const USER_CACHE_TTL = 5 * 60 * 1000; // 用户名缓存5分钟

/**
 * 预热数据库连接池
 */
const warmupConnectionPool = async () => {
  try {
    const pool = await getPool();
    if (pool) {
      // 创建几个连接并立即释放，预热连接池
      const connections = [];
      for (let i = 0; i < 3; i++) {
        try {
          const conn = await pool.getConnection();
          connections.push(conn);
        } catch (err) {
          console.warn('预热连接失败:', err.message);
        }
      }
      
      // 释放所有连接
      connections.forEach(conn => {
        try {
          conn.release();
        } catch (err) {
          console.warn('释放预热连接失败:', err.message);
        }
      });
      
      console.log('✅ 数据库连接池预热完成');
    }
  } catch (error) {
    console.warn('⚠️ 数据库连接池预热失败:', error.message);
  }
};

/**
 * 获取用户名映射（带缓存）
 */
const getUserNameMapping = async (pool, emails) => {
  const now = Date.now();
  
  // 检查缓存是否过期
  if (now - userNameCacheTimestamp > USER_CACHE_TTL) {
    userNameCache.clear();
    userNameCacheTimestamp = now;
  }
  
  // 找出需要查询的邮箱（不在缓存中的）
  const emailsToQuery = emails.filter(email => !userNameCache.has(email));
  
  // 如果有需要查询的邮箱，执行查询
  if (emailsToQuery.length > 0) {
    try {
      const emailPlaceholders = emailsToQuery.map(() => '?').join(',');
      const [userRows] = await pool.execute(
        `SELECT email, name FROM users WHERE email IN (${emailPlaceholders})`,
        emailsToQuery
      );
      
      // 更新缓存
      userRows.forEach(user => {
        userNameCache.set(user.email, user.name);
      });
      
      // 对于没有找到的邮箱，也缓存一个空值，避免重复查询
      emailsToQuery.forEach(email => {
        if (!userNameCache.has(email)) {
          userNameCache.set(email, null);
        }
      });
    } catch (error) {
      console.error('查询用户名失败:', error);
    }
  }
  
  // 构建结果映射
  const result = {};
  emails.forEach(email => {
    const name = userNameCache.get(email);
    result[email] = name || email; // 如果没有找到用户名，使用邮箱
  });
  
  return result;
};

/**
 * 获取仪表盘统计数据（带缓存）
 */
const fetchDashboardData = async () => {
  const pool = await getPool();
  
  // 检查数据库连接池是否有效
  if (!pool || typeof pool.execute !== 'function') {
    throw new Error('数据库连接池未正确初始化');
  }

  console.log('开始并行获取各模块统计数据...');

  // 并行执行所有统计查询，提高性能
  const [
    [userCount],
    [employeeCount], 
    [medicineStats],
    [examinationCount],
    [supplyStats],
    emailConfigResult,
    smtpConfigResult,
    emailLogsResult
  ] = await Promise.all([
    // 用户总数
    pool.execute('SELECT COUNT(*) as count FROM users'),
    
    // 员工总数
    pool.execute('SELECT COUNT(*) as count FROM employees'),
    
    // 药品统计（总数、过期数、即将到期数）
    pool.execute(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE 
          WHEN validity_period_days > 0 AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) < CURDATE() THEN 1
          ELSE 0
        END) as expired_count,
        SUM(CASE 
          WHEN validity_period_days > 0 
            AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) > CURDATE() 
            AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
          THEN 1
          ELSE 0
        END) as expiring_soon_count
      FROM medicines
    `),
    
    // 体检记录总数
    pool.execute('SELECT COUNT(*) as count FROM medical_examinations'),
    
    // 物资统计（总数、过期数、即将到期数）
    pool.execute(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE 
          WHEN validity_period_days > 0 AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) < CURDATE() THEN 1
          ELSE 0
        END) as expired_count,
        SUM(CASE 
          WHEN validity_period_days > 0 
            AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) > CURDATE() 
            AND DATE_ADD(production_date, INTERVAL validity_period_days DAY) <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
          THEN 1
          ELSE 0
        END) as expiring_soon_count
      FROM supplies
    `),
    
    // 邮件提醒配置
    pool.execute(`
      SELECT 
        ec.id, 
        ec.recipient_email, 
        ec.reminder_frequency, 
        ec.reminder_time, 
        ec.weekly_day, 
        ec.monthly_day, 
        ec.updated_at
      FROM email_config ec
      LIMIT 1
    `),
    
    // SMTP配置
    pool.execute('SELECT id, smtp_host, smtp_port, smtp_user, is_active, updated_at FROM smtp_config WHERE is_active = TRUE LIMIT 1'),
    
    // 最近邮件发送记录
    pool.execute('SELECT status, sent_at FROM email_logs ORDER BY sent_at DESC LIMIT 5')
  ]);

  // 提取统计数据
  const userTotal = userCount[0]?.count || 0;
  const employeeTotal = employeeCount[0]?.count || 0;
  const medicineTotal = medicineStats[0]?.total_count || 0;
  const medicineExpired = medicineStats[0]?.expired_count || 0;
  const medicineExpiringSoon = medicineStats[0]?.expiring_soon_count || 0;
  const examinationTotal = examinationCount[0]?.count || 0;
  const supplyTotal = supplyStats[0]?.total_count || 0;
  const supplyExpired = supplyStats[0]?.expired_count || 0;
  const supplyExpiringSoon = supplyStats[0]?.expiring_soon_count || 0;
  
  // 处理邮件服务状态信息
  const emailConfigRows = emailConfigResult[0] || [];
  const smtpConfigRows = smtpConfigResult[0] || [];
  const emailLogsRows = emailLogsResult[0] || [];
  
  const emailConfig = emailConfigRows[0] || null;
  const smtpConfig = smtpConfigRows[0] || null;
  const recentEmailLogs = emailLogsRows || [];

  // 计算过期比例
  const medicineExpireRate = medicineTotal > 0 ? (medicineExpired / medicineTotal) * 100 : 0;
  const supplyExpireRate = supplyTotal > 0 ? (supplyExpired / supplyTotal) * 100 : 0;

  // 处理收件人邮箱，转换为用户名显示
  let recipientDisplay = null;
  if (emailConfig && emailConfig.recipient_email) {
    // 支持逗号和分号两种分隔符
    const emails = emailConfig.recipient_email
      .split(/[,;]/)
      .map(email => email.trim())
      .filter(email => email);
    
    if (emails.length > 0) {
      // 使用缓存获取用户名映射
      const emailToNameMap = await getUserNameMapping(pool, emails);
      
      // 构建显示字符串：优先显示用户名，如果没有对应用户则显示邮箱
      const displayNames = emails.map(email => emailToNameMap[email] || email);
      recipientDisplay = displayNames.join('；'); // 使用中文分号
    }
  }

  // 确定邮件服务状态
  const emailServiceStatus = {
    configured: !!(emailConfig && smtpConfig),
    emailConfig: emailConfig ? {
      recipientEmail: recipientDisplay || emailConfig.recipient_email, // 显示用户名或邮箱
      reminderFrequency: emailConfig.reminder_frequency,
      weeklyDay: emailConfig.weekly_day,
      monthlyDay: emailConfig.monthly_day ? parseInt(emailConfig.monthly_day) : null,
      reminderTime: emailConfig.reminder_time ? emailConfig.reminder_time.toString() : null,
      lastUpdated: emailConfig.updated_at
    } : null,
    smtpConfigured: !!smtpConfig,
    lastEmailSent: recentEmailLogs.length > 0 ? recentEmailLogs[0].sent_at : null,
    recentEmailStatus: recentEmailLogs.length > 0 ? 
      recentEmailLogs.map(log => ({ status: log.status, sentAt: log.sent_at })) : []
  };
  
  // 构建响应数据
  return {
    modules: [
      { name: '用户', value: userTotal },
      { name: '员工', value: employeeTotal },
      { name: '药品', value: medicineTotal },
      { name: '体检记录', value: examinationTotal },
      { name: '物资', value: supplyTotal }
    ],
    alerts: {
      expiredMedicines: medicineExpired,
      expiringSoonMedicines: medicineExpiringSoon,
      expiredSupplies: supplyExpired,
      expiringSoonSupplies: supplyExpiringSoon
    },
    rates: {
      medicineExpireRate: Number(medicineExpireRate.toFixed(1)),
      supplyExpireRate: Number(supplyExpireRate.toFixed(1))
    },
    emailService: emailServiceStatus
  };
};

/**
 * 获取仪表盘统计数据
 * 只返回数量统计和过期情况，不返回完整数据列表
 */
exports.getDashboardStats = async (req, res) => {
  console.log('收到获取仪表盘统计数据请求');
  
  try {
    const now = Date.now();
    
    // 检查缓存是否有效
    if (dashboardCache.data && (now - dashboardCache.timestamp) < CACHE_TTL) {
      console.log('✅ 返回缓存的仪表盘数据');
      return res.json({
        success: true,
        data: dashboardCache.data,
        message: '仪表盘统计数据获取成功（缓存）',
        cached: true
      });
    }
    
    // 如果正在加载数据，等待加载完成
    if (dashboardCache.isLoading) {
      console.log('⏳ 数据正在加载中，等待完成...');
      
      // 等待最多5秒
      let waitTime = 0;
      while (dashboardCache.isLoading && waitTime < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitTime += 100;
      }
      
      // 如果等待后有缓存数据，返回缓存
      if (dashboardCache.data) {
        return res.json({
          success: true,
          data: dashboardCache.data,
          message: '仪表盘统计数据获取成功（等待后缓存）',
          cached: true
        });
      }
    }
    
    // 标记正在加载
    dashboardCache.isLoading = true;
    
    try {
      // 获取新数据
      const dashboardData = await fetchDashboardData();
      
      // 更新缓存
      dashboardCache.data = dashboardData;
      dashboardCache.timestamp = now;
      
      console.log('仪表盘统计数据获取成功:', {
        用户: dashboardData.modules[0].value,
        员工: dashboardData.modules[1].value,
        药品: `${dashboardData.modules[2].value}(${dashboardData.alerts.expiredMedicines}过期, ${dashboardData.alerts.expiringSoonMedicines}即将过期)`,
        体检记录: dashboardData.modules[3].value,
        物资: `${dashboardData.modules[4].value}(${dashboardData.alerts.expiredSupplies}过期, ${dashboardData.alerts.expiringSoonSupplies}即将过期)`,
        邮件服务: dashboardData.emailService.configured ? '已配置' : '未配置'
      });

      res.json({
        success: true,
        data: dashboardData,
        message: '仪表盘统计数据获取成功',
        cached: false
      });
      
    } finally {
      // 清除加载标记
      dashboardCache.isLoading = false;
    }

  } catch (error) {
    // 清除加载标记
    dashboardCache.isLoading = false;
    
    console.error('获取仪表盘统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表盘统计数据失败',
      error: error.message
    });
  }
};

/**
 * 清除仪表盘缓存（用于数据更新后）
 */
exports.clearDashboardCache = () => {
  dashboardCache.data = null;
  dashboardCache.timestamp = 0;
  userNameCache.clear();
  userNameCacheTimestamp = 0;
  console.log('✅ 仪表盘缓存已清除');
};

/**
 * 获取系统健康状态
 */
exports.getSystemHealth = async (req, res) => {
  console.log('收到获取系统健康状态请求');
  try {
    const pool = await getPool();
    
    // 简单的数据库连接测试
    const [result] = await pool.execute('SELECT 1 as test');
    
    res.json({
      success: true,
      data: {
        database: 'connected',
        timestamp: new Date().toISOString()
      },
      message: '系统健康状态正常'
    });

  } catch (error) {
    console.error('系统健康检查失败:', error);
    res.status(500).json({
      success: false,
      message: '系统健康检查失败',
      error: error.message
    });
  }
};

// 预热连接池（在模块加载时执行）
setTimeout(() => {
  warmupConnectionPool();
}, 1000);