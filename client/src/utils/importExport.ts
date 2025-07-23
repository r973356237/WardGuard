import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// 导出数据到Excel
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  try {
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(data);
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // 保存文件
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('导出Excel失败:', error);
    return false;
  }
};

// 生成导入模板
export const generateTemplate = (templateData: any[], filename: string, sheetName: string = 'Sheet1') => {
  return exportToExcel(templateData, `${filename}_模板`, sheetName);
};

// 从Excel文件读取数据
export const importFromExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 读取第一个工作表
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 转换为JSON数据
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// 验证导入数据格式
export const validateImportData = (data: any[], requiredFields: string[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data || data.length === 0) {
    errors.push('导入文件为空');
    return { isValid: false, errors };
  }
  
  // 检查必填字段
  const firstRow = data[0];
  const missingFields = requiredFields.filter(field => !(field in firstRow));
  
  if (missingFields.length > 0) {
    errors.push(`缺少必填字段: ${missingFields.join(', ')}`);
  }
  
  // 检查每行数据
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] && row[field] !== 0) {
        errors.push(`第${index + 2}行缺少必填字段: ${field}`);
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 员工数据模板
export const employeeTemplate = [
  {
    '姓名': '张三',
    '工号': 'EMP001',
    '性别': '男',
    '车间': '生产车间',
    '职位': '操作员',
    '出生日期': '1990-01-01',
    '入职时间': '2020-01-01',
    '工作开始时间': '2020-01-01',
    '原公司': '原公司名称',
    '总接害时间': 3.5,
    '入职前接害时间': 1.0,
    '身份证号': '123456789012345678',
    '状态': '在职'
  }
];

// 药品数据模板
export const medicineTemplate = [
  {
    '药品名称': '阿司匹林',
    '规格': '100mg',
    '单位': '盒',
    '库存数量': 100,
    '单价': 15.50,
    '供应商': '医药公司',
    '生产日期': '2024-01-01',
    '有效期': '2026-01-01',
    '存储位置': 'A区-01',
    '最小库存': 10,
    '状态': '正常'
  }
];

// 物资数据模板
export const supplyTemplate = [
  {
    '物资名称': '防护服',
    '规格': 'XL',
    '单位': '件',
    '库存数量': 50,
    '单价': 25.00,
    '供应商': '防护用品公司',
    '采购日期': '2024-01-01',
    '存储位置': 'B区-01',
    '最小库存': 5,
    '状态': '正常'
  }
];

// 体检记录数据模板
export const medicalExaminationTemplate = [
  {
    '工号': 'EMP001',
    '体检日期': '2024-01-01',
    '体检类型': '职业健康体检',
    '体检结果': '正常',
    '体检机构': '市人民医院',
    '下次体检日期': '2025-01-01',
    '备注': '无异常'
  }
];

// 字段映射配置
export const fieldMappings = {
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
    '药品名称': 'name',
    '规格': 'specification',
    '单位': 'unit',
    '库存数量': 'stock_quantity',
    '单价': 'unit_price',
    '供应商': 'supplier',
    '生产日期': 'production_date',
    '有效期': 'expiry_date',
    '存储位置': 'storage_location',
    '最小库存': 'min_stock',
    '状态': 'status'
  },
  supply: {
    '物资名称': 'name',
    '规格': 'specification',
    '单位': 'unit',
    '库存数量': 'stock_quantity',
    '单价': 'unit_price',
    '供应商': 'supplier',
    '采购日期': 'purchase_date',
    '存储位置': 'storage_location',
    '最小库存': 'min_stock',
    '状态': 'status'
  },
  medicalExamination: {
    '工号': 'employee_number',
    '体检日期': 'examination_date',
    '体检类型': 'examination_type',
    '体检结果': 'result',
    '体检机构': 'institution',
    '下次体检日期': 'next_examination_date',
    '备注': 'remarks'
  }
};

// 转换导入数据字段名
export const transformImportData = (data: any[], type: keyof typeof fieldMappings) => {
  const mapping = fieldMappings[type];
  return data.map(row => {
    const transformedRow: any = {};
    Object.keys(row).forEach(key => {
      const mappedKey = mapping[key as keyof typeof mapping] || key;
      transformedRow[mappedKey] = row[key];
    });
    return transformedRow;
  });
};

// 转换导出数据字段名（反向映射）
export const transformExportData = (data: any[], type: keyof typeof fieldMappings) => {
  const mapping = fieldMappings[type];
  const reverseMapping: { [key: string]: string } = {};
  Object.keys(mapping).forEach(key => {
    reverseMapping[mapping[key as keyof typeof mapping]] = key;
  });
  
  return data.map(row => {
    const transformedRow: any = {};
    Object.keys(row).forEach(key => {
      const mappedKey = reverseMapping[key] || key;
      let value = row[key];
      
      // 格式化日期字段
      if (key.includes('date') && value) {
        value = new Date(value).toLocaleDateString('zh-CN');
      }
      
      transformedRow[mappedKey] = value;
    });
    return transformedRow;
  });
};