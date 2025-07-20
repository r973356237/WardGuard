import dayjs, { Dayjs } from 'dayjs';
import { ShiftType, TeamType, ShiftTable, ShiftCalculationConfig } from '../types/shift';

/**
 * 班次计算工具类
 * 负责处理所有与班次相关的计算逻辑
 */
export class ShiftCalculator {
  private config: ShiftCalculationConfig;

  constructor(config?: Partial<ShiftCalculationConfig>) {
    this.config = {
      baseDate: '2025-07-15',
      cycleDays: 4,
      shiftTable: {
        '一队': ['休', '白班', '夜班', '早班'],
        '二队': ['早班', '休', '白班', '夜班'],
        '三队': ['白班', '夜班', '早班', '休'],
        '四队': ['夜班', '早班', '休', '白班']
      },
      ...config
    };
  }

  /**
   * 计算指定日期和队伍的班次
   * @param date 日期
   * @param team 队伍
   * @returns 班次类型
   */
  calculateShift(date: Dayjs, team: TeamType): ShiftType {
    const baseDate = dayjs(this.config.baseDate);
    const dayDiff = date.diff(baseDate, 'days') % this.config.cycleDays;
    const index = (dayDiff + this.config.cycleDays) % this.config.cycleDays;
    
    return this.config.shiftTable[team][index];
  }

  /**
   * 获取所有队伍在指定日期的班次
   * @param date 日期
   * @returns 所有队伍的班次信息
   */
  getAllTeamsShifts(date: Dayjs) {
    const teams: TeamType[] = ['一队', '二队', '三队', '四队'];
    return teams.map(team => ({
      team,
      shift: this.calculateShift(date, team)
    }));
  }

  /**
   * 获取班次颜色映射
   * @returns 班次颜色映射对象
   */
  getShiftColors() {
    return {
      '早班': 'blue',
      '白班': 'green', 
      '夜班': 'purple',
      '休': 'gray'
    } as const;
  }

  /**
   * 获取班次详细颜色映射（用于卡片显示）
   * @returns 详细颜色映射对象
   */
  getDetailedShiftColors() {
    return {
      '早班': '#1890ff',
      '白班': '#52c41a',
      '夜班': '#722ed1',
      '休': '#d9d9d9'
    } as const;
  }

  /**
   * 验证日期是否有效
   * @param date 日期
   * @returns 是否有效
   */
  isValidDate(date: Dayjs): boolean {
    return date.isValid();
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<ShiftCalculationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}