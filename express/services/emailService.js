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
      if (!pool) {
        console.log('数据库连接池未初始化，无法获取过期物资信息');
        return { supplies: [], medicines: [], total: 0 };
      }

      const today = new Date().toISOString().split('T')[0];
      
      // 查询过期物资，排除有效期为0的物资
      const expiredSuppliesQuery = `
        SELECT s.supply_name as name, DATE_ADD(s.production_date, INTERVAL s.validity_period_days DAY) as expiry_date, s.supply_number as quantity, s.storage_location, 'supplies' as type
        FROM supplies s
        WHERE DATE_ADD(s.production_date, INTERVAL s.validity_period_days DAY) <= ? AND s.supply_number > 0 AND s.validity_period_days > 0
        ORDER BY expiry_date ASC
      `;
      
      // 查询过期药品
      const expiredMedicinesQuery = `
        SELECT m.medicine_name as name, DATE_ADD(m.production_date, INTERVAL m.validity_period_days DAY) as expiry_date, m.quantity, m.storage_location, 'medicines' as type
        FROM medicines m
        WHERE DATE_ADD(m.production_date, INTERVAL m.validity_period_days DAY) <= ? AND m.quantity > 0 AND m.validity_period_days > 0
        ORDER BY expiry_date ASC
      `;

      const [expiredSupplies] = await pool.query(expiredSuppliesQuery, [today]);
      const [expiredMedicines] = await pool.query(expiredMedicinesQuery, [today]);

      // 查询即将到期物资数量 (从明天开始30天内)
      const expiringSoonSuppliesQuery = `
        SELECT COUNT(*) as count
        FROM supplies s
        WHERE s.supply_number > 0 
          AND s.validity_period_days > 0
          AND DATE_ADD(s.production_date, INTERVAL s.validity_period_days DAY) > ? 
          AND DATE_ADD(s.production_date, INTERVAL s.validity_period_days DAY) <= DATE_ADD(?, INTERVAL 30 DAY)
      `;

      // 查询即将到期药品数量 (从明天开始30天内)
      const expiringSoonMedicinesQuery = `
        SELECT COUNT(*) as count
        FROM medicines m
        WHERE m.quantity > 0 
          AND m.validity_period_days > 0
          AND DATE_ADD(m.production_date, INTERVAL m.validity_period_days DAY) > ? 
          AND DATE_ADD(m.production_date, INTERVAL m.validity_period_days DAY) <= DATE_ADD(?, INTERVAL 30 DAY)
      `;

      const [expiringSoonSuppliesResult] = await pool.query(expiringSoonSuppliesQuery, [today, today]);
      const [expiringSoonMedicinesResult] = await pool.query(expiringSoonMedicinesQuery, [today, today]);

      return {
        supplies: expiredSupplies || [],
        medicines: expiredMedicines || [],
        expiringSoonSuppliesCount: expiringSoonSuppliesResult[0]?.count || 0,
        expiringSoonMedicinesCount: expiringSoonMedicinesResult[0]?.count || 0,
        total: (expiredSupplies?.length || 0) + (expiredMedicines?.length || 0)
      };
    } catch (error) {
      console.error('获取过期物资信息失败:', error);
      return { supplies: [], medicines: [], expiringSoonSuppliesCount: 0, expiringSoonMedicinesCount: 0, total: 0 };
    }
  }

  // 生成邮件内容
  generateEmailContent(expiredItems, template) {
    const { supplies, medicines, total, expiringSoonSuppliesCount, expiringSoonMedicinesCount } = expiredItems;
    
    // 如果没有过期物资且没有即将到期的物资，不发送邮件
    if (total === 0 && expiringSoonSuppliesCount === 0 && expiringSoonMedicinesCount === 0) {
      return null;
    }

    // 构建过期物品列表（表格形式）
    let expiredItemsList = '';
    let itemIndex = 1; // 序号计数器
    
    if (supplies.length > 0) {
      expiredItemsList += `<h3>过期物资 (${supplies.length}项)</h3>\n`;
      expiredItemsList += `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">\n`;
      expiredItemsList += `<thead>\n`;
      expiredItemsList += `<tr style="background-color: #f5f5f5;">\n`;
      expiredItemsList += `<th style="text-align: center;">序号</th>\n`;
      expiredItemsList += `<th>物资名称</th>\n`;
      expiredItemsList += `<th style="text-align: center;">过期日期</th>\n`;
      expiredItemsList += `<th style="text-align: center;">剩余数量</th>\n`;
      expiredItemsList += `<th style="text-align: center;">存储位置</th>\n`;
      expiredItemsList += `</tr>\n`;
      expiredItemsList += `</thead>\n`;
      expiredItemsList += `<tbody>\n`;
      
      supplies.forEach(item => {
        // 格式化日期为YYYY-MM-DD
        const expirationDate = new Date(item.expiry_date);
        const formattedDate = `${expirationDate.getFullYear()}-${(expirationDate.getMonth() + 1).toString().padStart(2, '0')}-${expirationDate.getDate().toString().padStart(2, '0')}`;
        
        expiredItemsList += `<tr>\n`;
        expiredItemsList += `<td style="text-align: center;">${itemIndex}</td>\n`;
        expiredItemsList += `<td>${item.name}</td>\n`;
        expiredItemsList += `<td style="text-align: center;">${formattedDate}</td>\n`;
        expiredItemsList += `<td style="text-align: center;">${item.quantity}</td>\n`;
        expiredItemsList += `<td style="text-align: center;">${item.storage_location}</td>\n`;
        expiredItemsList += `</tr>\n`;
        itemIndex++;
      });
      
      expiredItemsList += `</tbody>\n`;
      expiredItemsList += `</table>\n`;
    }

    if (medicines.length > 0) {
      expiredItemsList += `<h3>过期药品 (${medicines.length}项)</h3>\n`;
      expiredItemsList += `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">\n`;
      expiredItemsList += `<thead>\n`;
      expiredItemsList += `<tr style="background-color: #f5f5f5;">\n`;
      expiredItemsList += `<th style="text-align: center;">序号</th>\n`;
      expiredItemsList += `<th>药品名称</th>\n`;
      expiredItemsList += `<th style="text-align: center;">过期日期</th>\n`;
      expiredItemsList += `<th style="text-align: center;">剩余数量</th>\n`;
      expiredItemsList += `<th style="text-align: center;">存储位置</th>\n`;
      expiredItemsList += `</tr>\n`;
      expiredItemsList += `</thead>\n`;
      expiredItemsList += `<tbody>\n`;
      
      medicines.forEach(item => {
        // 格式化日期为YYYY-MM-DD
        const expirationDate = new Date(item.expiry_date);
        const formattedDate = `${expirationDate.getFullYear()}-${(expirationDate.getMonth() + 1).toString().padStart(2, '0')}-${expirationDate.getDate().toString().padStart(2, '0')}`;
        
        expiredItemsList += `<tr>\n`;
        expiredItemsList += `<td style="text-align: center;">${itemIndex}</td>\n`;
        expiredItemsList += `<td>${item.name}</td>\n`;
        expiredItemsList += `<td style="text-align: center;">${formattedDate}</td>\n`;
        expiredItemsList += `<td style="text-align: center;">${item.quantity}</td>\n`;
        expiredItemsList += `<td style="text-align: center;">${item.storage_location}</td>\n`;
        expiredItemsList += `</tr>\n`;
        itemIndex++;
      });
      
      expiredItemsList += `</tbody>\n`;
      expiredItemsList += `</table>\n`;
    }

    // 添加即将到期物品提醒
    if (expiringSoonMedicinesCount > 0 || expiringSoonSuppliesCount > 0) {
      expiredItemsList += `<div style="margin-top: 20px;">\n`;
      expiredItemsList += `<h3 style="margin-top: 0;">即将到期预警</h3>\n`;
      
      if (expiringSoonMedicinesCount > 0) {
        expiredItemsList += `<p>共有 <strong>${expiringSoonMedicinesCount}</strong> 种药品将在30天内过期，请登录系统查看详细。</p>\n`;
      }
      
      if (expiringSoonSuppliesCount > 0) {
        expiredItemsList += `<p>共有 <strong>${expiringSoonSuppliesCount}</strong> 种物资将在30天内过期，请登录系统查看详细。</p>\n`;
      }
      
      expiredItemsList += `</div>\n`;
    }

    // 格式化当前日期为YYYY-MM-DD
    const today = new Date();
    const formattedToday = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    // 使用模板并替换变量
    let content = template || `<p>尊敬的管理员：</p>

<p>您好！系统检测到以下物资或药品已过期，请及时处理：</p>

{EXPIRED_ITEMS}

<p>请登录系统查看详细信息并及时处理。</p>

<p>此邮件由系统自动发送，请勿回复。</p>

<p>系统管理员<br>{CURRENT_DATE}</p>`;

    // 替换变量
    content = content
      .replace('{EXPIRED_ITEMS}', expiredItemsList)
      .replace('{CURRENT_DATE}', formattedToday);

    return content;
  }

  // 检查并发送过期提醒邮件
  async checkAndSendReminder() {
    try {
      const pool = await getPool();
      if (!pool) {
        console.log('数据库连接池未初始化，无法发送提醒邮件');
        return { success: false, message: '数据库连接失败' };
      }

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
      
      if (expiredItems.total === 0 && expiredItems.expiringSoonSuppliesCount === 0 && expiredItems.expiringSoonMedicinesCount === 0) {
        console.log('没有过期或即将过期的物资，无需发送提醒邮件');
        return { success: true, message: '没有过期或即将过期的物资' };
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