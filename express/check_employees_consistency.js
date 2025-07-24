const mysql = require('mysql2/promise');
const config = require('./config');

async function checkEmployeesFieldConsistency() {
  let connection;
  
  try {
    console.log('连接数据库...');
    const dbConfig = config.getDatabaseConfig();
    connection = await mysql.createConnection(dbConfig);
    
    console.log('获取employees表结构...');
    const [tableFields] = await connection.execute('DESCRIBE employees');
    
    // 数据库表字段
    const dbFields = tableFields.map(row => row.Field);
    console.log('数据库表字段:', dbFields);
    
    // 控制器中使用的字段
    const controllerFields = [
      'name', 'employee_number', 'gender', 'workshop', 'position',
      'birth_date', 'hire_date', 'work_start_date', 'original_company',
      'total_exposure_time', 'pre_hire_exposure_time', 'id_number', 'status'
    ];
    console.log('控制器使用的字段:', controllerFields);
    
    // 前端映射的字段
    const frontendFields = [
      'name', 'employee_number', 'gender', 'workshop', 'position',
      'birth_date', 'hire_date', 'work_start_date', 'original_company',
      'total_exposure_time', 'pre_hire_exposure_time', 'id_number', 'status'
    ];
    console.log('前端映射的字段:', frontendFields);
    
    // 检查控制器字段是否都存在于数据库表中
    const missingInDb = controllerFields.filter(field => !dbFields.includes(field));
    if (missingInDb.length > 0) {
      console.log('控制器使用但数据库表中不存在的字段:', missingInDb);
    } else {
      console.log('控制器使用的所有字段在数据库表中都存在');
    }
    
    // 检查数据库表中的字段是否都被控制器使用
    const unusedInController = dbFields.filter(field => 
      !controllerFields.includes(field) && 
      !['id', 'created_at', 'updated_at'].includes(field) // 排除自动生成的字段
    );
    if (unusedInController.length > 0) {
      console.log('数据库表中存在但控制器未使用的字段:', unusedInController);
    } else {
      console.log('数据库表中的所有业务字段都被控制器使用');
    }
    
  } catch (error) {
    console.error('检查字段一致性失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkEmployeesFieldConsistency();