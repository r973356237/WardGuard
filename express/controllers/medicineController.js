const { getPool } = require('../db');
const { addOperationRecord } = require('./operationRecordController');
const ExcelJS = require('exceljs');
const path = require('path');

/**
 * 获取所有药品列表
 */
exports.getAllMedicines = async (req, res) => {
  console.log('收到获取所有药品请求');
  try {
    const pool = await getPool();
    const [medicines] = await pool.execute('SELECT * FROM medicines ORDER BY id DESC');
    console.log('获取药品成功，共', medicines.length, '条记录');
    res.json({ success: true, data: medicines });
  } catch (err) {
    console.error('获取药品错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 添加新药品
 */
exports.addMedicine = async (req, res) => {
  console.log('收到添加药品请求:', req.body);
  try {
    const pool = await getPool();
    const { medicine_name, storage_location, production_date, validity_period_days, quantity } = req.body;

    // 验证请求参数
    if (!medicine_name || !storage_location || !production_date || !validity_period_days || !quantity) {
      console.log('药品参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '所有字段都是必填项' });
    }

    // 计算过期日期
    const expiration_date = new Date(production_date);
    expiration_date.setDate(expiration_date.getDate() + parseInt(validity_period_days));

    // 插入新药品
    const [result] = await pool.execute(
      'INSERT INTO medicines (medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
      [medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date]
    );

    console.log('添加药品成功，ID:', result.insertId);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'create',
        'medicine',
        result.insertId,
        medicine_name,
        {
          medicine_name,
          storage_location,
          production_date,
          validity_period_days,
          quantity,
          expiration_date
        }
      );
      console.log('药品添加操作记录已保存');
    } catch (recordErr) {
      console.error('保存药品添加操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
    res.status(201).json({
      success: true,
      message: '药品添加成功',
      data: { id: result.insertId, medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date }
    });
  } catch (err) {
    console.error('添加药品错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 更新药品信息
 */
exports.updateMedicine = async (req, res) => {
  console.log('收到更新药品请求:', req.params.id, req.body);
  try {
    const pool = await getPool();
    const { id } = req.params;
    const { medicine_name, storage_location, production_date, validity_period_days, quantity } = req.body;

    // 验证请求参数
    if (!medicine_name || !storage_location || !production_date || !validity_period_days || !quantity) {
      console.log('药品参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '所有字段都是必填项' });
    }

    // 计算过期日期
    const expiration_date = new Date(production_date);
    expiration_date.setDate(expiration_date.getDate() + parseInt(validity_period_days));

    // 更新药品
    const [result] = await pool.execute(
      'UPDATE medicines SET medicine_name = ?, storage_location = ?, production_date = ?, validity_period_days = ?, quantity = ?, expiration_date = ? WHERE id = ?',
      [medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date, id]
    );

    if (result.affectedRows === 0) {
      console.log('更新药品失败，未找到ID为', id, '的药品');
      return res.status(404).json({ success: false, message: '药品不存在' });
    }

    console.log('更新药品成功，ID:', id);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'update',
        'medicine',
        id,
        medicine_name,
        {
          medicine_name,
          storage_location,
          production_date,
          validity_period_days,
          quantity,
          expiration_date
        }
      );
      console.log('药品更新操作记录已保存');
    } catch (recordErr) {
      console.error('保存药品更新操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
    res.json({
      success: true,
      message: '药品更新成功',
      data: { id, medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date }
    });
  } catch (err) {
    console.error('更新药品错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 导出药品列表
 */
exports.exportMedicines = async (req, res) => {
  try {
    const pool = await getPool();
    const [medicines] = await pool.execute('SELECT * FROM medicines ORDER BY id DESC');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('药品列表');

    // 设置表头
    worksheet.columns = [
      { header: '药品名称', key: 'medicine_name', width: 20 },
      { header: '存放位置', key: 'storage_location', width: 20 },
      { header: '生产日期', key: 'production_date', width: 15 },
      { header: '有效期(天)', key: 'validity_period_days', width: 12 },
      { header: '数量', key: 'medicine_number', width: 10 },
      { header: '过期日期', key: 'expiration_date', width: 15 }
    ];

    // 添加数据
    medicines.forEach(medicine => {
      worksheet.addRow({
        medicine_name: medicine.medicine_name,
        storage_location: medicine.storage_location,
        production_date: new Date(medicine.production_date).toLocaleDateString(),
        validity_period_days: medicine.validity_period_days,
        medicine_number: medicine.quantity,
        expiration_date: new Date(medicine.expiration_date).toLocaleDateString()
      });
    });

    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=medicines-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // 写入响应
    await workbook.xlsx.write(res);
    res.end();

    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'export',
        'medicine',
        null,
        '导出药品列表',
        { count: medicines.length }
      );
    } catch (recordErr) {
      console.error('保存药品导出操作记录失败:', recordErr.message);
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导出药品列表失败',
      error: err.message
    });
  }
};

/**
 * 删除药品
 */
exports.deleteMedicine = async (req, res) => {
  console.log('收到删除药品请求:', req.params.id);
  try {
    const pool = await getPool();
    const { id } = req.params;

    // 先获取药品信息用于操作记录
    const [medicineInfo] = await pool.execute('SELECT medicine_name FROM medicines WHERE id = ?', [id]);
    
    if (medicineInfo.length === 0) {
      console.log('删除药品失败，未找到ID为', id, '的药品');
      return res.status(404).json({ success: false, message: '药品不存在' });
    }

    const medicineName = medicineInfo[0].medicine_name;

    const [result] = await pool.execute('DELETE FROM medicines WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      console.log('删除药品失败，未找到ID为', id, '的药品');
      return res.status(404).json({ success: false, message: '药品不存在' });
    }

    console.log('删除药品成功，ID:', id);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'delete',
        'medicine',
        id,
        medicineName,
        {
          deleted_medicine_id: id,
          deleted_medicine_name: medicineName
        }
      );
      console.log('药品删除操作记录已保存');
    } catch (recordErr) {
      console.error('保存药品删除操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
    res.json({
      success: true,
      message: '药品删除成功'
    });
  } catch (err) {
    console.error('删除药品错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 批量导入药品
 */
exports.batchImportMedicines = async (req, res) => {
  console.log('收到批量导入药品请求，数据条数:', req.body.medicines?.length);
  let connection;
  
  try {
    const { medicines } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ success: false, message: '导入数据不能为空' });
    }

    const pool = await getPool();
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // 获取连接并开始事务
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      for (let i = 0; i < medicines.length; i++) {
        const medicine = medicines[i];
        const { 
          medicine_name, storage_location, production_date, 
          validity_period_days, quantity 
        } = medicine;

        try {
          // 验证必填参数
          if (!medicine_name || !storage_location || !production_date || !validity_period_days || !quantity) {
            results.failed++;
            results.errors.push(`第${i + 1}行：药品名称、存储位置、生产日期、有效期天数、数量为必填项`);
            continue;
          }

          // 计算过期日期
          const expiration_date = new Date(production_date);
          expiration_date.setDate(expiration_date.getDate() + parseInt(validity_period_days));

          // 插入药品数据
          const [result] = await connection.execute(
            'INSERT INTO medicines (medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
            [medicine_name, storage_location, production_date, validity_period_days, quantity, expiration_date]
          );

          // 添加操作记录
          try {
            await addOperationRecord(
              req.user?.id,
              'create',
              'medicine',
              result.insertId,
              medicine_name,
              {
                medicine_name,
                storage_location,
                production_date,
                validity_period_days,
                quantity,
                expiration_date,
                import_batch: true
              }
            );
          } catch (recordErr) {
            console.error('保存药品导入操作记录失败:', recordErr.message);
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`第${i + 1}行：${error.message}`);
          console.error(`导入第${i + 1}行药品失败:`, error);
        }
      }

      // 提交事务
      await connection.commit();

      console.log('批量导入药品完成，成功:', results.success, '失败:', results.failed);
      res.json({
        success: true,
        message: `批量导入完成，成功 ${results.success} 条，失败 ${results.failed} 条`,
        data: results
      });

    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    }

  } catch (err) {
    console.error('批量导入药品错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  } finally {
    // 释放连接
    if (connection) {
      connection.release();
    }
  }
};