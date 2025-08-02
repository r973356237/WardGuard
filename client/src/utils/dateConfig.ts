import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

// 扩展 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// 设置中文语言
dayjs.locale('zh-cn');

// 设置默认时区
dayjs.tz.setDefault('Asia/Shanghai');

// 导出配置好的 dayjs
export default dayjs;

// 常用日期格式常量
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm:ss',
  DISPLAY_DATE: 'YYYY年MM月DD日',
  DISPLAY_DATETIME: 'YYYY年MM月DD日 HH:mm:ss',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSS[Z]'
};

// 日期工具函数
export const dateUtils = {
  // 格式化日期
  format: (date: any, format: string = DATE_FORMATS.DATE) => {
    if (!date) return '';
    return dayjs(date).format(format);
  },
  
  // 解析日期
  parse: (dateString: string, format?: string) => {
    if (!dateString) return null;
    return format ? dayjs(dateString, format) : dayjs(dateString);
  },
  
  // 验证日期是否有效
  isValid: (date: any) => {
    return dayjs(date).isValid();
  },
  
  // 获取当前日期
  now: () => dayjs(),
  
  // 获取今天的开始时间
  startOfDay: (date?: any) => dayjs(date).startOf('day'),
  
  // 获取今天的结束时间
  endOfDay: (date?: any) => dayjs(date).endOf('day'),
  
  // 比较日期
  isBefore: (date1: any, date2: any) => dayjs(date1).isBefore(dayjs(date2)),
  isAfter: (date1: any, date2: any) => dayjs(date1).isAfter(dayjs(date2)),
  isSame: (date1: any, date2: any) => dayjs(date1).isSame(dayjs(date2)),
  
  // 日期计算
  add: (date: any, value: number, unit: any) => dayjs(date).add(value, unit),
  subtract: (date: any, value: number, unit: any) => dayjs(date).subtract(value, unit),
  
  // 获取日期差值
  diff: (date1: any, date2: any, unit?: any) => dayjs(date1).diff(dayjs(date2), unit)
};

// DatePicker 组件的默认配置
export const DEFAULT_DATEPICKER_PROPS = {
  format: DATE_FORMATS.DATE,
  changeOnBlur: true,
  allowClear: true,
  showToday: false,
  placeholder: '请选择日期'
};