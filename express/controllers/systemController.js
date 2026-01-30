const { getPool } = require('../db');
const nodemailer = require('nodemailer');
const schedulerService = require('../services/schedulerService');
const emailService = require('../services/emailService');
const DatabaseDiagnostic = require('../utils/dbDiagnostic');

// 发送邮件模板测试邮件
const sendTemplateTestEmail = async (req, res) => {
  console.log('=== 开始发送邮件模板测试邮件 ===');
  
  try {
    const { test_recipients } = req.body;
    console.log('请求参数:', { test_recipients });
    
    const pool = await getPool();
    console.log('数据库连接池获取成功');
    
    const [rows] = await pool.query('SELECT * FROM email_config ORDER BY id DESC LIMIT 1');
    console.log('邮件配置查询结果:', rows.length > 0 ? '找到配置' : '未找到配置');
    
    if (rows.length === 0) {
      console.log('模板测试邮件发送失败：未配置邮件设置');
      return res.status(400).json({ success: false, message: '请先配置邮件设置' });
    }

    const config = rows[0];
    
    // 确定收件人：优先使用自定义收件人，否则使用配置中的默认收件人
    const recipients = test_recipients || config.recipient_email;
    if (!recipients) {
      console.log('模板测试邮件发送失败：未指定收件人');
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

    // 生成模拟的过期物品数据用于测试
    const mockExpiredItems = `【过期药品】
1. 阿莫西林胶囊 - 药房A区 (过期时间: ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')})
2. 布洛芬片 - 药房B区 (过期时间: ${new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')})

【过期物资】
1. 一次性注射器 - 物资库房1 (过期时间: ${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')})
2. 医用口罩 - 物资库房2 (过期时间: ${new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')})`;

    // 使用邮件模板并替换变量
    const emailTemplate = config.email_template || `尊敬的管理员：

您好！系统检测到以下物资或药品即将过期或已过期，请及时处理：

{EXPIRED_ITEMS}

请登录系统查看详细信息并及时处理过期物资和药品，确保库存管理的准确性。

此邮件由系统自动发送，请勿回复。

系统管理员
{CURRENT_DATE}`;

    const emailContent = emailTemplate
      .replace('{EXPIRED_ITEMS}', mockExpiredItems)
      .replace('{CURRENT_DATE}', new Date().toLocaleDateString('zh-CN'));

    // 发送模板测试邮件
    console.log('准备发送模板测试邮件...');
    
    // 初始化邮件服务
    const initResult = await emailService.initTransporter({
      smtp_host: config.smtp_host,
      smtp_port: parseInt(config.smtp_port),
      smtp_user: config.smtp_user,
      smtp_password: config.smtp_password
    });
    
    if (!initResult) {
      console.error('邮件服务初始化失败');
      return res.status(500).json({ 
        success: false, 
        message: '邮件服务初始化失败'
      });
    }
    
    // 使用emailService发送邮件
    const htmlContent = emailContent.replace(/\n/g, '<br>');
    const subject = config.email_subject || '【系统提醒】物资/药品过期通知';
    
    console.log('邮件选项:', {
      to: recipients,
      subject: subject,
      htmlLength: htmlContent.length
    });

    const sendResult = await emailService.sendEmail(recipients, subject, htmlContent, true);
    
    if (!sendResult.success) {
      throw new Error(sendResult.error);
    }
    
    console.log('邮件发送结果:', sendResult);
    console.log('=== 模板测试邮件发送成功 ===');
    
    res.json({ 
      success: true, 
      message: `邮件模板测试发送成功，已发送至：${recipients}`,
      recipients: recipients
    });
  } catch (error) {
    console.error('=== 发送模板测试邮件失败 ===');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    // 根据错误类型提供更具体的错误信息
    let errorMessage = '发送模板测试邮件失败';
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

// 获取SMTP配置
const getSmtpConfig = async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM smtp_config WHERE is_active = TRUE ORDER BY id DESC LIMIT 1');
    if (rows.length > 0) {
      // 不返回密码字段
      const { smtp_password, ...config } = rows[0];
      res.json({ success: true, data: config });
    } else {
      res.json({ success: true, data: {} });
    }
  } catch (error) {
    console.error('获取SMTP配置失败:', error);
    res.status(500).json({ success: false, message: '获取SMTP配置失败' });
  }
};

// 保存SMTP配置
const saveSmtpConfig = async (req, res) => {
  console.log('=== 开始保存SMTP配置 ===');
  console.log('请求体数据:', JSON.stringify(req.body, null, 2));
  
  try {
    const {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_password
    } = req.body;

    console.log('解析后的SMTP配置参数:');
    console.log('- SMTP主机:', smtp_host);
    console.log('- SMTP端口:', smtp_port);
    console.log('- SMTP用户:', smtp_user);
    console.log('- SMTP密码:', smtp_password ? '***已设置***' : '未设置');

    // 验证必填字段
    const missingFields = [];
    if (!smtp_host) missingFields.push('SMTP主机');
    if (!smtp_port) missingFields.push('SMTP端口');
    if (!smtp_user) missingFields.push('SMTP用户名');
    if (!smtp_password) missingFields.push('SMTP密码');

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
    console.log('检查现有SMTP配置...');
    const [existing] = await pool.query('SELECT id FROM smtp_config WHERE is_active = TRUE ORDER BY id DESC LIMIT 1');
    console.log('现有配置查询结果:', existing.length > 0 ? `找到配置ID: ${existing[0].id}` : '未找到现有配置');
    
    let result;
    if (existing.length > 0) {
      // 更新现有配置
      console.log('执行更新操作，配置ID:', existing[0].id);
      result = await pool.query(`
        UPDATE smtp_config SET 
        smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        smtp_host, smtp_port, smtp_user, smtp_password, existing[0].id
      ]);
      console.log('更新操作结果:', result[0]);
    } else {
      // 插入新配置
      console.log('执行插入操作...');
      result = await pool.query(`
        INSERT INTO smtp_config (
          smtp_host, smtp_port, smtp_user, smtp_password, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
      `, [
        smtp_host, smtp_port, smtp_user, smtp_password
      ]);
      console.log('插入操作结果:', result[0]);
    }

    console.log('=== SMTP配置保存成功 ===');
    res.json({ 
      success: true, 
      message: 'SMTP配置保存成功',
      configId: existing.length > 0 ? existing[0].id : result[0].insertId
    });

  } catch (error) {
    console.error('=== 保存SMTP配置失败 ===');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: '保存SMTP配置失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 获取邮件配置
const getEmailConfig = async (req, res) => {
  try {
    const pool = await getPool();
    
    // 获取邮件模板配置
    const [emailRows] = await pool.query('SELECT * FROM email_config ORDER BY id DESC LIMIT 1');
    
    // 获取SMTP配置（不返回密码）
    const [smtpRows] = await pool.query('SELECT smtp_host, smtp_port, smtp_user FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    
    let config = {};
    
    // 合并邮件模板配置
    if (emailRows.length > 0) {
      config = { ...emailRows[0] };
    }
    
    // 合并SMTP配置
    if (smtpRows.length > 0) {
      config = { ...config, ...smtpRows[0] };
    }
    
    res.json({ success: true, data: config });
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
      recipient_email,
      reminder_frequency,
      reminder_time,
      weekly_day,
      monthly_day,
      email_subject,
      email_template
    } = req.body;

    console.log('解析后的配置参数:');
    console.log('- 收件人邮箱:', recipient_email);
    console.log('- 提醒频率:', reminder_frequency);
    console.log('- 提醒时间:', reminder_time);
    console.log('- 每周的哪一天:', weekly_day);
    console.log('- 每月的哪一天:', monthly_day);
    console.log('- 邮件主题:', email_subject);
    console.log('- 邮件模板长度:', email_template ? email_template.length : 0);

    // 验证必填字段
    const missingFields = [];
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
        recipient_email = ?, reminder_frequency = ?, reminder_time = ?,
        weekly_day = ?, monthly_day = ?,
        email_subject = ?, email_template = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        recipient_email, reminder_frequency, reminder_time,
        weekly_day, monthly_day,
        email_subject, email_template, existing[0].id
      ]);
      console.log('更新操作结果:', result[0]);
    } else {
      // 插入新配置
      console.log('执行插入操作...');
      result = await pool.query(`
        INSERT INTO email_config (
          recipient_email, reminder_frequency, reminder_time,
          weekly_day, monthly_day,
          email_subject, email_template
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        recipient_email, reminder_frequency, reminder_time,
        weekly_day, monthly_day,
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
    
    // 获取邮件模板配置
    const [emailRows] = await pool.query('SELECT * FROM email_config ORDER BY id DESC LIMIT 1');
    console.log('邮件模板配置查询结果:', emailRows.length > 0 ? '找到配置' : '未找到配置');
    
    // 获取SMTP配置
    const [smtpRows] = await pool.query('SELECT * FROM smtp_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    console.log('SMTP配置查询结果:', smtpRows.length > 0 ? '找到配置' : '未找到配置');
    
    if (emailRows.length === 0 || smtpRows.length === 0) {
      console.log('测试邮件发送失败：配置不完整');
      return res.status(400).json({ 
        success: false, 
        message: '请先完成邮件配置和SMTP配置' 
      });
    }

    const emailConfig = emailRows[0];
    const smtpConfig = smtpRows[0];
    
    // 确定收件人：优先使用自定义收件人，否则使用配置中的默认收件人
    const recipients = test_recipients || emailConfig.recipient_email;
    if (!recipients) {
      console.log('测试邮件发送失败：未指定收件人');
      return res.status(400).json({ success: false, message: '请指定收件人邮箱' });
    }
    
    console.log('邮件配置信息:');
    console.log('- SMTP主机:', smtpConfig.smtp_host);
    console.log('- SMTP端口:', smtpConfig.smtp_port);
    console.log('- SMTP用户:', smtpConfig.smtp_user);
    console.log('- 收件人邮箱:', recipients);
    console.log('- 是否使用自定义收件人:', !!test_recipients);
    
    // 初始化邮件服务
    console.log('初始化邮件服务...');
    const initResult = await emailService.initTransporter({
      smtp_host: smtpConfig.smtp_host,
      smtp_port: parseInt(smtpConfig.smtp_port),
      smtp_user: smtpConfig.smtp_user,
      smtp_password: smtpConfig.smtp_password
    });
    
    console.log('邮件服务配置:', {
      smtp_host: smtpConfig.smtp_host,
      smtp_port: parseInt(smtpConfig.smtp_port),
      smtp_user: smtpConfig.smtp_user,
      smtp_password: '***隐藏***'
    });
    
    if (!initResult) {
      console.error('邮件服务初始化失败');
      return res.status(500).json({ 
        success: false, 
        message: '邮件服务初始化失败，请检查SMTP配置'
      });
    }
    
    console.log('邮件服务初始化成功');

    // 使用 emailService 获取过期和即将过期物品信息
    console.log('查询过期和即将过期物品...');
    const expiredItems = await emailService.getExpiredItems();
    console.log('过期物品统计:', {
      total: expiredItems.total,
      expiringSoonSupplies: expiredItems.expiringSoonSuppliesCount,
      expiringSoonMedicines: expiredItems.expiringSoonMedicinesCount
    });

    // 生成邮件内容
    let emailContent = emailService.generateEmailContent(expiredItems, emailConfig.email_template);
    let subject = `【测试邮件】${emailConfig.email_subject || '物资/药品过期通知'}`;
    
    if (!emailContent) {
      // 即使没有过期物品，测试邮件也应该发送，但提示没有过期物品
      console.log('没有过期或即将过期的物品，生成空内容提示');
      const today = new Date();
      const formattedToday = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      emailContent = `<p>尊敬的管理员：</p>
<p>这是系统测试邮件。</p>
<p>目前系统中没有已过期或即将过期（30天内）的物资/药品，因此无需处理。</p>
<p>系统管理员<br>${formattedToday}</p>`;
    }

    // 发送测试邮件
    console.log('准备发送测试邮件...');
    console.log('邮件选项:', {
      to: recipients,
      subject: subject,
      contentLength: emailContent.length
    });

    // 使用emailService发送邮件（会自动记录日志）
    const sendResult = await emailService.sendEmail(recipients, subject, emailContent, true);
    
    if (!sendResult.success) {
      throw new Error(sendResult.error);
    }
    
    console.log('邮件发送结果:', sendResult);
    console.log('=== 测试邮件发送成功 ===');
    
    res.json({ 
      success: true, 
      message: `测试邮件发送成功，已发送至：${recipients}`,
      recipients: recipients,
      expiredItemsCount: expiredItems.total
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
    console.log('开始检查过期物资和药品并发送提醒邮件...');
    
    // 使用emailService的checkAndSendReminder方法
    const result = await emailService.checkAndSendReminder();
    
    if (result.success) {
      console.log('过期提醒邮件发送成功:', result.message);
      if (result.expiredCount) {
        console.log(`共发现${result.expiredCount}个过期物品`);
      }
    } else {
      console.log('过期提醒邮件发送失败或无需发送:', result.message);
    }
    
    return result;
  } catch (error) {
    console.error('执行过期提醒任务失败:', error);
    return { success: false, message: error.message };
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
  getEmailConfig,
  saveEmailConfig,
  getSmtpConfig,
  saveSmtpConfig,
  sendTestEmail,
  sendTemplateTestEmail,
  checkAndSendReminder,
  databaseDiagnostic
};