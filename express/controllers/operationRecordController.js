const { dbPool } = require('../db');

/**
 * 获取所有操作记录
 */
exports.getAllOperationRecords = async (req, res) => {
  console.log('收到获取所有操作记录请求');
  try {
    const [records] = await dbPool.execute('SELECT * FROM operation_records ORDER BY operation_time DESC');
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
 * 添加操作记录
 * 该函数供其他控制器调用，不直接作为API接口
 */
exports.addOperationRecord = async (userId, operationType, operationDetails) => {
  try {
    const operationTime = new Date();
    await dbPool.execute(
      'INSERT INTO operation_records (user_id, operation_type, operation_details, operation_time) VALUES (?, ?, ?, ?)',
      [userId, operationType, operationDetails, operationTime]
    );
    console.log('操作记录添加成功:', { userId, operationType });
  } catch (err) {
    console.error('添加操作记录错误:', err);
  }
};