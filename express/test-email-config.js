/**
 * 测试邮件配置保存功能
 */
const axios = require('axios');

async function testSaveEmailConfig() {
  try {
    console.log('开始测试邮件配置保存功能...');
    
    const response = await axios.post('http://localhost:3000/api/system/email-config', {
      recipient_email: 'test@example.com',
      reminder_frequency: 'monthly',
      reminder_time: '09:30',
      email_subject: '【系统提醒】物资/药品过期通知',
      email_template: '尊敬的管理员：\n\n您好！系统检测到以下物资或药品即将过期或已过期，请及时处理：\n\n{EXPIRED_ITEMS}\n\n请登录系统查看详细信息并及时处理。\n\n此邮件由系统自动发送，请勿回复。\n\n系统管理员\n{CURRENT_DATE}',
      monthly_day: 15
    });
    
    console.log('响应状态码:', response.status);
    console.log('响应数据:', response.data);
    console.log('测试完成！');
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
  }
}

testSaveEmailConfig();