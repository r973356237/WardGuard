/**
 * API 配置文件
 * 根据环境自动配置 API 基础地址
 */

// 获取当前环境
const isDevelopment = process.env.NODE_ENV === 'development';

// API 基础地址配置
export const API_CONFIG = {
  // 开发环境：使用代理或本地地址
  DEVELOPMENT_BASE_URL: 'http://localhost:3000',
  
  // 生产环境：使用当前域名和端口
  PRODUCTION_BASE_URL: window.location.origin,
  
  // 根据环境自动选择
  BASE_URL: isDevelopment 
    ? 'http://localhost:3000'  // 开发环境
    : window.location.origin,  // 生产环境使用当前域名
};

// API 端点配置
export const API_ENDPOINTS = {
  // 用户相关
  USER_LOGIN: '/api/users/login',
  USER_REGISTER: '/api/users/register',
  USER_ME: '/api/users/me',
  USER_LIST: '/api/users',
  USERS: '/api/users',
  
  // 系统相关
  SYSTEM_NAME: '/api/system-name',
  SYSTEM_HEALTH: '/api/health',
  SYSTEM: '/api/system',
  
  // 仪表盘相关
  DASHBOARD_STATS: '/api/dashboard/stats',
  DASHBOARD_HEALTH: '/api/dashboard/health',
  
  // 物资相关
  SUPPLIES: '/api/supplies',
  
  // 药品相关
  MEDICINES: '/api/medicines',
  
  // 员工相关
  EMPLOYEES: '/api/employees',
  
  // 体检相关
  MEDICAL_EXAMINATIONS: '/api/medical-examinations',
  
  // 操作记录相关
  OPERATION_RECORDS: '/api/operation-records',
  
  // 倒班日历
  SHIFT_CALENDAR: '/api/shift-calendar',
  
  // 权限相关
  MODULE_PERMISSIONS: '/api/modules/permissions',
};

// 构建完整的 API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 导出默认配置
const apiConfig = {
  ...API_CONFIG,
  endpoints: API_ENDPOINTS,
  buildUrl: buildApiUrl,
};

export default apiConfig;