const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db');
const config = require('../config');

// 从配置中获取JWT密钥
const JWT_SECRET = config.getJWTSecret();

/**
 * 用户注册控制器
 */
exports.register = async (req, res) => {
  console.log('收到用户注册请求:', req.body);
  try {
    const { username, password, email, role } = req.body;

    // 验证请求参数
    if (!username || !password || !email) {
      console.log('注册参数不完整:', { username, password, email });
      return res.status(400).json({ success: false, message: '用户名、密码和邮箱为必填项' });
    }

    // 检查用户是否已存在
    const pool = await getPool();
      const [existingUsers] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      console.log('用户名已存在:', username);
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    // 密码加密
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('密码加密成功:', username);

    // 插入新用户
      const [result] = await pool.execute(
        'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, email, role || 'normal'] // 保持默认角色为普通用户
      );

    console.log('用户注册成功:', { id: result.insertId, username });
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: { userId: result.insertId, username, email, role: role || 'normal' }
    });
  } catch (err) {
    console.error('注册错误 - SQL状态:', err.sqlState);
      console.error('注册错误 - 代码:', err.code);
      console.error('注册错误 - 消息:', err.sqlMessage);
      console.error('注册错误 - 完整错误:', err);
    res.status(500).json({ success: false, message: '服务器注册错误', error: err.message });
  }
};

/**
 * 获取所有用户
 */
exports.getAllUsers = async (req, res) => {
  try {
    const pool = await getPool();
    const [users] = await pool.execute('SELECT id, username, email, role FROM users');
    
    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    console.error('获取所有用户错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};

/**
 * 获取当前用户信息
 */
exports.getMe = async (req, res) => {
  try {
    const pool = await getPool();
    const [users] = await pool.execute('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({
      success: true,
      data: users[0]
    });
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
};

/**
 * 用户登录控制器
 */
exports.login = async (req, res) => {
  console.log('收到用户登录请求:', req.body.username);
  try {
    const { username, password } = req.body;

    // 验证请求参数
    if (!username || !password) {
      console.log('登录参数不完整:', { username });
      return res.status(400).json({ success: false, message: '用户名和密码为必填项' });
    }

    // 查询用户
    const pool = await getPool();
      const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      console.log('用户不存在:', username);
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const user = users[0];
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('密码错误:', username);
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    console.log('登录成功，生成token:', username);

    res.json({
      success: true,
      message: '登录成功',
      data: { token, user: { id: user.id, username: user.username, email: user.email, role: user.role } }
    });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ success: false, message: '服务器登录错误', error: err.message });
  }
};

/**
 * 获取当前用户信息控制器
 */
exports.getMe = async (req, res) => {
  console.log('收到获取用户信息请求');
  try {
    // 从token中获取用户ID（实际项目需添加JWT验证中间件）
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('未提供token');
      return res.status(401).json({ success: false, message: '未授权访问' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const pool = await getPool();
      const [users] = await pool.execute('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.userId]);

    if (users.length === 0) {
      console.log('用户不存在:', decoded.userId);
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ success: false, message: '服务器错误', error: err.message });
  }
};