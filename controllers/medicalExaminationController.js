const { getPool } = require('../db');

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
    const { employee_number, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result } = req.body;
    const pool = await getPool();

    // 验证请求参数
    if (!employee_number || !examination_date || !audiometry_result || !dust_examination_result) {
      console.log('体检信息参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '工号、体检日期、电测听结果和粉尘结果为必填项' });
    }

    // 检查人员是否存在
    const [employees] = await pool.execute('SELECT * FROM employees WHERE employee_number = ?', [employee_number]);
    if (employees.length === 0) {
      console.log('人员不存在，工号:', employee_number);
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    // 插入新体检信息
    const [result] = await pool.execute(
      'INSERT INTO medical_examinations (employee_number, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [employee_number, examination_date, audiometry_result, dust_examination_result, need_recheck || 0, recheck_date || null, audiometry_recheck_result || null, dust_recheck_result || null]
    );

    console.log('添加体检信息成功，ID:', result.insertId);
    const [[employee]] = await pool.execute('SELECT name FROM employees WHERE employee_number = ?', [employee_number]);
    res.status(201).json({
      success: true,
      message: '体检信息添加成功',
      data: { id: result.insertId, employee_number, employee_name: employee ? employee.name : null, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result }
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
    const { employee_number, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result } = req.body;
    const pool = await getPool();

    // 验证请求参数
    if (!employee_number || !examination_date || !audiometry_result || !dust_examination_result) {
      console.log('体检信息参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '工号、体检日期、电测听结果和粉尘结果为必填项' });
    }

    // 检查人员是否存在
    const [employees] = await pool.execute('SELECT * FROM employees WHERE employee_number = ?', [employee_number]);
    if (employees.length === 0) {
      console.log('人员不存在，工号:', employee_number);
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    // 更新体检信息
    const [result] = await pool.execute(
      'UPDATE medical_examinations SET employee_number = ?, examination_date = ?, audiometry_result = ?, dust_examination_result = ?, need_recheck = ?, recheck_date = ?, audiometry_recheck_result = ?, dust_recheck_result = ? WHERE id = ?',
      [employee_number, examination_date, audiometry_result, dust_examination_result, need_recheck || 0, recheck_date || null, audiometry_recheck_result || null, dust_recheck_result || null, id]
    );

    if (result.affectedRows === 0) {
      console.log('更新体检信息失败，未找到ID为', id, '的体检信息');
      return res.status(404).json({ success: false, message: '体检信息不存在' });
    }

    console.log('更新体检信息成功，ID:', id);
    const [[employee]] = await pool.execute('SELECT name FROM employees WHERE employee_number = ?', [employee_number]);
    res.json({
      success: true,
      message: '体检信息更新成功',
      data: { id, employee_number, employee_name: employee ? employee.name : null, examination_date, audiometry_result, dust_examination_result, need_recheck, recheck_date, audiometry_recheck_result, dust_recheck_result }
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

    const [result] = await pool.execute('DELETE FROM medical_examinations WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      console.log('删除体检信息失败，未找到ID为', id, '的体检信息');
      return res.status(404).json({ success: false, message: '体检信息不存在' });
    }

    console.log('删除体检信息成功，ID:', id);
    res.json({
      success: true,
      message: '体检信息删除成功'
    });
  } catch (err) {
    console.error('删除体检信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};    