require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function updateEmployeesTable() {
  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    // 检查字段是否存在，如果不存在则添加
    console.log('检查数据库字段...');
    try {
      // 获取表结构
      const [columns] = await connection.execute('SHOW COLUMNS FROM employees');
      const columnNames = columns.map(col => col.Field);
      
      // 需要添加的字段列表
      const fieldsToAdd = [
        { name: 'birth_date', def: 'DATE DEFAULT NULL COMMENT \'出生日期\'' },
        { name: 'hire_date', def: 'DATE DEFAULT NULL COMMENT \'入职时间\'' },
        { name: 'work_start_date', def: 'DATE DEFAULT NULL COMMENT \'参加工作时间\'' },
        { name: 'original_company', def: 'VARCHAR(200) DEFAULT NULL COMMENT \'原单位\'' },
        { name: 'total_exposure_time', def: 'FLOAT DEFAULT 0 COMMENT \'总接害时间（年）\'' },
        { name: 'pre_hire_exposure_time', def: 'FLOAT DEFAULT 0 COMMENT \'入职前接害时间（年）\'' },
        { name: 'id_number', def: 'VARCHAR(20) DEFAULT NULL COMMENT \'身份证号\'' }
      ];
      
      // 筛选出需要添加的字段
      const missingFields = fieldsToAdd.filter(field => !columnNames.includes(field.name));
      
      if (missingFields.length > 0) {
        // 构建ALTER TABLE语句
        const alterSql = `ALTER TABLE employees ${missingFields.map(field => `ADD COLUMN ${field.name} ${field.def}`).join(', ')}`;
        await connection.execute(alterSql);
        console.log(`成功添加了${missingFields.length}个新字段`);
      } else {
        console.log('所有字段已存在，无需添加');
      }
    } catch (error) {
      console.error('检查或添加字段时出错:', error);
      throw error;
    }

    // 读取CSV文件并更新数据库
    console.log('开始从CSV文件读取数据...');
    const employees = [];
    const csvFilePath = path.resolve(__dirname, '../../员工信息.csv');

    // 创建一个Promise来处理CSV解析
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // CSV文件中的列名为：序号,姓名,员工工号,性别,车间,岗位,出生日期,入职时间,参加工作时间,原单位,入职前接害时间,总接害时间,身份证号
          // 处理日期格式，将YYYY/MM/DD转换为YYYY-MM-DD
          const formatDate = (dateStr) => {
            if (!dateStr || dateStr === '/' || dateStr === '-') return null;
            return dateStr.replace(/\//g, '-');
          };
          
          // 处理数值，确保是有效的数字
          const parseNumber = (numStr) => {
            if (!numStr || isNaN(parseFloat(numStr))) return 0;
            return parseFloat(numStr);
          };
          
          // 处理员工工号，确保与数据库中的格式一致（添加前导零）
          const formatEmployeeNumber = (numStr) => {
            if (!numStr) return null;
            // 将工号转换为6位数，前面补0
            return numStr.padStart(6, '0');
          };
          
          employees.push({
            employee_number: formatEmployeeNumber(row['员工工号']),
            birth_date: formatDate(row['出生日期']),
            hire_date: formatDate(row['入职时间']),
            work_start_date: formatDate(row['参加工作时间']),
            original_company: row['原单位'] === '无' ? null : row['原单位'],
            total_exposure_time: parseNumber(row['总接害时间']),
            pre_hire_exposure_time: parseNumber(row['入职前接害时间']),
            id_number: row['身份证号']
          });
        })
        .on('end', () => {
          console.log(`CSV文件读取完成，共读取${employees.length}条记录`);
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });

    // 更新数据库中的记录
    console.log('开始更新数据库记录...');
    let updatedCount = 0;
    for (const employee of employees) {
      const [result] = await connection.execute(
        'UPDATE employees SET birth_date = ?, hire_date = ?, work_start_date = ?, original_company = ?, total_exposure_time = ?, pre_hire_exposure_time = ?, id_number = ? WHERE employee_number = ?',
        [employee.birth_date, employee.hire_date, employee.work_start_date, employee.original_company, employee.total_exposure_time, employee.pre_hire_exposure_time, employee.id_number, employee.employee_number]
      );
      if (result.affectedRows > 0) {
        updatedCount++;
      }
    }
    console.log(`数据库记录更新完成，共更新${updatedCount}条记录`);

    console.log('所有操作已完成');
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行更新操作
updateEmployeesTable();