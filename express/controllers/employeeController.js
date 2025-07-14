const db = require('../db');

/**
 * 获取所有人员列表
 */
exports.getAllEmployees = async (req, res) => {
  console.log('[DEBUG] 开始获取所有员工信息请求');
  console.log('收到获取所有人员请求');
  try {
    const pool = await db.getPool();
    const [employees] = await pool.execute('SELECT * FROM employees ORDER BY id DESC');
    console.log('获取人员成功，共', employees.length, '条记录');
    res.json({
      success: true,
      data: employees
    });
  } catch (err) {
    console.error('获取人员错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 添加新人员
 */
exports.addEmployee = async (req, res) => {
  console.log('收到添加人员请求:', req.body);
  try {
    const { name, employee_number, gender, workshop, position } = req.body;

    // 验证请求参数
    if (!name || !employee_number || !gender || !workshop || !position) {
      console.log('人员参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '所有字段都是必填项' });
    }

    // 检查工号是否已存在
    const pool = await db.getPool();
    const [existingEmployees] = await pool.execute('SELECT * FROM employees WHERE employee_number = ?', [employee_number]);
    if (existingEmployees.length > 0) {
      console.log('工号已存在:', employee_number);
      return res.status(400).json({ success: false, message: '工号已存在' });
    }

    // 插入新人员
    const [result] = await pool.execute(
      'INSERT INTO employees (name, employee_number, gender, workshop, position) VALUES (?, ?, ?, ?, ?)',
      [name, employee_number, gender, workshop, position]
    );

    console.log('添加人员成功，ID:', result.insertId);
    res.status(201).json({
      success: true,
      message: '人员添加成功',
      data: { id: result.insertId, name, employee_number, gender, workshop, position }
    });
  } catch (err) {
    console.error('添加人员错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 更新人员信息
 */
exports.updateEmployee = async (req, res) => {
  console.log('收到更新人员请求:', req.params.id, req.body);
  try {
    const { id } = req.params;
    const { name, employee_number, gender, workshop, position } = req.body;

    // 验证请求参数
    if (!name || !employee_number || !gender || !workshop || !position) {
      console.log('人员参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '所有字段都是必填项' });
    }

    // 检查工号是否已被其他人员使用
    const [existingEmployees] = await dbPool.execute(
      'SELECT * FROM employees WHERE employee_number = ? AND id != ?',
      [employee_number, id]
    );
    if (existingEmployees.length > 0) {
      console.log('工号已存在:', employee_number);
      return res.status(400).json({ success: false, message: '工号已存在' });
    }

    // 更新人员
    const [result] = await dbPool.execute(
      'UPDATE employees SET name = ?, employee_number = ?, gender = ?, workshop = ?, position = ? WHERE id = ?',
      [name, employee_number, gender, workshop, position, id]
    );

    if (result.affectedRows === 0) {
      console.log('更新人员失败，未找到ID为', id, '的人员');
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    console.log('更新人员成功，ID:', id);
    res.json({
      success: true,
      message: '人员更新成功',
      data: { id, name, employee_number, gender, workshop, position }
    });
  } catch (err) {
    console.error('更新人员错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 删除人员
 */
exports.deleteEmployee = async (req, res) => {
  console.log('收到删除人员请求:', req.params.id);
  try {
    const { id } = req.params;

    // 检查是否有关联的体检信息
    const [medicalExaminations] = await dbPool.execute('SELECT * FROM medical_examinations WHERE employee_number IN (SELECT employee_number FROM employees WHERE id = ?)', [id]);
    if (medicalExaminations.length > 0) {
      console.log('删除人员失败，该人员存在关联的体检信息:', id);
      return res.status(400).json({ success: false, message: '该人员存在关联的体检信息，无法删除' });
    }

    const [result] = await dbPool.execute('DELETE FROM employees WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      console.log('删除人员失败，未找到ID为', id, '的人员');
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    console.log('删除人员成功，ID:', id);
    res.json({
      success: true,
      message: '人员删除成功'
    });
  } catch (err) {
    console.error('删除人员错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 根据工号获取人员信息
 */
exports.getEmployeeByNumber = async (req, res) => {
  console.log('收到根据工号获取人员请求:', req.params.employee_number);
  try {
    const { employee_number } = req.params;

    const [employees] = await dbPool.execute('SELECT * FROM employees WHERE employee_number = ?', [employee_number]);

    if (employees.length === 0) {
      console.log('未找到工号为', employee_number, '的人员');
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    console.log('根据工号获取人员成功:', employee_number);
    res.json({
      success: true,
      data: employees[0]
    });
  } catch (err) {
    console.error('根据工号获取人员错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};