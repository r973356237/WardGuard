const { getPool } = require('../db');
const { addOperationRecord } = require('./operationRecordController');
const ExcelJS = require('exceljs');
const path = require('path');

/**
 * 获取所有体检信息列表
 */
exports.getAllMedicalExaminations = async (req, res) => {
  console.log('收到获取所有体检信息请求');
  try {
    const pool = await getPool();
    const [medicalExaminations] = await pool.execute('SELECT medical_examinations.*, employees.name as employee_name FROM medical_examinations LEFT JOIN employees ON medical_examinations.employee_number = employees.employee_number ORDER BY medical_examinations.id DESC');
    console.log('获取体检信息成功，共', medicalExaminations.length, '条记录');
    res.json({
      success: true,
      data: medicalExaminations
    });
  } catch (err) {
    console.error('获取体检信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 导出体检记录
 */
exports.exportMedicalExaminations = async (req, res) => {
  try {
    const pool = await getPool();
    const [medicalExaminations] = await pool.execute('SELECT medical_examinations.*, employees.name as employee_name FROM medical_examinations LEFT JOIN employees ON medical_examinations.employee_number = employees.employee_number ORDER BY medical_examinations.id DESC');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('体检记录');

    // 设置表头
    worksheet.columns = [
      { header: '工号', key: 'employee_number', width: 15 },
      { header: '姓名', key: 'employee_name', width: 15 },
      { header: '体检日期', key: 'examination_date', width: 15 },
      { header: '听力检查结果', key: 'audiometry_result', width: 20 },
      { header: '粉尘检查结果', key: 'dust_examination_result', width: 20 },
      { header: '是否需要复查', key: 'need_recheck', width: 15 },
      { header: '复查日期', key: 'recheck_date', width: 15 },
      { header: '听力复查结果', key: 'audiometry_recheck_result', width: 20 },
      { header: '粉尘复查结果', key: 'dust_recheck_result', width: 20 }
    ];

    // 添加数据
    medicalExaminations.forEach(exam => {
      worksheet.addRow({
        employee_number: exam.employee_number,
        employee_name: exam.employee_name,
        examination_date: exam.examination_date ? new Date(exam.examination_date).toLocaleDateString() : '',
        audiometry_result: exam.audiometry_result,
        dust_examination_result: exam.dust_examination_result,
        need_recheck: exam.need_recheck ? '是' : '否',
        recheck_date: exam.recheck_date ? new Date(exam.recheck_date).toLocaleDateString() : '',
        audiometry_recheck_result: exam.audiometry_recheck_result || '',
        dust_recheck_result: exam.dust_recheck_result || ''
      });
    });

    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=medical-examinations-${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // 写入响应
    await workbook.xlsx.write(res);
    res.end();

    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'export',
        'medical_examination',
        null,
        '导出体检记录',
        { count: medicalExaminations.length }
      );
    } catch (recordErr) {
      console.error('保存体检记录导出操作记录失败:', recordErr.message);
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '导出体检记录失败',
      error: err.message
    });
  }
};

/**
 * 根据工号获取体检信息
 */
exports.getMedicalExaminationsByEmployeeNumber = async (req, res) => {
  console.log('收到根据工号获取体检信息请求:', req.params.employee_number);
  try {
    const { employee_number } = req.params;
    const pool = await getPool();

    // 先检查人员是否存在
    const [employees] = await pool.execute('SELECT * FROM employees WHERE employee_number = ?', [employee_number]);
    if (employees.length === 0) {
      console.log('人员不存在，工号:', employee_number);
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    const [medicalExaminations] = await pool.execute('SELECT medical_examinations.*, employees.name as employee_name FROM medical_examinations LEFT JOIN employees ON medical_examinations.employee_number = employees.employee_number WHERE medical_examinations.employee_number = ? ORDER BY medical_examination_date DESC', [employee_number]);
    console.log('根据工号获取体检信息成功，工号:', employee_number, '共', medicalExaminations.length, '条记录');
    res.json({
      success: true,
      data: medicalExaminations
    });
  } catch (err) {
    console.error('根据工号获取体检信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 添加新体检信息
 */
exports.addMedicalExamination = async (req, res) => {
  console.log('收到添加体检信息请求:', req.body);
  try {
    const { employee_number, employee_name, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result } = req.body;
    const pool = await getPool();

    // 验证请求参数
    if (!examination_date || !audiometry_result || !dust_examination_result) {
      console.log('体检信息参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '体检日期、电测听结果和粉尘结果为必填项' });
    }

    // 如果没有工号但有员工姓名，则通过姓名查询工号
    if (!employee_number && !employee_name) {
      console.log('工号和员工姓名都为空:', req.body);
      return res.status(400).json({ success: false, message: '工号或员工姓名至少需要提供一个' });
    }

    let finalEmployeeNumber = employee_number;
    let finalEmployeeName = employee_name;

    // 如果提供了员工姓名但没有工号，通过姓名查询工号
    if (!employee_number && employee_name) {
      const [employeesByName] = await pool.execute('SELECT employee_number, name FROM employees WHERE name = ?', [employee_name]);
      if (employeesByName.length === 0) {
        console.log('根据姓名未找到员工:', employee_name);
        return res.status(404).json({ success: false, message: '未找到该员工，请检查员工姓名是否正确' });
      }
      if (employeesByName.length > 1) {
        console.log('找到多个同名员工:', employee_name);
        return res.status(400).json({ success: false, message: '存在多个同名员工，请提供工号以确保准确性' });
      }
      finalEmployeeNumber = employeesByName[0].employee_number;
      finalEmployeeName = employeesByName[0].name;
      console.log('通过姓名查询到工号:', employee_name, '->', finalEmployeeNumber);
    }

    // 如果提供了工号，验证工号是否存在并获取员工姓名
    if (finalEmployeeNumber) {
      const [employees] = await pool.execute('SELECT employee_number, name FROM employees WHERE employee_number = ?', [finalEmployeeNumber]);
      if (employees.length === 0) {
        console.log('人员不存在，工号:', finalEmployeeNumber);
        return res.status(404).json({ success: false, message: '人员不存在' });
      }
      finalEmployeeName = employees[0].name;
    }

    // 插入新体检信息
    const [result] = await pool.execute(
      'INSERT INTO medical_examinations (employee_number, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [finalEmployeeNumber, examination_date, audiometry_result, dust_examination_result, need_recheck || 0, recheck_date || null, audiometry_recheck_result || null, dust_recheck_result || null]
    );

    console.log('添加体检信息成功，ID:', result.insertId, '工号:', finalEmployeeNumber, '姓名:', finalEmployeeName);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'create',
        'medical_examination',
        result.insertId,
        `体检信息-${finalEmployeeName}`,
        `添加了员工 ${finalEmployeeName}(${finalEmployeeNumber}) 的体检信息，体检日期：${examination_date}，电测听结果：${audiometry_result}，粉尘检查结果：${dust_examination_result}`
      );
    } catch (recordErr) {
      console.error('保存操作记录失败:', recordErr);
    }
    
    res.status(201).json({
      success: true,
      message: '体检信息添加成功',
      data: { 
        id: result.insertId, 
        employee_number: finalEmployeeNumber, 
        employee_name: finalEmployeeName, 
        examination_date, 
        audiometry_result, 
        dust_examination_result, 
        need_recheck, 
        recheck_date, 
        audiometry_recheck_result, 
        dust_recheck_result 
      }
    });
  } catch (err) {
    console.error('添加体检信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 更新体检信息
 */
exports.updateMedicalExamination = async (req, res) => {
  console.log('收到更新体检信息请求:', req.params.id, req.body);
  try {
    const { id } = req.params;
    const { employee_number, employee_name, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result } = req.body;
    const pool = await getPool();

    // 验证请求参数
    if (!examination_date || !audiometry_result || !dust_examination_result) {
      console.log('体检信息参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '体检日期、电测听结果和粉尘结果为必填项' });
    }

    // 如果没有工号但有员工姓名，则通过姓名查询工号
    if (!employee_number && !employee_name) {
      console.log('工号和员工姓名都为空:', req.body);
      return res.status(400).json({ success: false, message: '工号或员工姓名至少需要提供一个' });
    }

    let finalEmployeeNumber = employee_number;
    let finalEmployeeName = employee_name;

    // 如果提供了员工姓名但没有工号，通过姓名查询工号
    if (!employee_number && employee_name) {
      const [employeesByName] = await pool.execute('SELECT employee_number, name FROM employees WHERE name = ?', [employee_name]);
      if (employeesByName.length === 0) {
        console.log('根据姓名未找到员工:', employee_name);
        return res.status(404).json({ success: false, message: '未找到该员工，请检查员工姓名是否正确' });
      }
      if (employeesByName.length > 1) {
        console.log('找到多个同名员工:', employee_name);
        return res.status(400).json({ success: false, message: '存在多个同名员工，请提供工号以确保准确性' });
      }
      finalEmployeeNumber = employeesByName[0].employee_number;
      finalEmployeeName = employeesByName[0].name;
      console.log('通过姓名查询到工号:', employee_name, '->', finalEmployeeNumber);
    }

    // 如果提供了工号，验证工号是否存在并获取员工姓名
    if (finalEmployeeNumber) {
      const [employees] = await pool.execute('SELECT employee_number, name FROM employees WHERE employee_number = ?', [finalEmployeeNumber]);
      if (employees.length === 0) {
        console.log('人员不存在，工号:', finalEmployeeNumber);
        return res.status(404).json({ success: false, message: '人员不存在' });
      }
      finalEmployeeName = employees[0].name;
    }

    // 更新体检信息
    const [result] = await pool.execute(
      'UPDATE medical_examinations SET employee_number = ?, examination_date = ?, audiometry_result = ?, dust_examination_result = ?, need_recheck = ?, recheck_date = ?, audiometry_recheck_result = ?, dust_recheck_result = ? WHERE id = ?',
      [finalEmployeeNumber, examination_date, audiometry_result, dust_examination_result, need_recheck || 0, recheck_date || null, audiometry_recheck_result || null, dust_recheck_result || null, id]
    );

    if (result.affectedRows === 0) {
      console.log('更新体检信息失败，未找到ID为', id, '的体检信息');
      return res.status(404).json({ success: false, message: '体检信息不存在' });
    }

    console.log('更新体检信息成功，ID:', id, '工号:', finalEmployeeNumber, '姓名:', finalEmployeeName);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'update',
        'medical_examination',
        id,
        `体检信息-${finalEmployeeName}`,
        `修改了员工 ${finalEmployeeName}(${finalEmployeeNumber}) 的体检信息，体检日期：${examination_date}，电测听结果：${audiometry_result}，粉尘检查结果：${dust_examination_result}`
      );
    } catch (recordErr) {
      console.error('保存操作记录失败:', recordErr);
    }
    
    res.json({
      success: true,
      message: '体检信息更新成功',
      data: { 
        id, 
        employee_number: finalEmployeeNumber, 
        employee_name: finalEmployeeName, 
        examination_date, 
        audiometry_result, 
        dust_examination_result, 
        need_recheck, 
        recheck_date, 
        audiometry_recheck_result, 
        dust_recheck_result 
      }
    });
  } catch (err) {
    console.error('更新体检信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 删除体检信息
 */
exports.deleteMedicalExamination = async (req, res) => {
  console.log('收到删除体检信息请求:', req.params.id);
  try {
    const { id } = req.params;
    const pool = await getPool();

    // 先查询体检信息以获取员工信息
    const [examinations] = await pool.execute(
      'SELECT me.*, e.name as employee_name FROM medical_examinations me LEFT JOIN employees e ON me.employee_number = e.employee_number WHERE me.id = ?',
      [id]
    );

    if (examinations.length === 0) {
      console.log('删除体检信息失败，未找到ID为', id, '的体检信息');
      return res.status(404).json({ success: false, message: '体检信息不存在' });
    }

    const examination = examinations[0];
    const [result] = await pool.execute('DELETE FROM medical_examinations WHERE id = ?', [id]);

    console.log('删除体检信息成功，ID:', id);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'delete',
        'medical_examination',
        id,
        `体检信息-${examination.employee_name || examination.employee_number}`,
        `删除了员工 ${examination.employee_name || examination.employee_number}(${examination.employee_number}) 的体检信息，体检日期：${examination.examination_date}`
      );
    } catch (recordErr) {
      console.error('保存操作记录失败:', recordErr);
    }
    
    res.json({
      success: true,
      message: '体检信息删除成功'
    });
  } catch (err) {
    console.error('删除体检信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 批量导入体检记录
 */
exports.batchImportMedicalExaminations = async (req, res) => {
  console.log('收到批量导入体检记录请求，数据条数:', req.body.examinations?.length);
  try {
    const { examinations } = req.body;

    if (!examinations || !Array.isArray(examinations) || examinations.length === 0) {
      return res.status(400).json({ success: false, message: '导入数据不能为空' });
    }

    const pool = await getPool();
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // 开始事务
    await pool.execute('START TRANSACTION');

    try {
      for (let i = 0; i < examinations.length; i++) {
        const examination = examinations[i];
        const { 
          employee_number, employee_name, examination_date, 
          audiometry_result, dust_examination_result, need_recheck, 
          recheck_date, audiometry_recheck_result, dust_recheck_result 
        } = examination;

        try {
          // 验证必填参数
          if (!examination_date || !audiometry_result || !dust_examination_result) {
            results.failed++;
            results.errors.push(`第${i + 1}行：体检日期、电测听结果、粉尘检查结果为必填项`);
            continue;
          }

          // 如果没有工号但有员工姓名，则通过姓名查询工号
          if (!employee_number && !employee_name) {
            results.failed++;
            results.errors.push(`第${i + 1}行：工号或员工姓名至少需要提供一个`);
            continue;
          }

          let finalEmployeeNumber = employee_number;
          let finalEmployeeName = employee_name;

          // 如果提供了员工姓名但没有工号，通过姓名查询工号
          if (!employee_number && employee_name) {
            const [employeesByName] = await pool.execute('SELECT employee_number, name FROM employees WHERE name = ?', [employee_name]);
            if (employeesByName.length === 0) {
              results.failed++;
              results.errors.push(`第${i + 1}行：未找到员工 ${employee_name}`);
              continue;
            }
            if (employeesByName.length > 1) {
              results.failed++;
              results.errors.push(`第${i + 1}行：存在多个同名员工 ${employee_name}，请提供工号`);
              continue;
            }
            finalEmployeeNumber = employeesByName[0].employee_number;
            finalEmployeeName = employeesByName[0].name;
          }

          // 如果提供了工号，验证工号是否存在并获取员工姓名
          if (finalEmployeeNumber) {
            const [employees] = await pool.execute('SELECT employee_number, name FROM employees WHERE employee_number = ?', [finalEmployeeNumber]);
            if (employees.length === 0) {
              results.failed++;
              results.errors.push(`第${i + 1}行：工号 ${finalEmployeeNumber} 对应的员工不存在`);
              continue;
            }
            finalEmployeeName = employees[0].name;
          }

          // 插入体检记录数据
          const [result] = await pool.execute(
            'INSERT INTO medical_examinations (employee_number, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [finalEmployeeNumber, examination_date, audiometry_result, dust_examination_result, need_recheck || 0, recheck_date || null, audiometry_recheck_result || null, dust_recheck_result || null]
          );

          // 添加操作记录
          try {
            await addOperationRecord(
              req.user?.id,
              'create',
              'medical_examination',
              result.insertId,
              `体检信息-${finalEmployeeName}`,
              {
                employee_number: finalEmployeeNumber,
                employee_name: finalEmployeeName,
                examination_date,
                audiometry_result,
                dust_examination_result,
                need_recheck,
                recheck_date,
                audiometry_recheck_result,
                dust_recheck_result,
                import_batch: true
              }
            );
          } catch (recordErr) {
            console.error('保存体检记录导入操作记录失败:', recordErr.message);
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`第${i + 1}行：${error.message}`);
          console.error(`导入第${i + 1}行体检记录失败:`, error);
        }
      }

      // 提交事务
      await pool.execute('COMMIT');

      console.log('批量导入体检记录完成，成功:', results.success, '失败:', results.failed);
      res.json({
        success: true,
        message: `批量导入完成，成功 ${results.success} 条，失败 ${results.failed} 条`,
        data: results
      });

    } catch (error) {
      // 回滚事务
      await pool.execute('ROLLBACK');
      throw error;
    }

  } catch (err) {
    console.error('批量导入体检记录错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};