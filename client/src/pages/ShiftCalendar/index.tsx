import React from 'react';
import { Typography, Row, Col } from 'antd';
import ShiftCalendar from '../../components/ShiftCalendar';

const { Title } = Typography;

const ShiftCalendarPage: React.FC = () => {
  return (
    <div className="shift-calendar-page">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={2}>倒班日历</Title>
        </Col>
        <Col span={24}>
          <ShiftCalendar />
        </Col>
      </Row>
    </div>
  );
};

export default ShiftCalendarPage;