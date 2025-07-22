const express = require('express');
const router = express.Router();
const { 
  getSystemName, 
  setSystemName, 
  getEmailConfig, 
  saveEmailConfig,
  getSmtpConfig,
  saveSmtpConfig,
  sendTestEmail,
  sendTemplateTestEmail,
  databaseDiagnostic
} = require('../controllers/systemController');

// 获取系统名称
router.get('/system-name', getSystemName);

// 设置系统名称
router.post('/system-name', setSystemName);

// 获取邮件配置
router.get('/email-config', getEmailConfig);

// 保存邮件配置
router.post('/email-config', saveEmailConfig);

// 获取SMTP配置
router.get('/smtp-config', getSmtpConfig);

// 保存SMTP配置
router.post('/smtp-config', saveSmtpConfig);

// 发送测试邮件
router.post('/test-email', sendTestEmail);

// 发送邮件模板测试
router.post('/test-template-email', sendTemplateTestEmail);

// 数据库诊断
router.get('/diagnostic', databaseDiagnostic);

module.exports = router;