const { getPool } = require('../db');
const emailService = require('../services/emailService');

/**
 * 获取仪表盘统计数据
 * 只返回数量统计和过期情况，不返回完整数据列表
 */
exports.getDashboardStats = async (req, res) => {
  console.log('收到获取仪表盘统计数据请求');
  try {
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
      
      // 药品统计（总数和过期数）
      pool.execute(`
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE 
            WHEN expiration_date IS NOT NULL AND expiration_date < NOW() AND validity_period_days > 0 THEN 1
            ELSE 0
          END) as expired_count
        FROM medicines
      `),
      
      // 体检记录总数
      pool.execute('SELECT COUNT(*) as count FROM medical_examinations'),
      
      // 物资统计（总数和过期数）
      pool.execute(`
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE 
            WHEN expiration_date IS NOT NULL AND expiration_date < NOW() AND validity_period_days > 0 THEN 1
            ELSE 0
          END) as expired_count
        FROM supplies
      `),
      
      // 邮件提醒配置（联查用户表获取用户名）
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
    const examinationTotal = examinationCount[0]?.count || 0;
    const supplyTotal = supplyStats[0]?.total_count || 0;
    const supplyExpired = supplyStats[0]?.expired_count || 0;
    
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
        // 查询每个邮箱对应的用户名
        const emailPlaceholders = emails.map(() => '?').join(',');
        const [userRows] = await pool.execute(
          `SELECT email, name FROM users WHERE email IN (${emailPlaceholders})`,
          emails
        );
        
        // 创建邮箱到用户名的映射
        const emailToNameMap = {};
        userRows.forEach(user => {
          emailToNameMap[user.email] = user.name;
        });
        
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
    const dashboardData = {
      modules: [
        { name: '用户', value: userTotal },
        { name: '员工', value: employeeTotal },
        { name: '药品', value: medicineTotal },
        { name: '体检记录', value: examinationTotal },
        { name: '物资', value: supplyTotal }
      ],
      alerts: {
        expiredMedicines: medicineExpired,
        expiredSupplies: supplyExpired
      },
      rates: {
        medicineExpireRate: Number(medicineExpireRate.toFixed(1)),
        supplyExpireRate: Number(supplyExpireRate.toFixed(1))
      },
      emailService: emailServiceStatus
    };

    console.log('仪表盘统计数据获取成功:', {
      用户: userTotal,
      员工: employeeTotal,
      药品: `${medicineTotal}(${medicineExpired}过期)`,
      体检记录: examinationTotal,
      物资: `${supplyTotal}(${supplyExpired}过期)`,
      邮件服务: emailServiceStatus.configured ? '已配置' : '未配置'
    });

    res.json({
      success: true,
      data: dashboardData,
      message: '仪表盘统计数据获取成功'
    });

  } catch (error) {
    console.error('获取仪表盘统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表盘统计数据失败',
      error: error.message
    });
  }
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
        database: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      message: '系统运行正常'
    });

  } catch (error) {
    console.error('系统健康检查失败:', error);
    res.status(503).json({
      success: false,
      data: {
        database: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      message: '系统健康检查失败',
      error: error.message
    });
  }
};