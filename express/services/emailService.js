const nodemailer = require('nodemailer');
const { getPool } = require('../db');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  // 初始化邮件传输器
  async initTransporter(config) {
    try {
      this.transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_port === 465, // true for 465, false for other ports
        auth: {
          user: config.smtp_user,
          pass: config.smtp_password
        }
      });

      // 验证连接
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('邮件服务初始化失败:', error);
      return false;
    }
  }

  // 发送邮件
  async sendEmail(to, subject, content, isHtml = true) {
    try {
      if (!this.transporter) {
        throw new Error('邮件传输器未初始化');
      }

      const mailOptions = {
        from: this.transporter.options.auth.user,
        to: to,
        subject: subject,
        [isHtml ? 'html' : 'text']: content
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // 记录发送日志
      await this.logEmail(to, subject, content, 'success', null);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('邮件发送失败:', error);
      
      // 记录失败日志
      await this.logEmail(to, subject, content, 'failed', error.message);
      
      return { success: false, error: error.message };
    }
  }

  // 记录邮件发送日志
  async logEmail(recipient, subject, content, status, errorMessage = null) {
    try {
      const pool = await getPool();
      const query = `
        INSERT INTO email_logs (recipient, subject, content, status, error_message)
        VALUES (?, ?, ?, ?, ?)
      `;
      await pool.query(query, [recipient, subject, content, status, errorMessage]);
    } catch (error) {
      console.error('记录邮件日志失败:', error);
    }
  }

  // 获取过期物资和药品信息
  async getExpiredItems() {
    try {
      const pool = await getPool();
      const today = new Date().toISOString().split('T')[0];
      
      // 查询过期物资，排除有效期为0的物资
      const expiredSuppliesQuery = `
        SELECT s.supply_name as name, DATE_ADD(s.production_date, INTERVAL s.validity_period_days DAY) as expiry_date, s.supply_number as quantity, '个' as unit, 'supplies' as type
        FROM supplies s
        WHERE DATE_ADD(s.production_date, INTERVAL s.validity_period_days DAY) <= ? AND s.supply_number > 0 AND s.validity_period_days > 0
        ORDER BY expiry_date ASC
      `;
      
      // 查询过期药品
      const expiredMedicinesQuery = `
        SELECT m.medicine_name as name, DATE_ADD(m.production_date, INTERVAL m.validity_period_days DAY) as expiry_date, m.quantity, '盒' as unit, 'medicines' as type
        FROM medicines m
        WHERE DATE_ADD(m.production_date, INTERVAL m.validity_period_days DAY) <= ? AND m.quantity > 0 AND m.validity_period_days > 0
        ORDER BY expiry_date ASC
      `;

      const [expiredSupplies] = await pool.query(expiredSuppliesQuery, [today]);
      const [expiredMedicines] = await pool.query(expiredMedicinesQuery, [today]);

      return {
        supplies: expiredSupplies || [],
        medicines: expiredMedicines || [],
        total: (expiredSupplies?.length || 0) + (expiredMedicines?.length || 0)
      };
    } catch (error) {
      console.error('获取过期物资信息失败:', error);
      return { supplies: [], medicines: [], total: 0 };
    }
  }

  // 生成邮件内容
  generateEmailContent(expiredItems, template) {
    const { supplies, medicines, total } = expiredItems;
    
    if (total === 0) {
      return null; // 没有过期物资，不发送邮件
    }

    let content = template || `
      <h2>【系统提醒】物资/药品过期通知</h2>
      <p>您好，</p>
      <p>系统检测到以下物资或药品已过期，请及时处理：</p>
    `;

    if (supplies.length > 0) {
      content += `
        <h3>过期物资 (${supplies.length}项)</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th>物资名称</th>
              <th>过期日期</th>
              <th>剩余数量</th>
              <th>单位</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      supplies.forEach(item => {
        content += `
          <tr>
            <td>${item.name}</td>
            <td>${item.expiry_date}</td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
          </tr>
        `;
      });
      
      content += `
          </tbody>
        </table>
        <br>
      `;
    }

    if (medicines.length > 0) {
      content += `
        <h3>过期药品 (${medicines.length}项)</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th>药品名称</th>
              <th>过期日期</th>
              <th>剩余数量</th>
              <th>单位</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      medicines.forEach(item => {
        content += `
          <tr>
            <td>${item.name}</td>
            <td>${item.expiry_date}</td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
          </tr>
        `;
      });
      
      content += `
          </tbody>
        </table>
        <br>
      `;
    }

    content += `
      <p>请及时处理以上过期物资和药品，确保库存管理的准确性。</p>
      <p>此邮件由系统自动发送，请勿回复。</p>
      <hr>
      <p style="color: #666; font-size: 12px;">发送时间：${new Date().toLocaleString('zh-CN')}</p>
    `;

    return content;
  }

  // 检查并发送过期提醒邮件
  async checkAndSendReminder() {
    try {
      const pool = await getPool();
      // 获取邮件配置
      const [emailConfigRows] = await pool.query('SELECT * FROM email_config LIMIT 1');
      if (!emailConfigRows || emailConfigRows.length === 0) {
        console.log('未配置邮件设置，跳过提醒');
        return { success: false, message: '未配置邮件设置' };
      }

      // 获取SMTP配置
      const [smtpConfigRows] = await pool.query('SELECT * FROM smtp_config WHERE is_active = TRUE ORDER BY id DESC LIMIT 1');
      if (!smtpConfigRows || smtpConfigRows.length === 0) {
        console.log('未配置SMTP设置，跳过提醒');
        return { success: false, message: '未配置SMTP设置' };
      }

      // 合并配置
      const config = {
        ...emailConfigRows[0],
        ...smtpConfigRows[0]
      };
      
      // 初始化邮件传输器
      const initResult = await this.initTransporter(config);
      if (!initResult) {
        return { success: false, message: '邮件服务初始化失败' };
      }

      // 获取过期物资信息
      const expiredItems = await this.getExpiredItems();
      
      if (expiredItems.total === 0) {
        console.log('没有过期物资，无需发送提醒邮件');
        return { success: true, message: '没有过期物资' };
      }

      // 生成邮件内容
      const emailContent = this.generateEmailContent(expiredItems, config.email_template);
      
      if (!emailContent) {
        return { success: true, message: '没有需要提醒的内容' };
      }

      // 发送邮件
      const sendResult = await this.sendEmail(
        config.recipient_email,
        config.email_subject,
        emailContent,
        true
      );

      if (sendResult.success) {
        console.log('过期提醒邮件发送成功');
        return { success: true, message: '提醒邮件发送成功', expiredCount: expiredItems.total };
      } else {
        console.error('过期提醒邮件发送失败:', sendResult.error);
        return { success: false, message: sendResult.error };
      }
    } catch (error) {
      console.error('检查并发送过期提醒失败:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailService();