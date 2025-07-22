const db = require('../db');
const { addOperationRecord } = require('./operationRecordController');

/**
 * 获取所有人员列表
 */
exports.getAllEmployees = async (req, res) => {
  console.log('[DEBUG] 开始获取所有员工信息请求');
  console.log('收到获取所有人员请求');
  try {
    const pool = await db.getPool();
    const [employees] = await pool.execute('SELECT * FROM employees ORDER BY id DESC');
    
    // 为每个员工重新计算总接害时间
    const updatedEmployees = employees.map(employee => {
      // 计算总接害时间：当前时间-入职时间+入职前接害时间
      let calculatedTotalExposureTime = 0;
      if (employee.hire_date) {
        const hireDate = new Date(employee.hire_date);
        const currentDate = new Date();
        // 计算工作年限（毫秒转换为年）
        const workYears = (currentDate - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
        // 总接害时间 = 工作年限 + 入职前接害时间
        calculatedTotalExposureTime = workYears + (parseFloat(employee.pre_hire_exposure_time) || 0);
        // 保留一位小数
        calculatedTotalExposureTime = parseFloat(calculatedTotalExposureTime.toFixed(1));
      } else {
        // 如果没有入职时间，则只计算入职前接害时间
        calculatedTotalExposureTime = parseFloat(employee.pre_hire_exposure_time) || 0;
      }
      
      // 更新员工对象的总接害时间
      return {
        ...employee,
        total_exposure_time: calculatedTotalExposureTime
      };
    });
    
    console.log('获取人员成功，共', updatedEmployees.length, '条记录');
    res.json({
      success: true,
      data: updatedEmployees
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
    const { 
      name, employee_number, gender, workshop, position,
      birth_date, hire_date, work_start_date, original_company,
      total_exposure_time, pre_hire_exposure_time, id_number
    } = req.body;

    // 验证必填参数
    if (!name || !employee_number || !gender || !workshop || !position) {
      console.log('人员基本参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '姓名、工号、性别、车间、职位为必填项' });
    }

    // 检查工号是否已存在
    const pool = await db.getPool();
    const [existingEmployees] = await pool.execute('SELECT * FROM employees WHERE employee_number = ?', [employee_number]);
    if (existingEmployees.length > 0) {
      console.log('工号已存在:', employee_number);
      return res.status(400).json({ success: false, message: '工号已存在' });
    }

    // 计算总接害时间：当前时间-入职时间+入职前接害时间
    let calculatedTotalExposureTime = 0;
    if (hire_date) {
      const hireDate = new Date(hire_date);
      const currentDate = new Date();
      // 计算工作年限（毫秒转换为年）
      const workYears = (currentDate - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
      // 总接害时间 = 工作年限 + 入职前接害时间
      calculatedTotalExposureTime = workYears + (parseFloat(pre_hire_exposure_time) || 0);
      // 保留一位小数
      calculatedTotalExposureTime = parseFloat(calculatedTotalExposureTime.toFixed(1));
    } else {
      // 如果没有入职时间，则只计算入职前接害时间
      calculatedTotalExposureTime = parseFloat(pre_hire_exposure_time) || 0;
    }
    
    console.log(`计算的总接害时间: ${calculatedTotalExposureTime}年`);
    
    // 插入新人员，包含新增字段
    const [result] = await pool.execute(
      `INSERT INTO employees (
        name, employee_number, gender, workshop, position,
        birth_date, hire_date, work_start_date, original_company,
        total_exposure_time, pre_hire_exposure_time, id_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, employee_number, gender, workshop, position,
        birth_date || null, hire_date || null, work_start_date || null, original_company || null,
        calculatedTotalExposureTime, pre_hire_exposure_time || 0, id_number || null
      ]
    );

    console.log('添加人员成功，ID:', result.insertId);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'create',
        'employee',
        result.insertId,
        name,
        {
          name,
          employee_number,
          gender,
          workshop,
          position,
          birth_date,
          hire_date,
          work_start_date,
          original_company,
          total_exposure_time: calculatedTotalExposureTime,
          pre_hire_exposure_time,
          id_number
        }
      );
      console.log('员工添加操作记录已保存');
    } catch (recordErr) {
      console.error('保存员工添加操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
    res.status(201).json({
      success: true,
      message: '人员添加成功',
      data: { 
        id: result.insertId, 
        name, employee_number, gender, workshop, position,
        birth_date, hire_date, work_start_date, original_company,
        total_exposure_time, pre_hire_exposure_time, id_number
      }
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
    const { 
      name, employee_number, gender, workshop, position,
      birth_date, hire_date, work_start_date, original_company,
      total_exposure_time, pre_hire_exposure_time, id_number
    } = req.body;

    // 验证必填参数
    if (!name || !employee_number || !gender || !workshop || !position) {
      console.log('人员基本参数不完整:', req.body);
      return res.status(400).json({ success: false, message: '姓名、工号、性别、车间、职位为必填项' });
    }

    // 获取数据库连接池
    const pool = await db.getPool();

    // 检查工号是否已被其他人员使用
    const [existingEmployees] = await pool.execute(
      'SELECT * FROM employees WHERE employee_number = ? AND id != ?',
      [employee_number, id]
    );
    if (existingEmployees.length > 0) {
      console.log('工号已存在:', employee_number);
      return res.status(400).json({ success: false, message: '工号已存在' });
    }

    // 计算总接害时间：当前时间-入职时间+入职前接害时间
    let calculatedTotalExposureTime = 0;
    if (hire_date) {
      const hireDate = new Date(hire_date);
      const currentDate = new Date();
      // 计算工作年限（毫秒转换为年）
      const workYears = (currentDate - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
      // 总接害时间 = 工作年限 + 入职前接害时间
      calculatedTotalExposureTime = workYears + (parseFloat(pre_hire_exposure_time) || 0);
      // 保留一位小数
      calculatedTotalExposureTime = parseFloat(calculatedTotalExposureTime.toFixed(1));
    } else {
      // 如果没有入职时间，则只计算入职前接害时间
      calculatedTotalExposureTime = parseFloat(pre_hire_exposure_time) || 0;
    }
    
    console.log(`计算的总接害时间: ${calculatedTotalExposureTime}年`);
    
    // 更新人员，包含新增字段
    const [result] = await pool.execute(
      `UPDATE employees SET 
        name = ?, employee_number = ?, gender = ?, workshop = ?, position = ?,
        birth_date = ?, hire_date = ?, work_start_date = ?, original_company = ?,
        total_exposure_time = ?, pre_hire_exposure_time = ?, id_number = ?
      WHERE id = ?`,
      [
        name, employee_number, gender, workshop, position,
        birth_date || null, hire_date || null, work_start_date || null, original_company || null,
        calculatedTotalExposureTime, pre_hire_exposure_time || 0, id_number || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      console.log('更新人员失败，未找到ID为', id, '的人员');
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    console.log('更新人员成功，ID:', id);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'update',
        'employee',
        id,
        name,
        {
          name,
          employee_number,
          gender,
          workshop,
          position,
          birth_date,
          hire_date,
          work_start_date,
          original_company,
          total_exposure_time: calculatedTotalExposureTime,
          pre_hire_exposure_time,
          id_number
        }
      );
      console.log('员工更新操作记录已保存');
    } catch (recordErr) {
      console.error('保存员工更新操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
    res.json({
      success: true,
      message: '人员更新成功',
      data: { 
        id, name, employee_number, gender, workshop, position,
        birth_date, hire_date, work_start_date, original_company,
        total_exposure_time, pre_hire_exposure_time, id_number
      }
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

    // 获取数据库连接池
    const pool = await db.getPool();
    
    // 先获取员工信息用于操作记录
    const [employeeInfo] = await pool.execute('SELECT name FROM employees WHERE id = ?', [id]);
    
    if (employeeInfo.length === 0) {
      console.log('删除人员失败，未找到ID为', id, '的人员');
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    const employeeName = employeeInfo[0].name;
    
    // 检查是否有关联的体检信息
    const [medicalExaminations] = await pool.execute('SELECT * FROM medical_examinations WHERE employee_number IN (SELECT employee_number FROM employees WHERE id = ?)', [id]);
    if (medicalExaminations.length > 0) {
      console.log('删除人员失败，该人员存在关联的体检信息:', id);
      return res.status(400).json({ success: false, message: '该人员存在关联的体检信息，无法删除' });
    }

    const [result] = await pool.execute('DELETE FROM employees WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      console.log('删除人员失败，未找到ID为', id, '的人员');
      return res.status(404).json({ success: false, message: '人员不存在' });
    }

    console.log('删除人员成功，ID:', id);
    
    // 添加操作记录
    try {
      await addOperationRecord(
        req.user?.id,
        'delete',
        'employee',
        id,
        employeeName,
        {
          deleted_employee_id: id,
          deleted_employee_name: employeeName
        }
      );
      console.log('员工删除操作记录已保存');
    } catch (recordErr) {
      console.error('保存员工删除操作记录失败:', recordErr.message);
      // 不影响主要操作，只记录错误
    }
    
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

    // 获取数据库连接池
    const pool = await db.getPool();
    
    const [employees] = await pool.execute('SELECT * FROM employees WHERE employee_number = ?', [employee_number]);

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