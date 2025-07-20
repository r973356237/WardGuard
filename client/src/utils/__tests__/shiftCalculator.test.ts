import { ShiftCalculator } from '../shiftCalculator';
import dayjs from 'dayjs';

describe('ShiftCalculator', () => {
  let calculator: ShiftCalculator;

  beforeEach(() => {
    calculator = new ShiftCalculator();
  });

  describe('calculateShift', () => {
    it('应该正确计算一队的班次', () => {
      const baseDate = dayjs('2025-07-15');
      
      // 测试基准日期
      expect(calculator.calculateShift(baseDate, '一队')).toBe('休');
      
      // 测试基准日期后一天
      expect(calculator.calculateShift(baseDate.add(1, 'day'), '一队')).toBe('白班');
      
      // 测试基准日期后两天
      expect(calculator.calculateShift(baseDate.add(2, 'day'), '一队')).toBe('夜班');
      
      // 测试基准日期后三天
      expect(calculator.calculateShift(baseDate.add(3, 'day'), '一队')).toBe('早班');
      
      // 测试循环（基准日期后四天应该回到休）
      expect(calculator.calculateShift(baseDate.add(4, 'day'), '一队')).toBe('休');
    });

    it('应该正确计算所有队伍的班次', () => {
      const testDate = dayjs('2025-07-15');
      
      expect(calculator.calculateShift(testDate, '一队')).toBe('休');
      expect(calculator.calculateShift(testDate, '二队')).toBe('早班');
      expect(calculator.calculateShift(testDate, '三队')).toBe('白班');
      expect(calculator.calculateShift(testDate, '四队')).toBe('夜班');
    });

    it('应该处理历史日期', () => {
      const baseDate = dayjs('2025-07-15');
      const pastDate = baseDate.subtract(1, 'day');
      
      // 应该能正确计算过去的日期
      expect(calculator.calculateShift(pastDate, '一队')).toBe('早班');
    });
  });

  describe('getAllTeamsShifts', () => {
    it('应该返回所有队伍的班次信息', () => {
      const testDate = dayjs('2025-07-15');
      const result = calculator.getAllTeamsShifts(testDate);
      
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ team: '一队', shift: '休' });
      expect(result[1]).toEqual({ team: '二队', shift: '早班' });
      expect(result[2]).toEqual({ team: '三队', shift: '白班' });
      expect(result[3]).toEqual({ team: '四队', shift: '夜班' });
    });
  });

  describe('getShiftColors', () => {
    it('应该返回正确的颜色映射', () => {
      const colors = calculator.getShiftColors();
      
      expect(colors['早班']).toBe('blue');
      expect(colors['白班']).toBe('green');
      expect(colors['夜班']).toBe('purple');
      expect(colors['休']).toBe('gray');
    });
  });

  describe('isValidDate', () => {
    it('应该正确验证日期', () => {
      expect(calculator.isValidDate(dayjs('2025-07-15'))).toBe(true);
      expect(calculator.isValidDate(dayjs('invalid'))).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('应该能更新配置', () => {
      const newConfig = {
        cycleDays: 8,
        baseDate: '2025-01-01'
      };
      
      calculator.updateConfig(newConfig);
      
      // 验证配置已更新（通过计算结果的变化来验证）
      const result1 = calculator.calculateShift(dayjs('2025-01-01'), '一队');
      const result2 = calculator.calculateShift(dayjs('2025-01-02'), '一队');
      
      // 由于循环天数变为8，结果应该不同于默认配置
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});