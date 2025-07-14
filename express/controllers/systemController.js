const { getPool } = require('../db');

// 获取系统名称
const getSystemName = async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT system_name FROM system_config ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      res.json({ systemName: rows[0].system_name });
    } else {
      res.json({ systemName: '默认系统名称' });
    }
  } catch (error) {
    console.error('获取系统名称失败:', error);
    res.status(500).json({ error: '获取系统名称失败' });
  }
};

// 设置系统名称
const setSystemName = async (req, res) => {
  const { systemName } = req.body;
  if (!systemName) {
    return res.status(400).json({ error: '系统名称不能为空' });
  }
  try {
    const pool = await getPool();
    await pool.query('INSERT INTO system_config (system_name) VALUES (?)', [systemName]);
    res.json({ message: '系统名称设置成功' });
  } catch (error) {
    console.error('设置系统名称失败:', error);
    res.status(500).json({ error: '设置系统名称失败' });
  }
};

module.exports = {
  getSystemName,
  setSystemName
};