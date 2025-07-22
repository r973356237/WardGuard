const { getPool } = require('../db');

/**
 * 获取所有操作记录
 */
exports.getAllOperationRecords = async (req, res) => {
  console.log('收到获取所有操作记录请求');
  try {
    const pool = await getPool();
    const [records] = await pool.execute('SELECT * FROM operation_records ORDER BY operation_time DESC');
    console.log('获取操作记录成功，共', records.length, '条记录');
    res.json({
      success: true,
      data: records
    });
  } catch (err) {
    console.error('获取操作记录错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 获取用户操作记录
 */
exports.getUserOperationRecords = async (req, res) => {
  console.log('收到获取用户操作记录请求');
  try {
    const { userId } = req.params;
    const { limit = 50, page = 1, targetType } = req.query;
    
    const pool = await getPool();
    
    // 构建查询条件
    let query = 'SELECT r.*, u.username, u.name as user_name FROM operation_records r '
              + 'LEFT JOIN users u ON r.user_id = u.id ';
    const queryParams = [];
    
    // 添加过滤条件
    const whereConditions = [];
    
    // 用户ID过滤
    if (userId && userId !== 'all') {
      whereConditions.push('r.user_id = ?');
      queryParams.push(userId);
    }
    
    // 目标类型过滤
    if (targetType) {
      whereConditions.push('r.target_type = ?');
      queryParams.push(targetType);
    }
    
    // 添加WHERE子句
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // 添加排序和分页
    query += ' ORDER BY r.operation_time DESC LIMIT ? OFFSET ?';
    const pageSize = parseInt(limit);
    const offset = (parseInt(page) - 1) * pageSize;
    queryParams.push(pageSize, offset);
    
    // 执行查询
    const [records] = await pool.execute(query, queryParams);
    
    // 获取总记录数
    let countQuery = 'SELECT COUNT(*) as total FROM operation_records r';
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }
    const [countResult] = await pool.execute(countQuery, queryParams.slice(0, -2));
    const total = countResult[0].total;
    
    console.log('获取用户操作记录成功，共', records.length, '条记录');
    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error('获取用户操作记录错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 添加操作记录
 * 该函数供其他控制器调用，不直接作为API接口
 */
exports.addOperationRecord = async (userId, operationType, targetType, targetId, targetName, operationDetails) => {
  try {
    // 确保所有参数都有有效值，防止undefined导致SQL错误
    const safeUserId = userId || null;
    const safeOperationType = operationType || 'unknown';
    const safeTargetType = targetType || 'unknown';
    const safeTargetId = targetId || null;
    const safeTargetName = targetName || '';
    const safeOperationDetails = operationDetails ? JSON.stringify(operationDetails) : '{}';
    
    const pool = await getPool();
    const operationTime = new Date();
    await pool.execute(
      'INSERT INTO operation_records (user_id, operation_type, target_type, target_id, target_name, operation_details, operation_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [safeUserId, safeOperationType, safeTargetType, safeTargetId, safeTargetName, safeOperationDetails, operationTime]
    );
    console.log('操作记录添加成功:', { userId: safeUserId, operationType: safeOperationType, targetType: safeTargetType, targetId: safeTargetId });
    return true;
  } catch (err) {
    console.error('添加操作记录错误:', err);
    return false;
  }
};

/**
 * 获取操作记录详情
 */
exports.getOperationRecordDetail = async (req, res) => {
  console.log('收到获取操作记录详情请求');
  try {
    const { id } = req.params;
    const pool = await getPool();
    
    const [records] = await pool.execute(
      'SELECT r.*, u.username, u.name as user_name FROM operation_records r '
      + 'LEFT JOIN users u ON r.user_id = u.id '
      + 'WHERE r.id = ?',
      [id]
    );
    
    if (records.length === 0) {
      return res.status(404).json({ success: false, message: '操作记录不存在' });
    }
    
    console.log('获取操作记录详情成功');
    res.json({
      success: true,
      data: records[0]
    });
  } catch (err) {
    console.error('获取操作记录详情错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};