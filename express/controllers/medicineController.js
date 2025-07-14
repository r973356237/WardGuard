const { getPool } = require('../db');

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
 * 删除药品
 */
exports.deleteMedicine = async (req, res) => {
  console.log('收到删除药品请求:', req.params.id);
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [result] = await pool.execute('DELETE FROM medicines WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      console.log('删除药品失败，未找到ID为', id, '的药品');
      return res.status(404).json({ success: false, message: '药品不存在' });
    }

    console.log('删除药品成功，ID:', id);
    res.json({
      success: true,
      message: '药品删除成功'
    });
  } catch (err) {
    console.error('删除药品错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};