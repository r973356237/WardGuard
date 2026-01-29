const { getPool } = require('../db');
const { addOperationRecord } = require('./operationRecordController');
const ExcelJS = require('exceljs');
const path = require('path');

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
 * 导出物资列表
 */
exports.exportSupplies = async (req, res) => {
  try {
    const pool = await getPool();
    const [supplies] = await pool.execute('SELECT * FROM supplies ORDER BY id DESC');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('物资列表');

    // 设置表头
    worksheet.columns = [
      { header: '物资名称', key: 'supply_name', width: 20 },
      { header: '存放位置', key: 'storage_location', width: 20 },
      { header: '生产日期', key: 'production_date', width: 15 },
      { header: '有效期(天)', key: 'validity_period_days', width: 12 },
      { header: '数量', key: 'supply_number', width: 10 },
      { header: '过期日期', key: 'expiration_date', width: 15 }
    ];

    // 添加数据
    supplies.forEach(supply => {
      worksheet.addRow({
        supply_name: supply.supply_name,
        storage_location: supply.storage_location,
        production_date: new Date(supply.production_date).toLocaleDateString(),
        validity_period_days: supply.validity_period_days,
        supply_number: supply.supply_number,
        expiration_date: new Date(supply.expiration_date).toLocaleDateString()
      });
    });

    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=supplies-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // 写入响应
    await workbook.xlsx.write(res);
    res.end();

    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'export',
        'supply',
        null,
        '导出物资列表',
        { count: supplies.length }
      );
    } catch (recordErr) {
      console.error('保存物资导出操作记录失败:', recordErr.message);
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导出物资列表失败',
      error: err.message
    });
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
    if (!supply_name || !storage_location || !production_date || validity_period_days === undefined || validity_period_days === null || supply_number === undefined || supply_number === null) {
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
 * 导出物资列表
 */
exports.exportSupplies = async (req, res) => {
  try {
    const pool = await getPool();
    const [supplies] = await pool.execute('SELECT * FROM supplies ORDER BY id DESC');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('物资列表');

    // 设置表头
    worksheet.columns = [
      { header: '物资名称', key: 'supply_name', width: 20 },
      { header: '存放位置', key: 'storage_location', width: 20 },
      { header: '生产日期', key: 'production_date', width: 15 },
      { header: '有效期(天)', key: 'validity_period_days', width: 12 },
      { header: '数量', key: 'supply_number', width: 10 },
      { header: '过期日期', key: 'expiration_date', width: 15 }
    ];

    // 添加数据
    supplies.forEach(supply => {
      worksheet.addRow({
        supply_name: supply.supply_name,
        storage_location: supply.storage_location,
        production_date: new Date(supply.production_date).toLocaleDateString(),
        validity_period_days: supply.validity_period_days,
        supply_number: supply.supply_number,
        expiration_date: new Date(supply.expiration_date).toLocaleDateString()
      });
    });

    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=supplies-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // 写入响应
    await workbook.xlsx.write(res);
    res.end();

    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'export',
        'supply',
        null,
        '导出物资列表',
        { count: supplies.length }
      );
    } catch (recordErr) {
      console.error('保存物资导出操作记录失败:', recordErr.message);
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导出物资列表失败',
      error: err.message
    });
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
    if (!supply_name || !storage_location || !production_date || validity_period_days === undefined || validity_period_days === null || supply_number === undefined || supply_number === null) {
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

/**
 * 批量导入物资
 */
exports.batchImportSupplies = async (req, res) => {
  console.log('收到批量导入物资请求，数据条数:', req.body.supplies?.length);
  console.log('导入数据详情:', JSON.stringify(req.body.supplies, null, 2));
  let connection;
  
  try {
    const { supplies } = req.body;

    if (!supplies || !Array.isArray(supplies) || supplies.length === 0) {
      console.log('导入数据验证失败: 数据为空或不是数组');
      return res.status(400).json({ success: false, message: '导入数据不能为空' });
    }

    const pool = await getPool();
    
    // 检查数据库连接池
    if (!pool || typeof pool.getConnection !== 'function') {
      throw new Error('数据库连接池未正确初始化');
    }

    // 获取连接
    connection = await pool.getConnection();

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // 开始事务
    await connection.beginTransaction();

    try {
      for (let i = 0; i < supplies.length; i++) {
        const supply = supplies[i];
        console.log(`处理第${i + 1}行数据:`, JSON.stringify(supply, null, 2));
        
        // 使用前端传递的字段名
        const { 
          supply_name, storage_location, production_date, validity_period_days, supply_number
        } = supply;

        try {
          // 验证必填参数 - 根据数据库表结构，所有字段都是必填的
          console.log(`第${i + 1}行验证:`, {
            supply_name: !!supply_name,
            storage_location: !!storage_location,
            production_date: !!production_date,
            validity_period_days: !!validity_period_days,
            supply_number: !!supply_number
          });
          
          if (!supply_name || !storage_location || !production_date || validity_period_days === undefined || validity_period_days === null || supply_number === undefined || supply_number === null) {
            const errorMsg = `第${i + 1}行：物资名称、存储位置、生产日期、有效期天数、编号为必填项`;
            console.log('验证失败:', errorMsg);
            results.failed++;
            results.errors.push(errorMsg);
            continue;
          }

          // 计算过期日期
          const expiration_date = new Date(production_date);
          expiration_date.setDate(expiration_date.getDate() + parseInt(validity_period_days));

          // 插入物资数据 - 使用正确的数据库字段名
          console.log(`第${i + 1}行准备插入数据:`, {
            supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date
          });
          
          const [result] = await connection.execute(
            'INSERT INTO supplies (supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
            [supply_name, storage_location, production_date, validity_period_days, supply_number, expiration_date]
          );

          console.log(`第${i + 1}行插入成功，ID:`, result.insertId);

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
                expiration_date,
                import_batch: true
              }
            );
          } catch (recordErr) {
            console.error('保存物资导入操作记录失败:', recordErr.message);
          }

          results.success++;
        } catch (error) {
          results.failed++;
          const errorMsg = `第${i + 1}行：${error.message}`;
          results.errors.push(errorMsg);
          console.error(`导入第${i + 1}行物资失败:`, error);
          console.error('错误详情:', error.stack);
        }
      }

      // 提交事务
      await connection.commit();

      console.log('批量导入物资完成，成功:', results.success, '失败:', results.failed);
      console.log('错误详情:', results.errors);
      
      res.json({
        success: true,
        message: `批量导入完成，成功 ${results.success} 条，失败 ${results.failed} 条`,
        data: results
      });

    } catch (error) {
      // 回滚事务
      await connection.rollback();
      console.error('事务执行失败，已回滚:', error);
      throw error;
    }

  } catch (err) {
    console.error('批量导入物资错误:', err);
    console.error('错误堆栈:', err.stack);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  } finally {
    // 释放连接
    if (connection) {
      connection.release();
    }
  }
};

/**
 * 批量更新物资
 */
exports.batchUpdateSupplies = async (req, res) => {
  console.log('收到批量更新物资请求:', req.body);
  let connection;
  
  try {
    const { ids, updateData } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要更新的物资' });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: '请提供要更新的数据' });
    }

    const pool = await getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const id of ids) {
        try {
          // 先获取原始物资信息
          const [originalSupply] = await connection.execute('SELECT * FROM supplies WHERE id = ?', [id]);
          
          if (originalSupply.length === 0) {
            results.failed++;
            results.errors.push(`ID ${id} 的物资不存在`);
            continue;
          }

          const original = originalSupply[0];
          
          // 构建更新数据，只更新提供的字段
          const fieldsToUpdate = [];
          const valuesToUpdate = [];
          
          if (updateData.supply_name !== undefined && updateData.supply_name !== null) {
            fieldsToUpdate.push('supply_name = ?');
            valuesToUpdate.push(updateData.supply_name);
          }
          
          if (updateData.storage_location !== undefined && updateData.storage_location !== null) {
            fieldsToUpdate.push('storage_location = ?');
            valuesToUpdate.push(updateData.storage_location);
          }
          
          if (updateData.production_date !== undefined && updateData.production_date !== null) {
            fieldsToUpdate.push('production_date = ?');
            valuesToUpdate.push(updateData.production_date);
          }
          
          if (updateData.validity_period_days !== undefined && updateData.validity_period_days !== null) {
            fieldsToUpdate.push('validity_period_days = ?');
            valuesToUpdate.push(updateData.validity_period_days);
          }
          
          if (updateData.supply_number !== undefined && updateData.supply_number !== null) {
            fieldsToUpdate.push('supply_number = ?');
            valuesToUpdate.push(updateData.supply_number);
          }

          // 如果更新了生产日期或有效期，需要重新计算过期日期
          const isProdDateUpdated = updateData.production_date !== undefined && updateData.production_date !== null;
          const isValidityUpdated = updateData.validity_period_days !== undefined && updateData.validity_period_days !== null;

          if (isProdDateUpdated || isValidityUpdated) {
            const productionDate = isProdDateUpdated ? updateData.production_date : original.production_date;
            const validityDays = isValidityUpdated ? updateData.validity_period_days : original.validity_period_days;
            
            const expiration_date = new Date(productionDate);
            expiration_date.setDate(expiration_date.getDate() + parseInt(validityDays));
            
            fieldsToUpdate.push('expiration_date = ?');
            valuesToUpdate.push(expiration_date);
          }

          if (fieldsToUpdate.length === 0) {
            results.failed++;
            results.errors.push(`ID ${id} 没有需要更新的字段`);
            continue;
          }

          // 执行更新
          valuesToUpdate.push(id);
          const updateQuery = `UPDATE supplies SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
          
          const [result] = await connection.execute(updateQuery, valuesToUpdate);

          if (result.affectedRows > 0) {
            results.success++;
            
            // 添加操作记录
            try {
              await addOperationRecord(
                req.user?.id,
                'update',
                'supply',
                id,
                updateData.supply_name || original.supply_name,
                {
                  batch_update: true,
                  updated_fields: updateData,
                  original_data: original
                }
              );
            } catch (recordErr) {
              console.error('保存物资批量更新操作记录失败:', recordErr.message);
            }
          } else {
            results.failed++;
            results.errors.push(`ID ${id} 更新失败`);
          }

        } catch (error) {
          results.failed++;
          results.errors.push(`ID ${id} 更新失败: ${error.message}`);
          console.error(`批量更新物资 ID ${id} 失败:`, error);
        }
      }

      await connection.commit();

      console.log('批量更新物资完成，成功:', results.success, '失败:', results.failed);
      res.json({
        success: true,
        message: `批量更新完成，成功 ${results.success} 条，失败 ${results.failed} 条`,
        data: results
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (err) {
    console.error('批量更新物资错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * 批量删除物资
 */
exports.batchDeleteSupplies = async (req, res) => {
  console.log('收到批量删除物资请求:', req.body);
  let connection;
  
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的物资' });
    }

    const pool = await getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const id of ids) {
        try {
          // 先获取物资信息用于操作记录
          const [supplyInfo] = await connection.execute('SELECT supply_name FROM supplies WHERE id = ?', [id]);
          
          if (supplyInfo.length === 0) {
            results.failed++;
            results.errors.push(`ID ${id} 的物资不存在`);
            continue;
          }

          const supplyName = supplyInfo[0].supply_name;

          // 执行删除
          const [result] = await connection.execute('DELETE FROM supplies WHERE id = ?', [id]);

          if (result.affectedRows > 0) {
            results.success++;
            
            // 添加操作记录
            try {
              await addOperationRecord(
                req.user?.id,
                'delete',
                'supply',
                id,
                supplyName,
                {
                  batch_delete: true,
                  deleted_supply_id: id,
                  deleted_supply_name: supplyName
                }
              );
            } catch (recordErr) {
              console.error('保存物资批量删除操作记录失败:', recordErr.message);
            }
          } else {
            results.failed++;
            results.errors.push(`ID ${id} 删除失败`);
          }

        } catch (error) {
          results.failed++;
          results.errors.push(`ID ${id} 删除失败: ${error.message}`);
          console.error(`批量删除物资 ID ${id} 失败:`, error);
        }
      }

      await connection.commit();

      console.log('批量删除物资完成，成功:', results.success, '失败:', results.failed);
      res.json({
        success: true,
        message: `批量删除完成，成功 ${results.success} 条，失败 ${results.failed} 条`,
        data: results
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (err) {
    console.error('批量删除物资错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};