import React from 'react';
import { Typography, DatePicker, Button, Space } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import { UI_CONFIG } from '../../config/shiftConfig';

const { Title } = Typography;

interface CalendarHeaderProps {
  value: Dayjs;
  onChange: (date: Dayjs) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  selectedDate: Dayjs;
  onDatePickerChange: (date: Dayjs | null) => void;
}

/**
 * 日历头部组件
 * 包含日期选择器、月份导航和今天按钮
 */
export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  value,
  onChange,
  onPrevMonth,
  onNextMonth,
  onToday,
  selectedDate,
  onDatePickerChange
}) => {
  const year = value.year();
  const month = value.month();

  return (
    <div style={{ 
      padding: '8px 0', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    }}>
      <div>
        <DatePicker 
          value={selectedDate} 
          onChange={onDatePickerChange} 
          allowClear={false}
          size={UI_CONFIG.BUTTON.SIZE}
        />
      </div>
      
      <Title level={4} style={{ margin: 0 }}>
        {year}年{month + 1}月
      </Title>
      
      <div>
        <Button 
          type="primary" 
          icon={<LeftOutlined />} 
          onClick={onPrevMonth}
          size={UI_CONFIG.BUTTON.SIZE}
          style={{ marginRight: UI_CONFIG.BUTTON.MARGIN_RIGHT }}
        />
        <Button 
          type="primary" 
          icon={<RightOutlined />}
          onClick={onNextMonth}
          size={UI_CONFIG.BUTTON.SIZE}
          style={{ marginRight: UI_CONFIG.BUTTON.MARGIN_RIGHT }}
        />
        <Button 
          type="primary" 
          onClick={onToday} 
          size={UI_CONFIG.BUTTON.SIZE}
        >
          今天
        </Button>
      </div>
    </div>
  );
};