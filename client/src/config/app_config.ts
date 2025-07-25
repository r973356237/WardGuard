/**
 * 应用配置文件
 * 集中管理应用的配置信息
 */

/**
 * 环境配置
 */
export const ENV = {
  development: 'development',
  production: 'production',
  test: 'test'
} as const;

/**
 * 当前环境
 */
export const CURRENT_ENV = process.env.NODE_ENV || ENV.development;

/**
 * API配置
 */
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
};

/**
 * 应用配置
 */
export const APP_CONFIG = {
  name: 'WardGuard',
  version: '1.0.0',
  description: '病房管理系统',
  
  // 分页配置
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: ['10', '20', '50', '100'],
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => 
      `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
  },
  
  // 表格配置
  table: {
    scroll: { x: 800 },
    size: 'middle' as const,
    bordered: true,
    showHeader: true
  },
  
  // 表单配置
  form: {
    layout: 'vertical' as const,
    requiredMark: true,
    validateTrigger: 'onBlur',
    autoComplete: 'off'
  },
  
  // 上传配置
  upload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    multiple: false
  },
  
  // 日期格式
  dateFormat: {
    date: 'YYYY-MM-DD',
    datetime: 'YYYY-MM-DD HH:mm:ss',
    time: 'HH:mm:ss'
  },
  
  // 主题配置
  theme: {
    primaryColor: '#1890ff',
    borderRadius: 6,
    colorBgContainer: '#ffffff'
  }
};

/**
 * 路由配置
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  users: '/users',
  employees: '/employees',
  supplies: '/supplies',
  medicines: '/medicines',
  profile: '/profile'
};

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  token: 'wardguard_token',
  user: 'wardguard_user',
  theme: 'wardguard_theme',
  language: 'wardguard_language'
};

/**
 * 角色权限配置
 */
export const ROLES = {
  admin: {
    name: '管理员',
    permissions: ['*']
  },
  manager: {
    name: '经理',
    permissions: ['users:read', 'users:create', 'users:update', 'employees:*', 'supplies:*', 'medicines:*']
  },
  user: {
    name: '用户',
    permissions: ['users:read', 'supplies:read', 'medicines:read']
  }
};

/**
 * 状态配置
 */
export const STATUS = {
  active: {
    label: '激活',
    color: 'green'
  },
  inactive: {
    label: '禁用',
    color: 'red'
  },
  pending: {
    label: '待审核',
    color: 'orange'
  }
};

/**
 * 消息配置
 */
export const MESSAGE_CONFIG = {
  duration: 3,
  maxCount: 3,
  placement: 'topRight' as const
};

/**
 * 开发工具配置
 */
export const DEV_CONFIG = {
  enableReduxDevTools: CURRENT_ENV === ENV.development,
  enableLogger: CURRENT_ENV === ENV.development,
  enableMockData: false
};

/**
 * 获取配置值
 */
export const getConfig = (key: string, defaultValue?: any) => {
  const keys = key.split('.');
  let value: any = {
    api: API_CONFIG,
    app: APP_CONFIG,
    routes: ROUTES,
    storage: STORAGE_KEYS,
    roles: ROLES,
    status: STATUS,
    message: MESSAGE_CONFIG,
    dev: DEV_CONFIG
  };
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      return defaultValue;
    }
  }
  
  return value;
};

export default {
  ENV,
  CURRENT_ENV,
  API_CONFIG,
  APP_CONFIG,
  ROUTES,
  STORAGE_KEYS,
  ROLES,
  STATUS,
  MESSAGE_CONFIG,
  DEV_CONFIG,
  getConfig
};