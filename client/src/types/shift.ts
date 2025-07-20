// 班次相关类型定义
export type ShiftType = '早班' | '白班' | '夜班' | '休';

export type TeamType = '一队' | '二队' | '三队' | '四队';

export type ShiftColor = 'blue' | 'green' | 'purple' | 'gray';

// 班次信息接口
export interface ShiftInfo {
  team: TeamType;
  shift: ShiftType;
}

// 班次颜色映射类型
export type ShiftColorMap = {
  [K in ShiftType]: ShiftColor;
};

// 班次表类型
export type ShiftTable = {
  [K in TeamType]: ShiftType[];
};

// 日历组件属性接口
export interface ShiftCalendarProps {
  onDateSelect?: (date: any, shift: ShiftInfo) => void;
  onTeamChange?: (team: TeamType) => void;
  defaultTeam?: TeamType;
  disabled?: boolean;
}

// 班次计算配置接口
export interface ShiftCalculationConfig {
  baseDate: string;
  cycleDays: number;
  shiftTable: ShiftTable;
}