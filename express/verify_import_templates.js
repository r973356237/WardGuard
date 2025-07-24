const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: '117.72.123.17',
  user: 'fanjk-ward',
  password: 'xiaokai123',
  database: 'ward',
  port: 3306
};

// 控制器中使用的字段
const controllerFields = {
  employees: [
    'name', 'employee_number', 'gender', 'workshop', 'position', 
    'birth_date', 'hire_date', 'work_start_date', 'original_company', 
    'total_exposure_time', 'pre_hire_exposure_time', 'id_number', 'status'
  ],
  medicines: [
    'medicine_name', 'storage_location', 'production_date', 
    'validity_period_days', 'quantity'
  ],
  supplies: [
    'supply_name', 'storage_location', 'production_date', 
    'validity_period_days', 'supply_number'
  ],
  medical_examinations: [
    'employee_number', 'examination_date', 'audiometry_result', 
    'dust_examination_result', 'need_recheck', 'recheck_date', 
    'audiometry_recheck_result', 'dust_recheck_result'
  ]
};

// 前端模板字段（从 importExport.ts 中提取）
const frontendTemplateFields = {
  employee: [
    '姓名', '工号', '性别', '车间', '职位', '出生日期', 
    '入职时间', '工作开始时间', '原公司', '总接害时间', 
    '入职前接害时间', '身份证号', '状态'
  ],
  medicine: [
    '药品名称', '存储位置', '生产日期', '有效期天数', '数量'
  ],
  supply: [
    '物资名称', '存储位置', '生产日期', '有效期天数', '编号'
  ],
  medicalExamination: [
    '工号', '体检日期', '听力检查结果', '粉尘检查结果', 
    '是否需要复查', '复查日期', '听力复查结果', '粉尘复查结果'
  ]
};

// 字段映射（从 importExport.ts 中提取）
const fieldMappings = {
  employee: {
    '姓名': 'name',
    '工号': 'employee_number',
    '性别': 'gender',
    '车间': 'workshop',
    '职位': 'position',
    '出生日期': 'birth_date',
    '入职时间': 'hire_date',
    '工作开始时间': 'work_start_date',
    '原公司': 'original_company',
    '总接害时间': 'total_exposure_time',
    '入职前接害时间': 'pre_hire_exposure_time',
    '身份证号': 'id_number',
    '状态': 'status'
  },
  medicine: {
    '药品名称': 'medicine_name',
    '存储位置': 'storage_location',
    '生产日期': 'production_date',
    '有效期天数': 'validity_period_days',
    '数量': 'quantity'
  },
  supply: {
    '物资名称': 'supply_name',
    '存储位置': 'storage_location',
    '生产日期': 'production_date',
    '有效期天数': 'validity_period_days',
    '编号': 'supply_number'
  },
  medicalExamination: {
    '工号': 'employee_number',
    '体检日期': 'examination_date',
    '听力检查结果': 'audiometry_result',
    '粉尘检查结果': 'dust_examination_result',
    '是否需要复查': 'need_recheck',
    '复查日期': 'recheck_date',
    '听力复查结果': 'audiometry_recheck_result',
    '粉尘复查结果': 'dust_recheck_result'
  }
};

async function verifyImportTemplates() {
  let connection;
  
  try {
    console.log('开始验证导入模板一致性...\n');
    
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 获取所有表的结构
    const tables = ['employees', 'medicines', 'supplies', 'medical_examinations'];
    const dbStructures = {};
    
    for (const table of tables) {
      const [rows] = await connection.execute(`DESCRIBE ${table}`);
      dbStructures[table] = rows.map(row => ({
        field: row.Field,
        type: row.Type,
        null: row.Null,
        key: row.Key,
        default: row.Default
      }));
    }
    
    console.log('\n=== 验证结果 ===\n');
    
    // 验证每个表
    for (const table of tables) {
      console.log(`--- ${table.toUpperCase()} 表验证 ---`);
      
      const dbFields = dbStructures[table].map(field => field.field);
      const controllerFieldsForTable = controllerFields[table] || [];
      
      // 确定前端类型名
      let frontendType = table;
      if (table === 'employees') frontendType = 'employee';
      if (table === 'medicines') frontendType = 'medicine';
      if (table === 'supplies') frontendType = 'supply';
      if (table === 'medical_examinations') frontendType = 'medicalExamination';
      
      const frontendFields = frontendTemplateFields[frontendType] || [];
      const mapping = fieldMappings[frontendType] || {};
      
      console.log(`数据库字段 (${dbFields.length}):`, dbFields.join(', '));
      console.log(`控制器字段 (${controllerFieldsForTable.length}):`, controllerFieldsForTable.join(', '));
      console.log(`前端模板字段 (${frontendFields.length}):`, frontendFields.join(', '));
      
      // 检查控制器字段是否都在数据库中存在
      const missingInDb = controllerFieldsForTable.filter(field => !dbFields.includes(field));
      if (missingInDb.length > 0) {
        console.log(`❌ 控制器使用但数据库中不存在的字段:`, missingInDb.join(', '));
      } else {
        console.log(`✅ 控制器使用的所有字段在数据库中都存在`);
      }
      
      // 检查前端映射是否完整
      const mappedFields = Object.values(mapping);
      const missingInMapping = controllerFieldsForTable.filter(field => !mappedFields.includes(field));
      if (missingInMapping.length > 0) {
        console.log(`❌ 控制器使用但前端映射中缺少的字段:`, missingInMapping.join(', '));
      } else {
        console.log(`✅ 控制器使用的所有字段在前端映射中都存在`);
      }
      
      // 检查前端模板字段数量是否与映射一致
      if (frontendFields.length !== Object.keys(mapping).length) {
        console.log(`❌ 前端模板字段数量 (${frontendFields.length}) 与映射数量 (${Object.keys(mapping).length}) 不一致`);
      } else {
        console.log(`✅ 前端模板字段数量与映射数量一致`);
      }
      
      // 检查映射的目标字段是否都在控制器中使用
      const unmappedControllerFields = mappedFields.filter(field => !controllerFieldsForTable.includes(field));
      if (unmappedControllerFields.length > 0) {
        console.log(`⚠️  映射到但控制器未使用的字段:`, unmappedControllerFields.join(', '));
      }
      
      console.log('');
    }
    
    console.log('=== 验证完成 ===');
    
  } catch (error) {
    console.error('验证过程中发生错误:', error.message);
    console.error('错误详情:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行验证
verifyImportTemplates();