/**
 * 班次日历配置文件
 * 集中管理所有配置项，便于维护和修改
 */

// 班次配置
export const SHIFT_CONFIG = {
  // 基准日期（用于计算班次循环）
  BASE_DATE: '2025-07-15',
  
  // 班次循环天数
  CYCLE_DAYS: 4,
  
  // 班次表配置
  SHIFT_TABLE: {
    '一队': ['休', '白班', '夜班', '早班'],
    '二队': ['早班', '休', '白班', '夜班'],
    '三队': ['白班', '夜班', '早班', '休'],
    '四队': ['夜班', '早班', '休', '白班']
  } as const,
  
  // 班次颜色配置
  SHIFT_COLORS: {
    '早班': 'blue',
    '白班': 'green',
    '夜班': 'purple',
    '休': 'gray'
  } as const,
  
  // 详细颜色配置（用于卡片显示）
  DETAILED_COLORS: {
    '早班': '#1890ff',
    '白班': '#52c41a', 
    '夜班': '#722ed1',
    '休': '#d9d9d9'
  } as const
};

// UI配置
export const UI_CONFIG = {
  // 日历配置
  CALENDAR: {
    FULL_SCREEN: false,
    LOCALE: 'zh-cn'
  },
  
  // 卡片配置
  CARD: {
    SIZE: 'small' as const,
    BORDERED: false,
    MARGIN_TOP: 16
  },
  
  // 按钮配置
  BUTTON: {
    SIZE: 'small' as const,
    MARGIN_RIGHT: 8
  },
  
  // 选择器配置
  SELECT: {
    WIDTH: 120
  }
};

// 样式配置
export const STYLE_CONFIG = {
  // 班次卡片样式
  SHIFT_CARD: {
    BORDER_WIDTH: 4,
    BACKGROUND_OPACITY: '10', // 16进制透明度
    REST_BACKGROUND: '#f5f5f5',
    REST_COLOR: '#666'
  },
  
  // 日期单元格样式
  DATE_CELL: {
    MARGIN_TOP: 8
  },
  
  // 布局样式
  LAYOUT: {
    GUTTER: [16, 16] as [number, number],
    COL_SPAN: 6
  }
};

// 错误消息配置
export const ERROR_MESSAGES = {
  INVALID_DATE: '无效的日期',
  INVALID_TEAM: '无效的队伍',
  CALCULATION_ERROR: '班次计算错误'
};

// 默认值配置
export const DEFAULTS = {
  TEAM: '一队' as const,
  DATE_FORMAT: 'YYYY-MM-DD',
  MONTH_FORMAT: 'YYYY年MM月'
};