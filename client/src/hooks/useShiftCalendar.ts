import { useState, useCallback, useMemo } from 'react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ShiftCalculator } from '../utils/shiftCalculator';
import { TeamType, ShiftInfo } from '../types/shift';

/**
 * 班次日历自定义Hook
 * 封装日历相关的状态管理和业务逻辑
 */
export const useShiftCalendar = (initialTeam: TeamType = '一队') => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedTeam, setSelectedTeam] = useState<TeamType>(initialTeam);
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());

  // 使用useMemo缓存计算器实例
  const shiftCalculator = useMemo(() => new ShiftCalculator(), []);

  // 缓存班次计算结果
  const currentShift = useMemo(() => 
    shiftCalculator.calculateShift(selectedDate, selectedTeam),
    [shiftCalculator, selectedDate, selectedTeam]
  );

  // 缓存所有队伍班次
  const allTeamsShifts = useMemo(() => 
    shiftCalculator.getAllTeamsShifts(selectedDate),
    [shiftCalculator, selectedDate]
  );

  // 缓存颜色映射
  const shiftColors = useMemo(() => 
    shiftCalculator.getShiftColors(),
    [shiftCalculator]
  );

  const detailedShiftColors = useMemo(() => 
    shiftCalculator.getDetailedShiftColors(),
    [shiftCalculator]
  );

  // 日期选择处理
  const handleDateSelect = useCallback((date: Dayjs) => {
    setSelectedDate(date);
    if (date.month() !== currentMonth.month() || date.year() !== currentMonth.year()) {
      setCurrentMonth(date);
    }
  }, [currentMonth]);

  // 队伍选择处理
  const handleTeamChange = useCallback((team: TeamType) => {
    setSelectedTeam(team);
  }, []);

  // 月份导航处理
  const handleMonthChange = useCallback((newMonth: Dayjs) => {
    setCurrentMonth(newMonth);
  }, []);

  // 跳转到今天
  const handleToday = useCallback(() => {
    const today = dayjs();
    setSelectedDate(today);
    setCurrentMonth(today);
  }, []);

  // 获取指定日期的班次信息
  const getShiftForDate = useCallback((date: Dayjs, team?: TeamType): ShiftInfo => {
    const targetTeam = team || selectedTeam;
    return {
      team: targetTeam,
      shift: shiftCalculator.calculateShift(date, targetTeam)
    };
  }, [shiftCalculator, selectedTeam]);

  return {
    // 状态
    selectedDate,
    selectedTeam,
    currentMonth,
    currentShift,
    allTeamsShifts,
    shiftColors,
    detailedShiftColors,
    
    // 方法
    handleDateSelect,
    handleTeamChange,
    handleMonthChange,
    handleToday,
    getShiftForDate,
    
    // 工具
    shiftCalculator
  };
};