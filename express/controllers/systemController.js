const { getPool } = require('../db');
const nodemailer = require('nodemailer');
const schedulerService = require('../services/schedulerService');
const DatabaseDiagnostic = require('../utils/dbDiagnostic');

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

// 获取邮件配置
const getEmailConfig = async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM email_config ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      // 不返回密码字段
      const { smtp_password, ...config } = rows[0];
      res.json({ success: true, data: config });
    } else {
      res.json({ success: true, data: {} });
    }
  } catch (error) {
    console.error('获取邮件配置失败:', error);
    res.status(500).json({ success: false, message: '获取邮件配置失败' });
  }
};

// 保存邮件配置
const saveEmailConfig = async (req, res) => {
  console.log('=== 开始保存邮件配置 ===');
  console.log('请求体数据:', JSON.stringify(req.body, null, 2));
  
  // 执行数据库诊断
  console.log('执行数据库诊断...');
  const diagnostic = await DatabaseDiagnostic.fullDiagnostic();
  
  if (!diagnostic.connection.success) {
    console.error('数据库连接诊断失败:', diagnostic.connection);
    return res.status(500).json({
      success: false,
      message: '数据库连接失败',
      diagnostic: diagnostic.connection
    });
  }
  
  if (!diagnostic.tables.success) {
    console.error('数据库表结构诊断失败:', diagnostic.tables);
    return res.status(500).json({
      success: false,
      message: '数据库表结构异常',
      diagnostic: diagnostic.tables
    });
  }
  
  try {
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_password,
      recipient_email,
      reminder_frequency,
      reminder_time,
      email_subject,
      email_template
    } = req.body;

    console.log('解析后的配置参数:');
    console.log('- SMTP主机:', smtp_host);
    console.log('- SMTP端口:', smtp_port);
    console.log('- SMTP用户:', smtp_user);
    console.log('- SMTP密码:', smtp_password ? '***已设置***' : '未设置');
    console.log('- 收件人邮箱:', recipient_email);
    console.log('- 提醒频率:', reminder_frequency);
    console.log('- 提醒时间:', reminder_time);
    console.log('- 邮件主题:', email_subject);
    console.log('- 邮件模板长度:', email_template ? email_template.length : 0);

    // 验证必填字段
    const missingFields = [];
    if (!smtp_host) missingFields.push('SMTP主机');
    if (!smtp_port) missingFields.push('SMTP端口');
    if (!smtp_user) missingFields.push('SMTP用户名');
    if (!smtp_password) missingFields.push('SMTP密码');
    if (!recipient_email) missingFields.push('收件人邮箱');

    if (missingFields.length > 0) {
      console.log('验证失败，缺少必填字段:', missingFields);
      return res.status(400).json({ 
        success: false, 
        message: `请填写所有必填字段: ${missingFields.join(', ')}`,
        missingFields: missingFields
      });
    }

    console.log('字段验证通过，开始数据库操作...');

    const pool = await getPool();
    console.log('数据库连接池获取成功');
    
    // 检查是否已有配置
    console.log('检查现有配置...');
    const [existing] = await pool.query('SELECT id FROM email_config ORDER BY id DESC LIMIT 1');
    console.log('现有配置查询结果:', existing.length > 0 ? `找到配置ID: ${existing[0].id}` : '未找到现有配置');
    
    let result;
    if (existing.length > 0) {
      // 更新现有配置
      console.log('执行更新操作，配置ID:', existing[0].id);
      result = await pool.query(`
        UPDATE email_config SET 
        smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?,
        recipient_email = ?, reminder_frequency = ?, reminder_time = ?,
        email_subject = ?, email_template = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        smtp_host, smtp_port, smtp_user, smtp_password,
        recipient_email, reminder_frequency, reminder_time,
        email_subject, email_template, existing[0].id
      ]);
      console.log('更新操作结果:', result[0]);
    } else {
      // 插入新配置
      console.log('执行插入操作...');
      result = await pool.query(`
        INSERT INTO email_config (
          smtp_host, smtp_port, smtp_user, smtp_password,
          recipient_email, reminder_frequency, reminder_time,
          email_subject, email_template
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        smtp_host, smtp_port, smtp_user, smtp_password,
        recipient_email, reminder_frequency, reminder_time,
        email_subject, email_template
      ]);
      console.log('插入操作结果:', result[0]);
    }

    console.log('数据库操作完成，开始重启邮件提醒任务...');
    
    // 重新启动邮件提醒任务以应用新配置
    try {
      await schedulerService.restartEmailReminderTask();
      console.log('邮件提醒任务重启成功');
    } catch (schedulerError) {
      console.error('邮件提醒任务重启失败:', schedulerError);
      // 不阻断主流程，只记录错误
    }

    console.log('=== 邮件配置保存成功 ===');
    res.json({ success: true, message: '邮件配置保存成功，定时任务已更新' });
  } catch (error) {
    console.error('=== 保存邮件配置失败 ===');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 根据错误类型提供更具体的错误信息
    let errorMessage = '保存邮件配置失败';
    if (error.code) {
      console.error('数据库错误代码:', error.code);
      switch (error.code) {
        case 'ER_NO_SUCH_TABLE':
          errorMessage = '数据库表不存在，请检查数据库结构';
          break;
        case 'ER_ACCESS_DENIED_ERROR':
          errorMessage = '数据库访问权限不足';
          break;
        case 'ER_BAD_DB_ERROR':
          errorMessage = '数据库不存在或无法访问';
          break;
        case 'ECONNREFUSED':
          errorMessage = '无法连接到数据库服务器';
          break;
        default:
          errorMessage = `数据库操作失败: ${error.message}`;
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 发送测试邮件
const sendTestEmail = async (req, res) => {
  console.log('=== 开始发送测试邮件 ===');
  
  try {
    const { test_recipients } = req.body;
    console.log('请求参数:', { test_recipients });
    
    const pool = await getPool();
    console.log('数据库连接池获取成功');
    
    const [rows] = await pool.query('SELECT * FROM email_config ORDER BY id DESC LIMIT 1');
    console.log('邮件配置查询结果:', rows.length > 0 ? '找到配置' : '未找到配置');
    
    if (rows.length === 0) {
      console.log('测试邮件发送失败：未配置邮件设置');
      return res.status(400).json({ success: false, message: '请先配置邮件设置' });
    }

    const config = rows[0];
    
    // 确定收件人：优先使用自定义收件人，否则使用配置中的默认收件人
    const recipients = test_recipients || config.recipient_email;
    if (!recipients) {
      console.log('测试邮件发送失败：未指定收件人');
      return res.status(400).json({ success: false, message: '请指定收件人邮箱' });
    }
    
    console.log('邮件配置信息:');
    console.log('- SMTP主机:', config.smtp_host);
    console.log('- SMTP端口:', config.smtp_port);
    console.log('- SMTP用户:', config.smtp_user);
    console.log('- 收件人邮箱:', recipients);
    console.log('- 是否使用自定义收件人:', !!test_recipients);
    
    // 创建邮件传输器
    console.log('创建邮件传输器...');
    const transporterConfig = {
      host: config.smtp_host,
      port: parseInt(config.smtp_port),
      secure: parseInt(config.smtp_port) === 465, // 465端口使用SSL
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password
      }
    };
    console.log('传输器配置:', {
      ...transporterConfig,
      auth: { ...transporterConfig.auth, pass: '***隐藏***' }
    });
    
    const transporter = nodemailer.createTransport(transporterConfig);

    // 验证SMTP连接
    console.log('验证SMTP连接...');
    try {
      await transporter.verify();
      console.log('SMTP连接验证成功');
    } catch (verifyError) {
      console.error('SMTP连接验证失败:', verifyError);
      return res.status(500).json({ 
        success: false, 
        message: `SMTP连接失败: ${verifyError.message}`,
        error: process.env.NODE_ENV === 'development' ? verifyError.message : undefined
      });
    }

    // 发送测试邮件
    console.log('准备发送测试邮件...');
    const mailOptions = {
      from: config.smtp_user,
      to: recipients,
      subject: '【测试邮件】系统邮件功能测试',
      html: `
        <h3>邮件功能测试</h3>
        <p>这是一封测试邮件，用于验证系统邮件发送功能是否正常。</p>
        <p>如果您收到此邮件，说明邮件配置成功！</p>
        <hr>
        <p><strong>测试信息：</strong></p>
        <ul>
          <li>发送时间：${new Date().toLocaleString('zh-CN')}</li>
          <li>收件人：${recipients}</li>
          <li>测试类型：${test_recipients ? '自定义收件人测试' : '默认收件人测试'}</li>
        </ul>
        <hr>
        <p><small>此邮件由系统自动发送，请勿回复。</small></p>
      `
    };
    console.log('邮件选项:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html.length
    });

    const sendResult = await transporter.sendMail(mailOptions);
    console.log('邮件发送结果:', sendResult);
    console.log('=== 测试邮件发送成功 ===');
    
    res.json({ 
      success: true, 
      message: `测试邮件发送成功，已发送至：${recipients}`,
      recipients: recipients
    });
  } catch (error) {
    console.error('=== 发送测试邮件失败 ===');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 根据错误类型提供更具体的错误信息
    let errorMessage = '发送测试邮件失败';
    if (error.code) {
      console.error('错误代码:', error.code);
      switch (error.code) {
        case 'EAUTH':
          errorMessage = 'SMTP认证失败，请检查用户名和密码';
          break;
        case 'ECONNECTION':
          errorMessage = '无法连接到SMTP服务器，请检查主机和端口';
          break;
        case 'ETIMEDOUT':
          errorMessage = 'SMTP连接超时，请检查网络连接';
          break;
        case 'EENVELOPE':
          errorMessage = '邮件地址格式错误';
          break;
        default:
          errorMessage = `邮件发送失败: ${error.message}`;
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 检查过期物资和药品并发送提醒邮件
const checkAndSendReminder = async () => {
  try {
    const pool = await getPool();
    
    // 获取邮件配置
    const [emailConfig] = await pool.query('SELECT * FROM email_config ORDER BY id DESC LIMIT 1');
    if (emailConfig.length === 0) {
      console.log('未配置邮件设置，跳过提醒');
      return;
    }

    const config = emailConfig[0];
    
    // 查询过期的药品
    const [expiredMedicines] = await pool.query(`
      SELECT name, storage_location, 
             DATE_ADD(production_date, INTERVAL shelf_life DAY) as expiration_date
      FROM medicines 
      WHERE DATE_ADD(production_date, INTERVAL shelf_life DAY) <= CURDATE()
      ORDER BY expiration_date
    `);

    // 查询过期的物资
    const [expiredSupplies] = await pool.query(`
      SELECT name, storage_location,
             DATE_ADD(production_date, INTERVAL shelf_life DAY) as expiration_date
      FROM supplies 
      WHERE DATE_ADD(production_date, INTERVAL shelf_life DAY) <= CURDATE()
      ORDER BY expiration_date
    `);

    // 如果没有过期物品，不发送邮件
    if (expiredMedicines.length === 0 && expiredSupplies.length === 0) {
      console.log('没有过期物品，无需发送提醒邮件');
      return;
    }

    // 构建过期物品列表
    let expiredItemsList = '';
    
    if (expiredMedicines.length > 0) {
      expiredItemsList += '【过期药品】\n';
      expiredMedicines.forEach((item, index) => {
        expiredItemsList += `${index + 1}. ${item.name} - ${item.storage_location} (过期时间: ${item.expiration_date})\n`;
      });
      expiredItemsList += '\n';
    }

    if (expiredSupplies.length > 0) {
      expiredItemsList += '【过期物资】\n';
      expiredSupplies.forEach((item, index) => {
        expiredItemsList += `${index + 1}. ${item.name} - ${item.storage_location} (过期时间: ${item.expiration_date})\n`;
      });
    }

    // 替换邮件模板中的变量
    const emailContent = config.email_template
      .replace('{EXPIRED_ITEMS}', expiredItemsList)
      .replace('{CURRENT_DATE}', new Date().toLocaleDateString('zh-CN'));

    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port),
      secure: parseInt(config.smtp_port) === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password
      }
    });

    // 发送提醒邮件
    const mailOptions = {
      from: config.smtp_user,
      to: config.recipient_email,
      subject: config.email_subject,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>')
    };

    await transporter.sendMail(mailOptions);
    console.log('过期提醒邮件发送成功');
    
    // 记录发送日志
    await pool.query(`
      INSERT INTO email_logs (recipient, subject, content, status, sent_at)
      VALUES (?, ?, ?, 'success', NOW())
    `, [config.recipient_email, config.email_subject, emailContent]);

  } catch (error) {
    console.error('发送提醒邮件失败:', error);
    
    // 记录错误日志
    try {
      const pool = await getPool();
      await pool.query(`
        INSERT INTO email_logs (recipient, subject, content, status, error_message, sent_at)
        VALUES (?, ?, ?, 'failed', ?, NOW())
      `, ['', '过期提醒邮件', '', error.message]);
    } catch (logError) {
      console.error('记录邮件日志失败:', logError);
    }
  }
};

// 数据库诊断接口
const databaseDiagnostic = async (req, res) => {
  try {
    console.log('=== 执行数据库诊断 ===');
    const diagnostic = await DatabaseDiagnostic.fullDiagnostic();
    
    res.json({
      success: true,
      message: '数据库诊断完成',
      diagnostic
    });
  } catch (error) {
    console.error('数据库诊断失败:', error);
    res.status(500).json({
      success: false,
      message: '数据库诊断失败',
      error: error.message
    });
  }
};

module.exports = {
  getSystemName,
  setSystemName,
  getEmailConfig,
  saveEmailConfig,
  sendTestEmail,
  checkAndSendReminder,
  databaseDiagnostic
};