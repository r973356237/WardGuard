const { getPool } = require('../db');

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
      [supplyStats]
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
            WHEN expiration_date IS NOT NULL AND expiration_date < NOW() THEN 1
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
            WHEN expiration_date IS NOT NULL AND expiration_date < NOW() THEN 1
            ELSE 0
          END) as expired_count
        FROM supplies
      `)
    ]);

    // 提取统计数据
    const userTotal = userCount[0]?.count || 0;
    const employeeTotal = employeeCount[0]?.count || 0;
    const medicineTotal = medicineStats[0]?.total_count || 0;
    const medicineExpired = medicineStats[0]?.expired_count || 0;
    const examinationTotal = examinationCount[0]?.count || 0;
    const supplyTotal = supplyStats[0]?.total_count || 0;
    const supplyExpired = supplyStats[0]?.expired_count || 0;

    // 计算过期比例
    const medicineExpireRate = medicineTotal > 0 ? (medicineExpired / medicineTotal) * 100 : 0;
    const supplyExpireRate = supplyTotal > 0 ? (supplyExpired / supplyTotal) * 100 : 0;

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
      }
    };

    console.log('仪表盘统计数据获取成功:', {
      用户: userTotal,
      员工: employeeTotal,
      药品: `${medicineTotal}(${medicineExpired}过期)`,
      体检记录: examinationTotal,
      物资: `${supplyTotal}(${supplyExpired}过期)`
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