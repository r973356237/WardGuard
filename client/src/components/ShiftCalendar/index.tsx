import React, { useState } from 'react';
import { Calendar, Select, Badge, Card, Row, Col, Typography, Button, DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/lib/locale/zh_CN';
import { ConfigProvider } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import './style.css';

// 设置dayjs为中文
dayjs.locale('zh-cn');

const { Option } = Select;
const { Title } = Typography;

// 移除农历日期转换函数

// 班次类型
type ShiftType = '早班' | '白班' | '夜班' | '休';

// 班组类型
type TeamType = '一队' | '二队' | '三队' | '四队';

// 倒班日历组件
const ShiftCalendarComponent: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [selectedTeam, setSelectedTeam] = useState<TeamType>('一队');
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());

  // 计算指定日期的班次 - 版本2.2（使用字符串日期计算）
  const calculateShift = (date: Dayjs, team: TeamType): ShiftType => {
    // 基准日期：2025年7月15日的班次安排
    const baseDate = dayjs('2025-07-15');
    
    // 使用字符串格式确保日期计算的准确性
    const inputDateStr = date.format('YYYY-MM-DD');
    const baseDateStr = baseDate.format('YYYY-MM-DD');
    
    // 手动计算日期差（避免时区问题）
    const inputDate = new Date(inputDateStr);
    const baseDateTime = new Date(baseDateStr);
    const dayDiff = Math.floor((inputDate.getTime() - baseDateTime.getTime()) / (1000 * 60 * 60 * 24));
    
    // 调试信息
    if (inputDateStr === '2025-07-14' && team === '一队') {
      console.log('🔍 新的日期计算方法:');
      console.log(`  输入日期字符串: ${inputDateStr}`);
      console.log(`  基准日期字符串: ${baseDateStr}`);
      console.log(`  计算的dayDiff: ${dayDiff}`);
      console.log(`  原dayjs.diff结果: ${date.diff(baseDate, 'days')}`);
    }
    
    // 班次表，根据需求文档中的示例逻辑
    // 按照4天循环：7月15日 -> 7月16日 -> 7月17日 -> 7月18日 -> 7月19日(=7月15日)
    // 7月15日：一队(休)、二队(早班)、三队(白班)、四队(夜班)
    // 7月16日：一队(白班)、二队(休)、三队(夜班)、四队(早班)
    // 7月17日：一队(夜班)、二队(白班)、三队(早班)、四队(休)
    // 7月18日：一队(早班)、二队(夜班)、三队(休)、四队(白班)
    // 
    // 向前推算：
    // 7月14日：一队(早班)、二队(夜班)、三队(休)、四队(白班) [等同于7月18日]
    // 7月13日：一队(夜班)、二队(白班)、三队(早班)、四队(休) [等同于7月17日]
    const shiftTable: Record<TeamType, ShiftType[]> = {
      '一队': ['休', '白班', '夜班', '早班'],      // 索引0=7月15日, 1=7月16日, 2=7月17日, 3=7月18日
      '二队': ['早班', '休', '白班', '夜班'],      
      '三队': ['白班', '夜班', '早班', '休'],      
      '四队': ['夜班', '早班', '休', '白班']       
    };
    
    // 计算当前日期在4天循环中的位置
    // 使用模运算确保负数也能正确计算
    let cyclePosition = dayDiff % 4;
    if (cyclePosition < 0) {
      cyclePosition += 4;
    }
    
    // 继续调试信息
    if (inputDateStr === '2025-07-14' && team === '一队') {
      console.log(`  cyclePosition: ${cyclePosition}`);
      console.log(`  班次: ${shiftTable[team][cyclePosition]}`);
      console.log(`  当前时间: ${new Date().toLocaleTimeString()}`);
    }
    
    return shiftTable[team][cyclePosition];
  };

  // 获取所有队伍在指定日期的班次
  const getAllTeamsShifts = (date: Dayjs) => {
    const teams: TeamType[] = ['一队', '二队', '三队', '四队'];
    return teams.map(team => ({
      team,
      shift: calculateShift(date, team)
    }));
  };

  // 日历单元格渲染
  const dateCellRender = (date: Dayjs) => {
    const shift = calculateShift(date, selectedTeam);
    
    // 根据班次类型设置不同的颜色
    const shiftColors: Record<ShiftType, string> = {
      '早班': 'blue',
      '白班': 'green',
      '夜班': 'purple',
      '休': 'gray'
    };
    
    return (
      <div className="date-cell">
        <Badge 
          color={shiftColors[shift]} 
          text={shift} 
          className="shift-badge"
          style={{ marginTop: '8px' }}
        />
      </div>
    );
  };

  // 日期选择回调
  const onSelect = (date: Dayjs) => {
    // 设置选中日期
    setSelectedDate(date);
    // 如果选择的日期不在当前显示的月份，则更新当前月份
    if (date.month() !== currentMonth.month() || date.year() !== currentMonth.year()) {
      setCurrentMonth(date);
    }
  };

  // 班组选择回调
  const onTeamChange = (value: TeamType) => {
    setSelectedTeam(value);
  };

  // 当前选中日期的所有队伍班次
  const currentDateAllShifts = getAllTeamsShifts(selectedDate);

  return (
    <ConfigProvider locale={zhCN}>
      <div className="shift-calendar">
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>班组选择</span>
              <Select 
                value={selectedTeam} 
                onChange={onTeamChange}
                style={{ width: 120 }}
              >
                <Option value="一队">一队</Option>
                <Option value="二队">二队</Option>
                <Option value="三队">三队</Option>
                <Option value="四队">四队</Option>
              </Select>
            </div>
          }
          bordered={false}
        >
          <Calendar 
            fullscreen={false} 
            value={selectedDate}
            onSelect={onSelect} 
            dateCellRender={dateCellRender}
            headerRender={({ value, onChange }) => {
            const year = value.year();
            const month = value.month();
            
            // 处理月份切换
            const handlePrevMonth = () => {
              const newValue = value.clone().subtract(1, 'month');
              onChange(newValue);
              setCurrentMonth(newValue);
            };
            
            const handleNextMonth = () => {
              const newValue = value.clone().add(1, 'month');
              onChange(newValue);
              setCurrentMonth(newValue);
            };
            
            const handleToday = () => {
              const newValue = dayjs();
              onChange(newValue);
              setCurrentMonth(newValue);
              setSelectedDate(newValue);
            };
            
            // 日期选择器变更处理函数
            const handleDatePickerChange = (date: Dayjs | null) => {
              if (date) {
                onChange(date);
                setCurrentMonth(date);
                setSelectedDate(date);
              }
            };
            
            // 确保日期选择器的值与当前选中日期同步
            const datePickerValue = selectedDate;
            
            return (
              <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <DatePicker 
                    value={datePickerValue} 
                    onChange={handleDatePickerChange} 
                    allowClear={false}
                    size="small"
                  />
                </div>
                <Title level={4} style={{ margin: 0 }}>{year}年{month + 1}月</Title>
                <div>
                  <Button 
                    type="primary" 
                    icon={<LeftOutlined />} 
                    onClick={handlePrevMonth}
                    size="small"
                    style={{ marginRight: '8px' }}
                  />
                  <Button 
                    type="primary" 
                    icon={<RightOutlined />}
                    onClick={handleNextMonth}
                    size="small"
                    style={{ marginRight: '8px' }}
                  />
                  <Button 
                    type="primary" 
                    onClick={handleToday} 
                    size="small"
                  >
                    今天
                  </Button>
                </div>
              </div>
            );
          }}
        />
        
        <Card 
          title="当日排班情况" 
          size="small" 
          style={{ marginTop: 16 }}
        >
          <Row gutter={[16, 16]}>
            {currentDateAllShifts.map(({ team, shift }) => {
              // 根据班次类型设置不同的颜色
              const shiftColors: Record<ShiftType, string> = {
                '早班': '#1890ff', // blue
                '白班': '#52c41a', // green
                '夜班': '#722ed1', // purple
                '休': '#d9d9d9'    // gray
              };
              
              return (
                <Col span={6} key={team}>
                  <Card 
                    size="small" 
                    className={`shift-card ${shift === '休' ? 'rest-shift' : ''}`}
                    style={{
                      borderLeft: `4px solid ${shiftColors[shift]}`,
                      backgroundColor: shift === '休' ? '#f5f5f5' : `${shiftColors[shift]}10`
                    }}
                  >
                    <div className="team-name">{team}</div>
                    <div className="shift-type" style={{ color: shift === '休' ? '#666' : shiftColors[shift] }}>{shift}</div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>
      </Card>
    </div>
    </ConfigProvider>
  );
};

export default ShiftCalendarComponent;