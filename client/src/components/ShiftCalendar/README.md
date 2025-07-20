# 班次日历组件文档

## 概述

班次日历组件是一个基于 Ant Design Calendar 的自定义组件，用于显示和管理四个队伍的倒班安排。

## 功能特性

- ✅ 四队倒班制度支持
- ✅ 日期选择和高亮显示
- ✅ 班次自动计算
- ✅ 响应式设计
- ✅ TypeScript 类型安全
- ✅ 可配置的班次规则

## 技术架构

### 核心组件

1. **ShiftCalendarComponent** - 主组件
2. **CalendarHeader** - 日历头部组件
3. **ShiftDisplay** - 班次显示组件

### 工具类

1. **ShiftCalculator** - 班次计算工具
2. **useShiftCalendar** - 自定义 Hook

### 类型定义

- `ShiftType` - 班次类型
- `TeamType` - 队伍类型
- `ShiftInfo` - 班次信息接口

## 使用方法

### 基本使用

```tsx
import ShiftCalendarComponent from './components/ShiftCalendar';

function App() {
  return (
    <div>
      <ShiftCalendarComponent />
    </div>
  );
}
```

### 高级使用

```tsx
import { useShiftCalendar } from './hooks/useShiftCalendar';
import { ShiftCalculator } from './utils/shiftCalculator';

function CustomCalendar() {
  const {
    selectedDate,
    selectedTeam,
    handleDateSelect,
    handleTeamChange,
    allTeamsShifts
  } = useShiftCalendar('二队');

  return (
    <div>
      {/* 自定义日历实现 */}
    </div>
  );
}
```

## 配置说明

### 班次配置

在 `src/config/shiftConfig.ts` 中可以修改：

- `BASE_DATE` - 基准日期
- `CYCLE_DAYS` - 循环天数
- `SHIFT_TABLE` - 班次表
- `SHIFT_COLORS` - 班次颜色

### 班次表说明

当前班次表为 4 天循环：

| 队伍 | 第1天 | 第2天 | 第3天 | 第4天 |
|------|-------|-------|-------|-------|
| 一队 | 休    | 白班  | 夜班  | 早班  |
| 二队 | 早班  | 休    | 白班  | 夜班  |
| 三队 | 白班  | 夜班  | 早班  | 休    |
| 四队 | 夜班  | 早班  | 休    | 白班  |

## API 参考

### ShiftCalculator

#### 方法

- `calculateShift(date: Dayjs, team: TeamType): ShiftType`
- `getAllTeamsShifts(date: Dayjs): ShiftInfo[]`
- `getShiftColors(): ShiftColorMap`
- `isValidDate(date: Dayjs): boolean`
- `updateConfig(config: Partial<ShiftCalculationConfig>): void`

### useShiftCalendar Hook

#### 返回值

```tsx
{
  // 状态
  selectedDate: Dayjs;
  selectedTeam: TeamType;
  currentMonth: Dayjs;
  currentShift: ShiftType;
  allTeamsShifts: ShiftInfo[];
  shiftColors: ShiftColorMap;
  detailedShiftColors: Record<string, string>;
  
  // 方法
  handleDateSelect: (date: Dayjs) => void;
  handleTeamChange: (team: TeamType) => void;
  handleMonthChange: (month: Dayjs) => void;
  handleToday: () => void;
  getShiftForDate: (date: Dayjs, team?: TeamType) => ShiftInfo;
  
  // 工具
  shiftCalculator: ShiftCalculator;
}
```

## 性能优化

1. **记忆化计算** - 使用 `useMemo` 缓存计算结果
2. **回调优化** - 使用 `useCallback` 避免不必要的重渲染
3. **组件拆分** - 将大组件拆分为小组件
4. **类型安全** - 使用 TypeScript 提供编译时检查

## 测试

运行测试：

```bash
npm test
```

测试覆盖：
- 班次计算逻辑
- 日期验证
- 配置更新
- 边界情况处理

## 维护指南

### 添加新班次类型

1. 更新 `ShiftType` 类型定义
2. 修改 `SHIFT_TABLE` 配置
3. 添加对应的颜色配置
4. 更新测试用例

### 修改循环天数

1. 更新 `CYCLE_DAYS` 配置
2. 调整 `SHIFT_TABLE` 数组长度
3. 更新相关测试

### 样式自定义

1. 修改 `src/config/shiftConfig.ts` 中的样式配置
2. 或直接修改 `style.css` 文件

## 故障排除

### 常见问题

1. **日期计算错误** - 检查基准日期和循环天数配置
2. **样式不生效** - 确认 CSS 类名和选择器优先级
3. **TypeScript 错误** - 检查类型定义和导入路径

### 调试技巧

1. 使用浏览器开发者工具检查元素
2. 在 `ShiftCalculator` 中添加 console.log 调试
3. 检查 React DevTools 中的组件状态

## 更新日志

### v1.0.0
- 初始版本发布
- 支持四队倒班制度
- 基本日历功能实现

### v1.1.0
- 添加 TypeScript 支持
- 性能优化
- 组件拆分重构