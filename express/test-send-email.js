/**
 * 测试发送邮件并验证邮件日志记录
 */
const axios = require('axios');
const { getPool } = require('./db');

async function testSendEmailAndCheckLogs() {
  try {
    console.log('开始测试发送邮件并验证邮件日志记录...');
    
    // 1. 发送测试邮件
    console.log('1. 发送测试邮件...');
    const response = await axios.post('http://localhost:3000/api/system/test-email', {
      test_recipients: 'test@example.com'
    });
    
    console.log('响应状态码:', response.status);
    console.log('响应数据:', response.data);
    
    if (!response.data.success) {
      throw new Error('发送测试邮件失败: ' + response.data.message);
    }
    
    // 2. 等待一段时间确保数据库操作完成
    console.log('2. 等待数据库操作完成...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. 查询邮件日志
    console.log('3. 查询邮件日志...');
    const pool = await getPool();
    
    const [rows] = await pool.query(
      'SELECT * FROM email_logs ORDER BY id DESC LIMIT 5'
    );
    
    console.log('最近5条邮件日志:');
    console.log(JSON.stringify(rows, null, 2));
    
    // 4. 检查是否有最新的日志记录
    if (rows.length > 0) {
      const latestLog = rows[0];
      console.log('最新邮件日志:');
      console.log('- 收件人:', latestLog.recipient);
      console.log('- 主题:', latestLog.subject);
      console.log('- 状态:', latestLog.status);
      console.log('- 发送时间:', latestLog.sent_at);
      
      if (latestLog.recipient.includes('test@example.com')) {
        console.log('✅ 测试成功: 找到了测试邮件的日志记录');
      } else {
        console.log('❌ 测试失败: 未找到测试邮件的日志记录');
      }
    } else {
      console.log('❌ 测试失败: 未找到任何邮件日志记录');
    }
    
    // 不需要关闭连接池，因为它是全局共享的
    
    console.log('测试完成！');
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
  }
}

testSendEmailAndCheckLogs();