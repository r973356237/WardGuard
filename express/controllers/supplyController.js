const { getPool } = require('../db');
const { addOperationRecord } = require('./operationRecordController');

/**
 * 获取所有物资列表
 */
exports.getAllSupplies = async (req, res) => {
  console.log('收到获取所有物资请求');
  try {
    const pool = await getPool();
    
    // 关键改进：检查数据库连接池是否有效
    if (!pool || typeof pool.execute !== 'function') {
      throw new Error('数据库连接池未正确初始化');
    }
    
    console.log('数据库连接池获取成功');
    
    // 执行查询
    const [supplies] = await pool.execute('SELECT * FROM supplies ORDER BY id DESC');
    console.log('获取物资成功，共', supplies.length, '条记录');
    
    res.json({ success: true, data: supplies });
  } catch (err) {
    // 改进错误日志：输出完整错误信息和堆栈
    console.error('获取物资错误:', err.message);
    console.error('错误堆栈:', err.stack);
    
    // 区分不同类型的错误
    if (err.message.includes('connection')) {
      res.status(500).json({ 
        success: false, 
        message: '数据库连接失败', 
        error: err.message 
      });
    } else if (err.message.includes('syntax')) {
      res.status(500).json({ 
        success: false, 
        message: 'SQL查询语法错误', 
        error: err.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '服务器内部错误', 
        error: err.message 
      });
    }
  }
};

/**
 * 添加新物资
 */
exports.addSupply = async (req, res) => {
  console.log('收到添加物资请求:', req.body);
  try {
    const pool = await getPool();
    
    // 检查数据库连接池
    if (!pool || typeof pool.execute !== 'function') {
      throw new Error('数据库连接池未正确初始化');
    }
    
    const { supply_name, storage_location, production_date, validity_period_days, supply_number } = req.body;

    // 验证请求参数
    if (!supply_name || !storage_location || !production_date || !validity_period_days || !supply_number) {
      console.log('物资参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '所有字段都是必填项' });
    }

    // 计算过期日期
    const expiration_date = new Date(production_date);
    expiration_date.setDate(expiration_date.getDate() + parseInt(validity_period_days));

    // 插入新物资
    const [result] = await pool.execute(
      'INSERT INTO supplies (supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
      [supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date]
    );

    console.log('添加物资成功，ID:', result.insertId);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'create',
        'supply',
        result.insertId,
        supply_name,
        {
          supply_name,
          storage_location,
          production_date,
          validity_period_days,
          supply_number,
          expiration_date
        }
      );
      console.log('物资添加操作记录已保存');
    } catch (recordErr) {
      console.error('保存物资添加操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
    res.status(201).json({
      success: true,
      message: '物资添加成功',
      data: { id: result.insertId, supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date }
    });
  } catch (err) {
    console.error('添加物资错误:', err.message);
    console.error('错误堆栈:', err.stack);
    
    if (err.message.includes('Duplicate entry')) {
      res.status(400).json({ 
        success: false, 
        message: '物资已存在', 
        error: err.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '服务器内部错误', 
        error: err.message 
      });
    }
  }
};

/**
 * 更新物资信息
 */
exports.updateSupply = async (req, res) => {
  console.log('收到更新物资请求:', req.params.id, req.body);
  try {
    const pool = await getPool();
    
    // 检查数据库连接池
    if (!pool || typeof pool.execute !== 'function') {
      throw new Error('数据库连接池未正确初始化');
    }
    
    const { id } = req.params;
    const { supply_name, storage_location, production_date, validity_period_days, supply_number } = req.body;

    // 验证请求参数
    if (!supply_name || !storage_location || !production_date || !validity_period_days || !supply_number) {
      console.log('物资参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '所有字段都是必填项' });
    }

    // 计算过期日期
    const expiration_date = new Date(production_date);
    expiration_date.setDate(expiration_date.getDate() + parseInt(validity_period_days));

    // 更新物资
    const [result] = await pool.execute(
      'UPDATE supplies SET supply_name = ?, storage_location = ?, production_date = ?, validity_period_days = ?, supply_number = ?, expiration_date = ? WHERE id = ?',
      [supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date, id]
    );

    if (result.affectedRows === 0) {
      console.log('更新物资失败，未找到ID为', id, '的物资');
      return res.status(404).json({ success: false, message: '物资不存在' });
    }

    console.log('更新物资成功，ID:', id);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'update',
        'supply',
        id,
        supply_name,
        {
          supply_name,
          storage_location,
          production_date,
          validity_period_days,
          supply_number,
          expiration_date
        }
      );
      console.log('物资更新操作记录已保存');
    } catch (recordErr) {
      console.error('保存物资更新操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
    res.json({
      success: true,
      message: '物资更新成功',
      data: { id, supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date }
    });
  } catch (err) {
    console.error('更新物资错误:', err.message);
    console.error('错误堆栈:', err.stack);
    
    res.status(500).json({ 
      success: false, 
      message: '服务器内部错误', 
      error: err.message 
    });
  }
};

/**
 * 删除物资
 */
exports.deleteSupply = async (req, res) => {
  console.log('收到删除物资请求:', req.params.id);
  try {
    const pool = await getPool();
    
    // 检查数据库连接池
    if (!pool || typeof pool.execute !== 'function') {
      throw new Error('数据库连接池未正确初始化');
    }
    
    const { id } = req.params;

    // 先获取物资信息用于操作记录
    const [supplyInfo] = await pool.execute('SELECT supply_name FROM supplies WHERE id = ?', [id]);
    
    if (supplyInfo.length === 0) {
      console.log('删除物资失败，未找到ID为', id, '的物资');
      return res.status(404).json({ success: false, message: '物资不存在' });
    }

    const supplyName = supplyInfo[0].supply_name;

    const [result] = await pool.execute('DELETE FROM supplies WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      console.log('删除物资失败，未找到ID为', id, '的物资');
      return res.status(404).json({ success: false, message: '物资不存在' });
    }

    console.log('删除物资成功，ID:', id);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'delete',
        'supply',
        id,
        supplyName,
        {
          deleted_supply_id: id,
          deleted_supply_name: supplyName
        }
      );
      console.log('物资删除操作记录已保存');
    } catch (recordErr) {
      console.error('保存物资删除操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
    res.json({
      success: true,
      message: '物资删除成功'
    });
  } catch (err) {
    console.error('删除物资错误:', err.message);
    console.error('错误堆栈:', err.stack);
    
    if (err.message.includes('foreign key constraint')) {
      res.status(400).json({ 
        success: false, 
        message: '无法删除: 该物资有关联数据', 
        error: err.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '服务器内部错误', 
        error: err.message 
      });
    }
  }
};